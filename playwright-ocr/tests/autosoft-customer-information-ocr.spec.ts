import { test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FieldExtractor } from '../src/field-extractor.js';
import { ScreenResult } from '../src/screen-result.js';
import { getOCRUtil, cleanupOCR } from '../src/utils/ocr.js';
import { autosoftCustomerInformationScreen } from './screens/autosoft-customer-information/config.js';

const filledPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'screens/autosoft-customer-information/filled.png',
);

test.describe('Autosoft Customer Information', () => {
  test.afterAll(async () => {
    await cleanupOCR();
  });

  test('reads the filled customer record from screenshots', async () => {
    test.setTimeout(180_000);

    const ocr = await getOCRUtil();
    const extractor = new FieldExtractor(ocr);
    try {
      await extractor.loadForms(autosoftCustomerInformationScreen.blankScreenPath, filledPath);
      const extracted = await extractor.extractFields(autosoftCustomerInformationScreen.elementConfigs);
      const screen = new ScreenResult({
        elements: extracted.fields,
        totalElements: extracted.totalFields,
        filledElements: extracted.filledFields,
        emptyElements: extracted.emptyFields,
      });
      await screen.element('customerNumber').toHaveValue('SEA314535');
      await screen.element('last8').toHaveValue('DH314535');
      await screen.element('vin').toHaveValue('5NPDH4AE1DH314535', {
        swaps: { '5': ['S'] },
      });
      await screen.element('activeInactive').toBeUnchecked();

      await screen.element('name').part('firstName').toHaveValue('QAWCUSTOMR');
      await screen.element('name').part('middleInitial').toBeEmpty();
      await screen.element('name').part('lastName').toHaveValue('SEARCH');
      await screen.element('search').toHaveValue('SEARCH');
      await screen.element('homePhone').toHaveValue('760 543 2987');
      await screen.element('workPhone').toHaveValue('760 987 4686');
      await screen.element('cellPhone').toBeEmpty();
      await screen.element('birthdate').toBeEmpty();
      await screen.element('address').toHaveValue('123 MAIN ST');
      await screen.element('cityState').part('city').toHaveValue('LOS ANGELES');
      await screen.element('cityState').part('state').toHaveValue('CA');
      await screen.element('cityState').part('zip').toHaveValue('90201');
      await screen.element('email').toHaveValue('QAWCUSTOMER@QAWOLF.EMAIL', {
        swaps: { '@': ['C', 'Q'] },
      });

      await screen.element('primaryContactMethod').toHaveValue('H - Home Phone');
      await screen.element('customerTypeCode').toHaveValue('4', {
        swaps: { '4': ['y'] },
      });
      await screen.element('doNotCall').toBeUnchecked();
      await screen.element('doNotText').toBeUnchecked();
      await screen.element('doNotEmail').toBeUnchecked();
      await screen.element('marketingLetter').toBeUnchecked();

      await screen.element('stockNo').toHaveValue('HG9876');
      await screen.element('year').toHaveValue('2013');
      await screen.element('make').toHaveValue('HYUNDAI');
      await screen.element('licenseSt').toHaveValue('9QAW4567 CA');
      await screen.element('model').toHaveValue('ELANTRA GL');
      await screen.element('delivered').toHaveValue('10 25 23');
      await screen.element('body').toHaveValue('4DR');
      await screen.element('odometer').toHaveValue('20398');
      await screen.element('color').toHaveValue('WHITE');
      await screen.element('inService').toHaveValue('10 25 23');
    } finally {
      extractor.cleanup();
    }
  });
});
