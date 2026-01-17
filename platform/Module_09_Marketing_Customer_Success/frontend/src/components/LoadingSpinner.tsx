import React from 'react';
import { motion } from 'framer-motion';

/**
 * Loading Spinner Component
 */

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
    const sizes = {
        sm: 'h-8 w-8',
        md: 'h-16 w-16',
        lg: 'h-32 w-32',
    };

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className={`animate-spin rounded-full border-4 border-primary border-t-transparent ${sizes[size]}`} />
        </div>
    );
};

/**
 * Full Page Loading
 */

export const PageLoading: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div className="animate-spin rounded-full h-32 w-32 border-4 border-primary border-t-transparent" />
            </motion.div>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-6 text-lg font-medium text-muted-foreground"
            >
                Loading...
            </motion.p>
        </div>
    );
};

/**
 * Skeleton Loader for Cards
 */

export const SkeletonCard: React.FC = () => {
    return (
        <div className="p-6 bg-card rounded-lg border border-border animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>
    );
};
