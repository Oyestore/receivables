import { Test, TestingModule } from '@nestjs/testing';
import { DistributionModule } from '../src/distribution.module';
import { DistributionService } from '../src/services/distribution.service';
import { DistributionController } from '../src/controllers/distribution.controller';
import { DistributionRule, DistributionAssignment } from '../src/entities/distribution-entities';

describe('DistributionModule', () => {
  let module: TestingModule;
  let distributionService: DistributionService;
  let distributionController: DistributionController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DistributionModule],
    }).compile();

    module = moduleRef;
    distributionService = module.get<DistributionService>(DistributionService);
    distributionController = module.get<DistributionController>(DistributionController);
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
    expect(distributionService).toBeDefined();
    expect(distributionController).toBeDefined();
  });

  it('should have service methods', () => {
    expect(typeof distributionService.createDistributionRule).toBe('function');
    expect(typeof distributionService.getDistributionRules).toBe('function');
    expect(typeof distributionService.createDistributionAssignment).toBe('function');
    expect(typeof distributionService.getDistributionAssignments).toBe('function');
  });

  it('should have controller methods', () => {
    expect(typeof distributionController.createDistributionRule).toBe('function');
    expect(typeof distributionController.getDistributionRules).toBe('function');
    expect(typeof distributionController.createDistributionAssignment).toBe('function');
    expect(typeof distributionController.getDistributionAssignments).toBe('function');
  });

  it('should have proper entity structure', () => {
    const rule = new DistributionRule();
    expect(rule).toHaveProperty('id');
    expect(rule).toHaveProperty('tenantId');
    expect(rule).toHaveProperty('ruleName');
    expect(rule).toHaveProperty('ruleType');
    expect(rule).toHaveProperty('conditions');
    expect(rule).toHaveProperty('targetChannel');
    expect(rule).toHaveProperty('priority');
    expect(rule).toHaveProperty('isActive');
    expect(rule).toHaveProperty('createdAt');
    expect(rule).toHaveProperty('updatedAt');
    expect(rule).toHaveProperty('createdBy');

    const assignment = new DistributionAssignment();
    expect(assignment).toHaveProperty('id');
    expect(assignment).toHaveProperty('tenantId');
    expect(assignment).toHaveProperty('invoiceId');
    expect(assignment).toHaveProperty('customerId');
    expect(assignment).toHaveProperty('assignedChannel');
    expect(assignment).toHaveProperty('ruleId');
    expect(assignment).toHaveProperty('assignmentReason');
    expect(assignment).toHaveProperty('distributionStatus');
    expect(assignment).toHaveProperty('sentAt');
    expect(assignment).toHaveProperty('deliveredAt');
    expect(assignment).toHaveProperty('error');
    expect(assignment).toHaveProperty('metadata');
    expect(assignment).toHaveProperty('createdAt');
    expect(assignment).toHaveProperty('updatedAt');
  });
});
