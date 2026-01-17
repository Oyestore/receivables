import * as dotenv from 'dotenv';
import { ValidationError } from '../errors/app-error';

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration interface defining all application settings
 */
export interface IConfig {
  // Application
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  
  // Database
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: boolean;
    maxConnections: number;
    connectionTimeout: number;
  };
  
  // JWT Authentication
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  
  // Multi-Tenancy
  multiTenancy: {
    enabled: boolean;
    schemaPrefix: string;
  };
  
  // Logging
  logging: {
    level: string;
    format: 'json' | 'console';
    directory: string;
  };
  
  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  
  // CORS
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  
  // Email
  email: {
    provider: string;
    apiKey: string;
    from: string;
  };
  
  // SMS
  sms: {
    provider: string;
    apiKey: string;
    from: string;
  };
  
  // Redis (for caching and sessions)
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  
  // Payment Gateways
  payments: {
    stripe: {
      secretKey: string;
      webhookSecret: string;
    };
    razorpay: {
      keyId: string;
      keySecret: string;
      webhookSecret: string;
    };
  };
  
  // External Services
  services: {
    gstApi: {
      baseUrl: string;
      apiKey: string;
    };
    msmeSamadhaan: {
      baseUrl: string;
      apiKey: string;
    };
  };
}

/**
 * Configuration Service
 * Provides type-safe access to application configuration
 */
export class ConfigService {
  private static instance: ConfigService;
  private config: IConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig(): IConfig {
    return {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000', 10),
      apiPrefix: process.env.API_PREFIX || '/api/v1',
      
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_DATABASE || 'sme_receivables',
        ssl: process.env.DB_SSL === 'true',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
      },
      
      jwt: {
        secret: process.env.JWT_SECRET || 'change-me-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-in-production',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },
      
      multiTenancy: {
        enabled: process.env.MULTI_TENANCY_ENABLED === 'true',
        schemaPrefix: process.env.MULTI_TENANCY_SCHEMA_PREFIX || 'tenant_',
      },
      
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: (process.env.LOG_FORMAT as 'json' | 'console') || 'json',
        directory: process.env.LOG_DIRECTORY || './logs',
      },
      
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      },
      
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || '*',
        credentials: process.env.CORS_CREDENTIALS === 'true',
      },
      
      email: {
        provider: process.env.EMAIL_PROVIDER || 'sendgrid',
        apiKey: process.env.EMAIL_API_KEY || '',
        from: process.env.EMAIL_FROM || 'noreply@sme-receivables.com',
      },
      
      sms: {
        provider: process.env.SMS_PROVIDER || 'twilio',
        apiKey: process.env.SMS_API_KEY || '',
        from: process.env.SMS_FROM || '',
      },
      
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
      },
      
      payments: {
        stripe: {
          secretKey: process.env.STRIPE_SECRET_KEY || '',
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        },
        razorpay: {
          keyId: process.env.RAZORPAY_KEY_ID || '',
          keySecret: process.env.RAZORPAY_KEY_SECRET || '',
          webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
        },
      },
      
      services: {
        gstApi: {
          baseUrl: process.env.GST_API_BASE_URL || '',
          apiKey: process.env.GST_API_KEY || '',
        },
        msmeSamadhaan: {
          baseUrl: process.env.MSME_SAMADHAAN_BASE_URL || '',
          apiKey: process.env.MSME_SAMADHAAN_API_KEY || '',
        },
      },
    };
  }

  /**
   * Validate required configuration values
   */
  private validateConfig(): void {
    const requiredInProduction = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'DB_PASSWORD',
    ];

    if (this.config.nodeEnv === 'production') {
      const missing = requiredInProduction.filter(
        key => !process.env[key] || process.env[key] === 'change-me-in-production'
      );

      if (missing.length > 0) {
        throw new ValidationError(
          `Missing required environment variables in production: ${missing.join(', ')}`
        );
      }
    }
  }

  /**
   * Get complete configuration
   */
  public get(): IConfig {
    return this.config;
  }

  /**
   * Get specific configuration value
   */
  public getValue<K extends keyof IConfig>(key: K): IConfig[K] {
    return this.config[key];
  }

  /**
   * Check if running in production
   */
  public isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  /**
   * Check if running in development
   */
  public isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  /**
   * Check if running in test
   */
  public isTest(): boolean {
    return this.config.nodeEnv === 'test';
  }
}

// Export singleton instance
export const config = ConfigService.getInstance();
