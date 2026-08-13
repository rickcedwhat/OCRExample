# Template Management Guide

## What Templates Do You Need?

For each form/screen in your application, you need:

### 1. One Blank Form Template (per screen)
**Purpose:** The reference image for the entire form in its empty state

**Example:** `tests/fixtures/blank-w2-form.png`

This is a screenshot of the complete form with **all fields empty**. This is used to:
- Align filled forms that might be skewed/rotated
- Locate where fields are on the screen
- Compare against to detect which fields are filled

### 2. Individual Field Templates (per field you want to extract)
**Purpose:** Cropped images of each specific field from the blank form

**Example:**
```
tests/fixtures/templates/
├── ssn-field.png          # Just the SSN field area
├── ein-field.png          # Just the EIN field area  
├── wages-field.png        # Just the wages field area
├── employee-name.png      # Just the name field area
└── retirement-checkbox.png # Just the checkbox area
```

Each field template is a **crop from the blank form** showing:
- The field boundary
- A small border around it (for better matching)
- Any labels if they help identify the field

### 3. Optional: Section Templates (for nested fields)
**Purpose:** When fields are within specific sections of a complex form

**Example:**
```
tests/fixtures/templates/
├── employee-info-section.png  # The entire "Employee Info" section
├── fname-field.png            # First name within that section
└── lname-field.png            # Last name within that section
```

## Template Structure Visualized

```
Blank Form Screenshot (entire screen)
┌─────────────────────────────────────┐
│  Tax Form W-2                       │
│                                     │
│  SSN: [____________]  ← field template (ssn-field.png)
│                                     │
│  EIN: [____________]  ← field template (ein-field.png)
│                                     │
│  Wages: [__________]  ← field template (wages-field.png)
│                                     │
│  ┌─ Employee Info ─────────────┐   │
│  │ Name: [__________]          │   │ ← section template
│  │ Suffix: [___]               │   │    (employee-section.png)
│  └─────────────────────────────┘   │
│                                     │
│  [ ] Retirement Plan  ← field template (retirement-checkbox.png)
│                                     │
└─────────────────────────────────────┘
```

## How to Create Templates

### Initial Setup (One-Time Per Form)

1. **Capture blank form screenshot:**
   ```typescript
   // In your test, navigate to empty form
   await page.goto('your-app-form');
   await page.screenshot({ path: './fixtures/blank-form.png' });
   ```

2. **Crop individual fields:**
   - Open `blank-form.png` in any image editor (Preview, Paint, GIMP, etc.)
   - Use the rectangle selection tool
   - Crop just the field area (include a small border)
   - Save as `field-name.png`

3. **Define in your test:**
   ```typescript
   const fieldConfigs = [
     { 
       name: 'SSN',
       templatePath: './fixtures/templates/ssn-field.png'
     },
     { 
       name: 'Wages',
       templatePath: './fixtures/templates/wages-field.png'
     },
     {
       name: 'Retirement Plan',
       templatePath: './fixtures/templates/retirement-checkbox.png',
       isCheckbox: true
     },
   ];
   ```

## What Happens When the App Changes?

### ✅ No Template Updates Needed If:

- **Data changes** - Different SSNs, names, amounts entered (this is normal testing!)
- **Font size is the same** - Text gets bigger/smaller but field positions stay the same
- **Colors change** - Different button colors, backgrounds (we convert to grayscale)
- **Minor pixel differences** - Small anti-aliasing or rendering variations

The templates capture the **structure**, not the content.

### ⚠️ Template Updates Needed If:

#### Scenario 1: Field Position Changes
**What changed:** Form layout redesign, fields moved

**What to update:**
- ✅ Blank form template (new screenshot of empty form)
- ✅ Field templates (re-crop from new blank form)
- ❌ Test code (no changes needed if field names stay the same)

**How to update:**
```bash
# 1. Capture new blank form
# 2. Re-crop all field templates from new blank form
# 3. Replace old templates with new ones
# Done! Tests still work.
```

#### Scenario 2: New Fields Added
**What changed:** Form has additional fields you want to test

**What to update:**
- ❌ Blank form template (reuse existing if overall form is the same)
- ✅ New field templates (crop the new fields)
- ✅ Test code (add new field configs)

**How to update:**
```typescript
// Just add to your fieldConfigs array
const fieldConfigs = [
  // ... existing fields ...
  { 
    name: 'New Field',
    templatePath: './fixtures/templates/new-field.png'  // Crop from blank form
  },
];
```

#### Scenario 3: Fields Removed
**What changed:** Form no longer has certain fields

**What to update:**
- ❌ Blank form template (can reuse)
- ❌ Field templates (can leave them, won't be used)
- ✅ Test code (remove from fieldConfigs)

**How to update:**
```typescript
// Just remove from fieldConfigs array
// Old template files can stay in fixtures folder (ignored)
```

#### Scenario 4: Field Size/Shape Changes
**What changed:** Input boxes got bigger/smaller, different aspect ratio

**What to update:**
- ✅ That specific field template (re-crop with new size)
- ❌ Other templates (unchanged fields can stay)
- ❌ Test code (no changes)

**How to update:**
```bash
# Just re-crop the changed field from the blank form
# Replace old field template with new one
```

## Example: Your Java POC Setup

Looking at your original Java code:

```java
FieldInfo.setBaseDir("src/main/resources/forms and fields/W2 Fields/");
FieldInfo.setFormPaths(
    "src/main/resources/forms and fields/Blank W2.png",    // Blank form
    "src/main/resources/forms and fields/Sample W2.png"    // Filled form (test screenshot)
);

// Each field has a template
fieldList.add(new FieldInfo("SSN", "field_a"));                      // → field_a.png
fieldList.add(new FieldInfo("EIN", "field_b"));                      // → field_b.png
fieldList.add(new FieldInfo("Employee first name", "field_e_fname", "field_e"));  // nested
```

**Equivalent TypeScript setup:**

```typescript
const fieldConfigs = [
  {
    name: 'SSN',
    templatePath: './fixtures/templates/field_a.png'
  },
  {
    name: 'EIN',
    templatePath: './fixtures/templates/field_b.png'
  },
  {
    name: 'Employee First Name',
    templatePath: './fixtures/templates/field_e_fname.png',
    sectionTemplatePath: './fixtures/templates/field_e.png'  // Optional: locate within section
  },
];

const results = await formTester.compareForm(screenshotPath, {
  blankFormPath: './fixtures/blank-w2.png',
  fieldConfigs,
});
```

## Template Management Best Practices

### 1. Version Control Your Templates

```bash
git add tests/fixtures/
git commit -m "Update W2 form templates for v2.0 layout"
```

This gives you history when the UI changes.

### 2. Organize by Screen/Form

```
tests/fixtures/
├── login-screen/
│   ├── blank-login.png
│   └── templates/
│       ├── username-field.png
│       └── password-field.png
├── w2-form/
│   ├── blank-w2.png
│   └── templates/
│       ├── ssn-field.png
│       ├── ein-field.png
│       └── wages-field.png
└── settings-screen/
    ├── blank-settings.png
    └── templates/
        └── email-field.png
```

### 3. Name Templates Descriptively

✅ Good:
- `ssn-field.png`
- `retirement-checkbox.png`
- `employee-name-section.png`

❌ Bad:
- `field1.png`
- `temp.png`
- `screenshot.png`

### 4. Keep Original Screenshots

When your app UI changes, keep old versions:

```
tests/fixtures/w2-form/
├── v1/
│   ├── blank-w2-v1.png
│   └── templates/
├── v2/
│   ├── blank-w2-v2.png      # Current version
│   └── templates/
└── blank-w2.png → v2/blank-w2-v2.png  # Symlink to current
```

## Testing After Template Updates

After updating templates, verify they still match:

```typescript
test('verify templates match correctly', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  // Navigate to empty form
  await page.goto('your-form');
  
  // Capture current empty form
  const currentBlank = await formTester.captureScreen('current-blank.png');
  
  // Compare against your blank template
  const results = await formTester.compareForm(currentBlank, {
    blankFormPath: './fixtures/blank-form.png',
    fieldConfigs,
    debug: true,  // See confidence scores
  });
  
  // Check all fields are found with high confidence
  for (const field of results.fields) {
    expect(field.confidence).toBeGreaterThan(0.9);  // Good match
  }
});
```

## Quick Reference

| When App Changes | Blank Form | Field Templates | Test Code |
|------------------|------------|-----------------|-----------|
| Data only (testing) | ❌ No | ❌ No | ❌ No |
| Field position | ✅ Yes | ✅ Yes | ❌ No |
| New fields | ❌ No* | ✅ New only | ✅ Yes |
| Removed fields | ❌ No | ❌ No | ✅ Yes |
| Field size | ❌ No | ✅ Changed only | ❌ No |
| Colors/themes | ❌ No | ❌ No | ❌ No |

*Unless overall layout changed significantly

## TL;DR

**One-time setup:**
1. Screenshot your empty form → `blank-form.png`
2. Crop each field from that screenshot → `field-name.png`
3. Define field configs in test

**When app UI changes:**
1. Screenshot the new empty form → replace `blank-form.png`
2. Re-crop changed fields → replace affected `field-name.png` files
3. Update test code only if fields added/removed

**When testing (normal usage):**
- Templates never change (they define the structure)
- You test with different data each time
- Library extracts actual values from screenshots

The templates are just the "map" of where fields are. The data changes every test!
