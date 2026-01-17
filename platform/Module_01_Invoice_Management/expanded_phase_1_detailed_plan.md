# Detailed Implementation Plan: Expanded Phase 1 - Full Runtime Capabilities

**Date:** May 11, 2025

## 1. Introduction

This document outlines the detailed plan to implement the expanded scope for Phase 1 of the Smart Invoice Generation Agent. The goal is to make all features, including those previously conceptual (Conditional Logic runtime execution, User-Defined Data Source runtime fetching), fully operational. This will also include generating database migrations and developing conceptual automated tests.

## 2. Detailed Task Breakdown

### Step 001: Create Detailed Implementation Plan (This Document) & To-Do List
*   **Task:** Elaborate on the high-level plan provided by the planner.
*   **Task:** Create a new to-do list (`/home/ubuntu/todo_expanded_phase_1.md`) for this expanded scope.
*   **Deliverable:** This plan document and the to-do list file.

### Step 002: Implement Runtime Conditional Logic Evaluation Engine
*   **Sub-Task 2.1: Design Evaluation Logic:**
    *   Define how the stored `data-gjs-conditions` JSON (from template definitions) will be parsed and evaluated against actual invoice data.
    *   Consider data types, operators, and group logic (AND/OR).
    *   This logic will likely reside in a new service or be part of the `PdfGenerationService`.
*   **Sub-Task 2.2: Develop the Evaluation Service/Functions:**
    *   Implement TypeScript/JavaScript functions within the NestJS backend to perform the evaluation.
    *   Input: Component's conditions array, invoice data object.
    *   Output: Boolean (true if conditions met, false otherwise).
*   **Sub-Task 2.3: Modify PDF Generation Pre-processing:**
    *   Before converting HTML to PDF, iterate through the HTML template content (perhaps using a DOM parser like JSDOM on the server-side if Playwright's direct DOM manipulation is complex for this).
    *   For each element with `data-gjs-conditions`, fetch its conditions, evaluate them against the current invoice data using the new engine.
    *   If conditions are not met, remove the element from the HTML string or set its style to `display: none !important;` before sending to Playwright.
*   **Deliverables:** Updated `PdfGenerationService` (or new service), helper functions for condition evaluation.

### Step 003: Implement User-Defined Data Source Runtime Fetching & Integration
*   **Sub-Task 3.1: Design Data Fetching Service:**
    *   Create a new service within the `UserDataSourceModule` (e.g., `UserDataSourceFetchingService`).
    *   This service will take a `UserDefinedDataSource` ID and potentially some parameters (e.g., for dynamic REST API calls) as input.
*   **Sub-Task 3.2: Implement Fetching Logic for Different Source Types:**
    *   **REST API:** Implement logic to make HTTP GET requests using `axios` or `node-fetch`. Handle different authentication methods (None, API Key, Basic Auth) using the stored (and decrypted) `connection_config`.
    *   **JSON/CSV File URL:** Implement logic to fetch data from the given URL.
    *   Handle errors gracefully (network issues, authentication failures, non-OK HTTP responses, parsing errors).
*   **Sub-Task 3.3: Data Transformation/Caching (Optional Consideration):**
    *   Consider if basic data transformation or caching is needed (likely out of scope for this immediate expansion but good to note).
*   **Sub-Task 3.4: Make Fetched Data Available to Templates/Logic:**
    *   Define how this fetched data will be merged with the primary invoice data object before it's used by the template rendering process or the conditional logic engine.
    *   This might involve a pre-processing step in invoice generation where data from specified user sources is fetched and added to the main data context.
*   **Deliverables:** New `UserDataSourceFetchingService`, updated `PdfGenerationService` or invoice processing workflow to incorporate data fetching.

### Step 004: Integrate Conditional Logic & Data Sources with PDF Generation
*   **Sub-Task 4.1: Update Invoice Data Context:**
    *   Modify the main invoice generation flow so that before conditional logic evaluation or HTML rendering, data from relevant User-Defined Data Sources is fetched (using Sub-Task 3.4) and merged into the data context available to the template.
*   **Sub-Task 4.2: Ensure Conditional Logic Engine Uses Full Data Context:**
    *   The conditional logic engine (from Step 002) must now be able to evaluate conditions against fields from both the primary invoice data AND any data fetched from User-Defined Data Sources.
    *   This might require updating the `PREDEFINED_INVOICE_FIELDS` in the frontend GrapesJS plugin to also allow selection of fields from registered data sources (this is a UI enhancement, backend needs to support evaluation).
*   **Deliverables:** Modified invoice generation workflow, potentially updated `PdfGenerationService`.

### Step 005: Generate Database Migration Scripts
*   **Sub-Task 5.1: Install Migration Tools (if not already part of TypeORM setup):**
    *   Ensure TypeORM CLI is configured correctly.
*   **Sub-Task 5.2: Generate Migrations:**
    *   Use TypeORM CLI commands (e.g., `typeorm migration:generate -n InitialSetup`) to create migration files based on all defined entities (`User`, `Organization`, `Invoice`, `InvoiceItem`, `InvoiceTemplateMaster`, `InvoiceTemplateVersion`, `UserDefinedDataSource`).
*   **Sub-Task 5.3: Review Migration Scripts:**
    *   Manually review the generated SQL in the migration files to ensure correctness and that it reflects the intended schema.
*   **Deliverables:** Set of TypeORM migration files (e.g., `.ts` or `.js` files in a `migrations` directory).

### Step 006: Develop Unit and Integration Tests (Conceptual Code/Structure)
*   **Sub-Task 6.1: Unit Tests for Conditional Logic Engine:**
    *   Write Jest tests for the core evaluation functions, covering different operators, data types, and AND/OR group logic.
*   **Sub-Task 6.2: Unit Tests for Data Source Fetching Service:**
    *   Write Jest tests for the `UserDataSourceFetchingService`, mocking HTTP requests (e.g., using `nock` or `jest-mock-axios`) to test logic for different source types and authentication methods.
*   **Sub-Task 6.3: Integration Tests for Key API Endpoints:**
    *   Write conceptual integration tests (e.g., using Supertest with NestJS testing utilities) for:
        *   `UserDataSourceModule` CRUD endpoints.
        *   `TemplateModule` versioning endpoints.
*   **Deliverables:** Test files (`.spec.ts`) for services and conceptual outlines for integration tests.

### Step 007: Perform Comprehensive Invoice Generation Demonstration
*   **Sub-Task 7.1: Setup Test Data:**
    *   Define a virtual company and sample invoice data.
    *   Define a sample User-Defined Data Source (e.g., a mock JSON API endpoint or a static JSON file URL that can be accessed).
*   **Sub-Task 7.2: Create a Test Template:**
    *   Using the GrapesJS editor, design a template that utilizes:
        *   Conditional logic based on primary invoice data.
        *   Conditional logic based on data from the User-Defined Data Source.
        *   Display of data fetched from the User-Defined Data Source.
*   **Sub-Task 7.3: Generate Invoice & Showcase:**
    *   Trigger invoice generation using the test template and sample data.
    *   Showcase the resulting PDF, highlighting how conditional logic and fetched data correctly influenced the output.
*   **Deliverables:** Sample data files, test template definition (JSON), generated PDF, and a summary of the demonstration steps and outcome.

### Step 008: Update Documentation & Report Expanded Phase 1 Completion
*   **Sub-Task 8.1: Update User Documentation:**
    *   Add sections explaining how runtime conditional logic affects invoice output.
    *   Add sections on how data from User-Defined Data Sources can be used in templates and conditions.
*   **Sub-Task 8.2: Update Technical Documentation:**
    *   Document the new Conditional Logic Evaluation Engine.
    *   Document the `UserDataSourceFetchingService` and its interaction with the PDF generation process.
    *   Include details about the database migration scripts.
    *   Add information about the (conceptual) test suites.
*   **Sub-Task 8.3: Final Report:**
    *   Compile a final report summarizing all work done in the expanded Phase 1, including these new runtime features.
*   **Deliverables:** Updated documentation files, final completion report for the expanded Phase 1.

## 3. Timeline & Considerations

This expansion represents a significant amount of work. Each step, particularly the implementation of runtime engines for conditional logic and data fetching, will require careful design and development.

*   **Error Handling:** Robust error handling will be critical, especially for external data fetching.
*   **Security:** Ensure that fetching data from user-defined URLs or APIs is done securely, considering potential vulnerabilities.
*   **Performance:** Evaluating conditions and fetching external data can impact invoice generation performance. This should be monitored.

