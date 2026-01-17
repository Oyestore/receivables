import { IsString, IsNotEmpty, IsEnum, IsObject, IsOptional, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { DataSourceType } from "../entities/user-defined-data-source.entity";

class ConnectionConfigRestApiKeyDto {
  @IsString()
  @IsNotEmpty()
  apiKeyHeader: string;

  @IsString()
  @IsNotEmpty()
  apiKeyValue: string; // This will be encrypted in the service layer before saving
}

class ConnectionConfigRestBasicAuthDto {
  @IsString()
  @IsNotEmpty()
  basicUser: string;

  @IsString()
  @IsNotEmpty()
  basicPass: string; // This will be encrypted in the service layer before saving
}

class ConnectionConfigRestDto {
  @IsString()
  @IsNotEmpty()
  baseUrl: string;

  @IsEnum(['none', 'api_key', 'basic_auth'])
  @IsNotEmpty()
  authMethod: 'none' | 'api_key' | 'basic_auth';

  @IsOptional()
  @ValidateNested()
  @Type(() => ConnectionConfigRestApiKeyDto)
  apiKeyDetails?: ConnectionConfigRestApiKeyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConnectionConfigRestBasicAuthDto)
  basicAuthDetails?: ConnectionConfigRestBasicAuthDto;
}

class ConnectionConfigFileUrlDto {
  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}

export class CreateUserDefinedDataSourceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DataSourceType)
  @IsNotEmpty()
  type: DataSourceType;

  @IsObject()
  @ValidateNested()
  @Type((object) => {
    // Discriminator logic for connection_config based on type
    // This is a simplified example; more robust validation might be needed
    // or handled primarily in the service after basic DTO validation.
    // For now, we assume the frontend sends the correct structure based on 'type'.
    if (object.object.type === DataSourceType.REST_API) {
      return ConnectionConfigRestDto;
    }
    if (object.object.type === DataSourceType.JSON_URL || object.object.type === DataSourceType.CSV_URL) {
      return ConnectionConfigFileUrlDto;
    }
    return Object; // Fallback, though should be one of the above
  })
  connection_config: ConnectionConfigRestDto | ConnectionConfigFileUrlDto;

  @IsOptional()
  @IsObject()
  schema_definition?: Record<string, any>;

  // organization_id will be taken from the authenticated user's context in the service/controller
}

export class UpdateUserDefinedDataSourceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(DataSourceType)
  type?: DataSourceType;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type((object) => {
    // Similar discriminator logic as in Create DTO
    // This needs careful handling if 'type' itself is also being updated.
    // It's often simpler to require 'type' if 'connection_config' is present in an update.
    const typeToValidate = object.object.type || (object.targetName as any)?.type; // Attempt to get type
    if (typeToValidate === DataSourceType.REST_API) {
      return ConnectionConfigRestDto;
    }
    if (typeToValidate === DataSourceType.JSON_URL || typeToValidate === DataSourceType.CSV_URL) {
      return ConnectionConfigFileUrlDto;
    }
    return Object;
  })
  connection_config?: ConnectionConfigRestDto | ConnectionConfigFileUrlDto;

  @IsOptional()
  @IsObject()
  schema_definition?: Record<string, any>;
}

