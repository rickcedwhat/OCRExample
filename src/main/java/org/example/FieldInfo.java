package org.example;

import net.sourceforge.tess4j.TesseractException;
import org.opencv.core.Core;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.opencv.core.Rect;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import utils.OCRUtil;
import static utils.OCRUtil.debugImg;
import org.opencv.highgui.HighGui;

import java.io.IOException;

public class FieldInfo {
    private static String baseDir;
    private static boolean debug = false;
    private static Mat filledGrayForm;
    private static Mat blankGrayForm;
//    could have two paths for checkbox - checked and unchecked

    private static final Logger logger = LoggerFactory.getLogger(FieldInfo.class);
    private final String fieldName;
    private String fieldValue;
    private final boolean isCheckBox;
    private final Mat templateMat;
    private final Mat sectionTemplateMat;

//    public static void setFormPaths(String blankPath, String filledpath){
//        Mat filledForm = Imgcodecs.imread(filledpath);
//        Mat filledGray = new Mat();
//
//        Imgproc.cvtColor(filledForm, filledGray, Imgproc.COLOR_BGR2GRAY);
//        if(FieldInfo.debug) {
//            OCRUtil.setDebug(true);
//            HighGui.imshow("Uncorrected Skew", filledGray);
//            HighGui.waitKey(0); // Wait for a key press
//         }
//        FieldInfo.filledGrayForm = OCRUtil.correctSkew(filledGray);
//
//        if(FieldInfo.debug) {
//            HighGui.imshow("corrected skew", FieldInfo.filledGrayForm);
//            HighGui.waitKey(0); // Wait for a key press
//        }
//
//
//        Mat blankForm = Imgcodecs.imread(blankPath);
//        Mat blankGray = new Mat();
//
//        Imgproc.cvtColor(blankForm, blankGray, Imgproc.COLOR_BGR2GRAY);
//        FieldInfo.blankGrayForm = blankGray;
//    }

    public static void setBaseDir(String baseDir){
        FieldInfo.baseDir = baseDir;
    }

    public FieldInfo(String fieldName, String pngName) {
        this(fieldName, pngName, "", false);
    }

    public FieldInfo(String fieldName, String pngName, boolean isCheckBox) {
        this(fieldName, pngName, "", isCheckBox);
    }

    public FieldInfo(String fieldName, String pngName, String sectionPngName) {
        this(fieldName, pngName,sectionPngName  ,false);
    }

    public static void setDebug(boolean shouldDebug){
        FieldInfo.debug=shouldDebug;
    }

    public FieldInfo(String fieldName, String pngName, String sectionPngName, boolean isCheckBox) {
        this.fieldName = fieldName;
        this.isCheckBox = isCheckBox;
        String templatePath = FieldInfo.baseDir + pngName + ".png";
        this.templateMat = Imgcodecs.imread(templatePath, Imgcodecs.IMREAD_GRAYSCALE);
        if(!sectionPngName.isEmpty()){
            String sectionTemplatePath = "C:/Users/ccata/Downloads/W2 Fields/" + sectionPngName + ".png";
            this.sectionTemplateMat = Imgcodecs.imread(sectionTemplatePath, Imgcodecs.IMREAD_GRAYSCALE);
        }else{
            this.sectionTemplateMat = null;
        }
    }

    public static void setFormPaths(String blankPath, String filledPath) {
        Mat filledForm = Imgcodecs.imread(filledPath);
        Mat filledGray = new Mat();
        Imgproc.cvtColor(filledForm, filledGray, Imgproc.COLOR_BGR2GRAY);

        Mat blankForm = Imgcodecs.imread(blankPath);
        Mat blankGray = new Mat();
        Imgproc.cvtColor(blankForm, blankGray, Imgproc.COLOR_BGR2GRAY);

        OCRUtil.setDebug(debug);
        OCRUtil.debugImg("Original Filled Form", filledGray);
        OCRUtil.debugImg("Original Blank Form", blankGray);


        // Align the filled form with the blank form
        Mat alignedFilledGray = OCRUtil.alignImages(filledGray, blankGray);
        logger.debug("aligned size "+ alignedFilledGray.size());
        logger.debug("blank size "+blankGray.size());
        OCRUtil.debugImgs("Aligned filled and blank ",alignedFilledGray,blankGray);

        filledGrayForm = alignedFilledGray;
        blankGrayForm = blankGray;
    }

    private Mat extractROI(Mat filledGray, Mat blankGray,Mat templateMat){



        Mat result1 = new Mat();
//        use blankGray if docs are perfect matches - use filledGray otherwise but would need a template for checked and unchecked
        Imgproc.matchTemplate(blankGray, templateMat, result1, Imgproc.TM_CCOEFF_NORMED);
        Core.MinMaxLocResult mmr1 = Core.minMaxLoc(result1);
        Point matchLoc1 = mmr1.maxLoc;

        logger.debug("{} Template Match Location: {}", fieldName,matchLoc1);

        // Extract the region of interest (ROI) from the filled form
        Rect roiRect = new Rect(matchLoc1, templateMat.size());
        Mat filledRoiMat = new Mat(filledGray, roiRect);

        debugImg("filledGray",filledGray);
        debugImg("blankGray",blankGray);
        debugImg("templateMat",templateMat);
        debugImg("filledRoiMat",filledRoiMat);

        return filledRoiMat;
    }

    public String extractValue(){
        Mat filledMat;
        Mat blankMat;

        if (sectionTemplateMat != null) {
            filledMat= this.extractROI(filledGrayForm, blankGrayForm, sectionTemplateMat);
                blankMat = sectionTemplateMat;
        } else {
            filledMat = filledGrayForm;
            blankMat = blankGrayForm;
        }

        Mat filledRoiMat = this.extractROI(filledMat, blankMat,templateMat);


        boolean areDifferent = compareRegions(filledRoiMat, templateMat); // Implement compareRegions
        if(isCheckBox){
            if(areDifferent){
                logger.debug("Field is checked!");
                this.setFieldValue("True");
            }else{
                logger.debug("Field is not checked!");
                this.setFieldValue("False");
            }
        }else if (areDifferent) {
            logger.debug("Field has been filled.");
            try {
                String blankText = OCRUtil.extractTextFromMat(templateMat);
                String filledText = OCRUtil.extractTextFromDifference(filledRoiMat, templateMat);
                logger.debug("Blank text: {}", blankText); // Use placeholders {} for variables
                logger.debug("Filled text: {}\n", filledText);
                this.setFieldValue(filledText);
            } catch (TesseractException | IOException e) {
                logger.error("OCR Error: {}\n", e.getMessage());
            }
        } else {
            logger.debug("Field is empty.\n");
        }
        return this.fieldValue;
    }

    private static boolean compareRegions(Mat filledRoi, Mat blankRoi) {




        if (filledRoi.size().equals(blankRoi.size())) {
            int diffCount = 0;
            for (int y = 0; y < filledRoi.rows(); y++) {
                for (int x = 0; x < filledRoi.cols(); x++) {
                    if (filledRoi.get(y, x)[0] != blankRoi.get(y, x)[0]) {
                        diffCount++;
                    }
                }
            }
            logger.debug("Number of Different Pixels: {}" , diffCount);
            return diffCount > 10; // Adjust threshold as needed
        } else {
            logger.error("ROIs have different sizes.");
            return true; // Consider different if sizes don't match
        }
    }

    public String getFieldName() {
        return fieldName;
    }

    public String getFieldValue(){
        return fieldValue;
    }

    public void setFieldValue(String fieldValue){
        this.fieldValue = fieldValue;
    }

}