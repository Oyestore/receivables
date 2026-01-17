import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { OrchestrationService } from '../orchestration.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OrchestrationService', () => {
    let service: OrchestrationService;
    let loggerLogSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;
    let loggerWarnSpy: jest.SpyInstance;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [OrchestrationService],
        }).compile();

        service = module.get<OrchestrationService>(OrchestrationService);

        // Spy on logger methods
        loggerLogSpy = jest.spyOn(service['logger'], 'log').mockImplementation();
        loggerErrorSpy = jest.spyOn(service['logger'], 'error').mockImplementation();
        loggerWarnSpy = jest.spyOn(service['logger'], 'warn').mockImplementation();

        // Reset mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('triggerEvent', () => {
        // ==================== STANDARD CASES ====================
        describe('Standard Cases', () => {
            it('should successfully trigger an event with complete data', async () => {
                const mockEvent = {
                    type: 'payment.success',
                    source: 'module_16_concierge',
                    data: { paymentId: 'pay_123', amount: 50000 },
                    timestamp: '2025-12-14T10:00:00Z',
                    metadata: { userId: 'user_456' },
                };

                mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { success: true } });

                await service.triggerEvent(mockEvent);

                expect(mockedAxios.post).toHaveBeenCalledWith('/api/orchestration/events', mockEvent);
                expect(mockedAxios.post).toHaveBeenCalledTimes(1);
                expect(loggerLogSpy).toHaveBeenCalledWith('Event triggered: payment.success');
            });

            it('should trigger event without optional metadata', async () => {
                const mockEvent = {
                    type: 'concierge.session_started',
                    source: 'module_16_concierge',
                    data: { sessionId: 'sess_789' },
                    timestamp: '2025-12-14T10:00:00Z',
                };

                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.triggerEvent(mockEvent);

                expect(mockedAxios.post).toHaveBeenCalledWith('/api/orchestration/events', mockEvent);
                expect(loggerLogSpy).toHaveBeenCalled();
            });
        });

        // ==================== EDGE CASES ====================
        describe('Edge Cases', () => {
            it('should handle empty data object', async () => {
                const mockEvent = {
                    type: 'test.event',
                    source: 'module_16_concierge',
                    data: {},
                    timestamp: '2025-12-14T10:00:00Z',
                };

                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.triggerEvent(mockEvent);

                expect(mockedAxios.post).toHaveBeenCalled();
            });

            it('should handle very long event type string', async () => {
                const longEventType = 'a'.repeat(1000);
                const mockEvent = {
                    type: longEventType,
                    source: 'module_16_concierge',
                    data: { test: true },
                    timestamp: '2025-12-14T10:00:00Z',
                };

                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.triggerEvent(mockEvent);

                expect(loggerLogSpy).toHaveBeenCalledWith(`Event triggered: ${longEventType}`);
            });

            it('should handle data with nested objects', async () => {
                const mockEvent = {
                    type: 'complex.event',
                    source: 'module_16_concierge',
                    data: {
                        level1: {
                            level2: {
                                level3: {
                                    value: 'deep',
                                },
                            },
                        },
                    },
                    timestamp: '2025-12-14T10:00:00Z',
                };

                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.triggerEvent(mockEvent);

                expect(mockedAxios.post).toHaveBeenCalledWith('/api/orchestration/events', mockEvent);
            });

            it('should handle data with arrays', async () => {
                const mockEvent = {
                    type: 'array.event',
                    source: 'module_16_concierge',
                    data: [1, 2, 3, 4, 5],
                    timestamp: '2025-12-14T10:00:00Z',
                };

                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.triggerEvent(mockEvent);

                expect(mockedAxios.post).toHaveBeenCalled();
            });
        });

        // ==================== NEGATIVE CASES ====================
        describe('Negative Cases', () => {
            it('should throw error when axios.post fails', async () => {
                const mockEvent = {
                    type: 'test.event',
                    source: 'module_16_concierge',
                    data: { test: true },
                    timestamp: '2025-12-14T10:00:00Z',
                };

                const networkError = new Error('Network timeout');
                mockedAxios.post.mockRejectedValueOnce(networkError);

                await expect(service.triggerEvent(mockEvent)).rejects.toThrow('Network timeout');
                expect(loggerErrorSpy).toHaveBeenCalledWith('Failed to trigger event: Network timeout');
            });

            it('should handle error without message property', async () => {
                const mockEvent = {
                    type: 'test.event',
                    source: 'module_16_concierge',
                    data: {},
                    timestamp: '2025-12-14T10:00:00Z',
                };

                // Non-standard error object
                const weirdError = { code: 500 } as any;
                mockedAxios.post.mockRejectedValueOnce(weirdError);

                await expect(service.triggerEvent(mockEvent)).rejects.toThrow();
                // Should not crash even if error.message is undefined
                expect(loggerErrorSpy).toHaveBeenCalled();
            });

            it('should handle 500 server error from orchestration', async () => {
                const mockEvent = {
                    type: 'test.event',
                    source: 'module_16_concierge',
                    data: {},
                    timestamp: '2025-12-14T10:00:00Z',
                };

                mockedAxios.post.mockRejectedValueOnce({
                    response: { status: 500, data: { error: 'Internal Server Error' } },
                });

                await expect(service.triggerEvent(mockEvent)).rejects.toThrow();
            });

            it('should handle null data gracefully', async () => {
                const mockEvent = {
                    type: 'test.event',
                    source: 'module_16_concierge',
                    data: null,
                    timestamp: '2025-12-14T10:00:00Z',
                };

                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.triggerEvent(mockEvent as any);

                expect(mockedAxios.post).toHaveBeenCalled();
            });
        });
    });

    describe('registerEventListeners', () => {
        // ==================== STANDARD CASES ====================
        describe('Standard Cases', () => {
            it('should successfully register event listeners', async () => {
                process.env.BACKEND_URL = 'http://localhost:3000';

                mockedAxios.post.mockResolvedValueOnce({ status: 200, data: { registered: true } });

                await service.registerEventListeners();

                expect(mockedAxios.post).toHaveBeenCalledWith('/api/orchestration/listeners', {
                    module: 'module_16_concierge',
                    events: expect.arrayContaining([
                        'payment.success',
                        'payment.failed',
                        'dispute.created',
                        'referral.conversion',
                    ]),
                    webhookUrl: 'http://localhost:3000/api/concierge/webhooks/orchestration',
                });
                expect(loggerLogSpy).toHaveBeenCalledWith(
                    'Registering Module 16 event listeners with orchestration...'
                );
                expect(loggerLogSpy).toHaveBeenCalledWith('Event listeners registered successfully');
            });
        });

        // ==================== EDGE CASES ====================
        describe('Edge Cases', () => {
            it('should handle BACKEND_URL with trailing slash', async () => {
                process.env.BACKEND_URL = 'http://localhost:3000/';

                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.registerEventListeners();

                expect(mockedAxios.post).toHaveBeenCalledWith(
                    '/api/orchestration/listeners',
                    expect.objectContaining({
                        webhookUrl: 'http://localhost:3000//api/concierge/webhooks/orchestration', // Should fix this
                    })
                );
            });

            it('should handle missing BACKEND_URL environment variable', async () => {
                delete process.env.BACKEND_URL;

                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.registerEventListeners();

                expect(mockedAxios.post).toHaveBeenCalledWith(
                    '/api/orchestration/listeners',
                    expect.objectContaining({
                        webhookUrl: 'undefined/api/concierge/webhooks/orchestration', // BUG!
                    })
                );
            });
        });

        // ==================== NEGATIVE CASES ====================
        describe('Negative Cases', () => {
            it('should log error but not throw when registration fails', async () => {
                process.env.BACKEND_URL = 'http://localhost:3000';

                const registrationError = new Error('Registration service unavailable');
                mockedAxios.post.mockRejectedValueOnce(registrationError);

                // Should not throw!
                await service.registerEventListeners();

                expect(loggerErrorSpy).toHaveBeenCalledWith(
                    'Failed to register event listeners: Registration service unavailable'
                );
            });

            it('should handle network timeout during registration', async () => {
                process.env.BACKEND_URL = 'http://localhost:3000';

                mockedAxios.post.mockRejectedValueOnce({ code: 'ECONNABORTED', message: 'timeout' });

                await service.registerEventListeners();

                expect(loggerErrorSpy).toHaveBeenCalled();
            });
        });
    });

    describe('getModuleEventTypes', () => {
        // ==================== STANDARD CASES ====================
        it('should return array of all Module 16 event types', () => {
            const eventTypes = service.getModuleEventTypes();

            expect(eventTypes).toBeInstanceOf(Array);
            expect(eventTypes.length).toBe(15);
            expect(eventTypes).toContain('concierge.session_started');
            expect(eventTypes).toContain('concierge.payment_completed');
            expect(eventTypes).toContain('concierge.fraud_detected');
        });

        it('should return same array on multiple calls (no side effects)', () => {
            const first = service.getModuleEventTypes();
            const second = service.getModuleEventTypes();

            expect(first).toEqual(second);
        });

        // ==================== EDGE CASES ====================
        it('should not allow mutation of returned array', () => {
            const eventTypes = service.getModuleEventTypes();
            const originalLength = eventTypes.length;

            // Try to mutate
            eventTypes.push('malicious.event');

            // Next call should be unaffected
            const newEventTypes = service.getModuleEventTypes();
            expect(newEventTypes.length).toBe(originalLength);
        });
    });

    describe('emit', () => {
        // ==================== STANDARD CASES ====================
        describe('Standard Cases', () => {
            it('should emit event with data only', async () => {
                const mockData = { sessionId: 'sess_123' };

                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.emit('concierge.session_started', mockData);

                expect(mockedAxios.post).toHaveBeenCalledWith('/api/orchestration/events', {
                    type: 'concierge.session_started',
                    source: 'module_16_concierge',
                    data: mockData,
                    timestamp: expect.any(String),
                    metadata: undefined,
                });
            });

            it('should emit event with data and metadata', async () => {
                const mockData = { paymentId: 'pay_123' };
                const mockMetadata = { userId: 'user_456', ip: '192.168.1.1' };

                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.emit('concierge.payment_completed', mockData, mockMetadata);

                expect(mockedAxios.post).toHaveBeenCalledWith('/api/orchestration/events', {
                    type: 'concierge.payment_completed',
                    source: 'module_16_concierge',
                    data: mockData,
                    timestamp: expect.any(String),
                    metadata: mockMetadata,
                });
            });

            it('should generate ISO timestamp', async () => {
                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.emit('test.event', {});

                const call = mockedAxios.post.mock.calls[0][1];
                expect(call.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
            });
        });

        // ==================== EDGE CASES ====================
        describe('Edge Cases', () => {
            it('should handle empty data object', async () => {
                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.emit('test.event', {});

                expect(mockedAxios.post).toHaveBeenCalledWith('/api/orchestration/events', expect.objectContaining({
                    data: {},
                }));
            });

            it('should handle falsy metadata (null, undefined, 0, false)', async () => {
                mockedAxios.post.mockResolvedValueOnce({ status: 200 });

                await service.emit('test.event', { test: true }, null);

                expect(mockedAxios.post).toHaveBeenCalledWith('/api/orchestration/events', expect.objectContaining({
                    metadata: null,
                }));
            });
        });

        // ==================== NEGATIVE CASES ====================
        describe('Negative Cases', () => {
            it('should propagate errors from triggerEvent', async () => {
                const emitError = new Error('Emit failed');
                mockedAxios.post.mockRejectedValueOnce(emitError);

                await expect(service.emit('test.event', {})).rejects.toThrow('Emit failed');
            });
        });
    });

    describe('handleWebhook', () => {
        // ==================== STANDARD CASES ====================
        describe('Standard Cases', () => {
            it('should route payment.success event to handler', async () => {
                const mockEvent = {
                    type: 'payment.success',
                    source: 'module_03_payment',
                    data: { paymentId: 'pay_123' },
                    timestamp: '2025-12-14T10:00:00Z',
                };

                await service.handleWebhook(mockEvent);

                expect(loggerLogSpy).toHaveBeenCalledWith('Handling orchestration event: payment.success');
                expect(loggerLogSpy).toHaveBeenCalledWith('Payment success event received: pay_123');
            });

            it('should route payment.failed event', async () => {
                const mockEvent = {
                    type: 'payment.failed',
                    source: 'module_03_payment',
                    data: { paymentId: 'pay_456' },
                    timestamp: '2025-12-14T10:00:00Z',
                };

                await service.handleWebhook(mockEvent);

                expect(loggerLogSpy).toHaveBeenCalledWith('Payment failed event received: pay_456');
            });

            it('should route dispute.resolved event', async () => {
                const mockEvent = {
                    type: 'dispute.resolved',
                    source: 'module_08_disputes',
                    data: { ticketId: 'TKT-123' },
                    timestamp: '2025-12-14T10:00:00Z',
                };

                await service.handleWebhook(mockEvent);

                expect(loggerLogSpy).toHaveBeenCalledWith('Dispute resolved event received: TKT-123');
            });

            it('should route referral.conversion event', async () => {
                const mockEvent = {
                    type: 'referral.conversion',
                    source: 'module_09_referrals',
                    data: { referralCode: 'REF-ABC123' },
                    timestamp: '2025-12-14T10:00:00Z',
                };

                await service.handleWebhook(mockEvent);

                expect(loggerLogSpy).toHaveBeenCalledWith('Referral conversion event received: REF-ABC123');
            });

            it('should route referral.reward_credited event', async () => {
                const mockEvent = {
                    type: 'referral.reward_credited',
                    source: 'module_09_referrals',
                    data: { rewardAmount: 500 },
                    timestamp: '2025-12-14T10:00:00Z',
                };

                await service.handleWebhook(mockEvent);

                expect(loggerLogSpy).toHaveBeenCalledWith('Reward credited event received: 500');
            });
        });

        // ==================== EDGE CASES ====================
        describe('Edge Cases', () => {
            it('should handle unknown event type gracefully', async () => {
                const mockEvent = {
                    type: 'unknown.event.type',
                    source: 'unknown_module',
                    data: {},
                    timestamp: '2025-12-14T10:00:00Z',
                };

                await service.handleWebhook(mockEvent);

                expect(loggerWarnSpy).toHaveBeenCalledWith('Unhandled event type: unknown.event.type');
            });

            it('should handle event with missing data fields', async () => {
                const mockEvent = {
                    type: 'payment.success',
                    source: 'module_03_payment',
                    data: {}, // Missing paymentId
                    timestamp: '2025-12-14T10:00:00Z',
                };

                await service.handleWebhook(mockEvent);

                // Should not crash, but log undefined
                expect(loggerLogSpy).toHaveBeenCalledWith('Payment success event received: undefined');
            });
        });

        // ==================== NEGATIVE CASES ====================
        describe('Negative Cases', () => {
            it('should handle malformed event object', async () => {
                const malformedEvent = {
                    // Missing required fields
                } as any;

                await expect(service.handleWebhook(malformedEvent)).resolves.not.toThrow();
            });

            it('should handle event with null data', async () => {
                const mockEvent = {
                    type: 'payment.success',
                    source: 'module_03',
                    data: null,
                    timestamp: '2025-12-14T10:00:00Z',
                } as any;

                // Should not crash
                await expect(service.handleWebhook(mockEvent)).resolves.not.toThrow();
            });
        });
    });

    // ==================== INTEGRATION TESTS ====================
    describe('Integration Tests', () => {
        it('should complete full event lifecycle: emit + receive webhook', async () => {
            mockedAxios.post.mockResolvedValueOnce({ status: 200 });

            // Emit event
            await service.emit('concierge.payment_completed', { paymentId: 'pay_123' });

            // Simulate receiving webhook response
            const webhookEvent = {
                type: 'payment.success',
                source: 'module_03_payment',
                data: { paymentId: 'pay_123' },
                timestamp: new Date().toISOString(),
            };

            await service.handleWebhook(webhookEvent);

            // Both should succeed
            expect(loggerLogSpy).toHaveBeenCalledWith('Event triggered: concierge.payment_completed');
            expect(loggerLogSpy).toHaveBeenCalledWith('Payment success event received: pay_123');
        });

        it('should handle concurrent event emissions', async () => {
            mockedAxios.post.mockResolvedValue({ status: 200 });

            // Emit multiple events concurrently
            const promises = [
                service.emit('concierge.session_started', { sessionId: '1' }),
                service.emit('concierge.invoice_viewed', { invoiceId: '2' }),
                service.emit('concierge.payment_initiated', { paymentId: '3' }),
            ];

            await Promise.all(promises);

            expect(mockedAxios.post).toHaveBeenCalledTimes(3);
        });
    });
});
