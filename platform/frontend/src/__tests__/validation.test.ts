import { 
  InputValidator, 
  ValidationRule, 
  ValidationResult,
  PATTERNS,
  VALIDATION_SCHEMAS,
  createValidationMiddleware,
  quickValidate,
  sanitize,
} from '../lib/validation';

describe('InputValidator', () => {
  let validator: InputValidator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  describe('Basic Validation', () => {
    it('should validate required fields', () => {
      validator.addRule({ field: 'email', required: true, type: 'email' });
      
      const result = validator.validate({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'email',
        message: 'email is required',
        value: undefined,
      });
    });

    it('should validate optional fields when empty', () => {
      validator.addRule({ field: 'phone', required: false, type: 'phone' });
      
      const result = validator.validate({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate string type', () => {
      validator.addRule({ field: 'name', required: true, type: 'string' });
      
      const result = validator.validate({ name: 123 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'name must be a string',
        value: 123,
      });
    });

    it('should validate number type', () => {
      validator.addRule({ field: 'age', required: true, type: 'number' });
      
      const result = validator.validate({ age: 'not-a-number' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'age',
        message: 'age must be a valid number',
        value: 'not-a-number',
      });
    });

    it('should validate boolean type', () => {
      validator.addRule({ field: 'active', required: true, type: 'boolean' });
      
      const result = validator.validate({ active: 'true' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'active',
        message: 'active must be a boolean',
        value: 'true',
      });
    });

    it('should validate array type', () => {
      validator.addRule({ field: 'tags', required: true, type: 'array' });
      
      const result = validator.validate({ tags: 'not-an-array' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'tags',
        message: 'tags must be an array',
        value: 'not-an-array',
      });
    });

    it('should validate object type', () => {
      validator.addRule({ field: 'address', required: true, type: 'object' });
      
      const result = validator.validate({ address: 'not-an-object' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'address',
        message: 'address must be an object',
        value: 'not-an-object',
      });
    });
  });

  describe('String Validation', () => {
    it('should validate minimum length', () => {
      validator.addRule({ field: 'password', required: true, type: 'string', minLength: 8 });
      
      const result = validator.validate({ password: 'short' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'password',
        message: 'password must be at least 8 characters long',
        value: 'short',
      });
    });

    it('should validate maximum length', () => {
      validator.addRule({ field: 'username', required: true, type: 'string', maxLength: 10 });
      
      const result = validator.validate({ username: 'very-long-username' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'username',
        message: 'username must not exceed 10 characters',
        value: 'very-long-username',
      });
    });

    it('should validate pattern', () => {
      validator.addRule({ 
        field: 'postalCode', 
        required: true, 
        type: 'string', 
        pattern: /^\d{5}(-\d{4})?$/ 
      });
      
      const result = validator.validate({ postalCode: 'invalid' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'postalCode',
        message: 'postalCode format is invalid',
        value: 'invalid',
      });
    });
  });

  describe('Number Validation', () => {
    it('should validate minimum value', () => {
      validator.addRule({ field: 'amount', required: true, type: 'number', min: 0 });
      
      const result = validator.validate({ amount: -10 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'amount',
        message: 'amount must be at least 0',
        value: -10,
      });
    });

    it('should validate maximum value', () => {
      validator.addRule({ field: 'age', required: true, type: 'number', max: 120 });
      
      const result = validator.validate({ age: 150 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'age',
        message: 'age must not exceed 120',
        value: 150,
      });
    });
  });

  describe('Enum Validation', () => {
    it('should validate enum values', () => {
      validator.addRule({ 
        field: 'status', 
        required: true, 
        type: 'string', 
        enum: ['ACTIVE', 'INACTIVE', 'PENDING'] 
      });
      
      const result = validator.validate({ status: 'INVALID' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'status',
        message: 'status must be one of: ACTIVE, INACTIVE, PENDING',
        value: 'INVALID',
      });
    });

    it('should accept valid enum values', () => {
      validator.addRule({ 
        field: 'status', 
        required: true, 
        type: 'string', 
        enum: ['ACTIVE', 'INACTIVE', 'PENDING'] 
      });
      
      const result = validator.validate({ status: 'ACTIVE' });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Custom Validation', () => {
    it('should validate custom rules', () => {
      validator.addRule({
        field: 'password',
        required: true,
        type: 'string',
        custom: (value) => {
          if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
            return 'Password must contain at least one lowercase, one uppercase, and one number';
          }
          return null;
        },
      });
      
      const result = validator.validate({ password: 'weak' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'password',
        message: 'Password must contain at least one lowercase, one uppercase, and one number',
        value: 'weak',
      });
    });
  });

  describe('Sanitization', () => {
    it('should sanitize strings', () => {
      validator.addRule({ field: 'comment', required: true, type: 'string', sanitize: true });
      
      const result = validator.validate({ comment: '<script>alert("xss")</script>Hello World' });
      expect(result.isValid).toBe(true);
      expect(result.sanitized?.comment).toBe('alert("xss")Hello World');
    });

    it('should sanitize emails', () => {
      validator.addRule({ field: 'email', required: true, type: 'email', sanitize: true });
      
      const result = validator.validate({ email: 'TEST@EXAMPLE.COM' });
      expect(result.isValid).toBe(true);
      expect(result.sanitized?.email).toBe('test@example.com');
    });

    it('should sanitize phone numbers', () => {
      validator.addRule({ field: 'phone', required: true, type: 'phone', sanitize: true });
      
      const result = validator.validate({ phone: '(555) 123-4567' });
      expect(result.isValid).toBe(true);
      expect(result.sanitized?.phone).toBe('5551234567');
    });

    it('should sanitize numbers', () => {
      validator.addRule({ field: 'amount', required: true, type: 'number', sanitize: true });
      
      const result = validator.validate({ amount: '123.45' });
      expect(result.isValid).toBe(true);
      expect(result.sanitized?.amount).toBe(123.45);
    });
  });

  describe('Multiple Rules', () => {
    it('should validate multiple fields', () => {
      validator.addRules([
        { field: 'email', required: true, type: 'email' },
        { field: 'password', required: true, type: 'string', minLength: 8 },
        { field: 'age', required: true, type: 'number', min: 18, max: 120 },
      ]);
      
      const result = validator.validate({
        email: 'invalid-email',
        password: 'short',
        age: 15,
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.map(e => e.field)).toContain('email');
      expect(result.errors.map(e => e.field)).toContain('password');
      expect(result.errors.map(e => e.field)).toContain('age');
    });

    it('should pass validation with valid data', () => {
      validator.addRules([
        { field: 'email', required: true, type: 'email' },
        { field: 'password', required: true, type: 'string', minLength: 8 },
        { field: 'age', required: true, type: 'number', min: 18, max: 120 },
      ]);
      
      const result = validator.validate({
        email: 'test@example.com',
        password: 'strongpassword',
        age: 25,
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Chaining', () => {
    it('should support method chaining', () => {
      const result = validator
        .addRule({ field: 'email', required: true, type: 'email' })
        .addRule({ field: 'password', required: true, type: 'string', minLength: 8 })
        .validate({
          email: 'test@example.com',
          password: 'strongpassword',
        });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('Validation Patterns', () => {
  it('should validate email patterns', () => {
    expect(PATTERNS.EMAIL.test('test@example.com')).toBe(true);
    expect(PATTERNS.EMAIL.test('invalid-email')).toBe(false);
    expect(PATTERNS.EMAIL.test('test@domain')).toBe(false);
  });

  it('should validate phone patterns', () => {
    expect(PATTERNS.PHONE.test('+1234567890')).toBe(true);
    expect(PATTERNS.PHONE.test('1234567890')).toBe(true);
    expect(PATTERNS.PHONE.test('invalid-phone')).toBe(false);
  });

  it('should validate UUID patterns', () => {
    expect(PATTERNS.UUID.test('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(PATTERNS.UUID.test('invalid-uuid')).toBe(false);
  });

  it('should validate mobile Indian patterns', () => {
    expect(PATTERNS.MOBILE_IN.test('9876543210')).toBe(true);
    expect(PATTERNS.MOBILE_IN.test('1234567890')).toBe(false);
    expect(PATTERNS.MOBILE_IN.test('987654321')).toBe(false);
  });

  it('should validate password patterns', () => {
    expect(PATTERNS.PASSWORD.test('StrongPass123@')).toBe(true);
    expect(PATTERNS.PASSWORD.test('weak')).toBe(false);
    expect(PATTERNS.PASSWORD.test('NoSpecial123')).toBe(false);
  });

  it('should validate amount patterns', () => {
    expect(PATTERNS.AMOUNT.test('123.45')).toBe(true);
    expect(PATTERNS.AMOUNT.test('123')).toBe(true);
    expect(PATTERNS.AMOUNT.test('123.456')).toBe(false);
    expect(PATTERNS.AMOUNT.test('invalid')).toBe(false);
  });
});

describe('Validation Schemas', () => {
  it('should have user registration schema', () => {
    expect(VALIDATION_SCHEMAS.USER_CREATE).toBeDefined();
    expect(VALIDATION_SCHEMAS.USER_CREATE.length).toBeGreaterThan(0);
    
    const emailRule = VALIDATION_SCHEMAS.USER_CREATE.find((r: any) => r.field === 'email');
    expect(emailRule).toBeDefined();
    expect(emailRule?.required).toBe(true);
    expect(emailRule?.type).toBe('email');
  });

  it('should have OTP schemas', () => {
    expect(VALIDATION_SCHEMAS.OTP_SEND).toBeDefined();
    expect(VALIDATION_SCHEMAS.OTP_VERIFY).toBeDefined();
    
    const otpVerifyRule = VALIDATION_SCHEMAS.OTP_VERIFY.find((r: any) => r.field === 'otp');
    expect(otpVerifyRule).toBeDefined();
    expect(otpVerifyRule?.pattern).toEqual(/^\d{6}$/);
  });

  it('should have invoice schema', () => {
    expect(VALIDATION_SCHEMAS.INVOICE_CREATE).toBeDefined();
    
    const amountRule = VALIDATION_SCHEMAS.INVOICE_CREATE.find((r: any) => r.field === 'amount');
    expect(amountRule).toBeDefined();
    expect(amountRule?.type).toBe('number');
    expect(amountRule?.min).toBe(0.01);
  });

  it('should have payment schema', () => {
    expect(VALIDATION_SCHEMAS.PAYMENT_CREATE).toBeDefined();
    
    const paymentMethodRule = VALIDATION_SCHEMAS.PAYMENT_CREATE.find((r: any) => r.field === 'paymentMethod');
    expect(paymentMethodRule).toBeDefined();
    expect(paymentMethodRule?.enum).toContain('CASH');
    expect(paymentMethodRule?.enum).toContain('BANK_TRANSFER');
  });
});

describe('Quick Validation Functions', () => {
  it('should validate emails quickly', () => {
    expect(quickValidate.email('test@example.com')).toBe(true);
    expect(quickValidate.email('invalid')).toBe(false);
  });

  it('should validate phones quickly', () => {
    expect(quickValidate.phone('+1234567890')).toBe(true);
    expect(quickValidate.phone('invalid')).toBe(false);
  });

  it('should validate UUIDs quickly', () => {
    expect(quickValidate.uuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(quickValidate.uuid('invalid')).toBe(false);
  });

  it('should validate passwords quickly', () => {
    expect(quickValidate.password('StrongPass123@')).toBe(true);
    expect(quickValidate.password('weak')).toBe(false);
  });

  it('should validate amounts quickly', () => {
    expect(quickValidate.amount('123.45')).toBe(true);
    expect(quickValidate.amount('invalid')).toBe(false);
  });

  it('should validate Indian mobile numbers quickly', () => {
    expect(quickValidate.mobileIN('9876543210')).toBe(true);
    expect(quickValidate.mobileIN('1234567890')).toBe(false);
  });
});

describe('Sanitization Functions', () => {
  it('should sanitize strings', () => {
    const result = sanitize.string('<script>alert("xss")</script>Hello');
    expect(result).toBe('alert("xss")Hello');
  });

  it('should sanitize emails', () => {
    const result = sanitize.email('TEST@EXAMPLE.COM');
    expect(result).toBe('test@example.com');
  });

  it('should sanitize phone numbers', () => {
    const result = sanitize.phone('(555) 123-4567');
    expect(result).toBe('5551234567');
  });

  it('should sanitize numbers', () => {
    expect(sanitize.number('123.45')).toBe(123.45);
    expect(sanitize.number('invalid')).toBe(null);
  });
});

describe('Validation Middleware', () => {
  it('should create validation middleware', () => {
    const middleware = createValidationMiddleware([
      { field: 'email', required: true, type: 'email' },
    ]);
    
    expect(typeof middleware).toBe('function');
  });

  it('should validate request data in middleware', async () => {
    const middleware = createValidationMiddleware([
      { field: 'email', required: true, type: 'email' },
    ]);
    
    const mockReq = {
      method: 'POST',
      body: { email: 'invalid-email' },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const mockNext = jest.fn();
    
    await middleware(mockReq, mockRes, mockNext);
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Validation failed',
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
          message: 'email must be a valid email address',
        }),
      ]),
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should pass validation in middleware', async () => {
    const middleware = createValidationMiddleware([
      { field: 'email', required: true, type: 'email', sanitize: true },
    ]);
    
    const mockReq = {
      method: 'POST',
      body: { email: 'TEST@EXAMPLE.COM' },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const mockNext = jest.fn();
    
    await middleware(mockReq, mockRes, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.body.email).toBe('test@example.com');
  });
});

describe('Validation Edge Cases', () => {
  it('should handle null values', () => {
    const validator = new InputValidator([
      { field: 'optional', required: false, type: 'string' },
    ]);
    
    const result = validator.validate({ optional: null });
    expect(result.isValid).toBe(true);
  });

  it('should handle undefined values', () => {
    const validator = new InputValidator([
      { field: 'optional', required: false, type: 'string' },
    ]);
    
    const result = validator.validate({ optional: undefined });
    expect(result.isValid).toBe(true);
  });

  it('should handle empty strings', () => {
    const validator = new InputValidator([
      { field: 'optional', required: false, type: 'string' },
    ]);
    
    const result = validator.validate({ optional: '' });
    expect(result.isValid).toBe(true);
  });

  it('should handle zero values', () => {
    const validator = new InputValidator([
      { field: 'amount', required: true, type: 'number', min: 0 },
    ]);
    
    const result = validator.validate({ amount: 0 });
    expect(result.isValid).toBe(true);
  });

  it('should handle negative numbers', () => {
    const validator = new InputValidator([
      { field: 'balance', required: true, type: 'number' },
    ]);
    
    const result = validator.validate({ balance: -100 });
    expect(result.isValid).toBe(true);
  });

  it('should handle empty arrays', () => {
    const validator = new InputValidator([
      { field: 'tags', required: false, type: 'array' },
    ]);
    
    const result = validator.validate({ tags: [] });
    expect(result.isValid).toBe(true);
  });

  it('should handle empty objects', () => {
    const validator = new InputValidator([
      { field: 'metadata', required: false, type: 'object' },
    ]);
    
    const result = validator.validate({ metadata: {} });
    expect(result.isValid).toBe(true);
  });
});
