import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

/**
 * Badge Component for Status Indicators
 */

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md' | 'lg';
    pulse?: boolean;
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'md',
    pulse = false,
    className,
}) => {
    const variantClasses = {
        default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
        success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-sm',
        lg: 'px-3 py-1.5 text-base',
    };

    return (
        <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={clsx(
                'inline-flex items-center font-medium rounded-full',
                variantClasses[variant],
                sizeClasses[size],
                pulse && 'animate-pulse-slow',
                className
            )}
        >
            {children}
        </motion.span>
    );
};

/**
 * Risk Level Badge with Color Coding
 */

interface RiskBadgeProps {
    level: 'critical' | 'high' | 'medium' | 'low';
    showLabel?: boolean;
    pulse?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
    level,
    showLabel = true,
    pulse = false,
}) => {
    const config = {
        critical: { variant: 'danger' as const, label: 'Critical Risk', icon: '🔴' },
        high: { variant: 'warning' as const, label: 'High Risk', icon: '🟠' },
        medium: { variant: 'info' as const, label: 'Medium Risk', icon: '🟡' },
        low: { variant: 'success' as const, label: 'Low Risk', icon: '🟢' },
    };

    const { variant, label, icon } = config[level];

    return (
        <Badge variant={variant} pulse={pulse && (level === 'critical' || level === 'high')}>
            <span className="mr-1">{icon}</span>
            {showLabel && label}
        </Badge>
    );
};

/**
 * Status Badge for Workflows/Playbooks
 */

interface StatusBadgeProps {
    status: 'active' | 'paused' | 'completed' | 'failed';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const config = {
        active: { variant: 'success' as const, label: 'Active', icon: '●' },
        paused: { variant: 'warning' as const, label: 'Paused', icon: '⏸' },
        completed: { variant: 'info' as const, label: 'Completed', icon: '✓' },
        failed: { variant: 'danger' as const, label: 'Failed', icon: '✕' },
    };

    const { variant, label, icon } = config[status];

    return (
        <Badge variant={variant}>
            <span className="mr-1">{icon}</span>
            {label}
        </Badge>
    );
};
