import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentLinkService } from './payment-link.service';
import { PaymentLink } from '../entities/payment-link.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';

describe('PaymentLinkService', () => {
    let service: PaymentLinkService;
    let linkRepo: Repository<PaymentLink>;
    let paymentRepo: Repository<PaymentTransaction>;

    const mockLinkRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
    };

    const mockPaymentRepo = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentLinkService,
                {
                    provide: getRepositoryToken(PaymentLink),
                    useValue: mockLinkRepo,
                },
                {
                    provide: getRepositoryToken(PaymentTransaction),
                    useValue: mockPaymentRepo,
                },
            ],
        }).compile();

        service = module.get<PaymentLinkService>(PaymentLinkService);
        linkRepo = module.get(getRepositoryToken(PaymentLink));
        paymentRepo = module.get(getRepositoryToken(PaymentTransaction));

        // Set environment variable for testing
        process.env.PAYMENT_LINK_BASE_URL = 'https://test-pay.example.com';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createPaymentLink', () => {
        const createParams = {
            tenantId: 'tenant-123',
            invoiceId: 'inv-456',
            amount: 10000,
            currency: 'INR',
            description: 'Test Invoice Payment',
            customerEmail: 'customer@example.com',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        };

        it('should create payment link successfully', async () => {
            const mockLink = {
                id: 'link-1',
                short_code: 'ABC12345',
                amount: 10000,
                status: 'active',
            };

            mockLinkRepo.create.mockReturnValue(mockLink);
            mockLinkRepo.save.mockResolvedValue(mockLink);

            const result = await service.createPaymentLink(createParams);

            expect(result.shortCode).toBeDefined();
            expect(result.url).toContain('https://test-pay.example.com/pay/');
            expect(result.qrCode).toContain('data:image/png;base64');
            expect(mockLinkRepo.save).toHaveBeenCalled();
        });

        it('should generate unique short codes', async () => {
            const codes = new Set();

            for (let i = 0; i < 100; i++) {
                mockLinkRepo.create.mockReturnValue({ short_code: `CODE${i}` });
                mockLinkRepo.save.mockResolvedValue({ id: `link-${i}` });

                const result = await service.createPaymentLink({
                    ...createParams,
                    invoiceId: `inv-${i}`,
                });

                codes.add(result.shortCode);
            }

            expect(codes.size).toBe(100); // All unique
        });

        it('should handle expiration date correctly', async () => {
            const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

            mockLinkRepo.create.mockReturnValue({});
            mockLinkRepo.save.mockResolvedValue({ id: 'link-1' });

            const result = await service.createPaymentLink({
                ...createParams,
                expiresAt,
            });

            expect(result.expiresAt).toEqual(expiresAt);
        });
    });

    describe('getPaymentLink', () => {
        it('should retrieve active payment link', async () => {
            const mockLink = {
                id: 'link-1',
                short_code: 'ABC12345',
                amount: 10000,
                status: 'active',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                use_count: 0,
                max_uses: 1,
            };

            mockLinkRepo.findOne.mockResolvedValue(mockLink);

            const result = await service.getPaymentLink('ABC12345');

            expect(result).toEqual(mockLink);
            expect(mockLinkRepo.findOne).toHaveBeenCalledWith({
                where: { short_code: 'ABC12345' },
                relations: ['invoice'],
            });
        });

        it('should reject expired payment link', async () => {
            const mockLink = {
                id: 'link-1',
                short_code: 'EXPIRED1',
                expires_at: new Date(Date.now() - 1000), // Expired
                status: 'active',
            };

            mockLinkRepo.findOne.mockResolvedValue(mockLink);
            mockLinkRepo.save.mockResolvedValue({ ...mockLink, status: 'expired' });

            await expect(service.getPaymentLink('EXPIRED1')).rejects.toThrow(
                'Payment link has expired'
            );

            expect(mockLinkRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'expired' })
            );
        });

        it('should reject used one-time link', async () => {
            const mockLink = {
                id: 'link-1',
                short_code: 'USED1',
                status: 'active',
                use_count: 1,
                max_uses: 1,
            };

            mockLinkRepo.findOne.mockResolvedValue(mockLink);
            mockLinkRepo.save.mockResolvedValue({ ...mockLink, status: 'used' });

            await expect(service.getPaymentLink('USED1')).rejects.toThrow(
                'Payment link has been used'
            );
        });

        it('should throw error for non-existent link', async () => {
            mockLinkRepo.findOne.mockResolvedValue(null);

            await expect(service.getPaymentLink('NOTFOUND')).rejects.toThrow(
                'Payment link not found'
            );
        });
    });

    describe('processPaymentViaLink', () => {
        it('should process payment successfully', async () => {
            const mockLink = {
                id: 'link-1',
                tenant_id: 'tenant-123',
                invoice_id: 'inv-456',
                short_code: 'PAY123',
                amount: 10000,
                currency: 'INR',
                use_count: 0,
                max_uses: 5,
                status: 'active',
            };

            const mockPayment = {
                id: 'payment-1',
                transaction_id: 'TXN789',
                amount: 10000,
            };

            mockLinkRepo.findOne.mockResolvedValue(mockLink);
            mockLinkRepo.save.mockResolvedValue({ ...mockLink, use_count: 1 });
            mockPaymentRepo.create.mockReturnValue(mockPayment);
            mockPaymentRepo.save.mockResolvedValue(mockPayment);

            const result = await service.processPaymentViaLink({
                shortCode: 'PAY123',
                paymentMethod: 'upi',
                paymentDetails: { vpa: 'user@paytm' },
            });

            expect(result.success).toBe(true);
            expect(result.paymentId).toBe('payment-1');
            expect(mockLinkRepo.save).toHaveBeenCalled();
            expect(mockPaymentRepo.save).toHaveBeenCalled();
        });

        it('should increment use count', async () => {
            const mockLink = {
                id: 'link-1',
                tenant_id: 'tenant-123',
                short_code: 'PAY123',
                amount: 5000,
                use_count: 2,
                max_uses: 5,
                status: 'active',
            };

            mockLinkRepo.findOne.mockResolvedValue(mockLink);
            mockLinkRepo.save.mockResolvedValue({ ...mockLink, use_count: 3 });
            mockPaymentRepo.create.mockReturnValue({ id: 'payment-1' });
            mockPaymentRepo.save.mockResolvedValue({ id: 'payment-1' });

            await service.processPaymentViaLink({
                shortCode: 'PAY123',
                paymentMethod: 'card',
                paymentDetails: {},
            });

            expect(mockLinkRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ use_count: 3 })
            );
        });

        it('should mark link as used when max uses reached', async () => {
            const mockLink = {
                id: 'link-1',
                tenant_id: 'tenant-123',
                short_code: 'LASTUSE',
                amount: 1000,
                use_count: 4,
                max_uses: 5,
                status: 'active',
            };

            mockLinkRepo.findOne.mockResolvedValue(mockLink);
            mockLinkRepo.save.mockResolvedValue({
                ...mockLink,
                use_count: 5,
                status: 'used',
            });
            mockPaymentRepo.create.mockReturnValue({ id: 'payment-1' });
            mockPaymentRepo.save.mockResolvedValue({ id: 'payment-1' });

            await service.processPaymentViaLink({
                shortCode: 'LASTUSE',
                paymentMethod: 'upi',
                paymentDetails: {},
            });

            expect(mockLinkRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    use_count: 5,
                    status: 'used',
                })
            );
        });
    });

    describe('generateQRCode', () => {
        it('should generate UPI QR code', async () => {
            const result = await service.generateQRCode({
                type: 'upi',
                data: {
                    vpa: 'merchant@paytm',
                    name: 'Test Merchant',
                    amount: 5000,
                    note: 'Test payment',
                },
            });

            expect(result.dataUrl).toContain('data:image/png;base64');
            expect(result.svg).toBeDefined();
        });

        it('should generate payment link QR code', async () => {
            const result = await service.generateQRCode({
                type: 'payment_link',
                data: 'https://test-pay.example.com/pay/ABC123',
                size: 400,
            });

            expect(result.dataUrl).toContain('data:image/png;base64');
        });

        it('should respect size parameter', async () => {
            const resultSmall = await service.generateQRCode({
                type: 'payment_link',
                data: 'https://example.com/pay/TEST',
                size: 200,
            });

            const resultLarge = await service.generateQRCode({
                type: 'payment_link',
                data: 'https://example.com/pay/TEST',
                size: 600,
            });

            expect(resultSmall.dataUrl).toBeDefined();
            expect(resultLarge.dataUrl).toBeDefined();
            // Large QR should have more data (higher resolution)
            expect(resultLarge.dataUrl.length).toBeGreaterThan(resultSmall.dataUrl.length);
        });

        it('should support custom colors', async () => {
            const result = await service.generateQRCode({
                type: 'payment_link',
                data: 'https://example.com/pay/CUSTOM',
                color: {
                    dark: '#FF0000',
                    light: '#00FF00',
                },
            });

            expect(result.dataUrl).toBeDefined();
        });
    });

    describe('generateInvoiceQRCode', () => {
        it('should generate invoice-specific QR code', async () => {
            const result = await service.generateInvoiceQRCode({
                invoiceId: 'INV-001',
                merchantVPA: 'merchant@ybl',
                merchantName: 'Test Merchant Inc',
                amount: 25000,
            });

            expect(result.qrCodeDataUrl).toContain('data:image/png;base64');
            expect(result.upiString).toContain('upi://pay?');
            expect(result.upiString).toContain('pa=merchant%40ybl');
            expect(result.upiString).toContain('am=25000');
            expect(result.upiString).toContain('INV-001');
        });
    });

    describe('cancelPaymentLink', () => {
        it('should cancel active payment link', async () => {
            const mockLink = {
                id: 'link-1',
                short_code: 'CANCEL1',
                status: 'active',
            };

            mockLinkRepo.findOne.mockResolvedValue(mockLink);
            mockLinkRepo.save.mockResolvedValue({ ...mockLink, status: 'cancelled' });

            await service.cancelPaymentLink('CANCEL1');

            expect(mockLinkRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'cancelled' })
            );
        });

        it('should throw error for non-existent link', async () => {
            mockLinkRepo.findOne.mockResolvedValue(null);

            await expect(service.canc elPaymentLink('NOTFOUND')).rejects.toThrow(
                'Payment link not found'
            );
        });
    });

    describe('Edge Cases & Performance', () => {
        it('should handle concurrent link creation', async () => {
            mockLinkRepo.create.mockReturnValue({});
            mockLinkRepo.save.mockResolvedValue({ id: 'link-1' });

            const promises = Array.from({ length: 10 }, (_, i) =>
                service.createPaymentLink({
                    tenantId: 'tenant-123',
                    amount: 1000 * (i + 1),
                    description: `Test ${i}`,
                })
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(10);
            expect(new Set(results.map(r => r.shortCode)).size).toBe(10); // All unique
        });

        it('should generate QR codes quickly', async () => {
            const startTime = Date.now();

            await Promise.all(
                Array.from({ length: 50 }, () =>
                    service.generateQRCode({
                        type: 'upi',
                        data: {
                            vpa: 'test@paytm',
                            amount: 1000,
                        },
                    })
                )
            );

            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(3000); // < 3 seconds for 50 QR codes
        });
    });
});
