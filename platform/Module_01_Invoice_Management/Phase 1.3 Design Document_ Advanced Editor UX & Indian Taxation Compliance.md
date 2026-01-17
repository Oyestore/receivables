# Phase 1.3 Design Document: Advanced Editor UX & Indian Taxation Compliance

**Version:** 1.0
**Date:** 2025-05-10

## 1. Introduction

This document outlines the design for enhancements in Phase 1.3 of the Smart Invoice Generation Agent. The primary goals are to improve the visual template editor's user experience (UX) and to incorporate features specifically for Indian Goods and Services Tax (GST) compliance. This will involve creating new GrapesJS blocks, refining editor interactions, and ensuring backend and PDF generation services can support these new requirements.

## 2. Indian GST Invoice Requirements Summary

Based on initial research, the following key elements must be supported for Indian GST invoices:

*   **Supplier Details:** Name, Address, GSTIN.
*   **Recipient Details:** Name, Address, GSTIN (if registered), Place of Supply (State Name & Code).
*   **Invoice Details:** Invoice Number (unique, sequential), Invoice Date, Due Date (optional but common).
*   **Item Details (Table):**
    *   Serial Number (S.No.)
    *   Description of Goods/Services
    *   HSN/SAC Code
    *   Quantity (Qty)
    *   Unit (e.g., Nos, Kgs, Pcs)
    *   Rate per Unit
    *   Discount (if any, per item)
    *   Taxable Value
    *   CGST Rate (%) & Amount (₹)
    *   SGST/UTGST Rate (%) & Amount (₹)
    *   IGST Rate (%) & Amount (₹)
    *   Total Item Value (including tax)
*   **Invoice Summary/Totals:**
    *   Total Taxable Value
    *   Total CGST Amount
    *   Total SGST/UTGST Amount
    *   Total IGST Amount
    *   Grand Total (in figures and words)
*   **Other Mandatory/Common Fields:**
    *   Reverse Charge Applicability (Yes/No)
    *   E-way Bill Number (if applicable)
    *   Bank Account Details for Payment
    *   Terms & Conditions
    *   Authorized Signatory section
    *   Company PAN (often included)

## 3. Visual Editor (GrapesJS) Enhancements

### 3.1. New GrapesJS Blocks for Indian Taxation

New, specialized GrapesJS blocks will be created for easy drag-and-drop of GST-specific sections and fields. These blocks will be pre-styled for common invoice layouts and will contain appropriate `data-field-id` attributes for data binding.

1.  **GSTIN Input Block (Supplier/Recipient):**
    *   **Content:** A text input styled field, clearly labeled "GSTIN".
    *   **`data-field-id`:** `supplier.gstin`, `recipient.gstin`.
    *   **Traits:** Validation pattern (for GSTIN format), mandatory flag.

2.  **Place of Supply Block (Recipient):**
    *   **Content:** Labeled field, potentially a dropdown or text input for State Name & State Code.
    *   **`data-field-id`:** `recipient.place_of_supply.state_name`, `recipient.place_of_supply.state_code`.
    *   **Traits:** Options for state list (if dropdown).

3.  **HSN/SAC Code Block (for Line Items Table):**
    *   **Content:** A column/cell specifically for HSN/SAC codes within the line items table structure.
    *   **`data-field-id`:** `item.hsn_sac_code` (within the repeatable line item structure).
    *   **Traits:** Input type, label.

4.  **GST Tax Columns Block (for Line Items Table):**
    *   **Content:** Pre-structured columns for CGST Rate, CGST Amount, SGST Rate, SGST Amount, IGST Rate, IGST Amount within the line items table.
    *   **`data-field-id`:** `item.cgst_rate`, `item.cgst_amount`, `item.sgst_rate`, `item.sgst_amount`, `item.igst_rate`, `item.igst_amount`.
    *   **Traits:** Configuration for tax rate input, read-only for amount fields (calculated).

5.  **Tax Summary Table Block:**
    *   **Content:** A structured table to display total taxable value, total CGST, SGST, IGST, and Grand Total.
    *   **`data-field-id`:** `summary.total_taxable_value`, `summary.total_cgst`, `summary.total_sgst`, `summary.total_igst`, `summary.grand_total`.
    *   **Traits:** Styling options.

6.  **Grand Total in Words Block:**
    *   **Content:** A text area for the grand total in words.
    *   **`data-field-id`:** `summary.grand_total_words`.
    *   **Traits:** Styling.

7.  **Reverse Charge Indicator Block:**
    *   **Content:** A checkbox or text field indicating "Reverse Charge: Yes/No".
    *   **`data-field-id`:** `invoice.reverse_charge` (boolean or string).
    *   **Traits:** Default value.

8.  **E-way Bill Number Block:**
    *   **Content:** Labeled text input for E-way Bill Number.
    *   **`data-field-id`:** `invoice.eway_bill_number`.

9.  **Bank Details Block:**
    *   **Content:** Pre-formatted section for Bank Name, Account Number, IFSC Code.
    *   **`data-field-id`:** `supplier.bank.name`, `supplier.bank.account_number`, `supplier.bank.ifsc_code`.

10. **Authorized Signatory Block:**
    *   **Content:** Placeholder for signature and name/designation.
    *   **`data-field-id`:** `invoice.authorized_signatory_name`, `invoice.authorized_signatory_designation`.

### 3.2. Configuration of New Blocks (Traits & Styles)

*   **Traits:** Each new block will have relevant traits for easy configuration (e.g., labels, placeholder text, mandatory flags, data field IDs if not fixed, specific validation patterns like for GSTIN).
*   **Styles:** Default styling will be applied, but users can customize using the Style Manager. Common GST invoice layouts will be considered for default styles.

### 3.3. General UX Improvements

1.  **Block Manager Organization:** Create a dedicated category for "Indian GST Fields" in the GrapesJS Block Manager for easy discovery.
2.  **Enhanced Preview:** Explore a "Preview with Sample GST Data" option. This would involve a mechanism to temporarily populate the template in the editor with realistic Indian GST invoice data to visualize the final look.
3.  **Tooltips & Guidance:** Add more descriptive tooltips to GST-specific blocks and traits explaining their purpose and any compliance notes.
4.  **Field Validation Feedback:** Improve visual feedback within the editor for fields that have specific validation rules (e.g., GSTIN format).

## 4. Backend Considerations (NestJS)

1.  **Data Storage:**
    *   The primary template structure, including the GrapesJS JSON, will continue to be stored in `invoice_templates.template_definition`.
    *   Evaluate if any highly structured or critical GST-specific data (e.g., default tax rates for an organization, specific flags) needs to be stored in separate, indexed columns in the `invoice_templates` table or a related table for easier querying or system-level defaults, rather than solely relying on parsing the GrapesJS JSON. For now, assume most will be within the GrapesJS definition and bound via `data-field-id`.
2.  **DTOs and Entities:** Update `CreateInvoiceTemplateDto`, `UpdateInvoiceTemplateDto`, and `InvoiceTemplate` entity if new structured fields are added (see above point).
3.  **Tax Calculation Logic (Conceptual):**
    *   The system will primarily focus on *rendering* tax fields as designed in the template.
    *   Actual tax *calculation* (CGST, SGST, IGST based on item values, rates, and Place of Supply) is a complex domain. For Phase 1.3, the PDF generation will assume that the data provided to populate the template already includes the calculated tax amounts. The template will define where these pre-calculated amounts are displayed.
    *   Future phases might introduce backend tax calculation capabilities based on rates and rules defined at the organization or template level.

## 5. PDF Generation Service (`PdfGenerationService`)

1.  **Accurate Rendering:** Ensure Playwright can accurately render all new GST-specific blocks, including tables with multiple tax columns and complex layouts.
2.  **Data Binding:** The service must correctly populate all `data-field-id` attributes associated with the new GST fields from the provided invoice data object.
3.  **Dynamic Table Rows:** For line items, ensure the GST tax columns (CGST, SGST, IGST amounts and rates) are correctly populated for each item.
4.  **Place of Supply Logic (Display):** The PDF generation will display the Place of Supply as provided in the data. The logic for determining *which* tax (CGST/SGST vs. IGST) applies based on Place of Supply is assumed to be handled *before* data is sent for PDF generation (i.e., the data object will have the correct tax types and amounts to populate).

## 6. Default Templates Update

*   The existing default templates (`classic_professional.html`, `modern_invoice.html`) should be updated or new GST-compliant default templates should be created and seeded. These will showcase the use of the new GST blocks.

## 7. Milestones for Phase 1.3 (related to this design)

1.  **Design Approval:** This document is reviewed and approved.
2.  **Backend Implementation:** Necessary entity/DTO/service updates.
3.  **Frontend GrapesJS Implementation:** New blocks, traits, and UX improvements.
4.  **PDF Generation Adjustments:** Ensure accurate rendering of new fields.
5.  **Testing & Validation:** Comprehensive testing of all new features.
6.  **Documentation Update:** User and technical docs reflect new capabilities.

This design aims to provide a robust foundation for Indian GST compliance within the template editor, significantly enhancing its utility for businesses operating under Indian tax laws.
