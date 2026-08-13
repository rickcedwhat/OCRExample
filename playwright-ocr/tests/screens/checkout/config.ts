import { defineScreen } from '../../../src/screen-config.js';
import { ElementType } from '../../../src/types.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Checkout screen configuration
 * 
 * This screen contains:
 * - Card number field
 * - CVV field
 * - Expiry date field
 * - Save card checkbox
 * - Pay button
 * - Cancel button
 * - Success/error icons
 */
export const checkoutScreen = defineScreen({
  name: 'checkout',
  baseDir: __dirname,
  elements: [
    {
      name: 'Card Number',
      template: 'card-number-field.png',
      type: ElementType.FIELD,
    },
    {
      name: 'CVV',
      template: 'cvv-field.png',
      type: ElementType.FIELD,
    },
    {
      name: 'Expiry Date',
      template: 'expiry-field.png',
      type: ElementType.FIELD,
    },
    {
      name: 'Save Card',
      template: 'save-card-checkbox.png',
      type: ElementType.CHECKBOX,
    },
    {
      name: 'Pay Button',
      template: 'pay-button.png',
      type: ElementType.BUTTON,
    },
    {
      name: 'Cancel Button',
      template: 'cancel-button.png',
      type: ElementType.BUTTON,
    },
    {
      name: 'Success Icon',
      template: 'success-icon.png',
      type: ElementType.ICON,
    },
    {
      name: 'Error Icon',
      template: 'error-icon.png',
      type: ElementType.ICON,
    },
  ],
});
