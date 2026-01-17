import { Test, TestingModule } from '@nestjs/testing';
import { StaticPortalService } from '../../services/static-portal.service';
import { PayerPortalSession } from '../../entities/payer-portal-session.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const mockSessionRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
};

const mockConfigService = {
    get: jest.fn(() => 'test-secret')
};

const mockJwtService = {
    sign: jest.fn(() => 'mock-jwt-token'),
    verify: jest.fn(() => ({ sessionId: 'SESSION_1' }))
};

describe('StaticPortalService', () => {
    let service: StaticPortalService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StaticPortalService,
                { provide: getRepositoryToken(PayerPortalSession), useValue: mockSessionRepo },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: JwtService, useValue: mockJwtService }
            ]
        }).compile();

        service = module.get<StaticPortalService>(StaticPortalService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createSession', () => {
        it('should create a new session link', async () => {
            mockSessionRepo.create.mockReturnValue({ id: 'SESSION_1' });
            mockSessionRepo.save.mockResolvedValue({ id: 'SESSION_1' });

            const result = await service.createSession('INV-001', 'CUST-001', 'TENANT-1');

            expect(result.magicLink).toContain('/portal/view/');
            expect(mockSessionRepo.save).toHaveBeenCalled();
        });
    });

    describe('validateSession', () => {
        it('should return session for valid token', async () => {
            const validSession = {
                id: 'SESSION_1',
                invoiceId: 'INV-001',
                expiresAt: new Date(Date.now() + 1000000), // Future
                isActive: true
            };
            mockSessionRepo.findOne.mockResolvedValue(validSession);

            const result = await service.validateSession('valid-token');
            expect(result.id).toBe('SESSION_1');
        });

        it('should throw for expired session', async () => {
            const expiredSession = {
                id: 'SESSION_1',
                expiresAt: new Date(Date.now() - 1000), // Past
                isActive: true
            };
            mockSessionRepo.findOne.mockResolvedValue(expiredSession);

            await expect(service.validateSession('token')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw for inactive session', async () => {
            const inactiveSession = {
                id: 'SESSION_1',
                expiresAt: new Date(Date.now() + 100000),
                isActive: false
            };
            mockSessionRepo.findOne.mockResolvedValue(inactiveSession);

            await expect(service.validateSession('token')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('initiatePayment', () => {
        it('should return payment gateway config', async () => {
            const session = new PayerPortalSession();
            session.id = 'S1';
            session.expiresAt = new Date(Date.now() + 99999);
            session.isActive = true;

            mockSessionRepo.findOne.mockResolvedValue(session);

            const result = await service.initiatePayment('token', 1000, 'UPI');

            expect(result.paymentOrderId).toBeDefined();
            expect(result.gatewayUrl).toBeDefined();
        });

        it('should throw for invalid token', async () => {
            mockJwtService.verify.mockImplementationOnce(() => { throw new Error('Invalid'); });
            await expect(service.initiatePayment('bad-token', 100, 'UPI')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('raiseDispute', () => {
        it('should log dispute and return ticket', async () => {
            const session = new PayerPortalSession();
            session.id = 'S1';
            session.expiresAt = new Date(Date.now() + 99999);
            session.isActive = true;
            mockSessionRepo.findOne.mockResolvedValue(session);

            const result = await service.raiseDispute('token', 'Wrong amount', 'High');

            expect(result.ticketId).toBeDefined();
            expect(result.status).toBe('OPEN');
        });
    });
});
