import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

/**
 * Health Gauge Component with Circular Progress
 */

interface HealthGaugeProps {
    score: number;              // 0-100
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    animated?: boolean;
}

export const HealthGauge: React.FC<HealthGaugeProps> = ({
    score,
    size = 'md',
    showLabel = true,
    animated = true,
}) => {
    const sizes = {
        sm: { width: 80, strokeWidth: 8 },
        md: { width: 120, strokeWidth: 10 },
        lg: { width: 160, strokeWidth: 12 },
    };

    const { width, strokeWidth } = sizes[size];
    const radius = (width - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    // Determine color based on score
    const getColor = (score: number) => {
        if (score >= 80) return '#22c55e'; // Green
        if (score >= 60) return '#3b82f6'; // Blue
        if (score >= 40) return '#f59e0b'; // Amber
        return '#ef4444'; // Red
    };

    const color = getColor(score);

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width, height: width }}>
                <svg width={width} height={width} className="transform -rotate-90">
                    {/* Background circle */}
                    <circle
                        cx={width / 2}
                        cy={width / 2}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-gray-200 dark:text-gray-700"
                    />
                    {/* Progress circle */}
                    <motion.circle
                        cx={width / 2}
                        cy={width / 2}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: animated ? offset : offset }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{
                            filter: `drop-shadow(0 0 8px ${color}40)`,
                        }}
                    />
                </svg>
                {/* Score text */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-center"
                    >
                        <div className={clsx(
                            'font-bold',
                            size === 'sm' && 'text-2xl',
                            size === 'md' && 'text-3xl',
                            size === 'lg' && 'text-4xl',
                        )} style={{ color }}>
                            {Math.round(score)}
                        </div>
                        {showLabel && (
                            <div className="text-xs text-muted-foreground mt-1">
                                Health Score
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

/**
 * Linear Health Bar
 */

interface HealthBarProps {
    score: number;
    label?: string;
    height?: number;
    showPercentage?: boolean;
}

export const HealthBar: React.FC<HealthBarProps> = ({
    score,
    label,
    height = 8,
    showPercentage = true,
}) => {
    const getColor = (score: number) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 60) return 'bg-blue-500';
        if (score >= 40) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="w-full">
            {(label || showPercentage) && (
                <div className="flex justify-between items-center mb-2">
                    {label && <span className="text-sm font-medium">{label}</span>}
                    {showPercentage && (
                        <span className="text-sm text-muted-foreground">
                            {Math.round(score)}%
                        </span>
                    )}
                </div>
            )}
            <div
                className="w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                style={{ height }}
            >
                <motion.div
                    className={clsx('h-full rounded-full', getColor(score))}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
            </div>
        </div>
    );
};
