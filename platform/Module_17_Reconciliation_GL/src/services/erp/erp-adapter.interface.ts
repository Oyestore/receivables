export interface GlEntryDto {
    id: string;
    transactionDate: Date;
    description: string;
    amount: number;
    currency: string;
    debitAccountCode: string;
    creditAccountCode: string;
    referenceId: string;
}

export interface SyncResult {
    success: boolean;
    externalId?: string;
    errors?: string[];
}

export interface ErpAdapter {
    /**
     * Helper to verify connection to the ERP
     */
    testConnection(config: any): Promise<boolean>;

    /**
     * Push a GL Entry to the ERP
     */
    postGlEntry(entry: GlEntryDto): Promise<SyncResult>;

    /**
     * Fetch Account Chart from ERP
     */
    fetchChartOfAccounts(): Promise<any[]>;
}
