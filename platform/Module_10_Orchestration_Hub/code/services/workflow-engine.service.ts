/**
 * Workflow Engine Service
 * 
 * Core service for managing Temporal workflows, providing high-level API
 * for workflow execution, monitoring, and management
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { WorkflowClient, WorkflowHandle } from '@temporalio/client';
import { Worker } from '@temporalio/worker';
import {
    createTemporalClient,
    createTemporalWorker,
    shutdownTemporalWorker,
} from '../config/temporal.config';
import {
    IWorkflowExecution,
    WorkflowStatus,
    WorkflowPriority,
} from '../types/orchestration.types';
import { overdueInvoiceFollowUpWorkflow, OverdueInvoiceFollowUpInput } from '../workflows/overdue-invoice-follow-up.workflow';

@Injectable()
export class WorkflowEngineService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(WorkflowEngineService.name);
    private client: WorkflowClient | null = null;
    private worker: Worker | null = null;
    private readonly activeWorkflows: Map<string, WorkflowHandle> = new Map();

    /**
     * Initialize Temporal client and worker on module startup
     */
    async onModuleInit(): Promise<void> {
        try {
            this.logger.log('Initializing Workflow Engine Service...');

            // Create Temporal client
            this.client = await createTemporalClient();
            this.logger.log('Temporal client connected');

            // Create and start Temporal worker
            this.worker = await createTemporalWorker();
            await this.worker.run();
            this.logger.log('Temporal worker started');

            this.logger.log('Workflow Engine Service initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Workflow Engine Service', error);
            throw error;
        }
    }

    /**
     * Cleanup on module destruction
     */
    async onModuleDestroy(): Promise<void> {
        try {
            this.logger.log('Shutting down Workflow Engine Service...');

            if (this.worker) {
                await shutdownTemporalWorker(this.worker);
                this.logger.log('Temporal worker shut down');
            }

            this.activeWorkflows.clear();
            this.logger.log('Workflow Engine Service shut down successfully');
        } catch (error) {
            this.logger.error('Error during Workflow Engine Service shutdown', error);
        }
    }

    /**
     * Start overdue invoice follow-up workflow
     */
    async startOverdueInvoiceFollowUp(
        input: OverdueInvoiceFollowUpInput
    ): Promise<IWorkflowExecution> {
        if (!this.client) {
            throw new Error('Workflow client not initialized');
        }

        const workflowId = `overdue-invoice-${input.invoiceId}-${Date.now()}`;

        try {
            this.logger.log(`Starting overdue invoice follow-up workflow: ${workflowId}`);

            const handle = await this.client.start(overdueInvoiceFollowUpWorkflow, {
                taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'orchestration-queue',
                workflowId,
                args: [input],
            });

            this.activeWorkflows.set(workflowId, handle);

            const execution: IWorkflowExecution = {
                id: workflowId,
                tenant_id: input.tenantId,
                workflow_id: 'overdue-invoice-follow-up',
                workflow_name: 'Overdue Invoice Follow-up',
                status: WorkflowStatus.RUNNING,
                priority: WorkflowPriority.NORMAL,
                input_data: input,
                execution_path: ['started'],
                started_at: new Date(),
                created_by: input.userId,
            };

            this.logger.log(`Workflow started successfully: ${workflowId}`);

            return execution;
        } catch (error) {
            this.logger.error(`Failed to start workflow: ${workflowId}`, error);
            throw error;
        }
    }

    /**
     * Get workflow status
     */
    async getWorkflowStatus(workflowId: string): Promise<IWorkflowExecution> {
        if (!this.client) {
            throw new Error('Workflow client not initialized');
        }

        try {
            const handle = this.client.getHandle(workflowId);
            const description = await handle.describe();

            const status = this.mapTemporalStatusToWorkflowStatus(description.status.name);

            const execution: IWorkflowExecution = {
                id: workflowId,
                tenant_id: '', // Would need to be retrieved from workflow input
                workflow_id: description.workflowType,
                workflow_name: description.workflowType,
                status,
                priority: WorkflowPriority.NORMAL,
                input_data: {},
                execution_path: [],
                started_at: description.startTime,
                created_by: '',
            };

            if (status === WorkflowStatus.COMPLETED || status === WorkflowStatus.FAILED) {
                execution.completed_at = new Date();
                execution.execution_duration_ms = execution.completed_at.getTime() - execution.started_at.getTime();
            }

            return execution;
        } catch (error) {
            this.logger.error(`Failed to get workflow status: ${workflowId}`, error);
            throw error;
        }
    }

    /**
     * Get workflow result (wait for completion)
     */
    async getWorkflowResult<T = any>(workflowId: string): Promise<T> {
        if (!this.client) {
            throw new Error('Workflow client not initialized');
        }

        try {
            const handle = this.client.getHandle(workflowId);
            const result = await handle.result();

            this.activeWorkflows.delete(workflowId);
            this.logger.log(`Workflow completed: ${workflowId}`);

            return result as T;
        } catch (error) {
            this.logger.error(`Workflow failed: ${workflowId}`, error);
            this.activeWorkflows.delete(workflowId);
            throw error;
        }
    }

    /**
     * Cancel a running workflow
     */
    async cancelWorkflow(workflowId: string, reason?: string): Promise<void> {
        if (!this.client) {
            throw new Error('Workflow client not initialized');
        }

        try {
            const handle = this.client.getHandle(workflowId);
            await handle.cancel();

            this.activeWorkflows.delete(workflowId);
            this.logger.log(`Workflow cancelled: ${workflowId}, Reason: ${reason || 'No reason provided'}`);
        } catch (error) {
            this.logger.error(`Failed to cancel workflow: ${workflowId}`, error);
            throw error;
        }
    }

    /**
     * Send signal to workflow (e.g., payment received)
     */
    async signalWorkflow<T = any>(
        workflowId: string,
        signalName: string,
        args: T
    ): Promise<void> {
        if (!this.client) {
            throw new Error('Workflow client not initialized');
        }

        try {
            const handle = this.client.getHandle(workflowId);
            await handle.signal(signalName, args);

            this.logger.log(`Signal sent to workflow: ${workflowId}, Signal: ${signalName}`);
        } catch (error) {
            this.logger.error(`Failed to send signal to workflow: ${workflowId}`, error);
            throw error;
        }
    }

    /**
     * Query workflow state
     */
    async queryWorkflow<T = any>(
        workflowId: string,
        queryName: string
    ): Promise<T> {
        if (!this.client) {
            throw new Error('Workflow client not initialized');
        }

        try {
            const handle = this.client.getHandle(workflowId);
            const result = await handle.query(queryName);

            return result as T;
        } catch (error) {
            this.logger.error(`Failed to query workflow: ${workflowId}`, error);
            throw error;
        }
    }

    /**
     * List active workflows for a tenant
     */
    async listActiveWorkflows(tenantId: string): Promise<IWorkflowExecution[]> {
        if (!this.client) {
            throw new Error('Workflow client not initialized');
        }

        try {
            // This is a simplified version - in production, would use Temporal's list API
            const executions: IWorkflowExecution[] = [];

            for (const [workflowId, handle] of this.activeWorkflows.entries()) {
                try {
                    const description = await handle.describe();

                    executions.push({
                        id: workflowId,
                        tenant_id: tenantId,
                        workflow_id: description.workflowType,
                        workflow_name: description.workflowType,
                        status: this.mapTemporalStatusToWorkflowStatus(description.status.name),
                        priority: WorkflowPriority.NORMAL,
                        input_data: {},
                        execution_path: [],
                        started_at: description.startTime,
                        created_by: '',
                    });
                } catch (error) {
                    this.logger.warn(`Failed to describe workflow: ${workflowId}`, error);
                }
            }

            return executions;
        } catch (error) {
            this.logger.error('Failed to list active workflows', error);
            throw error;
        }
    }

    /**
     * Map Temporal workflow status to our WorkflowStatus enum
     */
    private mapTemporalStatusToWorkflowStatus(temporalStatus: string): WorkflowStatus {
        switch (temporalStatus) {
            case 'RUNNING':
                return WorkflowStatus.RUNNING;
            case 'COMPLETED':
                return WorkflowStatus.COMPLETED;
            case 'FAILED':
                return WorkflowStatus.FAILED;
            case 'CANCELED':
                return WorkflowStatus.CANCELLED;
            case 'TERMINATED':
                return WorkflowStatus.FAILED;
            case 'TIMED_OUT':
                return WorkflowStatus.TIMEOUT;
            default:
                return WorkflowStatus.PENDING;
        }
    }

    /**
     * Health check - verify Temporal connection
     */
    async healthCheck(): Promise<{ status: string; details: any }> {
        try {
            if (!this.client) {
                return {
                    status: 'unhealthy',
                    details: { message: 'Client not initialized' },
                };
            }

            // Try to describe a non-existent workflow to test connection
            try {
                await this.client.getHandle('health-check-test').describe();
            } catch (error) {
                // Expected error for non-existent workflow means connection works
                if (error instanceof Error && error.message.includes('not found')) {
                    return {
                        status: 'healthy',
                        details: {
                            client_connected: true,
                            worker_running: this.worker !== null,
                            active_workflows: this.activeWorkflows.size,
                        },
                    };
                }
                throw error;
            }

            return {
                status: 'healthy',
                details: {
                    client_connected: true,
                    worker_running: this.worker !== null,
                    active_workflows: this.activeWorkflows.size,
                },
            };
        } catch (error) {
            this.logger.error('Health check failed', error);
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }
}
