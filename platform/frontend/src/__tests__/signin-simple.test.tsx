import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import SignIn from '../pages/auth/signin-new';

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
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('SignIn Component - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sign-in form', () => {
    render(<SignIn />, { wrapper: createWrapper() });

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Quick Login')).toBeInTheDocument();
    expect(screen.getByText('Social Login')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    render(<SignIn />, { wrapper: createWrapper() });

    // Should start on Quick Login tab
    expect(screen.getByPlaceholderText('+1234567890')).toBeInTheDocument();

    // Switch to Social Login
    fireEvent.click(screen.getByText('Social Login'));
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();

    // Switch to Email
    fireEvent.click(screen.getByText('Email'));
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('validates mobile number input', () => {
    render(<SignIn />, { wrapper: createWrapper() });

    const mobileInput = screen.getByPlaceholderText('+1234567890');
    const sendButton = screen.getByText('Send OTP');

    // Empty mobile should disable button
    expect(sendButton).toBeDisabled();

    // Invalid mobile should disable button
    fireEvent.change(mobileInput, { target: { value: '123' } });
    expect(sendButton).toBeDisabled();

    // Valid mobile should enable button
    fireEvent.change(mobileInput, { target: { value: '+1234567890' } });
    expect(sendButton).toBeEnabled();
  });

  it('sends OTP when valid mobile is provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'OTP sent', otp: '123456' })
    });

    render(<SignIn />, { wrapper: createWrapper() });

    const mobileInput = screen.getByPlaceholderText('+1234567890');
    const sendButton = screen.getByText('Send OTP');

    fireEvent.change(mobileInput, { target: { value: '+1234567890' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '+1234567890' })
      });
    });

    expect(screen.getByText('OTP sent successfully')).toBeInTheDocument();
  });

  it('shows development OTP in test environment', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'OTP sent', otp: '123456' })
    });

    render(<SignIn />, { wrapper: createWrapper() });

    const mobileInput = screen.getByPlaceholderText('+1234567890');
    const sendButton = screen.getByText('Send OTP');

    fireEvent.change(mobileInput, { target: { value: '+1234567890' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Development OTP: 123456')).toBeInTheDocument();
    });
  });

  it('handles OTP send failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<SignIn />, { wrapper: createWrapper() });

    const mobileInput = screen.getByPlaceholderText('+1234567890');
    const sendButton = screen.getByText('Send OTP');

    fireEvent.change(mobileInput, { target: { value: '+1234567890' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to send OTP/)).toBeInTheDocument();
    });
  });

  it('shows social login buttons', () => {
    render(<SignIn />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Social Login'));

    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByText('Continue with Microsoft')).toBeInTheDocument();
    expect(screen.getByText('Continue with LinkedIn')).toBeInTheDocument();

    // Microsoft and LinkedIn should be disabled
    expect(screen.getByText('Continue with Microsoft')).toBeDisabled();
    expect(screen.getByText('Continue with LinkedIn')).toBeDisabled();
  });

  it('shows email login form', () => {
    render(<SignIn />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Email'));

    // Just check that the component renders without crashing
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your SME Platform account')).toBeInTheDocument();
  });

  it('shows back button after OTP is sent', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'OTP sent' })
    });

    render(<SignIn />, { wrapper: createWrapper() });

    const mobileInput = screen.getByPlaceholderText('+1234567890');
    const sendButton = screen.getByText('Send OTP');

    fireEvent.change(mobileInput, { target: { value: '+1234567890' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Back to Mobile Number')).toBeInTheDocument();
    });
  });
});
