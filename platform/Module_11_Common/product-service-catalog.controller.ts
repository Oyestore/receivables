import { Controller, Post, Body, Get, Param, Put, Delete, Query, UsePipes, ValidationPipe, ParseUUIDPipe } from "@nestjs/common";
import { ProductServiceCatalogService } from "../services/product-service-catalog.service";
import { CreateProductServiceCatalogDto, UpdateProductServiceCatalogDto } from "../dto/product-service-catalog.dto";
import { ProductServiceCatalog } from "../entities/product-service-catalog.entity";

@Controller("api/v1/products-services") // Base path as per design document
export class ProductServiceCatalogController {
  constructor(private readonly catalogService: ProductServiceCatalogService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() createDto: CreateProductServiceCatalogDto): Promise<ProductServiceCatalog> {
    // Assuming tenant_id will be extracted from auth token in a real app
    // For now, it must be provided in the DTO.
    return this.catalogService.create(createDto);
  }

  @Get()
  async findAll(@Query("tenant_id", ParseUUIDPipe) tenant_id: string): Promise<ProductServiceCatalog[]> {
    return this.catalogService.findAll(tenant_id);
  }

  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("tenant_id", ParseUUIDPipe) tenant_id: string
  ): Promise<ProductServiceCatalog> {
    return this.catalogService.findOne(id, tenant_id);
  }

  @Put(":id")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProductServiceCatalogDto,
    @Query("tenant_id", ParseUUIDPipe) tenant_id: string // Assuming tenant_id for authorization
  ): Promise<ProductServiceCatalog> {
    return this.catalogService.update(id, updateDto, tenant_id);
  }

  @Delete(":id")
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("tenant_id", ParseUUIDPipe) tenant_id: string
  ): Promise<void> {
    return this.catalogService.remove(id, tenant_id);
  }
}

