import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe, ParseUUIDPipe, Query, Put, HttpCode, HttpStatus, BadRequestException, Req, UseGuards } from "@nestjs/common";
import { TemplateService } from "../services/template.service";
import { CreateInvoiceTemplateMasterDto } from "../dto/create-invoice-template-master.dto.ts";
import { UpdateInvoiceTemplateMasterDetailsDto } from "../dto/update-invoice-template-master-details.dto.ts";
import { CreateNewTemplateVersionDto } from "../dto/create-new-template-version.dto.ts";
import { TemplateStatus } from "../entities/invoice-template-master.entity";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard"; // Adjust path as needed
import { AuthenticatedRequest } from "../../auth/interfaces/authenticated-request.interface"; // Adjust path as needed

@UseGuards(JwtAuthGuard)
@Controller("templates") // Base path for template masters
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  // --- InvoiceTemplateMaster Endpoints ---
  @Post()
  createMaster(
    @Body() createDto: CreateInvoiceTemplateMasterDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { organization_id, id: userId } = req.user;
    return this.templateService.createMaster(createDto, organization_id, userId);
  }

  @Get()
  findAllMasters(
    @Req() req: AuthenticatedRequest,
    @Query("status") status?: TemplateStatus,
  ) {
    const { organization_id } = req.user;
    return this.templateService.findAllMasters(organization_id, status);
  }

  @Get(":masterId")
  findOneMaster(
    @Param("masterId", ParseUUIDPipe) masterId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { organization_id } = req.user;
    return this.templateService.findOneMaster(masterId, organization_id, true); // Load versions by default for detail view
  }

  @Put(":masterId")
  updateMasterDetails(
    @Param("masterId", ParseUUIDPipe) masterId: string,
    @Body() updateDto: UpdateInvoiceTemplateMasterDetailsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { organization_id, id: userId } = req.user;
    return this.templateService.updateMasterDetails(masterId, updateDto, organization_id, userId);
  }

  @Delete(":masterId")
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMaster(
    @Param("masterId", ParseUUIDPipe) masterId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { organization_id } = req.user;
    return this.templateService.deleteMaster(masterId, organization_id);
  }

  @Post(":masterId/set-default")
  setAsDefault(
    @Param("masterId", ParseUUIDPipe) masterId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { organization_id, id: userId } = req.user;
    return this.templateService.setAsDefault(masterId, organization_id, userId);
  }

  @Get("defaults/current") // This path might need adjustment if it conflicts or needs org scoping in path
  findDefault(@Req() req: AuthenticatedRequest) {
    const { organization_id } = req.user;
    return this.templateService.findDefault(organization_id);
  }

  @Post(":masterId/archive")
  archiveMaster(
    @Param("masterId", ParseUUIDPipe) masterId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { organization_id, id: userId } = req.user;
    return this.templateService.archiveMaster(masterId, organization_id, userId);
  }

  // --- InvoiceTemplateVersion Endpoints ---
  @Post(":masterId/versions")
  saveNewVersion(
    @Param("masterId", ParseUUIDPipe) masterId: string,
    @Body() createVersionDto: CreateNewTemplateVersionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { organization_id, id: userId } = req.user;
    return this.templateService.saveNewVersion(masterId, createVersionDto, organization_id, userId);
  }

  @Get(":masterId/versions")
  listVersions(
    @Param("masterId", ParseUUIDPipe) masterId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { organization_id } = req.user;
    return this.templateService.listVersions(masterId, organization_id);
  }

  @Get(":masterId/versions/:versionNumber")
  getVersion(
    @Param("masterId", ParseUUIDPipe) masterId: string,
    @Param("versionNumber") versionNumberStr: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const versionNumber = parseInt(versionNumberStr, 10);
    if (isNaN(versionNumber) || versionNumber <= 0) {
      throw new BadRequestException("Invalid version number.");
    }
    const { organization_id } = req.user;
    return this.templateService.getVersion(masterId, versionNumber, organization_id);
  }

  @Post(":masterId/versions/:versionNumber/revert")
  revertToVersion(
    @Param("masterId", ParseUUIDPipe) masterId: string,
    @Param("versionNumber") versionNumberStr: string,
    @Body("comment") comment: string | undefined, // Optional comment for the new version created by revert
    @Req() req: AuthenticatedRequest,
  ) {
    const versionNumber = parseInt(versionNumberStr, 10);
    if (isNaN(versionNumber) || versionNumber <= 0) {
      throw new BadRequestException("Invalid version number.");
    }
    const { organization_id, id: userId } = req.user;
    return this.templateService.revertToVersion(masterId, versionNumber, organization_id, userId, comment);
  }

  @Post(":masterId/versions/:versionNumber/publish")
  publishVersion(
    @Param("masterId", ParseUUIDPipe) masterId: string,
    @Param("versionNumber") versionNumberStr: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const versionNumber = parseInt(versionNumberStr, 10);
    if (isNaN(versionNumber) || versionNumber <= 0) {
      throw new BadRequestException("Invalid version number.");
    }
    const { organization_id, id: userId } = req.user;
    return this.templateService.publishVersion(masterId, versionNumber, organization_id, userId);
  }

  // Note: Preview endpoint might need to accept a version_number if previewing specific versions
  // The old /organizations/:organizationId/templates/:id/preview might need to be adapted or a new one created
  // For now, assuming preview is on the latest published or draft of a master template.
  // If previewing specific versions is needed, a new endpoint like /templates/:masterId/versions/:versionNumber/preview would be better.
}

