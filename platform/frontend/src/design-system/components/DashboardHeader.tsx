import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import './DashboardHeader.css';

export interface DashboardHeaderProps {
    /**
     * Page title
     */
    title: string;

    /**
     * Subtitle/description
     */
    subtitle?: string;

    /**
     * Icon from lucide-react
     */
    icon?: LucideIcon;

    /**
     * Action buttons (right side)
     */
    actions?: React.ReactNode;

    /**
     * Additional content (below title/subtitle)
     */
    children?: React.ReactNode;

    /**
     * Additional CSS class
     */
    className?: string;
}

/**
 * DashboardHeader Component
 * 
 * Consistent header for all dashboard pages
 * Displays title, subtitle, icon, and action buttons
 * 
 * @example
 * ```tsx
 * <DashboardHeader
 *   title="Invoices"
 *   subtitle="Manage your invoices"
 *   icon={FileText}
 *   actions={<Button>Create New</Button>}
 * />
 * ```
 */
export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    title,
    subtitle,
    icon: Icon,
    actions,
    children,
    className = '',
}) => {
    const headerClasses = ['dashboard-header', className].filter(Boolean).join(' ');

    return (
        <motion.div
            className={headerClasses}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="dashboard-header-content">
                <div className="title-section">
                    {Icon && (
                        <motion.div
                            className="header-icon-wrapper"
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                            <Icon className="header-icon" />
                        </motion.div>
                    )}
                    <div className="text-section">
                        <h1 className="header-title">{title}</h1>
                        {subtitle && <p className="header-subtitle">{subtitle}</p>}
                    </div>
                </div>

                {actions && (
                    <div className="actions-section">
                        {actions}
                    </div>
                )}
            </div>

            {children && (
                <div className="header-extra">
                    {children}
                </div>
            )}
        </motion.div>
    );
};
