import type { ElementConfig, ElementResult, ScreenComparison } from './types.js';
import type { ScreenConfig } from './screen-config.js';
import { ScreenElement, VISIBLE_CONFIDENCE, type WaitForOptions } from './element.js';
import type { Page } from '@playwright/test';
import { ocrStep } from './ocr-step.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type ScreenExtractor = {
  loadForms(blankFormPath: string, filledFormPath: string): Promise<void>;
  locateOnScreenshot(screenshotPath: string, config: ElementConfig): Promise<ElementResult>;
  extractElements?(
    configs: readonly ElementConfig[] | ElementConfig[],
  ): Promise<ScreenComparison>;
  extractFields?(
    configs: readonly ElementConfig[] | ElementConfig[],
  ): Promise<{
    fields: ElementResult[];
    totalFields: number;
    filledFields: number;
    emptyFields: number;
  }>;
};

export type ScreenHost = {
  extractor: ScreenExtractor;
  screen: ScreenConfig;
  shotDir: string;
};

async function extractComparison(
  extractor: ScreenExtractor,
  configs: readonly ElementConfig[] | ElementConfig[],
): Promise<ScreenComparison> {
  if (extractor.extractElements) {
    return extractor.extractElements(configs);
  }
  if (!extractor.extractFields) {
    throw new Error('Extractor must implement extractElements or extractFields');
  }
  const extracted = await extractor.extractFields(configs);
  return {
    elements: extracted.fields,
    totalElements: extracted.totalFields,
    filledElements: extracted.filledFields,
    emptyElements: extracted.emptyFields,
  };
}

/**
 * Playwright-style screen result wrapper
 * Provides chainable access to elements with assertions
 */
export class ScreenResult {
  constructor(
    private comparison: ScreenComparison,
    private page?: Page,
    private host?: ScreenHost,
  ) {}

  /**
   * Bind a screen to a live page so element().waitFor / fill / click can screenshot and match.
   */
  static bind(
    page: Page,
    extractor: ScreenExtractor,
    screen: ScreenConfig,
    shotDir: string,
  ): ScreenResult {
    return new ScreenResult({
      elements: [],
      totalElements: 0,
      filledElements: 0,
      emptyElements: 0,
    }, page, { extractor, screen, shotDir });
  }

  /**
   * Get an element by name
   * Returns a ScreenElement with chainable assertions
   */
  element(name: string): ScreenElement {
    const found = this.comparison.elements.find(e => e.name === name);
    if (found) {
      return new ScreenElement(found, this.page, this.host ? this : undefined);
    }
    const config = this.host?.screen.elementConfigs.find(c => c.name === name);
    if (this.host && config) {
      const placeholder: ElementResult = {
        name,
        value: '',
        location: { x: 0, y: 0, width: 0, height: 0 },
        isEmpty: true,
      };
      if (config.type) placeholder.type = config.type;
      return new ScreenElement(placeholder, this.page, this);
    }
    throw new Error(`Element "${name}" not found in screen results`);
  }

  elementResult(name: string, partName?: string): ElementResult | undefined {
    const found = this.comparison.elements.find(e => e.name === name);
    if (!found) return undefined;
    if (!partName) return found;
    return found.parts?.find(part => part.name === partName);
  }

  /**
   * Poll the live screenshot until this element's template is visible (or hidden).
   * On success, OCR-extracts every field on the screen.
   */
  async waitForElement(name: string, options: WaitForOptions = {}): Promise<void> {
    if (!this.host || !this.page) {
      throw new Error('waitFor requires ScreenResult.bind(page, extractor, screen, shotDir)');
    }
    const visible = options.visible !== false;
    const timeout = options.timeout ?? 15_000;
    const config = this.host.screen.elementConfigs.find(c => c.name === name);
    if (!config) {
      throw new Error(`Element "${name}" is not in screen "${this.host.screen.name}"`);
    }

    fs.mkdirSync(this.host.shotDir, { recursive: true });
    const shot = path.join(this.host.shotDir, `${this.host.screen.name}-live.png`);
    const deadline = Date.now() + timeout;
    let last = 0;

    while (Date.now() < deadline) {
      try {
        await this.page.screenshot({ path: shot, timeout: 2_000 });
        const located = await this.host.extractor.locateOnScreenshot(shot, config);
        last = located.confidence ?? 0;
        if ((last >= VISIBLE_CONFIDENCE) === visible) {
          await this.loadExtracted(shot);
          return;
        }
      } catch {
        // Navigation and half-written screenshots are expected while waiting.
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    throw new Error(
      `Element "${name}" not ${visible ? 'visible' : 'hidden'} within ${timeout}ms (confidence: ${last.toFixed(3)})`,
    );
  }

  /**
   * Screenshot the live page and OCR-extract every field on this screen.
   */
  async refresh(): Promise<void> {
    if (!this.host || !this.page) {
      throw new Error('refresh requires ScreenResult.bind(page, extractor, screen, shotDir)');
    }
    return ocrStep(`screen('${this.host.screen.name}').refresh()`, async () => {
      fs.mkdirSync(this.host!.shotDir, { recursive: true });
      const shot = path.join(this.host!.shotDir, `${this.host!.screen.name}-live.png`);
      await this.page!.screenshot({ path: shot });
      await this.loadExtracted(shot);
    });
  }

  private async loadExtracted(shot: string): Promise<void> {
    if (!this.host) {
      throw new Error('loadExtracted requires ScreenResult.bind(...)');
    }
    await this.host.extractor.loadForms(this.host.screen.blankScreenPath, shot);
    this.comparison = await extractComparison(this.host.extractor, this.host.screen.elementConfigs);
  }

  /**
   * Get all elements
   */
  allElements(): ScreenElement[] {
    return this.comparison.elements.map(e => new ScreenElement(e, this.page, this.host ? this : undefined));
  }

  /**
   * Get all filled elements
   */
  filledElements(): ScreenElement[] {
    return this.comparison.elements
      .filter(e => !e.isEmpty)
      .map(e => new ScreenElement(e, this.page, this.host ? this : undefined));
  }

  /**
   * Get all empty elements
   */
  emptyElements(): ScreenElement[] {
    return this.comparison.elements
      .filter(e => e.isEmpty)
      .map(e => new ScreenElement(e, this.page, this.host ? this : undefined));
  }

  /**
   * Count total elements
   */
  count(): number {
    return this.comparison.totalElements;
  }

  /**
   * Count filled elements
   */
  filledCount(): number {
    return this.comparison.filledElements;
  }

  /**
   * Count empty elements
   */
  emptyCount(): number {
    return this.comparison.emptyElements;
  }

  /**
   * Check if element exists
   */
  hasElement(name: string): boolean {
    return this.comparison.elements.some(e => e.name === name)
      || Boolean(this.host?.screen.elementConfigs.some(c => c.name === name));
  }

  /**
   * Get raw comparison data
   */
  raw(): ScreenComparison {
    return { ...this.comparison };
  }
}
