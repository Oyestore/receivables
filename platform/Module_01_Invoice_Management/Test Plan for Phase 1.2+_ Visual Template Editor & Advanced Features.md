# Test Plan for Phase 1.2+: Visual Template Editor & Advanced Features

**Version:** 1.0
**Date:** 2025-05-10

## 1. Introduction

This document outlines the test plan for Phase 1.2+ of the Smart Invoice Generation Agent, which focuses on the implementation of a visual drag-and-drop template editor using GrapesJS and advanced template management features. These features include conditional display logic, user-defined data sources, and template versioning.

## 2. Scope of Testing

This test plan covers the following functional and non-functional aspects:

*   **Visual Editor Core Functionality:**
    *   Loading and initializing the GrapesJS editor.
    *   Basic drag-and-drop of predefined blocks.
    *   Editing content within blocks (text, images).
    *   Styling components using the style manager.
    *   Saving template structure (GrapesJS JSON) to the backend.
    *   Loading existing templates from the backend into the editor.
*   **Backend API Integration:**
    *   Creating new templates via the editor.
    *   Updating existing templates (both DRAFT and PUBLISHED, triggering versioning).
    *   Fetching template details for loading into the editor.
    *   Publishing a DRAFT template.
    *   Fetching template version history (conceptual UI interaction).
    *   Reverting to a previous template version (conceptual UI interaction, backend creates new DRAFT).
*   **Invoice-Specific Blocks:**
    *   Availability and functionality of predefined invoice blocks (header, line items, totals, terms, footer).
    *   Correct rendering of these blocks in the editor canvas.
    *   Presence of `data-field-id` attributes for data binding.
*   **Template Versioning:**
    *   Automatic version creation by the backend when a PUBLISHED template is updated.
    *   Correct version numbering and parent-child relationships (verified via API responses/DB checks).
    *   Conceptual testing of UI for viewing version history.
    *   Conceptual testing of UI for reverting to a previous version.
*   **Template Status Management:**
    *   Correct handling of DRAFT, PUBLISHED, ARCHIVED statuses.
    *   Functionality of the "Publish" button in the editor UI.
*   **Conditional Display Logic (Conceptual):**
    *   Ability to add a `data-gjs-condition` attribute to components via the editor (e.g., through traits).
    *   Verification that this attribute is saved with the template definition.
    *   (Actual logic evaluation is part of PDF generation testing).
*   **User-Defined Data Sources (Conceptual):**
    *   Conceptual UI for managing user-defined data sources (placeholder for now).
    *   Ability to reference user-defined data fields (e.g., `{{userData.customField}}`) in templates.
    *   Verification that these references are saved with the template definition.
    *   (Actual data injection is part of PDF generation testing).
*   **PDF Generation:**
    *   Generating PDFs from templates created or modified by the visual editor.
    *   Correct rendering of content, styles, and layout in the PDF.
    *   Correct data population for standard and custom fields.
    *   Correct application of conditional display logic in the generated PDF.
*   **Usability & UX:**
    *   Ease of use of the visual editor interface.
    *   Responsiveness of the editor UI.
    *   Clarity of UI elements for versioning, publishing, etc.
*   **Error Handling:**
    *   Graceful handling of API errors during save/load operations.
    *   Informative error messages to the user.

## 3. Test Approach

Testing will be primarily manual and conceptual for UI-heavy interactions, given the current development environment. Backend API interactions will be verified by checking (simulated) API call success and expected data in responses.

*   **Unit Testing (Conceptual):** Backend services related to template management (CRUD, versioning, status changes) are assumed to have unit tests.
*   **Integration Testing:** Focus on the interaction between the GrapesJS frontend and the NestJS backend APIs.
*   **System Testing:** End-to-end testing of creating a template, editing it, saving, publishing, and then generating a PDF from it.
*   **Usability Testing (Conceptual):** Evaluating the ease of use of the editor.

## 4. Test Environment

*   **Frontend:** Conceptual GrapesJS editor running in a standard web browser (simulated via `editor.html`).
*   **Backend:** NestJS application with PostgreSQL database (all interactions simulated or based on previously confirmed API behavior).

## 5. Test Cases

(Detailed test cases would be listed here. Below are high-level categories and examples.)

### 5.1. Visual Editor Core

*   **TC_VE_001:** Verify editor loads correctly.
*   **TC_VE_002:** Drag and drop a "Text" block and edit its content. Save template.
*   **TC_VE_003:** Load the saved template and verify content.
*   **TC_VE_004:** Change style (e.g., color, font size) of a text block. Save and reload.

### 5.2. API Integration & Template Lifecycle

*   **TC_API_001:** Create a new template. Verify POST request to `/templates` and successful response with new template ID, version 1, status DRAFT.
*   **TC_API_002:** Update the DRAFT template. Verify PUT request to `/templates/{id}` and successful response. Version remains 1, status DRAFT.
*   **TC_API_003:** Publish the DRAFT template. Verify POST request to `/templates/{id}/publish`. Verify status changes to PUBLISHED.
*   **TC_API_004:** Update the PUBLISHED template. Verify PUT request. Backend should create a new version (e.g., version 2, DRAFT), original remains PUBLISHED (or a new PUBLISHED version is created, depending on strategy - current strategy is new DRAFT from published).
*   **TC_API_005:** (Conceptual) View version history for a template. Verify UI placeholder shows versions.
*   **TC_API_006:** (Conceptual) Revert to an older version. Verify UI placeholder and conceptual API call.

### 5.3. Invoice Blocks

*   **TC_IB_001:** Drag all predefined invoice blocks (Header, Line Items, Totals, Terms, Footer) onto the canvas. Verify they render as expected.
*   **TC_IB_002:** Verify `data-field-id` attributes are present on relevant elements within these blocks.

### 5.4. Advanced Features (Conceptual Testing)

*   **TC_AF_001 (Conditional Logic):** Add a `data-gjs-condition` attribute to an element using the (conceptual) trait editor. Save template. Verify attribute is present in the saved GrapesJS JSON.
*   **TC_AF_002 (User Data):** (Conceptual) Add a placeholder for a user-defined field (e.g., `{{userData.projectCode}}`) into a text block. Save template. Verify placeholder is present.

### 5.5. PDF Generation

*   **TC_PDF_001:** Generate PDF from a simple template created with the visual editor. Verify basic layout and content.
*   **TC_PDF_002:** Generate PDF from a template using various invoice blocks and populated data. Verify data mapping.
*   **TC_PDF_003 (Conditional):** Generate PDF from a template with a conditional element. Test with data that meets the condition and data that doesn't. Verify element visibility.

### 5.6. Usability

*   **TC_UX_001:** (Conceptual) Evaluate ease of finding and using common editor functions (save, publish, add blocks).

## 6. Test Deliverables

*   This Test Plan document.
*   (Conceptual) Test Execution Log / Summary of Findings.

## 7. Risks and Mitigation

*   **Risk:** Full frontend UI for advanced features (version history browser, data source manager) is complex and only conceptually outlined.
    *   **Mitigation:** Testing focuses on the backend support and the conceptual integration points in the GrapesJS editor. Full UI testing deferred.
*   **Risk:** Discrepancies between GrapesJS HTML/CSS output and Playwright PDF rendering.
    *   **Mitigation:** Test PDF generation with various complex layouts created by the editor.

## 8. Test Suspension and Resumption Criteria

*   **Suspension:** Critical bug blocking major functionality (e.g., editor not loading, save/load failing completely).
*   **Resumption:** After critical bug is fixed and verified.

