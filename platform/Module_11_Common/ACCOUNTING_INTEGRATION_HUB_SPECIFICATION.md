# Module 11: Accounting Integration Hub - Complete Specification

**Module:** Module 11 - Common Services  
**Component:** Accounting Integration Hub  
**Version:** 1.0  
**Date:** January 15, 2026  
**Status:** Production Specification

---

## 🎯 Executive Summary

The **Accounting Integration Hub** is a centralized service within Module 11 (Common Services) that provides bidirectional synchronization between the SME Platform and popular Indian accounting software (Tally, Zoho Books, QuickBooks India, Busy, Marg ERP).

### **Key Design Principles**

1. **Single Source of Truth** - One integration codebase for all modules
2. **Shared Infrastructure** - Credentials, connections, error handling
3. **Event-Driven** - Modules emit events, Hub handles sync
4. **Bidirectional Sync** - Import from AND export to accounting systems
5. **Multi-Tenant** - Isolated data per tenant with separate configs

---

## 📊 Module Integration Analysis

### **Which Modules Need Accounting Integration?**

| Module | Integration Needed? | Direction | Why? |
|--------|---------------------|-----------|------|
| **M01: Invoicing** | ✅ **YES** | Bidirectional | Import/export invoices & customers |
| **M03: Payments** | ✅ **YES** | Export only | Sync payment receipts |
| **M17: Reconciliation/GL** | ✅ **YES - CRITICAL** | Bidirectional | Master data sync, GL entries, bank reconciliation |
| M02: Distribution | ❌ No | - | Communication only, no financial data |
| M04: Analytics | ❌ No | - | Reads data, doesn't create transactions |
| M06: Credit Scoring | ❌ No | - | Internal scoring, not financial transactions |
| M07: Financing | ⚠️ Maybe | Export only | Financing payouts (can go through M03) |

### **Module 17: Why It's CRITICAL**

**Module 17 (Reconciliation & GL) should be the PRIMARY user of Accounting Integration Hub:**

```
M17 Functions that need accounting sync:
✅ General Ledger synchronization
✅ Chart of Accounts import/export  
✅ Bank reconciliation data
✅ Trial balance import
✅ Journal entry sync
✅ Financial statement data
✅ Cost center/department mapping
✅ Tax accounts synchronization
```

**M17 is the "financial brain"** - it MUST sync with accounting systems to maintain data consistency.

---

## 🏗️ Architecture Overview

### **Component Diagram**

```
┌────────────────────────────────────────────────────────────┐
│                    Module 11: Common Services               │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │         Accounting Integration Hub                    │ │
│  │                                                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
│  │  │   Tally     │  │    Zoho     │  │ QuickBooks  │  │ │
│  │  │  Connector  │  │  Connector  │  │  Connector  │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  │                                                       │ │
│  │  ┌─────────────┐  ┌─────────────┐                   │ │
│  │  │    Busy     │  │  Marg ERP   │                   │ │
│  │  │  Connector  │  │  Connector  │                   │ │
│  │  └─────────────┘  └─────────────┘                   │ │
│  │                                                       │ │
│  │  Shared Services:                                    │ │
│  │  • Credential Manager                                │ │
│  │  • Connection Pool                                   │ │
│  │  • Sync Queue (Bull)                                 │ │
│  │  • Retry Logic                                       │ │
│  │  • Error Handler                                     │ │
│  │  • Data Mapper                                       │ │
│  │  • Audit Logger                                      │ │
│  └───────────────────────────────────────────────────────┘ │
└──────────────┬──────────────┬──────────────┬──────────────┘
               │              │              │
       ┌───────┴───┐   ┌──────┴──────┐   ┌──┴─────────┐
       │           │   │             │   │            │
┌──────▼─────┐ ┌──▼────▼─────┐ ┌─────▼────────┐
│ Module 01  │ │ Module 03   │ │ Module 17    │
│ (Invoice)  │ │ (Payment)   │ │ (Recon/GL)   │
│            │ │             │ │              │
│ Uses:      │ │ Uses:       │ │ Uses:        │
│ • Import   │ │ • Sync      │ │ • Sync GL    │
│   invoices │ │   payments  │ │ • Sync CoA   │
│ • Import   │ │ • Sync      │ │ • Import     │
│   customers│ │   refunds   │ │   balances   │
│ • Sync new │ │             │ │ • Bank recon │
│   invoices │ │             │ │              │
└────────────┘ └─────────────┘ └──────────────┘
```

---

## 📁 Project Structure

```typescript
Module_11_Common/
├── src/
│   ├── accounting-integration-hub/
│   │   ├── accounting-hub.module.ts
│   │   ├── accounting-hub.service.ts (Main orchestrator)
│   │   │
│   │   ├── connectors/
│   │   │   ├── base/
│   │   │   │   ├── base-accounting-connector.ts (Abstract class)
│   │   │   │   └── accounting-connector.interface.ts
│   │   │   │
│   │   │   ├── tally/
│   │   │   │   ├── tally-connector.service.ts
│   │   │   │   ├── tally-api.service.ts
│   │   │   │   ├── tally-xml.service.ts (XML generation)
│   │   │   │   ├── tally-mapper.service.ts (Data mapping)
│   │   │   │   └── tally.types.ts
│   │   │   │
│   │   │   ├── zoho/
│   │   │   │   ├── zoho-connector.service.ts
│   │   │   │   ├── zoho-oauth.service.ts
│   │   │   │   ├── zoho-api.service.ts
│   │   │   │   ├── zoho-mapper.service.ts
│   │   │   │   └── zoho.types.ts
│   │   │   │
│   │   │   ├── quickbooks/
│   │   │   │   ├── quickbooks-connector.service.ts
│   │   │   │   ├── quickbooks-oauth.service.ts
│   │   │   │   ├── quickbooks-api.service.ts
│   │   │   │   ├── quickbooks-mapper.service.ts
│   │   │   │   └── quickbooks.types.ts
│   │   │   │
│   │   │   ├── busy/
│   │   │   │   ├── busy-connector.service.ts
│   │   │   │   ├── busy-api.service.ts
│   │   │   │   └── busy.types.ts
│   │   │   │
│   │   │   └── marg/
│   │   │       ├── marg-connector.service.ts
│   │   │       ├── marg-api.service.ts
│   │   │       └── marg.types.ts
│   │   │
│   │   ├── shared/
│   │   │   ├── credential-manager.service.ts
│   │   │   ├── connection-pool.service.ts
│   │   │   ├── sync-queue.service.ts
│   │   │   ├── retry.service.ts
│   │   │   ├── error-handler.service.ts
│   │   │   ├── data-mapper.service.ts
│   │   │   └── audit-logger.service.ts
│   │   │
│   │   ├── entities/
│   │   │   ├── accounting-config.entity.ts
│   │   │   ├── sync-log.entity.ts
│   │   │   ├── sync-error.entity.ts
│   │   │   └── credential.entity.ts
│   │   │
│   │   ├── dto/
│   │   │   ├── invoice-sync.dto.ts
│   │   │   ├── payment-sync.dto.ts
│   │   │   ├── gl-sync.dto.ts
│   │   │   ├── customer-sync.dto.ts
│   │   │   └── sync-config.dto.ts
│   │   │
│   │   ├── interfaces/
│   │   │   ├── accounting-connector.interface.ts
│   │   │   ├── sync-result.interface.ts
│   │   │   └── sync-config.interface.ts
│   │   │
│   │   └── controllers/
│   │       ├── accounting-sync.controller.ts
│   │       └── accounting-config.controller.ts
│   │
│   └── test/
│       ├── accounting-hub.service.spec.ts
│       ├── tally-connector.spec.ts
│       ├── zoho-connector.spec.ts
│       └── integration/
│           └── accounting-sync.integration.spec.ts
```

---

## 🔌 Core Interfaces

### **BaseAccountingConnector (Abstract Class)**

```typescript
// accounting-integration-hub/connectors/base/base-accounting-connector.ts

export abstract class BaseAccountingConnector {
  abstract name: string;
  
  // Connection management
  abstract connect(config: AccountingConfig): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<boolean>;
  
  // Customer/Party master
  abstract importCustomers(params: ImportParams): Promise<Customer[]>;
  abstract syncCustomer(customer: Customer): Promise<SyncResult>;
  abstract updateCustomer(customer: Customer): Promise<SyncResult>;
  
  // Invoice/Sales voucher
  abstract importInvoices(params: ImportParams): Promise<Invoice[]>;
  abstract syncInvoice(invoice: Invoice): Promise<SyncResult>;
  abstract updateInvoice(invoice: Invoice): Promise<SyncResult>;
  
  // Payment/Receipt voucher
  abstract syncPayment(payment: Payment): Promise<SyncResult>;
  abstract syncRefund(refund: Refund): Promise<SyncResult>;
  
  // GL & Reconciliation (Module 17)
  abstract importChartOfAccounts(): Promise<ChartOfAccount[]>;
  abstract syncJournalEntry(entry: JournalEntry): Promise<SyncResult>;
  abstract importTrialBalance(): Promise<TrialBalance>;
  abstract syncBankEntry(entry: BankEntry): Promise<SyncResult>;
  abstract importGLAccounts(): Promise<GLAccount[]>;
  
  // Utilities
  abstract mapInvoice(platformInvoice: Invoice): any;
  abstract mapPayment(platformPayment: Payment): any;
  abstract mapCustomer(platformCustomer: Customer): any;
}
```

---

## 💾 Entity Definitions

### **AccountingConfig Entity**

```typescript
// accounting-integration-hub/entities/accounting-config.entity.ts

@Entity('accounting_configs')
export class AccountingConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column({
    type: 'enum',
    enum: ['tally', 'zoho', 'quickbooks', 'busy', 'marg']
  })
  system: string;

  @Column({ default: true })
  is_enabled: boolean;

  @Column({ type: 'jsonb' })
  connection_config: {
    // Tally
    server_url?: string;
    company_name?: string;
    port?: number;
    
    // Zoho/QuickBooks
    client_id?: string;
    client_secret?: string; // Encrypted
    redirect_uri?: string;
    refresh_token?: string; // Encrypted
    organization_id?: string;
    
    // Busy/Marg
    api_key?: string; // Encrypted
    api_secret?: string; // Encrypted
    database_path?: string;
  };

  @Column({ type: 'jsonb' })
  sync_config: {
    sync_direction: 'pull' | 'push' | 'bidirectional';
    sync_frequency: 'real_time' | 'hourly' | 'daily';
    auto_sync_enabled: boolean;
    
    entities_to_sync: {
      customers: boolean;
      invoices: boolean;
      payments: boolean;
      gl_accounts: boolean;
      journal_entries: boolean;
      bank_entries: boolean;
    };
    
    conflict_resolution: 'platform_wins' | 'accounting_wins' | 'manual';
  };

  @Column({ type: 'jsonb', nullable: true })
  field_mappings: {
    customer_mappings?: Record<string, string>;
    invoice_mappings?: Record<string, string>;
    gl_mappings?: Record<string, string>;
  };

  @Column({ type: 'timestamp', nullable: true })
  last_sync_at: Date;

  @Column({ default: 'active' })
  status: 'active' | 'paused' | 'error' | 'inactive';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### **SyncLog Entity**

```typescript
// accounting-integration-hub/entities/sync-log.entity.ts

@Entity('accounting_sync_logs')
export class AccountingSyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  accounting_system: string;

  @Column()
  sync_type: 'import' | 'export';

  @Column()
  entity_type: 'customer' | 'invoice' | 'payment' | 'gl_entry' | 'journal_entry';

  @Column({ nullable: true })
  entity_id: string; // Platform entity ID

  @Column({ nullable: true })
  external_id: string; // Accounting system ID

  @Column()
  status: 'success' | 'failed' | 'partial';

  @Column({ type: 'jsonb', nullable: true })
  sync_data: any;

  @Column({ type: 'jsonb', nullable: true })
  error_details: {
    message: string;
    code: string;
    retry_count: number;
    stack?: string;
  };

  @Column({ type: 'timestamp' })
  synced_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
```

---

## 🔧 Main Service Implementation

### **AccountingHubService**

```typescript
// accounting-integration-hub/accounting-hub.service.ts

@Injectable()
export class AccountingHubService {
  constructor(
    @InjectRepository(AccountingConfig)
    private configRepo: Repository<AccountingConfig>,
    @InjectRepository(AccountingSyncLog)
    private syncLogRepo: Repository<AccountingSyncLog>,
    
    private tallyConnector: TallyConnectorService,
    private zohoConnector: ZohoConnectorService,
    private quickbooksConnector: QuickBooksConnectorService,
    private busyConnector: BusyConnectorService,
    private margConnector: MargConnectorService,
    
    private credentialManager: CredentialManagerService,
    private syncQueue: SyncQueueService,
    private retryService: RetryService,
    private auditLogger: AuditLoggerService,
  ) {}

  // ==========================================
  // FOR MODULE 01 (INVOICING)
  // ==========================================
  
  async importCustomers(params: {
    tenantId: string;
    accountingSystem: string;
    filters?: {
      updatedAfter?: Date;
      limit?: number;
    };
  }): Promise<Customer[]> {
    const connector = this.getConnector(params.accountingSystem);
    const config = await this.getConfig(params.tenantId, params.accountingSystem);
    
    await connector.connect(config);
    
    try {
      const customers = await connector.importCustomers({
        tenantId: params.tenantId,
        filters: params.filters,
      });
      
      await this.logSync({
        tenantId: params.tenantId,
        system: params.accountingSystem,
        type: 'import',
        entityType: 'customer',
        status: 'success',
        count: customers.length,
      });
      
      return customers;
    } catch (error) {
      await this.handleSyncError(error, params);
      throw error;
    }
  }

  async importInvoices(params: {
    tenantId: string;
    accountingSystem: string;
    dateRange?: { start: Date; end: Date };
    filters?: any;
  }): Promise<Invoice[]> {
    const connector = this.getConnector(params.accountingSystem);
    const config = await this.getConfig(params.tenantId, params.accountingSystem);
    
    await connector.connect(config);
    
    const invoices = await connector.importInvoices(params);
    
    await this.logSync({
      tenantId: params.tenantId,
      system: params.accountingSystem,
      type: 'import',
      entityType: 'invoice',
      status: 'success',
      count: invoices.length,
    });
    
    return invoices;
  }

  async syncInvoiceCreated(invoice: Invoice): Promise<void> {
    const systems = await this.getEnabledSystems(invoice.tenant_id);
    
    const results = await Promise.allSettled(
      systems.map(async (system) => {
        const connector = this.getConnector(system);
        const config = await this.getConfig(invoice.tenant_id, system);
        
        await connector.connect(config);
        return connector.syncInvoice(invoice);
      })
    );
    
    await this.processSyncResults(results, 'invoice', invoice.id);
  }

  // ==========================================
  // FOR MODULE 03 (PAYMENTS)
  // ==========================================

  async syncPaymentReceived(payment: {
    invoice: Invoice;
    tenantId: string;
    amount: number;
    method: string;
    transactionId: string;
    timestamp: Date;
  }): Promise<void> {
    const systems = await this.getEnabledSystems(payment.tenantId);
    
    const results = await Promise.allSettled(
      systems.map(async (system) => {
        const connector = this.getConnector(system);
        const config = await this.getConfig(payment.tenantId, system);
        
        await connector.connect(config);
        return connector.syncPayment(payment);
      })
    );
    
    await this.processSyncResults(results, 'payment', payment.transactionId);
  }

  async syncRefund(refund: Refund): Promise<void> {
    const systems = await this.getEnabledSystems(refund.tenant_id);
    
    for (const system of systems) {
      const connector = this.getConnector(system);
      const config = await this.getConfig(refund.tenant_id, system);
      
      await connector.connect(config);
      await connector.syncRefund(refund);
    }
  }

  // ==========================================
  // FOR MODULE 17 (RECONCILIATION/GL)
  // ==========================================

  async importChartOfAccounts(params: {
    tenantId: string;
    accountingSystem: string;
  }): Promise<ChartOfAccount[]> {
    const connector = this.getConnector(params.accountingSystem);
    const config = await this.getConfig(params.tenantId, params.accountingSystem);
    
    await connector.connect(config);
    
    return connector.importChartOfAccounts();
  }

  async importGLAccounts(params: {
    tenantId: string;
    accountingSystem: string;
    accountType?: 'asset' | 'liability' | 'income' | 'expense';
  }): Promise<GLAccount[]> {
    const connector = this.getConnector(params.accountingSystem);
    const config = await this.getConfig(params.tenantId, params.accountingSystem);
    
    await connector.connect(config);
    
    return connector.importGLAccounts();
  }

  async syncJournalEntry(entry: JournalEntry): Promise<void> {
    const systems = await this.getEnabledSystems(entry.tenant_id);
    
    for (const system of systems) {
      const connector = this.getConnector(system);
      const config = await this.getConfig(entry.tenant_id, system);
      
      await connector.connect(config);
      await connector.syncJournalEntry(entry);
    }
  }

  async importTrialBalance(params: {
    tenantId: string;
    accountingSystem: string;
    asOnDate: Date;
  }): Promise<TrialBalance> {
    const connector = this.getConnector(params.accountingSystem);
    const config = await this.getConfig(params.tenantId, params.accountingSystem);
    
    await connector.connect(config);
    
    return connector.importTrialBalance();
  }

  async syncBankReconciliation(params: {
    tenantId: string;
    bankEntries: BankEntry[];
  }): Promise<void> {
    const systems = await this.getEnabledSystems(params.tenantId);
    
    for (const system of systems) {
      const connector = this.getConnector(system);
      const config = await this.getConfig(params.tenantId, system);
      
      await connector.connect(config);
      
      for (const entry of params.bankEntries) {
        await connector.syncBankEntry(entry);
      }
    }
  }

  // ==========================================
  // SHARED UTILITIES
  // ==========================================

  private getConnector(system: string): BaseAccountingConnector {
    switch (system) {
      case 'tally':
        return this.tallyConnector;
      case 'zoho':
        return this.zohoConnector;
      case 'quickbooks':
        return this.quickbooksConnector;
      case 'busy':
        return this.busyConnector;
      case 'marg':
        return this.margConnector;
      default:
        throw new Error(`Unknown accounting system: ${system}`);
    }
  }

  private async getEnabledSystems(tenantId: string): Promise<string[]> {
    const configs = await this.configRepo.find({
      where: { tenant_id: tenantId, is_enabled: true },
    });
    
    return configs.map(c => c.system);
  }

  private async getConfig(tenantId: string, system: string): Promise<AccountingConfig> {
    const config = await this.configRepo.findOne({
      where: { tenant_id: tenantId, system },
    });
    
    if (!config) {
      throw new Error(`No config found for ${system} in tenant ${tenantId}`);
    }
    
    // Decrypt sensitive fields
    config.connection_config = await this.credentialManager.decrypt(
      config.connection_config
    );
    
    return config;
  }

  private async logSync(params: {
    tenantId: string;
    system: string;
    type: 'import' | 'export';
    entityType: string;
    status: string;
    count?: number;
    error?: any;
  }): Promise<void> {
    await this.syncLogRepo.save({
      tenant_id: params.tenantId,
      accounting_system: params.system,
      sync_type: params.type,
      entity_type: params.entityType,
      status: params.status,
      synced_at: new Date(),
      error_details: params.error,
    });
  }

  private async processSyncResults(
    results: PromiseSettledResult<any>[],
    entityType: string,
    entityId: string,
  ): Promise<void> {
    for (const result of results) {
      if (result.status === 'rejected') {
        // Log error and queue for retry
        await this.handleSyncError(result.reason, { entityType, entityId });
      }
    }
  }

  private async handleSyncError(error: any, context: any): Promise<void> {
    await this.auditLogger.logError({
      error,
      context,
      timestamp: new Date(),
    });
    
    // Queue for retry if appropriate
    if (this.isRetryable(error)) {
      await this.syncQueue.addRetry(context);
    }
  }

  private isRetryable(error: any): boolean {
    // Network errors, timeouts, etc.
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.statusCode >= 500;
  }
}
```

---

## 🔄 Event-Driven Integration Pattern

### **Module 01 Event Handler**

```typescript
// In Module 01: invoice.service.ts

@Injectable()
export class InvoiceService {
  constructor(
    private accountingHub: AccountingHubService,
    private eventEmitter: EventEmitter2,
  ) {}

  @Cron('0 */15 * * * *') // Every 15 minutes
  async importInvoicesFromAccounting(): Promise<void> {
    const tenants = await this.getTenants WithAccountingSync();
    
    for (const tenant of tenants) {
      const systems = await this.accountingHub.getEnabledSystems(tenant.id);
      
      for (const system of systems) {
        const invoices = await this.accountingHub.importInvoices({
          tenantId: tenant.id,
          accountingSystem: system,
          dateRange: {
            start: new Date(Date.now() - 15 * 60 * 1000), // Last 15 mins
            end: new Date(),
          }
        });
        
        for (const invoice of invoices) {
          await this.processImportedInvoice(invoice);
        }
      }
    }
  }

  async createInvoice(data: CreateInvoiceDTO): Promise<Invoice> {
    const invoice = await this.invoiceRepo.save(data);
    
    // Emit for M02 distribution
    this.eventEmitter.emit('invoice.created', invoice);
    
    // Sync to accounting (async, don't wait)
    this.accountingHub.syncInvoiceCreated(invoice).catch(err => {
      this.logger.error('Accounting sync failed', err);
    });
    
    return invoice;
  }
}
```

### **Module 17 Event Handler**

```typescript
// In Module 17: gl.service.ts

@Injectable()
export class GLService {
  constructor(
    private accountingHub: AccountingHubService,
  ) {}

  async syncChartOfAccounts(tenantId: string): Promise<void> {
    const systems = await this.accountingHub.getEnabledSystems(tenantId);
    
    for (const system of systems) {
      const chartOfAccounts = await this.accountingHub.importChartOfAccounts({
        tenantId,
        accountingSystem: system,
      });
      
      // Store in platform database
      await this.storeChartOfAccounts(chartOfAccounts);
    }
  }

  async createJournalEntry(entry: JournalEntry): Promise<void> {
    // Save in platform
    await this.journalEntryRepo.save(entry);
    
    // Sync to accounting systems
    await this.accountingHub.syncJournalEntry(entry);
  }

  async reconcileBankStatement(bankEntries: BankEntry[]): Promise<void> {
    // Process reconciliation in platform
    const reconciled = await this.processReconciliation(bankEntries);
    
    // Sync to accounting systems
    await this.accountingHub.syncBankReconciliation({
      tenantId: bankEntries[0].tenant_id,
      bankEntries: reconciled,
    });
  }
}
```

---

## 📋 API Endpoints

### **Configuration APIs**

```typescript
@Controller('api/v1/accounting')
export class AccountingConfigController {
  // Setup accounting integration
  @Post('config/:tenantId')
  async createConfig(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateAccountingConfigDTO,
  ): Promise<AccountingConfig> {}

  // Test connection
  @Post('config/:configId/test')
  async testConnection(@Param('configId') configId: string): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }> {}

  // Get sync logs
  @Get('sync-logs/:tenantId')
  async getSyncLogs(
    @Param('tenantId') tenantId: string,
    @Query() filters: SyncLogFiltersDTO,
  ): Promise<AccountingSyncLog[]> {}
}
```

### **Sync APIs**

```typescript
@Controller('api/v1/accounting/sync')
export class AccountingSyncController {
  // Manual sync trigger
  @Post('trigger/:tenantId')
  async triggerSync(
    @Param('tenantId') tenantId: string,
    @Body() dto: TriggerSyncDTO,
  ): Promise<{ jobId: string }> {}

  // Import data
  @Post('import/:tenantId/invoices')
  async importInvoices(
    @Param('tenantId') tenantId: string,
    @Body() dto: ImportInvoicesDTO,
  ): Promise<Invoice[]> {}

  // Sync status
  @Get('status/:jobId')
  async getSyncStatus(@Param('jobId') jobId: string): Promise<SyncStatus> {}
}
```

---

## 🔒 Security Considerations

### **Credential Encryption**

```typescript
@Injectable()
export class CredentialManagerService {
  async encrypt(data: any): Promise<string> {
    // Use AES-256-GCM encryption
    // Store encryption keys in AWS Secrets Manager or similar
  }

  async decrypt(encryptedData: string): Promise<any> {
    // Decrypt using stored keys
  }
}
```

### **OAuth Token Management**

```typescript
@Injectable()
export class OAuthTokenManager {
  async refreshToken(config: AccountingConfig): Promise<string> {
    // Auto-refresh OAuth tokens before expiry
    // Handle refresh token rotation
  }

  async validateToken(token: string): Promise<boolean> {
    // Validate token expiry
  }
}
```

---

## 🎯 Module Integration Summary

### **Module 01 (Invoicing)**
- ✅ **Import** customers from accounting
- ✅ **Import** invoices (accounting as source)
- ✅ **Export** invoices (platform as source)

### **Module 03 (Payments)**
- ✅ **Export** payment receipts
- ✅ **Export** refunds
- ✅ **Export** bank deposits

### **Module 17 (Reconciliation/GL)** - CRITICAL
- ✅ **Import** Chart of Accounts
- ✅ **Import** GL accounts
- ✅ **Import** Trial Balance
- ✅ **Export** Journal Entries
- ✅ **Export** Bank Reconciliation
- ✅ **Bidirectional** sync for master data

---

## 📊 Benefits of Centralized Hub

1. **DRY Principle** - No duplicate integration code
2. **Shared Infrastructure** - Connection pooling, credentials
3. **Consistent Error Handling** - Same retry logic everywhere
4. **Easy Extensibility** - Add new accounting system once, all modules benefit
5. **Centralized Monitoring** - Single dashboard for all accounting syncs
6. **Reduced Complexity** - Modules focus on their core responsibility

---

## 🚀 Implementation Priority

### **Phase 1: Core Hub (Week 1-2)**
- [ ] Hub service structure
- [ ] Tally connector (most common in India)
- [ ] Credential manager
- [ ] Sync queue
- [ ] Basic M01 integration

### **Phase 2: Additional Connectors (Week 3-4)**
- [ ] Zoho Books connector
- [ ] QuickBooks India connector
- [ ] M03 payment sync
- [ ] Error handling & retry

### **Phase 3: Module 17 Integration (Week 5-6)**
- [ ] GL account sync
- [ ] Journal entry export
- [ ] Bank reconciliation
- [ ] Trial balance import

### **Phase 4: Polish & Production (Week 7-8)**
- [ ] Busy & Marg connectors
- [ ] Monitoring & alerting
- [ ] Admin UI
- [ ] Documentation

---

**Specification Complete**  
**Next Steps:** Review and approve for implementation  
**Estimated Effort:** 8 weeks to full production  
**Critical:** Module 17 integration is ESSENTIAL for complete accounting sync
