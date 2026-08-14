import { VisionUtil } from './utils/vision.js';
import { OCRUtil, charsetForField, pickFromOptions } from './utils/ocr.js';

function offsetRect(base, inner, maxWidth, maxHeight) {
    if (!inner)
        return base;
    const x = Math.max(0, Math.round(base.x + inner.x));
    const y = Math.max(0, Math.round(base.y + inner.y));
    return {
        x,
        y,
        width: Math.max(1, Math.min(Math.round(inner.width), maxWidth - x)),
        height: Math.max(1, Math.min(Math.round(inner.height), maxHeight - y)),
    };
}

function relativePartRect(part, crop) {
    if (part.x >= crop.x && part.y >= crop.y) {
        return {
            x: part.x - crop.x,
            y: part.y - crop.y,
            width: part.width,
            height: part.height,
        };
    }
    return { x: part.x, y: part.y, width: part.width, height: part.height };
}
import * as fs from 'fs/promises';
/**
 * Extracts field values from filled forms by comparing them to blank templates
 */
export class FieldExtractor {
    visionUtil;
    ocrUtil;
    blankForm = null;
    filledForm = null;
    debug;
    constructor(ocrUtil, debug = false) {
        this.visionUtil = new VisionUtil();
        this.ocrUtil = ocrUtil;
        this.debug = debug;
    }
    /**
     * Load and prepare the blank and filled form images
     */
    async loadForms(blankFormPath, filledFormPath) {
        const blankBuffer = await fs.readFile(blankFormPath);
        const filledBuffer = await fs.readFile(filledFormPath);
        const blankImage = this.visionUtil.loadImage(blankBuffer);
        const filledImage = this.visionUtil.loadImage(filledBuffer);
        this.blankForm = this.visionUtil.toGrayscale(blankImage);
        const filledGray = this.visionUtil.toGrayscale(filledImage);
        if (this.debug) {
            console.log('Original blank form size:', this.blankForm.size());
            console.log('Original filled form size:', filledGray.size());
        }
        // Align the filled form to match the blank template
        this.filledForm = this.visionUtil.alignImages(filledGray, this.blankForm);
        if (this.debug) {
            console.log('Aligned filled form size:', this.filledForm.size());
        }
        blankImage.delete();
        filledImage.delete();
        filledGray.delete();
    }
    /**
     * Extract values from multiple fields
     */
    async extractFields(fieldConfigs, options = {}) {
        if (!this.blankForm || !this.filledForm) {
            throw new Error('Forms not loaded. Call loadForms() first.');
        }
        const results = [];
        for (const config of fieldConfigs) {
            const result = await this.extractField(config, options);
            results.push(result);
        }
        const filledFields = results.filter((r) => !r.isEmpty).length;
        const emptyFields = results.filter((r) => r.isEmpty).length;
        return {
            fields: results,
            totalFields: results.length,
            filledFields,
            emptyFields,
        };
    }
    /**
     * Extract a single field value
     */
    async extractField(config, options = {}) {
        if (!this.blankForm || !this.filledForm) {
            throw new Error('Forms not loaded. Call loadForms() first.');
        }
        const templateBuffer = await fs.readFile(config.templatePath);
        const template = this.visionUtil.toGrayscale(this.visionUtil.loadImage(templateBuffer));
        let sourceBlank = this.blankForm;
        let sourceFilled = this.filledForm;
        // If a section template is provided, first locate the section
        if (config.sectionTemplatePath) {
            const sectionBuffer = await fs.readFile(config.sectionTemplatePath);
            const sectionTemplate = this.visionUtil.toGrayscale(this.visionUtil.loadImage(sectionBuffer));
            const sectionMatch = this.visionUtil.matchTemplate(this.blankForm, sectionTemplate);
            const sectionBlank = this.visionUtil.extractROI(this.blankForm, sectionMatch.rect);
            const sectionFilled = this.visionUtil.extractROI(this.filledForm, sectionMatch.rect);
            sectionTemplate.delete();
            if (sectionBlank.rows >= template.rows && sectionBlank.cols >= template.cols) {
                sourceBlank = sectionBlank;
                sourceFilled = sectionFilled;
            }
            else {
                sectionBlank.delete();
                sectionFilled.delete();
                if (this.debug) {
                    console.log(`Element "${config.name}" template does not fit in its section; matching on the full screen.`);
                }
            }
        }
        // Find the field location using template matching on the blank form
        const match = this.visionUtil.matchTemplate(sourceBlank, template);
        if (this.debug) {
            console.log(`Field "${config.name}" match location:`, match.location);
            console.log(`Field "${config.name}" confidence:`, match.confidence);
        }
        // Extract the ROI from the filled form
        const readRect = offsetRect(match.rect, config.ocrRect, sourceFilled.cols, sourceFilled.rows);
        const filledROI = this.visionUtil.extractROI(sourceFilled, readRect);
        const blankROI = this.visionUtil.extractROI(sourceBlank, readRect);
        // Compare the regions to detect if the field has been filled
        const comparison = this.visionUtil.compareRegions(filledROI, blankROI);
        if (this.debug) {
            console.log(`Field "${config.name}" diff pixels:`, comparison.diffPixelCount, `(${comparison.diffPercentage.toFixed(2)}%)`);
        }
        let value = '';
        let isEmpty = !comparison.different;
        let parts;
        const isCheckbox = config.type === 'checkbox' || config.isCheckbox;
        if (isCheckbox) {
            value = comparison.different ? 'checked' : 'unchecked';
            isEmpty = false;
        }
        else if (config.parts?.length) {
            const ocrThreshold = options.ocrThreshold ?? 50;
            parts = [];
            for (const part of config.parts) {
                const partRect = offsetRect(match.rect, relativePartRect(part, match.rect), sourceFilled.cols, sourceFilled.rows);
                const read = await this.readChangedText(sourceFilled, sourceBlank, partRect, part.name, config.type, part.charset || config.charset, undefined, ocrThreshold);
                parts.push({
                    name: part.name,
                    value: read.value,
                    confidence: match.confidence,
                    location: partRect,
                    isEmpty: read.isEmpty,
                    type: config.type,
                });
            }
            value = parts.map((part) => part.value).filter((text) => text.trim()).join(' ');
            isEmpty = parts.every((part) => part.isEmpty);
        }
        else {
            const ocrThreshold = options.ocrThreshold ?? 50;
            const read = await this.readChangedText(sourceFilled, sourceBlank, readRect, config.name, config.type, config.charset, config.options, ocrThreshold);
            value = read.value;
            isEmpty = read.isEmpty;
        }
        filledROI.delete();
        blankROI.delete();
        template.delete();
        if (sourceBlank !== this.blankForm)
            sourceBlank.delete();
        if (sourceFilled !== this.filledForm)
            sourceFilled.delete();
        return {
            name: config.name,
            value,
            confidence: match.confidence,
            location: match.rect,
            isEmpty,
            parts,
        };
    }
    async readChangedText(sourceFilled, sourceBlank, readRect, name, type, charsetPreset, options, ocrThreshold) {
        const filledROI = this.visionUtil.extractROI(sourceFilled, readRect);
        const blankROI = this.visionUtil.extractROI(sourceBlank, readRect);
        const ocrImage = this.visionUtil.isolateChangedForOcr(filledROI, blankROI, ocrThreshold);
        let value = '';
        let isEmpty = true;
        if (this.visionUtil.hasEnoughInk(ocrImage, 3)) {
            const charset = charsetForField(name, type, charsetPreset);
            const prep = this.visionUtil.ocrPrepOptions(ocrImage, { charset });
            const prepared = this.visionUtil.prepareForOcr(ocrImage, prep.scale, { ...prep, charset });
            const ocrBuffer = this.visionUtil.matToBuffer(prepared);
            value = pickFromOptions(await this.ocrUtil.extractText(ocrBuffer, { charset }), options);
            prepared.delete();
            isEmpty = !value.trim();
        }
        ocrImage.delete();
        filledROI.delete();
        blankROI.delete();
        return { value, isEmpty };
    }
    /**
     * Clean up OpenCV matrices
     */
    cleanup() {
        if (this.blankForm) {
            this.blankForm.delete();
            this.blankForm = null;
        }
        if (this.filledForm) {
            this.filledForm.delete();
            this.filledForm = null;
        }
    }
}
//# sourceMappingURL=field-extractor.js.map