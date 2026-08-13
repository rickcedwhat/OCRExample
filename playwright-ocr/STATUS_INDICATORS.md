# Status Indicator Color Detection

Verify UI status indicators by their **color** using custom matchers. Perfect for traffic lights, status dots, progress states, and any color-coded UI elements.

## Use Cases

✅ **Perfect For:**
- Task board status dots (blocked=red, in-progress=green, done=blue)
- Traffic light indicators
- Build/CI status indicators
- Server health status (online=green, offline=red, degraded=yellow)
- Connection status indicators
- Battery charge indicators (low=red, charging=yellow, full=green)
- Signal strength indicators
- Priority flags (high=red, medium=yellow, low=green)

## Quick Example

```typescript
import { statusColorMatcher, StatusColor } from './tests/status-indicator-example';

const screen = defineTypedScreen({
  name: 'task-board',
  baseDir: __dirname,
  elements: [
    {
      name: 'Task Status',
      template: 'status-dot.png',  // Template of the dot/circle outline
      type: ElementType.ICON,
      customMatcher: statusColorMatcher,  // Analyzes the color!
    },
  ] as const,
});

// In your test:
const status = screen.element('Task Status');

// Check status by color
await status.toHaveValue(StatusColor.BLOCKED);      // Red
await status.toHaveValue(StatusColor.IN_PROGRESS);  // Green
await status.toHaveValue(StatusColor.PENDING);      // Yellow

// Get exact color
const hex = status.getMetadata<string>('hex');
console.log('Status color:', hex);  // "#F03434"

const rgb = status.getMetadata<{ r: number; g: number; b: number }>('rgb');
expect(rgb.r).toBeGreaterThan(200);  // Reddish
```

## How It Works

### 1. Define Your Status Colors

```typescript
enum StatusColor {
  BLOCKED = 'blocked',         // Red
  IN_PROGRESS = 'in-progress', // Green
  PENDING = 'pending',         // Yellow
  COMPLETE = 'complete',       // Blue
  UNKNOWN = 'unknown',         // Gray or unrecognized
}

const COLOR_RANGES = {
  red: {
    rMin: 200, rMax: 255,  // Red channel
    gMin: 0, gMax: 80,     // Green channel
    bMin: 0, bMax: 80,     // Blue channel
    status: StatusColor.BLOCKED,
  },
  green: {
    rMin: 0, rMax: 100,
    gMin: 180, gMax: 255,  // High green = green status
    bMin: 0, bMax: 100,
    status: StatusColor.IN_PROGRESS,
  },
  // ... more colors
};
```

**Why ranges?** Real-world colors vary slightly. A "red" indicator might be `#FF0000`, `#F03434`, or `#DC143C`. Ranges handle this naturally.

### 2. Sample Multiple Pixels

```typescript
customMatcher: async ({ filledROI }) => {
  const width = filledROI.cols;
  const height = filledROI.rows;
  
  // Sample 5 points (center + corners) and average
  // More robust than single pixel!
  const samples = [
    { x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) },  // Center
    { x: Math.floor(width * 0.3), y: Math.floor(height * 0.3) },  // Top-left
    { x: Math.floor(width * 0.7), y: Math.floor(height * 0.3) },  // Top-right
    { x: Math.floor(width * 0.3), y: Math.floor(height * 0.7) },  // Bottom-left
    { x: Math.floor(width * 0.7), y: Math.floor(height * 0.7) },  // Bottom-right
  ];
  
  const colors = samples.map(point => {
    const idx = (point.y * width + point.x) * 4;  // RGBA
    return {
      r: filledROI.data[idx],
      g: filledROI.data[idx + 1],
      b: filledROI.data[idx + 2],
    };
  });
  
  // Average them
  const avgR = Math.round(colors.reduce((sum, c) => sum + c.r, 0) / colors.length);
  const avgG = Math.round(colors.reduce((sum, c) => sum + c.g, 0) / colors.length);
  const avgB = Math.round(colors.reduce((sum, c) => sum + c.b, 0) / colors.length);
  
  // ... detect status from averaged color
}
```

### 3. Match Against Ranges

```typescript
function detectStatusFromColor(r: number, g: number, b: number): StatusColor {
  for (const [colorName, range] of Object.entries(COLOR_RANGES)) {
    if (
      r >= range.rMin && r <= range.rMax &&
      g >= range.gMin && g <= range.gMax &&
      b >= range.bMin && b <= range.bMax
    ) {
      return range.status;
    }
  }
  
  return StatusColor.UNKNOWN;  // No match
}
```

### 4. Return Status + Metadata

```typescript
const status = detectStatusFromColor(avgR, avgG, avgB);
const hex = rgbToHex(avgR, avgG, avgB);

return {
  value: status,  // "blocked", "in-progress", "pending", etc.
  confidence: 0.95,
  isEmpty: false,
  metadata: {
    status,
    hex,  // "#F03434"
    rgb: { r: avgR, g: avgG, b: avgB },
    samples,  // All sampled colors for debugging
  },
};
```

## Real-World Examples

### Example 1: Task Board Status Dots

```typescript
test('verify task moved from blocked to in-progress', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  // Initial state: red (blocked)
  let screenshot = await formTester.captureScreen('before.png');
  let screen = await formTester.compareScreen(screenshot, taskBoardScreen);
  
  let taskStatus = screen.element('Task 1 Status');
  await taskStatus.toHaveValue(StatusColor.BLOCKED);
  
  const beforeColor = taskStatus.getMetadata<string>('hex');
  console.log('Before:', beforeColor);  // "#F03434" (red)
  
  // User moves task
  await page.dragAndDrop('.task-1', '.in-progress-column');
  await page.waitForTimeout(500);  // Animation
  
  // Final state: green (in-progress)
  screenshot = await formTester.captureScreen('after.png');
  screen = await formTester.compareScreen(screenshot, taskBoardScreen);
  
  taskStatus = screen.element('Task 1 Status');
  await taskStatus.toHaveValue(StatusColor.IN_PROGRESS);
  
  const afterColor = taskStatus.getMetadata<string>('hex');
  console.log('After:', afterColor);  // "#2ECC71" (green)
  
  // Verify color actually changed
  expect(beforeColor).not.toBe(afterColor);
});
```

### Example 2: Server Health Dashboard

```typescript
const dashboardScreen = defineTypedScreen({
  name: 'server-dashboard',
  baseDir: __dirname,
  elements: [
    { name: 'Server 1 Status', template: 'status-light.png', customMatcher: statusColorMatcher },
    { name: 'Server 2 Status', template: 'status-light.png', customMatcher: statusColorMatcher },
    { name: 'Database Status', template: 'status-light.png', customMatcher: statusColorMatcher },
    { name: 'API Status', template: 'status-light.png', customMatcher: statusColorMatcher },
  ] as const,
});

test('all servers should be healthy (green)', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  await page.goto('/dashboard');
  
  const screenshot = await formTester.captureScreen('dashboard.png');
  const screen = await formTester.compareScreen(screenshot, dashboardScreen);
  
  // Check all status lights
  for (const element of ['Server 1 Status', 'Server 2 Status', 'Database Status', 'API Status'] as const) {
    const status = screen.element(element);
    await status.toHaveValue(StatusColor.IN_PROGRESS);  // Green = healthy
    
    // Verify it's actually green (not another color)
    const rgb = status.getMetadata<{ r: number; g: number; b: number }>('rgb');
    expect(rgb.g).toBeGreaterThan(180);  // Greenish
    expect(rgb.r).toBeLessThan(100);     // Not reddish
  }
});

test('detect degraded service (yellow)', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  
  // Simulate degraded state
  await page.evaluate(() => {
    // API that changes server status
    fetch('/api/servers/1/degrade', { method: 'POST' });
  });
  
  await page.waitForTimeout(1000);
  
  const screenshot = await formTester.captureScreen('degraded.png');
  const screen = await formTester.compareScreen(screenshot, dashboardScreen);
  
  // Server 1 should now be yellow
  await screen.element('Server 1 Status').toHaveValue(StatusColor.PENDING);  // Yellow
  
  // Others still green
  await screen.element('Server 2 Status').toHaveValue(StatusColor.IN_PROGRESS);
  await screen.element('Database Status').toHaveValue(StatusColor.IN_PROGRESS);
});
```

### Example 3: Build/CI Status

```typescript
const ciScreen = defineTypedScreen({
  name: 'ci-pipeline',
  baseDir: __dirname,
  elements: [
    { name: 'Build Status', template: 'status-badge.png', customMatcher: statusColorMatcher },
    { name: 'Test Status', template: 'status-badge.png', customMatcher: statusColorMatcher },
    { name: 'Deploy Status', template: 'status-badge.png', customMatcher: statusColorMatcher },
  ] as const,
});

test('CI pipeline success flow', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  await page.goto('/ci/build/123');
  
  // Build in progress (yellow)
  let screenshot = await formTester.captureScreen('ci-building.png');
  let screen = await formTester.compareScreen(screenshot, ciScreen);
  await screen.element('Build Status').toHaveValue(StatusColor.PENDING);
  
  // Wait for build to complete
  await page.waitForSelector('.build-complete', { timeout: 120000 });
  
  // Build passed (green)
  screenshot = await formTester.captureScreen('ci-build-passed.png');
  screen = await formTester.compareScreen(screenshot, ciScreen);
  await screen.element('Build Status').toHaveValue(StatusColor.COMPLETE);  // Green
  
  // Tests running (yellow)
  await screen.element('Test Status').toHaveValue(StatusColor.PENDING);
  
  // Wait for tests
  await page.waitForSelector('.tests-complete', { timeout: 60000 });
  
  // All green
  screenshot = await formTester.captureScreen('ci-all-passed.png');
  screen = await formTester.compareScreen(screenshot, ciScreen);
  
  await screen.element('Build Status').toHaveValue(StatusColor.COMPLETE);
  await screen.element('Test Status').toHaveValue(StatusColor.COMPLETE);
  await screen.element('Deploy Status').toHaveValue(StatusColor.COMPLETE);
});

test('detect build failure (red)', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);
  await page.goto('/ci/build/124');  // Failed build
  
  const screenshot = await formTester.captureScreen('ci-failed.png');
  const screen = await formTester.compareScreen(screenshot, ciScreen);
  
  // Build failed (red)
  await screen.element('Build Status').toHaveValue(StatusColor.BLOCKED);
  
  // Tests and deploy skipped (gray)
  await screen.element('Test Status').toHaveValue(StatusColor.UNKNOWN);
  await screen.element('Deploy Status').toHaveValue(StatusColor.UNKNOWN);
});
```

## Advanced: Multi-Color Indicators

Some indicators show **multiple colors at once** (e.g., pie chart, segmented ring):

```typescript
async function multiColorStatusMatcher(context: CustomMatcherContext): Promise<CustomMatcherResult> {
  const { filledROI } = context;
  
  // Count pixels of each color
  const colorCounts: Record<StatusColor, number> = {
    [StatusColor.BLOCKED]: 0,
    [StatusColor.IN_PROGRESS]: 0,
    [StatusColor.PENDING]: 0,
    [StatusColor.COMPLETE]: 0,
    [StatusColor.UNKNOWN]: 0,
  };
  
  let totalPixels = 0;
  
  for (let y = 0; y < filledROI.rows; y++) {
    for (let x = 0; x < filledROI.cols; x++) {
      const idx = (y * filledROI.cols + x) * 4;
      const r = filledROI.data[idx];
      const g = filledROI.data[idx + 1];
      const b = filledROI.data[idx + 2];
      
      // Skip background (white/black)
      const brightness = (r + g + b) / 3;
      if (brightness < 50 || brightness > 240) continue;
      
      const status = detectStatusFromColor(r, g, b);
      colorCounts[status]++;
      totalPixels++;
    }
  }
  
  // Calculate percentages
  const percentages: Record<string, number> = {};
  for (const [status, count] of Object.entries(colorCounts)) {
    percentages[status] = Math.round((count / totalPixels) * 100);
  }
  
  // Primary color (most common)
  const primaryStatus = Object.entries(colorCounts).reduce((max, [status, count]) =>
    count > max.count ? { status: status as StatusColor, count } : max,
    { status: StatusColor.UNKNOWN, count: 0 }
  ).status;
  
  return {
    value: primaryStatus,
    confidence: 0.9,
    isEmpty: false,
    metadata: {
      primaryStatus,
      colorCounts,     // { blocked: 15, in-progress: 130, ... }
      percentages,     // { blocked: 10%, in-progress: 87%, ... }
      totalPixels,
    },
  };
}

// Usage:
const indicator = screen.element('Overall Status');
await indicator.toHaveValue(StatusColor.IN_PROGRESS);  // Primary color

const percentages = indicator.getMetadata<Record<string, number>>('percentages');
expect(percentages[StatusColor.IN_PROGRESS]).toBeGreaterThan(80);  // 80%+ green
expect(percentages[StatusColor.BLOCKED]).toBeLessThan(10);          // <10% red
```

## Handling Color Variations

### Problem: Exact Colors Never Match

Real-world colors vary:
- Different monitors/displays
- Compression artifacts
- Anti-aliasing
- Shadows/gradients

❌ **Bad:** Exact color matching
```typescript
if (r === 255 && g === 0 && b === 0) {
  return StatusColor.BLOCKED;  // Only matches pure #FF0000
}
```

✅ **Good:** Range-based matching
```typescript
if (r >= 200 && r <= 255 && g <= 80 && b <= 80) {
  return StatusColor.BLOCKED;  // Matches any reddish color
}
```

### Define Generous Ranges

```typescript
const COLOR_RANGES = {
  red: {
    rMin: 180, rMax: 255,  // Accept anything reddish
    gMin: 0, gMax: 100,    // Low green
    bMin: 0, bMax: 100,    // Low blue
    status: StatusColor.BLOCKED,
  },
};
```

### Sample Multiple Pixels

Single pixel can be affected by anti-aliasing or artifacts. Sample 5-9 pixels and average:

```typescript
const samplePoints = [
  { x: width * 0.5, y: height * 0.5 },   // Center
  { x: width * 0.25, y: height * 0.25 }, // Corners
  { x: width * 0.75, y: height * 0.25 },
  { x: width * 0.25, y: height * 0.75 },
  { x: width * 0.75, y: height * 0.75 },
];
```

## Debugging Color Matchers

```typescript
customMatcher: async (context) => {
  const { filledROI, config } = context;
  
  // Debug mode
  if (process.env.DEBUG_COLORS) {
    // Sample and log all colors
    console.log(`\n=== ${config.name} Color Analysis ===`);
    
    for (let y = 0; y < filledROI.rows; y += 5) {  // Sample every 5 pixels
      for (let x = 0; x < filledROI.cols; x += 5) {
        const idx = (y * filledROI.cols + x) * 4;
        const r = filledROI.data[idx];
        const g = filledROI.data[idx + 1];
        const b = filledROI.data[idx + 2];
        
        console.log(`  Pixel (${x},${y}): RGB(${r}, ${g}, ${b}) = ${rgbToHex(r, g, b)}`);
      }
    }
    
    // Save ROI for visual inspection
    const fs = require('fs/promises');
    const buffer = context.utils.matToBuffer(filledROI);
    await fs.writeFile(`/tmp/color-debug-${config.name}.png`, buffer);
    console.log(`  Saved to: /tmp/color-debug-${config.name}.png`);
  }
  
  // ... your detection logic ...
};
```

Run with: `DEBUG_COLORS=1 npm test`

## Best Practices

### ✅ Do:

```typescript
// Use ranges, not exact colors
if (r >= 200 && r <= 255) { ... }

// Sample multiple pixels and average
const samples = [/* multiple points */];
const avgColor = average(samples);

// Return meaningful metadata
metadata: {
  status: StatusColor.BLOCKED,
  hex: '#F03434',
  rgb: { r: 240, g: 52, b: 52 },
  samples: [...],  // For debugging
}

// Handle unknown colors gracefully
return StatusColor.UNKNOWN;  // Not an error
```

### ❌ Don't:

```typescript
// Don't use exact color matching
if (r === 255 && g === 0 && b === 0) { ... }  // Too strict!

// Don't sample single pixel
const centerPixel = filledROI.data[centerIdx];  // Can be artifact!

// Don't throw errors for unexpected colors
if (!isKnownColor(r, g, b)) {
  throw new Error('Unknown color');  // ❌ Return UNKNOWN instead
}

// Don't forget to test with real screenshots
// Colors look different on screen vs in code!
```

## Summary

Status indicator color detection is **perfect** for:
- ✅ Task boards (Jira, Trello, custom)
- ✅ Dashboards (server health, CI/CD)
- ✅ Traffic lights (red/yellow/green indicators)
- ✅ Build status badges
- ✅ Connection status
- ✅ Any color-coded UI element

The custom matcher approach is **far better** than:
- ❌ Using multiple static templates per color
- ❌ Asking GPT Vision "what color is this?"
- ❌ Hardcoding pixel coordinates to check

You get **exact RGB values**, **fuzzy matching**, and **rich metadata** - all in < 50ms! 🚀
