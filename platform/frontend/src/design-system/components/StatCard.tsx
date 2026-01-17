import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { moduleThemes } from '../theme';
import './StatCard.css';

export interface StatCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
    /**
     * Stat value (number or string)
     */
    value: string | number;

    /**
     * Stat label/description
     */
    label: string;

    /**
     * Icon from lucide-react
     */
    icon: LucideIcon;

    /**
     * Theme category for colors
     */
    theme?: keyof typeof moduleThemes;

    /**
     * Show trend indicator
     */
    trend?: {
        value: number;
        direction: 'up' | 'down';
    };

    /**
     * Click handler
     */
    onClick?: () => void;

    /**
     * Additional CSS class
     */
    className?: string;
}

/**
 * StatCard Component
 * 
 * Displays a key metric with icon, value, and label
 * Consistent design across all dashboard modules
 * 
 * @example
 * ```tsx
 * <StatCard
 *   value="245"
 *   label="Total Invoices"
 *   icon={FileText}
 *   theme="invoicing"
 *   trend={{ value: 12, direction: 'up' }}
 * />
 * ```
 */
export const StatCard: React.FC<StatCardProps> = ({
    value,
    label,
    icon: Icon,
    theme = 'ai',
    trend,
    onClick,
    className = '',
    ...motionProps
}) => {
    const themeColors = moduleThemes[theme] || moduleThemes.ai;

    const cardClasses = [
        'stat-card',
        onClick && 'stat-card-clickable',
        className,
    ].filter(Boolean).join(' ');

    return (
        <motion.div
            className={cardClasses}
            onClick={onClick}
            whileHover={onClick ? { scale: 1.02, y: -4 } : { y: -2 }}
            whileTap={onClick ? { scale: 0.98 } : undefined}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            {...motionProps}
        >
            <div className="stat-card-content">
                <div
                    className="stat-icon-wrapper"
                    style={{ background: themeColors.gradient }}
                >
                    <Icon className="stat-icon" />
                </div>

                <div className="stat-info">
                    <div className="stat-value">{value}</div>
                    <div className="stat-label">{label}</div>

                    {trend && (
                        <div className={`stat-trend trend-${trend.direction}`}>
                            <span className="trend-arrow">
                                {trend.direction === 'up' ? '↑' : '↓'}
                            </span>
                            <span className="trend-value">{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
