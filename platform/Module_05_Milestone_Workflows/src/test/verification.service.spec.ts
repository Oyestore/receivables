import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationService } from '../services/verification.service';
import { EvidenceService } from '../services/evidence.service';
import { EscalationService } from '../services/escalation.service';
import { MilestoneVerification } from '../entities/milestone-verification.entity';
import { MilestoneEvidence } from '../entities/milestone-evidence.entity';
import { MilestoneEscalation } from '../entities/milestone-escalation.entity';
import { CreateVerificationDto } from '../dto/create-verification.dto';
import { UpdateVerificationDto } from '../dto/update-verification.dto';
import { CreateEvidenceDto } from '../dto/create-evidence.dto';
import { UpdateEvidenceDto } from '../dto/update-evidence.dto';
import { CreateEscalationDto } from '../dto/create-escalation.dto';
import { UpdateEscalationDto } from '../dto/update-escalation.dto';
import { WorkflowService } from '../services/workflow.service';

describe('VerificationService', () => {
  let service: VerificationService;
  let verificationRepository: Repository<MilestoneVerification>;
  let workflowService: WorkflowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [MilestoneVerification, MilestoneEvidence, MilestoneEscalation],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([MilestoneVerification, MilestoneEvidence, MilestoneEscalation]),
      ],
      providers: [VerificationService, WorkflowService],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
    verificationRepository = module.get<Repository<MilestoneVerification>>(Repository<MilestoneVerification>);
    workflowService = module.get<WorkflowService>(WorkflowService);
  });

  describe('Verification CRUD Operations', () => {
    it('should create a new verification with evidence', async () => {
      const createDto: CreateVerificationDto = {
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        requiredEvidence: ['invoice', 'delivery_proof'],
        dueDate: new Date('2024-02-15'),
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      };

      const result = await service.createVerification(createDto, 'admin');
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.milestoneId).toBe('milestone-1');
      expect(result.verificationType).toBe('document');
      expect(result.status).toBe('pending');
      expect(result.assignedTo).toBe('user-1');
      expect(result.priority).toBe('high');
      expect(result.createdBy).toBe('admin');
    });

    it('should update verification status to in_review', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      const updateDto: UpdateVerificationDto = {
        status: 'in_review',
        notes: 'Ready for review',
        updatedBy: 'manager',
      };

      const result = await service.updateVerification(verification.id, updateDto);
      
      expect(result.status).toBe('in_review');
      expect(result.notes).toBe('Ready for review');
      expect(result.updatedBy).toBe('manager');
    });

    it('should approve verification with evidence', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'in_review',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      const approveDto = {
        approvedBy: 'manager',
        approvalNotes: 'All evidence verified',
        approvedAt: new Date(),
      };

      const result = await service.approveVerification(verification.id, approveDto);
      
      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe('manager');
      expect(result.approvedAt).toBeDefined();
    });

    it('should reject verification with reason', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'in_review',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      const rejectDto = {
        rejectedBy: 'manager',
        rejectionReason: 'Insufficient evidence',
        rejectedAt: new Date(),
      };

      const result = await service.rejectVerification(verification.id, rejectDto);
      
      expect(result.status).toBe('rejected');
      expect(result.rejectedBy).toBe('manager');
      expect(result.rejectionReason).toBe('Insufficient evidence');
      expect(result.rejectedAt).toBeDefined();
    });

    it('should get verification by ID', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      const result = await service.getVerification(verification.id, 'tenant-1');
      
      expect(result).toBeDefined();
      expect(result.id).toBe(verification.id);
      expect(result.milestoneId).toBe('milestone-1');
    });

    it('should get verifications by milestone', async () => {
      await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'site_visit',
        status: 'pending',
        assignedTo: 'user-2',
        priority: 'medium',
        createdBy: 'admin',
      });

      const results = await service.getVerificationsByMilestone('milestone-1', 'tenant-1');
      
      expect(results).toHaveLength(2);
      expect(results[0].verificationType).toBe('document');
      expect(results[1].verificationType).toBe('site_visit');
    });

    it('should get verifications by assignee', async () => {
      await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      await verificationRepository.save({
        milestoneId: 'milestone-2',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'medium',
        createdBy: 'admin',
      });

      const results = await service.getVerificationsByAssignee('user-1', 'tenant-1');
      
      expect(results).toHaveLength(2);
      expect(results[0].assignedTo).toBe('user-1');
      expect(results[1].assignedTo).toBe('user-1');
    });

    it('should delete verification (soft delete)', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      await service.deleteVerification(verification.id, 'tenant-1');
      
      const deleted = await verificationRepository.findOne({ where: { id: verification.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('Evidence Management', () => {
    it('should add evidence to verification', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      const evidenceDto: CreateEvidenceDto = {
        verificationId: verification.id,
        tenantId: 'tenant-1',
        title: 'Invoice Copy',
        description: 'Scanned invoice document',
        evidenceType: 'document',
        fileUrl: 'https://example.com/invoice.pdf',
        fileName: 'invoice.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        uploadedBy: 'user-1',
      };

      const result = await service.addEvidence(evidenceDto);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.verificationId).toBe(verification.id);
      expect(result.title).toBe('Invoice Copy');
      expect(result.evidenceType).toBe('document');
    });

    it('should update evidence metadata', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      const evidence = await service.addEvidence({
        verificationId: verification.id,
        tenantId: 'tenant-1',
        title: 'Invoice Copy',
        description: 'Scanned invoice document',
        evidenceType: 'document',
        fileUrl: 'https://example.com/invoice.pdf',
        fileName: 'invoice.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        uploadedBy: 'user-1',
      });

      const updateDto: UpdateEvidenceDto = {
        title: 'Updated Invoice Copy',
        description: 'Updated scanned invoice',
        tags: ['invoice', 'financial'],
        updatedBy: 'user-1',
      };

      const result = await service.updateEvidence(evidence.id, updateDto);
      
      expect(result.title).toBe('Updated Invoice Copy');
      expect(result.description).toBe('Updated scanned invoice');
      expect(result.tags).toContain('invoice');
      expect(result.tags).toContain('financial');
    });

    it('should remove evidence from verification', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      const evidence = await service.addEvidence({
        verificationId: verification.id,
        tenantId: 'tenant-1',
        title: 'Invoice Copy',
        description: 'Scanned invoice document',
        evidenceType: 'document',
        fileUrl: 'https://example.com/invoice.pdf',
        fileName: 'invoice.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        uploadedBy: 'user-1',
      });

      await service.removeEvidence(evidence.id, 'tenant-1');
      
      const verificationAfter = await service.getVerification(verification.id, 'tenant-1');
      expect(verificationAfter.evidence).toHaveLength(0);
    });
  });

  describe('Escalation Management', () => {
    it('should create escalation for overdue verification', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'overdue',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
        dueDate: new Date('2024-01-01'),
      });

      const escalationDto: CreateEscalationDto = {
        verificationId: verification.id,
        tenantId: 'tenant-1',
        escalationType: 'overdue',
        severity: 'high',
        title: 'Overdue Verification',
        description: 'Verification is 2 weeks overdue',
        escalatedBy: 'system',
        escalatedTo: 'manager',
        dueDate: new Date('2024-01-01'),
      };

      const result = await service.createEscalation(escalationDto);
      
      expect(result).toBeDefined();
      expect(result.verificationId).toBe(verification.id);
      expect(result.escalationType).toBe('overdue');
      expect(result.severity).toBe('high');
      expect(result.escalatedTo).toBe('manager');
    });

    it('should escalate to next level', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'escalated',
        assignedTo: 'manager',
        priority: 'high',
        createdBy: 'admin',
        dueDate: new Date('2024-01-01'),
      });

      const escalation = await service.createEscalation({
        verificationId: verification.id,
        tenantId: 'tenant-1',
        escalationType: 'overdue',
        severity: 'high',
        title: 'Overdue Verification',
        description: 'Verification is 2 weeks overdue',
        escalatedBy: 'system',
        escalatedTo: 'manager',
        dueDate: new Date('2024-01-01'),
      });

      const result = await service.escalateToNextLevel(escalation.id, 'director');
      
      expect(result.escalatedTo).toBe('director');
      expect(result.escalationLevel).toBe(2);
    });

    it('should resolve escalation', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'escalated',
        assignedTo: 'director',
        priority: 'high',
        createdBy: 'admin',
        dueDate: new Date('2024-01-01'),
      });

      const escalation = await service.createEscalation({
        verificationId: verification.id,
        tenantId: 'tenant-1',
        escalationType: 'overdue',
        severity: 'high',
        title: 'Overdue Verification',
        description: 'Verification is 2 weeks overdue',
        escalatedBy: 'system',
        escalatedTo: 'director',
        dueDate: new Date('2024-01-01'),
      });

      const resolveDto = {
        resolution: 'completed',
        resolvedBy: 'director',
        resolvedAt: new Date(),
        resolutionNotes: 'All evidence verified and approved',
      };

      const result = await service.resolveEscalation(escalation.id, resolveDto);
      
      expect(result.status).toBe('resolved');
      expect(result.resolution).toBe('completed');
      expect(result.resolvedBy).toBe('director');
    });
  });

  describe('Workflow Integration', () => {
    it('should initialize verification workflow', async () => {
      const createDto: CreateVerificationDto = {
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        requiredEvidence: ['invoice', 'delivery_proof'],
        dueDate: new Date('2024-02-15'),
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      };

      jest.spy(workflowService, 'initializeVerificationWorkflow');

      const result = await service.createVerification(createDto, 'admin');
      
      expect(workflowService.initializeVerificationWorkflow).toHaveBeenCalledWith(result.id);
      expect(result.status).toBe('pending');
    });

    it('should trigger workflow on approval', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      jest.spy(workflowService, 'triggerVerificationWorkflow');

      const approveDto = {
        approvedBy: 'manager',
        approvalNotes: 'Approved with evidence',
        approvedAt: new Date(),
      };

      const result = await service.approveVerification(verification.id, approveDto);
      
      expect(workflowService.triggerVerificationWorkflow).toHaveBeenCalledWith(result.id);
      expect(result.status).toBe('approved');
    });

    it('should send notifications on status changes', async () => {
      const notificationSpy = jest.spy(service['notificationService'], 'sendVerificationNotification');

      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      const updateDto: UpdateVerificationDto = {
        status: 'in_review',
        notes: 'Ready for review',
        updatedBy: 'manager',
      };

      await service.updateVerification(verification.id, updateDto);
      
      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'verification_status_update',
          verificationId: verification.id,
          status: 'in_review',
          assignedTo: 'user-1',
        })
      );
    });
  });

  describe('Analytics and Reporting', () => {
    it('should get verification analytics', async () => {
      await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      await verificationRepository.save({
        milestoneId: 'milestone-2',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'approved',
        assignedTo: 'user-2',
        priority: 'medium',
        createdBy: 'admin',
      });

      const analytics = await service.getVerificationAnalytics('tenant-1', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });
      
      expect(analytics.totalVerifications).toBe(2);
      expect(analytics.pendingVerifications).toBe(1);
      expect(analytics.approvedVerifications).toBe(1);
      expect(analytics.byType.document).toBe(2);
      expect(analytics.byPriority.high).toBe(1);
      expect(analytics.byPriority.medium).toBe(1);
    });

    it('should get verification performance metrics', async () => {
      const analytics = await service.getVerificationPerformanceMetrics('tenant-1');
      
      expect(analytics.averageProcessingTime).toBeDefined();
      expect(analytics.averageApprovalTime).toBeDefined();
      expect(analytics.escalationRate).toBeDefined();
      expect(analytics.evidenceSubmissionRate).toBeDefined();
    });

    it('should get verification trends', async () => {
      const analytics = await service.getVerificationTrends('tenant-1', {
        period: 'monthly',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });
      
      expect(analytics.monthlyData).toBeDefined();
      expect(analytics.trends).toBeDefined();
      expect(analytics.projections).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid verification data', async () => {
      const invalidDto = {
        milestoneId: '',
        tenantId: '',
        verificationType: 'invalid',
        requiredEvidence: [],
        dueDate: new Date('invalid-date'),
        assignedTo: '',
        priority: 'invalid',
        createdBy: '',
      };

      await expect(service.createVerification(invalidDto, 'admin')).rejects.toThrow();
    });

    it('should handle non-existent verification', async () => {
      await expect(service.getVerification('non-existent', 'tenant-1')).rejects.toThrow();
    });

    it('should handle unauthorized access', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      await expect(service.getVerification(verification.id, 'different-tenant')).rejects.toThrow();
    });

    it('should handle evidence upload failures', async () => {
      const verification = await verificationRepository.save({
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      });

      const invalidEvidenceDto = {
        verificationId: verification.id,
        tenantId: 'tenant-1',
        title: '',
        description: '',
        evidenceType: 'invalid',
        fileUrl: 'invalid-url',
        fileName: '',
        fileSize: -1,
        mimeType: 'invalid',
        uploadedBy: 'user-1',
      };

      await expect(service.addEvidence(invalidEvidenceDto)).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent verification creation', async () => {
      const createDto: CreateVerificationDto = {
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        requiredEvidence: ['invoice', 'delivery_proof'],
        dueDate: new Date('2024-02-15'),
        assignedTo: 'user-1',
        priority: 'high',
        createdBy: 'admin',
      };

      const promises = Array(10).fill(null).map(() => 
        service.createVerification(createDto, 'admin')
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.id)).toBe(true);
    });

    it('should process large number of verifications efficiently', async () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await verificationRepository.save({
          milestoneId: `milestone-${i}`,
          tenantId: 'tenant-1',
          verificationType: 'document',
          status: 'pending',
          assignedTo: `user-${i % 5}`,
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
          createdBy: 'admin',
        });
      }

      const analytics = await service.getVerificationAnalytics('tenant-1', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(analytics.totalVerifications).toBe(100);
    });
  });
});
