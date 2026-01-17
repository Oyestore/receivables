import '@testing-library/jest-dom';

// Mock our custom auth hook
jest.mock('./hooks/useAuth', () => {
  const { useState, useEffect } = jest.requireActual('react');
  
  return {
    useAuth: () => {
      const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
      
      useEffect(() => {
        const handleStorageChange = () => {
          setToken(localStorage.getItem('auth_token'));
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
      }, []);

      const signOut = () => {
        localStorage.removeItem('auth_token');
        setToken(null);
      };

      return {
        user: null,
        token,
        isLoading: false,
        error: null,
        isAuthenticated: !!token,
        signIn: jest.fn().mockResolvedValue(true),
        signInWithSocial: jest.fn(),
        signOut,
        sendOTP: jest.fn().mockResolvedValue({ success: true, message: 'OTP sent' }),
        clearError: jest.fn(),
        refreshToken: jest.fn().mockResolvedValue(true),
        login: jest.fn().mockResolvedValue(true),
      };
    },
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    useRequireAuth: jest.fn(() => ({ isLoading: false, isAuthenticated: false, isAuthorized: false })),
    usePermissions: jest.fn(() => ({
      hasPermission: jest.fn(() => false),
      hasAnyPermission: jest.fn(() => false),
      hasAllPermissions: jest.fn(() => false),
      permissions: [],
    })),
  };
});

// Mock fetch
global.fetch = jest.fn();

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
