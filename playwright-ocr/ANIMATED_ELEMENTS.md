# Handling Animated Elements

## The Problem

Animated elements (loading spinners, progress bars, blinking indicators) **constantly change pixels**, which breaks exact template matching:

```
Frame 1: spinner at 0°   ⟲
Frame 2: spinner at 45°  ⟳
Frame 3: spinner at 90°  ⟲
Frame 4: spinner at 135° ⟳
```

A static template won't match a moving animation!

## Solutions

### 1. Mark Elements as Animated (Recommended)

```typescript
export const myScreen = defineTypedScreen({
  name: 'my-screen',
  baseDir: __dirname,
  elements: [
    {
      name: 'Loading Spinner',
      template: 'spinner.png',
      type: ElementType.ICON,
      animated: true,  // Tell the library this moves!
    },
  ] as const,
});
```

**What happens:**
- Uses **looser matching threshold** (0.5 instead of 0.7)
- Checks if **region changed** from blank (not exact pixels)
- Considers it "found" if **something is present** in that area

### 2. Use Region Detection

For animated elements, check if **anything** is in that region (not exact match):

```typescript
// Check if spinner region is different from blank
await screen.element('Loading Spinner').toBeFilled();

// Check with lower confidence threshold
const spinner = screen.element('Loading Spinner');
expect(spinner.confidence()).toBeGreaterThan(0.5);  // Lower threshold OK
```

### 3. Multiple Template Frames

Capture multiple frames of the animation:

```typescript
{
  name: 'Loading Spinner',
  variants: {
    frame1: { template: 'spinner-0deg.png' },
    frame2: { template: 'spinner-45deg.png' },
    frame3: { template: 'spinner-90deg.png' },
    frame4: { template: 'spinner-135deg.png' },
  },
  type: ElementType.ICON,
}

// Library tries all variants, returns whichever matches best
await screen.element('Loading Spinner').toBeVisible();
```

### 4. Presence Detection Only

Don't try to match exact pixels - just check if region changed:

```typescript
// Before action - no spinner
let screenshot = await formTester.captureScreen('before.png');
let screen = await formTester.compareScreen(screenshot, myScreen);
await screen.element('Loading Spinner').toBeEmpty();

// After action - spinner appeared
await page.click('submit');
screenshot = await formTester.captureScreen('after.png');
screen = await formTester.compareScreen(screenshot, myScreen);
await screen.element('Loading Spinner').toBeFilled();  // Something is there!
```

## Real-World Example

```typescript
test('form submission with loading spinner', async ({ page }) => {
  const formTester = new PlaywrightFormTester(page);

  // === Before Submit ===
  let screenshot = await formTester.captureScreen('before-submit.png');
  let screen = await formTester.compareScreen(screenshot, checkoutScreen);
  
  await screen.element('Pay Button').toHaveVariant('enabled');
  await screen.element('Loading Spinner').toBeEmpty();  // Not present yet

  // === Click Submit ===
  await screen.element('Pay Button').click();

  // === During Loading ===
  await page.waitForTimeout(100);  // Let animation start
  screenshot = await formTester.captureScreen('loading.png');
  screen = await formTester.compareScreen(screenshot, checkoutScreen);
  
  // Spinner is now present (don't care about exact pixels)
  await screen.element('Loading Spinner').toBeFilled();
  await screen.element('Loading Spinner').toBeVisible();
  
  // Button might show loading state
  await screen.element('Pay Button').toHaveVariant('loading');

  // === After Success ===
  await formTester.waitForStableScreen();
  screenshot = await formTester.captureScreen('success.png');
  screen = await formTester.compareScreen(screenshot, checkoutScreen);
  
  // Spinner gone
  await screen.element('Loading Spinner').toBeEmpty();
  
  // Success indicator present
  await screen.element('Success Icon').toHaveVariant('success');
});
```

## When Each Approach Works

| Element Type | Recommended Approach | Why |
|--------------|---------------------|-----|
| **Loading spinner (circular)** | animated: true + presence check | Constantly rotating |
| **Progress bar** | Multiple templates (0%, 25%, 50%, etc.) | Predictable states |
| **Blinking indicator** | Variants (on/off states) | Two clear states |
| **Pulsing button** | animated: true + lower threshold | Size changes smoothly |
| **Typing animation** | Skip OCR, check region changed | Text constantly changes |
| **Skeleton loader** | animated: true | Shimmer effect |

## What Gets Checked

### For Static Elements (animated: false or undefined):
1. **Exact template match** with high threshold (0.7)
2. **OCR text extraction** for filled fields
3. **Pixel-perfect comparison** for checkboxes

### For Animated Elements (animated: true):
1. **Loose template match** with low threshold (0.5)
2. **Region difference check** (is it different from blank?)
3. **No OCR** (text is probably moving/changing)
4. **Presence = success** (something is there)

## Limitations

### ✅ Works Well:
- Detecting spinner presence/absence
- Checking if progress bar region changed
- Verifying loading state started/ended
- Binary checks (is something there?)

### ❌ Limitations:
- Can't read exact progress percentage from animated bar
- Can't extract text from typing animation
- Can't tell which frame of animation is showing
- Multiple animated elements might confuse each other

### Workarounds:
- Use **variants for discrete states** (0%, 50%, 100% progress)
- Use **button variants** instead of animating button itself
- Use **static success/error icons** after animation completes
- **Wait for animation to stop** before extracting data

## Best Practices

### ✅ Do:
```typescript
// Mark known animated elements
{ name: 'Loading Spinner', template: '...', animated: true }

// Check presence, not exact pixels
await screen.element('Loading Spinner').toBeFilled();
await screen.element('Loading Spinner').toBeEmpty();

// Use lower confidence thresholds
const confidence = screen.element('Spinner').confidence();
expect(confidence).toBeGreaterThan(0.5);  // Not 0.9!

// Wait for animation to complete
await formTester.waitForStableScreen();
```

### ❌ Don't:
```typescript
// Don't try to match exact animated pixels
// This will fail because animation changes constantly

// Don't extract text from animated elements
// await screen.element('Typing Animation').toHaveText('...');  ❌

// Don't expect high confidence
// expect(spinner.confidence()).toBeGreaterThan(0.9);  ❌

// Don't check variants on truly animated elements
// await screen.element('Spinner').toHaveVariant('rotating');  ❌
// (Use presence check instead)
```

## Future Enhancements

Coming soon:
- **Automatic animation detection** - Library detects if region is changing rapidly
- **Frame averaging** - Match against multiple animation frames
- **Motion detection** - Verify element is actually animating
- **Animation completion detection** - Know when animation finishes

For now, mark elements as `animated: true` and use presence checks! 🎯
