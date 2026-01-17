import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Service for managing role-based access to analytics features
 * Controls which metrics and dashboard components are accessible to different user roles
 */
@Injectable()
export class RoleBasedAccessService {
  private readonly logger = new Logger(RoleBasedAccessService.name);

  // Define role permissions for analytics features
  private readonly rolePermissions = {
    admin: {
      dashboards: ['overview', 'distribution', 'followUp', 'template', 'system', 'customerBehavior', 'cashFlow'],
      metrics: ['all'],
      actions: ['export', 'configure', 'share'],
    },
    financeManager: {
      dashboards: ['overview', 'distribution', 'followUp', 'cashFlow'],
      metrics: ['dso', 'cei', 'agingAnalysis', 'cashFlowForecast', 'channelROI', 'followUpEffectiveness'],
      actions: ['export', 'configure'],
    },
    arSpecialist: {
      dashboards: ['overview', 'distribution', 'followUp', 'customerBehavior'],
      metrics: ['agingAnalysis', 'customerPaymentBehavior', 'followUpEffectiveness', 'channelEffectiveness'],
      actions: ['export'],
    },
    executive: {
      dashboards: ['overview'],
      metrics: ['dso', 'cei', 'agingSummary', 'cashFlowSummary'],
      actions: ['export'],
    },
  };

  /**
   * Check if user has access to a specific dashboard
   * @param userId User ID
   * @param userRole User role
   * @param dashboardId Dashboard identifier
   * @returns Whether user has access
   */
  async canAccessDashboard(userId: string, userRole: string, dashboardId: string): Promise<boolean> {
    this.logger.log(`Checking if user ${userId} with role ${userRole} can access dashboard ${dashboardId}`);
    
    // If role doesn't exist, deny access
    if (!this.rolePermissions[userRole]) {
      return false;
    }
    
    // Check if dashboard is in allowed dashboards for role
    return this.rolePermissions[userRole].dashboards.includes(dashboardId) || 
           this.rolePermissions[userRole].dashboards.includes('all');
  }

  /**
   * Check if user has access to a specific metric
   * @param userId User ID
   * @param userRole User role
   * @param metricId Metric identifier
   * @returns Whether user has access
   */
  async canAccessMetric(userId: string, userRole: string, metricId: string): Promise<boolean> {
    this.logger.log(`Checking if user ${userId} with role ${userRole} can access metric ${metricId}`);
    
    // If role doesn't exist, deny access
    if (!this.rolePermissions[userRole]) {
      return false;
    }
    
    // Check if metric is in allowed metrics for role
    return this.rolePermissions[userRole].metrics.includes(metricId) || 
           this.rolePermissions[userRole].metrics.includes('all');
  }

  /**
   * Check if user can perform a specific action
   * @param userId User ID
   * @param userRole User role
   * @param actionId Action identifier
   * @returns Whether user can perform action
   */
  async canPerformAction(userId: string, userRole: string, actionId: string): Promise<boolean> {
    this.logger.log(`Checking if user ${userId} with role ${userRole} can perform action ${actionId}`);
    
    // If role doesn't exist, deny access
    if (!this.rolePermissions[userRole]) {
      return false;
    }
    
    // Check if action is in allowed actions for role
    return this.rolePermissions[userRole].actions.includes(actionId) || 
           this.rolePermissions[userRole].actions.includes('all');
  }

  /**
   * Filter dashboard data based on user role
   * @param userId User ID
   * @param userRole User role
   * @param dashboardData Complete dashboard data
   * @returns Filtered dashboard data
   */
  async filterDashboardData(userId: string, userRole: string, dashboardData: any): Promise<any> {
    this.logger.log(`Filtering dashboard data for user ${userId} with role ${userRole}`);
    
    // If role doesn't exist, return empty data
    if (!this.rolePermissions[userRole]) {
      return {};
    }
    
    // If admin role, return all data
    if (userRole === 'admin') {
      return dashboardData;
    }
    
    // Filter data based on role permissions
    const filteredData = {};
    const allowedMetrics = this.rolePermissions[userRole].metrics;
    
    // Include overview data for all roles
    if (dashboardData.overview) {
      filteredData['overview'] = this.filterMetricsInSection(dashboardData.overview, allowedMetrics);
    }
    
    // Include other sections based on role permissions
    for (const section of this.rolePermissions[userRole].dashboards) {
      if (section !== 'overview' && dashboardData[section]) {
        filteredData[section] = this.filterMetricsInSection(dashboardData[section], allowedMetrics);
      }
    }
    
    return filteredData;
  }

  /**
   * Get available dashboards for user role
   * @param userRole User role
   * @returns List of available dashboards
   */
  getAvailableDashboards(userRole: string): string[] {
    if (!this.rolePermissions[userRole]) {
      return [];
    }
    
    return this.rolePermissions[userRole].dashboards;
  }

  /**
   * Get available actions for user role
   * @param userRole User role
   * @returns List of available actions
   */
  getAvailableActions(userRole: string): string[] {
    if (!this.rolePermissions[userRole]) {
      return [];
    }
    
    return this.rolePermissions[userRole].actions;
  }

  /**
   * Filter metrics within a dashboard section
   * @param sectionData Section data
   * @param allowedMetrics List of allowed metrics
   * @returns Filtered section data
   */
  private filterMetricsInSection(sectionData: any, allowedMetrics: string[]): any {
    // If allowed metrics includes 'all', return all section data
    if (allowedMetrics.includes('all')) {
      return sectionData;
    }
    
    // Filter metrics based on allowed metrics
    const filteredSection = {};
    
    for (const [key, value] of Object.entries(sectionData)) {
      // Check if this key represents a metric that's allowed
      if (allowedMetrics.includes(key) || 
          this.isCommonProperty(key) || 
          this.isMetricInAllowedCategory(key, allowedMetrics)) {
        filteredSection[key] = value;
      }
    }
    
    return filteredSection;
  }

  /**
   * Check if property is a common property that should be included regardless of metrics
   * @param key Property key
   * @returns Whether property is common
   */
  private isCommonProperty(key: string): boolean {
    const commonProperties = ['lastUpdated', 'title', 'description'];
    return commonProperties.includes(key);
  }

  /**
   * Check if metric belongs to an allowed category
   * @param metricKey Metric key
   * @param allowedMetrics List of allowed metrics
   * @returns Whether metric is in allowed category
   */
  private isMetricInAllowedCategory(metricKey: string, allowedMetrics: string[]): boolean {
    // Map of metric categories and their related metrics
    const metricCategories = {
      'dso': ['dsoValue', 'dsoTrend', 'dsoByInvoiceSize'],
      'cei': ['ceiValue', 'ceiTrend', 'ceiByCustomerSegment'],
      'agingAnalysis': ['agingBuckets', 'agingTrends', 'riskAssessment'],
      'cashFlowForecast': ['dailyForecast', 'weeklyForecast', 'monthlyForecast', 'forecastConfidence'],
      // Add more categories as needed
    };
    
    // Check if metric belongs to any allowed category
    for (const category of allowedMetrics) {
      if (metricCategories[category] && metricCategories[category].includes(metricKey)) {
        return true;
      }
    }
    
    return false;
  }
}
