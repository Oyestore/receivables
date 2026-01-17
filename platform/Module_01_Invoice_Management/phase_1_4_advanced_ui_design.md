# Phase 1.4 Design Document: Advanced UI Components

**Version:** 1.0
**Date:** 2025-05-10

## 1. Introduction

This document outlines the detailed UI/UX design for the advanced frontend components to be implemented in Phase 1.4 of the Smart Invoice Generation Agent. These components will enhance the GrapesJS-based visual template editor, providing richer functionality for users.

The components covered are:
1.  Conditional Logic Builder
2.  User-Defined Data Source Management UI
3.  Template Version History Browser

## 2. General UI/UX Principles

-   **Integration:** All components should feel like a natural extension of the GrapesJS editor.
-   **Clarity:** Interfaces should be clear, intuitive, and provide guidance where necessary.
-   **Efficiency:** Workflows should be streamlined to allow users to accomplish tasks quickly.
-   **Responsiveness:** While the primary focus is desktop, considerations for smaller viewports should be kept in mind if GrapesJS itself adapts.

## 3. Conditional Logic Builder UI

**Objective:** Allow users to define rules for conditionally displaying elements or sections within an invoice template based on invoice data.

**Integration:**
-   Accessed via a new "Conditional Logic" button/icon in the GrapesJS Trait Manager when a component is selected, or as a dedicated tab in the right-hand panel.
-   The logic will be stored as a custom attribute on the GrapesJS component (e.g., `data-gjs-conditions="[...rules_json...]"`).

**UI Elements & Workflow:**
1.  **Main Panel/Modal:**
    *   Displays a list of existing conditions for the selected component.
    *   "Add New Condition Group" button.
2.  **Condition Group:**
    *   A group can contain one or more individual rules.
    *   Logic within a group: "ALL of these conditions must be true" (AND) or "ANY of these conditions can be true" (OR) - selectable via a dropdown.
    *   "Add Rule to Group" button.
    *   "Delete Group" button.
3.  **Rule Editor:**
    *   **Field Selector:** Dropdown to select an invoice data field (e.g., `invoice.total`, `lineItem.quantity`, `recipient.country`). This list could be dynamically populated or predefined based on known data structures.
    *   **Operator Selector:** Dropdown for comparison operators (e.g., "Equals", "Not Equals", "Greater Than", "Less Than", "Contains", "Is Empty", "Is Not Empty").
    *   **Value Input:** Text input, number input, or dropdown (e.g., for predefined states/countries) for the comparison value.
    *   "Delete Rule" button.
4.  **Visual Feedback:** Components on the GrapesJS canvas that have conditional logic applied could have a small visual indicator (e.g., a specific icon overlay).
5.  **Saving:** Conditions are saved as part of the GrapesJS component's attributes when the template is saved.

**Example JSON structure for `data-gjs-conditions`:**
```json
[
  {
    "groupLogic": "AND",
    "rules": [
      { "field": "invoice.total", "operator": ">", "value": 1000 },
      { "field": "recipient.country", "operator": "==", "value": "India" }
    ]
  },
  {
    "groupLogic": "OR",
    "rules": [
      { "field": "invoice.status", "operator": "==", "value": "Overdue" }
    ]
  }
]
```

## 4. User-Defined Data Source Management UI

**Objective:** Allow users to (conceptually) define and manage connections to their custom data sources, which could then be used to populate templates beyond standard invoice fields.

**Integration:**
-   Accessed via a new section or button in the main application interface (outside the GrapesJS editor itself, but data source definitions would be available to the editor).
-   For Phase 1.4, the focus is on the UI to *define* these sources. Actual data fetching and mapping within GrapesJS is a more advanced step.

**UI Elements & Workflow:**
1.  **Data Sources List View:**
    *   Displays a table of currently defined custom data sources (Name, Type, Status).
    *   "Add New Data Source" button.
    *   Actions per source: Edit, Delete, Test Connection (conceptual).
2.  **Add/Edit Data Source Modal/Form:**
    *   **Source Name:** Text input (e.g., "My Product API").
    *   **Source Type:** Dropdown (e.g., "REST API", "JSON File URL", "CSV File URL").
    *   **Connection Details (dynamic based on type):**
        *   For REST API: Base URL, Authentication method (None, API Key, Basic Auth), Header fields for API key.
        *   For File URL: The URL to the JSON/CSV file.
    *   **Data Mapping/Schema (Conceptual):** A simple text area where users might paste a sample JSON or define field names that this source provides. This helps in the editor when selecting fields.
    *   "Save Data Source" button.
    *   "Test Connection" button (simulates a connection attempt).

**Interaction with GrapesJS Editor (Conceptual for Phase 1.4):**
-   When editing a template, the list of defined custom data sources could be available.
-   The field selector in the Conditional Logic Builder or for data-binding traits could potentially show fields from these custom sources (e.g., `customData.MyProductAPI.productName`).

## 5. Template Version History Browser UI

**Objective:** Allow users to view the version history of a template, compare versions (conceptually), and revert to a previous version.

**Integration:**
-   Accessed via a "Version History" button or link, likely near the template name/status display within the GrapesJS editor interface or a template management view.
-   Relies on the backend API endpoint that provides version history for a template ID.

**UI Elements & Workflow:**
1.  **Version History Panel/Modal:**
    *   Displays a chronological list of template versions.
    *   Each list item shows: Version Number, Timestamp of save, User who saved (if available), optional Commit Message/Comment (if implemented during save).
    *   Actions per version:
        *   "Preview" button: Loads the selected version's content into the GrapesJS editor in a read-only/preview mode. The main editor canvas updates to show this version.
        *   "Revert to this Version" button.
2.  **Preview Mode:**
    *   When previewing an older version, the editor controls (save, publish) should be disabled or clearly indicate it's a preview.
    *   A clear "Exit Preview" or "Back to Current Version" button.
3.  **Revert Action:**
    *   Clicking "Revert to this Version" prompts for confirmation.
    *   If confirmed, the backend is called to create a new version that is a copy of the selected older version. The editor then reloads with this new (current) version.

## 6. Backend Considerations (Recap)

-   **Conditional Logic:** Backend needs to store the `data-gjs-conditions` attribute as part of the template's GrapesJS JSON.
-   **User-Defined Data Sources:** Backend needs CRUD endpoints for managing data source definitions (name, type, connection params, conceptual schema). Actual data fetching from these sources by the backend is out of scope for Phase 1.4 UI focus.
-   **Version History:** Backend already provides versioning. The UI will consume the existing API to list versions and will use existing save mechanisms to effectively "revert" by saving an old version's content as a new current version.

This design document provides the blueprint for the advanced UI components. Detailed HTML/CSS and JavaScript implementation will follow based on these specifications.

