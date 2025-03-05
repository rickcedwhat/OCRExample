package utils;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;

import java.awt.*;
import java.io.File;
import java.awt.image.BufferedImage;

import net.sourceforge.tess4j.Word;
import org.example.FieldInfo;
import org.opencv.calib3d.Calib3d;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.opencv.highgui.HighGui;
import org.opencv.imgcodecs.Imgcodecs;
import java.io.IOException;
import org.opencv.core.Core;
import org.opencv.imgproc.Imgproc;
import org.opencv.core.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.HttpURLConnection;
import java.net.Socket;
import java.net.URL;
import java.util.*;

import org.opencv.core.*;
import org.opencv.features2d.DescriptorMatcher;
import org.opencv.features2d.ORB;
import org.opencv.features2d.*;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.json.JSONObject;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;


public class OCRUtil {
    private static boolean debug;
    private static final Logger logger = LoggerFactory.getLogger(OCRUtil.class);

    public static String extractTextFromMat(Mat mat) throws TesseractException, IOException {

        MatOfByte matOfByte = new MatOfByte();
        Imgcodecs.imencode(".png", mat, matOfByte);
        byte[] byteArray = matOfByte.toArray();

        String base64Image = Base64.getEncoder().encodeToString(byteArray);

        try {
            URL url = new URL("http://127.0.0.1:5000/process_base64");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);

            String jsonInputString = "{\"base64_image\": \"" + base64Image + "\"}";

            try (OutputStream outputStream = connection.getOutputStream()) {
                byte[] input = jsonInputString.getBytes(StandardCharsets.UTF_8);
                outputStream.write(input, 0, input.length);
            }

            try (BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                StringBuilder response = new StringBuilder();
                String responseLine = null;
                while ((responseLine = bufferedReader.readLine()) != null) {
                    response.append(responseLine.trim());
                }
                JSONObject jsonResponse = new JSONObject(response.toString());
                String extractedText = jsonResponse.getString("text");
                logger.debug("Extracted Text: " + extractedText);
                return extractedText;
            }

        } catch (IOException e) {
            e.printStackTrace();
            return "Error";
        }


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
        Imgproc.threshold(diff, diff, 90, 255, Imgproc.THRESH_BINARY);

        debugImg("threshold diff",diff);

        return extractTextFromMat(diff);
    }

    public static Mat alignImages(Mat filledForm, Mat blankForm) {
        // Detect SIFT features and compute descriptors
        SIFT sift = SIFT.create();
        MatOfKeyPoint filledKeypoints = new MatOfKeyPoint();
        Mat filledDescriptors = new Mat();
        sift.detectAndCompute(filledForm, new Mat(), filledKeypoints, filledDescriptors);

        MatOfKeyPoint blankKeypoints = new MatOfKeyPoint();
        Mat blankDescriptors = new Mat();
        sift.detectAndCompute(blankForm, new Mat(), blankKeypoints, blankDescriptors);

        // Match features using FlannBasedMatcher
        DescriptorMatcher matcher = DescriptorMatcher.create(DescriptorMatcher.FLANNBASED);
        List<MatOfDMatch> knnMatches = new ArrayList<>();
        matcher.knnMatch(filledDescriptors, blankDescriptors, knnMatches, 2);

        // Filter matches using the Lowe's ratio test
        List<DMatch> goodMatchesList = new ArrayList<>();
        float ratioThresh = 0.7f;
        for (MatOfDMatch matOfDMatch : knnMatches) {
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
        for (DMatch goodMatch : goodMatchesList) {
            filledPoints.add(filledKeypoints.toList().get((int) goodMatch.queryIdx).pt);
            blankPoints.add(blankKeypoints.toList().get((int) goodMatch.trainIdx).pt);
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

    public static void debugImgs(String description, Mat img1, Mat img2){
        if(OCRUtil.debug) {

            // Blend images
            Mat result = new Mat();
            Core.subtract(img2,img1,result);
            HighGui.imshow(description, result);
            HighGui.waitKey(0);
        }
    }
}