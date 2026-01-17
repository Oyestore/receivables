import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone } from '../src/entities/milestone.entity';
import { MilestoneWorkflow } from '../src/entities/milestone-workflow.entity';
import { MilestoneStatus, MilestoneType, MilestonePriority } from '../src/entities/milestone.entity';

describe('Milestone Workflows API (e2e)', () => {
  let app: INestApplication;
  let milestoneRepository: Repository<Milestone>;
  let workflowRepository: Repository<MilestoneWorkflow>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    milestoneRepository = moduleFixture.get<Repository<Milestone>>(getRepositoryToken(Milestone));
    workflowRepository = moduleFixture.get<Repository<MilestoneWorkflow>>(getRepositoryToken(MilestoneWorkflow));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await milestoneRepository.clear();
    await workflowRepository.clear();
  });

  describe('Health Check', () => {
    it('/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('service', 'milestone-workflows');
        });
    });
  });

  describe('Milestones', () => {
    const testTenantId = 'tenant-test-001';
    const testProjectId = 'project-test-001';
    let testWorkflow: MilestoneWorkflow;

    beforeEach(async () => {
      // Create test workflow
      testWorkflow = await workflowRepository.save({
        name: 'Test Workflow',
        tenantId: testTenantId,
        projectId: testProjectId,
        status: 'DRAFT',
        workflowType: 'LINEAR',
        totalMilestones: 0,
        completedMilestones: 0,
        progressPercentage: 0,
        createdBy: 'test-user',
        updatedBy: 'test-user',
        isActive: true,
        isDeleted: false,
      });
    });

    describe('POST /api/v1/milestones', () => {
      it('should create a new milestone', () => {
        const createMilestoneDto = {
          title: 'Test Milestone',
          description: 'Test milestone description',
          tenantId: testTenantId,
          projectId: testProjectId,
          workflowId: testWorkflow.id,
          milestoneType: MilestoneType.DELIVERABLE,
          priority: MilestonePriority.HIGH,
          value: 100000,
          currency: 'INR',
          dueDate: '2025-12-31',
          estimatedHours: 40,
        };

        return request(app.getHttpServer())
          .post('/api/v1/milestones')
          .send(createMilestoneDto)
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('id');
            expect(res.body.title).toBe(createMilestoneDto.title);
            expect(res.body.status).toBe(MilestoneStatus.DRAFT);
            expect(res.body.progressPercentage).toBe(0);
            expect(res.body.version).toBe(1);
          });
      });

      it('should validate required fields', () => {
        const invalidDto = {
          description: 'Missing required fields',
        };

        return request(app.getHttpServer())
          .post('/api/v1/milestones')
          .send(invalidDto)
          .expect(400);
      });

      it('should reject invalid workflow ID', () => {
        const createMilestoneDto = {
          title: 'Test Milestone',
          tenantId: testTenantId,
          projectId: testProjectId,
          workflowId: 'invalid-workflow-id',
        };

        return request(app.getHttpServer())
          .post('/api/v1/milestones')
          .send(createMilestoneDto)
          .expect(404);
      });
    });

    describe('GET /api/v1/milestones', () => {
      beforeEach(async () => {
        // Create test milestones
        await milestoneRepository.save([
          {
            title: 'Milestone 1',
            tenantId: testTenantId,
            projectId: testProjectId,
            workflowId: testWorkflow.id,
            status: MilestoneStatus.DRAFT,
            milestoneType: MilestoneType.DELIVERABLE,
            priority: MilestonePriority.HIGH,
            createdBy: 'test-user',
            updatedBy: 'test-user',
            isActive: true,
            isDeleted: false,
          },
          {
            title: 'Milestone 2',
            tenantId: testTenantId,
            projectId: testProjectId,
            workflowId: testWorkflow.id,
            status: MilestoneStatus.IN_PROGRESS,
            milestoneType: MilestoneType.PAYMENT,
            priority: MilestonePriority.MEDIUM,
            createdBy: 'test-user',
            updatedBy: 'test-user',
            isActive: true,
            isDeleted: false,
          },
        ]);
      });

      it('should return all milestones for tenant', () => {
        return request(app.getHttpServer())
          .get('/api/v1/milestones')
          .query({ tenantId: testTenantId })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('milestones');
            expect(res.body).toHaveProperty('total');
            expect(Array.isArray(res.body.milestones)).toBe(true);
            expect(res.body.milestones.length).toBe(2);
          });
      });

      it('should filter milestones by status', () => {
        return request(app.getHttpServer())
          .get('/api/v1/milestones')
          .query({ tenantId: testTenantId, status: MilestoneStatus.DRAFT })
          .expect(200)
          .expect((res) => {
            expect(res.body.milestones.length).toBe(1);
            expect(res.body.milestones[0].status).toBe(MilestoneStatus.DRAFT);
          });
      });

      it('should filter milestones by project', () => {
        return request(app.getHttpServer())
          .get('/api/v1/milestones')
          .query({ tenantId: testTenantId, projectId: testProjectId })
          .expect(200)
          .expect((res) => {
            expect(res.body.milestones.length).toBe(2);
            res.body.milestones.forEach((milestone: any) => {
              expect(milestone.projectId).toBe(testProjectId);
            });
          });
      });

      it('should search milestones by title', () => {
        return request(app.getHttpServer())
          .get('/api/v1/milestones')
          .query({ tenantId: testTenantId, search: 'Milestone 1' })
          .expect(200)
          .expect((res) => {
            expect(res.body.milestones.length).toBe(1);
            expect(res.body.milestones[0].title).toContain('Milestone 1');
          });
      });
    });

    describe('GET /api/v1/milestones/:id', () => {
      let testMilestone: Milestone;

      beforeEach(async () => {
        testMilestone = await milestoneRepository.save({
          title: 'Test Milestone Detail',
          tenantId: testTenantId,
          projectId: testProjectId,
          workflowId: testWorkflow.id,
          status: MilestoneStatus.ACTIVE,
          milestoneType: MilestoneType.DELIVERABLE,
          priority: MilestonePriority.HIGH,
          createdBy: 'test-user',
          updatedBy: 'test-user',
          isActive: true,
          isDeleted: false,
        });
      });

      it('should return a specific milestone', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/milestones/${testMilestone.id}`)
          .query({ tenantId: testTenantId })
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(testMilestone.id);
            expect(res.body.title).toBe(testMilestone.title);
          });
      });

      it('should return 404 for non-existent milestone', () => {
        return request(app.getHttpServer())
          .get('/api/v1/milestones/non-existent-id')
          .query({ tenantId: testTenantId })
          .expect(404);
      });
    });

    describe('PATCH /api/v1/milestones/:id', () => {
      let testMilestone: Milestone;

      beforeEach(async () => {
        testMilestone = await milestoneRepository.save({
          title: 'Original Title',
          tenantId: testTenantId,
          projectId: testProjectId,
          workflowId: testWorkflow.id,
          status: MilestoneStatus.DRAFT,
          milestoneType: MilestoneType.DELIVERABLE,
          priority: MilestonePriority.MEDIUM,
          createdBy: 'test-user',
          updatedBy: 'test-user',
          isActive: true,
          isDeleted: false,
        });
      });

      it('should update a milestone', () => {
        const updateDto = {
          title: 'Updated Title',
          description: 'Updated description',
          tenantId: testTenantId,
          priority: MilestonePriority.HIGH,
        };

        return request(app.getHttpServer())
          .patch(`/api/v1/milestones/${testMilestone.id}`)
          .send(updateDto)
          .expect(200)
          .expect((res) => {
            expect(res.body.title).toBe(updateDto.title);
            expect(res.body.description).toBe(updateDto.description);
            expect(res.body.priority).toBe(updateDto.priority);
            expect(res.body.version).toBe(2);
          });
      });

      it('should reject circular dependencies', () => {
        const updateDto = {
          tenantId: testTenantId,
          dependencies: [testMilestone.id], // Self-dependency
        };

        return request(app.getHttpServer())
          .patch(`/api/v1/milestones/${testMilestone.id}`)
          .send(updateDto)
          .expect(400);
      });
    });

    describe('DELETE /api/v1/milestones/:id', () => {
      let testMilestone: Milestone;

      beforeEach(async () => {
        testMilestone = await milestoneRepository.save({
          title: 'Milestone to Delete',
          tenantId: testTenantId,
          projectId: testProjectId,
          workflowId: testWorkflow.id,
          status: MilestoneStatus.DRAFT,
          milestoneType: MilestoneType.DELIVERABLE,
          priority: MilestonePriority.LOW,
          createdBy: 'test-user',
          updatedBy: 'test-user',
          isActive: true,
          isDeleted: false,
        });
      });

      it('should delete a milestone', () => {
        return request(app.getHttpServer())
          .delete(`/api/v1/milestones/${testMilestone.id}`)
          .query({ tenantId: testTenantId })
          .expect(204);
      });

      it('should reject deletion of milestone in progress', () => {
        // Update milestone to in progress
        return milestoneRepository.update(testMilestone.id, {
          status: MilestoneStatus.IN_PROGRESS,
        }).then(() => {
          return request(app.getHttpServer())
            .delete(`/api/v1/milestones/${testMilestone.id}`)
            .query({ tenantId: testTenantId })
            .expect(400);
        });
      });
    });

    describe('PATCH /api/v1/milestones/:id/progress', () => {
      let testMilestone: Milestone;

      beforeEach(async () => {
        testMilestone = await milestoneRepository.save({
          title: 'Progress Milestone',
          tenantId: testTenantId,
          projectId: testProjectId,
          workflowId: testWorkflow.id,
          status: MilestoneStatus.IN_PROGRESS,
          milestoneType: MilestoneType.DELIVERABLE,
          priority: MilestonePriority.MEDIUM,
          progressPercentage: 25,
          createdBy: 'test-user',
          updatedBy: 'test-user',
          isActive: true,
          isDeleted: false,
        });
      });

      it('should update milestone progress', () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/milestones/${testMilestone.id}/progress`)
          .send({ progressPercentage: 75 })
          .expect(200)
          .expect((res) => {
            expect(res.body.progressPercentage).toBe(75);
          });
      });

      it('should reject invalid progress percentage', () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/milestones/${testMilestone.id}/progress`)
          .send({ progressPercentage: 150 })
          .expect(400);
      });

      it('should auto-complete milestone at 100% progress', () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/milestones/${testMilestone.id}/progress`)
          .send({ progressPercentage: 100 })
          .expect(200)
          .expect((res) => {
            expect(res.body.progressPercentage).toBe(100);
            expect(res.body.status).toBe(MilestoneStatus.COMPLETED);
          });
      });
    });

    describe('PATCH /api/v1/milestones/:id/start', () => {
      let testMilestone: Milestone;

      beforeEach(async () => {
        testMilestone = await milestoneRepository.save({
          title: 'Startable Milestone',
          tenantId: testTenantId,
          projectId: testProjectId,
          workflowId: testWorkflow.id,
          status: MilestoneStatus.ACTIVE,
          milestoneType: MilestoneType.DELIVERABLE,
          priority: MilestonePriority.MEDIUM,
          createdBy: 'test-user',
          updatedBy: 'test-user',
          isActive: true,
          isDeleted: false,
        });
      });

      it('should start a milestone', () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/milestones/${testMilestone.id}/start`)
          .expect(200)
          .expect((res) => {
            expect(res.body.status).toBe(MilestoneStatus.IN_PROGRESS);
            expect(res.body.progressPercentage).toBe(0);
            expect(res.body.startDate).toBeDefined();
          });
      });

      it('should reject starting already completed milestone', () => {
        return milestoneRepository.update(testMilestone.id, {
          status: MilestoneStatus.COMPLETED,
        }).then(() => {
          return request(app.getHttpServer())
            .patch(`/api/v1/milestones/${testMilestone.id}/start`)
            .expect(400);
        });
      });
    });

    describe('PATCH /api/v1/milestones/:id/complete', () => {
      let testMilestone: Milestone;

      beforeEach(async () => {
        testMilestone = await milestoneRepository.save({
          title: 'Completable Milestone',
          tenantId: testTenantId,
          projectId: testProjectId,
          workflowId: testWorkflow.id,
          status: MilestoneStatus.IN_PROGRESS,
          milestoneType: MilestoneType.DELIVERABLE,
          priority: MilestonePriority.MEDIUM,
          progressPercentage: 80,
          createdBy: 'test-user',
          updatedBy: 'test-user',
          isActive: true,
          isDeleted: false,
        });
      });

      it('should complete a milestone', () => {
        return request(app.getHttpServer())
          .patch(`/api/v1/milestones/${testMilestone.id}/complete`)
          .expect(200)
          .expect((res) => {
            expect(res.body.status).toBe(MilestoneStatus.COMPLETED);
            expect(res.body.progressPercentage).toBe(100);
            expect(res.body.completedDate).toBeDefined();
          });
      });

      it('should reject completing already completed milestone', () => {
        return milestoneRepository.update(testMilestone.id, {
          status: MilestoneStatus.COMPLETED,
        }).then(() => {
          return request(app.getHttpServer())
            .patch(`/api/v1/milestones/${testMilestone.id}/complete`)
            .expect(400);
        });
      });
    });

    describe('POST /api/v1/milestones/:id/duplicate', () => {
      let testMilestone: Milestone;

      beforeEach(async () => {
        testMilestone = await milestoneRepository.save({
          title: 'Original Milestone',
          tenantId: testTenantId,
          projectId: testProjectId,
          workflowId: testWorkflow.id,
          status: MilestoneStatus.COMPLETED,
          milestoneType: MilestoneType.DELIVERABLE,
          priority: MilestonePriority.HIGH,
          value: 50000,
          currency: 'INR',
          createdBy: 'test-user',
          updatedBy: 'test-user',
          isActive: true,
          isDeleted: false,
        });
      });

      it('should duplicate a milestone', () => {
        return request(app.getHttpServer())
          .post(`/api/v1/milestones/${testMilestone.id}/duplicate`)
          .send({ newTitle: 'Duplicated Milestone' })
          .expect(201)
          .expect((res) => {
            expect(res.body.title).toBe('Duplicated Milestone');
            expect(res.body.status).toBe(MilestoneStatus.DRAFT);
            expect(res.body.progressPercentage).toBe(0);
            expect(res.body.value).toBe(testMilestone.value);
            expect(res.body.currency).toBe(testMilestone.currency);
            expect(res.body.id).not.toBe(testMilestone.id);
          });
      });
    });

    describe('PATCH /api/v1/milestones/bulk/status', () => {
      let testMilestones: Milestone[];

      beforeEach(async () => {
        testMilestones = await milestoneRepository.save([
          {
            title: 'Bulk Milestone 1',
            tenantId: testTenantId,
            projectId: testProjectId,
            workflowId: testWorkflow.id,
            status: MilestoneStatus.DRAFT,
            milestoneType: MilestoneType.DELIVERABLE,
            priority: MilestonePriority.MEDIUM,
            createdBy: 'test-user',
            updatedBy: 'test-user',
            isActive: true,
            isDeleted: false,
          },
          {
            title: 'Bulk Milestone 2',
            tenantId: testTenantId,
            projectId: testProjectId,
            workflowId: testWorkflow.id,
            status: MilestoneStatus.DRAFT,
            milestoneType: MilestoneType.PAYMENT,
            priority: MilestonePriority.LOW,
            createdBy: 'test-user',
            updatedBy: 'test-user',
            isActive: true,
            isDeleted: false,
          },
        ]);
      });

      it('should bulk update milestone status', () => {
        const milestoneIds = testMilestones.map(m => m.id);
        
        return request(app.getHttpServer())
          .patch('/api/v1/milestones/bulk/status')
          .send({
            milestoneIds,
            status: MilestoneStatus.ACTIVE,
          })
          .expect(204);
      });
    });

    describe('GET /api/v1/milestones/analytics', () => {
      beforeEach(async () => {
        // Create milestones with different statuses
        await milestoneRepository.save([
          {
            title: 'Completed Milestone',
            tenantId: testTenantId,
            projectId: testProjectId,
            workflowId: testWorkflow.id,
            status: MilestoneStatus.COMPLETED,
            milestoneType: MilestoneType.DELIVERABLE,
            priority: MilestonePriority.HIGH,
            progressPercentage: 100,
            dueDate: new Date('2025-01-01'),
            createdBy: 'test-user',
            updatedBy: 'test-user',
            isActive: true,
            isDeleted: false,
          },
          {
            title: 'In Progress Milestone',
            tenantId: testTenantId,
            projectId: testProjectId,
            workflowId: testWorkflow.id,
            status: MilestoneStatus.IN_PROGRESS,
            milestoneType: MilestoneType.PAYMENT,
            priority: MilestonePriority.MEDIUM,
            progressPercentage: 50,
            dueDate: new Date('2024-12-01'), // Overdue
            createdBy: 'test-user',
            updatedBy: 'test-user',
            isActive: true,
            isDeleted: false,
          },
          {
            title: 'Pending Milestone',
            tenantId: testTenantId,
            projectId: testProjectId,
            workflowId: testWorkflow.id,
            status: MilestoneStatus.PENDING,
            milestoneType: MilestoneType.APPROVAL,
            priority: MilestonePriority.LOW,
            progressPercentage: 0,
            dueDate: new Date('2025-12-31'),
            createdBy: 'test-user',
            updatedBy: 'test-user',
            isActive: true,
            isDeleted: false,
          },
        ]);
      });

      it('should return milestone analytics', () => {
        return request(app.getHttpServer())
          .get('/api/v1/milestones/analytics')
          .query({ tenantId: testTenantId })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('completed');
            expect(res.body).toHaveProperty('inProgress');
            expect(res.body).toHaveProperty('pending');
            expect(res.body).toHaveProperty('overdue');
            expect(res.body).toHaveProperty('completionRate');
            expect(res.body).toHaveProperty('averageProgress');
            expect(res.body.total).toBe(3);
            expect(res.body.completed).toBe(1);
            expect(res.body.inProgress).toBe(1);
            expect(res.body.pending).toBe(1);
            expect(res.body.overdue).toBe(1);
            expect(res.body.completionRate).toBeCloseTo(33.33, 1);
            expect(res.body.averageProgress).toBeCloseTo(50, 1);
          });
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const testTenantId = 'tenant-perf-001';
      const testProjectId = 'project-perf-001';
      
      // Create test workflow
      const testWorkflow = await workflowRepository.save({
        name: 'Performance Test Workflow',
        tenantId: testTenantId,
        projectId: testProjectId,
        status: 'DRAFT',
        workflowType: 'LINEAR',
        totalMilestones: 0,
        completedMilestones: 0,
        progressPercentage: 0,
        createdBy: 'test-user',
        updatedBy: 'test-user',
        isActive: true,
        isDeleted: false,
      });

      // Create multiple milestones
      const milestones = Array.from({ length: 50 }, (_, i) => ({
        title: `Performance Milestone ${i + 1}`,
        tenantId: testTenantId,
        projectId: testProjectId,
        workflowId: testWorkflow.id,
        status: MilestoneStatus.DRAFT,
        milestoneType: MilestoneType.DELIVERABLE,
        priority: MilestonePriority.MEDIUM,
        createdBy: 'test-user',
        updatedBy: 'test-user',
        isActive: true,
        isDeleted: false,
      }));

      await milestoneRepository.save(milestones);

      // Test concurrent GET requests
      const promises = Array.from({ length: 20 }, () =>
        request(app.getHttpServer())
          .get('/api/v1/milestones')
          .query({ tenantId: testTenantId })
          .expect(200)
      );

      const results = await Promise.all(promises);
      results.forEach(res => {
        expect(res.body.milestones.length).toBe(50);
      });
    }, 30000); // 30 second timeout
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', () => {
      return request(app.getHttpServer())
        .post('/api/v1/milestones')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
    });

    it('should handle missing tenant ID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/milestones')
        .expect(400); // Should fail validation
    });

    it('should handle invalid UUID format', () => {
      return request(app.getHttpServer())
        .get('/api/v1/milestones/invalid-uuid')
        .query({ tenantId: 'tenant-001' })
        .expect(404);
    });
  });
});
