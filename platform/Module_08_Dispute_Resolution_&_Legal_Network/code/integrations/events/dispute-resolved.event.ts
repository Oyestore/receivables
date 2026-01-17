export class DisputeResolvedEvent {
    constructor(
        public readonly disputeId: string,
        public readonly tenantId: string,
        public readonly invoiceId: string,
        public readonly customerId: string,
        public readonly resolution: 'win' | 'lose' | 'settle',
        public readonly settledAmount?: number,
        public readonly resolvedAt?: Date,
    ) { }
}
