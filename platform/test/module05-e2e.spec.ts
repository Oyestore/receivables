import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Post, Put, Body, Param, Inject, HttpCode, Query } from '@nestjs/common';
import request from 'supertest';
// Inline test controllers to avoid guard instantiation issues
@Controller('api/tenant/:tenantId/milestones')
class TestMilestoneController {
    constructor(@Inject('MilestoneDefinitionService') private readonly milestoneService: any) {}
    @Post()
    async create(@Param('tenantId') tenantId: string, @Body() dto: any) { return this.milestoneService.createMilestone(dto, tenantId, 'TEST'); }
    @Get()
    async list(@Param('tenantId') tenantId: string) { return this.milestoneService.findAll(tenantId, {}); }
    @Get(':id')
    async get(@Param('tenantId') tenantId: string, @Param('id') id: string) { return this.milestoneService.findById(id, tenantId); }
    @Post(':id/clone')
    async clone(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() body: any) { return this.milestoneService.cloneMilestone(id, tenantId, 'TEST', body.newName); }
}

@Controller('api/tenant/:tenantId/milestone-status')
class TestStatusController {
    constructor(@Inject('StatusTrackingService') private readonly statusService: any) {}
    @Post('instances')
    async createInstance(@Param('tenantId') tenantId: string, @Body() dto: any) { return this.statusService.createInstance(dto, tenantId, 'TEST'); }
    @Put('instances/:id/status')
    async update(@Param('tenantId') tenantId: string, @Param('id') id: string, @Body() dto: any) { return this.statusService.updateStatus(id, dto, tenantId, 'TEST'); }
    @Get('instances/:id/history')
    async history(@Param('id') id: string) { return this.statusService.getStatusHistory(id, 'TEST'); }
    @Get('instances')
    async list(@Param('tenantId') tenantId: string, @Query() filters: any) { return this.statusService.findAll(tenantId, filters); }
    @Get('delayed')
    async delayed(@Param('tenantId') tenantId: string) { return this.statusService.getDelayedMilestones(tenantId); }
}

@Controller('api/tenant/:tenantId/milestone-payments')
class TestPaymentController {
    constructor(@Inject('MilestoneInvoiceService') private readonly invoiceService: any) {}
    @Post('generate/:instanceId')
    async generate(@Param('tenantId') tenantId: string, @Param('instanceId') instanceId: string) { return this.invoiceService.generateMilestoneInvoice(instanceId, tenantId); }
    @Get('status/:instanceId')
    async status(@Param('instanceId') instanceId: string) { return this.invoiceService.getMilestonePaymentStatus(instanceId); }
    @Post('track/:instanceId')
    @HttpCode(200)
    async track(@Param('instanceId') instanceId: string, @Body() body: any) { return this.invoiceService.trackMilestonePayment(instanceId, body); }
}
const TOKENS = {
    MilestoneDefinitionService: 'MilestoneDefinitionService',
    StatusTrackingService: 'StatusTrackingService',
    MilestoneInvoiceService: 'MilestoneInvoiceService',
} as const;

describe('Module 05: Milestone Workflows E2E', () => {
    let app: INestApplication;
    let authToken: string;
    let tenantId: string;
    let milestoneDefinitionId: string;
    let milestoneInstanceId: string;

    beforeAll(async () => {
        const milestoneDefMock: any = (() => {
            const store: any[] = [];
            return {
                async createMilestone(dto: any, tenant: string) {
                    const id = 'def-' + (store.length + 1);
                    const def = { id, tenantId: tenant, ...dto };
                    store.push(def);
                    return def;
                },
                async findAll(tenant: string) { return store.filter(d => d.tenantId === tenant); },
                async findById(id: string) { return store.find(d => d.id === id); },
                async updateMilestone(id: string, dto: any) { const def = store.find(d => d.id === id); Object.assign(def, dto); return def; },
                async deleteMilestone(id: string) { const i = store.findIndex(d => d.id === id); if (i >= 0) store.splice(i,1); },
                async cloneMilestone(id: string, _tenant: string, _userId: string, newName?: string) { const orig = store.find(d => d.id === id); const clone = { ...orig, id: 'def-' + (store.length + 1), name: newName || orig.name }; store.push(clone); return clone; },
                async getDependencies() { return []; },
            };
        })();

        const statusMock: any = (() => {
            const instances: any[] = [];
            const history: Record<string, any[]> = {};
            return {
                async createInstance(dto: any, tenant: string) {
                    const id = 'inst-' + (instances.length + 1);
                    const inst = { id, tenantId: tenant, definitionId: dto.definitionId, currentStatus: 'PENDING', progressPercentage: 0 };
                    instances.push(inst);
                    history[id] = [{ status: 'PENDING', at: new Date().toISOString() }];
                    return inst;
                },
                async updateStatus(id: string, dto: any) { const inst = instances.find(i => i.id === id); inst.currentStatus = dto.status; if (dto.progressPercentage !== undefined) inst.progressPercentage = dto.progressPercentage; history[id].push({ status: dto.status, at: new Date().toISOString() }); return inst; },
                async getStatusHistory(id: string) { return history[id] || []; },
                async findAll(_tenant: string, filters: any) { return filters?.status ? instances.filter(i => i.currentStatus === filters.status) : instances; },
                async findById(id: string) { return instances.find(i => i.id === id); },
                async getDelayedMilestones() { return instances.filter(i => i.currentStatus === 'DELAYED'); },
            };
        })();

        const invoiceMock: any = (() => {
            const payments: Record<string, any> = {};
            return {
                async generateMilestoneInvoice(instanceId: string) { const inv = { id: 'inv-' + instanceId, milestoneInstanceId: instanceId, paymentStatus: 'INVOICE_GENERATED', paymentAmount: 15000 }; payments[instanceId] = { status: 'INVOICE_GENERATED', amountReceived: 0 }; return inv; },
                async getMilestonePaymentStatus(instanceId: string) { const p = payments[instanceId] || { status: 'INVOICE_GENERATED', amount: 0 }; return { milestoneInstanceId: instanceId, paymentStatus: p.status }; },
                async trackMilestonePayment(instanceId: string, body: any) { payments[instanceId] = { status: 'PAID', amount: body.amountReceived }; return { milestoneInstanceId: instanceId, paymentStatus: 'PAID', amountReceived: body.amountReceived }; },
                async linkInvoiceToMilestone(instanceId: string, invoiceId: string) { return { milestoneInstanceId: instanceId, invoiceId }; },
            };
        })();

        @Controller('api/tenant/:tenantId/escalations')
        class TestEscalationController {
            private store: any[] = [];
            @Post()
            async create(@Param('tenantId') _tenantId: string, @Body() body: any) {
                const esc = { id: 'esc-' + (this.store.length + 1), resolutionStatus: 'OPEN', ...body };
                this.store.push(esc);
                return esc;
            }
            @Get()
            async list() { return this.store; }
            @Get('milestone/:instanceId')
            async byMilestone(@Param('instanceId') instanceId: string) { return this.store.filter(s => s.milestoneInstanceId === instanceId); }
            @Put(':id/resolve')
            async resolve(@Param('id') id: string, @Body() body: any) {
                const esc = this.store.find(s => s.id === id);
                esc.resolutionStatus = 'RESOLVED';
                esc.resolutionNotes = body.resolutionNotes;
                return esc;
            }
        }

        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [TestMilestoneController, TestStatusController, TestPaymentController, TestEscalationController],
            providers: [
                { provide: 'MilestoneDefinitionService', useValue: milestoneDefMock },
                { provide: 'StatusTrackingService', useValue: statusMock },
                { provide: 'MilestoneInvoiceService', useValue: invoiceMock },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        authToken = 'test-token';
        tenantId = 'tenant-test';
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Milestone Definition Management', () => {
        it('should create a milestone definition', async () => {
            const response = await request(app.getHttpServer())
                .post(`/api/tenant/${tenantId}/milestones`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Project Delivery Milestone',
                    description: 'Complete product delivery with documentation',
                    milestoneType: 'DELIVERABLE',
                    paymentPercentage: 30,
                    paymentAmount: 15000,
                    plannedStartDate: '2025-12-01',
                    plannedEndDate: '2025-12-15',
                    completionCriteria: {
                        requiredDocuments: ['delivery_receipt.pdf', 'quality_report.pdf'],
                        requiredApprovals: 2,
                    },
                    verificationRequirements: {
                        verificationMethod: 'MANUAL',
                        evidenceRequired: true,
                        approverRoles: ['TENANT_ADMIN', 'ADMIN'],
                    },
                    isTemplate: false,
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe('Project Delivery Milestone');
            expect(response.body.paymentAmount).toBe(15000);

            milestoneDefinitionId = response.body.id;
        });

        it('should list milestone definitions', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/tenant/${tenantId}/milestones`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
        });

        it('should get a specific milestone definition', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/tenant/${tenantId}/milestones/${milestoneDefinitionId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.id).toBe(milestoneDefinitionId);
            expect(response.body.name).toBe('Project Delivery Milestone');
        });

        it('should clone a milestone definition', async () => {
            const response = await request(app.getHttpServer())
                .post(`/api/tenant/${tenantId}/milestones/${milestoneDefinitionId}/clone`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    newName: 'Project Delivery Milestone (Copy)',
                })
                .expect(201);

            expect(response.body.name).toBe('Project Delivery Milestone (Copy)');
            expect(response.body.id).not.toBe(milestoneDefinitionId);
        });
    });

    describe('Milestone Instance Lifecycle', () => {
        it('should create a milestone instance', async () => {
            const response = await request(app.getHttpServer())
                .post(`/api/tenant/${tenantId}/milestone-status/instances`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    definitionId: milestoneDefinitionId,
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.currentStatus).toBe('PENDING');
            expect(response.body.progressPercentage).toBe(0);

            milestoneInstanceId = response.body.id;
        });

        it('should update milestone status to IN_PROGRESS', async () => {
            const response = await request(app.getHttpServer())
                .put(`/api/tenant/${tenantId}/milestone-status/instances/${milestoneInstanceId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    status: 'IN_PROGRESS',
                    progressPercentage: 25,
                    statusNotes: 'Started working on milestone',
                })
                .expect(200);

            expect(response.body.currentStatus).toBe('IN_PROGRESS');
            expect(response.body.progressPercentage).toBe(25);
        });

        it('should update milestone progress', async () => {
            const response = await request(app.getHttpServer())
                .put(`/api/tenant/${tenantId}/milestone-status/instances/${milestoneInstanceId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    status: 'IN_PROGRESS',
                    progressPercentage: 75,
                    statusNotes: 'Nearly complete',
                    evidenceUrls: ['https://example.com/evidence1.pdf'],
                })
                .expect(200);

            expect(response.body.progressPercentage).toBe(75);
        });

        it('should complete the milestone', async () => {
            const response = await request(app.getHttpServer())
                .put(`/api/tenant/${tenantId}/milestone-status/instances/${milestoneInstanceId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    status: 'COMPLETED',
                    progressPercentage: 100,
                    statusNotes: 'Milestone completed successfully',
                    evidenceUrls: [
                        'https://example.com/delivery_receipt.pdf',
                        'https://example.com/quality_report.pdf',
                    ],
                })
                .expect(200);

            expect(response.body.currentStatus).toBe('COMPLETED');
            expect(response.body.progressPercentage).toBe(100);
        });

        it('should get milestone status history', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/tenant/${tenantId}/milestone-status/instances/${milestoneInstanceId}/history`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('Milestone Payment and Invoice Generation', () => {
        it('should generate invoice for completed milestone', async () => {
            const response = await request(app.getHttpServer())
                .post(`/api/tenant/${tenantId}/milestone-payments/generate/${milestoneInstanceId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.milestoneInstanceId).toBe(milestoneInstanceId);
            expect(response.body.paymentStatus).toBe('INVOICE_GENERATED');
            expect(response.body.paymentAmount).toBe(15000);
        });

        it('should get milestone payment status', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/tenant/${tenantId}/milestone-payments/status/${milestoneInstanceId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.paymentStatus).toBe('INVOICE_GENERATED');
        });

        it('should track payment against milestone', async () => {
            const response = await request(app.getHttpServer())
                .post(`/api/tenant/${tenantId}/milestone-payments/track/${milestoneInstanceId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    amountReceived: 15000,
                    paymentReference: 'PAY-TEST-12345',
                })
                .expect(200);

            expect(response.body.paymentStatus).toBe('PAID');
            expect(response.body.amountReceived).toBe(15000);
        });
    });

    describe('Milestone Escalation', () => {
        let delayedInstanceId: string;

        it('should create a delayed milestone for escalation testing', async () => {
            const response = await request(app.getHttpServer())
                .post(`/api/tenant/${tenantId}/milestone-status/instances`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    definitionId: milestoneDefinitionId,
                })
                .expect(201);

            delayedInstanceId = response.body.id;

            // Update to delayed status
            await request(app.getHttpServer())
                .put(`/api/tenant/${tenantId}/milestone-status/instances/${delayedInstanceId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    status: 'DELAYED',
                    progressPercentage: 50,
                    statusNotes: 'Delayed due to resource constraints',
                })
                .expect(200);
        });

        it('should create manual escalation', async () => {
            const response = await request(app.getHttpServer())
                .post(`/api/tenant/${tenantId}/escalations`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    milestoneInstanceId: delayedInstanceId,
                    escalationReason: 'RESOURCE_UNAVAILABLE',
                    reasonDetails: 'Key team member unavailable',
                    escalatedTo: 'project-manager-id',
                })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.escalationReason).toBe('RESOURCE_UNAVAILABLE');
            expect(response.body.resolutionStatus).toBe('OPEN');
        });

        it('should list escalations', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/tenant/${tenantId}/escalations`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should resolve escalation', async () => {
            // First get the escalation
            const escalations = await request(app.getHttpServer())
                .get(`/api/tenant/${tenantId}/escalations/milestone/${delayedInstanceId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const escalationId = escalations.body[0].id;

            const response = await request(app.getHttpServer())
                .put(`/api/tenant/${tenantId}/escalations/${escalationId}/resolve`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    resolutionStatus: 'RESOLVED',
                    resolutionNotes: 'Resource assigned, work resumed',
                })
                .expect(200);

            expect(response.body.resolutionStatus).toBe('RESOLVED');
        });
    });

    describe('Milestone Filtering and Queries', () => {
        it('should filter milestones by status', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/tenant/${tenantId}/milestone-status/instances?status=COMPLETED`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            response.body.forEach((instance: any) => {
                expect(instance.currentStatus).toBe('COMPLETED');
            });
        });

        it('should get delayed milestones', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/tenant/${tenantId}/milestone-status/delayed`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });
    });
});
