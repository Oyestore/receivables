import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface TranslationContext {
  module: string;
  component: string;
  context: string;
  variables?: Record<string, any>;
}

export interface LocalizableContent {
  text: string;
  variables?: Record<string, any>;
  formatting?: FormattingOptions;
}

export interface LocalizedContent {
  translatedText: string;
  formattedContent: string;
  rtl: boolean;
  locale: string;
}

export interface FormattingOptions {
  dateFormat?: string;
  numberFormat?: string;
  currencyFormat?: string;
  timeFormat?: string;
}

export interface LocaleConfig {
  locale: string;
  language: string;
  region: string;
  rtl: boolean;
  dateFormat: string;
  numberFormat: string;
  currencyFormat: string;
  timeFormat: string;
  fallbackLocale: string;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  enabled: boolean;
  completion: number;
}

export interface UserPreferences {
  userId: string;
  locale: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  currencyFormat: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  language: string;
}

@Injectable()
export class GlobalizationService {
  private readonly logger = new Logger(GlobalizationService.name);
  private readonly translations = new Map<string, Map<string, string>>();
  private readonly localeConfigs = new Map<string, LocaleConfig>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    this.initializeTranslations();
    this.initializeLocaleConfigs();
  }

  /**
   * Translate text to target language with context
   */
  async translateText(key: string, language: string, context?: TranslationContext): Promise<string> {
    try {
      // Get translation for the key and language
      const translation = await this.getTranslation(key, language);
      
      // Apply variable substitution if provided
      let translatedText = translation;
      if (context?.variables) {
        translatedText = this.substituteVariables(translation, context.variables);
      }

      // Apply context-specific formatting
      if (context) {
        translatedText = this.applyContextFormatting(translatedText, context);
      }

      this.logger.log(`Translated key "${key}" to ${language}`);

      return translatedText;
    } catch (error) {
      this.logger.error(`Failed to translate text: ${error.message}`);
      // Return fallback translation
      return await this.getFallbackTranslation(key, language);
    }
  }

  /**
   * Format date according to locale conventions
   */
  async formatDate(date: Date, locale: string, format?: string): Promise<string> {
    try {
      const localeConfig = this.getLocaleConfig(locale);
      const dateFormat = format || localeConfig.dateFormat;

      // Apply locale-specific date formatting
      const formattedDate = this.applyDateFormat(date, dateFormat, locale);

      this.logger.log(`Formatted date for locale ${locale}: ${formattedDate}`);

      return formattedDate;
    } catch (error) {
      this.logger.error(`Failed to format date: ${error.message}`);
      return date.toISOString();
    }
  }

  /**
   * Format currency according to locale conventions
   */
  async formatCurrency(amount: number, currency: string, locale: string): Promise<string> {
    try {
      const localeConfig = this.getLocaleConfig(locale);
      const currencyFormat = localeConfig.currencyFormat;

      // Apply locale-specific currency formatting
      const formattedCurrency = this.applyCurrencyFormat(amount, currency, currencyFormat, locale);

      this.logger.log(`Formatted currency ${amount} ${currency} for locale ${locale}: ${formattedCurrency}`);

      return formattedCurrency;
    } catch (error) {
      this.logger.error(`Failed to format currency: ${error.message}`);
      return `${amount} ${currency}`;
    }
  }

  /**
   * Localize content with variables and formatting
   */
  async localizeContent(content: LocalizableContent, targetLocale: string): Promise<LocalizedContent> {
    try {
      const localeConfig = this.getLocaleConfig(targetLocale);
      
      // Translate the content
      const translatedText = await this.translateText(content.text, targetLocale);
      
      // Apply variable substitution
      let processedText = translatedText;
      if (content.variables) {
        processedText = this.substituteVariables(processedText, content.variables);
      }

      // Apply formatting
      const formattedContent = await this.applyContentFormatting(processedText, content.formatting, targetLocale);

      return {
        translatedText: processedText,
        formattedContent,
        rtl: localeConfig.rtl,
        locale: targetLocale,
      };
    } catch (error) {
      this.logger.error(`Failed to localize content: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get list of supported languages
   */
  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    const languages: SupportedLanguage[] = [
      {
        code: 'en-US',
        name: 'English (United States)',
        nativeName: 'English (United States)',
        rtl: false,
        enabled: true,
        completion: 100,
      },
      {
        code: 'es-ES',
        name: 'Spanish (Spain)',
        nativeName: 'Español (España)',
        rtl: false,
        enabled: true,
        completion: 95,
      },
      {
        code: 'fr-FR',
        name: 'French (France)',
        nativeName: 'Français (France)',
        rtl: false,
        enabled: true,
        completion: 90,
      },
      {
        code: 'de-DE',
        name: 'German (Germany)',
        nativeName: 'Deutsch (Deutschland)',
        rtl: false,
        enabled: true,
        completion: 85,
      },
      {
        code: 'pt-BR',
        name: 'Portuguese (Brazil)',
        nativeName: 'Português (Brasil)',
        rtl: false,
        enabled: true,
        completion: 80,
      },
      {
        code: 'zh-CN',
        name: 'Chinese (Simplified)',
        nativeName: '简体中文',
        rtl: false,
        enabled: true,
        completion: 75,
      },
      {
        code: 'ja-JP',
        name: 'Japanese',
        nativeName: '日本語',
        rtl: false,
        enabled: true,
        completion: 70,
      },
      {
        code: 'ar-SA',
        name: 'Arabic (Saudi Arabia)',
        nativeName: 'العربية',
        rtl: true,
        enabled: true,
        completion: 65,
      },
      {
        code: 'hi-IN',
        name: 'Hindi (India)',
        nativeName: 'हिन्दी',
        rtl: false,
        enabled: true,
        completion: 60,
      },
      {
        code: 'ru-RU',
        name: 'Russian',
        nativeName: 'Русский',
        rtl: false,
        enabled: true,
        completion: 55,
      },
    ];

    return languages;
  }

  /**
   * Get locale configuration
   */
  async getLocaleConfig(locale: string): Promise<LocaleConfig> {
    const config = this.localeConfigs.get(locale);
    
    if (!config) {
      // Return default configuration if locale not found
      return this.localeConfigs.get('en-US') || this.getDefaultLocaleConfig();
    }

    return config;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      // Save user preferences to database
      await this.userRepository.update(userId, {
        locale: preferences.locale,
        timezone: preferences.timezone,
        preferences: JSON.stringify(preferences),
      });

      this.logger.log(`Updated preferences for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update user preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect user's preferred language from browser
   */
  async detectUserLanguage(acceptLanguage: string): Promise<string> {
    try {
      // Parse Accept-Language header
      const languages = acceptLanguage.split(',').map(lang => {
        const [code, quality = '1'] = lang.trim().split(';q=');
        return { code: code.trim(), quality: parseFloat(quality) };
      });

      // Sort by quality
      languages.sort((a, b) => b.quality - a.quality);

      // Find first supported language
      const supportedLanguages = await this.getSupportedLanguages();
      
      for (const lang of languages) {
        const supported = supportedLanguages.find(sl => sl.code === lang.code || sl.code.startsWith(lang.code.split('-')[0]));
        if (supported && supported.enabled) {
          return supported.code;
        }
      }

      // Return default language if no match found
      return 'en-US';
    } catch (error) {
      this.logger.error(`Failed to detect user language: ${error.message}`);
      return 'en-US';
    }
  }

  /**
   * Get localized template for notifications
   */
  async getLocalizedTemplate(templateType: string, locale: string, variables?: Record<string, any>): Promise<string> {
    try {
      const templateKey = `templates.${templateType}`;
      const template = await this.translateText(templateKey, locale);
      
      if (variables) {
        return this.substituteVariables(template, variables);
      }
      
      return template;
    } catch (error) {
      this.logger.error(`Failed to get localized template: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate locale code
   */
  async validateLocale(locale: string): Promise<boolean> {
    try {
      const supportedLanguages = await this.getSupportedLanguages();
      return supportedLanguages.some(lang => lang.code === locale && lang.enabled);
    } catch (error) {
      this.logger.error(`Failed to validate locale: ${error.message}`);
      return false;
    }
  }

  /**
   * Get fallback locale for a given locale
   */
  async getFallbackLocale(locale: string): Promise<string> {
    try {
      const config = await this.getLocaleConfig(locale);
      return config.fallbackLocale || 'en-US';
    } catch (error) {
      this.logger.error(`Failed to get fallback locale: ${error.message}`);
      return 'en-US';
    }
  }

  // Private helper methods

  private async getTranslation(key: string, language: string): Promise<string> {
    const languageTranslations = this.translations.get(language);
    
    if (!languageTranslations) {
      throw new Error(`Translations not found for language: ${language}`);
    }

    const translation = languageTranslations.get(key);
    
    if (!translation) {
      throw new Error(`Translation not found for key: ${key} in language: ${language}`);
    }

    return translation;
  }

  private async getFallbackTranslation(key: string, language: string): Promise<string> {
    const fallbackLocale = await this.getFallbackLocale(language);
    
    try {
      return await this.getTranslation(key, fallbackLocale);
    } catch (error) {
      // Return key as last resort
      return key;
    }
  }

  private substituteVariables(text: string, variables: Record<string, any>): string {
    let result = text;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  private applyContextFormatting(text: string, context: TranslationContext): string {
    // Apply context-specific formatting
    switch (context.context) {
      case 'email':
        return this.formatForEmail(text);
      case 'sms':
        return this.formatForSMS(text);
      case 'notification':
        return this.formatForNotification(text);
      default:
        return text;
    }
  }

  private formatForEmail(text: string): string {
    // Apply email-specific formatting
    return text.replace(/\n/g, '<br>');
  }

  private formatForSMS(text: string): string {
    // Apply SMS-specific formatting (remove HTML, limit length)
    return text.replace(/<[^>]*>/g, '').substring(0, 160);
  }

  private formatForNotification(text: string): string {
    // Apply notification-specific formatting
    return text;
  }

  private applyDateFormat(date: Date, format: string, locale: string): string {
    const localeConfig = this.getLocaleConfig(locale);
    
    // Apply locale-specific date formatting
    switch (format) {
      case 'short':
        return date.toLocaleDateString(locale, { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      case 'long':
        return date.toLocaleDateString(locale, { 
          weekday: 'long',
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'time':
        return date.toLocaleTimeString(locale);
      case 'datetime':
        return date.toLocaleString(locale);
      default:
        return date.toLocaleDateString(locale);
    }
  }

  private applyCurrencyFormat(amount: number, currency: string, format: string, locale: string): string {
    // Apply locale-specific currency formatting
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  private async applyContentFormatting(content: string, formatting?: FormattingOptions, locale?: string): Promise<string> {
    if (!formatting || !locale) {
      return content;
    }

    let formattedContent = content;

    // Apply date formatting
    if (formatting.dateFormat) {
      const dateRegex = /\{\{date:([^}]+)\}\}/g;
      formattedContent = formattedContent.replace(dateRegex, (match, dateStr) => {
        const date = new Date(dateStr);
        return this.applyDateFormat(date, formatting.dateFormat!, locale);
      });
    }

    // Apply currency formatting
    if (formatting.currencyFormat) {
      const currencyRegex = /\{\{currency:([^:]+):([^}]+)\}\}/g;
      formattedContent = formattedContent.replace(currencyRegex, (match, amount, currency) => {
        return this.applyCurrencyFormat(parseFloat(amount), currency, formatting.currencyFormat!, locale);
      });
    }

    // Apply number formatting
    if (formatting.numberFormat) {
      const numberRegex = /\{\{number:([^}]+)\}\}/g;
      formattedContent = formattedContent.replace(numberRegex, (match, numStr) => {
        return new Intl.NumberFormat(locale).format(parseFloat(numStr));
      });
    }

    return formattedContent;
  }

  private initializeTranslations(): void {
    // Initialize translations for different languages
    const englishTranslations = new Map<string, string>();
    englishTranslations.set('welcome.message', 'Welcome to our platform!');
    englishTranslations.set('verification.pending', 'Your verification is pending review');
    englishTranslations.set('verification.approved', 'Your verification has been approved');
    englishTranslations.set('verification.rejected', 'Your verification has been rejected');
    englishTranslations.set('milestone.completed', 'Milestone completed successfully');
    englishTranslations.set('payment.due', 'Payment is due');
    englishTranslations.set('templates.welcome.email', 'Welcome {{userName}}! Your account has been created successfully.');
    englishTranslations.set('templates.verification.sms', 'Your verification {{verificationId}} is {{status}}.');
    this.translations.set('en-US', englishTranslations);

    // Spanish translations
    const spanishTranslations = new Map<string, string>();
    spanishTranslations.set('welcome.message', '¡Bienvenido a nuestra plataforma!');
    spanishTranslations.set('verification.pending', 'Su verificación está pendiente de revisión');
    spanishTranslations.set('verification.approved', 'Su verificación ha sido aprobada');
    spanishTranslations.set('verification.rejected', 'Su verificación ha sido rechazada');
    spanishTranslations.set('milestone.completed', 'Hito completado exitosamente');
    spanishTranslations.set('payment.due', 'El pago está vencido');
    spanishTranslations.set('templates.welcome.email', '¡Bienvenido {{userName}}! Su cuenta ha sido creada exitosamente.');
    spanishTranslations.set('templates.verification.sms', 'Su verificación {{verificationId}} está {{status}}.');
    this.translations.set('es-ES', spanishTranslations);

    // French translations
    const frenchTranslations = new Map<string, string>();
    frenchTranslations.set('welcome.message', 'Bienvenue sur notre plateforme!');
    frenchTranslations.set('verification.pending', 'Votre vérification est en attente de révision');
    frenchTranslations.set('verification.approved', 'Votre vérification a été approuvée');
    frenchTranslations.set('verification.rejected', 'Votre vérification a été rejetée');
    frenchTranslations.set('milestone.completed', 'Jalon complété avec succès');
    frenchTranslations.set('payment.due', 'Le paiement est dû');
    frenchTranslations.set('templates.welcome.email', 'Bienvenue {{userName}}! Votre compte a été créé avec succès.');
    frenchTranslations.set('templates.verification.sms', 'Votre vérification {{verificationId}} est {{status}}.');
    this.translations.set('fr-FR', frenchTranslations);
  }

  private initializeLocaleConfigs(): void {
    // Initialize locale configurations
    const enUSConfig: LocaleConfig = {
      locale: 'en-US',
      language: 'en',
      region: 'US',
      rtl: false,
      dateFormat: 'MM/dd/yyyy',
      numberFormat: 'en-US',
      currencyFormat: 'USD',
      timeFormat: '12h',
      fallbackLocale: 'en-US',
    };

    const esESConfig: LocaleConfig = {
      locale: 'es-ES',
      language: 'es',
      region: 'ES',
      rtl: false,
      dateFormat: 'dd/MM/yyyy',
      numberFormat: 'es-ES',
      currencyFormat: 'EUR',
      timeFormat: '24h',
      fallbackLocale: 'en-US',
    };

    const frFRConfig: LocaleConfig = {
      locale: 'fr-FR',
      language: 'fr',
      region: 'FR',
      rtl: false,
      dateFormat: 'dd/MM/yyyy',
      numberFormat: 'fr-FR',
      currencyFormat: 'EUR',
      timeFormat: '24h',
      fallbackLocale: 'en-US',
    };

    const arSAConfig: LocaleConfig = {
      locale: 'ar-SA',
      language: 'ar',
      region: 'SA',
      rtl: true,
      dateFormat: 'dd/MM/yyyy',
      numberFormat: 'ar-SA',
      currencyFormat: 'SAR',
      timeFormat: '12h',
      fallbackLocale: 'en-US',
    };

    this.localeConfigs.set('en-US', enUSConfig);
    this.localeConfigs.set('es-ES', esESConfig);
    this.localeConfigs.set('fr-FR', frFRConfig);
    this.localeConfigs.set('ar-SA', arSAConfig);
  }

  private getDefaultLocaleConfig(): LocaleConfig {
    return {
      locale: 'en-US',
      language: 'en',
      region: 'US',
      rtl: false,
      dateFormat: 'MM/dd/yyyy',
      numberFormat: 'en-US',
      currencyFormat: 'USD',
      timeFormat: '12h',
      fallbackLocale: 'en-US',
    };
  }
}

// Entity interfaces (would be in separate entity files)
export interface User {
  id: string;
  locale: string;
  timezone: string;
  preferences: string;
}
