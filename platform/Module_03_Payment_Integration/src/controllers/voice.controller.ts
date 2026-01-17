import { Controller, Get, Post, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { VoiceCollectionService } from '../services/voice-collection.service';
import { VoiceAuthenticationService } from '../services/voice-authentication.service';
import { VoiceLanguageService } from '../services/voice-language.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';

@Controller('payment/voice')
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);
  
  constructor(
    private readonly voiceCollectionService: VoiceCollectionService,
    private readonly voiceAuthenticationService: VoiceAuthenticationService,
    private readonly voiceLanguageService: VoiceLanguageService,
  ) {}

  @Get('languages')
  @UseGuards(JwtAuthGuard)
  async getSupportedLanguages(
    @Query('activeOnly') activeOnly: boolean = true,
  ) {
    return await this.voiceLanguageService.getAllLanguages(activeOnly);
  }

  @Post('reminder')
  @UseGuards(JwtAuthGuard)
  async initiatePaymentReminder(
    @Body() reminderData: {
      customerId: string;
      organizationId: string;
      invoiceId: string;
      languageCode: string;
    },
  ) {
    return await this.voiceCollectionService.initiatePaymentReminder(
      reminderData.customerId,
      reminderData.organizationId,
      reminderData.invoiceId,
      reminderData.languageCode,
    );
  }

  @Post('inbound')
  async processInboundCall(
    @Body() callData: {
      phoneNumber: string;
      languageCode: string;
    },
  ) {
    return await this.voiceCollectionService.processInboundPaymentCall(
      callData.phoneNumber,
      callData.languageCode,
    );
  }

  @Post('enroll-biometric')
  @UseGuards(JwtAuthGuard)
  async enrollVoiceBiometric(
    @Body() enrollmentData: {
      customerId: string;
      organizationId: string;
      voiceData: Buffer;
    },
  ) {
    return await this.voiceAuthenticationService.enrollVoiceBiometric(
      enrollmentData.customerId,
      enrollmentData.organizationId,
      enrollmentData.voiceData,
    );
  }

  @Post('verify-biometric')
  async verifyVoiceBiometric(
    @Body() verificationData: {
      customerId: string;
      organizationId: string;
      voiceData: Buffer;
    },
  ) {
    return await this.voiceAuthenticationService.verifyVoiceBiometric(
      verificationData.customerId,
      verificationData.organizationId,
      verificationData.voiceData,
    );
  }

  @Post('session/:sessionId/payment')
  async updatePaymentInformation(
    @Param('sessionId') sessionId: string,
    @Body() paymentDetails: {
      invoiceId: string;
      amount: number;
      paymentMethod: string;
      transactionId?: string;
      status: string;
    },
  ) {
    return await this.voiceCollectionService.updatePaymentInformation(
      sessionId,
      paymentDetails,
    );
  }

  @Post('session/:sessionId/complete')
  async completeInteraction(
    @Param('sessionId') sessionId: string,
    @Body() completionData: {
      status: string;
      metrics?: {
        speechRecognitionAccuracy?: number;
        userSatisfactionScore?: number;
        completionRate?: number;
      };
    },
  ) {
    return await this.voiceCollectionService.completeInteraction(
      sessionId,
      completionData.status,
      completionData.metrics,
    );
  }

  @Get('session/:sessionId')
  @UseGuards(JwtAuthGuard)
  async getInteractionDetails(
    @Param('sessionId') sessionId: string,
  ) {
    return await this.voiceCollectionService.getInteractionDetails(sessionId);
  }

  // Webhook endpoints for telephony provider callbacks
  @Post('webhook/call-status')
  async handleCallStatusWebhook(
    @Body() webhookData: any,
  ) {
    this.logger.log(`Received call status webhook: ${JSON.stringify(webhookData)}`);
    // Process webhook data and update interaction status
    return { success: true };
  }

  @Post('webhook/speech-input')
  async handleSpeechInputWebhook(
    @Body() webhookData: any,
  ) {
    this.logger.log(`Received speech input webhook: ${JSON.stringify(webhookData)}`);
    // Process speech input and determine next action
    return { success: true };
  }
}
