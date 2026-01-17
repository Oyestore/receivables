# Smart Invoice Generation Module: Design and Implementation Plan (v2.0 - Post-Reset)

**Date:** May 08, 2025

## 1. Introduction

This document outlines the comprehensive design and implementation plan for the Smart Invoice Generation Module, a core component of the SME Receivables Management Platform. This module is designed to handle the creation, management, and processing of invoices. For Phase 1.1, the focus is on establishing core functionalities, including AI-assisted data extraction from existing invoices, manual invoice creation, and incorporating several key workflow enhancements. This plan also emphasizes adherence to the provided UI/UX guidelines.

This plan synthesizes information from the following re-uploaded documents:
*   `phase_1_1_detailed_design.md`
*   `Invoice Generation Agent_ Module Specifications.md`
*   `pasted_content.txt` (regarding document types for AI extraction)
*   `General UI_UX Guidelines for Visual Aids, Guided Workflows, and Overall User Experience.md`

## 2. Scope (Phase 1.1 - Enhanced)

Phase 1.1 will deliver the following, integrating core requirements with specified enhancements:

*   **Robust Invoice Data Structure:** PostgreSQL schemas for `invoices`, `invoice_line_items`, `product_service_catalog`, `recurring_invoice_profiles`, and `client_preferences`, all supporting multi-tenancy.
*   **Manual Invoice Creation:** UI and backend logic for users to create invoices manually, with comprehensive validation as per UI/UX guidelines (e.g., clear visual cues, guided steps).
*   **AI-Assisted Invoice Creation (from existing invoices):**
    *   Focus on extracting data from **uploaded existing invoice documents (PDFs/images)** as recommended in `pasted_content.txt` and `Invoice Generation Agent_ Module Specifications.md`.
    *   Integration with a Python-based Tesseract OCR microservice.
    *   A custom parsing module (Node.js) for structured data extraction.
    *   Target fields: Invoice Number, Issue Date, Due Date, Vendor/Client details, Line Items (Description, Quantity, Unit Price, Line Total), Subtotal, Tax Amounts, Grand Total.
*   **Core API Endpoints:** RESTful APIs for all functionalities.
*   **Key Workflow Enhancements (from `Invoice Generation Agent_ Module Specifications.md` and `invoice_enhancement_suggestions.md` section within it):
    *   **Recurring Invoices:** Define and manage scheduled invoice generation.
    *   **Duplicate/Copy Invoice:** Easily duplicate existing invoices.
    *   **Product/Service Catalog Management:** Tenant-level catalog for standard items.
    *   **Client-Specific Defaults:** Set defaults at the client level.
    *   **Enhanced Real-time Invoice Preview & Robust Validation:** UI/UX focus on real-time preview and comprehensive validation, guided by `General UI_UX Guidelines...md`.
    *   **Simple Invoice Import from Structured Data (e.g., CSV/Excel):** Basic bulk import.
*   **Adherence to UI/UX Guidelines:** All user-facing aspects will incorporate principles from `General UI_UX Guidelines for Visual Aids, Guided Workflows, and Overall User Experience.md`, ensuring intuitive interfaces, visual cues, and guided workflows, particularly for invoice creation and setup tasks.

## 3. Architecture

Adhering to the layered architecture specified in `Invoice Generation Agent_ Module Specifications.md` (Section 7):

### 3.1. High-Level Components:
1.  **API Layer (Controller - Node.js with NestJS recommended)**
2.  **Service Layer (Business Logic - Node.js/NestJS)**
3.  **Data Access Layer (DAL - Node.js/NestJS with Sequelize ORM)**
4.  **AI Integration Service Client (Node.js/NestJS)**
5.  **Python Tesseract OCR Microservice (Python with Flask/FastAPI)**

### 3.2. Internal Sub-modules (Service Layer):
*   **Core Invoice Processing Engine:** Manages invoice lifecycle, AI-assist, recurring invoices, duplication, CSV import.
*   **Custom Parsing Module:** Processes OCR text.
*   **Product/Service Catalog Management Module.**
*   **Client Preferences Module.**
*   **Template Management Sub-module (basic stubs for Phase 1.1, full implementation in Phase 1.2).**
*   **Tax Engine Sub-module (basic stubs for Phase 1.1, full implementation in Phase 1.3).**

## 4. Data Models (PostgreSQL)

Based on `phase_1_1_detailed_design.md` and enhancements:
*   **`invoices` table:** As defined in `phase_1_1_detailed_design.md`.
*   **`invoice_line_items` table:** As defined, linking to `product_service_catalog.id`.
*   **`product_service_catalog` table:** `id`, `tenant_id`, `item_name`, `description`, `default_unit_price`, `default_tax_id` (nullable, for future tax integration), `created_at`, `updated_at`.
*   **`recurring_invoice_profiles` table:** `id`, `tenant_id`, `client_id`, `source_invoice_id` (optional, for templating), `frequency`, `start_date`, `end_date`, `next_run_date`, `status`, `created_at`, `updated_at`.
*   **`client_preferences` table:** `id`, `tenant_id`, `client_id` (unique, FK), `default_payment_terms`, `default_notes`, `default_invoice_template_id` (nullable, for future template integration), `created_at`, `updated_at`.

## 5. API Endpoints (Phase 1.1 - Expanded)

*   **Invoices:** `POST /upload-for-ai-assist`, `POST /invoices`, `GET /invoices/{id}`, `PUT /invoices/{id}`, `POST /invoices/{id}/duplicate`, `POST /invoices/import-csv`.
*   **Product/Service Catalog:** `POST`, `GET` (list & by ID), `PUT`, `DELETE /products-services`.
*   **Recurring Invoices:** `POST`, `GET` (list & by ID), `PUT`, `DELETE /recurring-invoices`.
*   **Client Preferences:** `GET /clients/{id}/preferences`, `PUT /clients/{id}/preferences`.

## 6. Technology Stack

*   **Backend (Invoice Agent):** Node.js with NestJS (preferred).
*   **Backend (OCR Microservice):** Python with Flask/FastAPI.
*   **Database:** PostgreSQL.
*   **ORM (Node.js):** Sequelize.
*   **OCR Engine:** Tesseract.
*   **Image Processing (Python):** OpenCV or Pillow.
*   **Deployment:** Docker containers.
*   **PDF Generation (Future/Preview):** WeasyPrint/FPDF2 (considering CJK from `builtin_1`).

## 7. Key Features and Considerations

*   **Multi-tenancy, Modularity, Validation, Error Handling, Open Source Preference.**
*   **UI/UX Focus:** Strict adherence to `General UI_UX Guidelines...md` for all user interactions. Visual cues, guided workflows, clear differentiation between setup and transactional inputs.
*   **Document Type for AI Extraction:** Phase 1.1 focuses on existing invoices (PDF/image) as per `pasted_content.txt`. Future phases may consider POs, contracts etc., requiring more advanced NLP.
*   **Extensibility:** Design allows for future integration of advanced template management (Phase 1.2) and tax engine (Phase 1.3).

## 8. Implementation Plan (High-Level Steps)

1.  **Environment Setup:** PostgreSQL, Node.js/NestJS, Python/Flask, Docker.
2.  **Database Schema:** Implement all defined tables.
3.  **OCR Microservice (Python):** Develop and Dockerize.
4.  **Invoice Generation Agent (Node.js/NestJS):**
    *   DAL for all models.
    *   AI Integration Client.
    *   Custom Parsing Module.
    *   Service Layer: Core Invoice Engine (manual, AI-assist, recurring, duplicate, import), Product Catalog, Client Preferences.
    *   API Layer: Implement all endpoints.
    *   Incorporate UI/UX guideline considerations in API design where relevant to frontend support.
    *   Dockerize.
5.  **Integration and Testing:** Unit, integration, and end-to-end testing for all features.
6.  **Documentation:** API documentation, code comments.

## 9. Request for Feedback

This updated design and implementation plan (v2.0) incorporates all re-uploaded documents and clarifications. Please review this comprehensive plan, particularly its alignment with:
*   Phase 1.1 scope including all enhancements.
*   Requirements from `pasted_content.txt` regarding document types for AI extraction.
*   Adherence to `General UI_UX Guidelines for Visual Aids, Guided Workflows, and Overall User Experience.md`.

Your approval on this plan will allow us to proceed with the implementation tasks.

