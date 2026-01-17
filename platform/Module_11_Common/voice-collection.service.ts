import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoiceInteraction } from '../entities/voice-interaction.entity';
import { VoiceLanguage } from '../entities/voice-language.entity';
import { VoiceAuthenticationService } from './voice-authentication.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VoiceCollectionService {
  private readonly logger = new Logger(VoiceCollectionService.name);
  
  constructor(
    @InjectRepository(VoiceInteraction)
    private voiceInteractionRepository: Repository<VoiceInteraction>,
    @InjectRepository(VoiceLanguage)
    private voiceLanguageRepository: Repository<VoiceLanguage>,
    private voiceAuthenticationService: VoiceAuthenticationService,
    private configService: ConfigService,
  ) {}

  /**
   * Initiates a payment reminder call to a customer
   * @param customerId The customer ID
   * @param organizationId The organization ID
   * @param invoiceId The invoice ID
   * @param languageCode The preferred language code
   * @returns The interaction result
   */
  async initiatePaymentReminder(
    customerId: string,
    organizationId: string,
    invoiceId: string,
    languageCode: string,
  ): Promise<{ success: boolean; message: string; sessionId?: string }> {
    try {
      this.logger.log(`Initiating payment reminder for customer ${customerId}, invoice ${invoiceId}`);
      
      // Verify language support
      const language = await this.voiceLanguageRepository.findOne({
        where: { code: languageCode, active: true },
      });
      
      if (!language) {
        return {
          success: false,
          message: `Language ${languageCode} is not supported or inactive`,
        };
      }
      
      // Create a new voice interaction session
      const sessionId = this.generateSessionId();
      
      const interaction = this.voiceInteractionRepository.create({
        customerId,
        organizationId,
        sessionId,
        interactionType: 'payment_reminder',
        languageCode,
        startTime: new Date(),
        endTime: null,
        duration: 0,
        status: 'initiated',
        interactionFlow: [
          {
            step: 'initiation',
            intent: 'payment_reminder',
            confidence: 1.0,
            timestamp: new Date(),
          },
        ],
        paymentDetails: {
          invoiceId,
          amount: 0, // Will be populated during the call
          paymentMethod: null,
          transactionId: null,
          status: 'pending',
        },
        metrics: {
          speechRecognitionAccuracy: 0,
          userSatisfactionScore: 0,
          completionRate: 0,
        },
      });
      
      await this.voiceInteractionRepository.save(interaction);
      
      // In a real implementation, this would initiate an outbound call
      // through a telephony provider like Twilio or Exotel
      const callResult = await this.simulateOutboundCall(
        customerId,
        sessionId,
        languageCode,
        'payment_reminder'
      );
      
      if (!callResult.success) {
        // Update interaction status
        interaction.status = 'failed';
        interaction.endTime = new Date();
        interaction.duration = 0;
        interaction.interactionFlow.push({
          step: 'call_initiation',
          intent: 'failure',
          confidence: 1.0,
          timestamp: new Date(),
        });
        
        await this.voiceInteractionRepository.save(interaction);
        
        return {
          success: false,
          message: `Failed to initiate call: ${callResult.message}`,
        };
      }
      
      return {
        success: true,
        message: 'Payment reminder call initiated successfully',
        sessionId,
      };
    } catch (error) {
      this.logger.error(`Error initiating payment reminder: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error initiating payment reminder: ${error.message}`,
      };
    }
  }
  
  /**
   * Processes an inbound payment call from a customer
   * @param phoneNumber The customer's phone number
   * @param languageCode The detected or selected language code
   * @returns The interaction result
   */
  async processInboundPaymentCall(
    phoneNumber: string,
    languageCode: string,
  ): Promise<{ success: boolean; message: string; sessionId?: string }> {
    try {
      this.logger.log(`Processing inbound payment call from ${phoneNumber}`);
      
      // In a real implementation, this would look up the customer by phone number
      // For now, we'll simulate with a dummy customer ID
      const customerId = `customer_${phoneNumber.replace(/\D/g, '')}`;
      const organizationId = 'default_org'; // This would be determined by the inbound number
      
      // Verify language support
      const language = await this.voiceLanguageRepository.findOne({
        where: { code: languageCode, active: true },
      });
      
      if (!language) {
        return {
          success: false,
          message: `Language ${languageCode} is not supported or inactive`,
        };
      }
      
      // Create a new voice interaction session
      const sessionId = this.generateSessionId();
      
      const interaction = this.voiceInteractionRepository.create({
        customerId,
        organizationId,
        sessionId,
        interactionType: 'inbound_payment',
        languageCode,
        startTime: new Date(),
        endTime: null,
        duration: 0,
        status: 'in_progress',
        interactionFlow: [
          {
            step: 'call_received',
            intent: 'payment',
            confidence: 0.9,
            timestamp: new Date(),
          },
        ],
        paymentDetails: {
          invoiceId: null, // Will be selected during the call
          amount: 0,
          paymentMethod: null,
          transactionId: null,
          status: 'pending',
        },
        metrics: {
          speechRecognitionAccuracy: 0,
          userSatisfactionScore: 0,
          completionRate: 0,
        },
      });
      
      await this.voiceInteractionRepository.save(interaction);
      
      // In a real implementation, this would handle the inbound call flow
      // through a telephony provider like Twilio or Exotel
      
      return {
        success: true,
        message: 'Inbound payment call processing initiated',
        sessionId,
      };
    } catch (error) {
      this.logger.error(`Error processing inbound payment call: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error processing inbound payment call: ${error.message}`,
      };
    }
  }
  
  /**
   * Updates a voice interaction with payment information
   * @param sessionId The session ID
   * @param paymentDetails The payment details
   * @returns The update result
   */
  async updatePaymentInformation(
    sessionId: string,
    paymentDetails: {
      invoiceId: string;
      amount: number;
      paymentMethod: string;
      transactionId?: string;
      status: string;
    },
  ): Promise<{ success: boolean; message: string }> {
    try {
      const interaction = await this.voiceInteractionRepository.findOne({
        where: { sessionId },
      });
      
      if (!interaction) {
        return {
          success: false,
          message: 'Voice interaction session not found',
        };
      }
      
      // Update payment details
      interaction.paymentDetails = {
        ...interaction.paymentDetails,
        ...paymentDetails,
      };
      
      // Add to interaction flow
      interaction.interactionFlow.push({
        step: 'payment_update',
        intent: 'process_payment',
        confidence: 1.0,
        timestamp: new Date(),
      });
      
      await this.voiceInteractionRepository.save(interaction);
      
      return {
        success: true,
        message: 'Payment information updated successfully',
      };
    } catch (error) {
      this.logger.error(`Error updating payment information: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error updating payment information: ${error.message}`,
      };
    }
  }
  
  /**
   * Completes a voice interaction session
   * @param sessionId The session ID
   * @param status The completion status
   * @param metrics Optional metrics about the interaction
   * @returns The completion result
   */
  async completeInteraction(
    sessionId: string,
    status: string,
    metrics?: {
      speechRecognitionAccuracy?: number;
      userSatisfactionScore?: number;
      completionRate?: number;
    },
  ): Promise<{ success: boolean; message: string }> {
    try {
      const interaction = await this.voiceInteractionRepository.findOne({
        where: { sessionId },
      });
      
      if (!interaction) {
        return {
          success: false,
          message: 'Voice interaction session not found',
        };
      }
      
      // Update status and end time
      interaction.status = status;
      interaction.endTime = new Date();
      
      // Calculate duration
      const durationMs = interaction.endTime.getTime() - interaction.startTime.getTime();
      interaction.duration = Math.round(durationMs / 1000); // Convert to seconds
      
      // Update metrics if provided
      if (metrics) {
        interaction.metrics = {
          ...interaction.metrics,
          ...metrics,
        };
      }
      
      // Add to interaction flow
      interaction.interactionFlow.push({
        step: 'completion',
        intent: status,
        confidence: 1.0,
        timestamp: new Date(),
      });
      
      await this.voiceInteractionRepository.save(interaction);
      
      return {
        success: true,
        message: 'Voice interaction completed successfully',
      };
    } catch (error) {
      this.logger.error(`Error completing interaction: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error completing interaction: ${error.message}`,
      };
    }
  }
  
  /**
   * Retrieves voice interaction details
   * @param sessionId The session ID
   * @returns The interaction details
   */
  async getInteractionDetails(
    sessionId: string,
  ): Promise<{ success: boolean; message: string; interaction?: VoiceInteraction }> {
    try {
      const interaction = await this.voiceInteractionRepository.findOne({
        where: { sessionId },
      });
      
      if (!interaction) {
        return {
          success: false,
          message: 'Voice interaction session not found',
        };
      }
      
      return {
        success: true,
        message: 'Voice interaction retrieved successfully',
        interaction,
      };
    } catch (error) {
      this.logger.error(`Error retrieving interaction: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error retrieving interaction: ${error.message}`,
      };
    }
  }
  
  /**
   * Generates a unique session ID
   * @returns The generated session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `voice_${timestamp}_${randomStr}`;
  }
  
  /**
   * Simulates an outbound call (for development purposes)
   * @param customerId The customer ID
   * @param sessionId The session ID
   * @param languageCode The language code
   * @param callType The type of call
   * @returns The simulated call result
   */
  private async simulateOutboundCall(
    customerId: string,
    sessionId: string,
    languageCode: string,
    callType: string,
  ): Promise<{ success: boolean; message: string }> {
    // This is a simulation for development purposes
    // In production, this would integrate with a telephony provider API
    
    this.logger.log(`Simulating ${callType} call to customer ${customerId} in ${languageCode}`);
    
    // Simulate a 90% success rate
    const isSuccessful = Math.random() < 0.9;
    
    if (isSuccessful) {
      return {
        success: true,
        message: 'Call initiated successfully',
      };
    } else {
      return {
        success: false,
        message: 'Customer phone unreachable or busy',
      };
    }
  }
}
