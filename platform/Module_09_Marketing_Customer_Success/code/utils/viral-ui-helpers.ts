/**
 * Viral Workflow UI Integration Helpers
 * 
 * Frontend integration utilities for embedding viral mechanics into UI
 * Completes Phase 9.5 by providing ready-to-use UI components and hooks
 */

export interface ViralUIConfig {
    enabled: boolean;
    position: 'inline' | 'modal' | 'toast' | 'sidebar';
    theme: 'default' | 'celebration' | 'subtle' | 'urgent';
    autoShow: boolean;
    dismissible: boolean;
}

export interface ViralOpportunityUI {
    id: string;
    type: string;
    trigger: string;

    // Display configuration
    title: string;
    message: string;
    ctaText: string;
    ctaIcon?: string;

    // Visual elements
    socialProof?: string;
    incentiveAmount?: string;
    successStories?: string[];

    // Behavior
    priority: 'high' | 'medium' | 'low';
    expiresAt?: Date;

    // Actions
    primaryAction: {
        label: string;
        endpoint: string;
        method: 'POST' | 'GET';
        payload?: Record<string, any>;
    };
    secondaryAction?: {
        label: string;
        action: 'dismiss' | 'remind_later' | 'never_show';
    };
}

/**
 * Format viral opportunity for display
 */
export function formatViralOpportunity(
    opportunity: any,
): ViralOpportunityUI {
    const templates = {
        NEW_CUSTOMER_INVOICE: {
            title: '🎯 Invite Customer to Platform',
            message: `Send {customerName} an invite! Based on {socialProof} similar invites, {conversionRate}% accept and pay {daysFaster} days faster.`,
            ctaText: 'Send Invite + Invoice',
            ctaIcon: '✉️',
        },
        INVOICE_PAID_EARLY: {
            title: '🎉 Great News! Early Payment',
            message: `{customerName} paid {daysEarly} days early! Share your success story and help others achieve similar results.`,
            ctaText: 'Share Success Story',
            ctaIcon: '📢',
        },
        HIGH_VALUE_PAYMENT: {
            title: '💰 High-Value Payment Received',
            message: `Congratulations on your ${opportunity.metadata?.amount} payment! Refer similar businesses and earn up to ${opportunity.incentiveAmount}.`,
            ctaText: 'Refer & Earn',
            ctaIcon: '🎁',
        },
        FIRST_PAYMENT_RECEIVED: {
            title: '🎊 First Payment Success!',
            message: 'Celebrate your first payment! Share your experience and help others get started.',
            ctaText: 'Share Experience',
            ctaIcon: '🌟',
        },
        DISPUTE_RESOLVED_QUICKLY: {
            title: '⚡ Quick Resolution Win',
            message: `Dispute resolved in ${opportunity.metadata?.resolutionTime} hours! Your resolution template could help others.`,
            ctaText: 'Share Template',
            ctaIcon: '📋',
        },
        MILESTONE_ACHIEVED: {
            title: '🏆 Milestone Achieved!',
            message: `You've reached ${opportunity.metadata?.milestoneType}! Invite colleagues to celebrate and grow together.`,
            ctaText: 'Invite Team',
            ctaIcon: '👥',
        },
    };

    const template = templates[opportunity.trigger] || {
        title: 'Share Your Success',
        message: 'Help others achieve similar results',
        ctaText: 'Share Now',
        ctaIcon: '🚀',
    };

    // Replace placeholders
    let message = template.message;
    if (opportunity.metadata) {
        Object.keys(opportunity.metadata).forEach(key => {
            message = message.replace(`{${key}}`, opportunity.metadata[key]);
        });
    }

    return {
        id: opportunity.id,
        type: opportunity.type,
        trigger: opportunity.trigger,
        title: template.title,
        message,
        ctaText: template.ctaText,
        ctaIcon: template.ctaIcon,
        socialProof: opportunity.socialProof,
        incentiveAmount: opportunity.incentiveAmount,
        successStories: opportunity.successStories,
        priority: opportunity.viralScore > 80 ? 'high' : opportunity.viralScore > 50 ? 'medium' : 'low',
        expiresAt: opportunity.expiresAt,
        primaryAction: {
            label: template.ctaText,
            endpoint: `/api/v1/viral/opportunities/${opportunity.id}/accept`,
            method: 'POST',
            payload: { opportunityId: opportunity.id },
        },
        secondaryAction: {
            label: 'Maybe Later',
            action: 'remind_later',
        },
    };
}

/**
 * React Hook for viral opportunities (example)
 */
export const useViralOpportunities = (config: ViralUIConfig = {
    enabled: true,
    position: 'toast',
    theme: 'celebration',
    autoShow: true,
    dismissible: true,
}) => {
    // Example hook structure (would integrate with React/Vue/Angular)
    return {
        opportunities: [],
        activeOpportunity: null,
        showOpportunity: (id: string) => { },
        dismissOpportunity: (id: string) => { },
        acceptOpportunity: async (id: string) => { },
        config,
    };
};

/**
 * Generate sharing content for different platforms
 */
export function generateSocialShare(
    platform: 'linkedin' | 'twitter' | 'facebook' | 'email',
    opportunityType: string,
    metadata: Record<string, any>,
): {
    subject?: string;
    message: string;
    hashtags?: string[];
    url: string;
} {
    const baseUrl = 'https://platform.com';
    const shareUrl = `${baseUrl}/join?ref=${metadata.userId}`;

    const templates = {
        linkedin: {
            FIRST_PAYMENT_RECEIVED: {
                message: `🎉 Excited to share that I just received my first payment through this amazing receivables platform! The automation features have saved me countless hours. If you're struggling with late payments, you should definitely check it out: ${shareUrl}`,
                hashtags: ['Finance', 'BusinessAutomation', 'Fintech'],
            },
            HIGH_VALUE_PAYMENT: {
                message: `💰 Just processed a high-value payment seamlessly! This platform has transformed how we manage receivables. Highly recommend for growing businesses: ${shareUrl}`,
                hashtags: ['BusinessGrowth', 'Finance', 'Automation'],
            },
        },
        twitter: {
            FIRST_PAYMENT_RECEIVED: {
                message: `🎊 First payment received! This receivables platform is a game-changer for managing cash flow. Check it out: ${shareUrl}`,
                hashtags: ['Fintech', 'SmallBusiness'],
            },
            HIGH_VALUE_PAYMENT: {
                message: `💸 Big win today! Processed high-value payment with zero friction. Love this platform: ${shareUrl}`,
                hashtags: ['BusinessSuccess', 'Fintech'],
            },
        },
        facebook: {
            FIRST_PAYMENT_RECEIVED: {
                message: `I'm so excited! Just got my first payment through this new receivables management platform. If you run a business and deal with invoices, you need to try this: ${shareUrl}`,
                hashtags: [],
            },
        },
        email: {
            FIRST_PAYMENT_RECEIVED: {
                subject: 'You should check out this receivables platform!',
                message: `Hi!\n\nI wanted to share something that's been incredibly helpful for my business. I just received my first payment through this receivables management platform, and it's been a game-changer.\n\nThe automation features have saved me so much time, and the payment tracking is fantastic. I thought you might find it useful too!\n\nCheck it out here: ${shareUrl}\n\nLet me know what you think!`,
                hashtags: [],
            },
        },
    };

    const template = templates[platform]?.[opportunityType] || {
        message: `Check out this amazing platform: ${shareUrl}`,
        hashtags: [],
    };

    return {
        ...template,
        url: shareUrl,
    };
}

/**
 * Viral UI Component Props (for frontend frameworks)
 */
export interface ViralInviteBannerProps {
    opportunity: ViralOpportunityUI;
    onAccept: () => void;
    onDismiss: () => void;
    theme?: 'default' | 'celebration' | 'subtle';
}

export interface ViralIncentiveDisplayProps {
    amount: string;
    currency?: string;
    description: string;
    highlighted?: boolean;
}

/**
 * Track viral UI interactions
 */
export async function trackViralUIEvent(
    eventType: 'shown' | 'clicked' | 'dismissed' | 'shared',
    opportunityId: string,
    metadata?: Record<string, any>,
): Promise<void> {
    // In production: Send to analytics
    const event = {
        type: `viral_ui_${eventType}`,
        opportunityId,
        timestamp: new Date(),
        ...metadata,
    };

    // POST to analytics endpoint
    try {
        await fetch('/api/v1/analytics/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
        });
    } catch (error) {
        console.error('Failed to track viral UI event:', error);
    }
}

/**
 * A/B Testing configuration for viral UI
 */
export interface ViralUIVariant {
    id: string;
    name: string;
    config: ViralUIConfig;
    messageTemplate: string;
    ctaText: string;
    theme: string;
}

export function selectViralUIVariant(
    userId: string,
    variants: ViralUIVariant[],
): ViralUIVariant {
    // Simple hash-based variant selection
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = hash % variants.length;
    return variants[index];
}

/**
 * Export all helpers
 */
export const ViralUIHelpers = {
    formatViralOpportunity,
    generateSocialShare,
    trackViralUIEvent,
    selectViralUIVariant,
    useViralOpportunities,
};
