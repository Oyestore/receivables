# Phase 5.4: Integration and Customization - Implementation Guide

## Overview

Phase 5.4 introduces comprehensive integration and customization capabilities to the Milestone-Based Payment Workflow Module, enabling seamless connectivity with external systems and extensive customization options for Indian SMEs.

## Table of Contents

1. [Module Integration](#module-integration)
2. [External System Integration](#external-system-integration)
3. [Advanced Customization](#advanced-customization)
4. [Template Library](#template-library)
5. [Configuration Guide](#configuration-guide)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

## Module Integration

### Overview
The Module Integration Service provides seamless connectivity between the Milestone-Based Payment Workflow Module and other platform modules.

### Supported Modules
- **Invoice Generation Module**: Automatic invoice creation from completed milestones
- **Invoice Distribution Module**: Multi-channel invoice distribution
- **Payment Integration Module**: Payment processing and reconciliation
- **Analytics and Reporting Module**: Data synchronization for analytics

### Configuration

```typescript
// Configure module integration
const integrationConfig = {
  tenantId: 'your-tenant-id',
  moduleType: 'invoice_generation',
  enabled: true,
  configuration: {
    autoGenerateInvoice: true,
    templateId: 'default-template',
    includeEvidence: true
  },
  webhookUrl: 'https://your-webhook-endpoint.com',
  apiCredentials: {
    apiKey: 'your-api-key',
    endpoint: 'https://api.invoicing.com'
  }
};

await moduleIntegrationService.configureModuleIntegration(integrationConfig);
```

### Invoice Generation Integration

```typescript
// Generate invoice from milestone
const invoiceRequest = {
  milestoneId: 'milestone-123',
  tenantId: 'tenant-456',
  templateId: 'construction-template',
  includeEvidence: true,
  paymentTerms: {
    dueDate: new Date('2025-07-08'),
    paymentMethod: ['bank_transfer', 'upi'],
    lateFeePercent: 2,
    discountPercent: 2,
    discountDays: 10
  }
};

const result = await moduleIntegrationService.generateMilestoneInvoice(invoiceRequest);
```

## External System Integration

### Overview
The External System Integration Service enables connectivity with various external systems including ERP, CRM, project management tools, and accounting software.

### Supported System Types
- **ERP Systems**: SAP, Oracle, Microsoft Dynamics
- **CRM Systems**: Salesforce, Zoho CRM, HubSpot
- **Project Management**: Jira, Microsoft Project, Asana
- **Accounting Software**: Tally, QuickBooks, Zoho Books
- **Communication Platforms**: Email, WhatsApp, SMS

### System Configuration

```typescript
// Configure external system
const systemConfig = {
  tenantId: 'your-tenant-id',
  systemType: 'erp',
  systemName: 'SAP Business One',
  connectionDetails: {
    baseUrl: 'https://sap-server.company.com:50000',
    authType: 'basic',
    credentials: {
      username: 'sap-user',
      password: 'sap-password'
    },
    headers: {
      'Content-Type': 'application/json'
    }
  },
  syncSettings: {
    direction: 'bidirectional',
    frequency: 'daily',
    entities: ['milestones', 'payments', 'customers'],
    fieldMappings: {
      'milestone.title': 'project.milestone_name',
      'milestone.value': 'project.milestone_amount'
    }
  },
  webhookConfig: {
    enabled: true,
    endpoint: 'https://webhook.company.com/sap-events',
    events: ['milestone.completed', 'payment.received'],
    secret: 'webhook-secret-key'
  }
};

await externalSystemService.configureExternalSystem(systemConfig);
```

### ERP Integration Example

```typescript
// Integrate with ERP system
const erpOptions = {
  modules: ['finance', 'project_management'],
  syncEntities: ['milestones', 'payments', 'customers']
};

const result = await externalSystemService.integrateWithERP(
  'tenant-id',
  'system-id',
  erpOptions
);
```

### Data Synchronization

```typescript
// Synchronize data with external system
const syncRequest = {
  tenantId: 'tenant-id',
  systemId: 'system-id',
  direction: 'bidirectional',
  entities: ['milestones', 'payments'],
  filters: {
    dateRange: {
      start: '2025-01-01',
      end: '2025-12-31'
    }
  },
  options: {
    batchSize: 100,
    dryRun: false
  }
};

const syncResult = await externalSystemService.syncWithExternalSystem(syncRequest);
```

## Advanced Customization

### Overview
The Advanced Customization Service provides comprehensive customization capabilities including business rules, customization profiles, and regional settings.

### Business Rules

Business rules allow you to automate actions based on specific conditions.

```typescript
// Create business rule
const businessRule = {
  tenantId: 'tenant-id',
  name: 'Auto-escalate overdue milestones',
  description: 'Automatically escalate milestones overdue by more than 7 days',
  category: 'escalation',
  priority: 1,
  enabled: true,
  conditions: [
    {
      field: 'status',
      operator: 'equals',
      value: 'in_progress',
      logicalOperator: 'AND'
    },
    {
      field: 'daysOverdue',
      operator: 'greater_than',
      value: 7
    }
  ],
  actions: [
    {
      type: 'escalate',
      parameters: {
        level: 'level_1',
        notifyRoles: ['project_manager', 'client'],
        message: 'Milestone is overdue and requires immediate attention'
      }
    },
    {
      type: 'send_notification',
      parameters: {
        channels: ['email', 'sms'],
        template: 'escalation_notification'
      }
    }
  ],
  schedule: {
    type: 'recurring',
    cron: '0 9 * * *' // Daily at 9 AM
  }
};

await customizationService.createBusinessRule(businessRule);
```

### Customization Profiles

Customization profiles allow you to define tenant-specific settings for UI, workflow, notifications, and branding.

```typescript
// Create customization profile
const customizationProfile = {
  tenantId: 'tenant-id',
  name: 'Indian SME Standard Profile',
  description: 'Standard customization profile for Indian SMEs',
  settings: {
    ui: {
      theme: 'light',
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      layout: 'comfortable',
      language: 'en-IN',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      currency: 'INR',
      numberFormat: 'en-IN'
    },
    workflow: {
      defaultApprovalLevels: 2,
      autoEscalationEnabled: true,
      escalationTimeoutHours: 48,
      allowParallelApprovals: true,
      requireEvidenceForCompletion: true,
      enableDigitalSignatures: false
    },
    notifications: {
      channels: ['email', 'whatsapp', 'sms'],
      frequency: 'immediate',
      templates: {
        milestone_created: 'New milestone "{{title}}" has been created',
        milestone_completed: 'Milestone "{{title}}" has been completed',
        payment_received: 'Payment of ₹{{amount}} received for milestone "{{title}}"'
      },
      quietHours: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'Asia/Kolkata'
      }
    },
    fields: {
      customFields: {
        gst_number: {
          type: 'text',
          label: 'GST Number',
          required: true,
          validation: 'regex:^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        },
        pan_number: {
          type: 'text',
          label: 'PAN Number',
          required: true,
          validation: 'regex:^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
        },
        state_code: {
          type: 'select',
          label: 'State',
          options: ['MH', 'DL', 'KA', 'TN', 'GJ', 'UP', 'WB', 'RJ'],
          required: true
        }
      },
      hiddenFields: ['internal_notes'],
      requiredFields: ['title', 'value', 'dueDate', 'gst_number'],
      fieldOrder: ['title', 'description', 'value', 'dueDate', 'gst_number', 'pan_number', 'state_code'],
      fieldLabels: {
        title: 'Milestone Title',
        description: 'Description',
        value: 'Amount (₹)',
        dueDate: 'Due Date'
      }
    },
    branding: {
      companyName: 'SME Solutions India',
      headerColor: '#2c3e50',
      footerText: '© 2024 SME Solutions India. All rights reserved.',
      emailSignature: 'Best regards,\nSME Solutions India Team\nPhone: +91-XXXXXXXXXX\nEmail: support@smesolutions.in'
    }
  }
};

await customizationService.createCustomizationProfile(customizationProfile);
```

### Regional Customizations

Get region-specific customizations for Indian states:

```typescript
// Get regional customizations for Maharashtra
const regionalSettings = await customizationService.getRegionalCustomizations('MH');

// Result includes:
// - Tax rates (SGST, CGST, IGST)
// - Compliance requirements
// - State holidays
// - Supported languages
```

## Template Library

### Overview
The Template Library provides a comprehensive collection of industry-specific, regional, and customizable milestone templates.

### Available Template Categories
- **Construction**: Residential, Commercial, Infrastructure
- **Manufacturing**: Product Development, Production Setup
- **IT Services**: Software Development, System Implementation
- **Healthcare**: Service Implementation, Equipment Setup
- **Education**: Course Development, Training Programs
- **Retail**: Store Setup, Inventory Management
- **Financial Services**: Product Launch, Compliance Setup
- **Logistics**: Network Setup, Fleet Management
- **Agriculture**: Crop Development, Farm Setup
- **Textiles**: Production, Quality Control

### Using Templates

```typescript
// Search for templates
const searchCriteria = {
  tenantId: 'tenant-id',
  category: 'construction',
  industry: 'construction',
  region: 'india',
  tags: ['residential', 'building']
};

const templates = await templateService.searchTemplates(searchCriteria);

// Apply template to create milestones
const applicationOptions = {
  projectId: 'project-123',
  startDate: new Date('2025-06-15'),
  customValues: {
    construction_type: 'independent_house',
    total_area: 2500,
    building_permit: 'BP2025001234',
    contractor_license: 'CL2025005678'
  }
};

const result = await templateService.applyTemplate(
  'template-id',
  'tenant-id',
  applicationOptions
);
```

### Creating Custom Templates

```typescript
// Create custom template
const customTemplate = {
  config: {
    tenantId: 'tenant-id',
    name: 'Custom Construction Template',
    description: 'Customized template for specific construction needs',
    category: 'construction',
    industry: 'construction',
    region: 'india',
    isPublic: false,
    version: '1.0.0',
    tags: ['construction', 'custom', 'residential']
  },
  milestones: [
    {
      title: 'Site Preparation',
      description: 'Site clearing and preparation',
      value: 100000,
      dueDate: 'relative:+30d',
      type: 'preparation',
      priority: 'high',
      evidenceRequired: ['site_photos', 'preparation_report']
    }
    // ... more milestones
  ],
  workflows: [
    {
      name: 'Approval Workflow',
      description: 'Standard approval workflow',
      steps: [
        {
          name: 'Submission',
          type: 'start',
          nextSteps: ['Review']
        },
        {
          name: 'Review',
          type: 'approval',
          approvers: ['role:project_manager'],
          nextSteps: ['Completion']
        },
        {
          name: 'Completion',
          type: 'end',
          nextSteps: []
        }
      ]
    }
  ],
  customFields: {
    project_type: {
      type: 'select',
      options: ['residential', 'commercial'],
      required: true
    }
  }
};

const template = await templateService.createTemplate(customTemplate);
```

## Configuration Guide

### Initial Setup

1. **Configure Module Integrations**
   ```bash
   # Set up invoice generation integration
   POST /api/module-integration/configure
   ```

2. **Configure External Systems**
   ```bash
   # Set up ERP integration
   POST /api/external-systems/configure
   ```

3. **Create Customization Profile**
   ```bash
   # Create tenant-specific customization
   POST /api/customization/profiles
   ```

4. **Initialize Template Library**
   ```bash
   # Initialize with industry templates
   POST /api/templates/initialize-library
   ```

### Environment Variables

```bash
# Module Integration
MODULE_INTEGRATION_ENABLED=true
INVOICE_GENERATION_API_URL=https://api.invoicing.com
PAYMENT_INTEGRATION_API_URL=https://api.payments.com

# External Systems
ERP_INTEGRATION_ENABLED=true
CRM_INTEGRATION_ENABLED=true
MAX_SYNC_BATCH_SIZE=1000

# Customization
CUSTOMIZATION_ENABLED=true
REGIONAL_CUSTOMIZATION_ENABLED=true
BUSINESS_RULES_ENABLED=true

# Template Library
TEMPLATE_LIBRARY_ENABLED=true
TEMPLATE_CACHE_TTL=3600
```

## API Reference

### Module Integration API

#### Configure Module Integration
```http
POST /api/module-integration/configure
Content-Type: application/json

{
  "tenantId": "string",
  "moduleType": "invoice_generation|invoice_distribution|payment_integration|analytics_reporting",
  "enabled": boolean,
  "configuration": {},
  "webhookUrl": "string",
  "apiCredentials": {}
}
```

#### Generate Milestone Invoice
```http
POST /api/module-integration/generate-invoice
Content-Type: application/json

{
  "milestoneId": "string",
  "tenantId": "string",
  "templateId": "string",
  "includeEvidence": boolean,
  "paymentTerms": {}
}
```

### External System Integration API

#### Configure External System
```http
POST /api/external-systems/configure
Content-Type: application/json

{
  "tenantId": "string",
  "systemType": "erp|crm|project_management|accounting|communication|custom",
  "systemName": "string",
  "connectionDetails": {},
  "syncSettings": {},
  "webhookConfig": {}
}
```

#### Synchronize Data
```http
POST /api/external-systems/sync
Content-Type: application/json

{
  "tenantId": "string",
  "systemId": "string",
  "direction": "import|export|bidirectional",
  "entities": ["string"],
  "filters": {},
  "options": {}
}
```

### Advanced Customization API

#### Create Business Rule
```http
POST /api/customization/business-rules
Content-Type: application/json

{
  "tenantId": "string",
  "name": "string",
  "description": "string",
  "category": "validation|automation|notification|escalation|calculation",
  "priority": number,
  "enabled": boolean,
  "conditions": [],
  "actions": [],
  "schedule": {}
}
```

#### Create Customization Profile
```http
POST /api/customization/profiles
Content-Type: application/json

{
  "tenantId": "string",
  "name": "string",
  "description": "string",
  "settings": {
    "ui": {},
    "workflow": {},
    "notifications": {},
    "fields": {},
    "branding": {}
  }
}
```

### Template Library API

#### Search Templates
```http
GET /api/templates/search?category=construction&industry=construction&region=india
```

#### Apply Template
```http
POST /api/templates/{templateId}/apply
Content-Type: application/json

{
  "tenantId": "string",
  "projectId": "string",
  "startDate": "string",
  "customValues": {}
}
```

## Troubleshooting

### Common Issues

#### Module Integration Issues

**Issue**: Invoice generation fails with timeout error
**Solution**: 
1. Check invoice generation module availability
2. Verify API credentials and endpoints
3. Increase timeout settings if needed

**Issue**: Payment integration returns authentication error
**Solution**:
1. Verify API credentials are correct
2. Check if credentials have expired
3. Ensure proper permissions are granted

#### External System Integration Issues

**Issue**: ERP sync fails with connection timeout
**Solution**:
1. Check network connectivity to ERP system
2. Verify ERP system is accessible
3. Increase connection timeout settings
4. Implement retry mechanism

**Issue**: Data sync results in duplicate records
**Solution**:
1. Check field mappings configuration
2. Ensure unique identifiers are properly mapped
3. Implement deduplication logic

#### Customization Issues

**Issue**: Business rule not executing
**Solution**:
1. Verify rule conditions are correctly defined
2. Check if rule is enabled
3. Ensure milestone data matches conditions
4. Review rule execution logs

**Issue**: Custom fields not appearing
**Solution**:
1. Verify customization profile is applied
2. Check field configuration syntax
3. Ensure user has proper permissions
4. Clear cache and refresh

#### Template Issues

**Issue**: Template application creates incorrect milestones
**Solution**:
1. Verify template configuration
2. Check custom values mapping
3. Ensure date calculations are correct
4. Review template version compatibility

### Performance Optimization

1. **Enable Caching**
   - Template data caching
   - Customization profile caching
   - External system connection pooling

2. **Optimize Batch Sizes**
   - Reduce batch size for large datasets
   - Implement progressive loading
   - Use pagination for API calls

3. **Monitor Resource Usage**
   - Database connection pools
   - Memory usage during sync operations
   - API rate limiting compliance

### Support and Maintenance

For additional support:
- Check system logs for detailed error messages
- Review API documentation for latest updates
- Contact technical support with specific error codes
- Monitor system health dashboards

---

**Document Version**: 1.0  
**Last Updated**: June 8, 2025  
**Next Review**: July 8, 2025
