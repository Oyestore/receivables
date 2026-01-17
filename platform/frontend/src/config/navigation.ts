import { UserRole, NavigationItem } from '../types/auth.types';

// Role-based navigation configuration
export const getNavigationForRole = (role: UserRole): NavigationItem[] => {
    switch (role) {
        case UserRole.SME_OWNER:
            return [
                { path: '/dashboard', icon: 'dashboard', label: 'Cash Flow' },
                { path: '/invoices', icon: 'receipt', label: 'Invoices' },
                { path: '/autopilot', icon: 'autorenew', label: 'Collections' },
                { path: '/analytics', icon: 'analytics', label: 'Analytics' },
                { path: '/settings', icon: 'settings', label: 'Settings' },
            ];

        case UserRole.LEGAL_PARTNER:
            return [
                { path: '/legal/cases', icon: 'gavel', label: 'My Cases' },
                { path: '/legal/documents', icon: 'description', label: 'Documents' },
                { path: '/legal/clients', icon: 'people', label: 'Clients' },
                { path: '/legal/calendar', icon: 'event', label: 'Calendar' },
                { path: '/legal/profile', icon: 'person', label: 'Profile' },
            ];

        case UserRole.ACCOUNTANT:
            return [
                { path: '/accounting/dashboard', icon: 'account_balance', label: 'Dashboard' },
                { path: '/accounting/reconciliation', icon: 'compare_arrows', label: 'Reconcile' },
                { path: '/accounting/reports', icon: 'assessment', label: 'Reports' },
                { path: '/accounting/bulk', icon: 'upload', label: 'Bulk Upload' },
                { path: '/accounting/settings', icon: 'settings', label: 'Settings' },
            ];

        case UserRole.ADMIN:
            return [
                { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
                { path: '/admin/users', icon: 'supervisor_account', label: 'Users' },
                { path: '/admin/tenants', icon: 'business', label: 'Tenants' },
                { path: '/admin/system', icon: 'settings_applications', label: 'System' },
                { path: '/admin/logs', icon: 'list_alt', label: 'Logs' },
            ];

        case UserRole.VIEWER:
            return [
                { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
                { path: '/invoices', icon: 'receipt', label: 'Invoices' },
                { path: '/analytics', icon: 'analytics', label: 'Reports' },
            ];

        default:
            return [];
    }
};

// Get default route for role
export const getDefaultRouteForRole = (role: UserRole): string => {
    switch (role) {
        case UserRole.SME_OWNER:
            return '/dashboard';
        case UserRole.LEGAL_PARTNER:
            return '/legal/cases';
        case UserRole.ACCOUNTANT:
            return '/accounting/dashboard';
        case UserRole.ADMIN:
            return '/admin/dashboard';
        case UserRole.VIEWER:
            return '/dashboard';
        default:
            return '/';
    }
};

// Check if user has access to route
export const canAccessRoute = (userRole: UserRole, path: string): boolean => {
    const navigation = getNavigationForRole(userRole);
    return navigation.some(nav => path.startsWith(nav.path));
};
