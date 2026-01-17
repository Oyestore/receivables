import { Test, TestingModule } from '@nestjs/testing';
import { VoiceAuthenticationService } from '../services/voice-authentication.service';
import { VoiceCollectionService } from '../services/voice-collection.service';
import { VoiceLanguageService } from '../services/voice-language.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VoiceBiometric } from '../entities/voice-biometric.entity';
import { VoiceInteraction } from '../entities/voice-interaction.entity';
import { VoiceLanguage } from '../entities/voice-language.entity';
import { ConfigService } from '@nestjs/config';

describe('Voice Module Services', () => {
  let voiceAuthService: VoiceAuthenticationService;
  let voiceCollectionService: VoiceCollectionService;
  let voiceLanguageService: VoiceLanguageService;

  const mockVoiceBiometricRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockVoiceInteractionRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockVoiceLanguageRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'VOICE_ENCRYPTION_KEY') {
        return '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceAuthenticationService,
        VoiceCollectionService,
        VoiceLanguageService,
        {
          provide: getRepositoryToken(VoiceBiometric),
          useValue: mockVoiceBiometricRepository,
        },
        {
          provide: getRepositoryToken(VoiceInteraction),
          useValue: mockVoiceInteractionRepository,
        },
        {
          provide: getRepositoryToken(VoiceLanguage),
          useValue: mockVoiceLanguageRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    voiceAuthService = module.get<VoiceAuthenticationService>(VoiceAuthenticationService);
    voiceCollectionService = module.get<VoiceCollectionService>(VoiceCollectionService);
    voiceLanguageService = module.get<VoiceLanguageService>(VoiceLanguageService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('VoiceAuthenticationService', () => {
    it('should be defined', () => {
      expect(voiceAuthService).toBeDefined();
    });

    describe('enrollVoiceBiometric', () => {
      it('should create a new voice biometric enrollment', async () => {
        // Mock repository responses
        mockVoiceBiometricRepository.findOne.mockResolvedValue(null);
        mockVoiceBiometricRepository.create.mockReturnValue({
          id: 'test-biometric-id',
          customerId: 'test-customer',
          organizationId: 'test-org',
          enrollmentStatus: 'completed',
        });
        mockVoiceBiometricRepository.save.mockResolvedValue({
          id: 'test-biometric-id',
          customerId: 'test-customer',
          organizationId: 'test-org',
          enrollmentStatus: 'completed',
        });

        // Call the service method
        const result = await voiceAuthService.enrollVoiceBiometric(
          'test-customer',
          'test-org',
          Buffer.from('test-voice-data'),
        );

        // Verify the result
        expect(result.success).toBe(true);
        expect(result.biometricId).toBe('test-biometric-id');
        expect(mockVoiceBiometricRepository.create).toHaveBeenCalled();
        expect(mockVoiceBiometricRepository.save).toHaveBeenCalled();
      });

      it('should update an existing voice biometric enrollment', async () => {
        // Mock repository responses
        mockVoiceBiometricRepository.findOne.mockResolvedValue({
          id: 'test-biometric-id',
          customerId: 'test-customer',
          organizationId: 'test-org',
          enrollmentStatus: 'pending',
          enrollmentHistory: [],
        });
        mockVoiceBiometricRepository.save.mockResolvedValue({
          id: 'test-biometric-id',
          customerId: 'test-customer',
          organizationId: 'test-org',
          enrollmentStatus: 'completed',
        });

        // Call the service method
        const result = await voiceAuthService.enrollVoiceBiometric(
          'test-customer',
          'test-org',
          Buffer.from('test-voice-data'),
        );

        // Verify the result
        expect(result.success).toBe(true);
        expect(result.biometricId).toBe('test-biometric-id');
        expect(mockVoiceBiometricRepository.save).toHaveBeenCalled();
      });
    });

    describe('verifyVoiceBiometric', () => {
      it('should verify a voice biometric successfully', async () => {
        // Mock repository responses
        mockVoiceBiometricRepository.findOne.mockResolvedValue({
          id: 'test-biometric-id',
          customerId: 'test-customer',
          organizationId: 'test-org',
          enrollmentStatus: 'completed',
          voiceprintTemplate: Buffer.concat([
            Buffer.alloc(16), // IV
            Buffer.from('encrypted-template'),
          ]),
          enrollmentHistory: [],
          securitySettings: {
            confidenceThreshold: 0.7,
            maxAttempts: 3,
            lockoutPeriod: 30,
          },
        });
        mockVoiceBiometricRepository.save.mockResolvedValue({});

        // Call the service method
        const result = await voiceAuthService.verifyVoiceBiometric(
          'test-customer',
          'test-org',
          Buffer.from('test-voice-data'),
        );

        // Verify the result
        expect(mockVoiceBiometricRepository.findOne).toHaveBeenCalled();
        expect(mockVoiceBiometricRepository.save).toHaveBeenCalled();
      });

      it('should handle non-existent biometric enrollment', async () => {
        // Mock repository responses
        mockVoiceBiometricRepository.findOne.mockResolvedValue(null);

        // Call the service method
        const result = await voiceAuthService.verifyVoiceBiometric(
          'test-customer',
          'test-org',
          Buffer.from('test-voice-data'),
        );

        // Verify the result
        expect(result.success).toBe(false);
        expect(result.message).toContain('No voice biometric enrollment found');
      });
    });
  });

  describe('VoiceCollectionService', () => {
    it('should be defined', () => {
      expect(voiceCollectionService).toBeDefined();
    });

    describe('initiatePaymentReminder', () => {
      it('should initiate a payment reminder call', async () => {
        // Mock repository responses
        mockVoiceLanguageRepository.findOne.mockResolvedValue({
          code: 'en-IN',
          name: 'English (India)',
          active: true,
        });
        mockVoiceInteractionRepository.create.mockReturnValue({
          customerId: 'test-customer',
          organizationId: 'test-org',
          sessionId: 'test-session',
          interactionType: 'payment_reminder',
          languageCode: 'en-IN',
          status: 'initiated',
          interactionFlow: [],
          paymentDetails: {},
        });
        mockVoiceInteractionRepository.save.mockResolvedValue({});

        // Call the service method
        const result = await voiceCollectionService.initiatePaymentReminder(
          'test-customer',
          'test-org',
          'test-invoice',
          'en-IN',
        );

        // Verify the result
        expect(result.success).toBe(true);
        expect(result.sessionId).toBeDefined();
        expect(mockVoiceInteractionRepository.create).toHaveBeenCalled();
        expect(mockVoiceInteractionRepository.save).toHaveBeenCalled();
      });

      it('should handle unsupported language', async () => {
        // Mock repository responses
        mockVoiceLanguageRepository.findOne.mockResolvedValue(null);

        // Call the service method
        const result = await voiceCollectionService.initiatePaymentReminder(
          'test-customer',
          'test-org',
          'test-invoice',
          'unsupported-language',
        );

        // Verify the result
        expect(result.success).toBe(false);
        expect(result.message).toContain('not supported');
      });
    });

    describe('processInboundPaymentCall', () => {
      it('should process an inbound payment call', async () => {
        // Mock repository responses
        mockVoiceLanguageRepository.findOne.mockResolvedValue({
          code: 'en-IN',
          name: 'English (India)',
          active: true,
        });
        mockVoiceInteractionRepository.create.mockReturnValue({
          customerId: 'customer_1234567890',
          organizationId: 'default_org',
          sessionId: 'test-session',
          interactionType: 'inbound_payment',
          languageCode: 'en-IN',
          status: 'in_progress',
          interactionFlow: [],
          paymentDetails: {},
        });
        mockVoiceInteractionRepository.save.mockResolvedValue({});

        // Call the service method
        const result = await voiceCollectionService.processInboundPaymentCall(
          '+1234567890',
          'en-IN',
        );

        // Verify the result
        expect(result.success).toBe(true);
        expect(result.sessionId).toBeDefined();
        expect(mockVoiceInteractionRepository.create).toHaveBeenCalled();
        expect(mockVoiceInteractionRepository.save).toHaveBeenCalled();
      });
    });

    describe('updatePaymentInformation', () => {
      it('should update payment information for a session', async () => {
        // Mock repository responses
        mockVoiceInteractionRepository.findOne.mockResolvedValue({
          sessionId: 'test-session',
          paymentDetails: {},
          interactionFlow: [],
        });
        mockVoiceInteractionRepository.save.mockResolvedValue({});

        // Call the service method
        const result = await voiceCollectionService.updatePaymentInformation(
          'test-session',
          {
            invoiceId: 'test-invoice',
            amount: 100,
            paymentMethod: 'credit_card',
            status: 'completed',
          },
        );

        // Verify the result
        expect(result.success).toBe(true);
        expect(mockVoiceInteractionRepository.save).toHaveBeenCalled();
      });

      it('should handle non-existent session', async () => {
        // Mock repository responses
        mockVoiceInteractionRepository.findOne.mockResolvedValue(null);

        // Call the service method
        const result = await voiceCollectionService.updatePaymentInformation(
          'non-existent-session',
          {
            invoiceId: 'test-invoice',
            amount: 100,
            paymentMethod: 'credit_card',
            status: 'completed',
          },
        );

        // Verify the result
        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
      });
    });
  });

  describe('VoiceLanguageService', () => {
    it('should be defined', () => {
      expect(voiceLanguageService).toBeDefined();
    });

    describe('getAllLanguages', () => {
      it('should return all active languages', async () => {
        // Mock repository responses
        mockVoiceLanguageRepository.find.mockResolvedValue([
          { code: 'en-IN', name: 'English (India)', active: true },
          { code: 'hi-IN', name: 'Hindi', active: true },
        ]);

        // Call the service method
        const result = await voiceLanguageService.getAllLanguages(true);

        // Verify the result
        expect(result.length).toBe(2);
        expect(mockVoiceLanguageRepository.find).toHaveBeenCalledWith({
          where: { active: true },
        });
      });
    });

    describe('getLanguageByCode', () => {
      it('should return a language by code', async () => {
        // Mock repository responses
        mockVoiceLanguageRepository.findOne.mockResolvedValue({
          code: 'en-IN',
          name: 'English (India)',
          active: true,
        });

        // Call the service method
        const result = await voiceLanguageService.getLanguageByCode('en-IN');

        // Verify the result
        expect(result).toBeDefined();
        expect(result.code).toBe('en-IN');
        expect(mockVoiceLanguageRepository.findOne).toHaveBeenCalledWith({
          where: { code: 'en-IN' },
        });
      });
    });
  });
});
