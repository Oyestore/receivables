import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Shield,
    Plus,
    Users,
    Settings,
    Key,
    Activity,
    UserPlus,
    Filter,
    Search,
} from 'lucide-react';
import {
    DashboardHeader,
    StatCard,
    GradientCard,
    StatusBadge,
    Button,
} from '../../design-system';
import './AdministrationDashboard.css';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'user';
    status: 'active' | 'inactive';
    lastActive: string;
}

interface SystemSetting {
    category: string;
    setting: string;
    value: string | boolean;
    description: string;
}

export const AdministrationDashboard: React.FC = () => {
    const [users] = useState<User[]>([
        {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'admin',
            status: 'active',
            lastActive: '2025-01-14T14:30:00',
        },
        {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'manager',
            status: 'active',
            lastActive: '2025-01-14T10:15:00',
        },
        {
            id: '3',
            name: 'Mike Johnson',
            email: 'mike@example.com',
            role: 'user',
            status: 'active',
            lastActive: '2025-01-13T16:45:00',
        },
        {
            id: '4',
            name: 'Sarah Williams',
            email: 'sarah@example.com',
            role: 'user',
            status: 'inactive',
            lastActive: '2025-01-10T09:00:00',
        },
    ]);

    const [systemSettings] = useState<SystemSetting[]>([
        {
            category: 'Security',
            setting: 'Two-Factor Authentication',
            value: true,
            description: 'Require 2FA for all users',
        },
        {
            category: 'Notifications',
            setting: 'Email Notifications',
            value: true,
            description: 'Send email notifications',
        },
        {
            category: 'Payment',
            setting: 'Auto-reconciliation',
            value: true,
            description: 'Automatically reconcile payments',
        },
    ]);

    const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        admins: users.filter(u => u.role === 'admin').length,
        managers: users.filter(u => u.role === 'manager').length,
    };

    const getRoleBadge = (role: User['role']) => {
        switch (role) {
            case 'admin': return { label: 'Admin', status: 'error' as const };
            case 'manager': return { label: 'Manager', status: 'warning' as const };
            default: return { label: 'User', status: 'info' as const };
        }
    };

    return (
        <div className="admin-dashboard">
            <DashboardHeader
                title="Administration"
                subtitle="Manage users, roles, and system settings"
                icon={Shield}
                actions={
                    <>
                        <Button variant="outline" icon={Settings} size="md">
                            System Settings
                        </Button>
                        <Button variant="primary" icon={UserPlus} theme="ai" size="md">
                            Add User
                        </Button>
                    </>
                }
            />

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    value={stats.totalUsers}
                    label="Total Users"
                    icon={Users}
                    theme="ai"
                />
                <StatCard
                    value={stats.activeUsers}
                    label="Active Users"
                    icon={Activity}
                    theme="ai"
                />
                <StatCard
                    value={stats.admins}
                    label="Administrators"
                    icon={Shield}
                    theme="ai"
                />
                <StatCard
                    value={stats.managers}
                    label="Managers"
                    icon={Key}
                    theme="ai"
                />
            </div>

            {/* Users Management */}
            <GradientCard theme="ai" glass className="users-container">
                <div className="section-header">
                    <h3 className="section-title">User Management</h3>
                    <div className="search-box">
                        <Search className="search-icon" />
                        <input type="text" placeholder="Search users..." className="search-input" />
                    </div>
                </div>

                <div className="users-table">
                    <div className="table-header">
                        <div className="col-user">User</div>
                        <div className="col-email">Email</div>
                        <div className="col-role">Role</div>
                        <div className="col-status">Status</div>
                        <div className="col-activity">Last Active</div>
                        <div className="col-actions">Actions</div>
                    </div>

                    {users.map((user, index) => {
                        const roleBadge = getRoleBadge(user.role);

                        return (
                            <motion.div
                                key={user.id}
                                className="table-row"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="col-user">
                                    <div className="user-avatar">
                                        {user.name.charAt(0)}
                                    </div>
                                    <span className="user-name">{user.name}</span>
                                </div>
                                <div className="col-email">{user.email}</div>
                                <div className="col-role">
                                    <StatusBadge
                                        status={roleBadge.status}
                                        label={roleBadge.label}
                                        size="sm"
                                    />
                                </div>
                                <div className="col-status">
                                    <StatusBadge
                                        status={user.status === 'active' ? 'success' : 'pending'}
                                        label={user.status}
                                        size="sm"
                                    />
                                </div>
                                <div className="col-activity">
                                    {new Date(user.lastActive).toLocaleDateString()}
                                </div>
                                <div className="col-actions">
                                    <Button variant="ghost" size="sm">
                                        Edit
                                    </Button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </GradientCard>

            {/* System Settings */}
            <GradientCard theme="ai" glass className="settings-container">
                <h3 className="section-title">System Settings</h3>

                <div className="settings-grid">
                    {systemSettings.map((setting, index) => (
                        <motion.div
                            key={`${setting.category}-${setting.setting}`}
                            className="setting-item"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="setting-info">
                                <h4 className="setting-name">{setting.setting}</h4>
                                <p className="setting-description">{setting.description}</p>
                                <span className="setting-category">{setting.category}</span>
                            </div>
                            <div className="setting-control">
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={setting.value as boolean}
                                        readOnly
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </GradientCard>
        </div>
    );
};
