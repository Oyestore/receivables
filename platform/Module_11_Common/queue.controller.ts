import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { RabbitMQService } from '../services/rabbitmq.service';
import { QueueHealthService } from '../services/queue-health.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for queue management operations and health monitoring
 */
@ApiTags('queue')
@Controller('queue')
export class QueueController {
  private readonly logger = new Logger(QueueController.name);

  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly queueHealthService: QueueHealthService,
  ) {}

  /**
   * Get health metrics for all queues
   */
  @Get('health')
  @ApiOperation({ summary: 'Get queue health metrics' })
  @ApiResponse({ status: 200, description: 'Returns health metrics for all queues' })
  getQueueHealth() {
    return this.queueHealthService.getHealthMetrics();
  }

  /**
   * Get metrics for a specific queue
   */
  @Get('health/:queueName')
  @ApiOperation({ summary: 'Get metrics for a specific queue' })
  @ApiResponse({ status: 200, description: 'Returns metrics for the specified queue' })
  getQueueMetrics(@Param('queueName') queueName: string) {
    return this.queueHealthService.getQueueMetrics(queueName);
  }

  /**
   * Check if a specific channel queue is available
   */
  @Get('available/:channel')
  @ApiOperation({ summary: 'Check if a specific channel queue is available' })
  @ApiResponse({ status: 200, description: 'Returns availability status of the queue' })
  async isQueueAvailable(@Param('channel') channel: string) {
    const available = await this.rabbitMQService.isQueueAvailable(channel);
    return { channel, available };
  }

  /**
   * Reset all queue metrics
   */
  @Post('reset-metrics')
  @ApiOperation({ summary: 'Reset all queue metrics' })
  @ApiResponse({ status: 200, description: 'Queue metrics have been reset' })
  resetMetrics() {
    this.queueHealthService.resetMetrics();
    return { message: 'Queue metrics have been reset' };
  }

  /**
   * Send a test message to a specific channel queue
   */
  @Post('test/:channel')
  @ApiOperation({ summary: 'Send a test message to a specific channel queue' })
  @ApiResponse({ status: 200, description: 'Test message sent successfully' })
  async sendTestMessage(
    @Param('channel') channel: string,
    @Body() data: any,
  ) {
    this.logger.log(`Sending test message to ${channel} queue`);
    
    try {
      await this.rabbitMQService.sendDistribution({
        ...data,
        isTest: true,
        timestamp: new Date().toISOString(),
      }, channel).toPromise();
      
      return { 
        success: true, 
        message: `Test message sent to ${channel} queue successfully` 
      };
    } catch (error) {
      this.logger.error(`Error sending test message to ${channel} queue: ${error.message}`);
      return { 
        success: false, 
        message: `Failed to send test message: ${error.message}` 
      };
    }
  }
}
