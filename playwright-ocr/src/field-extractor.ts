import { VisionUtil } from './utils/vision.js';
import type { Rect, MatchResult } from './utils/vision.js';
import { OCRUtil, charsetForField, pickFromOptions } from './utils/ocr.js';
import * as fs from 'fs/promises';
import { ElementType } from './types.js';
import type { ElementConfig, ElementResult, ScreenComparison } from './types.js';
import { relativePartRect } from './screen-config.js';
export { ElementType };
export type { ElementConfig, ElementResult, ScreenComparison };

function offsetRect(
  base: Rect,
  inner: Rect | undefined,
  maxWidth: number,
  maxHeight: number,
): Rect {
  if (!inner) return base;
  const x = Math.max(0, Math.round(base.x + inner.x));
  const y = Math.max(0, Math.round(base.y + inner.y));
  return {
    x,
    y,
    width: Math.max(1, Math.min(Math.round(inner.width), maxWidth - x)),
    height: Math.max(1, Math.min(Math.round(inner.height), maxHeight - y)),
  };
}


/**
 * Extracts UI element values from filled screens by comparing them to blank templates
 * 
 * @deprecated Class name is outdated. Functionality remains the same but considers renaming to ElementExtractor.
 */
export class FieldExtractor {
  private visionUtil: VisionUtil;
  private ocrUtil: OCRUtil;
  private blankForm: any | null = null;
  private filledForm: any | null = null;
  private debug: boolean;

  constructor(ocrUtil: OCRUtil, debug = false) {
    this.visionUtil = new VisionUtil();
    this.ocrUtil = ocrUtil;
    this.debug = debug;
  }

  /**
   * Load and prepare the blank and filled form images
   */
  async loadForms(blankFormPath: string, filledFormPath: string): Promise<void> {
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
   * Extract values from multiple UI elements
   */
  async extractElements(
    elementConfigs: readonly ElementConfig[] | ElementConfig[],
    options: { ocrThreshold?: number } = {},
  ): Promise<ScreenComparison> {
    if (!this.blankForm || !this.filledForm) {
      throw new Error('Forms not loaded. Call loadForms() first.');
    }

    const results: ElementResult[] = [];

    for (const config of elementConfigs) {
      const result = await this.extractElement(config, options);
      results.push(result);
    }

    const filledElements = results.filter((r) => !r.isEmpty).length;
    const emptyElements = results.filter((r) => r.isEmpty).length;

    return {
      elements: results,
      totalElements: results.length,
      filledElements,
      emptyElements,
    };
  }


  /**
   * Extract a single UI element value
   */
  async extractElement(
    config: ElementConfig,
    options: { ocrThreshold?: number } = {},
  ): Promise<ElementResult> {
    if (!this.blankForm || !this.filledForm) {
      throw new Error('Forms not loaded. Call loadForms() first.');
    }

    // If custom matcher is provided, use it
    if (config.customMatcher) {
      return await this.extractWithCustomMatcher(config);
    }

    // Handle single template or variants (for now, just use first variant or templatePath)
    let templatePath = config.templatePath;
    let activeVariant: string | undefined;
    
    if (!templatePath && config.variants) {
      // Use first variant as default (TODO: try all variants and pick best match)
      const firstVariant = Object.keys(config.variants)[0];
      if (firstVariant && config.variants[firstVariant]) {
        templatePath = config.variants[firstVariant].template;
        activeVariant = firstVariant;
      }
    }
    
    if (!templatePath) {
      throw new Error(`Element "${config.name}" has no templatePath or variants`);
    }

    const templateBuffer = await fs.readFile(templatePath);
    const template = this.visionUtil.toGrayscale(
      this.visionUtil.loadImage(templateBuffer)
    );

    let sourceBlank = this.blankForm;
    let sourceFilled = this.filledForm;

    // If a section template is provided, first locate the section
    if (config.sectionTemplatePath) {
      const sectionBuffer = await fs.readFile(config.sectionTemplatePath);
      const sectionTemplate = this.visionUtil.toGrayscale(
        this.visionUtil.loadImage(sectionBuffer)
      );

      const sectionMatch = this.visionUtil.matchTemplate(
        this.blankForm,
        sectionTemplate
      );

      const sectionBlank = this.visionUtil.extractROI(this.blankForm, sectionMatch.rect);
      const sectionFilled = this.visionUtil.extractROI(this.filledForm, sectionMatch.rect);
      sectionTemplate.delete();

      if (sectionBlank.rows >= template.rows && sectionBlank.cols >= template.cols) {
        sourceBlank = sectionBlank;
        sourceFilled = sectionFilled;
      } else {
        sectionBlank.delete();
        sectionFilled.delete();
        if (this.debug) {
          console.log(
            `Element "${config.name}" template does not fit in its section; matching on the full screen.`,
          );
        }
      }
    }

    // Find the field location using template matching on the blank form
    const match = this.visionUtil.matchTemplate(sourceBlank, template);

    if (this.debug) {
      console.log(`Element "${config.name}" match location:`, match.location);
      console.log(`Element "${config.name}" confidence:`, match.confidence);
      if (config.animated) {
        console.log(`Element "${config.name}" is animated - using looser matching`);
      }
    }

    const readRect = offsetRect(match.rect, config.ocrRect, sourceFilled.cols, sourceFilled.rows);
    const filledROI = this.visionUtil.extractROI(sourceFilled, readRect);
    const blankROI = this.visionUtil.extractROI(sourceBlank, readRect);

    // Compare the regions to detect if the element has been filled
    // For animated elements, use looser thresholds since pixels are constantly changing
    const threshold = config.animated ? 60 : 80;  // Lower threshold for animated elements
    const minDiffPixels = config.animated ? 5 : 10;  // Fewer pixels needed for animated elements
    
    const comparison = this.visionUtil.compareRegions(
      filledROI, 
      blankROI, 
      threshold, 
      minDiffPixels
    );

    if (this.debug) {
      console.log(
        `Field "${config.name}" diff pixels:`,
        comparison.diffPixelCount,
        `(${comparison.diffPercentage.toFixed(2)}%)`
      );
    }

    let value = '';
    let isEmpty = !comparison.different;
    let parts: ElementResult[] | undefined;
    const isCheckbox = config.type === 'checkbox' || config.isCheckbox;

    if (isCheckbox) {
      value = comparison.different ? 'checked' : 'unchecked';
      isEmpty = false;
    } else if (config.animated) {
      value = comparison.different ? 'visible' : 'hidden';
      isEmpty = !comparison.different;
    } else if (config.parts?.length) {
      const ocrThreshold = options.ocrThreshold ?? 50;
      parts = [];
      for (const part of config.parts) {
        const partRect = offsetRect(
          match.rect,
          relativePartRect(part, match.rect),
          sourceFilled.cols,
          sourceFilled.rows,
        );
        const read = await this.readChangedText(
          sourceFilled,
          sourceBlank,
          partRect,
          part.name,
          config.type,
          part.charset || config.charset,
          undefined,
          ocrThreshold,
        );
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
    } else {
      const ocrThreshold = options.ocrThreshold ?? 50;
      const read = await this.readChangedText(
        sourceFilled,
        sourceBlank,
        readRect,
        config.name,
        config.type,
        config.charset,
        config.options,
        ocrThreshold,
      );
      value = read.value;
      isEmpty = read.isEmpty;
    }

    filledROI.delete();
    blankROI.delete();
    template.delete();
    if (sourceBlank !== this.blankForm) sourceBlank.delete();
    if (sourceFilled !== this.filledForm) sourceFilled.delete();

    return {
      name: config.name,
      value,
      confidence: match.confidence,
      location: match.rect,
      isEmpty,
      type: config.type,
      variant: activeVariant,
      parts,
    };
  }

  private async readChangedText(
    sourceFilled: any,
    sourceBlank: any,
    readRect: Rect,
    name: string,
    type: ElementConfig['type'],
    charsetPreset: string | undefined,
    options: string[] | undefined,
    ocrThreshold: number,
  ): Promise<{ value: string; isEmpty: boolean }> {
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
      value = pickFromOptions(
        await this.ocrUtil.extractText(ocrBuffer, { charset }),
        options,
      );
      prepared.delete();
      isEmpty = !value.trim();
    }
    ocrImage.delete();
    filledROI.delete();
    blankROI.delete();
    return { value, isEmpty };
  }


  /**
   * Extract element using custom matcher function
   */
  private async extractWithCustomMatcher(config: ElementConfig): Promise<ElementResult> {
    if (!config.customMatcher) {
      throw new Error('customMatcher is required');
    }
    
    if (!config.templatePath) {
      throw new Error(`Element "${config.name}" with customMatcher requires templatePath to locate the element`);
    }

    // Load template to find element location
    const templateBuffer = await fs.readFile(config.templatePath);
    const template = this.visionUtil.toGrayscale(
      this.visionUtil.loadImage(templateBuffer)
    );

    let sourceBlank = this.blankForm;
    let sourceFilled = this.filledForm;

    // Handle section template if provided
    if (config.sectionTemplatePath) {
      const sectionBuffer = await fs.readFile(config.sectionTemplatePath);
      const sectionTemplate = this.visionUtil.toGrayscale(
        this.visionUtil.loadImage(sectionBuffer)
      );

      const sectionMatch = this.visionUtil.matchTemplate(
        this.blankForm!,
        sectionTemplate
      );

      sourceBlank = this.visionUtil.extractROI(this.blankForm!, sectionMatch.rect);
      sourceFilled = this.visionUtil.extractROI(this.filledForm!, sectionMatch.rect);

      sectionTemplate.delete();
    }

    // Find element location
    const match = this.visionUtil.matchTemplate(sourceBlank!, template);

    if (this.debug) {
      console.log(`Element "${config.name}" (custom matcher) location:`, match.location);
      console.log(`Element "${config.name}" (custom matcher) confidence:`, match.confidence);
    }

    const filledROI = this.visionUtil.extractROI(sourceFilled!, match.rect);
    const blankROI = this.visionUtil.extractROI(sourceBlank!, match.rect);

    // Build context for custom matcher
    const context: import('./types.js').CustomMatcherContext = {
      blankROI,
      filledROI,
      templateROI: template,
      location: match.rect,
      config,
      utils: {
        createDiffImage: (roi1: any, roi2: any, threshold = 80) => 
          this.visionUtil.createDiffImage(roi1, roi2, threshold),
        isolateChangedForOcr: (filled: any, blank: any, threshold = 50) =>
          this.visionUtil.isolateChangedForOcr(filled, blank, threshold),
        matToBuffer: (mat: any) => 
          this.visionUtil.matToBuffer(mat),
        compareRegions: (roi1: any, roi2: any, threshold = 80, minDiffPixels = 10) => 
          this.visionUtil.compareRegions(roi1, roi2, threshold, minDiffPixels),
      },
    };

    // Call custom matcher
    const customResult = await config.customMatcher(context);

    filledROI.delete();
    blankROI.delete();
    template.delete();
    if (sourceBlank !== this.blankForm) sourceBlank!.delete();
    if (sourceFilled !== this.filledForm) sourceFilled!.delete();

    // Return result with custom matcher output + metadata
    return {
      name: config.name,
      value: customResult.value,
      confidence: customResult.confidence,
      location: match.rect,
      isEmpty: customResult.isEmpty,
      type: config.type,
      metadata: customResult.metadata,
    };
  }

  /**
   * Clean up OpenCV matrices
   */
  cleanup(): void {
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
