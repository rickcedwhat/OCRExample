export declare const CHARSET_PRESETS: Record<string, string>;
export declare function charsetForField(name?: string, type?: string, preset?: string): string | undefined;
export declare function normalizeOcrText(text: string): string;
export declare function pickFromOptions(text: string, options?: string[]): string;
export type OcrSwaps = Record<string, string | readonly string[]>;
export declare function ocrTextMatches(actual: string, expected: string | RegExp, options?: {
    swaps?: OcrSwaps;
    exact?: boolean;
}): boolean;
/**
 * OCR utility for extracting text from images using Tesseract.js
 */
export declare class OCRUtil {
    private worker;
    private language;
    initialize(language?: string): Promise<void>;
    /**
     * Extract text from an image buffer
     */
    extractText(imageBuffer: Buffer, options?: {
        charset?: string;
        psm?: string;
    }): Promise<string>;
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