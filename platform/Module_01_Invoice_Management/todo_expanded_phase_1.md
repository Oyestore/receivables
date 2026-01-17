# To-Do List: Expanded Phase 1 - Full Runtime Capabilities

**Date:** May 11, 2025

## 1. Planning & Initial Setup

-   [X] Create Detailed Implementation Plan (`/home/ubuntu/expanded_phase_1_detailed_plan.md`).
-   [X] Create `todo_expanded_phase_1.md` (this file).

## 2. Runtime Conditional Logic Evaluation Engine

-   [X] **Design Evaluation Logic:**
    -   [X] Define parsing and evaluation strategy for `data-gjs-conditions` against invoice data.
    -   [X] Finalize supported data types, operators, and group logic (AND/OR).
-   [X] **Develop Evaluation Service/Functions (NestJS Backend):**
    -   [X] Create `ConditionalLogicService` or integrate into `PdfGenerationService`.
    -   [X] Implement core evaluation functions (input: conditions array, invoice data; output: boolean).
-   [X] **Modify PDF Generation Pre-processing:**
    -   [X] Integrate server-side DOM parsing (e.g., JSDOM) if needed for HTML manipulation before Playwright.
    -   [X] Implement logic to iterate HTML, evaluate conditions for elements with `data-gjs-conditions`.
    -   [X] Implement element removal or styling (`display: none`) for unmet conditions.

## 3. User-Defined Data Source Runtime Fetching & Integration

-   [X] **Design Data Fetching Service (`UserDataSourceFetchingService`):**
    -   [X] Define service interface and methods.
-   [X] **Implement Fetching Logic for Different Source Types:**
    -   [X] REST API (GET requests, handle auth: None, API Key, Basic Auth).
    -   [X] JSON File URL.
    -   [X] CSV File URL (parsing CSV data).
    -   [X] Implement robust error handling for fetching and parsing.
-   [X] **Integrate Fetched Data into Invoice Context:**
    -   [X] Define strategy for merging fetched data with primary invoice data.
    -   [X] Update invoice generation workflow to include this pre-processing step.

## 4. Integrate Conditional Logic & Data Sources with PDF Generation

-   [X] **Update Invoice Data Context for Conditional Logic:**
    -   [X] Ensure conditional logic engine can access merged data (primary invoice + fetched data).
-   [X] **(Frontend UI Enhancement - Optional for now, focus on backend):**
    -   [X] Consider how `PREDEFINED_INVOICE_FIELDS` in GrapesJS could be dynamically updated or allow selection from User-Defined Data Source schemas.

## 5. Database Migration Scripts

-   [X] **Generate TypeORM Migrations:**
    -   [X] Use TypeORM CLI to generate migrations for all entities (Conceptual: SQL provided in `/home/ubuntu/conceptual_expanded_phase1_migration.sql` due to sandbox limitations).
-   [X] **Review Migration Scripts:**
    -   [X] Manually verify generated SQL (Conceptual: SQL provided for review).

## 6. Unit and Integration Tests (Conceptual Code/Structure)

-   [ ] **Unit Tests:**
    -   [ ] `ConditionalLogicService` evaluation functions.
    -   [ ] `UserDataSourceFetchingService` (mocking HTTP requests).
-   [ ] **Integration Tests (Conceptual Outlines):**
    -   [ ] `UserDataSourceModule` CRUD APIs.
    -   [ ] `TemplateModule` versioning APIs (verify existing tests, if any, or outline new ones).
    -   [ ] Test PDF generation with conditional logic applied.
    -   [ ] Test PDF generation with data from user-defined sources.

## 7. Comprehensive Invoice Generation Demonstration

-   [ ] **Setup Test Data & Environment:**
    -   [ ] Virtual company, sample invoice data.
    -   [ ] Mock/live User-Defined Data Source.
-   [ ] **Create Test Template:**
    -   [ ] Design template using conditional logic (with primary and fetched data) and display of fetched data.
-   [ ] **Generate & Showcase Invoice:**
    -   [ ] Run generation, present PDF, explain dynamic aspects.

## 8. Documentation & Final Reporting

-   [ ] **Update User Documentation:**
    -   [ ] Runtime conditional logic effects.
    -   [ ] Using data from User-Defined Data Sources in templates.
-   [ ] **Update Technical Documentation:**
    -   [ ] `ConditionalLogicService` and evaluation engine.
    -   [ ] `UserDataSourceFetchingService`.
    -   [ ] Database migration details.
    -   [ ] Test suite information.
-   [ ] **Final Report for Expanded Phase 1.**
-   [ ] **Update `todo_expanded_phase_1.md` with all completed tasks.**
-   [ ] **Report completion of Expanded Phase 1 to the user.**

