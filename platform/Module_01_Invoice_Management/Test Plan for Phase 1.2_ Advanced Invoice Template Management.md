# Test Plan for Phase 1.2: Advanced Invoice Template Management

## 1. Introduction

This document outlines the test plan for Phase 1.2 of the Smart Invoice Generation Module, focusing on Advanced Invoice Template Management and PDF Generation functionalities.

## 2. Scope of Testing

-   **Template Management (CRUD Operations):**
    -   Creating new invoice templates.
    -   Reading/listing available invoice templates (including system and custom).
    -   Updating existing invoice templates (customization of fields, styles, etc.).
    -   Deleting custom invoice templates.
    -   Setting a default template for a tenant.
-   **Default Template Seeding:**
    -   Verification that default templates (`classic_professional.html`, `modern_invoice.html`) are seeded into the database on application startup.
-   **Template Customization (as per UI/UX guidelines and requirements):**
    -   Ability for admins to customize default templates.
    -   Ability for users to select templates.
    -   Ability for users to add/remove non-mandatory fields.
    -   Verification that mandatory fields (as per Indian law) cannot be removed.
-   **PDF Generation:**
    -   Generating PDF invoices using selected templates.
    -   Verifying the accuracy of data populated in the PDF from invoice data.
    -   Verifying the visual appearance of the PDF based on the template (styles, layout).
    -   Testing with different invoice data and templates.
    -   Verifying that `data-field-id` attributes are correctly used for data population.
    -   Verifying that Indian GST-specific fields (GSTIN, CGST, SGST, IGST, Place of Supply) are correctly displayed when present in data and template.
-   **Integration:**
    -   Verifying the integration between `InvoiceService`, `TemplateService`, and `PdfGenerationService`.

## 3. Test Cases

### 3.1. Default Template Seeding

| Test Case ID | Description                                                                 | Expected Result                                                                                                |
| :----------- | :-------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| TC_SEED_001  | Verify `classic_professional` template is seeded on startup.                | `classic_professional` template exists in the database with `is_system_template=true` and correct HTML content. |
| TC_SEED_002  | Verify `modern_invoice` template is seeded on startup.                      | `modern_invoice` template exists in the database with `is_system_template=true` and correct HTML content.     |
| TC_SEED_003  | Verify one of the seeded templates is marked as `is_default=true`.            | At least one system template has `is_default=true`.                                                            |

### 3.2. Template Management (CRUD)

| Test Case ID | Description                                                                 | Expected Result                                                                                             |
| :----------- | :-------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| TC_CRUD_001  | Create a new custom invoice template (e.g., "My Custom Template").          | New template is saved to the database with `is_system_template=false`.                                      |
| TC_CRUD_002  | List all available templates for a tenant.                                  | List includes system templates and any custom templates created by the tenant.                                |
| TC_CRUD_003  | Update an existing custom template (e.g., change its description or HTML).    | Template details are updated in the database.                                                               |
| TC_CRUD_004  | Attempt to update a system template (should be restricted or handled by admin logic). | Behavior as per design (e.g., non-admin users cannot update, admin users can). This might be out of scope for user-level testing. |
| TC_CRUD_005  | Delete a custom invoice template.                                             | Template is removed from the database.                                                                      |
| TC_CRUD_006  | Attempt to delete a system template (should be restricted).                 | System template cannot be deleted by regular users.                                                         |
| TC_CRUD_007  | Set a custom template as the default for the tenant.                        | The specified template is marked as default for the tenant (mechanism to be confirmed, e.g., in ClientPreferences). |

### 3.3. Template Customization

| Test Case ID | Description                                                                  | Expected Result                                                                                                                               |
| :----------- | :--------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| TC_CUST_001  | Select a template for a new invoice.                                         | The selected template is associated with the invoice.                                                                                         |
| TC_CUST_002  | Customize a selected template by removing an optional field (e.g., notes).   | The field is not present in the generated PDF for that invoice. The underlying template definition might be cloned and modified for this invoice. |
| TC_CUST_003  | Attempt to remove a mandatory field (e.g., `clientName` or `totalAmount`). | Removal is prevented, or an error/warning is shown. The field remains in the generated PDF.                                                 |
| TC_CUST_004  | Add a custom field to a template (if supported by customization UI).         | The custom field appears in the generated PDF with its data.                                                                                  |

### 3.4. PDF Generation

| Test Case ID | Description                                                                                                | Expected Result                                                                                                                                                              |
| :----------- | :--------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC_PDF_001   | Generate a PDF for an invoice using the `classic_professional` template with basic invoice data.           | PDF is generated successfully. Data (company name, client name, items, totals) is correctly populated. Visuals match the template.                                               |
| TC_PDF_002   | Generate a PDF for an invoice using the `modern_invoice` template with detailed invoice data (including GST). | PDF is generated successfully. All data fields, including GSTINs, CGST, SGST, IGST, Place of Supply, are correctly populated. Visuals match the template.                             |
| TC_PDF_003   | Generate a PDF with an invoice having multiple line items.                                                 | All line items are correctly displayed in the PDF.                                                                                                                           |
| TC_PDF_004   | Generate a PDF with an invoice having special characters in data fields.                                   | PDF is generated successfully. Special characters are rendered correctly.                                                                                                    |
| TC_PDF_005   | Generate a PDF for an invoice where some optional fields are empty/null.                                   | PDF is generated successfully. Empty fields are handled gracefully (e.g., shown as blank, or the section is omitted if appropriate by template design).                             |
| TC_PDF_006   | Generate PDF when a non-existent template ID is provided.                                                  | An appropriate error (e.g., NotFoundException) is returned.                                                                                                                  |
| TC_PDF_007   | Generate PDF for an invoice using a custom template.                                                       | PDF is generated successfully based on the custom template's HTML and styling.                                                                                               |

## 4. Test Environment & Tools

-   **Application:** Smart Invoice Generation Module (NestJS Backend)
-   **Database:** PostgreSQL
-   **API Testing Tool:** Postman, or automated tests using Jest/Supertest for NestJS.
-   **PDF Viewer:** Standard PDF viewer for visual verification.

## 5. Test Execution (Simulated - Manual Steps)

Since direct execution of API calls and UI interactions is not possible here, testing will be conceptual, verifying code logic and anticipating outcomes.

1.  **Setup:**
    *   Ensure the NestJS application can be started.
    *   Ensure PostgreSQL is running and the schema (including Phase 1.2 additions) is applied.
    *   Ensure the `TemplateSeedingService` (or equivalent logic) is in place to populate default templates.
2.  **Execution:**
    *   (Conceptual) Start the NestJS application. Verify seeding logs for default templates.
    *   (Conceptual) Use API endpoints (e.g., via Postman or service calls within code) to perform CRUD operations on templates.
    *   (Conceptual) Use API endpoints to create an invoice, then call the `generateInvoicePdf` method in `InvoiceService` with different invoice data and template IDs.
    *   (Conceptual) Inspect the returned PDF buffer (e.g., by saving it to a file and opening it) to verify content and layout against expected results for each test case.

## 6. Reporting

-   Any deviations from expected results will be noted. Since this is a simulated test, the focus will be on identifying potential issues in the implemented code and design.
