export interface IPortalTemplate {
    id: string;
    templateName: string;
    category: 'admin' | 'customer' | 'partner' | 'analytics' | 'custom';
    description?: string;
    thumbnailUrl?: string;
    layoutConfig: any;
    components: any;
    isPublic: boolean;
    isFeatured: boolean;
    createdBy?: string;
}

export interface IPortalInstance {
    id: string;
    tenantId: string;
    templateId?: string;
    portalName: string;
    customConfig?: any;
    domain?: string;
    branding?: any;
    status: 'draft' | 'published' | 'archived';
    publishedAt?: Date;
    createdBy?: string;
}

export interface IPortalPage {
    id: string;
    portalId: string;
    pageName: string;
    route: string;
    layout?: any;
    components: any;
    permissions?: any;
    metaTags?: any;
    isHomepage: boolean;
    displayOrder: number;
}

export interface IPortalComponent {
    id: string;
    componentType: string;
    componentName: string;
    category?: string;
    configSchema: any;
    renderConfig?: any;
    previewImageUrl?: string;
    isActive: boolean;
}

export interface IPortalTheme {
    id: string;
    themeName: string;
    colorScheme: any;
    typography?: any;
    cssOverrides?: string;
    isDefault: boolean;
}

export interface IPortalWorkflow {
    id: string;
    portalId: string;
    workflowName: string;
    triggerConfig: any;
    actions: any;
    isActive: boolean;
    createdBy?: string;
}

export interface IWorkflowExecution {
    id: string;
    workflowId: string;
    triggerData?: any;
    executionStatus: 'running' | 'completed' | 'failed' | 'cancelled';
    result?: any;
    errorMessage?: string;
    startedAt: Date;
    completedAt?: Date;
}

export interface IWorkflowAction {
    id: string;
    workflowId: string;
    actionType: 'email' | 'webhook' | 'api_call' | 'data_update' | 'notification' | 'custom';
    actionConfig: any;
    displayOrder: number;
}
