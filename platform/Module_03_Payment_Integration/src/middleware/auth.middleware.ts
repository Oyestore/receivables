import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);
  private readonly validApiKeys: string[];

  constructor(private configService: ConfigService) {
    this.validApiKeys = this.configService.get<string>('VALID_API_KEYS')?.split(',') || [];
  }

  use(req: Request, res: Response, next: NextFunction) {
    const apiKey = this.extractApiKey(req);
    
    if (!apiKey) {
      this.logger.warn(`Missing API key for request: ${req.method} ${req.url}`);
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
      this.logger.warn(`Invalid API key used: ${apiKey.substring(0, 8)}... for request: ${req.method} ${req.url}`);
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
    (req as any).apiKey = apiKey;
    (req as any).apiKeyPrefix = apiKey.substring(0, 8);
    
    this.logger.debug(`Authenticated request: ${req.method} ${req.url} with key: ${(req as any).apiKeyPrefix}...`);
    next();
  }

  private extractApiKey(req: Request): string | null {
    // Check header first
    const headerKey = req.headers['x-api-key'] as string;
    if (headerKey) return headerKey;

    // Check query parameter
    const queryKey = req.query.api_key as string;
    if (queryKey) return queryKey;

    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  private isValidApiKey(apiKey: string): boolean {
    return this.validApiKeys.includes(apiKey);
  }
}
