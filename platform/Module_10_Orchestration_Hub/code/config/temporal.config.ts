/**
 * Temporal Workflow Engine Configuration
 * 
 * Configures Temporal client, workers, and workflow execution settings
 * for Module 10 orchestration system
 */

import { NativeConnection, WorkflowClient } from '@temporalio/client';
import { Worker, Runtime } from '@temporalio/worker';
import * as activities from '../activities';

export interface TemporalConfig {
    address: string;
    namespace: string;
    taskQueue: string;
    maxConcurrentWorkflowTaskExecutions: number;
    maxConcurrentActivityTaskExecutions: number;
}

/**
 * Get Temporal configuration from environment variables
 */
export function getTemporalConfig(): TemporalConfig {
    return {
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
        namespace: process.env.TEMPORAL_NAMESPACE || 'sme-platform',
        taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'orchestration-queue',
        maxConcurrentWorkflowTaskExecutions: parseInt(
            process.env.TEMPORAL_MAX_CONCURRENT_WORKFLOWS || '100',
            10
        ),
        maxConcurrentActivityTaskExecutions: parseInt(
            process.env.TEMPORAL_MAX_CONCURRENT_ACTIVITIES || '200',
            10
        ),
    };
}

/**
 * Create Temporal client connection
 */
export async function createTemporalClient(): Promise<WorkflowClient> {
    const config = getTemporalConfig();

    const connection = await NativeConnection.connect({
        address: config.address,
    });

    const client = new WorkflowClient({
        connection,
        namespace: config.namespace,
    });

    return client;
}

/**
 * Create and start Temporal worker
 */
export async function createTemporalWorker(): Promise<Worker> {
    const config = getTemporalConfig();

    const connection = await NativeConnection.connect({
        address: config.address,
    });

    // Set up worker runtime with optimized settings
    Runtime.install({
        telemetryOptions: {
            metrics: {
                prometheus: {
                    bindAddress: '0.0.0.0:9090',
                },
            },
        },
    });

    const worker = await Worker.create({
        connection,
        namespace: config.namespace,
        taskQueue: config.taskQueue,
        workflowsPath: require.resolve('../workflows'),
        activities,
        maxConcurrentWorkflowTaskExecutions: config.maxConcurrentWorkflowTaskExecutions,
        maxConcurrentActivityTaskExecutions: config.maxConcurrentActivityTaskExecutions,
    });

    return worker;
}

/**
 * Gracefully shutdown Temporal worker
 */
export async function shutdownTemporalWorker(worker: Worker): Promise<void> {
    await worker.shutdown();
}
