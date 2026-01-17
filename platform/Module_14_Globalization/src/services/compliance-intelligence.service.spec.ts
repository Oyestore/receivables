import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceIntelligenceService } from './compliance-intelligence.service';
import { createMockRepository } from '../../tests/setup';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ComplianceRuleEntity } from '../entities/intelligence.entity';
import { TestFixtures } from '../../tests/fixtures';

describe('ComplianceIntelligenceService', () => {
    let service: ComplianceIntelligenceService;
    let complianceRuleRepo: any;

    beforeEach(async () => {
        complianceRuleRepo = createMockRepository<ComplianceRuleEntity>();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ComplianceIntelligenceService,
                {
                    provide: getRepositoryToken(ComplianceRuleEntity),
                    useValue: complianceRuleRepo,
                },
            ],
        }).compile();

        service = module.get<ComplianceIntelligenceService>(ComplianceIntelligenceService);
    });

    describe('checkCompliance', () => {
        it('should check compliance for region and transaction', async () => {
            const mockRules = [
                TestFixtures.createMockComplianceRule({
                    region: 'EU',
                    ruleCode: 'GDPR-001',
                    ruleCategory: 'data_privacy',
                    severity: 'high',
                    isActive: true,
                }),
                TestFixtures.createMockComplianceRule({
                    region: 'EU',
                    ruleCode: 'GDPR-002',
                    ruleCategory: 'data_retention',
                    severity: 'medium',
                    isActive: true,
                }),
            ];

            complianceRuleRepo.find.mockResolvedValue(mockRules);

            const result = await service.checkCompliance('EU', {
                dataProcessing: true,
                dataRetention: 90,
            });

            expect(result.compliant).toBeDefined();
            expect(result.rules).toHaveLength(2);
            expect(result.violations).toBeDefined();
        });

        it('should identify GDPR violations', async () => {
            const mockRules = [
                TestFixtures.createMockComplianceRule({
                    region: 'EU',
                    ruleCode: 'GDPR-001',
                    severity: 'critical',
                }),
            ];

            complianceRuleRepo.find.mockResolvedValue(mockRules);

            const result = await service.checkCompliance('EU', {
                dataProcessing: true,
                consentObtained: false, // Violation
            });

            expect(result.compliant).toBe(false);
            expect(result.violations.length).toBeGreaterThan(0);
        });
    });

    describe('getActiveRulesForRegion', () => {
        it('should return active compliance rules for region', async () => {
            const mockRules = [
                TestFixtures.createMockComplianceRule({ region: 'US', isActive: true }),
                TestFixtures.createMockComplianceRule({ region: 'US', isActive: false }),
            ];

            complianceRuleRepo.find.mockResolvedValue([mockRules[0]]);

            const result = await service.getActiveRulesForRegion('US');

            expect(result).toHaveLength(1);
            expect(result[0].isActive).toBe(true);
        });
    });

    describe('assessRiskLevel', () => {
        it('should assess compliance risk level', async () => {
            const violations = [
                { severity: 'critical', ruleCode: 'GDPR-001' },
                { severity: 'high', ruleCode: 'GDPR-002' },
            ];

            const result = await service.assessRiskLevel(violations);

            expect(result.riskLevel).toMatch(/critical|high|medium|low/);
            expect(result.score).toBeGreaterThan(0);
        });

        it('should return low risk for no violations', async () => {
            const result = await service.assessRiskLevel([]);

            expect(result.riskLevel).toBe('low');
            expect(result.score).toBe(0);
        });
    });

    describe('getCategoryRules', () => {
        it('should filter rules by category', async () => {
            const mockRules = [
                TestFixtures.createMockComplianceRule({ ruleCategory: 'data_privacy' }),
                TestFixtures.createMockComplianceRule({ ruleCategory: 'financial' }),
                TestFixtures.createMockComplianceRule({ ruleCategory: 'data_privacy' }),
            ];

            complianceRuleRepo.find.mockResolvedValue(
                mockRules.filter(r => r.ruleCategory === 'data_privacy')
            );

            const result = await service.getCategoryRules('data_privacy');

            expect(result).toHaveLength(2);
            expect(result.every(r => r.ruleCategory === 'data_privacy')).toBe(true);
        });
    });

    describe('validateCrossB orderTransaction', () => {
        it('should validate cross-border transaction compliance', async () => {
            const transaction = {
                fromCountry: 'US',
                toCountry: 'EU',
                amount: 10000,
                currency: 'USD',
            };

            const mockRules = [
                TestFixtures.createMockComplianceRule({ region: 'EU', isActive: true }),
            ];

            complianceRuleRepo.find.mockResolvedValue(mockRules);

            const result = await service.validateCrossBorderTransaction(transaction);

            expect(result.compliant).toBeDefined();
            expect(result.applicableRules).toBeDefined();
        });
    });
});
