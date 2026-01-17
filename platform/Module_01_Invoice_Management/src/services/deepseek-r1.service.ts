import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AxiosResponse } from 'axios';

export interface DeepSeekRequest {
  systemPrompt?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface DeepSeekResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

@Injectable()
export class DeepSeekR1Service {
  private readonly logger = new Logger(DeepSeekR1Service.name);
  private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly defaultModel = 'deepseek/deepseek-r1:free';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate AI response using DeepSeek R1
   */
  async generate(request: DeepSeekRequest): Promise<DeepSeekResponse> {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY') || 
                   this.configService.get<string>('DEEPSEEK_API_KEY');

    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const payload = {
      model: request.model || this.defaultModel,
      messages: [
        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
        { role: 'user', content: request.prompt }
      ],
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 2000,
      response_format: { type: 'text' }
    };

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sme-platform.com',
      'X-Title': 'SME Invoice Management Platform'
    };

    try {
      const response = await this.httpService.axiosRef.post(this.apiUrl, payload, { headers });
      
      const choice = response.data.choices[0];
      const usage = response.data.usage;

      return {
        text: choice.message.content,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        },
        model: response.data.model,
        finishReason: choice.finish_reason
      };
    } catch (error) {
      this.logger.error('DeepSeek API call failed', error.response?.data || error.message);
      throw new Error(`AI service unavailable: ${error.message}`);
    }
  }

  /**
   * Analyze invoice for quality assurance
   */
  async analyzeInvoiceQuality(invoiceData: any): Promise<{
    score: number;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      suggestion: string;
    }>;
    improvements: string[];
  }> {
    const prompt = `
    Analyze this invoice for quality, compliance, and accuracy issues:
    
    Invoice Data:
    ${JSON.stringify(invoiceData, null, 2)}
    
    Provide analysis in JSON format:
    {
      "score": 0-100,
      "issues": [
        {
          "type": "category",
          "severity": "low|medium|high",
          "description": "what's wrong",
          "suggestion": "how to fix"
        }
      ],
      "improvements": ["suggestion1", "suggestion2"]
    }
    
    Focus on:
    1. Mathematical accuracy
    2. GST compliance (India)
    3. Missing required fields
    4. Format consistency
    5. Professional presentation
    `;

    const response = await this.generate({
      systemPrompt: "You are an expert invoice analyst specializing in Indian GST compliance and business documentation standards.",
      prompt,
      temperature: 0.3
    });

    try {
      return JSON.parse(response.text);
    } catch (error) {
      this.logger.warn('Failed to parse AI response as JSON', response.text);
      return {
        score: 75,
        issues: [],
        improvements: ['Review invoice manually for compliance']
      };
    }
  }

  /**
   * Generate invoice template suggestions
   */
  async generateTemplateSuggestions(businessType: string, industry: string): Promise<{
    design: string[];
    fields: string[];
    compliance: string[];
    optimizations: string[];
  }> {
    const prompt = `
    Generate invoice template recommendations for:
    Business Type: ${businessType}
    Industry: ${industry}
    
    Provide suggestions in JSON format:
    {
      "design": ["design tip1", "design tip2"],
      "fields": ["field1", "field2"],
      "compliance": ["compliance1", "compliance2"],
      "optimizations": ["optimization1", "optimization2"]
    }
    
    Consider:
    1. Indian business practices
    2. GST requirements
    3. Customer experience
    4. Professional appearance
    5. Payment clarity
    `;

    const response = await this.generate({
      systemPrompt: "You are an expert in invoice design and Indian business documentation standards.",
      prompt,
      temperature: 0.5
    });

    try {
      return JSON.parse(response.text);
    } catch (error) {
      this.logger.warn('Failed to parse AI template suggestions', response.text);
      return {
        design: ['Use clean, professional layout'],
        fields: ['Include GSTIN', 'Add HSN/SAC codes'],
        compliance: ['Ensure GST compliance', 'Include tax breakdown'],
        optimizations: ['Add payment QR code', 'Include due date prominently']
      };
    }
  }

  /**
   * Analyze customer payment behavior
   */
  async analyzePaymentBehavior(customerData: any, invoiceHistory: any[]): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    predictedPaymentDays: number;
    recommendations: string[];
    communicationStyle: string;
  }> {
    const prompt = `
    Analyze customer payment behavior and provide recommendations:
    
    Customer Data:
    ${JSON.stringify(customerData, null, 2)}
    
    Invoice History:
    ${JSON.stringify(invoiceHistory, null, 2)}
    
    Provide analysis in JSON format:
    {
      "riskLevel": "low|medium|high",
      "predictedPaymentDays": number,
      "recommendations": ["rec1", "rec2"],
      "communicationStyle": "formal|friendly|firm"
    }
    
    Consider:
    1. Payment patterns
    2. Business relationship
    3. Indian business context
    4. Economic factors
    5. Communication effectiveness
    `;

    const response = await this.generate({
      systemPrompt: "You are an expert in credit analysis and customer relationship management in the Indian business context.",
      prompt,
      temperature: 0.4
    });

    try {
      return JSON.parse(response.text);
    } catch (error) {
      this.logger.warn('Failed to parse AI payment analysis', response.text);
      return {
        riskLevel: 'medium',
        predictedPaymentDays: 30,
        recommendations: ['Monitor payment patterns', 'Send timely reminders'],
        communicationStyle: 'friendly'
      };
    }
  }

  /**
   * Generate invoice optimization suggestions
   */
  async generateOptimizationSuggestions(invoiceMetrics: any): Promise<{
    priority: string[];
    quickWins: string[];
    longTerm: string[];
    expectedImpact: string;
  }> {
    const prompt = `
    Analyze invoice performance metrics and provide optimization suggestions:
    
    Invoice Metrics:
    ${JSON.stringify(invoiceMetrics, null, 2)}
    
    Provide suggestions in JSON format:
    {
      "priority": ["priority1", "priority2"],
      "quickWins": ["quick1", "quick2"],
      "longTerm": ["long1", "long2"],
      "expectedImpact": "description of expected improvements"
    }
    
    Consider:
    1. Payment speed improvement
    2. Error reduction
    3. Customer satisfaction
    4. Operational efficiency
    5. Cost optimization
    `;

    const response = await this.generate({
      systemPrompt: "You are an expert in business process optimization and invoice management.",
      prompt,
      temperature: 0.5
    });

    try {
      return JSON.parse(response.text);
    } catch (error) {
      this.logger.warn('Failed to parse AI optimization suggestions', response.text);
      return {
        priority: ['Reduce payment delays', 'Improve invoice accuracy'],
        quickWins: ['Add payment QR codes', 'Automate reminders'],
        longTerm: ['Implement AI-powered validation', 'Optimize delivery channels'],
        expectedImpact: '15-25% improvement in payment speed'
      };
    }
  }

  /**
   * Cultural intelligence for Indian business context
   */
  async getCulturalInsights(context: string, region?: string): Promise<{
    communication: string[];
    timing: string[];
    etiquette: string[];
    considerations: string[];
  }> {
    const prompt = `
    Provide cultural business insights for Indian context:
    
    Context: ${context}
    Region: ${region || 'General'}
    
    Provide insights in JSON format:
    {
      "communication": ["comm1", "comm2"],
      "timing": ["timing1", "timing2"],
      "etiquette": ["etiquette1", "etiquette2"],
      "considerations": ["consideration1", "consideration2"]
    }
    
    Consider:
    1. Regional business practices
    2. Communication preferences
    3. Festival and holiday considerations
    4. Payment timing expectations
    5. Relationship building
    `;

    const response = await this.generate({
      systemPrompt: "You are an expert in Indian business culture and regional practices across different states.",
      prompt,
      temperature: 0.6
    });

    try {
      return JSON.parse(response.text);
    } catch (error) {
      this.logger.warn('Failed to parse AI cultural insights', response.text);
      return {
        communication: ['Use respectful language', 'Maintain formal tone initially'],
        timing: ['Avoid major festival periods', 'Consider business hours'],
        etiquette: ['Address by proper titles', 'Build relationship first'],
        considerations: ['Regional language preferences', 'Local business customs']
      };
    }
  }
}
