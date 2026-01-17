import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvidenceService } from '../services/evidence.service';
import { MilestoneEvidence } from '../entities/milestone-evidence.entity';
import { CreateEvidenceDto } from '../dto/create-evidence.dto';
import { UpdateEvidenceDto } from '../dto/update-evidence.dto';
import { MilestoneVerification } from '../entities/milestone-verification.entity';

describe('EvidenceService', () => {
  let service: EvidenceService;
  let evidenceRepository: Repository<MilestoneEvidence>;
  let verificationRepository: Repository<MilestoneVerification>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [MilestoneEvidence, MilestoneVerification],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([MilestoneEvidence, MilestoneVerification]),
      ],
      providers: [EvidenceService],
    }).compile();

    service = module.get<EvidenceService>(EvidenceService);
    evidenceRepository = module.get<Repository<MilestoneEvidence>>(Repository<MilestoneEvidence>);
    verificationRepository = module.get<Repository<MilestoneVerification>>(Repository<MilestoneVerification>);
  });

  describe('Evidence CRUD Operations', () => {
    it('should create evidence with file upload', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice', 'delivery_proof'],
        createdBy: 'admin',
      });

      const createDto: CreateEvidenceDto = {
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

      const result = await service.createEvidence(createDto);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.verificationId).toBe(verification.id);
      expect(result.title).toBe('Invoice Copy');
      expect(result.evidenceType).toBe('document');
      expect(result.fileUrl).toBe('https://example.com/invoice.pdf');
      expect(result.fileName).toBe('invoice.pdf');
      expect(result.fileSize).toBe(1024000);
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should create evidence with multiple files', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice', 'delivery_proof', 'photo'],
        createdBy: 'admin',
      });

      const createDto: CreateEvidenceDto = {
        verificationId: verification.id,
        tenantId: 'tenant-1',
        title: 'Project Photos',
        description: 'Site photos showing project progress',
        evidenceType: 'image',
        fileUrl: 'https://example.com/project-photos.zip',
        fileName: 'project-photos.zip',
        fileSize: 5120000,
        mimeType: 'application/zip',
        uploadedBy: 'user-1',
      };

      const result = await service.createEvidence(createDto);
      
      expect(result).toBeDefined();
      expect(result.evidenceType).toBe('image');
      expect(result.fileName).toBe('project-photos.zip');
      expect(result.fileSize).toBe(5120000);
    });

    it('should update evidence metadata', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice'],
        createdBy: 'admin',
      });

      const evidence = await service.createEvidence({
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
        title: 'Updated Invoice',
        description: 'Updated invoice with corrections',
        tags: ['invoice', 'financial', 'updated'],
        metadata: {
          version: '2.0',
          uploadDate: new Date().toISOString(),
          uploadedBy: 'user-1',
        },
        updatedBy: 'user-1',
      };

      const result = await service.updateEvidence(evidence.id, updateDto);
      
      expect(result.title).toBe('Updated Invoice');
      expect(result.description).toBe('Updated invoice with corrections');
      expect(result.tags).toContain('invoice');
      expect(result.tags).toContain('financial');
      expect(result.metadata.version).toBe('2.0');
    });

    it('should get evidence by ID', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice'],
        createdBy: 'admin',
      });

      const evidence = await service.createEvidence({
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

      const result = await service.getEvidence(evidence.id, 'tenant-1');
      
      expect(result).toBeDefined();
      expect(result.id).toBe(evidence.id);
      expect(result.title).toBe('Invoice Copy');
    });

    it('should get evidence by verification ID', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice', 'delivery_proof'],
        createdBy: 'admin',
      });

      await service.createEvidence({
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

      await service.createEvidence({
        verificationId: verification.id,
        tenantId: 'tenant-1',
        title: 'Delivery Proof',
        description: 'Proof of delivery',
        evidenceType: 'document',
        fileUrl: 'https://example.com/delivery-proof.pdf',
        fileName: 'delivery-proof.pdf',
        fileSize: 512000,
        mimeType: 'application/pdf',
        uploadedBy: 'user-2',
      });

      const results = await service.getEvidenceByVerification(verification.id, 'tenant-1');
      
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('Invoice Copy');
      expect(results[1].title).toBe('Delivery Proof');
    });

    it('should delete evidence', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice'],
        createdBy: 'admin',
      });

      const evidence = await service.createEvidence({
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

      await service.deleteEvidence(evidence.id, 'tenant-1');
      
      const deleted = await evidenceRepository.findOne({ where: { id: evidence.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('File Management', () => {
    it('should validate file types', async () => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/zip', 'text/plain'];
      
      for (const type of validTypes) {
        const createDto: CreateEvidenceDto = {
          verificationId: 'verification-1',
          tenantId: 'tenant-1',
          title: 'Test File',
          description: 'Test file',
          evidenceType: type as any,
          fileUrl: 'https://example.com/test.' + type.split('/')[1],
          fileName: 'test.' + type.split('/')[1],
          fileSize: 1000,
          mimeType: type,
          uploadedBy: 'user-1',
        };

        const result = await service.createEvidence(createDto);
        expect(result.mimeType).toBe(type);
      }
    });

    it('should validate file sizes', async () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      // Valid size
      const validCreateDto: CreateEvidenceDto = {
        verificationId: 'verification-1',
        tenantId: 'tenant-1',
        title: 'Small File',
        description: 'Small file test',
        evidenceType: 'document',
        fileUrl: 'https://example.com/small.pdf',
        fileName: 'small.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        uploadedBy: 'user-1',
      };

      const validResult = await service.createEvidence(validCreateDto);
      expect(validResult.fileSize).toBe(1024);

      // Invalid size
      const invalidCreateDto: CreateEvidenceDto = {
        verificationId: 'verification-1',
        tenantId: 'tenant-1',
        title: 'Large File',
        description: 'Large file test',
        evidenceType: 'document',
        fileUrl: 'https://example.com/large.pdf',
        fileName: 'large.pdf',
        fileSize: 50 * 1024 * 1024, // 50MB
        mimeType: 'application/pdf',
        uploadedBy: 'user-1',
      };

      await expect(service.createEvidence(invalidCreateDto)).rejects.toThrow();
    });

    it('should validate file URLs', async () => {
      const validUrls = [
        'https://example.com/file.pdf',
        'https://secure.example.com/document.pdf',
        'https://api.example.com/download/file.pdf',
      ];
      
      for (const url of validUrls) {
        const createDto: CreateEvidenceDto = {
          verificationId: 'verification-1',
          tenantId: 'tenant-1',
          title: 'Test File',
          description: 'Test file',
          evidenceType: 'document',
          fileUrl: url,
          fileName: 'test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          uploadedBy: 'user-1',
        };

        const result = await service.createEvidence(createDto);
        expect(result.fileUrl).toBe(url);
      }

      const invalidUrls = [
        'ftp://example.com/file.pdf',
        'http://example.com/file.pdf',
        'invalid-url',
        '',
      ];

      for (const url of invalidUrls) {
        const createDto: CreateEvidenceDto = {
          verificationId: 'verification-1',
          tenantId: 'tenant-1',
          title: 'Invalid URL Test',
          description: 'Invalid URL test',
          evidenceType: 'document',
          fileUrl: url,
          fileName: 'test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          uploadedBy: 'user-1',
        };

        await expect(service.createEvidence(createDto)).rejects.toThrow();
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should upload multiple evidence files', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice', 'delivery_proof', 'photo'],
        createdBy: 'admin',
      });

      const evidenceDtos = [
        {
          verificationId: verification.id,
          tenantId: 'tenant-1',
          title: 'Invoice Copy',
          description: 'Scanned invoice',
          evidenceType: 'document',
          fileUrl: 'https://example.com/invoice.pdf',
          fileName: 'invoice.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          uploadedBy: 'user-1',
        },
        {
          verificationId: verification.id,
          tenantId: 'tenant-1',
          title: 'Delivery Proof',
          description: 'Proof of delivery',
          evidenceType: 'document',
          fileUrl: 'https://example.com/delivery-proof.pdf',
          fileName: 'delivery-proof.pdf',
          fileSize: 512000,
          mimeType: 'application/pdf',
          uploadedBy: 'user-2',
        },
        {
          verificationId: verification.id,
          tenantId: 'tenant-1',
          title: 'Project Photos',
          description: 'Site progress photos',
          evidenceType: 'image',
          fileUrl: 'https://example.com/photos.zip',
          fileName: 'photos.zip',
          fileSize: 5120000,
          mimeType: 'application/zip',
          uploadedBy: 'user-3',
        },
      ];

      const results = await service.uploadMultipleEvidence(evidenceDtos);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.id)).toBe(true);
    });

    it('should process bulk evidence upload', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice'],
        createdBy: 'admin',
      });

      const bulkData = [
        {
          fileName: 'invoice.pdf',
          fileData: Buffer.from('invoice content'),
          mimeType: 'application/pdf',
        },
        {
          fileName: 'delivery-proof.pdf',
          fileData: Buffer.from('delivery proof content'),
          mimeType: 'application/pdf',
        },
      ];

      const results = await service.processBulkEvidenceUpload(verification.id, bulkData, 'user-1');
      
      expect(results).toHaveLength(2);
      expect(results[0].title).toContain('invoice');
      expect(results[1].title).toContain('delivery-proof');
    });
  });

  describe('Analytics and Reporting', () => {
    it('should get evidence analytics', async () => {
      await evidenceRepository.save({
        id: 'evidence-1',
        verificationId: 'verification-1',
        tenantId: 'tenant-1',
        title: 'Invoice Copy',
        evidenceType: 'document',
        fileUrl: 'https://example.com/invoice.pdf',
        fileName: 'invoice.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        uploadedBy: 'user-1',
        createdAt: new Date('2024-01-01'),
      });

      await evidenceRepository.save({
        id: 'evidence-2',
        verificationId: 'verification-1',
        tenantId: 'tenant-1',
        title: 'Delivery Proof',
        evidenceType: 'document',
        fileUrl: 'https://example.com/delivery-proof.pdf',
        fileName: 'delivery-proof.pdf',
        fileSize: 512000,
        mimeType: 'application/pdf',
        uploadedBy: 'user-2',
        createdAt: new Date('2024-01-02'),
      });

      const analytics = await service.getEvidenceAnalytics('tenant-1', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });
      
      expect(analytics.totalEvidence).toBe(2);
      expect(analytics.byType.document).toBe(2);
      expect(analytics.totalFileSize).toBe(1536000); // 1024000 + 512000
      expect(analytics.averageFileSize).toBe(768000); // Average of 1536000
    });

    it('should get evidence performance metrics', async () => {
      const analytics = await service.getEvidencePerformanceMetrics('tenant-1');
      
      expect(analytics.averageUploadTime).toBeDefined();
      expect(analytics.storageUsage).toBeDefined();
      expect(analytics.downloadCount).toBeDefined();
      expect(analytics.errorRate).toBeDefined();
    });

    it('should get evidence trends', async () => {
      const analytics = await service.getEvidenceTrends('tenant-1', {
        period: 'monthly',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });
      
      expect(analytics.monthlyUploads).toBeDefined();
      expect(analytics.storageTrends).toBeDefined();
      expect(analytics.popularFileTypes).toBeDefined();
    });
  });

  describe('Security and Validation', () => {
    it('should validate evidence ownership', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        createdBy: 'admin',
      });

      const createDto: CreateEvidenceDto = {
        verificationId: verification.id,
        tenantId: 'tenant-1',
        title: 'Invoice Copy',
        description: 'Scanned invoice document',
        evidenceType: 'document',
        fileUrl: 'https://example.com/invoice.pdf',
        fileName: 'invoice.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        uploadedBy: 'different-user',
      };

      await expect(service.createEvidence(createDto)).rejects.toThrow('Unauthorized access');
    });

    it('should sanitize file names', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        createdBy: 'admin',
      });

      const dangerousNames = [
        '../../../etc/passwd',
        '..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\..\\..',
        'C:\\Windows\\System32\\config\\system',
        '/etc/shadow',
      ];

      for (const dangerousName of dangerousNames) {
        const createDto: CreateEvidenceDto = {
          verificationId: verification.id,
          tenantId: 'tenant-1',
          title: 'Test File',
          description: 'Test file',
          evidenceType: 'document',
          fileUrl: 'https://example.com/invoice.pdf',
          fileName: dangerousName,
          fileSize: 1024,
          mimeType: 'application/pdf',
          uploadedBy: 'user-1',
        };

        const result = await service.createEvidence(createDto);
        expect(result.fileName).not.toContain(dangerousName);
      }
    });

    it('should validate MIME types', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        assignedTo: 'user-1',
        createdBy: 'admin',
      });

      const invalidMimeTypes = [
        'application/exe',
        'application/javascript',
        'text/plain',
        'image/svg',
      ];

      for (const mimeType of invalidMimeTypes) {
        const createDto: CreateEvidenceDto = {
          verificationId: verification.id,
          tenantId: 'tenant-1',
          title: 'Invalid File',
          description: 'Invalid file type',
          evidenceType: 'document',
          fileUrl: 'https://example.com/file.' + mimeType.split('/')[1],
          fileName: 'file.' + mimeType.split('/')[1],
          fileSize: 1024,
          mimeType: mimeType,
          uploadedBy: 'user-1',
        };

        await expect(service.createEvidence(createDto)).rejects.toThrow('Invalid file type');
      }
    });
  });

  describe('Integration with Verification Workflow', () => {
    it('should update verification status when evidence is added', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice'],
        createdBy: 'admin',
      });

      const createDto: CreateEvidenceDto = {
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

      await service.createEvidence(createDto);

      const updatedVerification = await verificationRepository.findOne({
        where: { id: verification.id },
      });

      expect(updatedVerification.requiredEvidence).toHaveLength(0); // Invoice evidence satisfied
    });

    it('should trigger workflow when all evidence is submitted', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice', 'delivery_proof', 'photo'],
        createdBy: 'admin',
      });

      const evidenceDtos = [
        {
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
        },
        {
          verificationId: verification.id,
          tenantId: 'tenant-1',
          title: 'Delivery Proof',
          description: 'Proof of delivery',
          evidenceType: 'document',
          fileUrl: 'https://example.com/delivery-proof.pdf',
          fileName: 'delivery-proof.pdf',
          fileSize: 512000,
          mimeType: 'application/pdf',
          uploadedBy: 'user-2',
        },
        {
          verificationId: verification.id,
          tenantId: 'tenant-1',
          title: 'Project Photos',
          description: 'Site progress photos',
          evidenceType: 'image',
          fileUrl: 'https://example.com/photos.zip',
          fileName: 'photos.zip',
          fileSize: 5120000,
          mimeType: 'application/zip',
          uploadedBy: 'user-3',
        },
      ];

      jest.spy(service['workflowService'], 'triggerVerificationWorkflow');

      await service.uploadMultipleEvidence(evidenceDtos);
      
      expect(service['workflowService'].triggerVerificationWorkflow).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle file upload failures gracefully', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice'],
        createdBy: 'admin',
      });

      const createDto: CreateEvidenceDto = {
        verificationId: verification.id,
        tenantId: 'tenant-1',
        title: 'Invoice Copy',
        description: 'Scanned invoice document',
        evidenceType: 'document',
        fileUrl: 'invalid-url',
        fileName: 'invoice.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        uploadedBy: 'user-1',
      };

      await expect(service.createEvidence(createDto)).rejects.toThrow();
    });

    it('should handle storage failures', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice'],
        createdBy: 'admin',
      });

      const createDto: CreateEvidenceDto = {
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

      jest.spy(service['storageService'], 'uploadFile').mockRejectedValueOnce(new Error('Storage error'));

      await expect(service.createEvidence(createDto)).rejects.toThrow('Storage error');
    });

    it('should handle duplicate evidence', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice'],
        createdBy: 'admin',
      });

      const createDto: CreateEvidenceDto = {
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

      await service.createEvidence(createDto);
      
      const duplicateDto = { ...createDto, title: 'Duplicate Invoice Copy' };
      
      await expect(service.createEvidence(duplicateDto)).rejects.toThrow('Duplicate evidence not allowed');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large file uploads efficiently', async () => {
      const createDto: CreateEvidenceDto = {
        verificationId: 'verification-1',
        tenantId: 'tenant-1',
        title: 'Large File',
        description: 'Large file test',
        evidenceType: 'document',
        fileUrl: 'https://example.com/large.pdf',
        fileName: 'large.pdf',
        fileSize: 5 * 1024 * 1024, // 5MB
        mimeType: 'application/pdf',
        uploadedBy: 'user-1',
      };

      const startTime = Date.now();
      const result = await service.createEvidence(createDto);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.fileSize).toBe(5 * 1024 * 1024);
    });

    it('should handle concurrent uploads', async () => {
      const verification = await verificationRepository.save({
        id: 'verification-1',
        milestoneId: 'milestone-1',
        tenantId: 'tenant-1',
        verificationType: 'document',
        status: 'pending',
        requiredEvidence: ['invoice'],
        createdBy: 'admin',
      });

      const evidenceDtos = Array(10).fill(null).map((_, index) => ({
        verificationId: verification.id,
        tenantId: 'tenant-1',
        title: `File ${index}`,
        description: `Test file ${index}`,
        evidenceType: 'document',
        fileUrl: `https://example.com/file${index}.pdf`,
        fileName: `file${index}.pdf`,
        fileSize: 1024,
        mimeType: 'application/pdf',
        uploadedBy: 'user-1',
      }));

      const startTime = Date.now();
      const results = await Promise.all(evidenceDtos.map(dto => service.createEvidence(dto)));
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(results.every(r => r.id)).toBe(true);
    });
  });
});
