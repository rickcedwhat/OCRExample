import { test, expect } from '@playwright/test';
import { PlaywrightFormTester } from '../src/playwright-helper.js';
import { 
  isElementFilled, 
  getElementValue, 
  getFilledElements 
} from '../src/screen-config.js';
import { loginScreen } from './screens/login/config.js';
import { checkoutScreen } from './screens/checkout/config.js';
import { cleanupOCR } from '../src/utils/ocr.js';

/**
 * Example tests using screen-based configurations
 * 
 * This demonstrates the new screen config pattern where:
 * - Each screen has its own folder with blank.png and templates/
 * - config.ts defines all elements for that screen
 * - Tests just import and use the screen config
 */

test.describe('Screen Config Pattern Examples', () => {
  test.afterAll(async () => {
    await cleanupOCR();
  });

  test('login screen - using screen config', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    // Navigate to login (example - replace with your RDP/app navigation)
    // await page.goto('your-app/login');
    // await page.mouse.click(100, 200);  // Username field
    // await page.keyboard.type('user@example.com');

    // Capture screenshot
    const screenshot = await formTester.captureScreen('login-filled.png');
    
    // Use imported screen config - much cleaner!
    const results = await formTester.compareScreen(screenshot, loginScreen);

    // Helper functions make assertions cleaner
    expect(isElementFilled(results, 'Username')).toBe(true);
    expect(isElementFilled(results, 'Password')).toBe(true);
    expect(getElementValue(results, 'Username')).toContain('user');
    
    // Or use direct element access
    const loginBtn = results.elements.find(e => e.name === 'Login Button');
    expect(loginBtn?.isEmpty).toBe(false);
  });

  test('checkout screen - using screen config', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    // Navigate and fill checkout form
    // await page.goto('your-app/checkout');
    // ... fill card details ...

    const screenshot = await formTester.captureScreen('checkout-filled.png');
    
    // Use imported checkout config
    const results = await formTester.compareScreen(screenshot, checkoutScreen);

    // Check multiple elements at once
    const filledElements = getFilledElements(results);
    console.log('Filled elements:', filledElements);

    expect(isElementFilled(results, 'Card Number')).toBe(true);
    expect(isElementFilled(results, 'CVV')).toBe(true);
    expect(isElementFilled(results, 'Pay Button')).toBe(true);
    
    // No error icon should be present
    expect(isElementFilled(results, 'Error Icon')).toBe(false);
  });

  test('multi-screen flow - reusing configs', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    // === Login Screen ===
    // await page.goto('your-app/login');
    // ... fill login form ...
    
    const loginScreenshot = await formTester.captureScreen('flow-login.png');
    const loginResults = await formTester.compareScreen(loginScreenshot, loginScreen);
    
    expect(isElementFilled(loginResults, 'Username')).toBe(true);
    expect(isElementFilled(loginResults, 'Password')).toBe(true);
    
    // Click login
    const loginBtn = loginResults.elements.find(e => e.name === 'Login Button');
    if (loginBtn) {
      await page.mouse.click(
        loginBtn.location.x + loginBtn.location.width / 2,
        loginBtn.location.y + loginBtn.location.height / 2
      );
    }

    // === Checkout Screen ===
    await formTester.waitForStableScreen();
    // await page.goto('your-app/checkout');
    // ... fill payment ...
    
    const checkoutScreenshot = await formTester.captureScreen('flow-checkout.png');
    const checkoutResults = await formTester.compareScreen(checkoutScreenshot, checkoutScreen);
    
    expect(isElementFilled(checkoutResults, 'Card Number')).toBe(true);
    expect(isElementFilled(checkoutResults, 'Success Icon')).toBe(false);
    
    // Click pay
    const payBtn = checkoutResults.elements.find(e => e.name === 'Pay Button');
    if (payBtn) {
      await page.mouse.click(
        payBtn.location.x + payBtn.location.width / 2,
        payBtn.location.y + payBtn.location.height / 2
      );
    }

    // === Verify Success ===
    await formTester.waitForStableScreen();
    const successScreenshot = await formTester.captureScreen('flow-success.png');
    const successResults = await formTester.compareScreen(successScreenshot, checkoutScreen);
    
    // Success icon should now be visible
    expect(isElementFilled(successResults, 'Success Icon')).toBe(true);
  });

  test('compare element states before and after', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);

    // === Before Interaction ===
    const beforeScreenshot = await formTester.captureScreen('checkout-before.png');
    const beforeResults = await formTester.compareScreen(beforeScreenshot, checkoutScreen);
    
    const beforeFilledCount = beforeResults.filledElements;
    
    // === Interact ===
    // Fill some fields...
    
    // === After Interaction ===
    const afterScreenshot = await formTester.captureScreen('checkout-after.png');
    const afterResults = await formTester.compareScreen(afterScreenshot, checkoutScreen);
    
    const afterFilledCount = afterResults.filledElements;
    
    // More elements should be filled after interaction
    expect(afterFilledCount).toBeGreaterThan(beforeFilledCount);
    
    // Specific element should now be filled
    expect(isElementFilled(beforeResults, 'Card Number')).toBe(false);
    expect(isElementFilled(afterResults, 'Card Number')).toBe(true);
  });
});
