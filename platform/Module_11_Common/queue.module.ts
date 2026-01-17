import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RabbitMQService } from './services/rabbitmq.service';
import { QueueHealthService } from './services/queue-health.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'DISTRIBUTION_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              `amqp://${configService.get('RABBITMQ_USER', 'invoice_user')}:${configService.get(
                'RABBITMQ_PASSWORD',
                'invoice_password',
              )}@${configService.get('RABBITMQ_HOST', 'localhost')}:${configService.get('RABBITMQ_PORT', '5672')}`,
            ],
            queue: 'invoice_distribution_queue',
            queueOptions: {
              durable: true,
            },
            persistent: true,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [RabbitMQService, QueueHealthService],
  exports: [RabbitMQService, QueueHealthService],
})
export class QueueModule {}
