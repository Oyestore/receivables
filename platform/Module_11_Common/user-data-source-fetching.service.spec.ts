import { Test, TestingModule } from "@nestjs/testing";
import { UserDataSourceFetchingService } from "../user-data-source-fetching.service";
import { UserDefinedDataSource, DataSourceType, AuthMethod } from "../../entities/user-defined-data-source.entity";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { AxiosResponse, AxiosError } from "axios";
import { EncryptionService } from "../../../shared/services/encryption.service";

describe("UserDataSourceFetchingService", () => {
  let service: UserDataSourceFetchingService;
  let httpService: HttpService;
  let encryptionService: EncryptionService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(), // Assuming post might be used for some REST APIs
  };

  const mockEncryptionService = {
    decrypt: jest.fn(data => data), // Simple pass-through for testing
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDataSourceFetchingService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<UserDataSourceFetchingService>(UserDataSourceFetchingService);
    httpService = module.get<HttpService>(HttpService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("fetchData", () => {
    // --- REST API Tests ---
    it("should fetch data from a REST API with no auth", async () => {
      const dataSource: UserDefinedDataSource = {
        id: "1",
        name: "Test REST API No Auth",
        type: DataSourceType.REST_API,
        connection_config: {
          base_url: "http://test.com/api",
          auth_method: AuthMethod.NONE,
        },
        organization_id: "org1",
        created_by_user_id: "user1",
        created_at: new Date(),
        updated_at: new Date(),
      } as UserDefinedDataSource;

      const mockResponse: AxiosResponse = { data: { key: "value" }, status: 200, statusText: "OK", headers: {}, config: {} as any }; // Use 'as any' for config
      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.fetchData(dataSource);
      expect(result).toEqual({ key: "value" });
      expect(httpService.get).toHaveBeenCalledWith("http://test.com/api", { headers: {} });
    });

    it("should fetch data from a REST API with API Key auth", async () => {
      const dataSource: UserDefinedDataSource = {
        id: "2",
        name: "Test REST API Key Auth",
        type: DataSourceType.REST_API,
        connection_config: {
          base_url: "http://secure.com/api",
          auth_method: AuthMethod.API_KEY,
          api_key_header: "X-API-KEY",
          api_key_value: "encrypted_key_value", // Assume this is encrypted
        },
      } as UserDefinedDataSource;
      mockEncryptionService.decrypt.mockReturnValueOnce("decrypted_key_value");

      const mockResponse: AxiosResponse = { data: { data: "secured" }, status: 200, statusText: "OK", headers: {}, config: {} as any };
      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.fetchData(dataSource);
      expect(result).toEqual({ data: "secured" });
      expect(httpService.get).toHaveBeenCalledWith("http://secure.com/api", {
        headers: { "X-API-KEY": "decrypted_key_value" },
      });
      expect(encryptionService.decrypt).toHaveBeenCalledWith("encrypted_key_value");
    });

    it("should fetch data from a REST API with Basic Auth", async () => {
      const dataSource: UserDefinedDataSource = {
        id: "3",
        name: "Test REST Basic Auth",
        type: DataSourceType.REST_API,
        connection_config: {
          base_url: "http://basicauth.com/api",
          auth_method: AuthMethod.BASIC_AUTH,
          basic_auth_username: "user",
          basic_auth_password: "encrypted_password", // Assume this is encrypted
        },
      } as UserDefinedDataSource;
      mockEncryptionService.decrypt.mockReturnValueOnce("decrypted_password");
      const token = Buffer.from("user:decrypted_password").toString("base64");

      const mockResponse: AxiosResponse = { data: { message: "basic auth success" }, status: 200, statusText: "OK", headers: {}, config: {} as any };
      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.fetchData(dataSource);
      expect(result).toEqual({ message: "basic auth success" });
      expect(httpService.get).toHaveBeenCalledWith("http://basicauth.com/api", {
        headers: { Authorization: `Basic ${token}` },
      });
      expect(encryptionService.decrypt).toHaveBeenCalledWith("encrypted_password");
    });

    // --- JSON File URL Tests ---
    it("should fetch and parse JSON from a URL", async () => {
      const dataSource: UserDefinedDataSource = {
        id: "4",
        name: "Test JSON URL",
        type: DataSourceType.JSON_FILE_URL,
        connection_config: {
          file_url: "http://files.com/data.json",
        },
      } as UserDefinedDataSource;

      const mockJsonResponse = { data: { item: "json_data" }, status: 200, statusText: "OK", headers: {}, config: {} as any };
      mockHttpService.get.mockReturnValue(of(mockJsonResponse));

      const result = await service.fetchData(dataSource);
      expect(result).toEqual({ item: "json_data" });
      expect(httpService.get).toHaveBeenCalledWith("http://files.com/data.json");
    });

    // --- CSV File URL Tests ---
    it("should fetch and parse CSV from a URL", async () => {
      const dataSource: UserDefinedDataSource = {
        id: "5",
        name: "Test CSV URL",
        type: DataSourceType.CSV_FILE_URL,
        connection_config: {
          file_url: "http://files.com/data.csv",
        },
      } as UserDefinedDataSource;

      const csvData = `header1,header2\nvalue1,value2\nvalue3,value4`;
      const mockCsvResponse = { data: csvData, status: 200, statusText: "OK", headers: {}, config: {} as any };
      mockHttpService.get.mockReturnValue(of(mockCsvResponse));

      const result = await service.fetchData(dataSource);
      expect(result).toEqual([
        { header1: "value1", header2: "value2" },
        { header1: "value3", header2: "value4" },
      ]);
      expect(httpService.get).toHaveBeenCalledWith("http://files.com/data.csv");
    });

    it("should fetch and parse CSV from a URL with custom delimiter", async () => {
      const dataSource: UserDefinedDataSource = {
        id: "5a",
        name: "Test CSV URL Custom Delimiter",
        type: DataSourceType.CSV_FILE_URL,
        connection_config: {
          file_url: "http://files.com/data.csv",
          csv_delimiter: ";"
        },
      } as UserDefinedDataSource;

      const csvData = `header1;header2\nvalue1;value2\nvalue3;value4`;
      const mockCsvResponse = { data: csvData, status: 200, statusText: "OK", headers: {}, config: {} as any };
      mockHttpService.get.mockReturnValue(of(mockCsvResponse));

      const result = await service.fetchData(dataSource);
      expect(result).toEqual([
        { header1: "value1", header2: "value2" },
        { header1: "value3", header2: "value4" },
      ]);
      expect(httpService.get).toHaveBeenCalledWith("http://files.com/data.csv");
    });

    // --- Error Handling Tests ---
    it("should throw an error for unsupported data source type", async () => {
      const dataSource = { type: "UNSUPPORTED_TYPE" } as any;
      await expect(service.fetchData(dataSource)).rejects.toThrow(
        "Unsupported data source type: UNSUPPORTED_TYPE",
      );
    });

    it("should throw an error if REST API call fails", async () => {
      const dataSource: UserDefinedDataSource = {
        id: "6",
        name: "Test REST API Error",
        type: DataSourceType.REST_API,
        connection_config: { base_url: "http://error.com/api", auth_method: AuthMethod.NONE },
      } as UserDefinedDataSource;

      const axiosError = { isAxiosError: true, response: { status: 500, data: "Server Error"} } as AxiosError;
      mockHttpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(service.fetchData(dataSource)).rejects.toThrow(
        "Failed to fetch data for Test REST API Error (REST_API): Request failed with status code 500 - Server Error",
      );
    });

    it("should throw an error if JSON parsing fails for JSON_FILE_URL", async () => {
        const dataSource: UserDefinedDataSource = {
          id: "7",
          name: "Test Invalid JSON URL",
          type: DataSourceType.JSON_FILE_URL,
          connection_config: { file_url: "http://files.com/invalid_data.json" },
        } as UserDefinedDataSource;
  
        const mockInvalidJsonResponse = { data: "invalid json string", status: 200, statusText: "OK", headers: {}, config: {} as any };
        mockHttpService.get.mockReturnValue(of(mockInvalidJsonResponse));
  
        await expect(service.fetchData(dataSource)).rejects.toThrow(
          expect.stringContaining("Failed to parse JSON data for Test Invalid JSON URL (JSON_FILE_URL)"),
        );
      });

      it("should throw an error if CSV parsing fails for CSV_FILE_URL", async () => {
        const dataSource: UserDefinedDataSource = {
          id: "8",
          name: "Test Invalid CSV URL",
          type: DataSourceType.CSV_FILE_URL,
          connection_config: { file_url: "http://files.com/invalid_data.csv" },
        } as UserDefinedDataSource;
        // Simulate CSV that might cause papaparse error, e.g. unclosed quotes
        const mockInvalidCsvResponse = { data: `header1,header2\nvalue1,"unclosed quote`, status: 200, statusText: "OK", headers: {}, config: {} as any };
        mockHttpService.get.mockReturnValue(of(mockInvalidCsvResponse));
  
        // PapaParse errors can be varied, so we check for a generic message part
        await expect(service.fetchData(dataSource)).rejects.toThrow(
          expect.stringContaining("Failed to parse CSV data for Test Invalid CSV URL (CSV_FILE_URL)"),
        );
      });

  });
});

