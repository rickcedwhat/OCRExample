export interface Point {
    x: number;
    y: number;
}
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface MatchResult {
    location: Point;
    confidence: number;
    rect: Rect;
}
/**
 * Computer vision utilities for image processing, template matching, and alignment
 */
export declare class VisionUtil {
    /**
     * Load an image from a buffer into an OpenCV Mat
     */
    loadImage(buffer: Buffer): any;
    /**
     * Convert a colored image to grayscale
     */
    toGrayscale(image: any): any;
    /**
     * Perform template matching to find a template image within a larger image
     * Returns the best match location and confidence
     */
    matchTemplate(source: any, template: any, method?: number): MatchResult;
    /**
     * Extract a region of interest (ROI) from an image
     */
    extractROI(image: any, rect: Rect): any;
    /**
     * Compare two images and count the number of different pixels
     * Returns the count and whether they're considered different
     */
    compareRegions(image1: any, image2: any, threshold?: number, minDiffPixels?: number): {
        different: boolean;
        diffPixelCount: number;
        diffPercentage: number;
    };
    /**
     * Create a difference image highlighting where two images differ
     */
    createDiffImage(image1: any, image2: any, threshold?: number): any;
    /**
     * Align two images using feature detection and homography
     * This corrects for rotation, skew, and perspective differences
     */
    alignImages(filledForm: any, blankForm: any): any;
    /**
     * Convert a cv.Mat to a PNG buffer
     */
    matToBuffer(mat: any): Buffer;
    /**
     * Use pixelmatch for fast pixel-level comparison
     * Returns the number of mismatched pixels
     */
    pixelMatch(img1: Buffer, img2: Buffer, options?: {
        threshold?: number;
        includeAA?: boolean;
    }): {
        mismatchedPixels: number;
        diffBuffer: Buffer | null;
    };
}
//# sourceMappingURL=vision.d.ts.map