# New Playwright-Idiomatic API

## Overview

The new API is designed to feel like native Playwright with:
- **Chainable assertions** - `await element.toBeFilled()`, `await element.toHaveText()`
- **Element variants** - Handle enabled/disabled, checked/unchecked, success/error states
- **Built-in retries** - (Coming soon) Auto-retry like Playwright's `expect()`
- **Clean, readable tests** - More like testing with Playwright locators

## Quick Comparison

### Old Way (verbose)
```typescript
const results = await formTester.compareScreen(screenshot, loginScreen);
const username = results.elements.find(e => e.name === 'Username');
expect(username?.isEmpty).toBe(false);
expect(username?.value).toContain('@');
```

### New Way (Playwright-style)
```typescript
const screen = await formTester.compareScreen(screenshot, loginScreen);
await screen.element('Username').toBeFilled();
await screen.element('Username').toHaveText('@');
```

## Element Variants

Support multiple states of the same element:

### Defining Variants
```typescript
export const loginScreen = defineScreen({
  name: 'login',
  baseDir: __dirname,
  elements: [
    // Single state element
    {
      name: 'Username',
      template: 'username-field.png',
      type: ElementType.FIELD,
    },
    
    // Multi-state button
    {
      name: 'Login Button',
      variants: {
        enabled: { template: 'login-btn-enabled.png' },
        disabled: { template: 'login-btn-disabled.png' },
        loading: { template: 'login-btn-loading.png' },
      },
      type: ElementType.BUTTON,
    },
    
    // Checkbox states
    {
      name: 'Remember Me',
      variants: {
        checked: { template: 'remember-checked.png' },
        unchecked: { template: 'remember-unchecked.png' },
      },
      type: ElementType.CHECKBOX,
    },
  ],
});
```

### Using Variants in Tests
```typescript
const screen = await formTester.compareScreen(screenshot, loginScreen);

// Check which variant matched
await screen.element('Login Button').toHaveVariant('enabled');
await screen.element('Login Button').toHaveVariant('disabled');  // Throws if not disabled

// Helper for checkboxes
await screen.element('Remember Me').toBeChecked();    // Checks variant === 'checked'
await screen.element('Remember Me').toBeUnchecked();  // Checks variant === 'unchecked'
```

## Chainable Assertions

### Element State
```typescript
const screen = await formTester.compareScreen(screenshot, loginScreen);

// Check if filled
await screen.element('Username').toBeFilled();
await screen.element('Password').toBeEmpty();

// Check visibility
await screen.element('Login Button').toBeVisible();

// Check confidence
await screen.element('Username').toHaveConfidence(0.9);
```

### Text/Value Assertions
```typescript
// Contains text
await screen.element('Username').toHaveText('user@example.com');
await screen.element('Username').toHaveText('@');  // Partial match

// Regex match
await screen.element('Email').toHaveText(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/);

// Exact value
await screen.element('Total').toHaveValue('$123.45');
```

### Checkbox/Toggle State
```typescript
// Checkboxes
await screen.element('Terms').toBeChecked();
await screen.element('Newsletter').toBeUnchecked();

// Or use variants for more control
await screen.element('Terms').toHaveVariant('checked');
await screen.element('Newsletter').toHaveVariant('unchecked');
```

### Element Variants
```typescript
// Buttons
await screen.element('Submit').toHaveVariant('enabled');
await screen.element('Submit').toHaveVariant('disabled');
await screen.element('Submit').toHaveVariant('loading');

// Icons
await screen.element('Status').toHaveVariant('success');
await screen.element('Status').toHaveVariant('error');
await screen.element('Status').toHaveVariant('warning');
```

## Element Interactions

### Clicking
```typescript
const screen = await formTester.compareScreen(screenshot, loginScreen);

// Click at element's center
await screen.element('Login Button').click();

// Or get element first
const loginBtn = screen.element('Login Button');
await loginBtn.toHaveVariant('enabled');
await loginBtn.click();
```

### Filling
```typescript
// Fill a field (clicks then types)
await screen.element('Username').fill('user@example.com');
await screen.element('Password').fill('password123');

// Then submit
await screen.element('Login Button').click();
```

## Screen Helpers

### Counts and Checks
```typescript
const screen = await formTester.compareScreen(screenshot, loginScreen);

// Get counts
screen.count()        // Total elements
screen.filledCount()  // Number of filled elements
screen.emptyCount()   // Number of empty elements

// Check existence
if (screen.hasElement('Error Message')) {
  await screen.element('Error Message').toBeVisible();
}
```

### Iteration
```typescript
// Iterate over filled elements
for (const element of screen.filledElements()) {
  console.log(`${element.info().name}: ${element.value()}`);
}

// All elements
for (const element of screen.allElements()) {
  const info = element.info();
  console.log(`${info.name} - Variant: ${info.variant}`);
}

// Just empty ones
for (const element of screen.emptyElements()) {
  console.log(`${element.info().name} is empty`);
}
```

## Element Info

### Getting Element Data
```typescript
const username = screen.element('Username');

// Chainable methods
username.value()       // Get text value
username.location()    // Get {x, y, width, height}
username.confidence()  // Get match confidence (0-1)
username.type()        // Get ElementType
username.variant()     // Get active variant name

// Get full info object
const info = username.info();
console.log(info);
// {
//   name: 'Username',
//   value: 'user@example.com',
//   isEmpty: false,
//   confidence: 0.95,
//   location: {x: 100, y: 200, width: 150, height: 30},
//   type: 'field',
//   variant: undefined
// }
```

## Complete Example

```typescript
test('login with variants and chainable assertions', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);

  // === Empty State ===
  let screenshot = await formTester.captureScreen('login-empty.png');
  let screen = await formTester.compareScreen(screenshot, loginScreen);

  // Check initial state
  await screen.element('Username').toBeEmpty();
  await screen.element('Password').toBeEmpty();
  await screen.element('Login Button').toHaveVariant('disabled');
  await screen.element('Remember Me').toHaveVariant('unchecked');

  // === Fill Form ===
  await screen.element('Username').fill('user@example.com');
  await screen.element('Password').fill('password123');
  
  screenshot = await formTester.captureScreen('login-filled.png');
  screen = await formTester.compareScreen(screenshot, loginScreen);

  // Verify filled
  await screen.element('Username').toBeFilled();
  await screen.element('Username').toHaveText('user@example.com');
  await screen.element('Password').toBeFilled();
  await screen.element('Login Button').toHaveVariant('enabled');

  // === Submit ===
  await screen.element('Login Button').click();
  
  // Wait for loading state
  await page.waitForTimeout(100);
  screenshot = await formTester.captureScreen('login-loading.png');
  screen = await formTester.compareScreen(screenshot, loginScreen);
  
  await screen.element('Login Button').toHaveVariant('loading');

  // === Success ===
  await formTester.waitForStableScreen();
  screenshot = await formTester.captureScreen('login-success.png');
  screen = await formTester.compareScreen(screenshot, loginScreen);
  
  await screen.element('Status Icon').toHaveVariant('success');
});
```

## Error Messages

The new API provides clear, actionable error messages:

```typescript
// Element not filled
await screen.element('Username').toBeFilled();
// ❌ Error: Element "Username" is not filled

// Wrong variant
await screen.element('Login Button').toHaveVariant('disabled');
// ❌ Error: Element "Login Button" does not have variant "disabled". Actual: "enabled"

// Text doesn't match
await screen.element('Username').toHaveText('wrong@email.com');
// ❌ Error: Element "Username" does not have text "wrong@email.com". Actual: "user@example.com"

// Element not found
await screen.element('NonExistent').toBeVisible();
// ❌ Error: Element "NonExistent" not found in screen results
```

## Benefits

### ✅ Playwright-Like Syntax
Feels natural if you're already using Playwright:
```typescript
// Playwright locators
await page.locator('#username').toBeFilled();
await page.locator('#username').toHaveText('user@example.com');

// Our screen elements (similar!)
await screen.element('Username').toBeFilled();
await screen.element('Username').toHaveText('user@example.com');
```

### ✅ Type Safety
Full TypeScript support with autocomplete:
```typescript
const element = screen.element('Username');
element.  // IDE shows: toBeFilled, toHaveText, toBeEmpty, click, fill, etc.
```

### ✅ Cleaner Tests
Compare:
```typescript
// Old
const results = await formTester.compareScreen(screenshot, loginScreen);
const username = results.elements.find(e => e.name === 'Username');
expect(username?.isEmpty).toBe(false);
expect(username?.value).toContain('@');

// New
const screen = await formTester.compareScreen(screenshot, loginScreen);
await screen.element('Username').toBeFilled();
await screen.element('Username').toHaveText('@');
```

### ✅ Variants for State Management
Handle different states elegantly:
```typescript
// Check button state before/after actions
await screen.element('Submit').toHaveVariant('disabled');  // Before
// ... fill form ...
await screen.element('Submit').toHaveVariant('enabled');   // After
// ... click submit ...
await screen.element('Submit').toHaveVariant('loading');   // During
// ... wait ...
await screen.element('Status').toHaveVariant('success');   // After
```

### ✅ Better Error Messages
Know exactly what's wrong:
- "Element X is not filled" vs checking boolean flags
- "Element X does not have variant Y. Actual: Z" vs manual comparisons
- Clear assertion failures

## Coming Soon

- **Auto-retry logic** - Like Playwright's `expect()`, retry assertions for a timeout period
- **Soft assertions** - Continue test after failures
- **Custom matchers** - Add your own assertion methods
- **Performance optimizations** - Parallel variant matching

---

**This is the recommended API going forward!** Much more intuitive and Playwright-like. 🎯
