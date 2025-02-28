package org.example;

import org.opencv.core.Mat;
import java.util.List;

public class ComboCheckbox {
    private final String name;
    private final List<CheckboxInfo> checkboxes;
    private final List<TextFieldInfo> textFields;

    public ComboCheckbox(String name, List<CheckboxInfo> checkboxes, List<TextFieldInfo> textFields) {
        this.name = name;
        this.checkboxes = checkboxes;
        this.textFields = textFields;
    }

    // Getters for name, checkboxes, and textFields
    public String getName() {
        return name;
    }

    public List<CheckboxInfo> getCheckboxes() {
        return checkboxes;
    }

    public List<TextFieldInfo> getTextFields() {
        return textFields;
    }

    // Inner classes for CheckboxInfo and TextFieldInfo
    public static class CheckboxInfo {
        private final String name;
        private final Mat checkedTemplate;
        private final Mat uncheckedTemplate;
        private boolean isChecked;

        public CheckboxInfo(String name, Mat checkedTemplate, Mat uncheckedTemplate) {
            this.name = name;
            this.checkedTemplate = checkedTemplate;
            this.uncheckedTemplate = uncheckedTemplate;
        }

        // Getters and setters for checkbox properties
        public String getName() {
            return name;
        }

        public Mat getCheckedTemplate() {
            return checkedTemplate;
        }

        public Mat getUncheckedTemplate() {
            return uncheckedTemplate;
        }

        public boolean isChecked() {
            return isChecked;
        }

        public void setChecked(boolean checked) {
            isChecked = checked;
        }
    }

    public static class TextFieldInfo {
        private final String name;
        private final Mat template;
        private String value;

        public TextFieldInfo(String name, Mat template) {
            this.name = name;
            this.template = template;
        }

        // Getters and setters for text field properties
        public String getName() {
            return name;
        }

        public Mat getTemplate() {
            return template;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }
    }
}