// Comprehensive input validation system for SME Platform

import { UserRole } from '../types/auth.types';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'uuid' | 'date' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => string | null;
  sanitize?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitized?: any;
}

// Validation patterns
export const PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  MOBILE_IN: /^[6-9]\d{9}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  AMOUNT: /^\d{1,12}(\.\d{1,2})?$/,
  INVOICE_NUMBER: /^[A-Z]{2,4}-\d{6,8}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9]{1}$/,
};

// Sanitization functions
export const sanitizeString = (value: string): string => {
  return value
    .trim()
    .replace(/<\/?[^>]+(>|$)/g, '') // Remove HTML tags completely
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

export const sanitizeNumber = (value: any): number | null => {
  const num = Number(value);
  return isNaN(num) ? null : num;
};

export const sanitizeEmail = (value: string): string => {
  return value.toLowerCase().trim();
};

export const sanitizePhone = (value: string): string => {
  // Remove all non-digit characters except +
  return value.replace(/[^\d+]/g, '');
};

// Validation functions
export const validateEmail = (email: string): boolean => {
  return PATTERNS.EMAIL.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Accept various phone formats
  const cleanedPhone = phone.replace(/[^\d+]/g, '');
  return PATTERNS.PHONE.test(cleanedPhone) || PATTERNS.PHONE.test(phone);
};

export const validateUUID = (uuid: string): boolean => {
  return PATTERNS.UUID.test(uuid);
};

export const validatePassword = (password: string): boolean => {
  return PATTERNS.PASSWORD.test(password);
};

export const validateAmount = (amount: string | number): boolean => {
  return PATTERNS.AMOUNT.test(String(amount));
};

export const validateMobileIN = (mobile: string): boolean => {
  return PATTERNS.MOBILE_IN.test(mobile);
};

// Main validation class
export class InputValidator {
  private rules: ValidationRule[] = [];

  constructor(rules: ValidationRule[] = []) {
    this.rules = rules;
  }

  // Add validation rule
  addRule(rule: ValidationRule): InputValidator {
    this.rules.push(rule);
    return this;
  }

  // Add multiple rules
  addRules(rules: ValidationRule[]): InputValidator {
    this.rules.push(...rules);
    return this;
  }

  // Validate data against rules
  validate(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const sanitized: any = {};

    for (const rule of this.rules) {
      const value = data[rule.field];
      let processedValue = value;

      // Check if field is required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: rule.field,
          message: `${rule.field} is required`,
          value,
        });
        continue;
      }

      // Skip validation if field is not required and empty
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Type validation
      if (rule.type) {
        const typeError = this.validateType(rule.field, value, rule.type);
        if (typeError) {
          errors.push(typeError);
          continue;
        }
      }

      // String validations
      if (typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be at least ${rule.minLength} characters long`,
            value,
          });
        }

        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must not exceed ${rule.maxLength} characters`,
            value,
          });
        }

        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push({
            field: rule.field,
            message: `${rule.field} format is invalid`,
            value,
          });
        }
      }

      // Number validations
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be at least ${rule.min}`,
            value,
          });
        }

        if (rule.max !== undefined && value > rule.max) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must not exceed ${rule.max}`,
            value,
          });
        }
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be one of: ${rule.enum.join(', ')}`,
          value,
        });
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value);
        if (customError) {
          errors.push({
            field: rule.field,
            message: customError,
            value,
          });
        }
      }

      // Sanitization
      if (rule.sanitize) {
        processedValue = this.sanitizeValue(value, rule.type);
      }

      sanitized[rule.field] = processedValue;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: Object.keys(sanitized).length > 0 ? sanitized : undefined,
    };
  }

  private validateType(field: string, value: any, type: string): ValidationError | null {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            field,
            message: `${field} must be a string`,
            value,
          };
        }
        break;
      case 'number':
        if (typeof value !== 'number' && typeof value !== 'string') {
          return {
            field,
            message: `${field} must be a number`,
            value,
          };
        }
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return {
            field,
            message: `${field} must be a valid number`,
            value,
          };
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field,
            message: `${field} must be a boolean`,
            value,
          };
        }
        break;
      case 'email':
        if (typeof value !== 'string' || !validateEmail(value)) {
          return {
            field,
            message: `${field} must be a valid email address`,
            value,
          };
        }
        break;
      case 'phone':
        if (typeof value !== 'string' || !validatePhone(value)) {
          return {
            field,
            message: `${field} must be a valid phone number`,
            value,
          };
        }
        break;
      case 'uuid':
        if (typeof value !== 'string' || !validateUUID(value)) {
          return {
            field,
            message: `${field} must be a valid UUID`,
            value,
          };
        }
        break;
      case 'date':
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
          return {
            field,
            message: `${field} must be a valid date`,
            value,
          };
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          return {
            field,
            message: `${field} must be an array`,
            value,
          };
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          return {
            field,
            message: `${field} must be an object`,
            value,
          };
        }
        break;
    }
    return null;
  }

  private sanitizeValue(value: any, type?: string): any {
    switch (type) {
      case 'string':
      case 'email':
        if (type === 'email') {
          return sanitizeEmail(value);
        }
        return sanitizeString(value);
      case 'phone':
        return sanitizePhone(value);
      case 'number':
        return sanitizeNumber(value);
      default:
        return value;
    }
  }
}

// Predefined validation schemas
export const VALIDATION_SCHEMAS = {
  // User management validation
  USER_CREATE: [
    { field: 'name', required: true, type: 'string' as const, minLength: 2, maxLength: 100, sanitize: true },
    { field: 'email', required: true, type: 'email' as const, maxLength: 255, sanitize: true },
    { field: 'mobile', required: true, type: 'phone' as const, sanitize: true },
    { field: 'role', required: true, type: 'string' as const, enum: Object.values(UserRole) },
    { field: 'tenantId', required: true, type: 'uuid' as const },
  ],

  // User update validation
  USER_UPDATE: [
    { field: 'name', required: false, type: 'string' as const, minLength: 2, maxLength: 100, sanitize: true },
    { field: 'email', required: false, type: 'email' as const, maxLength: 255, sanitize: true },
    { field: 'mobile', required: false, type: 'phone' as const, sanitize: true },
    { field: 'role', required: false, type: 'string' as const, enum: Object.values(UserRole) },
    { field: 'isActive', required: false, type: 'boolean' as const },
  ],

  // OTP validation
  OTP_SEND: [
    { field: 'mobile', required: true, type: 'phone' as const, sanitize: true },
  ],

  OTP_VERIFY: [
    { field: 'mobile', required: true, type: 'phone' as const, sanitize: true },
    { field: 'otp', required: true, type: 'string' as const, minLength: 6, maxLength: 6, pattern: /^\d{6}$/ },
  ],

  // Invoice validation
  INVOICE_CREATE: [
    { field: 'invoiceNumber', required: true, type: 'string' as const, maxLength: 50, pattern: PATTERNS.INVOICE_NUMBER, sanitize: true },
    { field: 'customerName', required: true, type: 'string' as const, minLength: 2, maxLength: 200, sanitize: true },
    { field: 'customerEmail', required: false, type: 'email' as const, maxLength: 255, sanitize: true },
    { field: 'customerPhone', required: false, type: 'phone' as const, sanitize: true },
    { field: 'amount', required: true, type: 'number' as const, min: 0.01, max: 999999999.99 },
    { field: 'dueDate', required: true, type: 'date' as const },
    { field: 'description', required: false, type: 'string' as const, maxLength: 1000, sanitize: true },
    { field: 'tenantId', required: true, type: 'uuid' as const },
  ],

  // Payment validation
  PAYMENT_CREATE: [
    { field: 'invoiceId', required: true, type: 'uuid' as const },
    { field: 'amount', required: true, type: 'number' as const, min: 0.01, max: 999999999.99 },
    { field: 'paymentDate', required: true, type: 'date' as const },
    { field: 'paymentMethod', required: true, type: 'string' as const, enum: ['CASH', 'CHEQUE', 'BANK_TRANSFER', 'ONLINE', 'UPI'] },
    { field: 'reference', required: false, type: 'string' as const, maxLength: 100, sanitize: true },
    { field: 'notes', required: false, type: 'string' as const, maxLength: 500, sanitize: true },
    { field: 'tenantId', required: true, type: 'uuid' as const },
  ],

  // Dispute validation
  DISPUTE_CREATE: [
    { field: 'invoiceId', required: true, type: 'uuid' as const },
    { field: 'reason', required: true, type: 'string' as const, minLength: 10, maxLength: 1000, sanitize: true },
    { field: 'category', required: true, type: 'string' as const, enum: ['AMOUNT', 'DUPLICATE', 'SERVICE', 'TIMING', 'OTHER'] },
    { field: 'priority', required: true, type: 'string' as const, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
    { field: 'attachments', required: false, type: 'array' as const },
  ],

  // Credit scoring validation
  CREDIT_SCORE_REQUEST: [
    { field: 'businessId', required: true, type: 'uuid' as const },
    { field: 'pan', required: true, type: 'string' as const, pattern: PATTERNS.PAN, sanitize: true },
    { field: 'gstin', required: false, type: 'string' as const, pattern: PATTERNS.GSTIN, sanitize: true },
    { field: 'businessType', required: true, type: 'string' as const, enum: ['PROPRIETORSHIP', 'PARTNERSHIP', 'PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'LLP'] },
    { field: 'annualRevenue', required: true, type: 'number' as const, min: 0 },
    { field: 'yearsInBusiness', required: true, type: 'number' as const, min: 0, max: 100 },
  ],

  // Financing application validation
  FINANCING_APPLICATION: [
    { field: 'businessId', required: true, type: 'uuid' as const },
    { field: 'loanAmount', required: true, type: 'number' as const, min: 10000, max: 10000000 },
    { field: 'loanPurpose', required: true, type: 'string' as const, minLength: 10, maxLength: 500, sanitize: true },
    { field: 'tenureMonths', required: true, type: 'number' as const, min: 1, max: 60 },
    { field: 'collateralType', required: false, type: 'string' as const, enum: ['NONE', 'INVENTORY', 'RECEIVABLES', 'PROPERTY', 'EQUIPMENT'] },
    { field: 'collateralValue', required: false, type: 'number' as const, min: 0 },
  ],

  // Query validation
  PAGINATION_QUERY: [
    { field: 'page', required: false, type: 'number' as const, min: 1, max: 1000 },
    { field: 'limit', required: false, type: 'number' as const, min: 1, max: 100 },
    { field: 'sortBy', required: false, type: 'string' as const, maxLength: 50, sanitize: true },
    { field: 'sortOrder', required: false, type: 'string' as const, enum: ['asc', 'desc'] },
    { field: 'search', required: false, type: 'string' as const, maxLength: 100, sanitize: true },
  ],

  // Tenant validation
  TENANT_CREATE: [
    { field: 'name', required: true, type: 'string' as const, minLength: 2, maxLength: 200, sanitize: true },
    { field: 'domain', required: true, type: 'string' as const, minLength: 3, maxLength: 100, pattern: /^[a-z0-9-]+$/, sanitize: true },
    { field: 'industry', required: false, type: 'string' as const, maxLength: 100, sanitize: true },
    { field: 'size', required: false, type: 'string' as const, enum: ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'] },
    { field: 'ownerName', required: true, type: 'string' as const, minLength: 2, maxLength: 100, sanitize: true },
    { field: 'ownerEmail', required: true, type: 'email' as const, maxLength: 255, sanitize: true },
    { field: 'ownerMobile', required: true, type: 'phone' as const, sanitize: true },
  ],
};

// Validation middleware factory
export const createValidationMiddleware = (schema: ValidationRule[]) => {
  return (req: any, res: any, next: any) => {
    const validator = new InputValidator(schema);
    const data = req.method === 'GET' ? req.query : req.body;
    
    const result = validator.validate(data);
    
    if (!result.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: result.errors,
      });
    }
    
    // Update request with sanitized data
    if (result.sanitized) {
      if (req.method === 'GET') {
        req.query = { ...data, ...result.sanitized };
      } else {
        req.body = { ...data, ...result.sanitized };
      }
    }
    
    next();
  };
};

// Quick validation functions
export const quickValidate = {
  email: (email: string): boolean => validateEmail(email),
  phone: (phone: string): boolean => validatePhone(phone),
  uuid: (uuid: string): boolean => validateUUID(uuid),
  password: (password: string): boolean => validatePassword(password),
  amount: (amount: string | number): boolean => validateAmount(amount),
  mobileIN: (mobile: string): boolean => validateMobileIN(mobile),
};

// Sanitization utilities
export const sanitize = {
  string: sanitizeString,
  number: sanitizeNumber,
  email: sanitizeEmail,
  phone: sanitizePhone,
};

export default InputValidator;
