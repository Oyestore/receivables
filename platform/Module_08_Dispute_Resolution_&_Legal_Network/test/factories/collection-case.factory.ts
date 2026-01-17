import { faker } from '@faker-js/faker';
import { CollectionCase } from '../../code/entities/collection-case.entity';

export class CollectionCaseFactory {
    static create(overrides?: Partial<CollectionCase>): CollectionCase {
        const collection = new CollectionCase();

        collection.id = faker.string.uuid();
        collection.tenantId = faker.string.uuid();
        collection.caseNumber = `COL-${faker.number.int({ min: 100000, max: 999999 })}`;
        collection.customerId = faker.string.uuid();
        collection.customerName = faker.company.name();
        collection.invoiceId = faker.string.uuid();
        collection.originalAmount = faker.number.int({ min: 50000, max: 500000 });
        collection.outstandingAmount = faker.number.int({ min: 30000, max: 450000 });
        collection.status = 'new';
        collection.strategy = 'friendly_reminder';
        collection.paymentHistory = [];
        collection.createdAt = faker.date.recent();
        collection.updatedAt = faker.date.recent();
        collection.createdBy = 'test-user';

        return Object.assign(collection, overrides);
    }

    static createMany(count: number, overrides?: Partial<CollectionCase>): CollectionCase[] {
        return Array.from({ length: count }, () => this.create(overrides));
    }

    static createWithPayments(overrides?: Partial<CollectionCase>): CollectionCase {
        return this.create({
            paymentHistory: [
                {
                    date: faker.date.recent(),
                    amount: 10000,
                    paymentMethod: 'bank_transfer',
                    recordedBy: 'test-user',
                },
            ],
            ...overrides,
        });
    }
}
