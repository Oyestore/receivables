import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { moduleThemes } from '../theme';
import './GradientCard.css';

export interface GradientCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
    /**
     * Theme category for gradient color
     */
    theme?: keyof typeof moduleThemes;

    /**
     * Card content
     */
    children: React.ReactNode;

    /**
     * Custom gradient (overrides theme)
     */
    gradient?: string;

    /**
     * Enable glassmorphism effect
     */
    glass?: boolean;

    /**
     * Enable hover lift effect
     */
    hoverable?: boolean;

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
 * GradientCard Component
 * 
 * Reusable card with gradient background and glassmorphism
 * Used across all dashboard modules for consistent styling
 * 
 * @example
 * ```tsx
 * <GradientCard theme="invoicing" hoverable>
 *   <h3>Invoice Stats</h3>
 * </GradientCard>
 * ```
 */
export const GradientCard: React.FC<GradientCardProps> = ({
    theme = 'ai',
    children,
    gradient,
    glass = false,
    hoverable = false,
    onClick,
    className = '',
    ...motionProps
}) => {
    const cardGradient = gradient || moduleThemes[theme]?.gradient || moduleThemes.ai.gradient;

    const cardStyle: React.CSSProperties = {
        background: glass ? 'rgba(255, 255, 255, 0.95)' : cardGradient,
        backdropFilter: glass ? 'blur(20px)' : undefined,
    };

    const cardClasses = [
        'gradient-card',
        glass && 'gradient-card-glass',
        hoverable && 'gradient-card-hoverable',
        onClick && 'gradient-card-clickable',
        className,
    ].filter(Boolean).join(' ');

    return (
        <motion.div
            className={cardClasses}
            style={cardStyle}
            onClick={onClick}
            whileHover={hoverable ? { scale: 1.02, y: -4 } : undefined}
            whileTap={onClick ? { scale: 0.98 } : undefined}
            {...motionProps}
        >
            {children}
        </motion.div>
    );
};
