// @ts-ignore - opencv.js doesn't have complete type definitions
import cv from 'opencv.js';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

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
export class VisionUtil {
  /**
   * Load an image from a buffer into an OpenCV Mat
   */
  loadImage(buffer: Buffer): any {
    const png = PNG.sync.read(buffer);
    const mat = new cv.Mat(png.height, png.width, cv.CV_8UC4);
    mat.data.set(png.data);
    return mat;
  }

  /**
   * Convert a colored image to grayscale
   */
  toGrayscale(image: any): any {
    const gray = new cv.Mat();
    cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY);
    return gray;
  }

  /**
   * Perform template matching to find a template image within a larger image
   * Returns the best match location and confidence
   */
  matchTemplate(
    source: any,
    template: any,
    method: number = cv.TM_CCOEFF_NORMED
  ): MatchResult {
    const result = new cv.Mat();
    const mask = new cv.Mat();
    
    cv.matchTemplate(source, template, result, method, mask);
    
    const minMax = cv.minMaxLoc(result);
    const matchLoc = minMax.maxLoc;
    
    result.delete();
    mask.delete();
    
    return {
      location: { x: matchLoc.x, y: matchLoc.y },
      confidence: minMax.maxVal,
      rect: {
        x: matchLoc.x,
        y: matchLoc.y,
        width: template.cols,
        height: template.rows,
      },
    };
  }

  /**
   * Extract a region of interest (ROI) from an image
   */
  extractROI(image: any, rect: Rect): any {
    const roi = new cv.Rect(rect.x, rect.y, rect.width, rect.height);
    return image.roi(roi);
  }

  /**
   * Compare two images and count the number of different pixels
   * Returns the count and whether they're considered different
   */
  compareRegions(
    image1: any,
    image2: any,
    threshold = 80,
    minDiffPixels = 10
  ): { different: boolean; diffPixelCount: number; diffPercentage: number } {
    if (image1.rows !== image2.rows || image1.cols !== image2.cols) {
      return {
        different: true,
        diffPixelCount: -1,
        diffPercentage: 100,
      };
    }

    const diff = new cv.Mat();
    cv.absdiff(image1, image2, diff);
    
    cv.threshold(diff, diff, threshold, 255, cv.THRESH_BINARY);
    
    const diffPixelCount = cv.countNonZero(diff);
    const totalPixels = image1.rows * image1.cols;
    const diffPercentage = (diffPixelCount / totalPixels) * 100;
    
    diff.delete();
    
    return {
      different: diffPixelCount > minDiffPixels,
      diffPixelCount,
      diffPercentage,
    };
  }

  /**
   * Create a difference image highlighting where two images differ
   */
  createDiffImage(image1: any, image2: any, threshold = 80): any {
    const diff = new cv.Mat();
    cv.absdiff(image1, image2, diff);
    cv.threshold(diff, diff, threshold, 255, cv.THRESH_BINARY);
    return diff;
  }

  /**
   * Align two images using feature detection and homography
   * This corrects for rotation, skew, and perspective differences
   */
  alignImages(filledForm: any, blankForm: any): any {
    // Detect SIFT features
    const sift = new cv.SIFT();
    
    const filledKeypoints = new cv.KeyPointVector();
    const filledDescriptors = new cv.Mat();
    sift.detectAndCompute(filledForm, new cv.Mat(), filledKeypoints, filledDescriptors);
    
    const blankKeypoints = new cv.KeyPointVector();
    const blankDescriptors = new cv.Mat();
    sift.detectAndCompute(blankForm, new cv.Mat(), blankKeypoints, blankDescriptors);
    
    // Match features using FLANN-based matcher
    const matcher = new cv.BFMatcher(cv.NORM_L2, false);
    const matches = new cv.DMatchVectorVector();
    matcher.knnMatch(filledDescriptors, blankDescriptors, matches, 2);
    
    // Filter matches using Lowe's ratio test
    const goodMatches: any[] = [];
    const ratioThresh = 0.7;
    
    for (let i = 0; i < matches.size(); i++) {
      const match = matches.get(i);
      if (match.size() >= 2) {
        const m1 = match.get(0);
        const m2 = match.get(1);
        if (m1.distance < ratioThresh * m2.distance) {
          goodMatches.push(m1);
        }
      }
    }
    
    // Extract point correspondences
    const filledPoints: number[] = [];
    const blankPoints: number[] = [];
    
    for (const match of goodMatches) {
      const filledPt = filledKeypoints.get(match.queryIdx).pt;
      const blankPt = blankKeypoints.get(match.trainIdx).pt;
      filledPoints.push(filledPt.x, filledPt.y);
      blankPoints.push(blankPt.x, blankPt.y);
    }
    
    // Find homography
    const filledMat = cv.matFromArray(
      goodMatches.length,
      1,
      cv.CV_32FC2,
      filledPoints
    );
    const blankMat = cv.matFromArray(
      goodMatches.length,
      1,
      cv.CV_32FC2,
      blankPoints
    );
    
    const homography = cv.findHomography(filledMat, blankMat, cv.RANSAC, 5.0);
    
    // Warp the filled form to align with blank
    const aligned = new cv.Mat();
    cv.warpPerspective(
      filledForm,
      aligned,
      homography,
      new cv.Size(blankForm.cols, blankForm.rows)
    );
    
    // Clean up
    filledKeypoints.delete();
    filledDescriptors.delete();
    blankKeypoints.delete();
    blankDescriptors.delete();
    matches.delete();
    filledMat.delete();
    blankMat.delete();
    homography.delete();
    
    return aligned;
  }

  /**
   * Convert a cv.Mat to a PNG buffer
   */
  matToBuffer(mat: any): Buffer {
    const png = new PNG({
      width: mat.cols,
      height: mat.rows,
    });
    
    png.data = Buffer.from(mat.data);
    
    return PNG.sync.write(png);
  }

  /**
   * Use pixelmatch for fast pixel-level comparison
   * Returns the number of mismatched pixels
   */
  pixelMatch(
    img1: Buffer,
    img2: Buffer,
    options: {
      threshold?: number;
      includeAA?: boolean;
    } = {}
  ): { mismatchedPixels: number; diffBuffer: Buffer | null } {
    const png1 = PNG.sync.read(img1);
    const png2 = PNG.sync.read(img2);
    
    if (png1.width !== png2.width || png1.height !== png2.height) {
      throw new Error('Images must have the same dimensions');
    }
    
    const diff = new PNG({ width: png1.width, height: png1.height });
    
    const mismatchedPixels = pixelmatch(
      png1.data,
      png2.data,
      diff.data,
      png1.width,
      png1.height,
      {
        threshold: options.threshold ?? 0.1,
        includeAA: options.includeAA ?? false,
      }
    );
    
    return {
      mismatchedPixels,
      diffBuffer: PNG.sync.write(diff),
    };
  }
}
