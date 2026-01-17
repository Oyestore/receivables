// Conceptual Frontend GrapesJS Integration for Smart Invoice Template Editor
// File: /home/ubuntu/smart_invoice_module/invoice_agent_nestjs/src/frontend_conceptual/grapesjs-editor-integration.js

/**
 * This is a conceptual outline for integrating GrapesJS into a frontend application
 * for the Smart Invoice Template Editor. It does not represent runnable code but rather
 * the key steps and considerations.
 */

// 1. Initialize GrapesJS Editor
// ---------------------------------
// The editor would be initialized targeting a specific DOM element.
// Configuration would include:
// - Container element ID
// - Storage manager settings (to interact with backend APIs)
// - Block manager settings (predefined invoice components)
// - Style manager settings (CSS properties allowed)
// - Asset manager settings (for images like logos)
// - Plugins (e.g., for custom components, data source binding, conditional logic UI)

/*
const editor = grapesjs.init({
    container: "#gjs-editor-container",
    height: "calc(100vh - 50px)", // Example height
    width: "auto",
    fromElement: false, // We will load/store data via API

    // Storage Manager: To load and save templates via backend API
    storageManager: {
        type: "remote", // Custom remote storage
        autosave: true,
        stepsBeforeSave: 1,
        urlStore: `/api/organizations/${currentOrganizationId}/templates/${currentTemplateId}`,
        urlLoad: `/api/organizations/${currentOrganizationId}/templates/${currentTemplateId}`,
        contentTypeJson: true,
        // params: { _csrf: "..." }, // For CSRF protection if needed
        // headers: { Authorization: "Bearer ..." }, // For auth
        onStore: (data, editor) => {
            // Data to be sent to the backend (GrapesJS JSON definition)
            // The backend `template_definition` field will store this.
            return { template_definition: data };
        },
        onLoad: (result) => {
            // Data received from the backend
            // Expects { template_definition: { ...GrapesJS JSON... } }
            return result.template_definition || {};
        },
    },

    // Block Manager: Define draggable components for invoices
    blockManager: {
        appendTo: "#blocks-container",
        blocks: [
            { id: "text", label: "Text", content: 
                "<div>Insert your text here</div>", category: "Basic" },
            { id: "image", label: "Image", select: true, content: { type: "image" }, activate: true, category: "Basic" },
            {
                id: "invoice-header",
                label: "Invoice Header",
                content: `
                    <div data-gjs-type="invoice-header-component" class="invoice-header">
                        <img src="placeholder-logo.png" alt="Company Logo" data-gjs-editable="false" data-gjs-prop="logoSrc"/>
                        <div class="company-details">
                            <h1 data-gjs-type="text" data-gjs-removable="false" data-field-id="company.name">{{company.name}}</h1>
                            <p data-gjs-type="text" data-field-id="company.address">{{company.address}}</p>
                        </div>
                        <div class="invoice-title">
                            <h2 data-gjs-type="text" data-field-id="invoice.title">{{invoice.title | default: \"INVOICE\"}}</h2>
                            <p data-gjs-type="text">Invoice #: <span data-field-id="invoice.number">{{invoice.number}}</span></p>
                            <p data-gjs-type="text">Date: <span data-field-id="invoice.date">{{invoice.date}}</span></p>
                        </div>
                    </div>
                `,
                category: "Invoice Sections",
            },
            // ... more invoice-specific blocks (line items table, totals, terms, etc.)
            // Each block should have `data-field-id` attributes for dynamic data binding
            // and potentially `data-gjs-conditional` for conditional display logic.
        ],
    },

    // Style Manager: Configure available CSS properties
    styleManager: {
        appendTo: "#styles-container",
        sectors: [
            // ... define sectors for dimensions, typography, decorations etc.
        ],
    },

    // Layer Manager: Shows the structure of the template
    layerManager: { appendTo: "#layers-container" },

    // Trait Manager: For editing component properties
    traitManager: { appendTo: "#traits-container" },

    // Device Manager: For responsive design previews
    deviceManager: {
        devices: [
            { name: "Desktop", width: "" },
            { name: "Tablet", width: "768px", widthMedia: "992px" },
            { name: "Mobile", width: "320px", widthMedia: "480px" },
        ],
    },

    // Asset Manager: For uploading/selecting images (e.g., logos)
    assetManager: {
        assets: [], // Initial assets
        upload: `/api/organizations/${currentOrganizationId}/assets/upload`, // Backend endpoint for uploads
        uploadName: "files",
        // params: { _csrf: "..." },
        // headers: { Authorization: "Bearer ..." },
    },

    // Canvas configuration
    canvas: {
        styles: [
            "https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css", // Example external CSS
            "/css/invoice-template-editor-canvas.css" // Custom canvas styles
        ],
        scripts: [
            // Scripts to be loaded in the canvas, e.g., for custom component logic or data binding previews
        ]
    },

    // Plugins for advanced features
    plugins: [
        // 1. Custom components plugin (if needed beyond basic blocks)
        // 2. Data Source Binding Plugin:
        //    - UI to select data fields (standard invoice fields, user-defined sources)
        //    - Logic to insert placeholders like {{invoice.number}} or {{customData.myField}}
        //    - Store mapping in component attributes (e.g., data-field-id)
        // 3. Conditional Logic Plugin:
        //    - UI to define conditions (e.g., IF invoice.total > 1000)
        //    - Store condition rules in component attributes (e.g., data-gjs-condition="invoice.total > 1000")
        // 4. Template Versioning UI Plugin (if versioning actions are managed from editor):
        //    - Buttons for "Save as new version", "View history"
        //    - Interacts with backend versioning APIs
    ],
    pluginsOpts: {
        // Options for each plugin
    }
});
*/

// 2. Define Custom GrapesJS Components for Invoice Elements
// ---------------------------------------------------------
// Example: A line item table component
/*
editor.Components.addType("invoice-line-items-table", {
    model: {
        defaults: {
            tagName: "table",
            attributes: { class: "table table-bordered invoice-line-items" },
            components: `
                <thead>
                    <tr>
                        <th data-field-id="line_items.header.description">Description</th>
                        <th data-field-id="line_items.header.quantity">Quantity</th>
                        <th data-field-id="line_items.header.unit_price">Unit Price</th>
                        <th data-field-id="line_items.header.total">Total</th>
                    </tr>
                </thead>
                <tbody data-gjs-repeatable="line_items" data-gjs-repeatable-source="invoice.line_items">
                    <tr data-gjs-repeatable-item>
                        <td data-field-id="description">{{item.description}}</td>
                        <td data-field-id="quantity">{{item.quantity}}</td>
                        <td data-field-id="unit_price">{{item.unit_price}}</td>
                        <td data-field-id="line_total">{{item.line_total}}</td>
                    </tr>
                </tbody>
            `,
            // Traits for customization (e.g., show/hide columns)
            traits: [
                { type: "checkbox", name: "showDiscountColumn", label: "Show Discount Column?" },
            ],
        },
    },
    view: { // Custom view logic if needed },
});
*/

// 3. Implement Data Binding and Conditional Logic Handling
// -------------------------------------------------------
// This would likely involve GrapesJS plugins or extending the core.
// - Data Binding: The editor needs to allow users to insert placeholders.
//   The backend PDF generation service will resolve these placeholders against actual data.
// - Conditional Logic: The editor allows users to set conditions on components/blocks.
//   These conditions (e.g., stored as `data-gjs-condition="invoice.total > 1000"`)
//   would be interpreted by the backend PDF generation service to show/hide elements.

// 4. User-Defined Data Sources UI
// ---------------------------------
// A separate UI section (outside GrapesJS or as a GrapesJS plugin panel) would allow users to:
// - Define custom data fields (e.g., name: "ProjectManager", type: "string", sampleValue: "Jane Doe").
// - These definitions would be saved via backend API.
// - These custom fields would then be available in the GrapesJS editor for data binding.

// 5. Template Versioning UI
// ---------------------------
// UI elements (e.g., buttons, dropdowns) to:
// - Save current state as a new version (calls backend PUT /templates/{id} which handles versioning).
// - List versions of the current template (calls backend GET /templates/{id}/versions).
// - Revert to a specific version (calls backend POST /templates/{id}/revert/{version_id}).
// - Publish a DRAFT template (calls backend POST /templates/{id}/publish).

// 6. Event Handling
// -------------------
// editor.on("storage:store", (data) => { /* Handle after save if needed */ });
// editor.on("component:selected", (component) => { /* Update UI based on selected component */ });

console.log("Conceptual GrapesJS integration outline loaded.");


