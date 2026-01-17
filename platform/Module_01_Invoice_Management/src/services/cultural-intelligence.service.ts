import { Injectable, Logger } from '@nestjs/common';
import { DeepSeekR1Service } from './deepseek-r1.service';

export interface CulturalInsight {
  region: string;
  language: string;
  communication: {
    tone: string;
    formality: string;
    greetings: string[];
    closing: string[];
  };
  businessPractices: {
    meetingEtiquette: string[];
    negotiationStyle: string;
    decisionMaking: string;
    relationshipBuilding: string[];
  };
  timing: {
    businessHours: string;
    holidays: string[];
    festivalConsiderations: string[];
    optimalTiming: string[];
  };
  payment: {
    preferredMethods: string[];
    timingExpectations: string;
    followUpFrequency: string;
    latePaymentHandling: string;
  };
  documentation: {
    languagePreference: string;
    formatExpectations: string[];
    requiredFields: string[];
    culturalElements: string[];
  };
}

export interface RegionalAdaptation {
  state: string;
  region: string;
  primaryLanguage: string;
  secondaryLanguages: string[];
  businessCulture: string;
  localCustoms: string[];
  adaptationRecommendations: {
    language: string[];
    design: string[];
    timing: string[];
    communication: string[];
  };
}

export interface FestivalCalendar {
  festival: string;
  date: string;
  type: 'religious' | 'national' | 'regional' | 'cultural';
  significance: string;
  businessImpact: string;
  recommendations: string[];
  states: string[];
}

@Injectable()
export class CulturalIntelligenceService {
  private readonly logger = new Logger(CulturalIntelligenceService.name);

  constructor(
    private readonly deepSeekService: DeepSeekR1Service,
  ) {}

  /**
   * Get cultural insights for specific region and business context
   */
  async getCulturalInsights(region: string, businessContext: any): Promise<CulturalInsight> {
    this.logger.log(`Getting cultural insights for region: ${region}`);

    try {
      const prompt = `
      Provide comprehensive cultural business insights for ${region} in India:
      
      Business Context:
      ${JSON.stringify(businessContext, null, 2)}
      
      Provide insights in JSON format:
      {
        "region": "${region}",
        "language": "primary language",
        "communication": {
          "tone": "formal|friendly|professional",
          "formality": "high|medium|low",
          "greetings": ["greeting1", "greeting2"],
          "closing": ["closing1", "closing2"]
        },
        "businessPractices": {
          "meetingEtiquette": ["etiquette1", "etiquette2"],
          "negotiationStyle": "description",
          "decisionMaking": "hierarchical|collaborative|consensus",
          "relationshipBuilding": ["practice1", "practice2"]
        },
        "timing": {
          "businessHours": "9-6 standard",
          "holidays": ["holiday1", "holiday2"],
          "festivalConsiderations": ["consideration1", "consideration2"],
          "optimalTiming": ["timing1", "timing2"]
        },
        "payment": {
          "preferredMethods": ["method1", "method2"],
          "timingExpectations": "description",
          "followUpFrequency": "weekly|biweekly|monthly",
          "latePaymentHandling": "gentle|firm|formal"
        },
        "documentation": {
          "languagePreference": "english|regional|bilingual",
          "formatExpectations": ["format1", "format2"],
          "requiredFields": ["field1", "field2"],
          "culturalElements": ["element1", "element2"]
        }
      }
      
      Consider:
      1. Regional business culture and practices
      2. Language preferences and communication style
      3. Local customs and traditions
      4. Festival and holiday impact on business
      5. Payment expectations and follow-up norms
      6. Documentation preferences and requirements
      `;

      const response = await this.deepSeekService.generate({
        systemPrompt: "You are an expert in Indian regional business culture and practices across different states.",
        prompt,
        temperature: 0.4,
      });

      try {
        return JSON.parse(response.text);
      } catch (error) {
        this.logger.warn('Failed to parse cultural insights', response.text);
        return this.getDefaultCulturalInsights(region);
      }
    } catch (error) {
      this.logger.error('Cultural insights generation failed', error);
      return this.getDefaultCulturalInsights(region);
    }
  }

  /**
   * Get regional adaptations for invoice templates
   */
  async getRegionalAdaptations(state: string, industry: string): Promise<RegionalAdaptation> {
    this.logger.log(`Getting regional adaptations for state: ${state}, industry: ${industry}`);

    try {
      const prompt = `
      Provide regional business adaptations for ${state} in India:
      
      Industry: ${industry}
      
      Provide adaptations in JSON format:
      {
        "state": "${state}",
        "region": "north|south|east|west|central",
        "primaryLanguage": "language",
        "secondaryLanguages": ["lang1", "lang2"],
        "businessCulture": "description",
        "localCustoms": ["custom1", "custom2"],
        "adaptationRecommendations": {
          "language": ["adapt1", "adapt2"],
          "design": ["design1", "design2"],
          "timing": ["timing1", "timing2"],
          "communication": ["comm1", "comm2"]
        }
      }
      
      Consider:
      1. Local language preferences and usage
      2. Regional business customs and practices
      3. Cultural design preferences
      4. Communication style adaptations
      5. Timing and scheduling considerations
      `;

      const response = await this.deepSeekService.generate({
        systemPrompt: "You are an expert in Indian regional business practices and cultural adaptations.",
        prompt,
        temperature: 0.5,
      });

      try {
        return JSON.parse(response.text);
      } catch (error) {
        this.logger.warn('Failed to parse regional adaptations', response.text);
        return this.getDefaultRegionalAdaptation(state);
      }
    } catch (error) {
      this.logger.error('Regional adaptations generation failed', error);
      return this.getDefaultRegionalAdaptation(state);
    }
  }

  /**
   * Get festival calendar and business impact
   */
  async getFestivalCalendar(year?: number, states?: string[]): Promise<FestivalCalendar[]> {
    this.logger.log(`Getting festival calendar for year: ${year || new Date().getFullYear()}`);

    try {
      const currentYear = year || new Date().getFullYear();
      const stateList = states?.join(', ') || 'major Indian states';
      
      const prompt = `
      Provide festival calendar for ${currentYear} in India:
      
      States: ${stateList}
      
      Provide festivals in JSON format:
      {
        "festivals": [
          {
            "festival": "festival name",
            "date": "YYYY-MM-DD",
            "type": "religious|national|regional|cultural",
            "significance": "description",
            "businessImpact": "low|medium|high",
            "recommendations": ["rec1", "rec2"],
            "states": ["state1", "state2"]
          }
        ]
      }
      
      Include:
      1. Major national holidays
      2. Important religious festivals
      3. Regional festivals affecting business
      4. Cultural celebrations
      5. Business impact assessment
      `;

      const response = await this.deepSeekService.generate({
        systemPrompt: "You are an expert in Indian festivals and their business impact.",
        prompt,
        temperature: 0.3,
      });

      try {
        const parsed = JSON.parse(response.text);
        return parsed.festivals || [];
      } catch (error) {
        this.logger.warn('Failed to parse festival calendar', response.text);
        return this.getDefaultFestivalCalendar();
      }
    } catch (error) {
      this.logger.error('Festival calendar generation failed', error);
      return this.getDefaultFestivalCalendar();
    }
  }

  /**
   * Get communication recommendations for customer interactions
   */
  async getCommunicationRecommendations(customerProfile: any, context: string): Promise<{
    language: string;
    tone: string;
    style: string;
    timing: string;
    content: string[];
    avoid: string[];
    culturalConsiderations: string[];
  }> {
    this.logger.log(`Getting communication recommendations for context: ${context}`);

    try {
      const prompt = `
      Provide communication recommendations for customer interaction:
      
      Customer Profile:
      ${JSON.stringify(customerProfile, null, 2)}
      
      Context: ${context}
      
      Provide recommendations in JSON format:
      {
        "language": "english|hindi|regional|bilingual",
        "tone": "formal|friendly|professional|respectful",
        "style": "direct|indirect|relationship-focused",
        "timing": "immediate|business_hours|respectful_timing",
        "content": ["include1", "include2"],
        "avoid": ["avoid1", "avoid2"],
        "culturalConsiderations": ["consideration1", "consideration2"]
      }
      
      Consider:
      1. Customer's regional and cultural background
      2. Business relationship stage
      3. Communication context (invoice, reminder, follow-up)
      4. Regional language preferences
      5. Cultural sensitivities
      `;

      const response = await this.deepSeekService.generate({
        systemPrompt: "You are an expert in Indian business communication and customer relationship management.",
        prompt,
        temperature: 0.4,
      });

      try {
        return JSON.parse(response.text);
      } catch (error) {
        this.logger.warn('Failed to parse communication recommendations', response.text);
        return this.getDefaultCommunicationRecommendations();
      }
    } catch (error) {
      this.logger.error('Communication recommendations generation failed', error);
      return this.getDefaultCommunicationRecommendations();
    }
  }

  /**
   * Get payment behavior insights by region
   */
  async getPaymentBehaviorInsights(region: string, industry: string): Promise<{
    averagePaymentDays: number;
    commonPaymentMethods: string[];
    followUpPatterns: string[];
    latePaymentHandling: string;
    seasonalPatterns: string[];
    recommendations: string[];
  }> {
    this.logger.log(`Getting payment behavior insights for region: ${region}, industry: ${industry}`);

    try {
      const prompt = `
      Provide payment behavior insights for ${region} in India:
      
      Industry: ${industry}
      
      Provide insights in JSON format:
      {
        "averagePaymentDays": number,
        "commonPaymentMethods": ["method1", "method2"],
        "followUpPatterns": ["pattern1", "pattern2"],
        "latePaymentHandling": "gentle|firm|formal|legal",
        "seasonalPatterns": ["pattern1", "pattern2"],
        "recommendations": ["rec1", "rec2"]
      }
      
      Consider:
      1. Regional payment practices and norms
      2. Industry-specific payment patterns
      3. Seasonal business impacts
      4. Cultural attitudes toward payments
      5. Follow-up communication preferences
      `;

      const response = await this.deepSeekService.generate({
        systemPrompt: "You are an expert in Indian payment practices and regional business behaviors.",
        prompt,
        temperature: 0.4,
      });

      try {
        return JSON.parse(response.text);
      } catch (error) {
        this.logger.warn('Failed to parse payment behavior insights', response.text);
        return this.getDefaultPaymentBehaviorInsights();
      }
    } catch (error) {
      this.logger.error('Payment behavior insights generation failed', error);
      return this.getDefaultPaymentBehaviorInsights();
    }
  }

  /**
   * Get optimal timing for invoice delivery and follow-ups
   */
  async getOptimalTiming(customerData: any, invoiceType: string): Promise<{
    deliveryTiming: {
      bestDay: string;
      bestTime: string;
      avoidDays: string[];
      avoidTimes: string[];
    };
    followUpTiming: {
      firstFollowUp: string;
      subsequentFollowUps: string[];
      finalReminder: string;
    };
    seasonalConsiderations: string[];
    regionalFactors: string[];
  }> {
    this.logger.log(`Getting optimal timing for invoice type: ${invoiceType}`);

    try {
      const prompt = `
      Provide optimal timing recommendations for invoice delivery:
      
      Customer Data:
      ${JSON.stringify(customerData, null, 2)}
      
      Invoice Type: ${invoiceType}
      
      Provide recommendations in JSON format:
      {
        "deliveryTiming": {
          "bestDay": "day_of_week",
          "bestTime": "time_range",
          "avoidDays": ["day1", "day2"],
          "avoidTimes": ["time1", "time2"]
        },
        "followUpTiming": {
          "firstFollowUp": "days_after_delivery",
          "subsequentFollowUps": ["interval1", "interval2"],
          "finalReminder": "days_before_due"
        },
        "seasonalConsiderations": ["consideration1", "consideration2"],
        "regionalFactors": ["factor1", "factor2"]
      }
      
      Consider:
      1. Customer's regional location and business practices
      2. Industry-specific payment patterns
      3. Regional holidays and festivals
      4. Business hours and operational patterns
      5. Cultural preferences for communication timing
      `;

      const response = await this.deepSeekService.generate({
        systemPrompt: "You are an expert in Indian business timing and operational patterns.",
        prompt,
        temperature: 0.3,
      });

      try {
        return JSON.parse(response.text);
      } catch (error) {
        this.logger.warn('Failed to parse optimal timing recommendations', response.text);
        return this.getDefaultOptimalTiming();
      }
    } catch (error) {
      this.logger.error('Optimal timing generation failed', error);
      return this.getDefaultOptimalTiming();
    }
  }

  /**
   * Private helper methods for default values
   */

  private getDefaultCulturalInsights(region: string): CulturalInsight {
    return {
      region,
      language: 'English',
      communication: {
        tone: 'professional',
        formality: 'medium',
        greetings: ['Dear Sir/Madam', 'Respected'],
        closing: ['Sincerely', 'Best regards'],
      },
      businessPractices: {
        meetingEtiquette: ['Punctuality appreciated', 'Formal address'],
        negotiationStyle: 'Relationship-focused',
        decisionMaking: 'hierarchical',
        relationshipBuilding: ['Build trust first', 'Personal connections'],
      },
      timing: {
        businessHours: '9:00 AM - 6:00 PM',
        holidays: ['National holidays', 'Regional festivals'],
        festivalConsiderations: ['Avoid major festival periods'],
        optimalTiming: ['Business hours', 'Mid-week'],
      },
      payment: {
        preferredMethods: ['Bank transfer', 'Cheque', 'UPI'],
        timingExpectations: '30-45 days standard',
        followUpFrequency: 'weekly',
        latePaymentHandling: 'gentle initially',
      },
      documentation: {
        languagePreference: 'english',
        formatExpectations: ['Professional format', 'Clear details'],
        requiredFields: ['GSTIN', 'Contact details'],
        culturalElements: ['Respectful language'],
      },
    };
  }

  private getDefaultRegionalAdaptation(state: string): RegionalAdaptation {
    return {
      state,
      region: 'north',
      primaryLanguage: 'Hindi',
      secondaryLanguages: ['English', 'Punjabi'],
      businessCulture: 'Traditional with modern influences',
      localCustoms: ['Respect for elders', 'Relationship building'],
      adaptationRecommendations: {
        language: ['Include Hindi greetings', 'Bilingual options'],
        design: ['Traditional colors', 'Modern layout'],
        timing: ['Avoid festival periods', 'Respect business hours'],
        communication: ['Formal initially', 'Build relationships'],
      },
    };
  }

  private getDefaultFestivalCalendar(): FestivalCalendar[] {
    const currentYear = new Date().getFullYear();
    return [
      {
        festival: 'Republic Day',
        date: `${currentYear}-01-26`,
        type: 'national',
        significance: 'National holiday',
        businessImpact: 'high',
        recommendations: ['Send invoices in advance', 'Avoid deliveries'],
        states: ['All states'],
      },
      {
        festival: 'Independence Day',
        date: `${currentYear}-08-15`,
        type: 'national',
        significance: 'National holiday',
        businessImpact: 'high',
        recommendations: ['Plan communications around this day'],
        states: ['All states'],
      },
      {
        festival: 'Diwali',
        date: `${currentYear}-11-01`, // Approximate
        type: 'religious',
        significance: 'Festival of lights',
        businessImpact: 'medium',
        recommendations: ['Advance planning', 'Respect celebrations'],
        states: ['Most states'],
      },
    ];
  }

  private getDefaultCommunicationRecommendations() {
    return {
      language: 'english',
      tone: 'professional',
      style: 'relationship-focused',
      timing: 'business_hours',
      content: ['Clear payment terms', 'Professional greeting'],
      avoid: ['Overly casual language', 'Assumptions about knowledge'],
      culturalConsiderations: ['Respectful address', 'Patience in responses'],
    };
  }

  private getDefaultPaymentBehaviorInsights() {
    return {
      averagePaymentDays: 35,
      commonPaymentMethods: ['Bank Transfer', 'UPI', 'Cheque'],
      followUpPatterns: ['Weekly reminders', 'Polite escalation'],
      latePaymentHandling: 'gentle',
      seasonalPatterns: ['Year-end delays', 'Festival impacts'],
      recommendations: ['Clear terms', 'Multiple payment options'],
    };
  }

  private getDefaultOptimalTiming() {
    return {
      deliveryTiming: {
        bestDay: 'Tuesday',
        bestTime: '10:00 AM - 12:00 PM',
        avoidDays: ['Monday', 'Friday'],
        avoidTimes: ['Early morning', 'Late evening'],
      },
      followUpTiming: {
        firstFollowUp: '7 days',
        subsequentFollowUps: ['Weekly', 'Bi-weekly'],
        finalReminder: '3 days before due',
      },
      seasonalConsiderations: ['Avoid festival seasons', 'Year-end rush'],
      regionalFactors: ['Regional holidays', 'Local business practices'],
    };
  }
}
