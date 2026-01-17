import React from 'react';
import { LucideIcon } from 'lucide-react';
import { CheckCircle2, Clock, AlertCircle, XCircle, Info, TrendingUp } from 'lucide-react';
import './StatusBadge.css';

export type StatusType = 'success' | 'pending' | 'warning' | 'error' | 'info' | 'active';

export interface StatusBadgeProps {
    /**
     * Status type (determines color and icon)
     */
    status: StatusType;

    /**
     * Text to display (optional, uses status if not provided)
     */
    label?: string;

    /**
     * Custom icon (overrides default status icon)
     */
    icon?: React.ReactNode;

    /**
     * Size variant
     */
    size?: 'sm' | 'md' | 'lg';

    /**
     * Show icon
     */
    showIcon?: boolean;

    /**
     * Additional CSS class
     */
    className?: string;
}

const statusConfig: Record<StatusType, { color: string; icon: LucideIcon; defaultLabel: string }> = {
    success: {
        color: 'status-success',
        icon: CheckCircle2,
        defaultLabel: 'Success',
    },
    pending: {
        color: 'status-pending',
        icon: Clock,
        defaultLabel: 'Pending',
    },
    warning: {
        color: 'status-warning',
        icon: AlertCircle,
        defaultLabel: 'Warning',
    },
    error: {
        color: 'status-error',
        icon: XCircle,
        defaultLabel: 'Error',
    },
    info: {
        color: 'status-info',
        icon: Info,
        defaultLabel: 'Info',
    },
    active: {
        color: 'status-active',
        icon: TrendingUp,
        defaultLabel: 'Active',
    },
};

/**
 * StatusBadge Component
 * 
 * Displays status with consistent color-coding and icons
 * Used for order status, payment status, workflow status, etc.
 * 
 * @example
 * ```tsx
 * <StatusBadge status="success" label="Completed" />
 * <StatusBadge status="pending" showIcon />
 * ```
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    label,
    icon,
    size = 'md',
    showIcon = true,
    className = '',
}) => {
    const config = statusConfig[status];
    const displayLabel = label || config.defaultLabel;

    const badgeClasses = [
        'status-badge',
        config.color,
        `status-badge-${size}`,
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={badgeClasses}>
            {showIcon && (
                icon ? (
                    <span className="status-badge-icon">{icon}</span>
                ) : (
                    <config.icon className="status-badge-icon" />
                )
            )}
            <span className="status-badge-label">{displayLabel}</span>
        </div>
    );
};
