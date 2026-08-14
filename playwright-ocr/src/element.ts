import type { ElementResult, Rect, ElementType } from './types.js';
import type { Page } from '@playwright/test';
import { ocrTextMatches, type OcrSwaps } from './utils/ocr.js';
import { ocrStep } from './ocr-step.js';

export const VISIBLE_CONFIDENCE = 0.7;

export type HaveTextOptions = {
  timeout?: number;
  /** Expected glyph → OCR glyphs allowed in its place, e.g. `{ '@': ['Q', 'C'], '5': 'S' }`. */
  swaps?: OcrSwaps;
};

export type WaitForOptions = {
  visible?: boolean;
  timeout?: number;
};

export type LiveScreen = {
  waitForElement(name: string, options?: WaitForOptions): Promise<void>;
  elementResult(name: string, partName?: string): ElementResult | undefined;
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
    private page?: Page,
    private live?: LiveScreen,
    private readonly parentName?: string,
  ) {}

  private get label(): string {
    return this.parentName ? `${this.parentName}.${this.result.name}` : this.result.name;
  }

  private get rootName(): string {
    return this.parentName ?? this.result.name;
  }

  private get partName(): string | undefined {
    return this.parentName ? this.result.name : undefined;
  }

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
    return new ScreenElement(found, this.page, this.live, this.parentName ?? this.result.name);
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
   * Wait until this element's template matches the live screenshot.
   */
  async waitFor(options: WaitForOptions = {}): Promise<void> {
    const visible = options.visible !== false;
    return ocrStep(`element('${this.label}').waitFor({ visible: ${visible} })`, async () => {
      await this.waitUntil(options);
    });
  }

  /**
   * Assert element is filled/has content
   * @throws if element is empty after timeout
   */
  async toBeFilled(_options?: { timeout?: number }): Promise<void> {
    return ocrStep(`element('${this.label}').toBeFilled()`, async () => {
      this.syncResult();
      if (this.result.isEmpty) {
        throw new Error(`Element "${this.label}" is not filled`);
      }
    });
  }

  /**
   * Assert element is empty/has no content
   * @throws if element is filled after timeout
   */
  async toBeEmpty(_options?: { timeout?: number }): Promise<void> {
    return ocrStep(`element('${this.label}').toBeEmpty()`, async () => {
      this.syncResult();
      if (!this.result.isEmpty) {
        throw new Error(`Element "${this.label}" is not empty`);
      }
    });
  }

  /**
   * Assert element is visible (found with confidence > threshold).
   * When bound to a live page, waits until the template matches.
   */
  async toBeVisible(options?: { timeout?: number }): Promise<void> {
    return ocrStep(`element('${this.label}').toBeVisible()`, async () => {
      if (this.live && this.page) {
        await this.waitUntil(options?.timeout !== undefined
          ? { visible: true, timeout: options.timeout }
          : { visible: true });
      }
      this.syncResult();
      if (!this.result.confidence || this.result.confidence < VISIBLE_CONFIDENCE) {
        throw new Error(
          `Element "${this.label}" is not visible (confidence: ${this.result.confidence})`,
        );
      }
    });
  }

  /**
   * Assert element has specific text/value
   * @throws if text doesn't match after timeout
   */
  async toHaveText(expected: string | RegExp, options?: HaveTextOptions): Promise<void> {
    return ocrStep(`element('${this.label}').toHaveText(${formatExpected(expected)})`, async () => {
      this.syncResult();
      const actual = this.result.value;
      if (ocrTextMatches(actual, expected, { swaps: options?.swaps })) return;
      const swapNote = options?.swaps && Object.keys(options.swaps).length
        ? ` (allowed swaps: ${formatSwaps(options.swaps)})`
        : '';
      throw new Error(
        `Element "${this.label}" does not have text ${formatExpected(expected)}${swapNote}. Actual: "${actual}"`,
      );
    });
  }

  /**
   * Assert element has exact text/value
   * @throws if text doesn't match exactly after timeout
   */
  async toHaveValue(expected: string, options?: HaveTextOptions): Promise<void> {
    return ocrStep(`element('${this.label}').toHaveValue(${formatExpected(expected)})`, async () => {
      this.syncResult();
      const actual = this.result.value;
      if (ocrTextMatches(actual, expected, { swaps: options?.swaps, exact: true })) return;
      const swapNote = options?.swaps && Object.keys(options.swaps).length
        ? ` (allowed swaps: ${formatSwaps(options.swaps)})`
        : '';
      throw new Error(
        `Element "${this.label}" does not have value "${expected}"${swapNote}. Actual: "${actual}"`,
      );
    });
  }

  /**
   * Assert checkbox/toggle is checked
   * @throws if not checked after timeout
   */
  async toBeChecked(_options?: { timeout?: number }): Promise<void> {
    return ocrStep(`element('${this.label}').toBeChecked()`, async () => {
      this.syncResult();
      if (this.result.value !== 'checked') {
        throw new Error(`Element "${this.label}" is not checked`);
      }
    });
  }

  /**
   * Assert checkbox/toggle is unchecked
   * @throws if checked after timeout
   */
  async toBeUnchecked(_options?: { timeout?: number }): Promise<void> {
    return ocrStep(`element('${this.label}').toBeUnchecked()`, async () => {
      this.syncResult();
      if (this.result.value !== 'unchecked') {
        throw new Error(`Element "${this.label}" is not unchecked`);
      }
    });
  }

  /**
   * Assert element is in specific variant state
   * @throws if variant doesn't match after timeout
   */
  async toHaveVariant(expected: string, _options?: { timeout?: number }): Promise<void> {
    return ocrStep(`element('${this.label}').toHaveVariant(${JSON.stringify(expected)})`, async () => {
      this.syncResult();
      const actual = this.result.variant;
      if (actual !== expected) {
        throw new Error(
          `Element "${this.label}" does not have variant "${expected}". Actual: "${actual || 'none'}"`,
        );
      }
    });
  }

  /**
   * Assert element matches with high confidence
   * @throws if confidence below threshold after timeout
   */
  async toHaveConfidence(threshold: number, _options?: { timeout?: number }): Promise<void> {
    return ocrStep(`element('${this.label}').toHaveConfidence(${threshold})`, async () => {
      this.syncResult();
      if (!this.result.confidence || this.result.confidence < threshold) {
        throw new Error(
          `Element "${this.label}" confidence ${this.result.confidence} is below ${threshold}`,
        );
      }
    });
  }

  /**
   * Click the element at its center
   * Requires page to be provided
   */
  async click(options?: { timeout?: number }): Promise<void> {
    return ocrStep(`element('${this.label}').click()`, async () => {
      await this.ensureLocated(options?.timeout);
      await this.clickRect(this.result.location);
    });
  }

  /**
   * Type text into the element.
   * Clicks the value box (ocrRect), not the label crop, then types.
   * Requires page to be provided
   */
  async fill(text: string, options?: { timeout?: number }): Promise<void> {
    return ocrStep(`element('${this.label}').fill(${JSON.stringify(text)})`, async () => {
      await this.ensureLocated(options?.timeout);
      await this.clickRect(this.result.ocrLocation ?? this.result.location);
      await this.page!.keyboard.press('ControlOrMeta+A');
      await this.page!.keyboard.type(text);
    });
  }

  private async clickRect(rect: Rect): Promise<void> {
    if (!this.page) {
      throw new Error('Page not provided. Cannot click element.');
    }
    await this.page.mouse.click(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
    );
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

  private syncResult(): void {
    if (!this.live) return;
    const latest = this.live.elementResult(this.rootName, this.partName);
    if (latest) this.result = latest;
  }

  private isLocated(): boolean {
    this.syncResult();
    return this.result.location.width > 0 && (this.result.confidence ?? 0) >= VISIBLE_CONFIDENCE;
  }

  private async ensureLocated(timeout?: number): Promise<void> {
    if (this.isLocated()) return;
    await this.waitUntil(timeout !== undefined ? { visible: true, timeout } : { visible: true });
  }

  private async waitUntil(options: WaitForOptions = {}): Promise<void> {
    if (!this.live) {
      throw new Error(
        `element('${this.label}').waitFor() requires ScreenResult.bind(page, extractor, screen, shotDir)`,
      );
    }
    await this.live.waitForElement(this.rootName, options);
    this.syncResult();
  }
}
