/**
 * Analytics & Reporting Adapter (Module 04)
 * 
 * Adapter for Analytics & Reporting module
 */

import { Injectable } from '@nestjs/common';
import { ModuleName } from '../types/orchestration.types';
import { BaseModuleAdapter } from './base-module.adapter';

@Injectable()
export class AnalyticsReportingAdapter extends BaseModuleAdapter {
    readonly moduleName = ModuleName.ANALYTICS_REPORTING;
    readonly baseUrl: string;
    readonly version = '1.0.0';
    readonly capabilities = [
        'revenue_analytics',
        'aging_analysis',
        'custom_reports',
        'dashboard_generation',
        'kpi_tracking',
        'predictive_analytics',
    ];

    constructor() {
        super('AnalyticsReporting');
        this.baseUrl = process.env.MODULE_04_URL || 'http://localhost:3004';
        this.httpClient = this.initializeHttpClient(this.baseUrl);
    }

    async executeAction(action: string, params: Record<string, any>): Promise<any> {
        const headers = this.addTenantHeader(params);

        switch (action) {
            case 'getRevenueAnalytics':
                return this.getRevenueAnalytics(params.period, headers);

            case 'getAgingReport':
                return this.getAgingReport(headers);

            case 'getDashboard':
                return this.getDashboard(params.dashboardType, headers);

            case 'generateCustomReport':
                return this.generateCustomReport(params.reportConfig, headers);

            case 'getKPIs':
                return this.getKPIs(headers);

            case 'handleEvent':
                return this.handleEvent(params.event);

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    private async getRevenueAnalytics(period: string, headers: Record<string, string>): Promise<any> {
        const response = await this.httpClient.get(`/api/analytics/revenue?period=${period}`, {
            headers,
        });
        return response.data;
    }

    private async getAgingReport(headers: Record<string, string>): Promise<any> {
        const response = await this.httpClient.get('/api/analytics/aging', { headers });
        return response.data;
    }

    private async getDashboard(dashboardType: string, headers: Record<string, string>): Promise<any> {
        const response = await this.httpClient.get(`/api/dashboards/${dashboardType}`, { headers });
        return response.data;
    }

    private async generateCustomReport(
        reportConfig: any,
        headers: Record<string, string>
    ): Promise<any> {
        const response = await this.httpClient.post('/api/reports/custom', reportConfig, { headers });
        return response.data;
    }

    private async getKPIs(headers: Record<string, string>): Promise<any> {
        const response = await this.httpClient.get('/api/analytics/kpis', { headers });
        return response.data;
    }

    private async handleEvent(event: any): Promise<void> {
        this.logger.log(`Received event: ${event.type}`);
        // Analytics module can update metrics based on events
    }
}
