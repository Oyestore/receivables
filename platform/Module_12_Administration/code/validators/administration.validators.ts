import Joi from 'joi';

/**
 * Request Validation Schemas for Administration Module
 */

// ===== MFA Validation =====
export const mfaEnrollSchema = {
  // No body required - uses authenticated user
};

export const mfaVerifySchema = {
  body: Joi.object({
    token: Joi.string().length(6).pattern(/^\d+$/).required()
      .messages({
        'string.length': 'Token must be exactly 6 digits',
        'string.pattern.base': 'Token must contain only numbers',
      }),
  }),
};

export const mfaValidateSchema = {
  body: Joi.object({
    userId: Joi.string().uuid().required(),
    token: Joi.string().length(6).pattern(/^\d+$/).optional(),
    backupCode: Joi.string().pattern(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/).optional(),
  }).or('token', 'backupCode')
    .messages({
      'object.missing': 'Either token or backupCode must be provided',
    }),
};

export const mfaDisableSchema = {
  body: Joi.object({
    password: Joi.string().required(),
  }),
};

// ===== Subscription Validation =====
export const createPlanSchema = {
  body: Joi.object({
    planName: Joi.string().min(3).max(255).required(),
    planType: Joi.string().valid('free', 'tier-1', 'tier-2', 'enterprise', 'custom').required(),
    status: Joi.string().valid('active', 'deprecated', 'archived').default('active'),
    basePrice: Joi.number().min(0).required(),
    currency: Joi.string().length(3).default('USD'),
    billingCycle: Joi.string().valid('monthly', 'quarterly', 'annual').required(),
    features: Joi.object().optional(),
    moduleAccess: Joi.object().optional(),
    usageLimits: Joi.object().optional(),
  }),
};

export const subscribeSchema = {
  params: Joi.object({
    tenantId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    planId: Joi.string().uuid().required(),
    trialDays: Joi.number().integer().min(0).max(90).optional(),
    autoRenew: Joi.boolean().default(true),
  }),
};

export const upgradeSubscriptionSchema = {
  params: Joi.object({
    tenantId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    planId: Joi.string().uuid().required(),
  }),
};

// ===== Provisioning Validation =====
export const provisionTenantSchema = {
  body: Joi.object({
    tenantName: Joi.string().min(3).max(255).required(),
    adminEmail: Joi.string().email().required(),
    adminPassword: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      }),
    subscriptionPlanId: Joi.string().uuid().required(),
    organizationDetails: Joi.object({
      industry: Joi.string().optional(),
      size: Joi.string().optional(),
      country: Joi.string().optional(),
    }).optional(),
  }),
};

// ===== Usage Tracking Validation =====
export const setQuotaSchema = {
  body: Joi.object({
    tenantId: Joi.string().uuid().required(),
    moduleName: Joi.string().min(3).max(100).required(),
    quotaType: Joi.string().min(3).max(50).required(),
    quotaLimit: Joi.number().integer().min(1).required(),
    resetPeriod: Joi.string().valid('daily', 'weekly', 'monthly', 'annual').required(),
  }),
};

export const getUsageStatsSchema = {
  query: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  }),
};

/**
 * Validation middleware factory
 */
export const validate = (schema: any) => {
  return (req: any, res: any, next: any) => {
    const validationOptions = {
      abortEarly: false, // Return all errors
      allowUnknown: true, // Allow unknown keys in request
      stripUnknown: true, // Remove unknown keys
    };

    // Validate body
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, validationOptions);
      if (error) {
        const errors = error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: errors,
        });
      }
      req.body = value;
    }

    // Validate params
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, validationOptions);
      if (error) {
        const errors = error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Path parameter validation failed',
          details: errors,
        });
      }
      req.params = value;
    }

    // Validate query
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, validationOptions);
      if (error) {
        const errors = error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Query parameter validation failed',
          details: errors,
        });
      }
      req.query = value;
    }

    next();
  };
};
