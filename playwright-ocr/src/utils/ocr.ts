import { createWorker } from 'tesseract.js';
import type { Worker } from 'tesseract.js';

/**
 * OCR utility for extracting text from images using Tesseract.js
 */
export class OCRUtil {
  private worker: Worker | null = null;
  private initialized = false;

  /**
   * Initialize the OCR worker
   */
  async initialize(language = 'eng'): Promise<void> {
    if (this.initialized) return;
    
    this.worker = await createWorker(language);
    this.initialized = true;
  }

  /**
   * Extract text from an image buffer
   */
  async extractText(imageBuffer: Buffer): Promise<string> {
    if (!this.worker) {
      throw new Error('OCR worker not initialized. Call initialize() first.');
    }

    const { data } = await this.worker.recognize(imageBuffer);
    return data.text.trim();
  }

  /**
   * Extract text with confidence scores and bounding boxes
   */
  async extractDetailedText(imageBuffer: Buffer) {
    if (!this.worker) {
      throw new Error('OCR worker not initialized. Call initialize() first.');
    }

    const { data } = await this.worker.recognize(imageBuffer);
    
    return {
      text: data.text.trim(),
      confidence: data.confidence,
      words: (data as any).words?.map((word: any) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: word.bbox,
      })) || [],
      lines: (data as any).lines?.map((line: any) => ({
        text: line.text,
        confidence: line.confidence,
        bbox: line.bbox,
      })) || [],
    };
  }

  /**
   * Terminate the worker to free up resources
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initialized = false;
    }
  }
}

// Singleton instance for reuse across tests
let sharedOCRUtil: OCRUtil | null = null;

/**
 * Get or create a shared OCR utility instance
 */
export async function getOCRUtil(language = 'eng'): Promise<OCRUtil> {
  if (!sharedOCRUtil) {
    sharedOCRUtil = new OCRUtil();
    await sharedOCRUtil.initialize(language);
  }
  return sharedOCRUtil;
}

/**
 * Clean up the shared OCR utility
 */
export async function cleanupOCR(): Promise<void> {
  if (sharedOCRUtil) {
    await sharedOCRUtil.terminate();
    sharedOCRUtil = null;
  }
}
