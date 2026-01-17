import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TrackingService {
    private readonly logger = new Logger(TrackingService.name);
    private readonly baseUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.baseUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3000');
    }

    /**
     * Generate an invisible 1x1 pixel tracking URL
     */
    generateTrackingPixelUrl(assignmentId: string): string {
        // In reality, this would be signed with a hash to prevent tampering
        return `${this.baseUrl}/distribution/track/open/${assignmentId}`;
    }

    /**
     * Wrap a link to track clicks
     */
    generateTrackedLink(assignmentId: string, targetUrl: string): string {
        const encodedTarget = encodeURIComponent(targetUrl);
        return `${this.baseUrl}/distribution/track/click/${assignmentId}?target=${encodedTarget}`;
    }

    /**
     * Record an Open Event (called by Controller)
     */
    async trackOpen(assignmentId: string, userAgent: string, ip: string) {
        this.logger.log(`[Tracking] OPEN detected for ${assignmentId} from ${ip}`);
        // Here we would save to DB: TrackingEvent entity
        // await this.eventRepo.save(...)
    }

    /**
     * Record a Click Event (called by Controller)
     */
    async trackClick(assignmentId: string, targetUrl: string, userAgent: string, ip: string) {
        this.logger.log(`[Tracking] CLICK detected for ${assignmentId} -> ${targetUrl}`);
        // await this.eventRepo.save(...)
    }
}
