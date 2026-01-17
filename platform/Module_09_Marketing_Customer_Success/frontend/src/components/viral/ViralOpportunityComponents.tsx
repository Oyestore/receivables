import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, TrendingUp, Share2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn } from '@/lib/utils';

/**
 * Viral Opportunity Toast Notification
 * 
 * Contextual prompts that appear at magic moments to drive viral actions
 */

interface ViralOpportunityToastProps {
    opportunity: {
        id: string;
        type: string;
        trigger: string;
        title: string;
        message: string;
        ctaText: string;
        socialProof?: string;
        incentiveAmount?: string;
        viralScore: number;
    };
    onAccept: () => void;
    onDismiss: () => void;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const ViralOpportunityToast: React.FC<ViralOpportunityToastProps> = ({
    opportunity,
    onAccept,
    onDismiss,
    position = 'top-right',
}) => {
    const positionClasses = {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className={cn('fixed z-50 w-96', positionClasses[position])}
        >
            <Card className="glass relative overflow-hidden border-2 border-primary-300 shadow-glow">
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-100/50 to-purple-100/50 dark:from-primary-900/20 dark:to-purple-900/20" />

                {/* Sparkle effect */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="absolute -top-2 -right-2"
                >
                    <Sparkles className="text-primary-500 w-6 h-6" />
                </motion.div>

                {/* Close button */}
                <button
                    onClick={onDismiss}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="relative space-y-3">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                            <Share2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-foreground">{opportunity.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                                {opportunity.message}
                            </p>
                        </div>
                    </div>

                    {/* Social proof or incentive */}
                    {(opportunity.socialProof || opportunity.incentiveAmount) && (
                        <div className="flex items-center gap-2 text-sm">
                            {opportunity.socialProof && (
                                <Badge variant="success" size="sm">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    {opportunity.socialProof}
                                </Badge>
                            )}
                            {opportunity.incentiveAmount && (
                                <Badge variant="warning" size="sm">
                                    🎁 {opportunity.incentiveAmount}
                                </Badge>
                            )}
                        </div>
                    )}

                    {/* CTA Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onAccept}
                        className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                        {opportunity.ctaText} →
                    </motion.button>
                </div>
            </Card>
        </motion.div>
    );
};

/**
 * Viral Opportunity Banner
 * 
 * Inline banner for less urgent viral opportunities
 */

interface ViralBannerProps {
    opportunity: {
        title: string;
        message: string;
        ctaText: string;
        icon?: React.ReactNode;
    };
    onAccept: () => void;
    onDismiss: () => void;
}

export const ViralOpportunityBanner: React.FC<ViralBannerProps> = ({
    opportunity,
    onAccept,
    onDismiss,
}) => {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 p-4"
            >
                {/* Animated shimmer effect */}
                <motion.div
                    animate={{
                        x: ['-100%', '200%'],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                />

                <div className="relative flex items-center gap-4">
                    {opportunity.icon && (
                        <div className="p-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                            {opportunity.icon}
                        </div>
                    )}

                    <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{opportunity.title}</h4>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {opportunity.message}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onDismiss}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Maybe Later
                        </button>
                        <button
                            onClick={onAccept}
                            className="px-6 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all"
                        >
                            {opportunity.ctaText}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

/**
 * Success Celebration Modal (shown after viral action)
 */

interface SuccessCelebrationProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
    reward?: string;
}

export const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({
    isOpen,
    onClose,
    message,
    reward,
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', duration: 0.5 }}
                    className="bg-card rounded-2xl p-8 max-w-md text-center shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Confetti animation */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.2, 1] }}
                        transition={{ duration: 0.6 }}
                        className="text-6xl mb-4"
                    >
                        🎉
                    </motion.div>

                    <h2 className="text-2xl font-bold text-gradient mb-2">Awesome!</h2>
                    <p className="text-muted-foreground mb-6">{message}</p>

                    {reward && (
                        <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                            <p className="text-sm text-muted-foreground">You've earned</p>
                            <p className="text-2xl font-bold text-gradient mt-1">{reward}</p>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-gradient-primary text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                        Continue
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
