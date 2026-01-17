# Credit Limit Management - Technical Documentation

## Overview

The Credit Limit Management component is a critical part of the Buyer Credit Scoring Module (Phase 6.4). It provides comprehensive capabilities for calculating, approving, and managing credit limits for buyers, enabling SMEs to control credit exposure and make informed credit decisions.

This document provides technical documentation for the Credit Limit Management implementation, including architecture, data models, services, workflows, and integration points.

## Architecture

The Credit Limit Management component follows a modular, layered architecture:

1. **Data Layer**: Entities and repositories for persistent storage
2. **Service Layer**: Business logic for credit limit management
3. **Integration Layer**: Connections to other modules
4. **API Layer**: Controllers and DTOs for external interaction

### Key Components

- **Credit Limit Service**: Core service for managing credit limits
- **Credit Limit Calculation Service**: Service for calculating recommended credit limits
- **Credit Limit Integration Service**: Service for integrating with other modules
- **Entities**: Data models for storing credit limit information
- **DTOs**: Data transfer objects for API interactions

## Data Models

### Core Entities

#### CreditLimit

Entity representing credit limits for buyers.

```typescript
@Entity('credit_limits')
export class CreditLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @Column({ name: 'credit_assessment_id', nullable: true })
  creditAssessmentId: string;

  @Column({ name: 'recommended_limit', type: 'decimal', precision: 19, scale: 4 })
  recommendedLimit: number;

  @Column({ name: 'approved_limit', type: 'decimal', precision: 19, scale: 4 })
  approvedLimit: number;

  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  @Column({ name: 'status', length: 20 })
  status: string;

  // Additional fields...
}
```

#### CreditLimitApproval

Entity representing credit limit approval workflows.

```typescript
@Entity('credit_limit_approvals')
export class CreditLimitApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'credit_limit_id' })
  creditLimitId: string;

  @Column({ name: 'current_step', type: 'integer', default: 1 })
  currentStep: number;

  @Column({ name: 'total_steps', type: 'integer' })
  totalSteps: number;

  @Column({ name: 'status', length: 20 })
  status: string;

  // Additional fields...
}
```

#### CreditLimitHistory

Entity representing credit limit history for audit and analysis.

```typescript
@Entity('credit_limit_history')
export class CreditLimitHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'credit_limit_id' })
  creditLimitId: string;

  @Column({ name: 'change_type', length: 50 })
  changeType: string;

  @Column({ name: 'previous_limit', type: 'decimal', precision: 19, scale: 4, nullable: true })
  previousLimit: number;

  @Column({ name: 'new_limit', type: 'decimal', precision: 19, scale: 4 })
  newLimit: number;

  // Additional fields...
}
```

## Services

### CreditLimitService

Core service for managing credit limits.

#### Key Methods

- `create(createDto)`: Create a new credit limit
- `findActiveLimitByBuyer(buyerId, tenantId)`: Find active credit limit for a buyer
- `update(id, updateDto, tenantId)`: Update a credit limit
- `deactivate(id, tenantId, reason, userId)`: Deactivate a credit limit
- `applyTemporaryIncrease(id, tenantId, increaseAmount, expiryDate, reason, userId)`: Apply temporary increase
- `updateUtilization(id, tenantId, utilizationAmount)`: Update credit limit utilization
- `getHistory(creditLimitId, tenantId)`: Get credit limit history
- `hasSufficientCredit(buyerId, tenantId, amount)`: Check if buyer has sufficient credit

### CreditLimitCalculationService

Service for calculating recommended credit limits.

#### Key Methods

- `calculateRecommendedLimit(buyerId, tenantId, options)`: Calculate recommended credit limit
- `calculateScoreBasedLimit(assessment, buyerProfile, options)`: Calculate limit based on credit score
- `calculatePaymentHistoryBasedLimit(buyerId, tenantId, assessment, options)`: Calculate limit based on payment history
- `calculateIndustryBenchmarkBasedLimit(assessment, buyerProfile, options)`: Calculate limit based on industry benchmarks
- `calculateHybridLimit(buyerId, tenantId, assessment, buyerProfile, options)`: Calculate limit using hybrid approach

### CreditLimitIntegrationService

Service for integrating credit limit management with other modules.

#### Key Methods

- `processNewCreditAssessment(creditAssessmentId, tenantId)`: Process new credit assessment
- `processNewPaymentHistory(paymentHistoryId, tenantId)`: Process new payment history
- `processNewPaymentPrediction(paymentPredictionId, tenantId)`: Process new payment prediction
- `checkCreditLimitForInvoice(buyerId, tenantId, amount)`: Check credit limit before invoice creation
- `updateCreditLimitAfterInvoice(buyerId, tenantId, invoiceId, amount)`: Update limit after invoice creation
- `updateCreditLimitAfterPayment(buyerId, tenantId, paymentId, amount)`: Update limit after payment received
- `getCreditLimitStatusForDashboard(buyerId, tenantId)`: Get credit limit status for dashboard

## Credit Limit Calculation Methods

The Credit Limit Calculation Service implements several methods for calculating recommended credit limits:

### Score-Based Calculation

Calculates credit limit based on credit score:

1. **Credit Score Evaluation**: Determines base multiplier based on credit score ranges
2. **Base Amount Determination**: Uses average transaction amount or specified base amount
3. **Limit Calculation**: Multiplies base amount by score-based multiplier

```typescript
private async calculateScoreBasedLimit(
  assessment: CreditAssessment,
  buyerProfile: BuyerProfile,
  options: any = {},
): Promise<any> {
  // Get credit score from assessment
  const creditScore = assessment.scoreValue;
  
  // Define base multiplier based on score ranges
  let baseMultiplier = 0;
  let confidenceLevel = 0;
  
  if (creditScore >= 90) {
    baseMultiplier = 5.0;
    confidenceLevel = 90;
  } else if (creditScore >= 80) {
    baseMultiplier = 4.0;
    confidenceLevel = 85;
  }
  // Additional ranges...
  
  // Calculate recommended limit
  const baseAmount = options.baseAmount || buyerProfile.averageTransactionAmount || 100000;
  const recommendedLimit = baseAmount * baseMultiplier;
  
  return {
    recommendedLimit,
    confidenceLevel,
    parameters: {
      creditScore,
      baseAmount,
      baseMultiplier,
      method: 'score-based',
    },
  };
}
```

### Payment History-Based Calculation

Calculates credit limit based on payment history:

1. **Payment History Analysis**: Analyzes past 12 months of payment history
2. **On-Time Payment Evaluation**: Calculates percentage of on-time payments
3. **Amount Analysis**: Determines average and maximum payment amounts
4. **Multiplier Determination**: Sets multiplier based on payment behavior
5. **Credit Score Adjustment**: Adjusts multiplier based on credit score
6. **Limit Calculation**: Multiplies maximum amount by adjusted multiplier

### Industry Benchmark-Based Calculation

Calculates credit limit based on industry benchmarks:

1. **Industry Identification**: Determines industry from buyer profile
2. **Benchmark Lookup**: Retrieves industry benchmark data
3. **Credit Score Influence**: Adjusts industry multiplier based on credit score
4. **Limit Calculation**: Multiplies benchmark amount by adjusted multiplier

### Hybrid Calculation

Calculates credit limit using a weighted combination of multiple methods:

1. **Multiple Calculations**: Calculates limits using different methods
2. **Weighted Average**: Applies weights to each calculation method
3. **Confidence Calculation**: Determines overall confidence level
4. **Limit Determination**: Returns weighted average as recommended limit

## Credit Limit Approval Workflow

The credit limit approval process follows a multi-step workflow:

1. **Limit Calculation**: System calculates recommended credit limit
2. **Approval Request Creation**: Creates approval request with workflow steps
3. **Initial Review**: First approver reviews the request
4. **Final Approval**: Final approver makes decision
5. **Limit Activation**: Approved limit becomes active

The workflow supports:

- **Multi-level Approval**: Different roles for different approval steps
- **Supporting Documents**: Attachment of relevant documents to approval requests
- **Approval Conditions**: Setting conditions for approval
- **Audit Trail**: Complete history of approval process

## Integration with Other Modules

### Integration with Credit Assessment

The Credit Limit Management component integrates with the Core Credit Assessment Engine:

1. **Assessment Trigger**: New credit assessments trigger limit review
2. **Score Impact**: Credit score directly influences limit calculation
3. **Risk Level Mapping**: Assessment risk level determines review frequency
4. **Confidence Level**: Assessment confidence affects limit confidence

### Integration with Payment Analysis

The component integrates with the Payment History Analysis:

1. **Utilization Tracking**: Payment history updates limit utilization
2. **Behavior Influence**: Payment behavior affects limit calculation
3. **Prediction Impact**: Payment predictions can trigger limit reviews
4. **Default Risk**: High default probability can reduce credit limits

### Integration with Invoice Management

The component integrates with Invoice Management:

1. **Pre-Invoice Check**: Credit check before invoice creation
2. **Utilization Update**: Limit utilization updated after invoice creation
3. **Payment Impact**: Payments reduce limit utilization
4. **Available Credit**: Available credit calculated for decision-making

## Usage Guidelines

### Creating a Credit Limit

```typescript
// Inject the service
constructor(
  private creditLimitService: CreditLimitService,
  private creditLimitCalculationService: CreditLimitCalculationService,
) {}

// Calculate and create credit limit
async createCreditLimit(buyerId: string, tenantId: string) {
  // Calculate recommended limit
  const calculationResult = await this.creditLimitCalculationService.calculateRecommendedLimit(
    buyerId,
    tenantId,
    { calculationMethod: 'hybrid' }
  );
  
  // Create credit limit with pending status
  const creditLimit = await this.creditLimitService.create({
    ...calculationResult,
    status: 'pending',
    currentUtilization: 0,
  });
  
  return creditLimit;
}
```

### Checking Available Credit

```typescript
// Inject the service
constructor(private creditLimitIntegrationService: CreditLimitIntegrationService) {}

// Check credit before creating invoice
async checkCreditForInvoice(buyerId: string, tenantId: string, amount: number) {
  const checkResult = await this.creditLimitIntegrationService.checkCreditLimitForInvoice(
    buyerId,
    tenantId,
    amount
  );
  
  if (checkResult.approved) {
    // Proceed with invoice creation
    // ...
    
    // Update credit limit after invoice creation
    await this.creditLimitIntegrationService.updateCreditLimitAfterInvoice(
      buyerId,
      tenantId,
      'invoice-123',
      amount
    );
  } else {
    // Handle insufficient credit
    // ...
  }
  
  return checkResult;
}
```

### Applying Temporary Increase

```typescript
// Inject the service
constructor(private creditLimitService: CreditLimitService) {}

// Apply temporary increase
async applyTemporaryIncrease(
  creditLimitId: string,
  tenantId: string,
  amount: number,
  reason: string,
  userId: string
) {
  // Set expiry date (e.g., 30 days from now)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  
  const updatedLimit = await this.creditLimitService.applyTemporaryIncrease(
    creditLimitId,
    tenantId,
    amount,
    expiryDate,
    reason,
    userId
  );
  
  return updatedLimit;
}
```

## Performance Considerations

- **Caching**: Frequently accessed credit limits should be cached
- **Batch Processing**: Utilization updates can be batched for performance
- **Asynchronous Processing**: Long-running calculations should be asynchronous
- **Indexing**: Proper database indexing for buyer ID and tenant ID

## Security Considerations

- **Multi-tenancy**: All operations enforce tenant isolation
- **Access Control**: Limit management requires appropriate permissions
- **Approval Workflow**: Multi-level approval for significant changes
- **Audit Trail**: Complete history of all limit changes
- **Data Protection**: Credit limit data is protected with appropriate measures

## Testing

The Credit Limit Management component includes comprehensive tests:

- **Unit Tests**: For individual services and calculation methods
- **Integration Tests**: For interactions between components
- **End-to-End Tests**: For complete credit limit workflows

## Future Enhancements

Planned enhancements for future phases:

1. **AI-Powered Limit Calculation**: Integration with DeepSeek R1 for advanced limit recommendations
2. **Dynamic Limit Adjustment**: Automatic adjustment based on payment behavior
3. **Group Credit Limits**: Management of limits for related buyers
4. **Credit Limit Insurance**: Integration with credit insurance providers
5. **Advanced Approval Workflows**: Configurable approval workflows with delegation

## Conclusion

The Credit Limit Management component provides comprehensive capabilities for calculating, approving, and managing credit limits. It enables SMEs to control credit exposure, make informed credit decisions, and manage risk effectively. The component integrates seamlessly with other modules in the system, providing a complete solution for credit management.
