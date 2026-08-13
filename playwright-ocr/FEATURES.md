# Key Features

## 🎯 Type-Safe Element Names

Get **compile-time errors** for typos instead of runtime failures.

```typescript
const loginScreen = defineTypedScreen({
  name: 'login',
  baseDir: __dirname,
  elements: [
    { name: 'Username', template: 'username.png', type: ElementType.FIELD },
    { name: 'Password', template: 'password.png', type: ElementType.FIELD },
  ] as const,  // Magic ingredient!
});

// ✅ TypeScript catches typos BEFORE running tests
await screen.element('Username').toBeFilled();

// ❌ TypeScript error at compile time:
await screen.element('UserName').toBeFilled();
//                   ~~~~~~~~~~
// Error: Argument of type '"UserName"' is not assignable to parameter of type '"Username" | "Password"'
```

**Benefits:**
- Typos caught in your editor (red squiggle!)
- IDE autocomplete shows valid element names
- Safe refactoring - rename in config, all usages show errors
- No more runtime "element not found" surprises

See [TYPE_SAFETY.md](./TYPE_SAFETY.md) for full documentation.

---

## 🔄 Animated Element Support

Handle loading spinners, progress bars, and other dynamic elements that constantly change pixels.

```typescript
const checkoutScreen = defineTypedScreen({
  name: 'checkout',
  baseDir: __dirname,
  elements: [
    {
      name: 'Loading Spinner',
      template: 'spinner.png',
      type: ElementType.ICON,
      animated: true,  // Tell library this element moves!
    },
    {
      name: 'Pay Button',
      variants: {
        enabled: { template: 'pay-enabled.png' },
        loading: { template: 'pay-loading.png' },  // Button shows spinner
      },
      type: ElementType.BUTTON,
    },
  ] as const,
});

// Check if animated element is present/visible
await screen.element('Loading Spinner').toBeVisible();
await screen.element('Loading Spinner').toBeFilled();

// After action completes, verify it's gone
await screen.element('Loading Spinner').toBeEmpty();
```

**How it works:**
- Uses **looser matching thresholds** for animated elements (0.5 instead of 0.7)
- Checks if region **changed from blank** (not exact pixels)
- **No OCR** on animated elements (text is moving anyway)
- Considers element "found" if **anything is present** in that region

**What you can detect:**
- ✅ Loading spinner appeared
- ✅ Loading spinner disappeared
- ✅ Progress bar region changed
- ✅ Blinking indicator is active
- ❌ Exact animation frame (not needed for testing)
- ❌ Progress percentage from animated bar (use discrete states instead)

See [ANIMATED_ELEMENTS.md](./ANIMATED_ELEMENTS.md) for full documentation and patterns.

---

## 🎨 Element Variants

Define multiple visual states for the same UI element.

```typescript
{
  name: 'Submit Button',
  variants: {
    enabled: { template: 'submit-enabled.png' },
    disabled: { template: 'submit-disabled.png' },
    loading: { template: 'submit-loading.png' },
  },
  type: ElementType.BUTTON,
}

// Library automatically detects which variant is showing
await screen.element('Submit Button').toHaveVariant('enabled');
await screen.element('Submit Button').toHaveVariant('disabled');
await screen.element('Submit Button').toHaveVariant('loading');
```

**Common use cases:**
- Button states: enabled / disabled / loading / success / error
- Checkboxes: checked / unchecked / indeterminate
- Icons: success / warning / error / info
- Toggle switches: on / off
- Tabs: active / inactive

---

## 🧪 Playwright-Idiomatic API

Familiar chainable assertions that work like Playwright's built-in `expect()`.

```typescript
// Element assertions (chain like Playwright!)
await screen.element('Username').toBeFilled();
await screen.element('Username').toHaveText('john@example.com');
await screen.element('Password').toBeEmpty();
await screen.element('Error Message').toBeVisible();
await screen.element('Submit Button').toHaveVariant('enabled');

// Element interactions
await screen.element('Username').fill('new-value');
await screen.element('Submit Button').click();
await screen.element('Checkbox').check();

// Get raw data when needed
const username = screen.element('Username');
expect(username.value()).toBe('john@example.com');
expect(username.confidence()).toBeGreaterThan(0.9);
expect(username.location()).toEqual({ x: 100, y: 200, width: 300, height: 40 });
```

---

## 📁 Screen-Based Configuration

Organize templates and configs by logical screens, not scattered across test files.

```
tests/
  screens/
    login/
      blank.png                    # Screenshot of empty login screen
      templates/
        username-field.png
        password-field.png
        login-btn-enabled.png
        login-btn-disabled.png
      config.ts                    # Element definitions
    checkout/
      blank.png
      templates/
        card-number.png
        cvv.png
        pay-btn-enabled.png
        loading-spinner.png
      config.ts
```

**Benefits:**
- Easy to find and update templates
- Reusable across tests
- Co-located configs and assets
- Clear screen boundaries
- Simple template management

```typescript
// Define once, use everywhere
export const loginScreen = defineTypedScreen({
  name: 'login',
  baseDir: __dirname,
  elements: [
    { name: 'Username', template: 'username-field.png' },
    { name: 'Password', template: 'password-field.png' },
  ] as const,
});

// Use in multiple tests
import { loginScreen } from './screens/login/config';

test('login validation', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  const screenshot = await formTester.captureScreen('login.png');
  const screen = await formTester.compareScreen(screenshot, loginScreen);
  
  await screen.element('Username').toBeFilled();
});
```

---

## 🛠️ Visual Template Manager

Browser-based tool for creating templates **without writing code**.

```bash
npm run template-manager
# Opens tool at http://localhost:8000
```

**Features:**
- Upload blank screenshot
- Draw boxes around UI elements
- Name elements and set types
- Test templates live (instant feedback)
- Export TypeScript config automatically

**Workflow:**
1. Upload blank screenshot of your screen
2. Click "Add Element", draw box around each element
3. Name it, set type (field/button/icon), specify variant if needed
4. Click "Test" to see if template matches correctly
5. Click "Export Config" to get TypeScript code
6. Copy-paste into your `config.ts` file

No manual cropping, no guessing at pixel coordinates!

See [TEMPLATES_GUIDE.md](./TEMPLATES_GUIDE.md) for detailed instructions.

---

## ⚡ Performance

| Operation | Time | Details |
|-----------|------|---------|
| Template matching | ~50-100ms | Per element |
| OCR extraction | ~200-400ms | Per text field |
| Full form (10 elements) | ~2-5s | Including 5 text fields |
| GPT Vision API | ~2-5s | **Per screenshot** |

**Parallel processing:** Extract multiple elements simultaneously for even faster results.

---

## 🔒 Privacy & Offline

- ✅ **All processing is local** - no data sent to external APIs
- ✅ **Works offline** - no internet required after installation
- ✅ **GDPR/compliance friendly** - sensitive form data never leaves your machine
- ✅ **CI/CD ready** - runs in isolated environments without API keys

---

## 🎓 Examples

### Full Login Flow
```typescript
test('login flow with loading states', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  await page.goto('/login');
  
  // Capture initial state
  let screenshot = await formTester.captureScreen('login-initial.png');
  let screen = await formTester.compareScreen(screenshot, loginScreen);
  
  // Verify empty form
  await screen.element('Username').toBeEmpty();
  await screen.element('Password').toBeEmpty();
  await screen.element('Login Button').toHaveVariant('disabled');
  
  // Fill form
  await screen.element('Username').fill('user@example.com');
  await screen.element('Password').fill('secret123');
  
  // Capture filled state
  screenshot = await formTester.captureScreen('login-filled.png');
  screen = await formTester.compareScreen(screenshot, loginScreen);
  
  await screen.element('Username').toHaveText('user@example.com');
  await screen.element('Password').toBeFilled();  // Don't extract password text!
  await screen.element('Login Button').toHaveVariant('enabled');
  
  // Submit
  await screen.element('Login Button').click();
  
  // Check loading state
  await page.waitForTimeout(100);
  screenshot = await formTester.captureScreen('login-loading.png');
  screen = await formTester.compareScreen(screenshot, loginScreen);
  
  await screen.element('Login Button').toHaveVariant('loading');
  await screen.element('Loading Spinner').toBeVisible();  // Animated!
  
  // Wait for success
  await formTester.waitForStableScreen();
  screenshot = await formTester.captureScreen('login-success.png');
  screen = await formTester.compareScreen(screenshot, dashboardScreen);
  
  await screen.element('Welcome Message').toBeFilled();
  await screen.element('Loading Spinner').toBeEmpty();  // Gone!
});
```

### Checkout with Progress Indicator
```typescript
test('checkout with animated progress bar', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  await page.goto('/checkout');
  
  let screenshot = await formTester.captureScreen('checkout.png');
  let screen = await formTester.compareScreen(screenshot, checkoutScreen);
  
  // Fill payment info
  await screen.element('Card Number').fill('4111111111111111');
  await screen.element('Expiry Date').fill('12/25');
  await screen.element('CVV').fill('123');
  
  screenshot = await formTester.captureScreen('checkout-filled.png');
  screen = await formTester.compareScreen(screenshot, checkoutScreen);
  
  await screen.element('Pay Button').toHaveVariant('enabled');
  await screen.element('Pay Button').click();
  
  // Progress bar is animated - just check it's present
  await page.waitForTimeout(200);
  screenshot = await formTester.captureScreen('checkout-processing.png');
  screen = await formTester.compareScreen(screenshot, checkoutScreen);
  
  await screen.element('Progress Bar').toBeVisible();  // Animated!
  await screen.element('Pay Button').toHaveVariant('loading');
  
  // Wait for completion
  await formTester.waitForStableScreen();
  screenshot = await formTester.captureScreen('checkout-success.png');
  screen = await formTester.compareScreen(screenshot, checkoutScreen);
  
  await screen.element('Success Icon').toHaveVariant('success');
  await screen.element('Progress Bar').toBeEmpty();  // Gone!
});
```

---

## 📚 Documentation

- [Quick Start](./QUICK_START.md) - Get started in 5 minutes
- [New API Guide](./NEW_API.md) - Learn the Playwright-style API
- [Type Safety](./TYPE_SAFETY.md) - Compile-time element name checking
- [Animated Elements](./ANIMATED_ELEMENTS.md) - Handle loading spinners and dynamic UI
- [Templates Guide](./TEMPLATES_GUIDE.md) - Create and manage element templates
- [Migration Guide](./MIGRATION.md) - Upgrade from old API
- [Approaches Comparison](./APPROACHES_COMPARISON.md) - Compare different testing approaches
- [Why This Beats GPT](./WHY_THIS_BEATS_GPT.md) - Detailed comparison with GPT Vision API

---

## 🎯 When to Use This Library

### ✅ Great For:
- Desktop applications accessed via RDP
- Testing UIs where DOM is not accessible
- Forms with typed/printed text (not handwriting)
- Cost-sensitive testing (avoid GPT API fees)
- Offline/airgapped environments
- Privacy-sensitive applications
- Fast CI/CD pipelines
- Deterministic test results

### ⚠️ Not Ideal For:
- Web apps with accessible DOM (use Playwright locators instead)
- Handwritten text recognition
- Complex image understanding (use GPT Vision for that)
- Natural language verification ("does this look professional?")

---

## 🤝 Contributing

Found a bug? Have a feature idea? PRs welcome!

---

## 📄 License

MIT
