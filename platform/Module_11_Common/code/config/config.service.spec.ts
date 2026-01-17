import { ConfigService } from './config.service';

describe('ConfigService', () => {
  let configService: ConfigService;

  beforeEach(() => {
    // Reset environment variables
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.DB_PASSWORD = 'test-password';

    configService = ConfigService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ConfigService.getInstance();
      const instance2 = ConfigService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Configuration Loading', () => {
    it('should load configuration from environment variables', () => {
      const config = configService.get();

      expect(config).toBeDefined();
      expect(config.nodeEnv).toBe('test');
      expect(config.port).toBe(3000);
    });

    it('should use default values when env vars not set', () => {
      delete process.env.API_PREFIX;
      const config = configService.get();

      expect(config.apiPrefix).toBe('/api/v1');
    });

    it('should parse integer values correctly', () => {
      process.env.PORT = '4000';
      process.env.DB_PORT = '5433';

      const config = configService.get();

      expect(config.port).toBe(4000);
      expect(config.database.port).toBe(5433);
    });

    it('should parse boolean values correctly', () => {
      process.env.DB_SSL = 'true';
      process.env.MULTI_TENANCY_ENABLED = 'true';

      const config = configService.get();

      expect(config.database.ssl).toBe(true);
      expect(config.multiTenancy.enabled).toBe(true);
    });
  });

  describe('getValue', () => {
    it('should get specific configuration value', () => {
      const nodeEnv = configService.getValue('nodeEnv');
      const port = configService.getValue('port');

      expect(nodeEnv).toBe('test');
      expect(port).toBe(3000);
    });

    it('should get nested configuration value', () => {
      const database = configService.getValue('database');

      expect(database).toBeDefined();
      expect(database.host).toBeDefined();
      expect(database.port).toBeDefined();
    });
  });

  describe('Environment Checks', () => {
    it('should identify production environment', () => {
      process.env.NODE_ENV = 'production';
      const config = ConfigService.getInstance();

      expect(config.isProduction()).toBe(true);
      expect(config.isDevelopment()).toBe(false);
      expect(config.isTest()).toBe(false);
    });

    it('should identify development environment', () => {
      process.env.NODE_ENV = 'development';
      const config = ConfigService.getInstance();

      expect(config.isProduction()).toBe(false);
      expect(config.isDevelopment()).toBe(true);
      expect(config.isTest()).toBe(false);
    });

    it('should identify test environment', () => {
      process.env.NODE_ENV = 'test';
      const config = ConfigService.getInstance();

      expect(config.isProduction()).toBe(false);
      expect(config.isDevelopment()).toBe(false);
      expect(config.isTest()).toBe(true);
    });
  });

  describe('Database Configuration', () => {
    it('should load database configuration', () => {
      const dbConfig = configService.getValue('database');

      expect(dbConfig.host).toBeDefined();
      expect(dbConfig.port).toBe(5432);
      expect(dbConfig.username).toBeDefined();
      expect(dbConfig.database).toBeDefined();
    });

    it('should parse max connections', () => {
      process.env.DB_MAX_CONNECTIONS = '50';
      const config = ConfigService.getInstance();
      const dbConfig = config.getValue('database');

      expect(dbConfig.maxConnections).toBe(50);
    });
  });

  describe('JWT Configuration', () => {
    it('should load JWT configuration', () => {
      const jwtConfig = configService.getValue('jwt');

      expect(jwtConfig.secret).toBe('test-secret');
      expect(jwtConfig.refreshSecret).toBe('test-refresh-secret');
      expect(jwtConfig.expiresIn).toBeDefined();
      expect(jwtConfig.refreshExpiresIn).toBeDefined();
    });
  });

  describe('Multi-Tenancy Configuration', () => {
    it('should load multi-tenancy configuration', () => {
      const mtConfig = configService.getValue('multiTenancy');

      expect(mtConfig.enabled).toBeDefined();
      expect(mtConfig.schemaPrefix).toBeDefined();
    });
  });

  describe('Logging Configuration', () => {
    it('should load logging configuration', () => {
      const logConfig = configService.getValue('logging');

      expect(logConfig.level).toBeDefined();
      expect(logConfig.format).toBeDefined();
      expect(logConfig.directory).toBeDefined();
    });
  });

  describe('Rate Limiting Configuration', () => {
    it('should load rate limiting configuration', () => {
      const rateLimitConfig = configService.getValue('rateLimit');

      expect(rateLimitConfig.windowMs).toBeDefined();
      expect(rateLimitConfig.maxRequests).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    it('should load CORS configuration', () => {
      const corsConfig = configService.getValue('cors');

      expect(corsConfig.origin).toBeDefined();
      expect(corsConfig.credentials).toBeDefined();
    });

    it('should parse multiple origins', () => {
      process.env.CORS_ORIGIN = 'http://localhost:3000,http://localhost:4000';
      const config = ConfigService.getInstance();
      const corsConfig = config.getValue('cors');

      expect(Array.isArray(corsConfig.origin)).toBe(true);
      expect(corsConfig.origin).toHaveLength(2);
    });
  });

  describe('Email Configuration', () => {
    it('should load email configuration', () => {
      const emailConfig = configService.getValue('email');

      expect(emailConfig.provider).toBeDefined();
      expect(emailConfig.apiKey).toBeDefined();
      expect(emailConfig.from).toBeDefined();
    });
  });

  describe('SMS Configuration', () => {
    it('should load SMS configuration', () => {
      const smsConfig = configService.getValue('sms');

      expect(smsConfig.provider).toBeDefined();
      expect(smsConfig.apiKey).toBeDefined();
      expect(smsConfig.from).toBeDefined();
    });
  });

  describe('Redis Configuration', () => {
    it('should load Redis configuration', () => {
      const redisConfig = configService.getValue('redis');

      expect(redisConfig.host).toBeDefined();
      expect(redisConfig.port).toBeDefined();
      expect(redisConfig.db).toBeDefined();
    });
  });

  describe('Payment Gateway Configuration', () => {
    it('should load payment gateway configuration', () => {
      const paymentsConfig = configService.getValue('payments');

      expect(paymentsConfig.stripe).toBeDefined();
      expect(paymentsConfig.razorpay).toBeDefined();
    });
  });

  describe('External Services Configuration', () => {
    it('should load external services configuration', () => {
      const servicesConfig = configService.getValue('services');

      expect(servicesConfig.gstApi).toBeDefined();
      expect(servicesConfig.msmeSamadhaan).toBeDefined();
    });
  });
});
