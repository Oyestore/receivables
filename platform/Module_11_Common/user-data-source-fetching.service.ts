import { Injectable, Logger, InternalServerErrorException, NotFoundException, BadRequestException } from "@nestjs/common";
import { UserDefinedDataSource, DataSourceType, AuthMethod } from "../entities/user-defined-data-source.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios, { AxiosRequestConfig } from "axios";
import * as Papa from "papaparse";
import { EncryptionService } from "../../auth/services/encryption.service"; // Assuming encryption service is in auth module

@Injectable()
export class UserDataSourceFetchingService {
  private readonly logger = new Logger(UserDataSourceFetchingService.name);

  constructor(
    @InjectRepository(UserDefinedDataSource) 
    private dataSourceRepository: Repository<UserDefinedDataSource>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async fetchData(dataSourceId: string, params?: Record<string, any>): Promise<any> {
    this.logger.log(`Fetching data for data source ID: ${dataSourceId}`);
    const dataSource = await this.dataSourceRepository.findOne({ where: { id: dataSourceId } });

    if (!dataSource) {
      this.logger.error(`Data source with ID ${dataSourceId} not found.`);
      throw new NotFoundException(`Data source with ID ${dataSourceId} not found.`);
    }

    const config = dataSource.connection_config;
    let decryptedConfig = { ...config };

    // Decrypt sensitive fields if they exist
    if (config.api_key_value) {
      decryptedConfig.api_key_value = this.encryptionService.decrypt(config.api_key_value);
    }
    if (config.basic_auth_password) {
      decryptedConfig.basic_auth_password = this.encryptionService.decrypt(config.basic_auth_password);
    }

    try {
      switch (dataSource.type) {
        case DataSourceType.REST_API:
          return this.fetchRestApiData(decryptedConfig, params);
        case DataSourceType.JSON_FILE_URL:
          return this.fetchJsonFileUrlData(decryptedConfig.url);
        case DataSourceType.CSV_FILE_URL:
          return this.fetchCsvFileUrlData(decryptedConfig.url);
        default:
          this.logger.warn(`Unsupported data source type: ${dataSource.type}`);
          throw new BadRequestException(`Unsupported data source type: ${dataSource.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch data for source ${dataSource.name} (ID: ${dataSourceId}): ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to fetch data from source ${dataSource.name}: ${error.message}`);
    }
  }

  private async fetchRestApiData(config: any, params?: Record<string, any>): Promise<any> {
    const { url, auth_method, api_key_header, api_key_value, basic_auth_username, basic_auth_password } = config;
    if (!url) throw new BadRequestException("REST API URL is not configured.");

    const axiosConfig: AxiosRequestConfig = {
      method: "GET", // Assuming GET, can be made configurable if needed
      url,
      params: params || {},
      headers: {},
    };

    if (auth_method === AuthMethod.API_KEY && api_key_header && api_key_value) {
      axiosConfig.headers[api_key_header] = api_key_value;
    } else if (auth_method === AuthMethod.BASIC_AUTH && basic_auth_username && basic_auth_password) {
      const token = Buffer.from(`${basic_auth_username}:${basic_auth_password}`, "utf8").toString("base64");
      axiosConfig.headers["Authorization"] = `Basic ${token}`;
    }
    // Add other auth methods if needed (e.g., Bearer token)

    this.logger.log(`Fetching from REST API: ${url} with params: ${JSON.stringify(params)}`);
    const response = await axios(axiosConfig);
    return response.data;
  }

  private async fetchJsonFileUrlData(url: string): Promise<any> {
    if (!url) throw new BadRequestException("JSON File URL is not configured.");
    this.logger.log(`Fetching from JSON File URL: ${url}`);
    const response = await axios.get(url);
    return response.data; // Assumes response is JSON
  }

  private async fetchCsvFileUrlData(url: string): Promise<any[]> {
    if (!url) throw new BadRequestException("CSV File URL is not configured.");
    this.logger.log(`Fetching from CSV File URL: ${url}`);
    const response = await axios.get(url);
    
    return new Promise((resolve, reject) => {
      Papa.parse(response.data, {
        header: true, // Assumes first row is header
        skipEmptyLines: true,
        complete: (results) => {
          this.logger.log(`CSV parsing complete. Found ${results.data.length} rows.`);
          resolve(results.data);
        },
        error: (error) => {
          this.logger.error("Error parsing CSV data:", error);
          reject(new InternalServerErrorException(`Failed to parse CSV data: ${error.message}`));
        },
      });
    });
  }

  // Conceptual test connection method (already in UserDataSourceService, might be refactored or called from there)
  // async testConnection(dataSourceId: string): Promise<{ success: boolean; message: string; data?: any }> {
  //   try {
  //     const data = await this.fetchData(dataSourceId, { /* some default test params if needed */ });
  //     return { success: true, message: "Connection successful, sample data fetched.", data: Array.isArray(data) ? data.slice(0, 5) : data };
  //   } catch (error) {
  //     return { success: false, message: `Connection failed: ${error.message}` };
  //   }
  // }
}

