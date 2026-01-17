import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EscrowTransaction, EscrowStatus, EscrowType } from '../entities/escrow-transaction.entity';

export interface CreateEscrowRequest {
  transactionId: string;
  escrowType: EscrowType;
  amount: number;
  currency: string;
  buyerId: string;
  sellerId: string;
  tradeId?: string;
  releaseConditions?: Record<string, any>;
  smartContractAddress?: string;
  metadata?: Record<string, any>;
}

export interface FundEscrowRequest {
  escrowId: string;
  blockchainHash?: string;
}

export interface ReleaseEscrowRequest {
  escrowId: string;
  releaseNotes: string;
  blockchainHash?: string;
}

export interface DisputeEscrowRequest {
  escrowId: string;
  disputeReason: string;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    @InjectRepository(EscrowTransaction)
    private escrowRepo: Repository<EscrowTransaction>,
    private dataSource: DataSource,
  ) {}

  /**
   * Create a new escrow transaction
   */
  async createEscrow(createRequest: CreateEscrowRequest, createdBy: string): Promise<EscrowTransaction> {
    this.logger.log(`Creating escrow for transaction ${createRequest.transactionId}`);

    try {
      const escrow = this.escrowRepo.create({
        ...createRequest,
        status: EscrowStatus.PENDING,
        createdBy,
      });

      return await this.escrowRepo.save(escrow);
    } catch (error: any) {
      this.logger.error(`Error creating escrow: ${error.message}`);
      throw new BadRequestException(`Failed to create escrow: ${error.message}`);
    }
  }

  /**
   * Fund an escrow transaction
   */
  async fundEscrow(fundRequest: FundEscrowRequest): Promise<EscrowTransaction> {
    this.logger.log(`Funding escrow ${fundRequest.escrowId}`);

    const escrow = await this.getEscrowById(fundRequest.escrowId);

    if (escrow.status !== EscrowStatus.PENDING) {
      throw new BadRequestException(`Escrow must be in PENDING status to fund. Current status: ${escrow.status}`);
    }

    // Simulate blockchain transaction
    const blockchainHash = fundRequest.blockchainHash || this.simulateBlockchainTransaction('fund', escrow);

    escrow.status = EscrowStatus.FUNDED;
    escrow.fundedAt = new Date();
    escrow.blockchainHash = blockchainHash;

    return await this.escrowRepo.save(escrow);
  }

  /**
   * Release funds from escrow
   */
  async releaseEscrow(releaseRequest: ReleaseEscrowRequest): Promise<EscrowTransaction> {
    this.logger.log(`Releasing escrow ${releaseRequest.escrowId}`);

    const escrow = await this.getEscrowById(releaseRequest.escrowId);

    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new BadRequestException(`Escrow must be FUNDED to release. Current status: ${escrow.status}`);
    }

    // Simulate blockchain transaction
    const blockchainHash = releaseRequest.blockchainHash || this.simulateBlockchainTransaction('release', escrow);

    escrow.status = EscrowStatus.RELEASED;
    escrow.releasedAt = new Date();
    escrow.releaseNotes = releaseRequest.releaseNotes;
    escrow.blockchainHash = blockchainHash;

    return await this.escrowRepo.save(escrow);
  }

  /**
   * Create a dispute on escrow
   */
  async disputeEscrow(disputeRequest: DisputeEscrowRequest): Promise<EscrowTransaction> {
    this.logger.log(`Creating dispute for escrow ${disputeRequest.escrowId}`);

    const escrow = await this.getEscrowById(disputeRequest.escrowId);

    if (escrow.status !== EscrowStatus.FUNDED) {
      throw new BadRequestException(`Escrow must be FUNDED to dispute. Current status: ${escrow.status}`);
    }

    escrow.status = EscrowStatus.DISPUTED;
    escrow.disputedAt = new Date();
    escrow.disputeReason = disputeRequest.disputeReason;

    return await this.escrowRepo.save(escrow);
  }

  /**
   * Resolve dispute and release funds
   */
  async resolveDispute(
    escrowId: string,
    resolution: string,
    releaseNotes: string
  ): Promise<EscrowTransaction> {
    this.logger.log(`Resolving dispute for escrow ${escrowId}`);

    const escrow = await this.getEscrowById(escrowId);

    if (escrow.status !== EscrowStatus.DISPUTED) {
      throw new BadRequestException(`Escrow must be DISPUTED to resolve. Current status: ${escrow.status}`);
    }

    // Simulate blockchain transaction
    const blockchainHash = this.simulateBlockchainTransaction('resolve_dispute', escrow);

    escrow.status = EscrowStatus.RELEASED;
    escrow.releasedAt = new Date();
    escrow.releaseNotes = `Dispute resolved: ${resolution}. ${releaseNotes}`;
    escrow.blockchainHash = blockchainHash;

    return await this.escrowRepo.save(escrow);
  }

  /**
   * Cancel escrow
   */
  async cancelEscrow(escrowId: string, reason: string): Promise<EscrowTransaction> {
    this.logger.log(`Cancelling escrow ${escrowId}`);

    const escrow = await this.getEscrowById(escrowId);

    if (![EscrowStatus.PENDING, EscrowStatus.FUNDED].includes(escrow.status)) {
      throw new BadRequestException(`Escrow cannot be cancelled in ${escrow.status} status`);
    }

    // Simulate blockchain transaction
    const blockchainHash = this.simulateBlockchainTransaction('cancel', escrow);

    escrow.status = EscrowStatus.CANCELLED;
    escrow.releaseNotes = `Cancelled: ${reason}`;
    escrow.blockchainHash = blockchainHash;

    return await this.escrowRepo.save(escrow);
  }

  /**
   * Get escrow by ID
   */
  async getEscrowById(escrowId: string): Promise<EscrowTransaction> {
    const escrow = await this.escrowRepo.findOne({ where: { id: escrowId } });

    if (!escrow) {
      throw new NotFoundException(`Escrow with ID ${escrowId} not found`);
    }

    return escrow;
  }

  /**
   * Get escrows by buyer
   */
  async getEscrowsByBuyer(buyerId: string, status?: EscrowStatus): Promise<EscrowTransaction[]> {
    const where: any = { buyerId };
    if (status) {
      where.status = status;
    }

    return await this.escrowRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get escrows by seller
   */
  async getEscrowsBySeller(sellerId: string, status?: EscrowStatus): Promise<EscrowTransaction[]> {
    const where: any = { sellerId };
    if (status) {
      where.status = status;
    }

    return await this.escrowRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get escrow analytics
   */
  async getEscrowAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    const query = this.escrowRepo.createQueryBuilder('escrow');

    if (startDate && endDate) {
      query.where('escrow.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const escrows = await query.getMany();

    const analytics = {
      totalEscrows: escrows.length,
      statusDistribution: {
        pending: escrows.filter(e => e.status === EscrowStatus.PENDING).length,
        funded: escrows.filter(e => e.status === EscrowStatus.FUNDED).length,
        released: escrows.filter(e => e.status === EscrowStatus.RELEASED).length,
        cancelled: escrows.filter(e => e.status === EscrowStatus.CANCELLED).length,
        disputed: escrows.filter(e => e.status === EscrowStatus.DISPUTED).length,
      },
      typeDistribution: escrows.reduce((acc: any, e) => {
        acc[e.escrowType] = (acc[e.escrowType] || 0) + 1;
        return acc;
      }, {}),
      totalVolume: escrows.reduce((sum, e) => sum + e.amount, 0),
      averageAmount: escrows.length > 0 ? escrows.reduce((sum, e) => sum + e.amount, 0) / escrows.length : 0,
      completionRate: escrows.length > 0 ? (escrows.filter(e => e.status === EscrowStatus.RELEASED).length / escrows.length) * 100 : 0,
      disputeRate: escrows.length > 0 ? (escrows.filter(e => e.status === EscrowStatus.DISPUTED).length / escrows.length) * 100 : 0,
      averageProcessingTime: this.calculateAverageProcessingTime(escrows),
    };

    return analytics;
  }

  /**
   * Get escrow performance metrics
   */
  async getEscrowMetrics(): Promise<any> {
    const escrows = await this.escrowRepo.find();

    const metrics = {
      totalTransactions: escrows.length,
      successfulTransactions: escrows.filter(e => e.status === EscrowStatus.RELEASED).length,
      disputedTransactions: escrows.filter(e => e.status === EscrowStatus.DISPUTED).length,
      cancelledTransactions: escrows.filter(e => e.status === EscrowStatus.CANCELLED).length,
      totalValue: escrows.reduce((sum, e) => sum + e.amount, 0),
      averageTransactionValue: escrows.length > 0 ? escrows.reduce((sum, e) => sum + e.amount, 0) / escrows.length : 0,
      blockchainTransactions: escrows.filter(e => e.blockchainHash).length,
      smartContractTransactions: escrows.filter(e => e.smartContractAddress).length,
    };

    return metrics;
  }

  /**
   * Private helper methods
   */

  private simulateBlockchainTransaction(action: string, escrow: EscrowTransaction): string {
    // Simulate blockchain transaction hash generation
    const timestamp = Date.now();
    const data = `${action}-${escrow.id}-${timestamp}`;
    return `0x${data.split('').map(c => c.charCodeAt(0).toString(16)).join('').substring(0, 64)}`;
  }

  private calculateAverageProcessingTime(escrows: EscrowTransaction[]): number {
    const completedEscrows = escrows.filter(e => e.createdAt && e.releasedAt);
    
    if (completedEscrows.length === 0) return 0;

    const totalTime = completedEscrows.reduce((sum, e) => {
      return sum + (e.releasedAt!.getTime() - e.createdAt.getTime());
    }, 0);

    return totalTime / completedEscrows.length / (1000 * 60 * 60); // Convert to hours
  }
}
