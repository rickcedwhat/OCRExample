import { defineScreen } from '../../../src/screen-config.js';
import { ElementType } from '../../../src/types.js';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Autosoft Customer Information screen configuration
 */
export const autosoftCustomerInformationScreen = defineScreen({
  name: 'autosoft-customer-information',
  baseDir: __dirname,
  elements: [
    {
      name: 'customerNumber',
      template: 'customer-number.png',
      type: ElementType.FIELD,
    },
    {
      name: 'last8',
      template: 'last8.png',
      type: ElementType.FIELD,
    },
    {
      name: 'vin',
      template: 'vin.png',
      type: ElementType.FIELD,
      charset: 'vin',
    },
    {
      name: 'activeInactive',
      template: 'active-inactive.png',
      type: ElementType.CHECKBOX,
    },
    {
      name: 'name',
      template: 'name.png',
      type: ElementType.FIELD,
      parts: [
        { name: 'firstName', x: 138, y: 4, width: 88, height: 14 },
        { name: 'middleInitial', x: 233, y: 4, width: 11, height: 14 },
        { name: 'lastName', x: 251, y: 4, width: 129, height: 14 },
      ],
    },
    {
      name: 'search',
      template: 'search.png',
      type: ElementType.FIELD,
    },
    {
      name: 'homePhone',
      template: 'home-phone.png',
      type: ElementType.FIELD,
    },
    {
      name: 'workPhone',
      template: 'work-phone.png',
      type: ElementType.FIELD,
    },
    {
      name: 'cellPhone',
      template: 'cell-phone.png',
      type: ElementType.FIELD,
    },
    {
      name: 'birthdate',
      template: 'birthdate.png',
      type: ElementType.FIELD,
    },
    {
      name: 'address',
      template: 'address.png',
      type: ElementType.FIELD,
    },
    {
      name: 'cityState',
      template: 'city-state.png',
      type: ElementType.FIELD,
      parts: [
        { name: 'city', x: 138, y: 4, width: 124, height: 14 },
        { name: 'state', x: 269, y: 4, width: 21, height: 14 },
        { name: 'zip', x: 297, y: 4, width: 83, height: 14 },
      ],
    },
    {
      name: 'email',
      template: 'email.png',
      type: ElementType.FIELD,
      charset: 'email',
    },
    {
      name: 'primaryContactMethod',
      template: 'primary-contact-method.png',
      type: ElementType.DROPDOWN,
      options: [
        'H - Home Phone',
        'W - Work Phone',
        'C - Cell',
        'E - Email',
      ],
    },
    {
      name: 'customerTypeCode',
      template: 'customer-type-code.png',
      type: ElementType.FIELD,
    },
    {
      name: 'doNotCall',
      template: 'do-not-call.png',
      type: ElementType.CHECKBOX,
    },
    {
      name: 'doNotText',
      template: 'do-not-text.png',
      type: ElementType.CHECKBOX,
    },
    {
      name: 'doNotEmail',
      template: 'do-not-email.png',
      type: ElementType.CHECKBOX,
    },
    {
      name: 'marketingLetter',
      template: 'marketing-letter.png',
      type: ElementType.CHECKBOX,
    },
    {
      name: 'stockNo',
      template: 'stock-no.png',
      type: ElementType.FIELD,
    },
    {
      name: 'year',
      template: 'year.png',
      type: ElementType.FIELD,
    },
    {
      name: 'make',
      template: 'make.png',
      type: ElementType.FIELD,
    },
    {
      name: 'licenseSt',
      template: 'license-st.png',
      type: ElementType.FIELD,
    },
    {
      name: 'model',
      template: 'model.png',
      type: ElementType.FIELD,
    },
    {
      name: 'delivered',
      template: 'delivered.png',
      type: ElementType.FIELD,
    },
    {
      name: 'body',
      template: 'body.png',
      type: ElementType.FIELD,
    },
    {
      name: 'odometer',
      template: 'odometer.png',
      type: ElementType.FIELD,
    },
    {
      name: 'color',
      template: 'color.png',
      type: ElementType.FIELD,
    },
    {
      name: 'inService',
      template: 'in-service.png',
      type: ElementType.FIELD,
    }
  ],
});
