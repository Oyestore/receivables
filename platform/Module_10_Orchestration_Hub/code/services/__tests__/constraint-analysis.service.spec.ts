/**
 * ConstraintAnalysisService Unit Tests
 * 
 * Comprehensive test coverage for constraint identification and analysis
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConstraintAnalysisService } from '../constraint-analysis.service';
import { Invoice } from '../../../../Module_01_Invoice_Management/code/entities/invoice.entity';
import { Payment } from '../../../../Module_03_Payment_Integration/code/entities/payment.entity';
import { CreditProfile } from '../../../../Module_06_Credit_Scoring/code/entities/credit-profile.entity';
import { ConstraintType, ConstraintSeverity } from '../../types/orchestration.types';

describe('ConstraintAnalysisService', () => {
    let service: ConstraintAnalysisService;
    let invoiceRepository: Repository<Invoice>;
    let paymentRepository: Repository<Payment>;
    let creditRepository: Repository<CreditProfile>;

    const mockInvoiceRepository = {
        createQueryBuilder: jest.fn(),
    };

    const mockPaymentRepository = {
        createQueryBuilder: jest.fn(),
    };

    const mockCreditRepository = {
        createQueryBuilder: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConstraintAnalysisService,
                {
                    provide: getRepositoryToken(Invoice),
                    useValue: mockInvoiceRepository,
                },
                {
                    provide: getRepositoryToken(Payment),
                    useValue: mockPaymentRepository,
                },
                {
                    provide: getRepositoryToken(CreditProfile),
                    useValue: mockCreditRepository,
                },
            ],
        }).compile();

        service = module.get<ConstraintAnalysisService>(ConstraintAnalysisService);
        invoiceRepository = module.get<Repository<Invoice>>(getRepositoryToken(Invoice));
        paymentRepository = module.get<Repository<Payment>>(getRepositoryToken(Payment));
        creditRepository = module.get<Repository<CreditProfile>>(getRepositoryToken(CreditProfile));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('analyzeConstraints', () => {
        it('should identify cash flow constraints when outstanding exceeds threshold', async () => {
            // Mock cash flow data showing high outstanding
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({
                    total_outstanding: '500000',
                    overdue_count: '25',
                    avg_overdue_days: '45',
                    total_overdue_amount: '300000',
                    affected_customers: '15',
                    largest_outstanding: '100000',
                    p90_outstanding: '80000',
                }),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mockInvoiceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockPaymentRepository.createQueryBuilder.mockReturnValue({
                ...mockQueryBuilder,
                getRawOne: jest.fn().mockResolvedValue({
                    avg_collection_days: '35',
                    failure_rate: '3',
                    total_payments: '100',
                    successful_payments: '97',
                    collection_days_std: '10',
                    median_collection_days: '32',
                    p90_collection_days: '50',
                }),
            });
            mockCreditRepository.createQueryBuilder.mockReturnValue({
                ...mockQueryBuilder,
                getRawOne: jest.fn().mockResolvedValue({
                    high_risk_count: '3',
                    avg_score: '680',
                    min_score: '550',
                    p25_score: '620',
                    total_customers: '50',
                    critical_exposure: '50000',
                    total_credit_limit: '1000000',
                }),
            });

            const result = await service.analyzeConstraints('tenant-123');

            expect(result.constraints.length).toBeGreaterThan(0);

            const cashFlowConstraint = result.constraints.find(
                c => c.constraint_type === ConstraintType.CASH_FLOW
            );

            expect(cashFlowConstraint).toBeDefined();
            expect(cashFlowConstraint?.severity).toBe(ConstraintSeverity.CRITICAL);
            expect(cashFlowConstraint?.impact_score).toBeGreaterThan(0);
            expect(cashFlowConstraint?.identified_data.total_outstanding).toBe(500000);
        });

        it('should identify primary constraint based on highest impact score', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({
                    total_outstanding: '300000', // High but not critical
                    overdue_count: '15',
                    avg_overdue_days: '35',
                    total_overdue_amount: '180000',
                    affected_customers: '10',
                    largest_outstanding: '50000',
                    p90_outstanding: '40000',
                }),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mockInvoiceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockPaymentRepository.createQueryBuilder.mockReturnValue({
                ...mockQueryBuilder,
                getRawOne: jest.fn().mockResolvedValue({
                    avg_collection_days: '65', // Very high - should be primary constraint
                    failure_rate: '12',
                    total_payments: '100',
                    successful_payments: '88',
                    collection_days_std: '25',
                    median_collection_days: '60',
                    p90_collection_days: '90',
                }),
            });
            mockCreditRepository.createQueryBuilder.mockReturnValue({
                ...mockQueryBuilder,
                getRawOne: jest.fn().mockResolvedValue({
                    high_risk_count: '2',
                    avg_score: '700',
                    min_score: '650',
                    p25_score: '680',
                    total_customers: '50',
                    critical_exposure: '30000',
                    total_credit_limit: '1000000',
                }),
            });

            const result = await service.analyzeConstraints('tenant-123');

            expect(result.primary_constraint).toBeDefined();
            expect(result.primary_constraint?.constraint_type).toBe(
                ConstraintType.COLLECTION_EFFICIENCY
            );
        });

        it('should return empty constraints when no issues detected', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({
                    total_outstanding: '50000', // Low
                    overdue_count: '2', // Low
                    avg_overdue_days: '10', // Low
                    total_overdue_amount: '10000',
                    affected_customers: '2',
                    largest_outstanding: '10000',
                    p90_outstanding: '8000',
                }),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mockInvoiceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockPaymentRepository.createQueryBuilder.mockReturnValue({
                ...mockQueryBuilder,
                getRawOne: jest.fn().mockResolvedValue({
                    avg_collection_days: '25', // Good
                    failure_rate: '2', // Low
                    total_payments: '100',
                    successful_payments: '98',
                    collection_days_std: '8',
                    median_collection_days: '22',
                    p90_collection_days: '35',
                }),
            });
            mockCreditRepository.createQueryBuilder.mockReturnValue({
                ...mockQueryBuilder,
                getRawOne: jest.fn().mockResolvedValue({
                    high_risk_count: '1',
                    avg_score: '720',
                    min_score: '680',
                    p25_score: '700',
                    total_customers: '50',
                    critical_exposure: '10000',
                    total_credit_limit: '1000000',
                }),
            });

            const result = await service.analyzeConstraints('tenant-123');

            expect(result.constraints.length).toBe(0);
            expect(result.primary_constraint).toBeNull();
        });

        it('should apply cross-constraint multipliers correctly', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({
                    total_outstanding: '400000',
                    overdue_count: '20',
                    avg_overdue_days: '50',
                    total_overdue_amount: '250000',
                    affected_customers: '12',
                    largest_outstanding: '80000',
                    p90_outstanding: '60000',
                }),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mockInvoiceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockPaymentRepository.createQueryBuilder.mockReturnValue({
                ...mockQueryBuilder,
                getRawOne: jest.fn().mockResolvedValue({
                    avg_collection_days: '55',
                    failure_rate: '8',
                    total_payments: '100',
                    successful_payments: '92',
                    collection_days_std: '18',
                    median_collection_days: '50',
                    p90_collection_days: '75',
                }),
            });
            mockCreditRepository.createQueryBuilder.mockReturnValue({
                ...mockQueryBuilder,
                getRawOne: jest.fn().mockResolvedValue({
                    high_risk_count: '8',
                    avg_score: '620',
                    min_score: '500',
                    p25_score: '580',
                    total_customers: '50',
                    critical_exposure: '150000',
                    total_credit_limit: '800000',
                }),
            });

            const result = await service.analyzeConstraints('tenant-123');

            // Should have all three constraint types
            expect(result.constraints.length).toBe(3);

            // Find cash flow constraint - should have compound multiplier
            const cashFlowConstraint = result.constraints.find(
                c => c.constraint_type === ConstraintType.CASH_FLOW
            );

            // Impact score should be amplified due to:
            // - Credit risk present (1.3x multiplier)
            // - Collection issues present (1.2x multiplier)
            expect(cashFlowConstraint?.impact_score).toBeGreaterThan(50);
        });

        it('should include root causes in constraint analysis', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({
                    total_outstanding: '600000',
                    overdue_count: '30',
                    avg_overdue_days: '60', // High
                    total_overdue_amount: '400000',
                    affected_customers: '20',
                    largest_outstanding: '200000', // High concentration
                    p90_outstanding: '150000',
                }),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mockInvoiceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockPaymentRepository.createQueryBuilder.mockReturnValue({
                ...mockQueryBuilder,
                getRawOne: jest.fn().mockResolvedValue({
                    avg_collection_days: '40',
                    failure_rate: '4',
                    total_payments: '100',
                    successful_payments: '96',
                    collection_days_std: '12',
                    median_collection_days: '38',
                    p90_collection_days: '55',
                }),
            });
            mockCreditRepository.createQueryBuilder.mockReturnValue({
                ...mockQueryBuilder,
                getRawOne: jest.fn().mockResolvedValue({
                    high_risk_count: '4',
                    avg_score: '680',
                    min_score: '600',
                    p25_score: '650',
                    total_customers: '50',
                    critical_exposure: '80000',
                    total_credit_limit: '1000000',
                }),
            });

            const result = await service.analyzeConstraints('tenant-123');

            const cashFlowConstraint = result.constraints.find(
                c => c.constraint_type === ConstraintType.CASH_FLOW
            );

            expect(cashFlowConstraint?.root_causes).toBeDefined();
            expect(cashFlowConstraint?.root_causes?.length).toBeGreaterThan(0);

            // Should identify extended payment delays
            expect(
                cashFlowConstraint?.root_causes?.some(cause =>
                    cause.includes('Extended payment delays')
                )
            ).toBe(true);

            // Should identify concentration risk
            expect(
                cashFlowConstraint?.root_causes?.some(cause =>case.includes('concentration')
                )
            ).toBe(true);
        });
    });

    describe('Confidence Score Calculation', () => {
        it('should provide full confidence with reasonable data', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({
                    total_outstanding: '200000',
                    overdue_count: '10',
                    avg_overdue_days: '30',
                    total_overdue_amount: '120000',
                    affected_customers: '8',
                    largest_outstanding: '40000',
                    p90_outstanding: '35000',
                }),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mockInvoiceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockPaymentRepository.createQueryBuilder.mockReturnValue({
                ...mockQueryBuilder,
                getRawOne: jest.fn().mockResolvedValue({
                    avg_collection_days: '40',
                    failure_rate: '4',
                    total_payments: '100',
                    successful_payments: '96',
                    collection_days_std: '12',
                    median_collection_days: '38',
                    p90_collection_days: '55',
                }),
            });
            mockCreditRepository.createQueryBuilder.mockReturnValue({
                ...mockQueryBuilder,
                getRawOne: jest.fn().mockResolvedValue({
                    high_risk_count: '3',
                    avg_score: '690',
                    min_score: '620',
                    p25_score: '660',
                    total_customers: '50',
                    critical_exposure: '60000',
                    total_credit_limit: '1000000',
                }),
            });

            const result = await service.analyzeConstraints('tenant-123');

            // Should have good confidence with reasonable constraint count and analysis time
            expect(result.confidence_score).toBeGreaterThan(70);
            expect(result.confidence_score).toBeLessThanOrEqual(100);
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            mockInvoiceRepository.createQueryBuilder.mockImplementation(() => {
                throw new Error('Database connection failed');
            });

            await expect(service.analyzeConstraints('tenant-123')).rejects.toThrow(
                'Database connection failed'
            );
        });

        it('should handle null/undefined data gracefully', async () => {
            const mockQueryBuilder = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({
                    total_outstanding: null,
                    overdue_count: null,
                    avg_overdue_days: null,
                }),
                getRawMany: jest.fn().mockResolvedValue([]),
            };

            mockInvoiceRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockPaymentRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockCreditRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.analyzeConstraints('tenant-123');

            // Should handle nulls and return valid result (likely empty constraints)
            expect(result).toBeDefined();
            expect(result.constraints).toBeDefined();
        });
    });
});
