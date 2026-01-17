import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { moduleThemes } from '../theme';
import './Button.css';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    /**
     * Button content
     */
    children: React.ReactNode;

    /**
     * Button variant
     */
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

    /**
     * Size variant
     */
    size?: 'sm' | 'md' | 'lg';

    /**
     * Icon from lucide-react (left side)
     */
    icon?: LucideIcon;

    /**
     * Icon from lucide-react (right side)
     */
    iconRight?: LucideIcon;

    /**
     * Loading state
     */
    loading?: boolean;

    /**
     * Disabled state
     */
    disabled?: boolean;

    /**
     * Full width button
     */
    fullWidth?: boolean;

    /**
     * Theme for primary variant
     */
    theme?: keyof typeof moduleThemes;

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
 * Button Component
 * 
 * Reusable button with variants, sizes, and animations
 * Consistent across all modules
 * 
 * @example
 * ```tsx
 * <Button variant="primary" icon={Plus} theme="invoicing">
 *   Create Invoice
 * </Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    loading = false,
    disabled = false,
    fullWidth = false,
    theme = 'ai',
    onClick,
    className = '',
    ...motionProps
}) => {
    const themeColors = moduleThemes[theme] || moduleThemes.ai;

    const buttonClasses = [
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        fullWidth && 'btn-full-width',
        loading && 'btn-loading',
        className,
    ].filter(Boolean).join(' ');

    const buttonStyle: React.CSSProperties = variant === 'primary'
        ? { background: themeColors.gradient }
        : {};

    return (
        <motion.button
            className={buttonClasses}
            style={buttonStyle}
            onClick={onClick}
            disabled={disabled || loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            {...motionProps}
        >
            {loading && (
                <span className="btn-spinner" />
            )}
            {!loading && Icon && <Icon className="btn-icon" />}
            <span className="btn-text">{children}</span>
            {!loading && IconRight && <IconRight className="btn-icon" />}
        </motion.button>
    );
};
