# Template Manager Tool

A visual tool for creating and testing UI element templates for Playwright OCR.

## 🚀 Quick Start

1. **Open the tool:**
   ```bash
   # Just open in your browser
   open tools/template-manager.html
   
   # Or serve it locally
   npx serve tools/
   ```

2. **Load your blank form screenshot**
3. **Draw rectangles around elements**
4. **Save templates**
5. **Export configuration code**

## Features

### 📐 Visual Template Creation

- **Load blank form** - Upload your blank form screenshot
- **Draw rectangles** - Click and drag to select elements
- **Name elements** - Give each element a descriptive name
- **Set types** - Choose element type (field, button, checkbox, etc.)
- **Auto-save** - Templates saved to browser localStorage

### 🎯 Live Template Testing

- **Test individual templates** - See if template matches correctly
- **Test all at once** - Verify all templates on current image
- **Visual feedback** - Green boxes show where matches are found
- **Confidence scores** - See match quality (coming soon)

### 📤 Code Export

- **Generate TypeScript config** - Get ready-to-use code
- **Copy to clipboard** - One-click code copying
- **Includes element types** - Properly typed configurations

## How to Use

### Mode 1: Create Templates

1. Click **"Load Blank Form"** and select your screenshot
2. **Draw a rectangle** around an element (click and drag)
3. **Name the element** (e.g., "Submit Button")
4. **Choose element type** (button, field, checkbox, etc.)
5. Click **"Save Template"**
6. Repeat for all elements

### Mode 2: Test Templates

1. Switch to **"Test"** mode
2. Load a **filled form screenshot** (or keep blank form)
3. Click **"Test All Templates"** or click individual templates
4. Green boxes show where templates match
5. Verify they match the correct elements

### Export Your Configuration

1. Click **"Export Config"** when done
2. Review the generated TypeScript code
3. Click **"Copy Code"** 
4. Paste into your test file

## Example Workflow

```
1. Load blank-checkout.png
2. Draw rectangle around card number field
   → Name: "Card Number"
   → Type: field
   → Save
3. Draw rectangle around submit button
   → Name: "Pay Button"
   → Type: button
   → Save
4. Repeat for all elements...
5. Export Config
6. Copy code to checkout.spec.ts
```

## Generated Code Example

The tool generates TypeScript code like this:

```typescript
const elementConfigs: ElementConfig[] = [
  {
    name: 'Card Number',
    templatePath: './fixtures/templates/card-number.png',
    type: ElementType.FIELD,
  },
  {
    name: 'Pay Button',
    templatePath: './fixtures/templates/pay-button.png',
    type: ElementType.BUTTON,
  },
  {
    name: 'Remember Me',
    templatePath: './fixtures/templates/remember-me.png',
    type: ElementType.CHECKBOX,
  },
];
```

## Element Types

The tool supports these element types:

| Type | Description | Use For |
|------|-------------|---------|
| **field** | Text input, textarea | Username, email, address fields |
| **button** | Button, submit button | Submit, cancel, back buttons |
| **checkbox** | Checkbox | Terms acceptance, preferences |
| **radio** | Radio button | Option selection |
| **link** | Hyperlink | Navigation links |
| **icon** | Icon, indicator | Status icons, errors, success |
| **label** | Text label | Form labels, headings |
| **dropdown** | Select dropdown | Country, state selection |
| **message** | Error/success message | Validation messages |
| **other** | Other UI element | Anything else |

## Tips for Creating Good Templates

### ✅ Do:
- **Include a small border** around the element (2-5 pixels)
- **Use the blank form** as your source image
- **Be consistent** with naming (e.g., all buttons end with "Button")
- **Test templates** after creating them
- **Save frequently** (uses browser localStorage)

### ❌ Don't:
- Crop too tight (include some context)
- Use filled forms for templates (use blank!)
- Overlap templates (each should be unique)
- Forget to test before exporting

## Features Coming Soon

- 🎨 Real template matching with OpenCV.js
- 📊 Confidence score display
- 💾 Download templates as PNG files
- 📁 Import/export template projects
- 🔍 Zoom and pan for precise selection
- 📏 Snap to grid for alignment
- 🎯 Auto-detect common elements
- 🔄 Batch template creation

## Browser Support

Works in all modern browsers:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari

Uses:
- Canvas API (drawing)
- File API (image upload)
- LocalStorage (saving templates)

## Keyboard Shortcuts (Coming Soon)

- `Space` - Hold to pan canvas
- `Escape` - Clear current selection
- `Ctrl/Cmd + S` - Save template
- `Ctrl/Cmd + T` - Test current template
- `Ctrl/Cmd + E` - Export config

## Troubleshooting

### Templates not matching correctly?

1. **Crop from blank form** - Templates should be from empty form
2. **Include context** - Don't crop too tight
3. **Check element type** - Make sure type is correct
4. **Test in both modes** - Create mode (blank) and Test mode (filled)

### Can't see my image?

1. **Check image format** - Use PNG or JPG
2. **Check image size** - Large images (>10MB) may be slow
3. **Try a smaller screenshot** - Resize if needed

### Lost my templates?

- Templates are saved in browser localStorage
- Clearing browser data will delete them
- Export config regularly to save your work
- Consider backing up localStorage

## Integration with Tests

After exporting, you can use the configuration in your tests:

```typescript
import { test, expect } from '@playwright/test';
import { PlaywrightFormTester, ElementType } from 'playwright-ocr';
import type { ElementConfig } from 'playwright-ocr/types';

test('verify checkout form', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);

  // Paste exported config here
  const elementConfigs: ElementConfig[] = [
    {
      name: 'Card Number',
      templatePath: './fixtures/templates/card-number.png',
      type: ElementType.FIELD,
    },
    // ... more elements
  ];

  const screenshot = await formTester.captureScreen('checkout.png');
  const results = await formTester.compareScreen(screenshot, {
    blankScreenPath: './fixtures/blank-checkout.png',
    elementConfigs,
  });

  // Make assertions
  expect(results.elements.find(e => e.name === 'Card Number')?.isEmpty).toBe(false);
});
```

## Advanced Usage

### Nested Elements (Sections)

For elements within specific sections:

1. First, create a template for the **section**
2. Then, create templates for **elements within** that section
3. In code, reference the section template:

```typescript
{
  name: 'First Name',
  templatePath: './templates/fname-field.png',
  sectionTemplatePath: './templates/employee-section.png',  // Parent section
  type: ElementType.FIELD,
}
```

### Multiple States

For elements with different states (enabled/disabled buttons):

1. Create separate templates for each state
2. Name them clearly (e.g., "Submit Enabled", "Submit Disabled")
3. Test which state matches in your tests

## Contributing

Have ideas for the Template Manager? Open an issue or PR!

- 🐛 Report bugs
- 💡 Suggest features
- 🎨 Improve UI/UX
- 📝 Improve documentation

---

**Built for Playwright OCR** - Making RDP testing easier! 🚀
