## Phase 1.2+ Documentation Update

This document outlines the updates to the project documentation following the completion of Phase 1.2+, which introduced a visual template editor and advanced template management features.

### 1. Overview of Phase 1.2+

Phase 1.2+ aimed to enhance the template management capabilities of the system by introducing a visual drag-and-drop editor for creating and customizing templates, along with advanced features such as conditional display logic, user-defined data sources, template versioning, and a user-friendly default template autoload mechanism. These enhancements provide users with greater flexibility and control over their templates.

### 2. Key Features Implemented

#### 2.1. Visual Template Editor

*   **Description:** A user-friendly interface allowing users to design and customize templates using drag-and-drop functionality.
*   **Implementation:** Integrated GrapesJS to provide a rich editing experience. The editor includes an info bar for template name, description, version, and status.
*   **Benefits:** Simplifies template creation and modification, making it accessible to users without coding knowledge.

#### 2.2. Default Template Autoload

*   **Description:** When the editor is opened without a specific template ID, a predefined system default template (e.g., "Classic Professional") is automatically loaded.
*   **Implementation:** Frontend logic in `editor-main.js` checks for a template ID in the URL. If absent, it attempts to load the `DEFAULT_SYSTEM_TEMPLATE_ID`.
*   **Benefits:** Provides a more user-friendly starting experience, offering an immediate base for new templates rather than a blank canvas.

#### 2.3. Conditional Display Logic (Conceptual)

*   **Description:** Allows users to define rules that determine whether specific sections or elements within a template are displayed, based on certain conditions (e.g., value of a data field).
*   **Implementation:** Conceptualized via `data-gjs-condition` attributes on components. Backend PDF generation service would parse and apply these conditions.
*   **Benefits:** Enables dynamic and personalized content generation.

#### 2.4. User-Defined Data Sources (Conceptual)

*   **Description:** Provides users with the ability to define and use custom data fields within their templates.
*   **Implementation:** Conceptualized UI for managing custom data sources. Templates can reference these via placeholders like `{{userData.customField}}`.
*   **Benefits:** Increases the flexibility of templates by allowing for a wider range of data to be included.

#### 2.5. Template Versioning & Status Management

*   **Description:** Keeps track of different versions of templates (DRAFT, PUBLISHED, ARCHIVED) and allows users to (conceptually) view history and revert.
*   **Implementation:** Backend services manage version creation on updates to PUBLISHED templates and handle status transitions. Frontend includes UI elements for save, publish, and conceptual version history display.
*   **Benefits:** Provides a safety net for template editing, workflow management, and allows for easy rollback (conceptually).

### 3. Technical Implementation Details

*   **Frontend:** The visual editor is built using GrapesJS (`editor.html`, `js/editor-main.js`, `css/editor-styles.css`, `css/editor-canvas-styles.css`). It communicates with the backend via REST APIs for template CRUD, publishing, and versioning.
*   **Backend:** NestJS services were extended to store GrapesJS JSON definitions, manage template versions (creating new DRAFTs from PUBLISHED updates), handle statuses, and support publishing. The `InvoiceTemplate` entity and DTOs were updated accordingly.
*   **API:** Endpoints for `/organizations/{orgId}/templates` (CRUD), `/templates/{id}/publish`, and conceptual endpoints for `/templates/{id}/versions` and `/templates/{id}/revert/{versionId}`.

### 4. User Guide Updates

*   **Starting the Editor:** The editor will now automatically load a default template (e.g., "Classic Professional") if no specific template is being edited. Users can modify this and save it as a new template.
*   **Creating and Customizing Templates:** Detailed instructions on how to use the new visual editor, including the template info bar (name, description), drag-and-drop functionality, styling options, and adding custom fields.
*   **Saving and Publishing:** How to save drafts, publish templates, and understand the versioning implications.
*   **Using Conditional Logic (Conceptual):** How to (conceptually) define conditions for displaying elements.
*   **Managing Template Versions (Conceptual):** Instructions on how to (conceptually) view version history and revert to previous versions.
*   **Working with User-Defined Data Sources (Conceptual):** How to (conceptually) define, manage, and use custom data fields in templates.

This update ensures that users can fully leverage the new features implemented in Phase 1.2+ to create and manage their templates effectively.
