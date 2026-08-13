import { test, expect } from '@playwright/test';
import { defineTypedScreen, ElementType } from '../src/playwright-helper.js';
import type { CustomMatcherContext, CustomMatcherResult } from '../src/types.js';
import { cleanupOCR } from '../src/utils/ocr.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Example: Progress bar with custom matcher
 * 
 * Demonstrates extracting exact percentage from a progress bar
 * instead of using discrete variants (0%, 25%, 50%, 75%, 100%)
 */

const downloadScreen = defineTypedScreen({
  name: 'download',
  baseDir: path.join(__dirname, 'screens', 'download'),
  elements: [
    {
      name: 'Download Progress',
      // Template is the outline/container of the progress bar
      template: 'progress-outline.png',
      type: ElementType.ICON,
      
      // Custom matcher analyzes the filled portion
      customMatcher: async (context: CustomMatcherContext): Promise<CustomMatcherResult> => {
        const { filledROI, blankROI, utils } = context;
        
        // Get dimensions
        const width = filledROI.cols;
        const height = filledROI.rows;
        
        // Create difference image to see what changed from blank
        const diffImage = utils.createDiffImage(filledROI, blankROI, 50);
        const diffData = diffImage.data;
        
        // Find rightmost filled pixel (progress fills left-to-right)
        let maxFilledX = 0;
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            
            // If pixel is different from blank (filled), track it
            if (diffData[idx] > 0) {
              maxFilledX = Math.max(maxFilledX, x);
            }
          }
        }
        
        // Calculate percentage based on how far filled
        const percentage = Math.round((maxFilledX / width) * 100);
        
        // Clean up
        diffImage.delete();
        
        return {
          value: `${percentage}%`,
          confidence: 0.95,
          isEmpty: percentage === 0,
          metadata: {
            percentage,
            filledPixels: maxFilledX,
            totalWidth: width,
            dimensions: { width, height },
          },
        };
      },
    },
    {
      name: 'Star Rating',
      template: 'stars-outline.png',
      type: ElementType.ICON,
      
      // Custom matcher counts filled stars
      customMatcher: async (context: CustomMatcherContext): Promise<CustomMatcherResult> => {
        const { filledROI, blankROI } = context;
        
        const width = filledROI.cols;
        const height = filledROI.rows;
        
        // Divide into 5 star regions
        const starWidth = width / 5;
        let filledStars = 0;
        
        for (let i = 0; i < 5; i++) {
          const startX = Math.floor(i * starWidth);
          const endX = Math.floor((i + 1) * starWidth);
          
          // Count colored pixels in this star region
          let coloredPixels = 0;
          let totalPixels = 0;
          
          for (let y = 0; y < height; y++) {
            for (let x = startX; x < endX; x++) {
              totalPixels++;
              
              const idx = (y * width + x) * 4;  // RGBA
              const r = filledROI.data[idx];
              const g = filledROI.data[idx + 1];
              const b = filledROI.data[idx + 2];
              
              // Check if pixel is "star color" (yellowish)
              const isStarColor = r > 200 && g > 150 && b < 100;
              if (isStarColor) {
                coloredPixels++;
              }
            }
          }
          
          // If more than 50% colored, count as filled star
          if (coloredPixels / totalPixels > 0.5) {
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
      },
    },
  ] as const,
});

test.describe('Custom Matcher Examples', () => {
  test.afterAll(async () => {
    await cleanupOCR();
  });

  test('progress bar - extract exact percentage', async ({ page }) => {
    // This is a conceptual example showing the API
    // In real usage, you'd capture actual screenshots
    
    // Mock: Progress bar at 47%
    const screenshot = './test-screenshots/download-47pct.png';
    
    // Extract with custom matcher
    // const formTester = new PlaywrightFormTester(page);
    // const screen = await formTester.compareScreen(screenshot, downloadScreen);
    
    // Get exact percentage from metadata
    // const progress = screen.element('Download Progress');
    // await progress.toHaveValue('47%');
    
    // Access custom metadata
    // const pct = progress.getMetadata<number>('percentage');
    // expect(pct).toBe(47);
    
    // const dims = progress.getMetadata<{ width: number; height: number }>('dimensions');
    // expect(dims.width).toBeGreaterThan(0);
    
    // Full metadata object
    // const meta = progress.metadata();
    // expect(meta).toEqual({
    //   percentage: 47,
    //   filledPixels: 141,  // 47% of 300px width
    //   totalWidth: 300,
    //   dimensions: { width: 300, height: 20 },
    // });
  });

  test('star rating - count filled stars', async ({ page }) => {
    // Mock: 3 out of 5 stars filled
    const screenshot = './test-screenshots/rating-3stars.png';
    
    // const formTester = new PlaywrightFormTester(page);
    // const screen = await formTester.compareScreen(screenshot, downloadScreen);
    
    // const rating = screen.element('Star Rating');
    // await rating.toHaveValue('3/5');
    
    // Access metadata
    // const stars = rating.getMetadata<number>('stars');
    // expect(stars).toBe(3);
    
    // const ratingValue = rating.getMetadata<number>('rating');
    // expect(ratingValue).toBe(0.6);  // 3/5 = 0.6
  });

  test('progress bar - track over time', async ({ page }) => {
    // Demonstrate tracking continuous changes
    
    // Start download
    // await page.click('#start-download');
    
    // Track progress over time
    const percentages: number[] = [];
    
    // for (let i = 0; i < 5; i++) {
    //   await page.waitForTimeout(500);
    //   
    //   const screenshot = await formTester.captureScreen(`download-${i}.png`);
    //   const screen = await formTester.compareScreen(screenshot, downloadScreen);
    //   
    //   const progress = screen.element('Download Progress');
    //   const pct = progress.getMetadata<number>('percentage');
    //   percentages.push(pct!);
    //   
    //   console.log(`Progress: ${pct}%`);
    // }
    
    // Verify progress increased over time
    // for (let i = 1; i < percentages.length; i++) {
    //   expect(percentages[i]).toBeGreaterThanOrEqual(percentages[i - 1]);
    // }
    
    // Final progress should be 100%
    // expect(percentages[percentages.length - 1]).toBe(100);
  });
});

/**
 * Real-world use cases for custom matchers:
 * 
 * 1. Progress Bars
 *    - Extract exact percentage (0-100%)
 *    - Track upload/download progress
 *    - Monitor loading indicators
 * 
 * 2. Sliders
 *    - Detect slider knob position
 *    - Volume controls
 *    - Brightness/contrast adjustments
 * 
 * 3. Ratings
 *    - Count filled stars (3.5/5)
 *    - Thumbs up/down ratios
 *    - Like/dislike meters
 * 
 * 4. Gauges
 *    - Speedometers
 *    - Thermometers
 *    - Battery indicators
 *    - Signal strength bars
 * 
 * 5. Color Analysis
 *    - Color picker selections
 *    - Status indicator colors
 *    - Highlighting/marking states
 * 
 * 6. Charts/Graphs
 *    - Extract data points
 *    - Analyze trends
 *    - Compare bar heights
 * 
 * 7. Custom Animations
 *    - Measure animation progress
 *    - Detect animation states
 *    - Track transitions
 */
