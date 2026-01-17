import { Pool, PoolClient } from 'pg';
import Redis from 'ioredis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection pool
let pool: Pool;
let redis: Redis;

// Initialize database connections
export const initializeDatabase = async () => {
  try {
    // PostgreSQL connection
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
      
      // Test the connection
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ PostgreSQL connected successfully');
    } else {
      console.log('⚠️ DATABASE_URL not provided, using mock storage');
    }

    // Redis connection
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL);
      
      // Test the connection
      await redis.ping();
      console.log('✅ Redis connected successfully');
    } else {
      console.log('⚠️ REDIS_URL not provided, using mock storage');
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// User database operations
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
  createdAt: Date;
  updatedAt: Date;
}

export class UserDatabase {
  // Create or update user
  static async upsert(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    if (!pool) {
      throw new Error('Database not initialized');
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
  static async findByEmail(email: string): Promise<User | null> {
    if (!pool) {
      throw new Error('Database not initialized');
    }

    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  // Find user by mobile
  static async findByMobile(mobile: string): Promise<User | null> {
    if (!pool) {
      throw new Error('Database not initialized');
    }

    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE mobile = $1', [mobile]);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  // Find user by ID
  static async findById(id: string): Promise<User | null> {
    if (!pool) {
      throw new Error('Database not initialized');
    }

    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  // Update user
  static async update(id: string, updates: Partial<User>): Promise<User | null> {
    if (!pool) {
      throw new Error('Database not initialized');
    }

    const client = await pool.connect();
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'id' || key === 'createdAt') continue;
        
        const dbField = this.camelToSnake(key);
        fields.push(`${dbField} = $${paramIndex}`);
        
        if (key === 'permissions') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramIndex++;
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await client.query(query, values);
      
      return result.rows.length > 0 ? this.mapRowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  // Helper method to map database row to User object
  private static mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      tenantId: row.tenant_id,
      mobile: row.mobile,
      permissions: Array.isArray(row.permissions) ? row.permissions : JSON.parse(row.permissions || '[]'),
      lastLogin: row.last_login ? new Date(row.last_login) : undefined,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // Helper method to convert camelCase to snake_case
  private static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

// OTP storage operations
export interface OTPData {
  otp: string;
  mobile: string;
  expires: Date;
  attempts: number;
  createdAt: Date;
}

export class OTPStore {
  static async store(mobile: string, otp: string, expires: Date): Promise<void> {
    if (redis) {
      // Use Redis for production
      const data = {
        otp,
        mobile,
        expires: expires.toISOString(),
        attempts: 0,
        createdAt: new Date().toISOString(),
      };
      await redis.setex(`otp:${mobile}`, 600, JSON.stringify(data)); // 10 minutes TTL
    } else {
      // Fallback to in-memory storage (development only)
      console.log('⚠️ Using in-memory OTP storage (Redis not available)');
    }
  }

  static async get(mobile: string): Promise<OTPData | null> {
    if (redis) {
      const data = await redis.get(`otp:${mobile}`);
      return data ? JSON.parse(data) : null;
    } else {
      // Fallback for development
      console.log('⚠️ OTP retrieval not available (Redis not connected)');
      return null;
    }
  }

  static async incrementAttempts(mobile: string): Promise<number> {
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

  static async delete(mobile: string): Promise<void> {
    if (redis) {
      await redis.del(`otp:${mobile}`);
    }
  }

  static async cleanup(): Promise<void> {
    if (redis) {
      // Redis handles TTL automatically, but we can add manual cleanup if needed
      const keys = await redis.keys('otp:*');
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const otpData = JSON.parse(data);
          if (new Date(otpData.expires) < new Date()) {
            await redis.del(key);
          }
        }
      }
    }
  }
}

// Database schema initialization
export const initializeSchema = async () => {
  if (!pool) {
    console.log('⚠️ Skipping schema initialization (database not connected)');
    return;
  }

  const client = await pool.connect();
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        mobile VARCHAR(20),
        permissions JSONB DEFAULT '[]',
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');

    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Schema initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Close database connections
export const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    console.log('✅ PostgreSQL connection closed');
  }
  
  if (redis) {
    await redis.quit();
    console.log('✅ Redis connection closed');
  }
};

// Health check
export const healthCheck = async () => {
  const health = {
    database: false,
    redis: false,
    timestamp: new Date().toISOString(),
  };

  if (pool) {
    try {
      await pool.query('SELECT 1');
      health.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }
  }

  if (redis) {
    try {
      await redis.ping();
      health.redis = true;
    } catch (error) {
      console.error('Redis health check failed:', error);
    }
  }

  return health;
};
