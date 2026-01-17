import { Pool } from 'pg';
import * as crypto from 'crypto';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';
import {
    IUserProfile,
    IPersonalizationRule,
    IRecommendationEvent,
    IABExperiment,
    IExperimentAssignment,
    IUserSegment,
} from '../interfaces/p2-features.interface';

const logger = new Logger('AIPersonalizationService');

/**
 * AI Personalization Service
 * User segmentation, behavioral analysis, and recommendation engine
 */
export class AIPersonalizationService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Get or create user profile
     */
    async getUserProfile(userId: string): Promise<IUserProfile> {
        try {
            let result = await this.pool.query(
                'SELECT * FROM user_profiles WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                // Create new profile
                result = await this.pool.query(
                    `INSERT INTO user_profiles (user_id, preferences, behavior_data, segment)
           VALUES ($1, '{}', '{}', 'new')
           RETURNING *`,
                    [userId]
                );

                logger.info('User profile created', { userId });
            }

            return this.mapProfileFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to get user profile', { error, userId });
            throw error;
        }
    }

    /**
     * Update user behavior data
     */
    async updateBehavior(userId: string, behaviorEvent: any): Promise<void> {
        try {
            await this.pool.query(
                `UPDATE user_profiles
         SET behavior_data = behavior_data || $1,
             last_activity_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
                [JSON.stringify(behaviorEvent), userId]
            );

            // Trigger re-segmentation if needed
            await this.recalculateSegment(userId);

            logger.info('User behavior updated', { userId });
        } catch (error) {
            logger.error('Failed to update behavior', { error, userId });
            throw error;
        }
    }

    /**
     * Get recommendations for user
     */
    async getRecommendations(userId: string, itemType: string, limit: number = 10): Promise<IRecommendationEvent[]> {
        try {
            const profile = await this.getUserProfile(userId);

            // Generate recommendations using collaborative filtering
            const recommendations = await this.generateRecommendations(userId, profile, itemType, limit);

            // Record recommendation events
            for (const rec of recommendations) {
                await this.pool.query(
                    `INSERT INTO recommendation_events (user_id, item_type, item_id, score, context)
           VALUES ($1, $2, $3, $4, $5)`,
                    [userId, itemType, rec.itemId, rec.score, JSON.stringify(rec.context || {})]
                );
            }

            logger.info('Recommendations generated', { userId, itemType, count: recommendations.length });

            return recommendations;
        } catch (error) {
            logger.error('Failed to get recommendations', { error, userId });
            throw error;
        }
    }

    /**
     * Create personalization rule
     */
    async createRule(ruleData: {
        ruleName: string;
        targetSegment?: string;
        conditions: any;
        actions: any;
        priority?: number;
    }): Promise<IPersonalizationRule> {
        try {
            const result = await this.pool.query(
                `INSERT INTO personalization_rules (
          rule_name, target_segment, conditions, actions, priority, is_active
        ) VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *`,
                [
                    ruleData.ruleName,
                    ruleData.targetSegment || null,
                    JSON.stringify(ruleData.conditions),
                    JSON.stringify(ruleData.actions),
                    ruleData.priority || 0,
                ]
            );

            logger.info('Personalization rule created', { ruleId: result.rows[0].id });

            return this.mapRuleFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create rule', { error, ruleData });
            throw error;
        }
    }

    /**
     * Create A/B experiment
     */
    async createExperiment(experimentData: {
        experimentName: string;
        description?: string;
        variants: any;
        trafficSplit: any;
        metrics?: any;
    }, createdBy: string): Promise<IABExperiment> {
        try {
            const result = await this.pool.query(
                `INSERT INTO ab_experiments (
          experiment_name, description, variants, traffic_split,
          metrics, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, 'draft', $6)
        RETURNING *`,
                [
                    experimentData.experimentName,
                    experimentData.description || null,
                    JSON.stringify(experimentData.variants),
                    JSON.stringify(experimentData.trafficSplit),
                    experimentData.metrics ? JSON.stringify(experimentData.metrics) : null,
                    createdBy,
                ]
            );

            logger.info('A/B experiment created', { experimentId: result.rows[0].id });

            return this.mapExperimentFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create experiment', { error, experimentData });
            throw error;
        }
    }

    /**
     * Assign user to experiment variant
     */
    async assignToExperiment(userId: string, experimentId: string): Promise<IExperimentAssignment> {
        try {
            // Get experiment
            const expResult = await this.pool.query(
                'SELECT * FROM ab_experiments WHERE id = $1 AND status = $2',
                [experimentId, 'running']
            );

            if (expResult.rows.length === 0) {
                throw new NotFoundError('Experiment not found or not running');
            }

            const experiment = expResult.rows[0];
            const trafficSplit = experiment.traffic_split;

            // Determine variant using consistent hashing
            const variant = this.selectVariant(userId, experimentId, trafficSplit);

            // Assign user
            const result = await this.pool.query(
                `INSERT INTO experiment_assignments (user_id, experiment_id, variant)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, experiment_id)
         DO UPDATE SET variant = EXCLUDED.variant
         RETURNING *`,
                [userId, experimentId, variant]
            );

            logger.info('User assigned to experiment', { userId, experimentId, variant });

            return this.mapAssignmentFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to assign to experiment', { error, userId, experimentId });
            throw error;
        }
    }

    /**
     * Create user segment
     */
    async createSegment(segmentData: {
        segmentName: string;
        criteria: any;
        mlModelId?: string;
    }): Promise<IUserSegment> {
        try {
            const result = await this.pool.query(
                `INSERT INTO user_segments (segment_name, criteria, ml_model_id, is_active)
         VALUES ($1, $2, $3, true)
         RETURNING *`,
                [
                    segmentData.segmentName,
                    JSON.stringify(segmentData.criteria),
                    segmentData.mlModelId || null,
                ]
            );

            // Calculate initial members
            setTimeout(() => this.calculateSegmentMembers(result.rows[0].id), 100);

            logger.info('User segment created', { segmentId: result.rows[0].id });

            return this.mapSegmentFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create segment', { error, segmentData });
            throw error;
        }
    }

    /**
     * Get user's experiment variant
     */
    async getUserVariant(userId: string, experimentId: string): Promise<string | null> {
        try {
            const result = await this.pool.query(
                'SELECT variant FROM experiment_assignments WHERE user_id = $1 AND experiment_id = $2',
                [userId, experimentId]
            );

            return result.rows.length > 0 ? result.rows[0].variant : null;
        } catch (error) {
            logger.error('Failed to get user variant', { error, userId, experimentId });
            return null;
        }
    }

    /**
     * Private helper methods
     */

    private async generateRecommendations(
        userId: string,
        profile: IUserProfile,
        itemType: string,
        limit: number
    ): Promise<IRecommendationEvent[]> {
        // Simplified collaborative filtering
        // In production, would use ML models or external recommendation API

        const recommendations: IRecommendationEvent[] = [];

        // Generate mock recommendations based on segment
        for (let i = 0; i < limit; i++) {
            recommendations.push({
                id: crypto.randomUUID(),
                userId,
                itemType,
                itemId: `item_${i + 1}`,
                score: Math.random() * 0.9 + 0.1, // 0.1 to 1.0
                context: {
                    segment: profile.segment,
                    generatedAt: new Date(),
                },
                createdAt: new Date(),
            });
        }

        // Sort by score descending
        recommendations.sort((a, b) => (b.score || 0) - (a.score || 0));

        return recommendations;
    }

    private async recalculateSegment(userId: string): Promise<void> {
        try {
            // Simplified segmentation logic
            // In production, would use ML clustering algorithms

            const profile = await this.pool.query(
                'SELECT * FROM user_profiles WHERE user_id = $1',
                [userId]
            );

            if (profile.rows.length === 0) return;

            const behaviorData = profile.rows[0].behavior_data || {};
            let segment = 'active';

            // Simple rule-based segmentation
            if (Object.keys(behaviorData).length === 0) {
                segment = 'new';
            } else if (behaviorData.loginCount && behaviorData.loginCount > 30) {
                segment = 'power_user';
            } else if (behaviorData.lastActiveDate &&
                new Date(behaviorData.lastActiveDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
                segment = 'churned';
            }

            await this.pool.query(
                'UPDATE user_profiles SET segment = $1 WHERE user_id = $2',
                [segment, userId]
            );
        } catch (error) {
            logger.error('Failed to recalculate segment', { error, userId });
        }
    }

    private selectVariant(userId: string, experimentId: string, trafficSplit: any): string {
        // Consistent hashing for variant selection
        const hash = crypto.createHash('md5').update(userId + experimentId).digest('hex');
        const hashValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff;

        let cumulative = 0;
        for (const [variant, percentage] of Object.entries(trafficSplit)) {
            cumulative += percentage as number;
            if (hashValue <= cumulative / 100) {
                return variant;
            }
        }

        // Fallback to first variant
        return Object.keys(trafficSplit)[0];
    }

    private async calculateSegmentMembers(segmentId: string): Promise<void> {
        try {
            const segment = await this.pool.query(
                'SELECT * FROM user_segments WHERE id = $1',
                [segmentId]
            );

            if (segment.rows.length === 0) return;

            const criteria = segment.rows[0].criteria;

            // Count matching users (simplified)
            const count = await this.pool.query(
                `SELECT COUNT(*) FROM user_profiles WHERE segment = $1`,
                [criteria.segment || 'active']
            );

            await this.pool.query(
                `UPDATE user_segments
         SET member_count = $1, last_calculated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
                [parseInt(count.rows[0].count, 10), segmentId]
            );

            logger.info('Segment members calculated', { segmentId, memberCount: count.rows[0].count });
        } catch (error) {
            logger.error('Failed to calculate segment members', { error, segmentId });
        }
    }

    /**
     * Mapping functions
     */

    private mapProfileFromDb(row: any): IUserProfile {
        return {
            id: row.id,
            userId: row.user_id,
            preferences: row.preferences,
            behaviorData: row.behavior_data,
            segment: row.segment,
            mlFeatures: row.ml_features,
            lastActivityAt: row.last_activity_at,
        };
    }

    private mapRuleFromDb(row: any): IPersonalizationRule {
        return {
            id: row.id,
            ruleName: row.rule_name,
            targetSegment: row.target_segment,
            conditions: row.conditions,
            actions: row.actions,
            priority: row.priority,
            isActive: row.is_active,
        };
    }

    private mapExperimentFromDb(row: any): IABExperiment {
        return {
            id: row.id,
            experimentName: row.experiment_name,
            description: row.description,
            variants: row.variants,
            trafficSplit: row.traffic_split,
            metrics: row.metrics,
            status: row.status,
            startDate: row.start_date,
            endDate: row.end_date,
            createdBy: row.created_by,
        };
    }

    private mapAssignmentFromDb(row: any): IExperimentAssignment {
        return {
            id: row.id,
            userId: row.user_id,
            experimentId: row.experiment_id,
            variant: row.variant,
            assignedAt: row.assigned_at,
        };
    }

    private mapSegmentFromDb(row: any): IUserSegment {
        return {
            id: row.id,
            segmentName: row.segment_name,
            criteria: row.criteria,
            mlModelId: row.ml_model_id,
            memberCount: row.member_count,
            lastCalculatedAt: row.last_calculated_at,
            isActive: row.is_active,
        };
    }
}

export const aiPersonalizationService = new AIPersonalizationService();
