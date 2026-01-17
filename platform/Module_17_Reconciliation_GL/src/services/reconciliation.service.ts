import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankTransaction } from '../entities/bank-transaction.entity';
import { ReconciliationMatch } from '../entities/reconciliation-match.entity';
import { AiFuzzyMatchingService, MatchResult } from './ai-fuzzy-matching.service';

@Injectable()
export class ReconciliationService {
    private readonly logger = new Logger(ReconciliationService.name);

    constructor(
        @InjectRepository(BankTransaction)
        private bankTransactionRepo: Repository<BankTransaction>,
        @InjectRepository(ReconciliationMatch)
        private matchRepo: Repository<ReconciliationMatch>,
        private aiFuzzyMatchingService: AiFuzzyMatchingService
    ) { }

    async runAutoReconciliation(tenantId: string): Promise<any> {
        this.logger.log(`Starting auto-reconciliation for tenant: ${tenantId}`);
        
        // Fetch pending transactions
        const pendingTxns = await this.bankTransactionRepo.createQueryBuilder('txn')
            .leftJoinAndSelect('txn.bankAccount', 'account')
            .where('account.tenant_id = :tenantId', { tenantId })
            .andWhere('txn.reconciliation_status = :status', { status: 'pending' })
            .getMany();

        let matchesFound = 0;
        let exactMatches = 0;
        let fuzzyMatches = 0;
        let predictiveMatches = 0;

        for (const txn of pendingTxns) {
            try {
                // 1. Try AI-powered fuzzy matching first
                const fuzzyMatches = await this.aiFuzzyMatchingService.findFuzzyMatches(txn);
                
                // 2. Try predictive matching if no good fuzzy matches
                let bestMatch: MatchResult | null = null;
                
                if (fuzzyMatches.length > 0 && fuzzyMatches[0].confidenceScore >= 0.8) {
                    bestMatch = fuzzyMatches[0];
                } else {
                    const predictiveMatches = await this.aiFuzzyMatchingService.findPredictiveMatches(txn);
                    if (predictiveMatches.length > 0) {
                        bestMatch = predictiveMatches[0];
                    }
                }

                if (bestMatch && bestMatch.confidenceScore >= 0.7) {
                    // Create reconciliation match
                    const match = this.matchRepo.create({
                        bankTransactionId: txn.id,
                        glEntryId: bestMatch.glEntry.id,
                        matchType: bestMatch.matchType,
                        confidenceScore: bestMatch.confidenceScore,
                        matchingCriteria: bestMatch.matchingCriteria.join(','),
                        isAutoMatched: true,
                        matchedBy: 'AI_Reconciliation_Engine',
                        matchDate: new Date(),
                    });

                    await this.matchRepo.save(match);

                    // Update transaction status
                    txn.reconciliationStatus = 'matched';
                    txn.matchedGlEntryId = bestMatch.glEntry.id;
                    await this.bankTransactionRepo.save(txn);

                    matchesFound++;
                    
                    if (bestMatch.matchType === 'exact') exactMatches++;
                    else if (bestMatch.matchType === 'fuzzy') fuzzyMatches++;
                    else if (bestMatch.matchType === 'predictive') predictiveMatches++;

                    // Learn from successful match
                    await this.aiFuzzyMatchingService.learnFromMatch(match);

                    this.logger.log(`Matched transaction ${txn.id} with GL entry ${bestMatch.glEntry.id} (${bestMatch.matchType}, ${bestMatch.confidenceScore.toFixed(2)} confidence)`);
                } else {
                    // Mark as unmatched for manual review
                    txn.reconciliationStatus = 'unmatched';
                    await this.bankTransactionRepo.save(txn);
                }
            } catch (error) {
                this.logger.error(`Error processing transaction ${txn.id}: ${error.message}`);
                txn.reconciliationStatus = 'unmatched';
                await this.bankTransactionRepo.save(txn);
            }
        }

        const result = {
            totalProcessed: pendingTxns.length,
            matchesFound,
            exactMatches,
            fuzzyMatches,
            predictiveMatches,
            unmatched: pendingTxns.length - matchesFound,
            matchRate: pendingTxns.length > 0 ? (matchesFound / pendingTxns.length) * 100 : 0,
        };

        this.logger.log(`Auto-reconciliation completed: ${JSON.stringify(result)}`);
        return result;
    }

    /**
     * Run AI-enhanced reconciliation with custom configuration
     */
    async runAiReconciliation(tenantId: string, config?: any): Promise<any> {
        this.logger.log(`Starting AI-enhanced reconciliation for tenant: ${tenantId}`);
        
        const pendingTxns = await this.bankTransactionRepo.createQueryBuilder('txn')
            .leftJoinAndSelect('txn.bankAccount', 'account')
            .where('account.tenant_id = :tenantId', { tenantId })
            .andWhere('txn.reconciliation_status = :status', { status: 'pending' })
            .getMany();

        const results = [];

        for (const txn of pendingTxns) {
            // Get all possible matches with scores
            const fuzzyMatches = await this.aiFuzzyMatchingService.findFuzzyMatches(txn, config);
            const predictiveMatches = await this.aiFuzzyMatchingService.findPredictiveMatches(txn);
            
            // Combine and rank all matches
            const allMatches = [...fuzzyMatches, ...predictiveMatches]
                .sort((a, b) => b.confidenceScore - a.confidenceScore)
                .slice(0, 5); // Top 5 matches

            results.push({
                transactionId: txn.id,
                amount: txn.amount,
                description: txn.description,
                matches: allMatches.map(match => ({
                    glEntryId: match.glEntry.id,
                    confidenceScore: match.confidenceScore,
                    matchType: match.matchType,
                    criteria: match.matchingCriteria,
                })),
                recommendedAction: allMatches.length > 0 && allMatches[0].confidenceScore >= 0.8 ? 'auto_match' : 'manual_review',
            });
        }

        return {
            totalTransactions: pendingTxns.length,
            results,
            summary: {
                highConfidenceMatches: results.filter(r => r.recommendedAction === 'auto_match').length,
                requiresManualReview: results.filter(r => r.recommendedAction === 'manual_review').length,
            }
        };
    }

    /**
     * Get reconciliation analytics
     */
    async getReconciliationAnalytics(tenantId: string, startDate?: Date, endDate?: Date): Promise<any> {
        const query = this.matchRepo.createQueryBuilder('match')
            .leftJoin('match.bankTransaction', 'txn')
            .leftJoin('txn.bankAccount', 'account')
            .where('account.tenant_id = :tenantId', { tenantId });

        if (startDate && endDate) {
            query.andWhere('match.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
        }

        const matches = await query.getMany();

        const analytics = {
            totalMatches: matches.length,
            matchTypeDistribution: {
                exact: matches.filter(m => m.matchType === 'exact').length,
                fuzzy: matches.filter(m => m.matchType === 'fuzzy').length,
                predictive: matches.filter(m => m.matchType === 'predictive').length,
                manual: matches.filter(m => m.matchType === 'manual').length,
            },
            averageConfidence: matches.reduce((sum, m) => sum + (m.confidenceScore || 0), 0) / matches.length,
            autoMatchedRate: matches.filter(m => m.isAutoMatched).length / matches.length * 100,
            dailyMatchingTrend: await this.getDailyMatchingTrend(tenantId, startDate, endDate),
        };

        return analytics;
    }

    /**
     * Get daily matching trend
     */
    private async getDailyMatchingTrend(tenantId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
        const query = this.matchRepo.createQueryBuilder('match')
            .leftJoin('match.bankTransaction', 'txn')
            .leftJoin('txn.bankAccount', 'account')
            .select('DATE(match.createdAt)', 'date')
            .addSelect('COUNT(*)', 'count')
            .addSelect('AVG(match.confidenceScore)', 'avgConfidence')
            .where('account.tenant_id = :tenantId', { tenantId })
            .groupBy('DATE(match.createdAt)')
            .orderBy('DATE(match.createdAt)', 'ASC');

        if (startDate && endDate) {
            query.andWhere('match.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
        }

        return await query.getRawMany();
    }
}
