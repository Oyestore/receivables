# Payment History Analysis - Technical Documentation

## Overview

The Payment History Analysis component is a critical part of the Buyer Credit Scoring Module (Phase 6.2). It provides advanced capabilities for analyzing historical payment behavior, detecting patterns, calculating metrics, and predicting future payment behavior.

This document provides technical documentation for the Payment History Analysis implementation, including architecture, data models, services, and usage guidelines.

## Architecture

The Payment History Analysis component follows a modular, layered architecture:

1. **Data Layer**: Entities and repositories for persistent storage
2. **Service Layer**: Business logic for payment analysis and prediction
3. **API Layer**: Controllers and DTOs for external interaction

### Key Components

- **Payment Metrics Service**: Calculates and analyzes payment metrics
- **Payment Pattern Service**: Detects and analyzes payment patterns
- **Payment Prediction Service**: Predicts future payment behavior
- **Entities**: Data models for storing payment analysis information
- **DTOs**: Data transfer objects for API interactions

## Data Models

### Core Entities

#### PaymentMetrics

Entity representing calculated metrics about payment behavior.

```typescript
@Entity('payment_metrics')
export class PaymentMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @Column({ name: 'period_start', type: 'timestamp' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamp' })
  periodEnd: Date;

  // Payment volume metrics
  @Column({ name: 'payment_count', type: 'integer' })
  paymentCount: number;

  @Column({ name: 'total_payment_value', type: 'decimal', precision: 19, scale: 4 })
  totalPaymentValue: number;

  // Timeliness metrics
  @Column({ name: 'avg_days_past_due', type: 'decimal', precision: 10, scale: 2 })
  avgDaysPastDue: number;

  @Column({ name: 'on_time_payment_percentage', type: 'decimal', precision: 5, scale: 2 })
  onTimePaymentPercentage: number;

  // Additional metrics...
}
```

#### PaymentPattern

Entity representing identified payment patterns.

```typescript
@Entity('payment_patterns')
export class PaymentPattern {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'pattern_type', length: 50 })
  patternType: string;

  @Column({ name: 'confidence_level', type: 'integer' })
  confidenceLevel: number;

  // Pattern details
  @Column({ name: 'pattern_data', type: 'jsonb' })
  patternData: Record<string, any>;

  // Additional fields...
}
```

#### PaymentPrediction

Entity representing payment behavior predictions.

```typescript
@Entity('payment_predictions')
export class PaymentPrediction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @Column({ name: 'prediction_date', type: 'timestamp' })
  predictionDate: Date;

  @Column({ name: 'horizon_days', type: 'integer' })
  horizonDays: number;

  // Probability metrics
  @Column({ name: 'on_time_probability', type: 'decimal', precision: 5, scale: 2 })
  onTimeProbability: number;

  @Column({ name: 'late_probability', type: 'decimal', precision: 5, scale: 2 })
  lateProbability: number;

  // Additional fields...
}
```

#### PaymentBenchmark

Entity representing cross-business payment benchmarks.

```typescript
@Entity('payment_benchmarks')
export class PaymentBenchmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'industry_code', length: 20 })
  industryCode: string;

  @Column({ name: 'region_code', length: 20, nullable: true })
  regionCode: string;

  // Benchmark metrics
  @Column({ name: 'avg_days_past_due', type: 'decimal', precision: 10, scale: 2 })
  avgDaysPastDue: number;

  @Column({ name: 'median_days_past_due', type: 'decimal', precision: 10, scale: 2 })
  medianDaysPastDue: number;

  // Additional fields...
}
```

## Services

### PaymentMetricsService

Service for calculating and analyzing payment metrics.

#### Key Methods

- `calculateMetrics(buyerId, tenantId, startDate, endDate)`: Calculates payment metrics for a period
- `getLatestMetrics(buyerId, tenantId)`: Gets the latest payment metrics for a buyer
- `getMetricsForPeriod(buyerId, tenantId, startDate, endDate)`: Gets metrics for a specific period

### PaymentPatternService

Service for detecting and analyzing payment patterns.

#### Key Methods

- `detectPatterns(buyerId, tenantId)`: Detects payment patterns for a buyer
- `getActivePatterns(buyerId, tenantId)`: Gets all active payment patterns for a buyer
- `getPatternsByType(buyerId, tenantId, patternType)`: Gets patterns of a specific type

### PaymentPredictionService

Service for predicting future payment behavior.

#### Key Methods

- `generatePrediction(buyerId, tenantId, horizonDays)`: Generates payment predictions
- `getLatestPrediction(buyerId, tenantId)`: Gets the latest payment prediction for a buyer
- `getPredictionsForDateRange(buyerId, tenantId, startDate, endDate)`: Gets predictions for a date range
- `getPredictionsForMultipleHorizons(buyerId, tenantId, horizons)`: Gets predictions for multiple horizons

## Pattern Detection Algorithms

The Payment Pattern Service implements several sophisticated algorithms for detecting different types of payment patterns:

### Seasonal Pattern Detection

Identifies monthly patterns in payment behavior, such as consistently late payments in specific months.

```typescript
private async detectSeasonalPattern(
  buyerId: string,
  tenantId: string,
  paymentRecords: PaymentHistory[],
): Promise<PaymentPattern | null> {
  // Group payments by month
  const paymentsByMonth = new Array(12).fill(0).map(() => []);
  
  paymentRecords.forEach(payment => {
    const month = new Date(payment.dueDate).getMonth();
    paymentsByMonth[month].push(payment);
  });
  
  // Calculate average days past due for each month
  const monthlyAvgDaysPastDue = paymentsByMonth.map((monthPayments, index) => {
    if (monthPayments.length === 0) return { month: index, avg: null };
    
    const sum = monthPayments.reduce((acc, payment) => acc + (payment.daysPastDue || 0), 0);
    return { 
      month: index, 
      avg: sum / monthPayments.length,
      count: monthPayments.length
    };
  });
  
  // Identify problematic or good months
  // ...
}
```

### Cyclical Pattern Detection

Identifies recurring payment cycles, such as payments every 30 days.

```typescript
private async detectCyclicalPattern(
  buyerId: string,
  tenantId: string,
  paymentRecords: PaymentHistory[],
): Promise<PaymentPattern | null> {
  // Calculate intervals between payments
  const intervals = [];
  for (let i = 1; i < sortedRecords.length; i++) {
    const interval = Math.floor(
      (new Date(sortedRecords[i].dueDate).getTime() - new Date(sortedRecords[i-1].dueDate).getTime()) 
      / (1000 * 60 * 60 * 24)
    );
    intervals.push(interval);
  }
  
  // Find common intervals (potential cycles)
  // ...
}
```

### Trend Pattern Detection

Identifies improving or deteriorating payment behavior over time.

```typescript
private async detectTrendPattern(
  buyerId: string,
  tenantId: string,
  paymentRecords: PaymentHistory[],
): Promise<PaymentPattern | null> {
  // Split into quarters
  const quarters = [];
  const quarterSize = Math.max(3, Math.floor(sortedRecords.length / 4));
  
  // Calculate average days past due for each quarter
  // ...
  
  // Check if there's a consistent trend
  // ...
}
```

### Amount-Based Pattern Detection

Identifies correlations between payment amount and payment timeliness.

```typescript
private async detectAmountPattern(
  buyerId: string,
  tenantId: string,
  paymentRecords: PaymentHistory[],
): Promise<PaymentPattern | null> {
  // Group payments by amount range
  const amountRanges = {};
  
  // Find if there's a correlation between amount and payment timeliness
  // ...
}
```

## Prediction Model

The Payment Prediction Service implements a sophisticated prediction model that combines multiple factors:

1. **Base Metrics**: Uses the latest payment metrics as a baseline
2. **Trend Adjustment**: Adjusts predictions based on identified trends
3. **Seasonal Adjustment**: Adjusts predictions based on seasonal patterns
4. **Confidence Calculation**: Determines prediction confidence based on data quality

```typescript
private async calculatePrediction(
  metrics: PaymentMetrics,
  patterns: PaymentPattern[],
  buyerProfile: BuyerProfile,
  horizonDays: number,
): Promise<PaymentPrediction> {
  // Base prediction on current metrics
  let predictedAvgDaysPastDue = metrics.avgDaysPastDue;
  let onTimeProbability = metrics.onTimePaymentPercentage;
  // ...
  
  // Adjust based on trend pattern if available
  const trendPattern = patterns.find(p => p.patternType === 'trend');
  if (trendPattern) {
    // Apply trend adjustment
    // ...
  }
  
  // Adjust based on seasonal pattern if available
  const seasonalPattern = patterns.find(p => p.patternType === 'seasonal');
  if (seasonalPattern) {
    // Apply seasonal adjustment
    // ...
  }
  
  // Calculate predicted overall score
  // ...
  
  // Calculate confidence level
  // ...
}
```

## Usage Guidelines

### Calculating Payment Metrics

```typescript
// Inject the service
constructor(private paymentMetricsService: PaymentMetricsService) {}

// Calculate metrics for a period
async calculateBuyerMetrics(buyerId: string, tenantId: string) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6); // Last 6 months
  const endDate = new Date();
  
  const metrics = await this.paymentMetricsService.calculateMetrics(
    buyerId,
    tenantId,
    startDate,
    endDate
  );
  
  return metrics;
}
```

### Detecting Payment Patterns

```typescript
// Inject the service
constructor(private paymentPatternService: PaymentPatternService) {}

// Detect patterns for a buyer
async detectBuyerPatterns(buyerId: string, tenantId: string) {
  const patterns = await this.paymentPatternService.detectPatterns(
    buyerId,
    tenantId
  );
  
  return patterns;
}
```

### Generating Payment Predictions

```typescript
// Inject the service
constructor(private paymentPredictionService: PaymentPredictionService) {}

// Generate predictions for multiple horizons
async generateBuyerPredictions(buyerId: string, tenantId: string) {
  const horizons = [30, 90, 180]; // 1, 3, and 6 months
  
  const predictions = await this.paymentPredictionService.getPredictionsForMultipleHorizons(
    buyerId,
    tenantId,
    horizons
  );
  
  return predictions;
}
```

## Integration Points

### Integration with Core Credit Assessment Engine

The Payment History Analysis component integrates with the Core Credit Assessment Engine:

1. **Data Sharing**: Payment metrics and patterns are used in credit assessment
2. **Risk Evaluation**: Payment predictions inform risk level determination
3. **Credit Limit Calculation**: Payment behavior affects recommended credit limits

### Integration with Other Modules

The component integrates with:

1. **Invoice Management Module**: To access invoice and payment data
2. **Analytics and Reporting Module**: To provide payment analysis for reporting
3. **Milestone-Based Payment Module**: To inform milestone approval decisions

## Performance Considerations

- **Caching**: Frequently accessed metrics and patterns should be cached
- **Batch Processing**: Pattern detection can be resource-intensive and should be scheduled
- **Prediction Expiry**: Predictions should expire after a reasonable period (e.g., 30 days)

## Security Considerations

- **Multi-tenancy**: All operations enforce tenant isolation
- **Data Protection**: Payment history data is protected with appropriate measures
- **Access Control**: Operations require appropriate permissions

## Testing

The Payment History Analysis component includes comprehensive tests:

- **Unit Tests**: For individual services and algorithms
- **Integration Tests**: For interactions between components
- **End-to-End Tests**: For complete analysis workflows

## Future Enhancements

Planned enhancements for future phases:

1. **AI-Powered Prediction**: Integration with DeepSeek R1 for advanced prediction
2. **Real-time Analysis**: Continuous updating of metrics and predictions
3. **Advanced Benchmarking**: More sophisticated cross-business comparisons
4. **Behavioral Segmentation**: Clustering buyers by payment behavior patterns
5. **Anomaly Detection**: Identifying unusual payment behavior

## Conclusion

The Payment History Analysis component provides sophisticated capabilities for analyzing payment behavior, detecting patterns, and predicting future behavior. It enables SMEs to gain deep insights into buyer payment behavior, identify risks, and make informed credit decisions.
