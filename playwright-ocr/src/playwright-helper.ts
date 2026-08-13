import type { Page, Locator } from '@playwright/test';
import { FieldExtractor } from './field-extractor.js';
import type { FieldConfig, FormComparison } from './field-extractor.js';
import { getOCRUtil } from './utils/ocr.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface PlaywrightFormTestOptions {
  blankFormPath: string;
  fieldConfigs: FieldConfig[];
  debug?: boolean;
}

/**
 * Helper class for integrating form OCR testing with Playwright
 * Designed for testing desktop apps via RDP where DOM access is not available
 */
export class PlaywrightFormTester {
  private page: Page;
  private screenshotDir: string;

  constructor(page: Page, screenshotDir = './test-screenshots') {
    this.page = page;
    this.screenshotDir = screenshotDir;
  }

  /**
   * Initialize the screenshot directory
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.screenshotDir, { recursive: true });
  }

  /**
   * Capture a screenshot of the current page or a specific element
   * This works for RDP-based testing where you don't have DOM access
   */
  async captureScreen(filename: string, element?: Locator): Promise<string> {
    const filepath = path.join(this.screenshotDir, filename);
    
    if (element) {
      await element.screenshot({ path: filepath });
    } else {
      await this.page.screenshot({ path: filepath, fullPage: true });
    }

    return filepath;
  }

  /**
   * Compare a filled form screenshot against a blank template
   * Returns extracted field values
   */
  async compareForm(
    filledFormScreenshot: string,
    options: PlaywrightFormTestOptions
  ): Promise<FormComparison> {
    const ocrUtil = await getOCRUtil();
    const extractor = new FieldExtractor(ocrUtil, options.debug);

    try {
      await extractor.loadForms(options.blankFormPath, filledFormScreenshot);
      const results = await extractor.extractFields(options.fieldConfigs);
      return results;
    } finally {
      extractor.cleanup();
    }
  }

  /**
   * Wait for a form to be stable (no animation/changes) before capturing
   * Useful for forms with loading states or animations
   */
  async waitForStableScreen(
    stabilityTimeMs = 1000,
    maxWaitMs = 10000
  ): Promise<void> {
    const tempDir = path.join(this.screenshotDir, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const startTime = Date.now();
    let previousScreenshot: Buffer | null = null;

    while (Date.now() - startTime < maxWaitMs) {
      const screenshot = await this.page.screenshot();

      if (previousScreenshot) {
        const { PNG } = await import('pngjs');
        const img1 = PNG.sync.read(previousScreenshot);
        const img2 = PNG.sync.read(screenshot);

        if (img1.width === img2.width && img1.height === img2.height) {
          const pixelmatch = (await import('pixelmatch')).default;
          const diffImg = new (await import('pngjs')).PNG({
            width: img1.width,
            height: img1.height,
          });
          const diff = pixelmatch(
            img1.data,
            img2.data,
            diffImg.data,
            img1.width,
            img1.height,
            { threshold: 0.1 }
          );

          // If fewer than 100 pixels changed, consider it stable
          if (diff < 100) {
            await new Promise((resolve) => setTimeout(resolve, stabilityTimeMs));
            return;
          }
        }
      }

      previousScreenshot = screenshot;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error(`Screen did not stabilize within ${maxWaitMs}ms`);
  }

  /**
   * High-level test helper: Navigate, wait for stability, capture, and analyze
   */
  async testForm(
    navigationCallback: () => Promise<void>,
    options: PlaywrightFormTestOptions
  ): Promise<FormComparison> {
    await this.initialize();
    
    // Navigate to the form
    await navigationCallback();
    
    // Wait for the screen to stabilize
    await this.waitForStableScreen();
    
    // Capture the filled form
    const screenshotPath = await this.captureScreen(
      `filled-form-${Date.now()}.png`
    );
    
    // Analyze the form
    return await this.compareForm(screenshotPath, options);
  }

  /**
   * Clean up temporary screenshots
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.screenshotDir);
      for (const file of files) {
        if (file.startsWith('temp-') || file.includes('filled-form-')) {
          await fs.unlink(path.join(this.screenshotDir, file));
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Convenience function for quick form field extraction from a screenshot
 */
export async function extractFormFields(
  filledFormPath: string,
  blankFormPath: string,
  fieldConfigs: FieldConfig[],
  debug = false
): Promise<FormComparison> {
  const ocrUtil = await getOCRUtil();
  const extractor = new FieldExtractor(ocrUtil, debug);

  try {
    await extractor.loadForms(blankFormPath, filledFormPath);
    return await extractor.extractFields(fieldConfigs);
  } finally {
    extractor.cleanup();
  }
}
