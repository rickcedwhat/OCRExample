import { test, expect } from '@playwright/test';
import { PlaywrightFormTester } from '../src/playwright-helper.js';
import { loginScreenTyped } from './screens/login-typed/config.js';
import { cleanupOCR } from '../src/utils/ocr.js';

/**
 * Type safety examples
 * 
 * Shows how TypeScript catches typos at compile time
 */

test.describe('Type-Safe Element Names', () => {
  test.afterAll(async () => {
    await cleanupOCR();
  });

  test('typed element names - compile-time safety', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    const screenshot = await formTester.captureScreen('login.png');
    const screen = await formTester.compareScreen(screenshot, loginScreenTyped);

    // ✅ These work - correct element names
    await screen.element('Username').toBeFilled();
    await screen.element('Password').toBeEmpty();
    await screen.element('Login Button').toHaveVariant('enabled');
    await screen.element('Loading Spinner').toBeVisible();

    // ❌ These give TypeScript errors at compile time:
    // await screen.element('UserName').toBeFilled();          // Error: "UserName" doesn't exist
    // await screen.element('username').toBeFilled();          // Error: wrong case
    // await screen.element('Login Btn').click();             // Error: "Login Btn" doesn't exist
    // await screen.element('NonExistent').toBeVisible();     // Error: "NonExistent" doesn't exist

    // IDE autocomplete shows: 'Username' | 'Password' | 'Login Button' | 'Loading Spinner'
    // screen.element('|')  // <-- Put cursor here, IDE suggests valid names!
  });

  test('handling animated elements (loading spinner)', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    // Submit form that shows loading spinner
    const screenshot = await formTester.captureScreen('login-loading.png');
    const screen = await formTester.compareScreen(screenshot, loginScreenTyped);

    // For animated elements, we can:
    // 1. Check if it's visible (uses looser matching)
    await screen.element('Loading Spinner').toBeVisible();

    // 2. Check it's filled (region changed from blank)
    await screen.element('Loading Spinner').toBeFilled();

    // 3. Get confidence (might be lower for animated elements)
    const spinner = screen.element('Loading Spinner');
    const confidence = spinner.confidence();
    console.log('Spinner confidence:', confidence);
    
    // Animated elements might have lower confidence, that's OK
    expect(confidence).toBeGreaterThan(0.5);  // Lower threshold for animated
  });
});

/**
 * Type safety at the type level
 * 
 * You can also use element names in your own types:
 */

// This type is extracted from the config
import type { LoginElementName } from './screens/login-typed/config.js';

function checkLoginElement(elementName: LoginElementName) {
  // elementName can only be 'Username' | 'Password' | 'Login Button' | 'Loading Spinner'
  console.log('Checking:', elementName);
}

// ✅ Valid
checkLoginElement('Username');
checkLoginElement('Password');

// ❌ TypeScript error
// checkLoginElement('UserName');     // Error
// checkLoginElement('username');     // Error
