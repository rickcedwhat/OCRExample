import { FieldExtractor } from './field-extractor.js';
import { getOCRUtil } from './utils/ocr.js';
import * as fs from 'fs/promises';
import * as path from 'path';
/**
 * Helper class for integrating form OCR testing with Playwright
 * Designed for testing desktop apps via RDP where DOM access is not available
 */
export class PlaywrightFormTester {
    page;
    screenshotDir;
    constructor(page, screenshotDir = './test-screenshots') {
        this.page = page;
        this.screenshotDir = screenshotDir;
    }
    /**
     * Initialize the screenshot directory
     */
    async initialize() {
        await fs.mkdir(this.screenshotDir, { recursive: true });
    }
    /**
     * Capture a screenshot of the current page or a specific element
     * This works for RDP-based testing where you don't have DOM access
     */
    async captureScreen(filename, element) {
        const filepath = path.join(this.screenshotDir, filename);
        if (element) {
            await element.screenshot({ path: filepath });
        }
        else {
            await this.page.screenshot({ path: filepath, fullPage: true });
        }
        return filepath;
    }
    /**
     * Compare a filled form screenshot against a blank template
     * Returns extracted field values
     */
    async compareForm(filledFormScreenshot, options) {
        const ocrUtil = await getOCRUtil();
        const extractor = new FieldExtractor(ocrUtil, options.debug);
        try {
            await extractor.loadForms(options.blankFormPath, filledFormScreenshot);
            const results = await extractor.extractFields(options.fieldConfigs);
            return results;
        }
        finally {
            extractor.cleanup();
        }
    }
    /**
     * Wait for a form to be stable (no animation/changes) before capturing
     * Useful for forms with loading states or animations
     */
    async waitForStableScreen(stabilityTimeMs = 1000, maxWaitMs = 10000) {
        const tempDir = path.join(this.screenshotDir, 'temp');
        await fs.mkdir(tempDir, { recursive: true });
        const startTime = Date.now();
        let previousScreenshot = null;
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
                    const diff = pixelmatch(img1.data, img2.data, diffImg.data, img1.width, img1.height, { threshold: 0.1 });
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
    async testForm(navigationCallback, options) {
        await this.initialize();
        // Navigate to the form
        await navigationCallback();
        // Wait for the screen to stabilize
        await this.waitForStableScreen();
        // Capture the filled form
        const screenshotPath = await this.captureScreen(`filled-form-${Date.now()}.png`);
        // Analyze the form
        return await this.compareForm(screenshotPath, options);
    }
    /**
     * Clean up temporary screenshots
     */
    async cleanup() {
        try {
            const files = await fs.readdir(this.screenshotDir);
            for (const file of files) {
                if (file.startsWith('temp-') || file.includes('filled-form-')) {
                    await fs.unlink(path.join(this.screenshotDir, file));
                }
            }
        }
        catch (error) {
            // Ignore cleanup errors
        }
    }
}
/**
 * Convenience function for quick form field extraction from a screenshot
 */
export async function extractFormFields(filledFormPath, blankFormPath, fieldConfigs, debug = false) {
    const ocrUtil = await getOCRUtil();
    const extractor = new FieldExtractor(ocrUtil, debug);
    try {
        await extractor.loadForms(blankFormPath, filledFormPath);
        return await extractor.extractFields(fieldConfigs);
    }
    finally {
        extractor.cleanup();
    }
}
//# sourceMappingURL=playwright-helper.js.map