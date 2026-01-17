import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClientPreference } from "../entities/client-preference.entity";
import { CreateClientPreferenceDto, UpdateClientPreferenceDto } from "../dto/client-preference.dto";

@Injectable()
export class ClientPreferenceService {
  constructor(
    @InjectRepository(ClientPreference)
    private readonly preferenceRepository: Repository<ClientPreference>,
  ) {}

  async create(createDto: CreateClientPreferenceDto): Promise<ClientPreference> {
    try {
      const newPreference = this.preferenceRepository.create(createDto);
      return await this.preferenceRepository.save(newPreference);
    } catch (error) {
      if (error.code === "23505") { // Unique constraint violation (tenant_id, client_id)
        throw new ConflictException(`Preferences for client ID "${createDto.client_id}" already exist for this tenant.`);
      }
      console.error("Error creating client preference:", error);
      throw new InternalServerErrorException("Could not create client preference. " + error.message);
    }
  }

  async findByClientId(tenant_id: string, client_id: string): Promise<ClientPreference> {
    const preference = await this.preferenceRepository.findOne({ where: { tenant_id, client_id } });
    if (!preference) {
      throw new NotFoundException(`Preferences for client ID "${client_id}" not found for this tenant.`);
    }
    return preference;
  }

  // Usually, preferences are fetched by client_id for a tenant, not by its own ID.
  // But providing a findOne by its own ID might be useful for some admin tasks.
  async findOneById(id: string, tenant_id: string): Promise<ClientPreference> {
    const preference = await this.preferenceRepository.findOne({ where: { id, tenant_id } });
     if (!preference) {
      throw new NotFoundException(`Client preference with ID "${id}" not found for this tenant.`);
    }
    return preference;
  }

  async update(tenant_id: string, client_id: string, updateDto: UpdateClientPreferenceDto): Promise<ClientPreference> {
    // Find by tenant_id and client_id, as this is the logical key for update
    const preference = await this.findByClientId(tenant_id, client_id);
    try {
      this.preferenceRepository.merge(preference, updateDto);
      return await this.preferenceRepository.save(preference);
    } catch (error) {
      console.error("Error updating client preference:", error);
      throw new InternalServerErrorException("Could not update client preference. " + error.message);
    }
  }

  async remove(tenant_id: string, client_id: string): Promise<void> {
    const preference = await this.findByClientId(tenant_id, client_id);
    await this.preferenceRepository.remove(preference);
  }
}

