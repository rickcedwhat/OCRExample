package org.example;

import org.opencv.core.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.ArrayList;
import java.util.List;

public class TemplateMatchingFormComparison {

    private static final Logger logger = LoggerFactory.getLogger(TemplateMatchingFormComparison.class);


    static {
        System.loadLibrary(Core.NATIVE_LIBRARY_NAME); // Load OpenCV library
    }

    public static void main(String[] args) {

        List<FieldInfo> fieldList = new ArrayList<>();
//        FieldInfo.setDebug(true);
        FieldInfo.setBaseDir("src/main/resources/forms and fields/W2 Fields/");
        FieldInfo.setFormPaths("src/main/resources/forms and fields/Blank W2.png","src/main/resources/forms and fields/Sample W2.png");

        // Add field information to the list
        fieldList.add(new FieldInfo("SSN", "SSN"));
        fieldList.add(new FieldInfo("EIN", "EIN"));
        fieldList.add(new FieldInfo("Wages, tips, and compensation", "wages"));
        fieldList.add(new FieldInfo("Statutory Employee","field_13_stat_emp",true));
        fieldList.add(new FieldInfo("Retirement Plan","field_13_ret_plan",true));
        fieldList.add(new FieldInfo("Third Party Sick Pay","field_13_third_party",true));

        // Loop through the fields
        for (FieldInfo fieldInfo : fieldList) {
            String value = fieldInfo.extractValue();
            logger.info("  {}: {}", fieldInfo.getFieldName(), fieldInfo.getFieldValue());
        }
    }


}