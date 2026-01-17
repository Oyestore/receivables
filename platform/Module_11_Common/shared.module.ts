import { Module, Global } from "@nestjs/common";
import { EncryptionService } from "./encryption.service";
import { ConfigModule } from "@nestjs/config"; // ConfigModule might be needed if not already global

@Global() // Make EncryptionService available globally if needed, or import SharedModule where needed
@Module({
  imports: [ConfigModule], // Ensure ConfigModule is available for ConfigService injection
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class SharedModule {}

