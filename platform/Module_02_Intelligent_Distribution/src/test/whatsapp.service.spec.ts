import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppService } from '../services/whatsapp.service';
import { WhatsAppMessage, WhatsAppResult } from '../services/whatsapp.service';

describe('WhatsAppService', () => {
  let service: WhatsAppService;

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
      providers: [WhatsAppService],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
    
    // Mock environment variables
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id';
    process.env.TWILIO_ACCOUNT_SID = 'test-sid';
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  describe('Configuration Validation', () => {
    it('should validate configuration on initialization', () => {
      const consoleSpy = jest.spy(console, 'warn');
      
      service['validateConfiguration']();
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should warn when WhatsApp credentials are missing', () => {
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      delete process.env.WHATSAPP_PHONE_NUMBER_ID;
      
      const consoleSpy = jest.spy(console, 'warn');
      
      service['validateConfiguration']();
      
      expect(consoleSpy).toHaveBeenCalledWith('WhatsApp Business API credentials not configured');
    });
  });

  describe('Send WhatsApp Message', () => {
    it('should send WhatsApp message via Meta successfully', async () => {
      const message: WhatsAppMessage = {
        to: '1234567890',
        from: '9876543210',
        body: 'Test WhatsApp message',
      };

      const result = await service.sendWhatsAppMessage('meta', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBe('meta');
      expect(result.deliveryTime).toBeDefined();
      expect(result.deliveryTime).toBeGreaterThan(0);
    });

    it('should send WhatsApp message via Twilio successfully', async () => {
      const message: WhatsAppMessage = {
        to: '1234567890',
        from: '9876543210',
        body: 'Test WhatsApp message',
      };

      const result = await service.sendWhatsAppMessage('twilio', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBe('twilio');
      expect(result.deliveryTime).toBeDefined();
    });

    it('should handle unsupported provider', async () => {
      const message: WhatsAppMessage = {
        to: '1234567890',
        from: '9876543210',
        body: 'Test WhatsApp message',
      };

      const result = await service.sendWhatsAppMessage('unsupported', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not supported');
      expect(result.provider).toBe('unsupported');
    });

    it('should handle message sending failures', async () => {
      const message: WhatsAppMessage = {
        to: 'invalid-number',
        from: '9876543210',
        body: 'Test WhatsApp message',
      };

      const result = await service.sendWhatsAppMessage('meta', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.provider).toBe('meta');
      expect(result.deliveryTime).toBeDefined();
    });
  });

  describe('Template Messages', () => {
    it('should send template message via Meta successfully', async () => {
      const result = await service.sendWhatsAppTemplate(
        'meta',
        '1234567890',
        'welcome_template',
        'en_US',
        [
          {
            type: 'text',
            text: 'John Doe',
          },
        ]
      );
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBe('meta');
    });

    it('should send template message via Twilio successfully', async () => {
      const result = await service.sendWhatsAppTemplate(
        'twilio',
        '1234567890',
        'welcome_template',
        'en_US',
        [
          {
            type: 'text',
            text: 'John Doe',
          },
        ]
      );
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBe('twilio');
    });

    it('should handle template with currency parameters', async () => {
      const result = await service.sendWhatsAppTemplate(
        'meta',
        '1234567890',
        'payment_template',
        'en_US',
        [
          {
            type: 'currency',
            currency: {
              fallback_value: '100.00 USD',
              code: 'USD',
              amount_1000: 100000,
            },
          },
        ]
      );
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should handle template with multiple parameters', async () => {
      const result = await service.sendWhatsAppTemplate(
        'meta',
        '1234567890',
        'order_update_template',
        'en_US',
        [
          {
            type: 'text',
            text: 'Order #12345',
          },
          {
            type: 'text',
            text: 'Shipped',
          },
          {
            type: 'currency',
            currency: {
              fallback_value: '50.00 USD',
              code: 'USD',
              amount_1000: 50000,
            },
          },
        ]
      );
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('Media Messages', () => {
    it('should send media message via Meta successfully', async () => {
      const message: WhatsAppMessage = {
        to: '1234567890',
        from: '9876543210',
        mediaUrl: 'https://example.com/image.jpg',
      };

      const result = await service.sendWhatsAppMessage('meta', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBe('meta');
    });

    it('should send media message via Twilio successfully', async () => {
      const message: WhatsAppMessage = {
        to: '1234567890',
        from: '9876543210',
        body: 'Check out this image',
        mediaUrl: 'https://example.com/image.jpg',
      };

      const result = await service.sendWhatsAppMessage('twilio', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBe('twilio');
    });

    it('should handle multiple media URLs', async () => {
      const message: WhatsAppMessage = {
        to: '1234567890',
        from: '9876543210',
        body: 'Multiple media files',
        mediaUrl: 'https://example.com/image1.jpg',
      };

      const result = await service.sendWhatsAppMessage('meta', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('Message Status Tracking', () => {
    it('should get message status from Meta successfully', async () => {
      const messageId = 'meta-message-id-123';
      const status = await service.getWhatsAppMessageStatus('meta', messageId);
      
      expect(status).toBeDefined();
      expect(status.id).toBe(messageId);
    });

    it('should get message status from Twilio successfully', async () => {
      const messageId = 'twilio-message-id-123';
      const status = await service.getWhatsAppMessageStatus('twilio', messageId);
      
      expect(status).toBeDefined();
      expect(status.sid).toBe(messageId);
    });

    it('should handle status retrieval for unsupported provider', async () => {
      const messageId = 'message-id-123';
      
      await expect(service.getWhatsAppMessageStatus('unsupported', messageId))
        .rejects.toThrow('WhatsApp provider unsupported not supported');
    });

    it('should handle status retrieval errors', async () => {
      const messageId = 'invalid-message-id';
      
      await expect(service.getWhatsAppMessageStatus('meta', messageId))
        .rejects.toThrow();
    });
  });

  describe('Number Validation', () => {
    it('should validate WhatsApp numbers correctly', async () => {
      const validNumbers = [
        '1234567890',
        '+1234567890',
        '12345678901',
        '+123456789012',
      ];

      for (const number of validNumbers) {
        const isValid = await service.validateWhatsAppNumber(number);
        expect(isValid).toBe(true);
      }
    });

    it('should reject invalid WhatsApp numbers', async () => {
      const invalidNumbers = [
        '12345', // Too short
        '1234567890123456', // Too long
        'abc123', // Contains letters
        '', // Empty
        '123-456-7890', // Invalid format
      ];

      for (const number of invalidNumbers) {
        const isValid = await service.validateWhatsAppNumber(number);
        expect(isValid).toBe(false);
      }
    });

    it('should handle edge cases in number validation', async () => {
      const edgeCases = [
        '+1234567890', // With country code
        '1234567890', // Without country code
        '12345678901', // 11 digits
        '+123456789012', // 12 digits with country code
      ];

      for (const number of edgeCases) {
        const isValid = await service.validateWhatsAppNumber(number);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('Provider Management', () => {
    it('should return available providers', () => {
      const providers = service.getAvailableProviders();
      
      expect(providers).toContain('meta');
      expect(providers).toContain('twilio');
    });

    it('should return empty list when no providers configured', () => {
      // Clear all credentials
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      
      service['validateConfiguration']();
      const providers = service.getAvailableProviders();
      
      expect(providers).toHaveLength(0);
    });

    it('should handle partial provider configuration', () => {
      // Only configure Meta
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      
      service['validateConfiguration']();
      const providers = service.getAvailableProviders();
      
      expect(providers).toContain('meta');
      expect(providers).not.toContain('twilio');
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      // Mock network timeout
      jest.spyOn(service, 'sendWhatsAppMessage').mockImplementationOnce(() => {
        return Promise.reject(new Error('Network timeout'));
      });

      const message: WhatsAppMessage = {
        to: '1234567890',
        from: '9876543210',
        body: 'Timeout Test',
      };

      const result = await service.sendWhatsAppMessage('meta', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle API rate limits', async () => {
      // Mock rate limit error
      const error = new Error('Rate limit exceeded');
      error.name = 'TooManyRequestsError';
      
      jest.spyOn(service, 'sendWhatsAppMessage').mockImplementationOnce(() => {
        throw error;
      });

      const message: WhatsAppMessage = {
        to: '1234567890',
        from: '9876543210',
        body: 'Rate Limit Test',
      };

      const result = await service.sendWhatsAppMessage('meta', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('should handle invalid credentials', async () => {
      // Mock authentication error
      const error = new Error('Invalid credentials');
      error.name = 'AuthenticationError';
      
      jest.spyOn(service, 'sendWhatsAppMessage').mockImplementationOnce(() => {
        throw error;
      });

      const message: WhatsAppMessage = {
        to: '1234567890',
        from: '9876543210',
        body: 'Auth Test',
      };

      const result = await service.sendWhatsAppMessage('meta', message);
      
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

      const result = await service.sendWhatsAppMessage('meta', invalidMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should validate message length', async () => {
      const longMessage = 'A'.repeat(5000); // Very long message
      const message: WhatsAppMessage = {
        to: '1234567890',
        from: '9876543210',
        body: longMessage,
      };

      const result = await service.sendWhatsAppMessage('meta', message);
      
      expect(result.success).toBe(true); // Should handle long messages
      expect(result.messageId).toBeDefined();
    });

    it('should validate media URL format', async () => {
      const message: WhatsAppMessage = {
        to: '1234567890',
        from: '9876543210',
        mediaUrl: 'not-a-valid-url',
      };

      const result = await service.sendWhatsAppMessage('meta', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('URL');
    });
  });

  describe('Performance Tests', () => {
    it('should send WhatsApp message within acceptable time limits', async () => {
      const message: WhatsAppMessage = {
        to: '1234567890',
        from: '9876543210',
        body: 'Performance Test WhatsApp',
      };

      const startTime = Date.now();
      const result = await service.sendWhatsAppMessage('meta', message);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(3000); // 3 seconds max
    });

    it('should handle concurrent WhatsApp message sending', async () => {
      const messages = Array(10).fill(null).map((_, index) => ({
        to: `123456789${index}`,
        from: '9876543210',
        body: `Concurrent Test WhatsApp ${index}`,
      }));

      const promises = messages.map(message => service.sendWhatsAppMessage('meta', message));
      const results = await Promise.all(promises);

      expect(results.every(result => result.success)).toBe(true);
      expect(results.length).toBe(10);
    });
  });

  describe('Template Language Support', () => {
    it('should support multiple languages', async () => {
      const languages = ['en_US', 'es_ES', 'fr_FR', 'de_DE', 'pt_BR'];
      
      for (const language of languages) {
        const result = await service.sendWhatsAppTemplate(
          'meta',
          '1234567890',
          'welcome_template',
          language,
          []
        );
        
        expect(result.success).toBe(true);
      }
    });

    it('should handle unsupported language gracefully', async () => {
      const result = await service.sendWhatsAppTemplate(
        'meta',
        '1234567890',
        'welcome_template',
        'unsupported_lang',
        []
      );
      
      expect(result.success).toBe(true); // Should still work
    });
  });

  describe('Component Parameters', () => {
    it('should handle text components', async () => {
      const result = await service.sendWhatsAppTemplate(
        'meta',
        '1234567890',
        'text_template',
        'en_US',
        [
          {
            type: 'text',
            text: 'Hello World',
          },
        ]
      );
      
      expect(result.success).toBe(true);
    });

    it('should handle currency components', async () => {
      const result = await service.sendWhatsAppTemplate(
        'meta',
        '1234567890',
        'currency_template',
        'en_US',
        [
          {
            type: 'currency',
            currency: {
              fallback_value: '$100.00',
              code: 'USD',
              amount_1000: 100000,
            },
          },
        ]
      );
      
      expect(result.success).toBe(true);
    });

    it('should handle mixed component types', async () => {
      const result = await service.sendWhatsAppTemplate(
        'meta',
        '1234567890',
        'mixed_template',
        'en_US',
        [
          {
            type: 'text',
            text: 'Order #12345',
          },
          {
            type: 'currency',
            currency: {
              fallback_value: '$50.00',
              code: 'USD',
              amount_1000: 50000,
            },
          },
        ]
      );
      
      expect(result.success).toBe(true);
    });
  });
});
