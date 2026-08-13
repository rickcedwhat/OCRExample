import type { ElementConfig, ScreenComparison, ElementType } from './types.js';
import * as path from 'path';

/**
 * Configuration for a single screen/page
 */
export interface ScreenConfig {
  /** Screen identifier (e.g., 'login', 'checkout') */
  name: string;
  
  /** Path to blank screenshot of this screen */
  blankScreenPath: string;
  
  /** UI elements to extract from this screen */
  elementConfigs: ElementConfig[];
  
  /** Optional: Base directory for relative paths */
  baseDir?: string | undefined;
  
  /** Optional: Enable debug output */
  debug?: boolean | undefined;
}

/**
 * Helper to create a screen configuration
 * Automatically resolves paths relative to screen folder
 */
export function defineScreen(config: {
  name: string;
  baseDir: string;
  blankScreen?: string;
  elements: Array<{
    name: string;
    template?: string;  // For single-state elements
    variants?: Record<string, { template: string }>;  // For multi-state elements
    type?: ElementType;
    sectionTemplatePath?: string;
  }>;
  debug?: boolean;
}): ScreenConfig {
  const blankScreenPath = path.join(
    config.baseDir, 
    config.blankScreen || 'blank.png'
  );
  
  const elementConfigs: ElementConfig[] = config.elements.map(el => {
    const elementConfig: ElementConfig = {
      name: el.name,
      type: el.type,
    };
    
    // Handle single template or variants
    if (el.template) {
      elementConfig.templatePath = path.join(config.baseDir, 'templates', el.template);
    } else if (el.variants) {
      elementConfig.variants = {};
      for (const [variantName, variantConfig] of Object.entries(el.variants)) {
        elementConfig.variants[variantName] = {
          template: path.join(config.baseDir, 'templates', variantConfig.template),
        };
      }
    }
    
    if (el.sectionTemplatePath) {
      elementConfig.sectionTemplatePath = el.sectionTemplatePath;
    }
    
    return elementConfig;
  });
  
  const screenConfig: ScreenConfig = {
    name: config.name,
    blankScreenPath,
    elementConfigs,
  };
  
  if (config.baseDir) {
    screenConfig.baseDir = config.baseDir;
  }
  
  if (config.debug !== undefined) {
    screenConfig.debug = config.debug;
  }
  
  return screenConfig;
}

/**
 * Type guard to check if a screen has specific elements
 */
export function hasElement(
  results: ScreenComparison,
  elementName: string
): boolean {
  return results.elements.some(e => e.name === elementName);
}

/**
 * Get element value from results
 */
export function getElementValue(
  results: ScreenComparison,
  elementName: string
): string | undefined {
  return results.elements.find(e => e.name === elementName)?.value;
}

/**
 * Check if element is filled/active
 */
export function isElementFilled(
  results: ScreenComparison,
  elementName: string
): boolean {
  const element = results.elements.find(e => e.name === elementName);
  return element ? !element.isEmpty : false;
}

/**
 * Get all filled elements
 */
export function getFilledElements(
  results: ScreenComparison
): Array<{ name: string; value: string }> {
  return results.elements
    .filter(e => !e.isEmpty)
    .map(e => ({ name: e.name, value: e.value }));
}
