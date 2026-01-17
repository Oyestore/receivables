import { Plugin } from 'vite';
import { otpAPI } from '../auth';
import { verifyToken } from './jwt';
import { UserDatabase, initializeDatabase } from './database';
import { AuthorizationService, initializeAuthorization, Permission } from './authorization';
import { User as AuthUser, UserRole } from '../types/auth.types';
import Redis from 'ioredis';
import { IncomingMessage } from 'http';

// Extended request interface
interface AuthenticatedRequest extends IncomingMessage {
  user: AuthUser;
  headers: any;
  method: string;
  url: string;
  body?: any;
  query?: any;
}

export function authPlugin(): Plugin {
  let authService: AuthorizationService;
  let userDb: UserDatabase;
  let redis: Redis;

  return {
    name: 'auth-plugin',
    configureServer(server) {
      // Initialize services
      const initializeServices = async () => {
        try {
          redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
          await initializeDatabase();
          authService = initializeAuthorization(redis);
        } catch (error) {
          console.error('Failed to initialize auth services:', error);
        }
      };

      initializeServices();

      // Authentication middleware
      const authenticate = async (req: any, res: any, next: any) => {
        try {
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
          }

          const token = authHeader.substring(7);
          const decoded = verifyToken(token);
          
          if (!decoded || !decoded.userId) {
            return res.status(401).json({ error: 'Invalid token' });
          }

          // Get user from database
          const dbUser = await UserDatabase.findById(decoded.userId);
          if (!dbUser) {
            return res.status(401).json({ error: 'User not found' });
          }

          // Convert database user to auth user
          const authUser: AuthUser = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role as UserRole,
            tenantId: dbUser.tenantId,
            mobile: dbUser.mobile,
            permissions: dbUser.permissions,
            lastLogin: dbUser.lastLogin,
            isActive: dbUser.isActive,
          };

          req.user = authUser;
          next();
        } catch (error) {
          return res.status(401).json({ error: 'Authentication failed' });
        }
      };

      // Authorization middleware
      const authorize = (permission: Permission) => {
        return async (req: any, res: any, next: any) => {
          try {
            if (!authService) {
              return res.status(500).json({ error: 'Authorization service not available' });
            }

            const hasPermission = await authService.hasPermission(req.user, permission);
            if (!hasPermission) {
              return res.status(403).json({ 
                error: 'Insufficient permissions',
                required: permission,
              });
            }

            next();
          } catch (error) {
            console.error('Authorization error:', error);
            res.status(500).json({ error: 'Authorization check failed' });
          }
        };
      };

      server.middlewares.use('/api/auth', async (req, res, next) => {
        if (!req.url) return next();

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const path = url.pathname.replace('/api/auth', '');

          // Helper to read request body
          const readBody = async (req: any): Promise<any> => {
            return new Promise((resolve) => {
              let body = '';
              req.on('data', (chunk: any) => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  resolve(JSON.parse(body));
                } catch {
                  resolve({});
                }
              });
            });
          };

          // Handle OTP endpoints
          if (path === '/send-otp' && req.method === 'POST') {
            const data = await readBody(req);
            
            try {
              const result = await otpAPI.sendOTP(data.mobile);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                message: error instanceof Error ? error.message : 'Failed to send OTP' 
              }));
            }
            return;
          }

          if (path === '/verify-otp' && req.method === 'POST') {
            const data = await readBody(req);
            
            try {
              const result = await otpAPI.verifyOTP(data.mobile, data.otp);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                message: error instanceof Error ? error.message : 'Failed to verify OTP' 
              }));
            }
            return;
          }

          // Handle refresh token endpoint
          if (path === '/refresh' && req.method === 'POST') {
            const data = await readBody(req);
            
            try {
              // Mock refresh token implementation
              // In production, this would validate the refresh token and issue a new access token
              const mockAccessToken = `mock_access_token_${Date.now()}`;
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                accessToken: mockAccessToken,
                expiresIn: 24 * 60 * 60, // 24 hours
              }));
            } catch (error) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                success: false, 
                message: 'Invalid refresh token' 
              }));
            }
            return;
          }

          // Handle Auth.js endpoints (simplified version)
          if (path === '/session' && req.method === 'GET') {
            // Mock session endpoint
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(null));
            return;
          }

          if (path === '/signout' && req.method === 'POST') {
            // Mock signout endpoint
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Signed out successfully' }));
            return;
          }

          if (path === '/providers' && req.method === 'GET') {
            // Mock providers endpoint
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              providers: [
                { id: 'google', name: 'Google' },
                { id: 'mobile-otp', name: 'Mobile OTP' }
              ]
            }));
            return;
          }

          // Authorization endpoints
          if (path === '/permissions/check' && req.method === 'POST') {
            await authenticate(req, res, async () => {
              const data = await readBody(req);
              const permission = data.permission as Permission;
              
              if (!authService) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Authorization service not available' }));
                return;
              }

              try {
                const hasPermission = await authService.hasPermission((req as AuthenticatedRequest).user, permission);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                  hasPermission,
                  permission,
                  userId: (req as AuthenticatedRequest).user.id,
                }));
              } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Permission check failed' }));
              }
            });
            return;
          }

          if (path === '/permissions/user/:userId' && req.method === 'GET') {
            await authenticate(req, res, async () => {
              await authorize(Permission.USER_READ)(req, res, async () => {
                const pathParts = url.pathname.split('/');
                const userId = pathParts[pathParts.length - 1];
                
                if (!authService || !userId) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Invalid request or service unavailable' }));
                  return;
                }

                try {
                  const targetUser = await UserDatabase.findById(userId);
                  if (!targetUser) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'User not found' }));
                    return;
                  }

                  // Convert to auth user type
                  const authTargetUser: AuthUser = {
                    id: targetUser.id,
                    email: targetUser.email,
                    name: targetUser.name,
                    role: targetUser.role as UserRole,
                    tenantId: targetUser.tenantId,
                    mobile: targetUser.mobile,
                    permissions: targetUser.permissions,
                    lastLogin: targetUser.lastLogin,
                    isActive: targetUser.isActive,
                  };

                  try {
                    const userPermissions = await authService.getUserPermissions((req as AuthenticatedRequest).user);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                      userId: (req as AuthenticatedRequest).user.id,
                      permissions: userPermissions,
                    }));
                  } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to get user permissions' }));
                  }
                } catch (error) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Failed to get user permissions' }));
                }
              });
            });
            return;
          }

          if (path === '/roles/user/:userId' && req.method === 'GET') {
            await authenticate(req, res, async () => {
              await authorize(Permission.USER_READ)(req, res, async () => {
                const pathParts = url.pathname.split('/');
                const userId = pathParts[pathParts.length - 1];
                
                if (!userId) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'User ID is required' }));
                  return;
                }

                try {
                  const user = await UserDatabase.findById(userId);
                  if (!user) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'User not found' }));
                    return;
                  }

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    userId: user.id,
                    role: user.role,
                    tenantId: user.tenantId,
                  }));
                } catch (error) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Failed to get user role' }));
                }
              });
            });
            return;
          }

          if (path === '/permissions/resource' && req.method === 'POST') {
            await authenticate(req, res, async () => {
              const data = await readBody(req);
              
              if (!authService) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Authorization service not available' }));
                return;
              }

              try {
                const canAccess = await authService.canAccessResource(
                  (req as AuthenticatedRequest).user,
                  data.resource,
                  data.action,
                  data.resourceId,
                  data.resourceOwnerId
                );

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  canAccess,
                  resource: data.resource,
                  action: data.action,
                  resourceId: data.resourceId,
                }));
              } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Resource access check failed' }));
              }
            });
            return;
          }

          next();
        } catch (error) {
          console.error('Auth middleware error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      });
    },
  };
}
