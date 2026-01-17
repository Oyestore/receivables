import { faker } from '@faker-js/faker';
import { DisputeCase, DisputeStatus, DisputeType, DisputePriority } from '../../entities/dispute-case.entity';

export class DisputeCaseFactory {
    static create(overrides?: Partial<DisputeCase>): DisputeCase {
        const dispute = new DisputeCase();

        dispute.id = faker.string.uuid();
        dispute.tenantId = faker.string.uuid();
        dispute.caseNumber = `DIS-${faker.number.int({ min: 100000, max: 999999 })}`;
        dispute.invoiceId = faker.string.uuid();
        dispute.customerId = faker.string.uuid();
        dispute.customerName = faker.company.name();
        dispute.type = faker.helpers.arrayElement(['non_payment', 'partial_payment', 'quality_dispute']) as DisputeType;
        dispute.status = 'draft' as DisputeStatus;
        dispute.priority = faker.helpers.arrayElement(['low', 'medium', 'high']) as DisputePriority;
        dispute.disputedAmount = faker.number.int({ min: 10000, max: 500000 });
        dispute.description = faker.lorem.paragraph();
        dispute.evidence = {
            documents: [],
            communications: [],
        };
        dispute.timeline = [];
        dispute.createdAt = faker.date.recent();
        dispute.updatedAt = faker.date.recent();
        dispute.createdBy = 'test-user';

        return Object.assign(dispute, overrides);
    }

    static createMany(count: number, overrides?: Partial<DisputeCase>): DisputeCase[] {
        return Array.from({ length: count }, () => this.create(overrides));
    }

    static createWithEvidence(overrides?: Partial<DisputeCase>): DisputeCase {
        return this.create({
            evidence: {
                documents: [
                    {
                        id: faker.string.uuid(),
                        name: 'invoice.pdf',
                        url: faker.internet.url(),
                        type: 'application/pdf',
                        uploadedAt: faker.date.recent(),
                    },
                ],
                communications: [
                    {
                        id: faker.string.uuid(),
                        type: 'email',
                        date: faker.date.recent(),
                        summary: 'Follow-up email sent',
                    },
                ],
            },
            ...overrides,
        });
    }
}
