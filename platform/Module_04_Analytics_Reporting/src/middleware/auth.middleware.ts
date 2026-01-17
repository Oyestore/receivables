import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);
  private readonly validApiKeys: string[];

  constructor() {
    this.validApiKeys = process.env.VALID_API_KEYS?.split(',') || ['sk-analytics-key'];
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const apiKey = this.extractApiKey(req);

    if (!apiKey) {
      this.logger.warn(`Missing API key for ${req.method} ${req.url}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'API key is required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (!this.isValidApiKey(apiKey)) {
      this.logger.warn(`Invalid API key for ${req.method} ${req.url}`);
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid API key',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Add API key info to request for logging
    req['apiKey'] = apiKey;
    req['apiKeyPrefix'] = apiKey.substring(0, 8) + '...';

    this.logger.log(`Authorized request: ${req.method} ${req.url} (${req['apiKeyPrefix']})`);
    next();
  }

  private extractApiKey(req: Request): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check X-API-Key header
    const apiKeyHeader = req.headers['x-api-key'] as string;
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Check query parameter
    const apiKeyQuery = req.query.api_key as string;
    if (apiKeyQuery) {
      return apiKeyQuery;
    }

    return null;
  }

  private isValidApiKey(apiKey: string): boolean {
    return this.validApiKeys.includes(apiKey);
  }
}
