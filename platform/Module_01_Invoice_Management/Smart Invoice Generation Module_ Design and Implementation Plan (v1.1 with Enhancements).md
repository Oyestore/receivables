# Smart Invoice Generation Module: Design and Implementation Plan (v1.1 with Enhancements)

**Date:** May 08, 2025

## 1. Introduction

This document outlines the design and implementation plan for the Smart Invoice Generation Module, a key component of the SME Receivables Management Platform. This module is designed to handle the creation, management, and processing of invoices, incorporating AI-assisted data extraction, template management, tax calculations, and additional workflow enhancements, with a focus on the requirements outlined for Phase 1.1.

This plan synthesizes information from the `phase_1_1_detailed_design.md`, `Invoice Generation Agent_ Module Specifications.md`, and `invoice_enhancement_suggestions.md` documents, along with other provided resources and knowledge items.

## 2. Scope (Phase 1.1)

Phase 1.1 will focus on delivering the following core functionalities and enhancements:

*   **Robust Invoice Data Structure:** Implementation of PostgreSQL database schemas for invoices and line items, supporting multi-tenancy.
*   **Manual Invoice Creation:** Allowing users to create invoices manually through a user interface, with comprehensive validation.
*   **AI-Assisted Invoice Creation:**
    *   Integration with a Python-based Tesseract OCR microservice to extract raw text from uploaded existing invoice documents (PDFs/images).
    *   A custom parsing module (within the Node.js Invoice Generation Agent) to process the raw text and pre-fill invoice fields.
    *   Target fields for extraction: Invoice Number, Issue Date, Due Date, Vendor/Client details (best effort), Line Items (Description, Quantity, Unit Price, Line Total), Subtotal, Tax Amounts, and Grand Total.
*   **Core API Endpoints:** Development of RESTful APIs for invoice creation (manual and AI-assisted), retrieval, and updates.
*   **Workflow Enhancements (from `invoice_enhancement_suggestions.md`):
    *   **Recurring Invoices:** Functionality to define and manage scheduled invoice generation.
    *   **Duplicate/Copy Invoice:** Feature to easily duplicate existing invoices.
    *   **Product/Service Catalog Management:** Basic catalog for tenants to manage standard items (name, description, default price, default tax applicability).
    *   **Client-Specific Defaults:** Ability to set default values at the client level (e.g., payment terms, notes, preferred template).
    *   **Enhanced Real-time Invoice Preview & Robust Validation:** Improved UI/UX for invoice creation with real-time preview (frontend focus) and comprehensive backend validation.
    *   **Simple Invoice Import from Structured Data (e.g., CSV/Excel):** Basic bulk import functionality for invoices or line items.

## 3. Architecture

The Smart Invoice Generation Module will be a self-contained backend module, adhering to a layered architecture as specified in the `Invoice Generation Agent_ Module Specifications.md` (Section 7).

### 3.1. High-Level Components:

1.  **API Layer (Controller Layer - Node.js with NestJS recommended)**
2.  **Service Layer (Business Logic Layer - Node.js/NestJS)**
3.  **Data Access Layer (DAL - Node.js/NestJS with Sequelize ORM)**
4.  **AI Integration Service Client (Node.js/NestJS)**
5.  **Python Tesseract OCR Microservice (Python with Flask/FastAPI)**

### 3.2. Internal Sub-modules (Logical Grouping within Service Layer):

*   **Core Invoice Processing Engine:** Manages invoice lifecycle, validation, AI-assist workflow, recurring invoice logic, duplication, and CSV import.
*   **Custom Parsing Module:** Processes raw text from OCR.
*   **Product/Service Catalog Management Module:** Handles CRUD for catalog items.
*   **Client Preferences Module:** Manages client-specific defaults.

## 4. Data Models (PostgreSQL)

The primary data models will be `invoices` and `invoice_line_items` as detailed in `phase_1_1_detailed_design.md` (Section 2). Additional models or extensions for Phase 1.1 enhancements:

*   **`invoices` table:** (As previously defined)
*   **`invoice_line_items` table:** (As previously defined, may link to `product_service_catalog.id`)
*   **`product_service_catalog` table (New):**
    | Column Name          | Data Type      | Constraints                            |
    | -------------------- | -------------- | -------------------------------------- |
    | `id`                 | UUID           | PRIMARY KEY, DEFAULT gen_random_uuid() |
    | `tenant_id`          | UUID           | NOT NULL                               |
    | `item_name`          | VARCHAR(255)   | NOT NULL                               |
    | `description`        | TEXT           | NULL                                   |
    | `default_unit_price` | DECIMAL(12, 2) | NULL                                   |
    | `default_tax_id`     | UUID           | NULL (FK to future tax_rates table)  |
    | `created_at`         | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP    |
    | `updated_at`         | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP    |
*   **`recurring_invoice_profiles` table (New):**
    | Column Name        | Data Type                     | Constraints                            |
    | ------------------ | ----------------------------- | -------------------------------------- |
    | `id`               | UUID                          | PRIMARY KEY, DEFAULT gen_random_uuid() |
    | `tenant_id`        | UUID                          | NOT NULL                               |
    | `client_id`        | UUID                          | NOT NULL (FK to clients table)         |
    | `source_invoice_id`| UUID                          | NULL (FK to invoices, for template)    |
    | `frequency`        | VARCHAR(50)                   | NOT NULL (e.g., 'monthly', 'weekly')   |
    | `start_date`       | DATE                          | NOT NULL                               |
    | `end_date`         | DATE                          | NULL                                   |
    | `next_run_date`    | DATE                          | NULL                                   |
    | `status`           | VARCHAR(50)                   | NOT NULL DEFAULT 'active'              |
    | `created_at`       | TIMESTAMP WITH TIME ZONE      | NOT NULL, DEFAULT CURRENT_TIMESTAMP    |
    | `updated_at`       | TIMESTAMP WITH TIME ZONE      | NOT NULL, DEFAULT CURRENT_TIMESTAMP    |
*   **`client_preferences` table (New or extend `clients` table):**
    | Column Name               | Data Type     | Constraints                            |
    | ------------------------- | ------------- | -------------------------------------- |
    | `id`                      | UUID          | PRIMARY KEY, DEFAULT gen_random_uuid() |
    | `tenant_id`               | UUID          | NOT NULL                               |
    | `client_id`               | UUID          | NOT NULL, UNIQUE (FK to clients table) |
    | `default_payment_terms`   | TEXT          | NULL                                   |
    | `default_notes`           | TEXT          | NULL                                   |
    | `default_invoice_template_id` | UUID      | NULL (FK to future templates table)    |
    | `created_at`              | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP    |
    | `updated_at`              | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP    |

## 5. API Endpoints (Phase 1.1 Focus - Expanded)

Based on `phase_1_1_detailed_design.md` and new enhancements:
*   **Invoices:**
    *   `POST /api/v1/invoices/upload-for-ai-assist`
    *   `POST /api/v1/invoices`
    *   `GET /api/v1/invoices/{invoice_id}`
    *   `PUT /api/v1/invoices/{invoice_id}`
    *   `POST /api/v1/invoices/{invoice_id}/duplicate` (New)
    *   `POST /api/v1/invoices/import-csv` (New)
*   **Product/Service Catalog (New):**
    *   `POST /api/v1/products-services`
    *   `GET /api/v1/products-services`
    *   `GET /api/v1/products-services/{item_id}`
    *   `PUT /api/v1/products-services/{item_id}`
    *   `DELETE /api/v1/products-services/{item_id}`
*   **Recurring Invoices (New):**
    *   `POST /api/v1/recurring-invoices`
    *   `GET /api/v1/recurring-invoices`
    *   `GET /api/v1/recurring-invoices/{profile_id}`
    *   `PUT /api/v1/recurring-invoices/{profile_id}`
    *   `DELETE /api/v1/recurring-invoices/{profile_id}`
*   **Client Preferences (New - example, might be part of client CRUD):**
    *   `GET /api/v1/clients/{client_id}/preferences`
    *   `PUT /api/v1/clients/{client_id}/preferences`

## 6. Technology Stack

(As previously defined - Node.js/NestJS, Python/Flask, PostgreSQL, Sequelize, Tesseract, OpenCV/Pillow, Docker. PDF generation with WeasyPrint/FPDF2 for future phases or preview if needed in 1.1.)

## 7. Key Features and Considerations

(As previously defined, now explicitly including the successful integration of the listed enhancements into Phase 1.1 scope.)
*   Multi-tenancy, Modularity, Validation, Error Handling, Open Source Preference.
*   The enhancements (Recurring Invoices, Duplicate Invoice, Product Catalog, Client Defaults, CSV Import, Enhanced Preview/Validation) are now integral to Phase 1.1.

## 8. Implementation Plan (High-Level Steps - Expanded)

1.  **Environment Setup:** (As previously defined)
2.  **Database Schema Implementation:**
    *   Create/update tables: `invoices`, `invoice_line_items`, `product_service_catalog`, `recurring_invoice_profiles`, `client_preferences`.
3.  **OCR Microservice Development (Python):** (As previously defined)
4.  **Invoice Generation Agent Development (Node.js/NestJS):**
    *   **Data Access Layer (DAL):** Implement repositories for all new/updated models.
    *   **AI Integration Service Client:** (As previously defined)
    *   **Custom Parsing Module (Service Layer):** (As previously defined)
    *   **Core Invoice Processing Engine (Service Layer):**
        *   Manual & AI-assisted creation, validation, calculations.
        *   Implement Recurring Invoice profile management and scheduled generation logic (consider a simple cron-like scheduler or task runner).
        *   Implement Duplicate Invoice functionality.
        *   Implement CSV Import (parsing and mapping logic).
    *   **Product/Service Catalog Module (Service Layer):** CRUD operations and logic to use catalog items in invoices.
    *   **Client Preferences Module (Service Layer):** Logic to apply client defaults.
    *   **API Layer (Controllers):** Implement all defined API endpoints.
    *   Authentication/authorization stubs.
    *   Error handling and logging.
    *   Dockerize the agent.
5.  **Integration and Testing:**
    *   Unit tests for all components and new features.
    *   Integration testing (Agent & OCR service).
    *   End-to-end testing for all core flows and new enhancements.
6.  **Documentation:** (As previously defined)

## 9. Next Steps & Request for Feedback

This updated design and implementation plan (v1.1 with Enhancements) provides a roadmap for developing Phase 1.1 of the Smart Invoice Generation Module, now including the requested enhancements. We request your feedback on this revised plan before proceeding with the implementation.

Specifically, please review:
*   Alignment with your expectations for Phase 1.1, including the newly incorporated enhancements.
*   The expanded scope, data models, API endpoints, and implementation tasks.

Once we have your approval, we will proceed with the development tasks outlined in this updated implementation plan.

