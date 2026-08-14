import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FieldExtractor } from '../src/field-extractor.js';
import { ScreenResult } from '../src/screen-result.js';
import { getOCRUtil, cleanupOCR } from '../src/utils/ocr.js';
import { htmlLoginScreen } from './screens/html-login/config.js';
import { htmlCustomerInformationScreen } from './screens/html-customer-information/config.js';

test.use({
  trace: 'on',
  video: { mode: 'on', size: { width: 1280, height: 800 } },
});

const shotDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test-results', 'html-fixture');

test.describe('HTML Customer Information fixture', () => {
  test.afterAll(async () => {
    await cleanupOCR();
  });

  test('signs in via the element API and reads the customer record', async ({ page }) => {
    test.setTimeout(180_000);
    fs.mkdirSync(shotDir, { recursive: true });

    await page.goto('/app/login.html');

    const ocr = await getOCRUtil();
    const extractor = new FieldExtractor(ocr);
    try {
      const login = ScreenResult.bind(page, extractor, htmlLoginScreen, shotDir);
      await login.element('username').fill('qawolf');
      await login.element('password').fill('secret');
      await login.refresh();
      await login.element('username').toHaveValue('qawolf');
      await login.element('signIn').click();

      const customer = ScreenResult.bind(page, extractor, htmlCustomerInformationScreen, shotDir);
      await customer.element('customerNumber').waitFor({ visible: true });

      await customer.element('customerNumber').toHaveValue('SEA314535');
      await customer.element('vin').toHaveValue('5NPDH4AE1DH314535', {
        swaps: { '5': ['S'] },
      });
      await customer.element('active').toBeUnchecked();

      await customer.element('name').part('firstName').toHaveText(/^QAWCUSTO/);
      await customer.element('name').part('middleInitial').toBeEmpty();
      await customer.element('name').part('lastName').toHaveValue('SEARCH');
      await customer.element('homePhone').toHaveValue('760 543 2987');
      await customer.element('homePhone').part('area').toHaveValue('760');
      await customer.element('homePhone').part('prefix').toHaveValue('543');
      await customer.element('homePhone').part('line').toHaveValue('2987');
      await customer.element('birthdate').toBeEmpty();
      await customer.element('birthdate').part('month').toBeEmpty();
      await customer.element('birthdate').part('day').toBeEmpty();
      await customer.element('birthdate').part('year').toBeEmpty();
      await customer.element('address').toHaveValue('123 MAIN ST');
      await customer.element('cityState').part('city').toHaveValue('LOS ANGELES');
      await customer.element('cityState').part('state').toHaveValue('CA');
      await customer.element('cityState').part('zip').toHaveValue('90201');
      await customer.element('email').toHaveValue('QAWCUSTOMER@QAWOLF.EMAIL', {
        swaps: { '@': ['C', 'Q'] },
      });

      await customer.element('primaryContactMethod').toHaveValue('H - Home Phone');
      await customer.element('doNotCall').toBeUnchecked();

      await customer.element('stockNo').toHaveValue('HG9876');
      await customer.element('year').toHaveValue('2013');
      await customer.element('make').toHaveValue('HYUNDAI');
      await customer.element('model').toHaveValue('ELANTRA GL');
      await customer.element('delivered').toHaveValue('10 25 23');
      await customer.element('delivered').part('month').toHaveValue('10');
      await customer.element('delivered').part('day').toHaveValue('25');
      await customer.element('delivered').part('year').toHaveValue('23');
      await customer.element('odometer').toHaveValue('20398');
      await customer.element('color').toHaveValue('WHITE');
    } finally {
      extractor.cleanup();
    }
  });
});
