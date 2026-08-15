import { expect, test } from '../src/ocr-test.js';
import { htmlLoginScreen } from './screens/html-login/config.js';
import { htmlCustomerInformationScreen } from './screens/html-customer-information/config.js';

test.use({
  trace: 'on',
  video: { mode: 'on', size: { width: 1280, height: 800 } },
  ocrOverlay: true,
});

test.describe('HTML Customer Information fixture', () => {
  test('signs in via the element API and reads the customer record', async ({ page, ocrScreen }) => {
    test.setTimeout(180_000);
    await page.goto('/app/login.html');

    const login = ocrScreen(htmlLoginScreen);
    await login.element('username').fill('qawolf');
    await login.element('password').fill('secret');
    await login.element('username').toHaveValue('qawolf');
    await login.element('signIn').click();

    const customer = ocrScreen(htmlCustomerInformationScreen);
    await customer.waitFor();

    await customer.element('customerNumber').toHaveValue('SEA314535');
    await customer.element('vin').toHaveValue('5NPDH4AE1DH314535');
    await customer.element('active').toBeUnchecked();
    await customer.element('save').toHaveVariant('disabled');
    await customer.element('active').click();
    await customer.element('active').toBeChecked();
    await customer.element('save').toHaveVariant('enabled');

    await customer.element('name').part('firstName').toHaveValue('QAWCUSTOMR');
    await customer.element('name').part('firstName').toHaveValue('QAWCUSTOMR', { read: 'clipboard' });
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
    await customer.element('email').toHaveValue('QAWCUSTOMER@QAWOLF.EMAIL');

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

    await customer.element('save').click();
    await customer.element('saveStatus').toBeVisible();
    await customer.element('save').toHaveVariant('disabled');

    const moveWindow = page.locator('#moveWindow');
    for (const pos of ['middle-left', 'bottom-right']) {
      await moveWindow.click();
      await expect(moveWindow).toHaveAttribute('data-pos', pos);
      await customer.waitFor();
      await customer.element('customerNumber').toHaveValue('SEA314535');
      await customer.element('name').part('lastName').toHaveValue('SEARCH');
      await customer.element('vin').toHaveValue('5NPDH4AE1DH314535');
    }
  });
});
