export class CollectionStartedEvent {
    constructor(
        public readonly collectionId: string,
        public readonly tenantId: string,
        public readonly customerId: string,
        public readonly invoiceId: string,
        public readonly outstandingAmount: number,
        public readonly strategy: string,
        public readonly createdAt: Date,
    ) { }
}
