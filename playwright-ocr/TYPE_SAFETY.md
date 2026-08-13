# Type-Safe Element Names

## The Problem

Using string-based element names means typos are only caught at **runtime**:

```typescript
// ❌ Runtime error - typo not caught until test runs!
await screen.element('UserName').toBeFilled();  // Should be 'Username'
```

TypeScript can't help because it doesn't know which element names are valid.

## The Solution: `defineTypedScreen`

Use `defineTypedScreen` instead of `defineScreen` to get **compile-time type safety**:

```typescript
import { defineTypedScreen } from '../../../src/typed-screen.js';
import { ElementType } from '../../../src/types.js';

export const loginScreen = defineTypedScreen({
  name: 'login',
  baseDir: __dirname,
  elements: [
    {
      name: 'Username',
      template: 'username-field.png',
      type: ElementType.FIELD,
    },
    {
      name: 'Password',
      template: 'password-field.png',
      type: ElementType.FIELD,
    },
    {
      name: 'Login Button',
      variants: {
        enabled: { template: 'login-btn-enabled.png' },
        disabled: { template: 'login-btn-disabled.png' },
      },
      type: ElementType.BUTTON,
    },
  ] as const,  // Important: 'as const' for literal types!
});
```

**Key differences:**
1. Use `defineTypedScreen` instead of `defineScreen`
2. Add `as const` after the `elements` array
3. That's it! Now you get compile-time safety.

## Usage in Tests

```typescript
import { loginScreen } from './screens/login-typed/config.js';

test('login form - type safe', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  const screenshot = await formTester.captureScreen('login.png');
  const screen = await formTester.compareScreen(screenshot, loginScreen);

  // ✅ These work - correct element names
  await screen.element('Username').toBeFilled();
  await screen.element('Password').toBeEmpty();
  await screen.element('Login Button').toHaveVariant('enabled');

  // ❌ These give TypeScript errors at COMPILE TIME:
  // await screen.element('UserName').toBeFilled();     // Error: "UserName" doesn't exist
  // await screen.element('username').toBeFilled();     // Error: wrong case  
  // await screen.element('Login Btn').click();        // Error: "Login Btn" doesn't exist
  // await screen.element('NonExistent').toBeVisible(); // Error: "NonExistent" doesn't exist
});
```

## IDE Autocomplete

Your IDE will now suggest valid element names:

```typescript
// Put cursor after the quote, IDE shows: 'Username' | 'Password' | 'Login Button'
screen.element('|')
```

No more guessing or checking the config file!

## Exporting Element Name Types

You can export element names as a type for use elsewhere:

```typescript
// In config.ts
export type LoginElementName = 
  | 'Username' 
  | 'Password' 
  | 'Login Button';

// In your test helpers
function checkLoginElement(elementName: LoginElementName) {
  // TypeScript knows elementName can only be one of these strings
}

// ✅ Valid
checkLoginElement('Username');

// ❌ TypeScript error
checkLoginElement('UserName');  // Typo caught!
```

## How It Works

### Magic of `as const`

```typescript
// Without 'as const' - element names are just 'string'
const elements = [
  { name: 'Username', template: '...' },
];
// Type: { name: string; template: string; }[]

// With 'as const' - element names are literal types!
const elements = [
  { name: 'Username', template: '...' },
] as const;
// Type: readonly [{ readonly name: 'Username'; readonly template: '...'; }]
```

### Type Extraction

`defineTypedScreen` extracts those literal types:

```typescript
type ExtractElementNames<T extends readonly ElementConfig[]> = 
  T[number]['name'];

// For our config, this becomes:
// 'Username' | 'Password' | 'Login Button'
```

### Typed Screen Result

Returns a `TypedScreenResult` with typed `.element()` method:

```typescript
export class TypedScreenResult<TElements extends readonly ElementConfig[]> {
  element<TName extends ExtractElementNames<TElements>>(
    name: TName  // Only accepts names from the config!
  ): ScreenElement {
    // ...
  }
}
```

## Benefits

### 1. **Catch Typos Early**
```typescript
// ❌ Before: Runtime error (test fails during execution)
await screen.element('UserName').toBeFilled();

// ✅ After: Compile error (red squiggle in editor)
await screen.element('UserName').toBeFilled();
                    // ~~~~~~~~~~
                    // Type '"UserName"' is not assignable to type 
                    // '"Username" | "Password" | "Login Button"'
```

### 2. **IDE Autocomplete**
- Type `screen.element('` and IDE suggests all valid names
- No need to check config file or remember exact names
- Faster test writing

### 3. **Refactoring Safety**
```typescript
// Rename 'Username' to 'Username Field' in config
// All usages immediately show errors - you can't miss any!
await screen.element('Username').toBeFilled();
                    // ~~~~~~~~~
                    // Error: Did you mean 'Username Field'?
```

### 4. **Better Documentation**
```typescript
// Function signatures show valid element names
function checkElement(name: 'Username' | 'Password' | 'Login Button') {
  // Clear what's accepted - no guessing!
}
```

## Migration from `defineScreen`

### Before (no type safety):
```typescript
export const loginScreen = defineScreen({
  name: 'login',
  baseDir: __dirname,
  elements: [
    { name: 'Username', template: 'username.png' },
    { name: 'Password', template: 'password.png' },
  ],
});
```

### After (type safe):
```typescript
export const loginScreen = defineTypedScreen({
  name: 'login',
  baseDir: __dirname,
  elements: [
    { name: 'Username', template: 'username.png' },
    { name: 'Password', template: 'password.png' },
  ] as const,  // Add this!
});
```

**Changes needed:**
1. `defineScreen` → `defineTypedScreen`
2. Add `as const` after `elements` array
3. Update imports to use `defineTypedScreen`

That's it! No other code changes needed.

## When to Use Which

### Use `defineTypedScreen` when:
- ✅ Writing new screen configs
- ✅ You want compile-time safety
- ✅ Multiple people work on tests (prevent typos)
- ✅ Large configs with many elements

### Use `defineScreen` when:
- ⚠️ Dynamically generating element configs at runtime
- ⚠️ Element names come from external sources (API, file, etc.)
- ⚠️ Quick prototyping (but migrate to typed later!)

**Recommendation:** Use `defineTypedScreen` for all screen configs by default. The `as const` is a tiny addition for huge benefits.

## Real-World Example

```typescript
// tests/screens/checkout/config.ts
import { defineTypedScreen } from '../../../src/typed-screen.js';
import { ElementType } from '../../../src/types.js';

export const checkoutScreen = defineTypedScreen({
  name: 'checkout',
  baseDir: __dirname,
  elements: [
    { name: 'Card Number', template: 'card-number.png', type: ElementType.FIELD },
    { name: 'Expiry Date', template: 'expiry.png', type: ElementType.FIELD },
    { name: 'CVV', template: 'cvv.png', type: ElementType.FIELD },
    { name: 'Pay Button', variants: {
      enabled: { template: 'pay-enabled.png' },
      disabled: { template: 'pay-disabled.png' },
      loading: { template: 'pay-loading.png' },
    }, type: ElementType.BUTTON },
    { name: 'Loading Spinner', template: 'spinner.png', type: ElementType.ICON, animated: true },
  ] as const,
});

// Export element names as type
export type CheckoutElementName = 
  | 'Card Number'
  | 'Expiry Date'
  | 'CVV'
  | 'Pay Button'
  | 'Loading Spinner';
```

```typescript
// tests/checkout.spec.ts
import { test } from '@playwright/test';
import { PlaywrightFormTester } from '../src/playwright-helper.js';
import { checkoutScreen } from './screens/checkout/config.js';

test('checkout flow - all typed', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  await page.goto('/checkout');
  
  const screenshot = await formTester.captureScreen('checkout.png');
  const screen = await formTester.compareScreen(screenshot, checkoutScreen);

  // All element names are type-checked!
  await screen.element('Card Number').fill('4111111111111111');
  await screen.element('Expiry Date').fill('12/25');
  await screen.element('CVV').fill('123');
  
  await screen.element('Pay Button').toHaveVariant('enabled');
  await screen.element('Pay Button').click();
  
  // Check loading state
  await screen.element('Loading Spinner').toBeVisible();
  await screen.element('Pay Button').toHaveVariant('loading');
  
  // If you typo, TypeScript catches it immediately:
  // await screen.element('Card Num').toBeFilled();  ❌ Error!
  // await screen.element('Expiry').toBeFilled();    ❌ Error!
});
```

## Summary

| Feature | `defineScreen` | `defineTypedScreen` |
|---------|----------------|---------------------|
| Type safety | ❌ No | ✅ Yes |
| IDE autocomplete | ❌ No | ✅ Yes |
| Catch typos | Runtime | **Compile time** |
| Refactoring safety | ❌ Manual | ✅ Automatic |
| Migration effort | - | Tiny (`as const`) |
| Use case | Dynamic configs | **Static configs** |

**Recommendation:** Use `defineTypedScreen` + `as const` for all screen configs! 🎯
