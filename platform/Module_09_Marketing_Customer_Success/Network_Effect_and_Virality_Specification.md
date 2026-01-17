# Network Effect & Virality Specification
## Module 09: Marketing & Customer Success

**Version:** 1.0
**Date:** November 23, 2025
**Status:** Draft

---

## 1. Executive Summary
To achieve exponential growth, the platform must transition from a "Single-Player" tool to a "Multi-Player" network. This specification details the "LinkedIn for Invoices" strategy, enabling viral loops where every invoice sent is a potential invitation for the buyer to join the platform, creating a connected ecosystem of buyers and suppliers.

## 2. Strategic Objectives
1.  **Viral Growth**: Convert invoice recipients (Buyers) into platform users.
2.  **Community Trust**: Establish a "Community Credit Score" based on real payment behavior.
3.  **Frictionless Connection**: Auto-connect parties upon invoice exchange.

## 3. Architecture & Technology Stack

### 3.1 Technology Choices
*   **Graph Database**: Evaluate **Neo4j** or use **PostgreSQL Recursive Queries** (for simpler graph structures) to model Buyer-Supplier relationships.
*   **Identity Management**: Unified Identity (Module 12) allowing users to be both "Buyer" and "Supplier" with a single login.
*   **Viral Engine**: Node.js/NestJS service for tracking invites, referrals, and network density.

### 3.2 Network Architecture Diagram
```mermaid
graph LR
    Supplier[Supplier (User A)] -->|Sends Invoice| Buyer[Buyer (Non-User)]
    Buyer -->|Clicks 'View Invoice'| Portal[Guest Portal]
    Portal -->|'Track this Invoice'| Signup[Sign Up / Login]
    Signup -->|Joins| Network[Platform Network]
    Network -->|Connects| Supplier
    
    subgraph "Network Value"
        Network -->|Shared Data| CreditScore[Community Credit Score]
        Network -->|Auto-Reconcile| Ledger[Shared Ledger]
    end
```

## 4. Key Features & Specifications

### 4.1 The "Guest Portal" (Viral Hook)
*   **Current**: Static PDF or simple view link.
*   **New**: Interactive "Guest Portal" where the Buyer can:
    *   See the invoice status.
    *   **"Claim this Invoice"**: Sign up to track payables and get reminders.
    *   **"Dispute/Chat"**: Communicate directly with the supplier (requires login).

### 4.2 Shared Ledger (Double-Entry Network)
*   **Concept**: When User A invoices User B (both on platform), the invoice appears in A's "Receivables" AND B's "Payables" automatically.
*   **Mechanism**:
    *   Invoice creation triggers a lookup of Buyer's GSTIN/Email.
    *   If Buyer exists, create a "Payable" record linked to the Invoice.
    *   Status updates (Paid/Viewed) sync in real-time for both parties.

### 4.3 Community Credit Score ("Rate this Payer")
*   **Concept**: A reputation score derived from actual payment speed, not just bureau data.
*   **Metric**: "Average Days to Pay" (ADP) displayed on the Buyer's profile.
*   **Incentive**: Buyers pay faster to improve their public score and get better credit terms (Module 07).

## 5. Implementation Tasks

### Phase 1: The Hook (Week 1-3)
- [ ] **Guest Portal Upgrade**: Enhance the public invoice view with "Track this Invoice" CTA.
- [ ] **Viral Loop Tracking**: Implement analytics to track conversion from Invoice View -> Sign Up.
- [ ] **Quick Onboarding**: Simplified signup flow for Buyers (pre-fill data from invoice).

### Phase 2: The Connection (Week 4-6)
- [ ] **Entity Resolution**: Implement logic to match Buyers to existing Users via GSTIN/Email.
- [ ] **Shared Ledger Sync**: Create event handlers (Module 10) to sync Invoice status to Buyer's Payable view.
- [ ] **Connection Request**: "Connect with [Supplier]" feature upon invoice payment.

### Phase 3: The Score (Week 7-9)
- [ ] **ADP Calculation**: Implement algorithm to calculate Average Days to Pay for every entity.
- [ ] **Profile Badges**: "Fast Payer", "Top 10% Reliability" badges for profiles.
- [ ] **Network Directory**: Searchable directory of verified reliable businesses.

## 6. Success Metrics
*   **Viral Coefficient (K-factor)**: >0.5 (Every 2 users bring 1 new user).
*   **Network Density**: % of invoices sent to existing platform users.
*   **Buyer Conversion**: % of non-user buyers who sign up after viewing an invoice.
