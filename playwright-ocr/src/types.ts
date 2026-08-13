/**
 * Types of UI elements that can be extracted
 */
export enum ElementType {
  FIELD = 'field',           // Text input, textarea
  BUTTON = 'button',         // Button, submit button
  CHECKBOX = 'checkbox',     // Checkbox
  RADIO = 'radio',          // Radio button
  LINK = 'link',            // Hyperlink
  ICON = 'icon',            // Icon, status indicator
  LABEL = 'label',          // Text label
  DROPDOWN = 'dropdown',    // Select dropdown
  TAB = 'tab',             // Tab navigation
  TOGGLE = 'toggle',        // Toggle switch
  MESSAGE = 'message',      // Error/success message
  OTHER = 'other',          // Other UI element
}

/**
 * Configuration for a single UI element to extract
 */
export interface ElementConfig {
  /** Unique identifier for this element */
  name: string;
  
  /** Path to the template image for this element */
  templatePath: string;
  
  /** Optional: Path to section template if element is within a specific section */
  sectionTemplatePath?: string;
  
  /** Type of UI element */
  type?: ElementType;
  
  /** Deprecated: Use type: ElementType.CHECKBOX instead */
  isCheckbox?: boolean;
}

/**
 * Result from extracting a single element
 */
export interface ElementResult {
  /** Element name/identifier */
  name: string;
  
  /** Extracted value (text for fields, "checked"/"unchecked" for checkboxes, etc.) */
  value: string;
  
  /** Match confidence score (0-1) */
  confidence?: number | undefined;
  
  /** Location of the element on screen */
  location: Rect;
  
  /** Whether the element is in its empty/default state */
  isEmpty: boolean;
  
  /** Type of element */
  type?: ElementType | undefined;
}

/**
 * Result from comparing a form/screen
 */
export interface ScreenComparison {
  /** All extracted elements */
  elements: ElementResult[];
  
  /** Total elements checked */
  totalElements: number;
  
  /** Number of elements with content/active state */
  filledElements: number;
  
  /** Number of elements in empty/default state */
  emptyElements: number;
}

/**
 * Rectangle coordinates
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Point coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Template matching result
 */
export interface MatchResult {
  location: Point;
  confidence: number;
  rect: Rect;
}

// Legacy type aliases for backward compatibility
/** @deprecated Use ElementConfig instead */
export type FieldConfig = ElementConfig;

/** @deprecated Use ElementResult instead */
export type FieldResult = ElementResult;

/** @deprecated Use ScreenComparison instead */
export type FormComparison = ScreenComparison;
