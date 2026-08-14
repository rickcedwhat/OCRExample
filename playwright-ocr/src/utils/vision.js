// @ts-ignore - opencv.js doesn't have complete type definitions
import cv from 'opencv.js';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
/**
 * Computer vision utilities for image processing, template matching, and alignment
 */
export class VisionUtil {
    /**
     * Load an image from a buffer into an OpenCV Mat
     */
    loadImage(buffer) {
        const png = PNG.sync.read(buffer);
        const mat = new cv.Mat(png.height, png.width, cv.CV_8UC4);
        mat.data.set(png.data);
        return mat;
    }
    /**
     * Convert a colored image to grayscale
     */
    toGrayscale(image) {
        const gray = new cv.Mat();
        cv.cvtColor(image, gray, cv.COLOR_RGBA2GRAY);
        return gray;
    }
    /**
     * Perform template matching to find a template image within a larger image
     * Returns the best match location and confidence
     */
    matchTemplate(source, template, method = cv.TM_CCOEFF_NORMED) {
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
    extractROI(image, rect) {
        const roi = new cv.Rect(rect.x, rect.y, rect.width, rect.height);
        return image.roi(roi);
    }
    /**
     * Compare two images and count the number of different pixels
     * Returns the count and whether they're considered different
     */
    compareRegions(image1, image2, threshold = 80, minDiffPixels = 10) {
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
    createDiffImage(image1, image2, threshold = 80) {
        const diff = new cv.Mat();
        cv.absdiff(image1, image2, diff);
        cv.threshold(diff, diff, threshold, 255, cv.THRESH_BINARY);
        return diff;
    }
    /**
     * Keep filled-form pixels that changed vs blank; paint unchanged pixels white.
     */
    isolateChangedForOcr(filled, blank, threshold = 50) {
        const filledCopy = filled.clone();
        const blankCopy = blank.clone();
        if (filledCopy.rows !== blankCopy.rows || filledCopy.cols !== blankCopy.cols) {
            blankCopy.delete();
            return filledCopy;
        }
        const result = filledCopy.clone();
        const filledData = filledCopy.data;
        const blankData = blankCopy.data;
        const out = result.data;
        for (let i = 0; i < filledData.length; i++) {
            out[i] = Math.abs(filledData[i] - blankData[i]) <= threshold ? 255 : filledData[i];
        }
        filledCopy.delete();
        blankCopy.delete();
        return result;
    }
    countDarkPixels(image, limit = 200) {
        let gray = image;
        let allocatedGray = false;
        if (image.channels() > 1) {
            gray = this.toGrayscale(image);
            allocatedGray = true;
        }
        let dark = 0;
        const data = gray.data;
        for (let i = 0; i < data.length; i++) {
            if (data[i] < limit)
                dark += 1;
        }
        if (allocatedGray)
            gray.delete();
        return dark;
    }
    hasEnoughInk(image, minPixels = 8) {
        return this.countDarkPixels(image) >= minPixels;
    }
    ocrPrepOptions(image, options = {}) {
        const rows = image.rows ?? 0;
        let scale = 3;
        let threshold;
        if (options.charset?.includes('@')) {
            scale = 3;
        }
        else if (rows <= 24) {
            scale = 4;
            threshold = 200;
        }
        if (options.scale && options.scale >= 2 && options.scale <= 8)
            scale = options.scale;
        return threshold == null ? { scale } : { scale, threshold };
    }
    /**
     * Upscale, pad, and binarize a crop so Tesseract can read 18px UI text.
     * Short crops use a fixed threshold — Otsu on tiny digits fattens 0 into 8.
     */
    prepareForOcr(image, scale, options = {}) {
        let gray = image;
        let allocatedGray = false;
        if (image.channels() > 1) {
            gray = this.toGrayscale(image);
            allocatedGray = true;
        }
        const auto = this.ocrPrepOptions(gray, options);
        const usedScale = scale ?? auto.scale;
        const threshold = options.threshold ?? auto.threshold;
        const scaled = new cv.Mat();
        cv.resize(gray, scaled, new cv.Size(Math.max(1, gray.cols * usedScale), Math.max(1, gray.rows * usedScale)), 0, 0, cv.INTER_CUBIC);
        if (allocatedGray)
            gray.delete();
        const padded = new cv.Mat();
        cv.copyMakeBorder(scaled, padded, 16, 16, 16, 16, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
        scaled.delete();
        const binary = new cv.Mat();
        if (typeof threshold === 'number') {
            cv.threshold(padded, binary, threshold, 255, cv.THRESH_BINARY);
        }
        else {
            cv.threshold(padded, binary, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        }
        padded.delete();
        return binary;
    }
    /**
     * Align two images using feature detection and homography
     * This corrects for rotation, skew, and perspective differences
     */
    alignImages(filledForm, blankForm) {
        if (filledForm.rows === blankForm.rows && filledForm.cols === blankForm.cols) {
            return filledForm.clone();
        }
        if (typeof cv.SIFT !== 'function') {
            throw new Error('Filled and blank screenshots differ in size, and this OpenCV build cannot align them. Capture both at the same resolution.');
        }
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
        const goodMatches = [];
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
        const filledPoints = [];
        const blankPoints = [];
        for (const match of goodMatches) {
            const filledPt = filledKeypoints.get(match.queryIdx).pt;
            const blankPt = blankKeypoints.get(match.trainIdx).pt;
            filledPoints.push(filledPt.x, filledPt.y);
            blankPoints.push(blankPt.x, blankPt.y);
        }
        // Find homography
        const filledMat = cv.matFromArray(goodMatches.length, 1, cv.CV_32FC2, filledPoints);
        const blankMat = cv.matFromArray(goodMatches.length, 1, cv.CV_32FC2, blankPoints);
        const homography = cv.findHomography(filledMat, blankMat, cv.RANSAC, 5.0);
        // Warp the filled form to align with blank
        const aligned = new cv.Mat();
        cv.warpPerspective(filledForm, aligned, homography, new cv.Size(blankForm.cols, blankForm.rows));
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
    matToBuffer(mat) {
        const width = mat.cols;
        const height = mat.rows;
        const png = new PNG({ width, height });
        const src = mat.data;
        const pixels = width * height;
        if (src.length >= pixels * 4) {
            png.data.set(src.subarray(0, pixels * 4));
        }
        else if (src.length >= pixels * 3) {
            for (let i = 0; i < pixels; i++) {
                png.data[i * 4] = src[i * 3] ?? 0;
                png.data[i * 4 + 1] = src[i * 3 + 1] ?? 0;
                png.data[i * 4 + 2] = src[i * 3 + 2] ?? 0;
                png.data[i * 4 + 3] = 255;
            }
        }
        else {
            for (let i = 0; i < pixels; i++) {
                const value = src[i] ?? 0;
                png.data[i * 4] = value;
                png.data[i * 4 + 1] = value;
                png.data[i * 4 + 2] = value;
                png.data[i * 4 + 3] = 255;
            }
        }
        return PNG.sync.write(png);
    }
    /**
     * Use pixelmatch for fast pixel-level comparison
     * Returns the number of mismatched pixels
     */
    pixelMatch(img1, img2, options = {}) {
        const png1 = PNG.sync.read(img1);
        const png2 = PNG.sync.read(img2);
        if (png1.width !== png2.width || png1.height !== png2.height) {
            throw new Error('Images must have the same dimensions');
        }
        const diff = new PNG({ width: png1.width, height: png1.height });
        const mismatchedPixels = pixelmatch(png1.data, png2.data, diff.data, png1.width, png1.height, {
            threshold: options.threshold ?? 0.1,
            includeAA: options.includeAA ?? false,
        });
        return {
            mismatchedPixels,
            diffBuffer: PNG.sync.write(diff),
        };
    }
}
//# sourceMappingURL=vision.js.map