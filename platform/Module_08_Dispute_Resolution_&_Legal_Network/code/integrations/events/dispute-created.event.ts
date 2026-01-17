export class DisputeCreatedEvent {
    constructor(
        public readonly disputeId: string,
        public readonly tenantId: string,
        public readonly invoiceId: string,
        public readonly customerId: string,
        public readonly customerName: string,
        public readonly amount: number,
        public readonly type: string,
        public readonly createdAt: Date,
    ) { }
}
