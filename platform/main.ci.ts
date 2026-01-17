import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModuleCI } from './app.module.ci';

async function bootstrap() {
  const app = await NestFactory.create(AppModuleCI);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
