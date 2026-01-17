import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoiceLanguage } from './entities/voice-language.entity';
import { VoiceBiometric } from './entities/voice-biometric.entity';
import { VoiceInteraction } from './entities/voice-interaction.entity';
import { VoiceAuthenticationService } from './services/voice-authentication.service';
import { VoiceCollectionService } from './services/voice-collection.service';
import { VoiceLanguageService } from './services/voice-language.service';
import { VoiceController } from './controllers/voice.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VoiceLanguage,
      VoiceBiometric,
      VoiceInteraction
    ]),
    ConfigModule
  ],
  controllers: [VoiceController],
  providers: [
    VoiceAuthenticationService,
    VoiceCollectionService,
    VoiceLanguageService
  ],
  exports: [
    VoiceAuthenticationService,
    VoiceCollectionService,
    VoiceLanguageService
  ]
})
export class VoiceModule {}
