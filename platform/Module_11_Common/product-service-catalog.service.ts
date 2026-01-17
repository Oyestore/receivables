import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProductServiceCatalog } from "../entities/product-service-catalog.entity";
import { CreateProductServiceCatalogDto, UpdateProductServiceCatalogDto } from "../dto/product-service-catalog.dto";

@Injectable()
export class ProductServiceCatalogService {
  constructor(
    @InjectRepository(ProductServiceCatalog)
    private readonly catalogRepository: Repository<ProductServiceCatalog>,
  ) {}

  async create(createDto: CreateProductServiceCatalogDto): Promise<ProductServiceCatalog> {
    try {
      const newItem = this.catalogRepository.create(createDto);
      return await this.catalogRepository.save(newItem);
    } catch (error) {
      if (error.code === "23505") { // Unique constraint violation
        throw new ConflictException(`An item with name "${createDto.item_name}" already exists for this tenant.`);
      }
      console.error("Error creating product/service catalog item:", error);
      throw new InternalServerErrorException("Could not create catalog item. " + error.message);
    }
  }

  async findAll(tenant_id: string): Promise<ProductServiceCatalog[]> {
    return this.catalogRepository.find({ where: { tenant_id } });
  }

  async findOne(id: string, tenant_id: string): Promise<ProductServiceCatalog> {
    const item = await this.catalogRepository.findOne({ where: { id, tenant_id } });
    if (!item) {
      throw new NotFoundException(`Product/Service catalog item with ID "${id}" not found for this tenant.`);
    }
    return item;
  }

  async update(id: string, updateDto: UpdateProductServiceCatalogDto, tenant_id: string): Promise<ProductServiceCatalog> {
    const item = await this.findOne(id, tenant_id); // Ensures item exists and belongs to tenant
    try {
      this.catalogRepository.merge(item, updateDto);
      return await this.catalogRepository.save(item);
    } catch (error) {
      if (error.code === "23505" && updateDto.item_name) { // Unique constraint violation on name update
        throw new ConflictException(`An item with name "${updateDto.item_name}" already exists for this tenant.`);
      }
      console.error("Error updating product/service catalog item:", error);
      throw new InternalServerErrorException("Could not update catalog item. " + error.message);
    }
  }

  async remove(id: string, tenant_id: string): Promise<void> {
    const item = await this.findOne(id, tenant_id); // Ensures item exists and belongs to tenant
    // Consider implications if this item is used in invoice_line_items (product_id)
    // The schema sets product_id in invoice_line_items to NULL ON DELETE, which is a safe default.
    await this.catalogRepository.remove(item);
  }
}

