import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityService } from './security.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TenantService } from './code/multi-tenancy/tenant.service';
import { Logger } from './code/logging/logger';

/**
 * Core module for the Financing Module
 * 
 * This module provides fundamental services and utilities used across
 * all financing features. It handles cross-cutting concerns like security,
 * multi-tenancy, logging, and integration with other modules.
 */
@Module({
  imports: [
    // Import TypeORM for entity repositories
    TypeOrmModule.forFeature([
      // Core entities will be added here
    ]),
  ],
  providers: [
    SecurityService,
    TenantService,
    Logger,
    ConfigService,
    JwtService,
  ],
  exports: [
    SecurityService,
    TenantService,
    Logger,
  ],
})
export class CoreModule {}
