# Core Credit Assessment Engine - Technical Documentation

## Overview

The Core Credit Assessment Engine is the foundational component of the Buyer Credit Scoring Module (Phase 6). It provides comprehensive credit assessment capabilities for evaluating buyer creditworthiness, analyzing payment behavior, and determining appropriate credit limits.

This document provides technical documentation for the Core Credit Assessment Engine implementation, including architecture, data models, services, and usage guidelines.

## Architecture

The Core Credit Assessment Engine follows a modular, layered architecture:

1. **Data Layer**: Entities and repositories for persistent storage
2. **Service Layer**: Business logic for credit assessment and scoring
3. **API Layer**: Controllers and DTOs for external interaction

### Key Components

- **Credit Assessment Service**: Core service for managing credit assessments
- **Data Collector Service**: Collects data from various sources for assessment
- **Score Calculator Service**: Calculates credit scores based on collected data
- **Entities**: Data models for storing assessment information
- **DTOs**: Data transfer objects for API interactions

## Data Models

### Core Entities

#### CreditAssessment

The central entity representing a credit assessment for a buyer.

```typescript
@Entity('credit_assessments')
export class CreditAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @Column({
    type: 'enum',
    enum: CreditScoreType,
    default: CreditScoreType.COMPREHENSIVE
  })
  scoreType: CreditScoreType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  scoreValue: number;

  // Additional fields...
}
```

#### AssessmentDataSource

Tracks data sources used in credit assessment.

```typescript
@Entity('assessment_data_sources')
export class AssessmentDataSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assessment_id' })
  assessmentId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({
    name: 'source_type',
    type: 'enum',
    enum: DataSourceType
  })
  sourceType: DataSourceType;

  // Additional fields...
}
```

#### CreditScoreFactor

Represents individual factors contributing to the credit score.

```typescript
@Entity('credit_score_factors')
export class CreditScoreFactor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assessment_id' })
  assessmentId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 100 })
  name: string;

  // Additional fields...
}
```

#### BuyerProfile

Contains key information about the buyer needed for credit scoring.

```typescript
@Entity('buyer_profiles')
export class BuyerProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  // Additional fields...
}
```

#### PaymentHistory

Tracks historical payment behavior used in credit assessment.

```typescript
@Entity('payment_history')
export class PaymentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  // Additional fields...
}
```

#### ScoringModel

Defines the algorithm, weights, and parameters used in credit scoring.

```typescript
@Entity('scoring_models')
export class ScoringModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 100 })
  name: string;

  // Additional fields...
}
```

### Enums

- **CreditScoreType**: Types of credit scores (BASIC, COMPREHENSIVE, INDUSTRY_SPECIFIC, etc.)
- **CreditAssessmentStatus**: Status of an assessment (PENDING, IN_PROGRESS, COMPLETED, etc.)
- **ConfidenceLevel**: Confidence in the assessment (VERY_LOW, LOW, MODERATE, HIGH, VERY_HIGH)
- **RiskLevel**: Risk level determined by assessment (VERY_LOW, LOW, MODERATE, HIGH, VERY_HIGH, EXTREME)
- **DataSourceType**: Types of data sources (INTERNAL_PAYMENT_HISTORY, CREDIT_BUREAU, BANKING_DATA, etc.)

### DTOs

- **CreateCreditAssessmentDto**: For creating new credit assessments
- **UpdateCreditAssessmentDto**: For updating existing credit assessments
- **CreateAssessmentDataSourceDto**: For creating new data sources

## Services

### CreditAssessmentService

The main service for managing credit assessments.

#### Key Methods

- `create(createDto)`: Creates a new credit assessment
- `processAssessment(assessmentId)`: Processes an assessment asynchronously
- `findAll(tenantId, buyerId?)`: Finds all assessments with optional filtering
- `findOne(id, tenantId)`: Finds a specific assessment by ID
- `findLatestForBuyer(buyerId, tenantId)`: Finds the latest assessment for a buyer
- `update(id, updateDto, tenantId)`: Updates an assessment
- `manualOverride(id, overrideData, tenantId, userId)`: Manually overrides assessment results
- `remove(id, tenantId)`: Deletes an assessment

### DataCollectorService

Collects data from various sources for credit assessment.

#### Key Methods

- `collectAllData(assessmentId, buyerId, tenantId)`: Collects data from all available sources
- `collectPaymentHistory(assessmentId, buyerId, tenantId)`: Collects payment history data
- `collectBuyerProfileData(assessmentId, buyerId, tenantId)`: Collects buyer profile data
- `createDataSource(createDto)`: Creates a custom data source
- `getDataSourcesForAssessment(assessmentId, tenantId)`: Gets all data sources for an assessment

### ScoreCalculatorService

Calculates credit scores based on collected data.

#### Key Methods

- `calculateFactorScores(assessmentId, tenantId, scoringModel, dataSources)`: Calculates factor scores
- `calculateOverallScore(factorScores, scoringModel)`: Calculates overall score
- `calculateRecommendedCreditLimit(scoreValue, buyerAnnualRevenue, scoringModel)`: Calculates recommended credit limit

## Usage Guidelines

### Creating a Credit Assessment

```typescript
// Inject the service
constructor(private creditAssessmentService: CreditAssessmentService) {}

// Create a new assessment
async createAssessment() {
  const createDto: CreateCreditAssessmentDto = {
    tenantId: 'tenant-123',
    buyerId: 'buyer-123',
    scoreType: CreditScoreType.COMPREHENSIVE,
  };
  
  const assessment = await this.creditAssessmentService.create(createDto);
  return assessment;
}
```

### Getting Assessment Results

```typescript
// Get the latest assessment for a buyer
async getBuyerAssessment(buyerId: string, tenantId: string) {
  const assessment = await this.creditAssessmentService.findLatestForBuyer(buyerId, tenantId);
  return assessment;
}
```

### Manual Override

```typescript
// Override assessment results
async overrideAssessment(assessmentId: string, tenantId: string, userId: string) {
  const overrideData = {
    scoreValue: 85,
    riskLevel: RiskLevel.LOW,
    recommendedCreditLimit: 50000,
    notes: 'Manual override based on additional information',
  };
  
  const assessment = await this.creditAssessmentService.manualOverride(
    assessmentId,
    overrideData,
    tenantId,
    userId
  );
  
  return assessment;
}
```

## Integration Points

### Integration with Other Modules

The Core Credit Assessment Engine integrates with:

1. **Invoice Management Module**: To access invoice and payment data
2. **Analytics and Reporting Module**: To provide credit assessment data for reporting
3. **Milestone-Based Payment Module**: To inform milestone approval decisions

### External System Integration

The engine is designed to integrate with external systems:

1. **Credit Bureaus**: For external credit information
2. **Banking Systems**: For transaction data
3. **Government Databases**: For registration and compliance data

## Performance Considerations

- **Asynchronous Processing**: Credit assessments are processed asynchronously to avoid blocking operations
- **Data Caching**: Frequently accessed data should be cached to improve performance
- **Batch Processing**: Large datasets are processed in batches to optimize resource usage

## Security Considerations

- **Multi-tenancy**: All operations enforce tenant isolation
- **Data Protection**: Sensitive financial data is protected with appropriate measures
- **Access Control**: Operations require appropriate permissions
- **Audit Logging**: All significant operations are logged for audit purposes

## Testing

The Core Credit Assessment Engine includes comprehensive tests:

- **Unit Tests**: For individual components and services
- **Integration Tests**: For interactions between components
- **End-to-End Tests**: For complete assessment workflows

## Future Enhancements

Planned enhancements for future phases:

1. **AI-Powered Scoring**: Integration with DeepSeek R1 for advanced scoring
2. **Real-time Updates**: Continuous assessment updates based on new data
3. **Industry-specific Models**: More sophisticated industry-specific risk models
4. **Behavioral Analysis**: Advanced analysis of payment behavior patterns
5. **Predictive Analytics**: Forecasting future payment behavior

## Conclusion

The Core Credit Assessment Engine provides a robust foundation for the Buyer Credit Scoring Module. It enables comprehensive credit assessment, risk evaluation, and credit limit determination for buyers, helping SMEs make informed credit decisions and manage risk effectively.
