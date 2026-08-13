import { defineScreen } from '../../../src/screen-config.js';
import { ElementType } from '../../../src/types.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Login screen with variants (new API example)
 * 
 * Demonstrates:
 * - Element variants (enabled/disabled buttons)
 * - Checkbox states
 * - Multiple element types
 */
export const loginScreenV2 = defineScreen({
  name: 'login-v2',
  baseDir: __dirname,
  elements: [
    // Simple field
    {
      name: 'Username',
      template: 'username-field.png',
      type: ElementType.FIELD,
    },
    
    // Simple field
    {
      name: 'Password',
      template: 'password-field.png',
      type: ElementType.FIELD,
    },
    
    // Checkbox with variants (checked/unchecked)
    {
      name: 'Remember Me',
      variants: {
        checked: { template: 'remember-checked.png' },
        unchecked: { template: 'remember-unchecked.png' },
      },
      type: ElementType.CHECKBOX,
    },
    
    // Button with variants (enabled/disabled/loading)
    {
      name: 'Login Button',
      variants: {
        enabled: { template: 'login-btn-enabled.png' },
        disabled: { template: 'login-btn-disabled.png' },
        loading: { template: 'login-btn-loading.png' },
      },
      type: ElementType.BUTTON,
    },
    
    // Link (single state)
    {
      name: 'Forgot Password',
      template: 'forgot-link.png',
      type: ElementType.LINK,
    },
    
    // Icons with variants (success/error/warning)
    {
      name: 'Status Icon',
      variants: {
        success: { template: 'icon-success.png' },
        error: { template: 'icon-error.png' },
        warning: { template: 'icon-warning.png' },
      },
      type: ElementType.ICON,
    },
  ],
});
