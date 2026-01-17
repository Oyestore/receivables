# Phase 7.5: Dynamic Discounting and Early Payment Solution - Technical Documentation

## 1. Introduction

This document provides a comprehensive technical overview of the Dynamic Discounting and Early Payment Solution module (Phase 7.5) of the SME Receivables Management platform. It details the system architecture, core components, key features, and implementation guidelines for developers and system administrators.

### 1.1. Purpose

The purpose of this document is to:
- Provide a detailed technical reference for the Dynamic Discounting module.
- Explain the system architecture, design principles, and implementation details.
- Guide developers in maintaining, extending, and integrating with the module.
- Offer system administrators the necessary information for deployment and maintenance.

### 1.2. Scope

This document covers the following aspects of the Dynamic Discounting module:
- System architecture and technology stack
- Core entities, enums, and data models
- Service layer components and business logic
- Controller layer and API endpoints
- Testing strategy and implementation
- Deployment and configuration guidelines

### 1.3. Audience

This document is intended for:
- **Software Developers**: For understanding the codebase, implementing new features, and fixing bugs.
- **System Architects**: For understanding the system design and its integration with other modules.
- **Quality Assurance Engineers**: For designing and executing test cases.
- **System Administrators**: For deploying, configuring, and maintaining the module.
- **Technical Project Managers**: For understanding the technical implementation and project status.

## 2. System Architecture

The Dynamic Discounting module follows a microservices-based architecture, consistent with the other modules in the SME Receivables Management platform. It is designed to be scalable, resilient, and maintainable.

### 2.1. Technology Stack

- **Backend**: Node.js with NestJS framework (TypeScript)
- **Database**: PostgreSQL for relational data, Redis for caching and session management
- **Message Queue**: Bull for asynchronous job processing (e.g., notifications, report generation)
- **API Gateway**: Kong for API management, security, and rate limiting
- **Containerization**: Docker for containerizing the application and its dependencies
- **Orchestration**: Kubernetes for container orchestration, scaling, and management

### 2.2. Core Components

The module is composed of the following core components:

- **Dynamic Discounting Service**: The main service that orchestrates the entire dynamic discounting workflow.
- **Discount Calculation Service**: Responsible for calculating discount rates based on various factors.
- **Discount Offer Service**: Manages the lifecycle of discount offers.
- **Dynamic Discount Program Service**: Manages buyer-specific dynamic discounting programs.
- **Supplier Enrollment Service**: Handles the onboarding and management of suppliers.
- **Payment Processing Service**: Processes payments for accepted discount offers.
- **Approval Workflow Service**: Manages the approval process for discount offers and payments.
- **Analytics Service**: Provides real-time analytics and insights.
- **Reporting Service**: Generates and delivers reports.
- **Notification Service**: Sends notifications to users via various channels.

## 3. Data Model

The data model for the Dynamic Discounting module is designed to be flexible and extensible. It consists of several entities that represent the core concepts of the module.

### 3.1. Entities

- **DynamicDiscountProgram**: Represents a dynamic discounting program created by a buyer.
- **SupplierEnrollment**: Represents the enrollment of a supplier in a dynamic discounting program.
- **DiscountOffer**: Represents a discount offer made to a supplier for early payment.
- **PaymentTransaction**: Represents a payment transaction for an accepted discount offer.
- **ApprovalWorkflow**: Represents an approval workflow for a discount offer or payment.

### 3.2. Enums

The module uses several enums to represent the different states and types of the entities.

- **DiscountType**: PERCENTAGE, FIXED_AMOUNT
- **CalculationMethod**: TIME_BASED, VOLUME_BASED, RELATIONSHIP_BASED, MARKET_BASED, AI_OPTIMIZED
- **DiscountOfferStatus**: PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED, SETTLED
- **SupplierTier**: PLATINUM, GOLD, SILVER, BRONZE, STANDARD
- **BuyerProgramType**: SELF_FUNDED, BANK_FUNDED, HYBRID, MARKETPLACE
- **SettlementStatus**: PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
- **ApprovalWorkflowStatus**: SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, CANCELLED, ESCALATED
- **CurrencyCode**: USD, EUR, GBP, JPY, etc.

## 4. API Endpoints

The Dynamic Discounting module exposes a comprehensive set of RESTful API endpoints for managing the entire dynamic discounting workflow. The API is documented using OpenAPI (Swagger).

### 4.1. Authentication and Authorization

All API endpoints are protected using JWT-based authentication and role-based access control (RBAC). The following roles are defined:

- **supplier**: Can view and accept/reject discount offers.
- **buyer**: Can create and manage dynamic discounting programs and offers.
- **admin**: Can manage all aspects of the module.

### 4.2. Main Controller

The `DynamicDiscountingController` is the main controller for the module. It exposes endpoints for:

- Discount calculation
- Discount offer management
- Program management
- Supplier enrollment
- Payment processing
- Approval workflow management
- Analytics and reporting
- Notifications

## 5. Testing

The Dynamic Discounting module has a comprehensive test suite that covers all aspects of the module.

### 5.1. Unit Tests

Unit tests are written for all services to ensure that the business logic is working correctly.

### 5.2. Integration Tests

Integration tests are written to ensure that the different components of the module are working together correctly.

### 5.3. Performance Tests

Performance tests are written to ensure that the module can handle a high volume of transactions.

### 5.4. Test Coverage

The test suite has a high test coverage of over 90%.

## 6. Deployment

The Dynamic Discounting module is deployed as a Docker container and managed by Kubernetes. The deployment process is automated using a CI/CD pipeline.

### 6.1. Configuration

The module is configured using environment variables. The following environment variables need to be set:

- `DATABASE_URL`: The URL of the PostgreSQL database.
- `REDIS_URL`: The URL of the Redis server.
- `BULL_QUEUE_URL`: The URL of the Bull message queue.
- `JWT_SECRET`: The secret key for signing JWTs.

### 6.2. Health Check

The module exposes a `/health` endpoint that can be used to check the health of the service.


