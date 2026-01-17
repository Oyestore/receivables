import jwt from 'jsonwebtoken';
import { config } from '../config/config.service';
import { TokenError, UnauthorizedError } from '../errors/app-error';
import { Logger } from '../logging/logger';

const logger = new Logger('JWTService');

/**
 * JWT Payload interface
 */
export interface IJWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
}

/**
 * Token pair interface
 */
export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Decoded token interface
 */
export interface IDecodedToken extends IJWTPayload {
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

/**
 * JWT Service
 * Handles JWT token generation, verification, and refresh
 */
export class JWTService {
  private static instance: JWTService;
  private jwtConfig = config.getValue('jwt');

  private constructor() {
    logger.info('JWTService initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): JWTService {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService();
    }
    return JWTService.instance;
  }

  /**
   * Generate access and refresh token pair
   */
  public generateTokenPair(payload: IJWTPayload): ITokenPair {
    logger.debug('Generating token pair', { userId: payload.userId });

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Parse expiration time to seconds
    const expiresIn = this.parseExpirationTime(this.jwtConfig.expiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Generate access token
   */
  public generateAccessToken(payload: IJWTPayload): string {
    const tokenPayload = {
      ...payload,
      type: 'access',
    };

    return jwt.sign(tokenPayload, this.jwtConfig.secret, {
      expiresIn: this.jwtConfig.expiresIn,
    });
  }

  /**
   * Generate refresh token
   */
  public generateRefreshToken(payload: IJWTPayload): string {
    const tokenPayload = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      type: 'refresh',
    };

    return jwt.sign(tokenPayload, this.jwtConfig.refreshSecret, {
      expiresIn: this.jwtConfig.refreshExpiresIn,
    });
  }

  /**
   * Verify access token
   */
  public verifyAccessToken(token: string): IDecodedToken {
    try {
      const decoded = jwt.verify(token, this.jwtConfig.secret) as IDecodedToken;

      if (decoded.type !== 'access') {
        throw new TokenError('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenError('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new TokenError('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  public verifyRefreshToken(token: string): IDecodedToken {
    try {
      const decoded = jwt.verify(token, this.jwtConfig.refreshSecret) as IDecodedToken;

      if (decoded.type !== 'refresh') {
        throw new TokenError('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenError('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new TokenError('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshAccessToken(refreshToken: string): Promise<ITokenPair> {
    logger.debug('Refreshing access token');

    // Verify refresh token
    const decoded = this.verifyRefreshToken(refreshToken);

    // In production, check if refresh token is revoked in database/Redis

    // Generate new token pair
    // Note: In production, fetch full user data from database
    const payload: IJWTPayload = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      roles: decoded.roles,
      permissions: decoded.permissions,
    };

    return this.generateTokenPair(payload);
  }

  /**
   * Decode token without verification (for debugging)
   */
  public decodeToken(token: string): IDecodedToken | null {
    try {
      return jwt.decode(token) as IDecodedToken;
    } catch (error) {
      logger.error('Failed to decode token', error as Error);
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   */
  public extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new UnauthorizedError('Authorization header missing');
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization header format');
    }

    return parts[1];
  }

  /**
   * Check if token is expired
   */
  public isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }

  /**
   * Get token expiration time
   */
  public getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  }

  /**
   * Parse expiration time string to seconds
   */
  private parseExpirationTime(expiresIn: string): number {
    const units: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const match = expiresIn.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      throw new Error(`Invalid expiration time format: ${expiresIn}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    return value * units[unit];
  }

  /**
   * Revoke token (store in blacklist)
   * In production, this would store the token in Redis with TTL
   */
  public async revokeToken(token: string): Promise<void> {
    const decoded = this.decodeToken(token);
    
    if (!decoded) {
      throw new TokenError('Invalid token');
    }

    // In production:
    // 1. Store token ID in Redis blacklist
    // 2. Set TTL to token expiration time
    // 3. Check blacklist during token verification

    logger.info('Token revoked', {
      userId: decoded.userId,
      tokenType: decoded.type,
    });
  }

  /**
   * Check if token is revoked
   * In production, this would check Redis blacklist
   */
  public async isTokenRevoked(token: string): Promise<boolean> {
    // In production, check Redis blacklist
    return false;
  }
}

// Export singleton instance
export const jwtService = JWTService.getInstance();
