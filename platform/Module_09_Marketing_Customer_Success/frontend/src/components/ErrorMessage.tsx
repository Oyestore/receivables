import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card } from './ui/Card';

/**
 * Error Message Component
 */

interface ErrorMessageProps {
    error: Error | { message: string };
    retry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, retry }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center min-h-[400px] p-6"
        >
            <Card className="max-w-md w-full bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
                <div className="flex flex-col items-center text-center p-6">
                    <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                        <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
                        Error Loading Data
                    </h3>
                    <p className="text-red-600 dark:text-red-400 mb-6">
                        {error?.message || 'An unexpected error occurred'}
                    </p>
                    {retry && (
                        <button
                            onClick={retry}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                        >
                            <RefreshCw size={16} />
                            Try Again
                        </button>
                    )}
                </div>
            </Card>
        </motion.div>
    );
};

/**
 * Inline Error Alert
 */

export const ErrorAlert: React.FC<{ message: string }> = ({ message }) => {
    return (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{message}</p>
            </div>
        </div>
    );
};
