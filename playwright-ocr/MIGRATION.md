# Migration Guide: GPT Vision API → Playwright OCR

This guide helps you migrate from GPT Vision API-based screenshot testing to this local computer vision solution.

## Cost Comparison

### Scenario: 100 test runs per day, 20 screenshots per run

**GPT Vision API:**
- Cost per screenshot: ~$0.02 (varies by image size)
- Screenshots per day: 100 runs × 20 screenshots = 2,000 screenshots
- **Monthly cost: $1,200**
- **Yearly cost: $14,400**

**Playwright OCR:**
- Cost per screenshot: $0
- **Monthly cost: $0**
- **Yearly cost: $0**
- **Savings: $14,400/year**

Plus:
- No rate limits
- No network dependency
- Faster execution (1s vs 3-5s per check)
- Better CI/CD integration

## Migration Steps

### Step 1: Identify Your Forms

List all the forms you're currently testing with GPT Vision API.

**Example:**
- W-2 Tax Form
- Login Form
- Settings Form
- Invoice Form

### Step 2: Create Template Images

For each form:

1. Capture a clean screenshot of the **blank** form
2. Crop individual fields from the blank form to create templates

```bash
# Example directory structure
tests/fixtures/
├── w2/
│   ├── blank-w2.png
│   └── templates/
│       ├── ssn-field.png
│       ├── ein-field.png
│       ├── wages-field.png
│       └── checkbox-retirement.png
├── login/
│   ├── blank-login.png
│   └── templates/
│       ├── username-field.png
│       └── password-field.png
└── ...
```

**Tips for Templates:**
- Use high-resolution screenshots (300 DPI)
- Include a small border around the field for better matching
- Make templates from the blank form, not filled versions
- For checkboxes, capture just the empty checkbox

### Step 3: Replace GPT Calls

#### Before: GPT Vision API

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

test('verify tax form', async ({ page }) => {
  await page.goto('rdp://desktop-app');
  
  // Fill form using mouse coordinates
  await page.mouse.click(100, 200);
  await page.keyboard.type('123-45-6789');
  // ...more interactions
  
  // Capture screenshot
  const screenshot = await page.screenshot({ encoding: 'base64' });
  
  // Ask GPT to verify
  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Please verify this W-2 form has:
            - SSN: 123-45-6789
            - EIN: 12-3456789
            - Wages: $50,000
            - Retirement Plan: checked`
        },
        {
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${screenshot}` }
        }
      ]
    }],
    max_tokens: 500
  });
  
  // Parse GPT response (unreliable)
  const answer = response.choices[0].message.content;
  expect(answer).toContain('correct');
});
```

**Issues:**
- $0.02 per test
- 3-5 seconds per verification
- Non-deterministic
- Requires parsing text response
- API can be down or rate-limited

#### After: Playwright OCR

```typescript
import { PlaywrightFormTester } from 'playwright-ocr';

test('verify tax form', async ({ page }) => {
  await page.goto('rdp://desktop-app');
  
  // Fill form using mouse coordinates (same as before)
  await page.mouse.click(100, 200);
  await page.keyboard.type('123-45-6789');
  // ...more interactions
  
  const formTester = new PlaywrightFormTester(page);
  
  // Define what to extract
  const fieldConfigs = [
    { name: 'SSN', templatePath: './fixtures/w2/templates/ssn-field.png' },
    { name: 'EIN', templatePath: './fixtures/w2/templates/ein-field.png' },
    { name: 'Wages', templatePath: './fixtures/w2/templates/wages-field.png' },
    { 
      name: 'Retirement Plan', 
      templatePath: './fixtures/w2/templates/checkbox-retirement.png',
      isCheckbox: true 
    },
  ];
  
  // Capture and analyze
  const screenshot = await formTester.captureScreen('filled-w2.png');
  const results = await formTester.compareForm(screenshot, {
    blankFormPath: './fixtures/w2/blank-w2.png',
    fieldConfigs,
  });
  
  // Make precise assertions
  expect(results.fields.find(f => f.name === 'SSN')?.value).toBe('123-45-6789');
  expect(results.fields.find(f => f.name === 'EIN')?.value).toBe('12-3456789');
  expect(results.fields.find(f => f.name === 'Wages')?.value).toBe('$50,000');
  expect(results.fields.find(f => f.name === 'Retirement Plan')?.value).toBe('checked');
});
```

**Benefits:**
- Free
- <1 second per verification
- Deterministic (same input = same output)
- Structured data (exact field values)
- Works offline

### Step 4: Update CI/CD

#### Before: Required Environment Variables

```yaml
# .github/workflows/test.yml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

#### After: No API Keys Needed

```yaml
# .github/workflows/test.yml
# No OpenAI secrets required!
# Optionally add caching for faster runs:
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### Step 5: Run Tests

```bash
# Build the project
npm run build

# Run tests
npm test

# Run in headed mode to see what's happening
npm run test:headed

# Debug a specific test
npm run test:debug -- tests/w2-form.spec.ts
```

## Common Patterns

### Pattern 1: Extract All Fields

```typescript
const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs: [
    { name: 'Field1', templatePath: './field1.png' },
    { name: 'Field2', templatePath: './field2.png' },
    // ...all fields
  ],
});

// Log all extracted values
console.log(JSON.stringify(results, null, 2));
```

### Pattern 2: Check Specific Fields

```typescript
// Extract only what you care about
const fieldConfigs = [
  { name: 'Total', templatePath: './total-field.png' },
];

const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs,
});

const total = results.fields.find(f => f.name === 'Total');
expect(parseFloat(total.value)).toBeGreaterThan(1000);
```

### Pattern 3: Verify Empty vs Filled

```typescript
// Before filling
const emptyScreenshot = await page.screenshot();
const emptyResults = await formTester.compareForm(emptyScreenshot, options);
expect(emptyResults.filledFields).toBe(0);

// Fill the form
await fillForm(page);

// After filling
const filledScreenshot = await page.screenshot();
const filledResults = await formTester.compareForm(filledScreenshot, options);
expect(filledResults.filledFields).toBeGreaterThan(0);
```

### Pattern 4: Check Specific Values Changed

```typescript
// Before
const beforeResults = await formTester.compareForm(beforeScreenshot, options);

// Make changes
await page.mouse.click(x, y);
await page.keyboard.type('new value');

// After
const afterResults = await formTester.compareForm(afterScreenshot, options);

const beforeValue = beforeResults.fields.find(f => f.name === 'Field')?.value;
const afterValue = afterResults.fields.find(f => f.name === 'Field')?.value;
expect(afterValue).not.toBe(beforeValue);
expect(afterValue).toBe('new value');
```

## Performance Comparison

| Metric | GPT Vision API | Playwright OCR |
|--------|---------------|----------------|
| Single screenshot | 3-5 seconds | 0.3-0.8 seconds |
| 20 screenshots | 60-100 seconds | 6-16 seconds |
| 100 test run | 100-167 minutes | 10-27 minutes |
| Parallel execution | Limited by rate limits | Limited by CPU cores |

## Troubleshooting

### Issue: OCR Not Reading Text Correctly

**Solution:**
1. Check screenshot resolution (needs 300 DPI for best results)
2. Enable debug mode to see the diff image being sent to OCR:
   ```typescript
   const results = await formTester.compareForm(screenshot, {
     blankFormPath: './blank.png',
     fieldConfigs,
     debug: true, // See what OCR is receiving
   });
   ```
3. The diff image should show clear, black text on white background
4. If text is blurry, increase screenshot resolution

### Issue: Template Not Matching

**Solution:**
1. Ensure template is cropped from the exact blank form you're using
2. Check that blank and filled forms have the same resolution
3. Enable debug to see confidence scores:
   ```typescript
   // Low confidence (<0.7) indicates poor template match
   console.log(field.confidence);
   ```
4. Re-crop template with more surrounding context

### Issue: Checkboxes Not Detecting Correctly

**Solution:**
1. Make sure checkbox template includes checkbox + small border
2. Adjust the threshold in `compareRegions()` if needed
3. For custom checkbox styles, you may need checked and unchecked templates

## Need Help?

1. Check the main README.md for API reference
2. Look at tests/example.spec.ts for working examples
3. Enable `debug: true` to see detailed matching information

## Rollback Plan

If you need to temporarily rollback to GPT Vision API:

1. Keep your GPT tests in a separate file (e.g., `*.gpt.spec.ts`)
2. Run OCR tests: `npx playwright test --grep-invert gpt`
3. Run GPT tests: `npx playwright test --grep gpt`
4. Gradually migrate test by test

You can run both approaches side-by-side during migration!
