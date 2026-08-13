# Quick Start: From Java POC to TypeScript

## Your Java POC Mapping

### Java Version Structure

```
src/main/resources/forms and fields/
├── Blank W2.png                    ← Full blank form screenshot
├── Sample W2.png                   ← Test screenshot (filled form)
└── W2 Fields/                      ← Field templates directory
    ├── field_a.png                 ← SSN field template
    ├── field_b.png                 ← EIN field template
    ├── field_c.png                 ← Employer info
    ├── field_1.png                 ← Wages field
    ├── field_e.png                 ← Employee section (parent)
    ├── field_e_fname.png           ← First name (child)
    ├── field_e_lname.png           ← Last name (child)
    ├── field_e_suffix.png          ← Suffix (child)
    ├── field_13_stat_emp.png       ← Checkbox
    ├── field_13_ret_plan.png       ← Checkbox
    └── field_13_third_party.png    ← Checkbox
```

### Java Code

```java
// Set the base directory for templates
FieldInfo.setBaseDir("src/main/resources/forms and fields/W2 Fields/");

// Set blank and filled form paths
FieldInfo.setFormPaths(
    "src/main/resources/forms and fields/Blank W2.png",
    "src/main/resources/forms and fields/Sample W2.png"
);

// Define fields
List<FieldInfo> fieldList = new ArrayList<>();
fieldList.add(new FieldInfo("SSN", "field_a"));
fieldList.add(new FieldInfo("EIN", "field_b"));
fieldList.add(new FieldInfo("Employer info", "field_c"));
fieldList.add(new FieldInfo("Wages, tips, and compensation", "field_1"));

// Nested fields (first name is within employee section)
fieldList.add(new FieldInfo("Employee first name", "field_e_fname", "field_e"));
fieldList.add(new FieldInfo("Employee last name", "field_e_lname", "field_e"));
fieldList.add(new FieldInfo("Employee suffix", "field_e_suffix", "field_e"));

// Checkboxes
fieldList.add(new FieldInfo("Statutory Employee", "field_13_stat_emp", true));
fieldList.add(new FieldInfo("Retirement Plan", "field_13_ret_plan", true));
fieldList.add(new FieldInfo("Third Party Sick Pay", "field_13_third_party", true));

// Extract values
for (FieldInfo fieldInfo : fieldList) {
    String value = fieldInfo.extractValue();
    logger.info("{}: {}", fieldInfo.getFieldName(), fieldInfo.getFieldValue());
}
```

## TypeScript Equivalent

### TypeScript Version Structure

```
tests/fixtures/
├── blank-w2.png                    ← Full blank form screenshot (same as Java)
└── templates/                      ← Field templates directory (same as Java)
    ├── field_a.png                 ← SSN field template
    ├── field_b.png                 ← EIN field template
    ├── field_c.png                 ← Employer info
    ├── field_1.png                 ← Wages field
    ├── field_e.png                 ← Employee section (parent)
    ├── field_e_fname.png           ← First name (child)
    ├── field_e_lname.png           ← Last name (child)
    ├── field_e_suffix.png          ← Suffix (child)
    ├── field_13_stat_emp.png       ← Checkbox
    ├── field_13_ret_plan.png       ← Checkbox
    └── field_13_third_party.png    ← Checkbox
```

**You can literally copy your Java templates!** Same PNG files work in TypeScript version.

### TypeScript Code

```typescript
import { test, expect } from '@playwright/test';
import { PlaywrightFormTester } from 'playwright-ocr';
import type { FieldConfig } from 'playwright-ocr/field-extractor';

test('extract W2 form fields', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);

  // Define fields (same structure as Java)
  const fieldConfigs: FieldConfig[] = [
    // Simple fields
    { name: 'SSN', templatePath: './fixtures/templates/field_a.png' },
    { name: 'EIN', templatePath: './fixtures/templates/field_b.png' },
    { name: 'Employer info', templatePath: './fixtures/templates/field_c.png' },
    { name: 'Wages, tips, and compensation', templatePath: './fixtures/templates/field_1.png' },
    
    // Nested fields (within employee section)
    {
      name: 'Employee first name',
      templatePath: './fixtures/templates/field_e_fname.png',
      sectionTemplatePath: './fixtures/templates/field_e.png',  // Parent section
    },
    {
      name: 'Employee last name',
      templatePath: './fixtures/templates/field_e_lname.png',
      sectionTemplatePath: './fixtures/templates/field_e.png',
    },
    {
      name: 'Employee suffix',
      templatePath: './fixtures/templates/field_e_suffix.png',
      sectionTemplatePath: './fixtures/templates/field_e.png',
    },
    
    // Checkboxes
    {
      name: 'Statutory Employee',
      templatePath: './fixtures/templates/field_13_stat_emp.png',
      isCheckbox: true,
    },
    {
      name: 'Retirement Plan',
      templatePath: './fixtures/templates/field_13_ret_plan.png',
      isCheckbox: true,
    },
    {
      name: 'Third Party Sick Pay',
      templatePath: './fixtures/templates/field_13_third_party.png',
      isCheckbox: true,
    },
  ];

  // For RDP testing with Playwright
  await page.goto('your-rdp-app');
  
  // Interact with mouse coordinates (since no DOM)
  await page.mouse.click(100, 200);  // Click SSN field
  await page.keyboard.type('123-45-6789');
  // ... more interactions ...

  // Extract values (same as Java)
  const screenshot = await formTester.captureScreen('filled-w2.png');
  const results = await formTester.compareForm(screenshot, {
    blankFormPath: './fixtures/blank-w2.png',
    fieldConfigs,
  });

  // Log results (same as Java logger.info)
  console.log(`Total fields: ${results.totalFields}`);
  console.log(`Filled fields: ${results.filledFields}`);
  
  for (const field of results.fields) {
    console.log(`${field.name}: ${field.value}`);
  }

  // Make assertions (better than Java!)
  expect(results.fields.find(f => f.name === 'SSN')?.value).toBe('123-45-6789');
  expect(results.fields.find(f => f.name === 'Retirement Plan')?.value).toBe('checked');
});
```

## Side-by-Side Comparison

| Feature | Java POC | TypeScript Library |
|---------|----------|-------------------|
| **Templates** | PNG files in resources/ | PNG files in fixtures/ (same files!) |
| **Blank form** | `setFormPaths(blank, filled)` | `blankFormPath: './blank.png'` |
| **Field definition** | `new FieldInfo(name, template)` | `{ name, templatePath }` |
| **Nested fields** | `new FieldInfo(name, child, parent)` | `{ name, templatePath, sectionTemplatePath }` |
| **Checkboxes** | `new FieldInfo(name, template, true)` | `{ name, templatePath, isCheckbox: true }` |
| **Extraction** | `fieldInfo.extractValue()` | `formTester.compareForm()` |
| **Output** | `fieldInfo.getFieldValue()` | `results.fields[i].value` |

## Migration Steps

### 1. Copy Your Templates

```bash
# From your Java project
cp -r src/main/resources/forms\ and\ fields/W2\ Fields/* \
      playwright-ocr/tests/fixtures/templates/

cp src/main/resources/forms\ and\ fields/Blank\ W2.png \
   playwright-ocr/tests/fixtures/blank-w2.png
```

### 2. Convert Your Java Field List

Take your Java code:

```java
fieldList.add(new FieldInfo("SSN", "field_a"));
```

Convert to TypeScript:

```typescript
{ name: 'SSN', templatePath: './fixtures/templates/field_a.png' }
```

### 3. Write Your Test

See the TypeScript example above - it's almost 1:1 with your Java code structure!

### 4. Run It

```bash
cd playwright-ocr
npm test
```

## Key Differences (Improvements!)

### Java POC
```java
// Output
logger.info("{}: {}", fieldInfo.getFieldName(), fieldInfo.getFieldValue());
// SSN: 123-45-6789
// (but no assertions, just logging)
```

### TypeScript Library
```typescript
// Structured output
const results = await formTester.compareForm(...);
// {
//   fields: [{ name: 'SSN', value: '123-45-6789', confidence: 0.95, isEmpty: false }],
//   filledFields: 10,
//   emptyFields: 2
// }

// Actual test assertions
expect(results.fields.find(f => f.name === 'SSN')?.value).toBe('123-45-6789');
// ✅ Test passes or fails automatically
```

## When Your App Changes

Same as Java POC:

1. **If field positions change:**
   - Take new screenshot of blank form
   - Re-crop field templates from new blank form
   - Replace the PNG files
   - Code stays the same!

2. **If you add new fields:**
   - Crop new field from blank form
   - Add to `fieldConfigs` array
   - Done!

3. **If you remove fields:**
   - Remove from `fieldConfigs` array
   - Can delete template PNG (optional)

## Example: Adding a New Field

### Java
```java
// Add to your list
fieldList.add(new FieldInfo("New Field", "field_new"));

// Need new template: field_new.png in W2 Fields/
```

### TypeScript
```typescript
// Add to your array
const fieldConfigs = [
  // ... existing fields ...
  { name: 'New Field', templatePath: './fixtures/templates/field_new.png' },
];

// Need new template: field_new.png in fixtures/templates/
```

**Same concept, same template files!**

## What You DON'T Need to Update

✅ **Templates stay the same when:**
- You test with different data (different SSNs, names, amounts)
- Colors change (we convert to grayscale)
- Minor rendering differences
- You run tests in different environments

❌ **Templates only change when:**
- UI layout changes (field positions move)
- Field sizes change
- New fields added/removed
- Form redesign

## The Mental Model

Think of templates as a **map of your form**:

```
Your Form = Map (templates)
Test Data = Journey (changes every time)

When the form structure changes → Update the map (templates)
When the data changes → No changes needed (that's testing!)
```

## Next Steps

1. Copy your Java templates to `playwright-ocr/tests/fixtures/`
2. Copy the TypeScript example above
3. Replace field names/templates with yours
4. Run `npm test`
5. Enjoy faster, free, integrated testing! 🚀

You already did the hard part (creating templates) in Java. Now just reuse them!
