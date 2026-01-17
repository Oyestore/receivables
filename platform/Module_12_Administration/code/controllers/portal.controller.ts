import { Request, Response, NextFunction } from 'express';
import { portalBuilderService } from '../services/portal-builder.service';
import { auditService } from '../services/audit.service';
import { Logger } from '../../../Module_11_Common/code/logging/logger';
import { ValidationError } from '../../../Module_11_Common/code/errors/app-error';

const logger = new Logger('PortalController');

export class PortalController {
    /**
     * GET /api/v1/portals/templates
     * Get portal templates
     */
    async getTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { category, publicOnly } = req.query;

            const templates = await portalBuilderService.getTemplates(
                category as string,
                publicOnly === 'true'
            );

            res.status(200).json({
                data: templates,
                total: templates.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/portals
     * Create portal instance
     */
    async createPortal(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { templateId, portalName, customConfig, domain, branding } = req.body;

            if (!req.user?.tenantId || !portalName) {
                throw new ValidationError('Tenant ID and portal name are required');
            }

            const portal = await portalBuilderService.createPortal(
                {
                    tenantId: req.user.tenantId,
                    templateId,
                    portalName,
                    customConfig,
                    domain,
                    branding,
                },
                req.user.id
            );

            await auditService.log({
                tenantId: req.user.tenantId,
                userId: req.user.id,
                action: 'portal.create',
                resourceType: 'portal',
                resourceId: portal.id,
                changes: { portalName, templateId },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'success',
            });

            res.status(201).json({
                message: 'Portal created',
                data: portal,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/portals/:id/pages
     * Create page
     */
    async createPage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: portalId } = req.params;
            const { pageName, route, layout, components, permissions, metaTags, isHomepage } = req.body;

            if (!pageName || !route || !components) {
                throw new ValidationError('Page name, route, and components are required');
            }

            const page = await portalBuilderService.createPage({
                portalId,
                pageName,
                route,
                layout,
                components,
                permissions,
                metaTags,
                isHomepage,
            });

            res.status(201).json({
                message: 'Page created',
                data: page,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/portals/:id/publish
     * Publish portal
     */
    async publishPortal(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: portalId } = req.params;

            const portal = await portalBuilderService.publishPortal(portalId);

            res.status(200).json({
                message: 'Portal published',
                data: portal,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/portal-components
     * Get available components
     */
    async getComponents(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { category } = req.query;

            const components = await portalBuilderService.getComponents(category as string);

            res.status(200).json({
                data: components,
                total: components.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/portal-themes
     * Get available themes
     */
    async getThemes(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const themes = await portalBuilderService.getThemes();

            res.status(200).json({
                data: themes,
                total: themes.length,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/portals/:id/workflows
     * Create workflow
     */
    async createWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: portalId } = req.params;
            const { workflowName, triggerConfig, actions } = req.body;

            if (!workflowName || !triggerConfig || !actions) {
                throw new ValidationError('Workflow name, trigger config, and actions are required');
            }

            const workflow = await portalBuilderService.createWorkflow(
                {
                    portalId,
                    workflowName,
                    triggerConfig,
                    actions,
                },
                req.user?.id
            );

            res.status(201).json({
                message: 'Workflow created',
                data: workflow,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/workflows/:id/execute
     * Execute workflow
     */
    async executeWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id: workflowId } = req.params;
            const { triggerData } = req.body;

            const execution = await portalBuilderService.executeWorkflow(workflowId, triggerData);

            res.status(202).json({
                message: 'Workflow execution started',
                data: execution,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const portalController = new PortalController();
