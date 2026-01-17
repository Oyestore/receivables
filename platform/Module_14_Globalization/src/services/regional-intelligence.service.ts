import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegionConfig } from '../entities/region-config.entity';

@Injectable()
export class RegionalIntelligenceService {
    private readonly logger = new Logger(RegionalIntelligenceService.name);

    constructor(
        @InjectRepository(RegionConfig)
        private configRepo: Repository<RegionConfig>
    ) { }

    /**
     * Get the Regional Context for a Tenant.
     * Acts as the "Brain" for Date/Number formatting across the platform.
     */
    async getContext(tenantId: string): Promise<RegionConfig> {
        let config = await this.configRepo.findOne({ where: { tenantId } });
        if (!config) {
            // Default to India if not set
            config = this.configRepo.create({
                tenantId,
                locale: 'en-IN',
                timezone: 'Asia/Kolkata',
                dateFormat: 'DD/MM/YYYY',
                workingDays: [1, 2, 3, 4, 5, 6] // Mon-Sat
            });
            await this.configRepo.save(config);
        }
        return config;
    }

    /**
     * Update Regional Settings (Tenant Admin Action)
     */
    async updateContext(tenantId: string, settings: Partial<RegionConfig>): Promise<RegionConfig> {
        this.logger.log(`Updating Regional Context for Tenant ${tenantId}`);
        await this.configRepo.update({ tenantId }, settings);
        return this.getContext(tenantId);
    }

    /**
     * Example Utility: Calculate Due Date respecting Holidays/Weekends
     * This would be consumed by Module 05 (Milestones)
     */
    calculateBusinessDueDate(startDate: Date, days: number, context: RegionConfig): Date {
        // Logic to skip non-working days would go here
        // For now, simple date add
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + days);
        return dueDate;
    }
}
