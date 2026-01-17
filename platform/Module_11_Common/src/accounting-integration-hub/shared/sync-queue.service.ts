import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Queue, Job } from 'bull';

/**
 * Sync job data structure
 */
export interface SyncJobData {
    tenantId: string;
    accountingSystem: string;
    operation: 'import_customers' | 'import_invoices' | 'export_invoice' | 'export_payment' | 'export_refund';
    entityType: string;
    entityId?: string;
    data?: any;
    priority?: number;
    retryCount?: number;
    initiatedBy?: string;
}

/**
 * Sync job result
 */
export interface SyncJobResult {
    success: boolean;
    recordsProcessed?: number;
    recordsSucceeded?: number;
    recordsFailed?: number;
    errors?: string[];
    duration?: number;
}

/**
 * Queue statistics
 */
export interface QueueStats {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
}

/**
 * Sync queue service using Bull for async job processing
 * 
 * Responsibilities:
 * - Queue sync operations
 * - Process jobs asynchronously
 * - Handle job retries
 * - Track job status
 * - Provide job statistics
 * 
 * @example
 * ```typescript
 * const jobId = await syncQueue.addJob({
 *   tenantId: 'tenant-123',
 *   accountingSystem: 'tally',
 *   operation: 'import_customers',
 *   entityType: 'customer',
 * });
 * ```
 */
@Injectable()
@Processor('accounting-sync')
export class SyncQueueService implements OnModuleInit {
    private readonly logger = new Logger(SyncQueueService.name);

    constructor(
        @InjectQueue('accounting-sync')
        private readonly syncQueue: Queue<SyncJobData>,
    ) { }

    async onModuleInit() {
        // Setup queue event listeners
        this.setupQueueListeners();
        this.logger.log('Sync queue service initialized');
    }

    /**
     * Add a sync job to the queue
     * 
     * @param data - Job data
     * @param options - Additional job options
     * @returns Job ID
     */
    async addJob(
        data: SyncJobData,
        options?: {
            priority?: number;
            delay?: number;
            attempts?: number;
            backoff?: number | { type: 'exponential' | 'fixed'; delay: number };
        }
    ): Promise<string> {
        try {
            const job = await this.syncQueue.add(data, {
                priority: options?.priority || data.priority || 5,
                delay: options?.delay,
                attempts: options?.attempts || 3,
                backoff: options?.backoff || {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: 100, // Keep last 100 completed jobs
                removeOnFail: 1000, // Keep last 1000 failed jobs for debugging
            });

            this.logger.log(
                `Queued sync job ${job.id} - ${data.operation} for ${data.accountingSystem} (tenant: ${data.tenantId})`
            );

            return job.id.toString();
        } catch (error) {
            this.logger.error(`Failed to queue sync job: ${error.message}`, error.stack);
            throw new Error(`Failed to queue sync job: ${error.message}`);
        }
    }

    /**
     * Add multiple jobs as a batch
     * 
     * @param jobs - Array of job data
     * @returns Array of job IDs
     */
    async addBatch(jobs: SyncJobData[]): Promise<string[]> {
        try {
            const bullJobs = await this.syncQueue.addBulk(
                jobs.map(data => ({
                    data,
                    opts: {
                        priority: data.priority || 5,
                        attempts: 3,
                        backoff: {
                            type: 'exponential' as const,
                            delay: 2000,
                        },
                    },
                }))
            );

            const jobIds = bullJobs.map(job => job.id.toString());

            this.logger.log(`Queued ${jobIds.length} sync jobs in batch`);

            return jobIds;
        } catch (error) {
            this.logger.error(`Failed to queue batch jobs: ${error.message}`, error.stack);
            throw new Error(`Failed to queue batch jobs: ${error.message}`);
        }
    }

    /**
     * Get job status
     * 
     * @param jobId - Job ID
     * @returns Job status and data
     */
    async getJobStatus(jobId: string): Promise<{
        id: string;
        state: string;
        progress: number;
        data: SyncJobData;
        result?: SyncJobResult;
        failedReason?: string;
        attemptsMade: number;
        timestamp: number;
    } | null> {
        try {
            const job = await this.syncQueue.getJob(jobId);

            if (!job) {
                return null;
            }

            const state = await job.getState();

            return {
                id: job.id.toString(),
                state,
                progress: job.progress(),
                data: job.data,
                result: job.returnvalue,
                failedReason: job.failedReason,
                attemptsMade: job.attemptsMade,
                timestamp: job.timestamp,
            };
        } catch (error) {
            this.logger.error(`Failed to get job status: ${error.message}`);
            return null;
        }
    }

    /**
     * Get queue statistics
     * 
     * @returns Queue stats
     */
    async getQueueStats(): Promise<QueueStats> {
        const counts = await this.syncQueue.getJobCounts();

        return {
            waiting: counts.waiting || 0,
            active: counts.active || 0,
            completed: counts.completed || 0,
            failed: counts.failed || 0,
            delayed: counts.delayed || 0,
            paused: counts.paused || 0,
        };
    }

    /**
     * Pause the queue (stop processing new jobs)
     */
    async pauseQueue(): Promise<void> {
        await this.syncQueue.pause();
        this.logger.warn('Sync queue paused');
    }

    /**
     * Resume the queue
     */
    async resumeQueue(): Promise<void> {
        await this.syncQueue.resume();
        this.logger.log('Sync queue resumed');
    }

    /**
     * Retry a failed job
     * 
     * @param jobId - Job ID to retry
     */
    async retryJob(jobId: string): Promise<void> {
        try {
            const job = await this.syncQueue.getJob(jobId);

            if (!job) {
                throw new Error(`Job ${jobId} not found`);
            }

            await job.retry();
            this.logger.log(`Retrying job ${jobId}`);
        } catch (error) {
            this.logger.error(`Failed to retry job ${jobId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Remove a job from the queue
     * 
     * @param jobId - Job ID to remove
     */
    async removeJob(jobId: string): Promise<void> {
        try {
            const job = await this.syncQueue.getJob(jobId);

            if (job) {
                await job.remove();
                this.logger.log(`Removed job ${jobId}`);
            }
        } catch (error) {
            this.logger.error(`Failed to remove job ${jobId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clean old jobs from the queue
     * 
     * @param grace - Grace period in milliseconds
     */
    async cleanOldJobs(grace: number = 24 * 60 * 60 * 1000): Promise<void> {
        try {
            const removed = await this.syncQueue.clean(grace, 'completed');
            this.logger.log(`Cleaned ${removed.length} completed jobs older than ${grace}ms`);

            const failedRemoved = await this.syncQueue.clean(grace * 7, 'failed'); // Keep failed jobs longer
            this.logger.log(`Cleaned ${failedRemoved.length} failed jobs older than ${grace * 7}ms`);
        } catch (error) {
            this.logger.error(`Failed to clean old jobs: ${error.message}`);
        }
    }

    /**
     * Get failed jobs for inspection
     * 
     * @param start - Start index
     * @param end - End index
     * @returns Array of failed jobs
     */
    async getFailedJobs(start: number = 0, end: number = 100): Promise<Job<SyncJobData>[]> {
        return this.syncQueue.getFailed(start, end);
    }

    /**
     * Process a sync job (called by Bull)
     * 
     * @param job - Job to process
     * @returns Job result
     */
    @Process()
    async processSyncJob(job: Job<SyncJobData>): Promise<SyncJobResult> {
        const startTime = Date.now();
        const { data } = job;

        this.logger.log(
            `Processing sync job ${job.id} - ${data.operation} for ${data.accountingSystem} ` +
            `(tenant: ${data.tenantId}, attempt: ${job.attemptsMade + 1})`
        );

        try {
            // Update progress
            await job.progress(10);

            // Actual sync logic would be delegated to AccountingHubService
            // For now, this is a placeholder that would be integrated
            const result = await this.executeSync(data);

            await job.progress(100);

            const duration = Date.now() - startTime;

            this.logger.log(
                `Completed sync job ${job.id} in ${duration}ms - ` +
                `Processed: ${result.recordsProcessed}, Succeeded: ${result.recordsSucceeded}`
            );

            return {
                success: true,
                ...result,
                duration,
            };
        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error(
                `Failed sync job ${job.id} after ${duration}ms (attempt ${job.attemptsMade + 1}): ${error.message}`,
                error.stack
            );

            // Determine if this should be retried
            const shouldRetry = this.shouldRetryJob(error, job.attemptsMade);

            if (!shouldRetry && job.attemptsMade >= (job.opts.attempts || 3) - 1) {
                this.logger.error(`Job ${job.id} failed permanently after ${job.attemptsMade + 1} attempts`);
            }

            throw error; // Bull will handle retry based on configuration
        }
    }

    // ==========================================
    // PRIVATE METHODS
    // ==========================================

    /**
     * Execute the actual sync operation
     * This is a placeholder - real implementation would call AccountingHubService
     */
    private async executeSync(data: SyncJobData): Promise<Partial<SyncJobResult>> {
        // Placeholder for actual sync logic
        // In production, this would call the appropriate AccountingHubService method

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
            recordsProcessed: 1,
            recordsSucceeded: 1,
            recordsFailed: 0,
        };
    }

    /**
     * Determine if job should be retried
     */
    private shouldRetryJob(error: Error, attemptsMade: number): boolean {
        // Don't retry if max attempts reached
        if (attemptsMade >= 3) {
            return false;
        }

        // Retry on transient errors
        const retryableErrors = [
            'ECONNRESET',
            'ETIMEDOUT',
            'ECONNREFUSED',
            'ENOTFOUND',
        ];

        const errorCode = (error as any).code;
        if (errorCode && retryableErrors.includes(errorCode)) {
            return true;
        }

        // Retry on 5xx errors
        const statusCode = (error as any).statusCode;
        if (statusCode && statusCode >= 500) {
            return true;
        }

        return false;
    }

    /**
     * Setup queue event listeners
     */
    private setupQueueListeners(): void {
        this.syncQueue.on('error', (error) => {
            this.logger.error(`Queue error: ${error.message}`, error.stack);
        });

        this.syncQueue.on('waiting', (jobId) => {
            this.logger.debug(`Job ${jobId} is waiting`);
        });

        this.syncQueue.on('active', (job) => {
            this.logger.debug(`Job ${job.id} started processing`);
        });

        this.syncQueue.on('completed', (job, result) => {
            this.logger.debug(`Job ${job.id} completed successfully`);
        });

        this.syncQueue.on('failed', (job, error) => {
            this.logger.warn(`Job ${job.id} failed: ${error.message}`);
        });

        this.syncQueue.on('stalled', (job) => {
            this.logger.warn(`Job ${job.id} stalled`);
        });
    }
}
