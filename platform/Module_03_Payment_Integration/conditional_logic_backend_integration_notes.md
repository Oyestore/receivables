## Backend Integration for Conditional Logic Builder

**Date:** 2025-05-11

**Objective:** Ensure and document that conditional logic rules defined in the frontend GrapesJS editor are correctly persisted and retrieved by the backend.

**Mechanism:**

The Conditional Logic Builder plugin, implemented in the frontend (`editor-main.js`), stores the defined conditions as a JSON string within a `data-gjs-conditions` attribute directly on the respective GrapesJS component. When the GrapesJS editor saves the template content, it serializes the entire canvas, including all components and their attributes, into a single JSON object. This JSON object is the `template_definition`.

**Backend Handling:**

1.  **Storage:**
    *   The backend `TemplateService`, when handling requests to save or update a template (e.g., via `POST /templates` or `PUT /templates/:masterId` which creates/updates an `InvoiceTemplateVersion`), receives the complete `template_definition` JSON from the frontend.
    *   This `template_definition` (containing the embedded `data-gjs-conditions` attributes within its component data) is stored directly in the `template_definition` column (JSONB type) of the `InvoiceTemplateVersion` entity in the PostgreSQL database.
    *   **No new specific API endpoints or backend parsing logic is required for storing the conditional logic rules.** The existing mechanisms for saving the GrapesJS template data are sufficient, as the conditions are an integral part of that data.

2.  **Retrieval:**
    *   When the frontend requests a template version (e.g., via `GET /templates/:masterId/versions/:versionNumber`), the `TemplateService` retrieves the corresponding `InvoiceTemplateVersion` record.
    *   The full `template_definition` JSON is returned to the frontend.
    *   The GrapesJS editor, upon loading this `template_definition`, will automatically parse the components and their attributes, making the `data-gjs-conditions` available to the Conditional Logic Builder plugin for display and editing.

**Conclusion:**

The backend integration for storing and retrieving conditional logic rules is inherently handled by the existing template management APIs that save and load the GrapesJS `template_definition`. The key is that the frontend correctly embeds the conditions into this definition, and the backend faithfully stores and returns it. Server-side *evaluation* of these rules (e.g., during PDF generation) is a separate, more advanced concern and is not part of this storage/retrieval mechanism for the editor.

