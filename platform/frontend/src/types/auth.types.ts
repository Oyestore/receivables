// Role-based routing and authentication types
export enum UserRole {
    SME_OWNER = 'sme_owner',
    ACCOUNTANT = 'accountant',
    LEGAL_PARTNER = 'legal_partner',
    ADMIN = 'admin',
    VIEWER = 'viewer',
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenantId?: string;
    permissions: string[];
    avatar?: string;
    mobile?: string;
    lastLogin?: Date;
    isActive?: boolean;
}

export interface UserPermissions {
    invoice: {
        create: boolean;
        edit: boolean;
        delete: boolean;
        view: boolean;
    };
    payment: {
        process: boolean;
        refund: boolean;
        view: boolean;
    };
    autopilot: {
        start: boolean;
        stop: boolean;
        configure: boolean;
    };
    analytics: {
        view: boolean;
        export: boolean;
    };
    legal: {
        viewCases: boolean;
        generateDocuments: boolean;
        manageCases: boolean;
    };
    admin: {
        users: boolean;
        tenants: boolean;
        system: boolean;
    };
}

export interface RouteConfig {
    path: string;
    icon: string;
    label: string;
    roles: UserRole[];
    exact?: boolean;
    component?: React.ComponentType;
}

export interface NavigationItem {
    path: string;
    icon: string;
    label: string;
    badge?: number;
}
