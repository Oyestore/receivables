/**
 * Self-Service Portal Entity for Advanced User Experience
 * SME Receivables Management Platform - Module 11 Phase 2
 * 
 * Comprehensive entity for self-service portals, user empowerment,
 * personalization, and advanced user experience capabilities
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  PortalType,
  UserRole,
  PortalStatus,
  WidgetType,
  ThemeMode,
  LayoutType,
  NotificationChannel,
  AccessLevel,
  PersonalizationLevel
} from '@shared/enums/advanced-features.enum';
import {
  SelfServicePortal,
  PortalConfiguration,
  UserPreferences,
  PersonalizationSettings,
  PortalWidget
} from '@shared/interfaces/advanced-features.interface';

@Entity('self_service_portals')
@Index(['tenantId', 'isActive'])
@Index(['portalType', 'status'])
@Index(['createdAt'])
@Index(['lastAccessedAt'])
export class SelfServicePortalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PortalType,
    default: PortalType.CUSTOMER,
    name: 'portal_type'
  })
  portalType: PortalType;

  @Column({
    type: 'enum',
    enum: PortalStatus,
    default: PortalStatus.DRAFT,
    name: 'status'
  })
  status: PortalStatus;

  // Portal Configuration
  @Column({ type: 'jsonb', name: 'portal_config', default: {} })
  portalConfig: PortalConfigurationData;

  @Column({ type: 'varchar', length: 500, name: 'custom_domain', nullable: true })
  customDomain: string;

  @Column({ type: 'varchar', length: 500, name: 'portal_url' })
  portalUrl: string;

  @Column({ type: 'boolean', name: 'ssl_enabled', default: true })
  sslEnabled: boolean;

  @Column({ type: 'boolean', name: 'custom_branding', default: false })
  customBranding: boolean;

  // Layout and Design
  @Column({
    type: 'enum',
    enum: LayoutType,
    default: LayoutType.RESPONSIVE,
    name: 'layout_type'
  })
  layoutType: LayoutType;

  @Column({
    type: 'enum',
    enum: ThemeMode,
    default: ThemeMode.LIGHT,
    name: 'default_theme'
  })
  defaultTheme: ThemeMode;

  @Column({ type: 'jsonb', name: 'theme_config', default: {} })
  themeConfig: ThemeConfiguration;

  @Column({ type: 'jsonb', name: 'layout_config', default: {} })
  layoutConfig: LayoutConfiguration;

  @Column({ type: 'jsonb', name: 'branding_config', default: {} })
  brandingConfig: BrandingConfiguration;

  // Navigation and Menu
  @Column({ type: 'jsonb', name: 'navigation_config', default: {} })
  navigationConfig: NavigationConfiguration;

  @Column({ type: 'jsonb', name: 'menu_structure', default: [] })
  menuStructure: MenuItemConfig[];

  @Column({ type: 'boolean', name: 'sidebar_enabled', default: true })
  sidebarEnabled: boolean;

  @Column({ type: 'boolean', name: 'breadcrumbs_enabled', default: true })
  breadcrumbsEnabled: boolean;

  // Access Control and Security
  @Column({ type: 'jsonb', name: 'access_control', default: {} })
  accessControl: AccessControlConfig;

  @Column({ type: 'jsonb', name: 'allowed_roles', default: [] })
  allowedRoles: UserRole[];

  @Column({ type: 'boolean', name: 'guest_access', default: false })
  guestAccess: boolean;

  @Column({ type: 'boolean', name: 'sso_enabled', default: false })
  ssoEnabled: boolean;

  @Column({ type: 'jsonb', name: 'sso_config', default: {} })
  ssoConfig: SSOConfiguration;

  @Column({ type: 'boolean', name: 'mfa_required', default: false })
  mfaRequired: boolean;

  // Personalization
  @Column({ type: 'boolean', name: 'personalization_enabled', default: true })
  personalizationEnabled: boolean;

  @Column({
    type: 'enum',
    enum: PersonalizationLevel,
    default: PersonalizationLevel.BASIC,
    name: 'personalization_level'
  })
  personalizationLevel: PersonalizationLevel;

  @Column({ type: 'jsonb', name: 'default_preferences', default: {} })
  defaultPreferences: UserPreferencesData;

  @Column({ type: 'boolean', name: 'ai_recommendations', default: false })
  aiRecommendations: boolean;

  @Column({ type: 'jsonb', name: 'ai_config', default: {} })
  aiConfig: AIPersonalizationConfig;

  // Content Management
  @Column({ type: 'jsonb', name: 'content_areas', default: [] })
  contentAreas: ContentAreaConfig[];

  @Column({ type: 'boolean', name: 'dynamic_content', default: false })
  dynamicContent: boolean;

  @Column({ type: 'jsonb', name: 'content_rules', default: [] })
  contentRules: ContentRuleConfig[];

  @Column({ type: 'boolean', name: 'multilingual_support', default: false })
  multilingualSupport: boolean;

  @Column({ type: 'jsonb', name: 'supported_languages', default: ['en'] })
  supportedLanguages: string[];

  // Features and Capabilities
  @Column({ type: 'jsonb', name: 'enabled_features', default: [] })
  enabledFeatures: string[];

  @Column({ type: 'jsonb', name: 'feature_config', default: {} })
  featureConfig: FeatureConfiguration;

  @Column({ type: 'boolean', name: 'search_enabled', default: true })
  searchEnabled: boolean;

  @Column({ type: 'jsonb', name: 'search_config', default: {} })
  searchConfig: SearchConfiguration;

  @Column({ type: 'boolean', name: 'notifications_enabled', default: true })
  notificationsEnabled: boolean;

  @Column({ type: 'jsonb', name: 'notification_config', default: {} })
  notificationConfig: NotificationConfiguration;

  // Help and Support
  @Column({ type: 'boolean', name: 'help_center_enabled', default: true })
  helpCenterEnabled: boolean;

  @Column({ type: 'jsonb', name: 'help_config', default: {} })
  helpConfig: HelpCenterConfiguration;

  @Column({ type: 'boolean', name: 'chat_support_enabled', default: false })
  chatSupportEnabled: boolean;

  @Column({ type: 'jsonb', name: 'chat_config', default: {} })
  chatConfig: ChatSupportConfiguration;

  @Column({ type: 'boolean', name: 'feedback_enabled', default: true })
  feedbackEnabled: boolean;

  @Column({ type: 'jsonb', name: 'feedback_config', default: {} })
  feedbackConfig: FeedbackConfiguration;

  // Analytics and Tracking
  @Column({ type: 'boolean', name: 'analytics_enabled', default: true })
  analyticsEnabled: boolean;

  @Column({ type: 'jsonb', name: 'analytics_config', default: {} })
  analyticsConfig: AnalyticsConfiguration;

  @Column({ type: 'boolean', name: 'user_tracking', default: true })
  userTracking: boolean;

  @Column({ type: 'jsonb', name: 'tracking_config', default: {} })
  trackingConfig: TrackingConfiguration;

  // Performance and Optimization
  @Column({ type: 'boolean', name: 'caching_enabled', default: true })
  cachingEnabled: boolean;

  @Column({ type: 'jsonb', name: 'cache_config', default: {} })
  cacheConfig: CacheConfiguration;

  @Column({ type: 'boolean', name: 'cdn_enabled', default: false })
  cdnEnabled: boolean;

  @Column({ type: 'varchar', length: 500, name: 'cdn_url', nullable: true })
  cdnUrl: string;

  @Column({ type: 'boolean', name: 'compression_enabled', default: true })
  compressionEnabled: boolean;

  @Column({ type: 'boolean', name: 'lazy_loading', default: true })
  lazyLoading: boolean;

  // Usage Statistics
  @Column({ type: 'integer', name: 'total_users', default: 0 })
  totalUsers: number;

  @Column({ type: 'integer', name: 'active_users', default: 0 })
  activeUsers: number;

  @Column({ type: 'integer', name: 'daily_visits', default: 0 })
  dailyVisits: number;

  @Column({ type: 'integer', name: 'monthly_visits', default: 0 })
  monthlyVisits: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'average_session_duration', default: 0.0 })
  averageSessionDuration: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'bounce_rate', default: 0.0 })
  bounceRate: number;

  @Column({ type: 'timestamp', name: 'last_accessed_at', nullable: true })
  @Index()
  lastAccessedAt: Date;

  // Performance Metrics
  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'average_load_time', default: 0.0 })
  averageLoadTime: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'performance_score', default: 0.0 })
  performanceScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'accessibility_score', default: 0.0 })
  accessibilityScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'seo_score', default: 0.0 })
  seoScore: number;

  // Status and Metadata
  @Column({ type: 'boolean', name: 'is_active', default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'boolean', name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ type: 'timestamp', name: 'published_at', nullable: true })
  publishedAt: Date;

  @Column({ type: 'boolean', name: 'maintenance_mode', default: false })
  maintenanceMode: boolean;

  @Column({ type: 'text', name: 'maintenance_message', nullable: true })
  maintenanceMessage: string;

  @Column({ type: 'jsonb', name: 'tags', default: [] })
  tags: string[];

  // Audit and Metadata
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @Column({ type: 'uuid', name: 'updated_by' })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relationships
  @OneToMany(() => PortalWidgetEntity, widget => widget.portal)
  widgets: PortalWidgetEntity[];

  @OneToMany(() => UserPreferencesEntity, preferences => preferences.portal)
  userPreferences: UserPreferencesEntity[];

  @OneToMany(() => PortalAccessLogEntity, accessLog => accessLog.portal)
  accessLogs: PortalAccessLogEntity[];

  @OneToMany(() => PortalFeedbackEntity, feedback => feedback.portal)
  feedback: PortalFeedbackEntity[];

  // Lifecycle Hooks
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    this.version = 1;
    this.portalUrl = this.generatePortalUrl();
  }

  @BeforeUpdate()
  updateVersion() {
    this.version += 1;
  }

  // Business Methods
  private generatePortalUrl(): string {
    const baseUrl = process.env.PORTAL_BASE_URL || 'https://portal.sme-platform.com';
    const slug = this.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${baseUrl}/${this.tenantId}/${slug}`;
  }

  updateUsageStatistics(sessionDuration: number, isNewUser: boolean): void {
    if (isNewUser) {
      this.totalUsers += 1;
    }

    this.dailyVisits += 1;
    this.lastAccessedAt = new Date();

    // Update average session duration
    const totalSessions = this.dailyVisits;
    this.averageSessionDuration = (
      (this.averageSessionDuration * (totalSessions - 1)) + sessionDuration
    ) / totalSessions;
  }

  updatePerformanceMetrics(loadTime: number, performanceScore: number): void {
    // Update average load time
    const totalMeasurements = this.dailyVisits || 1;
    this.averageLoadTime = (
      (this.averageLoadTime * (totalMeasurements - 1)) + loadTime
    ) / totalMeasurements;

    this.performanceScore = performanceScore;
  }

  calculateOverallScore(): number {
    const scores = [
      this.performanceScore,
      this.accessibilityScore,
      this.seoScore
    ].filter(score => score > 0);

    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  canUserAccess(userId: string, userRoles: UserRole[]): boolean {
    // Check if portal is active and published
    if (!this.isActive || !this.isPublished) {
      return false;
    }

    // Check maintenance mode
    if (this.maintenanceMode) {
      return false; // Only admins should access during maintenance
    }

    // Check guest access
    if (this.guestAccess && !userId) {
      return true;
    }

    // Check role-based access
    if (this.allowedRoles.length > 0) {
      return this.allowedRoles.some(role => userRoles.includes(role));
    }

    return true; // Default allow if no specific restrictions
  }

  getPersonalizedConfig(userId: string, userPreferences?: UserPreferencesData): PortalConfigurationData {
    let config = { ...this.portalConfig };

    if (this.personalizationEnabled && userPreferences) {
      // Apply user preferences
      if (userPreferences.theme) {
        config.theme = userPreferences.theme;
      }

      if (userPreferences.layout) {
        config.layout = { ...config.layout, ...userPreferences.layout };
      }

      if (userPreferences.widgets) {
        config.widgets = this.personalizeWidgets(config.widgets, userPreferences.widgets);
      }

      if (userPreferences.language) {
        config.language = userPreferences.language;
      }
    }

    return config;
  }

  private personalizeWidgets(defaultWidgets: any[], userWidgetPrefs: any[]): any[] {
    // Merge default widgets with user preferences
    return defaultWidgets.map(widget => {
      const userPref = userWidgetPrefs.find(pref => pref.widgetId === widget.id);
      if (userPref) {
        return {
          ...widget,
          position: userPref.position || widget.position,
          size: userPref.size || widget.size,
          visible: userPref.visible !== undefined ? userPref.visible : widget.visible,
          config: { ...widget.config, ...userPref.config }
        };
      }
      return widget;
    });
  }

  addWidget(widget: Partial<PortalWidgetEntity>): void {
    if (!this.widgets) this.widgets = [];
    
    const newWidget = new PortalWidgetEntity();
    Object.assign(newWidget, {
      ...widget,
      portalId: this.id,
      order: this.widgets.length
    });
    
    this.widgets.push(newWidget);
  }

  removeWidget(widgetId: string): boolean {
    if (!this.widgets) return false;
    
    const index = this.widgets.findIndex(w => w.id === widgetId);
    if (index === -1) return false;
    
    this.widgets.splice(index, 1);
    
    // Reorder remaining widgets
    this.widgets.forEach((widget, idx) => {
      widget.order = idx;
    });
    
    return true;
  }

  publish(userId: string): void {
    this.status = PortalStatus.PUBLISHED;
    this.isPublished = true;
    this.publishedAt = new Date();
    this.updatedBy = userId;
  }

  unpublish(userId: string): void {
    this.status = PortalStatus.DRAFT;
    this.isPublished = false;
    this.publishedAt = null;
    this.updatedBy = userId;
  }

  enableMaintenanceMode(message: string, userId: string): void {
    this.maintenanceMode = true;
    this.maintenanceMessage = message;
    this.updatedBy = userId;
  }

  disableMaintenanceMode(userId: string): void {
    this.maintenanceMode = false;
    this.maintenanceMessage = null;
    this.updatedBy = userId;
  }

  clone(newName: string, userId: string): SelfServicePortalEntity {
    const cloned = new SelfServicePortalEntity();
    
    Object.assign(cloned, {
      ...this,
      id: undefined, // Will be generated
      name: newName,
      portalUrl: undefined, // Will be generated
      status: PortalStatus.DRAFT,
      isPublished: false,
      publishedAt: null,
      createdBy: userId,
      updatedBy: userId,
      createdAt: undefined, // Will be set automatically
      updatedAt: undefined, // Will be set automatically
      version: 1,
      totalUsers: 0,
      activeUsers: 0,
      dailyVisits: 0,
      monthlyVisits: 0,
      lastAccessedAt: null
    });
    
    return cloned;
  }

  toJSON(): SelfServicePortal {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.portalType,
      status: this.status,
      url: this.portalUrl,
      customDomain: this.customDomain,
      configuration: this.portalConfig,
      theme: {
        mode: this.defaultTheme,
        config: this.themeConfig,
        customBranding: this.customBranding,
        branding: this.brandingConfig
      },
      layout: {
        type: this.layoutType,
        config: this.layoutConfig,
        navigation: this.navigationConfig,
        menu: this.menuStructure
      },
      features: {
        enabled: this.enabledFeatures,
        config: this.featureConfig,
        personalization: {
          enabled: this.personalizationEnabled,
          level: this.personalizationLevel,
          aiRecommendations: this.aiRecommendations
        }
      },
      access: {
        allowedRoles: this.allowedRoles,
        guestAccess: this.guestAccess,
        ssoEnabled: this.ssoEnabled,
        mfaRequired: this.mfaRequired
      },
      analytics: {
        totalUsers: this.totalUsers,
        activeUsers: this.activeUsers,
        dailyVisits: this.dailyVisits,
        monthlyVisits: this.monthlyVisits,
        averageSessionDuration: this.averageSessionDuration,
        bounceRate: this.bounceRate,
        performance: {
          loadTime: this.averageLoadTime,
          performanceScore: this.performanceScore,
          accessibilityScore: this.accessibilityScore,
          seoScore: this.seoScore,
          overallScore: this.calculateOverallScore()
        }
      },
      isActive: this.isActive,
      isPublished: this.isPublished,
      publishedAt: this.publishedAt,
      maintenanceMode: this.maintenanceMode,
      lastAccessedAt: this.lastAccessedAt
    };
  }
}

// Supporting Entities
@Entity('portal_widgets')
@Index(['portalId', 'order'])
@Index(['widgetType', 'isVisible'])
export class PortalWidgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'portal_id' })
  portalId: string;

  @Column({
    type: 'enum',
    enum: WidgetType,
    name: 'widget_type'
  })
  widgetType: WidgetType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Position and Layout
  @Column({ type: 'integer', name: 'position_x', default: 0 })
  positionX: number;

  @Column({ type: 'integer', name: 'position_y', default: 0 })
  positionY: number;

  @Column({ type: 'integer', name: 'width', default: 4 })
  width: number;

  @Column({ type: 'integer', name: 'height', default: 3 })
  height: number;

  @Column({ type: 'integer', default: 0 })
  order: number;

  // Configuration
  @Column({ type: 'jsonb', name: 'widget_config', default: {} })
  widgetConfig: Record<string, any>;

  @Column({ type: 'jsonb', name: 'style_config', default: {} })
  styleConfig: Record<string, any>;

  @Column({ type: 'jsonb', name: 'data_config', default: {} })
  dataConfig: Record<string, any>;

  // Permissions and Visibility
  @Column({ type: 'boolean', name: 'is_visible', default: true })
  isVisible: boolean;

  @Column({ type: 'jsonb', name: 'visibility_rules', default: {} })
  visibilityRules: Record<string, any>;

  @Column({ type: 'jsonb', name: 'access_permissions', default: {} })
  accessPermissions: Record<string, any>;

  // Personalization
  @Column({ type: 'boolean', name: 'personalizable', default: true })
  personalizable: boolean;

  @Column({ type: 'jsonb', name: 'personalization_options', default: {} })
  personalizationOptions: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => SelfServicePortalEntity, portal => portal.widgets)
  @JoinColumn({ name: 'portal_id' })
  portal: SelfServicePortalEntity;

  toJSON(): PortalWidget {
    return {
      id: this.id,
      type: this.widgetType,
      title: this.title,
      description: this.description,
      position: {
        x: this.positionX,
        y: this.positionY,
        z: this.order
      },
      size: {
        width: this.width,
        height: this.height
      },
      config: this.widgetConfig,
      style: this.styleConfig,
      data: this.dataConfig,
      isVisible: this.isVisible,
      personalizable: this.personalizable,
      permissions: this.accessPermissions
    };
  }
}

@Entity('user_preferences')
@Index(['portalId', 'userId'])
export class UserPreferencesEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'portal_id' })
  portalId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'jsonb', name: 'preferences', default: {} })
  preferences: UserPreferencesData;

  @Column({ type: 'jsonb', name: 'widget_preferences', default: [] })
  widgetPreferences: WidgetPreference[];

  @Column({ type: 'jsonb', name: 'layout_preferences', default: {} })
  layoutPreferences: Record<string, any>;

  @Column({ type: 'varchar', length: 10, name: 'language', default: 'en' })
  language: string;

  @Column({
    type: 'enum',
    enum: ThemeMode,
    default: ThemeMode.LIGHT,
    name: 'theme'
  })
  theme: ThemeMode;

  @Column({ type: 'varchar', length: 50, name: 'timezone', default: 'UTC' })
  timezone: string;

  @Column({ type: 'jsonb', name: 'notification_preferences', default: {} })
  notificationPreferences: NotificationPreferences;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => SelfServicePortalEntity, portal => portal.userPreferences)
  @JoinColumn({ name: 'portal_id' })
  portal: SelfServicePortalEntity;

  toJSON(): UserPreferences {
    return {
      id: this.id,
      userId: this.userId,
      portalId: this.portalId,
      preferences: this.preferences,
      widgets: this.widgetPreferences,
      layout: this.layoutPreferences,
      language: this.language,
      theme: this.theme,
      timezone: this.timezone,
      notifications: this.notificationPreferences,
      updatedAt: this.updatedAt
    };
  }
}

@Entity('portal_access_logs')
@Index(['portalId', 'accessedAt'])
export class PortalAccessLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'portal_id' })
  portalId: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string;

  @Column({ type: 'timestamp', name: 'accessed_at', default: () => 'CURRENT_TIMESTAMP' })
  accessedAt: Date;

  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 500, name: 'page_url' })
  pageUrl: string;

  @Column({ type: 'varchar', length: 500, name: 'referrer', nullable: true })
  referrer: string;

  @Column({ type: 'integer', name: 'session_duration', nullable: true })
  sessionDuration: number;

  @Column({ type: 'jsonb', name: 'actions_performed', default: [] })
  actionsPerformed: string[];

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => SelfServicePortalEntity, portal => portal.accessLogs)
  @JoinColumn({ name: 'portal_id' })
  portal: SelfServicePortalEntity;
}

@Entity('portal_feedback')
@Index(['portalId', 'createdAt'])
export class PortalFeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'portal_id' })
  portalId: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string;

  @Column({ type: 'varchar', length: 100, name: 'feedback_type' })
  feedbackType: string;

  @Column({ type: 'integer', name: 'rating', nullable: true })
  rating: number;

  @Column({ type: 'text' })
  comment: string;

  @Column({ type: 'varchar', length: 500, name: 'page_url', nullable: true })
  pageUrl: string;

  @Column({ type: 'boolean', name: 'is_resolved', default: false })
  isResolved: boolean;

  @Column({ type: 'text', name: 'resolution_notes', nullable: true })
  resolutionNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relationships
  @ManyToOne(() => SelfServicePortalEntity, portal => portal.feedback)
  @JoinColumn({ name: 'portal_id' })
  portal: SelfServicePortalEntity;
}

// Supporting Interfaces
interface PortalConfigurationData {
  theme: ThemeConfiguration;
  layout: LayoutConfiguration;
  navigation: NavigationConfiguration;
  features: FeatureConfiguration;
  security: SecurityConfiguration;
  performance: PerformanceConfiguration;
}

interface ThemeConfiguration {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: string;
  borderRadius: string;
  shadows: boolean;
  animations: boolean;
}

interface LayoutConfiguration {
  containerWidth: string;
  gridColumns: number;
  gridGap: string;
  headerHeight: string;
  sidebarWidth: string;
  footerHeight: string;
  responsive: boolean;
  breakpoints: Record<string, string>;
}

interface BrandingConfiguration {
  logo: string;
  favicon: string;
  companyName: string;
  tagline: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
  customCss: string;
}

interface NavigationConfiguration {
  type: 'horizontal' | 'vertical' | 'mixed';
  position: 'top' | 'left' | 'right';
  style: 'tabs' | 'pills' | 'underline' | 'sidebar';
  collapsible: boolean;
  searchEnabled: boolean;
  breadcrumbs: boolean;
}

interface MenuItemConfig {
  id: string;
  label: string;
  icon?: string;
  url?: string;
  target?: string;
  children?: MenuItemConfig[];
  permissions?: string[];
  visible: boolean;
  order: number;
}

interface AccessControlConfig {
  authentication: 'required' | 'optional' | 'none';
  authorization: 'role_based' | 'permission_based' | 'custom';
  sessionTimeout: number;
  maxConcurrentSessions: number;
  ipWhitelist?: string[];
  ipBlacklist?: string[];
}

interface SSOConfiguration {
  provider: string;
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  scopes: string[];
  autoProvision: boolean;
  attributeMapping: Record<string, string>;
}

interface AIPersonalizationConfig {
  enabled: boolean;
  model: string;
  confidence: number;
  learningRate: number;
  features: string[];
  updateFrequency: string;
}

interface ContentAreaConfig {
  id: string;
  name: string;
  type: 'static' | 'dynamic' | 'widget';
  content: string;
  rules: ContentRuleConfig[];
  permissions: string[];
}

interface ContentRuleConfig {
  id: string;
  condition: string;
  action: string;
  priority: number;
  isActive: boolean;
}

interface FeatureConfiguration {
  dashboard: boolean;
  reports: boolean;
  analytics: boolean;
  notifications: boolean;
  search: boolean;
  chat: boolean;
  help: boolean;
  feedback: boolean;
  customization: boolean;
  api: boolean;
}

interface SearchConfiguration {
  provider: 'elasticsearch' | 'algolia' | 'internal';
  indexing: boolean;
  autocomplete: boolean;
  filters: boolean;
  facets: string[];
  boost: Record<string, number>;
}

interface NotificationConfiguration {
  channels: NotificationChannel[];
  templates: Record<string, string>;
  frequency: 'realtime' | 'batched' | 'scheduled';
  preferences: boolean;
  unsubscribe: boolean;
}

interface HelpCenterConfiguration {
  enabled: boolean;
  articles: boolean;
  videos: boolean;
  faqs: boolean;
  search: boolean;
  categories: string[];
  feedback: boolean;
}

interface ChatSupportConfiguration {
  provider: 'internal' | 'zendesk' | 'intercom' | 'custom';
  availability: string;
  autoResponders: boolean;
  fileUpload: boolean;
  history: boolean;
  rating: boolean;
}

interface FeedbackConfiguration {
  types: string[];
  rating: boolean;
  anonymous: boolean;
  moderation: boolean;
  notifications: boolean;
  publicDisplay: boolean;
}

interface AnalyticsConfiguration {
  provider: 'google' | 'adobe' | 'internal' | 'custom';
  trackingId: string;
  events: string[];
  goals: string[];
  ecommerce: boolean;
  privacy: boolean;
}

interface TrackingConfiguration {
  pageViews: boolean;
  events: boolean;
  userJourney: boolean;
  heatmaps: boolean;
  recordings: boolean;
  performance: boolean;
}

interface CacheConfiguration {
  strategy: 'memory' | 'redis' | 'cdn';
  ttl: number;
  invalidation: 'manual' | 'automatic';
  compression: boolean;
  versioning: boolean;
}

interface SecurityConfiguration {
  https: boolean;
  hsts: boolean;
  csp: string;
  xss: boolean;
  csrf: boolean;
  rateLimit: number;
}

interface PerformanceConfiguration {
  caching: boolean;
  compression: boolean;
  minification: boolean;
  lazyLoading: boolean;
  cdn: boolean;
  monitoring: boolean;
}

interface UserPreferencesData {
  theme?: ThemeMode;
  language?: string;
  timezone?: string;
  layout?: Record<string, any>;
  widgets?: WidgetPreference[];
  notifications?: NotificationPreferences;
  accessibility?: AccessibilityPreferences;
}

interface WidgetPreference {
  widgetId: string;
  visible: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  config?: Record<string, any>;
}

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  types: string[];
}

interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

