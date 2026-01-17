import { AuthConfig } from '@auth/core';
import Google from '@auth/core/providers/google';
import CredentialsProvider from '@auth/core/providers/credentials';
import { UserDatabase, OTPStore } from './lib/database';
import { generateTokenPair, verifyToken, JWTPayload } from './lib/jwt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Custom user interface
interface CustomUser {
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

// Mock user database (fallback when database is not available)
const mockUsers = new Map<string, CustomUser>();

// Helper function to validate mobile number
const validateMobile = (mobile: string): boolean => {
  const mobileRegex = /^\+\d{10,15}$/;
  return mobileRegex.test(mobile);
};

// Helper function to generate OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to generate user permissions based on role
const generatePermissions = (role: string): string[] => {
  const rolePermissions: Record<string, string[]> = {
    sme_owner: ['INVOICE_CREATE', 'PAYMENT_VIEW', 'ANALYTICS_VIEW', 'CUSTOMER_MANAGE'],
    accountant: ['INVOICE_VIEW', 'PAYMENT_MANAGE', 'REPORT_GENERATE'],
    admin: ['ALL'],
    viewer: ['INVOICE_VIEW', 'PAYMENT_VIEW'],
  };
  
  return rolePermissions[role] || [];
};

// Helper function to create or get user
const createOrGetUser = async (mobile: string): Promise<CustomUser> => {
  try {
    // Try database first
    let user = await UserDatabase.findByMobile(mobile);
    
    if (!user) {
      // Create new user
      const newUser = {
        email: `user_${mobile.replace(/[^\d]/g, '')}@smeplatform.com`,
        name: `User ${mobile}`,
        role: 'sme_owner', // Default role
        tenantId: `tenant_${Date.now()}`,
        mobile,
        permissions: generatePermissions('sme_owner'),
        lastLogin: new Date(),
        isActive: true,
      };
      
      user = await UserDatabase.upsert(newUser);
    } else {
      // Update last login
      await UserDatabase.update(user.id, { lastLogin: new Date() });
    }
    
    return user;
  } catch (error) {
    console.error('Database operation failed, using fallback:', error);
    
    // Fallback to mock storage
    const mockUser: CustomUser = {
      id: `user_${Date.now()}`,
      email: `user_${mobile.replace(/[^\d]/g, '')}@smeplatform.com`,
      name: `User ${mobile}`,
      role: 'sme_owner',
      tenantId: `tenant_${Date.now()}`,
      mobile,
      permissions: generatePermissions('sme_owner'),
      lastLogin: new Date(),
      isActive: true,
    };
    
    mockUsers.set(mobile, mockUser);
    return mockUser;
  }
};

// OTP API functions
export const otpAPI = {
  sendOTP: async (mobile: string) => {
    if (!validateMobile(mobile)) {
      throw new Error('Invalid mobile number format');
    }

    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    try {
      // Store OTP in Redis/database
      await OTPStore.store(mobile, otp, expires);
      
      // In production, send SMS via AWS SNS/Twilio
      console.log(`🔐 Mock OTP for ${mobile}: ${otp}`);
      
      return {
        success: true,
        message: 'OTP sent successfully',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined, // Only show OTP in development
      };
    } catch (error) {
      console.error('Failed to send OTP:', error);
      throw new Error('Failed to send OTP');
    }
  },

  verifyOTP: async (mobile: string, otp: string) => {
    if (!validateMobile(mobile)) {
      throw new Error('Invalid mobile number format');
    }

    if (!/^\d{6}$/.test(otp)) {
      throw new Error('Invalid OTP format');
    }

    try {
      // Get OTP from Redis/database
      const otpData = await OTPStore.get(mobile);
      
      if (!otpData) {
        throw new Error('OTP not found or expired');
      }

      // Check if OTP is expired
      if (new Date() > new Date(otpData.expires)) {
        await OTPStore.delete(mobile);
        throw new Error('OTP has expired');
      }

      // Check attempts
      if (otpData.attempts >= 3) {
        await OTPStore.delete(mobile);
        throw new Error('Maximum attempts reached');
      }

      // Verify OTP
      if (otpData.otp !== otp) {
        await OTPStore.incrementAttempts(mobile);
        throw new Error('Invalid OTP');
      }

      // OTP is valid, create or get user
      const user = await createOrGetUser(mobile);
      
      // Clean up OTP
      await OTPStore.delete(mobile);

      // Generate JWT tokens
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        permissions: user.permissions,
      };

      const tokens = generateTokenPair(payload);

      return {
        success: true,
        message: 'OTP verified successfully',
        user,
        tokens,
      };
    } catch (error) {
      console.error('Failed to verify OTP:', error);
      throw error;
    }
  },
};

// Auth.js configuration
export const authConfig: AuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret',
    }),
    CredentialsProvider({
      name: 'mobile-otp',
      credentials: {
        mobile: { label: 'Mobile Number', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials: any) {
        if (!credentials?.mobile || !credentials?.otp) {
          return null;
        }

        try {
          const result = await otpAPI.verifyOTP(credentials.mobile, credentials.otp);
          
          if (result.success && result.user) {
            return {
              id: result.user.id,
              email: result.user.email,
              name: result.user.name,
              role: result.user.role,
              tenantId: result.user.tenantId,
              mobile: result.user.mobile,
              permissions: result.user.permissions,
              lastLogin: result.user.lastLogin,
              isActive: result.user.isActive,
            };
          }
        } catch (error) {
          console.error('Authorization failed:', error);
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }: any) {
      // Persist the OAuth access_token and user id to the token right after signin
      if (account && user) {
        return {
          ...token,
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          mobile: user.mobile,
          permissions: user.permissions,
        };
      }
      return token;
    },
    async session({ session, token }: any) {
      // Send properties and values to the client, like an access_token from a provider
      if (token) {
        session.user = {
          id: token.userId,
          email: token.email,
          name: token.name,
          role: token.role,
          tenantId: token.tenantId,
          mobile: token.mobile,
          permissions: token.permissions,
        };
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};
