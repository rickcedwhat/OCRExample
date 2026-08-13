import type { Page, Locator } from '@playwright/test';
import type { FieldConfig, FormComparison } from './field-extractor.js';
export interface PlaywrightFormTestOptions {
    blankFormPath: string;
    fieldConfigs: FieldConfig[];
    debug?: boolean;
}
/**
 * Helper class for integrating form OCR testing with Playwright
 * Designed for testing desktop apps via RDP where DOM access is not available
 */
export declare class PlaywrightFormTester {
    private page;
    private screenshotDir;
    constructor(page: Page, screenshotDir?: string);
    /**
     * Initialize the screenshot directory
     */
    initialize(): Promise<void>;
    /**
     * Capture a screenshot of the current page or a specific element
     * This works for RDP-based testing where you don't have DOM access
     */
    captureScreen(filename: string, element?: Locator): Promise<string>;
    /**
     * Compare a filled form screenshot against a blank template
     * Returns extracted field values
     */
    compareForm(filledFormScreenshot: string, options: PlaywrightFormTestOptions): Promise<FormComparison>;
    /**
     * Wait for a form to be stable (no animation/changes) before capturing
     * Useful for forms with loading states or animations
     */
    waitForStableScreen(stabilityTimeMs?: number, maxWaitMs?: number): Promise<void>;
    /**
     * High-level test helper: Navigate, wait for stability, capture, and analyze
     */
    testForm(navigationCallback: () => Promise<void>, options: PlaywrightFormTestOptions): Promise<FormComparison>;
    /**
     * Clean up temporary screenshots
     */
    cleanup(): Promise<void>;
}
/**
 * Convenience function for quick form field extraction from a screenshot
 */
export declare function extractFormFields(filledFormPath: string, blankFormPath: string, fieldConfigs: FieldConfig[], debug?: boolean): Promise<FormComparison>;
//# sourceMappingURL=playwright-helper.d.ts.map