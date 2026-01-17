# Phase 1.1: Core Invoice Data & AI-Assisted Creation - Detailed Design

## 1. Introduction

This document provides the detailed design for Phase 1.1 of the Invoice Generation Agent module. This phase focuses on establishing the core invoice data structures, enabling manual invoice creation, and implementing AI-assisted data extraction from uploaded invoice documents using an OCR microservice and a custom parsing module.

This design is based on the recommended "Option 1 (Iterative Approach)" from the `ocr_research_summary_recommendation.md` document, which involves a Python-based Tesseract microservice for OCR and a custom parsing module within the Node.js Invoice Generation Agent for structured data extraction.

## 2. Core Invoice Data Models (PostgreSQL)

These models will reside in the PostgreSQL database and will be managed by the Invoice Generation Agent. All tables will include a `tenant_id` for multi-tenancy.

**Table: `invoices`**

| Column Name          | Data Type                     | Constraints                                  | Description                                                                 |
| -------------------- | ----------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| `id`                 | UUID                          | PRIMARY KEY, DEFAULT gen_random_uuid()       | Unique identifier for the invoice                                           |
| `tenant_id`          | UUID                          | NOT NULL, FOREIGN KEY (references tenants.id) | Identifier for the tenant owning this invoice                             |
| `client_id`          | UUID                          | NULL, FOREIGN KEY (references clients.id)    | Identifier for the client (if applicable)                                   |
| `invoice_number`     | VARCHAR(255)                  | NOT NULL                                     | Invoice number (can be user-defined or system-generated)                    |
| `issue_date`         | DATE                          | NOT NULL                                     | Date the invoice was issued                                                 |
| `due_date`           | DATE                          | NULL                                         | Date the invoice is due                                                     |
| `status`             | VARCHAR(50)                   | NOT NULL, DEFAULT 'draft'                    | e.g., 'draft', 'sent', 'paid', 'overdue', 'void'                            |
| `currency`           | VARCHAR(3)                    | NOT NULL, DEFAULT 'INR'                      | ISO 4217 currency code                                                      |
| `sub_total`          | DECIMAL(12, 2)                | NOT NULL, DEFAULT 0.00                       | Total amount before taxes and discounts                                     |
| `total_tax_amount`   | DECIMAL(12, 2)                | NOT NULL, DEFAULT 0.00                       | Total amount of all taxes                                                   |
| `total_discount_amount`| DECIMAL(12, 2)                | NOT NULL, DEFAULT 0.00                       | Total amount of all discounts                                               |
| `grand_total`        | DECIMAL(12, 2)                | NOT NULL, DEFAULT 0.00                       | Final amount due (sub_total + total_tax_amount - total_discount_amount)     |
| `amount_paid`        | DECIMAL(12, 2)                | NOT NULL, DEFAULT 0.00                       | Amount already paid by the client                                           |
| `balance_due`        | DECIMAL(12, 2)                | NOT NULL, DEFAULT 0.00                       | Remaining balance (grand_total - amount_paid)                               |
| `notes`              | TEXT                          | NULL                                         | General notes for the invoice                                               |
| `terms_and_conditions`| TEXT                          | NULL                                         | Terms and conditions (placeholder for TCA integration)                      |
| `template_id`        | UUID                          | NULL, FOREIGN KEY (references invoice_templates.id) | Identifier for the invoice template used (Phase 1.2)                      |
| `ai_extraction_source`| VARCHAR(255)                  | NULL                                         | Identifier for the uploaded document if AI-assisted (e.g., file name/ID)    |
| `created_at`         | TIMESTAMP WITH TIME ZONE      | NOT NULL, DEFAULT CURRENT_TIMESTAMP          | Timestamp of creation                                                       |
| `updated_at`         | TIMESTAMP WITH TIME ZONE      | NOT NULL, DEFAULT CURRENT_TIMESTAMP          | Timestamp of last update                                                    |

**Table: `invoice_line_items`**

| Column Name      | Data Type        | Constraints                                  | Description                                                              |
| ---------------- | ---------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| `id`             | UUID             | PRIMARY KEY, DEFAULT gen_random_uuid()       | Unique identifier for the line item                                      |
| `invoice_id`     | UUID             | NOT NULL, FOREIGN KEY (references invoices.id) | Foreign key to the `invoices` table                                      |
| `tenant_id`      | UUID             | NOT NULL                                     | Identifier for the tenant (denormalized for easier querying, optional)   |
| `description`    | TEXT             | NOT NULL                                     | Description of the product or service                                    |
| `quantity`       | DECIMAL(10, 2)   | NOT NULL, DEFAULT 1.00                       | Quantity of the product or service                                       |
| `unit_price`     | DECIMAL(12, 2)   | NOT NULL                                     | Price per unit                                                           |
| `item_sub_total` | DECIMAL(12, 2)   | NOT NULL                                     | Total for this line item before tax/discount (quantity * unit_price)     |
| `tax_rate_id`    | UUID             | NULL                                         | Foreign key to a future tax_rates table (Phase 1.3)                      |
| `tax_amount`     | DECIMAL(12, 2)   | NOT NULL, DEFAULT 0.00                       | Tax amount for this line item                                            |
| `discount_amount`| DECIMAL(12, 2)   | NOT NULL, DEFAULT 0.00                       | Discount amount for this line item                                       |
| `line_total`     | DECIMAL(12, 2)   | NOT NULL                                     | Final total for this line item (item_sub_total + tax_amount - discount_amount) |
| `product_id`     | UUID             | NULL                                         | Foreign key to a future product_catalog table (Enhancement)              |
| `order_index`    | INTEGER          | NOT NULL, DEFAULT 0                          | To maintain the order of line items                                      |

*(Note: Client, Tenant, Invoice Template, Tax Rate, Product Catalog tables are referenced but their detailed design will be part of their respective modules/phases.)*

## 3. Python Tesseract Microservice Design

This microservice will be responsible for OCR.

*   **Technology:** Python (e.g., Flask or FastAPI framework).
*   **Deployment:** Docker container.

### 3.1. API Endpoint

*   **Endpoint:** `POST /ocr-service/v1/extract-text`
*   **Request Type:** `multipart/form-data`
*   **Input:**
    *   `image`: The invoice image file (formats: PNG, JPG, TIFF, PDF - first page for PDF initially).
*   **Output (Success - 200 OK):**
    ```json
    {
      "status": "success",
      "extracted_text": "...raw text extracted from the document...",
      "processing_time_ms": 1234
    }
    ```
*   **Output (Error - e.g., 400, 500):**
    ```json
    {
      "status": "error",
      "message": "Error description...",
      "error_code": "OCR_PROCESSING_FAILED" // (or similar)
    }
    ```

### 3.2. Internal Workflow

1.  **Receive Image:** Get the image file from the request.
2.  **Image Pre-processing (using OpenCV or Pillow):**
    *   Convert to grayscale.
    *   Apply binarization (e.g., Otsu's thresholding).
    *   Noise reduction (e.g., Gaussian blur if needed, carefully).
    *   Deskewing (if significant skew is detected).
    *   Resolution check/upscaling if DPI is too low (target ~300 DPI for Tesseract).
3.  **Tesseract OCR Execution:**
    *   Use `pytesseract` library to call Tesseract.
    *   Specify language (e.g., `eng`).
    *   Configuration options (e.g., Page Segmentation Mode - PSM, OCR Engine Mode - OEM) might be tuned.
4.  **Return Raw Text:** Send the extracted raw text in the JSON response.

## 4. Custom Parsing Module (within Node.js Invoice Generation Agent)

This module will be part of the Invoice Generation Agent's Service Layer.

*   **Input:** Raw text string (from the Tesseract Microservice).
*   **Output:** A structured JSON object representing the pre-filled invoice data.

### 4.1. Logic & Field Extraction Strategy (Initial - Rule-Based)

This will be an iterative process. Start with common patterns.

*   **Invoice Number:** Look for keywords like "Invoice No", "Invoice #", "INV-" followed by alphanumeric patterns. Use regex.
*   **Invoice Date / Issue Date:** Look for keywords like "Date", "Invoice Date", "Issued on" followed by common date formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD Mon YYYY). Use regex and date parsing libraries.
*   **Due Date:** Similar to Invoice Date, look for "Due Date", "Payment Due".
*   **Vendor Name/Details:** Often at the top. May require looking for company suffixes (Ltd, Inc.) or specific keywords if not clearly labeled. Initially, might be harder to reliably extract without more advanced techniques or template-based hints.
*   **Client Name/Details:** Look for sections like "Bill To", "To", "Customer".
*   **Line Items:** This is the most complex part.
    *   Identify table-like structures by looking for headers like "Description", "Item", "Quantity", "Qty", "Unit Price", "Rate", "Amount", "Total".
    *   Attempt to parse lines based on columnar alignment or consistent delimiters (if any).
    *   Extract: Description (text), Quantity (numeric), Unit Price (currency), Line Total (currency).
*   **Subtotal:** Look for keywords "Subtotal", "Sub-total", "Total before tax" followed by a currency amount.
*   **Tax Amounts:** Look for keywords like "GST", "VAT", "Tax", "CGST", "SGST", "IGST" often associated with percentages and amounts.
*   **Grand Total:** Look for keywords "Grand Total", "Total Due", "Amount Due", "Net Amount" followed by a currency amount (often the largest, most prominent amount at the bottom).

### 4.2. Output Structure (Example)

```json
{
  "invoice_number": "INV-2024-001",
  "issue_date": "2024-05-07",
  "due_date": "2024-06-06",
  "vendor_name": "Supplier Co.", // Extracted if possible
  "client_name": "Buyer Ltd.",   // Extracted if possible
  "currency": "INR", // Attempt to infer or default
  "line_items": [
    { "description": "Product A", "quantity": 2, "unit_price": 100.00, "line_total": 200.00 },
    { "description": "Service B", "quantity": 1, "unit_price": 50.00, "line_total": 50.00 }
  ],
  "sub_total": 250.00,
  "total_tax_amount": 45.00, // Sum of identified taxes
  "grand_total": 295.00
}
```

## 5. API Endpoints for Invoice Generation Agent (Phase 1.1 Focus)

These are part of the Invoice Generation Agent (Node.js).

1.  **`POST /api/v1/invoices/upload-for-ai-assist`**
    *   **Request:** `multipart/form-data` with `invoice_document` (file).
    *   **Workflow:**
        1.  Receives the document.
        2.  Calls the Python Tesseract Microservice (`/ocr-service/v1/extract-text`) with the document.
        3.  Receives raw text from the OCR service.
        4.  Passes raw text to the Custom Parsing Module.
        5.  Receives structured JSON from the parsing module.
        6.  Returns this structured JSON as a pre-filled invoice draft to the client.
    *   **Response (Success):** HTTP 200 with the structured JSON (as shown in 4.2).
    *   **Response (Error):** Appropriate HTTP error codes (400, 500, 502 if OCR service fails) with error details.

2.  **`POST /api/v1/invoices`**
    *   **Request:** JSON body containing complete invoice data (can be from AI-assisted pre-fill, then user-modified, or purely manual entry).
    *   **Workflow:** Validates data, calculates totals/balances, saves to `invoices` and `invoice_line_items` tables.
    *   **Response (Success):** HTTP 201 with the created invoice object (including its new `id`).

3.  **`GET /api/v1/invoices/{invoice_id}`**
    *   **Request:** Path parameter `invoice_id`.
    *   **Workflow:** Retrieves the specified invoice and its line items.
    *   **Response (Success):** HTTP 200 with the invoice object.

4.  **`PUT /api/v1/invoices/{invoice_id}`**
    *   **Request:** Path parameter `invoice_id`, JSON body with fields to update.
    *   **Workflow:** Validates data, updates the invoice and/or its line items. Recalculates totals if necessary.
    *   **Response (Success):** HTTP 200 with the updated invoice object.

## 6. Validation Logic

To be applied in the Invoice Generation Agent's Service Layer before database operations:

*   **Data Types:** Ensure all fields match their defined data types (e.g., dates are valid dates, numbers are numeric).
*   **Required Fields:** `invoice_number`, `issue_date`, `currency`, `line_items` (at least one), line item `description`, `quantity`, `unit_price`.
*   **Formats:** Date formats, currency codes.
*   **Numeric Constraints:** Amounts should generally be non-negative (or within logical bounds).
*   **Consistency:** `grand_total` should correctly reflect `sub_total`, `tax_amount`, and `discount_amount` (server-side calculation is preferred to ensure accuracy).
*   `balance_due` = `grand_total` - `amount_paid`.

## 7. Error Handling

*   **OCR Service Errors:** If the Python Tesseract Microservice fails (e.g., can't process image, Tesseract error), the Invoice Generation Agent should catch this and return an appropriate error to the client (e.g., HTTP 502 Bad Gateway or 500 Internal Server Error with a clear message).
*   **Parsing Errors:** If the Custom Parsing Module cannot extract meaningful data or encounters issues, it should gracefully handle this. The API might return a partially filled draft or an error indicating extraction was not successful.
*   **Validation Errors:** Return HTTP 400 Bad Request with clear messages indicating which fields failed validation and why.
*   **Database Errors:** General HTTP 500 for unexpected database issues.

This detailed design provides a starting point for the development of Phase 1.1. It will be refined as implementation progresses.
