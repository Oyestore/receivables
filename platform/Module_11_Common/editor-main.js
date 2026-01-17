// editor-main.js

// Assume GrapesJS is available globally or imported via a build system
document.addEventListener("DOMContentLoaded", () => {
    const jwtToken = localStorage.getItem("jwtToken"); // Placeholder for JWT token retrieval
    if (!jwtToken) {
        // Redirect to login or show message if not developing locally without auth
        // For development, we might bypass this or use a dummy token.
        console.warn("JWT Token not found. API calls might fail if auth is enforced.");
        // window.location.href = '/login.html'; // Example redirect
    }

    // --- AUTHENTICATED FETCH HELPER ---
    const API_BASE_URL = "."; // Assuming API is relative to current path (e.g. /api/..)
                               // If NestJS serves frontend and API from same domain/port,
                               // and API is under /api, then './api' or '/api' might be okay.
                               // Or, if different, use full URL: 'http://localhost:3000/api'

    async function authenticatedFetch(url, options = {}) {
        const token = localStorage.getItem("jwtToken");
        const headers = {
            "Content-Type": "application/json",
            ...options.headers,
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`, {
                ...options,
                headers,
            });

            if (response.status === 401) {
                alert("Unauthorized. Please log in again.");
                // window.location.href = "./login.html"; // Adjust path as needed
                throw new Error("Unauthorized");
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                const errorMessage = errorData.message || `HTTP error ${response.status}`;
                console.error(`API Error (${url}): ${errorMessage}`, errorData);
                alert(`Error: ${errorMessage}`);
                throw new Error(errorMessage);
            }
            if (response.status === 204) { // No Content
                return null;
            }
            return await response.json();
        } catch (error) {
            console.error(`Fetch failed for ${url}:`, error);
            if (! (error.message === "Unauthorized" || error.message.startsWith("HTTP error"))) {
                 // alert(`Request failed: ${error.message}`);
            }
            throw error;
        }
    }
    // --- END AUTHENTICATED FETCH HELPER ---

    // --- LOADING INDICATOR HELPERS ---
    function showLoadingIndicator(elementIdOrSelector, isSelector = false) {
        const el = isSelector ? document.querySelector(elementIdOrSelector) : document.getElementById(elementIdOrSelector);
        if (el && !el.querySelector(".loading-spinner")) {
            el.insertAdjacentHTML("afterbegin", 
                `<div class=\"loading-spinner\" style=\"padding:10px; text-align:center; color:#555;\"><p>Loading...</p></div>`);
        }
    }
    function hideLoadingIndicator(elementIdOrSelector, isSelector = false) {
        const el = isSelector ? document.querySelector(elementIdOrSelector) : document.getElementById(elementIdOrSelector);
        if (el) {
            const spinner = el.querySelector(".loading-spinner");
            if (spinner) spinner.remove();
        }
    }
    function showEditorLoadingOverlay(text = "Processing...") {
        let overlay = document.getElementById("editor-loading-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "editor-loading-overlay";
            overlay.style.position = "fixed";
            overlay.style.top = "0";
            overlay.style.left = "0";
            overlay.style.width = "100%";
            overlay.style.height = "100%";
            overlay.style.backgroundColor = "rgba(0,0,0,0.6)";
            overlay.style.color = "white";
            overlay.style.display = "flex";
            overlay.style.alignItems = "center";
            overlay.style.justifyContent = "center";
            overlay.style.zIndex = "10000";
            overlay.innerHTML = `<h2 style=\"padding:20px; background:rgba(0,0,0,0.7); border-radius:5px;\">${text}</h2>`;
            document.body.appendChild(overlay);
        }
        overlay.querySelector("h2").textContent = text;
        overlay.style.display = "flex";
    }
    function hideEditorLoadingOverlay() {
        const overlay = document.getElementById("editor-loading-overlay");
        if (overlay) {
            overlay.style.display = "none";
        }
    }
    // --- END LOADING INDICATOR HELPERS ---

    // --- UTILITY: ESCAPE HTML ---
    function escapeHtml(unsafe) {
        if (typeof unsafe !== "string") return unsafe;
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }
    // --- END UTILITY: ESCAPE HTML ---

    // --- GRAPESJS EDITOR INITIALIZATION ---
    const editor = grapesjs.init({
        container: "#gjs",
        fromElement: true,
        height: "calc(100vh - 40px)", // Adjust as needed
        width: "auto",
        storageManager: {
            id: "gjs-", // Prefix for local storage
            type: "remote", // Use remote storage for backend integration
            autosave: false, // Turn off autosave, rely on manual save button
            autoload: true, // Autoload on init
            stepsBeforeSave: 1,
        },
        assetManager: {
            // Basic asset manager configuration (e.g., for images)
            assets: [],
            upload: false, // Set to true and configure if you have an upload endpoint
            // uploadText: 'Drop files here or click to upload',
        },
        panels: {
            defaults: [
                {
                    id: "layers",
                    el: ".panel__right",
                    resizable: {
                        maxDim: 350,
                        minDim: 200,
                        tc: 0,
                        cl: 1,
                        cr: 0,
                        bc: 0,
                        keyWidth: "flex-basis",
                    },
                },
                {
                    id: "panel-switcher",
                    el: ".panel__switcher",
                    buttons: [
                        { id: "show-layers", active: true, label: "Layers", command: "show-layers", toggle: true },
                        { id: "show-style", label: "Style", command: "show-style", toggle: true },
                        { id: "show-traits", label: "Traits", command: "show-traits", toggle: true },
                        { id: "show-blocks", label: "Blocks", command: "show-blocks", toggle: true },
                    ],
                },
                {
                    id: "panel-devices",
                    el: ".panel__devices",
                    buttons: [
                        { id: "device-desktop", active: true, label: "D", command: "set-device-desktop" },
                        { id: "device-mobile", label: "M", command: "set-device-mobile" },
                    ],
                },
                {
                    id: "panel-top-buttons",
                    el: ".panel__top_buttons",
                    buttons: [
                        { id: "save-db", label: "Save", command: "save-db" },
                        { id: "undo", label: "<i class=\"fa fa-undo\"></i>", command: "core:undo" },
                        { id: "redo", label: "<i class=\"fa fa-repeat\"></i>", command: "core:redo" },
                        { id: "export-template", label: "Export", command: "export-template" },
                        { id: "clear-canvas", label: "Clear", command: "clear-canvas" },
                    ],
                }
            ]
        },
        blockManager: {
            appendTo: "#blocks",
            blocks: [
                { id: "text", label: "Text", content: '<div data-gjs-type="text">Insert your text here</div>', category: "Basic" },
                { id: "image", label: "Image", select: true, content: { type: "image" }, activate: true, category: "Basic" },
                { id: "link", label: "Link", content: '<a href="#">Link</a>', category: "Basic" },
                { id: "section", label: "Section", content: '<section><h1>This is a simple title</h1><div>This is just a Lorem text: Lorem ipsum dolor sit amet</div></section>', category: "Layout" },
                { id: "column1", label: "1 Column", content: '<div class="row" data-gjs-droppable=".cell"><div class="cell"></div></div>', category: "Grid" },
                { id: "column2", label: "2 Columns", content: '<div class="row" data-gjs-droppable=".cell"><div class="cell"></div><div class="cell"></div></div>', category: "Grid" },
                { id: "column3", label: "3 Columns", content: '<div class="row" data-gjs-droppable=".cell"><div class="cell"></div><div class="cell"></div><div class="cell"></div></div>', category: "Grid" },
            ]
        },
        // Configure templateLoadId, templateName, templateDescription from URL params or other source
        // This is important for the storageManager to know what to load/save.
        templateLoadId: new URLSearchParams(window.location.search).get("templateId"), // Example: ?templateId=xxx
        templateName: "My Template", // Default or loaded
        templateDescription: "", // Default or loaded
    });

    // --- COMMANDS ---
    editor.Commands.add("save-db", {
        run: (editor, sender) => {
            sender && sender.set("active", 0); // Turn off the button
            editor.store();
        },
    });
    editor.Commands.add("export-template", editor => {
        console.log(editor.getHtml());
        console.log(editor.getCss());
        // Further export logic can be added here
    });
    editor.Commands.add("clear-canvas", editor => {
        if (confirm("Are you sure you want to clear the canvas?")) {
            editor.DomComponents.clear();
            editor.CssComposer.clear();
            setCurrentTemplateMasterId(null); // Reset master ID for new template
            displayVersionHistory(null);
            editor.Config.templateName = "Untitled Template";
            editor.Config.templateDescription = "";
        }
    });
    editor.Commands.add("show-layers", {
        getRowEl(editor) { return editor.getContainer().closest(".editor-row"); },
        getLayersEl(row) { return row.querySelector(".layers-container"); },
        run(editor, sender) {
            const lmEl = this.getLayersEl(this.getRowEl(editor));
            lmEl.style.display = "";
        },
        stop(editor, sender) {
            const lmEl = this.getLayersEl(this.getRowEl(editor));
            lmEl.style.display = "none";
        },
    });
    editor.Commands.add("show-style", {
        getRowEl(editor) { return editor.getContainer().closest(".editor-row"); },
        getStyleEl(row) { return row.querySelector(".styles-container"); },
        run(editor, sender) {
            const smEl = this.getStyleEl(this.getRowEl(editor));
            smEl.style.display = "";
        },
        stop(editor, sender) {
            const smEl = this.getStyleEl(this.getRowEl(editor));
            smEl.style.display = "none";
        },
    });
    editor.Commands.add("show-traits", {
        getRowEl(editor) { return editor.getContainer().closest(".editor-row"); },
        getTraitsEl(row) { return row.querySelector(".traits-container"); },
        run(editor, sender) {
            const trmEl = this.getTraitsEl(this.getRowEl(editor));
            trmEl.style.display = "";
        },
        stop(editor, sender) {
            const trmEl = this.getTraitsEl(this.getRowEl(editor));
            trmEl.style.display = "none";
        },
    });
    editor.Commands.add("show-blocks", {
        getRowEl(editor) { return editor.getContainer().closest(".editor-row"); },
        getBlocksEl(row) { return row.querySelector(".blocks-container"); },
        run(editor, sender) {
            const bmEl = this.getBlocksEl(this.getRowEl(editor));
            bmEl.style.display = "";
        },
        stop(editor, sender) {
            const bmEl = this.getBlocksEl(this.getRowEl(editor));
            bmEl.style.display = "none";
        },
    });
    editor.Commands.add("set-device-desktop", editor => editor.setDevice("Desktop"));
    editor.Commands.add("set-device-mobile", editor => editor.setDevice("Mobile"));

    // --- BEGIN PHASE 1.4: CONDITIONAL LOGIC BUILDER PLUGIN ---
    editor.plugins.add("conditional-logic-builder", (editor, opts = {}) => {
        const comps = editor.DomComponents;
        const originalComponentType = comps.getType("default");
        const originalComponentView = originalComponentType.view;
        const originalComponentModel = originalComponentType.model;

        comps.addType("default", {
            model: {
                defaults: {
                    ...originalComponentModel.prototype.defaults,
                    traits: [
                        ...(originalComponentModel.prototype.defaults.traits || []),
                        {
                            type: "button",
                            name: "edit-conditions",
                            label: "Conditional Logic",
                            command: "open-conditional-logic-modal",
                            full: true,
                        },
                        {
                            type: "hidden",
                            name: "data-gjs-conditions",
                        }
                    ].filter((trait, index, self) => 
                        index === self.findIndex((t) => t.name === trait.name)
                    )
                },
                getConditions() {
                    const conditionsAttr = this.getAttributes()["data-gjs-conditions"];
                    try {
                        return conditionsAttr ? JSON.parse(conditionsAttr) : [];
                    } catch (e) {
                        console.error("Error parsing conditions JSON:", e);
                        return [];
                    }
                },
                setConditions(conditionsArray) {
                    this.addAttributes({"data-gjs-conditions": JSON.stringify(conditionsArray)});
                }
            },
            view: originalComponentView
        });

        editor.Commands.add("open-conditional-logic-modal", {
            run: (editor, sender) => {
                const selectedComponent = editor.getSelected();
                if (!selectedComponent) {
                    alert("Please select a component to apply conditional logic.");
                    return;
                }
                openConditionalLogicModal(selectedComponent);
            }
        });

        const PREDEFINED_INVOICE_FIELDS = [
            { id: "invoice.total", label: "Invoice Total", type: "number" },
            { id: "invoice.subtotal", label: "Invoice Subtotal", type: "number" },
            { id: "invoice.tax_amount", label: "Invoice Tax Amount", type: "number" },
            { id: "invoice.status", label: "Invoice Status (e.g., Overdue, Paid)", type: "string" },
            { id: "recipient.name", label: "Recipient Name", type: "string" },
            { id: "recipient.country", label: "Recipient Country", type: "string" },
            { id: "recipient.state", label: "Recipient State", type: "string" },
            { id: "lineItem.quantity", label: "Line Item Quantity (any item)", type: "number" },
            { id: "lineItem.price", label: "Line Item Price (any item)", type: "number" },
            { id: "invoice.item_count", label:
(Content truncated due to size limit. Use line ranges to read in chunks)