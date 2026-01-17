import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceMonitoringService } from './compliance-monitoring.service';

describe('ComplianceMonitoringService', () => {
    let service: ComplianceMonitoringService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ComplianceMonitoringService,
                { provide: 'ComplianceMonitoringRepository', useValue: {} }
            ],
        }).compile();

        service = module.get<ComplianceMonitoringService>(ComplianceMonitoringService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
