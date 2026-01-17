import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SMSService } from '../services/sms.service';
import { SMSMessage, SMSResult } from '../services/sms.service';

describe('SMSService', () => {
  let service: SMSService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [],
          synchronize: true,
          logging: false,
        }),
      ],
      providers: [SMSService],
    }).compile();

    service = module.get<SMSService>(SMSService);
    
    // Mock environment variables
    process.env.TWILIO_ACCOUNT_SID = 'test-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
    process.env.AWS_SNS_ACCESS_KEY = 'test-key';
    process.env.AWS_SNS_SECRET_KEY = 'test-secret';
    process.env.AWS_REGION = 'us-east-1';
    process.env.PLIVO_AUTH_ID = 'test-auth-id';
    process.env.PLIVO_AUTH_TOKEN = 'test-auth-token';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.AWS_SNS_ACCESS_KEY;
    delete process.env.AWS_SNS_SECRET_KEY;
    delete process.env.AWS_REGION;
    delete process.env.PLIVO_AUTH_ID;
    delete process.env.PLIVO_AUTH_TOKEN;
  });

  describe('Provider Initialization', () => {
    it('should initialize Twilio client', () => {
      service['initializeProviders']();
      expect(service['twilioClient']).toBeDefined();
    });

    it('should handle missing Twilio credentials gracefully', () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      
      service['initializeProviders']();
      expect(service['twilioClient']).toBeNull();
    });
  });

  describe('Send SMS', () => {
    it('should send SMS via Twilio successfully', async () => {
      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Test SMS message',
      };

      const result = await service.sendSMS('twilio', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBe('twilio');
      expect(result.deliveryTime).toBeDefined();
      expect(result.deliveryTime).toBeGreaterThan(0);
    });

    it('should send SMS via AWS SNS successfully', async () => {
      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Test SMS message',
      };

      const result = await service.sendSMS('sns', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBe('sns');
      expect(result.deliveryTime).toBeDefined();
    });

    it('should send SMS via Plivo successfully', async () => {
      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Test SMS message',
      };

      const result = await service.sendSMS('plivo', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBe('plivo');
      expect(result.deliveryTime).toBeDefined();
    });

    it('should handle SMS sending failures', async () => {
      const message: SMSMessage = {
        to: 'invalid-phone',
        from: '+0987654321',
        body: 'Test SMS message',
      };

      const result = await service.sendSMS('twilio', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.provider).toBe('twilio');
      expect(result.deliveryTime).toBeDefined();
    });

    it('should handle unsupported provider', async () => {
      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Test SMS message',
      };

      const result = await service.sendSMS('unsupported', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not supported');
      expect(result.provider).toBe('unsupported');
    });
  });

  describe('Phone Validation', () => {
    it('should validate international phone numbers', async () => {
      const validNumbers = [
        '+1234567890',
        '+441234567890',
        '+919876543210',
        '+8612345678901',
      ];

      for (const number of validNumbers) {
        const isValid = await service.validatePhoneNumber(number, 'twilio');
        expect(isValid).toBe(true);
      }
    });

    it('should reject invalid phone numbers', async () => {
      const invalidNumbers = [
        '1234567890', // Missing country code
        '+123456789', // Too short
        '+1234567890123456', // Too long
        'invalid-phone',
        '',
      ];

      for (const number of invalidNumbers) {
        const isValid = await service.validatePhoneNumber(number, 'twilio');
        expect(isValid).toBe(false);
      }
    });

    it('should handle different phone formats', async () => {
      const formats = [
        '+1 (234) 567-890',
        '+44 123 456 7890',
        '+91-98765-43210',
        '+86 123 4567 8901',
      ];

      for (const number of formats) {
        const isValid = await service.validatePhoneNumber(number, 'twilio');
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Fallback Mechanism', () => {
    it('should fallback to secondary provider on failure', async () => {
      // Mock Twilio failure
      jest.spyOn(service, 'sendSMS').mockImplementationOnce(() => {
        return Promise.resolve({
          success: false,
          error: 'Twilio API error',
          deliveryTime: 100,
          provider: 'twilio',
        });
      });

      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Test SMS message',
      };

      const result = await service.sendSMSWithFallback(message);
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('sns'); // Should fallback to SNS
    });

    it('should try all providers before failing', async () => {
      // Mock all providers to fail
      jest.spyOn(service, 'sendSMS').mockImplementation(() => {
        return Promise.resolve({
          success: false,
          error: 'Provider error',
          deliveryTime: 100,
          provider: 'any',
        });
      });

      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Test SMS message',
      };

      await expect(service.sendSMSWithFallback(message)).rejects.toThrow('No SMS providers available');
    });

    it('should log fallback attempts', async () => {
      const consoleSpy = jest.spy(console, 'warn');
      
      jest.spyOn(service, 'sendSMS').mockImplementationOnce(() => {
        return Promise.resolve({
          success: false,
          error: 'Twilio API error',
          deliveryTime: 100,
          provider: 'twilio',
        });
      });

      jest.spyOn(service, 'sendSMS').mockImplementationOnce(() => {
        return Promise.resolve({
          success: true,
          messageId: 'sns-message-id',
          deliveryTime: 200,
          provider: 'sns',
        });
      });

      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Test SMS message',
      };

      await service.sendSMSWithFallback(message);
      
      expect(consoleSpy).toHaveBeenCalledWith('SMS provider twilio failed, trying next provider');
    });
  });

  describe('Performance Tests', () => {
    it('should send SMS within acceptable time limits', async () => {
      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Performance Test SMS',
      };

      const startTime = Date.now();
      const result = await service.sendSMS('twilio', message);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(3000); // 3 seconds max
    });

    it('should handle concurrent SMS sending', async () => {
      const messages = Array(10).fill(null).map((_, index) => ({
        to: `+123456789${index}`,
        from: '+0987654321',
        body: `Concurrent Test SMS ${index}`,
      }));

      const promises = messages.map(message => service.sendSMS('twilio', message));
      const results = await Promise.all(promises);

      expect(results.every(result => result.success)).toBe(true);
      expect(results.length).toBe(10);
    });
  });

  describe('Media Messages', () => {
    it('should handle SMS with media URLs', async () => {
      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Test SMS with media',
        mediaUrls: ['https://example.com/image.jpg'],
      };

      const result = await service.sendSMS('twilio', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should handle SMS with multiple media URLs', async () => {
      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Test SMS with multiple media',
        mediaUrls: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.png',
          'https://example.com/video.mp4',
        ],
      };

      const result = await service.sendSMS('twilio', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('Provider Management', () => {
    it('should return available providers', () => {
      const providers = service.getAvailableProviders();
      
      expect(providers).toContain('twilio');
      expect(providers).toContain('sns');
      expect(providers).toContain('plivo');
    });

    it('should return empty list when no providers configured', () => {
      // Clear all credentials
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.AWS_SNS_ACCESS_KEY;
      delete process.env.AWS_SNS_SECRET_KEY;
      delete process.env.PLIVO_AUTH_ID;
      delete process.env.PLIVO_AUTH_TOKEN;
      
      service['initializeProviders']();
      const providers = service.getAvailableProviders();
      
      expect(providers).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      // Mock network timeout
      jest.spyOn(service, 'sendSMS').mockImplementationOnce(() => {
        return Promise.reject(new Error('Network timeout'));
      });

      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Timeout Test SMS',
      };

      const result = await service.sendSMS('twilio', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle API rate limits', async () => {
      // Mock rate limit error
      const error = new Error('Rate limit exceeded');
      error.name = 'TooManyRequestsError';
      
      jest.spyOn(service, 'sendSMS').mockImplementationOnce(() => {
        throw error;
      });

      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Rate Limit Test SMS',
      };

      const result = await service.sendSMS('twilio', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('should handle invalid credentials', async () => {
      // Mock authentication error
      const error = new Error('Invalid credentials');
      error.name = 'AuthenticationError';
      
      jest.spyOn(service, 'sendSMS').mockImplementationOnce(() => {
        throw error;
      });

      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Auth Test SMS',
      };

      const result = await service.sendSMS('twilio', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });
  });

  describe('Message Validation', () => {
    it('should validate required fields', async () => {
      const invalidMessage = {
        to: '',
        from: '',
        body: '',
      };

      const result = await service.sendSMS('twilio', invalidMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should validate phone number format', async () => {
      const invalidMessage = {
        to: 'not-a-phone-number',
        from: '+0987654321',
        body: 'Test SMS',
      };

      const result = await service.sendSMS('twilio', invalidMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('phone number');
    });

    it('should validate message length', async () => {
      const longMessage = 'A'.repeat(2000); // Very long message
      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: longMessage,
      };

      const result = await service.sendSMS('twilio', message);
      
      expect(result.success).toBe(true); // Should handle long messages
      expect(result.messageId).toBeDefined();
    });
  });

  describe('Provider-Specific Features', () => {
    it('should handle Twilio-specific features', async () => {
      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Twilio-specific test',
        mediaUrls: ['https://example.com/mms.jpg'],
      };

      const result = await service.sendSMS('twilio', message);
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('twilio');
    });

    it('should handle SNS-specific features', async () => {
      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'SNS-specific test',
      };

      const result = await service.sendSMS('sns', message);
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('sns');
    });

    it('should handle Plivo-specific features', async () => {
      const message: SMSMessage = {
        to: '+1234567890',
        from: '+0987654321',
        body: 'Plivo-specific test',
        mediaUrls: ['https://example.com/plivo.jpg'],
      };

      const result = await service.sendSMS('plivo', message);
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('plivo');
    });
  });
});
