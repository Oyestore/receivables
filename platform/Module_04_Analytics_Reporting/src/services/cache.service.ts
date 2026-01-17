import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { Dashboard } from '../entities/dashboard.entity';
import { DashboardWidget } from '../entities/dashboard-widget.entity';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;

  constructor(
    @InjectRepository(Dashboard)
    private readonly dashboardRepository: Repository<Dashboard>,
    @InjectRepository(DashboardWidget)
    private readonly widgetRepository: Repository<DashboardWidget>,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }

  async getDashboardCache(dashboardId: string): Promise<any | null> {
    try {
      const cacheKey = `dashboard:${dashboardId}`;
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error('Error getting dashboard cache:', error);
      return null;
    }
  }

  async setDashboardCache(dashboardId: string, data: any, ttl: number = 300): Promise<void> {
    try {
      const cacheKey = `dashboard:${dashboardId}`;
      await this.redis.setex(cacheKey, ttl, JSON.stringify(data));
    } catch (error) {
      this.logger.error('Error setting dashboard cache:', error);
    }
  }

  async getWidgetDataCache(widgetId: string): Promise<any | null> {
    try {
      const cacheKey = `widget_data:${widgetId}`;
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error('Error getting widget data cache:', error);
      return null;
    }
  }

  async setWidgetDataCache(widgetId: string, data: any, ttl: number = 60): Promise<void> {
    try {
      const cacheKey = `widget_data:${widgetId}`;
      await this.redis.setex(cacheKey, ttl, JSON.stringify(data));
    } catch (error) {
      this.logger.error('Error setting widget data cache:', error);
    }
  }

  async invalidateDashboardCache(dashboardId: string): Promise<void> {
    try {
      const cacheKey = `dashboard:${dashboardId}`;
      await this.redis.del(cacheKey);
      
      // Also invalidate all widget data caches for this dashboard
      const widgetDataPattern = `widget_data:${dashboardId}:*`;
      const keys = await this.redis.keys(widgetDataPattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error('Error invalidating dashboard cache:', error);
    }
  }

  async getAnalyticsCache(queryKey: string): Promise<any | null> {
    try {
      const cacheKey = `analytics:${queryKey}`;
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error('Error getting analytics cache:', error);
      return null;
    }
  }

  async setAnalyticsCache(queryKey: string, data: any, ttl: number = 300): Promise<void> {
    try {
      const cacheKey = `analytics:${queryKey}`;
      await this.redis.setex(cacheKey, ttl, JSON.stringify(data));
    } catch (error) {
      this.logger.error('Error setting analytics cache:', error);
    }
  }

  async warmupCache(dashboardId: string): Promise<void> {
    this.logger.log(`Warming up cache for dashboard: ${dashboardId}`);

    try {
      // Cache dashboard data
      const dashboard = await this.dashboardRepository.findOne({
        where: { id: dashboardId },
        relations: ['widgets', 'creator'],
      });

      if (dashboard) {
        await this.setDashboardCache(dashboardId, dashboard);
      }

      // Cache widget data
      const widgets = await this.widgetRepository.find({
        where: { dashboardId },
      });

      for (const widget of widgets) {
        // Mock widget data - in real implementation, this would fetch actual data
        const widgetData = await this.getWidgetData(widget);
        if (widgetData) {
          await this.setWidgetDataCache(widget.id, widgetData);
        }
      }

      this.logger.log(`Cache warmed up for dashboard: ${dashboardId}`);
    } catch (error) {
      this.logger.error('Error warming up cache:', error);
    }
  }

  private async getWidgetData(widget: DashboardWidget): Promise<any> {
    // Mock implementation - in real scenario, this would call analytics service
    switch (widget.type) {
      case 'chart':
        return {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Revenue',
            data: [12000, 19000, 15000, 25000, 22000, 30000],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          }],
        };

      case 'metric':
        return {
          value: 125000,
          label: 'Total Revenue',
          trend: 'up',
          trendValue: 12.5,
        };

      case 'table':
        return {
          columns: ['Name', 'Value', 'Status'],
          rows: [
            ['Product A', 5000, 'Active'],
            ['Product B', 7500, 'Active'],
            ['Product C', 3000, 'Inactive'],
          ],
        };

      default:
        return {};
    }
  }

  async clearCache(): Promise<void> {
    try {
      await this.redis.flushall();
      this.logger.log('Cache cleared successfully');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  async getCacheStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        memory: info,
        keyspace,
        connected: this.redis.status === 'connected',
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return null;
    }
  }
}
