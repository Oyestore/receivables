import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyToken, generateTokenPair, JWTPayload, extractTokenFromHeader } from '../lib/jwt';
import { UserDatabase } from '../lib/database';

// User interface
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  mobile?: string;
  permissions: string[];
  lastLogin?: Date;
  isActive: boolean;
}

// Auth context interface
export interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  signIn: (mobile: string, otp: string) => Promise<boolean>;
  signInWithSocial: (provider: string) => Promise<void>;
  signOut: () => void;
  sendOTP: (mobile: string) => Promise<{ success: boolean; message: string; otp?: string }>;
  clearError: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshTokenState, setRefreshTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedRefreshToken = localStorage.getItem('refresh_token');
    
    if (storedToken) {
      try {
        // Verify token and get user data
        const payload = verifyToken(storedToken);
        
        // Fetch user from database
        const fetchUser = async () => {
          try {
            const userData = await UserDatabase.findById(payload.userId);
            if (userData && userData.isActive) {
              setUser(userData);
              setToken(storedToken);
              setRefreshTokenState(storedRefreshToken);
            } else {
              // User not found or inactive, clear tokens
              clearTokens();
            }
          } catch (error) {
            console.error('Failed to fetch user:', error);
            clearTokens();
          } finally {
            setIsLoading(false);
          }
        };
        
        fetchUser();
      } catch (error) {
        // Token is invalid, clear it
        clearTokens();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const clearTokens = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setRefreshTokenState(null);
    setUser(null);
  };

  const clearError = () => {
    setError(null);
  };

  const signIn = async (mobile: string, otp: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile, otp }),
      });

      const data = await response.json();

      if (data.success && data.user && data.tokens) {
        // Store tokens
        localStorage.setItem('auth_token', data.tokens.accessToken);
        localStorage.setItem('refresh_token', data.tokens.refreshToken);
        
        setToken(data.tokens.accessToken);
        setRefreshTokenState(data.tokens.refreshToken);
        setUser(data.user);
        
        return true;
      } else {
        setError(data.message || 'Sign in failed');
        return false;
      }
    } catch (error) {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithSocial = async (provider: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Redirect to OAuth provider
      window.location.href = `/api/auth/signin/${provider}`;
    } catch (error) {
      setError('Social login failed');
      setIsLoading(false);
    }
  };

  const signOut = () => {
    clearTokens();
    navigate('/auth/signin');
  };

  const sendOTP = async (mobile: string): Promise<{ success: boolean; message: string; otp?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobile }),
      });

      const data = await response.json();
      
      if (data.success) {
        return data;
      } else {
        setError(data.message || 'Failed to send OTP');
        return { success: false, message: data.message || 'Failed to send OTP' };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please try again.';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    if (!refreshTokenState) {
      return false;
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenState }),
      });

      const data = await response.json();

      if (data.success && data.accessToken) {
        localStorage.setItem('auth_token', data.accessToken);
        setToken(data.accessToken);
        return true;
      } else {
        // Refresh token is invalid, clear everything
        clearTokens();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearTokens();
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    refreshToken: refreshTokenState,
    isLoading,
    error,
    isAuthenticated: !!user && !!token,
    signIn,
    signInWithSocial,
    signOut,
    sendOTP,
    clearError,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook to require authentication
export const useRequireAuth = (redirectUrl: string = '/auth/signin') => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectUrl);
    }
  }, [isAuthenticated, isLoading, navigate, redirectUrl]);

  return { isLoading, isAuthenticated };
};

// Hook to check permissions
export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission) || user.permissions.includes('ALL');
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    return permissions.every(permission => hasPermission(permission));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: user?.permissions || [],
  };
};
