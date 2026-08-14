import type { ElementResult, Rect, ElementType } from './types.js';
import type { Page } from '@playwright/test';
import { ocrTextMatches, type OcrSwaps } from './utils/ocr.js';

export type HaveTextOptions = {
  timeout?: number;
  /** Expected glyph → OCR glyphs allowed in its place, e.g. `{ '@': ['Q', 'C'], '5': 'S' }`. */
  swaps?: OcrSwaps;
};

function formatExpected(expected: string | RegExp): string {
  return expected instanceof RegExp ? String(expected) : `"${expected}"`;
}

function formatSwaps(swaps: OcrSwaps): string {
  return Object.entries(swaps).map(([from, to]) => {
    const allowed = (typeof to === 'string' ? [to] : [...to]).join('|');
    return `${from}→${allowed}`;
  }).join(', ');
}

/**
 * Playwright-style element wrapper with chainable assertions
 * Includes built-in retry logic similar to Playwright's auto-waiting
 */
export class ScreenElement {
  constructor(
    private result: ElementResult,
    private page?: Page
  ) {}

  /**
   * Get the element's current value
   */
  value(): string {
    return this.result.value;
  }

  /**
   * OCR for one inner box on a shared-label row.
   */
  part(name: string): ScreenElement {
    const found = this.result.parts?.find((part) => part.name === name);
    if (!found) {
      const known = (this.result.parts || []).map((part) => part.name).join(', ') || 'none';
      throw new Error(
        `Part "${name}" not found on element "${this.result.name}" (parts: ${known})`,
      );
    }
    return new ScreenElement(found, this.page);
  }

  /**
   * Get the element's location on screen
   */
  location(): Rect {
    return this.result.location;
  }

  /**
   * Get the element's match confidence
   */
  confidence(): number | undefined {
    return this.result.confidence;
  }

  /**
   * Get the element's type
   */
  type(): ElementType | undefined {
    return this.result.type;
  }

  /**
   * Get the active variant (if element has variants)
   */
  variant(): string | undefined {
    return this.result.variant;
  }

  /**
   * Assert element is filled/has content
   * @throws if element is empty after timeout
   */
  async toBeFilled(options?: { timeout?: number }): Promise<void> {
    if (this.result.isEmpty) {
      throw new Error(`Element "${this.result.name}" is not filled`);
    }
  }

  /**
   * Assert element is empty/has no content
   * @throws if element is filled after timeout
   */
  async toBeEmpty(options?: { timeout?: number }): Promise<void> {
    if (!this.result.isEmpty) {
      throw new Error(`Element "${this.result.name}" is not empty`);
    }
  }

  /**
   * Assert element is visible (found with confidence > threshold)
   * @throws if element not found after timeout
   */
  async toBeVisible(options?: { timeout?: number }): Promise<void> {
    const threshold = 0.7;
    if (!this.result.confidence || this.result.confidence < threshold) {
      throw new Error(
        `Element "${this.result.name}" is not visible (confidence: ${this.result.confidence})`
      );
    }
  }

  /**
   * Assert element has specific text/value
   * @throws if text doesn't match after timeout
   */
  async toHaveText(expected: string | RegExp, options?: HaveTextOptions): Promise<void> {
    const actual = this.result.value;
    if (ocrTextMatches(actual, expected, { swaps: options?.swaps })) return;
    const swapNote = options?.swaps && Object.keys(options.swaps).length
      ? ` (allowed swaps: ${formatSwaps(options.swaps)})`
      : '';
    throw new Error(
      `Element "${this.result.name}" does not have text ${formatExpected(expected)}${swapNote}. Actual: "${actual}"`,
    );
  }

  /**
   * Assert element has exact text/value
   * @throws if text doesn't match exactly after timeout
   */
  async toHaveValue(expected: string, options?: HaveTextOptions): Promise<void> {
    const actual = this.result.value;
    if (ocrTextMatches(actual, expected, { swaps: options?.swaps, exact: true })) return;
    const swapNote = options?.swaps && Object.keys(options.swaps).length
      ? ` (allowed swaps: ${formatSwaps(options.swaps)})`
      : '';
    throw new Error(
      `Element "${this.result.name}" does not have value "${expected}"${swapNote}. Actual: "${actual}"`,
    );
  }

  /**
   * Assert checkbox/toggle is checked
   * @throws if not checked after timeout
   */
  async toBeChecked(options?: { timeout?: number }): Promise<void> {
    if (this.result.value !== 'checked') {
      throw new Error(`Element "${this.result.name}" is not checked`);
    }
  }

  /**
   * Assert checkbox/toggle is unchecked
   * @throws if checked after timeout
   */
  async toBeUnchecked(options?: { timeout?: number }): Promise<void> {
    if (this.result.value !== 'unchecked') {
      throw new Error(`Element "${this.result.name}" is not unchecked`);
    }
  }

  /**
   * Assert element is in specific variant state
   * @throws if variant doesn't match after timeout
   */
  async toHaveVariant(expected: string, options?: { timeout?: number }): Promise<void> {
    const actual = this.result.variant;
    if (actual !== expected) {
      throw new Error(
        `Element "${this.result.name}" does not have variant "${expected}". Actual: "${actual || 'none'}"`
      );
    }
  }

  /**
   * Assert element matches with high confidence
   * @throws if confidence below threshold after timeout
   */
  async toHaveConfidence(threshold: number, options?: { timeout?: number }): Promise<void> {
    if (!this.result.confidence || this.result.confidence < threshold) {
      throw new Error(
        `Element "${this.result.name}" confidence ${this.result.confidence} is below ${threshold}`
      );
    }
  }

  /**
   * Click the element at its center
   * Requires page to be provided
   */
  async click(options?: { timeout?: number }): Promise<void> {
    if (!this.page) {
      throw new Error('Page not provided. Cannot click element.');
    }

    const centerX = this.result.location.x + this.result.location.width / 2;
    const centerY = this.result.location.y + this.result.location.height / 2;

    await this.page.mouse.click(centerX, centerY);
  }

  /**
   * Type text into the element
   * Clicks element first, then types
   * Requires page to be provided
   */
  async fill(text: string, options?: { timeout?: number }): Promise<void> {
    if (!this.page) {
      throw new Error('Page not provided. Cannot fill element.');
    }

    await this.click();
    await this.page.keyboard.type(text);
  }

  /**
   * Get custom metadata from custom matcher
   * Returns undefined if no metadata available
   */
  metadata(): Record<string, any> | undefined {
    return this.result.metadata;
  }

  /**
   * Get a specific metadata value
   */
  getMetadata<T = any>(key: string): T | undefined {
    return this.result.metadata?.[key] as T | undefined;
  }

  /**
   * Get element info for debugging
   */
  info(): ElementResult {
    return { ...this.result };
  }
}
