import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductServiceCatalog } from "./entities/product-service-catalog.entity";
import { ProductServiceCatalogService } from "./services/product-service-catalog.service";
import { ProductServiceCatalogController } from "./controllers/product-service-catalog.controller";

@Module({
  imports: [TypeOrmModule.forFeature([ProductServiceCatalog])],
  providers: [ProductServiceCatalogService],
  controllers: [ProductServiceCatalogController],
  exports: [ProductServiceCatalogService] // Export if other modules need to use this service
})
export class ProductServiceCatalogModule {}

