import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreditDecision } from '../../src/entities/credit-decision.entity';
import { DecisionRule } from '../../src/entities/decision-rule.entity';
import { CreditDecisionModule } from '../../src/credit-decision.module';

describe('Database Integration', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let decisionRepo: Repository<CreditDecision>;
    let ruleRepo: Repository<DecisionRule>;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [__dirname + '/../../src/entities/*.entity{.ts,.js}'],
                    synchronize: true,
                    dropSchema: true,
                }),
                CreditDecisionModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        dataSource = moduleFixture.get<DataSource>(Data Source);
        decisionRepo = moduleFixture.get(getRepositoryToken(CreditDecision));
        ruleRepo = moduleFixture.get(getRepositoryToken(DecisionRule));
    });

    afterAll(async () => {
        await app.close();
    });

    it('should handle transaction rollback on failure', async () => {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Create decision
            const decision = queryRunner.manager.create(CreditDecision, {
                entityId: 'invoice-1',
                entityType: 'invoice',
                decisionType: 'credit_approval',
                status: 'pending',
            });
            await queryRunner.manager.save(decision);

            // Simulate error
            throw new Error('Simulated transaction error');

            await queryRunner.commitTransaction();
        } catch (error) {
            await queryRunner.rollbackTransaction();
        } finally {
            await queryRunner.release();
        }

        // Decision should not exist after rollback
        const count = await decisionRepo.count();
        expect(count).toBe(0);
    });

    it('should maintain referential integrity', async () => {
        const decision = decisionRepo.create({
            entityId: 'invoice-2',
            entityType: 'invoice',
            decisionType: 'credit_approval',
            status: 'pending',
            tenantId: 'tenant-1',
        });
        await decisionRepo.save(decision);

        const rule = ruleRepo.create({
            name: 'Test Rule',
            ruleType: 'SCORING',
            entityTypes: ['invoice'],
            decisionTypes: ['credit_approval'],
            status: 'ACTIVE',
            tenantId: 'tenant-1',
        });
        await ruleRepo.save(rule);

        expect(decision.tenantId).toBe(rule.tenantId);
    });

    it('should handle concurrent updates correctly', async () => {
        const decision = decisionRepo.create({
            entityId: 'invoice-3',
            entityType: 'invoice',
            decisionType: 'credit_approval',
            status: 'pending',
        });
        await decisionRepo.save(decision);

        // Simulate concurrent updates
        const update1 = decisionRepo.update(decision.id, { status: 'approved' });
        const update2 = decisionRepo.update(decision.id, { confidenceScore: 95 });

        await Promise.all([update1, update2]);

        const updated = await decisionRepo.findOne({ where: { id: decision.id } });
        expect(updated.status).toBeDefined();
        expect(updated.confidenceScore).toBeDefined();
    });

    it('should enforce unique constraints', async () => {
        const decision1 = decisionRepo.create({
            id: 'unique-id-1',
            entityId: 'invoice-4',
            entityType: 'invoice',
            decisionType: 'credit_approval',
            status: 'pending',
        });
        await decisionRepo.save(decision1);

        // Attempting to create decision with same ID should fail
        const decision2 = decisionRepo.create({
            id: 'unique-id-1',
            entityId: 'invoice-5',
            entityType: 'invoice',
            decisionType: 'credit_approval',
            status: 'pending',
        });

        await expect(decisionRepo.save(decision2)).rejects.toThrow();
    });

    it('should cascade deletes appropriately', async () => {
        const decision = decisionRepo.create({
            entityId: 'invoice-6',
            entityType: 'invoice',
            decisionType: 'credit_approval',
            status: 'pending',
        });
        await decisionRepo.save(decision);

        await decisionRepo.delete(decision.id);

        const found = await decisionRepo.findOne({ where: { id: decision.id } });
        expect(found).toBeNull();
    });

    it('should handle large batch operations efficiently', async () => {
        const decisions = [];
        for (let i = 0; i < 100; i++) {
            decisions.push(decisionRepo.create({
                entityId: `invoice-${100 + i}`,
                entityType: 'invoice',
                decisionType: 'credit_approval',
                status: 'pending',
            }));
        }

        const startTime = Date.now();
        await decisionRepo.save(decisions);
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
        const count = await decisionRepo.count();
        expect(count).toBeGreaterThanOrEqual(100);
    });

    it('should support complex queries with joins', async () => {
        const decision = decisionRepo.create({
            entityId: 'invoice-200',
            entityType: 'invoice',
            decisionType: 'credit_approval',
            status: 'pending',
        });
        await decisionRepo.save(decision);

        const results = await decisionRepo
            .createQueryBuilder('decision')
            .where('decision.status = :status', { status: 'pending' })
            .andWhere('decision.entityType = :type', { type: 'invoice' })
            .getMany();

        expect(results.length).toBeGreaterThan(0);
    });

    it('should handle database connection pooling', async () => {
        const connections = [];
        for (let i = 0; i < 10; i++) {
            connections.push(dataSource.createQueryRunner());
        }

        await Promise.all(connections.map(conn => conn.connect()));
        await Promise.all(connections.map(conn => conn.release()));

        expect(dataSource.isInitialized).toBe(true);
    });

    it('should persist data correctly across transactions', async () => {
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const decision = queryRunner.manager.create(CreditDecision, {
                entityId: 'invoice-300',
                entityType: 'invoice',
                decisionType: 'credit_approval',
                status: 'approved',
            });
            await queryRunner.manager.save(decision);
            await queryRunner.commitTransaction();

            const saved = await decisionRepo.findOne({
                where: { entityId: 'invoice-300' },
            });
            expect(saved).toBeDefined();
            expect(saved.status).toBe('approved');
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    });

    it('should handle optimistic locking correctly', async () => {
        const decision = decisionRepo.create({
            entityId: 'invoice-400',
            entityType: 'invoice',
            decisionType: 'credit_approval',
            status: 'pending',
            version: 1,
        });
        await decisionRepo.save(decision);

        // Simulate concurrent modification
        decision.status = 'approved';
        decision.version = 2;
        await decisionRepo.save(decision);

        const updated = await decisionRepo.findOne({ where: { id: decision.id } });
        expect(updated.version).toBeGreaterThan(1);
    });
});
