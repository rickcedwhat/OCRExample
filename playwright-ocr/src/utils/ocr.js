import { createWorker } from 'tesseract.js';
/**
 * OCR utility for extracting text from images using Tesseract.js
 */
export class OCRUtil {
    worker = null;
    initialized = false;
    /**
     * Initialize the OCR worker
     */
    async initialize(language = 'eng') {
        if (this.initialized)
            return;
        this.worker = await createWorker(language);
        this.initialized = true;
    }
    /**
     * Extract text from an image buffer
     */
    async extractText(imageBuffer) {
        if (!this.worker) {
            throw new Error('OCR worker not initialized. Call initialize() first.');
        }
        const { data } = await this.worker.recognize(imageBuffer);
        return data.text.trim();
    }
    /**
     * Extract text with confidence scores and bounding boxes
     */
    async extractDetailedText(imageBuffer) {
        if (!this.worker) {
            throw new Error('OCR worker not initialized. Call initialize() first.');
        }
        const { data } = await this.worker.recognize(imageBuffer);
        return {
            text: data.text.trim(),
            confidence: data.confidence,
            words: data.words?.map((word) => ({
                text: word.text,
                confidence: word.confidence,
                bbox: word.bbox,
            })) || [],
            lines: data.lines?.map((line) => ({
                text: line.text,
                confidence: line.confidence,
                bbox: line.bbox,
            })) || [],
        };
    }
    /**
     * Terminate the worker to free up resources
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.initialized = false;
        }
    }
}
// Singleton instance for reuse across tests
let sharedOCRUtil = null;
/**
 * Get or create a shared OCR utility instance
 */
export async function getOCRUtil(language = 'eng') {
    if (!sharedOCRUtil) {
        sharedOCRUtil = new OCRUtil();
        await sharedOCRUtil.initialize(language);
    }
    return sharedOCRUtil;
}
/**
 * Clean up the shared OCR utility
 */
export async function cleanupOCR() {
    if (sharedOCRUtil) {
        await sharedOCRUtil.terminate();
        sharedOCRUtil = null;
    }
}
//# sourceMappingURL=ocr.js.map