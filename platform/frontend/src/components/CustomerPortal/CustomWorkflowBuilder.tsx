import React, { useState } from 'react';
import {
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiPlus, FiTrash2, FiUsers, FiCheckCircle, FiSettings } from 'react-icons/fi';
import './CustomWorkflowBuilder.css';

interface ApprovalStep {
    id: string;
    order: number;
    approverType: 'anyone' | 'specific' | 'role';
    approverEmail?: string;
    approverRole?: string;
    required: boolean;
}

interface Workflow {
    id: string;
    name: string;
    trigger: 'amount_threshold' | 'vendor' | 'category';
    triggerValue: string;
    steps: ApprovalStep[];
    isActive: boolean;
}

interface CustomWorkflowBuilderProps {
    customerId: string;
}

const CustomWorkflowBuilder: React.FC<CustomWorkflowBuilderProps> = ({
    customerId,
}) => {
    const [workflows, setWorkflows] = useState<Workflow[]>([
        {
            id: 'wf1',
            name: 'High-Value Approval',
            trigger: 'amount_threshold',
            triggerValue: '100000',
            steps: [
                {
                    id: 'step1',
                    order: 1,
                    approverType: 'role',
                    approverRole: 'manager',
                    required: true,
                },
            ],
            isActive: true,
        },
    ]);

    const [isCreating, setIsCreating] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const handleToggleWorkflow = (id: string) => {
        setWorkflows(prev => prev.map(wf =>
            wf.id === id ? { ...wf, isActive: !wf.isActive } : wf
        ));
        
        setToastMessage('Workflow status updated');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleDeleteWorkflow = (id: string) => {
        setWorkflows(prev => prev.filter(wf => wf.id !== id));
        
        setToastMessage('Workflow deleted');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleCreateWorkflow = () => {
        const newWorkflow: Workflow = {
            id: `wf${workflows.length + 1}`,
            name: 'New Workflow',
            trigger: 'amount_threshold',
            triggerValue: '50000',
            steps: [],
            isActive: false,
        };

        setWorkflows(prev => [...prev, newWorkflow]);
        setIsCreating(false);
        
        setToastMessage('New workflow created');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleAddStep = (workflowId: string) => {
        setWorkflows(prev => prev.map(wf => {
            if (wf.id === workflowId) {
                const newStep: ApprovalStep = {
                    id: `step${wf.steps.length + 1}`,
                    order: wf.steps.length + 1,
                    approverType: 'anyone',
                    required: true,
                };
                return { ...wf, steps: [...wf.steps, newStep] };
            }
            return wf;
        }));
    };

    const handleUpdateStep = (workflowId: string, stepId: string, updates: Partial<ApprovalStep>) => {
        setWorkflows(prev => prev.map(wf => {
            if (wf.id === workflowId) {
                return {
                    ...wf,
                    steps: wf.steps.map(step =>
                        step.id === stepId ? { ...step, ...updates } : step
                    )
                };
            }
            return wf;
        }));
    };

    const handleDeleteStep = (workflowId: string, stepId: string) => {
        setWorkflows(prev => prev.map(wf => {
            if (wf.id === workflowId) {
                return {
                    ...wf,
                    steps: wf.steps.filter(step => step.id !== stepId)
                };
            }
            return wf;
        }));
    };

    const getTriggerLabel = (trigger: string) => {
        switch (trigger) {
            case 'amount_threshold':
                return 'Amount Threshold';
            case 'vendor':
                return 'Specific Vendor';
            case 'category':
                return 'Invoice Category';
            default:
                return trigger;
        }
    };

    const getApproverTypeLabel = (type: string) => {
        switch (type) {
            case 'anyone':
                return 'Anyone';
            case 'specific':
                return 'Specific Person';
            case 'role':
                return 'Role-based';
            default:
                return type;
        }
    };

    return (
        <div className="workflow-builder">
            <VStack gap={6} align="stretch">
                {/* Header */}
                <div className="workflow-header">
                    <h2 className="workflow-title">
                        <Icon as={FiSettings} className="icon mr-2" />
                        Custom Workflow Builder
                    </h2>
                    <div className="workflow-actions">
                        <button className="button button-blue button-sm" onClick={() => setIsCreating(true)}>
                            <Icon as={FiPlus} className="icon mr-1" />
                            Create Workflow
                        </button>
                    </div>
                </div>

                {/* Workflows */}
                <div className="workflow-steps">
                    {workflows.map((workflow) => (
                        <div key={workflow.id} className="workflow-step">
                            <div className="step-header">
                                <div className="h-stack gap-3">
                                    <div className="step-number">{workflow.steps.length}</div>
                                    <div>
                                        <h3 className="step-title">{workflow.name}</h3>
                                        <div className="h-stack gap-2 mt-1">
                                            <Badge className={`badge ${workflow.isActive ? 'badge-green' : 'badge-gray'}`}>
                                                {workflow.isActive ? 'Active' : 'Inactive'}
                                            </Badge>
                                            <span className="text text-xs color-gray-500">
                                                {getTriggerLabel(workflow.trigger)}: {workflow.triggerValue}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="step-actions">
                                    <button
                                        className="icon-button"
                                        onClick={() => handleToggleWorkflow(workflow.id)}
                                        title={workflow.isActive ? 'Deactivate' : 'Activate'}
                                    >
                                        <Icon as={FiCheckCircle} className={`icon ${workflow.isActive ? 'color-green-500' : 'color-gray-400'}`} />
                                    </button>
                                    <button
                                        className="icon-button"
                                        onClick={() => handleDeleteWorkflow(workflow.id)}
                                        title="Delete workflow"
                                    >
                                        <Icon as={FiTrash2} className="icon color-red-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Workflow Configuration */}
                            <div className="step-content">
                                <div className="step-field">
                                    <label className="step-label">Workflow Name</label>
                                    <input
                                        type="text"
                                        className="step-input"
                                        value={workflow.name}
                                        onChange={(e) => setWorkflows(prev => prev.map(wf =>
                                            wf.id === workflow.id ? { ...wf, name: e.target.value } : wf
                                        ))}
                                    />
                                </div>
                                <div className="step-field">
                                    <label className="step-label">Trigger Type</label>
                                    <select
                                        className="step-select"
                                        value={workflow.trigger}
                                        onChange={(e) => setWorkflows(prev => prev.map(wf =>
                                            wf.id === workflow.id ? { ...wf, trigger: e.target.value as Workflow['trigger'] } : wf
                                        ))}
                                    >
                                        <option value="amount_threshold">Amount Threshold</option>
                                        <option value="vendor">Specific Vendor</option>
                                        <option value="category">Invoice Category</option>
                                    </select>
                                </div>
                                <div className="step-field">
                                    <label className="step-label">Trigger Value</label>
                                    <input
                                        type="text"
                                        className="step-input"
                                        value={workflow.triggerValue}
                                        onChange={(e) => setWorkflows(prev => prev.map(wf =>
                                            wf.id === workflow.id ? { ...wf, triggerValue: e.target.value } : wf
                                        ))}
                                        placeholder={workflow.trigger === 'amount_threshold' ? 'Enter amount' : 'Enter value'}
                                    />
                                </div>
                            </div>

                            {/* Approval Steps */}
                            <div className="mt-4">
                                <div className="h-stack justify-between align-center mb-3">
                                    <h4 className="heading heading-sm color-gray-800">
                                        <Icon as={FiUsers} className="icon mr-1" />
                                        Approval Steps
                                    </h4>
                                    <button
                                        className="button button-outline button-sm"
                                        onClick={() => handleAddStep(workflow.id)}
                                    >
                                        <Icon as={FiPlus} className="icon mr-1" />
                                        Add Step
                                    </button>
                                </div>

                                {workflow.steps.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">👥</div>
                                        <div className="empty-state-text">No approval steps</div>
                                        <div className="empty-state-subtext">Add steps to define the approval process</div>
                                    </div>
                                ) : (
                                    <div className="v-stack gap-3">
                                        {workflow.steps.map((step, index) => (
                                            <div key={step.id} className="preview-step">
                                                <div className="preview-step-number">{index + 1}</div>
                                                <div className="preview-step-content">
                                                    <div className="preview-step-title">
                                                        {getApproverTypeLabel(step.approverType)}
                                                        {step.required && (
                                                            <Badge className="badge badge-orange ml-2">Required</Badge>
                                                        )}
                                                    </div>
                                                    <div className="preview-step-description">
                                                        {step.approverType === 'specific' && step.approverEmail && (
                                                            <>Approver: {step.approverEmail}</>
                                                        )}
                                                        {step.approverType === 'role' && step.approverRole && (
                                                            <>Role: {step.approverRole}</>
                                                        )}
                                                        {step.approverType === 'anyone' && (
                                                            <>Any team member can approve</>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    className="icon-button"
                                                    onClick={() => handleDeleteStep(workflow.id, step.id)}
                                                    title="Remove step"
                                                >
                                                    <Icon as={FiTrash2} className="icon color-red-600" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Step Configuration */}
                            {workflow.steps.map((step) => (
                                <div key={step.id} className="step-content mt-4">
                                    <div className="step-field">
                                        <label className="step-label">Approver Type</label>
                                        <select
                                            className="step-select"
                                            value={step.approverType}
                                            onChange={(e) => handleUpdateStep(workflow.id, step.id, {
                                                approverType: e.target.value as ApprovalStep['approverType']
                                            })}
                                        >
                                            <option value="anyone">Anyone</option>
                                            <option value="specific">Specific Person</option>
                                            <option value="role">Role-based</option>
                                        </select>
                                    </div>
                                    {step.approverType === 'specific' && (
                                        <div className="step-field">
                                            <label className="step-label">Approver Email</label>
                                            <input
                                                type="email"
                                                className="step-input"
                                                value={step.approverEmail || ''}
                                                onChange={(e) => handleUpdateStep(workflow.id, step.id, {
                                                    approverEmail: e.target.value
                                                })}
                                                placeholder="Enter email address"
                                            />
                                        </div>
                                    )}
                                    {step.approverType === 'role' && (
                                        <div className="step-field">
                                            <label className="step-label">Approver Role</label>
                                            <select
                                                className="step-select"
                                                value={step.approverRole || ''}
                                                onChange={(e) => handleUpdateStep(workflow.id, step.id, {
                                                    approverRole: e.target.value
                                                })}
                                            >
                                                <option value="">Select role</option>
                                                <option value="manager">Manager</option>
                                                <option value="director">Director</option>
                                                <option value="vp">VP</option>
                                                <option value="cfo">CFO</option>
                                            </select>
                                        </div>
                                    )}
                                    <div className="step-field">
                                        <label className="step-label">Required</label>
                                        <div className="h-stack gap-2">
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={step.required}
                                                    onChange={(e) => handleUpdateStep(workflow.id, step.id, {
                                                        required: e.target.checked
                                                    })}
                                                />
                                                <span className="switch-slider"></span>
                                            </label>
                                            <span className="text text-sm color-gray-600">
                                                {step.required ? 'This step is required' : 'This step is optional'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* Add Workflow Button */}
                {!isCreating && (
                    <div className="add-step-button" onClick={() => setIsCreating(true)}>
                        <Icon as={FiPlus} className="icon" />
                        <span className="add-step-text">Create New Workflow</span>
                    </div>
                )}

                {/* Create Workflow Form */}
                {isCreating && (
                    <div className="workflow-step">
                        <div className="step-header">
                            <h3 className="step-title">Create New Workflow</h3>
                            <button
                                className="icon-button"
                                onClick={() => setIsCreating(false)}
                                title="Cancel"
                            >
                                <Icon as={FiTrash2} className="icon color-gray-400" />
                            </button>
                        </div>
                        <div className="step-content">
                            <div className="step-field">
                                <label className="step-label">Workflow Name</label>
                                <input
                                    type="text"
                                    className="step-input"
                                    placeholder="Enter workflow name"
                                    id="new-workflow-name"
                                />
                            </div>
                            <div className="step-field">
                                <label className="step-label">Trigger Type</label>
                                <select className="step-select" id="new-workflow-trigger">
                                    <option value="amount_threshold">Amount Threshold</option>
                                    <option value="vendor">Specific Vendor</option>
                                    <option value="category">Invoice Category</option>
                                </select>
                            </div>
                            <div className="step-field">
                                <label className="step-label">Trigger Value</label>
                                <input
                                    type="text"
                                    className="step-input"
                                    placeholder="Enter trigger value"
                                    id="new-workflow-value"
                                />
                            </div>
                        </div>
                        <div className="h-stack gap-2 mt-4">
                            <button className="button button-blue button-sm" onClick={handleCreateWorkflow}>
                                <Icon as={FiCheckCircle} className="icon mr-1" />
                                Create Workflow
                            </button>
                            <button className="button button-outline button-sm" onClick={() => setIsCreating(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {workflows.length === 0 && !isCreating && (
                    <div className="empty-state">
                        <div className="empty-state-icon">⚙️</div>
                        <div className="empty-state-text">No custom workflows</div>
                        <div className="empty-state-subtext">
                            Create custom approval workflows to automate your invoice processing
                        </div>
                        <button className="button button-blue button-sm mt-4" onClick={() => setIsCreating(true)}>
                            <Icon as={FiPlus} className="icon mr-1" />
                            Create Your First Workflow
                        </button>
                    </div>
                )}
            </VStack>

            {/* Toast Notification */}
            {showToast && (
                <div className={`toast toast-${toastType}`}>
                    <div className="toast-title">
                        {toastType === 'success' ? 'Success' : 'Error'}
                    </div>
                    <div className="toast-message">{toastMessage}</div>
                </div>
            )}
        </div>
    );
};

export default CustomWorkflowBuilder;
