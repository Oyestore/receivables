import { Pool } from 'pg';
import { databaseService } from '../../../Module_11_Common/code/database/database.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError, NotFoundError } from '../../../Module_11_Common/code/errors/app-error';
import {
    IPortalTemplate,
    IPortalInstance,
    IPortalPage,
    IPortalComponent,
    IPortalTheme,
    IPortalWorkflow,
    IWorkflowExecution,
    IWorkflowAction,
} from '../interfaces/portal.interface';

const logger = new Logger('PortalBuilderService');

/**
 * Portal Builder Service
 * Self-service portal creation with templates, themes, and workflow automation
 */
export class PortalBuilderService {
    private pool: Pool;

    constructor() {
        this.pool = databaseService.getPool();
    }

    /**
     * Get portal templates
     */
    async getTemplates(category?: string, publicOnly: boolean = false): Promise<IPortalTemplate[]> {
        try {
            let query = 'SELECT * FROM portal_templates WHERE 1=1';
            const params: any[] = [];

            if (publicOnly) {
                query += ' AND is_public = true';
            }

            if (category) {
                params.push(category);
                query += ` AND category = $${params.length}`;
            }

            query += ' ORDER BY is_featured DESC, template_name ASC';

            const result = await this.pool.query(query, params);

            return result.rows.map(row => this.mapTemplateFromDb(row));
        } catch (error) {
            logger.error('Failed to get templates', { error });
            throw error;
        }
    }

    /**
     * Create portal instance
     */
    async createPortal(portalData: {
        tenantId: string;
        templateId?: string;
        portalName: string;
        customConfig?: any;
        domain?: string;
        branding?: any;
    }, createdBy: string): Promise<IPortalInstance> {
        try {
            // Verify template if provided
            if (portalData.templateId) {
                const template = await this.getTemplateById(portalData.templateId);
                if (!template) {
                    throw new NotFoundError('Template not found');
                }
            }

            const result = await this.pool.query(
                `INSERT INTO portal_instances (
          tenant_id, template_id, portal_name, custom_config,
          domain, branding, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
        RETURNING *`,
                [
                    portalData.tenantId,
                    portalData.templateId || null,
                    portalData.portalName,
                    portalData.customConfig ? JSON.stringify(portalData.customConfig) : null,
                    portalData.domain || null,
                    portalData.branding ? JSON.stringify(portalData.branding) : null,
                    createdBy,
                ]
            );

            logger.info('Portal created', {
                portalId: result.rows[0].id,
                tenantId: portalData.tenantId,
            });

            return this.mapPortalFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create portal', { error, portalData });
            throw error;
        }
    }

    /**
     * Create page
     */
    async createPage(pageData: {
        portalId: string;
        pageName: string;
        route: string;
        layout?: any;
        components: any;
        permissions?: any;
        metaTags?: any;
        isHomepage?: boolean;
    }): Promise<IPortalPage> {
        try {
            // Validate components
            this.validateComponents(pageData.components);

            // Get current max order
            const orderResult = await this.pool.query(
                'SELECT COALESCE(MAX(display_order), 0) as max_order FROM portal_pages WHERE portal_id = $1',
                [pageData.portalId]
            );

            const displayOrder = parseInt(orderResult.rows[0].max_order, 10) + 1;

            const result = await this.pool.query(
                `INSERT INTO portal_pages (
          portal_id, page_name, route, layout, components,
          permissions, meta_tags, is_homepage, display_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
                [
                    pageData.portalId,
                    pageData.pageName,
                    pageData.route,
                    pageData.layout ? JSON.stringify(pageData.layout) : null,
                    JSON.stringify(pageData.components),
                    pageData.permissions ? JSON.stringify(pageData.permissions) : null,
                    pageData.metaTags ? JSON.stringify(pageData.metaTags) : null,
                    pageData.isHomepage || false,
                    displayOrder,
                ]
            );

            logger.info('Page created', {
                pageId: result.rows[0].id,
                portalId: pageData.portalId,
            });

            return this.mapPageFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create page', { error, pageData });
            throw error;
        }
    }

    /**
     * Publish portal
     */
    async publishPortal(portalId: string): Promise<IPortalInstance> {
        try {
            // Verify portal has at least one page
            const pagesResult = await this.pool.query(
                'SELECT COUNT(*) FROM portal_pages WHERE portal_id = $1',
                [portalId]
            );

            const pageCount = parseInt(pagesResult.rows[0].count, 10);

            if (pageCount === 0) {
                throw new ValidationError('Portal must have at least one page before publishing');
            }

            const result = await this.pool.query(
                `UPDATE portal_instances
         SET status = 'published',
             published_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
                [portalId]
            );

            if (result.rows.length === 0) {
                throw new NotFoundError('Portal not found');
            }

            logger.info('Portal published', { portalId });

            return this.mapPortalFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to publish portal', { error, portalId });
            throw error;
        }
    }

    /**
     * Get available components
     */
    async getComponents(category?: string): Promise<IPortalComponent[]> {
        try {
            let query = 'SELECT * FROM portal_components WHERE is_active = true';
            const params: any[] = [];

            if (category) {
                params.push(category);
                query += ` AND category = $${params.length}`;
            }

            query += ' ORDER BY category, component_name';

            const result = await this.pool.query(query, params);

            return result.rows.map(row => this.mapComponentFromDb(row));
        } catch (error) {
            logger.error('Failed to get components', { error });
            throw error;
        }
    }

    /**
     * Get themes
     */
    async getThemes(): Promise<IPortalTheme[]> {
        try {
            const result = await this.pool.query(
                'SELECT * FROM portal_themes ORDER BY is_default DESC, theme_name ASC'
            );

            return result.rows.map(row => this.mapThemeFromDb(row));
        } catch (error) {
            logger.error('Failed to get themes', { error });
            throw error;
        }
    }

    /**
     * Create workflow
     */
    async createWorkflow(workflowData: {
        portalId: string;
        workflowName: string;
        triggerConfig: any;
        actions: any;
    }, createdBy: string): Promise<IPortalWorkflow> {
        try {
            const result = await this.pool.query(
                `INSERT INTO portal_workflows (
          portal_id, workflow_name, trigger_config, actions, created_by, is_active
        ) VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *`,
                [
                    workflowData.portalId,
                    workflowData.workflowName,
                    JSON.stringify(workflowData.triggerConfig),
                    JSON.stringify(workflowData.actions),
                    createdBy,
                ]
            );

            logger.info('Workflow created', {
                workflowId: result.rows[0].id,
                portalId: workflowData.portalId,
            });

            return this.mapWorkflowFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to create workflow', { error, workflowData });
            throw error;
        }
    }

    /**
     * Execute workflow
     */
    async executeWorkflow(workflowId: string, triggerData?: any): Promise<IWorkflowExecution> {
        try {
            // Create execution record
            const executionResult = await this.pool.query(
                `INSERT INTO workflow_executions (
          workflow_id, trigger_data, execution_status
        ) VALUES ($1, $2, 'running')
        RETURNING *`,
                [workflowId, triggerData ? JSON.stringify(triggerData) : null]
            );

            const execution = executionResult.rows[0];

            // Execute workflow asynchronously
            setImmediate(() => this.performWorkflowExecution(execution.id, workflowId, triggerData));

            return this.mapExecutionFromDb(execution);
        } catch (error) {
            logger.error('Failed to execute workflow', { error, workflowId });
            throw error;
        }
    }

    /**
     * Perform workflow execution (async)
     */
    private async performWorkflowExecution(executionId: string, workflowId: string, triggerData?: any): Promise<void> {
        try {
            // Get workflow and actions
            const workflowResult = await this.pool.query(
                'SELECT * FROM portal_workflows WHERE id = $1',
                [workflowId]
            );

            if (workflowResult.rows.length === 0) {
                throw new NotFoundError('Workflow not found');
            }

            const workflow = workflowResult.rows[0];
            const actions = workflow.actions;

            const results: any[] = [];

            // Execute actions in sequence
            for (const action of actions) {
                const actionResult = await this.executeWorkflowAction(action, triggerData);
                results.push(actionResult);
            }

            // Update execution as completed
            await this.pool.query(
                `UPDATE workflow_executions
         SET execution_status = 'completed',
             result = $1,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
                [JSON.stringify({ results }), executionId]
            );

            logger.info('Workflow execution completed', { executionId, workflowId });
        } catch (error) {
            // Update execution as failed
            await this.pool.query(
                `UPDATE workflow_executions
         SET execution_status = 'failed',
             error_message = $1,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
                [error.message, executionId]
            );

            logger.error('Workflow execution failed', { error, executionId });
        }
    }

    /**
     * Execute workflow action
     */
    private async executeWorkflowAction(action: any, triggerData?: any): Promise<any> {
        // Simplified action execution - in production would have full implementations
        switch (action.type) {
            case 'email':
                return { type: 'email', status: 'sent', recipient: action.config?.recipient };

            case 'webhook':
                return { type: 'webhook', status: 'delivered', url: action.config?.url };

            case 'api_call':
                return { type: 'api_call', status: 'completed', endpoint: action.config?.endpoint };

            case 'data_update':
                return { type: 'data_update', status: 'updated', table: action.config?.table };

            case 'notification':
                return { type: 'notification', status: 'sent', message: action.config?.message };

            default:
                return { type: action.type, status: 'executed' };
        }
    }

    /**
     * Validate components
     */
    private validateComponents(components: any): void {
        if (!Array.isArray(components)) {
            throw new ValidationError('Components must be an array');
        }

        for (const component of components) {
            if (!component.type) {
                throw new ValidationError('Each component must have a type');
            }
        }
    }

    /**
     * Helper methods
     */

    private async getTemplateById(templateId: string): Promise<IPortalTemplate | null> {
        const result = await this.pool.query(
            'SELECT * FROM portal_templates WHERE id = $1',
            [templateId]
        );

        return result.rows.length > 0 ? this.mapTemplateFromDb(result.rows[0]) : null;
    }

    /**
     * Mapping functions
     */

    private mapTemplateFromDb(row: any): IPortalTemplate {
        return {
            id: row.id,
            templateName: row.template_name,
            category: row.category,
            description: row.description,
            thumbnailUrl: row.thumbnail_url,
            layoutConfig: row.layout_config,
            components: row.components,
            isPublic: row.is_public,
            isFeatured: row.is_featured,
            createdBy: row.created_by,
        };
    }

    private mapPortalFromDb(row: any): IPortalInstance {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            templateId: row.template_id,
            portalName: row.portal_name,
            customConfig: row.custom_config,
            domain: row.domain,
            branding: row.branding,
            status: row.status,
            publishedAt: row.published_at,
            createdBy: row.created_by,
        };
    }

    private mapPageFromDb(row: any): IPortalPage {
        return {
            id: row.id,
            portalId: row.portal_id,
            pageName: row.page_name,
            route: row.route,
            layout: row.layout,
            components: row.components,
            permissions: row.permissions,
            metaTags: row.meta_tags,
            isHomepage: row.is_homepage,
            displayOrder: row.display_order,
        };
    }

    private mapComponentFromDb(row: any): IPortalComponent {
        return {
            id: row.id,
            componentType: row.component_type,
            componentName: row.component_name,
            category: row.category,
            configSchema: row.config_schema,
            renderConfig: row.render_config,
            previewImageUrl: row.preview_image_url,
            isActive: row.is_active,
        };
    }

    private mapThemeFromDb(row: any): IPortalTheme {
        return {
            id: row.id,
            themeName: row.theme_name,
            colorScheme: row.color_scheme,
            typography: row.typography,
            cssOverrides: row.css_overrides,
            isDefault: row.is_default,
        };
    }

    private mapWorkflowFromDb(row: any): IPortalWorkflow {
        return {
            id: row.id,
            portalId: row.portal_id,
            workflowName: row.workflow_name,
            triggerConfig: row.trigger_config,
            actions: row.actions,
            isActive: row.is_active,
            createdBy: row.created_by,
        };
    }

    private mapExecutionFromDb(row: any): IWorkflowExecution {
        return {
            id: row.id,
            workflowId: row.workflow_id,
            triggerData: row.trigger_data,
            executionStatus: row.execution_status,
            result: row.result,
            errorMessage: row.error_message,
            startedAt: row.started_at,
            completedAt: row.completed_at,
        };
    }
}

export const portalBuilderService = new PortalBuilderService();
