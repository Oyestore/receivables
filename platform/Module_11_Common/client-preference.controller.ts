import { Controller, Post, Body, Get, Param, Put, Delete, Query, UsePipes, ValidationPipe, ParseUUIDPipe } from "@nestjs/common";
import { ClientPreferenceService } from "../services/client-preference.service";
import { CreateClientPreferenceDto, UpdateClientPreferenceDto } from "../dto/client-preference.dto";
import { ClientPreference } from "../entities/client-preference.entity";

@Controller("api/v1/client-preferences") // Base path as per design document
export class ClientPreferenceController {
  constructor(private readonly preferenceService: ClientPreferenceService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() createDto: CreateClientPreferenceDto): Promise<ClientPreference> {
    // tenant_id and client_id are part of the DTO
    return this.preferenceService.create(createDto);
  }

  // Get preferences for a specific client of a tenant
  @Get()
  async findByClientId(
    @Query("tenant_id", ParseUUIDPipe) tenant_id: string,
    @Query("client_id", ParseUUIDPipe) client_id: string
  ): Promise<ClientPreference> {
    return this.preferenceService.findByClientId(tenant_id, client_id);
  }

  // Get preference by its own ID (less common, but could be useful for admin)
  @Get(":id")
  async findOneById(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("tenant_id", ParseUUIDPipe) tenant_id: string // Ensure it belongs to the tenant
  ): Promise<ClientPreference> {
    return this.preferenceService.findOneById(id, tenant_id);
  }

  @Put()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async update(
    @Query("tenant_id", ParseUUIDPipe) tenant_id: string,
    @Query("client_id", ParseUUIDPipe) client_id: string,
    @Body() updateDto: UpdateClientPreferenceDto
  ): Promise<ClientPreference> {
    return this.preferenceService.update(tenant_id, client_id, updateDto);
  }

  @Delete()
  async remove(
    @Query("tenant_id", ParseUUIDPipe) tenant_id: string,
    @Query("client_id", ParseUUIDPipe) client_id: string
  ): Promise<void> {
    return this.preferenceService.remove(tenant_id, client_id);
  }
}

