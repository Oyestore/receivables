import { validate } from 'class-validator';
import {
    StartSessionDto,
    SendMessageDto,
    VerifyPaymentDto,
    RaiseDisputeDto,
    ShareReferralDto,
    ProcessInvoiceDto,
} from '../concierge.dto';
import { ChatPersona } from '../../entities/chat-session.entity';

describe('Concierge DTOs Validation', () => {
    describe('StartSessionDto', () => {
        it('should validate valid session start', async () => {
            const dto = new StartSessionDto();
            dto.tenantId = 'tenant-1';
            dto.persona = ChatPersona.PAYER;
            dto.referenceId = 'invoice-123';

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should fail without tenantId', async () => {
            const dto = new StartSessionDto();
            dto.persona = ChatPersona.CFO;

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('tenantId');
        });

        it('should fail with invalid persona', async () => {
            const dto = new StartSessionDto();
            dto.tenantId = 'tenant-1';
            dto.persona = 'INVALID' as any;

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should allow optional referenceId', async () => {
            const dto = new StartSessionDto();
            dto.tenantId = 'tenant-1';
            dto.persona = ChatPersona.CFO;

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });
    });

    describe('SendMessageDto', () => {
        it('should validate valid message', async () => {
            const dto = new SendMessageDto();
            dto.message = 'Can I get a payment extension?';
            dto.language = 'en';

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should fail with empty message', async () => {
            const dto = new SendMessageDto();
            dto.message = '';

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail without message', async () => {
            const dto = new SendMessageDto();
            dto.language = 'en';

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].property).toBe('message');
        });

        it('should allow optional language', async () => {
            const dto = new SendMessageDto();
            dto.message = 'Test message';

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });
    });

    describe('VerifyPaymentDto', () => {
        it('should validate valid payment verification', async () => {
            const dto = new VerifyPaymentDto();
            dto.razorpay_order_id = 'order_123';
            dto.razorpay_payment_id = 'pay_456';
            dto.razorpay_signature = 'sig_789';

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should fail without order ID', async () => {
            const dto = new VerifyPaymentDto();
            dto.razorpay_payment_id = 'pay_456';
            dto.razorpay_signature = 'sig_789';

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail without payment ID', async () => {
            const dto = new VerifyPaymentDto();
            dto.razorpay_order_id = 'order_123';
            dto.razorpay_signature = 'sig_789';

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail without signature', async () => {
            const dto = new VerifyPaymentDto();
            dto.razorpay_order_id = 'order_123';
            dto.razorpay_payment_id = 'pay_456';

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });
    });

    describe('RaiseDisputeDto', () => {
        it('should validate valid dispute', async () => {
            const dto = new RaiseDisputeDto();
            dto.type = 'incorrect_amount';
            dto.description = 'The invoice amount is significantly higher than agreed';
            dto.contactEmail = 'customer@example.com';
            dto.evidence = ['receipt.pdf', 'contract.pdf'];

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should fail with short description', async () => {
            const dto = new RaiseDisputeDto();
            dto.type = 'fraud';
            dto.description = 'Short';

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail with invalid email', async () => {
            const dto = new RaiseDisputeDto();
            dto.type = 'incorrect_amount';
            dto.description = 'Valid description that is long enough';
            dto.contactEmail = 'invalid-email';

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should allow optional email and evidence', async () => {
            const dto = new RaiseDisputeDto();
            dto.type = 'incorrect_amount';
            dto.description = 'Valid description that is long enough';

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });
    });

    describe('ShareReferralDto', () => {
        it('should validate valid referral share', async () => {
            const dto = new ShareReferralDto();
            dto.channel = 'whatsapp';
            dto.recipientType = 'supplier';

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should validate all channel types', async () => {
            const channels: Array<'whatsapp' | 'linkedin' | 'twitter' | 'email'> = [
                'whatsapp',
                'linkedin',
                'twitter',
                'email',
            ];

            for (const channel of channels) {
                const dto = new ShareReferralDto();
                dto.channel = channel;
                dto.recipientType = 'peer';

                const errors = await validate(dto);
                expect(errors).toHaveLength(0);
            }
        });

        it('should fail with invalid channel', async () => {
            const dto = new ShareReferralDto();
            dto.channel = 'facebook' as any;
            dto.recipientType = 'supplier';

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail with invalid recipient type', async () => {
            const dto = new ShareReferralDto();
            dto.channel = 'whatsapp';
            dto.recipientType = 'customer' as any;

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });
    });

    describe('ProcessInvoiceDto', () => {
        it('should validate valid invoice processing', async () => {
            const dto = new ProcessInvoiceDto();
            dto.filePath = '/uploads/invoice-123.pdf';
            dto.tenantId = 'tenant-1';
            dto.fileType = 'pdf';

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
        });

        it('should validate all file types', async () => {
            const fileTypes: Array<'pdf' | 'image' | 'json'> = ['pdf', 'image', 'json'];

            for (const fileType of fileTypes) {
                const dto = new ProcessInvoiceDto();
                dto.filePath = `/uploads/invoice.${fileType}`;
                dto.tenantId = 'tenant-1';
                dto.fileType = fileType;

                const errors = await validate(dto);
                expect(errors).toHaveLength(0);
            }
        });

        it('should fail without filePath', async () => {
            const dto = new ProcessInvoiceDto();
            dto.tenantId = 'tenant-1';
            dto.fileType = 'pdf';

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });

        it('should fail with invalid file type', async () => {
            const dto = new ProcessInvoiceDto();
            dto.filePath = '/uploads/invoice.doc';
            dto.tenantId = 'tenant-1';
            dto.fileType = 'doc' as any;

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
        });
    });
});
