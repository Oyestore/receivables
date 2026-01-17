# Invoice Factoring Specification
## Module 07: Financing & Factoring

**Version:** 1.0
**Date:** January 12, 2026
**Status:** Reverse Engineered from Implementation

---

## 1. Overview
Invoice Factoring allows Suppliers to sell their outstanding invoices to third-party financial institutions (Factors) at a discount to receive immediate cash. This module integrates with external lending partners like **LendingKart** and **Capital Float**.

## 2. Supported Partners
### 2.1 LendingKart
- **Integration Type**: API-based.
- **Key Features**:
    - Eligibility Check
    - Loan Application
    - Status Tracking
    - Webhook updates

### 2.2 Capital Float
- **Integration Type**: API-based.
- **Key Features**:
    - Credit Limit Check
    - Drawdown Request
    - Repayment Schedule

## 3. Architecture
The system uses a **Partner Adapter Pattern** via `PartnerIntegrationService` to unify different provider APIs into a common interface.

### 3.1 Core Components
- **PartnerIntegrationService**: The orchestrator that routes requests to the specific provider adapter.
- **Adapter Interface**: Common methods (`checkEligibility`, `applyForFinancing`, `checkStatus`).

## 4. API Endpoints
- `POST /api/v1/financing/apply`: Submit financing application.
- `GET /api/v1/financing/eligibility`: Check if an invoice is eligible.
- `GET /api/v1/financing/providers`: List available partners.

## 5. Data Model
- **Partner Entity**: Stores API credentials and configuration for each provider.
- **FinancingApplication**: (Implicit) Stores the state of a loan request.

## 6. Success Metrics
- ** Approval Time**: Average time from application to approval.
- ** Disbursal Rate**: % of applications that result in funding.
