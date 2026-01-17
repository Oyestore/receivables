# Invoice Generation Agent: Detailed Scope and Requirements

This document outlines the detailed scope and requirements for the **Invoice Generation Agent module** of the SME Receivables Management Platform. This module is foundational and will be developed in a phased approach.

## Overall Goals for the Module:

*   To provide SMEs with a robust and flexible system for creating, managing, and distributing accurate and compliant invoices.
*   To leverage AI for simplifying and automating aspects of invoice creation.
*   To ensure compliance with Indian taxation systems, particularly GST.
*   To support multi-tenancy, allowing different SME organizations to manage their invoicing independently and securely.
*   To be modular, allowing for future enhancements and integration with other platform agents.

## Phase 1.1: Core Invoice Data, Validation & AI-Assisted Creation

This phase focuses on establishing the fundamental invoice data structures, robust manual creation with validation, and integrating AI for data extraction from uploaded documents.

### 1.1.1 Core Invoice Data Model:

*   **Fields to include (extending existing basic invoice fields):**
    *   Unique Invoice ID (system-generated, human-readable option)
    *   Tenant ID (for multi-tenancy)
    *   Organization ID (SME issuing the invoice)
    *   Customer/Buyer ID (linking to a customer record)
        *   Customer Name
        *   Customer Billing Address (Street, City, State, PIN, Country)
        *   Customer Shipping Address (if different)
        *   Customer GSTIN
        *   Customer Contact Person, Email, Phone
    *   Invoice Date
    *   Due Date
    *   Payment Terms (e.g., Net 30, Due on Receipt - initially text, later linked to Terms Agent)
    *   Purchase Order (PO) Number (optional)
    *   Invoice Line Items (Array/List):
        *   Item/Service Description
        *   HSN/SAC Code
        *   Quantity
        *   Unit Price
        *   Discount (Percentage or Amount per item)
        *   Taxable Value
        *   CGST Rate & Amount
        *   SGST/UTGST Rate & Amount
        *   IGST Rate & Amount
        *   Cess Rate & Amount
        *   Total Amount per item
    *   Subtotal (sum of taxable values of all items)
    *   Total Discount (sum of all item discounts)
    *   Total Taxable Amount (Subtotal - Total Discount)
    *   Total CGST Amount
    *   Total SGST/UTGST Amount
    *   Total IGST Amount
    *   Total Cess Amount
    *   Total Invoice Amount (Payable)
    *   Amount in Words
    *   Invoice Status (e.g., Draft, Sent, Partially Paid, Paid, Overdue, Cancelled, Disputed)
    *   Notes/Remarks (for internal or external use)
    *   Attachments (e.g., supporting documents, contracts)
    *   Currency (Default INR, with potential for future multi-currency support)
    *   Place of Supply (for GST determination)
    *   Reverse Charge (Yes/No)
    *   E-way Bill Number (if applicable, placeholder for now)
    *   IRN (Invoice Reference Number for e-invoicing, placeholder for now)
    *   QR Code Data (for e-invoicing, placeholder for now)
    *   SME Bank Account Details (for payment)
    *   SME Logo and Branding elements (link to organization settings)
    *   Digital Signature placeholder
    *   Audit Trail (Created By/At, Updated By/At)

### 1.1.2 Robust Invoice Creation & Validation (Manual & API):

*   **User Interface (UI) for manual invoice creation/editing:**
    *   Intuitive forms for all fields listed in 1.1.1.
    *   Dynamic calculation of totals, taxes, and amount in words as data is entered.
    *   Ability to add/remove/reorder line items easily.
    *   Search/select existing customers or add new ones.
    *   Date pickers for invoice date and due date.
*   **Input Validations (Client-side and Server-side):**
    *   Mandatory fields check (e.g., customer, invoice date, line items).
    *   Data type validation (e.g., numbers for amounts, valid dates).
    *   GSTIN format validation.
    *   HSN/SAC code format validation (basic check).
    *   Prevention of duplicate invoice numbers (per tenant).
    *   Logical checks (e.g., due date not before invoice date).
    *   Line item amounts must be positive.
*   **API Endpoints:**
    *   `POST /api/invoices` (Create new invoice)
    *   `GET /api/invoices` (List invoices with filtering/pagination)
    *   `GET /api/invoices/{id}` (Get specific invoice)
    *   `PUT /api/invoices/{id}` (Update existing invoice - with restrictions based on status)
    *   `DELETE /api/invoices/{id}` (Cancel/delete invoice - with restrictions)

### 1.1.3 AI-Assisted Data Extraction (OCR Integration - Deepseek R1):

*   **Functionality:** Allow users to upload an existing invoice document (PDF, common image formats).
*   **AI Service (`ai_service.py` enhancement):**
    *   The AI service will use Deepseek R1 (or other suitable OCR/NLP model) to parse the uploaded document.
    *   Extract key invoice fields: Seller Name (for verification), Buyer Name, Buyer GSTIN, Invoice Number, Invoice Date, Due Date, Line Items (Description, Quantity, Unit Price, Amount), Subtotal, Taxes (CGST, SGST, IGST, Cess if identifiable), Total Amount.
    *   Return the extracted data in a structured JSON format.
*   **Frontend Integration:**
    *   Provide an option "Create from Upload" or similar.
    *   User uploads the document.
    *   Frontend calls the backend, which in turn calls the AI service.
    *   The extracted data pre-populates the new invoice form.
    *   User reviews, corrects (if necessary), and completes any missing fields before saving.
*   **Confidence Scores:** (Optional, advanced) If the AI model provides confidence scores for extracted fields, display these to the user to guide their review.
*   **Focus:** Initial focus on common invoice layouts. Continuous improvement of the model for varied formats will be an ongoing process.

## Phase 1.2: Advanced Invoice Template Management

This phase focuses on providing users with flexible and customizable invoice templates.

### 1.2.1 Template System Architecture:

*   **Storage:** Store template designs and configurations (e.g., JSON or a dedicated format).
*   **Rendering Engine:** A backend mechanism to render invoice data into a visual format (e.g., PDF) based on the selected template.

### 1.2.2 Default Templates:

*   Provide a set of professionally designed default invoice templates catering to various industries or common use cases (e.g., service-based, product-based, GST compliant).

### 1.2.3 Template Customization:

*   **UI for Template Management:**
    *   List available templates (default and custom).
    *   Preview templates.
    *   Select a default template for the organization.
    *   Option to create new templates or customize existing ones.
*   **Customization Options (Visual Editor or Configuration-based):**
    *   Logo placement and size.
    *   Color schemes and fonts.
    *   Show/hide specific invoice fields (e.g., PO number, shipping address if not applicable).
    *   Customize header/footer sections (e.g., add bank details, terms & conditions, authorized signatory).
    *   Adjust column widths and order for line items.
    *   Add custom fields/labels.
    *   Support for multiple pages for long invoices.

### 1.2.4 Template Assignment:

*   Allow users to set a default template for their organization.
*   Option to override the default template for a specific invoice during creation.

### 1.2.5 PDF Generation:

*   Generate professional-looking PDF versions of invoices using the selected template.
*   Ensure accurate rendering of all data, including taxes and totals.

## Phase 1.3: Customizable Tax Engine (Indian GST & Other Taxes)

This phase focuses on building a flexible and compliant tax calculation sub-module.

### 1.3.1 Tax Configuration Management:

*   **UI for Tax Settings (Admin/Tenant Level):**
    *   Define and manage different tax types (e.g., GST, VAT - though GST is primary for India).
    *   Configure GST tax rates (CGST, SGST/UTGST, IGST slabs - e.g., 0%, 5%, 12%, 18%, 28%). Allow updates as rates change.
    *   Configure Cess rates applicable to specific HSN/SAC codes or items.
    *   Define default HSN/SAC codes and their associated tax rates for common items/services used by the SME.
*   **Logic for Tax Applicability:**
    *   Intra-state vs. Inter-state supply determination (based on SME location and Place of Supply).
        *   If Intra-state: Apply CGST + SGST/UTGST.
        *   If Inter-state: Apply IGST.
    *   Rules for applying Cess based on item/service.
    *   Handling of Reverse Charge Mechanism (RCM) if applicable.
    *   Exempted/Nil-rated/Non-GST supplies.

### 1.3.2 Automated Tax Calculation:

*   During invoice creation (manual or AI-assisted):
    *   Automatically calculate CGST, SGST/UTGST, IGST, and Cess for each line item based on:
        *   Taxable value of the item.
        *   HSN/SAC code of the item and its linked tax rates.
        *   Place of Supply.
        *   Organization's GST registration state.
    *   Sum up taxes for the entire invoice.
*   Display tax breakdown clearly on the invoice form and the final PDF.

### 1.3.3 Tax Compliance & Reporting (Placeholders):

*   While full GST reporting (GSTR-1, etc.) is a larger module, the tax engine should store data in a way that facilitates future report generation.
*   Ensure calculations are compliant with current Indian GST laws.

### 1.3.4 Customization & Extensibility:

*   Design the tax engine to be adaptable to potential future changes in tax laws or the introduction of new taxes.
*   Allow for defining custom tax rules if needed (within compliance boundaries).

## Non-Functional Requirements for the Module:

*   **Performance:** Fast invoice generation, especially PDF rendering and AI data extraction.
*   **Accuracy:** Tax calculations and data representation must be 100% accurate.
*   **Security:** Secure handling of invoice data and template configurations, respecting multi-tenancy.
*   **Usability:** Intuitive interface for creating invoices, managing templates, and configuring taxes.
*   **Modularity:** The tax engine and template manager should be designed as sub-modules that can be independently updated or enhanced.

This detailed scope will guide the design and implementation of the Invoice Generation Agent module. We will refer back to this document and refine it as needed during the development process.
