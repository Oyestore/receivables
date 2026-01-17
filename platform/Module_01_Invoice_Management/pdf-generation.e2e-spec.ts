import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../../src/app.module"; // Adjust path as needed
import { PdfGenerationService } from "../../../src/pdf-generation/services/pdf-generation.service";
import { TemplateService } from "../../../src/templates/services/template.service";
import { UserDataSourceService } from "../../../src/user-data-sources/services/user-data-source.service";
import { CreateInvoiceTemplateMasterDto } from "../../../src/templates/dto/create-invoice-template-master.dto";
import { UserDefinedDataSourceDto } from "../../../src/user-data-sources/dto/user-defined-data-source.dto";
import { DataSourceType, AuthMethod } from "../../../src/user-data-sources/entities/user-defined-data-source.entity";
import { UserDataSourceFetchingService } from "../../../src/user-data-sources/services/user-data-source-fetching.service";
import { ConditionalLogicService } from "../../../src/conditional-logic/services/conditional-logic.service";
import { of } from "rxjs";

// Mock JWT token for testing authenticated routes
const MOCK_JWT_TOKEN = "mock.jwt.token";

// Sample GrapesJS data for template definition
const simpleTemplateDefinition = {
  html: "<div><h1>Invoice {{invoice.number}}</h1><p>Total: {{invoice.total_amount}}</p></div>",
  css: "h1 { color: green; }",
  components: [], style: [],
  variables: [{name: "invoice.number", type: "string"}, {name: "invoice.total_amount", type: "number"}]
};

const conditionalTemplateDefinition = {
  html: `
    <div>
      <h1>Invoice {{invoice.number}}</h1>
      <p>Total: {{invoice.total_amount}}</p>
      <div data-gjs-conditions='[{"groupLogic":"AND","rules":[{"field":"invoice.total_amount","operator":">","value":"500"}]}]'>
        <p>This is a high value invoice.</p>
      </div>
      <div data-gjs-conditions='[{"groupLogic":"AND","rules":[{"field":"external.customer_status","operator":"==","value":"premium"}]}]'>
        <p>Premium Customer Benefit!</p>
      </div>
    </div>
  `,
  css: "h1 { color: purple; }",
  components: [], style: [],
  variables: [{name: "invoice.number", type: "string"}, {name: "invoice.total_amount", type: "number"}, {name: "external.customer_status", type: "string"}]
};

describe("PdfGenerationController (e2e) / PdfGenerationService (integration)", () => {
  let app: INestApplication;
  let pdfGenerationService: PdfGenerationService;
  let templateService: TemplateService;
  let userDataSourceService: UserDataSourceService;
  let userDataSourceFetchingService: UserDataSourceFetchingService;
  let conditionalLogicService: ConditionalLogicService;

  let simpleTemplateMasterId: string;
  let conditionalTemplateMasterId: string;
  let testDataSourceId: string;

  // Mock the actual Playwright PDF generation to avoid heavy operations in e2e
  // We are testing the data flow and logic *before* PDF conversion
  const mockPlaywrightGeneratePdf = jest.fn().mockResolvedValue(Buffer.from("mock-pdf-content"));

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(PdfGenerationService)
    .useValue({ generatePdf: mockPlaywrightGeneratePdf }) // Mock the service method that calls Playwright
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    pdfGenerationService = moduleFixture.get<PdfGenerationService>(PdfGenerationService);
    templateService = moduleFixture.get<TemplateService>(TemplateService);
    userDataSourceService = moduleFixture.get<UserDataSourceService>(UserDataSourceService);
    userDataSourceFetchingService = moduleFixture.get<UserDataSourceFetchingService>(UserDataSourceFetchingService);
    conditionalLogicService = moduleFixture.get<ConditionalLogicService>(ConditionalLogicService);

    // Setup: Create a simple template
    const simpleTemplateDto: CreateInvoiceTemplateMasterDto = {
      name: "E2E Simple PDF Template",
      description: "Simple template for PDF e2e testing",
      template_definition: simpleTemplateDefinition,
      html_content: simpleTemplateDefinition.html,
      css_content: simpleTemplateDefinition.css,
      template_variables: simpleTemplateDefinition.variables,
      organization_id: "org-pdf-e2e",
    };
    const createdSimpleMaster = await templateService.createTemplateMasterWithInitialVersion(simpleTemplateDto, "user-e2e-id");
    simpleTemplateMasterId = createdSimpleMaster.id;

    // Setup: Create a conditional template
    const conditionalTemplateDto: CreateInvoiceTemplateMasterDto = {
      name: "E2E Conditional PDF Template",
      description: "Conditional template for PDF e2e testing",
      template_definition: conditionalTemplateDefinition,
      html_content: conditionalTemplateDefinition.html,
      css_content: conditionalTemplateDefinition.css,
      template_variables: conditionalTemplateDefinition.variables,
      organization_id: "org-pdf-e2e",
    };
    const createdConditionalMaster = await templateService.createTemplateMasterWithInitialVersion(conditionalTemplateDto, "user-e2e-id");
    conditionalTemplateMasterId = createdConditionalMaster.id;

    // Setup: Create a User Defined Data Source (mocked fetch)
    const dataSourceDto: UserDefinedDataSourceDto = {
      name: "E2E Test Data Source for PDF",
      type: DataSourceType.REST_API,
      connection_config: {
        base_url: "http://mock-external-api.com/data",
        auth_method: AuthMethod.NONE,
      },
      organization_id: "org-pdf-e2e",
    };
    const createdDataSource = await userDataSourceService.create(dataSourceDto, "user-e2e-id");
    testDataSourceId = createdDataSource.id;
  });

  afterAll(async () => {
    // Conceptual cleanup
    await app.close();
  });

  beforeEach(() => {
    mockPlaywrightGeneratePdf.mockClear();
    // Mock UserDataSourceFetchingService.fetchData for controlled tests
    jest.spyOn(userDataSourceFetchingService, 'fetchData').mockImplementation(async (dataSource) => {
      if (dataSource.id === testDataSourceId) {
        return { customer_status: "premium", external_field: "External Value" };
      }
      return {};
    });
  });

  // Assuming a conceptual PDF generation endpoint like POST /api/pdf/generate
  // If testing service directly, these tests would call pdfGenerationService.generatePdf(...)

  describe("POST /api/pdf/generate (Conceptual Endpoint)", () => {
    const sampleInvoiceData = {
      invoice: {
        number: "INV-2025-001",
        total_amount: 600,
        customer_name: "E2E Customer",
      },
      items: [{ name: "Item 1", price: 600, quantity: 1}],
    };

    it("should generate a simple PDF successfully (200)", async () => {
      const payload = {
        templateMasterId: simpleTemplateMasterId,
        // versionNumber: 1, // Assuming service fetches latest/published if not specified
        invoiceData: sampleInvoiceData,
        organizationId: "org-pdf-e2e", // Assuming orgId is passed for template fetching context
      };

      // This simulates calling the actual PdfGenerationService method that eventually calls the mocked Playwright part
      // For an actual endpoint test, it would be: request(app.getHttpServer()).post('/api/pdf/generate')...
      const result = await pdfGenerationService.generatePdf(
        payload.templateMasterId,
        undefined, // version number - let service pick latest
        payload.invoiceData,
        [], // dataSourceIds
        payload.organizationId
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toEqual("mock-pdf-content");
      expect(mockPlaywrightGeneratePdf).toHaveBeenCalledTimes(1);
      const htmlArg = mockPlaywrightGeneratePdf.mock.calls[0][0]; // First argument to the mocked function
      expect(htmlArg).toContain("Invoice INV-2025-001");
      expect(htmlArg).toContain("Total: 600");
    });

    it("should apply conditional logic (show section for high value)", async () => {
      const highValueInvoiceData = { ...sampleInvoiceData, invoice: { ...sampleInvoiceData.invoice, total_amount: 700 } };
      const result = await pdfGenerationService.generatePdf(
        conditionalTemplateMasterId,
        undefined,
        highValueInvoiceData,
        [],
        "org-pdf-e2e"
      );
      expect(result).toBeInstanceOf(Buffer);
      const htmlArg = mockPlaywrightGeneratePdf.mock.calls[0][0];
      expect(htmlArg).toContain("This is a high value invoice.");
    });

    it("should apply conditional logic (hide section for low value)", async () => {
      const lowValueInvoiceData = { ...sampleInvoiceData, invoice: { ...sampleInvoiceData.invoice, total_amount: 300 } };
      const result = await pdfGenerationService.generatePdf(
        conditionalTemplateMasterId,
        undefined,
        lowValueInvoiceData,
        [],
        "org-pdf-e2e"
      );
      expect(result).toBeInstanceOf(Buffer);
      const htmlArg = mockPlaywrightGeneratePdf.mock.calls[0][0];
      expect(htmlArg).not.toContain("This is a high value invoice.");
    });

    it("should fetch data from User Defined Data Source and apply conditional logic", async () => {
      const result = await pdfGenerationService.generatePdf(
        conditionalTemplateMasterId,
        undefined,
        sampleInvoiceData, // total_amount is 600, so first condition is true
        [testDataSourceId],
        "org-pdf-e2e"
      );
      expect(result).toBeInstanceOf(Buffer);
      expect(userDataSourceFetchingService.fetchData).toHaveBeenCalledWith(expect.objectContaining({ id: testDataSourceId }));
      const htmlArg = mockPlaywrightGeneratePdf.mock.calls[0][0];
      expect(htmlArg).toContain("This is a high value invoice."); // From primary data condition
      expect(htmlArg).toContain("Premium Customer Benefit!"); // From external data condition
    });

    it("should handle missing template gracefully (throw NotFoundException)", async () => {
      await expect(pdfGenerationService.generatePdf(
        "00000000-0000-0000-0000-000000000000", // Non-existent ID
        undefined,
        sampleInvoiceData,
        [],
        "org-pdf-e2e"
      )).rejects.toThrow("Template master not found or no versions available"); // Or specific error from TemplateService
    });

    it("should handle error from UserDataSourceFetchingService gracefully", async () => {
        jest.spyOn(userDataSourceFetchingService, 'fetchData').mockRejectedValueOnce(new Error("Mock Fetch Error"));
        
        // Depending on implementation, it might still generate PDF without external data, or throw
        // For this test, let's assume it logs the error and proceeds without external data for the failing source.
        const result = await pdfGenerationService.generatePdf(
            conditionalTemplateMasterId,
            undefined,
            sampleInvoiceData,
            [testDataSourceId], // This source will now fail
            "org-pdf-e2e"
        );
        expect(result).toBeInstanceOf(Buffer);
        const htmlArg = mockPlaywrightGeneratePdf.mock.calls[0][0];
        expect(htmlArg).toContain("This is a high value invoice."); // Primary data condition still works
        expect(htmlArg).not.toContain("Premium Customer Benefit!"); // External data condition fails or uses default
        // Add expect for logger being called if you have a logger mock
    });

  });
});

