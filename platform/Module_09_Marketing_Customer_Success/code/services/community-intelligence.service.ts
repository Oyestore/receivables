import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Entity, Column, PrimaryColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Community Intelligence Layer - Core Service
 * 
 * PHASE 9.5 TIER 1: Community-Powered Learning & Growth
 * 
 * Transforms user-generated content into a product feature that drives engagement,
 * retention, and organic growth through peer learning and knowledge sharing.
 */

// ============================================================================
// ENTITIES
// ============================================================================

@Entity('community_posts')
@Index('idx_category_tags', ['category', 'tags'])
@Index('idx_author_date', ['authorId', 'createdAt'])
export class CommunityPost {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    tenantId: string;

    @Column({ type: 'varchar', length: 100 })
    authorId: string;

    @Column({ type: 'varchar', length: 200 })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'varchar', length: 50 })
    category: string;                    // 'best_practices', 'troubleshooting', 'feature_ideas'

    @Column({ type: 'json', nullable: true })
    tags: string[];

    @Column({ type: 'integer', default: 0 })
    viewCount: number;

    @Column({ type: 'integer', default: 0 })
    replyCount: number;

    @Column({ type: 'integer', default: 0 })
    upvotes: number;

    @Column({ type: 'boolean', default: false })
    isExpertVerified: boolean;

    @Column({ type: 'boolean', default: false })
    isPinned: boolean;

    @Column({ type: 'text', nullable: true })
    aiSummary: string;                   // AI-generated summary (Deepseek R1)

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('community_templates')
@Index('idx_category_rating', ['category', 'avgRating'])
export class CommunityTemplate {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    creatorId: string;

    @Column({ type: 'varchar', length: 200 })
    name: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'varchar', length: 50 })
    category: string;                    // 'invoice', 'email', 'workflow', 'report'

    @Column({ type: 'json' })
    templateData: Record<string, any>;   // Actual template content

    @Column({ type: 'integer', default: 0 })
    downloadCount: number;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    avgRating: number;

    @Column({ type: 'integer', default: 0 })
    ratingCount: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    successRate: number;                 // % of users who report success

    @Column({ type: 'json', nullable: true })
    performanceData: {
        avgDSOImprovement?: number;
        avgCollectionRate?: number;
        userReports: number;
    };

    @Column({ type: 'boolean', default: false })
    isCertified: boolean;                // Platform-certified template

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('expert_profiles')
@Index('idx_expertise_score', ['expertiseScore'])
export class ExpertProfile {
    @PrimaryColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    userId: string;

    @Column({ type: 'varchar', length: 200 })
    displayName: string;

    @Column({ type: 'text', nullable: true })
    bio: string;

    @Column({ type: 'json' })
    expertiseAreas: string[];            // ['invoice_management', 'dispute_resolution']

    @Column({ type: 'integer', default: 0 })
    expertiseScore: number;              // 0-1000, based on contributions

    @Column({ type: 'integer', default: 0 })
    contributionCount: number;

    @Column({ type: 'integer', default: 0 })
    helpfulVotes: number;

    @Column({ type: 'boolean', default: false })
    isAvailableForMentoring: boolean;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    menteeRating: number;

    @Column({ type: 'json', nullable: true })
    badges: Array<{
        name: string;
        earnedAt: Date;
        description: string;
    }>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface CreatePostInput {
    authorId: string;
    title: string;
    content: string;
    category: string;
    tags?: string[];
}

export interface CreateTemplateInput {
    creatorId: string;
    name: string;
    description: string;
    category: string;
    templateData: Record<string, any>;
}

export interface PeerConnection {
    id: string;
    userId1: string;
    userId2: string;
    connectionType: 'peer_learning' | 'mentoring' | 'collaboration';
    status: 'pending' | 'active' | 'inactive';
    matchScore: number;                  // 0-100, compatibility
    commonInterests: string[];
    createdAt: Date;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class CommunityIntelligenceService {
    private readonly logger = new Logger(CommunityIntelligenceService.name);

    constructor(
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Create discussion post with AI enhancement
     */
    async createPost(
        tenantId: string,
        input: CreatePostInput,
    ): Promise<CommunityPost> {
        const postId = this.generateId();

        // Generate AI summary (in production: call Deepseek R1)
        const aiSummary = await this.generateAISummary(input.content);

        const post: CommunityPost = {
            id: postId,
            tenantId,
            authorId: input.authorId,
            title: input.title,
            content: input.content,
            category: input.category,
            tags: input.tags || [],
            viewCount: 0,
            replyCount: 0,
            upvotes: 0,
            isExpertVerified: false,
            isPinned: false,
            aiSummary,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Save to database (mock)
        this.logger.log(`Post created: ${post.title} by ${input.authorId}`);

        // Emit event for notifications
        this.eventEmitter.emit('community.post.created', post);

        // Update author's expertise score
        await this.updateExpertiseScore(input.authorId, 'post_created');

        return post;
    }

    /**
     * Submit template to marketplace
     */
    async submitTemplate(
        input: CreateTemplateInput,
    ): Promise<CommunityTemplate> {
        const templateId = this.generateId();

        const template: CommunityTemplate = {
            id: templateId,
            creatorId: input.creatorId,
            name: input.name,
            description: input.description,
            category: input.category,
            templateData: input.templateData,
            downloadCount: 0,
            avgRating: 0,
            ratingCount: 0,
            successRate: null,
            performanceData: null,
            isCertified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.logger.log(`Template submitted: ${template.name} by ${input.creatorId}`);

        // Emit event for review queue
        this.eventEmitter.emit('community.template.submitted', template);

        // Award points to creator
        await this.updateExpertiseScore(input.creatorId, 'template_created');

        return template;
    }

    /**
     * Download and use template
     */
    async downloadTemplate(
        templateId: string,
        userId: string,
    ): Promise<CommunityTemplate> {
        // Mock - in production, fetch from database
        const template = await this.getTemplate(templateId);

        // Increment download count
        template.downloadCount++;

        this.logger.log(`Template downloaded: ${templateId} by ${userId}`);

        // Track usage for analytics
        this.eventEmitter.emit('community.template.downloaded', {
            templateId,
            userId,
            creatorId: template.creatorId,
        });

        // Reward creator
        await this.updateExpertiseScore(template.creatorId, 'template_downloaded');

        return template;
    }

    /**
     * Rate template
     */
    async rateTemplate(
        templateId: string,
        userId: string,
        rating: number,          // 1-5
        successReport?: {
            achieved: boolean;
            dsoImprovement?: number;
            collectionRateImprovement?: number;
        },
    ): Promise<void> {
        // Update template rating
        const template = await this.getTemplate(templateId);

        const newRatingCount = template.ratingCount + 1;
        const newAvgRating =
            (template.avgRating * template.ratingCount + rating) / newRatingCount;

        template.avgRating = newAvgRating;
        template.ratingCount = newRatingCount;

        // Update performance data if provided
        if (successReport) {
            if (!template.performanceData) {
                template.performanceData = {
                    avgDSOImprovement: 0,
                    avgCollectionRate: 0,
                    userReports: 0,
                };
            }

            template.performanceData.userReports++;

            if (successReport.dsoImprovement) {
                template.performanceData.avgDSOImprovement =
                    ((template.performanceData.avgDSOImprovement || 0) *
                        (template.performanceData.userReports - 1) +
                        successReport.dsoImprovement) /
                    template.performanceData.userReports;
            }
        }

        this.logger.log(
            `Template rated: ${templateId} by ${userId}, rating: ${rating}`,
        );
    }

    /**
     * Find peer connections for user
     */
    async findPeerMatches(
        userId: string,
        preferences: {
            lookingFor: 'mentoring' | 'peer_learning' | 'collaboration';
            expertiseAreas?: string[];
        },
    ): Promise<PeerConnection[]> {
        // Mock implementation - in production, use ML matching algorithm
        const matches: PeerConnection[] = [
            {
                id: this.generateId(),
                userId1: userId,
                userId2: 'user_' + Math.random().toString(36).substr(2, 9),
                connectionType: preferences.lookingFor,
                status: 'pending',
                matchScore: 85,
                commonInterests: preferences.expertiseAreas || ['invoice_management'],
                createdAt: new Date(),
            },
            {
                id: this.generateId(),
                userId1: userId,
                userId2: 'user_' + Math.random().toString(36).substr(2, 9),
                connectionType: preferences.lookingFor,
                status: 'pending',
                matchScore: 72,
                commonInterests: preferences.expertiseAreas || ['collections'],
                createdAt: new Date(),
            },
        ];

        this.logger.log(
            `Found ${matches.length} peer matches for ${userId}`,
        );

        return matches;
    }

    /**
     * Get trending topics and discussions
     */
    async getTrendingTopics(
        timeframe: 'day' | 'week' | 'month' = 'week',
    ): Promise<Array<{
        topic: string;
        postCount: number;
        viewCount: number;
        trendScore: number;
    }>> {
        // Mock trending topics
        return [
            {
                topic: 'Automated Payment Reminders',
                postCount: 15,
                viewCount: 1247,
                trendScore: 92,
            },
            {
                topic: 'DSO Reduction Strategies',
                postCount: 12,
                viewCount: 856,
                trendScore: 78,
            },
            {
                topic: 'Credit Scoring Best Practices',
                postCount: 8,
                viewCount: 634,
                trendScore: 65,
            },
        ];
    }

    /**
     * Get top contributors (leaderboard)
     */
    async getTopContributors(
        timeframe: 'week' | 'month' | 'all_time' = 'month',
        limit: number = 10,
    ): Promise<ExpertProfile[]> {
        // Mock leaderboard - in production, query database
        const profiles: ExpertProfile[] = [];

        for (let i = 0; i < limit; i++) {
            profiles.push({
                id: this.generateId(),
                userId: `user_${i}`,
                displayName: `Expert User ${i + 1}`,
                bio: 'Experienced receivables professional',
                expertiseAreas: ['invoice_management', 'collections'],
                expertiseScore: 900 - i * 50,
                contributionCount: 50 - i * 5,
                helpfulVotes: 200 - i * 15,
                isAvailableForMentoring: i < 5,
                menteeRating: 4.5 - i * 0.1,
                badges: [
                    {
                        name: 'Top Contributor',
                        earnedAt: new Date(),
                        description: '100+ helpful contributions',
                    },
                ],
                createdAt: new Date(Date.now() - 365 * 24 * 3600000),
                updatedAt: new Date(),
            });
        }

        return profiles;
    }

    /**
     * Get community analytics
     */
    async getCommunityAnalytics(): Promise<{
        totalPosts: number;
        totalTemplates: number;
        totalExperts: number;
        activeUsers: number;
        avgEngagement: number;
        topCategories: Array<{ category: string; count: number }>;
    }> {
        return {
            totalPosts: 1247,
            totalTemplates: 342,
            totalExperts: 156,
            activeUsers: 2341,
            avgEngagement: 0.68,
            topCategories: [
                { category: 'best_practices', count: 456 },
                { category: 'troubleshooting', count: 389 },
                { category: 'feature_ideas', count: 234 },
            ],
        };
    }

    // Private helper methods

    private async generateAISummary(content: string): Promise<string> {
        // Mock AI summary - in production, call Deepseek R1
        const words = content.split(' ').slice(0, 20).join(' ');
        return `Summary: ${words}...`;
    }

    private async getTemplate(templateId: string): Promise<CommunityTemplate> {
        // Mock - in production, query database
        return {
            id: templateId,
            creatorId: 'creator_001',
            name: 'Professional Invoice Template',
            description: 'Modern, clean invoice template',
            category: 'invoice',
            templateData: { content: 'Template data here' },
            downloadCount: 45,
            avgRating: 4.6,
            ratingCount: 23,
            successRate: 0.87,
            performanceData: {
                avgDSOImprovement: 8.5,
                avgCollectionRate: 0.92,
                userReports: 15,
            },
            isCertified: true,
            createdAt: new Date(Date.now() - 90 * 24 * 3600000),
            updatedAt: new Date(),
        };
    }

    private async updateExpertiseScore(
        userId: string,
        action: string,
    ): Promise<void> {
        const points = {
            post_created: 10,
            template_created: 50,
            template_downloaded: 2,
            helpful_vote: 5,
        };

        const earnedPoints = points[action] || 0;

        this.logger.debug(
            `User ${userId} earned ${earnedPoints} expertise points for ${action}`,
        );

        // In production: update database
    }

    private generateId(): string {
        return `community_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
