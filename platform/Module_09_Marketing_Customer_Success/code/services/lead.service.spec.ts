import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LeadService } from './lead.service';
import { Lead, LeadStatus, LeadSource } from '../entities/lead.entity';
import { Repository } from 'typeorm';

const mockLeadRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
};

describe('LeadService', () => {
    let service: LeadService;
    let repository: Repository<Lead>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LeadService,
                {
                    provide: getRepositoryToken(Lead),
                    useValue: mockLeadRepository,
                },
            ],
        }).compile();

        service = module.get<LeadService>(LeadService);
        repository = module.get<Repository<Lead>>(getRepositoryToken(Lead));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a new lead with initial score', async () => {
            const createLeadDto = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@business.com',
                companyName: 'Acme Corp',
            };
            const savedLead = { ...createLeadDto, id: '1', score: 15, status: LeadStatus.NEW };

            mockLeadRepository.create.mockReturnValue(savedLead);
            mockLeadRepository.save.mockResolvedValue(savedLead);

            const result = await service.create(createLeadDto);

            expect(repository.create).toHaveBeenCalledWith(createLeadDto);
            expect(repository.save).toHaveBeenCalled();
            expect(result.score).toBe(15); // 10 for business email + 5 for company
        });
    });

    describe('findAll', () => {
        it('should return an array of leads', async () => {
            const leads = [{ id: '1', firstName: 'John' }];
            mockLeadRepository.find.mockResolvedValue(leads);

            const result = await service.findAll();
            expect(result).toEqual(leads);
        });
    });

    describe('updateStatus', () => {
        it('should update lead status', async () => {
            const lead = { id: '1', status: LeadStatus.NEW };
            mockLeadRepository.findOne.mockResolvedValue(lead);
            mockLeadRepository.save.mockResolvedValue({ ...lead, status: LeadStatus.QUALIFIED });

            const result = await service.updateStatus('1', LeadStatus.QUALIFIED);
            expect(result.status).toBe(LeadStatus.QUALIFIED);
        });
    });
});
