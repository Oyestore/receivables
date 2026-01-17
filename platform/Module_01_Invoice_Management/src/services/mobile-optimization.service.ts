import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../invoice.entity';
import { InvoiceLineItem } from '../invoice-line-item.entity';
import { MetricsService } from './metrics.service';

export interface MobileOptimizationConfig {
  tenantId: string;
  features: {
    responsiveDesign: boolean;
    touchOptimization: boolean;
    offlineMode: boolean;
    pushNotifications: boolean;
    biometricAuth: boolean;
    voiceCommands: boolean;
    gestureNavigation: boolean;
    darkMode: boolean;
  };
  performance: {
    imageCompression: boolean;
    lazyLoading: boolean;
    caching: boolean;
    compressionEnabled: boolean;
  };
  accessibility: {
    screenReaderSupport: boolean;
    highContrastMode: boolean;
    fontScaling: boolean;
    voiceNavigation: boolean;
  };
}

export interface MobileUserExperience {
  userId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  platform: 'ios' | 'android' | 'web';
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    gestures: {
      swipeActions: boolean;
      pullToRefresh: boolean;
      pinchToZoom: boolean;
    };
  };
  usage: {
    lastAccess: Date;
    sessionDuration: number;
    featureUsage: Record<string, number>;
    preferredActions: string[];
  };
}

export interface MobileInvoiceView {
  invoiceId: string;
  optimizedFor: 'mobile' | 'tablet';
  layout: {
    sections: InvoiceSection[];
    navigation: NavigationConfig;
    actions: ActionConfig[];
  };
  performance: {
    loadTime: number;
    renderTime: number;
    dataSize: number;
    optimized: boolean;
  };
  features: {
    quickActions: QuickAction[];
    gestures: GestureConfig[];
    voiceCommands: VoiceCommand[];
  };
}

export interface InvoiceSection {
  id: string;
  type: 'header' | 'details' | 'line_items' | 'totals' | 'payment' | 'actions';
  title: string;
  priority: number;
  collapsible: boolean;
  defaultExpanded: boolean;
  fields: FieldConfig[];
}

export interface FieldConfig {
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'status' | 'action';
  label: string;
  value: any;
  format?: string;
  editable: boolean;
  required: boolean;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface NavigationConfig {
  type: 'tabs' | 'scroll' | 'accordion';
  items: NavigationItem[];
  swipeEnabled: boolean;
}

export interface NavigationItem {
  id: string;
  title: string;
  icon: string;
  badge?: number;
  action: string;
}

export interface ActionConfig {
  primary: ActionButton[];
  secondary: ActionButton[];
  context: ContextAction[];
}

export interface ActionButton {
  id: string;
  label: string;
  icon: string;
  action: string;
  variant: 'primary' | 'secondary' | 'danger' | 'success';
  loading?: boolean;
  disabled?: boolean;
}

export interface ContextAction {
  trigger: 'long_press' | 'swipe' | 'double_tap';
  action: string;
  label: string;
  icon: string;
}

export interface QuickAction {
  id: string;
  name: string;
  icon: string;
  action: string;
  gesture?: string;
  shortcut?: string;
}

export interface GestureConfig {
  type: 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down' | 'pinch' | 'double_tap';
  action: string;
  label: string;
  enabled: boolean;
}

export interface VoiceCommand {
  command: string;
  action: string;
  parameters?: Record<string, any>;
  confidence: number;
}

export interface MobileAnalytics {
  userId: string;
  sessionId: string;
  deviceInfo: DeviceInfo;
  performance: PerformanceMetrics;
  interactions: UserInteraction[];
  errors: MobileError[];
  feedback: UserFeedback[];
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet';
  platform: 'ios' | 'android';
  version: string;
  screenSize: {
    width: number;
    height: number;
    density: number;
  };
  network: {
    type: 'wifi' | 'cellular' | 'offline';
    speed: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  capabilities: {
    touch: boolean;
    gestures: boolean;
    voice: boolean;
    biometrics: boolean;
    camera: boolean;
    gps: boolean;
  };
}

export interface PerformanceMetrics {
  pageLoad: number;
  apiResponse: number;
  renderTime: number;
  memoryUsage: number;
  batteryImpact: number;
  dataUsage: number;
  errorRate: number;
}

export interface UserInteraction {
  timestamp: Date;
  type: 'tap' | 'swipe' | 'pinch' | 'voice' | 'gesture';
  target: string;
  duration: number;
  coordinates: { x: number; y: number };
  context: any;
}

export interface MobileError {
  timestamp: Date;
  type: 'javascript' | 'network' | 'rendering' | 'user_input';
  message: string;
  stack?: string;
  context: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface UserFeedback {
  timestamp: Date;
  rating: number; // 1-5
  category: 'usability' | 'performance' | 'features' | 'design' | 'bugs';
  comment: string;
  context: any;
  screenshots?: string[];
}

export interface OfflineCapability {
  enabled: boolean;
  storageQuota: number;
  cachedData: {
    invoices: string[];
    customers: string[];
    templates: string[];
    settings: boolean;
  };
  syncStatus: 'synced' | 'pending' | 'conflict' | 'offline';
  lastSync: Date;
}

export interface PushNotificationConfig {
  enabled: boolean;
  tokens: string[];
  preferences: {
    invoiceCreated: boolean;
    paymentReceived: boolean;
    overdueAlerts: boolean;
    systemUpdates: boolean;
    marketing: boolean;
  };
  scheduling: {
    quietHours: {
      start: string; // HH:mm
      end: string;   // HH:mm
    };
    timezone: string;
  };
}

@Injectable()
export class MobileOptimizationService {
  private readonly logger = new Logger(MobileOptimizationService.name);
  private readonly optimizationConfigs = new Map<string, MobileOptimizationConfig>();
  private readonly userExperiences = new Map<string, MobileUserExperience>();
  private readonly mobileAnalytics = new Map<string, MobileAnalytics[]>();
  private readonly offlineCapabilities = new Map<string, OfflineCapability>();
  private readonly pushNotifications = new Map<string, PushNotificationConfig>();

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepository: Repository<InvoiceLineItem>,
    private readonly metricsService: MetricsService,
  ) {
    this.initializeDefaultConfigurations();
  }

  /**
   * Initialize default mobile optimization configurations
   */
  private initializeDefaultConfigurations(): void {
    this.logger.log('Initializing default mobile optimization configurations');

    const defaultConfig: MobileOptimizationConfig = {
      tenantId: 'default',
      features: {
        responsiveDesign: true,
        touchOptimization: true,
        offlineMode: true,
        pushNotifications: true,
        biometricAuth: true,
        voiceCommands: true,
        gestureNavigation: true,
        darkMode: true,
      },
      performance: {
        imageCompression: true,
        lazyLoading: true,
        caching: true,
        compressionEnabled: true,
      },
      accessibility: {
        screenReaderSupport: true,
        highContrastMode: true,
        fontScaling: true,
        voiceNavigation: true,
      },
    };

    this.optimizationConfigs.set('default', defaultConfig);
  }

  /**
   * Get mobile-optimized invoice view
   */
  async getMobileInvoiceView(
    invoiceId: string,
    tenantId: string,
    deviceType: 'mobile' | 'tablet',
    userId?: string,
  ): Promise<MobileInvoiceView> {
    this.logger.log(`Getting mobile invoice view for ${invoiceId} on ${deviceType}`);

    // Get invoice data
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, tenant_id: tenantId },
      relations: ['line_items'],
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Get optimization config
    const config = this.getOptimizationConfig(tenantId);
    
    // Get user experience if available
    const userExperience = userId ? this.getUserExperience(userId) : null;

    // Generate optimized layout
    const layout = this.generateOptimizedLayout(invoice, deviceType, config, userExperience);
    
    // Generate performance metrics
    const performance = await this.generatePerformanceMetrics(invoice, deviceType, config);
    
    // Generate mobile features
    const features = this.generateMobileFeatures(config, userExperience);

    return {
      invoiceId,
      optimizedFor: deviceType,
      layout,
      performance,
      features,
    };
  }

  /**
   * Configure mobile optimization for tenant
   */
  async configureMobileOptimization(
    tenantId: string,
    config: Partial<MobileOptimizationConfig>,
  ): Promise<MobileOptimizationConfig> {
    this.logger.log(`Configuring mobile optimization for tenant ${tenantId}`);

    const currentConfig = this.getOptimizationConfig(tenantId);
    const updatedConfig: MobileOptimizationConfig = {
      ...currentConfig,
      tenantId,
      features: { ...currentConfig.features, ...config.features },
      performance: { ...currentConfig.performance, ...config.performance },
      accessibility: { ...currentConfig.accessibility, ...config.accessibility },
    };

    this.optimizationConfigs.set(tenantId, updatedConfig);

    // Record metrics
    this.metricsService.recordMobileOptimizationConfigured(tenantId);

    return updatedConfig;
  }

  /**
   * Track mobile user experience
   */
  async trackUserExperience(
    userId: string,
    deviceInfo: Partial<DeviceInfo>,
    preferences: Partial<MobileUserExperience['preferences']>,
  ): Promise<MobileUserExperience> {
    this.logger.log(`Tracking mobile user experience for user ${userId}`);

    const currentExperience = this.getUserExperience(userId) || {
      userId,
      deviceType: deviceInfo.type || 'mobile',
      platform: deviceInfo.platform || 'web',
      preferences: {
        theme: 'light',
        fontSize: 'medium',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
        gestures: {
          swipeActions: true,
          pullToRefresh: true,
          pinchToZoom: true,
        },
      },
      usage: {
        lastAccess: new Date(),
        sessionDuration: 0,
        featureUsage: {},
        preferredActions: [],
      },
    };

    // Update preferences
    if (preferences) {
      currentExperience.preferences = { ...currentExperience.preferences, ...preferences };
    }

    // Update device info
    if (deviceInfo.type) currentExperience.deviceType = deviceInfo.type;
    if (deviceInfo.platform) currentExperience.platform = deviceInfo.platform;

    currentExperience.usage.lastAccess = new Date();

    this.userExperiences.set(userId, currentExperience);

    return currentExperience;
  }

  /**
   * Record mobile analytics
   */
  async recordMobileAnalytics(analytics: MobileAnalytics): Promise<void> {
    this.logger.log(`Recording mobile analytics for user ${analytics.userId}`);

    if (!this.mobileAnalytics.has(analytics.userId)) {
      this.mobileAnalytics.set(analytics.userId, []);
    }

    this.mobileAnalytics.get(analytics.userId)!.push(analytics);

    // Keep only last 100 sessions per user
    const sessions = this.mobileAnalytics.get(analytics.userId)!;
    if (sessions.length > 100) {
      this.mobileAnalytics.set(analytics.userId, sessions.slice(-100));
    }

    // Record metrics
    this.metricsService.recordMobileAnalytics(analytics);
  }

  /**
   * Configure offline capabilities
   */
  async configureOfflineCapabilities(
    userId: string,
    config: Partial<OfflineCapability>,
  ): Promise<OfflineCapability> {
    this.logger.log(`Configuring offline capabilities for user ${userId}`);

    const currentConfig = this.offlineCapabilities.get(userId) || {
      enabled: true,
      storageQuota: 50 * 1024 * 1024, // 50MB
      cachedData: {
        invoices: [],
        customers: [],
        templates: [],
        settings: true,
      },
      syncStatus: 'synced',
      lastSync: new Date(),
    };

    const updatedConfig: OfflineCapability = {
      ...currentConfig,
      ...config,
      cachedData: { ...currentConfig.cachedData, ...config.cachedData },
    };

    this.offlineCapabilities.set(userId, updatedConfig);

    return updatedConfig;
  }

  /**
   * Configure push notifications
   */
  async configurePushNotifications(
    userId: string,
    config: Partial<PushNotificationConfig>,
  ): Promise<PushNotificationConfig> {
    this.logger.log(`Configuring push notifications for user ${userId}`);

    const currentConfig = this.pushNotifications.get(userId) || {
      enabled: true,
      tokens: [],
      preferences: {
        invoiceCreated: true,
        paymentReceived: true,
        overdueAlerts: true,
        systemUpdates: false,
        marketing: false,
      },
      scheduling: {
        quietHours: {
          start: '22:00',
          end: '08:00',
        },
        timezone: 'UTC',
      },
    };

    const updatedConfig: PushNotificationConfig = {
      ...currentConfig,
      ...config,
      preferences: { ...currentConfig.preferences, ...config.preferences },
      scheduling: { ...currentConfig.scheduling, ...config.scheduling },
    };

    this.pushNotifications.set(userId, updatedConfig);

    return updatedConfig;
  }

  /**
   * Get mobile performance insights
   */
  async getMobilePerformanceInsights(tenantId: string): Promise<{
    overallPerformance: number;
    deviceBreakdown: Record<string, any>;
    commonIssues: string[];
    recommendations: string[];
    userSatisfaction: number;
  }> {
    this.logger.log(`Getting mobile performance insights for tenant ${tenantId}`);

    // Aggregate analytics data
    const allAnalytics = Array.from(this.mobileAnalytics.values())
      .flat()
      .filter(analytics => analytics.deviceInfo.platform !== 'desktop');

    if (allAnalytics.length === 0) {
      return {
        overallPerformance: 85,
        deviceBreakdown: {},
        commonIssues: [],
        recommendations: ['Enable mobile analytics tracking'],
        userSatisfaction: 4.2,
      };
    }

    // Calculate overall performance
    const performanceScores = allAnalytics.map(analytics => 
      this.calculatePerformanceScore(analytics.performance)
    );
    const overallPerformance = performanceScores.reduce((sum, score) => sum + score, 0) / performanceScores.length;

    // Device breakdown
    const deviceBreakdown = this.analyzeDeviceBreakdown(allAnalytics);

    // Common issues
    const commonIssues = this.identifyCommonIssues(allAnalytics);

    // Recommendations
    const recommendations = this.generatePerformanceRecommendations(commonIssues, overallPerformance);

    // User satisfaction
    const userSatisfaction = this.calculateUserSatisfaction(allAnalytics);

    return {
      overallPerformance,
      deviceBreakdown,
      commonIssues,
      recommendations,
      userSatisfaction,
    };
  }

  /**
   * Optimize invoice for mobile
   */
  async optimizeInvoiceForMobile(
    invoiceId: string,
    tenantId: string,
    optimizationOptions: {
      compressImages?: boolean;
      enableOffline?: boolean;
      optimizeForSlowNetwork?: boolean;
    } = {},
  ): Promise<{
    optimizedInvoice: any;
    performance: PerformanceMetrics;
    offlineData?: any;
  }> {
    this.logger.log(`Optimizing invoice ${invoiceId} for mobile`);

    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, tenant_id: tenantId },
      relations: ['line_items'],
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    const config = this.getOptimizationConfig(tenantId);

    // Optimize invoice data
    const optimizedInvoice = this.optimizeInvoiceData(invoice, config, optimizationOptions);

    // Generate performance metrics
    const performance = await this.generatePerformanceMetrics(invoice, 'mobile', config);

    // Generate offline data if requested
    let offlineData;
    if (optimizationOptions.enableOffline) {
      offlineData = await this.generateOfflineData(invoice, config);
    }

    return {
      optimizedInvoice,
      performance,
      offlineData,
    };
  }

  /**
   * Get optimization config
   */
  private getOptimizationConfig(tenantId: string): MobileOptimizationConfig {
    return this.optimizationConfigs.get(tenantId) || this.optimizationConfigs.get('default')!;
  }

  /**
   * Get user experience
   */
  private getUserExperience(userId: string): MobileUserExperience | undefined {
    return this.userExperiences.get(userId);
  }

  /**
   * Generate optimized layout
   */
  private generateOptimizedLayout(
    invoice: Invoice,
    deviceType: 'mobile' | 'tablet',
    config: MobileOptimizationConfig,
    userExperience: MobileUserExperience | null,
  ): { sections: InvoiceSection[]; navigation: NavigationConfig; actions: ActionConfig[] } {
    const sections = this.generateInvoiceSections(invoice, deviceType, config, userExperience);
    const navigation = this.generateNavigationConfig(sections, deviceType, config);
    const actions = this.generateActionConfig(invoice, deviceType, config);

    return { sections, navigation, actions };
  }

  /**
   * Generate invoice sections
   */
  private generateInvoiceSections(
    invoice: Invoice,
    deviceType: 'mobile' | 'tablet',
    config: MobileOptimizationConfig,
    userExperience: MobileUserExperience | null,
  ): InvoiceSection[] {
    const sections: InvoiceSection[] = [];

    // Header section
    sections.push({
      id: 'header',
      type: 'header',
      title: 'Invoice Details',
      priority: 1,
      collapsible: false,
      defaultExpanded: true,
      fields: [
        {
          name: 'invoice_number',
          type: 'text',
          label: 'Invoice #',
          value: invoice.invoice_number,
          editable: false,
          required: false,
        },
        {
          name: 'status',
          type: 'status',
          label: 'Status',
          value: invoice.status,
          editable: false,
          required: false,
        },
        {
          name: 'issue_date',
          type: 'date',
          label: 'Issue Date',
          value: invoice.issue_date,
          format: 'MMM dd, yyyy',
          editable: false,
          required: false,
        },
        {
          name: 'due_date',
          type: 'date',
          label: 'Due Date',
          value: invoice.due_date,
          format: 'MMM dd, yyyy',
          editable: false,
          required: false,
        },
      ],
    });

    // Customer details
    sections.push({
      id: 'customer',
      type: 'details',
      title: 'Customer Information',
      priority: 2,
      collapsible: deviceType === 'mobile',
      defaultExpanded: true,
      fields: [
        {
          name: 'customer_name',
          type: 'text',
          label: 'Customer',
          value: invoice.client_name,
          editable: false,
          required: false,
        },
        {
          name: 'customer_email',
          type: 'text',
          label: 'Email',
          value: invoice.client_email,
          editable: false,
          required: false,
        },
      ],
    });

    // Line items
    sections.push({
      id: 'line_items',
      type: 'line_items',
      title: 'Items',
      priority: 3,
      collapsible: deviceType === 'mobile' && invoice.line_items && invoice.line_items.length > 3,
      defaultExpanded: true,
      fields: [],
    });

    // Totals
    sections.push({
      id: 'totals',
      type: 'totals',
      title: 'Summary',
      priority: 4,
      collapsible: false,
      defaultExpanded: true,
      fields: [
        {
          name: 'sub_total',
          type: 'currency',
          label: 'Subtotal',
          value: invoice.sub_total,
          format: '₹#,##0.00',
          editable: false,
          required: false,
        },
        {
          name: 'tax',
          type: 'currency',
          label: 'Tax',
          value: invoice.tax,
          format: '₹#,##0.00',
          editable: false,
          required: false,
        },
        {
          name: 'grand_total',
          type: 'currency',
          label: 'Total',
          value: invoice.grand_total,
          format: '₹#,##0.00',
          editable: false,
          required: false,
        },
        {
          name: 'balance_due',
          type: 'currency',
          label: 'Balance Due',
          value: invoice.balance_due,
          format: '₹#,##0.00',
          editable: false,
          required: false,
        },
      ],
    });

    // Payment information
    if (invoice.status !== 'paid') {
      sections.push({
        id: 'payment',
        type: 'payment',
        title: 'Payment',
        priority: 5,
        collapsible: false,
        defaultExpanded: true,
        fields: [
          {
            name: 'payment_status',
            type: 'status',
            label: 'Payment Status',
            value: invoice.status === 'paid' ? 'Paid' : 'Pending',
            editable: false,
            required: false,
          },
        ],
      });
    }

    return sections;
  }

  /**
   * Generate navigation config
   */
  private generateNavigationConfig(
    sections: InvoiceSection[],
    deviceType: 'mobile' | 'tablet',
    config: MobileOptimizationConfig,
  ): NavigationConfig {
    const items: NavigationItem[] = sections.map(section => ({
      id: section.id,
      title: section.title,
      icon: this.getSectionIcon(section.type),
      badge: section.type === 'line_items' && sections.find(s => s.id === 'line_items')?.fields.length ? 
        sections.find(s => s.id === 'line_items')!.fields.length : undefined,
      action: `navigate_to_${section.id}`,
    }));

    return {
      type: deviceType === 'mobile' ? 'scroll' : 'tabs',
      items,
      swipeEnabled: config.features.gestureNavigation,
    };
  }

  /**
   * Generate action config
   */
  private generateActionConfig(
    invoice: Invoice,
    deviceType: 'mobile' | 'tablet',
    config: MobileOptimizationConfig,
  ): ActionConfig {
    const primary: ActionButton[] = [];
    const secondary: ActionButton[] = [];
    const context: ContextAction[] = [];

    // Primary actions
    if (invoice.status === 'draft') {
      primary.push({
        id: 'send',
        label: 'Send Invoice',
        icon: 'send',
        action: 'send_invoice',
        variant: 'primary',
      });
    }

    if (invoice.status === 'sent' && invoice.balance_due > 0) {
      primary.push({
        id: 'payment_reminder',
        label: 'Send Reminder',
        icon: 'bell',
        action: 'send_reminder',
        variant: 'secondary',
      });
    }

    // Secondary actions
    secondary.push({
      id: 'download',
      label: 'Download',
      icon: 'download',
      action: 'download_invoice',
      variant: 'secondary',
    });

    secondary.push({
      id: 'share',
      label: 'Share',
      icon: 'share',
      action: 'share_invoice',
      variant: 'secondary',
    });

    // Context actions (gestures)
    if (config.features.gestureNavigation) {
      context.push({
        trigger: 'swipe_left',
        action: 'mark_as_paid',
        label: 'Mark as Paid',
        icon: 'check',
      });

      context.push({
        trigger: 'swipe_right',
        action: 'edit_invoice',
        label: 'Edit',
        icon: 'edit',
      });

      context.push({
        trigger: 'long_press',
        action: 'show_options',
        label: 'More Options',
        icon: 'more',
      });
    }

    return { primary, secondary, context };
  }

  /**
   * Generate mobile features
   */
  private generateMobileFeatures(
    config: MobileOptimizationConfig,
    userExperience: MobileUserExperience | null,
  ): { quickActions: QuickAction[]; gestures: GestureConfig[]; voiceCommands: VoiceCommand[] } {
    const quickActions: QuickAction[] = [
      {
        id: 'create_invoice',
        name: 'Create Invoice',
        icon: 'plus',
        action: 'create_invoice',
        gesture: config.features.gestureNavigation ? 'swipe_up' : undefined,
      },
      {
        id: 'view_dashboard',
        name: 'Dashboard',
        icon: 'dashboard',
        action: 'view_dashboard',
        gesture: config.features.gestureNavigation ? 'swipe_down' : undefined,
      },
      {
        id: 'search',
        name: 'Search',
        icon: 'search',
        action: 'search_invoices',
        shortcut: 'Ctrl+K',
      },
    ];

    const gestures: GestureConfig[] = [];
    if (config.features.gestureNavigation) {
      gestures.push(
        {
          type: 'swipe_left',
          action: 'next_invoice',
          label: 'Next Invoice',
          enabled: true,
        },
        {
          type: 'swipe_right',
          action: 'previous_invoice',
          label: 'Previous Invoice',
          enabled: true,
        },
        {
          type: 'double_tap',
          action: 'mark_as_read',
          label: 'Mark as Read',
          enabled: true,
        }
      );
    }

    const voiceCommands: VoiceCommand[] = [];
    if (config.features.voiceCommands) {
      voiceCommands.push(
        {
          command: 'create new invoice',
          action: 'create_invoice',
          confidence: 0.9,
        },
        {
          command: 'show unpaid invoices',
          action: 'filter_unpaid',
          confidence: 0.85,
        },
        {
          command: 'send payment reminder',
          action: 'send_reminder',
          confidence: 0.8,
        }
      );
    }

    return { quickActions, gestures, voiceCommands };
  }

  /**
   * Generate performance metrics
   */
  private async generatePerformanceMetrics(
    invoice: Invoice,
    deviceType: 'mobile' | 'tablet',
    config: MobileOptimizationConfig,
  ): Promise<PerformanceMetrics> {
    // Simulate performance metrics
    const baseLoadTime = deviceType === 'mobile' ? 1500 : 1000;
    const optimizationBonus = config.performance.caching ? -300 : 0;
    const compressionBonus = config.performance.compressionEnabled ? -200 : 0;

    return {
      pageLoad: Math.max(500, baseLoadTime + optimizationBonus + compressionBonus),
      apiResponse: 300,
      renderTime: 200,
      memoryUsage: 25 * 1024 * 1024, // 25MB
      batteryImpact: 0.5, // 0.5% per hour
      dataUsage: 0.5, // 0.5MB
      errorRate: 0.01, // 1%
    };
  }

  /**
   * Optimize invoice data
   */
  private optimizeInvoiceData(
    invoice: Invoice,
    config: MobileOptimizationConfig,
    options: any,
  ): any {
    const optimized = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      grand_total: invoice.grand_total,
      balance_due: invoice.balance_due,
      client_name: invoice.client_name,
      client_email: invoice.client_email,
    };

    // Include line items if not optimizing for slow network
    if (!options.optimizeForSlowNetwork) {
      (optimized as any).line_items = invoice.line_items?.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));
    }

    return optimized;
  }

  /**
   * Generate offline data
   */
  private async generateOfflineData(invoice: Invoice, config: MobileOptimizationConfig): Promise<any> {
    return {
      invoice: this.optimizeInvoiceData(invoice, config, {}),
      lastUpdated: new Date(),
      version: '1.0',
      checksum: this.generateChecksum(invoice),
    };
  }

  /**
   * Get section icon
   */
  private getSectionIcon(type: string): string {
    const iconMap: Record<string, string> = {
      header: 'document',
      details: 'user',
      line_items: 'list',
      totals: 'calculator',
      payment: 'credit-card',
      actions: 'settings',
    };
    return iconMap[type] || 'file';
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    const loadTimeScore = Math.max(0, 100 - (metrics.pageLoad / 20)); // 20ms = 1 point
    const responseScore = Math.max(0, 100 - (metrics.apiResponse / 10)); // 10ms = 1 point
    const errorScore = Math.max(0, 100 - (metrics.errorRate * 1000)); // 0.1% = 1 point

    return (loadTimeScore + responseScore + errorScore) / 3;
  }

  /**
   * Analyze device breakdown
   */
  private analyzeDeviceBreakdown(analytics: MobileAnalytics[]): Record<string, any> {
    const breakdown: Record<string, any> = {};

    analytics.forEach(session => {
      const key = `${session.deviceInfo.type}_${session.deviceInfo.platform}`;
      if (!breakdown[key]) {
        breakdown[key] = {
          count: 0,
          avgPerformance: 0,
          issues: 0,
        };
      }
      breakdown[key].count++;
      breakdown[key].avgPerformance += this.calculatePerformanceScore(session.performance);
      breakdown[key].issues += session.errors.length;
    });

    // Calculate averages
    Object.keys(breakdown).forEach(key => {
      const data = breakdown[key];
      data.avgPerformance /= data.count;
    });

    return breakdown;
  }

  /**
   * Identify common issues
   */
  private identifyCommonIssues(analytics: MobileAnalytics[]): string[] {
    const issues: string[] = [];
    const errorCounts = new Map<string, number>();

    analytics.forEach(session => {
      session.errors.forEach(error => {
        const key = error.type;
        errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
      });
    });

    // Get top issues
    const sortedIssues = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    sortedIssues.forEach(([issue, count]) => {
      issues.push(`${issue} (${count} occurrences)`);
    });

    return issues;
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(issues: string[], performance: number): string[] {
    const recommendations: string[] = [];

    if (performance < 70) {
      recommendations.push('Enable image compression and lazy loading');
      recommendations.push('Optimize API response times');
    }

    if (issues.some(issue => issue.includes('network'))) {
      recommendations.push('Implement offline mode for better connectivity handling');
    }

    if (issues.some(issue => issue.includes('rendering'))) {
      recommendations.push('Optimize rendering performance with virtual scrolling');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Calculate user satisfaction
   */
  private calculateUserSatisfaction(analytics: MobileAnalytics[]): number {
    const feedback = analytics.flatMap(session => session.feedback);
    
    if (feedback.length === 0) return 4.0; // Default satisfaction

    const totalRating = feedback.reduce((sum, f) => sum + f.rating, 0);
    return totalRating / feedback.length;
  }

  /**
   * Generate checksum
   */
  private generateChecksum(invoice: Invoice): string {
    // Simple checksum implementation
    const data = `${invoice.id}_${invoice.updated_at.getTime()}`;
    return Buffer.from(data).toString('base64').slice(0, 16);
  }
}
