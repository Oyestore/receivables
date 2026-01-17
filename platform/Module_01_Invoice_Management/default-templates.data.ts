import * as fs from "fs/promises";
import * as path from "path";

// This is a conceptual structure for seeding. 
// In a real application, this might be part of a database migration or a dedicated seeding script.

export const getDefaultTemplatesData = async (organizationId: string, tenantId: string) => {
  const classicHtmlPath = path.join(__dirname, "./default_template_html/classic_professional.html");
  const modernHtmlPath = path.join(__dirname, "./default_template_html/modern_invoice.html");

  let classicHtmlContent = "";
  let modernHtmlContent = "";

  try {
    classicHtmlContent = await fs.readFile(classicHtmlPath, "utf-8");
    modernHtmlContent = await fs.readFile(modernHtmlPath, "utf-8");
  } catch (error) {
    console.error("Error reading default template HTML files:", error);
    // Handle error appropriately, maybe throw or return empty array
    return [];
  }

  return [
    {
      tenant_id: tenantId,
      organization_id: organizationId, // This would be a placeholder or a specific system org ID
      template_name: "Classic Professional",
      description: "A timeless and professional invoice layout suitable for various businesses.",
      template_definition: {
        html: classicHtmlContent,
        // Potentially add other metadata here like editable_fields, mandatory_fields_config
        // For example, a list of field IDs that are mandatory and cannot be hidden by users.
        // mandatory_fields: ["invoice_number", "invoice_date", "company_gstin", "grand_total_row"]
      },
      is_system_template: true,
      is_default_for_org: true, // Make the first one default for new orgs, or handle this logic elsewhere
      preview_image_url: "/previews/classic_professional.png", // Placeholder
    },
    {
      tenant_id: tenantId,
      organization_id: organizationId,
      template_name: "Modern Clean",
      description: "A sleek and modern invoice design with a focus on readability.",
      template_definition: {
        html: modernHtmlContent,
        // mandatory_fields: ["invoice_number", "invoice_date", "company_gstin", "grand_total_row"]
      },
      is_system_template: true,
      is_default_for_org: false,
      preview_image_url: "/previews/modern_clean.png", // Placeholder
    },
    // Add more default templates here
  ];
};

// Note: For actual seeding, you would call this function and use the TemplateService.create() method
// within a NestJS lifecycle hook (e.g., OnModuleInit in TemplateModule or AppModule)
// or a separate seeding script. Ensure that organizationId and tenantId are handled correctly
// (e.g., for a global set of system templates, organization_id might be null or a special system ID).

