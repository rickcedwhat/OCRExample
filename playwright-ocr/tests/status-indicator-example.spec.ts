import { test, expect } from '@playwright/test';
import { defineTypedScreen, ElementType } from '../src/playwright-helper.js';
import type { CustomMatcherContext, CustomMatcherResult } from '../src/types.js';
import { cleanupOCR } from '../src/utils/ocr.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Status color definitions
 */
enum StatusColor {
  BLOCKED = 'blocked',      // Red
  IN_PROGRESS = 'in-progress',  // Green
  PENDING = 'pending',      // Yellow
  COMPLETE = 'complete',    // Blue
  UNKNOWN = 'unknown',      // Gray or unrecognized
}

/**
 * Color ranges for fuzzy matching
 * Real-world colors vary slightly, so we use ranges instead of exact values
 */
const COLOR_RANGES = {
  red: {
    rMin: 200, rMax: 255,
    gMin: 0, gMax: 80,
    bMin: 0, bMax: 80,
    status: StatusColor.BLOCKED,
  },
  green: {
    rMin: 0, rMax: 100,
    gMin: 180, gMax: 255,
    bMin: 0, bMax: 100,
    status: StatusColor.IN_PROGRESS,
  },
  yellow: {
    rMin: 200, rMax: 255,
    gMin: 180, gMax: 255,
    bMin: 0, bMax: 80,
    status: StatusColor.PENDING,
  },
  blue: {
    rMin: 0, rMax: 100,
    gMin: 100, gMax: 200,
    bMin: 200, bMax: 255,
    status: StatusColor.COMPLETE,
  },
  gray: {
    rMin: 150, rMax: 200,
    gMin: 150, gMax: 200,
    bMin: 150, bMax: 200,
    status: StatusColor.UNKNOWN,
  },
};

/**
 * Detect status from RGB color
 */
function detectStatusFromColor(r: number, g: number, b: number): StatusColor {
  // Check each color range
  for (const [colorName, range] of Object.entries(COLOR_RANGES)) {
    if (
      r >= range.rMin && r <= range.rMax &&
      g >= range.gMin && g <= range.gMax &&
      b >= range.bMin && b <= range.bMax
    ) {
      return range.status;
    }
  }
  
  return StatusColor.UNKNOWN;
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

/**
 * Custom matcher for status indicator color
 */
async function statusColorMatcher(context: CustomMatcherContext): Promise<CustomMatcherResult> {
  const { filledROI } = context;
  
  const width = filledROI.cols;
  const height = filledROI.rows;
  
  // Sample multiple pixels and average (more robust than single pixel)
  const samples: { r: number; g: number; b: number }[] = [];
  const samplePoints = [
    { x: Math.floor(width * 0.5), y: Math.floor(height * 0.5) },  // Center
    { x: Math.floor(width * 0.3), y: Math.floor(height * 0.3) },  // Top-left of center
    { x: Math.floor(width * 0.7), y: Math.floor(height * 0.3) },  // Top-right of center
    { x: Math.floor(width * 0.3), y: Math.floor(height * 0.7) },  // Bottom-left of center
    { x: Math.floor(width * 0.7), y: Math.floor(height * 0.7) },  // Bottom-right of center
  ];
  
  for (const point of samplePoints) {
    const idx = (point.y * width + point.x) * 4;  // RGBA
    samples.push({
      r: filledROI.data[idx],
      g: filledROI.data[idx + 1],
      b: filledROI.data[idx + 2],
    });
  }
  
  // Average the samples
  const avgR = Math.round(samples.reduce((sum, s) => sum + s.r, 0) / samples.length);
  const avgG = Math.round(samples.reduce((sum, s) => sum + s.g, 0) / samples.length);
  const avgB = Math.round(samples.reduce((sum, s) => sum + s.b, 0) / samples.length);
  
  const hex = rgbToHex(avgR, avgG, avgB);
  const status = detectStatusFromColor(avgR, avgG, avgB);
  
  return {
    value: status,  // "blocked", "in-progress", "pending", "complete", "unknown"
    confidence: 0.95,
    isEmpty: false,  // Status indicators are never "empty"
    metadata: {
      status,
      hex,
      rgb: { r: avgR, g: avgG, b: avgB },
      samples,  // All sampled colors for debugging
    },
  };
}

/**
 * Example screen with status indicators
 */
const taskBoardScreen = defineTypedScreen({
  name: 'task-board',
  baseDir: path.join(__dirname, 'screens', 'task-board'),
  elements: [
    {
      name: 'Task 1 Status',
      template: 'status-indicator.png',  // Template is the circle/dot outline
      type: ElementType.ICON,
      customMatcher: statusColorMatcher,
    },
    {
      name: 'Task 2 Status',
      template: 'status-indicator.png',
      type: ElementType.ICON,
      customMatcher: statusColorMatcher,
    },
    {
      name: 'Task 3 Status',
      template: 'status-indicator.png',
      type: ElementType.ICON,
      customMatcher: statusColorMatcher,
    },
  ] as const,
});

test.describe('Status Indicator Color Detection', () => {
  test.afterAll(async () => {
    await cleanupOCR();
  });

  test('detect blocked status (red)', async ({ page }) => {
    // Mock: Task with red status indicator
    // const formTester = new PlaywrightFormTester(page);
    // const screenshot = await formTester.captureScreen('task-blocked.png');
    // const screen = await formTester.compareScreen(screenshot, taskBoardScreen);
    
    // const status = screen.element('Task 1 Status');
    // await status.toHaveValue(StatusColor.BLOCKED);
    
    // Check metadata
    // const rgb = status.getMetadata<{ r: number; g: number; b: number }>('rgb');
    // expect(rgb.r).toBeGreaterThan(200);  // Reddish
    // expect(rgb.g).toBeLessThan(80);
    // expect(rgb.b).toBeLessThan(80);
    
    // const hex = status.getMetadata<string>('hex');
    // console.log('Status color:', hex);  // e.g., "#F03434"
  });

  test('detect in-progress status (green)', async ({ page }) => {
    // Mock: Task with green status indicator
    // const formTester = new PlaywrightFormTester(page);
    // const screenshot = await formTester.captureScreen('task-in-progress.png');
    // const screen = await formTester.compareScreen(screenshot, taskBoardScreen);
    
    // const status = screen.element('Task 2 Status');
    // await status.toHaveValue(StatusColor.IN_PROGRESS);
    
    // const rgb = status.getMetadata<{ r: number; g: number; b: number }>('rgb');
    // expect(rgb.g).toBeGreaterThan(180);  // Greenish
  });

  test('detect pending status (yellow)', async ({ page }) => {
    // const status = screen.element('Task 3 Status');
    // await status.toHaveValue(StatusColor.PENDING);
  });

  test('workflow: move task from blocked to in-progress', async ({ page }) => {
    // Real-world example: Verify status changes
    // const formTester = new PlaywrightFormTester(page);
    
    // Initial state: blocked (red)
    // let screenshot = await formTester.captureScreen('before-move.png');
    // let screen = await formTester.compareScreen(screenshot, taskBoardScreen);
    // await screen.element('Task 1 Status').toHaveValue(StatusColor.BLOCKED);
    
    // User action: move task to in-progress column
    // await screen.element('Task 1').click();
    // await page.click('[data-status="in-progress"]');
    
    // Wait for animation
    // await page.waitForTimeout(500);
    
    // Final state: in-progress (green)
    // screenshot = await formTester.captureScreen('after-move.png');
    // screen = await formTester.compareScreen(screenshot, taskBoardScreen);
    // await screen.element('Task 1 Status').toHaveValue(StatusColor.IN_PROGRESS);
    
    // Verify color changed
    // const rgb = screen.element('Task 1 Status').getMetadata<{ r: number; g: number; b: number }>('rgb');
    // expect(rgb.g).toBeGreaterThan(180);  // Now green!
  });

  test('verify all tasks on board have valid statuses', async ({ page }) => {
    // Check that no status is "unknown" (all are valid colors)
    // const formTester = new PlaywrightFormTester(page);
    // const screenshot = await formTester.captureScreen('task-board.png');
    // const screen = await formTester.compareScreen(screenshot, taskBoardScreen);
    
    // for (const taskName of ['Task 1 Status', 'Task 2 Status', 'Task 3 Status'] as const) {
    //   const status = screen.element(taskName);
    //   const statusValue = status.value();
    //   
    //   // Should not be unknown
    //   expect(statusValue).not.toBe(StatusColor.UNKNOWN);
    //   
    //   // Should be one of the valid statuses
    //   expect([
    //     StatusColor.BLOCKED,
    //     StatusColor.IN_PROGRESS,
    //     StatusColor.PENDING,
    //     StatusColor.COMPLETE,
    //   ]).toContain(statusValue);
    // }
  });
});

/**
 * Advanced: Multi-color status indicator
 * 
 * For indicators that show multiple states at once (e.g., ring with multiple colors)
 */
async function multiColorStatusMatcher(context: CustomMatcherContext): Promise<CustomMatcherResult> {
  const { filledROI } = context;
  
  const width = filledROI.cols;
  const height = filledROI.rows;
  
  // Count pixels of each status color
  const colorCounts: Record<StatusColor, number> = {
    [StatusColor.BLOCKED]: 0,
    [StatusColor.IN_PROGRESS]: 0,
    [StatusColor.PENDING]: 0,
    [StatusColor.COMPLETE]: 0,
    [StatusColor.UNKNOWN]: 0,
  };
  
  let totalPixels = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = filledROI.data[idx];
      const g = filledROI.data[idx + 1];
      const b = filledROI.data[idx + 2];
      
      // Skip nearly white/black pixels (background)
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
  
  // Primary status is the most common color
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
      colorCounts,
      percentages,
      totalPixels,
    },
  };
}

/**
 * Export helpers for reuse
 */
export { statusColorMatcher, multiColorStatusMatcher, detectStatusFromColor, rgbToHex, StatusColor };
