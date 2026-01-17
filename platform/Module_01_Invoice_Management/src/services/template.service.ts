import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { InvoiceTemplateMaster, TemplateStatus } from "../entities/invoice-template-master.entity";
import { InvoiceTemplateVersion } from "../entities/invoice-template-version.entity";
import { CreateInvoiceTemplateMasterDto } from "../dto/create-invoice-template-master.dto.ts";
import { UpdateInvoiceTemplateMasterDetailsDto } from "../dto/update-invoice-template-master-details.dto.ts";
import { CreateNewTemplateVersionDto } from "../dto/create-new-template-version.dto.ts"; // Assuming this DTO will be created

@Injectable()
export class TemplateService {
  constructor(
    @InjectRepository(InvoiceTemplateMaster)
    private readonly masterRepository: Repository<InvoiceTemplateMaster>,
    @InjectRepository(InvoiceTemplateVersion)
    private readonly versionRepository: Repository<InvoiceTemplateVersion>,
    private readonly dataSource: DataSource, // For transactions
  ) {}

  async createMaster(createDto: CreateInvoiceTemplateMasterDto, organizationId: string, userId: string): Promise<InvoiceTemplateMaster> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const master = queryRunner.manager.create(InvoiceTemplateMaster, {
        name: createDto.name,
        description: createDto.description,
        organization_id: organizationId,
        created_by_user_id: userId,
        updated_by_user_id: userId,
        status: TemplateStatus.DRAFT, // New templates start as DRAFT
        latest_draft_version_number: 1,
      });
      const savedMaster = await queryRunner.manager.save(master);

      const firstVersion = queryRunner.manager.create(InvoiceTemplateVersion, {
        templateMaster: savedMaster,
        template_master_id: savedMaster.id,
        version_number: 1,
        template_definition: createDto.template_definition,
        comment: createDto.version_comment || "Initial version",
        created_by_user_id: userId,
      });
      await queryRunner.manager.save(firstVersion);
      
      await queryRunner.commitTransaction();
      // Eager load versions for the return, or fetch separately if needed by controller
      return this.findOneMaster(savedMaster.id, organizationId, true);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error.code === "23505") { // Unique constraint violation for name + organization_id
        throw new ConflictException(`Template with name "${createDto.name}" already exists in this organization.`);
      }
      console.error("Error creating template master:", error);
      throw new InternalServerErrorException("Error creating template: " + error.message);
    }
    finally {
      await queryRunner.release();
    }
  }

  async findAllMasters(organizationId: string, status?: TemplateStatus): Promise<InvoiceTemplateMaster[]> {
    const whereClause: any = { organization_id: organizationId };
    if (status) {
      whereClause.status = status;
    }
    return this.masterRepository.find({
      where: whereClause,
      order: { name: "ASC" },
      // relations: ["versions"] // Optionally load latest version or count
    });
  }

  async findOneMaster(masterId: string, organizationId: string, loadVersions = false): Promise<InvoiceTemplateMaster> {
    const relationsToLoad = loadVersions ? ["versions"] : [];
    const master = await this.masterRepository.findOne({
      where: { id: masterId, organization_id: organizationId },
      relations: relationsToLoad,
    });
    if (!master) {
      throw new NotFoundException(`Template master with ID "${masterId}" not found.`);
    }
    if (loadVersions && master.versions) {
        master.versions.sort((a, b) => a.version_number - b.version_number);
    }
    return master;
  }

  async updateMasterDetails(masterId: string, updateDto: UpdateInvoiceTemplateMasterDetailsDto, organizationId: string, userId: string): Promise<InvoiceTemplateMaster> {
    const master = await this.findOneMaster(masterId, organizationId);
    // Add checks if system template or other restrictions apply

    Object.assign(master, updateDto);
    master.updated_by_user_id = userId;
    master.updated_at = new Date();

    try {
      return await this.masterRepository.save(master);
    } catch (error) {
      if (error.code === "23505") {
        throw new ConflictException(`Template name "${updateDto.name}" may already exist.`);
      }
      throw new InternalServerErrorException("Could not update template master details.");
    }
  }

  async saveNewVersion(masterId: string, createVersionDto: CreateNewTemplateVersionDto, organizationId: string, userId: string): Promise<InvoiceTemplateVersion> {
    const master = await this.findOneMaster(masterId, organizationId);
    const nextVersionNumber = (master.latest_draft_version_number || master.latest_published_version_number || 0) + 1;

    const newVersion = this.versionRepository.create({
      template_master_id: masterId,
      version_number: nextVersionNumber,
      template_definition: createVersionDto.template_definition,
      comment: createVersionDto.comment,
      created_by_user_id: userId,
    });
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const savedVersion = await queryRunner.manager.save(newVersion);
      master.latest_draft_version_number = nextVersionNumber;
      master.updated_by_user_id = userId;
      master.updated_at = new Date();
      // If the template was PUBLISHED, saving a new version might imply it goes back to DRAFT status for this new version
      // Or, the master status remains, and publishing is a separate act on a version.
      // For now, let master status be managed separately by publish/archive actions.
      await queryRunner.manager.save(InvoiceTemplateMaster, master);
      await queryRunner.commitTransaction();
      return savedVersion;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error saving new template version:", error);
      throw new InternalServerErrorException("Could not save new template version.");
    } finally {
      await queryRunner.release();
    }
  }

  async listVersions(masterId: string, organizationId: string): Promise<InvoiceTemplateVersion[]> {
    await this.findOneMaster(masterId, organizationId); // Authorization check
    return this.versionRepository.find({
      where: { template_master_id: masterId },
      order: { version_number: "ASC" },
    });
  }

  async getVersion(masterId: string, versionNumber: number, organizationId: string): Promise<InvoiceTemplateVersion> {
    await this.findOneMaster(masterId, organizationId); // Authorization check
    const version = await this.versionRepository.findOne({
      where: { template_master_id: masterId, version_number: versionNumber },
    });
    if (!version) {
      throw new NotFoundException(`Version ${versionNumber} for template master ID "${masterId}" not found.`);
    }
    return version;
  }

  async revertToVersion(masterId: string, versionNumberToRevertTo: number, organizationId: string, userId: string, comment?: string): Promise<InvoiceTemplateVersion> {
    const versionToRevert = await this.getVersion(masterId, versionNumberToRevertTo, organizationId);
    
    const newVersionDto: CreateNewTemplateVersionDto = {
      template_definition: versionToRevert.template_definition,
      comment: comment || `Reverted to version ${versionNumberToRevertTo}`,
    };
    return this.saveNewVersion(masterId, newVersionDto, organizationId, userId);
  }

  async publishVersion(masterId: string, versionNumber: number, organizationId: string, userId: string): Promise<InvoiceTemplateMaster> {
    const master = await this.findOneMaster(masterId, organizationId);
    // Ensure the version to be published exists
    await this.getVersion(masterId, versionNumber, organizationId);

    master.latest_published_version_number = versionNumber;
    master.status = TemplateStatus.PUBLISHED;
    master.updated_by_user_id = userId;
    master.updated_at = new Date();
    return this.masterRepository.save(master);
  }

  async archiveMaster(masterId: string, organizationId: string, userId: string): Promise<InvoiceTemplateMaster> {
    const master = await this.findOneMaster(masterId, organizationId);
    if (master.is_default_for_org) { // Assuming is_default_for_org is added to master
        throw new BadRequestException("Cannot archive a default template. Please set another template as default first.");
    }
    master.status = TemplateStatus.ARCHIVED;
    master.updated_by_user_id = userId;
    master.updated_at = new Date();
    return this.masterRepository.save(master);
  }

  async deleteMaster(masterId: string, organizationId: string): Promise<void> {
    const master = await this.findOneMaster(masterId, organizationId);
    // Add checks: e.g., cannot delete if PUBLISHED and not ARCHIVED, or if default.
    // For now, allowing delete if not default. Cascade delete will handle versions.
    if (master.is_default_for_org) {
        throw new BadRequestException("Cannot delete a default template.");
    }
    if (master.status === TemplateStatus.PUBLISHED) {
        throw new BadRequestException("Published templates must be archived before deletion.");
    }

    const result = await this.masterRepository.delete({ id: masterId, organization_id: organizationId });
    if (result.affected === 0) {
      throw new NotFoundException(`Template master with ID "${masterId}" not found.`);
    }
  }

  async setAsDefault(masterId: string, organizationId: string, userId: string): Promise<InvoiceTemplateMaster> {
    const masterToSet = await this.findOneMaster(masterId, organizationId);
    if (masterToSet.status !== TemplateStatus.PUBLISHED || !masterToSet.latest_published_version_number) {
      throw new BadRequestException("Only a published template with a published version can be set as default.");
    }

    // Clear previous default for the organization
    await this.masterRepository.update(
      { organization_id: organizationId, is_default_for_org: true },
      { is_default_for_org: false, updated_by_user_id: userId, updated_at: new Date() },
    );
    
    masterToSet.is_default_for_org = true;
    masterToSet.updated_by_user_id = userId;
    masterToSet.updated_at = new Date();
    return this.masterRepository.save(masterToSet);
  }

  async findDefault(organizationId: string): Promise<InvoiceTemplateMaster | null> {
    return this.masterRepository.findOne({ 
        where: { organization_id: organizationId, is_default_for_org: true, status: TemplateStatus.PUBLISHED },
        relations: ["versions"] // To potentially get the latest published version definition
    });
  }
}

