import { Injectable } from '@nestjs/common';
import { TemplateManagementService } from './template-management.service';

interface BusinessRuleConfig {
  tenantId: string;
  name: string;
  description?: string;
  category: 'validation' | 'automation' | 'notification' | 'escalation' | 'calculation';
  priority: number;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  schedule?: RuleSchedule;
}

interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface RuleAction {
  type: 'set_field' | 'send_notification' | 'create_task' | 'escalate' | 'calculate' | 'webhook' | 'custom';
  parameters: Record<string, any>;
}

interface RuleSchedule {
  type: 'immediate' | 'delayed' | 'recurring';
  delay?: number; // minutes
  cron?: string; // for recurring rules
}

interface CustomizationProfile {
  tenantId: string;
  name: string;
  description?: string;
  settings: {
    ui: UICustomization;
    workflow: WorkflowCustomization;
    notifications: NotificationCustomization;
    fields: FieldCustomization;
    branding: BrandingCustomization;
  };
}

interface UICustomization {
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  secondaryColor: string;
  layout: 'compact' | 'comfortable' | 'spacious';
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  numberFormat: string;
}

interface WorkflowCustomization {
  defaultApprovalLevels: number;
  autoEscalationEnabled: boolean;
  escalationTimeoutHours: number;
  allowParallelApprovals: boolean;
  requireEvidenceForCompletion: boolean;
  enableDigitalSignatures: boolean;
}

interface NotificationCustomization {
  channels: string[];
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  templates: Record<string, string>;
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
}

interface FieldCustomization {
  customFields: Record<string, any>;
  hiddenFields: string[];
  requiredFields: string[];
  fieldOrder: string[];
  fieldLabels: Record<string, string>;
}

interface BrandingCustomization {
  companyName: string;
  logo?: string;
  favicon?: string;
  headerColor: string;
  footerText: string;
  emailSignature: string;
}

@Injectable()
export class AdvancedCustomizationService {
  constructor(
    private templateManagementService: TemplateManagementService,
  ) {}

  /**
   * Create business rule
   */
  async createBusinessRule(rule: BusinessRuleConfig): Promise<any> {
    // Validate rule configuration
    this.validateBusinessRule(rule);

    // Generate rule ID
    const ruleId = `rule_${Date.now()}`;

    // Store rule (in real implementation, this would be stored in database)
    const storedRule = {
      id: ruleId,
      ...rule,
      createdAt: new Date(),
      lastUpdated: new Date(),
      status: 'active',
    };

    return {
      id: ruleId,
      name: rule.name,
      category: rule.category,
      enabled: rule.enabled,
      createdAt: storedRule.createdAt,
    };
  }

  /**
   * Update business rule
   */
  async updateBusinessRule(ruleId: string, rule: Partial<BusinessRuleConfig>, tenantId: string): Promise<any> {
    // Get existing rule
    const existingRule = await this.getBusinessRule(ruleId, tenantId);
    if (!existingRule) {
      throw new Error('Business rule not found');
    }

    // Validate tenant ownership
    if (existingRule.tenantId !== tenantId) {
      throw new Error('Unauthorized rule access');
    }

    // Merge rule changes
    const updatedRule = {
      ...existingRule,
      ...rule,
      lastUpdated: new Date(),
    };

    // Validate updated rule
    this.validateBusinessRule(updatedRule);

    // In a real implementation, this would update the database
    return {
      id: ruleId,
      name: updatedRule.name,
      category: updatedRule.category,
      enabled: updatedRule.enabled,
      lastUpdated: updatedRule.lastUpdated,
    };
  }

  /**
   * Get business rule by ID
   */
  async getBusinessRule(ruleId: string, tenantId: string): Promise<any> {
    // In a real implementation, this would fetch from database
    return {
      id: ruleId,
      tenantId,
      name: 'Auto-escalate overdue milestones',
      description: 'Automatically escalate milestones that are overdue by more than 7 days',
      category: 'escalation',
      priority: 1,
      enabled: true,
      conditions: [
        {
          field: 'status',
          operator: 'equals',
          value: 'in_progress',
          logicalOperator: 'AND',
        },
        {
          field: 'daysOverdue',
          operator: 'greater_than',
          value: 7,
        },
      ],
      actions: [
        {
          type: 'escalate',
          parameters: {
            level: 'level_1',
            notifyRoles: ['project_manager', 'client'],
            message: 'Milestone is overdue and requires immediate attention',
          },
        },
        {
          type: 'send_notification',
          parameters: {
            channels: ['email', 'sms'],
            template: 'escalation_notification',
          },
        },
      ],
      schedule: {
        type: 'recurring',
        cron: '0 9 * * *', // Daily at 9 AM
      },
      createdAt: new Date(),
      lastUpdated: new Date(),
      status: 'active',
    };
  }

  /**
   * Execute business rules for a milestone
   */
  async executeBusinessRules(milestoneId: string, tenantId: string, context: any = {}): Promise<any> {
    // Get all active business rules for tenant
    const rules = await this.getActiveBusinessRules(tenantId);

    // Get milestone data
    const milestone = await this.getMilestoneData(milestoneId, tenantId);

    // Execute each rule
    const executionResults = [];
    for (const rule of rules) {
      try {
        const shouldExecute = this.evaluateRuleConditions(rule.conditions, milestone, context);
        
        if (shouldExecute) {
          const actionResults = await this.executeRuleActions(rule.actions, milestone, context);
          executionResults.push({
            ruleId: rule.id,
            ruleName: rule.name,
            executed: true,
            actionResults,
            executedAt: new Date(),
          });
        } else {
          executionResults.push({
            ruleId: rule.id,
            ruleName: rule.name,
            executed: false,
            reason: 'Conditions not met',
            executedAt: new Date(),
          });
        }
      } catch (error) {
        executionResults.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executed: false,
          error: error.message,
          executedAt: new Date(),
        });
      }
    }

    return {
      milestoneId,
      tenantId,
      rulesEvaluated: rules.length,
      rulesExecuted: executionResults.filter(r => r.executed).length,
      executionResults,
      executedAt: new Date(),
    };
  }

  /**
   * Create customization profile
   */
  async createCustomizationProfile(profile: CustomizationProfile): Promise<any> {
    // Validate profile
    this.validateCustomizationProfile(profile);

    // Generate profile ID
    const profileId = `profile_${Date.now()}`;

    // Store profile (in real implementation, this would be stored in database)
    const storedProfile = {
      id: profileId,
      ...profile,
      createdAt: new Date(),
      lastUpdated: new Date(),
      status: 'active',
    };

    return {
      id: profileId,
      name: profile.name,
      tenantId: profile.tenantId,
      createdAt: storedProfile.createdAt,
    };
  }

  /**
   * Get customization profile
   */
  async getCustomizationProfile(profileId: string, tenantId: string): Promise<any> {
    // In a real implementation, this would fetch from database
    return {
      id: profileId,
      tenantId,
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
          numberFormat: 'en-IN',
        },
        workflow: {
          defaultApprovalLevels: 2,
          autoEscalationEnabled: true,
          escalationTimeoutHours: 48,
          allowParallelApprovals: true,
          requireEvidenceForCompletion: true,
          enableDigitalSignatures: false,
        },
        notifications: {
          channels: ['email', 'whatsapp', 'sms'],
          frequency: 'immediate',
          templates: {
            milestone_created: 'New milestone "{{title}}" has been created',
            milestone_completed: 'Milestone "{{title}}" has been completed',
            payment_received: 'Payment of ₹{{amount}} received for milestone "{{title}}"',
          },
          quietHours: {
            enabled: true,
            startTime: '22:00',
            endTime: '08:00',
            timezone: 'Asia/Kolkata',
          },
        },
        fields: {
          customFields: {
            gst_number: {
              type: 'text',
              label: 'GST Number',
              required: true,
              validation: 'regex:^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
            },
            pan_number: {
              type: 'text',
              label: 'PAN Number',
              required: true,
              validation: 'regex:^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
            },
            state_code: {
              type: 'select',
              label: 'State',
              options: ['MH', 'DL', 'KA', 'TN', 'GJ', 'UP', 'WB', 'RJ'],
              required: true,
            },
          },
          hiddenFields: ['internal_notes'],
          requiredFields: ['title', 'value', 'dueDate', 'gst_number'],
          fieldOrder: ['title', 'description', 'value', 'dueDate', 'gst_number', 'pan_number', 'state_code'],
          fieldLabels: {
            title: 'Milestone Title',
            description: 'Description',
            value: 'Amount (₹)',
            dueDate: 'Due Date',
          },
        },
        branding: {
          companyName: 'SME Solutions India',
          headerColor: '#2c3e50',
          footerText: '© 2024 SME Solutions India. All rights reserved.',
          emailSignature: 'Best regards,\nSME Solutions India Team\nPhone: +91-XXXXXXXXXX\nEmail: support@smesolutions.in',
        },
      },
      createdAt: new Date(),
      lastUpdated: new Date(),
      status: 'active',
    };
  }

  /**
   * Apply customization profile to tenant
   */
  async applyCustomizationProfile(profileId: string, tenantId: string): Promise<any> {
    // Get customization profile
    const profile = await this.getCustomizationProfile(profileId, tenantId);
    if (!profile) {
      throw new Error('Customization profile not found');
    }

    // Apply UI customizations
    await this.applyUICustomizations(profile.settings.ui, tenantId);

    // Apply workflow customizations
    await this.applyWorkflowCustomizations(profile.settings.workflow, tenantId);

    // Apply notification customizations
    await this.applyNotificationCustomizations(profile.settings.notifications, tenantId);

    // Apply field customizations
    await this.applyFieldCustomizations(profile.settings.fields, tenantId);

    // Apply branding customizations
    await this.applyBrandingCustomizations(profile.settings.branding, tenantId);

    return {
      profileId,
      tenantId,
      appliedAt: new Date(),
      status: 'applied',
    };
  }

  /**
   * Create industry-specific template
   */
  async createIndustryTemplate(
    industry: string,
    templateData: any,
    tenantId: string
  ): Promise<any> {
    // Add industry-specific customizations
    const industryTemplate = this.addIndustryCustomizations(industry, templateData);

    // Create template using template management service
    const template = await this.templateManagementService.createTemplate({
      config: {
        ...industryTemplate.config,
        tenantId,
        industry,
        category: industry.toLowerCase(),
        isPublic: true,
      },
      ...industryTemplate,
    });

    return template;
  }

  /**
   * Get regional customizations for India
   */
  async getRegionalCustomizations(state: string): Promise<any> {
    // In a real implementation, this would fetch state-specific customizations
    const stateCustomizations = {
      'MH': { // Maharashtra
        taxRates: { sgst: 9, cgst: 9, igst: 18 },
        complianceRequirements: ['GST Registration', 'Professional Tax', 'Labour License'],
        holidays: ['Gudi Padwa', 'Maharashtra Day'],
        languages: ['Marathi', 'Hindi', 'English'],
      },
      'KA': { // Karnataka
        taxRates: { sgst: 9, cgst: 9, igst: 18 },
        complianceRequirements: ['GST Registration', 'Professional Tax', 'Shops and Establishment License'],
        holidays: ['Kannada Rajyotsava', 'Ugadi'],
        languages: ['Kannada', 'Hindi', 'English'],
      },
      'TN': { // Tamil Nadu
        taxRates: { sgst: 9, cgst: 9, igst: 18 },
        complianceRequirements: ['GST Registration', 'Professional Tax', 'Trade License'],
        holidays: ['Tamil New Year', 'Pongal'],
        languages: ['Tamil', 'Hindi', 'English'],
      },
    };

    return stateCustomizations[state] || {
      taxRates: { sgst: 9, cgst: 9, igst: 18 },
      complianceRequirements: ['GST Registration'],
      holidays: [],
      languages: ['Hindi', 'English'],
    };
  }

  /**
   * Validate business rule configuration
   */
  private validateBusinessRule(rule: BusinessRuleConfig): void {
    if (!rule.name || !rule.category || !rule.conditions || !rule.actions) {
      throw new Error('Business rule configuration is incomplete');
    }

    if (!['validation', 'automation', 'notification', 'escalation', 'calculation'].includes(rule.category)) {
      throw new Error('Invalid business rule category');
    }

    if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
      throw new Error('Business rule must have at least one condition');
    }

    if (!Array.isArray(rule.actions) || rule.actions.length === 0) {
      throw new Error('Business rule must have at least one action');
    }

    // Validate conditions
    for (const condition of rule.conditions) {
      if (!condition.field || !condition.operator) {
        throw new Error('Each condition must have field and operator');
      }
    }

    // Validate actions
    for (const action of rule.actions) {
      if (!action.type || !action.parameters) {
        throw new Error('Each action must have type and parameters');
      }
    }
  }

  /**
   * Get active business rules for tenant
   */
  private async getActiveBusinessRules(tenantId: string): Promise<any[]> {
    // In a real implementation, this would fetch from database
    return [
      await this.getBusinessRule('rule_1', tenantId),
    ].filter(rule => rule.enabled);
  }

  /**
   * Get milestone data for rule evaluation
   */
  private async getMilestoneData(milestoneId: string, tenantId: string): Promise<any> {
    // In a real implementation, this would fetch milestone data
    return {
      id: milestoneId,
      tenantId,
      title: 'Sample Milestone',
      status: 'in_progress',
      value: 50000,
      dueDate: new Date('2024-06-01'),
      daysOverdue: 10,
      ownerId: 'owner_1',
      projectId: 'project_1',
    };
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateRuleConditions(conditions: RuleCondition[], milestone: any, context: any): boolean {
    let result = true;
    let currentLogicalOperator = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, milestone, context);
      
      if (currentLogicalOperator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentLogicalOperator = condition.logicalOperator || 'AND';
    }

    return result;
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: RuleCondition, milestone: any, context: any): boolean {
    const fieldValue = this.getFieldValue(condition.field, milestone, context);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return fieldValue > condition.value;
      case 'less_than':
        return fieldValue < condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'starts_with':
        return String(fieldValue).startsWith(String(condition.value));
      case 'ends_with':
        return String(fieldValue).endsWith(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return false;
    }
  }

  /**
   * Get field value from milestone or context
   */
  private getFieldValue(field: string, milestone: any, context: any): any {
    // Handle nested field access (e.g., 'owner.name')
    const fieldParts = field.split('.');
    let value = milestone;

    for (const part of fieldParts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    // Check context if not found in milestone
    if (value === undefined && context[field] !== undefined) {
      value = context[field];
    }

    // Handle calculated fields
    if (field === 'daysOverdue') {
      const dueDate = new Date(milestone.dueDate);
      const today = new Date();
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    }

    return value;
  }

  /**
   * Execute rule actions
   */
  private async executeRuleActions(actions: RuleAction[], milestone: any, context: any): Promise<any[]> {
    const results = [];

    for (const action of actions) {
      try {
        const result = await this.executeRuleAction(action, milestone, context);
        results.push({
          actionType: action.type,
          success: true,
          result,
        });
      } catch (error) {
        results.push({
          actionType: action.type,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Execute single rule action
   */
  private async executeRuleAction(action: RuleAction, milestone: any, context: any): Promise<any> {
    switch (action.type) {
      case 'set_field':
        return this.executeSetFieldAction(action.parameters, milestone);
      case 'send_notification':
        return this.executeSendNotificationAction(action.parameters, milestone);
      case 'create_task':
        return this.executeCreateTaskAction(action.parameters, milestone);
      case 'escalate':
        return this.executeEscalateAction(action.parameters, milestone);
      case 'calculate':
        return this.executeCalculateAction(action.parameters, milestone);
      case 'webhook':
        return this.executeWebhookAction(action.parameters, milestone);
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  /**
   * Execute set field action
   */
  private async executeSetFieldAction(parameters: any, milestone: any): Promise<any> {
    // In a real implementation, this would update the milestone field
    return {
      field: parameters.field,
      oldValue: milestone[parameters.field],
      newValue: parameters.value,
      updatedAt: new Date(),
    };
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotificationAction(parameters: any, milestone: any): Promise<any> {
    // In a real implementation, this would send actual notifications
    return {
      channels: parameters.channels,
      template: parameters.template,
      recipients: parameters.recipients || ['milestone_owner'],
      sentAt: new Date(),
    };
  }

  /**
   * Execute create task action
   */
  private async executeCreateTaskAction(parameters: any, milestone: any): Promise<any> {
    // In a real implementation, this would create a task
    return {
      taskId: `task_${Date.now()}`,
      title: parameters.title,
      assignee: parameters.assignee,
      dueDate: parameters.dueDate,
      createdAt: new Date(),
    };
  }

  /**
   * Execute escalate action
   */
  private async executeEscalateAction(parameters: any, milestone: any): Promise<any> {
    // In a real implementation, this would create an escalation
    return {
      escalationId: `escalation_${Date.now()}`,
      level: parameters.level,
      notifyRoles: parameters.notifyRoles,
      message: parameters.message,
      createdAt: new Date(),
    };
  }

  /**
   * Execute calculate action
   */
  private async executeCalculateAction(parameters: any, milestone: any): Promise<any> {
    // In a real implementation, this would perform calculations
    return {
      formula: parameters.formula,
      result: 0, // Calculated result
      calculatedAt: new Date(),
    };
  }

  /**
   * Execute webhook action
   */
  private async executeWebhookAction(parameters: any, milestone: any): Promise<any> {
    // In a real implementation, this would call a webhook
    return {
      url: parameters.url,
      method: parameters.method || 'POST',
      status: 200,
      calledAt: new Date(),
    };
  }

  /**
   * Validate customization profile
   */
  private validateCustomizationProfile(profile: CustomizationProfile): void {
    if (!profile.tenantId || !profile.name || !profile.settings) {
      throw new Error('Customization profile configuration is incomplete');
    }

    // Validate UI settings
    if (profile.settings.ui) {
      const ui = profile.settings.ui;
      if (ui.theme && !['light', 'dark', 'auto'].includes(ui.theme)) {
        throw new Error('Invalid UI theme');
      }
      if (ui.timeFormat && !['12h', '24h'].includes(ui.timeFormat)) {
        throw new Error('Invalid time format');
      }
    }
  }

  /**
   * Apply UI customizations
   */
  private async applyUICustomizations(ui: UICustomization, tenantId: string): Promise<void> {
    // In a real implementation, this would update tenant UI settings
  }

  /**
   * Apply workflow customizations
   */
  private async applyWorkflowCustomizations(workflow: WorkflowCustomization, tenantId: string): Promise<void> {
    // In a real implementation, this would update tenant workflow settings
  }

  /**
   * Apply notification customizations
   */
  private async applyNotificationCustomizations(notifications: NotificationCustomization, tenantId: string): Promise<void> {
    // In a real implementation, this would update tenant notification settings
  }

  /**
   * Apply field customizations
   */
  private async applyFieldCustomizations(fields: FieldCustomization, tenantId: string): Promise<void> {
    // In a real implementation, this would update tenant field settings
  }

  /**
   * Apply branding customizations
   */
  private async applyBrandingCustomizations(branding: BrandingCustomization, tenantId: string): Promise<void> {
    // In a real implementation, this would update tenant branding settings
  }

  /**
   * Add industry-specific customizations
   */
  private addIndustryCustomizations(industry: string, templateData: any): any {
    const industryCustomizations = {
      construction: {
        customFields: {
          permit_number: { type: 'text', required: true },
          contractor_license: { type: 'text', required: true },
          safety_compliance: { type: 'boolean', required: true },
        },
        verificationRequirements: ['site_inspection', 'safety_certificate'],
        escalationRules: [
          { condition: 'safety_compliance = false', action: 'immediate_escalation' },
        ],
      },
      manufacturing: {
        customFields: {
          quality_certificate: { type: 'text', required: true },
          batch_number: { type: 'text', required: true },
          production_line: { type: 'select', options: ['Line A', 'Line B', 'Line C'] },
        },
        verificationRequirements: ['quality_check', 'batch_testing'],
        escalationRules: [
          { condition: 'quality_certificate missing', action: 'quality_team_escalation' },
        ],
      },
      it_services: {
        customFields: {
          sprint_number: { type: 'number', required: true },
          story_points: { type: 'number', required: true },
          code_review_status: { type: 'select', options: ['pending', 'approved', 'rejected'] },
        },
        verificationRequirements: ['code_review', 'testing_complete'],
        escalationRules: [
          { condition: 'code_review_status = rejected', action: 'tech_lead_escalation' },
        ],
      },
    };

    const customizations = industryCustomizations[industry.toLowerCase()] || {};
    
    return {
      ...templateData,
      customFields: {
        ...templateData.customFields,
        ...customizations.customFields,
      },
      verificationRules: [
        ...templateData.verificationRules || [],
        ...(customizations.verificationRequirements || []).map(req => ({
          evidenceRequired: [req],
          approvalLevels: 1,
        })),
      ],
      escalationRules: [
        ...templateData.escalationRules || [],
        ...customizations.escalationRules || [],
      ],
    };
  }
}
