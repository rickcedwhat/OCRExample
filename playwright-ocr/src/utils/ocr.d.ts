/**
 * OCR utility for extracting text from images using Tesseract.js
 */
export declare class OCRUtil {
    private worker;
    private initialized;
    /**
     * Initialize the OCR worker
     */
    initialize(language?: string): Promise<void>;
    /**
     * Extract text from an image buffer
     */
    extractText(imageBuffer: Buffer): Promise<string>;
    /**
     * Extract text with confidence scores and bounding boxes
     */
    extractDetailedText(imageBuffer: Buffer): Promise<{
        text: string;
        confidence: number;
        words: any;
        lines: any;
    }>;
    /**
     * Terminate the worker to free up resources
     */
    terminate(): Promise<void>;
}
/**
 * Get or create a shared OCR utility instance
 */
export declare function getOCRUtil(language?: string): Promise<OCRUtil>;
/**
 * Clean up the shared OCR utility
 */
export declare function cleanupOCR(): Promise<void>;
//# sourceMappingURL=ocr.d.ts.map