import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadService } from '../lead.service';
import { Lead, LeadStatus } from '../../entities/lead.entity';
import { NotFoundException } from '@nestjs/common';

describe('LeadService', () => {
    let service: LeadService;
    let repository: Repository<Lead>;

    const mockLead = {
        id: 'lead-123',
        email: 'test@company.com',
        companyName: 'Test Company',
        phone: '+91-1234567890',
        status: LeadStatus.NEW,
        score: 20,
        source: 'website',
        createdAt: new Date(),
    };

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LeadService,
                {
                    provide: getRepositoryToken(Lead),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<LeadService>(LeadService);
        repository = module.get<Repository<Lead>>(getRepositoryToken(Lead));

        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create lead with initial score', async () => {
            mockRepository.create.mockReturnValue(mockLead);
            mockRepository.save.mockResolvedValue(mockLead);

            const result = await service.create({
                email: 'test@company.com',
                companyName: 'Test Company',
                phone: '+91-1234567890',
            });

            expect(result.score).toBeDefined();
            expect(repository.save).toHaveBeenCalled();
        });

        it('should give bonus for business email', async () => {
            mockRepository.create.mockImplementation((data) => ({ ...data, score: 0 }));
            mockRepository.save.mockImplementation((data) => Promise.resolve(data));

            const result = await service.create({
                email: 'info@business.com',
            });

            expect(result.score).toBeGreaterThan(0);
        });

        it('should not give bonus for personal email', async () => {
            mockRepository.create.mockImplementation((data) => ({ ...data, score: 0 }));
            mockRepository.save.mockImplementation((data) => Promise.resolve(data));

            const result = await service.create({
                email: 'user@gmail.com',
            });

            expect(result.score).toBe(0);
        });
    });

    describe('findAll', () => {
        it('should return all leads', async () => {
            const leads = [mockLead, { ...mockLead, id: 'lead-456' }];
            mockRepository.find.mockResolvedValue(leads);

            const result = await service.findAll();

            expect(result).toEqual(leads);
            expect(repository.find).toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        it('should return lead by id', async () => {
            mockRepository.findOne.mockResolvedValue(mockLead);

            const result = await service.findOne('lead-123');

            expect(result).toEqual(mockLead);
        });

        it('should throw NotFoundException when not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update lead', async () => {
            mockRepository.findOne.mockResolvedValue(mockLead);
            mockRepository.save.mockImplementation((data) => Promise.resolve(data));

            const result = await service.update('lead-123', { companyName: 'Updated Company' });

            expect(result.companyName).toBe('Updated Company');
            expect(repository.save).toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('should remove lead', async () => {
            mockRepository.findOne.mockResolvedValue(mockLead);
            mockRepository.remove.mockResolvedValue(mockLead);

            await service.remove('lead-123');

            expect(repository.remove).toHaveBeenCalledWith(mockLead);
        });
    });

    describe('updateStatus', () => {
        it('should update lead status', async () => {
            mockRepository.findOne.mockResolvedValue(mockLead);
            mockRepository.save.mockImplementation((data) => Promise.resolve(data));

            const result = await service.updateStatus('lead-123', LeadStatus.QUALIFIED);

            expect(result.status).toBe(LeadStatus.QUALIFIED);
        });
    });

    describe('calculateScore', () => {
        it('should recalculate lead score', async () => {
            const lead = {
                ...mockLead,
                email: 'contact@enterprise.com',
                companyName: 'Enterprise Inc',
                phone: '+91-9876543210',
            };

            mockRepository.findOne.mockResolvedValue(lead);
            mockRepository.save.mockImplementation((data) => Promise.resolve(data));

            const result = await service.calculateScore('lead-123');

            expect(result.score).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle database errors', async () => {
            mockRepository.findOne.mockRejectedValue(new Error('DB Error'));

            await expect(service.findOne('lead-123')).rejects.toThrow();
        });
    });
});
