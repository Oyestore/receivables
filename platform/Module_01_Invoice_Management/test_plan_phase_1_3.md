# Test Plan for Phase 1.3: Advanced Editor UX & Indian Taxation Compliance

**Version:** 1.0
**Date:** 2025-05-10

## 1. Introduction

This document outlines the test plan for Phase 1.3 of the Smart Invoice Generation Agent. The focus of this phase was on enhancing the visual template editor for better User Experience (UX) and incorporating features for Indian Goods and Services Tax (GST) compliance. This test plan covers the new GrapesJS blocks, editor UX improvements, backend support, and PDF generation accuracy for GST-related invoice elements.

## 2. Scope of Testing

*   **New GrapesJS Blocks for Indian Taxation:**
    *   GSTIN Input Block (Supplier/Recipient)
    *   Place of Supply Block (Recipient)
    *   GST Line Items Table Block (with HSN/SAC, CGST, SGST/UTGST, IGST columns)
    *   GST Tax Summary Table Block
    *   Grand Total in Words Block
    *   Reverse Charge Indicator Block
    *   E-way Bill Number Block
    *   Bank Details Block (GST specific)
    *   Authorized Signatory Block
*   **Configuration Traits for New Blocks:** `data-field-id`, `data-gjs-custom-name`, `data-gjs-mandatory`, `placeholder`.
*   **General UX Improvements:**
    *   Dedicated "Indian GST Fields" category in Block Manager.
    *   Conceptual "Preview with Sample GST Data" feature.
    *   Conceptual tooltips and guidance for GST blocks.
*   **Backend & Data Integrity:**
    *   Ensuring template definitions (GrapesJS JSON) correctly store GST block structures and their attributes.
    *   No immediate structural changes to entities/DTOs were made, as GST fields are primarily within the GrapesJS JSON.
*   **PDF Generation Service:**
    *   Accurate rendering of all new GST-specific blocks and fields in the PDF.
    *   Correct population of `data-field-id` attributes from sample invoice data.

## 3. Test Objectives

*   Verify that all new GST-specific GrapesJS blocks can be added, configured, and styled in the editor.
*   Ensure that templates created with these blocks can be saved and loaded correctly.
*   Validate that the PDF Generation service accurately renders invoices with Indian GST details based on templates created with the new blocks.
*   Confirm that the UX improvements (block categorization, conceptual preview) are functional.
*   Ensure data integrity is maintained for templates incorporating GST elements.

## 4. Test Cases (Conceptual)

### 4.1. GST Block Functionality & Configuration

*   **TC-GST-BLK-001:** Add GSTIN Input block. Configure `data-field-id`, placeholder. Verify visual representation.
*   **TC-GST-BLK-002:** Add Place of Supply block. Configure state name and code fields. Verify.
*   **TC-GST-BLK-003:** Add GST Line Items Table block. Verify all columns (S.No, Desc, HSN/SAC, Qty, Unit, Rate, Taxable Value, CGST Rate/Amt, SGST Rate/Amt, IGST Rate/Amt, Total) are present.
*   **TC-GST-BLK-004:** Add GST Tax Summary block. Verify fields for Total Taxable Value, CGST, SGST, IGST, Grand Total.
*   **TC-GST-BLK-005:** Add Grand Total in Words block. Configure `data-field-id`.
*   **TC-GST-BLK-006:** Add Reverse Charge block. Configure text/checkbox.
*   **TC-GST-BLK-007:** Add E-way Bill Number block. Configure `data-field-id`, placeholder.
*   **TC-GST-BLK-008:** Add Bank Details (GST) block. Verify structure.
*   **TC-GST-BLK-009:** Add Authorized Signatory block. Verify structure.
*   **TC-GST-BLK-010:** For each GST block, verify that `data-field-id`, `data-gjs-custom-name`, and `data-gjs-mandatory` traits can be set and are reflected (conceptually for mandatory).

### 4.2. Editor UX Improvements

*   **TC-GST-UX-001:** Verify that all new GST blocks are listed under the "Indian GST Fields" category in the Block Manager.
*   **TC-GST-UX-002:** Trigger the "Preview with Sample GST Data" command. Verify conceptual console log/alert indicating its function.

### 4.3. Template Save/Load with GST Blocks

*   **TC-GST-SL-001:** Create a new template using several GST blocks. Save the template.
*   **TC-GST-SL-002:** Load the saved template. Verify all GST blocks and their configurations are restored correctly.

### 4.4. PDF Generation with GST Data

*   **TC-GST-PDF-001 (Intra-State):** Create a template with GSTINs, Place of Supply (same state as supplier), GST Line Items Table, Tax Summary. Populate with sample data including CGST and SGST values.
    *   **Expected:** PDF renders all supplier/recipient details, line items with HSN, CGST/SGST rates and amounts, and correct totals. IGST fields should be blank or show 0.
*   **TC-GST-PDF-002 (Inter-State):** Create a template as above, but Place of Supply is a different state.
    *   **Expected:** PDF renders all details, line items with HSN, IGST rates and amounts, and correct totals. CGST/SGST fields should be blank or show 0.
*   **TC-GST-PDF-003 (Reverse Charge):** Include Reverse Charge indicator in the template and data.
    *   **Expected:** PDF correctly displays the reverse charge status.
*   **TC-GST-PDF-004 (E-way Bill):** Include E-way Bill number in template and data.
    *   **Expected:** PDF correctly displays the E-way bill number.
*   **TC-GST-PDF-005 (All Fields):** Create a comprehensive template using all new GST blocks. Populate with relevant sample data.
    *   **Expected:** PDF renders all fields accurately and in a readable format.

### 4.5. Data Integrity

*   **TC-GST-DI-001:** Inspect the GrapesJS JSON output for a template with GST blocks. Verify that all `data-field-id` and other configurations are correctly stored in the JSON structure.

## 5. Test Environment & Tools (Conceptual)

*   **Environment:** Local development setup with NestJS backend and frontend GrapesJS editor accessible via browser.
*   **Tools:** Web browser developer tools for inspecting HTML/CSS and GrapesJS JSON. PDF viewer.

## 6. Test Execution (Conceptual for this document)

*   This test plan will be executed conceptually by reviewing the implemented code (`editor-main.js` for frontend, relevant backend service logic for PDF generation data handling) against the test cases.
*   Actual interactive testing would be performed in a live development environment.

## 7. Reporting

*   Test results (Pass/Fail for each conceptual test case) will be noted.
*   Any deviations or issues found during conceptual testing will be documented for potential fixes.

