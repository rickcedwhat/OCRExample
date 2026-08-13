import { VisionUtil } from './utils/vision.js';
import { OCRUtil } from './utils/ocr.js';
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
    async extractFields(fieldConfigs) {
        if (!this.blankForm || !this.filledForm) {
            throw new Error('Forms not loaded. Call loadForms() first.');
        }
        const results = [];
        for (const config of fieldConfigs) {
            const result = await this.extractField(config);
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
    async extractField(config) {
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
            sourceBlank = this.visionUtil.extractROI(this.blankForm, sectionMatch.rect);
            sourceFilled = this.visionUtil.extractROI(this.filledForm, sectionMatch.rect);
            sectionTemplate.delete();
        }
        // Find the field location using template matching on the blank form
        const match = this.visionUtil.matchTemplate(sourceBlank, template);
        if (this.debug) {
            console.log(`Field "${config.name}" match location:`, match.location);
            console.log(`Field "${config.name}" confidence:`, match.confidence);
        }
        // Extract the ROI from the filled form
        const filledROI = this.visionUtil.extractROI(sourceFilled, match.rect);
        const blankROI = template;
        // Compare the regions to detect if the field has been filled
        const comparison = this.visionUtil.compareRegions(filledROI, blankROI);
        if (this.debug) {
            console.log(`Field "${config.name}" diff pixels:`, comparison.diffPixelCount, `(${comparison.diffPercentage.toFixed(2)}%)`);
        }
        let value = '';
        let isEmpty = !comparison.different;
        if (comparison.different) {
            if (config.isCheckbox) {
                value = 'checked';
            }
            else {
                // Extract text using OCR on the difference
                const diffImage = this.visionUtil.createDiffImage(filledROI, blankROI, 90);
                const diffBuffer = this.visionUtil.matToBuffer(diffImage);
                value = await this.ocrUtil.extractText(diffBuffer);
                diffImage.delete();
                if (!value || value.trim() === '') {
                    isEmpty = true;
                }
            }
        }
        else if (config.isCheckbox) {
            value = 'unchecked';
        }
        filledROI.delete();
        template.delete();
        return {
            name: config.name,
            value,
            confidence: match.confidence,
            location: match.rect,
            isEmpty,
        };
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