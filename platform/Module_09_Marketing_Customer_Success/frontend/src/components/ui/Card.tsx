import React from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

/**
 * Premium Card Component with Glassmorphism Effect
 */

interface CardProps {
    children: React.ReactNode;
    className?: string;
    glass?: boolean;
    hover?: boolean;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
    children,
    className,
    glass = false,
    hover = false,
    onClick,
}) => {
    return (
        <motion.div
            whileHover={hover ? { y: -4, scale: 1.02 } : undefined}
            transition={{ duration: 0.2 }}
            onClick={onClick}
            className={clsx(
                'rounded-lg p-6 shadow-md',
                glass ? 'glass glass-dark' : 'bg-card border border-border',
                hover && 'cursor-pointer hover:shadow-lg transition-shadow',
                className
            )}
        >
            {children}
        </motion.div>
    );
};

/**
 * Metric Card with Gradient and Icon
 */

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: {
        value: number;
        label: string;
    };
    icon?: React.ReactNode;
    gradient?: 'primary' | 'success' | 'warning' | 'danger';
    loading?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    change,
    icon,
    gradient = 'primary',
    loading = false,
}) => {
    const gradientClasses = {
        primary: 'gradient-primary',
        success: 'gradient-success',
        warning: 'gradient-warning',
        danger: 'gradient-danger',
    };

    return (
        <Card glass hover>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                        {title}
                    </p>
                    {loading ? (
                        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    ) : (
                        <motion.h3
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-bold text-foreground"
                        >
                            {value}
                        </motion.h3>
                    )}
                    {change && (
                        <div className="flex items-center mt-2 text-sm">
                            <span
                                className={clsx(
                                    'font-medium',
                                    change.value > 0 ? 'text-success' : 'text-danger'
                                )}
                            >
                                {change.value > 0 ? '↑' : '↓'} {Math.abs(change.value)}%
                            </span>
                            <span className="text-muted-foreground ml-2">{change.label}</span>
                        </div>
                    )}
                </div>
                {icon && (
                    <div className={clsx('p-3 rounded-lg', gradientClasses[gradient])}>
                        <div className="text-white">{icon}</div>
                    </div>
                )}
            </div>
        </Card>
    );
};

/**
 * Glass Card with Blur Effect
 */

export const GlassCard: React.FC<CardProps> = ({ children, className, ...props }) => {
    return <Card glass className={className} {...props}>{children}</Card>;
};
