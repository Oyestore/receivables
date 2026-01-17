import { Injectable, NotFoundException, InternalServerErrorException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserDefinedDataSource, DataSourceType } from "../entities/user-defined-data-source.entity";
import { CreateUserDefinedDataSourceDto, UpdateUserDefinedDataSourceDto } from "../dto/user-defined-data-source.dto.ts";
import { EncryptionService } from "../../shared/services/encryption.service"; // Use shared EncryptionService
import { UserDataSourceFetchingService } from "./user-data-source-fetching.service"; // Import FetchingService

@Injectable()
export class UserDataSourceService {
  constructor(
    @InjectRepository(UserDefinedDataSource) 
    private dataSourceRepository: Repository<UserDefinedDataSource>,
    private readonly encryptionService: EncryptionService, // Inject shared EncryptionService
    private readonly fetchingService: UserDataSourceFetchingService, // Inject UserDataSourceFetchingService
  ) {}

  // Removed local encrypt/decrypt methods, will use EncryptionService

  private encryptConnectionConfig(config: Record<string, any>, type: DataSourceType): Record<string, any> {
    const newConfig = { ...config };
    // Based on the DTO structure, sensitive fields are directly in connection_config
    if (type === DataSourceType.REST_API) {
      if (newConfig.api_key_value) {
        newConfig.api_key_value = this.encryptionService.encrypt(newConfig.api_key_value);
      }
      if (newConfig.basic_auth_password) {
        newConfig.basic_auth_password = this.encryptionService.encrypt(newConfig.basic_auth_password);
      }
    }
    // Add encryption for other types if they have sensitive fields
    return newConfig;
  }

  private decryptConnectionConfig(config: Record<string, any>, type: DataSourceType): Record<string, any> {
    const newConfig = { ...config };
    if (type === DataSourceType.REST_API) {
      if (newConfig.api_key_value) {
        newConfig.api_key_value = this.encryptionService.decrypt(newConfig.api_key_value);
      }
      if (newConfig.basic_auth_password) {
        newConfig.basic_auth_password = this.encryptionService.decrypt(newConfig.basic_auth_password);
      }
    }
    // Add decryption for other types if they have sensitive fields
    return newConfig;
  }

  async create(createDto: CreateUserDefinedDataSourceDto, organizationId: string): Promise<UserDefinedDataSource> {
    const encryptedConfig = this.encryptConnectionConfig(createDto.connection_config, createDto.type);
    const newDataSource = this.dataSourceRepository.create({
      ...createDto,
      connection_config: encryptedConfig,
      organization_id: organizationId,
    });
    try {
      const savedDs = await this.dataSourceRepository.save(newDataSource);
      // Return with decrypted config for immediate use if needed, but generally avoid exposing decrypted values unless necessary
      // For create, usually the encrypted form is fine to return or just a success message.
      // Let's return the entity as it is stored (with encrypted config).
      return savedDs; 
    } catch (error) {
      if (error.code === "23505") { 
        throw new ForbiddenException(`Data source with name "${createDto.name}" already exists in this organization.`);
      }
      throw new InternalServerErrorException("Could not create data source.");
    }
  }

  async findAll(organizationId: string): Promise<UserDefinedDataSource[]> {
    const dataSources = await this.dataSourceRepository.find({ where: { organization_id: organizationId } });
    // For findAll, we typically don't decrypt sensitive connection details unless explicitly needed for display.
    // The frontend should handle displaying placeholders for sensitive fields.
    // If decryption is needed for a specific use case, it should be handled carefully.
    // For now, returning them as stored (encrypted).
    return dataSources;
  }

  async findOne(id: string, organizationId: string, decrypt: boolean = false): Promise<UserDefinedDataSource> {
    const dataSource = await this.dataSourceRepository.findOne({ where: { id, organization_id: organizationId } });
    if (!dataSource) {
      throw new NotFoundException(`Data source with ID "${id}" not found.`);
    }
    if (decrypt) {
        return {
            ...dataSource,
            connection_config: this.decryptConnectionConfig(dataSource.connection_config, dataSource.type),
        };
    }
    return dataSource; // Return as stored (encrypted)
  }

  async update(id: string, updateDto: UpdateUserDefinedDataSourceDto, organizationId: string): Promise<UserDefinedDataSource> {
    const existingDataSource = await this.findOne(id, organizationId, false); // Get existing without decryption for type

    let connectionConfig = updateDto.connection_config;
    if (connectionConfig) {
      const typeForEncryption = updateDto.type || existingDataSource.type;
      // Ensure all potentially sensitive fields are re-encrypted if provided
      // If a field is not provided in updateDto.connection_config, it won't be re-encrypted unless handled explicitly
      // This assumes the DTO provides the full config if it's being changed.
      connectionConfig = this.encryptConnectionConfig(connectionConfig, typeForEncryption);
    }

    const updatePayload = {
      ...updateDto,
      ...(connectionConfig && { connection_config: connectionConfig }),
    };

    try {
      await this.dataSourceRepository.update(id, updatePayload);
      return this.findOne(id, organizationId, false); // Return updated entity as stored
    } catch (error) {
      if (error.code === "23505" && updateDto.name) {
        throw new ForbiddenException(`Data source with name "${updateDto.name}" already exists in this organization.`);
      }
      throw new InternalServerErrorException("Could not update data source.");
    }
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const result = await this.dataSourceRepository.delete({ id, organization_id: organizationId });
    if (result.affected === 0) {
      throw new NotFoundException(`Data source with ID "${id}" not found.`);
    }
  }

  async testConnection(id: string, organizationId: string): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
    // Ensure the data source belongs to the organization before attempting to fetch/test
    // findOne without decryption is fine here as fetchingService will re-fetch and handle decryption internally for its needs.
    await this.findOne(id, organizationId, false); 
    
    try {
      // Use UserDataSourceFetchingService to perform the actual fetch attempt
      // We might want to fetch a very small, specific piece of data or just check connectivity
      // For now, let's try to fetch with no specific params, which might get a list or first page for APIs
      const sampleData = await this.fetchingService.fetchData(id, { /* limit: 1 or similar if API supports */ });
      return {
        success: true,
        message: "Connection test successful. Sample data fetched.",
        // Be careful about returning too much data here. Maybe just a snippet or count.
        data: Array.isArray(sampleData) ? sampleData.slice(0, 2) : (typeof sampleData === "object" ? "Object received" : String(sampleData).substring(0,100)),
      };
    } catch (error) {
      return {
        success: false,
        message: "Connection test failed.",
        error: error.message || "An unknown error occurred during connection test.",
      };
    }
  }
}

