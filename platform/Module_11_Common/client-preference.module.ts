import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientPreference } from "./entities/client-preference.entity";
import { ClientPreferenceService } from "./services/client-preference.service";
import { ClientPreferenceController } from "./controllers/client-preference.controller";

@Module({
  imports: [TypeOrmModule.forFeature([ClientPreference])],
  providers: [ClientPreferenceService],
  controllers: [ClientPreferenceController],
  exports: [ClientPreferenceService] // Export if other modules need to use this service
})
export class ClientPreferenceModule {}

