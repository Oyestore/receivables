import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../hooks/useAuth';

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('provides initial auth state', () => {
    const TestComponent = () => {
      const { isAuthenticated, user, token, isLoading, error } = useAuth();
      return (
        <div>
          <span data-testid="is-authenticated">{isAuthenticated.toString()}</span>
          <span data-testid="has-user">{user ? 'yes' : 'no'}</span>
          <span data-testid="has-token">{token ? 'yes' : 'no'}</span>
          <span data-testid="is-loading">{isLoading.toString()}</span>
          <span data-testid="error">{error || 'no-error'}</span>
        </div>
      );
    };

    render(<TestComponent />, { wrapper: createWrapper() });

    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('has-user')).toHaveTextContent('no');
    expect(screen.getByTestId('has-token')).toHaveTextContent('no');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  it('loads token from localStorage on mount', () => {
    localStorage.setItem('auth_token', 'test-token');

    const TestComponent = () => {
      const { token } = useAuth();
      return <span data-testid="token">{token || 'no-token'}</span>;
    };

    render(<TestComponent />, { wrapper: createWrapper() });

    expect(screen.getByTestId('token')).toHaveTextContent('test-token');
  });

  it('provides auth functions', () => {
    const TestComponent = () => {
      const { signIn, signOut, sendOTP, clearError, isAuthenticated } = useAuth();
      return (
        <div>
          <span data-testid="has-sign-in">{typeof signIn === 'function' ? 'yes' : 'no'}</span>
          <span data-testid="has-sign-out">{typeof signOut === 'function' ? 'yes' : 'no'}</span>
          <span data-testid="has-send-otp">{typeof sendOTP === 'function' ? 'yes' : 'no'}</span>
          <span data-testid="has-clear-error">{typeof clearError === 'function' ? 'yes' : 'no'}</span>
          <span data-testid="is-authenticated">{isAuthenticated.toString()}</span>
        </div>
      );
    };

    render(<TestComponent />, { wrapper: createWrapper() });

    expect(screen.getByTestId('has-sign-in')).toHaveTextContent('yes');
    expect(screen.getByTestId('has-sign-out')).toHaveTextContent('yes');
    expect(screen.getByTestId('has-send-otp')).toHaveTextContent('yes');
    expect(screen.getByTestId('has-clear-error')).toHaveTextContent('yes');
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
  });

  it('handles sign out correctly', () => {
    localStorage.setItem('auth_token', 'test-token');

    const TestComponent = () => {
      const { signOut, token } = useAuth();
      return (
        <div>
          <span data-testid="token">{token || 'no-token'}</span>
          <button onClick={signOut}>Sign Out</button>
        </div>
      );
    };

    render(<TestComponent />, { wrapper: createWrapper() });

    // Initially has token
    expect(screen.getByTestId('token')).toHaveTextContent('test-token');

    // Sign out
    act(() => {
      screen.getByText('Sign Out').click();
    });

    // Token should be removed
    expect(screen.getByTestId('token')).toHaveTextContent('no-token');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('clears error when clearError is called', () => {
    const TestComponent = () => {
      const { error, clearError } = useAuth();
      return (
        <div>
          <span data-testid="error">{error || 'no-error'}</span>
          <button onClick={clearError}>Clear Error</button>
        </div>
      );
    };

    render(<TestComponent />, { wrapper: createWrapper() });

    expect(screen.getByTestId('error')).toHaveTextContent('no-error');

    // Clear error (should not throw)
    act(() => {
      screen.getByText('Clear Error').click();
    });

    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });
});
