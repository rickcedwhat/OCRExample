import type { ScreenComparison } from './types.js';
import { ScreenElement } from './element.js';
import type { Page } from '@playwright/test';

/**
 * Playwright-style screen result wrapper
 * Provides chainable access to elements with assertions
 */
export class ScreenResult {
  constructor(
    private comparison: ScreenComparison,
    private page?: Page
  ) {}

  /**
   * Get an element by name
   * Returns a ScreenElement with chainable assertions
   */
  element(name: string): ScreenElement {
    const result = this.comparison.elements.find(e => e.name === name);
    if (!result) {
      throw new Error(`Element "${name}" not found in screen results`);
    }
    return new ScreenElement(result, this.page);
  }

  /**
   * Get all elements
   */
  allElements(): ScreenElement[] {
    return this.comparison.elements.map(e => new ScreenElement(e, this.page));
  }

  /**
   * Get all filled elements
   */
  filledElements(): ScreenElement[] {
    return this.comparison.elements
      .filter(e => !e.isEmpty)
      .map(e => new ScreenElement(e, this.page));
  }

  /**
   * Get all empty elements
   */
  emptyElements(): ScreenElement[] {
    return this.comparison.elements
      .filter(e => e.isEmpty)
      .map(e => new ScreenElement(e, this.page));
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
    return this.comparison.elements.some(e => e.name === name);
  }

  /**
   * Get raw comparison data
   */
  raw(): ScreenComparison {
    return { ...this.comparison };
  }
}
