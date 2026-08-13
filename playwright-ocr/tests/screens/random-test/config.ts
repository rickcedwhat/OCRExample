import { defineScreen } from '../../../src/screen-config.js';
import { ElementType } from '../../../src/types.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Random Test screen configuration
 *
 */
export const randomTestScreen = defineScreen({
  name: 'random-test',
  baseDir: __dirname,
  elements: [
    {
      name: 'titleCombobox',
      template: 'title-combobox.png',
      type: ElementType.DROPDOWN,
    },
    {
      name: 'firstNameInput',
      template: 'first-name-input.png',
      type: ElementType.DROPDOWN,
    }
  ],
});
