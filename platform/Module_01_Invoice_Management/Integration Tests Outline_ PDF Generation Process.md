# Integration Tests Outline: PDF Generation Process

This document outlines integration tests for the end-to-end PDF generation process, ensuring it correctly integrates with TemplateModule, UserDataSourceModule, and ConditionalLogicService.

**Environment Setup:**
-   NestJS testing environment (`Test.createTestingModule`).
-   In-memory database (e.g., SQLite) or a dedicated test PostgreSQL instance for `InvoiceTemplateMaster`, `InvoiceTemplateVersion`, and `UserDefinedDataSource` entities.
-   Supertest for HTTP requests if testing via an API endpoint (e.g., a conceptual `/api/invoices/generate-pdf` endpoint), or direct service testing.
-   Valid JWT token if testing via an authenticated API endpoint.
-   Sample invoice data (JSON).
-   Sample GrapesJS template definitions, some with conditional logic and placeholders for external data.
-   Mock `UserDataSourceFetchingService` for controlled testing of external data fetching, or use actual (but simple and reliable) external mock APIs/files.
-   Playwright (or the PDF generation library used) should be functional in the test environment.

**Services Involved:**
-   `PdfGenerationService` (Primary service under test)
-   `TemplateService` (To fetch template versions)
-   `UserDataSourceService` (To fetch data source definitions)
-   `UserDataSourceFetchingService` (To fetch data from external sources)
-   `ConditionalLogicService` (To evaluate conditions within the template)

**Authentication (if applicable for an endpoint):**
-   If PDF generation is triggered via an API, it likely requires JWT authentication.

## Test Suites and Scenarios:

### 1. Basic PDF Generation (No External Data, No Conditional Logic)

*   **Scenario 1.1: Successfully generate a PDF from a simple template and invoice data.**
    *   Setup: An `InvoiceTemplateVersion` with basic HTML/CSS and placeholders (e.g., `{{invoice.total}}`, `{{customer.name}}`).
    *   Input: `templateMasterId`, `templateVersionNumber` (or logic to pick latest), and `invoiceData` JSON.
    *   Expected Output: A valid PDF byte stream. Content of the PDF should correctly reflect the `invoiceData` merged into the template.
    *   Verification: Manually inspect PDF or use PDF parsing tools to check content.
*   **Scenario 1.2: Generate PDF with complex template structure (tables, multiple sections).**
    *   Setup: An `InvoiceTemplateVersion` with a more complex layout.
    *   Input: `templateMasterId`, `templateVersionNumber`, `invoiceData`.
    *   Expected Output: Valid PDF with correct layout and data.
*   **Scenario 1.3: Handle missing template version.**
    *   Input: Non-existent `templateMasterId` or `templateVersionNumber`.
    *   Expected Behavior: Service throws a `NotFoundException` or appropriate error.
*   **Scenario 1.4: Handle missing invoice data fields referenced in the template.**
    *   Input: `invoiceData` missing some fields that the template tries to render.
    *   Expected Output: PDF generates, but missing fields are rendered as empty strings or a predefined placeholder (e.g., "N/A"). No crashes.

### 2. PDF Generation with User-Defined Data Sources

*   **Scenario 2.1: Successfully generate PDF with data fetched from a User-Defined REST API source.**
    *   Setup:
        *   An `InvoiceTemplateVersion` with placeholders for external data (e.g., `{{external.product_details.price}}`).
        *   A `UserDefinedDataSource` (REST API, No Auth) configured to point to a mock API endpoint that returns structured JSON (e.g., `{"product_details": {"price": 100}}`).
    *   Input: `templateMasterId`, `templateVersionNumber`, `invoiceData`, and `dataSourceIds` (list containing the ID of the configured data source).
    *   Expected Output: Valid PDF. Placeholders for external data are correctly filled with data from the mock API.
    *   Verification: `UserDataSourceFetchingService.fetchData` is called for the specified data source. Data is merged correctly.
*   **Scenario 2.2: Successfully generate PDF with data from multiple User-Defined Data Sources.**
    *   Setup: Template with placeholders for data from two different sources. Two `UserDefinedDataSource` entries.
    *   Input: `templateMasterId`, `templateVersionNumber`, `invoiceData`, `dataSourceIds` (list of two IDs).
    *   Expected Output: Valid PDF with data from both sources correctly merged and rendered.
*   **Scenario 2.3: Handle errors during User-Defined Data Source fetching.**
    *   Setup: `UserDefinedDataSource` configured to an endpoint that will return an error (e.g., 404, 500) or is unreachable.
    *   Input: `templateMasterId`, `templateVersionNumber`, `invoiceData`, `dataSourceIds`.
    *   Expected Behavior: PDF generation might proceed with available data (graceful degradation), or an error is logged, and generation might fail or proceed with a warning in the PDF, depending on desired error handling strategy. The test should verify the chosen strategy.
    *   Verification: `UserDataSourceFetchingService.fetchData` is called, and its error is handled by `PdfGenerationService`.
*   **Scenario 2.4: Data from User-Defined Source overrides primary invoice data if keys conflict (or verify defined precedence).**
    *   Setup: `invoiceData` has `{"item": {"name": "Primary"}}`. External data source returns `{"item": {"name": "External"}}`.
    *   Input: Template uses `{{item.name}}`.
    *   Expected Output: PDF shows "External" (or "Primary" depending on the defined merge strategy). Test verifies this precedence.

### 3. PDF Generation with Conditional Logic

*   **Scenario 3.1: Successfully generate PDF where a section is SHOWN based on a true condition.**
    *   Setup: `InvoiceTemplateVersion` with a component having `data-gjs-conditions` (e.g., show if `invoice.total > 500`).
    *   Input: `invoiceData` where `invoice.total = 600`.
    *   Expected Output: Valid PDF. The conditional section is visible.
    *   Verification: `ConditionalLogicService.evaluateAllConditionGroups` is called. The HTML passed to Playwright is modified (or Playwright script handles visibility).
*   **Scenario 3.2: Successfully generate PDF where a section is HIDDEN based on a false condition.**
    *   Setup: Same template as 3.1.
    *   Input: `invoiceData` where `invoice.total = 400`.
    *   Expected Output: Valid PDF. The conditional section is NOT visible.
*   **Scenario 3.3: Conditional logic uses data from a User-Defined Data Source.**
    *   Setup:
        *   `InvoiceTemplateVersion` with a component having `data-gjs-conditions` (e.g., show if `external_data.customer_status == "premium"`).
        *   `UserDefinedDataSource` that provides `{"customer_status": "premium"}`.
    *   Input: `templateMasterId`, `templateVersionNumber`, `invoiceData`, `dataSourceIds`.
    *   Expected Output: Valid PDF. The conditional section is visible.
*   **Scenario 3.4: Complex conditional logic (multiple groups, AND/OR).**
    *   Setup: Template with complex conditions.
    *   Input: `invoiceData` and potentially external data that satisfies/fails parts of the complex logic.
    *   Expected Output: PDF correctly reflects the outcome of the complex conditional logic.
*   **Scenario 3.5: Handle errors in conditional logic evaluation (e.g., malformed condition data - though this should be caught earlier).**
    *   Setup: A template version with a syntactically incorrect `data-gjs-conditions` attribute (if possible to create, ideally validated on save).
    *   Expected Behavior: Graceful error handling. PDF might generate without the problematic conditional element, or an error is logged. Test verifies the behavior.

### 4. PDF Generation with Combined Features (External Data + Conditional Logic)

*   **Scenario 4.1: A section is shown/hidden based on a condition that uses data from both primary invoice data and a fetched user-defined data source.**
    *   Setup: Template condition like `(invoice.total > 100) AND (external.region == "North")`.
    *   Input: `invoiceData` with `total = 200`. `UserDefinedDataSource` provides `{"region": "North"}`.
    *   Expected Output: Conditional section is visible.
    *   Input 2: `invoiceData` with `total = 50`. `UserDefinedDataSource` provides `{"region": "North"}`.
    *   Expected Output 2: Conditional section is hidden.

### 5. Error Handling and Edge Cases in PDF Generation Service

*   **Scenario 5.1: Playwright/PDF library fails during PDF conversion.**
    *   Setup: Induce an error in the PDF conversion step (e.g., by providing severely malformed HTML if possible, or mocking the library to throw an error).
    *   Expected Behavior: `PdfGenerationService` catches the error and throws an appropriate internal server error or specific PDF generation error.
*   **Scenario 5.2: Very large invoice data or template.**
    *   Input: Large `invoiceData` or a template that generates many pages.
    *   Expected Output: PDF generates successfully without excessive memory consumption or timeouts (within reasonable limits).
*   **Scenario 5.3: Template with complex CSS or JavaScript (if JS execution is enabled before PDFing).**
    *   Setup: Template using advanced CSS features or client-side JS for rendering.
    *   Expected Output: PDF renders correctly, reflecting the applied CSS and outcomes of JS (if applicable).

**General Considerations:**
-   Focus on the `PdfGenerationService.generatePdf` method and its interactions.
-   Ensure database state is managed correctly (templates, data sources created for tests are cleaned up).
-   Validate that the HTML content passed to the PDF generation engine (Playwright) is correctly modified by the conditional logic service before PDF conversion.
-   For PDF content verification, consider snapshot testing of PDF text content or structure if feasible with available tools.

