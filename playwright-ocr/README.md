# Playwright OCR Form Testing

A TypeScript library for testing desktop applications via RDP using computer vision and OCR, designed as a faster, more reliable, and cost-effective alternative to GPT Vision API-based testing.

## Overview

This library provides intelligent form testing capabilities for applications where DOM access is not available (e.g., desktop apps accessed via RDP). Instead of using GPT Vision API calls to verify screenshots, it uses:

- **Template Matching** - Locate form fields precisely
- **Image Alignment** - Handle skewed/rotated forms automatically  
- **OCR (Tesseract.js)** - Extract actual text values from fields
- **Pixel Difference Detection** - Identify filled vs empty fields and checkboxes

## Why Use This Instead of GPT Vision API?

| Feature | This Library | GPT Vision API |
|---------|-------------|----------------|
| **Cost** | Free (local processing) | ~$0.01-0.05 per screenshot |
| **Speed** | <1s per form | 2-5s per API call |
| **Reliability** | Deterministic | Non-deterministic |
| **Data Privacy** | All local | Sent to OpenAI |
| **Offline Support** | ✅ Yes | ❌ No |
| **Rate Limits** | None | Yes |
| **Structured Output** | Exact field values | Text description |
| **Debugging** | Pixel-level diffs | Text explanation |
| **CI/CD Friendly** | ✅ Fast & free | ⚠️ Slow & costly |

### Real-World Example

**Current GPT Approach:**
```typescript
// Take screenshot
const screenshot = await page.screenshot();

// Send to GPT Vision API
const response = await openai.chat.completions.create({
  model: "gpt-4-vision-preview",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Does this W-2 form show SSN 123-45-6789?" },
      { type: "image_url", image_url: { url: screenshot } }
    ]
  }]
});

// Parse text response
if (response.choices[0].message.content.includes("yes")) {
  // Maybe correct?
}
```

**This Library:**
```typescript
// Extract actual field values
const results = await formTester.compareForm(screenshot, {
  blankFormPath: './templates/blank-w2.png',
  fieldConfigs: [
    { name: 'SSN', templatePath: './templates/ssn-field.png' }
  ]
});

// Get exact value with confidence score
const ssn = results.fields.find(f => f.name === 'SSN');
expect(ssn.value).toBe('123-45-6789');
expect(ssn.confidence).toBeGreaterThan(0.9);
```

## Installation

```bash
npm install tesseract.js opencv.js pixelmatch pngjs
npm install --save-dev @playwright/test typescript @types/node
```

## Quick Start

### 1. Prepare Form Templates

Create template images for each field you want to extract:

```
tests/fixtures/
  ├── blank-form.png           # Your blank form template
  └── templates/
      ├── field-ssn.png         # Cropped image of just the SSN field
      ├── field-name.png        # Cropped image of just the name field  
      ├── checkbox-employee.png # Cropped image of just a checkbox
      └── ...
```

**Tip:** Use a screenshot tool to crop individual fields from your blank form.

### 2. Write a Test

```typescript
import { test, expect } from '@playwright/test';
import { PlaywrightFormTester } from 'playwright-ocr';

test('extract tax form fields', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  // Define fields to extract
  const fieldConfigs = [
    {
      name: 'SSN',
      templatePath: './fixtures/templates/field-ssn.png',
    },
    {
      name: 'Employee Name',
      templatePath: './fixtures/templates/field-name.png',
    },
    {
      name: 'Retirement Plan',
      templatePath: './fixtures/templates/checkbox-retirement.png',
      isCheckbox: true,
    },
  ];

  // For RDP testing with mouse coordinates
  await page.goto('rdp://your-desktop-app');
  await page.mouse.click(100, 200); // Click SSN field
  await page.keyboard.type('123-45-6789');
  await page.mouse.click(100, 300); // Click name field  
  await page.keyboard.type('John Doe');
  
  // Capture and analyze
  const results = await formTester.testForm(
    async () => { /* navigation logic */ },
    {
      blankFormPath: './fixtures/blank-form.png',
      fieldConfigs,
    }
  );

  // Make assertions
  expect(results.fields.find(f => f.name === 'SSN')?.value).toBe('123-45-6789');
  expect(results.fields.find(f => f.name === 'Employee Name')?.value).toBe('John Doe');
  expect(results.fields.find(f => f.name === 'Retirement Plan')?.value).toBe('checked');
});
```

## Advanced Usage

### Testing with Pre-Captured Screenshots

If you already have screenshots (e.g., from previous test runs):

```typescript
import { extractFormFields } from 'playwright-ocr';

const results = await extractFormFields(
  './screenshots/filled-form.png',
  './templates/blank-form.png',
  fieldConfigs,
  true // debug mode
);

console.log(`Extracted ${results.filledFields} fields`);
```

### Handling Fields Within Sections

For complex forms where fields are within specific sections:

```typescript
const fieldConfigs = [
  {
    name: 'Employee First Name',
    templatePath: './templates/field-fname.png',
    sectionTemplatePath: './templates/employee-section.png', // First find this section
  },
];
```

### Waiting for Form Stability

For forms with animations or loading states:

```typescript
// Wait until the screen stops changing
await formTester.waitForStableScreen(1000, 10000);

// Then capture
const screenshot = await formTester.captureScreen('stable-form.png');
```

### Debug Mode

Enable debug output to see matching details:

```typescript
const results = await formTester.compareForm(screenshot, {
  blankFormPath: './blank.png',
  fieldConfigs,
  debug: true, // Logs match locations, confidence, diff pixels
});
```

## API Reference

### `PlaywrightFormTester`

Main class for Playwright integration.

```typescript
class PlaywrightFormTester {
  constructor(page: Page, screenshotDir?: string);
  
  // Capture screenshot
  async captureScreen(filename: string, element?: Locator): Promise<string>;
  
  // Compare filled form against blank template
  async compareForm(
    filledFormScreenshot: string,
    options: PlaywrightFormTestOptions
  ): Promise<FormComparison>;
  
  // Wait for screen to stabilize
  async waitForStableScreen(
    stabilityTimeMs?: number,
    maxWaitMs?: number
  ): Promise<void>;
  
  // High-level test helper
  async testForm(
    navigationCallback: () => Promise<void>,
    options: PlaywrightFormTestOptions
  ): Promise<FormComparison>;
}
```

### `FieldConfig`

Configuration for a single field to extract.

```typescript
interface FieldConfig {
  name: string;                    // Field identifier
  templatePath: string;            // Path to field template image
  sectionTemplatePath?: string;    // Optional: locate field within this section
  isCheckbox?: boolean;            // True for checkboxes
}
```

### `FormComparison`

Results from form extraction.

```typescript
interface FormComparison {
  fields: FieldResult[];           // Extracted field data
  totalFields: number;             // Total fields checked
  filledFields: number;            // Number of filled fields
  emptyFields: number;             // Number of empty fields
}

interface FieldResult {
  name: string;                    // Field name
  value: string;                   // Extracted value or "checked"/"unchecked"
  confidence?: number;             // Match confidence (0-1)
  location: Rect;                  // Field location on form
  isEmpty: boolean;                // Whether field is empty
}
```

## Migration from GPT Vision API

### Before (GPT Vision API)

```typescript
async function verifyForm(page: Page) {
  const screenshot = await page.screenshot({ encoding: 'base64' });
  
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [{
      role: "user",
      content: [
        { 
          type: "text", 
          text: "Check if SSN is 123-45-6789, name is John Doe, and retirement checkbox is checked" 
        },
        { type: "image_url", image_url: { url: `data:image/png;base64,${screenshot}` } }
      ]
    }]
  });
  
  // Hope GPT understood and gave correct answer
  const answer = response.choices[0].message.content;
  console.log("GPT says:", answer);
}
```

**Issues:**
- Costs ~$0.03 per call
- Takes 3-5 seconds
- Non-deterministic responses
- Hard to parse structured data
- Requires internet & OpenAI API key

### After (This Library)

```typescript
async function verifyForm(page: Page) {
  const formTester = new PlaywrightFormTester(page);
  
  const results = await formTester.testForm(
    async () => { /* navigation */ },
    {
      blankFormPath: './templates/blank.png',
      fieldConfigs: [
        { name: 'SSN', templatePath: './templates/ssn.png' },
        { name: 'Name', templatePath: './templates/name.png' },
        { name: 'Retirement', templatePath: './templates/retire.png', isCheckbox: true },
      ],
    }
  );
  
  // Exact values with confidence scores
  expect(results.fields.find(f => f.name === 'SSN')?.value).toBe('123-45-6789');
  expect(results.fields.find(f => f.name === 'Name')?.value).toBe('John Doe');
  expect(results.fields.find(f => f.name === 'Retirement')?.value).toBe('checked');
}
```

**Benefits:**
- ✅ Free
- ✅ <1 second
- ✅ Deterministic
- ✅ Structured output
- ✅ Offline

## How It Works

1. **Image Alignment**: Uses SIFT feature detection and homography to align filled forms with blank templates (handles rotation, skew, perspective)

2. **Template Matching**: Locates each field by matching template images against the blank form using OpenCV's `matchTemplate`

3. **Difference Detection**: Compares filled vs blank regions pixel-by-pixel to detect if field has data

4. **OCR Extraction**: For text fields, extracts the difference image and runs Tesseract OCR

5. **Checkbox Detection**: For checkboxes, uses pixel difference count to determine checked/unchecked state

## Performance Optimization

### Reuse OCR Worker

```typescript
import { getOCRUtil, cleanupOCR } from 'playwright-ocr';

test.beforeAll(async () => {
  await getOCRUtil(); // Initialize once
});

test.afterAll(async () => {
  await cleanupOCR(); // Clean up after all tests
});
```

### Parallel Field Extraction

The library processes fields sequentially by default. For large forms, consider extracting independent sections in parallel.

## Troubleshooting

### Low OCR Accuracy

- Ensure filled form screenshots are high resolution (300 DPI recommended)
- Use `debug: true` to see the difference images being sent to OCR
- Check that image alignment is working correctly

### Fields Not Matching

- Verify template images are exact crops from the blank form
- Ensure blank and filled forms are the same resolution
- Use `debug: true` to see match confidence scores

### Checkbox Detection Issues

- Adjust the `threshold` parameter in `compareRegions()` if needed
- Ensure checkbox templates include some surrounding context

## License

ISC

## Credits

Ported from a Java POC using Tess4j and OpenCV, reimagined for TypeScript/Playwright testing workflows.
