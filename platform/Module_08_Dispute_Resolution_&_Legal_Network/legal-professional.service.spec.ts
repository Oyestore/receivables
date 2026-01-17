import { Test, TestingModule } from '@nestjs/testing';
import { LegalProfessionalService } from './legal-professional.service';

describe('LegalProfessionalService', () => {
    let service: LegalProfessionalService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [LegalProfessionalService],
        }).compile();

        service = module.get<LegalProfessionalService>(LegalProfessionalService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
