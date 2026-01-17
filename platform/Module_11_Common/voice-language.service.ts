import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoiceLanguage } from '../entities/voice-language.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VoiceLanguageService {
  private readonly logger = new Logger(VoiceLanguageService.name);
  
  constructor(
    @InjectRepository(VoiceLanguage)
    private voiceLanguageRepository: Repository<VoiceLanguage>,
    private configService: ConfigService,
  ) {
    this.initializeDefaultLanguages();
  }

  /**
   * Initializes default supported languages if none exist
   */
  private async initializeDefaultLanguages(): Promise<void> {
    try {
      const count = await this.voiceLanguageRepository.count();
      
      if (count === 0) {
        this.logger.log('Initializing default supported languages');
        
        const defaultLanguages = [
          {
            code: 'en-IN',
            name: 'English (India)',
            localName: 'English',
            active: true,
            supportedDialects: ['General'],
            voiceConfigurations: [
              {
                provider: 'default',
                voiceId: 'en-IN-Standard-A',
                gender: 'female',
                quality: 'standard',
              },
              {
                provider: 'default',
                voiceId: 'en-IN-Standard-B',
                gender: 'male',
                quality: 'standard',
              }
            ],
          },
          {
            code: 'hi-IN',
            name: 'Hindi',
            localName: 'हिन्दी',
            active: true,
            supportedDialects: ['General'],
            voiceConfigurations: [
              {
                provider: 'default',
                voiceId: 'hi-IN-Standard-A',
                gender: 'female',
                quality: 'standard',
              },
              {
                provider: 'default',
                voiceId: 'hi-IN-Standard-B',
                gender: 'male',
                quality: 'standard',
              }
            ],
          },
          {
            code: 'ta-IN',
            name: 'Tamil',
            localName: 'தமிழ்',
            active: true,
            supportedDialects: ['General'],
            voiceConfigurations: [
              {
                provider: 'default',
                voiceId: 'ta-IN-Standard-A',
                gender: 'female',
                quality: 'standard',
              }
            ],
          },
          {
            code: 'te-IN',
            name: 'Telugu',
            localName: 'తెలుగు',
            active: true,
            supportedDialects: ['General'],
            voiceConfigurations: [
              {
                provider: 'default',
                voiceId: 'te-IN-Standard-A',
                gender: 'female',
                quality: 'standard',
              }
            ],
          },
          {
            code: 'bn-IN',
            name: 'Bengali',
            localName: 'বাংলা',
            active: true,
            supportedDialects: ['General'],
            voiceConfigurations: [
              {
                provider: 'default',
                voiceId: 'bn-IN-Standard-A',
                gender: 'female',
                quality: 'standard',
              }
            ],
          },
          {
            code: 'mr-IN',
            name: 'Marathi',
            localName: 'मराठी',
            active: true,
            supportedDialects: ['General'],
            voiceConfigurations: [
              {
                provider: 'default',
                voiceId: 'mr-IN-Standard-A',
                gender: 'female',
                quality: 'standard',
              }
            ],
          },
          {
            code: 'gu-IN',
            name: 'Gujarati',
            localName: 'ગુજરાતી',
            active: true,
            supportedDialects: ['General'],
            voiceConfigurations: [
              {
                provider: 'default',
                voiceId: 'gu-IN-Standard-A',
                gender: 'female',
                quality: 'standard',
              }
            ],
          },
          {
            code: 'kn-IN',
            name: 'Kannada',
            localName: 'ಕನ್ನಡ',
            active: true,
            supportedDialects: ['General'],
            voiceConfigurations: [
              {
                provider: 'default',
                voiceId: 'kn-IN-Standard-A',
                gender: 'female',
                quality: 'standard',
              }
            ],
          },
          {
            code: 'ml-IN',
            name: 'Malayalam',
            localName: 'മലയാളം',
            active: true,
            supportedDialects: ['General'],
            voiceConfigurations: [
              {
                provider: 'default',
                voiceId: 'ml-IN-Standard-A',
                gender: 'female',
                quality: 'standard',
              }
            ],
          },
          {
            code: 'pa-IN',
            name: 'Punjabi',
            localName: 'ਪੰਜਾਬੀ',
            active: true,
            supportedDialects: ['General'],
            voiceConfigurations: [
              {
                provider: 'default',
                voiceId: 'pa-IN-Standard-A',
                gender: 'female',
                quality: 'standard',
              }
            ],
          }
        ];
        
        for (const language of defaultLanguages) {
          await this.voiceLanguageRepository.save(
            this.voiceLanguageRepository.create(language)
          );
        }
        
        this.logger.log(`Initialized ${defaultLanguages.length} default languages`);
      }
    } catch (error) {
      this.logger.error(`Error initializing default languages: ${error.message}`, error.stack);
    }
  }

  /**
   * Gets all supported languages
   * @param activeOnly Whether to return only active languages
   * @returns List of supported languages
   */
  async getAllLanguages(activeOnly = true): Promise<VoiceLanguage[]> {
    try {
      const query = activeOnly ? { active: true } : {};
      return await this.voiceLanguageRepository.find({ where: query });
    } catch (error) {
      this.logger.error(`Error getting languages: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Gets a language by code
   * @param code The language code
   * @returns The language details
   */
  async getLanguageByCode(code: string): Promise<VoiceLanguage | null> {
    try {
      return await this.voiceLanguageRepository.findOne({ where: { code } });
    } catch (error) {
      this.logger.error(`Error getting language by code: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Adds a new supported language
   * @param languageData The language data
   * @returns The result of the operation
   */
  async addLanguage(languageData: Omit<VoiceLanguage, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; message: string; language?: VoiceLanguage }> {
    try {
      // Check if language already exists
      const existingLanguage = await this.voiceLanguageRepository.findOne({
        where: { code: languageData.code }
      });
      
      if (existingLanguage) {
        return {
          success: false,
          message: `Language with code ${languageData.code} already exists`,
        };
      }
      
      const language = this.voiceLanguageRepository.create(languageData);
      const savedLanguage = await this.voiceLanguageRepository.save(language);
      
      return {
        success: true,
        message: 'Language added successfully',
        language: savedLanguage,
      };
    } catch (error) {
      this.logger.error(`Error adding language: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error adding language: ${error.message}`,
      };
    }
  }

  /**
   * Updates an existing language
   * @param code The language code
   * @param updates The updates to apply
   * @returns The result of the operation
   */
  async updateLanguage(
    code: string,
    updates: Partial<Omit<VoiceLanguage, 'id' | 'code' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ success: boolean; message: string; language?: VoiceLanguage }> {
    try {
      const language = await this.voiceLanguageRepository.findOne({
        where: { code }
      });
      
      if (!language) {
        return {
          success: false,
          message: `Language with code ${code} not found`,
        };
      }
      
      // Apply updates
      Object.assign(language, updates);
      
      const updatedLanguage = await this.voiceLanguageRepository.save(language);
      
      return {
        success: true,
        message: 'Language updated successfully',
        language: updatedLanguage,
      };
    } catch (error) {
      this.logger.error(`Error updating language: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error updating language: ${error.message}`,
      };
    }
  }

  /**
   * Activates or deactivates a language
   * @param code The language code
   * @param active Whether to activate or deactivate
   * @returns The result of the operation
   */
  async setLanguageActive(
    code: string,
    active: boolean
  ): Promise<{ success: boolean; message: string }> {
    try {
      const language = await this.voiceLanguageRepository.findOne({
        where: { code }
      });
      
      if (!language) {
        return {
          success: false,
          message: `Language with code ${code} not found`,
        };
      }
      
      language.active = active;
      await this.voiceLanguageRepository.save(language);
      
      return {
        success: true,
        message: `Language ${active ? 'activated' : 'deactivated'} successfully`,
      };
    } catch (error) {
      this.logger.error(`Error setting language active status: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error setting language active status: ${error.message}`,
      };
    }
  }

  /**
   * Gets the customer's preferred language
   * @param customerId The customer ID
   * @param organizationId The organization ID
   * @returns The preferred language code
   */
  async getCustomerPreferredLanguage(
    customerId: string,
    organizationId: string
  ): Promise<string> {
    try {
      // In a real implementation, this would query a customer preferences table
      // For now, we'll return a default language
      return 'en-IN';
    } catch (error) {
      this.logger.error(`Error getting customer preferred language: ${error.message}`, error.stack);
      return 'en-IN'; // Default fallback
    }
  }

  /**
   * Detects the language from voice input
   * @param audioData The audio data
   * @returns The detected language code
   */
  async detectLanguageFromVoice(audioData: Buffer): Promise<string> {
    try {
      // In a real implementation, this would call a language detection API
      // For now, we'll return a default language
      return 'en-IN';
    } catch (error) {
      this.logger.error(`Error detecting language from voice: ${error.message}`, error.stack);
      return 'en-IN'; // Default fallback
    }
  }
}
