/**
 * User Management Service for Tenant-Level Administrative Operations
 * SME Receivables Management Platform - Administrative Module
 * 
 * @fileoverview Comprehensive service for user lifecycle management, authentication, and access control
 * @version 1.0.0
 * @since 2025-01-21
 */

import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan, LessThan, Between, Not } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { 
  UserStatus, 
  TimeZone,
  AuditAction,
  Priority
} from '@shared/enums/administrative.enum';
import {
  IUser,
  IUserPreferences,
  ISearchCriteria,
  IPagination,
  IApiResponse
} from '@shared/interfaces/administrative.interface';
import { User } from '../entities/user.entity';
import { UserSession } from '../entities/user-session.entity';
import { UserRoleAssignment } from '../entities/user-role-assignment.entity';
import { UserActivityLog } from '../entities/user-activity-log.entity';
import { Role } from '../entities/role.entity';
import { TenantAuditLog } from '../entities/tenant-audit-log.entity';

/**
 * Data Transfer Objects for User Management
 */
export interface CreateUserDto {
  tenantId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  employeeId?: string;
  password: string;
  roleIds: string[];
  preferences?: Partial<IUserPreferences>;
  timezone?: TimeZone;
  language?: string;
  sendWelcomeEmail?: boolean;
  createdBy: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  employeeId?: string;
  timezone?: TimeZone;
  language?: string;
  preferences?: Partial<IUserPreferences>;
  updatedBy: string;
}

export interface ChangePasswordDto {
  userId: string;
  currentPassword?: string;
  newPassword: string;
  forceChange?: boolean;
  changedBy: string;
}

export interface LoginDto {
  tenantId: string;
  username: string;
  password: string;
  mfaCode?: string;
  rememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  requiresMfa?: boolean;
  mfaSecret?: string;
  error?: string;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  deactivatedUsers: number;
  usersByDepartment: Record<string, number>;
  usersByRole: Record<string, number>;
  loginMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionDuration: number;
  };
  securityMetrics: {
    usersWithMfa: number;
    lockedAccounts: number;
    expiredPasswords: number;
    failedLoginAttempts: number;
  };
}

export interface BulkUserOperation {
  userIds: string[];
  operation: 'activate' | 'suspend' | 'deactivate' | 'unlock' | 'reset_password';
  reason?: string;
  operatedBy: string;
}

export interface BulkOperationResult {
  successful: string[];
  failed: Array<{ userId: string; error: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * Comprehensive user management service for tenant-level operations
 * Handles user lifecycle, authentication, authorization, and security
 */
@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    @InjectRepository(UserRoleAssignment)
    private readonly roleAssignmentRepository: Repository<UserRoleAssignment>,
    @InjectRepository(UserActivityLog)
    private readonly activityLogRepository: Repository<UserActivityLog>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(TenantAuditLog)
    private readonly auditLogRepository: Repository<TenantAuditLog>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource
  ) {}

  // =====================================================================================
  // USER CREATION AND MANAGEMENT
  // =====================================================================================

  /**
   * Create a new user with comprehensive setup
   */
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating user: ${createUserDto.username} for tenant: ${createUserDto.tenantId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check for duplicate username within tenant
      const existingUser = await this.userRepository.findOne({
        where: [
          { tenantId: createUserDto.tenantId, username: createUserDto.username },
          { tenantId: createUserDto.tenantId, email: createUserDto.email }
        ]
      });

      if (existingUser) {
        throw new ConflictException('Username or email already exists within tenant');
      }

      // Validate roles exist
      const roles = await this.roleRepository.findByIds(createUserDto.roleIds);
      if (roles.length !== createUserDto.roleIds.length) {
        throw new BadRequestException('One or more role IDs are invalid');
      }

      // Create user entity
      const user = this.userRepository.create({
        tenantId: createUserDto.tenantId,
        username: createUserDto.username,
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phone: createUserDto.phone,
        department: createUserDto.department,
        jobTitle: createUserDto.jobTitle,
        employeeId: createUserDto.employeeId,
        timezone: createUserDto.timezone || TimeZone.UTC,
        language: createUserDto.language || 'en',
        preferences: createUserDto.preferences,
        createdBy: createUserDto.createdBy
      });

      // Set password
      await user.setPassword(createUserDto.password);

      user.beforeInsert();
      const savedUser = await queryRunner.manager.save(user);

      // Assign roles
      const roleAssignments = createUserDto.roleIds.map(roleId => 
        this.roleAssignmentRepository.create({
          userId: savedUser.id,
          roleId,
          assignedBy: createUserDto.createdBy,
          isActive: true
        })
      );

      await queryRunner.manager.save(roleAssignments);

      await queryRunner.commitTransaction();

      // Log activity
      await this.logUserActivity({
        userId: savedUser.id,
        action: AuditAction.USER_CREATED,
        details: {
          username: savedUser.username,
          email: savedUser.email,
          roles: roles.map(r => r.roleName)
        },
        performedBy: createUserDto.createdBy
      });

      // Send welcome email if requested
      if (createUserDto.sendWelcomeEmail) {
        await this.sendWelcomeEmail(savedUser);
      }

      this.logger.log(`User created successfully: ${savedUser.id}`);
      return savedUser;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, updateDto: UpdateUserDto): Promise<User> {
    this.logger.log(`Updating user: ${userId}`);

    const user = await this.findUserById(userId);

    // Update fields
    if (updateDto.firstName) user.firstName = updateDto.firstName;
    if (updateDto.lastName) user.lastName = updateDto.lastName;
    if (updateDto.phone !== undefined) user.phone = updateDto.phone;
    if (updateDto.department !== undefined) user.department = updateDto.department;
    if (updateDto.jobTitle !== undefined) user.jobTitle = updateDto.jobTitle;
    if (updateDto.employeeId !== undefined) user.employeeId = updateDto.employeeId;
    if (updateDto.timezone) user.setTimezone(updateDto.timezone);
    if (updateDto.language) user.setLanguage(updateDto.language);
    if (updateDto.preferences) user.updatePreferences(updateDto.preferences);

    user.updatedBy = updateDto.updatedBy;
    user.beforeUpdate();

    const updatedUser = await this.userRepository.save(user);

    await this.logUserActivity({
      userId,
      action: AuditAction.USER_UPDATED,
      details: {
        updatedFields: Object.keys(updateDto).filter(key => key !== 'updatedBy')
      },
      performedBy: updateDto.updatedBy
    });

    this.logger.log(`User updated successfully: ${userId}`);
    return updatedUser;
  }

  /**
   * Change user password
   */
  async changePassword(changePasswordDto: ChangePasswordDto): Promise<void> {
    this.logger.log(`Changing password for user: ${changePasswordDto.userId}`);

    const user = await this.userRepository.findOne({
      where: { id: changePasswordDto.userId },
      select: ['id', 'passwordHash', 'status']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password if not forced change
    if (!changePasswordDto.forceChange && changePasswordDto.currentPassword) {
      const isCurrentPasswordValid = await user.verifyPassword(changePasswordDto.currentPassword);
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    // Set new password
    await user.setPassword(changePasswordDto.newPassword);
    
    // Clear password expired status if applicable
    if (user.status === UserStatus.PASSWORD_EXPIRED) {
      user.status = UserStatus.ACTIVE;
    }

    await this.userRepository.save(user);

    // Invalidate all existing sessions
    await this.invalidateAllUserSessions(changePasswordDto.userId);

    await this.logUserActivity({
      userId: changePasswordDto.userId,
      action: AuditAction.PASSWORD_CHANGED,
      details: {
        forceChange: changePasswordDto.forceChange || false
      },
      performedBy: changePasswordDto.changedBy
    });

    this.logger.log(`Password changed successfully for user: ${changePasswordDto.userId}`);
  }

  // =====================================================================================
  // USER LIFECYCLE MANAGEMENT
  // =====================================================================================

  /**
   * Activate a user
   */
  async activateUser(userId: string, activatedBy: string): Promise<User> {
    this.logger.log(`Activating user: ${userId}`);

    const user = await this.findUserById(userId);
    user.activate();
    user.updatedBy = activatedBy;

    const updatedUser = await this.userRepository.save(user);

    await this.logUserActivity({
      userId,
      action: AuditAction.USER_ACTIVATED,
      details: { username: user.username },
      performedBy: activatedBy
    });

    this.logger.log(`User activated successfully: ${userId}`);
    return updatedUser;
  }

  /**
   * Suspend a user
   */
  async suspendUser(userId: string, reason: string, suspendedBy: string): Promise<User> {
    this.logger.log(`Suspending user: ${userId}`);

    const user = await this.findUserById(userId);
    user.suspend(reason);
    user.updatedBy = suspendedBy;

    const updatedUser = await this.userRepository.save(user);

    // Invalidate all user sessions
    await this.invalidateAllUserSessions(userId);

    await this.logUserActivity({
      userId,
      action: AuditAction.USER_SUSPENDED,
      details: { 
        username: user.username,
        reason 
      },
      performedBy: suspendedBy
    });

    this.logger.log(`User suspended successfully: ${userId}`);
    return updatedUser;
  }

  /**
   * Deactivate a user
   */
  async deactivateUser(userId: string, reason: string, deactivatedBy: string): Promise<User> {
    this.logger.log(`Deactivating user: ${userId}`);

    const user = await this.findUserById(userId);
    user.deactivate(reason);
    user.updatedBy = deactivatedBy;

    const updatedUser = await this.userRepository.save(user);

    // Invalidate all user sessions
    await this.invalidateAllUserSessions(userId);

    await this.logUserActivity({
      userId,
      action: AuditAction.USER_DEACTIVATED,
      details: { 
        username: user.username,
        reason 
      },
      performedBy: deactivatedBy
    });

    this.logger.log(`User deactivated successfully: ${userId}`);
    return updatedUser;
  }

  /**
   * Lock a user account
   */
  async lockUser(userId: string, durationMinutes: number, reason: string, lockedBy: string): Promise<User> {
    this.logger.log(`Locking user: ${userId}`);

    const user = await this.findUserById(userId);
    user.lock(durationMinutes, reason);
    user.updatedBy = lockedBy;

    const updatedUser = await this.userRepository.save(user);

    // Invalidate all user sessions
    await this.invalidateAllUserSessions(userId);

    await this.logUserActivity({
      userId,
      action: AuditAction.USER_LOCKED,
      details: { 
        username: user.username,
        durationMinutes,
        reason 
      },
      performedBy: lockedBy
    });

    this.logger.log(`User locked successfully: ${userId}`);
    return updatedUser;
  }

  /**
   * Unlock a user account
   */
  async unlockUser(userId: string, unlockedBy: string): Promise<User> {
    this.logger.log(`Unlocking user: ${userId}`);

    const user = await this.findUserById(userId);
    user.unlock();
    user.updatedBy = unlockedBy;

    const updatedUser = await this.userRepository.save(user);

    await this.logUserActivity({
      userId,
      action: AuditAction.USER_UNLOCKED,
      details: { username: user.username },
      performedBy: unlockedBy
    });

    this.logger.log(`User unlocked successfully: ${userId}`);
    return updatedUser;
  }

  // =====================================================================================
  // AUTHENTICATION AND SESSION MANAGEMENT
  // =====================================================================================

  /**
   * Authenticate user login
   */
  async login(loginDto: LoginDto): Promise<LoginResult> {
    this.logger.log(`Login attempt for user: ${loginDto.username} in tenant: ${loginDto.tenantId}`);

    try {
      // Find user
      const user = await this.userRepository.findOne({
        where: { 
          tenantId: loginDto.tenantId, 
          username: loginDto.username 
        },
        select: ['id', 'username', 'email', 'firstName', 'lastName', 'status', 'passwordHash', 'mfaEnabled', 'mfaSecret', 'loginAttempts', 'lockedUntil']
      });

      if (!user) {
        await this.logFailedLogin(loginDto.tenantId, loginDto.username, 'User not found', loginDto.ipAddress);
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if user can login
      if (!user.canLogin) {
        await this.logFailedLogin(loginDto.tenantId, loginDto.username, `User status: ${user.status}`, loginDto.ipAddress);
        return { success: false, error: 'Account is not accessible' };
      }

      // Verify password
      const isPasswordValid = await user.verifyPassword(loginDto.password);
      if (!isPasswordValid) {
        user.recordFailedLogin();
        await this.userRepository.save(user);
        
        await this.logFailedLogin(loginDto.tenantId, loginDto.username, 'Invalid password', loginDto.ipAddress);
        return { success: false, error: 'Invalid credentials' };
      }

      // Check MFA if enabled
      if (user.mfaEnabled) {
        if (!loginDto.mfaCode) {
          return { 
            success: false, 
            requiresMfa: true,
            error: 'MFA code required' 
          };
        }

        const isMfaValid = await this.verifyMfaCode(user, loginDto.mfaCode);
        if (!isMfaValid) {
          await this.logFailedLogin(loginDto.tenantId, loginDto.username, 'Invalid MFA code', loginDto.ipAddress);
          return { success: false, error: 'Invalid MFA code' };
        }
      }

      // Successful login
      user.recordSuccessfulLogin();
      await this.userRepository.save(user);

      // Create session
      const session = await this.createUserSession(user, loginDto.rememberMe, loginDto.ipAddress, loginDto.userAgent);

      // Generate tokens
      const accessToken = this.generateAccessToken(user, session.id);
      const refreshToken = this.generateRefreshToken(user, session.id);

      await this.logSuccessfulLogin(user, loginDto.ipAddress);

      this.logger.log(`Login successful for user: ${user.id}`);

      return {
        success: true,
        user,
        accessToken,
        refreshToken,
        sessionId: session.id
      };

    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      return { success: false, error: 'Login failed' };
    }
  }

  /**
   * Logout user
   */
  async logout(sessionId: string, userId: string): Promise<void> {
    this.logger.log(`Logging out user: ${userId}, session: ${sessionId}`);

    await this.invalidateSession(sessionId);

    await this.logUserActivity({
      userId,
      action: AuditAction.USER_LOGOUT,
      details: { sessionId },
      performedBy: userId
    });

    this.logger.log(`User logged out successfully: ${userId}`);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      const session = await this.sessionRepository.findOne({
        where: { id: payload.sessionId, isActive: true },
        relations: ['user']
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(session.user, session.id);
      const newRefreshToken = this.generateRefreshToken(session.user, session.id);

      // Update session
      session.lastActivity = new Date();
      await this.sessionRepository.save(session);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };

    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // =====================================================================================
  // USER RETRIEVAL AND SEARCH
  // =====================================================================================

  /**
   * Find user by ID
   */
  async findUserById(userId: string, includeRelations: boolean = false): Promise<User> {
    const relations = includeRelations ? ['roles', 'roles.role', 'sessions'] : [];
    
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations
    });

    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    return user;
  }

  /**
   * Find user by username within tenant
   */
  async findUserByUsername(tenantId: string, username: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { tenantId, username },
      relations: ['roles', 'roles.role']
    });

    if (!user) {
      throw new NotFoundException(`User not found: ${username}`);
    }

    return user;
  }

  /**
   * Search users with advanced filtering
   */
  async searchUsers(tenantId: string, criteria: ISearchCriteria): Promise<IApiResponse<{ users: User[]; pagination: IPagination }>> {
    try {
      const queryBuilder = this.userRepository.createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'roleAssignment')
        .leftJoinAndSelect('roleAssignment.role', 'role')
        .where('user.tenantId = :tenantId', { tenantId });

      // Apply filters
      if (criteria.filters) {
        if (criteria.filters.status) {
          queryBuilder.andWhere('user.status = :status', { status: criteria.filters.status });
        }
        if (criteria.filters.department) {
          queryBuilder.andWhere('user.department = :department', { department: criteria.filters.department });
        }
        if (criteria.filters.roleId) {
          queryBuilder.andWhere('role.id = :roleId', { roleId: criteria.filters.roleId });
        }
        if (criteria.filters.createdAfter) {
          queryBuilder.andWhere('user.createdDate >= :createdAfter', { createdAfter: criteria.filters.createdAfter });
        }
        if (criteria.filters.lastLoginAfter) {
          queryBuilder.andWhere('user.lastLogin >= :lastLoginAfter', { lastLoginAfter: criteria.filters.lastLoginAfter });
        }
      }

      // Apply search query
      if (criteria.query) {
        queryBuilder.andWhere(
          '(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.username ILIKE :query OR user.email ILIKE :query)',
          { query: `%${criteria.query}%` }
        );
      }

      // Apply sorting
      if (criteria.sorting && criteria.sorting.length > 0) {
        criteria.sorting.forEach((sort, index) => {
          const order = sort.direction.toUpperCase() as 'ASC' | 'DESC';
          if (index === 0) {
            queryBuilder.orderBy(`user.${sort.field}`, order);
          } else {
            queryBuilder.addOrderBy(`user.${sort.field}`, order);
          }
        });
      } else {
        queryBuilder.orderBy('user.createdDate', 'DESC');
      }

      // Apply pagination
      const page = criteria.pagination?.page || 1;
      const limit = criteria.pagination?.limit || 20;
      const offset = (page - 1) * limit;

      queryBuilder.skip(offset).take(limit);

      const [users, total] = await queryBuilder.getManyAndCount();

      const pagination: IPagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1
      };

      return {
        success: true,
        data: { users, pagination }
      };

    } catch (error) {
      this.logger.error(`Failed to search users: ${error.message}`, error.stack);
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search users',
          details: { originalError: error.message },
          timestamp: new Date(),
          requestId: 'generated-request-id'
        }
      };
    }
  }

  /**
   * Get users by tenant
   */
  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { tenantId },
      relations: ['roles', 'roles.role'],
      order: { createdDate: 'DESC' }
    });
  }

  /**
   * Get active users by tenant
   */
  async getActiveUsersByTenant(tenantId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { tenantId, status: UserStatus.ACTIVE },
      relations: ['roles', 'roles.role'],
      order: { lastLogin: 'DESC' }
    });
  }

  // =====================================================================================
  // BULK OPERATIONS
  // =====================================================================================

  /**
   * Perform bulk operations on users
   */
  async performBulkOperation(operation: BulkUserOperation): Promise<BulkOperationResult> {
    this.logger.log(`Performing bulk operation: ${operation.operation} on ${operation.userIds.length} users`);

    const result: BulkOperationResult = {
      successful: [],
      failed: [],
      summary: {
        total: operation.userIds.length,
        successful: 0,
        failed: 0
      }
    };

    for (const userId of operation.userIds) {
      try {
        switch (operation.operation) {
          case 'activate':
            await this.activateUser(userId, operation.operatedBy);
            break;
          case 'suspend':
            await this.suspendUser(userId, operation.reason || 'Bulk operation', operation.operatedBy);
            break;
          case 'deactivate':
            await this.deactivateUser(userId, operation.reason || 'Bulk operation', operation.operatedBy);
            break;
          case 'unlock':
            await this.unlockUser(userId, operation.operatedBy);
            break;
          case 'reset_password':
            await this.resetUserPassword(userId, operation.operatedBy);
            break;
        }

        result.successful.push(userId);
        result.summary.successful++;

      } catch (error) {
        result.failed.push({ userId, error: error.message });
        result.summary.failed++;
      }
    }

    this.logger.log(`Bulk operation completed: ${result.summary.successful} successful, ${result.summary.failed} failed`);
    return result;
  }

  // =====================================================================================
  // USER METRICS AND ANALYTICS
  // =====================================================================================

  /**
   * Get comprehensive user metrics for tenant
   */
  async getUserMetrics(tenantId: string): Promise<UserMetrics> {
    this.logger.log(`Generating user metrics for tenant: ${tenantId}`);

    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      deactivatedUsers,
      usersByDepartment,
      usersByRole,
      loginMetrics,
      securityMetrics
    ] = await Promise.all([
      this.userRepository.count({ where: { tenantId } }),
      this.userRepository.count({ where: { tenantId, status: UserStatus.ACTIVE } }),
      this.userRepository.count({ where: { tenantId, status: UserStatus.PENDING } }),
      this.userRepository.count({ where: { tenantId, status: UserStatus.SUSPENDED } }),
      this.userRepository.count({ where: { tenantId, status: UserStatus.DEACTIVATED } }),
      this.getUsersByDepartment(tenantId),
      this.getUsersByRole(tenantId),
      this.getLoginMetrics(tenantId),
      this.getSecurityMetrics(tenantId)
    ]);

    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      deactivatedUsers,
      usersByDepartment,
      usersByRole,
      loginMetrics,
      securityMetrics
    };
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  /**
   * Reset user password and send notification
   */
  private async resetUserPassword(userId: string, resetBy: string): Promise<void> {
    const user = await this.findUserById(userId);
    
    // Generate temporary password
    const tempPassword = this.generateTemporaryPassword();
    await user.setPassword(tempPassword);
    
    // Force password change on next login
    user.status = UserStatus.PASSWORD_EXPIRED;
    
    await this.userRepository.save(user);

    // Send password reset email
    await this.sendPasswordResetEmail(user, tempPassword);

    await this.logUserActivity({
      userId,
      action: AuditAction.PASSWORD_RESET,
      details: { username: user.username },
      performedBy: resetBy
    });
  }

  /**
   * Generate temporary password
   */
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Create user session
   */
  private async createUserSession(
    user: User, 
    rememberMe: boolean = false, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<UserSession> {
    const session = this.sessionRepository.create({
      userId: user.id,
      sessionToken: this.generateSessionToken(),
      ipAddress,
      userAgent,
      isActive: true,
      expiresAt: this.calculateSessionExpiry(rememberMe),
      lastActivity: new Date()
    });

    return this.sessionRepository.save(session);
  }

  /**
   * Generate session token
   */
  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Calculate session expiry
   */
  private calculateSessionExpiry(rememberMe: boolean): Date {
    const expiry = new Date();
    if (rememberMe) {
      expiry.setDate(expiry.getDate() + 30); // 30 days
    } else {
      expiry.setHours(expiry.getHours() + 8); // 8 hours
    }
    return expiry;
  }

  /**
   * Generate access token
   */
  private generateAccessToken(user: User, sessionId: string): string {
    const payload = {
      sub: user.id,
      username: user.username,
      tenantId: user.tenantId,
      sessionId,
      type: 'access'
    };

    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(user: User, sessionId: string): string {
    const payload = {
      sub: user.id,
      sessionId,
      type: 'refresh'
    };

    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  /**
   * Verify MFA code
   */
  private async verifyMfaCode(user: User, code: string): Promise<boolean> {
    // This would typically use a library like speakeasy to verify TOTP codes
    // For now, return true as a placeholder
    return true;
  }

  /**
   * Invalidate user session
   */
  private async invalidateSession(sessionId: string): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionId },
      { isActive: false, endedAt: new Date() }
    );
  }

  /**
   * Invalidate all user sessions
   */
  private async invalidateAllUserSessions(userId: string): Promise<void> {
    await this.sessionRepository.update(
      { userId, isActive: true },
      { isActive: false, endedAt: new Date() }
    );
  }

  /**
   * Send welcome email
   */
  private async sendWelcomeEmail(user: User): Promise<void> {
    // Implementation would integrate with email service
    this.logger.log(`Sending welcome email to: ${user.email}`);
  }

  /**
   * Send password reset email
   */
  private async sendPasswordResetEmail(user: User, tempPassword: string): Promise<void> {
    // Implementation would integrate with email service
    this.logger.log(`Sending password reset email to: ${user.email}`);
  }

  /**
   * Log user activity
   */
  private async logUserActivity(activityData: {
    userId: string;
    action: AuditAction;
    details: Record<string, any>;
    performedBy: string;
  }): Promise<void> {
    try {
      const activity = this.activityLogRepository.create({
        userId: activityData.userId,
        action: activityData.action,
        details: activityData.details,
        performedBy: activityData.performedBy,
        timestamp: new Date()
      });

      await this.activityLogRepository.save(activity);
    } catch (error) {
      this.logger.error(`Failed to log user activity: ${error.message}`, error.stack);
    }
  }

  /**
   * Log successful login
   */
  private async logSuccessfulLogin(user: User, ipAddress?: string): Promise<void> {
    await this.logUserActivity({
      userId: user.id,
      action: AuditAction.USER_LOGIN,
      details: {
        username: user.username,
        ipAddress,
        timestamp: new Date()
      },
      performedBy: user.id
    });
  }

  /**
   * Log failed login
   */
  private async logFailedLogin(tenantId: string, username: string, reason: string, ipAddress?: string): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        tenantId,
        action: AuditAction.USER_LOGIN_FAILED,
        resourceType: 'user',
        details: {
          username,
          reason,
          ipAddress,
          timestamp: new Date()
        },
        severity: Priority.MEDIUM,
        outcome: 'failure'
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(`Failed to log failed login: ${error.message}`, error.stack);
    }
  }

  /**
   * Get users by department
   */
  private async getUsersByDepartment(tenantId: string): Promise<Record<string, number>> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('user.department', 'department')
      .addSelect('COUNT(*)', 'count')
      .where('user.tenantId = :tenantId', { tenantId })
      .groupBy('user.department')
      .getRawMany();

    const distribution: Record<string, number> = {};
    result.forEach(row => {
      distribution[row.department || 'Unassigned'] = parseInt(row.count);
    });

    return distribution;
  }

  /**
   * Get users by role
   */
  private async getUsersByRole(tenantId: string): Promise<Record<string, number>> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'roleAssignment')
      .leftJoin('roleAssignment.role', 'role')
      .select('role.roleName', 'roleName')
      .addSelect('COUNT(DISTINCT user.id)', 'count')
      .where('user.tenantId = :tenantId', { tenantId })
      .andWhere('roleAssignment.isActive = true')
      .groupBy('role.roleName')
      .getRawMany();

    const distribution: Record<string, number> = {};
    result.forEach(row => {
      distribution[row.roleName || 'No Role'] = parseInt(row.count);
    });

    return distribution;
  }

  /**
   * Get login metrics
   */
  private async getLoginMetrics(tenantId: string): Promise<{
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionDuration: number;
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dailyActiveUsers, weeklyActiveUsers, monthlyActiveUsers] = await Promise.all([
      this.userRepository.count({
        where: { tenantId, lastLogin: MoreThan(oneDayAgo) }
      }),
      this.userRepository.count({
        where: { tenantId, lastLogin: MoreThan(oneWeekAgo) }
      }),
      this.userRepository.count({
        where: { tenantId, lastLogin: MoreThan(oneMonthAgo) }
      })
    ]);

    // Calculate average session duration (simplified)
    const averageSessionDuration = 45; // minutes - would calculate from actual session data

    return {
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      averageSessionDuration
    };
  }

  /**
   * Get security metrics
   */
  private async getSecurityMetrics(tenantId: string): Promise<{
    usersWithMfa: number;
    lockedAccounts: number;
    expiredPasswords: number;
    failedLoginAttempts: number;
  }> {
    const [usersWithMfa, lockedAccounts, expiredPasswords, failedLoginAttempts] = await Promise.all([
      this.userRepository.count({
        where: { tenantId, mfaEnabled: true }
      }),
      this.userRepository.count({
        where: { tenantId, status: UserStatus.LOCKED }
      }),
      this.userRepository.count({
        where: { tenantId, status: UserStatus.PASSWORD_EXPIRED }
      }),
      this.userRepository
        .createQueryBuilder('user')
        .select('SUM(user.loginAttempts)', 'total')
        .where('user.tenantId = :tenantId', { tenantId })
        .getRawOne()
        .then(result => parseInt(result.total) || 0)
    ]);

    return {
      usersWithMfa,
      lockedAccounts,
      expiredPasswords,
      failedLoginAttempts
    };
  }
}

