# Module 09: Marketing & Customer Success API Documentation

## Overview

Module 09 provides comprehensive marketing automation, customer success management, and growth catalyst features for the SME Platform. This API enables lead management, campaign execution, referral programs, customer health monitoring, partner ecosystem management, gamification, and advanced analytics.

## Base URL

```
Production: https://marketing.your-domain.com/api/v1
Development: http://localhost:3009/api/v1
```

## Authentication

All API endpoints require authentication using JWT tokens or API keys.

```http
Authorization: Bearer <jwt_token>
# OR
X-API-Key: <api_key>
```

## Response Format

All responses follow a consistent format:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": []
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Lead Management

### Create Lead

```http
POST /api/v1/leads
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "companyName": "Test Company",
  "source": "WEBSITE",
  "metadata": {
    "campaign": "summer-promo",
    "utmSource": "google"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "status": "NEW",
    "score": 65,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get All Leads

```http
GET /api/v1/leads?status=QUALIFIED&source=WEBSITE&page=1&limit=20
```

**Query Parameters:**
- `status`: Filter by lead status (NEW, CONTACTED, QUALIFIED, CONVERTED, LOST)
- `source`: Filter by lead source (WEBSITE, REFERRAL, PARTNER, CAMPAIGN, OTHER)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

### Get Lead Details

```http
GET /api/v1/leads/{leadId}
```

### Update Lead Status

```http
PATCH /api/v1/leads/{leadId}/status
```

**Request Body:**
```json
{
  "status": "QUALIFIED"
}
```

### Calculate Lead Score

```http
POST /api/v1/leads/{leadId}/score
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "score": 78,
    "scoreFactors": {
      "companySize": 20,
      "industry": 15,
      "source": 10,
      "engagement": 33
    }
  }
}
```

## Campaign Management

### Create Campaign

```http
POST /api/v1/campaigns
```

**Request Body:**
```json
{
  "tenantId": "tenant-uuid",
  "name": "Summer Promotion 2024",
  "type": "email",
  "targetAudience": {
    "segment": "new-customers",
    "filters": {
      "registrationDate": "2024-01-01",
      "minRevenue": 1000
    }
  },
  "content": {
    "subject": "Special Summer Offer!",
    "body": "Get 20% off on all services...",
    "template": "summer-promo-2024"
  },
  "scheduledAt": "2024-06-01T09:00:00.000Z",
  "createdBy": "user-uuid"
}
```

### Start Campaign

```http
PATCH /api/v1/campaigns/{campaignId}/start
```

### Get Campaign Analytics

```http
GET /api/v1/campaigns/{campaignId}/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalSent": 1000,
      "totalOpened": 650,
      "totalClicked": 120,
      "totalConverted": 25,
      "openRate": 65.0,
      "clickRate": 12.0,
      "conversionRate": 2.5
    },
    "performance": {
      "costPerAcquisition": 40.00,
      "returnOnInvestment": 250.0,
      "revenueGenerated": 2500.00
    }
  }
}
```

## Referral System

### Create Referral Code

```http
POST /api/v1/referrals/create
```

**Request Body:**
```json
{
  "referrerId": "user-uuid",
  "tenantId": "tenant-uuid",
  "campaignId": "campaign-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "referral-uuid",
    "referralCode": "ABC12345",
    "status": "pending",
    "expiresAt": "2024-09-01T00:00:00.000Z"
  }
}
```

### Handle Referral Click

```http
POST /api/v1/referrals/click/{referralCode}
```

**Request Body:**
```json
{
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "utmSource": "facebook",
  "utmMedium": "social"
}
```

### Convert Referral

```http
POST /api/v1/referrals/convert/{referralCode}
```

**Request Body:**
```json
{
  "refereeId": "new-user-uuid",
  "conversionType": "signup",
  "conversionValue": 1000.00
}
```

### Get Referral Stats

```http
GET /api/v1/referrals/stats/{userId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalReferrals": 25,
    "completedReferrals": 18,
    "pendingReferrals": 7,
    "totalEarned": 1800.00,
    "totalClaimed": 1200.00,
    "pendingRewards": 600.00,
    "currentTier": "silver",
    "rank": 15,
    "currentStreak": 3
  }
}
```

## Customer Success

### Calculate Customer Health

```http
POST /api/v1/customer-success/health
```

**Request Body:**
```json
{
  "tenantId": "tenant-uuid",
  "customerId": "customer-uuid",
  "subscriptionStatus": "active",
  "mrr": 1000.00,
  "totalInvoices": 24,
  "paidInvoices": 22,
  "overdueInvoices": 2,
  "supportTickets": 3,
  "npsScore": 8,
  "featureAdoptionRate": 0.75
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "health-uuid",
    "healthScore": 78,
    "riskLevel": "low",
    "healthFactors": {
      "paymentHistory": 25,
      "usage": 20,
      "engagement": 18,
      "support": 15
    },
    "recommendations": [
      "Increase feature adoption through targeted training",
      "Consider upsell opportunities based on usage patterns"
    ]
  }
}
```

### Predict Customer Churn

```http
POST /api/v1/customer-success/churn-prediction
```

**Request Body:**
```json
{
  "customerId": "customer-uuid",
  "usageMetrics": {
    "daysActive": 30,
    "loginFrequency": 5,
    "avgSessionDuration": 15,
    "featureAdoptionRate": 0.6,
    "lastLoginDays": 2
  },
  "financialMetrics": {
    "totalRevenue": 12000.00,
    "avgInvoiceValue": 1000.00,
    "paymentReliability": 0.9,
    "outstandingAmount": 500.00
  },
  "engagementMetrics": {
    "emailOpenRate": 0.7,
    "supportTickets": 2,
    "npsScore": 7,
    "lastContactDays": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "churnProbability": 0.23,
    "riskLevel": "low",
    "keyFactors": [
      {
        "factor": "paymentReliability",
        "impact": 0.15,
        "description": "Strong payment history reduces churn risk"
      },
      {
        "factor": "featureAdoption",
        "impact": 0.08,
        "description": "Moderate feature adoption indicates engagement"
      }
    ],
    "recommendations": [
      "Focus on increasing feature adoption",
      "Maintain current engagement levels"
    ]
  }
}
```

## Partner Ecosystem

### Register Partner

```http
POST /api/v1/partners
```

**Request Body:**
```json
{
  "name": "Partner Solutions Inc",
  "type": "channel",
  "primaryContact": {
    "name": "John Partner",
    "email": "john@partner.com",
    "phone": "+1234567890"
  },
  "commissionRate": 0.10,
  "tier": "bronze"
}
```

### Get Partner Performance

```http
GET /api/v1/partners/{partnerId}/performance?startDate=2024-01-01&endDate=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "partnerId": "partner-uuid",
    "period": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    "referralsCount": 45,
    "conversionsCount": 32,
    "conversionRate": 71.1,
    "revenueGenerated": 32000.00,
    "averageDealSize": 1000.00,
    "commissionsEarned": 3200.00,
    "commissionsPaid": 2800.00,
    "commissionsPending": 400.00,
    "averageCustomerLTV": 2500.00,
    "churnRate": 0.08,
    "ranking": {
      "overall": 5,
      "inTier": 2,
      "percentile": 85
    }
  }
}
```

### Record Partner Commission

```http
POST /api/v1/partners/{partnerId}/commissions
```

**Request Body:**
```json
{
  "customerId": "customer-uuid",
  "commissionType": "referral",
  "commissionAmount": 100.00,
  "revenueAmount": 1000.00,
  "commissionRate": 0.10,
  "notes": "Referral commission for new customer signup"
}
```

## Gamification

### Award Points

```http
POST /api/v1/gamification/points
```

**Request Body:**
```json
{
  "userId": "user-uuid",
  "eventType": "invoice_created",
  "points": 10,
  "referenceId": "invoice-uuid",
  "referenceType": "invoice",
  "description": "Created first invoice"
}
```

### Get User Level

```http
GET /api/v1/gamification/level/{userId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "currentLevel": 5,
    "totalPoints": 1250,
    "pointsToNextLevel": 250,
    "currentStreak": 7,
    "longestStreak": 15,
    "lastActivityDate": "2024-01-01"
  }
}
```

### Get User Achievements

```http
GET /api/v1/gamification/achievements/{userId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "achievements": [
      {
        "id": "achievement-uuid",
        "code": "first_invoice",
        "name": "First Invoice",
        "description": "Created your first invoice",
        "category": "invoicing",
        "pointsReward": 10,
        "progress": 100,
        "isUnlocked": true,
        "unlockedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalAchievements": 15,
    "unlockedAchievements": 8
  }
}
```

### Get Leaderboard

```http
GET /api/v1/gamification/leaderboard?limit=10&period=monthly&category=all
```

**Query Parameters:**
- `limit`: Number of top users to return (default: 10, max: 100)
- `period`: Time period (daily, weekly, monthly, all-time)
- `category`: Category filter (invoicing, referrals, engagement, milestones, all)

## Revenue Analytics

### Get Revenue Metrics

```http
GET /api/v1/analytics/revenue/metrics?tenantId={tenantId}&startDate={date}&endDate={date}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    },
    "totalRevenue": 120000.00,
    "mrr": 10000.00,
    "arr": 120000.00,
    "revenueGrowth": 15.5,
    "mrrGrowth": 12.3,
    "newMRR": 2000.00,
    "expansionMRR": 500.00,
    "churnedMRR": -300.00,
    "averageRevenuePerAccount": 1200.00,
    "customersCount": 100,
    "newCustomers": 25,
    "churnedCustomers": 5,
    "cohortRetention": {
      "day1": 95.0,
      "day7": 85.0,
      "day30": 75.0,
      "day90": 65.0
    }
  }
}
```

### Get Revenue Forecast

```http
GET /api/v1/analytics/revenue/forecast?tenantId={tenantId}&months=12
```

**Response:**
```json
{
  "success": true,
  "data": {
    "forecast": [
      {
        "month": "2024-02",
        "predictedRevenue": 10500.00,
        "confidence": 0.85,
        "factors": ["historical_trend", "seasonality"]
      }
    ],
    "confidence": 0.82,
    "modelAccuracy": 87.5,
    "factors": [
      "Historical revenue patterns",
      "Seasonal adjustments",
      "Customer growth projections"
    ]
  }
}
```

### Get Cohort Analysis

```http
GET /api/v1/analytics/revenue/cohorts/{tenantId}
```

### Get Optimization Opportunities

```http
GET /api/v1/analytics/revenue/opportunities/{tenantId}
```

## Webhooks

### Handle Invoice Created Event

```http
POST /api/v1/webhooks/invoice-created
```

**Request Body:**
```json
{
  "invoiceId": "invoice-uuid",
  "customerId": "customer-uuid",
  "amount": 1000.00,
  "tenantId": "tenant-uuid",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### Handle Payment Received Event

```http
POST /api/v1/webhooks/payment-received
```

## Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Invalid input data |
| NOT_FOUND | Resource not found |
| UNAUTHORIZED | Authentication required |
| FORBIDDEN | Insufficient permissions |
| RATE_LIMIT_EXCEEDED | Too many requests |
| INTERNAL_ERROR | Server error |
| SERVICE_UNAVAILABLE | External service unavailable |

## Rate Limits

- **Standard API**: 100 requests per minute
- **Analytics API**: 20 requests per minute
- **Referral API**: 200 requests per minute
- **Upload API**: 5 requests per minute

## SDKs and Libraries

### JavaScript/TypeScript

```bash
npm install @sme-platform/marketing-sdk
```

```javascript
import { MarketingClient } from '@sme-platform/marketing-sdk';

const client = new MarketingClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://marketing.your-domain.com/api/v1'
});

// Create a lead
const lead = await client.leads.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com'
});
```

### Python

```bash
pip install sme-platform-marketing
```

```python
from sme_marketing import MarketingClient

client = MarketingClient(
    api_key='your-api-key',
    base_url='https://marketing.your-domain.com/api/v1'
)

# Create a lead
lead = client.leads.create({
    'firstName': 'John',
    'lastName': 'Doe',
    'email': 'john.doe@example.com'
})
```

## Support

For API support and questions:
- Email: api-support@your-domain.com
- Documentation: https://docs.your-domain.com/marketing-api
- Status Page: https://status.your-domain.com
