package utils;

import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import java.io.File;
import java.awt.image.BufferedImage;

import org.example.FieldInfo;
import org.opencv.calib3d.Calib3d;
import org.opencv.core.Mat;
import org.opencv.highgui.HighGui;
import org.opencv.imgcodecs.Imgcodecs;
import java.io.IOException;
import org.opencv.core.Core;
import org.opencv.imgproc.Imgproc;
import org.opencv.core.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import org.opencv.core.*;
import org.opencv.features2d.DescriptorMatcher;
import org.opencv.features2d.ORB;


public class OCRUtil {
    private static boolean debug;
    private static final Logger logger = LoggerFactory.getLogger(OCRUtil.class);

    public static String extractTextFromMat(Mat mat) throws TesseractException, IOException {
        Tesseract tesseract = new Tesseract();
        tesseract.setDatapath("C:/Program Files/Tesseract-OCR/tessdata"); // Replace with your tessdata path
        tesseract.setLanguage("eng"); // Set the language

        // Convert Mat to BufferedImage
        BufferedImage image = MatToBufferedImage(mat);

        return tesseract.doOCR(image).trim();
    }

    public static void setDebug(boolean shouldDebug){
        OCRUtil.debug = shouldDebug;
    }

    public static String extractTextFromDifference(Mat filledMat, Mat blankMat) throws TesseractException, IOException {
        if (!filledMat.size().equals(blankMat.size())) {
            throw new IllegalArgumentException("Mats must have the same size.");
        }

        Mat diff = new Mat();
        Core.absdiff(filledMat, blankMat, diff);

        // Optional: Apply threshold to binarize the difference
        Imgproc.threshold(diff, diff, 50, 255, Imgproc.THRESH_BINARY);

        return extractTextFromMat(diff);
    }

    private static BufferedImage MatToBufferedImage(Mat mat) throws IOException {
        // Convert Mat to BufferedImage
        Imgcodecs.imwrite("temp.png", mat); // Save Mat as temporary image
        BufferedImage image = javax.imageio.ImageIO.read(new File("temp.png"));
        new File("temp.png").delete(); // Delete the temporary image
        return image;
    }

    public static Mat correctSkew(Mat original){
        Mat correctedSkew = new Mat();
        double angle = OCRUtil.computeSkew(original);
        return OCRUtil.deskew(original,angle);
    }

    public static Mat deskew(Mat src, double angle) {
        Point center = new Point((double) src.width() /2, (double) src.height() /2);
        Mat rotImage = Imgproc.getRotationMatrix2D(center, angle, 1.0);
        //1.0 means 100 % scale
        Size size = new Size(src.width(), src.height());
        Imgproc.warpAffine(src, src, rotImage, size, Imgproc.INTER_LINEAR + Imgproc.CV_WARP_FILL_OUTLIERS);
        return src;
    }

    public static double computeSkew(Mat original) { // Accept Mat as input

        Mat img = original.clone();
        Imgproc.threshold(img, img, 200, 255, Imgproc.THRESH_BINARY); // Correct import

        debugImg("threshold",img);

        //Invert the colors (because objects are represented as white pixels, and the background is represented by black pixels)
        Core.bitwise_not(img, img);
        Mat element = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, new Size(3, 3));

        debugImg("bitwise_not",img);

        //We can now perform our erosion, we must declare our rectangle-shaped structuring element and call the erode function
        Imgproc.erode(img, img, element);

        debugImg("erode",img);

        //Find all white pixels
        Mat wLocMat = Mat.zeros(img.size(), img.type());
        Core.findNonZero(img, wLocMat);

        //Create an empty Mat and pass it to the function
        MatOfPoint matOfPoint = new MatOfPoint(wLocMat);

        //Translate MatOfPoint to MatOfPoint2f in order to user at a next step
        MatOfPoint2f mat2f = new MatOfPoint2f();
        matOfPoint.convertTo(mat2f, CvType.CV_32FC2);

        //Get rotated rect of white pixels
        RotatedRect rotatedRect = Imgproc.minAreaRect(mat2f);

        Point[] vertices = new Point[4];
        rotatedRect.points(vertices);
        List<MatOfPoint> boxContours = new ArrayList<>();
        boxContours.add(new MatOfPoint(vertices));
        Imgproc.drawContours(img, boxContours, 0, new Scalar(128, 128, 128), -1);

        OCRUtil.debugImg("contours",img);

        double resultAngle = rotatedRect.angle;
        // Ensure angle is between -45 and 45
        if (resultAngle > 45) {
            resultAngle -= 90;
        } else if (resultAngle < -45) {
            resultAngle += 90;
        }
        logger.debug("Angle is "+resultAngle);
        return resultAngle;
    }

    public static Mat alignImages(Mat filledForm, Mat blankForm) {
        // Detect ORB features and compute descriptors
        ORB orb = ORB.create();
        MatOfKeyPoint filledKeypoints = new MatOfKeyPoint();
        Mat filledDescriptors = new Mat();
        orb.detectAndCompute(filledForm, new Mat(), filledKeypoints, filledDescriptors);

        MatOfKeyPoint blankKeypoints = new MatOfKeyPoint();
        Mat blankDescriptors = new Mat();
        orb.detectAndCompute(blankForm, new Mat(), blankKeypoints, blankDescriptors);

        // Match features using Brute-Force matcher
        DescriptorMatcher matcher = DescriptorMatcher.create(DescriptorMatcher.BRUTEFORCE_HAMMING);
        List<MatOfDMatch> matches = new ArrayList<>();
        matcher.knnMatch(filledDescriptors, blankDescriptors, matches, 2);

        // Filter matches using the Lowe's ratio test
        List<DMatch> goodMatchesList = new ArrayList<>();
        float ratioThresh = 0.7f;
        for (MatOfDMatch matOfDMatch : matches) {
            if (matOfDMatch.rows() > 1) {
                DMatch[] match = matOfDMatch.toArray();
                if (match[0].distance < ratioThresh * match[1].distance) {
                    goodMatchesList.add(match[0]);
                }
            }
        }

        // Extract good keypoints locations
        List<Point> filledPoints = new ArrayList<>();
        List<Point> blankPoints = new ArrayList<>();
        for (DMatch match : goodMatchesList) {
            filledPoints.add(filledKeypoints.toList().get((int) match.queryIdx).pt);
            blankPoints.add(blankKeypoints.toList().get((int) match.trainIdx).pt);
        }

        // Convert to MatOfPoint2f
        MatOfPoint2f filledMatOfPoint2f = new MatOfPoint2f();
        filledMatOfPoint2f.fromList(filledPoints);
        MatOfPoint2f blankMatOfPoint2f = new MatOfPoint2f();
        blankMatOfPoint2f.fromList(blankPoints);

        // Find homography
        Mat homography = Calib3d.findHomography(filledMatOfPoint2f, blankMatOfPoint2f, Calib3d.RANSAC, 5.0);

        // Warp the filled form
        Mat alignedFilledForm = new Mat();
        Imgproc.warpPerspective(filledForm, alignedFilledForm, homography, blankForm.size());

        return alignedFilledForm;
    }

    public static void debugImg(String imgName, Mat img){
        if(OCRUtil.debug) {
            HighGui.imshow(imgName, img);
            HighGui.waitKey(0); // Wait for a key press
        }
    }

    public static Mat manualHConcat(Mat img1, Mat img2) {
        if (img1.rows() != img2.rows()) {
            System.err.println("Error: Images must have the same height for horizontal concatenation.");
            return null;
        }

        int combinedWidth = img1.cols() + img2.cols();
        Mat concatenatedImage = new Mat(img1.rows(), combinedWidth, img1.type());

        // Copy img1 data
        Mat img1Roi = new Mat(concatenatedImage, new Rect(0, 0, img1.cols(), img1.rows()));
        img1.copyTo(img1Roi);

        // Copy img2 data
        Mat img2Roi = new Mat(concatenatedImage, new Rect(img1.cols(), 0, img2.cols(), img2.rows()));
        img2.copyTo(img2Roi);

        return concatenatedImage;
    }

    public static void debugImgs(String description, Mat img1, Mat img2){
        if(OCRUtil.debug) {

            // Blend images
            Mat invertedImage = new Mat();
            Mat result = new Mat();
            Core.bitwise_not(img2, invertedImage);
            Core.add(invertedImage,img1,result);
            // Display
//            assert concatenated != null;
            HighGui.imshow(description, result);
            HighGui.waitKey(0);
        }
    }
}