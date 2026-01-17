import { Test, TestingModule } from '@nestjs/testing';
import { MSMEController } from '../msme.controller';
import { MSMEPortalService } from '../../services/msme-portal.service';

describe('MSMEController', () => {
    let controller: MSMEController;
    let service: MSMEPortalService;

    const mockMSMEService = {
        checkSchemeEligibility: jest.fn(),
        createApplication: jest.fn(),
        trackApplicationStatus: jest.fn(),
        uploadDocuments: jest.fn(),
        validateDocumentCompleteness: jest.fn(),
        checkMSMECompliance: jest.fn(),
        generateComplianceReport: jest.fn(),
        recommendSchemes: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MSMEController],
            providers: [
                {
                    provide: MSMEPortalService,
                    useValue: mockMSMEService,
                },
            ],
        }).compile();

        controller = module.get<MSMEController>(MSMEController);
        service = module.get<MSMEPortalService>(MSMEPortalService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /msme/schemes/check-eligibility', () => {
        it('should check scheme eligibility', async () => {
            const request = {
                schemeId: 'MUDRA',
                businessData: {
                    type: 'MANUFACTURING',
                    annualTurnover: 5000000,
                    employeeCount: 15,
                },
            };

            mockMSMEService.checkSchemeEligibility.mockResolvedValue({
                eligible: true,
                scheme: 'MUDRA',
                category: 'SHISHU',
                maxLoanAmount: 50000,
            });

            const result = await controller.checkEligibility(request);

            expect(result.eligible).toBe(true);
            expect(result.scheme).toBe('MUDRA');
        });

        it('should return ineligible for invalid criteria', async () => {
            const request = {
                schemeId: 'MUDRA',
                businessData: { annualTurnover: 150000000 },
            };

            mockMSMEService.checkSchemeEligibility.mockResolvedValue({
                eligible: false,
                reason: 'Turnover exceeds limit',
            });

            const result = await controller.checkEligibility(request);

            expect(result.eligible).toBe(false);
            expect(result.reason).toBeDefined();
        });
    });

    describe('POST /msme/applications', () => {
        it('should create new scheme application', async () => {
            const applicationDto = {
                schemeId: 'MUDRA',
                businessId: 'biz-123',
                loanAmount: 5000000,
                purpose: 'Working capital',
            };

            mockMSMEService.createApplication.mockResolvedValue({
                id: '1',
                applicationNumber: 'APP-2025-001',
                status: 'SUBMITTED',
                ...applicationDto,
            });

            const result = await controller.createApplication(applicationDto);

            expect(result.applicationNumber).toBeDefined();
            expect(result.status).toBe('SUBMITTED');
        });
    });

    describe('GET /msme/applications/:id/status', () => {
        it('should track application status', async () => {
            const applicationId = 'app-123';

            mockMSMEService.trackApplicationStatus.mockResolvedValue({
                id: applicationId,
                status: 'UNDER_REVIEW',
                submittedAt: new Date('2025-01-01'),
                lastUpdated: new Date('2025-01-10'),
                stages: [
                    { name: 'DOCUMENT_VERIFICATION', status: 'COMPLETED' },
                    { name: 'CREDIT_CHECK', status: 'IN_PROGRESS' },
                ],
            });

            const result = await controller.trackStatus(applicationId);

            expect(result.status).toBe('UNDER_REVIEW');
            expect(result.stages).toHaveLength(2);
        });
    });

    describe('POST /msme/applications/:id/documents', () => {
        it('should upload documents for application', async () => {
            const applicationId = 'app-123';
            const documents = [
                { type: 'UDYAM_CERTIFICATE', file: 'base64data' },
                { type: 'BANK_STATEMENT', file: 'base64data' },
            ];

            mockMSMEService.uploadDocuments.mockResolvedValue({
                uploaded: 2,
                pending: ['GST_CERTIFICATE', 'ITR'],
            });

            const result = await controller.uploadDocuments(applicationId, { documents });

            expect(result.uploaded).toBe(2);
            expect(result.pending).toBeDefined();
        });
    });

    describe('GET /msme/applications/:id/document-status', () => {
        it('should check document completeness', async () => {
            mockMSMEService.validateDocumentCompleteness.mockResolvedValue({
                complete: false,
                uploaded: ['UDYAM_CERTIFICATE', 'BANK_STATEMENT'],
                missingDocuments: ['GST_CERTIFICATE', 'ITR'],
                completionPercentage: 50,
            });

            const result = await controller.checkDocumentStatus('app-123');

            expect(result.complete).toBe(false);
            expect(result.completionPercentage).toBe(50);
        });
    });

    describe('GET /msme/compliance/:businessId', () => {
        it('should check MSME compliance status', async () => {
            mockMSMEService.checkMSMECompliance.mockResolvedValue({
                udyamRegistration: { status: 'VALID', number: 'UDYAM-XX-00-0000000' },
                gstCompliance: { status: 'COMPLIANT', filingRate: 100 },
                overallStatus: 'COMPLIANT',
                score: 95,
            });

            const result = await controller.checkCompliance('biz-123');

            expect(result.overallStatus).toBe('COMPLIANT');
            expect(result.score).toBe(95);
        });
    });

    describe('GET /msme/compliance/:businessId/report', () => {
        it('should generate compliance report', async () => {
            mockMSMEService.generateComplianceReport.mockResolvedValue({
                businessId: 'biz-123',
                complianceScore: 92,
                recommendations: [
                    'Maintain regular GST filing',
                    'Update Udyam registration annually',
                ],
                pdf: Buffer.from('PDF report'),
            });

            const result = await controller.getComplianceReport('biz-123');

            expect(result.complianceScore).toBe(92);
            expect(result.recommendations).toHaveLength(2);
            expect(result.pdf).toBeInstanceOf(Buffer);
        });
    });

    describe('POST /msme/schemes/recommend', () => {
        it('should recommend suitable schemes', async () => {
            const businessProfile = {
                type: 'MANUFACTURING',
                turnover: 8000000,
                employees: 20,
                location: 'Maharashtra',
            };

            mockMSMEService.recommendSchemes.mockResolvedValue([
                {
                    schemeId: 'MUDRA',
                    schemeName: 'MUDRA Loan',
                    matchScore: 95,
                    benefits: 'Low interest, easy approval',
                },
                {
                    schemeId: 'CLCSS',
                    schemeName: 'Credit Linked Capital Subsidy',
                    matchScore: 85,
                    benefits: 'Capital subsidy on machinery',
                },
            ]);

            const result = await controller.recommendSchemes(businessProfile);

            expect(result).toHaveLength(2);
            expect(result[0].matchScore).toBeGreaterThan(result[1].matchScore);
        });
    });
});
