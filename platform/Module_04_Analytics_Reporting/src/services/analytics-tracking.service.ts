import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class AnalyticsTrackingService {
  private readonly logger = new Logger(AnalyticsTrackingService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepository: Repository<AnalyticsEvent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async trackEvent(
    eventType: string,
    entityType: string,
    entityId: string,
    userId: string,
    properties: Record<string, any> = {},
    sessionId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    try {
      const event = this.analyticsEventRepository.create({
        eventType,
        entityType,
        entityId,
        userId,
        sessionId,
        properties,
        ipAddress,
        userAgent,
      });

      await this.analyticsEventRepository.save(event);
      
      this.logger.log(`Event tracked: ${eventType} for ${entityType}:${entityId}`);
    } catch (error) {
      this.logger.error('Error tracking event:', error);
    }
  }

  async trackDashboardView(dashboardId: string, userId: string, properties: any = {}): Promise<void> {
    await this.trackEvent(
      'dashboard_view',
      'dashboard',
      dashboardId,
      userId,
      {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async trackWidgetInteraction(
    widgetId: string,
    userId: string,
    interactionType: string,
    properties: any = {},
  ): Promise<void> {
    await this.trackEvent(
      'widget_interaction',
      'widget',
      widgetId,
      userId,
      {
        interactionType,
        ...properties,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async trackReportGeneration(
    reportId: string,
    userId: string,
    reportType: string,
    properties: any = {},
  ): Promise<void> {
    await this.trackEvent(
      'report_generation',
      'report',
      reportId,
      userId,
      {
        reportType,
        ...properties,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async trackUserLogin(userId: string, properties: any = {}): Promise<void> {
    await this.trackEvent(
      'user_login',
      'user',
      userId,
      userId,
      {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async trackUserLogout(userId: string, properties: any = {}): Promise<void> {
    await this.trackEvent(
      'user_logout',
      'user',
      userId,
      userId,
      {
        ...properties,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async trackApiUsage(
    endpoint: string,
    userId: string,
    method: string,
    statusCode: number,
    responseTime: number,
    properties: any = {},
  ): Promise<void> {
    await this.trackEvent(
      'api_usage',
      'api',
      endpoint,
      userId,
      {
        method,
        statusCode,
        responseTime,
        ...properties,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async trackError(
    errorType: string,
    entityType: string,
    entityId: string,
    userId: string,
    errorMessage: string,
    properties: any = {},
  ): Promise<void> {
    await this.trackEvent(
      'error',
      entityType,
      entityId,
      userId,
      {
        errorType,
        errorMessage,
        ...properties,
        timestamp: new Date().toISOString(),
      },
    );
  }

  async getEventAnalytics(
    eventType: string,
    dateRange: { startDate: string; endDate: string },
    filters: any = {},
  ): Promise<any> {
    try {
      const query = this.analyticsEventRepository.createQueryBuilder('event')
        .where('event.eventType = :eventType', { eventType })
        .andWhere('event.createdAt >= :startDate', { startDate: dateRange.startDate })
        .andWhere('event.createdAt <= :endDate', { endDate: dateRange.endDate });

      if (filters.userId) {
        query.andWhere('event.userId = :userId', { userId: filters.userId });
      }

      if (filters.entityType) {
        query.andWhere('event.entityType = :entityType', { entityType: filters.entityType });
      }

      const events = await query.getMany();

      return {
        totalEvents: events.length,
        eventsByDate: this.groupEventsByDate(events),
        uniqueUsers: new Set(events.map(e => e.userId)).size,
        topEntities: this.getTopEntities(events),
        averageEventsPerDay: events.length / this.getDaysBetween(dateRange.startDate, dateRange.endDate),
      };
    } catch (error) {
      this.logger.error('Error getting event analytics:', error);
      return null;
    }
  }

  async getUserActivitySummary(userId: string, dateRange: { startDate: string; endDate: string }): Promise<any> {
    try {
      const events = await this.analyticsEventRepository.find({
        where: {
          userId,
          createdAt: {
            $gte: new Date(dateRange.startDate),
            $lte: new Date(dateRange.endDate),
          },
        },
        order: { createdAt: 'DESC' },
      });

      const eventTypes = events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {});

      return {
        totalEvents: events.length,
        eventTypes,
        firstActivity: events.length > 0 ? events[events.length - 1].createdAt : null,
        lastActivity: events.length > 0 ? events[0].createdAt : null,
        activeDays: new Set(events.map(e => e.createdAt.toDateString())).size,
      };
    } catch (error) {
      this.logger.error('Error getting user activity summary:', error);
      return null;
    }
  }

  async getDashboardAnalytics(dashboardId: string, dateRange: { startDate: string; endDate: string }): Promise<any> {
    try {
      const events = await this.analyticsEventRepository.find({
        where: {
          entityType: 'dashboard',
          entityId: dashboardId,
          createdAt: {
            $gte: new Date(dateRange.startDate),
            $lte: new Date(dateRange.endDate),
          },
        },
        order: { createdAt: 'DESC' },
      });

      const views = events.filter(e => e.eventType === 'dashboard_view');
      const interactions = events.filter(e => e.eventType === 'widget_interaction');

      return {
        totalViews: views.length,
        totalInteractions: interactions.length,
        uniqueViewers: new Set(views.map(v => v.userId)).size,
        averageInteractionsPerView: views.length > 0 ? interactions.length / views.length : 0,
        viewsByDate: this.groupEventsByDate(views),
        topViewers: this.getTopUsers(views),
        mostInteractedWidgets: this.getMostInteractedWidgets(interactions),
      };
    } catch (error) {
      this.logger.error('Error getting dashboard analytics:', error);
      return null;
    }
  }

  private groupEventsByDate(events: AnalyticsEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      const date = event.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
  }

  private getTopEntities(events: AnalyticsEvent[]): Array<{ entityId: string; count: number }> {
    const entityCounts = events.reduce((acc, event) => {
      acc[event.entityId] = (acc[event.entityId] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(entityCounts)
      .map(([entityId, count]) => ({ entityId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getTopUsers(events: AnalyticsEvent[]): Array<{ userId: string; count: number }> {
    const userCounts = events.reduce((acc, event) => {
      if (event.userId) {
        acc[event.userId] = (acc[event.userId] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getMostInteractedWidgets(events: AnalyticsEvent[]): Array<{ widgetId: string; count: number }> {
    const widgetCounts = events.reduce((acc, event) => {
      const widgetId = event.properties?.widgetId;
      if (widgetId) {
        acc[widgetId] = (acc[widgetId] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(widgetCounts)
      .map(([widgetId, count]) => ({ widgetId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
