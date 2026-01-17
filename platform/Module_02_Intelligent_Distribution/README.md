# Module 02: Intelligent Distribution & Follow-up

## Overview

The **Intelligent Distribution & Follow-up** module provides automated invoice distribution across multiple channels with intelligent rule-based routing and comprehensive follow-up workflows. This module serves as the core communication hub for the SME Receivables Management Platform.

## Features

### 🎯 **Intelligent Rule Engine**
- **Amount-based distribution**: Route invoices based on amount thresholds
- **Customer-based distribution**: Target specific customer segments or types
- **Industry-based distribution**: Industry-specific routing strategies
- **Geographic distribution**: Location-based routing (country, state, city)
- **Custom rules**: Advanced JavaScript-based rule evaluation

### 📧 **Multi-Channel Distribution**
- **Email**: Automated email delivery with templates
- **SMS**: Text message distribution for quick notifications
- **WhatsApp**: Business API integration for rich media
- **Postal**: Traditional mail service integration
- **EDI**: Electronic Data Interchange for B2B
- **API**: Webhook and API-based delivery

### 📊 **Analytics & Reporting**
- Real-time delivery tracking
- Success rate analytics
- Channel performance metrics
- Average delivery time calculations
- Comprehensive status breakdown

### 🔄 **Batch Operations**
- Bulk assignment creation
- Batch status updates
- Mass distribution campaigns

## Architecture

### Core Components

```
Module_02_Intelligent_Distribution/
├── src/
│   ├── entities/
│   │   └── distribution-entities.ts     # Database entities
│   ├── services/
│   │   └── distribution.service.ts      # Business logic
│   ├── controllers/
│   │   └── distribution.controller.ts   # REST API endpoints
│   ├── dto/
│   │   └── distribution.dto.ts          # Data transfer objects
│   ├── test/
│   │   └── distribution.module.spec.ts  # Unit tests
│   └── distribution.module.ts            # NestJS module
└── README.md
```

### Database Schema

#### Distribution Rules Table
```sql
CREATE TABLE distribution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    rule_name VARCHAR(200) NOT NULL,
    description TEXT,
    rule_type VARCHAR(20) NOT NULL,
    conditions JSONB NOT NULL,
    target_channel VARCHAR(50) NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID
);
```

#### Distribution Assignments Table
```sql
CREATE TABLE distribution_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    invoice_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    assigned_channel VARCHAR(50) NOT NULL,
    rule_id UUID REFERENCES distribution_rules(id),
    assignment_reason TEXT NOT NULL,
    distribution_status VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    error TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Distribution Rules

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/distribution/rules` | Create new distribution rule |
| GET | `/distribution/rules` | Get all rules for tenant |
| GET | `/distribution/rules/:id` | Get specific rule |
| PATCH | `/distribution/rules/:id` | Update rule |
| DELETE | `/distribution/rules/:id` | Delete rule (soft delete) |

### Distribution Assignments

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/distribution/assignments` | Create manual assignment |
| POST | `/distribution/assignments/intelligent` | Create intelligent assignment |
| GET | `/distribution/assignments` | Get assignments with filters |
| GET | `/distribution/assignments/:id` | Get specific assignment |
| GET | `/distribution/assignments/invoice/:invoiceId` | Get assignments by invoice |
| PATCH | `/distribution/assignments/:id/status` | Update assignment status |

### Analytics

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/distribution/analytics` | Get distribution analytics |

### Batch Operations

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/distribution/assignments/batch` | Create multiple assignments |
| PATCH | `/distribution/assignments/batch/status` | Update multiple statuses |

## Rule Types

### 1. Amount-Based Rules
```json
{
  "ruleType": "amount_based",
  "conditions": {
    "minAmount": 1000,
    "maxAmount": 50000
  }
}
```

### 2. Customer-Based Rules
```json
{
  "ruleType": "customer_based",
  "conditions": {
    "customerSegments": ["premium", "enterprise"],
    "customerTypes": ["recurring", "new"]
  }
}
```

### 3. Industry-Based Rules
```json
{
  "ruleType": "industry_based",
  "conditions": {
    "industries": ["manufacturing", "retail", "healthcare"]
  }
}
```

### 4. Geographic Rules
```json
{
  "ruleType": "geographic",
  "conditions": {
    "countries": ["US", "CA", "UK"],
    "states": ["CA", "NY", "TX"],
    "cities": ["New York", "Los Angeles", "Chicago"]
  }
}
```

### 5. Custom Rules
```json
{
  "ruleType": "custom",
  "conditions": {
    "customConditions": {
      "expression": "invoice.amount > 10000 && customer.riskScore < 50",
      "variables": ["invoice.amount", "customer.riskScore"]
    }
  }
}
```

## Usage Examples

### Creating an Intelligent Distribution Rule

```typescript
const rule = await distributionService.createDistributionRule({
  tenantId: 'tenant-uuid',
  ruleName: 'High Value Invoices - Email',
  description: 'Send invoices over $10,000 via email with priority handling',
  ruleType: DistributionRuleType.AMOUNT_BASED,
  conditions: {
    minAmount: 10000
  },
  targetChannel: DistributionChannel.EMAIL,
  priority: 90,
  createdBy: 'user-uuid'
});
```

### Intelligent Assignment Creation

```typescript
const assignments = await distributionService.evaluateAndCreateAssignments(
  'tenant-uuid',
  {
    invoiceId: 'invoice-uuid',
    customerId: 'customer-uuid',
    amount: 15000,
    dueDate: new Date('2024-02-15'),
    customerData: {
      segment: 'premium',
      industry: 'manufacturing',
      location: {
        country: 'US',
        state: 'CA'
      }
    }
  }
);
```

### Analytics Retrieval

```typescript
const analytics = await distributionService.getDistributionAnalytics(
  'tenant-uuid',
  new Date('2024-01-01'),
  new Date('2024-01-31')
);

console.log(`Success Rate: ${analytics.successRate}%`);
console.log(`Average Delivery Time: ${analytics.averageDeliveryTime} minutes`);
```

## Integration Points

### Dependencies
- **TypeORM**: Database ORM
- **NestJS**: Framework
- **PostgreSQL**: Database with JSONB support

### Module Dependencies
- **Module_01_Smart_Invoice_Generation**: Invoice data
- **Module_03_Payment_Integration**: Payment status updates
- **Module_11_Common**: Shared utilities and services

### External Integrations
- **Email Service Providers** (SendGrid, AWS SES)
- **SMS Gateways** (Twilio, AWS SNS)
- **WhatsApp Business API**
- **Postal Service APIs**

## Configuration

### Environment Variables
```env
# Distribution Service
DISTRIBUTION_BATCH_SIZE=100
DISTRIBUTION_RETRY_ATTEMPTS=3
DISTRIBUTION_TIMEOUT=30000

# External Services
EMAIL_SERVICE_API_KEY=your-email-api-key
SMS_SERVICE_API_KEY=your-sms-api-key
WHATSAPP_WEBHOOK_URL=your-webhook-url
```

### TypeORM Configuration
```typescript
{
  entities: [DistributionRule, DistributionAssignment],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development'
}
```

## Testing

### Unit Tests
```bash
npm test -- Module_02_Intelligent_Distribution
```

### Integration Tests
```bash
npm run test:e2e -- distribution
```

### Test Coverage
- Rule evaluation logic
- Database operations
- API endpoints
- Analytics calculations

## Performance Considerations

### Database Indexes
- `idx_distribution_rules_tenant` on tenant_id
- `idx_distribution_rules_priority` on priority
- `idx_distribution_assignments_tenant` on tenant_id
- `idx_distribution_assignments_status` on distribution_status
- `idx_distribution_assignments_invoice` on invoice_id

### Caching Strategy
- Rule caching for frequent evaluations
- Analytics caching for dashboard performance
- Channel provider rate limiting

### Batch Processing
- Bulk assignment creation (100 records per batch)
- Asynchronous status updates
- Queue-based distribution for high volume

## Monitoring & Logging

### Key Metrics
- Rule evaluation success rate
- Distribution success rate by channel
- Average processing time
- Error rates and types

### Logging Levels
- **INFO**: Rule evaluations, assignments created
- **WARN**: Rule evaluation failures, delivery issues
- **ERROR**: Database errors, external service failures
- **DEBUG**: Detailed rule processing steps

## Security

### Data Protection
- Tenant isolation enforced at database level
- Sensitive customer data encrypted in metadata
- Audit trail for all rule modifications

### Access Control
- Role-based access to rule management
- Tenant-scoped API access
- Rate limiting on distribution endpoints

## Troubleshooting

### Common Issues

1. **Rule Not Matching**
   - Verify rule conditions format
   - Check rule priority ordering
   - Validate customer data structure

2. **Distribution Failures**
   - Check external service credentials
   - Verify channel provider status
   - Review error logs for specific issues

3. **Performance Issues**
   - Monitor database query performance
   - Check for missing indexes
   - Review batch processing efficiency

### Debug Mode
```typescript
// Enable detailed logging
process.env.DISTRIBUTION_DEBUG = 'true';
```

## Future Enhancements

### Planned Features
- **ML-based Rule Optimization**: Machine learning for rule performance
- **A/B Testing**: Rule effectiveness testing
- **Advanced Analytics**: Predictive delivery success rates
- **Multi-language Support**: Localization for distribution content

### Scalability Improvements
- **Horizontal Scaling**: Multiple service instances
- **Database Sharding**: Tenant-based data partitioning
- **Event-Driven Architecture**: Async processing with message queues

---

## Support

For technical support and questions:
- Review the test cases for usage examples
- Check the application logs for detailed error information
- Refer to the platform documentation for integration guidelines
