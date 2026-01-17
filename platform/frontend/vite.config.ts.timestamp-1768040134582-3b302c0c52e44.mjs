// vite.config.ts
import { defineConfig } from "file:///C:/Users/91858/Downloads/SME_Platform_12_Separate_Modules/platform/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/91858/Downloads/SME_Platform_12_Separate_Modules/platform/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/91858/Downloads/SME_Platform_12_Separate_Modules/platform/frontend/node_modules/vite-plugin-pwa/dist/index.js";

// src/auth.ts
import Google from "file:///C:/Users/91858/Downloads/SME_Platform_12_Separate_Modules/platform/frontend/node_modules/@auth/core/providers/google.js";
import CredentialsProvider from "file:///C:/Users/91858/Downloads/SME_Platform_12_Separate_Modules/platform/frontend/node_modules/@auth/core/providers/credentials.js";

// src/lib/database.ts
import { Pool } from "file:///C:/Users/91858/Downloads/SME_Platform_12_Separate_Modules/platform/frontend/node_modules/pg/esm/index.mjs";
import Redis from "file:///C:/Users/91858/Downloads/SME_Platform_12_Separate_Modules/platform/frontend/node_modules/ioredis/built/index.js";
import dotenv from "file:///C:/Users/91858/Downloads/SME_Platform_12_Separate_Modules/platform/frontend/node_modules/dotenv/lib/main.js";
dotenv.config();
var pool;
var redis;
var initializeDatabase = async () => {
  try {
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 3e4,
        connectionTimeoutMillis: 2e3
      });
      const client = await pool.connect();
      await client.query("SELECT NOW()");
      client.release();
      console.log("\u2705 PostgreSQL connected successfully");
    } else {
      console.log("\u26A0\uFE0F DATABASE_URL not provided, using mock storage");
    }
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL);
      await redis.ping();
      console.log("\u2705 Redis connected successfully");
    } else {
      console.log("\u26A0\uFE0F REDIS_URL not provided, using mock storage");
    }
  } catch (error) {
    console.error("\u274C Database initialization failed:", error);
    throw error;
  }
};
var UserDatabase = class {
  // Create or update user
  static async upsert(user) {
    if (!pool) {
      throw new Error("Database not initialized");
    }
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO users (email, name, role, tenant_id, mobile, permissions, last_login, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (email) 
        DO UPDATE SET 
          name = $2,
          role = $3,
          tenant_id = $4,
          mobile = $5,
          permissions = $6,
          last_login = $7,
          updated_at = NOW()
        RETURNING *
      `;
      const values = [
        user.email,
        user.name,
        user.role,
        user.tenantId,
        user.mobile || null,
        JSON.stringify(user.permissions),
        user.lastLogin || null,
        user.isActive
      ];
      const result = await client.query(query, values);
      return this.mapRowToUser(result.rows[0]);
    } finally {
      client.release();
    }
  }
  // Find user by email
  static async findByEmail(email) {
    if (!pool) {
      throw new Error("Database not initialized");
    }
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT * FROM users WHERE email = $1", [email]);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }
  // Find user by mobile
  static async findByMobile(mobile) {
    if (!pool) {
      throw new Error("Database not initialized");
    }
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT * FROM users WHERE mobile = $1", [mobile]);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }
  // Find user by ID
  static async findById(id) {
    if (!pool) {
      throw new Error("Database not initialized");
    }
    const client = await pool.connect();
    try {
      const result = await client.query("SELECT * FROM users WHERE id = $1", [id]);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }
  // Update user
  static async update(id, updates) {
    if (!pool) {
      throw new Error("Database not initialized");
    }
    const client = await pool.connect();
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;
      for (const [key, value] of Object.entries(updates)) {
        if (key === "id" || key === "createdAt")
          continue;
        const dbField = this.camelToSnake(key);
        fields.push(`${dbField} = $${paramIndex}`);
        if (key === "permissions") {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }
      fields.push(`updated_at = NOW()`);
      values.push(id);
      const query = `UPDATE users SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
      const result = await client.query(query, values);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }
  // Helper method to map database row to User object
  static mapRowToUser(row) {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      tenantId: row.tenant_id,
      mobile: row.mobile,
      permissions: Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || "[]"),
      lastLogin: row.last_login ? new Date(row.last_login) : void 0,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
  // Helper method to convert camelCase to snake_case
  static camelToSnake(str) {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
};
var OTPStore = class {
  static async store(mobile, otp, expires) {
    if (redis) {
      const data = {
        otp,
        mobile,
        expires: expires.toISOString(),
        attempts: 0,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      await redis.setex(`otp:${mobile}`, 600, JSON.stringify(data));
    } else {
      console.log("\u26A0\uFE0F Using in-memory OTP storage (Redis not available)");
    }
  }
  static async get(mobile) {
    if (redis) {
      const data = await redis.get(`otp:${mobile}`);
      return data ? JSON.parse(data) : null;
    } else {
      console.log("\u26A0\uFE0F OTP retrieval not available (Redis not connected)");
      return null;
    }
  }
  static async incrementAttempts(mobile) {
    if (redis) {
      const data = await this.get(mobile);
      if (data) {
        data.attempts += 1;
        await redis.setex(`otp:${mobile}`, 600, JSON.stringify(data));
        return data.attempts;
      }
    }
    return 0;
  }
  static async delete(mobile) {
    if (redis) {
      await redis.del(`otp:${mobile}`);
    }
  }
  static async cleanup() {
    if (redis) {
      const keys = await redis.keys("otp:*");
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const otpData = JSON.parse(data);
          if (new Date(otpData.expires) < /* @__PURE__ */ new Date()) {
            await redis.del(key);
          }
        }
      }
    }
  }
};

// src/lib/jwt.ts
import jwt from "file:///C:/Users/91858/Downloads/SME_Platform_12_Separate_Modules/platform/frontend/node_modules/jsonwebtoken/index.js";
import dotenv2 from "file:///C:/Users/91858/Downloads/SME_Platform_12_Separate_Modules/platform/frontend/node_modules/dotenv/lib/main.js";
dotenv2.config();
var JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || "fallback-secret-change-in-production";
var JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
var generateAccessToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
      issuer: "sme-platform",
      audience: "sme-platform-users"
    });
  } catch (error) {
    console.error("JWT generation failed:", error);
    throw new Error("Failed to generate access token");
  }
};
var generateRefreshToken = (userId) => {
  try {
    return jwt.sign(
      { userId, type: "refresh" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
  } catch (error) {
    console.error("Refresh token generation failed:", error);
    throw new Error("Failed to generate refresh token");
  }
};
var generateTokenPair = (payload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload.userId);
  const expiresIn = JWT_EXPIRES_IN.endsWith("h") ? parseInt(JWT_EXPIRES_IN) * 3600 : JWT_EXPIRES_IN.endsWith("d") ? parseInt(JWT_EXPIRES_IN) * 86400 : 3600;
  return {
    accessToken,
    refreshToken,
    expiresIn
  };
};
var verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "sme-platform",
      audience: "sme-platform-users"
    });
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token has expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid token");
    } else {
      console.error("Token verification failed:", error);
      throw new Error("Token verification failed");
    }
  }
};

// src/auth.ts
import dotenv3 from "file:///C:/Users/91858/Downloads/SME_Platform_12_Separate_Modules/platform/frontend/node_modules/dotenv/lib/main.js";
dotenv3.config();
var mockUsers = /* @__PURE__ */ new Map();
var validateMobile = (mobile) => {
  const mobileRegex = /^\+\d{10,15}$/;
  return mobileRegex.test(mobile);
};
var generateOTP = () => {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
};
var generatePermissions = (role) => {
  const rolePermissions = {
    sme_owner: ["INVOICE_CREATE", "PAYMENT_VIEW", "ANALYTICS_VIEW", "CUSTOMER_MANAGE"],
    accountant: ["INVOICE_VIEW", "PAYMENT_MANAGE", "REPORT_GENERATE"],
    admin: ["ALL"],
    viewer: ["INVOICE_VIEW", "PAYMENT_VIEW"]
  };
  return rolePermissions[role] || [];
};
var createOrGetUser = async (mobile) => {
  try {
    let user = await UserDatabase.findByMobile(mobile);
    if (!user) {
      const newUser = {
        email: `user_${mobile.replace(/[^\d]/g, "")}@smeplatform.com`,
        name: `User ${mobile}`,
        role: "sme_owner",
        // Default role
        tenantId: `tenant_${Date.now()}`,
        mobile,
        permissions: generatePermissions("sme_owner"),
        lastLogin: /* @__PURE__ */ new Date(),
        isActive: true
      };
      user = await UserDatabase.upsert(newUser);
    } else {
      await UserDatabase.update(user.id, { lastLogin: /* @__PURE__ */ new Date() });
    }
    return user;
  } catch (error) {
    console.error("Database operation failed, using fallback:", error);
    const mockUser = {
      id: `user_${Date.now()}`,
      email: `user_${mobile.replace(/[^\d]/g, "")}@smeplatform.com`,
      name: `User ${mobile}`,
      role: "sme_owner",
      tenantId: `tenant_${Date.now()}`,
      mobile,
      permissions: generatePermissions("sme_owner"),
      lastLogin: /* @__PURE__ */ new Date(),
      isActive: true
    };
    mockUsers.set(mobile, mockUser);
    return mockUser;
  }
};
var otpAPI = {
  sendOTP: async (mobile) => {
    if (!validateMobile(mobile)) {
      throw new Error("Invalid mobile number format");
    }
    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1e3);
    try {
      await OTPStore.store(mobile, otp, expires);
      console.log(`\u{1F510} Mock OTP for ${mobile}: ${otp}`);
      return {
        success: true,
        message: "OTP sent successfully",
        otp: process.env.NODE_ENV === "development" ? otp : void 0
        // Only show OTP in development
      };
    } catch (error) {
      console.error("Failed to send OTP:", error);
      throw new Error("Failed to send OTP");
    }
  },
  verifyOTP: async (mobile, otp) => {
    if (!validateMobile(mobile)) {
      throw new Error("Invalid mobile number format");
    }
    if (!/^\d{6}$/.test(otp)) {
      throw new Error("Invalid OTP format");
    }
    try {
      const otpData = await OTPStore.get(mobile);
      if (!otpData) {
        throw new Error("OTP not found or expired");
      }
      if (/* @__PURE__ */ new Date() > new Date(otpData.expires)) {
        await OTPStore.delete(mobile);
        throw new Error("OTP has expired");
      }
      if (otpData.attempts >= 3) {
        await OTPStore.delete(mobile);
        throw new Error("Maximum attempts reached");
      }
      if (otpData.otp !== otp) {
        await OTPStore.incrementAttempts(mobile);
        throw new Error("Invalid OTP");
      }
      const user = await createOrGetUser(mobile);
      await OTPStore.delete(mobile);
      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        permissions: user.permissions
      };
      const tokens = generateTokenPair(payload);
      return {
        success: true,
        message: "OTP verified successfully",
        user,
        tokens
      };
    } catch (error) {
      console.error("Failed to verify OTP:", error);
      throw error;
    }
  }
};
var authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "mock-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock-google-client-secret"
    }),
    CredentialsProvider({
      name: "mobile-otp",
      credentials: {
        mobile: { label: "Mobile Number", type: "text" },
        otp: { label: "OTP", type: "text" }
      },
      async authorize(credentials) {
        if (!(credentials == null ? void 0 : credentials.mobile) || !(credentials == null ? void 0 : credentials.otp)) {
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
              isActive: result.user.isActive
            };
          }
        } catch (error) {
          console.error("Authorization failed:", error);
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          ...token,
          userId: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
          mobile: user.mobile,
          permissions: user.permissions
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.userId,
          email: token.email,
          name: token.name,
          role: token.role,
          tenantId: token.tenantId,
          mobile: token.mobile,
          permissions: token.permissions
        };
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60
    // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60
    // 24 hours
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  }
};

// src/lib/authorization.ts
var Permission = /* @__PURE__ */ ((Permission2) => {
  Permission2["INVOICE_CREATE"] = "invoice:create";
  Permission2["INVOICE_READ"] = "invoice:read";
  Permission2["INVOICE_UPDATE"] = "invoice:update";
  Permission2["INVOICE_DELETE"] = "invoice:delete";
  Permission2["INVOICE_APPROVE"] = "invoice:approve";
  Permission2["INVOICE_EXPORT"] = "invoice:export";
  Permission2["PAYMENT_CREATE"] = "payment:create";
  Permission2["PAYMENT_READ"] = "payment:read";
  Permission2["PAYMENT_UPDATE"] = "payment:update";
  Permission2["PAYMENT_DELETE"] = "payment:delete";
  Permission2["PAYMENT_PROCESS"] = "payment:process";
  Permission2["PAYMENT_REFUND"] = "payment:refund";
  Permission2["DISPUTE_CREATE"] = "dispute:create";
  Permission2["DISPUTE_READ"] = "dispute:read";
  Permission2["DISPUTE_UPDATE"] = "dispute:update";
  Permission2["DISPUTE_RESOLVE"] = "dispute:resolve";
  Permission2["DISPUTE_ESCALATE"] = "dispute:escalate";
  Permission2["ANALYTICS_VIEW"] = "analytics:view";
  Permission2["ANALYTICS_EXPORT"] = "analytics:export";
  Permission2["ANALYTICS_ADVANCED"] = "analytics:advanced";
  Permission2["USER_CREATE"] = "user:create";
  Permission2["USER_READ"] = "user:read";
  Permission2["USER_UPDATE"] = "user:update";
  Permission2["USER_DELETE"] = "user:delete";
  Permission2["USER_ASSIGN_ROLES"] = "user:assign_roles";
  Permission2["SYSTEM_CONFIG"] = "system:config";
  Permission2["SYSTEM_LOGS"] = "system:logs";
  Permission2["SYSTEM_HEALTH"] = "system:health";
  Permission2["SYSTEM_BACKUP"] = "system:backup";
  Permission2["TENANT_CREATE"] = "tenant:create";
  Permission2["TENANT_READ"] = "tenant:read";
  Permission2["TENANT_UPDATE"] = "tenant:update";
  Permission2["TENANT_DELETE"] = "tenant:delete";
  Permission2["TENANT_MANAGE_USERS"] = "tenant:manage_users";
  Permission2["CREDIT_SCORE_VIEW"] = "credit:view";
  Permission2["CREDIT_SCORE_CREATE"] = "credit:create";
  Permission2["CREDIT_SCORE_UPDATE"] = "credit:update";
  Permission2["FINANCING_APPLY"] = "financing:apply";
  Permission2["FINANCING_APPROVE"] = "financing:approve";
  Permission2["FINANCING_MANAGE"] = "financing:manage";
  Permission2["MARKETING_CREATE"] = "marketing:create";
  Permission2["MARKETING_VIEW"] = "marketing:view";
  Permission2["MARKETING_MANAGE"] = "marketing:manage";
  Permission2["DOCUMENT_CREATE"] = "document:create";
  Permission2["DOCUMENT_READ"] = "document:read";
  Permission2["DOCUMENT_UPDATE"] = "document:update";
  Permission2["DOCUMENT_DELETE"] = "document:delete";
  Permission2["DOCUMENT_SHARE"] = "document:share";
  return Permission2;
})(Permission || {});
var ROLE_PERMISSIONS = {
  ["sme_owner" /* SME_OWNER */]: [
    "invoice:create" /* INVOICE_CREATE */,
    "invoice:read" /* INVOICE_READ */,
    "invoice:update" /* INVOICE_UPDATE */,
    "invoice:delete" /* INVOICE_DELETE */,
    "invoice:export" /* INVOICE_EXPORT */,
    "payment:create" /* PAYMENT_CREATE */,
    "payment:read" /* PAYMENT_READ */,
    "payment:update" /* PAYMENT_UPDATE */,
    "dispute:create" /* DISPUTE_CREATE */,
    "dispute:read" /* DISPUTE_READ */,
    "dispute:update" /* DISPUTE_UPDATE */,
    "analytics:view" /* ANALYTICS_VIEW */,
    "analytics:export" /* ANALYTICS_EXPORT */,
    "credit:view" /* CREDIT_SCORE_VIEW */,
    "financing:apply" /* FINANCING_APPLY */,
    "document:create" /* DOCUMENT_CREATE */,
    "document:read" /* DOCUMENT_READ */,
    "document:update" /* DOCUMENT_UPDATE */,
    "document:delete" /* DOCUMENT_DELETE */,
    "document:share" /* DOCUMENT_SHARE */
  ],
  ["legal_partner" /* LEGAL_PARTNER */]: [
    "dispute:read" /* DISPUTE_READ */,
    "dispute:update" /* DISPUTE_UPDATE */,
    "dispute:resolve" /* DISPUTE_RESOLVE */,
    "dispute:escalate" /* DISPUTE_ESCALATE */,
    "document:read" /* DOCUMENT_READ */,
    "document:update" /* DOCUMENT_UPDATE */,
    "document:create" /* DOCUMENT_CREATE */,
    "analytics:view" /* ANALYTICS_VIEW */
  ],
  ["accountant" /* ACCOUNTANT */]: [
    "invoice:read" /* INVOICE_READ */,
    "invoice:update" /* INVOICE_UPDATE */,
    "invoice:export" /* INVOICE_EXPORT */,
    "payment:read" /* PAYMENT_READ */,
    "payment:update" /* PAYMENT_UPDATE */,
    "payment:process" /* PAYMENT_PROCESS */,
    "analytics:view" /* ANALYTICS_VIEW */,
    "analytics:export" /* ANALYTICS_EXPORT */,
    "document:read" /* DOCUMENT_READ */,
    "document:create" /* DOCUMENT_CREATE */,
    "document:update" /* DOCUMENT_UPDATE */
  ],
  ["admin" /* ADMIN */]: [
    // Admin has all permissions
    ...Object.values(Permission)
  ],
  ["viewer" /* VIEWER */]: [
    "invoice:read" /* INVOICE_READ */,
    "payment:read" /* PAYMENT_READ */,
    "dispute:read" /* DISPUTE_READ */,
    "analytics:view" /* ANALYTICS_VIEW */,
    "document:read" /* DOCUMENT_READ */
  ]
};
var AuthorizationService = class {
  redis;
  cacheExpiry = 300;
  // 5 minutes
  permissionCache = /* @__PURE__ */ new Map();
  constructor(redis2) {
    this.redis = redis2;
  }
  // Check if user has specific permission
  async hasPermission(user, permission) {
    const userPermissions = await this.getUserPermissions(user);
    return userPermissions.includes(permission);
  }
  // Check if user has any of the specified permissions
  async hasAnyPermission(user, permissions) {
    const userPermissions = await this.getUserPermissions(user);
    return permissions.some((permission) => userPermissions.includes(permission));
  }
  // Check if user has all specified permissions
  async hasAllPermissions(user, permissions) {
    const userPermissions = await this.getUserPermissions(user);
    return permissions.every((permission) => userPermissions.includes(permission));
  }
  // Get user permissions with caching
  async getUserPermissions(user) {
    const cacheKey = `user:${user.id}:permissions`;
    const memCache = this.permissionCache.get(cacheKey);
    if (memCache && memCache.expiresAt > Date.now()) {
      return memCache.permissions;
    }
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.expiresAt > Date.now()) {
          this.permissionCache.set(cacheKey, parsed);
          return parsed.permissions;
        }
      }
    } catch (error) {
      console.warn("Redis cache error:", error);
    }
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    if (user.tenantId) {
      permissions.push("tenant:read" /* TENANT_READ */);
    }
    const cacheData = {
      userId: user.id,
      permissions,
      expiresAt: Date.now() + this.cacheExpiry * 1e3
    };
    this.permissionCache.set(cacheKey, cacheData);
    try {
      await this.redis.setex(cacheKey, this.cacheExpiry, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Redis cache set error:", error);
    }
    return permissions;
  }
  // Clear user permission cache
  async clearUserPermissionCache(userId) {
    const cacheKey = `user:${userId}:permissions`;
    this.permissionCache.delete(cacheKey);
    try {
      await this.redis.del(cacheKey);
    } catch (error) {
      console.warn("Redis cache clear error:", error);
    }
  }
  // Check resource-level permission
  async canAccessResource(user, resource, action, resourceId, resourceOwnerId) {
    const permission = `${resource}:${action}`;
    const hasBasicPermission = await this.hasPermission(user, permission);
    if (!hasBasicPermission) {
      return false;
    }
    if (resourceOwnerId && resourceOwnerId !== user.id) {
      const ownerPermissions = ["invoice:read" /* INVOICE_READ */, "payment:read" /* PAYMENT_READ */];
      const canAccessOthers = await this.hasAnyPermission(user, [
        "system:config" /* SYSTEM_CONFIG */,
        "tenant:manage_users" /* TENANT_MANAGE_USERS */,
        ...ownerPermissions
      ]);
      if (!canAccessOthers) {
        return false;
      }
    }
    return true;
  }
  // Get permissions for API response
  async getUserPermissionsForAPI(user) {
    const permissions = await this.getUserPermissions(user);
    return permissions.map((p) => p.toString());
  }
  // Batch permission check for performance
  async batchPermissionCheck(user, checks) {
    const userPermissions = await this.getUserPermissions(user);
    return checks.map((check) => {
      const permission = `${check.resource}:${check.action}`;
      const hasPermission = userPermissions.includes(permission);
      if (!hasPermission) {
        return false;
      }
      if (check.resourceOwnerId && check.resourceOwnerId !== user.id) {
        const ownerPermissions = ["invoice:read" /* INVOICE_READ */, "payment:read" /* PAYMENT_READ */];
        const canAccessOthers = userPermissions.some(
          (p) => ["system:config" /* SYSTEM_CONFIG */, "tenant:manage_users" /* TENANT_MANAGE_USERS */, ...ownerPermissions].includes(p)
        );
        return canAccessOthers;
      }
      return true;
    });
  }
  // Cleanup expired cache entries
  cleanupExpiredCache() {
    const now = Date.now();
    for (const [key, cache] of this.permissionCache.entries()) {
      if (cache.expiresAt <= now) {
        this.permissionCache.delete(key);
      }
    }
  }
};
var authorizationService;
var initializeAuthorization = (redis2) => {
  if (!authorizationService) {
    authorizationService = new AuthorizationService(redis2);
    setInterval(() => {
      authorizationService.cleanupExpiredCache();
    }, 6e4);
  }
  return authorizationService;
};

// src/lib/vite-auth-plugin.ts
import Redis2 from "file:///C:/Users/91858/Downloads/SME_Platform_12_Separate_Modules/platform/frontend/node_modules/ioredis/built/index.js";
function authPlugin() {
  let authService;
  let userDb;
  let redis2;
  return {
    name: "auth-plugin",
    configureServer(server) {
      const initializeServices = async () => {
        try {
          redis2 = new Redis2(process.env.REDIS_URL || "redis://localhost:6379");
          await initializeDatabase();
          authService = initializeAuthorization(redis2);
        } catch (error) {
          console.error("Failed to initialize auth services:", error);
        }
      };
      initializeServices();
      const authenticate = async (req, res, next) => {
        try {
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Authentication required" });
          }
          const token = authHeader.substring(7);
          const decoded = verifyToken(token);
          if (!decoded || !decoded.userId) {
            return res.status(401).json({ error: "Invalid token" });
          }
          const dbUser = await UserDatabase.findById(decoded.userId);
          if (!dbUser) {
            return res.status(401).json({ error: "User not found" });
          }
          const authUser = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            tenantId: dbUser.tenantId,
            mobile: dbUser.mobile,
            permissions: dbUser.permissions,
            lastLogin: dbUser.lastLogin,
            isActive: dbUser.isActive
          };
          req.user = authUser;
          next();
        } catch (error) {
          return res.status(401).json({ error: "Authentication failed" });
        }
      };
      const authorize = (permission) => {
        return async (req, res, next) => {
          try {
            if (!authService) {
              return res.status(500).json({ error: "Authorization service not available" });
            }
            const hasPermission = await authService.hasPermission(req.user, permission);
            if (!hasPermission) {
              return res.status(403).json({
                error: "Insufficient permissions",
                required: permission
              });
            }
            next();
          } catch (error) {
            console.error("Authorization error:", error);
            res.status(500).json({ error: "Authorization check failed" });
          }
        };
      };
      server.middlewares.use("/api/auth", async (req, res, next) => {
        if (!req.url)
          return next();
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const path = url.pathname.replace("/api/auth", "");
          const readBody = async (req2) => {
            return new Promise((resolve) => {
              let body = "";
              req2.on("data", (chunk) => {
                body += chunk.toString();
              });
              req2.on("end", () => {
                try {
                  resolve(JSON.parse(body));
                } catch {
                  resolve({});
                }
              });
            });
          };
          if (path === "/send-otp" && req.method === "POST") {
            const data = await readBody(req);
            try {
              const result = await otpAPI.sendOTP(data.mobile);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
            } catch (error) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                success: false,
                message: error instanceof Error ? error.message : "Failed to send OTP"
              }));
            }
            return;
          }
          if (path === "/verify-otp" && req.method === "POST") {
            const data = await readBody(req);
            try {
              const result = await otpAPI.verifyOTP(data.mobile, data.otp);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(result));
            } catch (error) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                success: false,
                message: error instanceof Error ? error.message : "Failed to verify OTP"
              }));
            }
            return;
          }
          if (path === "/refresh" && req.method === "POST") {
            const data = await readBody(req);
            try {
              const mockAccessToken = `mock_access_token_${Date.now()}`;
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                success: true,
                accessToken: mockAccessToken,
                expiresIn: 24 * 60 * 60
                // 24 hours
              }));
            } catch (error) {
              res.writeHead(401, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                success: false,
                message: "Invalid refresh token"
              }));
            }
            return;
          }
          if (path === "/session" && req.method === "GET") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(null));
            return;
          }
          if (path === "/signout" && req.method === "POST") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, message: "Signed out successfully" }));
            return;
          }
          if (path === "/providers" && req.method === "GET") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              providers: [
                { id: "google", name: "Google" },
                { id: "mobile-otp", name: "Mobile OTP" }
              ]
            }));
            return;
          }
          if (path === "/permissions/check" && req.method === "POST") {
            await authenticate(req, res, async () => {
              const data = await readBody(req);
              const permission = data.permission;
              if (!authService) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Authorization service not available" }));
                return;
              }
              try {
                const hasPermission = await authService.hasPermission(req.user, permission);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  hasPermission,
                  permission,
                  userId: req.user.id
                }));
              } catch (error) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Permission check failed" }));
              }
            });
            return;
          }
          if (path === "/permissions/user/:userId" && req.method === "GET") {
            await authenticate(req, res, async () => {
              await authorize("user:read" /* USER_READ */)(req, res, async () => {
                const pathParts = url.pathname.split("/");
                const userId = pathParts[pathParts.length - 1];
                if (!authService || !userId) {
                  res.writeHead(500, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ error: "Invalid request or service unavailable" }));
                  return;
                }
                try {
                  const targetUser = await UserDatabase.findById(userId);
                  if (!targetUser) {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "User not found" }));
                    return;
                  }
                  const authTargetUser = {
                    id: targetUser.id,
                    email: targetUser.email,
                    name: targetUser.name,
                    role: targetUser.role,
                    tenantId: targetUser.tenantId,
                    mobile: targetUser.mobile,
                    permissions: targetUser.permissions,
                    lastLogin: targetUser.lastLogin,
                    isActive: targetUser.isActive
                  };
                  try {
                    const userPermissions = await authService.getUserPermissions(req.user);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                      userId: req.user.id,
                      permissions: userPermissions
                    }));
                  } catch (error) {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Failed to get user permissions" }));
                  }
                } catch (error) {
                  res.writeHead(500, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ error: "Failed to get user permissions" }));
                }
              });
            });
            return;
          }
          if (path === "/roles/user/:userId" && req.method === "GET") {
            await authenticate(req, res, async () => {
              await authorize("user:read" /* USER_READ */)(req, res, async () => {
                const pathParts = url.pathname.split("/");
                const userId = pathParts[pathParts.length - 1];
                if (!userId) {
                  res.writeHead(400, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ error: "User ID is required" }));
                  return;
                }
                try {
                  const user = await UserDatabase.findById(userId);
                  if (!user) {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "User not found" }));
                    return;
                  }
                  res.writeHead(200, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({
                    userId: user.id,
                    role: user.role,
                    tenantId: user.tenantId
                  }));
                } catch (error) {
                  res.writeHead(500, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ error: "Failed to get user role" }));
                }
              });
            });
            return;
          }
          if (path === "/permissions/resource" && req.method === "POST") {
            await authenticate(req, res, async () => {
              const data = await readBody(req);
              if (!authService) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Authorization service not available" }));
                return;
              }
              try {
                const canAccess = await authService.canAccessResource(
                  req.user,
                  data.resource,
                  data.action,
                  data.resourceId,
                  data.resourceOwnerId
                );
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  canAccess,
                  resource: data.resource,
                  action: data.action,
                  resourceId: data.resourceId
                }));
              } catch (error) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Resource access check failed" }));
              }
            });
            return;
          }
          next();
        } catch (error) {
          console.error("Auth middleware error:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
      });
    }
  };
}

// vite.config.ts
var vite_config_default = defineConfig({
  plugins: [
    react(),
    authPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "SME Receivables Platform",
        short_name: "SME Platform",
        description: "Receivables management for SMEs",
        theme_color: "#2196F3",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60
                // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "mui-vendor": ["@mui/material", "@mui/icons-material"],
          "chart-vendor": ["recharts"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3JjL2F1dGgudHMiLCAic3JjL2xpYi9kYXRhYmFzZS50cyIsICJzcmMvbGliL2p3dC50cyIsICJzcmMvbGliL2F1dGhvcml6YXRpb24udHMiLCAic3JjL2xpYi92aXRlLWF1dGgtcGx1Z2luLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcOTE4NThcXFxcRG93bmxvYWRzXFxcXFNNRV9QbGF0Zm9ybV8xMl9TZXBhcmF0ZV9Nb2R1bGVzXFxcXHBsYXRmb3JtXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFw5MTg1OFxcXFxEb3dubG9hZHNcXFxcU01FX1BsYXRmb3JtXzEyX1NlcGFyYXRlX01vZHVsZXNcXFxccGxhdGZvcm1cXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzLzkxODU4L0Rvd25sb2Fkcy9TTUVfUGxhdGZvcm1fMTJfU2VwYXJhdGVfTW9kdWxlcy9wbGF0Zm9ybS9mcm9udGVuZC92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xyXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcclxuaW1wb3J0IHsgYXV0aFBsdWdpbiB9IGZyb20gJy4vc3JjL2xpYi92aXRlLWF1dGgtcGx1Z2luJztcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgICAgcmVhY3QoKSxcclxuICAgICAgICBhdXRoUGx1Z2luKCksXHJcbiAgICAgICAgVml0ZVBXQSh7XHJcbiAgICAgICAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxyXG4gICAgICAgICAgICBpbmNsdWRlQXNzZXRzOiBbJ2Zhdmljb24uaWNvJywgJ3JvYm90cy50eHQnLCAnYXBwbGUtdG91Y2gtaWNvbi5wbmcnXSxcclxuICAgICAgICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdTTUUgUmVjZWl2YWJsZXMgUGxhdGZvcm0nLFxyXG4gICAgICAgICAgICAgICAgc2hvcnRfbmFtZTogJ1NNRSBQbGF0Zm9ybScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JlY2VpdmFibGVzIG1hbmFnZW1lbnQgZm9yIFNNRXMnLFxyXG4gICAgICAgICAgICAgICAgdGhlbWVfY29sb3I6ICcjMjE5NkYzJyxcclxuICAgICAgICAgICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZmZmZmZmJyxcclxuICAgICAgICAgICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcclxuICAgICAgICAgICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzcmM6ICdwd2EtMTkyeDE5Mi5wbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplczogJzE5MngxOTInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3JjOiAncHdhLTUxMng1MTIucG5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICAgICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Zyx3b2ZmMn0nXSxcclxuICAgICAgICAgICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2FwaVxcLiovaSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2FwaS1jYWNoZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4RW50cmllczogMTAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAsIC8vIDEgaG91clxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzZXM6IFswLCAyMDBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgIF0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICAgIG91dERpcjogJ2Rpc3QnLFxyXG4gICAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcclxuICAgICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgICAgIG91dHB1dDoge1xyXG4gICAgICAgICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcclxuICAgICAgICAgICAgICAgICAgICAnbXVpLXZlbmRvcic6IFsnQG11aS9tYXRlcmlhbCcsICdAbXVpL2ljb25zLW1hdGVyaWFsJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgJ2NoYXJ0LXZlbmRvcic6IFsncmVjaGFydHMnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgIH0sXHJcbn0pO1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXDkxODU4XFxcXERvd25sb2Fkc1xcXFxTTUVfUGxhdGZvcm1fMTJfU2VwYXJhdGVfTW9kdWxlc1xcXFxwbGF0Zm9ybVxcXFxmcm9udGVuZFxcXFxzcmNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXDkxODU4XFxcXERvd25sb2Fkc1xcXFxTTUVfUGxhdGZvcm1fMTJfU2VwYXJhdGVfTW9kdWxlc1xcXFxwbGF0Zm9ybVxcXFxmcm9udGVuZFxcXFxzcmNcXFxcYXV0aC50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvOTE4NTgvRG93bmxvYWRzL1NNRV9QbGF0Zm9ybV8xMl9TZXBhcmF0ZV9Nb2R1bGVzL3BsYXRmb3JtL2Zyb250ZW5kL3NyYy9hdXRoLnRzXCI7aW1wb3J0IHsgQXV0aENvbmZpZyB9IGZyb20gJ0BhdXRoL2NvcmUnO1xyXG5pbXBvcnQgR29vZ2xlIGZyb20gJ0BhdXRoL2NvcmUvcHJvdmlkZXJzL2dvb2dsZSc7XHJcbmltcG9ydCBDcmVkZW50aWFsc1Byb3ZpZGVyIGZyb20gJ0BhdXRoL2NvcmUvcHJvdmlkZXJzL2NyZWRlbnRpYWxzJztcclxuaW1wb3J0IHsgVXNlckRhdGFiYXNlLCBPVFBTdG9yZSB9IGZyb20gJy4vbGliL2RhdGFiYXNlJztcclxuaW1wb3J0IHsgZ2VuZXJhdGVUb2tlblBhaXIsIHZlcmlmeVRva2VuLCBKV1RQYXlsb2FkIH0gZnJvbSAnLi9saWIvand0JztcclxuaW1wb3J0IGRvdGVudiBmcm9tICdkb3RlbnYnO1xyXG5cclxuLy8gTG9hZCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuZG90ZW52LmNvbmZpZygpO1xyXG5cclxuLy8gQ3VzdG9tIHVzZXIgaW50ZXJmYWNlXHJcbmludGVyZmFjZSBDdXN0b21Vc2VyIHtcclxuICBpZDogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG4gIHJvbGU6IHN0cmluZztcclxuICB0ZW5hbnRJZDogc3RyaW5nO1xyXG4gIG1vYmlsZT86IHN0cmluZztcclxuICBwZXJtaXNzaW9uczogc3RyaW5nW107XHJcbiAgbGFzdExvZ2luPzogRGF0ZTtcclxuICBpc0FjdGl2ZTogYm9vbGVhbjtcclxufVxyXG5cclxuLy8gTW9jayB1c2VyIGRhdGFiYXNlIChmYWxsYmFjayB3aGVuIGRhdGFiYXNlIGlzIG5vdCBhdmFpbGFibGUpXHJcbmNvbnN0IG1vY2tVc2VycyA9IG5ldyBNYXA8c3RyaW5nLCBDdXN0b21Vc2VyPigpO1xyXG5cclxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIHZhbGlkYXRlIG1vYmlsZSBudW1iZXJcclxuY29uc3QgdmFsaWRhdGVNb2JpbGUgPSAobW9iaWxlOiBzdHJpbmcpOiBib29sZWFuID0+IHtcclxuICBjb25zdCBtb2JpbGVSZWdleCA9IC9eXFwrXFxkezEwLDE1fSQvO1xyXG4gIHJldHVybiBtb2JpbGVSZWdleC50ZXN0KG1vYmlsZSk7XHJcbn07XHJcblxyXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgT1RQXHJcbmNvbnN0IGdlbmVyYXRlT1RQID0gKCk6IHN0cmluZyA9PiB7XHJcbiAgcmV0dXJuIE1hdGguZmxvb3IoMTAwMDAwICsgTWF0aC5yYW5kb20oKSAqIDkwMDAwMCkudG9TdHJpbmcoKTtcclxufTtcclxuXHJcbi8vIEhlbHBlciBmdW5jdGlvbiB0byBnZW5lcmF0ZSB1c2VyIHBlcm1pc3Npb25zIGJhc2VkIG9uIHJvbGVcclxuY29uc3QgZ2VuZXJhdGVQZXJtaXNzaW9ucyA9IChyb2xlOiBzdHJpbmcpOiBzdHJpbmdbXSA9PiB7XHJcbiAgY29uc3Qgcm9sZVBlcm1pc3Npb25zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XHJcbiAgICBzbWVfb3duZXI6IFsnSU5WT0lDRV9DUkVBVEUnLCAnUEFZTUVOVF9WSUVXJywgJ0FOQUxZVElDU19WSUVXJywgJ0NVU1RPTUVSX01BTkFHRSddLFxyXG4gICAgYWNjb3VudGFudDogWydJTlZPSUNFX1ZJRVcnLCAnUEFZTUVOVF9NQU5BR0UnLCAnUkVQT1JUX0dFTkVSQVRFJ10sXHJcbiAgICBhZG1pbjogWydBTEwnXSxcclxuICAgIHZpZXdlcjogWydJTlZPSUNFX1ZJRVcnLCAnUEFZTUVOVF9WSUVXJ10sXHJcbiAgfTtcclxuICBcclxuICByZXR1cm4gcm9sZVBlcm1pc3Npb25zW3JvbGVdIHx8IFtdO1xyXG59O1xyXG5cclxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSBvciBnZXQgdXNlclxyXG5jb25zdCBjcmVhdGVPckdldFVzZXIgPSBhc3luYyAobW9iaWxlOiBzdHJpbmcpOiBQcm9taXNlPEN1c3RvbVVzZXI+ID0+IHtcclxuICB0cnkge1xyXG4gICAgLy8gVHJ5IGRhdGFiYXNlIGZpcnN0XHJcbiAgICBsZXQgdXNlciA9IGF3YWl0IFVzZXJEYXRhYmFzZS5maW5kQnlNb2JpbGUobW9iaWxlKTtcclxuICAgIFxyXG4gICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgIC8vIENyZWF0ZSBuZXcgdXNlclxyXG4gICAgICBjb25zdCBuZXdVc2VyID0ge1xyXG4gICAgICAgIGVtYWlsOiBgdXNlcl8ke21vYmlsZS5yZXBsYWNlKC9bXlxcZF0vZywgJycpfUBzbWVwbGF0Zm9ybS5jb21gLFxyXG4gICAgICAgIG5hbWU6IGBVc2VyICR7bW9iaWxlfWAsXHJcbiAgICAgICAgcm9sZTogJ3NtZV9vd25lcicsIC8vIERlZmF1bHQgcm9sZVxyXG4gICAgICAgIHRlbmFudElkOiBgdGVuYW50XyR7RGF0ZS5ub3coKX1gLFxyXG4gICAgICAgIG1vYmlsZSxcclxuICAgICAgICBwZXJtaXNzaW9uczogZ2VuZXJhdGVQZXJtaXNzaW9ucygnc21lX293bmVyJyksXHJcbiAgICAgICAgbGFzdExvZ2luOiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIGlzQWN0aXZlOiB0cnVlLFxyXG4gICAgICB9O1xyXG4gICAgICBcclxuICAgICAgdXNlciA9IGF3YWl0IFVzZXJEYXRhYmFzZS51cHNlcnQobmV3VXNlcik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBVcGRhdGUgbGFzdCBsb2dpblxyXG4gICAgICBhd2FpdCBVc2VyRGF0YWJhc2UudXBkYXRlKHVzZXIuaWQsIHsgbGFzdExvZ2luOiBuZXcgRGF0ZSgpIH0pO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gdXNlcjtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRGF0YWJhc2Ugb3BlcmF0aW9uIGZhaWxlZCwgdXNpbmcgZmFsbGJhY2s6JywgZXJyb3IpO1xyXG4gICAgXHJcbiAgICAvLyBGYWxsYmFjayB0byBtb2NrIHN0b3JhZ2VcclxuICAgIGNvbnN0IG1vY2tVc2VyOiBDdXN0b21Vc2VyID0ge1xyXG4gICAgICBpZDogYHVzZXJfJHtEYXRlLm5vdygpfWAsXHJcbiAgICAgIGVtYWlsOiBgdXNlcl8ke21vYmlsZS5yZXBsYWNlKC9bXlxcZF0vZywgJycpfUBzbWVwbGF0Zm9ybS5jb21gLFxyXG4gICAgICBuYW1lOiBgVXNlciAke21vYmlsZX1gLFxyXG4gICAgICByb2xlOiAnc21lX293bmVyJyxcclxuICAgICAgdGVuYW50SWQ6IGB0ZW5hbnRfJHtEYXRlLm5vdygpfWAsXHJcbiAgICAgIG1vYmlsZSxcclxuICAgICAgcGVybWlzc2lvbnM6IGdlbmVyYXRlUGVybWlzc2lvbnMoJ3NtZV9vd25lcicpLFxyXG4gICAgICBsYXN0TG9naW46IG5ldyBEYXRlKCksXHJcbiAgICAgIGlzQWN0aXZlOiB0cnVlLFxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgbW9ja1VzZXJzLnNldChtb2JpbGUsIG1vY2tVc2VyKTtcclxuICAgIHJldHVybiBtb2NrVXNlcjtcclxuICB9XHJcbn07XHJcblxyXG4vLyBPVFAgQVBJIGZ1bmN0aW9uc1xyXG5leHBvcnQgY29uc3Qgb3RwQVBJID0ge1xyXG4gIHNlbmRPVFA6IGFzeW5jIChtb2JpbGU6IHN0cmluZykgPT4ge1xyXG4gICAgaWYgKCF2YWxpZGF0ZU1vYmlsZShtb2JpbGUpKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBtb2JpbGUgbnVtYmVyIGZvcm1hdCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG90cCA9IGdlbmVyYXRlT1RQKCk7XHJcbiAgICBjb25zdCBleHBpcmVzID0gbmV3IERhdGUoRGF0ZS5ub3coKSArIDEwICogNjAgKiAxMDAwKTsgLy8gMTAgbWludXRlc1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFN0b3JlIE9UUCBpbiBSZWRpcy9kYXRhYmFzZVxyXG4gICAgICBhd2FpdCBPVFBTdG9yZS5zdG9yZShtb2JpbGUsIG90cCwgZXhwaXJlcyk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBJbiBwcm9kdWN0aW9uLCBzZW5kIFNNUyB2aWEgQVdTIFNOUy9Ud2lsaW9cclxuICAgICAgY29uc29sZS5sb2coYFx1RDgzRFx1REQxMCBNb2NrIE9UUCBmb3IgJHttb2JpbGV9OiAke290cH1gKTtcclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICBtZXNzYWdlOiAnT1RQIHNlbnQgc3VjY2Vzc2Z1bGx5JyxcclxuICAgICAgICBvdHA6IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnID8gb3RwIDogdW5kZWZpbmVkLCAvLyBPbmx5IHNob3cgT1RQIGluIGRldmVsb3BtZW50XHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gc2VuZCBPVFA6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBzZW5kIE9UUCcpO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIHZlcmlmeU9UUDogYXN5bmMgKG1vYmlsZTogc3RyaW5nLCBvdHA6IHN0cmluZykgPT4ge1xyXG4gICAgaWYgKCF2YWxpZGF0ZU1vYmlsZShtb2JpbGUpKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBtb2JpbGUgbnVtYmVyIGZvcm1hdCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghL15cXGR7Nn0kLy50ZXN0KG90cCkpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIE9UUCBmb3JtYXQnKTtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBHZXQgT1RQIGZyb20gUmVkaXMvZGF0YWJhc2VcclxuICAgICAgY29uc3Qgb3RwRGF0YSA9IGF3YWl0IE9UUFN0b3JlLmdldChtb2JpbGUpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCFvdHBEYXRhKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPVFAgbm90IGZvdW5kIG9yIGV4cGlyZWQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgT1RQIGlzIGV4cGlyZWRcclxuICAgICAgaWYgKG5ldyBEYXRlKCkgPiBuZXcgRGF0ZShvdHBEYXRhLmV4cGlyZXMpKSB7XHJcbiAgICAgICAgYXdhaXQgT1RQU3RvcmUuZGVsZXRlKG1vYmlsZSk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdPVFAgaGFzIGV4cGlyZWQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2hlY2sgYXR0ZW1wdHNcclxuICAgICAgaWYgKG90cERhdGEuYXR0ZW1wdHMgPj0gMykge1xyXG4gICAgICAgIGF3YWl0IE9UUFN0b3JlLmRlbGV0ZShtb2JpbGUpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTWF4aW11bSBhdHRlbXB0cyByZWFjaGVkJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFZlcmlmeSBPVFBcclxuICAgICAgaWYgKG90cERhdGEub3RwICE9PSBvdHApIHtcclxuICAgICAgICBhd2FpdCBPVFBTdG9yZS5pbmNyZW1lbnRBdHRlbXB0cyhtb2JpbGUpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBPVFAnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gT1RQIGlzIHZhbGlkLCBjcmVhdGUgb3IgZ2V0IHVzZXJcclxuICAgICAgY29uc3QgdXNlciA9IGF3YWl0IGNyZWF0ZU9yR2V0VXNlcihtb2JpbGUpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2xlYW4gdXAgT1RQXHJcbiAgICAgIGF3YWl0IE9UUFN0b3JlLmRlbGV0ZShtb2JpbGUpO1xyXG5cclxuICAgICAgLy8gR2VuZXJhdGUgSldUIHRva2Vuc1xyXG4gICAgICBjb25zdCBwYXlsb2FkOiBPbWl0PEpXVFBheWxvYWQsICdpYXQnIHwgJ2V4cCc+ID0ge1xyXG4gICAgICAgIHVzZXJJZDogdXNlci5pZCxcclxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcclxuICAgICAgICByb2xlOiB1c2VyLnJvbGUsXHJcbiAgICAgICAgdGVuYW50SWQ6IHVzZXIudGVuYW50SWQsXHJcbiAgICAgICAgcGVybWlzc2lvbnM6IHVzZXIucGVybWlzc2lvbnMsXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCB0b2tlbnMgPSBnZW5lcmF0ZVRva2VuUGFpcihwYXlsb2FkKTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICBtZXNzYWdlOiAnT1RQIHZlcmlmaWVkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICAgICAgdXNlcixcclxuICAgICAgICB0b2tlbnMsXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gdmVyaWZ5IE9UUDonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH0sXHJcbn07XHJcblxyXG4vLyBBdXRoLmpzIGNvbmZpZ3VyYXRpb25cclxuZXhwb3J0IGNvbnN0IGF1dGhDb25maWc6IEF1dGhDb25maWcgPSB7XHJcbiAgcHJvdmlkZXJzOiBbXHJcbiAgICBHb29nbGUoe1xyXG4gICAgICBjbGllbnRJZDogcHJvY2Vzcy5lbnYuR09PR0xFX0NMSUVOVF9JRCB8fCAnbW9jay1nb29nbGUtY2xpZW50LWlkJyxcclxuICAgICAgY2xpZW50U2VjcmV0OiBwcm9jZXNzLmVudi5HT09HTEVfQ0xJRU5UX1NFQ1JFVCB8fCAnbW9jay1nb29nbGUtY2xpZW50LXNlY3JldCcsXHJcbiAgICB9KSxcclxuICAgIENyZWRlbnRpYWxzUHJvdmlkZXIoe1xyXG4gICAgICBuYW1lOiAnbW9iaWxlLW90cCcsXHJcbiAgICAgIGNyZWRlbnRpYWxzOiB7XHJcbiAgICAgICAgbW9iaWxlOiB7IGxhYmVsOiAnTW9iaWxlIE51bWJlcicsIHR5cGU6ICd0ZXh0JyB9LFxyXG4gICAgICAgIG90cDogeyBsYWJlbDogJ09UUCcsIHR5cGU6ICd0ZXh0JyB9LFxyXG4gICAgICB9LFxyXG4gICAgICBhc3luYyBhdXRob3JpemUoY3JlZGVudGlhbHM6IGFueSkge1xyXG4gICAgICAgIGlmICghY3JlZGVudGlhbHM/Lm1vYmlsZSB8fCAhY3JlZGVudGlhbHM/Lm90cCkge1xyXG4gICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgb3RwQVBJLnZlcmlmeU9UUChjcmVkZW50aWFscy5tb2JpbGUsIGNyZWRlbnRpYWxzLm90cCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2VzcyAmJiByZXN1bHQudXNlcikge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgIGlkOiByZXN1bHQudXNlci5pZCxcclxuICAgICAgICAgICAgICBlbWFpbDogcmVzdWx0LnVzZXIuZW1haWwsXHJcbiAgICAgICAgICAgICAgbmFtZTogcmVzdWx0LnVzZXIubmFtZSxcclxuICAgICAgICAgICAgICByb2xlOiByZXN1bHQudXNlci5yb2xlLFxyXG4gICAgICAgICAgICAgIHRlbmFudElkOiByZXN1bHQudXNlci50ZW5hbnRJZCxcclxuICAgICAgICAgICAgICBtb2JpbGU6IHJlc3VsdC51c2VyLm1vYmlsZSxcclxuICAgICAgICAgICAgICBwZXJtaXNzaW9uczogcmVzdWx0LnVzZXIucGVybWlzc2lvbnMsXHJcbiAgICAgICAgICAgICAgbGFzdExvZ2luOiByZXN1bHQudXNlci5sYXN0TG9naW4sXHJcbiAgICAgICAgICAgICAgaXNBY3RpdmU6IHJlc3VsdC51c2VyLmlzQWN0aXZlLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdXRob3JpemF0aW9uIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIF0sXHJcbiAgY2FsbGJhY2tzOiB7XHJcbiAgICBhc3luYyBqd3QoeyB0b2tlbiwgdXNlciwgYWNjb3VudCB9OiBhbnkpIHtcclxuICAgICAgLy8gUGVyc2lzdCB0aGUgT0F1dGggYWNjZXNzX3Rva2VuIGFuZCB1c2VyIGlkIHRvIHRoZSB0b2tlbiByaWdodCBhZnRlciBzaWduaW5cclxuICAgICAgaWYgKGFjY291bnQgJiYgdXNlcikge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAuLi50b2tlbixcclxuICAgICAgICAgIHVzZXJJZDogdXNlci5pZCxcclxuICAgICAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxyXG4gICAgICAgICAgbmFtZTogdXNlci5uYW1lLFxyXG4gICAgICAgICAgcm9sZTogdXNlci5yb2xlLFxyXG4gICAgICAgICAgdGVuYW50SWQ6IHVzZXIudGVuYW50SWQsXHJcbiAgICAgICAgICBtb2JpbGU6IHVzZXIubW9iaWxlLFxyXG4gICAgICAgICAgcGVybWlzc2lvbnM6IHVzZXIucGVybWlzc2lvbnMsXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdG9rZW47XHJcbiAgICB9LFxyXG4gICAgYXN5bmMgc2Vzc2lvbih7IHNlc3Npb24sIHRva2VuIH06IGFueSkge1xyXG4gICAgICAvLyBTZW5kIHByb3BlcnRpZXMgYW5kIHZhbHVlcyB0byB0aGUgY2xpZW50LCBsaWtlIGFuIGFjY2Vzc190b2tlbiBmcm9tIGEgcHJvdmlkZXJcclxuICAgICAgaWYgKHRva2VuKSB7XHJcbiAgICAgICAgc2Vzc2lvbi51c2VyID0ge1xyXG4gICAgICAgICAgaWQ6IHRva2VuLnVzZXJJZCxcclxuICAgICAgICAgIGVtYWlsOiB0b2tlbi5lbWFpbCxcclxuICAgICAgICAgIG5hbWU6IHRva2VuLm5hbWUsXHJcbiAgICAgICAgICByb2xlOiB0b2tlbi5yb2xlLFxyXG4gICAgICAgICAgdGVuYW50SWQ6IHRva2VuLnRlbmFudElkLFxyXG4gICAgICAgICAgbW9iaWxlOiB0b2tlbi5tb2JpbGUsXHJcbiAgICAgICAgICBwZXJtaXNzaW9uczogdG9rZW4ucGVybWlzc2lvbnMsXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gc2Vzc2lvbjtcclxuICAgIH0sXHJcbiAgfSxcclxuICBzZXNzaW9uOiB7XHJcbiAgICBzdHJhdGVneTogJ2p3dCcsXHJcbiAgICBtYXhBZ2U6IDI0ICogNjAgKiA2MCwgLy8gMjQgaG91cnNcclxuICB9LFxyXG4gIGp3dDoge1xyXG4gICAgbWF4QWdlOiAyNCAqIDYwICogNjAsIC8vIDI0IGhvdXJzXHJcbiAgfSxcclxuICBwYWdlczoge1xyXG4gICAgc2lnbkluOiAnL2F1dGgvc2lnbmluJyxcclxuICAgIGVycm9yOiAnL2F1dGgvZXJyb3InLFxyXG4gIH0sXHJcbn07XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcOTE4NThcXFxcRG93bmxvYWRzXFxcXFNNRV9QbGF0Zm9ybV8xMl9TZXBhcmF0ZV9Nb2R1bGVzXFxcXHBsYXRmb3JtXFxcXGZyb250ZW5kXFxcXHNyY1xcXFxsaWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXDkxODU4XFxcXERvd25sb2Fkc1xcXFxTTUVfUGxhdGZvcm1fMTJfU2VwYXJhdGVfTW9kdWxlc1xcXFxwbGF0Zm9ybVxcXFxmcm9udGVuZFxcXFxzcmNcXFxcbGliXFxcXGRhdGFiYXNlLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy85MTg1OC9Eb3dubG9hZHMvU01FX1BsYXRmb3JtXzEyX1NlcGFyYXRlX01vZHVsZXMvcGxhdGZvcm0vZnJvbnRlbmQvc3JjL2xpYi9kYXRhYmFzZS50c1wiO2ltcG9ydCB7IFBvb2wsIFBvb2xDbGllbnQgfSBmcm9tICdwZyc7XHJcbmltcG9ydCBSZWRpcyBmcm9tICdpb3JlZGlzJztcclxuaW1wb3J0IGRvdGVudiBmcm9tICdkb3RlbnYnO1xyXG5cclxuLy8gTG9hZCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuZG90ZW52LmNvbmZpZygpO1xyXG5cclxuLy8gRGF0YWJhc2UgY29ubmVjdGlvbiBwb29sXHJcbmxldCBwb29sOiBQb29sO1xyXG5sZXQgcmVkaXM6IFJlZGlzO1xyXG5cclxuLy8gSW5pdGlhbGl6ZSBkYXRhYmFzZSBjb25uZWN0aW9uc1xyXG5leHBvcnQgY29uc3QgaW5pdGlhbGl6ZURhdGFiYXNlID0gYXN5bmMgKCkgPT4ge1xyXG4gIHRyeSB7XHJcbiAgICAvLyBQb3N0Z3JlU1FMIGNvbm5lY3Rpb25cclxuICAgIGlmIChwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkwpIHtcclxuICAgICAgcG9vbCA9IG5ldyBQb29sKHtcclxuICAgICAgICBjb25uZWN0aW9uU3RyaW5nOiBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkwsXHJcbiAgICAgICAgbWF4OiAyMCxcclxuICAgICAgICBpZGxlVGltZW91dE1pbGxpczogMzAwMDAsXHJcbiAgICAgICAgY29ubmVjdGlvblRpbWVvdXRNaWxsaXM6IDIwMDAsXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgLy8gVGVzdCB0aGUgY29ubmVjdGlvblxyXG4gICAgICBjb25zdCBjbGllbnQgPSBhd2FpdCBwb29sLmNvbm5lY3QoKTtcclxuICAgICAgYXdhaXQgY2xpZW50LnF1ZXJ5KCdTRUxFQ1QgTk9XKCknKTtcclxuICAgICAgY2xpZW50LnJlbGVhc2UoKTtcclxuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBQb3N0Z3JlU1FMIGNvbm5lY3RlZCBzdWNjZXNzZnVsbHknKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdcdTI2QTBcdUZFMEYgREFUQUJBU0VfVVJMIG5vdCBwcm92aWRlZCwgdXNpbmcgbW9jayBzdG9yYWdlJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmVkaXMgY29ubmVjdGlvblxyXG4gICAgaWYgKHByb2Nlc3MuZW52LlJFRElTX1VSTCkge1xyXG4gICAgICByZWRpcyA9IG5ldyBSZWRpcyhwcm9jZXNzLmVudi5SRURJU19VUkwpO1xyXG4gICAgICBcclxuICAgICAgLy8gVGVzdCB0aGUgY29ubmVjdGlvblxyXG4gICAgICBhd2FpdCByZWRpcy5waW5nKCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgUmVkaXMgY29ubmVjdGVkIHN1Y2Nlc3NmdWxseScpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc29sZS5sb2coJ1x1MjZBMFx1RkUwRiBSRURJU19VUkwgbm90IHByb3ZpZGVkLCB1c2luZyBtb2NrIHN0b3JhZ2UnKTtcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignXHUyNzRDIERhdGFiYXNlIGluaXRpYWxpemF0aW9uIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn07XHJcblxyXG4vLyBVc2VyIGRhdGFiYXNlIG9wZXJhdGlvbnNcclxuZXhwb3J0IGludGVyZmFjZSBVc2VyIHtcclxuICBpZDogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG4gIHJvbGU6IHN0cmluZztcclxuICB0ZW5hbnRJZDogc3RyaW5nO1xyXG4gIG1vYmlsZT86IHN0cmluZztcclxuICBwZXJtaXNzaW9uczogc3RyaW5nW107XHJcbiAgbGFzdExvZ2luPzogRGF0ZTtcclxuICBpc0FjdGl2ZTogYm9vbGVhbjtcclxuICBjcmVhdGVkQXQ6IERhdGU7XHJcbiAgdXBkYXRlZEF0OiBEYXRlO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVXNlckRhdGFiYXNlIHtcclxuICAvLyBDcmVhdGUgb3IgdXBkYXRlIHVzZXJcclxuICBzdGF0aWMgYXN5bmMgdXBzZXJ0KHVzZXI6IE9taXQ8VXNlciwgJ2lkJyB8ICdjcmVhdGVkQXQnIHwgJ3VwZGF0ZWRBdCc+KTogUHJvbWlzZTxVc2VyPiB7XHJcbiAgICBpZiAoIXBvb2wpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEYXRhYmFzZSBub3QgaW5pdGlhbGl6ZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjbGllbnQgPSBhd2FpdCBwb29sLmNvbm5lY3QoKTtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gYFxyXG4gICAgICAgIElOU0VSVCBJTlRPIHVzZXJzIChlbWFpbCwgbmFtZSwgcm9sZSwgdGVuYW50X2lkLCBtb2JpbGUsIHBlcm1pc3Npb25zLCBsYXN0X2xvZ2luLCBpc19hY3RpdmUsIGNyZWF0ZWRfYXQsIHVwZGF0ZWRfYXQpXHJcbiAgICAgICAgVkFMVUVTICgkMSwgJDIsICQzLCAkNCwgJDUsICQ2LCAkNywgJDgsIE5PVygpLCBOT1coKSlcclxuICAgICAgICBPTiBDT05GTElDVCAoZW1haWwpIFxyXG4gICAgICAgIERPIFVQREFURSBTRVQgXHJcbiAgICAgICAgICBuYW1lID0gJDIsXHJcbiAgICAgICAgICByb2xlID0gJDMsXHJcbiAgICAgICAgICB0ZW5hbnRfaWQgPSAkNCxcclxuICAgICAgICAgIG1vYmlsZSA9ICQ1LFxyXG4gICAgICAgICAgcGVybWlzc2lvbnMgPSAkNixcclxuICAgICAgICAgIGxhc3RfbG9naW4gPSAkNyxcclxuICAgICAgICAgIHVwZGF0ZWRfYXQgPSBOT1coKVxyXG4gICAgICAgIFJFVFVSTklORyAqXHJcbiAgICAgIGA7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCB2YWx1ZXMgPSBbXHJcbiAgICAgICAgdXNlci5lbWFpbCxcclxuICAgICAgICB1c2VyLm5hbWUsXHJcbiAgICAgICAgdXNlci5yb2xlLFxyXG4gICAgICAgIHVzZXIudGVuYW50SWQsXHJcbiAgICAgICAgdXNlci5tb2JpbGUgfHwgbnVsbCxcclxuICAgICAgICBKU09OLnN0cmluZ2lmeSh1c2VyLnBlcm1pc3Npb25zKSxcclxuICAgICAgICB1c2VyLmxhc3RMb2dpbiB8fCBudWxsLFxyXG4gICAgICAgIHVzZXIuaXNBY3RpdmVcclxuICAgICAgXTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsaWVudC5xdWVyeShxdWVyeSwgdmFsdWVzKTtcclxuICAgICAgcmV0dXJuIHRoaXMubWFwUm93VG9Vc2VyKHJlc3VsdC5yb3dzWzBdKTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgIGNsaWVudC5yZWxlYXNlKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBGaW5kIHVzZXIgYnkgZW1haWxcclxuICBzdGF0aWMgYXN5bmMgZmluZEJ5RW1haWwoZW1haWw6IHN0cmluZyk6IFByb21pc2U8VXNlciB8IG51bGw+IHtcclxuICAgIGlmICghcG9vbCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RhdGFiYXNlIG5vdCBpbml0aWFsaXplZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNsaWVudCA9IGF3YWl0IHBvb2wuY29ubmVjdCgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xpZW50LnF1ZXJ5KCdTRUxFQ1QgKiBGUk9NIHVzZXJzIFdIRVJFIGVtYWlsID0gJDEnLCBbZW1haWxdKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdC5yb3dzLmxlbmd0aCA+IDAgPyB0aGlzLm1hcFJvd1RvVXNlcihyZXN1bHQucm93c1swXSkgOiBudWxsO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgY2xpZW50LnJlbGVhc2UoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIEZpbmQgdXNlciBieSBtb2JpbGVcclxuICBzdGF0aWMgYXN5bmMgZmluZEJ5TW9iaWxlKG1vYmlsZTogc3RyaW5nKTogUHJvbWlzZTxVc2VyIHwgbnVsbD4ge1xyXG4gICAgaWYgKCFwb29sKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRGF0YWJhc2Ugbm90IGluaXRpYWxpemVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY2xpZW50ID0gYXdhaXQgcG9vbC5jb25uZWN0KCk7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGllbnQucXVlcnkoJ1NFTEVDVCAqIEZST00gdXNlcnMgV0hFUkUgbW9iaWxlID0gJDEnLCBbbW9iaWxlXSk7XHJcbiAgICAgIHJldHVybiByZXN1bHQucm93cy5sZW5ndGggPiAwID8gdGhpcy5tYXBSb3dUb1VzZXIocmVzdWx0LnJvd3NbMF0pIDogbnVsbDtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgIGNsaWVudC5yZWxlYXNlKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBGaW5kIHVzZXIgYnkgSURcclxuICBzdGF0aWMgYXN5bmMgZmluZEJ5SWQoaWQ6IHN0cmluZyk6IFByb21pc2U8VXNlciB8IG51bGw+IHtcclxuICAgIGlmICghcG9vbCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RhdGFiYXNlIG5vdCBpbml0aWFsaXplZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNsaWVudCA9IGF3YWl0IHBvb2wuY29ubmVjdCgpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xpZW50LnF1ZXJ5KCdTRUxFQ1QgKiBGUk9NIHVzZXJzIFdIRVJFIGlkID0gJDEnLCBbaWRdKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdC5yb3dzLmxlbmd0aCA+IDAgPyB0aGlzLm1hcFJvd1RvVXNlcihyZXN1bHQucm93c1swXSkgOiBudWxsO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgY2xpZW50LnJlbGVhc2UoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFVwZGF0ZSB1c2VyXHJcbiAgc3RhdGljIGFzeW5jIHVwZGF0ZShpZDogc3RyaW5nLCB1cGRhdGVzOiBQYXJ0aWFsPFVzZXI+KTogUHJvbWlzZTxVc2VyIHwgbnVsbD4ge1xyXG4gICAgaWYgKCFwb29sKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRGF0YWJhc2Ugbm90IGluaXRpYWxpemVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY2xpZW50ID0gYXdhaXQgcG9vbC5jb25uZWN0KCk7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBmaWVsZHMgPSBbXTtcclxuICAgICAgY29uc3QgdmFsdWVzID0gW107XHJcbiAgICAgIGxldCBwYXJhbUluZGV4ID0gMTtcclxuXHJcbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHVwZGF0ZXMpKSB7XHJcbiAgICAgICAgaWYgKGtleSA9PT0gJ2lkJyB8fCBrZXkgPT09ICdjcmVhdGVkQXQnKSBjb250aW51ZTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBkYkZpZWxkID0gdGhpcy5jYW1lbFRvU25ha2Uoa2V5KTtcclxuICAgICAgICBmaWVsZHMucHVzaChgJHtkYkZpZWxkfSA9ICQke3BhcmFtSW5kZXh9YCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGtleSA9PT0gJ3Blcm1pc3Npb25zJykge1xyXG4gICAgICAgICAgdmFsdWVzLnB1c2goSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgdmFsdWVzLnB1c2godmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwYXJhbUluZGV4Kys7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZpZWxkcy5wdXNoKGB1cGRhdGVkX2F0ID0gTk9XKClgKTtcclxuICAgICAgdmFsdWVzLnB1c2goaWQpO1xyXG5cclxuICAgICAgY29uc3QgcXVlcnkgPSBgVVBEQVRFIHVzZXJzIFNFVCAke2ZpZWxkcy5qb2luKCcsICcpfSBXSEVSRSBpZCA9ICQke3BhcmFtSW5kZXh9IFJFVFVSTklORyAqYDtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xpZW50LnF1ZXJ5KHF1ZXJ5LCB2YWx1ZXMpO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHJlc3VsdC5yb3dzLmxlbmd0aCA+IDAgPyB0aGlzLm1hcFJvd1RvVXNlcihyZXN1bHQucm93c1swXSkgOiBudWxsO1xyXG4gICAgfSBmaW5hbGx5IHtcclxuICAgICAgY2xpZW50LnJlbGVhc2UoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIEhlbHBlciBtZXRob2QgdG8gbWFwIGRhdGFiYXNlIHJvdyB0byBVc2VyIG9iamVjdFxyXG4gIHByaXZhdGUgc3RhdGljIG1hcFJvd1RvVXNlcihyb3c6IGFueSk6IFVzZXIge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaWQ6IHJvdy5pZCxcclxuICAgICAgZW1haWw6IHJvdy5lbWFpbCxcclxuICAgICAgbmFtZTogcm93Lm5hbWUsXHJcbiAgICAgIHJvbGU6IHJvdy5yb2xlLFxyXG4gICAgICB0ZW5hbnRJZDogcm93LnRlbmFudF9pZCxcclxuICAgICAgbW9iaWxlOiByb3cubW9iaWxlLFxyXG4gICAgICBwZXJtaXNzaW9uczogQXJyYXkuaXNBcnJheShyb3cucGVybWlzc2lvbnMpID8gcm93LnBlcm1pc3Npb25zIDogSlNPTi5wYXJzZShyb3cucGVybWlzc2lvbnMgfHwgJ1tdJyksXHJcbiAgICAgIGxhc3RMb2dpbjogcm93Lmxhc3RfbG9naW4gPyBuZXcgRGF0ZShyb3cubGFzdF9sb2dpbikgOiB1bmRlZmluZWQsXHJcbiAgICAgIGlzQWN0aXZlOiByb3cuaXNfYWN0aXZlLFxyXG4gICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKHJvdy5jcmVhdGVkX2F0KSxcclxuICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZShyb3cudXBkYXRlZF9hdCksXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLy8gSGVscGVyIG1ldGhvZCB0byBjb252ZXJ0IGNhbWVsQ2FzZSB0byBzbmFrZV9jYXNlXHJcbiAgcHJpdmF0ZSBzdGF0aWMgY2FtZWxUb1NuYWtlKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBzdHIucmVwbGFjZSgvW0EtWl0vZywgbGV0dGVyID0+IGBfJHtsZXR0ZXIudG9Mb3dlckNhc2UoKX1gKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIE9UUCBzdG9yYWdlIG9wZXJhdGlvbnNcclxuZXhwb3J0IGludGVyZmFjZSBPVFBEYXRhIHtcclxuICBvdHA6IHN0cmluZztcclxuICBtb2JpbGU6IHN0cmluZztcclxuICBleHBpcmVzOiBEYXRlO1xyXG4gIGF0dGVtcHRzOiBudW1iZXI7XHJcbiAgY3JlYXRlZEF0OiBEYXRlO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgT1RQU3RvcmUge1xyXG4gIHN0YXRpYyBhc3luYyBzdG9yZShtb2JpbGU6IHN0cmluZywgb3RwOiBzdHJpbmcsIGV4cGlyZXM6IERhdGUpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmIChyZWRpcykge1xyXG4gICAgICAvLyBVc2UgUmVkaXMgZm9yIHByb2R1Y3Rpb25cclxuICAgICAgY29uc3QgZGF0YSA9IHtcclxuICAgICAgICBvdHAsXHJcbiAgICAgICAgbW9iaWxlLFxyXG4gICAgICAgIGV4cGlyZXM6IGV4cGlyZXMudG9JU09TdHJpbmcoKSxcclxuICAgICAgICBhdHRlbXB0czogMCxcclxuICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgfTtcclxuICAgICAgYXdhaXQgcmVkaXMuc2V0ZXgoYG90cDoke21vYmlsZX1gLCA2MDAsIEpTT04uc3RyaW5naWZ5KGRhdGEpKTsgLy8gMTAgbWludXRlcyBUVExcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIEZhbGxiYWNrIHRvIGluLW1lbW9yeSBzdG9yYWdlIChkZXZlbG9wbWVudCBvbmx5KVxyXG4gICAgICBjb25zb2xlLmxvZygnXHUyNkEwXHVGRTBGIFVzaW5nIGluLW1lbW9yeSBPVFAgc3RvcmFnZSAoUmVkaXMgbm90IGF2YWlsYWJsZSknKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXRpYyBhc3luYyBnZXQobW9iaWxlOiBzdHJpbmcpOiBQcm9taXNlPE9UUERhdGEgfCBudWxsPiB7XHJcbiAgICBpZiAocmVkaXMpIHtcclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlZGlzLmdldChgb3RwOiR7bW9iaWxlfWApO1xyXG4gICAgICByZXR1cm4gZGF0YSA/IEpTT04ucGFyc2UoZGF0YSkgOiBudWxsO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gRmFsbGJhY2sgZm9yIGRldmVsb3BtZW50XHJcbiAgICAgIGNvbnNvbGUubG9nKCdcdTI2QTBcdUZFMEYgT1RQIHJldHJpZXZhbCBub3QgYXZhaWxhYmxlIChSZWRpcyBub3QgY29ubmVjdGVkKScpO1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHN0YXRpYyBhc3luYyBpbmNyZW1lbnRBdHRlbXB0cyhtb2JpbGU6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgICBpZiAocmVkaXMpIHtcclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuZ2V0KG1vYmlsZSk7XHJcbiAgICAgIGlmIChkYXRhKSB7XHJcbiAgICAgICAgZGF0YS5hdHRlbXB0cyArPSAxO1xyXG4gICAgICAgIGF3YWl0IHJlZGlzLnNldGV4KGBvdHA6JHttb2JpbGV9YCwgNjAwLCBKU09OLnN0cmluZ2lmeShkYXRhKSk7XHJcbiAgICAgICAgcmV0dXJuIGRhdGEuYXR0ZW1wdHM7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiAwO1xyXG4gIH1cclxuXHJcbiAgc3RhdGljIGFzeW5jIGRlbGV0ZShtb2JpbGU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYgKHJlZGlzKSB7XHJcbiAgICAgIGF3YWl0IHJlZGlzLmRlbChgb3RwOiR7bW9iaWxlfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc3RhdGljIGFzeW5jIGNsZWFudXAoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAocmVkaXMpIHtcclxuICAgICAgLy8gUmVkaXMgaGFuZGxlcyBUVEwgYXV0b21hdGljYWxseSwgYnV0IHdlIGNhbiBhZGQgbWFudWFsIGNsZWFudXAgaWYgbmVlZGVkXHJcbiAgICAgIGNvbnN0IGtleXMgPSBhd2FpdCByZWRpcy5rZXlzKCdvdHA6KicpO1xyXG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XHJcbiAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlZGlzLmdldChrZXkpO1xyXG4gICAgICAgIGlmIChkYXRhKSB7XHJcbiAgICAgICAgICBjb25zdCBvdHBEYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgICAgICAgIGlmIChuZXcgRGF0ZShvdHBEYXRhLmV4cGlyZXMpIDwgbmV3IERhdGUoKSkge1xyXG4gICAgICAgICAgICBhd2FpdCByZWRpcy5kZWwoa2V5KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8vIERhdGFiYXNlIHNjaGVtYSBpbml0aWFsaXphdGlvblxyXG5leHBvcnQgY29uc3QgaW5pdGlhbGl6ZVNjaGVtYSA9IGFzeW5jICgpID0+IHtcclxuICBpZiAoIXBvb2wpIHtcclxuICAgIGNvbnNvbGUubG9nKCdcdTI2QTBcdUZFMEYgU2tpcHBpbmcgc2NoZW1hIGluaXRpYWxpemF0aW9uIChkYXRhYmFzZSBub3QgY29ubmVjdGVkKScpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgY2xpZW50ID0gYXdhaXQgcG9vbC5jb25uZWN0KCk7XHJcbiAgdHJ5IHtcclxuICAgIC8vIENyZWF0ZSB1c2VycyB0YWJsZVxyXG4gICAgYXdhaXQgY2xpZW50LnF1ZXJ5KGBcclxuICAgICAgQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgdXNlcnMgKFxyXG4gICAgICAgIGlkIFVVSUQgUFJJTUFSWSBLRVkgREVGQVVMVCBnZW5fcmFuZG9tX3V1aWQoKSxcclxuICAgICAgICBlbWFpbCBWQVJDSEFSKDI1NSkgVU5JUVVFIE5PVCBOVUxMLFxyXG4gICAgICAgIG5hbWUgVkFSQ0hBUigyNTUpIE5PVCBOVUxMLFxyXG4gICAgICAgIHJvbGUgVkFSQ0hBUig1MCkgTk9UIE5VTEwsXHJcbiAgICAgICAgdGVuYW50X2lkIFZBUkNIQVIoMjU1KSBOT1QgTlVMTCxcclxuICAgICAgICBtb2JpbGUgVkFSQ0hBUigyMCksXHJcbiAgICAgICAgcGVybWlzc2lvbnMgSlNPTkIgREVGQVVMVCAnW10nLFxyXG4gICAgICAgIGxhc3RfbG9naW4gVElNRVNUQU1QLFxyXG4gICAgICAgIGlzX2FjdGl2ZSBCT09MRUFOIERFRkFVTFQgdHJ1ZSxcclxuICAgICAgICBjcmVhdGVkX2F0IFRJTUVTVEFNUCBERUZBVUxUIENVUlJFTlRfVElNRVNUQU1QLFxyXG4gICAgICAgIHVwZGF0ZWRfYXQgVElNRVNUQU1QIERFRkFVTFQgQ1VSUkVOVF9USU1FU1RBTVBcclxuICAgICAgKVxyXG4gICAgYCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGluZGV4ZXNcclxuICAgIGF3YWl0IGNsaWVudC5xdWVyeSgnQ1JFQVRFIElOREVYIElGIE5PVCBFWElTVFMgaWR4X3VzZXJzX2VtYWlsIE9OIHVzZXJzKGVtYWlsKScpO1xyXG4gICAgYXdhaXQgY2xpZW50LnF1ZXJ5KCdDUkVBVEUgSU5ERVggSUYgTk9UIEVYSVNUUyBpZHhfdXNlcnNfbW9iaWxlIE9OIHVzZXJzKG1vYmlsZSknKTtcclxuICAgIGF3YWl0IGNsaWVudC5xdWVyeSgnQ1JFQVRFIElOREVYIElGIE5PVCBFWElTVFMgaWR4X3VzZXJzX3RlbmFudF9pZCBPTiB1c2Vycyh0ZW5hbnRfaWQpJyk7XHJcbiAgICBhd2FpdCBjbGllbnQucXVlcnkoJ0NSRUFURSBJTkRFWCBJRiBOT1QgRVhJU1RTIGlkeF91c2Vyc19yb2xlIE9OIHVzZXJzKHJvbGUpJyk7XHJcblxyXG4gICAgY29uc29sZS5sb2coJ1x1MjcwNSBEYXRhYmFzZSBzY2hlbWEgaW5pdGlhbGl6ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBTY2hlbWEgaW5pdGlhbGl6YXRpb24gZmFpbGVkOicsIGVycm9yKTtcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH0gZmluYWxseSB7XHJcbiAgICBjbGllbnQucmVsZWFzZSgpO1xyXG4gIH1cclxufTtcclxuXHJcbi8vIENsb3NlIGRhdGFiYXNlIGNvbm5lY3Rpb25zXHJcbmV4cG9ydCBjb25zdCBjbG9zZURhdGFiYXNlID0gYXN5bmMgKCkgPT4ge1xyXG4gIGlmIChwb29sKSB7XHJcbiAgICBhd2FpdCBwb29sLmVuZCgpO1xyXG4gICAgY29uc29sZS5sb2coJ1x1MjcwNSBQb3N0Z3JlU1FMIGNvbm5lY3Rpb24gY2xvc2VkJyk7XHJcbiAgfVxyXG4gIFxyXG4gIGlmIChyZWRpcykge1xyXG4gICAgYXdhaXQgcmVkaXMucXVpdCgpO1xyXG4gICAgY29uc29sZS5sb2coJ1x1MjcwNSBSZWRpcyBjb25uZWN0aW9uIGNsb3NlZCcpO1xyXG4gIH1cclxufTtcclxuXHJcbi8vIEhlYWx0aCBjaGVja1xyXG5leHBvcnQgY29uc3QgaGVhbHRoQ2hlY2sgPSBhc3luYyAoKSA9PiB7XHJcbiAgY29uc3QgaGVhbHRoID0ge1xyXG4gICAgZGF0YWJhc2U6IGZhbHNlLFxyXG4gICAgcmVkaXM6IGZhbHNlLFxyXG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgfTtcclxuXHJcbiAgaWYgKHBvb2wpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHBvb2wucXVlcnkoJ1NFTEVDVCAxJyk7XHJcbiAgICAgIGhlYWx0aC5kYXRhYmFzZSA9IHRydWU7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdEYXRhYmFzZSBoZWFsdGggY2hlY2sgZmFpbGVkOicsIGVycm9yKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmIChyZWRpcykge1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgcmVkaXMucGluZygpO1xyXG4gICAgICBoZWFsdGgucmVkaXMgPSB0cnVlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignUmVkaXMgaGVhbHRoIGNoZWNrIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gaGVhbHRoO1xyXG59O1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXDkxODU4XFxcXERvd25sb2Fkc1xcXFxTTUVfUGxhdGZvcm1fMTJfU2VwYXJhdGVfTW9kdWxlc1xcXFxwbGF0Zm9ybVxcXFxmcm9udGVuZFxcXFxzcmNcXFxcbGliXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFw5MTg1OFxcXFxEb3dubG9hZHNcXFxcU01FX1BsYXRmb3JtXzEyX1NlcGFyYXRlX01vZHVsZXNcXFxccGxhdGZvcm1cXFxcZnJvbnRlbmRcXFxcc3JjXFxcXGxpYlxcXFxqd3QudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzLzkxODU4L0Rvd25sb2Fkcy9TTUVfUGxhdGZvcm1fMTJfU2VwYXJhdGVfTW9kdWxlcy9wbGF0Zm9ybS9mcm9udGVuZC9zcmMvbGliL2p3dC50c1wiO2ltcG9ydCBqd3QgZnJvbSAnanNvbndlYnRva2VuJztcclxuaW1wb3J0IGRvdGVudiBmcm9tICdkb3RlbnYnO1xyXG5cclxuLy8gTG9hZCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuZG90ZW52LmNvbmZpZygpO1xyXG5cclxuLy8gSldUIENvbmZpZ3VyYXRpb25cclxuY29uc3QgSldUX1NFQ1JFVCA9IHByb2Nlc3MuZW52LkpXVF9TRUNSRVQgfHwgcHJvY2Vzcy5lbnYuQVVUSF9TRUNSRVQgfHwgJ2ZhbGxiYWNrLXNlY3JldC1jaGFuZ2UtaW4tcHJvZHVjdGlvbic7XHJcbmNvbnN0IEpXVF9FWFBJUkVTX0lOID0gcHJvY2Vzcy5lbnYuSldUX0VYUElSRVNfSU4gfHwgJzI0aCc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEpXVFBheWxvYWQge1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgcm9sZTogc3RyaW5nO1xyXG4gIHRlbmFudElkOiBzdHJpbmc7XHJcbiAgcGVybWlzc2lvbnM6IHN0cmluZ1tdO1xyXG4gIGlhdD86IG51bWJlcjtcclxuICBleHA/OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW5QYWlyIHtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgYSBKV1QgYWNjZXNzIHRva2VuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgZ2VuZXJhdGVBY2Nlc3NUb2tlbiA9IChwYXlsb2FkOiBPbWl0PEpXVFBheWxvYWQsICdpYXQnIHwgJ2V4cCc+KTogc3RyaW5nID0+IHtcclxuICB0cnkge1xyXG4gICAgcmV0dXJuIGp3dC5zaWduKHBheWxvYWQsIEpXVF9TRUNSRVQsIHtcclxuICAgICAgZXhwaXJlc0luOiBKV1RfRVhQSVJFU19JTixcclxuICAgICAgaXNzdWVyOiAnc21lLXBsYXRmb3JtJyxcclxuICAgICAgYXVkaWVuY2U6ICdzbWUtcGxhdGZvcm0tdXNlcnMnLFxyXG4gICAgfSBhcyBqd3QuU2lnbk9wdGlvbnMpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdKV1QgZ2VuZXJhdGlvbiBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZ2VuZXJhdGUgYWNjZXNzIHRva2VuJyk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlIGEgcmVmcmVzaCB0b2tlbiAobG9uZ2VyLWxpdmVkKVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGdlbmVyYXRlUmVmcmVzaFRva2VuID0gKHVzZXJJZDogc3RyaW5nKTogc3RyaW5nID0+IHtcclxuICB0cnkge1xyXG4gICAgcmV0dXJuIGp3dC5zaWduKFxyXG4gICAgICB7IHVzZXJJZCwgdHlwZTogJ3JlZnJlc2gnIH0sXHJcbiAgICAgIEpXVF9TRUNSRVQsXHJcbiAgICAgIHsgZXhwaXJlc0luOiAnN2QnIH0gYXMgand0LlNpZ25PcHRpb25zXHJcbiAgICApO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdSZWZyZXNoIHRva2VuIGdlbmVyYXRpb24gZmFpbGVkOicsIGVycm9yKTtcclxuICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGdlbmVyYXRlIHJlZnJlc2ggdG9rZW4nKTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgYm90aCBhY2Nlc3MgYW5kIHJlZnJlc2ggdG9rZW5zXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgZ2VuZXJhdGVUb2tlblBhaXIgPSAocGF5bG9hZDogT21pdDxKV1RQYXlsb2FkLCAnaWF0JyB8ICdleHAnPik6IFRva2VuUGFpciA9PiB7XHJcbiAgY29uc3QgYWNjZXNzVG9rZW4gPSBnZW5lcmF0ZUFjY2Vzc1Rva2VuKHBheWxvYWQpO1xyXG4gIGNvbnN0IHJlZnJlc2hUb2tlbiA9IGdlbmVyYXRlUmVmcmVzaFRva2VuKHBheWxvYWQudXNlcklkKTtcclxuICBcclxuICAvLyBDYWxjdWxhdGUgZXhwaXJhdGlvbiB0aW1lIGluIHNlY29uZHNcclxuICBjb25zdCBleHBpcmVzSW4gPSBKV1RfRVhQSVJFU19JTi5lbmRzV2l0aCgnaCcpIFxyXG4gICAgPyBwYXJzZUludChKV1RfRVhQSVJFU19JTikgKiAzNjAwXHJcbiAgICA6IEpXVF9FWFBJUkVTX0lOLmVuZHNXaXRoKCdkJylcclxuICAgID8gcGFyc2VJbnQoSldUX0VYUElSRVNfSU4pICogODY0MDBcclxuICAgIDogMzYwMDsgLy8gRGVmYXVsdCB0byAxIGhvdXJcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGFjY2Vzc1Rva2VuLFxyXG4gICAgcmVmcmVzaFRva2VuLFxyXG4gICAgZXhwaXJlc0luLFxyXG4gIH07XHJcbn07XHJcblxyXG4vKipcclxuICogVmVyaWZ5IGFuZCBkZWNvZGUgYSBKV1QgdG9rZW5cclxuICovXHJcbmV4cG9ydCBjb25zdCB2ZXJpZnlUb2tlbiA9ICh0b2tlbjogc3RyaW5nKTogSldUUGF5bG9hZCA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGRlY29kZWQgPSBqd3QudmVyaWZ5KHRva2VuLCBKV1RfU0VDUkVULCB7XHJcbiAgICAgIGlzc3VlcjogJ3NtZS1wbGF0Zm9ybScsXHJcbiAgICAgIGF1ZGllbmNlOiAnc21lLXBsYXRmb3JtLXVzZXJzJyxcclxuICAgIH0pIGFzIEpXVFBheWxvYWQ7XHJcblxyXG4gICAgcmV0dXJuIGRlY29kZWQ7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIGp3dC5Ub2tlbkV4cGlyZWRFcnJvcikge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Rva2VuIGhhcyBleHBpcmVkJyk7XHJcbiAgICB9IGVsc2UgaWYgKGVycm9yIGluc3RhbmNlb2Ygand0Lkpzb25XZWJUb2tlbkVycm9yKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0b2tlbicpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc29sZS5lcnJvcignVG9rZW4gdmVyaWZpY2F0aW9uIGZhaWxlZDonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignVG9rZW4gdmVyaWZpY2F0aW9uIGZhaWxlZCcpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBWZXJpZnkgYSByZWZyZXNoIHRva2VuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgdmVyaWZ5UmVmcmVzaFRva2VuID0gKHRva2VuOiBzdHJpbmcpOiB7IHVzZXJJZDogc3RyaW5nIH0gPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBkZWNvZGVkID0gand0LnZlcmlmeSh0b2tlbiwgSldUX1NFQ1JFVCkgYXMgYW55O1xyXG4gICAgXHJcbiAgICBpZiAoZGVjb2RlZC50eXBlICE9PSAncmVmcmVzaCcpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHJlZnJlc2ggdG9rZW4nKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHsgdXNlcklkOiBkZWNvZGVkLnVzZXJJZCB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBqd3QuVG9rZW5FeHBpcmVkRXJyb3IpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZWZyZXNoIHRva2VuIGhhcyBleHBpcmVkJyk7XHJcbiAgICB9IGVsc2UgaWYgKGVycm9yIGluc3RhbmNlb2Ygand0Lkpzb25XZWJUb2tlbkVycm9yKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCByZWZyZXNoIHRva2VuJyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdSZWZyZXNoIHRva2VuIHZlcmlmaWNhdGlvbiBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlZnJlc2ggdG9rZW4gdmVyaWZpY2F0aW9uIGZhaWxlZCcpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWNvZGUgYSB0b2tlbiB3aXRob3V0IHZlcmlmaWNhdGlvbiAoZm9yIGRlYnVnZ2luZylcclxuICovXHJcbmV4cG9ydCBjb25zdCBkZWNvZGVUb2tlbiA9ICh0b2tlbjogc3RyaW5nKTogSldUUGF5bG9hZCB8IG51bGwgPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBkZWNvZGVkID0gand0LmRlY29kZSh0b2tlbikgYXMgSldUUGF5bG9hZDtcclxuICAgIHJldHVybiBkZWNvZGVkO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdUb2tlbiBkZWNvZGluZyBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIGEgdG9rZW4gaXMgZXhwaXJlZFxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGlzVG9rZW5FeHBpcmVkID0gKHRva2VuOiBzdHJpbmcpOiBib29sZWFuID0+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgZGVjb2RlZCA9IGRlY29kZVRva2VuKHRva2VuKTtcclxuICAgIGlmICghZGVjb2RlZCB8fCAhZGVjb2RlZC5leHApIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XHJcbiAgICByZXR1cm4gZGVjb2RlZC5leHAgPCBjdXJyZW50VGltZTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEV4dHJhY3QgdG9rZW4gZnJvbSBBdXRob3JpemF0aW9uIGhlYWRlclxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGV4dHJhY3RUb2tlbkZyb21IZWFkZXIgPSAoYXV0aEhlYWRlcjogc3RyaW5nIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgbnVsbCA9PiB7XHJcbiAgaWYgKCFhdXRoSGVhZGVyKSB7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIGNvbnN0IHBhcnRzID0gYXV0aEhlYWRlci5zcGxpdCgnICcpO1xyXG4gIGlmIChwYXJ0cy5sZW5ndGggIT09IDIgfHwgcGFydHNbMF0gIT09ICdCZWFyZXInKSB7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIHJldHVybiBwYXJ0c1sxXTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgQXV0aG9yaXphdGlvbiBoZWFkZXIgd2l0aCB0b2tlblxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGNyZWF0ZUF1dGhIZWFkZXIgPSAodG9rZW46IHN0cmluZyk6IHN0cmluZyA9PiB7XHJcbiAgcmV0dXJuIGBCZWFyZXIgJHt0b2tlbn1gO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFZhbGlkYXRlIHRva2VuIGZvcm1hdFxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGlzVmFsaWRUb2tlbkZvcm1hdCA9ICh0b2tlbjogc3RyaW5nKTogYm9vbGVhbiA9PiB7XHJcbiAgaWYgKCF0b2tlbiB8fCB0eXBlb2YgdG9rZW4gIT09ICdzdHJpbmcnKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBjb25zdCBwYXJ0cyA9IHRva2VuLnNwbGl0KCcuJyk7XHJcbiAgcmV0dXJuIHBhcnRzLmxlbmd0aCA9PT0gMztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXQgdG9rZW4gZXhwaXJhdGlvbiB0aW1lXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgZ2V0VG9rZW5FeHBpcmF0aW9uID0gKHRva2VuOiBzdHJpbmcpOiBEYXRlIHwgbnVsbCA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGRlY29kZWQgPSBkZWNvZGVUb2tlbih0b2tlbik7XHJcbiAgICBpZiAoIWRlY29kZWQgfHwgIWRlY29kZWQuZXhwKSB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXR1cm4gbmV3IERhdGUoZGVjb2RlZC5leHAgKiAxMDAwKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlZnJlc2ggYWNjZXNzIHRva2VuIHVzaW5nIHJlZnJlc2ggdG9rZW5cclxuICovXHJcbmV4cG9ydCBjb25zdCByZWZyZXNoQWNjZXNzVG9rZW4gPSBhc3luYyAocmVmcmVzaFRva2VuOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4gPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB7IHVzZXJJZCB9ID0gdmVyaWZ5UmVmcmVzaFRva2VuKHJlZnJlc2hUb2tlbik7XHJcbiAgICBcclxuICAgIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIGZldGNoIHRoZSB1c2VyIGZyb20gZGF0YWJhc2VcclxuICAgIC8vIEZvciBub3csIHdlJ2xsIGNyZWF0ZSBhIG1pbmltYWwgcGF5bG9hZFxyXG4gICAgY29uc3QgcGF5bG9hZDogT21pdDxKV1RQYXlsb2FkLCAnaWF0JyB8ICdleHAnPiA9IHtcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBlbWFpbDogJycsIC8vIFdvdWxkIGJlIGZldGNoZWQgZnJvbSBkYXRhYmFzZVxyXG4gICAgICByb2xlOiAnJywgLy8gV291bGQgYmUgZmV0Y2hlZCBmcm9tIGRhdGFiYXNlXHJcbiAgICAgIHRlbmFudElkOiAnJywgLy8gV291bGQgYmUgZmV0Y2hlZCBmcm9tIGRhdGFiYXNlXHJcbiAgICAgIHBlcm1pc3Npb25zOiBbXSwgLy8gV291bGQgYmUgZmV0Y2hlZCBmcm9tIGRhdGFiYXNlXHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICByZXR1cm4gZ2VuZXJhdGVBY2Nlc3NUb2tlbihwYXlsb2FkKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignVG9rZW4gcmVmcmVzaCBmYWlsZWQ6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gcmVmcmVzaCBhY2Nlc3MgdG9rZW4nKTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogVG9rZW4gbWlkZGxld2FyZSBmb3IgQVBJIHJvdXRlc1xyXG4gKi9cclxuZXhwb3J0IGNvbnN0IHRva2VuTWlkZGxld2FyZSA9IChyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkgPT4ge1xyXG4gIGNvbnN0IHRva2VuID0gZXh0cmFjdFRva2VuRnJvbUhlYWRlcihyZXEuaGVhZGVycy5hdXRob3JpemF0aW9uKTtcclxuICBcclxuICBpZiAoIXRva2VuKSB7XHJcbiAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oeyBlcnJvcjogJ05vIHRva2VuIHByb3ZpZGVkJyB9KTtcclxuICB9XHJcbiAgXHJcbiAgaWYgKCFpc1ZhbGlkVG9rZW5Gb3JtYXQodG9rZW4pKSB7XHJcbiAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oeyBlcnJvcjogJ0ludmFsaWQgdG9rZW4gZm9ybWF0JyB9KTtcclxuICB9XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGRlY29kZWQgPSB2ZXJpZnlUb2tlbih0b2tlbik7XHJcbiAgICByZXEudXNlciA9IGRlY29kZWQ7XHJcbiAgICBuZXh0KCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIHJldHVybiByZXMuc3RhdHVzKDQwMSkuanNvbih7IGVycm9yOiAnSW52YWxpZCB0b2tlbicgfSk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJvbGUtYmFzZWQgYWNjZXNzIGNvbnRyb2wgbWlkZGxld2FyZVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IHJvbGVNaWRkbGV3YXJlID0gKHJlcXVpcmVkUm9sZXM6IHN0cmluZ1tdKSA9PiB7XHJcbiAgcmV0dXJuIChyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkgPT4ge1xyXG4gICAgaWYgKCFyZXEudXNlcikge1xyXG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oeyBlcnJvcjogJ0F1dGhlbnRpY2F0aW9uIHJlcXVpcmVkJyB9KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKCFyZXF1aXJlZFJvbGVzLmluY2x1ZGVzKHJlcS51c2VyLnJvbGUpKSB7XHJcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMykuanNvbih7IGVycm9yOiAnSW5zdWZmaWNpZW50IHBlcm1pc3Npb25zJyB9KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgbmV4dCgpO1xyXG4gIH07XHJcbn07XHJcblxyXG4vKipcclxuICogUGVybWlzc2lvbi1iYXNlZCBhY2Nlc3MgY29udHJvbCBtaWRkbGV3YXJlXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgcGVybWlzc2lvbk1pZGRsZXdhcmUgPSAocmVxdWlyZWRQZXJtaXNzaW9uczogc3RyaW5nW10pID0+IHtcclxuICByZXR1cm4gKHJlcTogYW55LCByZXM6IGFueSwgbmV4dDogYW55KSA9PiB7XHJcbiAgICBpZiAoIXJlcS51c2VyKSB7XHJcbiAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMSkuanNvbih7IGVycm9yOiAnQXV0aGVudGljYXRpb24gcmVxdWlyZWQnIH0pO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjb25zdCB1c2VyUGVybWlzc2lvbnMgPSByZXEudXNlci5wZXJtaXNzaW9ucyB8fCBbXTtcclxuICAgIGNvbnN0IGhhc1Blcm1pc3Npb24gPSByZXF1aXJlZFBlcm1pc3Npb25zLnNvbWUocGVybWlzc2lvbiA9PiBcclxuICAgICAgdXNlclBlcm1pc3Npb25zLmluY2x1ZGVzKHBlcm1pc3Npb24pXHJcbiAgICApO1xyXG4gICAgXHJcbiAgICBpZiAoIWhhc1Blcm1pc3Npb24pIHtcclxuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAzKS5qc29uKHsgZXJyb3I6ICdJbnN1ZmZpY2llbnQgcGVybWlzc2lvbnMnIH0pO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBuZXh0KCk7XHJcbiAgfTtcclxufTtcclxuXHJcbi8vIEV4cG9ydCBKV1Qgc2VjcmV0IGZvciB0ZXN0aW5nIChvbmx5IGluIGRldmVsb3BtZW50KVxyXG5leHBvcnQgY29uc3QgZ2V0SldUU2VjcmV0ID0gKCkgPT4ge1xyXG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50Jykge1xyXG4gICAgcmV0dXJuIEpXVF9TRUNSRVQ7XHJcbiAgfVxyXG4gIHRocm93IG5ldyBFcnJvcignSldUIHNlY3JldCBpcyBub3QgYWNjZXNzaWJsZSBpbiBwcm9kdWN0aW9uJyk7XHJcbn07XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcOTE4NThcXFxcRG93bmxvYWRzXFxcXFNNRV9QbGF0Zm9ybV8xMl9TZXBhcmF0ZV9Nb2R1bGVzXFxcXHBsYXRmb3JtXFxcXGZyb250ZW5kXFxcXHNyY1xcXFxsaWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXDkxODU4XFxcXERvd25sb2Fkc1xcXFxTTUVfUGxhdGZvcm1fMTJfU2VwYXJhdGVfTW9kdWxlc1xcXFxwbGF0Zm9ybVxcXFxmcm9udGVuZFxcXFxzcmNcXFxcbGliXFxcXGF1dGhvcml6YXRpb24udHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzLzkxODU4L0Rvd25sb2Fkcy9TTUVfUGxhdGZvcm1fMTJfU2VwYXJhdGVfTW9kdWxlcy9wbGF0Zm9ybS9mcm9udGVuZC9zcmMvbGliL2F1dGhvcml6YXRpb24udHNcIjtpbXBvcnQgeyBVc2VyUm9sZSwgVXNlciB9IGZyb20gJy4uL3R5cGVzL2F1dGgudHlwZXMnO1xyXG5pbXBvcnQgeyBSZWRpcyB9IGZyb20gJ2lvcmVkaXMnO1xyXG5cclxuLy8gUGVybWlzc2lvbiBkZWZpbml0aW9uIGZvbGxvd2luZyB0aGUgc3BlY2lmaWNhdGlvbjogPHJlc291cmNlPjo8YWN0aW9uPls6PHNjb3BlPl1cclxuZXhwb3J0IGVudW0gUGVybWlzc2lvbiB7XHJcbiAgLy8gSW52b2ljZSBwZXJtaXNzaW9uc1xyXG4gIElOVk9JQ0VfQ1JFQVRFID0gJ2ludm9pY2U6Y3JlYXRlJyxcclxuICBJTlZPSUNFX1JFQUQgPSAnaW52b2ljZTpyZWFkJyxcclxuICBJTlZPSUNFX1VQREFURSA9ICdpbnZvaWNlOnVwZGF0ZScsXHJcbiAgSU5WT0lDRV9ERUxFVEUgPSAnaW52b2ljZTpkZWxldGUnLFxyXG4gIElOVk9JQ0VfQVBQUk9WRSA9ICdpbnZvaWNlOmFwcHJvdmUnLFxyXG4gIElOVk9JQ0VfRVhQT1JUID0gJ2ludm9pY2U6ZXhwb3J0JyxcclxuICBcclxuICAvLyBQYXltZW50IHBlcm1pc3Npb25zXHJcbiAgUEFZTUVOVF9DUkVBVEUgPSAncGF5bWVudDpjcmVhdGUnLFxyXG4gIFBBWU1FTlRfUkVBRCA9ICdwYXltZW50OnJlYWQnLFxyXG4gIFBBWU1FTlRfVVBEQVRFID0gJ3BheW1lbnQ6dXBkYXRlJyxcclxuICBQQVlNRU5UX0RFTEVURSA9ICdwYXltZW50OmRlbGV0ZScsXHJcbiAgUEFZTUVOVF9QUk9DRVNTID0gJ3BheW1lbnQ6cHJvY2VzcycsXHJcbiAgUEFZTUVOVF9SRUZVTkQgPSAncGF5bWVudDpyZWZ1bmQnLFxyXG4gIFxyXG4gIC8vIERpc3B1dGUgcGVybWlzc2lvbnNcclxuICBESVNQVVRFX0NSRUFURSA9ICdkaXNwdXRlOmNyZWF0ZScsXHJcbiAgRElTUFVURV9SRUFEID0gJ2Rpc3B1dGU6cmVhZCcsXHJcbiAgRElTUFVURV9VUERBVEUgPSAnZGlzcHV0ZTp1cGRhdGUnLFxyXG4gIERJU1BVVEVfUkVTT0xWRSA9ICdkaXNwdXRlOnJlc29sdmUnLFxyXG4gIERJU1BVVEVfRVNDQUxBVEUgPSAnZGlzcHV0ZTplc2NhbGF0ZScsXHJcbiAgXHJcbiAgLy8gQW5hbHl0aWNzIHBlcm1pc3Npb25zXHJcbiAgQU5BTFlUSUNTX1ZJRVcgPSAnYW5hbHl0aWNzOnZpZXcnLFxyXG4gIEFOQUxZVElDU19FWFBPUlQgPSAnYW5hbHl0aWNzOmV4cG9ydCcsXHJcbiAgQU5BTFlUSUNTX0FEVkFOQ0VEID0gJ2FuYWx5dGljczphZHZhbmNlZCcsXHJcbiAgXHJcbiAgLy8gVXNlciBtYW5hZ2VtZW50IHBlcm1pc3Npb25zXHJcbiAgVVNFUl9DUkVBVEUgPSAndXNlcjpjcmVhdGUnLFxyXG4gIFVTRVJfUkVBRCA9ICd1c2VyOnJlYWQnLFxyXG4gIFVTRVJfVVBEQVRFID0gJ3VzZXI6dXBkYXRlJyxcclxuICBVU0VSX0RFTEVURSA9ICd1c2VyOmRlbGV0ZScsXHJcbiAgVVNFUl9BU1NJR05fUk9MRVMgPSAndXNlcjphc3NpZ25fcm9sZXMnLFxyXG4gIFxyXG4gIC8vIFN5c3RlbSBwZXJtaXNzaW9uc1xyXG4gIFNZU1RFTV9DT05GSUcgPSAnc3lzdGVtOmNvbmZpZycsXHJcbiAgU1lTVEVNX0xPR1MgPSAnc3lzdGVtOmxvZ3MnLFxyXG4gIFNZU1RFTV9IRUFMVEggPSAnc3lzdGVtOmhlYWx0aCcsXHJcbiAgU1lTVEVNX0JBQ0tVUCA9ICdzeXN0ZW06YmFja3VwJyxcclxuICBcclxuICAvLyBUZW5hbnQgcGVybWlzc2lvbnNcclxuICBURU5BTlRfQ1JFQVRFID0gJ3RlbmFudDpjcmVhdGUnLFxyXG4gIFRFTkFOVF9SRUFEID0gJ3RlbmFudDpyZWFkJyxcclxuICBURU5BTlRfVVBEQVRFID0gJ3RlbmFudDp1cGRhdGUnLFxyXG4gIFRFTkFOVF9ERUxFVEUgPSAndGVuYW50OmRlbGV0ZScsXHJcbiAgVEVOQU5UX01BTkFHRV9VU0VSUyA9ICd0ZW5hbnQ6bWFuYWdlX3VzZXJzJyxcclxuICBcclxuICAvLyBDcmVkaXQgc2NvcmluZyBwZXJtaXNzaW9uc1xyXG4gIENSRURJVF9TQ09SRV9WSUVXID0gJ2NyZWRpdDp2aWV3JyxcclxuICBDUkVESVRfU0NPUkVfQ1JFQVRFID0gJ2NyZWRpdDpjcmVhdGUnLFxyXG4gIENSRURJVF9TQ09SRV9VUERBVEUgPSAnY3JlZGl0OnVwZGF0ZScsXHJcbiAgXHJcbiAgLy8gRmluYW5jaW5nIHBlcm1pc3Npb25zXHJcbiAgRklOQU5DSU5HX0FQUExZID0gJ2ZpbmFuY2luZzphcHBseScsXHJcbiAgRklOQU5DSU5HX0FQUFJPVkUgPSAnZmluYW5jaW5nOmFwcHJvdmUnLFxyXG4gIEZJTkFOQ0lOR19NQU5BR0UgPSAnZmluYW5jaW5nOm1hbmFnZScsXHJcbiAgXHJcbiAgLy8gTWFya2V0aW5nIHBlcm1pc3Npb25zXHJcbiAgTUFSS0VUSU5HX0NSRUFURSA9ICdtYXJrZXRpbmc6Y3JlYXRlJyxcclxuICBNQVJLRVRJTkdfVklFVyA9ICdtYXJrZXRpbmc6dmlldycsXHJcbiAgTUFSS0VUSU5HX01BTkFHRSA9ICdtYXJrZXRpbmc6bWFuYWdlJyxcclxuICBcclxuICAvLyBEb2N1bWVudCBwZXJtaXNzaW9uc1xyXG4gIERPQ1VNRU5UX0NSRUFURSA9ICdkb2N1bWVudDpjcmVhdGUnLFxyXG4gIERPQ1VNRU5UX1JFQUQgPSAnZG9jdW1lbnQ6cmVhZCcsXHJcbiAgRE9DVU1FTlRfVVBEQVRFID0gJ2RvY3VtZW50OnVwZGF0ZScsXHJcbiAgRE9DVU1FTlRfREVMRVRFID0gJ2RvY3VtZW50OmRlbGV0ZScsXHJcbiAgRE9DVU1FTlRfU0hBUkUgPSAnZG9jdW1lbnQ6c2hhcmUnLFxyXG59XHJcblxyXG4vLyBSb2xlIHRvIHBlcm1pc3Npb25zIG1hcHBpbmdcclxuZXhwb3J0IGNvbnN0IFJPTEVfUEVSTUlTU0lPTlM6IFJlY29yZDxVc2VyUm9sZSwgUGVybWlzc2lvbltdPiA9IHtcclxuICBbVXNlclJvbGUuU01FX09XTkVSXTogW1xyXG4gICAgUGVybWlzc2lvbi5JTlZPSUNFX0NSRUFURSxcclxuICAgIFBlcm1pc3Npb24uSU5WT0lDRV9SRUFELFxyXG4gICAgUGVybWlzc2lvbi5JTlZPSUNFX1VQREFURSxcclxuICAgIFBlcm1pc3Npb24uSU5WT0lDRV9ERUxFVEUsXHJcbiAgICBQZXJtaXNzaW9uLklOVk9JQ0VfRVhQT1JULFxyXG4gICAgUGVybWlzc2lvbi5QQVlNRU5UX0NSRUFURSxcclxuICAgIFBlcm1pc3Npb24uUEFZTUVOVF9SRUFELFxyXG4gICAgUGVybWlzc2lvbi5QQVlNRU5UX1VQREFURSxcclxuICAgIFBlcm1pc3Npb24uRElTUFVURV9DUkVBVEUsXHJcbiAgICBQZXJtaXNzaW9uLkRJU1BVVEVfUkVBRCxcclxuICAgIFBlcm1pc3Npb24uRElTUFVURV9VUERBVEUsXHJcbiAgICBQZXJtaXNzaW9uLkFOQUxZVElDU19WSUVXLFxyXG4gICAgUGVybWlzc2lvbi5BTkFMWVRJQ1NfRVhQT1JULFxyXG4gICAgUGVybWlzc2lvbi5DUkVESVRfU0NPUkVfVklFVyxcclxuICAgIFBlcm1pc3Npb24uRklOQU5DSU5HX0FQUExZLFxyXG4gICAgUGVybWlzc2lvbi5ET0NVTUVOVF9DUkVBVEUsXHJcbiAgICBQZXJtaXNzaW9uLkRPQ1VNRU5UX1JFQUQsXHJcbiAgICBQZXJtaXNzaW9uLkRPQ1VNRU5UX1VQREFURSxcclxuICAgIFBlcm1pc3Npb24uRE9DVU1FTlRfREVMRVRFLFxyXG4gICAgUGVybWlzc2lvbi5ET0NVTUVOVF9TSEFSRSxcclxuICBdLFxyXG4gIFxyXG4gIFtVc2VyUm9sZS5MRUdBTF9QQVJUTkVSXTogW1xyXG4gICAgUGVybWlzc2lvbi5ESVNQVVRFX1JFQUQsXHJcbiAgICBQZXJtaXNzaW9uLkRJU1BVVEVfVVBEQVRFLFxyXG4gICAgUGVybWlzc2lvbi5ESVNQVVRFX1JFU09MVkUsXHJcbiAgICBQZXJtaXNzaW9uLkRJU1BVVEVfRVNDQUxBVEUsXHJcbiAgICBQZXJtaXNzaW9uLkRPQ1VNRU5UX1JFQUQsXHJcbiAgICBQZXJtaXNzaW9uLkRPQ1VNRU5UX1VQREFURSxcclxuICAgIFBlcm1pc3Npb24uRE9DVU1FTlRfQ1JFQVRFLFxyXG4gICAgUGVybWlzc2lvbi5BTkFMWVRJQ1NfVklFVyxcclxuICBdLFxyXG4gIFxyXG4gIFtVc2VyUm9sZS5BQ0NPVU5UQU5UXTogW1xyXG4gICAgUGVybWlzc2lvbi5JTlZPSUNFX1JFQUQsXHJcbiAgICBQZXJtaXNzaW9uLklOVk9JQ0VfVVBEQVRFLFxyXG4gICAgUGVybWlzc2lvbi5JTlZPSUNFX0VYUE9SVCxcclxuICAgIFBlcm1pc3Npb24uUEFZTUVOVF9SRUFELFxyXG4gICAgUGVybWlzc2lvbi5QQVlNRU5UX1VQREFURSxcclxuICAgIFBlcm1pc3Npb24uUEFZTUVOVF9QUk9DRVNTLFxyXG4gICAgUGVybWlzc2lvbi5BTkFMWVRJQ1NfVklFVyxcclxuICAgIFBlcm1pc3Npb24uQU5BTFlUSUNTX0VYUE9SVCxcclxuICAgIFBlcm1pc3Npb24uRE9DVU1FTlRfUkVBRCxcclxuICAgIFBlcm1pc3Npb24uRE9DVU1FTlRfQ1JFQVRFLFxyXG4gICAgUGVybWlzc2lvbi5ET0NVTUVOVF9VUERBVEUsXHJcbiAgXSxcclxuICBcclxuICBbVXNlclJvbGUuQURNSU5dOiBbXHJcbiAgICAvLyBBZG1pbiBoYXMgYWxsIHBlcm1pc3Npb25zXHJcbiAgICAuLi5PYmplY3QudmFsdWVzKFBlcm1pc3Npb24pLFxyXG4gIF0sXHJcbiAgXHJcbiAgW1VzZXJSb2xlLlZJRVdFUl06IFtcclxuICAgIFBlcm1pc3Npb24uSU5WT0lDRV9SRUFELFxyXG4gICAgUGVybWlzc2lvbi5QQVlNRU5UX1JFQUQsXHJcbiAgICBQZXJtaXNzaW9uLkRJU1BVVEVfUkVBRCxcclxuICAgIFBlcm1pc3Npb24uQU5BTFlUSUNTX1ZJRVcsXHJcbiAgICBQZXJtaXNzaW9uLkRPQ1VNRU5UX1JFQUQsXHJcbiAgXSxcclxufTtcclxuXHJcbi8vIFBlcm1pc3Npb24gY2FjaGUgaW50ZXJmYWNlXHJcbmludGVyZmFjZSBQZXJtaXNzaW9uQ2FjaGUge1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIHBlcm1pc3Npb25zOiBQZXJtaXNzaW9uW107XHJcbiAgZXhwaXJlc0F0OiBudW1iZXI7XHJcbn1cclxuXHJcbi8vIEF1dGhvcml6YXRpb24gc2VydmljZSBjbGFzc1xyXG5leHBvcnQgY2xhc3MgQXV0aG9yaXphdGlvblNlcnZpY2Uge1xyXG4gIHByaXZhdGUgcmVkaXM6IFJlZGlzO1xyXG4gIHByaXZhdGUgY2FjaGVFeHBpcnkgPSAzMDA7IC8vIDUgbWludXRlc1xyXG4gIHByaXZhdGUgcGVybWlzc2lvbkNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFBlcm1pc3Npb25DYWNoZT4oKTtcclxuXHJcbiAgY29uc3RydWN0b3IocmVkaXM6IFJlZGlzKSB7XHJcbiAgICB0aGlzLnJlZGlzID0gcmVkaXM7XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBpZiB1c2VyIGhhcyBzcGVjaWZpYyBwZXJtaXNzaW9uXHJcbiAgYXN5bmMgaGFzUGVybWlzc2lvbih1c2VyOiBVc2VyLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBjb25zdCB1c2VyUGVybWlzc2lvbnMgPSBhd2FpdCB0aGlzLmdldFVzZXJQZXJtaXNzaW9ucyh1c2VyKTtcclxuICAgIHJldHVybiB1c2VyUGVybWlzc2lvbnMuaW5jbHVkZXMocGVybWlzc2lvbik7XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBpZiB1c2VyIGhhcyBhbnkgb2YgdGhlIHNwZWNpZmllZCBwZXJtaXNzaW9uc1xyXG4gIGFzeW5jIGhhc0FueVBlcm1pc3Npb24odXNlcjogVXNlciwgcGVybWlzc2lvbnM6IFBlcm1pc3Npb25bXSk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgY29uc3QgdXNlclBlcm1pc3Npb25zID0gYXdhaXQgdGhpcy5nZXRVc2VyUGVybWlzc2lvbnModXNlcik7XHJcbiAgICByZXR1cm4gcGVybWlzc2lvbnMuc29tZShwZXJtaXNzaW9uID0+IHVzZXJQZXJtaXNzaW9ucy5pbmNsdWRlcyhwZXJtaXNzaW9uKSk7XHJcbiAgfVxyXG5cclxuICAvLyBDaGVjayBpZiB1c2VyIGhhcyBhbGwgc3BlY2lmaWVkIHBlcm1pc3Npb25zXHJcbiAgYXN5bmMgaGFzQWxsUGVybWlzc2lvbnModXNlcjogVXNlciwgcGVybWlzc2lvbnM6IFBlcm1pc3Npb25bXSk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgY29uc3QgdXNlclBlcm1pc3Npb25zID0gYXdhaXQgdGhpcy5nZXRVc2VyUGVybWlzc2lvbnModXNlcik7XHJcbiAgICByZXR1cm4gcGVybWlzc2lvbnMuZXZlcnkocGVybWlzc2lvbiA9PiB1c2VyUGVybWlzc2lvbnMuaW5jbHVkZXMocGVybWlzc2lvbikpO1xyXG4gIH1cclxuXHJcbiAgLy8gR2V0IHVzZXIgcGVybWlzc2lvbnMgd2l0aCBjYWNoaW5nXHJcbiAgYXN5bmMgZ2V0VXNlclBlcm1pc3Npb25zKHVzZXI6IFVzZXIpOiBQcm9taXNlPFBlcm1pc3Npb25bXT4ge1xyXG4gICAgY29uc3QgY2FjaGVLZXkgPSBgdXNlcjoke3VzZXIuaWR9OnBlcm1pc3Npb25zYDtcclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgbWVtb3J5IGNhY2hlIGZpcnN0XHJcbiAgICBjb25zdCBtZW1DYWNoZSA9IHRoaXMucGVybWlzc2lvbkNhY2hlLmdldChjYWNoZUtleSk7XHJcbiAgICBpZiAobWVtQ2FjaGUgJiYgbWVtQ2FjaGUuZXhwaXJlc0F0ID4gRGF0ZS5ub3coKSkge1xyXG4gICAgICByZXR1cm4gbWVtQ2FjaGUucGVybWlzc2lvbnM7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgUmVkaXMgY2FjaGVcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNhY2hlZCA9IGF3YWl0IHRoaXMucmVkaXMuZ2V0KGNhY2hlS2V5KTtcclxuICAgICAgaWYgKGNhY2hlZCkge1xyXG4gICAgICAgIGNvbnN0IHBhcnNlZDogUGVybWlzc2lvbkNhY2hlID0gSlNPTi5wYXJzZShjYWNoZWQpO1xyXG4gICAgICAgIGlmIChwYXJzZWQuZXhwaXJlc0F0ID4gRGF0ZS5ub3coKSkge1xyXG4gICAgICAgICAgLy8gVXBkYXRlIG1lbW9yeSBjYWNoZVxyXG4gICAgICAgICAgdGhpcy5wZXJtaXNzaW9uQ2FjaGUuc2V0KGNhY2hlS2V5LCBwYXJzZWQpO1xyXG4gICAgICAgICAgcmV0dXJuIHBhcnNlZC5wZXJtaXNzaW9ucztcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignUmVkaXMgY2FjaGUgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCBwZXJtaXNzaW9ucyBmcm9tIHJvbGVcclxuICAgIGNvbnN0IHBlcm1pc3Npb25zID0gUk9MRV9QRVJNSVNTSU9OU1t1c2VyLnJvbGVdIHx8IFtdO1xyXG4gICAgXHJcbiAgICAvLyBBZGQgdGVuYW50LXNwZWNpZmljIHBlcm1pc3Npb25zIGlmIHVzZXIgaGFzIHRlbmFudElkXHJcbiAgICBpZiAodXNlci50ZW5hbnRJZCkge1xyXG4gICAgICBwZXJtaXNzaW9ucy5wdXNoKFBlcm1pc3Npb24uVEVOQU5UX1JFQUQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENhY2hlIHRoZSBwZXJtaXNzaW9uc1xyXG4gICAgY29uc3QgY2FjaGVEYXRhOiBQZXJtaXNzaW9uQ2FjaGUgPSB7XHJcbiAgICAgIHVzZXJJZDogdXNlci5pZCxcclxuICAgICAgcGVybWlzc2lvbnMsXHJcbiAgICAgIGV4cGlyZXNBdDogRGF0ZS5ub3coKSArICh0aGlzLmNhY2hlRXhwaXJ5ICogMTAwMCksXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFVwZGF0ZSBjYWNoZXNcclxuICAgIHRoaXMucGVybWlzc2lvbkNhY2hlLnNldChjYWNoZUtleSwgY2FjaGVEYXRhKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgdGhpcy5yZWRpcy5zZXRleChjYWNoZUtleSwgdGhpcy5jYWNoZUV4cGlyeSwgSlNPTi5zdHJpbmdpZnkoY2FjaGVEYXRhKSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ1JlZGlzIGNhY2hlIHNldCBlcnJvcjonLCBlcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHBlcm1pc3Npb25zO1xyXG4gIH1cclxuXHJcbiAgLy8gQ2xlYXIgdXNlciBwZXJtaXNzaW9uIGNhY2hlXHJcbiAgYXN5bmMgY2xlYXJVc2VyUGVybWlzc2lvbkNhY2hlKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBjb25zdCBjYWNoZUtleSA9IGB1c2VyOiR7dXNlcklkfTpwZXJtaXNzaW9uc2A7XHJcbiAgICBcclxuICAgIC8vIENsZWFyIG1lbW9yeSBjYWNoZVxyXG4gICAgdGhpcy5wZXJtaXNzaW9uQ2FjaGUuZGVsZXRlKGNhY2hlS2V5KTtcclxuICAgIFxyXG4gICAgLy8gQ2xlYXIgUmVkaXMgY2FjaGVcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHRoaXMucmVkaXMuZGVsKGNhY2hlS2V5KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignUmVkaXMgY2FjaGUgY2xlYXIgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gQ2hlY2sgcmVzb3VyY2UtbGV2ZWwgcGVybWlzc2lvblxyXG4gIGFzeW5jIGNhbkFjY2Vzc1Jlc291cmNlKFxyXG4gICAgdXNlcjogVXNlcixcclxuICAgIHJlc291cmNlOiBzdHJpbmcsXHJcbiAgICBhY3Rpb246IHN0cmluZyxcclxuICAgIHJlc291cmNlSWQ/OiBzdHJpbmcsXHJcbiAgICByZXNvdXJjZU93bmVySWQ/OiBzdHJpbmdcclxuICApOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIC8vIEJ1aWxkIHBlcm1pc3Npb24gc3RyaW5nXHJcbiAgICBjb25zdCBwZXJtaXNzaW9uID0gYCR7cmVzb3VyY2V9OiR7YWN0aW9ufWAgYXMgUGVybWlzc2lvbjtcclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgYmFzaWMgcGVybWlzc2lvblxyXG4gICAgY29uc3QgaGFzQmFzaWNQZXJtaXNzaW9uID0gYXdhaXQgdGhpcy5oYXNQZXJtaXNzaW9uKHVzZXIsIHBlcm1pc3Npb24pO1xyXG4gICAgaWYgKCFoYXNCYXNpY1Blcm1pc3Npb24pIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIElmIHJlc291cmNlIG93bmVyIGlzIHNwZWNpZmllZCwgY2hlY2sgb3duZXJzaGlwXHJcbiAgICBpZiAocmVzb3VyY2VPd25lcklkICYmIHJlc291cmNlT3duZXJJZCAhPT0gdXNlci5pZCkge1xyXG4gICAgICAvLyBPbmx5IGFkbWlucyBhbmQgb3duZXJzIGNhbiBhY2Nlc3Mgb3RoZXIgdXNlcnMnIHJlc291cmNlc1xyXG4gICAgICBjb25zdCBvd25lclBlcm1pc3Npb25zID0gW1Blcm1pc3Npb24uSU5WT0lDRV9SRUFELCBQZXJtaXNzaW9uLlBBWU1FTlRfUkVBRF07XHJcbiAgICAgIGNvbnN0IGNhbkFjY2Vzc090aGVycyA9IGF3YWl0IHRoaXMuaGFzQW55UGVybWlzc2lvbih1c2VyLCBbXHJcbiAgICAgICAgUGVybWlzc2lvbi5TWVNURU1fQ09ORklHLFxyXG4gICAgICAgIFBlcm1pc3Npb24uVEVOQU5UX01BTkFHRV9VU0VSUyxcclxuICAgICAgICAuLi5vd25lclBlcm1pc3Npb25zLFxyXG4gICAgICBdKTtcclxuICAgICAgXHJcbiAgICAgIGlmICghY2FuQWNjZXNzT3RoZXJzKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICAvLyBHZXQgcGVybWlzc2lvbnMgZm9yIEFQSSByZXNwb25zZVxyXG4gIGFzeW5jIGdldFVzZXJQZXJtaXNzaW9uc0ZvckFQSSh1c2VyOiBVc2VyKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xyXG4gICAgY29uc3QgcGVybWlzc2lvbnMgPSBhd2FpdCB0aGlzLmdldFVzZXJQZXJtaXNzaW9ucyh1c2VyKTtcclxuICAgIHJldHVybiBwZXJtaXNzaW9ucy5tYXAocCA9PiBwLnRvU3RyaW5nKCkpO1xyXG4gIH1cclxuXHJcbiAgLy8gQmF0Y2ggcGVybWlzc2lvbiBjaGVjayBmb3IgcGVyZm9ybWFuY2VcclxuICBhc3luYyBiYXRjaFBlcm1pc3Npb25DaGVjayhcclxuICAgIHVzZXI6IFVzZXIsXHJcbiAgICBjaGVja3M6IEFycmF5PHsgcmVzb3VyY2U6IHN0cmluZzsgYWN0aW9uOiBzdHJpbmc7IHJlc291cmNlSWQ/OiBzdHJpbmc7IHJlc291cmNlT3duZXJJZD86IHN0cmluZyB9PlxyXG4gICk6IFByb21pc2U8Ym9vbGVhbltdPiB7XHJcbiAgICBjb25zdCB1c2VyUGVybWlzc2lvbnMgPSBhd2FpdCB0aGlzLmdldFVzZXJQZXJtaXNzaW9ucyh1c2VyKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIGNoZWNrcy5tYXAoY2hlY2sgPT4ge1xyXG4gICAgICBjb25zdCBwZXJtaXNzaW9uID0gYCR7Y2hlY2sucmVzb3VyY2V9OiR7Y2hlY2suYWN0aW9ufWAgYXMgUGVybWlzc2lvbjtcclxuICAgICAgY29uc3QgaGFzUGVybWlzc2lvbiA9IHVzZXJQZXJtaXNzaW9ucy5pbmNsdWRlcyhwZXJtaXNzaW9uKTtcclxuICAgICAgXHJcbiAgICAgIGlmICghaGFzUGVybWlzc2lvbikge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2hlY2sgb3duZXJzaGlwIGlmIGFwcGxpY2FibGVcclxuICAgICAgaWYgKGNoZWNrLnJlc291cmNlT3duZXJJZCAmJiBjaGVjay5yZXNvdXJjZU93bmVySWQgIT09IHVzZXIuaWQpIHtcclxuICAgICAgICBjb25zdCBvd25lclBlcm1pc3Npb25zID0gW1Blcm1pc3Npb24uSU5WT0lDRV9SRUFELCBQZXJtaXNzaW9uLlBBWU1FTlRfUkVBRF07XHJcbiAgICAgICAgY29uc3QgY2FuQWNjZXNzT3RoZXJzID0gdXNlclBlcm1pc3Npb25zLnNvbWUocCA9PiBcclxuICAgICAgICAgIFtQZXJtaXNzaW9uLlNZU1RFTV9DT05GSUcsIFBlcm1pc3Npb24uVEVOQU5UX01BTkFHRV9VU0VSUywgLi4ub3duZXJQZXJtaXNzaW9uc10uaW5jbHVkZXMocClcclxuICAgICAgICApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiBjYW5BY2Nlc3NPdGhlcnM7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBDbGVhbnVwIGV4cGlyZWQgY2FjaGUgZW50cmllc1xyXG4gIGNsZWFudXBFeHBpcmVkQ2FjaGUoKTogdm9pZCB7XHJcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgZm9yIChjb25zdCBba2V5LCBjYWNoZV0gb2YgdGhpcy5wZXJtaXNzaW9uQ2FjaGUuZW50cmllcygpKSB7XHJcbiAgICAgIGlmIChjYWNoZS5leHBpcmVzQXQgPD0gbm93KSB7XHJcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9uQ2FjaGUuZGVsZXRlKGtleSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cHJlc3MgbWlkZGxld2FyZSBmb3IgYXV0aG9yaXphdGlvblxyXG5leHBvcnQgY29uc3QgY3JlYXRlQXV0aG9yaXphdGlvbk1pZGRsZXdhcmUgPSAoYXV0aFNlcnZpY2U6IEF1dGhvcml6YXRpb25TZXJ2aWNlKSA9PiB7XHJcbiAgcmV0dXJuIGFzeW5jIChyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkgPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gR2V0IHVzZXIgZnJvbSByZXF1ZXN0IChzaG91bGQgYmUgc2V0IGJ5IGF1dGhlbnRpY2F0aW9uIG1pZGRsZXdhcmUpXHJcbiAgICAgIGNvbnN0IHVzZXIgPSByZXEudXNlcjtcclxuICAgICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAxKS5qc29uKHsgZXJyb3I6ICdBdXRoZW50aWNhdGlvbiByZXF1aXJlZCcgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEdldCByZXF1aXJlZCBwZXJtaXNzaW9uIGZyb20gcm91dGVcclxuICAgICAgY29uc3QgcmVxdWlyZWRQZXJtaXNzaW9uID0gcmVxLnJlcXVpcmVkUGVybWlzc2lvbjtcclxuICAgICAgaWYgKHJlcXVpcmVkUGVybWlzc2lvbikge1xyXG4gICAgICAgIGNvbnN0IGhhc1Blcm1pc3Npb24gPSBhd2FpdCBhdXRoU2VydmljZS5oYXNQZXJtaXNzaW9uKHVzZXIsIHJlcXVpcmVkUGVybWlzc2lvbik7XHJcbiAgICAgICAgaWYgKCFoYXNQZXJtaXNzaW9uKSB7XHJcbiAgICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDMpLmpzb24oeyBcclxuICAgICAgICAgICAgZXJyb3I6ICdJbnN1ZmZpY2llbnQgcGVybWlzc2lvbnMnLFxyXG4gICAgICAgICAgICByZXF1aXJlZDogcmVxdWlyZWRQZXJtaXNzaW9uLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDaGVjayByZXNvdXJjZS1sZXZlbCBwZXJtaXNzaW9ucyBpZiBhcHBsaWNhYmxlXHJcbiAgICAgIGlmIChyZXEucmVzb3VyY2UgJiYgcmVxLmFjdGlvbikge1xyXG4gICAgICAgIGNvbnN0IGNhbkFjY2VzcyA9IGF3YWl0IGF1dGhTZXJ2aWNlLmNhbkFjY2Vzc1Jlc291cmNlKFxyXG4gICAgICAgICAgdXNlcixcclxuICAgICAgICAgIHJlcS5yZXNvdXJjZSxcclxuICAgICAgICAgIHJlcS5hY3Rpb24sXHJcbiAgICAgICAgICByZXEucmVzb3VyY2VJZCxcclxuICAgICAgICAgIHJlcS5yZXNvdXJjZU93bmVySWRcclxuICAgICAgICApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICghY2FuQWNjZXNzKSB7XHJcbiAgICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDMpLmpzb24oeyBcclxuICAgICAgICAgICAgZXJyb3I6ICdSZXNvdXJjZSBhY2Nlc3MgZGVuaWVkJyxcclxuICAgICAgICAgICAgcmVzb3VyY2U6IHJlcS5yZXNvdXJjZSxcclxuICAgICAgICAgICAgYWN0aW9uOiByZXEuYWN0aW9uLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBBZGQgYXV0aG9yaXphdGlvbiBzZXJ2aWNlIHRvIHJlcXVlc3QgZm9yIHVzZSBpbiBoYW5kbGVyc1xyXG4gICAgICByZXEuYXV0aCA9IGF1dGhTZXJ2aWNlO1xyXG4gICAgICBuZXh0KCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdBdXRob3JpemF0aW9uIG1pZGRsZXdhcmUgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IGVycm9yOiAnQXV0aG9yaXphdGlvbiBzZXJ2aWNlIGVycm9yJyB9KTtcclxuICAgIH1cclxuICB9O1xyXG59O1xyXG5cclxuLy8gRGVjb3JhdG9yIGZvciByb3V0ZS1sZXZlbCBhdXRob3JpemF0aW9uXHJcbmV4cG9ydCBjb25zdCByZXF1aXJlUGVybWlzc2lvbiA9IChwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKSA9PiB7XHJcbiAgcmV0dXJuIChyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkgPT4ge1xyXG4gICAgcmVxLnJlcXVpcmVkUGVybWlzc2lvbiA9IHBlcm1pc3Npb247XHJcbiAgICBuZXh0KCk7XHJcbiAgfTtcclxufTtcclxuXHJcbi8vIERlY29yYXRvciBmb3IgcmVzb3VyY2UtbGV2ZWwgYXV0aG9yaXphdGlvblxyXG5leHBvcnQgY29uc3QgcmVxdWlyZVJlc291cmNlQWNjZXNzID0gKHJlc291cmNlOiBzdHJpbmcsIGFjdGlvbjogc3RyaW5nKSA9PiB7XHJcbiAgcmV0dXJuIChyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkgPT4ge1xyXG4gICAgcmVxLnJlc291cmNlID0gcmVzb3VyY2U7XHJcbiAgICByZXEuYWN0aW9uID0gYWN0aW9uO1xyXG4gICAgcmVxLnJlc291cmNlSWQgPSByZXEucGFyYW1zLmlkO1xyXG4gICAgcmVxLnJlc291cmNlT3duZXJJZCA9IHJlcS5ib2R5Lm93bmVySWQ7XHJcbiAgICBuZXh0KCk7XHJcbiAgfTtcclxufTtcclxuXHJcbi8vIFBlcm1pc3Npb24gdmFsaWRhdGlvbiB1dGlsaXR5XHJcbmV4cG9ydCBjb25zdCB2YWxpZGF0ZVBlcm1pc3Npb24gPSAocGVybWlzc2lvbjogc3RyaW5nKTogYm9vbGVhbiA9PiB7XHJcbiAgcmV0dXJuIE9iamVjdC52YWx1ZXMoUGVybWlzc2lvbikuaW5jbHVkZXMocGVybWlzc2lvbiBhcyBQZXJtaXNzaW9uKTtcclxufTtcclxuXHJcbi8vIEdldCBhbGwgcGVybWlzc2lvbnMgZm9yIGEgcm9sZVxyXG5leHBvcnQgY29uc3QgZ2V0Um9sZVBlcm1pc3Npb25zID0gKHJvbGU6IFVzZXJSb2xlKTogUGVybWlzc2lvbltdID0+IHtcclxuICByZXR1cm4gUk9MRV9QRVJNSVNTSU9OU1tyb2xlXSB8fCBbXTtcclxufTtcclxuXHJcbi8vIENoZWNrIGlmIHJvbGUgZXhpc3RzXHJcbmV4cG9ydCBjb25zdCBpc1ZhbGlkUm9sZSA9IChyb2xlOiBzdHJpbmcpOiByb2xlIGlzIFVzZXJSb2xlID0+IHtcclxuICByZXR1cm4gT2JqZWN0LnZhbHVlcyhVc2VyUm9sZSkuaW5jbHVkZXMocm9sZSBhcyBVc2VyUm9sZSk7XHJcbn07XHJcblxyXG4vLyBJbml0aWFsaXplIGF1dGhvcml6YXRpb24gc2VydmljZVxyXG5sZXQgYXV0aG9yaXphdGlvblNlcnZpY2U6IEF1dGhvcml6YXRpb25TZXJ2aWNlO1xyXG5cclxuZXhwb3J0IGNvbnN0IGluaXRpYWxpemVBdXRob3JpemF0aW9uID0gKHJlZGlzOiBSZWRpcyk6IEF1dGhvcml6YXRpb25TZXJ2aWNlID0+IHtcclxuICBpZiAoIWF1dGhvcml6YXRpb25TZXJ2aWNlKSB7XHJcbiAgICBhdXRob3JpemF0aW9uU2VydmljZSA9IG5ldyBBdXRob3JpemF0aW9uU2VydmljZShyZWRpcyk7XHJcbiAgICBcclxuICAgIC8vIFNldCB1cCBwZXJpb2RpYyBjYWNoZSBjbGVhbnVwXHJcbiAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgIGF1dGhvcml6YXRpb25TZXJ2aWNlLmNsZWFudXBFeHBpcmVkQ2FjaGUoKTtcclxuICAgIH0sIDYwMDAwKTsgLy8gRXZlcnkgbWludXRlXHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiBhdXRob3JpemF0aW9uU2VydmljZTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBnZXRBdXRob3JpemF0aW9uU2VydmljZSA9ICgpOiBBdXRob3JpemF0aW9uU2VydmljZSA9PiB7XHJcbiAgaWYgKCFhdXRob3JpemF0aW9uU2VydmljZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdBdXRob3JpemF0aW9uIHNlcnZpY2Ugbm90IGluaXRpYWxpemVkJyk7XHJcbiAgfVxyXG4gIHJldHVybiBhdXRob3JpemF0aW9uU2VydmljZTtcclxufTtcclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFw5MTg1OFxcXFxEb3dubG9hZHNcXFxcU01FX1BsYXRmb3JtXzEyX1NlcGFyYXRlX01vZHVsZXNcXFxccGxhdGZvcm1cXFxcZnJvbnRlbmRcXFxcc3JjXFxcXGxpYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcOTE4NThcXFxcRG93bmxvYWRzXFxcXFNNRV9QbGF0Zm9ybV8xMl9TZXBhcmF0ZV9Nb2R1bGVzXFxcXHBsYXRmb3JtXFxcXGZyb250ZW5kXFxcXHNyY1xcXFxsaWJcXFxcdml0ZS1hdXRoLXBsdWdpbi50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvOTE4NTgvRG93bmxvYWRzL1NNRV9QbGF0Zm9ybV8xMl9TZXBhcmF0ZV9Nb2R1bGVzL3BsYXRmb3JtL2Zyb250ZW5kL3NyYy9saWIvdml0ZS1hdXRoLXBsdWdpbi50c1wiO2ltcG9ydCB7IFBsdWdpbiB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgeyBvdHBBUEkgfSBmcm9tICcuLi9hdXRoJztcclxuaW1wb3J0IHsgdmVyaWZ5VG9rZW4gfSBmcm9tICcuL2p3dCc7XHJcbmltcG9ydCB7IFVzZXJEYXRhYmFzZSwgaW5pdGlhbGl6ZURhdGFiYXNlIH0gZnJvbSAnLi9kYXRhYmFzZSc7XHJcbmltcG9ydCB7IEF1dGhvcml6YXRpb25TZXJ2aWNlLCBpbml0aWFsaXplQXV0aG9yaXphdGlvbiwgUGVybWlzc2lvbiB9IGZyb20gJy4vYXV0aG9yaXphdGlvbic7XHJcbmltcG9ydCB7IFVzZXIgYXMgQXV0aFVzZXIsIFVzZXJSb2xlIH0gZnJvbSAnLi4vdHlwZXMvYXV0aC50eXBlcyc7XHJcbmltcG9ydCBSZWRpcyBmcm9tICdpb3JlZGlzJztcclxuaW1wb3J0IHsgSW5jb21pbmdNZXNzYWdlIH0gZnJvbSAnaHR0cCc7XHJcblxyXG4vLyBFeHRlbmRlZCByZXF1ZXN0IGludGVyZmFjZVxyXG5pbnRlcmZhY2UgQXV0aGVudGljYXRlZFJlcXVlc3QgZXh0ZW5kcyBJbmNvbWluZ01lc3NhZ2Uge1xyXG4gIHVzZXI6IEF1dGhVc2VyO1xyXG4gIGhlYWRlcnM6IGFueTtcclxuICBtZXRob2Q6IHN0cmluZztcclxuICB1cmw6IHN0cmluZztcclxuICBib2R5PzogYW55O1xyXG4gIHF1ZXJ5PzogYW55O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXV0aFBsdWdpbigpOiBQbHVnaW4ge1xyXG4gIGxldCBhdXRoU2VydmljZTogQXV0aG9yaXphdGlvblNlcnZpY2U7XHJcbiAgbGV0IHVzZXJEYjogVXNlckRhdGFiYXNlO1xyXG4gIGxldCByZWRpczogUmVkaXM7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBuYW1lOiAnYXV0aC1wbHVnaW4nLFxyXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xyXG4gICAgICAvLyBJbml0aWFsaXplIHNlcnZpY2VzXHJcbiAgICAgIGNvbnN0IGluaXRpYWxpemVTZXJ2aWNlcyA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgcmVkaXMgPSBuZXcgUmVkaXMocHJvY2Vzcy5lbnYuUkVESVNfVVJMIHx8ICdyZWRpczovL2xvY2FsaG9zdDo2Mzc5Jyk7XHJcbiAgICAgICAgICBhd2FpdCBpbml0aWFsaXplRGF0YWJhc2UoKTtcclxuICAgICAgICAgIGF1dGhTZXJ2aWNlID0gaW5pdGlhbGl6ZUF1dGhvcml6YXRpb24ocmVkaXMpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBhdXRoIHNlcnZpY2VzOicsIGVycm9yKTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBpbml0aWFsaXplU2VydmljZXMoKTtcclxuXHJcbiAgICAgIC8vIEF1dGhlbnRpY2F0aW9uIG1pZGRsZXdhcmVcclxuICAgICAgY29uc3QgYXV0aGVudGljYXRlID0gYXN5bmMgKHJlcTogYW55LCByZXM6IGFueSwgbmV4dDogYW55KSA9PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGNvbnN0IGF1dGhIZWFkZXIgPSByZXEuaGVhZGVycy5hdXRob3JpemF0aW9uO1xyXG4gICAgICAgICAgaWYgKCFhdXRoSGVhZGVyIHx8ICFhdXRoSGVhZGVyLnN0YXJ0c1dpdGgoJ0JlYXJlciAnKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oeyBlcnJvcjogJ0F1dGhlbnRpY2F0aW9uIHJlcXVpcmVkJyB9KTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjb25zdCB0b2tlbiA9IGF1dGhIZWFkZXIuc3Vic3RyaW5nKDcpO1xyXG4gICAgICAgICAgY29uc3QgZGVjb2RlZCA9IHZlcmlmeVRva2VuKHRva2VuKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKCFkZWNvZGVkIHx8ICFkZWNvZGVkLnVzZXJJZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oeyBlcnJvcjogJ0ludmFsaWQgdG9rZW4nIH0pO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIEdldCB1c2VyIGZyb20gZGF0YWJhc2VcclxuICAgICAgICAgIGNvbnN0IGRiVXNlciA9IGF3YWl0IFVzZXJEYXRhYmFzZS5maW5kQnlJZChkZWNvZGVkLnVzZXJJZCk7XHJcbiAgICAgICAgICBpZiAoIWRiVXNlcikge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oeyBlcnJvcjogJ1VzZXIgbm90IGZvdW5kJyB9KTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBDb252ZXJ0IGRhdGFiYXNlIHVzZXIgdG8gYXV0aCB1c2VyXHJcbiAgICAgICAgICBjb25zdCBhdXRoVXNlcjogQXV0aFVzZXIgPSB7XHJcbiAgICAgICAgICAgIGlkOiBkYlVzZXIuaWQsXHJcbiAgICAgICAgICAgIGVtYWlsOiBkYlVzZXIuZW1haWwsXHJcbiAgICAgICAgICAgIG5hbWU6IGRiVXNlci5uYW1lLFxyXG4gICAgICAgICAgICByb2xlOiBkYlVzZXIucm9sZSBhcyBVc2VyUm9sZSxcclxuICAgICAgICAgICAgdGVuYW50SWQ6IGRiVXNlci50ZW5hbnRJZCxcclxuICAgICAgICAgICAgbW9iaWxlOiBkYlVzZXIubW9iaWxlLFxyXG4gICAgICAgICAgICBwZXJtaXNzaW9uczogZGJVc2VyLnBlcm1pc3Npb25zLFxyXG4gICAgICAgICAgICBsYXN0TG9naW46IGRiVXNlci5sYXN0TG9naW4sXHJcbiAgICAgICAgICAgIGlzQWN0aXZlOiBkYlVzZXIuaXNBY3RpdmUsXHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIHJlcS51c2VyID0gYXV0aFVzZXI7XHJcbiAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMSkuanNvbih7IGVycm9yOiAnQXV0aGVudGljYXRpb24gZmFpbGVkJyB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBBdXRob3JpemF0aW9uIG1pZGRsZXdhcmVcclxuICAgICAgY29uc3QgYXV0aG9yaXplID0gKHBlcm1pc3Npb246IFBlcm1pc3Npb24pID0+IHtcclxuICAgICAgICByZXR1cm4gYXN5bmMgKHJlcTogYW55LCByZXM6IGFueSwgbmV4dDogYW55KSA9PiB7XHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAoIWF1dGhTZXJ2aWNlKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdBdXRob3JpemF0aW9uIHNlcnZpY2Ugbm90IGF2YWlsYWJsZScgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGhhc1Blcm1pc3Npb24gPSBhd2FpdCBhdXRoU2VydmljZS5oYXNQZXJtaXNzaW9uKHJlcS51c2VyLCBwZXJtaXNzaW9uKTtcclxuICAgICAgICAgICAgaWYgKCFoYXNQZXJtaXNzaW9uKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAzKS5qc29uKHsgXHJcbiAgICAgICAgICAgICAgICBlcnJvcjogJ0luc3VmZmljaWVudCBwZXJtaXNzaW9ucycsXHJcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogcGVybWlzc2lvbixcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignQXV0aG9yaXphdGlvbiBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgZXJyb3I6ICdBdXRob3JpemF0aW9uIGNoZWNrIGZhaWxlZCcgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoJy9hcGkvYXV0aCcsIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgIGlmICghcmVxLnVybCkgcmV0dXJuIG5leHQoKTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCwgYGh0dHA6Ly8ke3JlcS5oZWFkZXJzLmhvc3R9YCk7XHJcbiAgICAgICAgICBjb25zdCBwYXRoID0gdXJsLnBhdGhuYW1lLnJlcGxhY2UoJy9hcGkvYXV0aCcsICcnKTtcclxuXHJcbiAgICAgICAgICAvLyBIZWxwZXIgdG8gcmVhZCByZXF1ZXN0IGJvZHlcclxuICAgICAgICAgIGNvbnN0IHJlYWRCb2R5ID0gYXN5bmMgKHJlcTogYW55KTogUHJvbWlzZTxhbnk+ID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgbGV0IGJvZHkgPSAnJztcclxuICAgICAgICAgICAgICByZXEub24oJ2RhdGEnLCAoY2h1bms6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgYm9keSArPSBjaHVuay50b1N0cmluZygpO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIHJlcS5vbignZW5kJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgcmVzb2x2ZShKU09OLnBhcnNlKGJvZHkpKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICByZXNvbHZlKHt9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIC8vIEhhbmRsZSBPVFAgZW5kcG9pbnRzXHJcbiAgICAgICAgICBpZiAocGF0aCA9PT0gJy9zZW5kLW90cCcgJiYgcmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZWFkQm9keShyZXEpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBvdHBBUEkuc2VuZE9UUChkYXRhLm1vYmlsZSk7XHJcbiAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHJlc3VsdCkpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XHJcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IFxyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsIFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnRmFpbGVkIHRvIHNlbmQgT1RQJyBcclxuICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmIChwYXRoID09PSAnL3ZlcmlmeS1vdHAnICYmIHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVhZEJvZHkocmVxKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgb3RwQVBJLnZlcmlmeU9UUChkYXRhLm1vYmlsZSwgZGF0YS5vdHApO1xyXG4gICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XHJcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShyZXN1bHQpKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLCBcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ0ZhaWxlZCB0byB2ZXJpZnkgT1RQJyBcclxuICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIEhhbmRsZSByZWZyZXNoIHRva2VuIGVuZHBvaW50XHJcbiAgICAgICAgICBpZiAocGF0aCA9PT0gJy9yZWZyZXNoJyAmJiByZXEubWV0aG9kID09PSAnUE9TVCcpIHtcclxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlYWRCb2R5KHJlcSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIC8vIE1vY2sgcmVmcmVzaCB0b2tlbiBpbXBsZW1lbnRhdGlvblxyXG4gICAgICAgICAgICAgIC8vIEluIHByb2R1Y3Rpb24sIHRoaXMgd291bGQgdmFsaWRhdGUgdGhlIHJlZnJlc2ggdG9rZW4gYW5kIGlzc3VlIGEgbmV3IGFjY2VzcyB0b2tlblxyXG4gICAgICAgICAgICAgIGNvbnN0IG1vY2tBY2Nlc3NUb2tlbiA9IGBtb2NrX2FjY2Vzc190b2tlbl8ke0RhdGUubm93KCl9YDtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGFjY2Vzc1Rva2VuOiBtb2NrQWNjZXNzVG9rZW4sXHJcbiAgICAgICAgICAgICAgICBleHBpcmVzSW46IDI0ICogNjAgKiA2MCwgLy8gMjQgaG91cnNcclxuICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDEsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgXHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSwgXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCByZWZyZXNoIHRva2VuJyBcclxuICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIEhhbmRsZSBBdXRoLmpzIGVuZHBvaW50cyAoc2ltcGxpZmllZCB2ZXJzaW9uKVxyXG4gICAgICAgICAgaWYgKHBhdGggPT09ICcvc2Vzc2lvbicgJiYgcmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcclxuICAgICAgICAgICAgLy8gTW9jayBzZXNzaW9uIGVuZHBvaW50XHJcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkobnVsbCkpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKHBhdGggPT09ICcvc2lnbm91dCcgJiYgcmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XHJcbiAgICAgICAgICAgIC8vIE1vY2sgc2lnbm91dCBlbmRwb2ludFxyXG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ1NpZ25lZCBvdXQgc3VjY2Vzc2Z1bGx5JyB9KSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAocGF0aCA9PT0gJy9wcm92aWRlcnMnICYmIHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XHJcbiAgICAgICAgICAgIC8vIE1vY2sgcHJvdmlkZXJzIGVuZHBvaW50XHJcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgIHByb3ZpZGVyczogW1xyXG4gICAgICAgICAgICAgICAgeyBpZDogJ2dvb2dsZScsIG5hbWU6ICdHb29nbGUnIH0sXHJcbiAgICAgICAgICAgICAgICB7IGlkOiAnbW9iaWxlLW90cCcsIG5hbWU6ICdNb2JpbGUgT1RQJyB9XHJcbiAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBBdXRob3JpemF0aW9uIGVuZHBvaW50c1xyXG4gICAgICAgICAgaWYgKHBhdGggPT09ICcvcGVybWlzc2lvbnMvY2hlY2snICYmIHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xyXG4gICAgICAgICAgICBhd2FpdCBhdXRoZW50aWNhdGUocmVxLCByZXMsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVhZEJvZHkocmVxKTtcclxuICAgICAgICAgICAgICBjb25zdCBwZXJtaXNzaW9uID0gZGF0YS5wZXJtaXNzaW9uIGFzIFBlcm1pc3Npb247XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgaWYgKCFhdXRoU2VydmljZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0F1dGhvcml6YXRpb24gc2VydmljZSBub3QgYXZhaWxhYmxlJyB9KSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaGFzUGVybWlzc2lvbiA9IGF3YWl0IGF1dGhTZXJ2aWNlLmhhc1Blcm1pc3Npb24oKHJlcSBhcyBBdXRoZW50aWNhdGVkUmVxdWVzdCkudXNlciwgcGVybWlzc2lvbik7XHJcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IFxyXG4gICAgICAgICAgICAgICAgICBoYXNQZXJtaXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgICBwZXJtaXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgICB1c2VySWQ6IChyZXEgYXMgQXV0aGVudGljYXRlZFJlcXVlc3QpLnVzZXIuaWQsXHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNTAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdQZXJtaXNzaW9uIGNoZWNrIGZhaWxlZCcgfSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAocGF0aCA9PT0gJy9wZXJtaXNzaW9ucy91c2VyLzp1c2VySWQnICYmIHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGF1dGhlbnRpY2F0ZShyZXEsIHJlcywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgIGF3YWl0IGF1dGhvcml6ZShQZXJtaXNzaW9uLlVTRVJfUkVBRCkocmVxLCByZXMsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGhQYXJ0cyA9IHVybC5wYXRobmFtZS5zcGxpdCgnLycpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdXNlcklkID0gcGF0aFBhcnRzW3BhdGhQYXJ0cy5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKCFhdXRoU2VydmljZSB8fCAhdXNlcklkKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNTAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludmFsaWQgcmVxdWVzdCBvciBzZXJ2aWNlIHVuYXZhaWxhYmxlJyB9KSk7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRVc2VyID0gYXdhaXQgVXNlckRhdGFiYXNlLmZpbmRCeUlkKHVzZXJJZCk7XHJcbiAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0VXNlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA0LCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnVXNlciBub3QgZm91bmQnIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgdG8gYXV0aCB1c2VyIHR5cGVcclxuICAgICAgICAgICAgICAgICAgY29uc3QgYXV0aFRhcmdldFVzZXI6IEF1dGhVc2VyID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiB0YXJnZXRVc2VyLmlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGVtYWlsOiB0YXJnZXRVc2VyLmVtYWlsLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHRhcmdldFVzZXIubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICByb2xlOiB0YXJnZXRVc2VyLnJvbGUgYXMgVXNlclJvbGUsXHJcbiAgICAgICAgICAgICAgICAgICAgdGVuYW50SWQ6IHRhcmdldFVzZXIudGVuYW50SWQsXHJcbiAgICAgICAgICAgICAgICAgICAgbW9iaWxlOiB0YXJnZXRVc2VyLm1vYmlsZSxcclxuICAgICAgICAgICAgICAgICAgICBwZXJtaXNzaW9uczogdGFyZ2V0VXNlci5wZXJtaXNzaW9ucyxcclxuICAgICAgICAgICAgICAgICAgICBsYXN0TG9naW46IHRhcmdldFVzZXIubGFzdExvZ2luLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzQWN0aXZlOiB0YXJnZXRVc2VyLmlzQWN0aXZlLFxyXG4gICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1c2VyUGVybWlzc2lvbnMgPSBhd2FpdCBhdXRoU2VydmljZS5nZXRVc2VyUGVybWlzc2lvbnMoKHJlcSBhcyBBdXRoZW50aWNhdGVkUmVxdWVzdCkudXNlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgXHJcbiAgICAgICAgICAgICAgICAgICAgICB1c2VySWQ6IChyZXEgYXMgQXV0aGVudGljYXRlZFJlcXVlc3QpLnVzZXIuaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICBwZXJtaXNzaW9uczogdXNlclBlcm1pc3Npb25zLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ZhaWxlZCB0byBnZXQgdXNlciBwZXJtaXNzaW9ucycgfSkpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdGYWlsZWQgdG8gZ2V0IHVzZXIgcGVybWlzc2lvbnMnIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAocGF0aCA9PT0gJy9yb2xlcy91c2VyLzp1c2VySWQnICYmIHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGF1dGhlbnRpY2F0ZShyZXEsIHJlcywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgIGF3YWl0IGF1dGhvcml6ZShQZXJtaXNzaW9uLlVTRVJfUkVBRCkocmVxLCByZXMsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGhQYXJ0cyA9IHVybC5wYXRobmFtZS5zcGxpdCgnLycpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdXNlcklkID0gcGF0aFBhcnRzW3BhdGhQYXJ0cy5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKCF1c2VySWQpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnVXNlciBJRCBpcyByZXF1aXJlZCcgfSkpO1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgdXNlciA9IGF3YWl0IFVzZXJEYXRhYmFzZS5maW5kQnlJZCh1c2VySWQpO1xyXG4gICAgICAgICAgICAgICAgICBpZiAoIXVzZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ1VzZXIgbm90IGZvdW5kJyB9KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICB1c2VySWQ6IHVzZXIuaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcm9sZTogdXNlci5yb2xlLFxyXG4gICAgICAgICAgICAgICAgICAgIHRlbmFudElkOiB1c2VyLnRlbmFudElkLFxyXG4gICAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdGYWlsZWQgdG8gZ2V0IHVzZXIgcm9sZScgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmIChwYXRoID09PSAnL3Blcm1pc3Npb25zL3Jlc291cmNlJyAmJiByZXEubWV0aG9kID09PSAnUE9TVCcpIHtcclxuICAgICAgICAgICAgYXdhaXQgYXV0aGVudGljYXRlKHJlcSwgcmVzLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlYWRCb2R5KHJlcSk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgaWYgKCFhdXRoU2VydmljZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0F1dGhvcml6YXRpb24gc2VydmljZSBub3QgYXZhaWxhYmxlJyB9KSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2FuQWNjZXNzID0gYXdhaXQgYXV0aFNlcnZpY2UuY2FuQWNjZXNzUmVzb3VyY2UoXHJcbiAgICAgICAgICAgICAgICAgIChyZXEgYXMgQXV0aGVudGljYXRlZFJlcXVlc3QpLnVzZXIsXHJcbiAgICAgICAgICAgICAgICAgIGRhdGEucmVzb3VyY2UsXHJcbiAgICAgICAgICAgICAgICAgIGRhdGEuYWN0aW9uLFxyXG4gICAgICAgICAgICAgICAgICBkYXRhLnJlc291cmNlSWQsXHJcbiAgICAgICAgICAgICAgICAgIGRhdGEucmVzb3VyY2VPd25lcklkXHJcbiAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgY2FuQWNjZXNzLFxyXG4gICAgICAgICAgICAgICAgICByZXNvdXJjZTogZGF0YS5yZXNvdXJjZSxcclxuICAgICAgICAgICAgICAgICAgYWN0aW9uOiBkYXRhLmFjdGlvbixcclxuICAgICAgICAgICAgICAgICAgcmVzb3VyY2VJZDogZGF0YS5yZXNvdXJjZUlkLFxyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnUmVzb3VyY2UgYWNjZXNzIGNoZWNrIGZhaWxlZCcgfSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dGggbWlkZGxld2FyZSBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xyXG4gICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW50ZXJuYWwgU2VydmVyIEVycm9yJyB9KSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0sXHJcbiAgfTtcclxufVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWlhLFNBQVMsb0JBQW9CO0FBQzliLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7OztBQ0R4QixPQUFPLFlBQVk7QUFDbkIsT0FBTyx5QkFB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Q1Y7QUFBQSxVQUNBO0FBQUEsWUFDSSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsVUFDVjtBQUFBLFFBQ0o7QUFBQSxNQUNKO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDTCxjQUFjLENBQUMsc0NBQXNDO0FBQUEsUUFDckQsZ0JBQWdCO0FBQUEsVUFDWjtBQUFBLFlBQ0ksWUFBWTtBQUFBLFlBQ1osU0FBUztBQUFBLFlBQ1QsU0FBUztBQUFBLGNBQ0wsV0FBVztBQUFBLGNBQ1gsWUFBWTtBQUFBLGdCQUNSLFlBQVk7QUFBQSxnQkFDWixlQUFlLEtBQUs7QUFBQTtBQUFBLGNBQ3hCO0FBQUEsY0FDQSxtQkFBbUI7QUFBQSxnQkFDZixVQUFVLENBQUMsR0FBRyxHQUFHO0FBQUEsY0FDckI7QUFBQSxZQUNKO0FBQUEsVUFDSjtBQUFBLFFBQ0o7QUFBQSxNQUNKO0FBQUEsSUFDSixDQUFDO0FBQUEsRUFDTDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0gsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ1gsUUFBUTtBQUFBLFFBQ0osY0FBYztBQUFBLFVBQ1YsZ0JBQWdCLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFVBQ3pELGNBQWMsQ0FBQyxpQkFBaUIscUJBQXFCO0FBQUEsVUFDckQsZ0JBQWdCLENBQUMsVUFBVTtBQUFBLFFBQy9CO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFsiZG90ZW52IiwgImRvdGVudiIsICJkb3RlbnYiLCAiZG90ZW52IiwgIlBlcm1pc3Npb24iLCAicmVkaXMiLCAicmVkaXMiLCAiUmVkaXMiLCAicmVkaXMiLCAiUmVkaXMiLCAicmVxIl0KfQo=
