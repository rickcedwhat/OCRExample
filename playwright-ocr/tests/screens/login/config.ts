import { defineScreen } from '../../../src/screen-config.js';
import { ElementType } from '../../../src/types.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Login screen configuration
 * 
 * This screen contains:
 * - Username field
 * - Password field
 * - Remember me checkbox
 * - Login button
 * - Forgot password link
 */
export const loginScreen = defineScreen({
  name: 'login',
  baseDir: __dirname,
  blankScreen: 'blank.png',  // Optional, defaults to 'blank.png'
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
      name: 'Remember Me',
      template: 'remember-checkbox.png',
      type: ElementType.CHECKBOX,
    },
    {
      name: 'Login Button',
      template: 'login-button.png',
      type: ElementType.BUTTON,
    },
    {
      name: 'Forgot Password',
      template: 'forgot-link.png',
      type: ElementType.LINK,
    },
  ],
  debug: false,
});
