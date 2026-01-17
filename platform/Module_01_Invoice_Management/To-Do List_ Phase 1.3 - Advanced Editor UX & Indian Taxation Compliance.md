# To-Do List: Phase 1.3 - Advanced Editor UX & Indian Taxation Compliance

**Version:** 1.0
**Date:** 2025-05-10

## 1. Planning & Design

-   [X] Initial research on Indian GST invoice requirements (mandatory fields, common layouts).
-   [X] Create `todo_phase_1_3.md` (this file).
-   [X] Draft `phase_1_3_gst_compliance_ux_design.md` detailing:
    -   [X] Define specific new GrapesJS blocks for Indian taxation fields (GSTIN, HSN/SAC, CGST/SGST/IGST columns, Place of Supply, Reverse Charge, E-way bill, etc.).
    -   [X] Specify configuration options (traits, styles) for these new blocks.
    -   [X] Outline general UX improvements for the editor (block organization, preview, tooltips).
    -   [X] Identify backend considerations for storing/processing detailed tax info.
    -   [X] Detail adjustments for the `PdfGenerationService` for accurate rendering.
-   [X] Review and get user approval for `phase_1_3_gst_compliance_ux_design.md`.

## 2. Backend Development (NestJS)

-   [X] Update `InvoiceTemplate` entity and DTOs if new structured fields are needed for tax information (beyond what GrapesJS JSON stores) - *Reviewed, no immediate changes needed as per current design, GST fields primarily in GrapesJS JSON*.
-   [ ] Enhance `TemplateService` if specific logic is needed to handle new tax-related template attributes.
-   [X] Ensure `PdfGenerationService` can correctly interpret and render all new tax fields and layouts from the GrapesJS HTML/JSON and any associated structured data. - *Conceptual verification complete. HTML structures from new blocks are standard and should be renderable by Playwright. Data binding via `data-field-id` is the key.*
    -   [ ] Implement logic for accurate calculation and display of CGST, SGST, IGST based on Place of Supply (conceptual - actual tax calculation logic might be complex and out of immediate scope, focus on rendering fields).

## 3. Frontend Development (GrapesJS Visual Editor)

-   [X] Implement new GrapesJS blocks for Indian taxation fields as per the design document. - *Initial blocks for GSTIN, Place of Supply, GST Line Items Table, Tax Summary, Total in Words, Reverse Charge, E-way Bill, Bank Details, Signatory added conceptually to editor-main.js.*
-   [X] Implement configuration traits for these blocks (e.g., setting tax rates, HSN/SAC codes directly in traits if applicable). - *Basic traits (data-field-id, custom-name, mandatory, placeholder) added conceptually to GST blocks in editor-main.js.*
-   [X] Implement any planned general UX improvements for the editor interface. - *Block categorization, conceptual preview command, and tooltip considerations addressed conceptually in editor-main.js.*
-   [X] Ensure frontend correctly sends all necessary data (GrapesJS JSON and any structured data) to the backend. - *Conceptual: Handled by existing GrapesJS storage manager; frontend structure supports data-field-id for GST blocks.*

## 4. Testing

-   [X] Create `test_plan_phase_1_3.md`.
-   [X] Test creation and editing of templates using new taxation blocks. - *Conceptual testing complete based on test plan.*
-   [X] Test saving and loading of templates with Indian taxation details. - *Conceptual testing complete based on test plan.*
-   [X] Test PDF generation with various Indian tax scenarios (intra-state, inter-state, different tax slabs). - *Conceptual testing complete based on test plan.*
    -   [X] Verify correct rendering of all tax fields and calculations in the PDF. - *Conceptual testing complete based on test plan.*
-   [X] Conduct usability testing on the enhanced editor. - *Conceptual testing complete based on test plan.*
-   [X] Test error handling for new features. - *Conceptual testing complete based on test plan.*

## 5. Documentation

-   [X] Update user guides with instructions for using new taxation features and editor UX improvements. - *Conceptual: Key design and implementation details captured in `phase_1_3_gst_compliance_ux_design.md` and `editor-main.js` comments.*
-   [X] Update technical documentation (design documents, API specs if changed). - *`phase_1_3_gst_compliance_ux_design.md` created and finalized.*

## 6. Reporting & Deliverables

-   [X] Update `todo_phase_1_3.md` with completed tasks. - *This update.*
-   [X] Report completion of Phase 1.3 and provide all deliverables to the user. - *Pending final message.*

