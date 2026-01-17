import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankTransaction } from '../entities/bank-transaction.entity';
import { GlEntry } from '../entities/gl-entry.entity';
import { ReconciliationMatch } from '../entities/reconciliation-match.entity';
import { JournalEntry } from '../entities/journal-entry.entity';

export interface MatchResult {
  bankTransaction: BankTransaction;
  glEntry: GlEntry;
  confidenceScore: number;
  matchType: 'exact' | 'fuzzy' | 'predictive';
  matchingCriteria: string[];
}

export interface FuzzyMatchConfig {
  amountTolerance: number; // Percentage tolerance for amount matching
  dateToleranceDays: number; // Days tolerance for date matching
  descriptionSimilarityThreshold: number; // 0-1 threshold for text similarity
  referenceWeight: number; // Weight for reference matching
  descriptionWeight: number; // Weight for description matching
}

@Injectable()
export class AiFuzzyMatchingService {
  private readonly logger = new Logger(AiFuzzyMatchingService.name);
  
  private readonly defaultConfig: FuzzyMatchConfig = {
    amountTolerance: 0.01, // 1% tolerance
    dateToleranceDays: 3,
    descriptionSimilarityThreshold: 0.7,
    referenceWeight: 0.4,
    descriptionWeight: 0.6,
  };

  constructor(
    @InjectRepository(BankTransaction)
    private bankTransactionRepo: Repository<BankTransaction>,
    @InjectRepository(GlEntry)
    private glEntryRepo: Repository<GlEntry>,
    @InjectRepository(ReconciliationMatch)
    private matchRepo: Repository<ReconciliationMatch>,
    @InjectRepository(JournalEntry)
    private journalEntryRepo: Repository<JournalEntry>,
  ) {}

  /**
   * AI-powered fuzzy matching for bank transactions and GL entries
   */
  async findFuzzyMatches(
    bankTransaction: BankTransaction,
    config?: Partial<FuzzyMatchConfig>,
  ): Promise<MatchResult[]> {
    const matchConfig = { ...this.defaultConfig, ...config };
    
    // Get all unmatched GL entries within date range
    const candidateEntries = await this.getCandidateGlEntries(bankTransaction, matchConfig);
    
    const matches: MatchResult[] = [];
    
    for (const glEntry of candidateEntries) {
      const matchResult = await this.calculateMatchScore(bankTransaction, glEntry, matchConfig);
      
      if (matchResult.confidenceScore >= 0.5) { // Minimum confidence threshold
        matches.push(matchResult);
      }
    }
    
    // Sort by confidence score (highest first)
    return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Predictive matching using ML patterns
   */
  async findPredictiveMatches(bankTransaction: BankTransaction): Promise<MatchResult[]> {
    // Analyze historical patterns for this transaction type
    const historicalPatterns = await this.analyzeHistoricalPatterns(bankTransaction);
    
    // Get candidate entries
    const candidateEntries = await this.getCandidateGlEntries(bankTransaction, this.defaultConfig);
    
    const matches: MatchResult[] = [];
    
    for (const glEntry of candidateEntries) {
      const predictiveScore = this.calculatePredictiveScore(bankTransaction, glEntry, historicalPatterns);
      
      if (predictiveScore >= 0.6) {
        matches.push({
          bankTransaction,
          glEntry,
          confidenceScore: predictiveScore,
          matchType: 'predictive',
          matchingCriteria: ['predictive_pattern', 'historical_behavior'],
        });
      }
    }
    
    return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Calculate comprehensive match score using multiple factors
   */
  private async calculateMatchScore(
    bankTransaction: BankTransaction,
    glEntry: GlEntry,
    config: FuzzyMatchConfig,
  ): Promise<MatchResult> {
    const criteria: string[] = [];
    let totalScore = 0;
    let maxScore = 0;

    // 1. Amount matching (40% weight)
    const amountScore = this.calculateAmountScore(bankTransaction.amount, glEntry.amount, config.amountTolerance);
    if (amountScore > 0) {
      criteria.push('amount');
      totalScore += amountScore * 0.4;
      maxScore += 0.4;
    }

    // 2. Date proximity (20% weight)
    const dateScore = this.calculateDateScore(bankTransaction.transactionDate, glEntry.journalEntry?.entryDate, config.dateToleranceDays);
    if (dateScore > 0) {
      criteria.push('date');
      totalScore += dateScore * 0.2;
      maxScore += 0.2;
    }

    // 3. Description similarity (25% weight)
    const descriptionScore = this.calculateDescriptionSimilarity(bankTransaction.description, glEntry.description);
    if (descriptionScore >= config.descriptionSimilarityThreshold) {
      criteria.push('description');
      totalScore += descriptionScore * config.descriptionWeight;
      maxScore += config.descriptionWeight;
    }

    // 4. Reference matching (15% weight)
    const referenceScore = this.calculateReferenceScore(bankTransaction.reference, glEntry.reference);
    if (referenceScore > 0) {
      criteria.push('reference');
      totalScore += referenceScore * config.referenceWeight;
      maxScore += config.referenceWeight;
    }

    const finalScore = maxScore > 0 ? totalScore / maxScore : 0;

    return {
      bankTransaction,
      glEntry,
      confidenceScore: finalScore,
      matchType: finalScore >= 0.9 ? 'exact' : 'fuzzy',
      matchingCriteria: criteria,
    };
  }

  /**
   * Calculate amount similarity score
   */
  private calculateAmountScore(bankAmount: number, glAmount: number, tolerance: number): number {
    if (bankAmount === glAmount) return 1.0;
    
    const difference = Math.abs(bankAmount - glAmount);
    const toleranceAmount = bankAmount * tolerance;
    
    if (difference <= toleranceAmount) {
      return 1.0 - (difference / toleranceAmount);
    }
    
    return 0;
  }

  /**
   * Calculate date proximity score
   */
  private calculateDateScore(bankDate: Date, glDate: Date, toleranceDays: number): number {
    if (!glDate) return 0;
    
    const diffTime = Math.abs(bankDate.getTime() - glDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= toleranceDays) {
      return 1.0 - (diffDays / toleranceDays);
    }
    
    return 0;
  }

  /**
   * Calculate text similarity using Levenshtein distance
   */
  private calculateDescriptionSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    const normalized1 = text1.toLowerCase().trim();
    const normalized2 = text2.toLowerCase().trim();
    
    if (normalized1 === normalized2) return 1.0;
    
    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    
    return maxLength > 0 ? 1.0 - (distance / maxLength) : 0;
  }

  /**
   * Calculate reference matching score
   */
  private calculateReferenceScore(bankRef: string, glRef: string): number {
    if (!bankRef || !glRef) return 0;
    
    // Exact match
    if (bankRef === glRef) return 1.0;
    
    // Partial match
    if (bankRef.includes(glRef) || glRef.includes(bankRef)) return 0.8;
    
    // Contains common patterns
    const bankNormalized = bankRef.toLowerCase().replace(/[^a-z0-9]/g, '');
    const glNormalized = glRef.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (bankNormalized === glNormalized) return 0.9;
    
    return 0;
  }

  /**
   * Levenshtein distance algorithm for string similarity
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Get candidate GL entries for matching
   */
  private async getCandidateGlEntries(bankTransaction: BankTransaction, config: FuzzyMatchConfig): Promise<GlEntry[]> {
    const startDate = new Date(bankTransaction.transactionDate);
    startDate.setDate(startDate.getDate() - config.dateToleranceDays);
    
    const endDate = new Date(bankTransaction.transactionDate);
    endDate.setDate(endDate.getDate() + config.dateToleranceDays);
    
    return await this.glEntryRepo
      .createQueryBuilder('glEntry')
      .leftJoinAndSelect('glEntry.journalEntry', 'journalEntry')
      .leftJoinAndSelect('glEntry.account', 'account')
      .where('journalEntry.entryDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('glEntry.amount BETWEEN :minAmount AND :maxAmount', {
        minAmount: bankTransaction.amount * (1 - config.amountTolerance),
        maxAmount: bankTransaction.amount * (1 + config.amountTolerance),
      })
      .andWhere('glEntry.id NOT IN (SELECT matchedGlEntryId FROM reconciliation_matches WHERE bankTransactionId = :txnId)', {
        txnId: bankTransaction.id,
      })
      .getMany();
  }

  /**
   * Analyze historical patterns for predictive matching
   */
  private async analyzeHistoricalPatterns(bankTransaction: BankTransaction): Promise<any> {
    // Get historical matches for similar transactions
    const historicalMatches = await this.matchRepo
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.bankTransaction', 'bankTxn')
      .leftJoinAndSelect('match.glEntry', 'glEntry')
      .where('bankTxn.description LIKE :description', { description: `%${bankTransaction.description.substring(0, 20)}%` })
      .orWhere('bankTxn.amount BETWEEN :minAmount AND :maxAmount', {
        minAmount: bankTransaction.amount * 0.9,
        maxAmount: bankTransaction.amount * 1.1,
      })
      .orderBy('match.createdAt', 'DESC')
      .limit(50)
      .getMany();

    // Extract patterns from historical matches
    const patterns = {
      commonAccountIds: new Set<string>(),
      commonDescriptions: new Map<string, number>(),
      averageConfidence: 0,
    };

    let totalConfidence = 0;
    historicalMatches.forEach(match => {
      if (match.glEntry?.accountId) {
        patterns.commonAccountIds.add(match.glEntry.accountId);
      }
      
      if (match.glEntry?.description) {
        const desc = match.glEntry.description;
        patterns.commonDescriptions.set(desc, (patterns.commonDescriptions.get(desc) || 0) + 1);
      }
      
      totalConfidence += match.confidenceScore;
    });

    patterns.averageConfidence = historicalMatches.length > 0 ? totalConfidence / historicalMatches.length : 0;

    return patterns;
  }

  /**
   * Calculate predictive score based on historical patterns
   */
  private calculatePredictiveScore(
    bankTransaction: BankTransaction,
    glEntry: GlEntry,
    patterns: any,
  ): number {
    let score = 0.5; // Base score

    // Boost score if account ID matches historical patterns
    if (patterns.commonAccountIds.has(glEntry.accountId)) {
      score += 0.2;
    }

    // Boost score if description matches historical patterns
    if (patterns.commonDescriptions.has(glEntry.description)) {
      const frequency = patterns.commonDescriptions.get(glEntry.description);
      score += Math.min(0.3, frequency * 0.05);
    }

    // Apply historical confidence factor
    score *= (1 + patterns.averageConfidence * 0.2);

    return Math.min(1.0, score);
  }

  /**
   * Learn from confirmed matches to improve future predictions
   */
  async learnFromMatch(match: ReconciliationMatch): Promise<void> {
    // This would integrate with a ML model in a real implementation
    // For now, we'll just log the learning event
    this.logger.log(`Learning from match: ${match.bankTransactionId} -> ${match.glEntryId} (confidence: ${match.confidenceScore})`);
    
    // In a full implementation, this would:
    // 1. Extract features from the match
    // 2. Update the ML model weights
    // 3. Store patterns for future reference
  }
}
