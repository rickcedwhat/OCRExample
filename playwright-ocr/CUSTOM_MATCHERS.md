# Custom Matcher Functions

For advanced use cases where static templates don't work, you can provide a **custom matcher function** that has full control over element detection and value extraction.

## When to Use Custom Matchers

### ✅ Perfect For:
- **Progress bars** - Extract exact percentage (not just 0%, 25%, 50%, 100%)
- **Sliders** - Detect slider position along a track
- **Color pickers** - Analyze the selected color
- **Dynamic charts** - Extract data from live graphs
- **Loading indicators** - Measure animation progress
- **Thermometers** - Read temperature from visual gauge
- **Volume meters** - Detect audio/volume levels
- **Star ratings** - Count filled vs empty stars
- **Custom gauges** - Any visual indicator with continuous values

### ⚠️ Overkill For:
- Simple text fields (use regular OCR)
- Checkboxes (use built-in checkbox detection)
- Static buttons (use variants)
- Anything with discrete states (use variants)

## How It Works

1. Library finds element location using `templatePath` (required)
2. Extracts the region of interest (ROI)
3. Calls your custom matcher with the ROI
4. Your function analyzes the pixels and returns a result
5. Library wraps it in an `ElementResult`

## Basic Example: Progress Bar

```typescript
import { defineTypedScreen, ElementType } from 'playwright-ocr';
import type { CustomMatcherContext, CustomMatcherResult } from 'playwright-ocr';

export const downloadScreen = defineTypedScreen({
  name: 'download',
  baseDir: __dirname,
  elements: [
    {
      name: 'Download Progress',
      // Template is the OUTLINE of the progress bar (to find location)
      templatePath: path.join(__dirname, 'templates', 'progress-outline.png'),
      type: ElementType.ICON,
      
      // Custom matcher analyzes the filled portion
      customMatcher: async (context: CustomMatcherContext): Promise<CustomMatcherResult> => {
        const { filledROI, blankROI, utils } = context;
        
        // Get dimensions
        const width = filledROI.cols;
        const height = filledROI.rows;
        
        // Compare filled vs blank to find colored pixels
        const diff = utils.compareRegions(filledROI, blankROI, 50, 1);
        
        // Calculate percentage based on filled pixels
        // Assuming progress bar fills left-to-right
        let filledPixels = 0;
        const data = filledROI.data;
        
        // Count non-blank pixels (simplified - real impl would be more sophisticated)
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;  // RGBA
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            // If pixel is colored (not white/blank), count it
            if (r < 240 || g < 240 || b < 240) {
              filledPixels++;
            }
          }
        }
        
        const totalPixels = width * height;
        const percentage = Math.round((filledPixels / totalPixels) * 100);
        
        return {
          value: `${percentage}%`,
          confidence: 0.95,
          isEmpty: percentage === 0,
          metadata: {
            percentage,
            filledPixels,
            totalPixels,
            dimensions: { width, height },
          },
        };
      },
    },
  ] as const,
});

// Usage in tests
test('download progress tracking', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  await page.click('#start-download');
  
  // Check initial state
  let screenshot = await formTester.captureScreen('download-start.png');
  let screen = await formTester.compareScreen(screenshot, downloadScreen);
  
  let progress = screen.element('Download Progress');
  await progress.toHaveValue('0%');
  expect(progress.getMetadata<number>('percentage')).toBe(0);
  
  // Wait a bit
  await page.waitForTimeout(2000);
  
  // Check progress
  screenshot = await formTester.captureScreen('download-progress.png');
  screen = await formTester.compareScreen(screenshot, downloadScreen);
  
  progress = screen.element('Download Progress');
  const pct = progress.getMetadata<number>('percentage');
  
  console.log(`Download at ${pct}%`);
  expect(pct).toBeGreaterThan(0);
  expect(pct).toBeLessThan(100);
  
  // Wait for completion
  await page.waitForSelector('.download-complete');
  
  screenshot = await formTester.captureScreen('download-complete.png');
  screen = await formTester.compareScreen(screenshot, downloadScreen);
  
  progress = screen.element('Download Progress');
  await progress.toHaveValue('100%');
  expect(progress.getMetadata<number>('percentage')).toBe(100);
});
```

## Real-World Examples

### 1. Horizontal Progress Bar

```typescript
customMatcher: async ({ filledROI, blankROI, utils }) => {
  const width = filledROI.cols;
  const height = filledROI.rows;
  
  // Create difference image
  const diffImage = utils.createDiffImage(filledROI, blankROI, 50);
  const data = diffImage.data;
  
  // Find rightmost filled pixel
  let maxX = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x);
      if (data[idx] > 0) {  // Non-zero = different from blank
        maxX = Math.max(maxX, x);
      }
    }
  }
  
  const percentage = Math.round((maxX / width) * 100);
  
  return {
    value: `${percentage}%`,
    confidence: 0.9,
    isEmpty: percentage === 0,
    metadata: { percentage, width, filledPixels: maxX },
  };
}
```

### 2. Vertical Progress Bar (Bottom to Top)

```typescript
customMatcher: async ({ filledROI, blankROI, utils }) => {
  const width = filledROI.cols;
  const height = filledROI.rows;
  
  const diffImage = utils.createDiffImage(filledROI, blankROI, 50);
  const data = diffImage.data;
  
  // Find topmost filled pixel (progress fills from bottom)
  let minY = height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x);
      if (data[idx] > 0) {
        minY = Math.min(minY, y);
        break;  // Found filled pixel in this row
      }
    }
  }
  
  const filledHeight = height - minY;
  const percentage = Math.round((filledHeight / height) * 100);
  
  return {
    value: `${percentage}%`,
    confidence: 0.9,
    isEmpty: percentage === 0,
    metadata: { percentage, height, filledHeight },
  };
}
```

### 3. Circular Progress (Spinner with Percentage)

```typescript
customMatcher: async ({ filledROI, blankROI, utils }) => {
  const width = filledROI.cols;
  const height = filledROI.rows;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2;
  
  const diffImage = utils.createDiffImage(filledROI, blankROI, 50);
  const data = diffImage.data;
  
  // Count filled pixels in circular region
  let filledArc = 0;
  let totalArc = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Only count pixels in the arc (not center)
      if (dist >= radius * 0.7 && dist <= radius) {
        totalArc++;
        const idx = (y * width + x);
        if (data[idx] > 0) {
          filledArc++;
        }
      }
    }
  }
  
  const percentage = Math.round((filledArc / totalArc) * 100);
  
  return {
    value: `${percentage}%`,
    confidence: 0.85,
    isEmpty: percentage === 0,
    metadata: { percentage, filledArc, totalArc },
  };
}
```

### 4. Star Rating (Count Filled Stars)

```typescript
customMatcher: async ({ filledROI, blankROI, utils }) => {
  const width = filledROI.cols;
  const height = filledROI.rows;
  
  // Divide into 5 regions (5 stars)
  const starWidth = width / 5;
  let filledStars = 0;
  
  for (let i = 0; i < 5; i++) {
    const startX = Math.floor(i * starWidth);
    const endX = Math.floor((i + 1) * starWidth);
    
    // Check if this star region is filled
    let filledPixels = 0;
    let totalPixels = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = startX; x < endX; x++) {
        totalPixels++;
        
        const idx = (y * width + x) * 4;
        const r = filledROI.data[idx];
        const g = filledROI.data[idx + 1];
        const b = filledROI.data[idx + 2];
        
        // Check if pixel is "star color" (e.g., yellow/gold)
        const isStarColor = r > 200 && g > 150 && b < 100;
        if (isStarColor) {
          filledPixels++;
        }
      }
    }
    
    // If more than 50% of star is filled, count it
    if (filledPixels / totalPixels > 0.5) {
      filledStars++;
    }
  }
  
  return {
    value: `${filledStars}/5`,
    confidence: 0.9,
    isEmpty: filledStars === 0,
    metadata: { 
      stars: filledStars,
      maxStars: 5,
      rating: filledStars / 5,
    },
  };
}
```

### 5. Slider Position

```typescript
customMatcher: async ({ filledROI, blankROI, utils }) => {
  const width = filledROI.cols;
  const height = filledROI.rows;
  
  const diffImage = utils.createDiffImage(filledROI, blankROI, 70);
  const data = diffImage.data;
  
  // Find the slider knob (cluster of different pixels)
  let knobX = 0;
  let maxDensity = 0;
  
  // Scan in windows to find densest region (the knob)
  const windowSize = Math.floor(width * 0.1);  // 10% of width
  
  for (let x = 0; x < width - windowSize; x++) {
    let density = 0;
    
    for (let y = 0; y < height; y++) {
      for (let wx = 0; wx < windowSize; wx++) {
        const idx = (y * width + (x + wx));
        if (data[idx] > 0) {
          density++;
        }
      }
    }
    
    if (density > maxDensity) {
      maxDensity = density;
      knobX = x + windowSize / 2;  // Center of window
    }
  }
  
  const percentage = Math.round((knobX / width) * 100);
  
  return {
    value: `${percentage}%`,
    confidence: 0.85,
    isEmpty: false,  // Slider always has a position
    metadata: { 
      percentage, 
      position: knobX,
      width,
    },
  };
}
```

### 6. Color Picker - Extract RGB

```typescript
customMatcher: async ({ filledROI, blankROI }) => {
  const width = filledROI.cols;
  const height = filledROI.rows;
  
  // Sample center pixel of the color swatch
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  
  const idx = (centerY * width + centerX) * 4;
  const r = filledROI.data[idx];
  const g = filledROI.data[idx + 1];
  const b = filledROI.data[idx + 2];
  
  // Convert to hex
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  
  return {
    value: hex.toUpperCase(),
    confidence: 1.0,
    isEmpty: false,
    metadata: {
      rgb: { r, g, b },
      hex,
      hsl: rgbToHsl(r, g, b),
    },
  };
}
```

## Context API Reference

```typescript
interface CustomMatcherContext {
  // Image regions
  blankROI: any;      // cv.Mat - Region from blank screenshot
  filledROI: any;     // cv.Mat - Region from filled screenshot  
  templateROI: any;   // cv.Mat - Template used to find location
  
  // Metadata
  location: Rect;     // Where element was found { x, y, width, height }
  config: ElementConfig;  // Your element configuration
  
  // Utility functions
  utils: {
    // Create diff image highlighting differences
    createDiffImage(roi1: any, roi2: any, threshold?: number): any;
    
    // Convert cv.Mat to Buffer (for OCR if needed)
    matToBuffer(mat: any): Buffer;
    
    // Compare regions and get statistics
    compareRegions(
      roi1: any, 
      roi2: any, 
      threshold?: number, 
      minDiffPixels?: number
    ): {
      different: boolean;
      diffPixelCount: number;
      diffPercentage: number;
    };
  };
}
```

## Return Value

```typescript
interface CustomMatcherResult {
  value: string;           // Display value (e.g., "47%", "#FF5733", "3/5")
  confidence: number;      // 0-1, how confident you are in the result
  isEmpty: boolean;        // Is element in default/empty state?
  metadata?: Record<string, any>;  // Any extra data you want to return
}
```

## Best Practices

### ✅ Do:

```typescript
// Provide templatePath to locate the element
{
  name: 'Progress Bar',
  templatePath: 'progress-outline.png',  // Required!
  customMatcher: ...
}

// Return meaningful metadata
metadata: {
  percentage: 47,
  rawValue: 470,
  maxValue: 1000,
}

// Handle edge cases
if (percentage < 0) percentage = 0;
if (percentage > 100) percentage = 100;

// Use appropriate confidence scores
confidence: 0.95,  // High confidence for simple calculations
confidence: 0.7,   // Lower confidence for complex analysis
```

### ❌ Don't:

```typescript
// Don't omit templatePath
{
  name: 'Progress Bar',
  customMatcher: ...  // ERROR: How do we find it?
}

// Don't return unstructured metadata
metadata: {
  data: "47% filled with 470 pixels out of 1000",  // ❌ Parse this?
}

// Don't throw errors for valid states
if (percentage === 0) {
  throw new Error('No progress');  // ❌ 0% is valid!
}

// Return isEmpty: true instead:
return {
  value: '0%',
  isEmpty: true,  // ✅
  ...
}
```

## Combining with OCR

You can use OCR within a custom matcher:

```typescript
import { getOCRUtil } from 'playwright-ocr/utils/ocr';

customMatcher: async ({ filledROI, blankROI, utils }) => {
  // Extract just the percentage text region
  const textRegion = filledROI.roi(new cv.Rect(10, 5, 50, 20));
  
  // Run OCR on it
  const ocrUtil = await getOCRUtil();
  const textBuffer = utils.matToBuffer(textRegion);
  const text = await ocrUtil.extractText(textBuffer);
  
  // Parse it
  const match = text.match(/(\d+)%/);
  const percentage = match ? parseInt(match[1]) : 0;
  
  textRegion.delete();
  
  return {
    value: `${percentage}%`,
    confidence: 0.9,
    isEmpty: percentage === 0,
    metadata: { percentage, rawOCR: text },
  };
}
```

## Performance Tips

- Keep matcher functions **fast** (< 100ms)
- Avoid heavy computation if possible
- Cache calculations when analyzing multiple screenshots
- Use `utils.compareRegions()` instead of manual pixel loops when possible
- Consider using variants for common discrete states, custom matcher for edge cases

## Debugging Custom Matchers

```typescript
customMatcher: async (context) => {
  const { filledROI, config } = context;
  
  // Enable debug logging
  if (process.env.DEBUG_CUSTOM_MATCHERS) {
    console.log(`Analyzing element: ${config.name}`);
    console.log(`ROI dimensions: ${filledROI.cols}x${filledROI.rows}`);
    
    // Save ROI to file for inspection
    const fs = require('fs/promises');
    const buffer = context.utils.matToBuffer(filledROI);
    await fs.writeFile(`/tmp/debug-${config.name}.png`, buffer);
  }
  
  // ... your logic ...
};
```

## Summary

Custom matchers give you **pixel-level control** for complex UI elements that don't fit static templates. Use them for:
- **Continuous values** (progress bars, sliders, gauges)
- **Color analysis** (color pickers, status indicators)
- **Spatial patterns** (star ratings, signal strength bars)
- **Dynamic visualizations** (charts, graphs)

They're your escape hatch for edge cases while keeping the simple cases simple! 🚀
