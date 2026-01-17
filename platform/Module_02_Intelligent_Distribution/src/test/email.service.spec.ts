import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '../services/email.service';
import { EmailConfig, EmailMessage, EmailResult } from '../services/email.service';

describe('EmailService', () => {
  let service: EmailService;
  let emailConfig: EmailConfig;

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
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
    
    // Mock environment variables
    process.env.SENDGRID_API_KEY = 'test-key';
    process.env.AWS_SES_ACCESS_KEY = 'test-key';
    process.env.AWS_SES_SECRET_KEY = 'test-secret';
    process.env.AWS_SES_HOST = 'email-smtp.us-east-1.amazonaws.com';
    process.env.MAILGUN_API_KEY = 'test-key';
    process.env.MAILGUN_DOMAIN = 'test.domain';
    process.env.DEFAULT_FROM_EMAIL = 'test@example.com';
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.SENDGRID_API_KEY;
    delete process.env.AWS_SES_ACCESS_KEY;
    delete process.env.AWS_SES_SECRET_KEY;
    delete process.env.AWS_SES_HOST;
    delete process.env.MAILGUN_API_KEY;
    delete process.env.MAILGUN_DOMAIN;
    delete process.env.DEFAULT_FROM_EMAIL;
  });

  describe('Provider Initialization', () => {
    it('should initialize SendGrid transporter', () => {
      service['initializeTransporters']();
      expect(service['transporters'].has('sendgrid')).toBe(true);
    });

    it('should initialize AWS SES transporter', () => {
      service['initializeTransporters']();
      expect(service['transporters'].has('ses')).toBe(true);
    });

    it('should initialize Mailgun transporter', () => {
      service['initializeTransporters']();
      expect(service['transporters'].has('mailgun')).toBe(true);
    });

    it('should handle missing credentials gracefully', () => {
      // Clear all credentials
      delete process.env.SENDGRID_API_KEY;
      delete process.env.AWS_SES_ACCESS_KEY;
      delete process.env.AWS_SES_SECRET_KEY;
      delete process.env.MAILGUN_API_KEY;
      delete process.env.MAILGUN_DOMAIN;
      
      service['initializeTransporters']();
      expect(service['transporters'].size).toBe(0);
    });
  });

  describe('Send Email', () => {
    it('should send email via SendGrid successfully', async () => {
      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
      };

      const result = await service.sendEmail('sendgrid', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.deliveryTime).toBeDefined();
      expect(result.deliveryTime).toBeGreaterThan(0);
    });

    it('should send email via AWS SES successfully', async () => {
      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
      };

      const result = await service.sendEmail('ses', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.deliveryTime).toBeDefined();
    });

    it('should send email via Mailgun successfully', async () => {
      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
      };

      const result = await service.sendEmail('mailgun', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.deliveryTime).toBeDefined();
    });

    it('should handle email sending failures', async () => {
      const message: EmailMessage = {
        to: 'invalid-email',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
      };

      const result = await service.sendEmail('sendgrid', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.deliveryTime).toBeDefined();
    });

    it('should validate email recipients', async () => {
      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
      };

      const result = await service.sendEmail('sendgrid', message);
      expect(result.success).toBe(true);
    });

    it('should handle attachments correctly', async () => {
      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test Email with Attachment',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
        attachments: [
          {
            filename: 'test.pdf',
            content: Buffer.from('test pdf content'),
            contentType: 'application/pdf',
          },
        ],
      };

      const result = await service.sendEmail('sendgrid', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('Fallback Mechanism', () => {
    it('should fallback to secondary provider on failure', async () => {
      // Mock SendGrid failure
      jest.spy(service, 'sendEmail').mockImplementationOnce(() => {
        return Promise.resolve({
          success: false,
          error: 'SendGrid API error',
          deliveryTime: 100,
          provider: 'sendgrid',
        });
      });

      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
      };

      const result = await service.sendEmailWithFallback(message);
      
      expect(result.success).toBe(true);
      expect(result.provider).toBe('ses'); // Should fallback to SES
    });

    it('should try all providers before failing', async () => {
      // Mock all providers to fail
      jest.spy(service, 'sendEmail').mockImplementation(() => {
        return Promise.resolve({
          success: false,
          error: 'Provider error',
          deliveryTime: 100,
          provider: 'any',
        });
      });

      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
      };

      await expect(service.sendEmailWithFallback(message)).rejects.toThrow('No email providers available');
    });

    it('should log fallback attempts', async () => {
      const consoleSpy = jest.spy(console, 'warn');
      
      jest.spy(service, 'sendEmail').mockImplementationOnce(() => {
        return Promise.resolve({
          success: false,
          error: 'SendGrid API error',
          deliveryTime: 100,
          provider: 'sendgrid',
        });
      });

      jest.spy(service, 'sendEmail').mockImplementationOnce(() => {
        return Promise.resolve({
          success: true,
          messageId: 'ses-message-id',
          deliveryTime: 200,
          provider: 'ses',
        });
      });

      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
      };

      await service.sendEmailWithFallback(message);
      
      expect(consoleSpy).toHaveBeenCalledWith('Email provider sendgrid failed, trying next provider');
    });
  });

  describe('Performance Tests', () => {
    it('should send email within acceptable time limits', async () => {
      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Performance Test Email',
        html: '<h1>Performance Test</h1>',
        text: 'Performance Test Content',
      };

      const startTime = Date.now();
      const result = await service.sendEmail('sendgrid', message);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle concurrent email sending', async () => {
      const messages = Array(10).fill(null).map((_, index) => ({
        to: `test${index}@example.com`,
        subject: `Concurrent Test ${index}`,
        html: `<h1>Concurrent Test ${index}</h1>`,
        text: `Concurrent Test Content ${index}`,
      }));

      const promises = messages.map(message => service.sendEmail('sendgrid', message));
      const results = await Promise.all(promises);

      expect(results.every(result => result.success)).toBe(true);
      expect(results.length).toBe(10);
    });
  });

  describe('Provider Health Checks', () => {
    it('should test SendGrid connection', async () => {
      const result = await service.testProvider('sendgrid');
      expect(result).toBe(true);
    });

    it('should test AWS SES connection', async () => {
      const result = await service.testProvider('ses');
      expect(result).toBe(true);
    });

    it('should test Mailgun connection', async () => {
      const result = await service.testProvider('mailgun');
      expect(result).toBe(true);
    });

    it('should handle invalid provider gracefully', async () => {
      const result = await service.testProvider('invalid');
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid email format', async () => {
      const message: EmailMessage = {
        to: 'invalid-email-format',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
      };

      const result = await service.sendEmail('sendgrid', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('should handle network timeouts', async () => {
      // Mock network timeout
      jest.spy(service, 'sendEmail').mockImplementationOnce(() => {
        return Promise.reject(new Error('Network timeout'));
      });

      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Timeout Test',
        html: '<h1>Timeout Test</h1>',
        text: 'Timeout Test Content',
      };

      const result = await service.sendEmail('sendgrid', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle API rate limits', async () => {
      // Mock rate limit error
      const error = new Error('Rate limit exceeded');
      error.name = 'TooManyRequestsError';
      
      jest.spy(service, 'sendEmail').mockImplementationOnce(() => {
        throw error;
      });

      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Rate Limit Test',
        html: '<h1>Rate Limit Test</h1>',
        text: 'Rate Limit Test Content',
      };

      const result = await service.sendEmail('sendgrid', message);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });
  });

  describe('Message Validation', () => {
    it('should validate required fields', async () => {
      const invalidMessage = {
        to: '',
        subject: '',
        html: '',
        text: '',
      };

      const result = await service.sendEmail('sendgrid', invalidMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should validate email format', async () => {
      const invalidMessage = {
        to: 'not-an-email',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
      };

      const result = await service.sendEmail('sendgrid', invalidMessage);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('email format');
    });

    it('should handle large attachments', async () => {
      const largeAttachment = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const message: EmailMessage = {
        to: 'test@example.com',
        subject: 'Large Attachment Test',
        html: '<h1>Large Attachment Test</h1>',
        text: 'Large Attachment Test',
        attachments: [
          {
            filename: 'large.pdf',
            content: largeAttachment,
            contentType: 'application/pdf',
          },
        ],
      };

      const result = await service.sendEmail('sendgrid', message);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });
});
