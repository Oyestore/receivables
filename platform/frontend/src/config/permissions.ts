import { UserRole, UserPermissions } from '../types/auth.types';

// Default permissions for each role
export const rolePermissions: Record<UserRole, UserPermissions> = {
    [UserRole.SME_OWNER]: {
        invoice: { create: true, edit: true, delete: true, view: true },
        payment: { process: true, refund: true, view: true },
        autopilot: { start: true, stop: true, configure: true },
        analytics: { view: true, export: true },
        legal: { viewCases: true, generateDocuments: true, manageCases: false },
        admin: { users: false, tenants: false, system: false },
    },
    [UserRole.ACCOUNTANT]: {
        invoice: { create: true, edit: true, delete: false, view: true },
        payment: { process: true, refund: false, view: true },
        autopilot: { start: false, stop: false, configure: false },
        analytics: { view: true, export: true },
        legal: { viewCases: false, generateDocuments: false, manageCases: false },
        admin: { users: false, tenants: false, system: false },
    },
    [UserRole.LEGAL_PARTNER]: {
        invoice: { create: false, edit: false, delete: false, view: true },
        payment: { process: false, refund: false, view: true },
        autopilot: { start: false, stop: false, configure: false },
        analytics: { view: false, export: false },
        legal: { viewCases: true, generateDocuments: true, manageCases: true },
        admin: { users: false, tenants: false, system: false },
    },
    [UserRole.ADMIN]: {
        invoice: { create: true, edit: true, delete: true, view: true },
        payment: { process: true, refund: true, view: true },
        autopilot: { start: true, stop: true, configure: true },
        analytics: { view: true, export: true },
        legal: { viewCases: true, generateDocuments: true, manageCases: true },
        admin: { users: true, tenants: true, system: true },
    },
    [UserRole.VIEWER]: {
        invoice: { create: false, edit: false, delete: false, view: true },
        payment: { process: false, refund: false, view: true },
        autopilot: { start: false, stop: false, configure: false },
        analytics: { view: true, export: false },
        legal: { viewCases: false, generateDocuments: false, manageCases: false },
        admin: { users: false, tenants: false, system: false },
    },
};

// Check if user has specific permission
export const hasPermission = (
    userPermissions: UserPermissions,
    module: keyof UserPermissions,
    action: string,
): boolean => {
    return (userPermissions[module] as any)?.[action] || false;
};

// Get permissions for a role
export const getPermissionsForRole = (role: UserRole): UserPermissions => {
    return rolePermissions[role];
};
