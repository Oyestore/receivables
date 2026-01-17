import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import * as playwright from "playwright-aws-lambda";
import * as fs from "fs/promises";
import { JSDOM } from "jsdom";
import { Invoice } from "../../invoices/entities/invoice.entity";
import { InvoiceTemplate } from "../../templates/entities/invoice-template.entity";
import { InvoiceLineItem } from "../../invoices/entities/invoice-line-item.entity";
import { ConditionalLogicService } from "../../conditional-logic/services/conditional-logic.service";
import { Conditions } from "../../conditional-logic/interfaces/condition.interface";
import { UserDataSourceFetchingService } from "../../user-data-sources/services/user-data-source-fetching.service"; // Import FetchingService
import * as _ from "lodash"; // For deep merging

@Injectable()
export class PdfGenerationService {
  private readonly logger = new Logger(PdfGenerationService.name);

  constructor(
    private readonly conditionalLogicService: ConditionalLogicService,
    private readonly dataSourceFetchingService: UserDataSourceFetchingService, // Inject FetchingService
  ) {}

  private applyConditionalLogic(htmlString: string, data: any): string {
    this.logger.log("Applying conditional logic to HTML template...");
    const dom = new JSDOM(htmlString);
    const document = dom.window.document;
    const elementsWithConditions = document.querySelectorAll("[data-gjs-conditions]");

    elementsWithConditions.forEach(element => {
      const conditionsString = element.getAttribute("data-gjs-conditions");
      if (conditionsString) {
        try {
          const conditions = JSON.parse(conditionsString) as Conditions;
          if (!this.conditionalLogicService.evaluateAllConditions(conditions, data)) {
            element.remove();
            this.logger.log(`Element removed due to unmet conditions: ${element.id || element.tagName}`);
          } else {
            this.logger.log(`Element kept, conditions met: ${element.id || element.tagName}`);
          }
        } catch (error) {
          this.logger.error(`Error parsing or evaluating conditions for element: ${element.id || element.tagName}`, error);
        }
      }
    });
    this.logger.log("Conditional logic application complete.");
    return dom.serialize();
  }

  private async generatePdfUsingTemplateAndData(
    htmlTemplateString: string, 
    combinedData: any, // Renamed from invoiceData to combinedData
    outputPath?: string
  ): Promise<Buffer> {
    let browser = null;
    try {
      this.logger.log("Launching browser for PDF generation...");
      browser = await playwright.launchChromium({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      // Apply conditional logic using the combined data BEFORE setting content
      const processedHtml = this.applyConditionalLogic(htmlTemplateString, combinedData);

      this.logger.log("Setting processed HTML content for PDF generation...");
      await page.setContent(processedHtml, { waitUntil: "networkidle" });

      this.logger.log("Populating template with combined data in browser context...");
      await page.evaluate((dataToEvaluate) => {
        // Helper to set text content or value of elements found by data-field-id
        const populateField = (fieldId: string, value: any) => {
          const elements = document.querySelectorAll(`[data-field-id="${fieldId}"]`);
          elements.forEach(el => {
            const element = el as HTMLElement;
            if (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT") {
              (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value = String(value === null || value === undefined ? "" : value);
            } else {
              element.innerText = String(value === null || value === undefined ? "" : value);
            }
          });
        };

        // Helper for deep access, e.g., dataToEvaluate["invoice.clientName"]
        const getDeepValue = (obj: any, path: string) => {
            const keys = path.split(".");
            let current = obj;
            for (const key of keys) {
                if (current && typeof current === "object" && key in current) {
                    current = current[key];
                } else {
                    return undefined; // Path not found
                }
            }
            return current;
        };

        // Populate fields based on data-field-id attributes
        // This assumes data-field-id can be like "invoice.clientName" or "user_data.someSource.someField"
        const allDataFields = document.querySelectorAll("[data-field-id]");
        allDataFields.forEach(el => {
            const fieldId = el.getAttribute("data-field-id");
            if (fieldId) {
                const value = getDeepValue(dataToEvaluate, fieldId);
                if (value !== undefined) {
                    populateField(fieldId, value);
                }
            }
        });

        // Specific handling for line items (assuming they are under invoice.line_items)
        const lineItems = getDeepValue(dataToEvaluate, "invoice.line_items") as any[];
        if (Array.isArray(lineItems)) {
          const tbody = document.querySelector(".items-table tbody");
          if (tbody) {
            tbody.innerHTML = "";
            lineItems.forEach((item: any) => {
              const row = document.createElement("tr");
              // This cell creation needs to be robust or templates need a standard structure
              const cellsData = [
                item.description || "",
                String(item.quantity || 0),
                String(item.unit_price !== undefined ? Number(item.unit_price).toFixed(2) : "0.00"),
                String(item.tax_rate !== undefined ? item.tax_rate : "-"),
                String(item.total_amount !== undefined ? Number(item.total_amount).toFixed(2) : "0.00"),
              ];
              cellsData.forEach(cellContent => {
                const td = document.createElement("td");
                td.innerText = cellContent;
                row.appendChild(td);
              });
              tbody.appendChild(row);
            });
          }
        }
      }, combinedData);

      this.logger.log("Generating PDF buffer...");
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" },
      });

      if (outputPath) {
        this.logger.log(`Saving PDF to: ${outputPath}`);
        await fs.writeFile(outputPath, pdfBuffer);
        this.logger.log("PDF saved successfully.");
      }
      return pdfBuffer;
    } catch (error) {
      this.logger.error("Error generating PDF:", error);
      throw new InternalServerErrorException(`Failed to generate PDF: ${error.message || error}`);
    } finally {
      if (browser) {
        this.logger.log("Closing browser...");
        await browser.close();
      }
    }
  }

  async generateInvoicePdf(
    invoiceData: Invoice, 
    template: InvoiceTemplate, 
    dataSourceIdsToFetch?: string[], // Optional: IDs of UserDefinedDataSources to fetch
    dataSourceParams?: Record<string, Record<string, any>> // Optional: Params for each data source { dataSourceId: { param1: value1 } }
  ): Promise<Buffer> {
    this.logger.log(`Generating PDF for invoice ID: ${invoiceData.id} using template: ${template.name}`);
    const grapesJsHtml = template.template_definition;
    if (!grapesJsHtml || typeof grapesJsHtml !== "string") {
      this.logger.error(`Invalid HTML template definition for template: ${template.name} (ID: ${template.id})`);
      throw new InternalServerErrorException("Invalid HTML template definition.");
    }

    // 1. Prepare primary invoice data (namespaced under "invoice")
    const primaryInvoiceData = {
      invoiceNumber: invoiceData.invoice_number,
      issueDate: invoiceData.issue_date ? new Date(invoiceData.issue_date).toLocaleDateString("en-CA") : "",
      dueDate: invoiceData.due_date ? new Date(invoiceData.due_date).toLocaleDateString("en-CA") : "",
      companyName: invoiceData.company_name,
      companyAddress: invoiceData.company_address,
      companyContact: invoiceData.company_contact,
      companyGstin: invoiceData.company_gstin,
      clientName: invoiceData.client_name,
      clientAddress: invoiceData.client_address,
      clientContact: invoiceData.client_contact,
      clientGstin: invoiceData.client_gstin,
      placeOfSupply: invoiceData.place_of_supply,
      subtotal: invoiceData.subtotal !== undefined ? Number(invoiceData.subtotal).toFixed(2) : "0.00",
      cgstAmount: invoiceData.cgst_amount !== undefined ? Number(invoiceData.cgst_amount).toFixed(2) : "0.00",
      sgstAmount: invoiceData.sgst_amount !== undefined ? Number(invoiceData.sgst_amount).toFixed(2) : "0.00",
      igstAmount: invoiceData.igst_amount !== undefined ? Number(invoiceData.igst_amount).toFixed(2) : "0.00",
      totalTaxAmount: invoiceData.total_tax_amount !== undefined ? Number(invoiceData.total_tax_amount).toFixed(2) : "0.00",
      totalAmount: invoiceData.total_amount !== undefined ? Number(invoiceData.total_amount).toFixed(2) : "0.00",
      termsAndConditions: invoiceData.terms_and_conditions,
      bankDetails: invoiceData.bank_details,
      notes: invoiceData.notes,
      line_items: invoiceData.lineItems?.map((item: InvoiceLineItem) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price !== undefined ? Number(item.unit_price).toFixed(2) : "0.00",
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount !== undefined ? Number(item.tax_amount).toFixed(2) : "0.00",
        total_amount: item.total_amount !== undefined ? Number(item.total_amount).toFixed(2) : "0.00",
      })) || [],
    };

    let combinedData: any = { invoice: primaryInvoiceData, user_data: {} };

    // 2. Fetch and merge data from User-Defined Data Sources
    if (dataSourceIdsToFetch && dataSourceIdsToFetch.length > 0) {
      this.logger.log(`Fetching data for user-defined sources: ${dataSourceIdsToFetch.join(", ")}`);
      for (const dsId of dataSourceIdsToFetch) {
        try {
          const paramsForDs = dataSourceParams ? dataSourceParams[dsId] : undefined;
          const fetchedData = await this.dataSourceFetchingService.fetchData(dsId, paramsForDs);
          // Merge fetched data under a key, perhaps the data source name or ID
          // For simplicity, using ID. A more robust approach might use a sanitized name.
          // Using _.merge for deep merging if fetchedData is an object.
          combinedData.user_data[dsId] = fetchedData; 
          this.logger.log(`Successfully fetched and merged data for source ID: ${dsId}`);
        } catch (error) {
          this.logger.error(`Failed to fetch or merge data for source ID ${dsId}: ${error.message}`);
          // Decide on error handling: continue without this data, or fail PDF generation?
          // For now, log and continue, so a failing data source doesn't block PDF generation.
          combinedData.user_data[dsId] = { error: `Failed to load data: ${error.message}` };
        }
      }
    }
    this.logger.debug("Combined data for PDF generation:", JSON.stringify(combinedData, null, 2));

    return this.generatePdfUsingTemplateAndData(grapesJsHtml, combinedData);
  }
}

