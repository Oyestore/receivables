import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VoiceAuthService } from '../Module_01_Smart_Invoice_Generation/src/services/voice-auth.service';
import { PersonalizationService } from '../Module_01_Smart_Invoice_Generation/src/services/personalization.service';
import { ConstraintService } from '../Module_01_Smart_Invoice_Generation/src/services/constraint.service';
import { Invoice } from '../Module_01_Smart_Invoice_Generation/src/entities/invoice.entity';
import { Constraint } from '../Module_01_Smart_Invoice_Generation/src/entities/constraint.entity';
import { VoiceBiometric } from '../Module_01_Smart_Invoice_Generation/src/entities/voice-biometric.entity';
import { PersonalizationRule } from '../Module_01_Smart_Invoice_Generation/src/entities/personalization-rule.entity';

describe('Phase 5 Ghost Features (Logic Verification)', () => {
    let app: INestApplication;
    let voiceAuthService: VoiceAuthService;
    let personalizationService: PersonalizationService;
    let constraintService: ConstraintService;

    // Mock Repositories
    const mockInvoiceRepo = {
        createQueryBuilder: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ avgDays: '50' }), // Simulate DSO > 45
        })),
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
    };

    const mockConstraintRepo = {
        create: jest.fn((dto) => dto),
        save: jest.fn((dto) => Promise.resolve({ id: 'mock-id', ...dto })),
        find: jest.fn().mockResolvedValue([]),
    };

    const mockVoiceBiometricRepo = {
        create: jest.fn((dto) => dto),
        save: jest.fn((dto) => Promise.resolve({ id: 'mock-id', ...dto })),
        findOne: jest.fn().mockResolvedValue({
            id: 'mock-auth-id',
            userId: 'user-1',
            voicePrintHash: 'mock-hash',
            isVerified: true
        }),
    };

    const mockPersonalizationRuleRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn().mockResolvedValue([]),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [
                VoiceAuthService,
                PersonalizationService,
                ConstraintService,
                { provide: getRepositoryToken(Invoice), useValue: mockInvoiceRepo },
                { provide: getRepositoryToken(Constraint), useValue: mockConstraintRepo },
                { provide: getRepositoryToken(VoiceBiometric), useValue: mockVoiceBiometricRepo },
                { provide: getRepositoryToken(PersonalizationRule), useValue: mockPersonalizationRuleRepo },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        voiceAuthService = moduleFixture.get<VoiceAuthService>(VoiceAuthService);
        personalizationService = moduleFixture.get<PersonalizationService>(PersonalizationService);
        constraintService = moduleFixture.get<ConstraintService>(ConstraintService);
    });

    afterAll(async () => {
        await app.close();
    });

    // --- Voice Biometrics Tests ---
    describe('VoiceAuthService (Wav2Vec 2.0 Logic)', () => {
        it('should verify voice match with high similarity', async () => {
            // Mock extractVoiceEmbeddings to return vectors capable of High Similarity (1.0 for same input)
            jest.spyOn(voiceAuthService as any, 'extractVoiceEmbeddings').mockResolvedValue(Array(128).fill(1));

            const result = await voiceAuthService.verifyVoice('user-1', 'sample-audio');
            expect(result).toBe(true);
        });

        it('should calculate cosine similarity correctly', () => {
            const vecA = [1, 0, 0];
            const vecB = [1, 0, 0];
            const similarity = (voiceAuthService as any).calculateSimilarity(vecA, vecB);
            expect(similarity).toBeCloseTo(1.0);
        });

        it('should calculate dissimilarity correctly', () => {
            const vecA = [1, 0, 0];
            const vecB = [0, 1, 0];
            const similarity = (voiceAuthService as any).calculateSimilarity(vecA, vecB);
            expect(similarity).toBeCloseTo(0.0);
        });
    });

    // --- Personalization Engine Tests ---
    describe('PersonalizationService (Recursive Rule Engine)', () => {
        it('should evaluate simple equality condition', () => {
            const context = { invoice: { amount: 100 } };
            const rule = { 'invoice.amount': 100 };
            const result = (personalizationService as any).evaluateCondition(rule, context);
            expect(result).toBe(true);
        });

        it('should evaluate nested object access', () => {
            const context = { user: { profile: { role: 'admin' } } };
            const rule = { 'user.profile.role': 'admin' };
            const result = (personalizationService as any).evaluateCondition(rule, context);
            expect(result).toBe(true);
        });

        it('should evaluate $gt operator', () => {
            const context = { invoice: { amount: 150 } };
            const rule = { 'invoice.amount': { '$gt': 100 } };
            const result = (personalizationService as any).evaluateCondition(rule, context);
            expect(result).toBe(true);
        });

        it('should evaluate $and operator', () => {
            const context = { invoice: { amount: 150, status: 'PAID' } };
            const rule = {
                '$and': [
                    { 'invoice.amount': { '$gt': 100 } },
                    { 'invoice.status': 'PAID' }
                ]
            };
            const result = (personalizationService as any).evaluateCondition(rule, context);
            expect(result).toBe(true);
        });

        it('should return false if condition not met', () => {
            const context = { invoice: { amount: 50 } };
            const rule = { 'invoice.amount': { '$gt': 100 } };
            const result = (personalizationService as any).evaluateCondition(rule, context);
            expect(result).toBe(false);
        });
    });

    // --- Constraint Integration Tests ---
    describe('ConstraintService (SQL Analysis)', () => {
        it('should identify High DSO constraint', async () => {
            const result = await constraintService.identifyConstraints('tenant-1');

            expect(result.length).toBeGreaterThan(0);
            expect(result[0].description).toContain('exceeding target of 45');
            expect(mockConstraintRepo.save).toHaveBeenCalled();
        });
    });
});
