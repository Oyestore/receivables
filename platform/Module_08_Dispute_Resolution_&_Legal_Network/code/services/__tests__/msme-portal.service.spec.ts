import { Test, TestingModule } from '@nestjs/testing';
import { MSMEPortalService } from '../msme-portal.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MSMECase, MSMECaseStatus } from '../../entities/msme-case.entity';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MSMEPortalService', () => {
    let service: MSMEPortalService;

    const mockRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MSMEPortalService,
                { provide: getRepositoryToken(MSMECase), useValue: mockRepo },
            ],
        }).compile();

        service = module.get<MSMEPortalService>(MSMEPortalService);

        // Mock the axios instance created in constructor
        const mockInstance = {
            post: jest.fn(),
            get: jest.fn(),
            interceptors: {
                request: { use: jest.fn() },
            },
        };
        (service as any).axiosInstance = mockInstance;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('fileCase', () => {
        it('should file a case and save to repo', async () => {
            const request = {
                disputeCaseId: 'd1',
                supplierName: 'Supp Inc',
                supplierUdyamNumber: 'UDYAM-MH-01',
                supplierEmail: 's@inc.com',
                supplierPhone: '999',
                supplierAddress: 'Pune',
                buyerName: 'Buy Ltd',
                buyerPAN: 'ABC',
                buyerAddress: 'Mumbai',
                amountClaimed: 500,
                disputeDescription: 'Late',
                invoiceNumbers: ['INV1']
            };

            const createdCase = { ...request, id: 'c1', msmeApplicationId: 'MSME-123', timeline: [] };
            mockRepo.create.mockReturnValue(createdCase);
            mockRepo.save.mockResolvedValue(createdCase);
            mockRepo.findOne.mockResolvedValue(createdCase); // For cleanup if needed

            // Mock Portal Response
            (service as any).axiosInstance.post.mockResolvedValue({
                data: {
                    case_number: 'CASE-001',
                    reference_id: 'REF-001'
                }
            });

            const result = await service.fileCase(request);

            expect(mockRepo.create).toHaveBeenCalled();
            expect((service as any).axiosInstance.post).toHaveBeenCalledWith('/cases/file', expect.any(Object));
            expect(result.msmeCaseNumber).toBe('CASE-001');
            expect(result.status).toBe(MSMECaseStatus.SUBMITTED);
        });

        it('should handle API errors', async () => {
            const request = {
                disputeCaseId: 'd1',
                supplierName: 'Supp Inc',
                supplierUdyamNumber: 'UDYAM-MH-01',
                supplierEmail: 's@inc.com',
                supplierPhone: '999',
                supplierAddress: 'Pune',
                buyerName: 'Buy Ltd',
                buyerPAN: 'ABC',
                buyerAddress: 'Mumbai',
                amountClaimed: 500,
                disputeDescription: 'Late',
                invoiceNumbers: ['INV1']
            };

            const createdCase = { ...request, id: 'c1', timeline: [] };
            mockRepo.create.mockReturnValue(createdCase);
            mockRepo.save.mockResolvedValue(createdCase);
            mockRepo.findOne.mockResolvedValue(createdCase);

            (service as any).axiosInstance.post.mockRejectedValue({
                response: { data: { error: 'Invalid Udyam' } }
            });

            await expect(service.fileCase(request)).rejects.toThrow();
            expect(createdCase['syncErrors']).toContain('Invalid Udyam');
        });
    });

    describe('getCaseStatus', () => {
        it('should sync status from portal', async () => {
            const msmeCase = {
                id: 'c1',
                msmeCaseNumber: 'CASE-001',
                status: MSMECaseStatus.SUBMITTED,
                timeline: [{ status: MSMECaseStatus.SUBMITTED }]
            };

            mockRepo.findOne.mockResolvedValue(msmeCase);
            (service as any).axiosInstance.get.mockResolvedValue({
                data: {
                    status: 'hearing_scheduled',
                    hearing_date: '2025-02-01'
                }
            });

            const result = await service.getCaseStatus('c1');

            expect(result.status).toBe(MSMECaseStatus.HEARING_SCHEDULED);
            expect(result.hearingDate).toBeDefined();
            expect(mockRepo.save).toHaveBeenCalled();
        });
    });
});
