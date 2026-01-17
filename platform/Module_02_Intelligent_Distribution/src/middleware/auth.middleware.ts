import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly validApiKeys: string[];

  constructor(private readonly configService: ConfigService) {
    const apiKeys = this.configService.get<string>('VALID_API_KEYS', 'sk-test-key');
    this.validApiKeys = apiKeys.split(',').map(key => key.trim());
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const apiKey = this.extractApiKey(req);
    
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    if (!this.isValidApiKey(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Add user context to request
    req['user'] = {
      apiKey,
      authenticated: true,
      timestamp: new Date().toISOString(),
    };

    next();
  }

  private extractApiKey(req: Request): string | null {
    // Check header first
    const headerKey = req.headers['x-api-key'] as string;
    if (headerKey) {
      return headerKey;
    }

    // Check query parameter
    const queryKey = req.query['api_key'] as string;
    if (queryKey) {
      return queryKey;
    }

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
