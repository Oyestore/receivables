# Plan for Full Backend Integration of Phase 1.4 Advanced UI Features

**Date:** 2025-05-11

## 1. Introduction

This document outlines the plan for implementing the full backend integration for the advanced UI features developed in Phase 1.4 of the Smart Invoice Generation Agent module. These features include the Conditional Logic Builder, User-Defined Data Source Management UI, and the Template Version History Browser. The goal is to move from conceptual/simulated backend interactions to fully functional, production-ready backend services and APIs.

## 2. General Backend Considerations

*   **Technology Stack:** NestJS with PostgreSQL, TypeORM, as established in earlier phases.
*   **Authentication & Authorization:** All new API endpoints must be secured using existing authentication mechanisms (e.g., JWT-based) and appropriate authorization checks (e.g., ensuring users can only access/modify resources belonging to their organization).
*   **Error Handling & Validation:** Robust error handling and input validation (using DTOs and class-validator) will be implemented for all API endpoints.
*   **Database Migrations:** Any schema changes will be managed via TypeORM migrations.

## 3. Conditional Logic Builder - Backend Integration

**Objective:** Store conditional logic rules defined in the frontend and provide a mechanism for these rules to be evaluated (conceptually, the evaluation engine itself might be a more advanced topic, but storing and retrieving rules is key for Phase 1).

*   **Database Schema:**
    *   The `InvoiceTemplate` entity (`invoice-template.entity.ts`) currently stores `template_definition` as JSON. The conditional logic rules, which are stored as a `data-gjs-conditions` attribute on individual GrapesJS components within this `template_definition`, will be saved as part of this JSON structure. No immediate schema change is needed for *storing* the rules, as they are embedded within the component's attributes in the GrapesJS JSON output.
    *   *Future Consideration (Beyond this scope):* If complex server-side evaluation of these rules is needed independent of GrapesJS rendering, a separate table to store parsed and indexed rules might be beneficial for performance, but for Phase 1, embedding them is sufficient for storage and retrieval by the editor.
*   **API Endpoints (Modifications to existing Template APIs):**
    *   The existing `POST /templates` and `PUT /templates/:id` endpoints will inherently handle saving the conditional logic rules as they are part of the `template_definition` payload sent by the GrapesJS editor.
    *   The existing `GET /templates/:id` endpoint will return the `template_definition` including any embedded conditional logic rules.
*   **Backend Logic:**
    *   No new specific backend logic is required for *storing* the rules beyond what's already in place for saving the `template_definition`.
    *   **Server-side Rule Evaluation (Conceptual for Phase 1 Full Integration):** While the frontend handles applying conditions for display *within the editor*, true backend integration implies that if these templates were used for, e.g., PDF generation or other backend processes, the rules would need to be interpreted. For *this phase of backend integration*, we will focus on ensuring the rules are correctly stored and retrieved. The actual server-side *evaluation engine* for these rules during processes like PDF generation will be noted as a more advanced feature for a subsequent phase, as it can be quite complex. The current PDF generation service would need to be made aware of these conditions if elements are to be conditionally included/excluded in the final PDF.

## 4. User-Defined Data Source Management - Backend Integration

**Objective:** Allow users to define, store, and manage custom data sources, which could eventually be used to populate templates or in conditional logic.

*   **Database Schema (New Entity):**
    *   Create a new entity `UserDefinedDataSource` with fields like:
        *   `id` (Primary Key)
        *   `organizationId` (Foreign Key to Organization)
        *   `name` (String, unique per organization)
        *   `type` (Enum: `REST_API`, `JSON_URL`, `CSV_URL`)
        *   `connection_config` (JSONB: stores type-specific details like base URL, auth method, API key header/value, basic auth credentials, file URL).
        *   `schema_definition` (JSONB, optional: stores user-provided sample JSON or schema).
        *   `created_at`, `updated_at`.
    *   Sensitive information within `connection_config` (e.g., API keys, passwords) should be encrypted at rest. Consider using a dedicated encryption service or library.
*   **API Endpoints (New Module: `UserDataSourceModule`):**
    *   `POST /user-data-sources`: Create a new data source definition.
    *   `GET /user-data-sources`: List all data sources for the authenticated user's organization.
    *   `GET /user-data-sources/:id`: Get details of a specific data source.
    *   `PUT /user-data-sources/:id`: Update a data source definition.
    *   `DELETE /user-data-sources/:id`: Delete a data source.
    *   `POST /user-data-sources/:id/test-connection` (Optional Stretch Goal): A backend endpoint to attempt a connection to the defined data source and return a success/failure status. This would involve making outbound HTTP requests from the backend.
*   **Backend Logic (`UserDataSourceService`):**
    *   Implement CRUD operations for `UserDefinedDataSource` entities.
    *   Implement encryption/decryption for sensitive fields in `connection_config` before saving and after retrieving.
    *   (Stretch Goal) Logic for the `test-connection` endpoint.

## 5. Template Version History Browser - Backend Integration

**Objective:** Provide robust backend support for versioning invoice templates, allowing users to view history, preview, and revert to older versions.

*   **Database Schema (Leverage and Refine Existing/Planned):**
    *   The `InvoiceTemplate` entity already has `id`, `template_name`, `version` (integer), `status`, `template_definition`, `created_at`, `updated_at`, `organizationId`, `created_by_user_id`.
    *   To properly support version history and reverting, we will refine the approach: Instead of overwriting the `InvoiceTemplate` record on each save, we will treat each save of a *named* template as potentially creating a new *version instance* or updating the *latest draft*.
    *   We will introduce/solidify the `InvoiceTemplateVersion` entity as designed in Phase 1.2 (if not fully implemented then):
        *   `id` (Primary Key)
        *   `template_master_id` (Foreign Key to a new `InvoiceTemplateMaster` entity, which holds the name and current/latest version pointer).
        *   `version_number` (Integer)
        *   `template_definition` (JSONB - snapshot of GrapesJS data for this version)
        *   `comment` (String, optional - user comment for this version)
        *   `created_at`
        *   `created_by_user_id`
    *   The `InvoiceTemplate` entity might be renamed to `InvoiceTemplateMaster` or a similar concept representing the template identity, while `InvoiceTemplateVersion` holds the actual versioned content.
*   **API Endpoints (Modifications/Additions to `TemplateModule`):**
    *   `GET /templates/:masterId/versions`: List all versions for a given template master ID.
    *   `GET /templates/:masterId/versions/:versionNumber`: Retrieve the `template_definition` and details of a specific version.
    *   `POST /templates/:masterId/versions/:versionNumber/revert`: Create a new *current* version (draft or new numbered version) for the template master, using the `template_definition` from the specified historical `versionNumber`. This new version will become the latest active version.
    *   The existing `POST /templates` (create new template master) and `PUT /templates/:masterId` (save/update template, which creates a new version) will need to be adjusted to work with this `InvoiceTemplateMaster` and `InvoiceTemplateVersion` model.
*   **Backend Logic (`TemplateService`):**
    *   Logic to handle creation of `InvoiceTemplateMaster` and `InvoiceTemplateVersion` records.
    *   When saving a template, increment the version number for the `InvoiceTemplateMaster` and create a new `InvoiceTemplateVersion` record with the full `template_definition`.
    *   Implement the revert logic: fetch the old version's data, create a new `InvoiceTemplateVersion` with this data and an incremented version number, and update the `InvoiceTemplateMaster` to point to this new version as the latest.

## 6. Frontend Updates

*   All three frontend UI components (Conditional Logic, User-Defined Data Sources, Version History) will need their JavaScript logic updated in `editor-main.js` to:
    *   Remove simulated/conceptual data storage and API calls.
    *   Make actual `fetch` requests to the new backend API endpoints.
    *   Handle API responses, including loading states, data display, and error messages.
    *   For User-Defined Data Sources, populate dropdowns or make data available to the Conditional Logic Builder (this is a more advanced integration point that needs careful design - for now, ensure data sources can be *defined* and *retrieved* by the frontend).

## 7. Testing

*   Unit tests for all new backend service logic and controllers.
*   Integration tests for API endpoints.
*   Comprehensive end-to-end testing of the frontend UI interacting with the live backend APIs for all three features.

## 8. Documentation

*   Update user documentation to reflect the fully functional features.
*   Update technical documentation with details of new database schemas, API endpoints, and backend logic.
*   Update `todo_phase_1_4_full_backend.md` (a new to-do list for this extended scope).

This plan provides a roadmap for the full backend integration. Each section will be broken down into more detailed tasks during implementation.
