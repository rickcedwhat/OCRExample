# Local Development Setup

## 🚀 Quick Start

All the work from the cloud agent is already in your `main` branch. Here's how to get it running locally:

### Step 1: Pull Latest Changes

```bash
# Navigate to your repo
cd /path/to/OCRExample

# Pull all the cloud agent's changes
git pull origin main

# Verify you have the latest
git log --oneline -5
# Should show:
# - Add comprehensive cost analysis vs GPT Vision API
# - Add template best practices documentation
# - Add status indicator color detection example
# - Add custom matcher functions for dynamic element analysis
# - Update CHANGELOG.md for v2.1.0 release
```

### Step 2: Install Dependencies

```bash
cd playwright-ocr

# Install all dependencies
npm install

# This installs:
# - Playwright
# - Tesseract.js (OCR)
# - OpenCV.js (Computer Vision)
# - TypeScript
# - All types
```

### Step 3: Build the Library

```bash
npm run build

# Output:
# > playwright-ocr@1.0.0 build
# > tsc
# 
# [No errors = success!]
```

### Step 4: Verify Installation

```bash
# Check that everything compiled
ls -la dist/

# Should see:
# - field-extractor.js
# - playwright-helper.js
# - typed-screen.js
# - element.js
# - screen-result.js
# - types.js
# - utils/
```

---

## 📸 Creating Your First Template

### Step 1: Capture Screenshots

```bash
mkdir -p tests/screens/my-app
cd tests/screens/my-app
```

**Capture these screenshots:**

1. **Blank screen** - Your app in its default/empty state
   ```
   Save as: blank.png
   ```

2. **Filled screen** - Your app with data entered
   ```
   Save as: filled.png
   ```

### Step 2: Create Templates Folder

```bash
mkdir templates
```

### Step 3: Crop Individual Elements

Using any screenshot tool (Snipping Tool, macOS Screenshot, etc.):

1. Open `blank.png`
2. Crop just the button/field/element you want to test
3. Save to `templates/`

**Example:**
```
templates/
├── username-field.png      # Just the username field
├── password-field.png      # Just the password field
├── submit-button.png       # Just the submit button
├── status-indicator.png    # Just the status dot
└── ...
```

**Tips:**
- Crop tight to the element edges
- Include the whole element (no partial crops)
- Save as PNG
- Don't worry about grayscale - library handles it!

---

## 🧪 Write Your First Test

### Step 1: Create Screen Config

```typescript
// tests/screens/my-app/config.ts
import { defineTypedScreen, ElementType } from '../../../src/playwright-helper.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const myAppScreen = defineTypedScreen({
  name: 'my-app',
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
      name: 'Submit Button',
      variants: {
        enabled: { template: 'submit-enabled.png' },
        disabled: { template: 'submit-disabled.png' },
      },
      type: ElementType.BUTTON,
    },
    {
      name: 'Status Indicator',
      template: 'status-dot.png',
      type: ElementType.ICON,
      customMatcher: statusColorMatcher,  // For color detection!
    },
  ] as const,
});
```

### Step 2: Write the Test

```typescript
// tests/my-app.spec.ts
import { test, expect } from '@playwright/test';
import { PlaywrightFormTester } from '../src/playwright-helper.js';
import { myAppScreen } from './screens/my-app/config.js';
import { cleanupOCR } from '../src/utils/ocr.js';
import { StatusColor } from './status-indicator-example.js';

test.describe('My App Tests', () => {
  test.afterAll(async () => {
    await cleanupOCR();
  });

  test('verify form fields', async ({ page }) => {
    const formTester = new PlaywrightFormTester(page);
    
    // Navigate to your app (via RDP or locally)
    await page.goto('your-app-url');
    
    // Fill in some data
    await page.keyboard.type('john@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.type('password123');
    
    // Capture screenshot
    const screenshot = await formTester.captureScreen('my-app-filled.png');
    
    // Compare against blank template
    const screen = await formTester.compareScreen(screenshot, myAppScreen);
    
    // Make assertions!
    await screen.element('Username').toBeFilled();
    await screen.element('Username').toHaveText('john@example.com');
    
    await screen.element('Password').toBeFilled();
    
    await screen.element('Submit Button').toHaveVariant('enabled');
    
    await screen.element('Status Indicator').toHaveValue(StatusColor.IN_PROGRESS);
    
    // Get metadata
    const usernameValue = screen.element('Username').value();
    console.log('Username:', usernameValue);
    
    const statusColor = screen.element('Status Indicator').getMetadata<string>('hex');
    console.log('Status color:', statusColor);
  });
});
```

### Step 3: Run the Test

```bash
npm test

# Or run with headed mode (see browser)
npm run test:headed

# Or debug mode
npm run test:debug
```

---

## 🛠️ Using the Template Manager Tool

Want a visual way to create templates? Use the built-in tool:

```bash
# Option 1: Open directly
open tools/template-manager.html

# Option 2: Serve it
cd tools
python3 -m http.server 8000
# Open http://localhost:8000/template-manager.html
```

**How to use:**

1. **Upload** your blank screenshot
2. **Draw boxes** around elements (click "Add Element")
3. **Name them** and set type (field/button/icon)
4. **Test** the template matching (click "Test")
5. **Export** TypeScript config code
6. **Copy-paste** into your `config.ts`

---

## 📁 Recommended Project Structure

```
tests/
├── screens/
│   ├── login/
│   │   ├── blank.png
│   │   ├── filled.png
│   │   ├── templates/
│   │   │   ├── username-field.png
│   │   │   ├── password-field.png
│   │   │   ├── login-btn-enabled.png
│   │   │   └── login-btn-disabled.png
│   │   └── config.ts
│   │
│   ├── dashboard/
│   │   ├── blank.png
│   │   ├── templates/
│   │   │   ├── status-indicator.png
│   │   │   ├── user-name.png
│   │   │   └── logout-btn.png
│   │   └── config.ts
│   │
│   └── checkout/
│       ├── blank.png
│       ├── templates/
│       │   ├── card-number.png
│       │   ├── cvv.png
│       │   ├── pay-btn-enabled.png
│       │   └── progress-bar.png
│       └── config.ts
│
├── login.spec.ts
├── dashboard.spec.ts
├── checkout.spec.ts
└── helpers/
    └── status-matchers.ts  # Shared custom matchers
```

---

## 🐛 Troubleshooting

### Issue: Template Not Found

```bash
Error: ENOENT: no such file or directory, open '.../username-field.png'
```

**Fix:** Check your paths
```typescript
// Make sure baseDir is correct
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const myScreen = defineTypedScreen({
  baseDir: __dirname,  // Should point to screen folder
  elements: [
    { name: 'Username', template: 'username-field.png' },  // Looks in baseDir/templates/
  ]
});
```

### Issue: Low Confidence Match

```
Element "Username" confidence 0.45 is below 0.7
```

**Fix:** Your template might not match the screenshot

1. **Check if element is visible** in blank.png
2. **Recrop the template** - make sure it's exact
3. **Check for UI changes** - did the app update?
4. **Enable debug mode** to see what's happening:
   ```typescript
   const extractor = new FieldExtractor(ocrUtil, true);  // debug=true
   ```

### Issue: OCR Returns Wrong Text

```
Expected "john@example.com", got "iohn@examp1e.com"
```

**Fix:** OCR accuracy depends on image quality

1. **Use higher resolution screenshots**
2. **Ensure text is clear** (not blurry)
3. **Check for good contrast** (dark text on light background)
4. **Try different OCR language** if needed:
   ```typescript
   const ocrUtil = await getOCRUtil('eng');  // English (default)
   ```

### Issue: Module Import Errors

```
Cannot find module '../../../src/playwright-helper.js'
```

**Fix:** Make sure you've built the library
```bash
npm run build
```

And check your imports use `.js` extension (ES modules):
```typescript
import { defineTypedScreen } from '../../../src/playwright-helper.js';  // .js!
```

---

## 🎯 Next Steps

### 1. Start Simple
- Create templates for 1-2 elements
- Get one test working
- Build from there

### 2. Iterate
- Add more elements gradually
- Refine templates based on match confidence
- Add custom matchers for special cases

### 3. Scale
- Create configs for all your screens
- Share templates across team
- Integrate into CI/CD

### 4. Advanced Usage
- Custom matchers for progress bars
- Color detection for status indicators
- Multi-variant buttons
- Section templates for complex layouts

---

## 📚 Documentation Reference

Quick links to all documentation:

- **[README.md](../README.md)** - Overview and quick start
- **[QUICK_START.md](../QUICK_START.md)** - Detailed walkthrough
- **[NEW_API.md](../NEW_API.md)** - Complete API reference
- **[TYPE_SAFETY.md](../TYPE_SAFETY.md)** - Type-safe element names
- **[CUSTOM_MATCHERS.md](../CUSTOM_MATCHERS.md)** - Progress bars, sliders, etc.
- **[STATUS_INDICATORS.md](../STATUS_INDICATORS.md)** - Color detection
- **[ANIMATED_ELEMENTS.md](../ANIMATED_ELEMENTS.md)** - Loading spinners
- **[TEMPLATE_BEST_PRACTICES.md](../TEMPLATE_BEST_PRACTICES.md)** - Template creation
- **[COST_ANALYSIS.md](../COST_ANALYSIS.md)** - ROI and savings

---

## 💡 Pro Tips

### Tip 1: Use Template Manager First
Don't manually crop - use `tools/template-manager.html` to draw boxes and export code!

### Tip 2: Start with Grayscale Screenshots
While the library converts to grayscale anyway, starting with grayscale helps you visualize what the matcher sees.

### Tip 3: Name Templates Descriptively
```
✅ submit-button-enabled.png
❌ img1.png
```

### Tip 4: Keep Templates Small
Crop tight to element - smaller templates = faster matching!

### Tip 5: Version Your Templates
When UI changes, keep old templates with version suffix:
```
submit-button-v1.png
submit-button-v2.png
```

### Tip 6: Test on Real Screenshots Early
Don't wait - grab a screenshot, crop one element, write one test. Iterate from there!

---

## ✅ Quick Checklist

Before you start testing:

- [ ] `git pull origin main` - Got latest changes
- [ ] `npm install` - Dependencies installed
- [ ] `npm run build` - Library built
- [ ] Created `tests/screens/my-app/` folder
- [ ] Captured `blank.png` screenshot
- [ ] Created `templates/` folder
- [ ] Cropped 1-2 element templates
- [ ] Created `config.ts` with element definitions
- [ ] Wrote a simple test in `my-app.spec.ts`
- [ ] Ran `npm test` to verify

---

## 🚀 You're Ready!

Everything from the cloud agent is now on your local machine. Start capturing screenshots and creating templates - you'll be writing tests in minutes!

**Questions?** Check the docs or re-run the cloud agent! 🤖
