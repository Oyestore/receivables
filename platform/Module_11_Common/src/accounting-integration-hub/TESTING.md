# Accounting Integration Hub - Testing Guide

## Test Coverage Strategy

**Target:** 80%+ code coverage
**Focus Areas:**
1. Unit Tests (60% coverage)
2. Integration Tests (20% coverage)
3. E2E Tests (critical flows)

---

## 1. Unit Tests

### Connector Tests

Each connector should have comprehensive unit tests covering all CRUD operations.

#### Example: Tally Connector Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TallyConnectorService } from './tally-connector.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TallyConnectorService', () => {
  let service: TallyConnectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TallyConnectorService],
    }).compile();

    service = module.get<TallyConnectorService>(TallyConnectorService);
  });

  describe('connect', () => {
    it('should successfully connect to Tally server', async () => {
      const config = {
        connection_config: {
          server_url: 'http://localhost',
          port: 9000,
          company_name: 'Test Company',
        },
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({
          data: '<ENVELOPE><HEADER><VERSION>1</VERSION></HEADER></ENVELOPE>',
        }),
      } as any);

      await expect(service.connect(config)).resolves.not.toThrow();
    });

    it('should throw error on connection failure', async () => {
      const config = {
        connection_config: {
          server_url: 'http://invalid',
          port: 9000,
          company_name: 'Test Company',
        },
      };

      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockRejectedValue(new Error('Connection refused')),
      } as any);

      await expect(service.connect(config)).rejects.toThrow('Tally connection failed');
    });
  });

  describe('importCustomers', () => {
    beforeEach(async () => {
      await service.connect({
        connection_config: {
          server_url: 'http://localhost',
          port: 9000,
          company_name: 'Test Company',
        },
      });
    });

    it('should import customers successfully', async () => {
      const mockXmlResponse = `
        <ENVELOPE>
          <LEDGER>
            <NAME>Customer 1</NAME>
            <EMAIL>customer1@example.com</EMAIL>
            <PHONE>9876543210</PHONE>
            <GSTIN>29ABCDE1234F1Z5</GSTIN>
          </LEDGER>
        </ENVELOPE>
      `;

      mockedAxios.create().post.mockResolvedValue({ data: mockXmlResponse });

      const customers = await service.importCustomers({ tenantId: 'test-123' });

      expect(customers).toHaveLength(1);
      expect(customers[0].name).toBe('Customer 1');
      expect(customers[0].email).toBe('customer1@example.com');
    });

    it('should handle empty customer list', async () => {
      const mockXmlResponse = '<ENVELOPE></ENVELOPE>';

      mockedAxios.create().post.mockResolvedValue({ data: mockXmlResponse });

      const customers = await service.importCustomers({ tenantId: 'test-123' });

      expect(customers).toHaveLength(0);
    });
  });

  describe('syncCustomer', () => {
    it('should sync customer to Tally', async () => {
      const customer = {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '9876543210',
        billing_address: {
          line1: '123 Main St',
          line2: '',
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001',
          country: 'India',
        },
        tax_id: '29ABCDE1234F1Z5',
      };

      const mockResponse = `
        <ENVELOPE>
          <RESPONSE>
            <CREATED>1</CREATED>
            <MASTERID>GUID-123</MASTERID>
          </RESPONSE>
        </ENVELOPE>
      `;

      mockedAxios.create().post.mockResolvedValue({ data: mockResponse });

      const result = await service.syncCustomer(customer);

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('GUID-123');
    });
  });
});
```

#### Example: Zoho Connector Test (OAuth)

```typescript
describe('ZohoConnectorService', () => {
  let service: ZohoConnectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ZohoConnectorService],
    }).compile();

    service = module.get<ZohoConnectorService>(ZohoConnectorService);
  });

  describe('OAuth 2.0 Flow', () => {
    it('should refresh access token when expired', async () => {
      const config = {
        connection_config: {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          refresh_token: 'test-refresh-token',
          organization_id: 'org-123',
          region: 'in',
          access_token: 'old-token',
          token_expires_at: new Date(Date.now() - 1000), // Expired
        },
      };

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-access-token',
          expires_in: 3600,
        },
      });

      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockResolvedValue({
          data: { organizations: [{ organization_id: 'org-123' }] },
        }),
      } as any);

      await service.connect(config);

      // Verify new token was requested
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('oauth/v2/token'),
        expect.any(URLSearchParams),
        expect.any(Object)
      );
    });

    it('should use existing token if still valid', async () => {
      const config = {
        connection_config: {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          refresh_token: 'test-refresh-token',
          organization_id: 'org-123',
          region: 'in',
          access_token: 'valid-token',
          token_expires_at: new Date(Date.now() + 3600000), // Valid for 1 hour
        },
      };

      mockedAxios.create.mockReturnValue({
        request: jest.fn().mockResolvedValue({
          data: { organizations: [{ organization_id: 'org-123' }] },
        }),
      } as any);

      await service.connect(config);

      // Should NOT call refresh endpoint
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });
});
```

### Shared Services Tests

```typescript
describe('RetryService', () => {
  let service: RetryService;

  beforeEach(() => {
    service = new RetryService();
  });

  it('should retry on failure with exponential backoff', async () => {
    let attempts = 0;
    const operation = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary error');
      }
      return 'success';
    });

    const result = await service.executeWithRetry(operation, {
      maxAttempts: 5,
      initialDelay: 100,
    });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should throw after max attempts', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Permanent error'));

    await expect(
      service.executeWithRetry(operation, { maxAttempts: 3 })
    ).rejects.toThrow('Permanent error');

    expect(operation).toHaveBeenCalledTimes(3);
  });
});

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorHandlerService, /* ... dependencies ... */],
    }).compile();

    service = module.get<ErrorHandlerService>(ErrorHandlerService);
  });

  it('should classify authentication errors correctly', async () => {
    const error = new Error('Invalid credentials');
    const context = {
      tenantId: 'test-123',
      accountingSystem: 'tally',
      operation: 'import_customers',
      entityType: 'customer',
    };

    const result = await service.handleError(error, context);

    expect(result.category).toBe('AUTHENTICATION');
    expect(result.severity).toBe('HIGH');
    expect(result.isRetryable).toBe(false);
    expect(result.suggestedFix).toContain('credentials');
  });

  it('should classify network errors as retryable', async () => {
    const error = new Error('ECONNREFUSED');
    const context = {
      tenantId: 'test-123',
      accountingSystem: 'tally',
      operation: 'import_customers',
      entityType: 'customer',
    };

    const result = await service.handleError(error, context);

    expect(result.category).toBe('NETWORK');
    expect(result.isRetryable).toBe(true);
  });
});
```

---

## 2. Integration Tests

### AccountingHubService Integration Test

```typescript
describe('AccountingHubService Integration', () => {
  let hubService: AccountingHubService;
  let configRepo: Repository<AccountingConfig>;
  let customerRepo: Repository<Customer>;
  
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [AccountingConfig, AccountingSyncLog, AccountingSyncError, Customer],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([AccountingConfig, AccountingSyncLog, AccountingSyncError]),
        BullModule.registerQueue({ name: 'accounting-sync' }),
        EventEmitterModule.forRoot(),
      ],
      providers: [
        AccountingHubService,
        CredentialManagerService,
        ConnectionPoolService,
        RetryService,
        ErrorHandlerService,
        AuditLoggerService,
        SyncQueueService,
      ],
    }).compile();

    hubService = module.get<AccountingHubService>(AccountingHubService);
    configRepo = module.get('AccountingConfigRepository');
    customerRepo = module.get('CustomerRepository');
  });

  describe('Full Customer Import Flow', () => {
    it('should import customers and store in database', async () => {
      // Setup: Create accounting config
      const config = configRepo.create({
        tenant_id: 'test-tenant',
        system: 'tally',
        is_enabled: true,
        connection_config: {
          server_url: 'http://localhost',
          port: 9000,
          company_name: 'Test Company',
        },
        sync_config: {
          sync_direction: 'pull',
          sync_frequency: 'manual',
          entities_to_sync: {
            customers: true,
          },
        },
      });
      await configRepo.save(config);

      // Mock connector response
      jest.spyOn(hubService as any, 'getConnector').mockResolvedValue({
        importCustomers: jest.fn().mockResolvedValue([
          {
            external_id: 'tally-cust-1',
            name: 'Test Customer',
            email: 'test@example.com',
          },
        ]),
      });

      // Execute
      const customers = await hubService.importCustomers({
        tenantId: 'test-tenant',
      });

      // Verify
      expect(customers).toHaveLength(1);
      expect(customers[0].name).toBe('Test Customer');

      // Check audit log
      const logs = await auditLoggerService.queryLogs({
        tenantId: 'test-tenant',
        entityType: 'customer',
      });
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle connector errors and log them', async () => {
      jest.spyOn(hubService as any, 'getConnector').mockResolvedValue({
        importCustomers: jest.fn().mockRejectedValue(new Error('Network timeout')),
      });

      await expect(
        hubService.importCustomers({ tenantId: 'test-tenant' })
      ).rejects.toThrow();

      // Check error was logged
      const errors = await errorRepo.find({ where: { tenant_id: 'test-tenant' } });
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].category).toBe('NETWORK');
    });
  });
});
```

---

## 3. E2E Tests

### Complete Sync Flow Test

```typescript
describe('E2E: Complete Invoice Sync Flow', () => {
  it('should sync invoice from M01 to Tally', async () => {
    // 1. Create invoice in M01
    const invoice = await invoiceService.createInvoice({
      tenant_id: 'test-tenant',
      customer_id: 'cust-123',
      line_items: [
        { description: 'Product A', quantity: 2, unit_price: 1000 },
      ],
    });

    // 2. Trigger sync to accounting system
    const syncResults = await accountingHub.syncInvoiceCreated({
      ...invoice,
      tenantId: 'test-tenant',
    });

    // 3. Verify sync success
    expect(syncResults[0].success).toBe(true);
    expect(syncResults[0].externalId).toBeDefined();

    // 4. Verify invoice has external_id
    const updatedInvoice = await invoiceRepo.findOne({ where: { id: invoice.id } });
    expect(updatedInvoice.external_id).toBe(syncResults[0].externalId);

    // 5. Verify audit log
    const auditLog = await auditLogRepo.findOne({
      where: {
        tenant_id: 'test-tenant',
        entity_type: 'invoice',
        entity_id: invoice.id,
      },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog.sync_status).toBe('SUCCESS');
  });
});
```

---

## 4. Test Data Fixtures

```typescript
// test/fixtures/customers.fixture.ts
export const mockCustomers = {
  tally: {
    name: 'Tally Test Customer',
    email: 'tally@example.com',
    phone: '9876543210',
    billing_address: {
      line1: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      postal_code: '400001',
      country: 'India',
    },
    tax_id: '29ABCDE1234F1Z5',
  },
  zoho: {
    contact_id: 'zoho-123',
    contact_name: 'Zoho Test Customer',
    email: 'zoho@example.com',
    phone: '9876543210',
    gst_no: '29ABCDE1234F1Z5',
  },
};

// test/fixtures/invoices.fixture.ts
export const mockInvoices = {
  standard: {
    invoice_number: 'TEST-001',
    customer_id: 'cust-123',
    invoice_date: new Date('2024-01-15'),
    due_date: new Date('2024-02-15'),
    line_items: [
      {
        description: 'Product A',
        quantity: 2,
        unit_price: 1000,
        tax_rate: 18,
        amount: 2000,
        tax_amount: 360,
      },
    ],
    subtotal: 2000,
    tax_amount: 360,
    total_amount: 2360,
    currency: 'INR',
    status: 'issued',
  },
};
```

---

## 5. Performance Tests

```typescript
describe('Performance Tests', () => {
  it('should import 1000 customers within 10 seconds', async () => {
    const startTime = Date.now();

    const customers = Array.from({ length: 1000 }, (_, i) => ({
      external_id: `cust-${i}`,
      name: `Customer ${i}`,
      email: `customer${i}@example.com`,
    }));

    jest.spyOn(connector, 'importCustomers').mockResolvedValue(customers);

    const result = await accountingHub.importCustomers({
      tenantId: 'test-tenant',
    });

    const duration = Date.now() - startTime;

    expect(result).toHaveLength(1000);
    expect(duration).toBeLessThan(10000); // 10 seconds
  });

  it('should handle concurrent syncs without data corruption', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      accountingHub.syncInvoiceCreated({
        tenantId: 'test-tenant',
        id: `inv-${i}`,
        invoice_number: `INV-${i}`,
        // ... other fields
      })
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result[0].success).toBe(true);
    });
  });
});
```

---

## 6. Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- --testPathPattern=*.spec.ts

# Run integration tests
npm test -- --testPathPattern=*.integration.spec.ts

# Run E2E tests
npm test -- --testPathPattern=*.e2e.spec.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## 7. Coverage Report

Target coverage by file type:

```
Connectors:       80%+
Shared Services:  90%+
Hub Orchestrator: 85%+
Entities:         60%+ (mostly getters/setters)
```

Expected output:
```
File                          | % Stmts | % Branch | % Funcs | % Lines
------------------------------|---------|----------|---------|--------
All files                     |   82.3  |   78.5   |   85.1  |   81.9
 connectors/                  |   81.2  |   76.3   |   83.4  |   80.8
  tally-connector.service.ts  |   82.5  |   77.1   |   85.2  |   82.1
  zoho-connector.service.ts   |   83.1  |   78.5   |   86.3  |   82.9
  ...
 shared/                      |   91.5  |   88.2   |   92.1  |   91.8
  retry.service.ts            |   94.2  |   91.5   |   95.1  |   94.5
  error-handler.service.ts    |   89.3  |   85.7   |   90.2  |   89.5
  ...
```

---

## 8. CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:alpine
        ports:
          - 6379:6379
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --testPathPattern=*.spec.ts --coverage
      
      - name: Run integration tests
        run: npm test -- --testPathPattern=*.integration.spec.ts
        env:
          REDIS_HOST: localhost
          POSTGRES_HOST: localhost
      
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## Test Checklist

Before deploying to production:

- [ ] All unit tests passing (80%+ coverage)
- [ ] All integration tests passing
- [ ] E2E tests for critical flows passing
- [ ] Performance tests meet benchmarks
- [ ] Security tests completed
- [ ] Load tests completed (concurrent users)
- [ ] OAuth flow tested for Zoho/QuickBooks
- [ ] Error scenarios tested
- [ ] Retry logic verified
- [ ] Audit logging verified
- [ ] Connection pooling verified

---

Ready for production deployment! 🚀
