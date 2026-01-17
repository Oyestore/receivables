import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseService } from '../../Module_11_Common/code/database/database.service';
import { Logger } from '../../Module_11_Common/code/logging/logger';
import { JwtService } from '../../Module_11_Common/code/auth/jwt.service';
import { TenantService } from '../../Module_11_Common/code/multi-tenancy/tenant.service';
import {
  NotFoundError,
  ValidationError,
  DatabaseError,
  UnauthorizedError,
} from '../../Module_11_Common/code/errors/app-error';
import {
  User,
  Tenant,
} from '../entities/tenant.entity';
import * as bcrypt from 'bcrypt';

const logger = new Logger('AdministrationService');

/**
 * Administration Service
 * Manages users, roles, permissions, and tenant administration
 */
@Injectable()
export class AdministrationService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private databaseService: DatabaseService,
    private jwtService: JwtService,
    private tenantService: TenantService,
  ) {}

  /**
   * Create a new user
   */
  async createUser(
    tenantId: string,
    userData: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      role_ids: string[];
    },
    createdBy: string
  ): Promise<IUser> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
        [userData.email, tenantId]
      );

      if (existingUser.rows.length > 0) {
        throw new ValidationError('User with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);

      // Create user
      const userQuery = `
        INSERT INTO users (
          tenant_id, email, password_hash, first_name, last_name,
          status, created_by
        ) VALUES ($1, $2, $3, $4, $5, 'active', $6)
        RETURNING id, tenant_id, email, first_name, last_name, status, created_at, updated_at
      `;

      const userResult = await client.query(userQuery, [
        tenantId,
        userData.email,
        passwordHash,
        userData.first_name,
        userData.last_name,
        createdBy,
      ]);

      const user = userResult.rows[0];

      // Assign roles
      for (const roleId of userData.role_ids) {
        await client.query(
          'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
          [user.id, roleId, createdBy]
        );
      }

      await client.query('COMMIT');

      logger.info('User created', {
        userId: user.id,
        email: user.email,
        tenantId,
      });

      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create user', { error, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Authenticate user
   */
  async authenticateUser(
    email: string,
    password: string
  ): Promise<{ user: IUser; token: string; refreshToken: string }> {
    try {
      // Get user with password hash
      const result = await this.pool.query(
        `SELECT u.*, t.name as tenant_name
         FROM users u
         JOIN tenants t ON u.tenant_id = t.id
         WHERE u.email = $1 AND u.status = 'active' AND u.deleted_at IS NULL`,
        [email]
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const user = result.rows[0];

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Get user roles and permissions
      const rolesResult = await this.pool.query(
        `SELECT r.*, array_agg(p.permission_name) as permissions
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         LEFT JOIN permissions p ON rp.permission_id = p.id
         WHERE ur.user_id = $1
         GROUP BY r.id`,
        [user.id]
      );

      user.roles = rolesResult.rows;

      // Generate tokens
      const token = jwtService.generateToken({
        userId: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        roles: user.roles.map((r: any) => r.name),
      });

      const refreshToken = jwtService.generateRefreshToken({
        userId: user.id,
        tenantId: user.tenant_id,
      });

      // Update last login
      await this.pool.query(
        'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      // Remove password hash from response
      delete user.password_hash;

      logger.info('User authenticated', {
        userId: user.id,
        email: user.email,
        tenantId: user.tenant_id,
      });

      return { user, token, refreshToken };
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      logger.error('Failed to authenticate user', { error, email });
      throw new DatabaseError('Authentication failed');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(tenantId: string, userId: string): Promise<IUser> {
    try {
      const result = await this.pool.query(
        `SELECT u.id, u.tenant_id, u.email, u.first_name, u.last_name,
                u.status, u.last_login_at, u.created_at, u.updated_at
         FROM users u
         WHERE u.id = $1 AND u.tenant_id = $2 AND u.deleted_at IS NULL`,
        [userId, tenantId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }

      const user = result.rows[0];

      // Get user roles
      const rolesResult = await this.pool.query(
        `SELECT r.* FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
      );

      user.roles = rolesResult.rows;

      return user;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to get user', { error, userId, tenantId });
      throw new DatabaseError('Failed to retrieve user');
    }
  }

  /**
   * List users
   */
  async listUsers(
    tenantId: string,
    filters?: { status?: UserStatus; role_id?: string }
  ): Promise<IUser[]> {
    try {
      let query = `
        SELECT u.id, u.tenant_id, u.email, u.first_name, u.last_name,
               u.status, u.last_login_at, u.created_at
        FROM users u
        WHERE u.tenant_id = $1 AND u.deleted_at IS NULL
      `;

      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (filters?.status) {
        query += ` AND u.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters?.role_id) {
        query += ` AND EXISTS (
          SELECT 1 FROM user_roles ur 
          WHERE ur.user_id = u.id AND ur.role_id = $${paramIndex}
        )`;
        params.push(filters.role_id);
        paramIndex++;
      }

      query += ' ORDER BY u.created_at DESC';

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to list users', { error, tenantId });
      throw new DatabaseError('Failed to list users');
    }
  }

  /**
   * Update user
   */
  async updateUser(
    tenantId: string,
    userId: string,
    updates: Partial<IUser>,
    updatedBy: string
  ): Promise<IUser> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const updateFields = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (updates.first_name) {
        updateFields.push(`first_name = $${paramIndex}`);
        params.push(updates.first_name);
        paramIndex++;
      }

      if (updates.last_name) {
        updateFields.push(`last_name = $${paramIndex}`);
        params.push(updates.last_name);
        paramIndex++;
      }

      if (updates.email) {
        updateFields.push(`email = $${paramIndex}`);
        params.push(updates.email);
        paramIndex++;
      }

      if (updates.status) {
        updateFields.push(`status = $${paramIndex}`);
        params.push(updates.status);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      params.push(userId, tenantId);
      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING id, tenant_id, email, first_name, last_name, status, created_at, updated_at
      `;

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        throw new NotFoundError('User not found');
      }

      await client.query('COMMIT');

      logger.info('User updated', { userId, tenantId });

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update user', { error, userId, tenantId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(tenantId: string, userId: string, deletedBy: string): Promise<void> {
    try {
      const result = await this.pool.query(
        'UPDATE users SET status = $1, deleted_at = CURRENT_TIMESTAMP WHERE id = $2 AND tenant_id = $3',
        ['inactive', userId, tenantId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('User not found');
      }

      logger.info('User deleted', { userId, tenantId });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to delete user', { error, userId, tenantId });
      throw new DatabaseError('Failed to delete user');
    }
  }

  /**
   * Create role
   */
  async createRole(
    tenantId: string,
    roleData: {
      name: string;
      description?: string;
      permission_ids: string[];
    },
    createdBy: string
  ): Promise<IRole> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Create role
      const roleQuery = `
        INSERT INTO roles (tenant_id, name, description, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const roleResult = await client.query(roleQuery, [
        tenantId,
        roleData.name,
        roleData.description,
        createdBy,
      ]);

      const role = roleResult.rows[0];

      // Assign permissions
      for (const permissionId of roleData.permission_ids) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
          [role.id, permissionId]
        );
      }

      await client.query('COMMIT');

      logger.info('Role created', { roleId: role.id, roleName: role.name, tenantId });

      return role;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create role', { error, tenantId });
      throw new DatabaseError('Failed to create role');
    } finally {
      client.release();
    }
  }

  /**
   * List roles
   */
  async listRoles(tenantId: string): Promise<IRole[]> {
    try {
      const result = await this.pool.query(
        `SELECT r.*, 
                array_agg(p.permission_name) FILTER (WHERE p.id IS NOT NULL) as permissions
         FROM roles r
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         LEFT JOIN permissions p ON rp.permission_id = p.id
         WHERE r.tenant_id = $1 OR r.tenant_id IS NULL
         GROUP BY r.id
         ORDER BY r.created_at DESC`,
        [tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to list roles', { error, tenantId });
      throw new DatabaseError('Failed to list roles');
    }
  }

  /**
   * List all permissions
   */
  async listPermissions(): Promise<IPermission[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM permissions ORDER BY module, permission_name'
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to list permissions', { error });
      throw new DatabaseError('Failed to list permissions');
    }
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(
    tenantId: string,
    userId: string,
    roleId: string,
    assignedBy: string
  ): Promise<void> {
    try {
      // Verify user and role belong to tenant
      const userCheck = await this.pool.query(
        'SELECT id FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );

      if (userCheck.rows.length === 0) {
        throw new NotFoundError('User not found');
      }

      const roleCheck = await this.pool.query(
        'SELECT id FROM roles WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)',
        [roleId, tenantId]
      );

      if (roleCheck.rows.length === 0) {
        throw new NotFoundError('Role not found');
      }

      // Assign role
      await this.pool.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [userId, roleId, assignedBy]
      );

      logger.info('Role assigned to user', { userId, roleId, tenantId });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to assign role', { error, userId, roleId, tenantId });
      throw new DatabaseError('Failed to assign role');
    }
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(
    tenantId: string,
    userId: string,
    roleId: string
  ): Promise<void> {
    try {
      const result = await this.pool.query(
        `DELETE FROM user_roles 
         WHERE user_id = $1 AND role_id = $2
         AND EXISTS (SELECT 1 FROM users WHERE id = $1 AND tenant_id = $3)`,
        [userId, roleId, tenantId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('User role assignment not found');
      }

      logger.info('Role removed from user', { userId, roleId, tenantId });
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to remove role', { error, userId, roleId, tenantId });
      throw new DatabaseError('Failed to remove role');
    }
  }

  /**
   * Get tenant settings
   */
  async getTenantSettings(tenantId: string): Promise<any> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM tenants WHERE id = $1',
        [tenantId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Tenant not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to get tenant settings', { error, tenantId });
      throw new DatabaseError('Failed to retrieve tenant settings');
    }
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(
    tenantId: string,
    settings: any,
    updatedBy: string
  ): Promise<any> {
    try {
      const result = await this.pool.query(
        `UPDATE tenants 
         SET settings = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(settings), tenantId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Tenant not found');
      }

      logger.info('Tenant settings updated', { tenantId });

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error('Failed to update tenant settings', { error, tenantId });
      throw new DatabaseError('Failed to update tenant settings');
    }
  }
}

export const administrationService = new AdministrationService();
