# Customer Data Flow: Should M09 Get Data from Accounting Hub?

**Analysis Date:** January 15, 2026  
**Question:** Should customer information from accounting hub flow to Module 09 (Marketing & Customer Success)?  
**Answer:** ✅ **YES, but with important considerations**

---

## 🎯 Quick Answer

**YES - Module 09 should receive customer data from the Accounting Hub, but:**

1. **Indirectly** - Through Module 01 (not directly from accounting hub)
2. **For enrichment** - To enhance existing customer profiles
3. **Selectively** - Only specific fields relevant to marketing/CRM
4. **Event-driven** - Via customer.created/updated events

---

## 📊 Module 09 Scope Analysis

### **What Module 09 Does:**

Based on the entities found:

```
Module 09: Marketing & Customer Success
├── Lead Management (lead.entity.ts)
│   └── New prospects, not yet customers
│
├── Customer Health Tracking (customer-health.entity.ts)
│   ├── Overall health score
│   ├── Engagement score
│   ├── Product usage score
│   ├── Payment health score
│   └── Support health score
│
├── Referral Engine (referral.entity.ts, referral-reward.entity.ts)
│   └── Track customer referrals & rewards
│
├── Customer Onboarding (onboarding-workflow.entity.ts)
│   └── Guide new customers through setup
│
├── Marketing Campaigns (campaign.entity.ts)
│   └── Email/SMS marketing campaigns
│
├── Gamification (gamification.entity.ts)
│   └── Points, badges, leaderboards
│
└── Partner Management (partner.entity.ts, partner-commission.entity.ts)
    └── B2B2C partner ecosystem
```

**Key Insight:** Module 09 tracks **customer engagement and marketing metrics**, not the customer master record itself.

---

## 🏗️ Customer Data Architecture

### **Who Owns What?**

| Module | Customer Data Responsibility |
|--------|------------------------------|
| **M01: Invoicing** | ✅ **Customer Master** - Authoritative source for customer records (name, email, phone, address, billing info) |
| **M09: Marketing** | Customer Engagement Data - Health scores, campaign responses, referrals, onboarding status |
| **Accounting (Tally/Zoho)** | Customer Master (external source) - Can be imported to M01 |

**Principle:** M01 owns the customer master, M09 extends it with marketing/engagement data.

---

## 🔄 Recommended Data Flow

### **Option 1: Indirect Flow via M01** ✅ RECOMMENDED

```
Accounting System (Tally/Zoho)
           ↓
Module 11 Hub imports customers
           ↓
Module 01 stores customer master
           ↓ (emits event)
Module 09 receives customer.created event
           ↓
Module 09 creates engagement profile
```

**Implementation:**

```typescript
// Module 01: Import from accounting, emit event
@Injectable()
export class CustomerService {
  async importCustomersFromAccounting(): Promise<void> {
    // Import from accounting via hub
    const customers = await this.accountingHub.importCustomers({
      tenantId: this.tenantId,
      accountingSystem: 'tally',
    });
    
    for (const customer of customers) {
      // Store in M01 customer table
      const savedCustomer = await this.customerRepo.save(customer);
      
      // Emit event for other modules
      this.eventEmitter.emit('customer.created', {
        customer: savedCustomer,
        source: 'accounting_import',
      });
    }
  }
}

// Module 09: Listen for customer events
@Injectable()
export class CustomerEngagementService {
  @OnEvent('customer.created')
  async handleCustomerCreated(event: CustomerCreatedEvent): Promise<void> {
    // Create customer health profile
    await this.customerHealthRepo.save({
      customerId: event.customer.id,
      overallScore: 100, // New customer starts at 100
      engagementScore: 0,
      productUsageScore: 0,
      paymentHealthScore: 0,
      supportHealthScore: 0,
    });
    
    // Trigger onboarding workflow
    await this.onboardingService.startOnboarding(event.customer.id);
    
    // Add to welcome campaign
    await this.campaignService.addToWelcomeCampaign(event.customer.id);
  }
  
  @OnEvent('customer.updated')
  async handleCustomerUpdated(event: CustomerUpdatedEvent): Promise<void> {
    // Update any cached customer info in M09
    await this.syncCustomerInfo(event.customer);
  }
}
```

**Benefits:**
- ✅ M01 remains single source of truth for customer data
- ✅ M09 gets notified of all customer changes
- ✅ Event-driven, loosely coupled
- ✅ M09 focuses on engagement, not master data maintenance

---

### **Option 2: Direct Import to M09** ❌ NOT RECOMMENDED

```
Accounting System
           ↓
Module 11 Hub
           ├─→ Module 01 (customer master)
           └─→ Module 09 (duplicate?)
```

**Problems:**
- ❌ Duplicate customer data in M01 and M09
- ❌ Sync issues - which is source of truth?
- ❌ Increased complexity
- ❌ M09 doesn't need ALL customer fields

---

## 📋 What Customer Data M09 Needs

### **From M01 (via events):**

```typescript
interface CustomerDataForM09 {
  // Identity
  id: string;
  
  // Basic info
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  
  // Segmentation
  customer_tier?: 'premium' | 'standard' | 'basic';
  industry?: string;
  company_size?: string;
  
  // Timestamps
  created_at: Date;
  first_invoice_date?: Date;
  
  // Accounting info (enrichment)
  accounting_system_id?: string; // External ID in Tally/Zoho
  credit_limit?: number;
  payment_terms?: string;
}
```

### **What M09 Doesn't Need:**

- ❌ Detailed billing addresses
- ❌ Tax IDs/GST numbers
- ❌ Bank account details
- ❌ Full transaction history

---

## 🎯 Updated Architecture Diagram

```
┌───────────────────────────────────────────────────┐
│         Accounting System (Tally/Zoho)            │
│         (External Customer Master)                │
└────────────────────┬──────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────┐
│            Module 11: Accounting Hub               │
│            (Integration Layer)                     │
└────────────────────┬───────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────┐
│         Module 01: Invoicing                       │
│         (Platform Customer Master) ✅              │
│                                                    │
│  Stores:                                          │
│  • Customer ID                                    │
│  • Name, email, phone                            │
│  • Company info                                  │
│  • Billing details                               │
│  • Credit limits                                 │
│  • Payment terms                                 │
│                                                    │
│  Emits Events:                                    │
│  • customer.created                              │
│  • customer.updated                              │
│  • customer.deleted                              │
└────────────────────┬───────────────────────────────┘
                     │
                     ↓ (Events)
┌────────────────────────────────────────────────────┐
│      Module 09: Marketing & Customer Success       │
│      (Customer Engagement Tracking)                │
│                                                    │
│  References Customer ID (from M01)                │
│                                                    │
│  Stores:                                          │
│  • Customer health scores                         │
│  • Campaign engagement                            │
│  • Referrals made/received                       │
│  • Onboarding progress                           │
│  • Support interactions                          │
│  • Gamification points                           │
│  • Partner relationships                         │
│                                                    │
│  Does NOT duplicate customer master data          │
└────────────────────────────────────────────────────┘
```

---

## 📊 Data Relationship Pattern

### **Foreign Key Reference (Recommended):**

```typescript
// Module 09 entities reference M01 customer ID

@Entity('customer_health')
export class CustomerHealth {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  // Foreign key to M01 customer
  @Column()
  customerId: string; // -> Module_01.customers.id
  
  @Column({ type: 'float' })
  overallScore: number;
  
  // ... other M09-specific fields
}

@Entity('referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  // Foreign keys to M01 customers
  @Column()
  referrerId: string; // -> Module_01.customers.id
  
  @Column()
  referredId: string; // -> Module_01.customers.id
  
  // ... referral details
}
```

**Benefits:**
- ✅ No data duplication
- ✅ M01 remains single source of truth
- ✅ M09 can join data when needed
- ✅ Customer updates in M01 don't require M09 updates

---

## 🔄 Event-Driven Integration

### **Events M09 Should Listen To:**

```typescript
// In Module 09: event handlers

@Injectable()
export class MarketingEventHandlers {
  
  @OnEvent('customer.created')
  async onCustomerCreated(event: CustomerCreatedEvent): Promise<void> {
    // 1. Create health profile
    await this.createHealthProfile(event.customer.id);
    
    // 2. Start onboarding workflow
    await this.triggerOnboarding(event.customer.id);
    
    // 3. Add to welcome campaign
    await this.enrollInWelcomeCampaign(event.customer.id);
    
    // 4. Check for referral
    if (event.referral_code) {
      await this.processReferral(event.referral_code, event.customer.id);
    }
  }
  
  @OnEvent('customer.updated')
  async onCustomerUpdated(event: CustomerUpdatedEvent): Promise<void> {
    // Update cached/denormalized data if any
    // Usually not needed if using foreign keys
  }
  
  @OnEvent('invoice.paid') // From M03 via M01
  async onInvoicePaid(event: InvoicePaidEvent): Promise<void> {
    // Update payment health score
    await this.updatePaymentHealthScore(event.customer_id, 'positive');
  }
  
  @OnEvent('invoice.overdue') // From M01
  async onInvoiceOverdue(event: InvoiceOverdueEvent): Promise<void> {
    // Update payment health score
    await this.updatePaymentHealthScore(event.customer_id, 'negative');
    
    // Trigger retention campaign
    await this.triggerRetentionCampaign(event.customer_id);
  }
}
```

---

## 🎯 Implementation Recommendations

### **1. Customer Master Location:**

✅ **Module 01** owns the customer master
- Imports from accounting systems via M11 Hub
- Maintains authoritative customer records
- Emits events on changes

### **2. Module 09 Integration:**

✅ **Event-driven subscription**
- Listens to customer.* events from M01
- Creates engagement profiles
- References M01 customer ID (foreign key)

### **3. Accounting Hub Role:**

✅ **Import to M01 only**
- Hub imports customers to M01
- M01 emits events
- M09 receives events (not direct import)

---

## 📋 Updated Accounting Hub Specification

### **Add to Module 11 Hub:**

```typescript
// accounting-hub.service.ts - Updated for M09 integration

async importCustomers(params: {
  tenantId: string;
  accountingSystem: string;
}): Promise<Customer[]> {
  // Import from accounting system
  const customers = await this.connector.fetchCustomers(params);
  
  // Return to M01 (M01 will emit events for M09)
  return customers;
}

// NO direct import to M09
// M09 receives data via events from M01
```

---

## 🎯 Benefits of This Architecture

### **1. Single Source of Truth**
- M01 owns customer master
- M09 owns engagement data
- No conflicts

### **2. Event-Driven Communication**
- Loosely coupled
- M09 doesn't depend on M01's internal structure
- Easy to add more modules listening to events

### **3. Scalability**
- Each module scales independently
- No circular dependencies
- Clear data ownership

### **4. Data Consistency**
- Customer updates in M01 automatically propagate
- M09 doesn't need to sync customer master data
- Foreign key integrity maintained

---

## ⚠️ Anti-Patterns to Avoid

### **DON'T: Duplicate Customer Master**

```typescript
// ❌ BAD: M09 has its own customer table
@Entity('marketing_customers') // DON'T DO THIS
export class MarketingCustomer {
  id: string;
  name: string; // Duplicate of M01
  email: string; // Duplicate of M01
  // ... other M01 fields
  
  engagementScore: number; // M09-specific
}

// Problems:
// - Sync issues when M01 updates customer
// - Which is source of truth?
// - Waste of storage
```

### **DO: Reference M01, Store Only M09 Data**

```typescript
// ✅ GOOD: M09 references M01 customer ID
@Entity('customer_health')
export class CustomerHealth {
  id: string;
  customerId: string; // Foreign key to M01
  
  // Only M09-specific data
  engagementScore: number;
  productUsageScore: number;
  // ...
}
```

---

## 📊 Complete Data Flow Diagram

```
┌─────────────────────────┐
│  Accounting System      │
│  (Tally/Zoho/QB)       │
│                         │
│  Customers stored here  │
└───────────┬─────────────┘
            │
            ↓ Import
┌─────────────────────────┐
│  Module 11:             │
│  Accounting Hub         │
│                         │
│  importCustomers()      │
└───────────┬─────────────┘
            │
            ↓ Returns customers
┌─────────────────────────┐
│  Module 01:             │
│  Invoicing              │
│                         │
│  [Customer Master] ✅   │
│  • id                   │
│  • name, email          │
│  • billing info         │
│  • credit limit         │
│                         │
│  Emits:                 │
│  • customer.created     │
│  • customer.updated     │
└───────────┬─────────────┘
            │
            ↓ Events
┌─────────────────────────┐
│  Module 09:             │
│  Marketing & CRM        │
│                         │
│  [Engagement Data]      │
│  • customerId (FK)      │
│  • health scores        │
│  • campaigns            │
│  • referrals            │
│  • onboarding           │
│                         │
│  Listens to:            │
│  • customer.created     │
│  • customer.updated     │
│  • invoice.paid         │
│  • invoice.overdue      │
└─────────────────────────┘
```

---

## 🎯 Final Recommendations

### **For Module 11 Hub:**
- ✅ Import customers from accounting to **M01 ONLY**
- ✅ Do NOT import directly to M09
- ✅ Let M01 emit events for M09

### **For Module 01:**
- ✅ Receive customers from accounting hub
- ✅ Store in customer master table
- ✅ Emit `customer.created`, `customer.updated` events
- ✅ Be the authoritative source for customer data

### **For Module 09:**
- ✅ Listen to `customer.*` events from M01
- ✅ Reference M01 customer ID (foreign key)
- ✅ Store ONLY engagement/marketing data
- ✅ Do NOT duplicate customer master fields

---

## 📋 Implementation Checklist

### **Phase 1: Module 01 Events (Week 1)**
- [ ] M01 emits `customer.created` when importing from accounting
- [ ] M01 emits `customer.updated` when customer changes
- [ ] M01 emits `customer.deleted` when customer removed

### **Phase 2: Module 09 Event Handlers (Week 2)**
- [ ] M09 subscribes to `customer.created`
- [ ] M09 creates customer health profile
- [ ] M09 triggers onboarding workflow
- [ ] M09 adds to welcome campaign

### **Phase 3: Data Enrichment (Week 3)**
- [ ] M09 listens to `invoice.paid` (update payment health)
- [ ] M09 listens to `invoice.overdue` (trigger retention)
- [ ] M09 tracks product usage events
- [ ] M09 calculates overall health score

### **Phase 4: Testing (Week 4)**
- [ ] Test accounting import → M01 → M09 flow
- [ ] Test customer updates propagate correctly
- [ ] Test no data duplication
- [ ] Test foreign key integrity

---

## 🎉 Summary

**Answer:** YES, Module 09 should receive customer data, but:

1. ✅ **Indirectly** via events from Module 01
2. ✅ **M01 is customer master** (single source of truth)
3. ✅ **M09 stores engagement data** (health, campaigns, referrals)
4. ✅ **Foreign key reference** (no duplication)
5. ✅ **Event-driven** (loosely coupled)

**Result:** Clean architecture, no duplication, clear responsibilities!

---

**Architecture Approved:** January 15, 2026  
**Implementation Ready:** YES  
**Benefits:** Single source of truth, event-driven, scalable
