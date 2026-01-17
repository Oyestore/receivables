import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserDefinedDataSource } from "./entities/user-defined-data-source.entity";
import { UserDataSourceService } from "./services/user-data-source.service";
import { UserDataSourceController } from "./controllers/user-data-source.controller";
import { UserDataSourceFetchingService } from "./services/user-data-source-fetching.service"; // Import the new service
import { SharedModule } from "../../shared/shared.module"; // Import SharedModule for EncryptionService

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDefinedDataSource]),
    SharedModule, // Add SharedModule to imports
  ],
  providers: [
    UserDataSourceService, 
    UserDataSourceFetchingService, // Provide the new service
  ],
  controllers: [UserDataSourceController],
  exports: [UserDataSourceService, UserDataSourceFetchingService], // Export both services
})
export class UserDataSourceModule {}

