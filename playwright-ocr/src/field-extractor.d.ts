import type { Rect } from './utils/vision.js';
import { OCRUtil } from './utils/ocr.js';
export interface FieldConfig {
    name: string;
    templatePath: string;
    sectionTemplatePath?: string;
    isCheckbox?: boolean;
}
export interface FieldResult {
    name: string;
    value: string;
    confidence?: number;
    location: Rect;
    isEmpty: boolean;
}
export interface FormComparison {
    fields: FieldResult[];
    totalFields: number;
    filledFields: number;
    emptyFields: number;
}
/**
 * Extracts field values from filled forms by comparing them to blank templates
 */
export declare class FieldExtractor {
    private visionUtil;
    private ocrUtil;
    private blankForm;
    private filledForm;
    private debug;
    constructor(ocrUtil: OCRUtil, debug?: boolean);
    /**
     * Load and prepare the blank and filled form images
     */
    loadForms(blankFormPath: string, filledFormPath: string): Promise<void>;
    /**
     * Extract values from multiple fields
     */
    extractFields(fieldConfigs: FieldConfig[]): Promise<FormComparison>;
    /**
     * Extract a single field value
     */
    extractField(config: FieldConfig): Promise<FieldResult>;
    /**
     * Clean up OpenCV matrices
     */
    cleanup(): void;
}
//# sourceMappingURL=field-extractor.d.ts.map