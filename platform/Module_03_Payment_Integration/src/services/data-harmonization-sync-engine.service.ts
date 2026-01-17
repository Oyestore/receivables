import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, Interval } from '@nestjs/schedule';

export interface DataMappingRule {
  sourceField: string;
  targetField: string;
  transformation: 'direct' | 'format' | 'calculate' | 'lookup';
  format?: string;
  calculation?: string;
  lookupTable?: string;
}

export interface SyncConfiguration {
  id: string;
  sourceSystem: string;
  targetSystem: string;
  mappingRules: DataMappingRule[];
  syncDirection: 'bidirectional' | 'source_to_target' | 'target_to_source';
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  conflictResolution: 'source_wins' | 'target_wins' | 'manual' | 'timestamp';
  isActive: boolean;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsUpdated: number;
  recordsCreated: number;
  recordsFailed: number;
  conflicts: ConflictRecord[];
  errors: SyncError[];
  duration: number;
}

export interface ConflictRecord {
  recordId: string;
  entityType: string;
  conflictType: 'data_mismatch' | 'version_conflict' | 'business_rule_violation';
  sourceData: any;
  targetData: any;
  resolution?: 'source' | 'target' | 'merge' | 'manual';
  resolvedAt?: Date;
}

export interface SyncError {
  recordId: string;
  errorType: 'validation' | 'transformation' | 'connection' | 'business_rule';
  errorMessage: string;
  sourceData: any;
  retryCount: number;
}

@Injectable()
export class DataHarmonizationService {
  private readonly logger = new Logger(DataHarmonizationService.name);
  private syncConfigurations: Map<string, SyncConfiguration> = new Map();
  private activeSyncs: Map<string, boolean> = new Map();

  constructor(
    @InjectRepository(SyncConfiguration)
    private readonly syncConfigRepository: Repository<SyncConfiguration>,
    @InjectRepository(ConflictRecord)
    private readonly conflictRepository: Repository<ConflictRecord>,
    @InjectRepository(SyncError)
    private readonly errorRepository: Repository<SyncError>,
  ) {}

  async createSyncConfiguration(config: Partial<SyncConfiguration>): Promise<SyncConfiguration> {
    const syncConfig = this.syncConfigRepository.create({
      ...config,
      id: this.generateId(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedConfig = await this.syncConfigRepository.save(syncConfig);
    this.syncConfigurations.set(savedConfig.id, savedConfig);
    
    this.logger.log(`Created sync configuration: ${savedConfig.id}`);
    return savedConfig;
  }

  async updateSyncConfiguration(id: string, updates: Partial<SyncConfiguration>): Promise<SyncConfiguration> {
    const existingConfig = await this.syncConfigRepository.findOne({ where: { id } });
    if (!existingConfig) {
      throw new Error(`Sync configuration ${id} not found`);
    }

    const updatedConfig = await this.syncConfigRepository.save({
      ...existingConfig,
      ...updates,
      updatedAt: new Date(),
    });

    this.syncConfigurations.set(id, updatedConfig);
    this.logger.log(`Updated sync configuration: ${id}`);
    return updatedConfig;
  }

  async performDataSync(configId: string): Promise<SyncResult> {
    const config = this.syncConfigurations.get(configId);
    if (!config || !config.isActive) {
      throw new Error(`Sync configuration ${configId} not found or inactive`);
    }

    if (this.activeSyncs.get(configId)) {
      throw new Error(`Sync already in progress for configuration ${configId}`);
    }

    this.activeSyncs.set(configId, true);
    const startTime = Date.now();

    try {
      this.logger.log(`Starting data sync for configuration: ${configId}`);
      
      let result: SyncResult = {
        success: false,
        recordsProcessed: 0,
        recordsUpdated: 0,
        recordsCreated: 0,
        recordsFailed: 0,
        conflicts: [],
        errors: [],
        duration: 0,
      };

      switch (config.sourceSystem) {
        case 'zoho_books':
          result = await this.syncFromZohoBooks(config);
          break;
        case 'busy_accounting':
          result = await this.syncFromBusyAccounting(config);
          break;
        case 'marg_erp':
          result = await this.syncFromMargERP(config);
          break;
        case 'quickbooks_india':
          result = await this.syncFromQuickBooksIndia(config);
          break;
        default:
          throw new Error(`Unsupported source system: ${config.sourceSystem}`);
      }

      result.duration = Date.now() - startTime;
      
      // Handle conflicts
      if (result.conflicts.length > 0) {
        await this.resolveConflicts(config, result.conflicts);
      }

      // Log sync completion
      this.logger.log(`Data sync completed for ${configId}: ${result.recordsProcessed} records processed in ${result.duration}ms`);
      
      return result;

    } catch (error) {
      this.logger.error(`Data sync failed for ${configId}:`, error);
      throw error;
    } finally {
      this.activeSyncs.set(configId, false);
    }
  }

  private async syncFromZohoBooks(config: SyncConfiguration): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      recordsFailed: 0,
      conflicts: [],
      errors: [],
      duration: 0,
    };

    try {
      // Fetch data from Zoho Books
      const zohoData = await this.fetchZohoBooksData(config);
      
      // Transform and harmonize data
      for (const record of zohoData) {
        try {
          const harmonizedData = await this.transformData(record, config.mappingRules);
          
          // Check for conflicts
          const conflict = await this.detectConflict(harmonizedData, config.targetSystem);
          if (conflict) {
            result.conflicts.push(conflict);
            continue;
          }

          // Sync to target system
          const syncResult = await this.syncToTargetSystem(harmonizedData, config.targetSystem);
          
          if (syncResult.created) {
            result.recordsCreated++;
          } else {
            result.recordsUpdated++;
          }
          
          result.recordsProcessed++;
        } catch (error) {
          result.recordsFailed++;
          result.errors.push({
            recordId: record.id,
            errorType: 'transformation',
            errorMessage: error.message,
            sourceData: record,
            retryCount: 0,
          });
        }
      }

      result.success = result.recordsFailed === 0;
      return result;

    } catch (error) {
      this.logger.error('Zoho Books sync failed:', error);
      result.success = false;
      return result;
    }
  }

  private async syncFromBusyAccounting(config: SyncConfiguration): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      recordsFailed: 0,
      conflicts: [],
      errors: [],
      duration: 0,
    };

    try {
      // Fetch data from Busy Accounting
      const busyData = await this.fetchBusyAccountingData(config);
      
      // Transform and harmonize data
      for (const record of busyData) {
        try {
          const harmonizedData = await this.transformData(record, config.mappingRules);
          
          // Check for conflicts
          const conflict = await this.detectConflict(harmonizedData, config.targetSystem);
          if (conflict) {
            result.conflicts.push(conflict);
            continue;
          }

          // Sync to target system
          const syncResult = await this.syncToTargetSystem(harmonizedData, config.targetSystem);
          
          if (syncResult.created) {
            result.recordsCreated++;
          } else {
            result.recordsUpdated++;
          }
          
          result.recordsProcessed++;
        } catch (error) {
          result.recordsFailed++;
          result.errors.push({
            recordId: record.id,
            errorType: 'transformation',
            errorMessage: error.message,
            sourceData: record,
            retryCount: 0,
          });
        }
      }

      result.success = result.recordsFailed === 0;
      return result;

    } catch (error) {
      this.logger.error('Busy Accounting sync failed:', error);
      result.success = false;
      return result;
    }
  }

  private async syncFromMargERP(config: SyncConfiguration): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      recordsFailed: 0,
      conflicts: [],
      errors: [],
      duration: 0,
    };

    try {
      // Fetch data from Marg ERP
      const margData = await this.fetchMargERPData(config);
      
      // Transform and harmonize data
      for (const record of margData) {
        try {
          const harmonizedData = await this.transformData(record, config.mappingRules);
          
          // Check for conflicts
          const conflict = await this.detectConflict(harmonizedData, config.targetSystem);
          if (conflict) {
            result.conflicts.push(conflict);
            continue;
          }

          // Sync to target system
          const syncResult = await this.syncToTargetSystem(harmonizedData, config.targetSystem);
          
          if (syncResult.created) {
            result.recordsCreated++;
          } else {
            result.recordsUpdated++;
          }
          
          result.recordsProcessed++;
        } catch (error) {
          result.recordsFailed++;
          result.errors.push({
            recordId: record.id,
            errorType: 'transformation',
            errorMessage: error.message,
            sourceData: record,
            retryCount: 0,
          });
        }
      }

      result.success = result.recordsFailed === 0;
      return result;

    } catch (error) {
      this.logger.error('Marg ERP sync failed:', error);
      result.success = false;
      return result;
    }
  }

  private async syncFromQuickBooksIndia(config: SyncConfiguration): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsUpdated: 0,
      recordsCreated: 0,
      recordsFailed: 0,
      conflicts: [],
      errors: [],
      duration: 0,
    };

    try {
      // Fetch data from QuickBooks India
      const quickbooksData = await this.fetchQuickBooksIndiaData(config);
      
      // Transform and harmonize data
      for (const record of quickbooksData) {
        try {
          const harmonizedData = await this.transformData(record, config.mappingRules);
          
          // Check for conflicts
          const conflict = await this.detectConflict(harmonizedData, config.targetSystem);
          if (conflict) {
            result.conflicts.push(conflict);
            continue;
          }

          // Sync to target system
          const syncResult = await this.syncToTargetSystem(harmonizedData, config.targetSystem);
          
          if (syncResult.created) {
            result.recordsCreated++;
          } else {
            result.recordsUpdated++;
          }
          
          result.recordsProcessed++;
        } catch (error) {
          result.recordsFailed++;
          result.errors.push({
            recordId: record.id,
            errorType: 'transformation',
            errorMessage: error.message,
            sourceData: record,
            retryCount: 0,
          });
        }
      }

      result.success = result.recordsFailed === 0;
      return result;

    } catch (error) {
      this.logger.error('QuickBooks India sync failed:', error);
      result.success = false;
      return result;
    }
  }

  private async transformData(sourceData: any, mappingRules: DataMappingRule[]): Promise<any> {
    const transformedData: any = {};

    for (const rule of mappingRules) {
      const sourceValue = this.getNestedValue(sourceData, rule.sourceField);
      
      switch (rule.transformation) {
        case 'direct':
          transformedData[rule.targetField] = sourceValue;
          break;
        case 'format':
          transformedData[rule.targetField] = this.formatValue(sourceValue, rule.format);
          break;
        case 'calculate':
          transformedData[rule.targetField] = this.calculateValue(sourceData, rule.calculation);
          break;
        case 'lookup':
          transformedData[rule.targetField] = await this.lookupValue(sourceValue, rule.lookupTable);
          break;
      }
    }

    return transformedData;
  }

  private async detectConflict(data: any, targetSystem: string): Promise<ConflictRecord | null> {
    // Check if record exists in target system
    const existingRecord = await this.findExistingRecord(data, targetSystem);
    
    if (!existingRecord) {
      return null;
    }

    // Compare data for conflicts
    const conflicts = this.compareData(data, existingRecord);
    
    if (conflicts.length > 0) {
      return {
        recordId: data.id || existingRecord.id,
        entityType: data.entityType,
        conflictType: 'data_mismatch',
        sourceData: data,
        targetData: existingRecord,
      };
    }

    return null;
  }

  private async resolveConflicts(config: SyncConfiguration, conflicts: ConflictRecord[]): Promise<void> {
    for (const conflict of conflicts) {
      switch (config.conflictResolution) {
        case 'source_wins':
          await this.syncToTargetSystem(conflict.sourceData, config.targetSystem);
          conflict.resolution = 'source';
          break;
        case 'target_wins':
          conflict.resolution = 'target';
          break;
        case 'merge':
          const mergedData = await this.mergeData(conflict.sourceData, conflict.targetData);
          await this.syncToTargetSystem(mergedData, config.targetSystem);
          conflict.resolution = 'merge';
          break;
        case 'manual':
          // Flag for manual resolution
          break;
      }
      
      conflict.resolvedAt = new Date();
      await this.conflictRepository.save(conflict);
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private formatValue(value: any, format: string): any {
    switch (format) {
      case 'date':
        return new Date(value).toISOString();
      case 'currency':
        return parseFloat(value).toFixed(2);
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      default:
        return value;
    }
  }

  private calculateValue(data: any, calculation: string): any {
    // Simple calculation engine
    try {
      // Replace placeholders with actual values
      let expression = calculation;
      Object.keys(data).forEach(key => {
        expression = expression.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), data[key]);
      });
      
      // Evaluate expression (use safe evaluation in production)
      return eval(expression);
    } catch (error) {
      this.logger.error('Calculation failed:', error);
      return null;
    }
  }

  private async lookupValue(value: any, lookupTable: string): Promise<any> {
    // Implement lookup table logic
    // This would typically query a database or external service
    return value; // Placeholder
  }

  private compareData(source: any, target: any): string[] {
    const conflicts: string[] = [];
    
    Object.keys(source).forEach(key => {
      if (target[key] !== undefined && source[key] !== target[key]) {
        conflicts.push(key);
      }
    });
    
    return conflicts;
  }

  private async mergeData(source: any, target: any): Promise<any> {
    // Simple merge logic - prioritize non-null values
    const merged = { ...target };
    
    Object.keys(source).forEach(key => {
      if (source[key] !== null && source[key] !== undefined) {
        merged[key] = source[key];
      }
    });
    
    return merged;
  }

  private async fetchZohoBooksData(config: SyncConfiguration): Promise<any[]> {
    // Implement Zoho Books data fetching
    return []; // Placeholder
  }

  private async fetchBusyAccountingData(config: SyncConfiguration): Promise<any[]> {
    // Implement Busy Accounting data fetching
    return []; // Placeholder
  }

  private async fetchMargERPData(config: SyncConfiguration): Promise<any[]> {
    // Implement Marg ERP data fetching
    return []; // Placeholder
  }

  private async fetchQuickBooksIndiaData(config: SyncConfiguration): Promise<any[]> {
    // Implement QuickBooks India data fetching
    return []; // Placeholder
  }

  private async findExistingRecord(data: any, targetSystem: string): Promise<any> {
    // Implement record existence check
    return null; // Placeholder
  }

  private async syncToTargetSystem(data: any, targetSystem: string): Promise<{ created: boolean }> {
    // Implement target system sync
    return { created: false }; // Placeholder
  }

  @Interval(60000) // Check for scheduled syncs every minute
  private async processScheduledSyncs(): Promise<void> {
    const now = new Date();
    const configs = await this.syncConfigRepository.find({ where: { isActive: true } });

    for (const config of configs) {
      if (this.shouldRunSync(config, now)) {
        try {
          await this.performDataSync(config.id);
        } catch (error) {
          this.logger.error(`Scheduled sync failed for ${config.id}:`, error);
        }
      }
    }
  }

  private shouldRunSync(config: SyncConfiguration, now: Date): boolean {
    switch (config.syncFrequency) {
      case 'realtime':
        return true;
      case 'hourly':
        return now.getMinutes() === 0;
      case 'daily':
        return now.getHours() === 0 && now.getMinutes() === 0;
      case 'weekly':
        return now.getDay() === 0 && now.getHours() === 0 && now.getMinutes() === 0;
      default:
        return false;
    }
  }

  @Cron('0 2 * * *') // Daily at 2 AM - cleanup old conflicts and errors
  private async cleanupOldRecords(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago

    await this.conflictRepository.delete({
      resolvedAt: {
        $lt: cutoffDate,
      },
    });

    await this.errorRepository.delete({
      createdAt: {
        $lt: cutoffDate,
      },
    });

    this.logger.log('Cleaned up old conflict and error records');
  }

  private generateId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getSyncStatus(configId: string): Promise<any> {
    const config = this.syncConfigurations.get(configId);
    const isActive = this.activeSyncs.get(configId);
    
    return {
      configId,
      isActive: !!isActive,
      sourceSystem: config?.sourceSystem,
      targetSystem: config?.targetSystem,
      lastSync: config?.updatedAt,
      syncFrequency: config?.syncFrequency,
    };
  }

  async getSyncMetrics(): Promise<any> {
    const totalConfigs = this.syncConfigurations.size;
    const activeConfigs = Array.from(this.syncConfigurations.values()).filter(c => c.isActive).length;
    const runningSyncs = Array.from(this.activeSyncs.values()).filter(active => active).length;

    return {
      totalConfigurations: totalConfigs,
      activeConfigurations: activeConfigs,
      runningSyncs: runningSyncs,
      lastUpdated: new Date(),
    };
  }
}
