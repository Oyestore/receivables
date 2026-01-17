import { Test, TestingModule } from '@nestjs/testing';
import { AutomatedPlaybookService } from '../automated-playbook.service';

describe('AutomatedPlaybookService', () => {
    let service: AutomatedPlaybookService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AutomatedPlaybookService],
        }).compile();

        service = module.get<AutomatedPlaybookService>(AutomatedPlaybookService);
    });

    describe('executePlaybook', () => {
        it('should execute automated playbook', async () => {
            const result = await service.executePlaybook({
                playbookId: 'playbook-123',
                customerId: 'customer-123',
                trigger: 'health_score_drop',
            });

            expect(result.executed).toBe(true);
        });
    });

    describe('createPlaybook', () => {
        it('should create new playbook', async () => {
            const result = await service.createPlaybook({
                name: 'Churn Prevention',
                trigger: 'health_score_drop',
                actions: ['send_email', 'notify_csm'],
            });

            expect(result.id).toBeDefined();
        });
    });
});
