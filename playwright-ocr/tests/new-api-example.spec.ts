import { test, expect } from '@playwright/test';
import { PlaywrightFormTester } from '../src/playwright-helper.js';
import { loginScreenV2 } from './screens/login-v2/config.js';
import { cleanupOCR } from '../src/utils/ocr.js';

/**
 * New Playwright-idiomatic API examples
 * 
 * Features:
 * - Chainable assertions like Playwright
 * - Element variants (enabled/disabled, checked/unchecked, etc.)
 * - Built-in retry logic
 * - Clean, readable test code
 */

test.describe('New Playwright-Style API', () => {
  test.afterAll(async () => {
    await cleanupOCR();
  });

  test('chainable assertions - basic usage', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    // Navigate and interact
    // await page.goto('your-app/login');
    // await page.mouse.click(100, 200);
    // await page.keyboard.type('user@example.com');

    // Capture and analyze
    const screenshot = await formTester.captureScreen('login.png');
    const screen = await formTester.compareScreen(screenshot, loginScreenV2);

    // Playwright-style chainable assertions!
    await screen.element('Username').toBeFilled();
    await screen.element('Username').toHaveText('user@example.com');
    await screen.element('Password').toBeFilled();
    
    // Check button variant
    await screen.element('Login Button').toHaveVariant('enabled');
    await screen.element('Login Button').toBeVisible();
    
    // Check checkbox state
    await screen.element('Remember Me').toHaveVariant('checked');
    // Or use helper
    await screen.element('Remember Me').toBeChecked();
    
    // No error icon present
    await screen.element('Status Icon').toHaveVariant('success');
  });

  test('element interactions', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    const screenshot = await formTester.captureScreen('login.png');
    const screen = await formTester.compareScreen(screenshot, loginScreenV2);

    // Get element and interact with it
    const loginBtn = screen.element('Login Button');
    
    // Check state before clicking
    await loginBtn.toHaveVariant('enabled');
    await loginBtn.toBeVisible();
    
    // Click the button (uses detected location)
    await loginBtn.click();
    
    // After click, verify loading state
    // (would need to recapture screen in real test)
    // await screen.element('Login Button').toHaveVariant('loading');
  });

  test('form filling workflow', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    // === Initial State ===
    let screenshot = await formTester.captureScreen('login-empty.png');
    let screen = await formTester.compareScreen(screenshot, loginScreenV2);

    // Verify empty state
    await screen.element('Username').toBeEmpty();
    await screen.element('Password').toBeEmpty();
    await screen.element('Login Button').toHaveVariant('disabled');

    // === Fill Username ===
    const usernameField = screen.element('Username');
    await usernameField.fill('user@example.com');
    
    // Recapture and verify
    screenshot = await formTester.captureScreen('login-username.png');
    screen = await formTester.compareScreen(screenshot, loginScreenV2);
    
    await screen.element('Username').toBeFilled();
    await screen.element('Username').toHaveText('user@example.com');
    await screen.element('Login Button').toHaveVariant('disabled'); // Still disabled

    // === Fill Password ===
    await screen.element('Password').fill('password123');
    
    screenshot = await formTester.captureScreen('login-filled.png');
    screen = await formTester.compareScreen(screenshot, loginScreenV2);
    
    await screen.element('Password').toBeFilled();
    await screen.element('Login Button').toHaveVariant('enabled'); // Now enabled!

    // === Submit ===
    await screen.element('Login Button').click();
    
    // Wait for response
    await formTester.waitForStableScreen();
    screenshot = await formTester.captureScreen('login-success.png');
    screen = await formTester.compareScreen(screenshot, loginScreenV2);
    
    await screen.element('Status Icon').toHaveVariant('success');
  });

  test('multiple variant checks', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    const screenshot = await formTester.captureScreen('login.png');
    const screen = await formTester.compareScreen(screenshot, loginScreenV2);

    // Check button variants
    const loginBtn = screen.element('Login Button');
    
    // These throw if variant doesn't match
    await loginBtn.toHaveVariant('enabled');  // ✅ Passes if enabled
    // await loginBtn.toHaveVariant('disabled');  // ❌ Throws if enabled
    // await loginBtn.toHaveVariant('loading');   // ❌ Throws if enabled

    // Check icon variants
    const statusIcon = screen.element('Status Icon');
    await statusIcon.toHaveVariant('success');
    // Or check for specific states
    // await statusIcon.toHaveVariant('error');
    // await statusIcon.toHaveVariant('warning');
  });

  test('helper methods for counts and iteration', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    const screenshot = await formTester.captureScreen('login.png');
    const screen = await formTester.compareScreen(screenshot, loginScreenV2);

    // Get counts
    console.log('Total elements:', screen.count());
    console.log('Filled elements:', screen.filledCount());
    console.log('Empty elements:', screen.emptyCount());

    // Check if element exists
    if (screen.hasElement('Status Icon')) {
      await screen.element('Status Icon').toBeVisible();
    }

    // Iterate over filled elements
    for (const element of screen.filledElements()) {
      console.log(`${element.info().name}: ${element.value()}`);
    }

    // Get all elements
    for (const element of screen.allElements()) {
      const info = element.info();
      console.log(`${info.name} - Filled: ${!info.isEmpty}, Variant: ${info.variant}`);
    }
  });

  test('combining with expect for complex assertions', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    const screenshot = await formTester.captureScreen('login.png');
    const screen = await formTester.compareScreen(screenshot, loginScreenV2);

    // Use element methods directly
    await screen.element('Username').toBeFilled();
    
    // Or combine with expect for more control
    const username = screen.element('Username');
    expect(username.value()).toContain('@');
    expect(username.confidence()).toBeGreaterThan(0.9);
    
    // Get raw data if needed
    const rawData = screen.raw();
    expect(rawData.totalElements).toBe(6);
    expect(rawData.filledElements).toBeGreaterThan(0);
  });

  test('error handling shows clear messages', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    const screenshot = await formTester.captureScreen('login.png');
    const screen = await formTester.compareScreen(screenshot, loginScreenV2);

    // These throw descriptive errors:
    
    try {
      await screen.element('Username').toBeEmpty();
      // If username is filled, throws:
      // Error: Element "Username" is not empty
    } catch (error: any) {
      console.log('Expected error:', error.message);
    }

    try {
      await screen.element('Login Button').toHaveVariant('disabled');
      // If button is enabled, throws:
      // Error: Element "Login Button" does not have variant "disabled". Actual: "enabled"
    } catch (error: any) {
      console.log('Expected error:', error.message);
    }

    try {
      await screen.element('Username').toHaveText('wrong@email.com');
      // If text doesn't match, throws:
      // Error: Element "Username" does not have text "wrong@email.com". Actual: "user@example.com"
    } catch (error: any) {
      console.log('Expected error:', error.message);
    }
  });
});
