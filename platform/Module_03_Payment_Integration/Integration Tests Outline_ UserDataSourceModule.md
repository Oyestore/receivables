# Integration Tests Outline: UserDataSourceModule

This document outlines the integration tests for the UserDataSourceModule, focusing on its API endpoints and interaction with the database and other services like EncryptionService.

**Environment Setup:**
-   NestJS testing environment (`Test.createTestingModule`).
-   In-memory database (e.g., SQLite for testing) or a dedicated test PostgreSQL instance.
-   Mock `EncryptionService` if actual encryption keys are not to be used in tests, or use test keys.
-   Supertest for HTTP requests against the application.
-   JWT token for authenticated endpoints.

**Entities Involved:**
-   `UserDefinedDataSource`

**Services Involved:**
-   `UserDataSourceService`
-   `UserDataSourceFetchingService` (for `/test-connection` endpoint)
-   `EncryptionService`

**Authentication:**
-   All endpoints require JWT authentication. Tests should simulate authenticated requests by including a valid JWT token in the `Authorization` header.
-   Tests should also cover scenarios with missing or invalid tokens to ensure 401/403 responses.

## Test Suites and Scenarios:

### 1. POST `/api/user-data-sources` (Create User Defined Data Source)

*   **Scenario 1.1: Successfully create a REST API data source with NO AUTH.**
    *   Request: Valid DTO with `type: REST_API`, `auth_method: NONE`, valid `base_url`.
    *   Expected Response: 201 Created. Body contains the created data source object (with ID, timestamps).
    *   DB Verification: Record exists in the database with correct values.
*   **Scenario 1.2: Successfully create a REST API data source with API KEY auth.**
    *   Request: Valid DTO with `type: REST_API`, `auth_method: API_KEY`, valid `base_url`, `api_key_header`, `api_key_value`.
    *   Expected Response: 201 Created.
    *   DB Verification: Record exists. `api_key_value` should be encrypted in the database.
*   **Scenario 1.3: Successfully create a REST API data source with BASIC AUTH.**
    *   Request: Valid DTO with `type: REST_API`, `auth_method: BASIC_AUTH`, valid `base_url`, `basic_auth_username`, `basic_auth_password`.
    *   Expected Response: 201 Created.
    *   DB Verification: Record exists. `basic_auth_password` should be encrypted.
*   **Scenario 1.4: Successfully create a JSON File URL data source.**
    *   Request: Valid DTO with `type: JSON_FILE_URL`, valid `file_url`.
    *   Expected Response: 201 Created.
*   **Scenario 1.5: Successfully create a CSV File URL data source.**
    *   Request: Valid DTO with `type: CSV_FILE_URL`, valid `file_url`, optional `csv_delimiter`.
    *   Expected Response: 201 Created.
*   **Scenario 1.6: Fail to create with invalid DTO (e.g., missing required fields, invalid URL format).**
    *   Request: DTO with missing `name` or invalid `base_url` / `file_url`.
    *   Expected Response: 400 Bad Request with appropriate error messages.
*   **Scenario 1.7: Fail to create without authentication.**
    *   Request: Valid DTO but no JWT token.
    *   Expected Response: 401 Unauthorized.

### 2. GET `/api/user-data-sources` (Get All User Defined Data Sources)

*   **Scenario 2.1: Successfully retrieve an empty list when no data sources exist.**
    *   Expected Response: 200 OK. Body is an empty array `[]`.
*   **Scenario 2.2: Successfully retrieve a list of existing data sources.**
    *   Setup: Create multiple data sources with different types and auth methods.
    *   Expected Response: 200 OK. Body is an array of data source objects.
    *   Verification: Sensitive fields like `api_key_value` and `basic_auth_password` should NOT be present in the response for security reasons (or should be masked/placeholders).
*   **Scenario 2.3: Fail to retrieve without authentication.**
    *   Expected Response: 401 Unauthorized.

### 3. GET `/api/user-data-sources/:id` (Get User Defined Data Source by ID)

*   **Scenario 3.1: Successfully retrieve an existing data source.**
    *   Setup: Create a data source.
    *   Request: Use the ID of the created data source.
    *   Expected Response: 200 OK. Body is the data source object.
    *   Verification: Sensitive fields like `api_key_value` and `basic_auth_password` should NOT be present in the response (or masked).
*   **Scenario 3.2: Fail to retrieve a non-existent data source.**
    *   Request: Use a non-existent ID (e.g., UUID that is not in DB).
    *   Expected Response: 404 Not Found.
*   **Scenario 3.3: Fail to retrieve with invalid ID format.**
    *   Request: Use an ID that is not a valid UUID.
    *   Expected Response: 400 Bad Request.
*   **Scenario 3.4: Fail to retrieve without authentication.**
    *   Expected Response: 401 Unauthorized.

### 4. PUT `/api/user-data-sources/:id` (Update User Defined Data Source)

*   **Scenario 4.1: Successfully update an existing data source (e.g., change name, URL).**
    *   Setup: Create a data source.
    *   Request: Valid DTO with updated fields.
    *   Expected Response: 200 OK. Body contains the updated data source object.
    *   DB Verification: Record in the database is updated. If sensitive fields (e.g., API key) are updated, they should be re-encrypted.
*   **Scenario 4.2: Successfully update auth method and related fields (e.g., from NONE to API_KEY).**
    *   Setup: Create a data source with `auth_method: NONE`.
    *   Request: DTO updates `auth_method` to `API_KEY` and provides `api_key_header`, `api_key_value`.
    *   Expected Response: 200 OK.
    *   DB Verification: `auth_method` and related config fields are updated. `api_key_value` is encrypted.
*   **Scenario 4.3: Fail to update a non-existent data source.**
    *   Request: Use a non-existent ID.
    *   Expected Response: 404 Not Found.
*   **Scenario 4.4: Fail to update with invalid DTO.**
    *   Request: DTO with invalid field values.
    *   Expected Response: 400 Bad Request.
*   **Scenario 4.5: Fail to update without authentication.**
    *   Expected Response: 401 Unauthorized.

### 5. DELETE `/api/user-data-sources/:id` (Delete User Defined Data Source)

*   **Scenario 5.1: Successfully delete an existing data source.**
    *   Setup: Create a data source.
    *   Request: Use the ID of the created data source.
    *   Expected Response: 200 OK (or 204 No Content).
    *   DB Verification: Record is removed from the database.
*   **Scenario 5.2: Fail to delete a non-existent data source.**
    *   Request: Use a non-existent ID.
    *   Expected Response: 404 Not Found.
*   **Scenario 5.3: Fail to delete with invalid ID format.**
    *   Request: Use an ID that is not a valid UUID.
    *   Expected Response: 400 Bad Request.
*   **Scenario 5.4: Fail to delete without authentication.**
    *   Expected Response: 401 Unauthorized.

### 6. POST `/api/user-data-sources/:id/test-connection` (Test Data Source Connection - Conceptual)

*   **Scenario 6.1: Successfully test connection for a valid REST API (No Auth).**
    *   Setup: Create a REST API data source (No Auth) pointing to a mockable endpoint.
    *   Mock `UserDataSourceFetchingService.fetchData` to return a success indicator.
    *   Expected Response: 200 OK with `{ success: true, message: "Connection successful", data: ... }` (or similar).
*   **Scenario 6.2: Successfully test connection for a valid REST API (API Key).**
    *   Setup: Create a REST API data source (API Key) pointing to a mockable endpoint.
    *   Mock `UserDataSourceFetchingService.fetchData` to verify correct headers and return success.
    *   Expected Response: 200 OK.
*   **Scenario 6.3: Successfully test connection for a valid JSON File URL.**
    *   Setup: Create a JSON File URL data source pointing to a mockable URL.
    *   Mock `UserDataSourceFetchingService.fetchData` to return success.
    *   Expected Response: 200 OK.
*   **Scenario 6.4: Handle connection test failure (e.g., fetch error).**
    *   Setup: Create a data source.
    *   Mock `UserDataSourceFetchingService.fetchData` to throw an error.
    *   Expected Response: 200 OK (or appropriate error like 502) with `{ success: false, message: "Connection failed: ..." }`.
*   **Scenario 6.5: Fail to test connection for a non-existent data source ID.**
    *   Expected Response: 404 Not Found.
*   **Scenario 6.6: Fail to test connection without authentication.**
    *   Expected Response: 401 Unauthorized.

**General Considerations:**
-   Ensure proper teardown after each test (e.g., clearing database records) to avoid interference between tests.
-   Validate that `organization_id` and `created_by_user_id` are correctly handled (e.g., filtered by if multi-tenancy is a concern, though current implementation seems to just store them).
-   Test for idempotency where applicable.

