import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate a JWT access token
 */
export const generateAccessToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'sme-platform',
      audience: 'sme-platform-users',
    } as jwt.SignOptions);
  } catch (error) {
    console.error('JWT generation failed:', error);
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate a refresh token (longer-lived)
 */
export const generateRefreshToken = (userId: string): string => {
  try {
    return jwt.sign(
      { userId, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' } as jwt.SignOptions
    );
  } catch (error) {
    console.error('Refresh token generation failed:', error);
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload.userId);
  
  // Calculate expiration time in seconds
  const expiresIn = JWT_EXPIRES_IN.endsWith('h') 
    ? parseInt(JWT_EXPIRES_IN) * 3600
    : JWT_EXPIRES_IN.endsWith('d')
    ? parseInt(JWT_EXPIRES_IN) * 86400
    : 3600; // Default to 1 hour

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
};

/**
 * Verify and decode a JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'sme-platform',
      audience: 'sme-platform-users',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      console.error('Token verification failed:', error);
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Verify a refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string } => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }
    
    return { userId: decoded.userId };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      console.error('Refresh token verification failed:', error);
      throw new Error('Refresh token verification failed');
    }
  }
};

/**
 * Decode a token without verification (for debugging)
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token decoding failed:', error);
    return null;
  }
};

/**
 * Check if a token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Create Authorization header with token
 */
export const createAuthHeader = (token: string): string => {
  return `Bearer ${token}`;
};

/**
 * Validate token format
 */
export const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Get token expiration time
 */
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
  try {
    const { userId } = verifyRefreshToken(refreshToken);
    
    // In a real implementation, you would fetch the user from database
    // For now, we'll create a minimal payload
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId,
      email: '', // Would be fetched from database
      role: '', // Would be fetched from database
      tenantId: '', // Would be fetched from database
      permissions: [], // Would be fetched from database
    };
    
    return generateAccessToken(payload);
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh access token');
  }
};

/**
 * Token middleware for API routes
 */
export const tokenMiddleware = (req: any, res: any, next: any) => {
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  if (!isValidTokenFormat(token)) {
    return res.status(401).json({ error: 'Invalid token format' });
  }
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Role-based access control middleware
 */
export const roleMiddleware = (requiredRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

/**
 * Permission-based access control middleware
 */
export const permissionMiddleware = (requiredPermissions: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Export JWT secret for testing (only in development)
export const getJWTSecret = () => {
  if (process.env.NODE_ENV === 'development') {
    return JWT_SECRET;
  }
  throw new Error('JWT secret is not accessible in production');
};
