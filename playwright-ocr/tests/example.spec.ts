import { test, expect } from '@playwright/test';
import { PlaywrightFormTester } from '../src/playwright-helper.js';
import type { FieldConfig } from '../src/field-extractor.js';
import { cleanupOCR } from '../src/utils/ocr.js';
import * as path from 'path';

/**
 * Example test demonstrating form field extraction
 * 
 * This example shows how to:
 * 1. Connect to a desktop app via RDP (or any application)
 * 2. Navigate to a form
 * 3. Extract field values using OCR and template matching
 * 4. Make assertions about the extracted data
 */

test.describe('Form Field Extraction', () => {
  test.afterAll(async () => {
    // Clean up OCR worker after all tests
    await cleanupOCR();
  });

  test('should extract W-2 form fields', async ({ page }) => {
    // Initialize the form tester
    const formTester = new PlaywrightFormTester(page, './test-results/screenshots');
    await formTester.initialize();

    // Define the fields we want to extract
    const fieldConfigs: FieldConfig[] = [
      {
        name: 'SSN',
        templatePath: path.join(__dirname, 'fixtures/templates/field_a.png'),
      },
      {
        name: 'EIN',
        templatePath: path.join(__dirname, 'fixtures/templates/field_b.png'),
      },
      {
        name: 'Wages',
        templatePath: path.join(__dirname, 'fixtures/templates/field_1.png'),
      },
      {
        name: 'Employee First Name',
        templatePath: path.join(__dirname, 'fixtures/templates/field_e_fname.png'),
        sectionTemplatePath: path.join(__dirname, 'fixtures/templates/field_e.png'),
      },
      {
        name: 'Statutory Employee',
        templatePath: path.join(__dirname, 'fixtures/templates/field_13_stat_emp.png'),
        isCheckbox: true,
      },
      {
        name: 'Retirement Plan',
        templatePath: path.join(__dirname, 'fixtures/templates/field_13_ret_plan.png'),
        isCheckbox: true,
      },
    ];

    // Test the form extraction
    // In a real scenario, you would:
    // 1. Navigate to your RDP session
    // 2. Open the application
    // 3. Navigate to the form
    // Here's an example for a web-based form:
    
    // await page.goto('https://example.com/tax-form');
    // await page.fill('#ssn', '123-45-6789');
    // await page.fill('#ein', '12-3456789');
    // ... fill other fields

    // For RDP testing, you would use mouse coordinates:
    // await page.mouse.click(100, 200);
    // await page.keyboard.type('123-45-6789');

    // Capture and analyze the form
    const blankFormPath = path.join(__dirname, 'fixtures/blank-w2.png');
    const filledFormPath = path.join(__dirname, 'fixtures/sample-w2.png');

    // Option 1: Test with pre-captured screenshots
    const results = await formTester.compareForm(filledFormPath, {
      blankFormPath,
      fieldConfigs,
      debug: true,
    });

    // Option 2: Test with live screenshots from the page
    // const results = await formTester.testForm(
    //   async () => {
    //     await page.goto('https://example.com/tax-form');
    //     // Fill the form using mouse coordinates or keyboard
    //   },
    //   {
    //     blankFormPath,
    //     fieldConfigs,
    //     debug: true,
    //   }
    // );

    // Make assertions about the extracted data
    console.log('Extraction Results:');
    console.log(`Total elements: ${results.totalElements}`);
    console.log(`Filled elements: ${results.filledElements}`);
    console.log(`Empty elements: ${results.emptyElements}`);

    for (const field of results.elements) {
      console.log(`\n${field.name}:`);
      console.log(`  Value: ${field.value}`);
      console.log(`  Empty: ${field.isEmpty}`);
      console.log(`  Confidence: ${field.confidence?.toFixed(2)}`);
      console.log(`  Location: (${field.location.x}, ${field.location.y})`);
    }

    // Example assertions
    expect(results.totalElements).toBe(6);
    
    // Check that at least some elements were filled
    expect(results.filledElements).toBeGreaterThan(0);

    // Find specific elements
    const ssnField = results.elements.find((f) => f.name === 'SSN');
    expect(ssnField).toBeDefined();
    
    const retirementField = results.elements.find((f) => f.name === 'Retirement Plan');
    expect(retirementField).toBeDefined();
    expect(retirementField?.value).toMatch(/checked|unchecked/);

    // Clean up
    await formTester.cleanup();
  });

  test('should detect form changes', async ({ page }) => {
    // This test demonstrates detecting changes between two form states
    const formTester = new PlaywrightFormTester(page);
    await formTester.initialize();

    // Example: Test that filling a form produces different results
    // than an empty form
    
    const blankFormPath = path.join(__dirname, 'fixtures/blank-w2.png');
    const emptyFormScreenshot = path.join(__dirname, 'fixtures/blank-w2.png');
    const filledFormScreenshot = path.join(__dirname, 'fixtures/sample-w2.png');

    const fieldConfigs: FieldConfig[] = [
      {
        name: 'SSN',
        templatePath: path.join(__dirname, 'fixtures/templates/field_a.png'),
      },
    ];

    const emptyResults = await formTester.compareForm(emptyFormScreenshot, {
      blankFormPath,
      fieldConfigs,
    }) as any;

    const filledResults = await formTester.compareForm(filledFormScreenshot, {
      blankFormPath,
      fieldConfigs,
    }) as any;

    // Verify that the empty form has no filled elements (using legacy property)
    expect(emptyResults.filledFields || emptyResults.filledElements).toBe(0);
    
    // Verify that the filled form has some filled elements (using legacy property)
    expect(filledResults.filledFields || filledResults.filledElements).toBeGreaterThan(0);

    await formTester.cleanup();
  });
});
