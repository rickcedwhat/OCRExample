import { defineTypedScreen } from '../../../src/typed-screen.js';
import { ElementType } from '../../../src/types.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Type-safe login screen configuration
 * 
 * Element names are checked at compile time!
 * Mistyping an element name will give a TypeScript error.
 */
export const loginScreenTyped = defineTypedScreen({
  name: 'login-typed',
  baseDir: __dirname,
  elements: [
    {
      name: 'Username',
      template: 'username-field.png',
      type: ElementType.FIELD,
    },
    {
      name: 'Password',
      template: 'password-field.png',
      type: ElementType.FIELD,
    },
    {
      name: 'Login Button',
      variants: {
        enabled: { template: 'login-btn-enabled.png' },
        disabled: { template: 'login-btn-disabled.png' },
        loading: { template: 'login-btn-loading.png' },
      },
      type: ElementType.BUTTON,
    },
    {
      name: 'Loading Spinner',
      template: 'loading-spinner.png',
      type: ElementType.ICON,
      animated: true,  // Mark as animated!
    },
  ] as const,  // Important: 'as const' for literal types
});

// Export the element names as a type
export type LoginElementName = 
  | 'Username' 
  | 'Password' 
  | 'Login Button' 
  | 'Loading Spinner';
