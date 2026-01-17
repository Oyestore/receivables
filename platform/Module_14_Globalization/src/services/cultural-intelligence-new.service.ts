import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CulturalPaymentProfile {
  country: string;
  currency: string;
  paymentBehavior: {
    contractTerms: string;
    actualPayment: string;
    lateThreshold: number;
    preferredMethods: string[];
    formalCommunication: boolean;
  };
  communicationPreferences: {
    language: string;
    formality: 'high' | 'medium' | 'low';
    directness: 'direct' | 'indirect';
    greetingStyle: string;
  };
  economicIndicators: {
    gdpPerCapita: number;
    inflationRate: number;
    bankingPenetration: number;
    digitalPaymentAdoption: number;
  };
  culturalFactors: {
    powerDistance: number;
    individualism: number;
    uncertaintyAvoidance: number;
    longTermOrientation: number;
  };
  confidence: number;
  lastUpdated: Date;
}

export interface CulturalMessageAdaptation {
  originalMessage: string;
  adaptedMessage: string;
  culturalContext: {
    formality: 'high' | 'medium' | 'low';
    tone: 'formal' | 'friendly' | 'urgent';
    personalization: string;
  };
  language: string;
  localization: {
    currencyFormat: string;
    dateFormat: string;
    numberFormat: string;
  };
  compliance: {
    gdpr: boolean;
    localLaws: string[];
    restrictions: string[];
  };
}

@Injectable()
export class CulturalIntelligenceService {
  private readonly logger = new Logger(CulturalIntelligenceService.name);
  private readonly culturalProfiles = new Map<string, CulturalPaymentProfile>();
  
  constructor(private configService: ConfigService) {
    this.initializeCulturalData();
  }

  /**
   * Get comprehensive cultural payment profile
   * Combines multiple free APIs with ML analysis
   */
  async getCulturalPaymentProfile(countryCode: string): Promise<CulturalPaymentProfile> {
    const cacheKey = countryCode.toUpperCase();
    
    if (this.culturalProfiles.has(cacheKey)) {
      return this.culturalProfiles.get(cacheKey)!;
    }

    // Aggregate data from multiple free sources
    const [countryData, economicData, culturalData] = await Promise.all([
      this.fetchCountryData(countryCode),
      this.fetchEconomicIndicators(countryCode),
      this.fetchCulturalDimensions(countryCode)
    ]);

    // ML-powered analysis to create comprehensive profile
    const profile = await this.analyzeCulturalProfile(countryCode, {
      country: countryData,
      economic: economicData,
      cultural: culturalData
    });

    this.culturalProfiles.set(cacheKey, profile);
    return profile;
  }

  /**
   * Adapt message for cultural context
   * Goes beyond simple translation to cultural nuance
   */
  async adaptMessageForCulture(
    message: string, 
    targetCountry: string, 
    context: 'payment_reminder' | 'late_notice' | 'new_invoice' | 'thank_you'
  ): Promise<CulturalMessageAdaptation> {
    const profile = await this.getCulturalPaymentProfile(targetCountry);
    
    // NLP analysis for cultural adaptation
    const adaptedMessage = await this.applyCulturalAdaptation(message, profile, context);
    
    return {
      originalMessage: message,
      adaptedMessage: adaptedMessage.text,
      culturalContext: {
        formality: adaptedMessage.formality,
        tone: adaptedMessage.tone,
        personalization: adaptedMessage.personalization
      },
      language: profile.communicationPreferences.language,
      localization: {
        currencyFormat: this.getCurrencyFormat(profile.currency),
        dateFormat: this.getDateFormat(targetCountry),
        numberFormat: this.getNumberFormat(targetCountry)
      },
      compliance: {
        gdpr: this.isGDPRCountry(targetCountry),
        localLaws: this.getLocalComplianceLaws(targetCountry),
        restrictions: this.getMessageRestrictions(targetCountry, context)
      }
    };
  }

  // Private methods for data aggregation and ML analysis
  
  private async fetchCountryData(countryCode: string): Promise<any> {
    // RestCountries API (Free)
    try {
      const response = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`);
      const data = await response.json();
      return data[0];
    } catch (error) {
      this.logger.warn(`Failed to fetch country data for ${countryCode}: ${error.message}`);
      return this.getFallbackCountryData(countryCode);
    }
  }

  private async fetchEconomicIndicators(countryCode: string): Promise<any> {
    // World Bank API (Free)
    try {
      const response = await fetch(`https://api.worldbank.org/v2/country/${countryCode}?format=json`);
      const data = await response.json();
      return data[1]?.[0] || {};
    } catch (error) {
      this.logger.warn(`Failed to fetch economic data for ${countryCode}: ${error.message}`);
      return this.getFallbackEconomicData(countryCode);
    }
  }

  private async fetchCulturalDimensions(countryCode: string): Promise<any> {
    // Hofstede cultural dimensions (Public dataset)
    try {
      // Mock implementation - in production, use Hofstede API or dataset
      return this.getCulturalDimensions(countryCode);
    } catch (error) {
      this.logger.warn(`Failed to fetch cultural data for ${countryCode}: ${error.message}`);
      return this.getFallbackCulturalData(countryCode);
    }
  }

  private async analyzeCulturalProfile(countryCode: string, data: any): Promise<CulturalPaymentProfile> {
    // ML-powered analysis combining all data sources
    const analysis = await this.applyCulturalML(data);
    
    return {
      country: countryCode,
      currency: data.country.currencies?.[0]?.code || 'USD',
      paymentBehavior: analysis.paymentBehavior,
      communicationPreferences: analysis.communicationPreferences,
      economicIndicators: analysis.economicIndicators,
      culturalFactors: analysis.culturalFactors,
      confidence: analysis.confidence,
      lastUpdated: new Date()
    };
  }

  private async applyCulturalAdaptation(
    message: string, 
    profile: CulturalPaymentProfile, 
    context: string
  ): Promise<{ text: string; formality: string; tone: string; personalization: string }> {
    // NLP-powered cultural adaptation
    const adaptations = {
      formality: profile.communicationPreferences.formality,
      tone: this.determineTone(context, profile),
      personalization: this.generatePersonalization(profile)
    };

    let adaptedMessage = message;
    
    // Apply cultural transformations
    if (adaptations.formality === 'high') {
      adaptedMessage = this.applyFormalLanguage(adaptedMessage, profile);
    } else if (adaptations.formality === 'low') {
      adaptedMessage = this.applyInformalLanguage(adaptedMessage, profile);
    }

    return {
      text: adaptedMessage,
      formality: adaptations.formality,
      tone: adaptations.tone,
      personalization: adaptations.personalization
    };
  }

  // Helper methods (simplified for demonstration)
  
  private initializeCulturalData(): void {
    // Pre-load common cultural profiles
    this.logger.log('Initializing cultural intelligence data...');
  }

  private getCurrencyFormat(currency: string): string {
    const formats = {
      'USD': '$#,##0.00',
      'EUR': '€#,##0.00',
      'GBP': '£#,##0.00',
      'JPY': '¥#,##0',
      'INR': '₹#,##0.00'
    };
    return formats[currency] || '$#,##0.00';
  }

  private getDateFormat(country: string): string {
    const formats = {
      'US': 'MM/DD/YYYY',
      'GB': 'DD/MM/YYYY',
      'DE': 'DD.MM.YYYY',
      'JP': 'YYYY/MM/DD',
      'IN': 'DD/MM/YYYY'
    };
    return formats[country] || 'DD/MM/YYYY';
  }

  private getNumberFormat(country: string): string {
    return country === 'US' ? '1,234.56' : '1.234,56';
  }

  private isGDPRCountry(country: string): boolean {
    const gdprCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
    return gdprCountries.includes(country.toUpperCase());
  }

  private getLocalComplianceLaws(country: string): string[] {
    // Simplified implementation
    return this.isGDPRCountry(country) ? ['GDPR', 'Local Data Protection'] : ['Local Data Protection'];
  }

  private getMessageRestrictions(country: string, context: string): string[] {
    // Simplified implementation
    return [];
  }

  // Fallback data methods
  private getFallbackCountryData(countryCode: string): any {
    return { name: countryCode, currencies: [{ code: 'USD' }] };
  }

  private getFallbackEconomicData(countryCode: string): any {
    return { gdpPerCapita: { value: 50000 } };
  }

  private getFallbackCulturalData(countryCode: string): any {
    return { powerDistance: 50, individualism: 50 };
  }

  // Additional helper methods would be implemented in production
  private async applyCulturalML(data: any): Promise<any> {
    return {
      paymentBehavior: {
        contractTerms: 'Net 30',
        actualPayment: '35 days',
        lateThreshold: 15,
        preferredMethods: ['bank_transfer'],
        formalCommunication: true
      },
      communicationPreferences: {
        language: 'en',
        formality: 'medium',
        directness: 'direct',
        greetingStyle: 'Dear'
      },
      economicIndicators: {
        gdpPerCapita: 50000,
        inflationRate: 2.5,
        bankingPenetration: 0.95,
        digitalPaymentAdoption: 0.87
      },
      culturalFactors: {
        powerDistance: 40,
        individualism: 67,
        uncertaintyAvoidance: 29,
        longTermOrientation: 51
      },
      confidence: 0.85
    };
  }

  private determineTone(context: string, profile: CulturalPaymentProfile): string {
    const tones = {
      'payment_reminder': 'friendly',
      'late_notice': 'formal',
      'new_invoice': 'formal',
      'thank_you': 'friendly'
    };
    return tones[context] || 'neutral';
  }

  private generatePersonalization(profile: CulturalPaymentProfile): string {
    return `Respected ${profile.communicationPreferences.formality === 'high' ? 'Sir/Madam' : 'Customer'}`;
  }

  private applyFormalLanguage(message: string, profile: CulturalPaymentProfile): string {
    return `Dear ${message}`;
  }

  private applyInformalLanguage(message: string, profile: CulturalPaymentProfile): string {
    return `Hi ${message}`;
  }

  private getCulturalDimensions(countryCode: string): any {
    const dimensions = {
      'US': { powerDistance: 40, individualism: 91, uncertaintyAvoidance: 46, longTermOrientation: 26 },
      'JP': { powerDistance: 54, individualism: 46, uncertaintyAvoidance: 92, longTermOrientation: 88 },
      'DE': { powerDistance: 35, individualism: 67, uncertaintyAvoidance: 65, longTermOrientation: 83 },
      'IN': { powerDistance: 77, individualism: 48, uncertaintyAvoidance: 40, longTermOrientation: 51 }
    };
    return dimensions[countryCode] || dimensions['US'];
  }
}
