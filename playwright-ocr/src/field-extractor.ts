import { VisionUtil } from './utils/vision.js';
import type { Rect, MatchResult } from './utils/vision.js';
import { OCRUtil } from './utils/ocr.js';
import * as fs from 'fs/promises';
import { ElementType } from './types.js';
import type { ElementConfig, ElementResult, ScreenComparison } from './types.js';
export { ElementType };
export type { ElementConfig, ElementResult, ScreenComparison };


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
  async extractElements(elementConfigs: readonly ElementConfig[] | ElementConfig[]): Promise<ScreenComparison> {
    if (!this.blankForm || !this.filledForm) {
      throw new Error('Forms not loaded. Call loadForms() first.');
    }

    const results: ElementResult[] = [];

    for (const config of elementConfigs) {
      const result = await this.extractElement(config);
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
  async extractElement(config: ElementConfig): Promise<ElementResult> {
    if (!this.blankForm || !this.filledForm) {
      throw new Error('Forms not loaded. Call loadForms() first.');
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

      sourceBlank = this.visionUtil.extractROI(this.blankForm, sectionMatch.rect);
      sourceFilled = this.visionUtil.extractROI(this.filledForm, sectionMatch.rect);

      sectionTemplate.delete();
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

    // Extract the ROI from the filled form
    const filledROI = this.visionUtil.extractROI(sourceFilled, match.rect);
    const blankROI = template;

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

    // Support both new type property and legacy isCheckbox
    const isCheckbox = config.type === 'checkbox' || config.isCheckbox;

    if (comparison.different) {
      if (isCheckbox) {
        value = 'checked';
      } else if (config.animated) {
        // For animated elements, don't try OCR - just mark as visible/present
        value = 'visible';
        isEmpty = false;
      } else {
        // Extract text using OCR on the difference
        const diffImage = this.visionUtil.createDiffImage(filledROI, blankROI, 90);
        const diffBuffer = this.visionUtil.matToBuffer(diffImage);
        value = await this.ocrUtil.extractText(diffBuffer);
        diffImage.delete();

        if (!value || value.trim() === '') {
          isEmpty = true;
        }
      }
    } else if (isCheckbox) {
      value = 'unchecked';
    } else if (config.animated) {
      // Animated element not present
      value = 'hidden';
      isEmpty = true;
    }

    filledROI.delete();
    template.delete();

    return {
      name: config.name,
      value,
      confidence: match.confidence,
      location: match.rect,
      isEmpty,
      type: config.type,
      variant: activeVariant,
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
