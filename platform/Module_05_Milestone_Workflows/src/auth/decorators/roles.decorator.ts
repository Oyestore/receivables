import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Roles Decorator
 * 
 * Specify required roles for route access
 * Usage: @Roles('admin', 'manager')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
