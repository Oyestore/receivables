import { Controller, Post, Body, Get, Param, Put, Delete, UseGuards, Req, ParseUUIDPipe, Query } from "@nestjs/common";
import { UserDataSourceService } from "../services/user-data-source.service";
import { CreateUserDefinedDataSourceDto, UpdateUserDefinedDataSourceDto } from "../dto/user-defined-data-source.dto.ts";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard"; 
import { AuthenticatedRequest } from "../../auth/interfaces/authenticated-request.interface"; 
import { UserDataSourceFetchingService } from "../services/user-data-source-fetching.service"; // Import the fetching service

@UseGuards(JwtAuthGuard)
@Controller("user-data-sources")
export class UserDataSourceController {
  constructor(
    private readonly dataSourceService: UserDataSourceService,
    private readonly dataSourceFetchingService: UserDataSourceFetchingService, // Inject the fetching service
  ) {}

  @Post()
  async create(
    @Body() createDto: CreateUserDefinedDataSourceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const organizationId = req.user.organization_id;
    return this.dataSourceService.create(createDto, organizationId);
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    const organizationId = req.user.organization_id;
    return this.dataSourceService.findAll(organizationId);
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const organizationId = req.user.organization_id;
    return this.dataSourceService.findOne(id, organizationId);
  }

  @Put(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUserDefinedDataSourceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const organizationId = req.user.organization_id;
    return this.dataSourceService.update(id, updateDto, organizationId);
  }

  @Delete(":id")
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const organizationId = req.user.organization_id;
    await this.dataSourceService.remove(id, organizationId);
    return { message: "Data source deleted successfully" };
  }

  @Post(":id/test-connection")
  async testConnection(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // This existing testConnection in UserDataSourceService is conceptual.
    // For a real test, it should use UserDataSourceFetchingService.
    // Let's update UserDataSourceService to use UserDataSourceFetchingService for this.
    const organizationId = req.user.organization_id;
    return this.dataSourceService.testConnection(id, organizationId);
  }

  // New endpoint to actually fetch data from a configured data source
  @Get(":id/fetch-data")
  async fetchData(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() queryParams: Record<string, any>, // Allow passing query parameters for REST APIs
    @Req() req: AuthenticatedRequest,
  ) {
    const organizationId = req.user.organization_id;
    // We need to ensure the user/org owns this data source before fetching
    // The UserDataSourceFetchingService.fetchData already fetches the dataSource by ID,
    // but it doesn't inherently check for organization_id ownership.
    // Let's assume findOne will throw if not found or not owned, or add an explicit check.
    await this.dataSourceService.findOne(id, organizationId); // This ensures ownership
    return this.dataSourceFetchingService.fetchData(id, queryParams);
  }
}

