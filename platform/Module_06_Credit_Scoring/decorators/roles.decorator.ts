import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Roles Decorator for RBAC
 * Usage: @Roles('admin', 'credit_manager')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
