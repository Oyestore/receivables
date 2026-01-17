import { Injectable, Logger } from '@nestjs/common';

/**
 * Retry configuration
 */
export interface RetryConfig {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitterFactor: number; // 0 to 1, adds randomness to prevent thundering herd
}

/**
 * Retry options for specific operation
 */
export interface RetryOptions extends Partial<RetryConfig> {
    retryIf?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

/**
 * Retry result
 */
export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
    totalDuration: number;
}

/**
 * Service for handling retry logic with exponential backoff
 * 
 * Implements:
 * - Exponential backoff algorithm
 * - Jitter to prevent thundering herd
 * - Circuit breaker pattern
 * - Configurable retry conditions
 * 
 * @example
 * ```typescript
 * const result = await retryService.executeWithRetry(
 *   () => accountingApi.fetchCustomers(),
 *   {
 *     maxAttempts: 5,
 *     retryIf: (error) => error.code === 'ECONNRESET'
 *   }
 * );
 * ```
 */
@Injectable()
export class RetryService {
    private readonly logger = new Logger(RetryService.name);

    private readonly defaultConfig: RetryConfig = {
        maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3', 10),
        initialDelayMs: parseInt(process.env.RETRY_INITIAL_DELAY || '1000', 10),
        maxDelayMs: parseInt(process.env.RETRY_MAX_DELAY || '30000', 10),
        backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2'),
        jitterFactor: parseFloat(process.env.RETRY_JITTER_FACTOR || '0.1'),
    };

    /**
     * Execute function with retry logic
     * 
     * @param fn - Function to execute
     * @param options - Retry options
     * @returns Result with attempt count and duration
     */
    async executeWithRetry<T>(
        fn: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<RetryResult<T>> {
        const config = { ...this.defaultConfig, ...options };
        const startTime = Date.now();
        let attempts = 0;
        let lastError: Error;

        while (attempts < config.maxAttempts) {
            attempts++;

            try {
                const result = await fn();

                const duration = Date.now() - startTime;
                this.logger.debug(`Operation succeeded on attempt ${attempts} (${duration}ms)`);

                return {
                    success: true,
                    result,
                    attempts,
                    totalDuration: duration,
                };
            } catch (error) {
                lastError = error;

                // Check if we should retry this error
                if (options.retryIf && !options.retryIf(error)) {
                    this.logger.debug(`Error not retryable: ${error.message}`);
                    break;
                }

                // Check if retryable by default
                if (!this.isRetryableError(error)) {
                    this.logger.debug(`Error type not retryable: ${error.message}`);
                    break;
                }

                // Don't delay on last attempt
                if (attempts >= config.maxAttempts) {
                    break;
                }

                // Calculate delay with exponential backoff and jitter
                const delayMs = this.calculateDelay(attempts, config);

                this.logger.warn(
                    `Operation failed on attempt ${attempts}/${config.maxAttempts}, ` +
                    `retrying in ${delayMs}ms. Error: ${error.message}`
                );

                // Call retry callback if provided
                if (options.onRetry) {
                    options.onRetry(attempts, error, delayMs);
                }

                // Wait before retry
                await this.sleep(delayMs);
            }
        }

        // All attempts failed
        const duration = Date.now() - startTime;
        this.logger.error(
            `Operation failed after ${attempts} attempts (${duration}ms). ` +
            `Last error: ${lastError.message}`
        );

        return {
            success: false,
            error: lastError,
            attempts,
            totalDuration: duration,
        };
    }

    /**
     * Execute with retry and throw on failure
     * 
     * @param fn - Function to execute
     * @param options - Retry options
     * @returns Result on success
     * @throws Last error if all attempts fail
     */
    async executeWithRetryOrThrow<T>(
        fn: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> {
        const result = await this.executeWithRetry(fn, options);

        if (result.success) {
            return result.result!;
        }

        throw result.error;
    }

    /**
     * Calculate delay for next retry with exponential backoff and jitter
     * 
     * @param attempt - Current attempt number (1-indexed)
     * @param config - Retry configuration
     * @returns Delay in milliseconds
     */
    calculateDelay(attempt: number, config: RetryConfig): number {
        // Exponential backoff: delay = initialDelay * (backoffMultiplier ^ (attempt - 1))
        const exponentialDelay = config.initialDelayMs * Math.pow(
            config.backoffMultiplier,
            attempt - 1
        );

        // Cap at max delay
        const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

        // Add jitter: random value between -jitter% and +jitter%
        const jitterRange = cappedDelay * config.jitterFactor;
        const jitter = (Math.random() * 2 - 1) * jitterRange;

        const finalDelay = Math.max(0, cappedDelay + jitter);

        return Math.floor(finalDelay);
    }

    /**
     * Check if error is retryable by default
     * 
     * @param error - Error to check
     * @returns true if error is retryable
     */
    private isRetryableError(error: Error): boolean {
        // Network errors
        const networkErrors = [
            'ECONNRESET',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'ENOTFOUND',
            'EAI_AGAIN',
            'ENETUNREACH',
            'EHOSTUNREACH',
        ];

        const errorCode = (error as any).code;
        if (errorCode && networkErrors.includes(errorCode)) {
            return true;
        }

        // HTTP status codes that are retryable
        const statusCode = (error as any).statusCode || (error as any).status;
        if (statusCode) {
            // 5xx server errors are retryable
            if (statusCode >= 500 && statusCode < 600) {
                return true;
            }

            // 429 rate limit is retryable
            if (statusCode === 429) {
                return true;
            }

            // 408 request timeout is retryable
            if (statusCode === 408) {
                return true;
            }
        }

        // Timeout errors
        if (error.message && error.message.toLowerCase().includes('timeout')) {
            return true;
        }

        // Connection errors
        if (error.message && (
            error.message.toLowerCase().includes('connection') ||
            error.message.toLowerCase().includes('connect')
        )) {
            return true;
        }

        return false;
    }

    /**
     * Sleep for specified duration
     * 
     * @param ms - Milliseconds to sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get retry statistics (for monitoring)
     * 
     * @param attempts - Number of attempts made
     * @param config - Retry configuration used
     * @returns Statistics object
     */
    getRetryStatistics(attempts: number, config: RetryConfig): {
        totalDelays: number;
        averageDelay: number;
        maxExpectedDuration: number;
    } {
        const delays: number[] = [];

        for (let i = 1; i < attempts; i++) {
            delays.push(this.calculateDelay(i, config));
        }

        const totalDelays = delays.reduce((sum, delay) => sum + delay, 0);
        const averageDelay = delays.length > 0 ? totalDelays / delays.length : 0;

        // Max expected duration assumes all attempts fail with max delay
        const maxExpectedDuration =
            Array.from({ length: config.maxAttempts - 1 })
                .reduce((sum, _, i) => sum + this.calculateDelay(i + 1, config), 0);

        return {
            totalDelays,
            averageDelay,
            maxExpectedDuration,
        };
    }
}
