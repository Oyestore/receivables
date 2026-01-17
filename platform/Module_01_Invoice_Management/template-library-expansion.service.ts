import { Injectable } from '@nestjs/common';
import { TemplateManagementService } from './template-management.service';
import { AdvancedCustomizationService } from './advanced-customization.service';

interface TemplateLibraryConfig {
  categories: string[];
  industries: string[];
  regions: string[];
  complexityLevels: string[];
  projectSizes: string[];
}

interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  industry: string;
  region: string;
  complexity: string;
  projectSize: string;
  tags: string[];
  usageCount: number;
  rating: number;
  lastUpdated: Date;
}

@Injectable()
export class TemplateLibraryExpansionService {
  constructor(
    private templateManagementService: TemplateManagementService,
    private advancedCustomizationService: AdvancedCustomizationService,
  ) {}

  /**
   * Initialize comprehensive template library
   */
  async initializeTemplateLibrary(): Promise<any> {
    const libraryConfig: TemplateLibraryConfig = {
      categories: [
        'construction', 'manufacturing', 'it_services', 'healthcare', 
        'education', 'retail', 'finance', 'logistics', 'consulting', 'agriculture'
      ],
      industries: [
        'construction', 'manufacturing', 'technology', 'healthcare', 
        'education', 'retail', 'financial_services', 'logistics', 
        'professional_services', 'agriculture', 'textiles', 'automotive'
      ],
      regions: ['india', 'maharashtra', 'karnataka', 'tamil_nadu', 'gujarat', 'delhi', 'west_bengal'],
      complexityLevels: ['simple', 'moderate', 'complex', 'enterprise'],
      projectSizes: ['small', 'medium', 'large', 'enterprise'],
    };

    // Create industry-specific templates
    const industryTemplates = await this.createIndustryTemplates(libraryConfig);
    
    // Create regional templates
    const regionalTemplates = await this.createRegionalTemplates(libraryConfig);
    
    // Create complexity-based templates
    const complexityTemplates = await this.createComplexityTemplates(libraryConfig);
    
    // Create size-based templates
    const sizeTemplates = await this.createSizeBasedTemplates(libraryConfig);

    return {
      libraryConfig,
      templatesCreated: {
        industry: industryTemplates.length,
        regional: regionalTemplates.length,
        complexity: complexityTemplates.length,
        size: sizeTemplates.length,
        total: industryTemplates.length + regionalTemplates.length + complexityTemplates.length + sizeTemplates.length,
      },
      initializedAt: new Date(),
    };
  }

  /**
   * Create industry-specific templates
   */
  private async createIndustryTemplates(config: TemplateLibraryConfig): Promise<any[]> {
    const templates = [];

    // Construction Industry Templates
    templates.push(await this.createConstructionTemplates());
    
    // Manufacturing Industry Templates
    templates.push(await this.createManufacturingTemplates());
    
    // IT Services Templates
    templates.push(await this.createITServicesTemplates());
    
    // Healthcare Templates
    templates.push(await this.createHealthcareTemplates());
    
    // Education Templates
    templates.push(await this.createEducationTemplates());
    
    // Retail Templates
    templates.push(await this.createRetailTemplates());
    
    // Financial Services Templates
    templates.push(await this.createFinancialServicesTemplates());
    
    // Logistics Templates
    templates.push(await this.createLogisticsTemplates());
    
    // Agriculture Templates
    templates.push(await this.createAgricultureTemplates());
    
    // Textiles Templates
    templates.push(await this.createTextilesTemplates());

    return templates.flat();
  }

  /**
   * Create construction industry templates
   */
  private async createConstructionTemplates(): Promise<any[]> {
    const templates = [];

    // Residential Construction Template
    templates.push({
      config: {
        name: 'Residential Construction Project',
        description: 'Standard template for residential construction projects in India',
        category: 'construction',
        industry: 'construction',
        region: 'india',
        complexity: 'moderate',
        projectSize: 'medium',
        isPublic: true,
        version: '1.0.0',
        tags: ['construction', 'residential', 'building', 'india'],
      },
      milestones: [
        {
          title: 'Site Preparation & Foundation',
          description: 'Site clearing, excavation, and foundation work',
          value: 150000,
          dueDate: 'relative:+45d',
          type: 'construction',
          priority: 'high',
          evidenceRequired: ['site_photos', 'foundation_inspection_report'],
        },
        {
          title: 'Structural Framework',
          description: 'Construction of structural framework and walls',
          value: 300000,
          dueDate: 'relative:+90d',
          type: 'construction',
          priority: 'high',
          evidenceRequired: ['structural_photos', 'engineer_certificate'],
        },
        {
          title: 'Roofing & Weather Protection',
          description: 'Roof construction and weather protection',
          value: 200000,
          dueDate: 'relative:+120d',
          type: 'construction',
          priority: 'high',
          evidenceRequired: ['roofing_photos', 'waterproofing_certificate'],
        },
        {
          title: 'Electrical & Plumbing',
          description: 'Installation of electrical and plumbing systems',
          value: 180000,
          dueDate: 'relative:+150d',
          type: 'construction',
          priority: 'medium',
          evidenceRequired: ['electrical_certificate', 'plumbing_test_report'],
        },
        {
          title: 'Interior Finishing',
          description: 'Interior finishing work including flooring, painting, and fixtures',
          value: 250000,
          dueDate: 'relative:+180d',
          type: 'construction',
          priority: 'medium',
          evidenceRequired: ['interior_photos', 'quality_checklist'],
        },
        {
          title: 'Final Inspection & Handover',
          description: 'Final inspection and project handover',
          value: 100000,
          dueDate: 'relative:+200d',
          type: 'completion',
          priority: 'high',
          evidenceRequired: ['completion_certificate', 'handover_document'],
        },
      ],
      customFields: {
        construction_type: {
          type: 'select',
          options: ['independent_house', 'apartment', 'villa'],
          required: true,
        },
        total_area: {
          type: 'number',
          label: 'Total Area (sq ft)',
          required: true,
        },
        building_permit: {
          type: 'text',
          label: 'Building Permit Number',
          required: true,
        },
        contractor_license: {
          type: 'text',
          label: 'Contractor License Number',
          required: true,
        },
      },
    });

    // Commercial Construction Template
    templates.push({
      config: {
        name: 'Commercial Construction Project',
        description: 'Template for commercial construction projects',
        category: 'construction',
        industry: 'construction',
        region: 'india',
        complexity: 'complex',
        projectSize: 'large',
        isPublic: true,
        version: '1.0.0',
        tags: ['construction', 'commercial', 'building', 'india'],
      },
      milestones: [
        {
          title: 'Project Planning & Approvals',
          description: 'Project planning, design approval, and regulatory clearances',
          value: 200000,
          dueDate: 'relative:+30d',
          type: 'planning',
          priority: 'high',
          evidenceRequired: ['approved_plans', 'clearance_certificates'],
        },
        {
          title: 'Site Development',
          description: 'Site preparation, excavation, and foundation work',
          value: 500000,
          dueDate: 'relative:+75d',
          type: 'construction',
          priority: 'high',
          evidenceRequired: ['site_survey', 'foundation_completion_report'],
        },
        {
          title: 'Structural Construction',
          description: 'Main structural construction work',
          value: 1200000,
          dueDate: 'relative:+150d',
          type: 'construction',
          priority: 'high',
          evidenceRequired: ['structural_completion_photos', 'engineer_sign_off'],
        },
        {
          title: 'MEP Installation',
          description: 'Mechanical, Electrical, and Plumbing installation',
          value: 800000,
          dueDate: 'relative:+200d',
          type: 'construction',
          priority: 'high',
          evidenceRequired: ['mep_testing_reports', 'safety_certificates'],
        },
        {
          title: 'Interior & Finishing',
          description: 'Interior work and finishing touches',
          value: 600000,
          dueDate: 'relative:+250d',
          type: 'construction',
          priority: 'medium',
          evidenceRequired: ['interior_completion_photos', 'quality_audit'],
        },
        {
          title: 'Final Commissioning',
          description: 'Final testing, commissioning, and handover',
          value: 300000,
          dueDate: 'relative:+280d',
          type: 'completion',
          priority: 'high',
          evidenceRequired: ['commissioning_report', 'occupancy_certificate'],
        },
      ],
      customFields: {
        building_type: {
          type: 'select',
          options: ['office', 'retail', 'warehouse', 'mixed_use'],
          required: true,
        },
        total_floors: {
          type: 'number',
          label: 'Total Floors',
          required: true,
        },
        built_up_area: {
          type: 'number',
          label: 'Built-up Area (sq ft)',
          required: true,
        },
        fire_safety_clearance: {
          type: 'text',
          label: 'Fire Safety Clearance Number',
          required: true,
        },
      },
    });

    return templates;
  }

  /**
   * Create manufacturing industry templates
   */
  private async createManufacturingTemplates(): Promise<any[]> {
    const templates = [];

    // Product Development Template
    templates.push({
      config: {
        name: 'Manufacturing Product Development',
        description: 'Template for new product development in manufacturing',
        category: 'manufacturing',
        industry: 'manufacturing',
        region: 'india',
        complexity: 'complex',
        projectSize: 'medium',
        isPublic: true,
        version: '1.0.0',
        tags: ['manufacturing', 'product_development', 'quality', 'india'],
      },
      milestones: [
        {
          title: 'Concept Design & Feasibility',
          description: 'Initial concept design and feasibility study',
          value: 100000,
          dueDate: 'relative:+30d',
          type: 'design',
          priority: 'high',
          evidenceRequired: ['concept_document', 'feasibility_report'],
        },
        {
          title: 'Prototype Development',
          description: 'Development and testing of prototype',
          value: 200000,
          dueDate: 'relative:+60d',
          type: 'development',
          priority: 'high',
          evidenceRequired: ['prototype_photos', 'test_results'],
        },
        {
          title: 'Quality Testing & Certification',
          description: 'Quality testing and regulatory certification',
          value: 150000,
          dueDate: 'relative:+90d',
          type: 'testing',
          priority: 'high',
          evidenceRequired: ['quality_certificates', 'test_reports'],
        },
        {
          title: 'Production Setup',
          description: 'Production line setup and calibration',
          value: 300000,
          dueDate: 'relative:+120d',
          type: 'setup',
          priority: 'high',
          evidenceRequired: ['production_line_photos', 'calibration_reports'],
        },
        {
          title: 'Pilot Production Run',
          description: 'Pilot production run and quality validation',
          value: 250000,
          dueDate: 'relative:+150d',
          type: 'production',
          priority: 'medium',
          evidenceRequired: ['pilot_run_report', 'quality_validation'],
        },
        {
          title: 'Full Production Launch',
          description: 'Full-scale production launch',
          value: 200000,
          dueDate: 'relative:+180d',
          type: 'launch',
          priority: 'high',
          evidenceRequired: ['production_launch_report', 'quality_metrics'],
        },
      ],
      customFields: {
        product_category: {
          type: 'select',
          options: ['automotive', 'electronics', 'textiles', 'food', 'chemicals'],
          required: true,
        },
        production_capacity: {
          type: 'number',
          label: 'Production Capacity (units/month)',
          required: true,
        },
        quality_standard: {
          type: 'select',
          options: ['ISO_9001', 'ISO_14001', 'BIS', 'CE', 'FDA'],
          required: true,
        },
      },
    });

    return templates;
  }

  /**
   * Create IT services templates
   */
  private async createITServicesTemplates(): Promise<any[]> {
    const templates = [];

    // Software Development Template
    templates.push({
      config: {
        name: 'Software Development Project',
        description: 'Agile software development project template',
        category: 'it_services',
        industry: 'technology',
        region: 'india',
        complexity: 'moderate',
        projectSize: 'medium',
        isPublic: true,
        version: '1.0.0',
        tags: ['software', 'development', 'agile', 'technology'],
      },
      milestones: [
        {
          title: 'Requirements Analysis & Design',
          description: 'Requirements gathering and system design',
          value: 150000,
          dueDate: 'relative:+21d',
          type: 'analysis',
          priority: 'high',
          evidenceRequired: ['requirements_document', 'system_design'],
        },
        {
          title: 'Sprint 1 - Core Features',
          description: 'Development of core application features',
          value: 200000,
          dueDate: 'relative:+42d',
          type: 'development',
          priority: 'high',
          evidenceRequired: ['code_review', 'unit_tests', 'demo'],
        },
        {
          title: 'Sprint 2 - Advanced Features',
          description: 'Development of advanced features and integrations',
          value: 250000,
          dueDate: 'relative:+63d',
          type: 'development',
          priority: 'high',
          evidenceRequired: ['code_review', 'integration_tests', 'demo'],
        },
        {
          title: 'Quality Assurance & Testing',
          description: 'Comprehensive testing and bug fixes',
          value: 100000,
          dueDate: 'relative:+77d',
          type: 'testing',
          priority: 'high',
          evidenceRequired: ['test_reports', 'bug_fix_log'],
        },
        {
          title: 'User Acceptance Testing',
          description: 'User acceptance testing and feedback incorporation',
          value: 75000,
          dueDate: 'relative:+84d',
          type: 'testing',
          priority: 'medium',
          evidenceRequired: ['uat_report', 'user_feedback'],
        },
        {
          title: 'Deployment & Go-Live',
          description: 'Production deployment and go-live support',
          value: 125000,
          dueDate: 'relative:+91d',
          type: 'deployment',
          priority: 'high',
          evidenceRequired: ['deployment_report', 'go_live_checklist'],
        },
      ],
      customFields: {
        technology_stack: {
          type: 'select',
          options: ['java_spring', 'nodejs_express', 'python_django', 'dotnet', 'php_laravel'],
          required: true,
        },
        deployment_type: {
          type: 'select',
          options: ['cloud', 'on_premise', 'hybrid'],
          required: true,
        },
        team_size: {
          type: 'number',
          label: 'Development Team Size',
          required: true,
        },
      },
    });

    return templates;
  }

  /**
   * Create healthcare templates
   */
  private async createHealthcareTemplates(): Promise<any[]> {
    const templates = [];

    // Healthcare Service Implementation Template
    templates.push({
      config: {
        name: 'Healthcare Service Implementation',
        description: 'Template for implementing healthcare services',
        category: 'healthcare',
        industry: 'healthcare',
        region: 'india',
        complexity: 'complex',
        projectSize: 'medium',
        isPublic: true,
        version: '1.0.0',
        tags: ['healthcare', 'service', 'medical', 'compliance'],
      },
      milestones: [
        {
          title: 'Regulatory Compliance Setup',
          description: 'Setup regulatory compliance and licensing',
          value: 100000,
          dueDate: 'relative:+30d',
          type: 'compliance',
          priority: 'high',
          evidenceRequired: ['license_documents', 'compliance_certificates'],
        },
        {
          title: 'Staff Training & Certification',
          description: 'Training and certification of medical staff',
          value: 150000,
          dueDate: 'relative:+60d',
          type: 'training',
          priority: 'high',
          evidenceRequired: ['training_certificates', 'competency_assessments'],
        },
        {
          title: 'Equipment Setup & Calibration',
          description: 'Medical equipment setup and calibration',
          value: 300000,
          dueDate: 'relative:+75d',
          type: 'setup',
          priority: 'high',
          evidenceRequired: ['equipment_certificates', 'calibration_reports'],
        },
        {
          title: 'Quality Management System',
          description: 'Implementation of quality management system',
          value: 80000,
          dueDate: 'relative:+90d',
          type: 'quality',
          priority: 'medium',
          evidenceRequired: ['qms_documentation', 'audit_reports'],
        },
        {
          title: 'Pilot Service Launch',
          description: 'Pilot launch of healthcare services',
          value: 120000,
          dueDate: 'relative:+105d',
          type: 'launch',
          priority: 'high',
          evidenceRequired: ['pilot_reports', 'patient_feedback'],
        },
        {
          title: 'Full Service Rollout',
          description: 'Full rollout of healthcare services',
          value: 150000,
          dueDate: 'relative:+120d',
          type: 'rollout',
          priority: 'high',
          evidenceRequired: ['rollout_report', 'service_metrics'],
        },
      ],
      customFields: {
        service_type: {
          type: 'select',
          options: ['diagnostic', 'treatment', 'preventive', 'emergency'],
          required: true,
        },
        accreditation_body: {
          type: 'select',
          options: ['NABH', 'JCI', 'ISO_15189', 'NABL'],
          required: true,
        },
        patient_capacity: {
          type: 'number',
          label: 'Daily Patient Capacity',
          required: true,
        },
      },
    });

    return templates;
  }

  /**
   * Create education templates
   */
  private async createEducationTemplates(): Promise<any[]> {
    const templates = [];

    // Course Development Template
    templates.push({
      config: {
        name: 'Educational Course Development',
        description: 'Template for developing educational courses',
        category: 'education',
        industry: 'education',
        region: 'india',
        complexity: 'moderate',
        projectSize: 'small',
        isPublic: true,
        version: '1.0.0',
        tags: ['education', 'course', 'curriculum', 'learning'],
      },
      milestones: [
        {
          title: 'Curriculum Design',
          description: 'Design course curriculum and learning objectives',
          value: 50000,
          dueDate: 'relative:+21d',
          type: 'design',
          priority: 'high',
          evidenceRequired: ['curriculum_document', 'learning_objectives'],
        },
        {
          title: 'Content Development',
          description: 'Develop course content and materials',
          value: 100000,
          dueDate: 'relative:+45d',
          type: 'development',
          priority: 'high',
          evidenceRequired: ['course_materials', 'content_review'],
        },
        {
          title: 'Assessment Design',
          description: 'Design assessments and evaluation methods',
          value: 40000,
          dueDate: 'relative:+60d',
          type: 'assessment',
          priority: 'medium',
          evidenceRequired: ['assessment_framework', 'evaluation_rubrics'],
        },
        {
          title: 'Pilot Testing',
          description: 'Pilot test the course with sample students',
          value: 60000,
          dueDate: 'relative:+75d',
          type: 'testing',
          priority: 'high',
          evidenceRequired: ['pilot_feedback', 'performance_metrics'],
        },
        {
          title: 'Course Launch',
          description: 'Official launch of the course',
          value: 50000,
          dueDate: 'relative:+90d',
          type: 'launch',
          priority: 'high',
          evidenceRequired: ['launch_report', 'enrollment_metrics'],
        },
      ],
      customFields: {
        course_level: {
          type: 'select',
          options: ['beginner', 'intermediate', 'advanced', 'professional'],
          required: true,
        },
        delivery_mode: {
          type: 'select',
          options: ['online', 'offline', 'hybrid'],
          required: true,
        },
        duration_hours: {
          type: 'number',
          label: 'Course Duration (hours)',
          required: true,
        },
      },
    });

    return templates;
  }

  /**
   * Create retail templates
   */
  private async createRetailTemplates(): Promise<any[]> {
    const templates = [];

    // Retail Store Setup Template
    templates.push({
      config: {
        name: 'Retail Store Setup',
        description: 'Template for setting up retail stores',
        category: 'retail',
        industry: 'retail',
        region: 'india',
        complexity: 'moderate',
        projectSize: 'medium',
        isPublic: true,
        version: '1.0.0',
        tags: ['retail', 'store', 'setup', 'inventory'],
      },
      milestones: [
        {
          title: 'Location Setup & Licensing',
          description: 'Store location setup and licensing',
          value: 200000,
          dueDate: 'relative:+30d',
          type: 'setup',
          priority: 'high',
          evidenceRequired: ['lease_agreement', 'trade_license'],
        },
        {
          title: 'Interior Design & Fixtures',
          description: 'Store interior design and fixture installation',
          value: 300000,
          dueDate: 'relative:+60d',
          type: 'design',
          priority: 'high',
          evidenceRequired: ['interior_photos', 'fixture_installation'],
        },
        {
          title: 'Inventory Management System',
          description: 'Setup inventory management and POS system',
          value: 150000,
          dueDate: 'relative:+75d',
          type: 'technology',
          priority: 'high',
          evidenceRequired: ['system_setup', 'integration_testing'],
        },
        {
          title: 'Staff Recruitment & Training',
          description: 'Recruit and train store staff',
          value: 100000,
          dueDate: 'relative:+90d',
          type: 'training',
          priority: 'medium',
          evidenceRequired: ['staff_certificates', 'training_records'],
        },
        {
          title: 'Inventory Stocking',
          description: 'Initial inventory stocking and arrangement',
          value: 500000,
          dueDate: 'relative:+105d',
          type: 'inventory',
          priority: 'high',
          evidenceRequired: ['inventory_report', 'stock_photos'],
        },
        {
          title: 'Store Launch',
          description: 'Grand opening and store launch',
          value: 80000,
          dueDate: 'relative:+120d',
          type: 'launch',
          priority: 'high',
          evidenceRequired: ['launch_photos', 'sales_report'],
        },
      ],
      customFields: {
        store_type: {
          type: 'select',
          options: ['grocery', 'fashion', 'electronics', 'pharmacy', 'general'],
          required: true,
        },
        store_size: {
          type: 'number',
          label: 'Store Size (sq ft)',
          required: true,
        },
        expected_footfall: {
          type: 'number',
          label: 'Expected Daily Footfall',
          required: true,
        },
      },
    });

    return templates;
  }

  /**
   * Create financial services templates
   */
  private async createFinancialServicesTemplates(): Promise<any[]> {
    const templates = [];

    // Financial Product Launch Template
    templates.push({
      config: {
        name: 'Financial Product Launch',
        description: 'Template for launching financial products',
        category: 'finance',
        industry: 'financial_services',
        region: 'india',
        complexity: 'complex',
        projectSize: 'large',
        isPublic: true,
        version: '1.0.0',
        tags: ['finance', 'product', 'compliance', 'launch'],
      },
      milestones: [
        {
          title: 'Regulatory Approval',
          description: 'Obtain regulatory approvals from RBI/SEBI',
          value: 200000,
          dueDate: 'relative:+60d',
          type: 'compliance',
          priority: 'high',
          evidenceRequired: ['regulatory_approvals', 'compliance_documents'],
        },
        {
          title: 'Product Development',
          description: 'Develop financial product features and terms',
          value: 300000,
          dueDate: 'relative:+90d',
          type: 'development',
          priority: 'high',
          evidenceRequired: ['product_specification', 'risk_assessment'],
        },
        {
          title: 'Technology Integration',
          description: 'Integrate product with existing systems',
          value: 400000,
          dueDate: 'relative:+120d',
          type: 'technology',
          priority: 'high',
          evidenceRequired: ['integration_testing', 'security_audit'],
        },
        {
          title: 'Staff Training',
          description: 'Train staff on new product features',
          value: 100000,
          dueDate: 'relative:+135d',
          type: 'training',
          priority: 'medium',
          evidenceRequired: ['training_completion', 'competency_tests'],
        },
        {
          title: 'Pilot Launch',
          description: 'Pilot launch with select customers',
          value: 150000,
          dueDate: 'relative:+150d',
          type: 'pilot',
          priority: 'high',
          evidenceRequired: ['pilot_results', 'customer_feedback'],
        },
        {
          title: 'Full Market Launch',
          description: 'Full market launch of the product',
          value: 250000,
          dueDate: 'relative:+180d',
          type: 'launch',
          priority: 'high',
          evidenceRequired: ['launch_report', 'market_metrics'],
        },
      ],
      customFields: {
        product_type: {
          type: 'select',
          options: ['loan', 'investment', 'insurance', 'deposit', 'payment'],
          required: true,
        },
        regulatory_body: {
          type: 'select',
          options: ['RBI', 'SEBI', 'IRDAI', 'PFRDA'],
          required: true,
        },
        target_segment: {
          type: 'select',
          options: ['retail', 'corporate', 'sme', 'government'],
          required: true,
        },
      },
    });

    return templates;
  }

  /**
   * Create logistics templates
   */
  private async createLogisticsTemplates(): Promise<any[]> {
    const templates = [];

    // Logistics Network Setup Template
    templates.push({
      config: {
        name: 'Logistics Network Setup',
        description: 'Template for setting up logistics and distribution network',
        category: 'logistics',
        industry: 'logistics',
        region: 'india',
        complexity: 'complex',
        projectSize: 'large',
        isPublic: true,
        version: '1.0.0',
        tags: ['logistics', 'distribution', 'network', 'transportation'],
      },
      milestones: [
        {
          title: 'Network Planning',
          description: 'Plan logistics network and route optimization',
          value: 150000,
          dueDate: 'relative:+30d',
          type: 'planning',
          priority: 'high',
          evidenceRequired: ['network_plan', 'route_analysis'],
        },
        {
          title: 'Warehouse Setup',
          description: 'Setup warehouses and distribution centers',
          value: 500000,
          dueDate: 'relative:+90d',
          type: 'infrastructure',
          priority: 'high',
          evidenceRequired: ['warehouse_photos', 'capacity_reports'],
        },
        {
          title: 'Technology Implementation',
          description: 'Implement logistics management system',
          value: 300000,
          dueDate: 'relative:+120d',
          type: 'technology',
          priority: 'high',
          evidenceRequired: ['system_demo', 'integration_testing'],
        },
        {
          title: 'Fleet Management',
          description: 'Setup fleet management and tracking',
          value: 400000,
          dueDate: 'relative:+150d',
          type: 'fleet',
          priority: 'high',
          evidenceRequired: ['fleet_registration', 'tracking_system'],
        },
        {
          title: 'Operations Launch',
          description: 'Launch logistics operations',
          value: 200000,
          dueDate: 'relative:+180d',
          type: 'launch',
          priority: 'high',
          evidenceRequired: ['operations_report', 'performance_metrics'],
        },
      ],
      customFields: {
        service_type: {
          type: 'select',
          options: ['freight', 'courier', 'warehousing', 'distribution'],
          required: true,
        },
        coverage_area: {
          type: 'select',
          options: ['local', 'regional', 'national', 'international'],
          required: true,
        },
        fleet_size: {
          type: 'number',
          label: 'Fleet Size',
          required: true,
        },
      },
    });

    return templates;
  }

  /**
   * Create agriculture templates
   */
  private async createAgricultureTemplates(): Promise<any[]> {
    const templates = [];

    // Agricultural Project Template
    templates.push({
      config: {
        name: 'Agricultural Development Project',
        description: 'Template for agricultural development projects',
        category: 'agriculture',
        industry: 'agriculture',
        region: 'india',
        complexity: 'moderate',
        projectSize: 'medium',
        isPublic: true,
        version: '1.0.0',
        tags: ['agriculture', 'farming', 'crop', 'development'],
      },
      milestones: [
        {
          title: 'Land Preparation',
          description: 'Soil testing and land preparation',
          value: 80000,
          dueDate: 'relative:+30d',
          type: 'preparation',
          priority: 'high',
          evidenceRequired: ['soil_test_report', 'land_preparation_photos'],
        },
        {
          title: 'Seed Procurement & Sowing',
          description: 'Procure quality seeds and complete sowing',
          value: 120000,
          dueDate: 'relative:+45d',
          type: 'sowing',
          priority: 'high',
          evidenceRequired: ['seed_certificates', 'sowing_completion_report'],
        },
        {
          title: 'Crop Management',
          description: 'Irrigation, fertilization, and pest management',
          value: 200000,
          dueDate: 'relative:+120d',
          type: 'management',
          priority: 'high',
          evidenceRequired: ['crop_health_reports', 'management_logs'],
        },
        {
          title: 'Harvesting',
          description: 'Crop harvesting and initial processing',
          value: 150000,
          dueDate: 'relative:+150d',
          type: 'harvesting',
          priority: 'high',
          evidenceRequired: ['harvest_photos', 'yield_reports'],
        },
        {
          title: 'Marketing & Sales',
          description: 'Market the produce and complete sales',
          value: 100000,
          dueDate: 'relative:+180d',
          type: 'marketing',
          priority: 'medium',
          evidenceRequired: ['sales_receipts', 'market_analysis'],
        },
      ],
      customFields: {
        crop_type: {
          type: 'select',
          options: ['rice', 'wheat', 'cotton', 'sugarcane', 'vegetables', 'fruits'],
          required: true,
        },
        land_area: {
          type: 'number',
          label: 'Land Area (acres)',
          required: true,
        },
        irrigation_type: {
          type: 'select',
          options: ['drip', 'sprinkler', 'flood', 'rainfed'],
          required: true,
        },
      },
    });

    return templates;
  }

  /**
   * Create textiles templates
   */
  private async createTextilesTemplates(): Promise<any[]> {
    const templates = [];

    // Textile Production Template
    templates.push({
      config: {
        name: 'Textile Production Project',
        description: 'Template for textile production projects',
        category: 'manufacturing',
        industry: 'textiles',
        region: 'india',
        complexity: 'moderate',
        projectSize: 'medium',
        isPublic: true,
        version: '1.0.0',
        tags: ['textiles', 'production', 'manufacturing', 'quality'],
      },
      milestones: [
        {
          title: 'Raw Material Procurement',
          description: 'Procure quality raw materials',
          value: 300000,
          dueDate: 'relative:+21d',
          type: 'procurement',
          priority: 'high',
          evidenceRequired: ['material_certificates', 'quality_reports'],
        },
        {
          title: 'Production Planning',
          description: 'Plan production schedule and resource allocation',
          value: 50000,
          dueDate: 'relative:+30d',
          type: 'planning',
          priority: 'high',
          evidenceRequired: ['production_plan', 'resource_allocation'],
        },
        {
          title: 'Manufacturing Process',
          description: 'Execute manufacturing process',
          value: 400000,
          dueDate: 'relative:+75d',
          type: 'manufacturing',
          priority: 'high',
          evidenceRequired: ['production_logs', 'quality_checks'],
        },
        {
          title: 'Quality Control',
          description: 'Quality testing and control',
          value: 100000,
          dueDate: 'relative:+90d',
          type: 'quality',
          priority: 'high',
          evidenceRequired: ['quality_certificates', 'test_reports'],
        },
        {
          title: 'Finishing & Packaging',
          description: 'Finishing processes and packaging',
          value: 150000,
          dueDate: 'relative:+105d',
          type: 'finishing',
          priority: 'medium',
          evidenceRequired: ['finished_product_photos', 'packaging_reports'],
        },
        {
          title: 'Delivery & Distribution',
          description: 'Product delivery and distribution',
          value: 80000,
          dueDate: 'relative:+120d',
          type: 'delivery',
          priority: 'high',
          evidenceRequired: ['delivery_receipts', 'distribution_reports'],
        },
      ],
      customFields: {
        textile_type: {
          type: 'select',
          options: ['cotton', 'silk', 'wool', 'synthetic', 'blended'],
          required: true,
        },
        production_capacity: {
          type: 'number',
          label: 'Production Capacity (meters/day)',
          required: true,
        },
        quality_standard: {
          type: 'select',
          options: ['BIS', 'ISO_9001', 'OEKO_TEX', 'GOTS'],
          required: true,
        },
      },
    });

    return templates;
  }

  /**
   * Create regional templates
   */
  private async createRegionalTemplates(config: TemplateLibraryConfig): Promise<any[]> {
    const templates = [];

    // Maharashtra specific template
    templates.push({
      config: {
        name: 'Maharashtra SME Project Template',
        description: 'Template customized for Maharashtra state regulations',
        category: 'general',
        industry: 'general',
        region: 'maharashtra',
        complexity: 'moderate',
        projectSize: 'medium',
        isPublic: true,
        version: '1.0.0',
        tags: ['maharashtra', 'sme', 'compliance', 'regional'],
      },
      customFields: {
        maharashtra_registration: {
          type: 'text',
          label: 'Maharashtra Registration Number',
          required: true,
        },
        professional_tax: {
          type: 'text',
          label: 'Professional Tax Registration',
          required: true,
        },
        labour_license: {
          type: 'text',
          label: 'Labour License Number',
          required: false,
        },
      },
      complianceRequirements: [
        'GST Registration',
        'Professional Tax Registration',
        'Labour License (if applicable)',
        'Maharashtra Shops and Establishment Act compliance',
      ],
    });

    // Karnataka specific template
    templates.push({
      config: {
        name: 'Karnataka SME Project Template',
        description: 'Template customized for Karnataka state regulations',
        category: 'general',
        industry: 'general',
        region: 'karnataka',
        complexity: 'moderate',
        projectSize: 'medium',
        isPublic: true,
        version: '1.0.0',
        tags: ['karnataka', 'sme', 'compliance', 'regional'],
      },
      customFields: {
        karnataka_registration: {
          type: 'text',
          label: 'Karnataka Registration Number',
          required: true,
        },
        kssidc_registration: {
          type: 'text',
          label: 'KSSIDC Registration',
          required: false,
        },
      },
      complianceRequirements: [
        'GST Registration',
        'Karnataka Shops and Commercial Establishments Act compliance',
        'KSSIDC Registration (for industrial units)',
      ],
    });

    return templates;
  }

  /**
   * Create complexity-based templates
   */
  private async createComplexityTemplates(config: TemplateLibraryConfig): Promise<any[]> {
    const templates = [];

    // Simple project template
    templates.push({
      config: {
        name: 'Simple Project Template',
        description: 'Basic template for simple projects',
        category: 'general',
        industry: 'general',
        region: 'india',
        complexity: 'simple',
        projectSize: 'small',
        isPublic: true,
        version: '1.0.0',
        tags: ['simple', 'basic', 'starter'],
      },
      milestones: [
        {
          title: 'Project Initiation',
          description: 'Project start and initial setup',
          value: 25000,
          dueDate: 'relative:+7d',
          type: 'initiation',
          priority: 'high',
        },
        {
          title: 'Execution',
          description: 'Main project execution',
          value: 50000,
          dueDate: 'relative:+21d',
          type: 'execution',
          priority: 'high',
        },
        {
          title: 'Completion',
          description: 'Project completion and handover',
          value: 25000,
          dueDate: 'relative:+30d',
          type: 'completion',
          priority: 'high',
        },
      ],
    });

    // Enterprise project template
    templates.push({
      config: {
        name: 'Enterprise Project Template',
        description: 'Comprehensive template for enterprise projects',
        category: 'general',
        industry: 'general',
        region: 'india',
        complexity: 'enterprise',
        projectSize: 'enterprise',
        isPublic: true,
        version: '1.0.0',
        tags: ['enterprise', 'complex', 'comprehensive'],
      },
      milestones: [
        {
          title: 'Project Charter & Approval',
          description: 'Project charter creation and stakeholder approval',
          value: 100000,
          dueDate: 'relative:+14d',
          type: 'initiation',
          priority: 'high',
        },
        {
          title: 'Detailed Planning',
          description: 'Comprehensive project planning and resource allocation',
          value: 150000,
          dueDate: 'relative:+30d',
          type: 'planning',
          priority: 'high',
        },
        {
          title: 'Phase 1 Execution',
          description: 'First phase of project execution',
          value: 300000,
          dueDate: 'relative:+90d',
          type: 'execution',
          priority: 'high',
        },
        {
          title: 'Phase 1 Review & Approval',
          description: 'Review and approval of first phase',
          value: 50000,
          dueDate: 'relative:+105d',
          type: 'review',
          priority: 'high',
        },
        {
          title: 'Phase 2 Execution',
          description: 'Second phase of project execution',
          value: 400000,
          dueDate: 'relative:+180d',
          type: 'execution',
          priority: 'high',
        },
        {
          title: 'Final Testing & Validation',
          description: 'Comprehensive testing and validation',
          value: 200000,
          dueDate: 'relative:+210d',
          type: 'testing',
          priority: 'high',
        },
        {
          title: 'Project Closure',
          description: 'Project closure and knowledge transfer',
          value: 100000,
          dueDate: 'relative:+240d',
          type: 'closure',
          priority: 'high',
        },
      ],
    });

    return templates;
  }

  /**
   * Create size-based templates
   */
  private async createSizeBasedTemplates(config: TemplateLibraryConfig): Promise<any[]> {
    const templates = [];

    // Small project template
    templates.push({
      config: {
        name: 'Small Project Template',
        description: 'Template optimized for small projects',
        category: 'general',
        industry: 'general',
        region: 'india',
        complexity: 'simple',
        projectSize: 'small',
        isPublic: true,
        version: '1.0.0',
        tags: ['small', 'quick', 'efficient'],
      },
      milestones: [
        {
          title: 'Quick Start',
          description: 'Rapid project initiation',
          value: 15000,
          dueDate: 'relative:+3d',
          type: 'initiation',
          priority: 'high',
        },
        {
          title: 'Core Delivery',
          description: 'Main deliverable completion',
          value: 35000,
          dueDate: 'relative:+14d',
          type: 'delivery',
          priority: 'high',
        },
        {
          title: 'Final Handover',
          description: 'Project completion and handover',
          value: 10000,
          dueDate: 'relative:+21d',
          type: 'completion',
          priority: 'high',
        },
      ],
    });

    return templates;
  }

  /**
   * Get template recommendations based on criteria
   */
  async getTemplateRecommendations(criteria: {
    industry?: string;
    region?: string;
    complexity?: string;
    projectSize?: string;
    budget?: number;
  }): Promise<TemplateMetadata[]> {
    // In a real implementation, this would use ML algorithms for recommendations
    const recommendations: TemplateMetadata[] = [
      {
        id: 'template_construction_1',
        name: 'Residential Construction Project',
        description: 'Standard template for residential construction projects in India',
        category: 'construction',
        industry: 'construction',
        region: 'india',
        complexity: 'moderate',
        projectSize: 'medium',
        tags: ['construction', 'residential', 'building'],
        usageCount: 156,
        rating: 4.7,
        lastUpdated: new Date(),
      },
      {
        id: 'template_it_1',
        name: 'Software Development Project',
        description: 'Agile software development project template',
        category: 'it_services',
        industry: 'technology',
        region: 'india',
        complexity: 'moderate',
        projectSize: 'medium',
        tags: ['software', 'development', 'agile'],
        usageCount: 243,
        rating: 4.8,
        lastUpdated: new Date(),
      },
    ];

    // Filter based on criteria
    return recommendations.filter(template => {
      if (criteria.industry && template.industry !== criteria.industry) return false;
      if (criteria.region && template.region !== criteria.region) return false;
      if (criteria.complexity && template.complexity !== criteria.complexity) return false;
      if (criteria.projectSize && template.projectSize !== criteria.projectSize) return false;
      return true;
    });
  }

  /**
   * Get template usage analytics
   */
  async getTemplateAnalytics(): Promise<any> {
    return {
      totalTemplates: 45,
      totalUsage: 1250,
      topCategories: [
        { category: 'construction', usage: 320 },
        { category: 'it_services', usage: 280 },
        { category: 'manufacturing', usage: 210 },
        { category: 'healthcare', usage: 180 },
        { category: 'retail', usage: 160 },
      ],
      topIndustries: [
        { industry: 'construction', usage: 320 },
        { industry: 'technology', usage: 280 },
        { industry: 'manufacturing', usage: 210 },
        { industry: 'healthcare', usage: 180 },
        { industry: 'retail', usage: 160 },
      ],
      regionalDistribution: [
        { region: 'india', usage: 800 },
        { region: 'maharashtra', usage: 200 },
        { region: 'karnataka', usage: 150 },
        { region: 'tamil_nadu', usage: 100 },
      ],
      averageRating: 4.6,
      lastUpdated: new Date(),
    };
  }
}
