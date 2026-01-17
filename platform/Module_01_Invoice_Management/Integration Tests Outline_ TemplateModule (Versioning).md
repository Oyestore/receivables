# Integration Tests Outline: TemplateModule (Versioning)

This document outlines the integration tests for the TemplateModule, focusing on its versioning API endpoints and interaction with the database.

**Environment Setup:**
-   NestJS testing environment (`Test.createTestingModule`).
-   In-memory database (e.g., SQLite for testing) or a dedicated test PostgreSQL instance.
-   Supertest for HTTP requests against the application.
-   Valid JWT token for authenticated endpoints.
-   Sample GrapesJS project data for `template_definition`.

**Entities Involved:**
-   `InvoiceTemplateMaster`
-   `InvoiceTemplateVersion`

**Services Involved:**
-   `TemplateService`
-   `PdfGenerationService` (indirectly, as template data is used by it)

**Authentication:**
-   All endpoints require JWT authentication. Tests must simulate authenticated requests.
-   Tests should cover scenarios with missing or invalid tokens.

## Test Suites and Scenarios:

### 1. POST `/api/templates` (Create New Template Master and First Version)

*   **Scenario 1.1: Successfully create a new template master and its first version.**
    *   Request: Valid DTO with `name`, `description`, and `template_definition` (GrapesJS JSON), `html_content`, `css_content`, `template_variables`.
    *   Expected Response: 201 Created. Body contains the created `InvoiceTemplateMaster` object, which should include its first `InvoiceTemplateVersion` (version 1).
    *   DB Verification: One `InvoiceTemplateMaster` record and one `InvoiceTemplateVersion` (version_number: 1, linked to the master) record exist with correct data.
*   **Scenario 1.2: Fail to create with invalid DTO (e.g., missing `name` or `template_definition`).**
    *   Request: DTO missing required fields.
    *   Expected Response: 400 Bad Request with error messages.
*   **Scenario 1.3: Fail to create without authentication.**
    *   Request: Valid DTO but no JWT token.
    *   Expected Response: 401 Unauthorized.

### 2. GET `/api/templates` (List All Template Masters)

*   **Scenario 2.1: Successfully retrieve an empty list when no template masters exist.**
    *   Expected Response: 200 OK. Body is an empty array `[]`.
*   **Scenario 2.2: Successfully retrieve a list of existing template masters.**
    *   Setup: Create multiple template masters.
    *   Expected Response: 200 OK. Body is an array of `InvoiceTemplateMaster` objects. Each master object should ideally include its latest version or a summary of versions.
*   **Scenario 2.3: Fail to retrieve without authentication.**
    *   Expected Response: 401 Unauthorized.

### 3. GET `/api/templates/:masterId` (Get a Specific Template Master with its Versions)

*   **Scenario 3.1: Successfully retrieve an existing template master and all its versions.**
    *   Setup: Create a template master with multiple versions.
    *   Request: Use the ID of the created `InvoiceTemplateMaster`.
    *   Expected Response: 200 OK. Body is the `InvoiceTemplateMaster` object, with an array of its `InvoiceTemplateVersion` objects, sorted by version number (e.g., descending).
*   **Scenario 3.2: Fail to retrieve a non-existent template master.**
    *   Request: Use a non-existent `masterId`.
    *   Expected Response: 404 Not Found.
*   **Scenario 3.3: Fail to retrieve with invalid `masterId` format.**
    *   Request: Use an ID that is not a valid UUID.
    *   Expected Response: 400 Bad Request.
*   **Scenario 3.4: Fail to retrieve without authentication.**
    *   Expected Response: 401 Unauthorized.

### 4. POST `/api/templates/:masterId/versions` (Create New Version for Existing Master)

*   **Scenario 4.1: Successfully create a new version for an existing template master.**
    *   Setup: Create a template master (which has version 1).
    *   Request: Valid DTO with `template_definition`, `html_content`, `css_content`, `template_variables`, and `comment` for the new version, using the `masterId`.
    *   Expected Response: 201 Created. Body contains the newly created `InvoiceTemplateVersion` object (e.g., version 2).
    *   DB Verification: A new `InvoiceTemplateVersion` record (version 2) exists, linked to the correct master. The master record might be updated (e.g., `latest_version_number`).
*   **Scenario 4.2: Fail to create a version for a non-existent template master.**
    *   Request: Use a non-existent `masterId`.
    *   Expected Response: 404 Not Found.
*   **Scenario 4.3: Fail to create a version with invalid DTO (e.g., missing `template_definition`).**
    *   Request: DTO missing required fields.
    *   Expected Response: 400 Bad Request.
*   **Scenario 4.4: Fail to create a version without authentication.**
    *   Expected Response: 401 Unauthorized.

### 5. GET `/api/templates/:masterId/versions/:versionNumber` (Get Specific Template Version)

*   **Scenario 5.1: Successfully retrieve a specific version of an existing template master.**
    *   Setup: Create a template master with multiple versions.
    *   Request: Use valid `masterId` and `versionNumber`.
    *   Expected Response: 200 OK. Body is the `InvoiceTemplateVersion` object with its full data (`template_definition`, `html_content`, etc.).
*   **Scenario 5.2: Fail to retrieve a version for a non-existent template master.**
    *   Request: Non-existent `masterId`.
    *   Expected Response: 404 Not Found.
*   **Scenario 5.3: Fail to retrieve a non-existent version number for an existing master.**
    *   Request: Valid `masterId` but `versionNumber` that doesn't exist (e.g., version 99).
    *   Expected Response: 404 Not Found.
*   **Scenario 5.4: Fail to retrieve with invalid `masterId` or `versionNumber` format.**
    *   Request: Invalid UUID for `masterId` or non-integer for `versionNumber`.
    *   Expected Response: 400 Bad Request.
*   **Scenario 5.5: Fail to retrieve without authentication.**
    *   Expected Response: 401 Unauthorized.

### 6. POST `/api/templates/:masterId/versions/:versionNumber/revert` (Revert to an Old Version)

*   **Scenario 6.1: Successfully revert to an older version, creating a new version.**
    *   Setup: Create a template master with at least two versions (e.g., v1, v2 with different content).
    *   Request: Revert to version 1 using `masterId` and `versionNumber=1`. Provide an optional `comment`.
    *   Expected Response: 201 Created. Body contains the newly created `InvoiceTemplateVersion` (e.g., version 3).
    *   DB Verification: A new `InvoiceTemplateVersion` (version 3) exists. Its `template_definition`, `html_content`, etc., should match those of version 1. The `reverted_from_version_id` field should point to version 1's ID.
*   **Scenario 6.2: Fail to revert using a non-existent template master ID.**
    *   Request: Non-existent `masterId`.
    *   Expected Response: 404 Not Found.
*   **Scenario 6.3: Fail to revert using a non-existent version number for an existing master.**
    *   Request: Valid `masterId` but `versionNumber` that doesn't exist.
    *   Expected Response: 404 Not Found.
*   **Scenario 6.4: Fail to revert without authentication.**
    *   Expected Response: 401 Unauthorized.

### 7. Conditional Logic Storage

*   **Scenario 7.1: Ensure conditional logic defined in GrapesJS is saved with the template version.**
    *   Setup: Create a template version with a component having `data-gjs-conditions` attribute in its `template_definition`.
    *   Verification: When retrieving this version (`GET /api/templates/:masterId/versions/:versionNumber`), the `template_definition` in the response should contain the `data-gjs-conditions` attribute as saved.

**General Considerations:**
-   Ensure proper database cleanup between tests.
-   Test for correct `organization_id` and `created_by_user_id` handling (storage and potential filtering if multi-tenancy is implemented).
-   Verify timestamps (`created_at`, `updated_at`) are correctly managed.
-   Consider edge cases like reverting to the latest version (should still create a new version copy).

