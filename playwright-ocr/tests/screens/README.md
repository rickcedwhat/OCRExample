# Screen Configurations

This directory contains screen-specific configurations for UI testing.

## Structure

Each screen gets its own folder with:

```
screens/
├── login/
│   ├── blank.png              # Blank screenshot of this screen
│   ├── templates/             # Template images for elements
│   │   ├── username-field.png
│   │   ├── password-field.png
│   │   └── login-button.png
│   └── config.ts              # Element configuration
├── checkout/
│   ├── blank.png
│   ├── templates/
│   │   ├── card-field.png
│   │   └── pay-button.png
│   └── config.ts
└── settings/
    ├── blank.png
    ├── templates/
    └── config.ts
```

## Creating a New Screen

### 1. Create the folder structure

```bash
mkdir -p tests/screens/my-screen/templates
```

### 2. Add your blank screenshot

```bash
# Place your blank screenshot here
tests/screens/my-screen/blank.png
```

### 3. Add template images

```bash
# Crop each element and save to templates/
tests/screens/my-screen/templates/element-name.png
```

### 4. Create config.ts

```typescript
import { defineScreen } from '../../../src/screen-config.js';
import { ElementType } from '../../../src/types.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const myScreen = defineScreen({
  name: 'my-screen',
  baseDir: __dirname,
  elements: [
    {
      name: 'Submit Button',
      template: 'submit-button.png',  // Just filename, not full path
      type: ElementType.BUTTON,
    },
    {
      name: 'Email Field',
      template: 'email-field.png',
      type: ElementType.FIELD,
    },
  ],
});
```

## Using Screen Configs in Tests

### Import and use directly

```typescript
import { test, expect } from '@playwright/test';
import { PlaywrightFormTester } from 'playwright-ocr';
import { loginScreen } from './screens/login/config.js';
import { checkoutScreen } from './screens/checkout/config.js';

test('complete login flow', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  // Navigate and interact
  await page.goto('your-app/login');
  await page.mouse.click(100, 200);
  await page.keyboard.type('user@example.com');
  
  // Capture and test using screen config
  const screenshot = await formTester.captureScreen('login.png');
  const results = await formTester.compareScreen(screenshot, loginScreen);
  
  // Make assertions
  expect(results.elements.find(e => e.name === 'Username')?.isEmpty).toBe(false);
  expect(results.elements.find(e => e.name === 'Login Button')?.isEmpty).toBe(false);
});
```

### Use helper functions

```typescript
import { isElementFilled, getElementValue } from 'playwright-ocr/screen-config';
import { loginScreen } from './screens/login/config.js';

test('verify login form filled', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  // ... fill form ...
  
  const screenshot = await formTester.captureScreen('filled-login.png');
  const results = await formTester.compareScreen(screenshot, loginScreen);
  
  // Use helper functions for cleaner assertions
  expect(isElementFilled(results, 'Username')).toBe(true);
  expect(isElementFilled(results, 'Password')).toBe(true);
  expect(getElementValue(results, 'Username')).toBe('user@example.com');
});
```

## Benefits of Screen Configs

### ✅ Organization
- Each screen's configuration is self-contained
- Easy to find templates for a specific screen
- Clear separation between screens

### ✅ Reusability
```typescript
// Same config used in multiple tests
import { loginScreen } from './screens/login/config.js';

test('login with valid credentials', async ({ page }) => {
  const results = await formTester.compareScreen(screenshot, loginScreen);
  // ...
});

test('login with invalid credentials', async ({ page }) => {
  const results = await formTester.compareScreen(screenshot, loginScreen);
  // ...
});

test('login form validation', async ({ page }) => {
  const results = await formTester.compareScreen(screenshot, loginScreen);
  // ...
});
```

### ✅ Maintainability
```typescript
// When UI changes, update config in one place
// All tests using loginScreen automatically use new config
export const loginScreen = defineScreen({
  name: 'login',
  baseDir: __dirname,
  elements: [
    // Add new element here
    {
      name: 'SSO Button',
      template: 'sso-button.png',
      type: ElementType.BUTTON,
    },
  ],
});
```

### ✅ Type Safety
```typescript
// Full TypeScript support
import { loginScreen } from './screens/login/config.js';

// loginScreen.elementConfigs is properly typed
// loginScreen.blankScreenPath is a string
// All element names have autocomplete
```

## Template Manager Integration

The Template Manager tool can export in this format!

When you export, select "Screen Config Format" and it will generate:

```typescript
export const myScreen = defineScreen({
  name: 'my-screen',
  baseDir: __dirname,
  elements: [
    // ... your elements
  ],
});
```

Then just:
1. Save as `config.ts` in your screen folder
2. Place `blank.png` in screen folder
3. Save templates to `templates/` folder
4. Import and use in tests!

## Advanced: Screen Inheritance

For screens that share common elements:

```typescript
// screens/base-form/config.ts
const baseFormElements = [
  {
    name: 'Submit Button',
    template: 'submit-button.png',
    type: ElementType.BUTTON,
  },
  {
    name: 'Cancel Button',
    template: 'cancel-button.png',
    type: ElementType.BUTTON,
  },
];

// screens/login/config.ts
export const loginScreen = defineScreen({
  name: 'login',
  baseDir: __dirname,
  elements: [
    ...baseFormElements,  // Reuse common elements
    {
      name: 'Username',
      template: 'username-field.png',
      type: ElementType.FIELD,
    },
  ],
});
```

## Tips

1. **Name templates descriptively** - `card-number-field.png` not `field1.png`
2. **Keep blank.png updated** - When UI changes, update blank screenshot
3. **Version control everything** - Commit screen folders to git
4. **Document elements** - Add comments in config.ts explaining what each element is
5. **Test your config** - Use Template Manager's test mode to verify templates work

## Example Test Suite

```typescript
import { test, expect } from '@playwright/test';
import { PlaywrightFormTester } from 'playwright-ocr';
import { loginScreen } from './screens/login/config.js';
import { checkoutScreen } from './screens/checkout/config.js';
import { settingsScreen } from './screens/settings/config.js';

test.describe('E2E User Flow', () => {
  test('complete purchase flow', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);
    
    // Test login screen
    await page.goto('app/login');
    // ... interact ...
    const loginResults = await formTester.compareScreen(
      await formTester.captureScreen('login.png'),
      loginScreen
    );
    expect(isElementFilled(loginResults, 'Username')).toBe(true);
    
    // Test checkout screen
    await page.goto('app/checkout');
    // ... interact ...
    const checkoutResults = await formTester.compareScreen(
      await formTester.captureScreen('checkout.png'),
      checkoutScreen
    );
    expect(isElementFilled(checkoutResults, 'Card Number')).toBe(true);
    
    // Each screen has its own config!
  });
});
```

## Migration from Inline Configs

### Before
```typescript
test('login', async ({ page }) => {
  const elementConfigs = [
    { name: 'Username', templatePath: './fixtures/username.png', type: ElementType.FIELD },
    { name: 'Password', templatePath: './fixtures/password.png', type: ElementType.FIELD },
  ];
  
  const results = await formTester.compareScreen(screenshot, {
    blankScreenPath: './fixtures/blank-login.png',
    elementConfigs,
  });
});
```

### After
```typescript
import { loginScreen } from './screens/login/config.js';

test('login', async ({ page }) => {
  const results = await formTester.compareScreen(screenshot, loginScreen);
});
```

Much cleaner! 🎯
