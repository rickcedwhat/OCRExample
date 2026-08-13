# Testing Buttons and UI Elements

## Buttons Are Just Visual Elements

The library doesn't distinguish between "fields" and "buttons" - they're all just visual elements you want to locate and verify.

## Common Button Testing Scenarios

### 1. Verify Button Exists

```typescript
const fieldConfigs = [
  { name: 'Submit Button', templatePath: './templates/submit-btn.png' },
];

const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs,
});

// Button found with high confidence
const submitBtn = results.fields.find(f => f.name === 'Submit Button');
expect(submitBtn?.confidence).toBeGreaterThan(0.9);

// Get button location for clicking
console.log(submitBtn?.location);  // { x: 250, y: 450, width: 80, height: 40 }
```

### 2. Click Button at Detected Location

```typescript
const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs: [
    { name: 'Submit Button', templatePath: './templates/submit-btn.png' },
  ],
});

const submitBtn = results.fields.find(f => f.name === 'Submit Button');

// Click center of button
if (submitBtn) {
  const centerX = submitBtn.location.x + submitBtn.location.width / 2;
  const centerY = submitBtn.location.y + submitBtn.location.height / 2;
  await page.mouse.click(centerX, centerY);
}
```

### 3. Verify Button State (Enabled/Disabled)

Create two templates - one for each state:

```typescript
const fieldConfigs = [
  { name: 'Submit Enabled', templatePath: './templates/submit-enabled.png' },
  { name: 'Submit Disabled', templatePath: './templates/submit-disabled.png' },
];

const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs,
});

// Check which state matches
const enabledBtn = results.fields.find(f => f.name === 'Submit Enabled');
const disabledBtn = results.fields.find(f => f.name === 'Submit Disabled');

if (!enabledBtn?.isEmpty) {
  console.log('Button is enabled');
} else if (!disabledBtn?.isEmpty) {
  console.log('Button is disabled');
}
```

### 4. Verify Button Appearance After Action

```typescript
test('button changes when form is filled', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  const configs = [
    { name: 'Submit', templatePath: './templates/submit-disabled.png' },
  ];
  
  // Before filling form
  let screenshot = await formTester.captureScreen('before.png');
  let results = await formTester.compareForm(screenshot, {
    blankFormPath: './blank.png',
    fieldConfigs: configs,
  });
  
  // Should be disabled
  expect(results.fields[0].isEmpty).toBe(false);  // Disabled version present
  
  // Fill required fields
  await page.mouse.click(100, 200);
  await page.keyboard.type('required data');
  
  // After filling form
  screenshot = await formTester.captureScreen('after.png');
  
  // Now check for enabled version
  results = await formTester.compareForm(screenshot, {
    blankFormPath: './blank.png',
    fieldConfigs: [
      { name: 'Submit', templatePath: './templates/submit-enabled.png' },
    ],
  });
  
  // Should be enabled now
  expect(results.fields[0].isEmpty).toBe(false);  // Enabled version present
});
```

### 5. Read Button Text (Dynamic Labels)

```typescript
const fieldConfigs = [
  { name: 'Action Button', templatePath: './templates/button-area.png' },
];

const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs,
});

// OCR extracts button text
const buttonText = results.fields[0].value;
console.log('Button says:', buttonText);  // "Submit Order" or "Processing..." etc.

expect(buttonText).toContain('Submit');
```

## Testing Other UI Elements

### Icons and Status Indicators

```typescript
const fieldConfigs = [
  { name: 'Success Icon', templatePath: './templates/success-icon.png' },
  { name: 'Error Icon', templatePath: './templates/error-icon.png' },
  { name: 'Warning Icon', templatePath: './templates/warning-icon.png' },
  { name: 'Loading Spinner', templatePath: './templates/spinner.png' },
];

const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs,
});

// Check which icon is present
const hasSuccess = !results.fields.find(f => f.name === 'Success Icon')?.isEmpty;
const hasError = !results.fields.find(f => f.name === 'Error Icon')?.isEmpty;
const isLoading = !results.fields.find(f => f.name === 'Loading Spinner')?.isEmpty;

if (hasSuccess) console.log('✅ Success state');
if (hasError) console.log('❌ Error state');
if (isLoading) console.log('⏳ Loading state');
```

### Links and Navigation

```typescript
const fieldConfigs = [
  { name: 'Back Link', templatePath: './templates/back-link.png' },
  { name: 'Cancel Link', templatePath: './templates/cancel-link.png' },
  { name: 'Help Link', templatePath: './templates/help-link.png' },
];

// Verify links exist
const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs,
});

expect(results.fields.find(f => f.name === 'Back Link')?.isEmpty).toBe(false);
```

### Tabs and Navigation States

```typescript
const fieldConfigs = [
  { name: 'Personal Tab Active', templatePath: './templates/tab-personal-active.png' },
  { name: 'Address Tab Inactive', templatePath: './templates/tab-address-inactive.png' },
  { name: 'Payment Tab Inactive', templatePath: './templates/tab-payment-inactive.png' },
];

const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs,
});

// Verify Personal tab is active
expect(results.fields.find(f => f.name === 'Personal Tab Active')?.isEmpty).toBe(false);
```

### Dropdown Selected Values

```typescript
const fieldConfigs = [
  { name: 'Country Dropdown', templatePath: './templates/country-dropdown.png' },
];

const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs,
});

// OCR reads selected value
const selectedCountry = results.fields[0].value;
expect(selectedCountry).toBe('United States');
```

### Error Messages and Validation

```typescript
const fieldConfigs = [
  { name: 'Email Error', templatePath: './templates/email-error-msg.png' },
  { name: 'Password Error', templatePath: './templates/password-error-msg.png' },
];

// After submitting invalid form
const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs,
});

// Check if error messages appeared
const hasEmailError = !results.fields.find(f => f.name === 'Email Error')?.isEmpty;
const hasPasswordError = !results.fields.find(f => f.name === 'Password Error')?.isEmpty;

expect(hasEmailError).toBe(true);  // Should show error

// Can also read error text with OCR
const errorText = results.fields.find(f => f.name === 'Email Error')?.value;
expect(errorText).toContain('Invalid email format');
```

## Complete Example: Multi-Step Form

```typescript
test('complete multi-step form with buttons', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  // Navigate to form
  await page.goto('your-app/registration');

  // === STEP 1: Personal Info ===
  
  // Fill personal info
  await page.mouse.click(100, 200);  // Name field
  await page.keyboard.type('John Doe');
  await page.mouse.click(100, 250);  // Email field
  await page.keyboard.type('john@example.com');
  
  // Verify "Next" button is enabled
  let screenshot = await formTester.captureScreen('step1-filled.png');
  let results = await formTester.compareForm(screenshot, {
    blankFormPath: './templates/blank-step1.png',
    fieldConfigs: [
      { name: 'Name', templatePath: './templates/name-field.png' },
      { name: 'Email', templatePath: './templates/email-field.png' },
      { name: 'Next Button', templatePath: './templates/next-btn-enabled.png' },
    ],
  });
  
  expect(results.fields.find(f => f.name === 'Name')?.value).toContain('John');
  expect(results.fields.find(f => f.name === 'Email')?.value).toContain('john');
  expect(results.fields.find(f => f.name === 'Next Button')?.isEmpty).toBe(false);
  
  // Click Next
  const nextBtn = results.fields.find(f => f.name === 'Next Button');
  await page.mouse.click(
    nextBtn!.location.x + 40,
    nextBtn!.location.y + 20
  );
  
  // === STEP 2: Address ===
  
  await formTester.waitForStableScreen();
  
  // Verify step 2 is showing
  screenshot = await formTester.captureScreen('step2.png');
  results = await formTester.compareForm(screenshot, {
    blankFormPath: './templates/blank-step2.png',
    fieldConfigs: [
      { name: 'Step 2 Indicator', templatePath: './templates/step2-active.png' },
      { name: 'Back Button', templatePath: './templates/back-btn.png' },
      { name: 'Submit Button', templatePath: './templates/submit-btn-disabled.png' },
    ],
  });
  
  expect(results.fields.find(f => f.name === 'Step 2 Indicator')?.isEmpty).toBe(false);
  expect(results.fields.find(f => f.name === 'Back Button')?.isEmpty).toBe(false);
  
  // Fill address
  await page.mouse.click(100, 200);
  await page.keyboard.type('123 Main St');
  
  // Verify Submit button becomes enabled
  screenshot = await formTester.captureScreen('step2-filled.png');
  results = await formTester.compareForm(screenshot, {
    blankFormPath: './templates/blank-step2.png',
    fieldConfigs: [
      { name: 'Submit Button', templatePath: './templates/submit-btn-enabled.png' },
    ],
  });
  
  expect(results.fields.find(f => f.name === 'Submit Button')?.isEmpty).toBe(false);
  
  // Submit
  const submitBtn = results.fields.find(f => f.name === 'Submit Button');
  await page.mouse.click(
    submitBtn!.location.x + 40,
    submitBtn!.location.y + 20
  );
  
  // === SUCCESS ===
  
  await formTester.waitForStableScreen();
  
  screenshot = await formTester.captureScreen('success.png');
  results = await formTester.compareForm(screenshot, {
    blankFormPath: './templates/blank-success.png',
    fieldConfigs: [
      { name: 'Success Icon', templatePath: './templates/success-icon.png' },
      { name: 'Success Message', templatePath: './templates/success-msg.png' },
    ],
  });
  
  expect(results.fields.find(f => f.name === 'Success Icon')?.isEmpty).toBe(false);
  
  const successMsg = results.fields.find(f => f.name === 'Success Message')?.value;
  expect(successMsg).toContain('Registration successful');
});
```

## Template Creation Tips for Buttons

### 1. Include Visual Context

❌ **Too tight:**
```
┌──────┐
│Submit│  ← Just text, might match other buttons
└──────┘
```

✅ **Better:**
```
┌───────────────┐
│  [  Submit  ] │  ← Include button border/background
└───────────────┘
```

### 2. Capture Different States

For each button that changes state, create templates:

```
templates/buttons/
├── submit-enabled.png       # Blue, full opacity
├── submit-disabled.png      # Gray, reduced opacity
├── submit-hover.png         # Darker blue (if testing hover)
└── submit-pressed.png       # Even darker (if testing press)
```

### 3. Use Consistent Naming

```
templates/
├── btn-submit-enabled.png
├── btn-submit-disabled.png
├── btn-cancel-enabled.png
├── btn-back-enabled.png
└── link-help.png
```

Prefix with element type for easy organization.

## When to Use Template Matching vs Direct Click

### Use Template Matching When:
- ✅ Button position varies
- ✅ Need to verify button state before clicking
- ✅ Button might not be present
- ✅ Testing button appearance/text

### Use Direct Coordinates When:
- ✅ Button position is always fixed
- ✅ Just need to click (don't care about state)
- ✅ Performance critical (thousands of clicks)

## Example: Hybrid Approach

```typescript
// Use template matching to find button
const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs: [
    { name: 'Dynamic Submit', templatePath: './templates/submit.png' },
  ],
});

const btn = results.fields.find(f => f.name === 'Dynamic Submit');

if (btn && !btn.isEmpty) {
  // Found button, click it
  await page.mouse.click(
    btn.location.x + btn.location.width / 2,
    btn.location.y + btn.location.height / 2
  );
} else {
  throw new Error('Submit button not found or disabled');
}
```

## Summary

**Buttons = Just another visual element**

You can test:
- ✅ Text fields
- ✅ Checkboxes
- ✅ Buttons (any state)
- ✅ Links
- ✅ Icons
- ✅ Status indicators
- ✅ Tabs
- ✅ Dropdowns
- ✅ Error messages
- ✅ Anything visible on screen!

**Same approach for everything:**
1. Crop it from blank form
2. Add to fieldConfigs
3. Verify presence, state, or text

Your RDP testing just got a whole lot more powerful! 🚀
