import { Test, TestingModule } from '@nestjs/testing';
import { DisputeIntegrationService } from '../dispute-integration.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatSession } from '../../entities/chat-session.entity';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DisputeIntegrationService', () => {
    let service: DisputeIntegrationService;
    let sessionRepo: Partial<Repository<ChatSession>>;

    const mockDisputeTicket = {
        id: 'ticket-123',
        invoiceId: 'invoice-456',
        customerId: 'customer-789',
        type: 'incorrect_amount',
        description: 'Invoice amount is wrong',
        status: 'open' as const,
        priority: 'medium' as const,
        createdAt: new Date(),
    };

    beforeEach(async () => {
        sessionRepo = {
            findOne: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn(),
            })) as any,
        };

        mockedAxios.post.mockResolvedValue({ data: mockDisputeTicket });
        mockedAxios.get.mockResolvedValue({ data: mockDisputeTicket });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DisputeIntegrationService,
                {
                    provide: getRepositoryToken(ChatSession),
                    useValue: sessionRepo,
                },
            ],
        }).compile();

        service = module.get<DisputeIntegrationService>(DisputeIntegrationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createDisputeTicket', () => {
        it('should create dispute ticket in Module 08', async () => {
            const mockSession = {
                id: 'session-1',
                externalReferenceId: 'invoice-456',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const disputeData = {
                type: 'incorrect_amount',
                description: 'Amount is wrong',
                contactEmail: 'customer@example.com',
            };

            const result = await service.createDisputeTicket('session-1', disputeData);

            expect(result).toEqual(mockDisputeTicket);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/disputes/tickets',
                expect.objectContaining({
                    invoiceId: 'invoice-456',
                    type: 'incorrect_amount',
                    description: 'Amount is wrong',
                })
            );
        });

        it('should throw error if session not found', async () => {
            (sessionRepo.findOne as jest.Mock).mockResolvedValue(null);

            await expect(
                service.createDisputeTicket('invalid-session', {
                    type: 'fraud',
                    description: 'Test',
                })
            ).rejects.toThrow('Session not found');
        });

        it('should update session with dispute reference', async () => {
            const mockSession = {
                id: 'session-1',
                externalReferenceId: 'invoice-456',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.createDisputeTicket('session-1', {
                type: 'incorrect_amount',
                description: 'Test',
            });

            expect(sessionRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        disputeTicketId: 'ticket-123',
                        disputeStatus: 'open',
                    }),
                })
            );
        });

        it('should trigger orchestration event', async () => {
            const mockSession = {
                id: 'session-1',
                externalReferenceId: 'invoice-456',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.createDisputeTicket('session-1', {
                type: 'fraud',
                description: 'Unauthorized transaction',
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/orchestration/events',
                expect.objectContaining({
                    type: 'dispute_created',
                    source: 'module_16_concierge',
                })
            );
        });

        it('should send dispute notifications', async () => {
            const mockSession = {
                id: 'session-1',
                externalReferenceId: 'invoice-456',
                tenantId: 'tenant-1',
                metadata: {
                    customerEmail: 'customer@example.com',
                    customerPhone: '+919876543210',
                    tenantEmail: 'vendor@example.com',
                },
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.createDisputeTicket('session-1', {
                type: 'incorrect_amount',
                description: 'Test',
            });

            // Email to customer
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/email',
                expect.objectContaining({
                    to: 'customer@example.com',
                    template: 'dispute_created',
                })
            );

            // WhatsApp to customer
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    to: '+919876543210',
                    template: 'dispute_ticket_created',
                })
            );

            // Email to vendor
            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/email',
                expect.objectContaining({
                    to: 'vendor@example.com',
                    template: 'dispute_vendor_alert',
                })
            );
        });

        it('should include evidence in dispute ticket', async () => {
            const mockSession = {
                id: 'session-1',
                externalReferenceId: 'invoice-456',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.createDisputeTicket('session-1', {
                type: 'fraud',
                description: 'Unauthorized',
                evidence: ['receipt.pdf', 'screenshot.png'],
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/disputes/tickets',
                expect.objectContaining({
                    evidence: ['receipt.pdf', 'screenshot.png'],
                })
            );
        });
    });

    describe('priority calculation', () => {
        it('should assign high priority to fraud disputes', async () => {
            const mockSession = {
                id: 'session-1',
                externalReferenceId: 'invoice-456',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.createDisputeTicket('session-1', {
                type: 'fraud',
                description: 'Fraudulent transaction',
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/disputes/tickets',
                expect.objectContaining({
                    priority: 'high',
                })
            );
        });

        it('should assign medium priority to incorrect_amount', async () => {
            const mockSession = {
                id: 'session-1',
                externalReferenceId: 'invoice-456',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.createDisputeTicket('session-1', {
                type: 'incorrect_amount',
                description: 'Wrong amount',
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/disputes/tickets',
                expect.objectContaining({
                    priority: 'medium',
                })
            );
        });

        it('should assign low priority to general disputes', async () => {
            const mockSession = {
                id: 'session-1',
                externalReferenceId: 'invoice-456',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.createDisputeTicket('session-1', {
                type: 'general_inquiry',
                description: 'Question about invoice',
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/disputes/tickets',
                expect.objectContaining({
                    priority: 'low',
                })
            );
        });
    });

    describe('getDisputeStatus', () => {
        it('should retrieve dispute status from Module 08', async () => {
            const result = await service.getDisputeStatus('ticket-123');

            expect(result).toEqual(mockDisputeTicket);
            expect(mockedAxios.get).toHaveBeenCalledWith('/api/disputes/tickets/ticket-123');
        });

        it('should handle API errors gracefully', async () => {
            mockedAxios.get.mockRejectedValueOnce(new Error('API unavailable'));

            await expect(service.getDisputeStatus('ticket-123')).rejects.toThrow();
        });
    });

    describe('handleDisputeResolution', () => {
        it('should update session with resolution', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: {
                    disputeTicketId: 'ticket-123',
                },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            const resolution = { outcome: 'resolved_in_favor_of_customer' };

            await service.handleDisputeResolution('ticket-123', resolution);

            expect(sessionRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        disputeStatus: 'resolved',
                        disputeResolution: 'resolved_in_favor_of_customer',
                    }),
                })
            );
        });

        it('should trigger orchestration event on resolution', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: { disputeTicketId: 'ticket-123' },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.handleDisputeResolution('ticket-123', {
                outcome: 'resolved_in_favor_of_vendor',
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/orchestration/events',
                expect.objectContaining({
                    type: 'dispute_resolved',
                    data: expect.objectContaining({
                        outcome: 'resolved_in_favor_of_vendor',
                    }),
                })
            );
        });

        it('should send resolution notification', async () => {
            const mockSession = {
                id: 'session-1',
                metadata: {
                    disputeTicketId: 'ticket-123',
                    customerPhone: '+919876543210',
                },
            };

            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(mockSession),
            });
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            await service.handleDisputeResolution('ticket-123', {
                outcome: 'resolved',
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                '/api/notifications/whatsapp',
                expect.objectContaining({
                    to: '+919876543210',
                    template: 'dispute_resolved',
                })
            );
        });

        it('should handle session not found gracefully', async () => {
            (sessionRepo.createQueryBuilder as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
            });

            // Should not throw error
            await expect(
                service.handleDisputeResolution('ticket-123', { outcome: 'resolved' })
            ).resolves.not.toThrow();
        });
    });

    describe('error handling', () => {
        it('should handle Module 08 API failures', async () => {
            const mockSession = {
                id: 'session-1',
                externalReferenceId: 'invoice-456',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            mockedAxios.post.mockRejectedValueOnce(new Error('Module 08 unavailable'));

            await expect(
                service.createDisputeTicket('session-1', {
                    type: 'fraud',
                    description: 'Test',
                })
            ).rejects.toThrow();
        });

        it('should handle notification failures gracefully', async () => {
            const mockSession = {
                id: 'session-1',
                externalReferenceId: 'invoice-456',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            // Mock notification failure
            mockedAxios.post.mockImplementation((url) => {
                if (url.includes('notifications')) {
                    return Promise.reject(new Error('Notification failed'));
                }
                if (url.includes('disputes')) {
                    return Promise.resolve({ data: mockDisputeTicket });
                }
                return Promise.resolve({ data: {} });
            });

            // Should not throw - ticket still created
            const result = await service.createDisputeTicket('session-1', {
                type: 'fraud',
                description: 'Test',
            });

            expect(result).toBeDefined();
        });

        it('should handle orchestration event failures gracefully', async () => {
            const mockSession = {
                id: 'session-1',
                externalReferenceId: 'invoice-456',
                tenantId: 'tenant-1',
                metadata: {},
            };

            (sessionRepo.findOne as jest.Mock).mockResolvedValue(mockSession);
            (sessionRepo.save as jest.Mock).mockResolvedValue(mockSession);

            mockedAxios.post.mockImplementation((url) => {
                if (url.includes('orchestration')) {
                    return Promise.reject(new Error('Orchestration down'));
                }
                return Promise.resolve({ data: mockDisputeTicket });
            });

            // Should not throw
            const result = await service.createDisputeTicket('session-1', {
                type: 'fraud',
                description: 'Test',
            });

            expect(result).toBeDefined();
        });
    });
});
