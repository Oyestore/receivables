import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    Play,
    Pause,
    CheckCircle,
    XCircle,
    Clock,
    Zap,
    TrendingUp,
    Server,
} from 'lucide-react';
import './OrchestrationDashboard.css';

interface Workflow {
    id: string;
    name: string;
    module: string;
    type: 'scheduled' | 'triggered' | 'manual';
    status: 'active' | 'paused' | 'completed' | 'failed';
    executionCount: number;
    lastExecuted?: string;
    successRate: number;
}

export const OrchestrationDashboard: React.FC = () => {
    const [workflows] = useState<Workflow[]>([
        {
            id: '1',
            name: 'Daily Invoice Processing',
            module: 'Invoice Generation',
            type: 'scheduled',
            status: 'active',
            executionCount: 245,
            lastExecuted: '2025-01-14T08:00:00',
            successRate: 98.5,
        },
        {
            id: '2',
            name: 'Payment Reconciliation',
            module: 'Payment Integration',
            type: 'triggered',
            status: 'active',
            executionCount: 180,
            lastExecuted: '2025-01-14T12:30:00',
            successRate: 95.2,
        },
        {
            id: '3',
            name: 'Credit Score Update',
            module: 'Credit Scoring',
            type: 'scheduled',
            status: 'paused',
            executionCount: 56,
            lastExecuted: ' 2025-01-13T23:00:00',
            successRate: 100,
        },
    ]);

    const stats = {
        totalWorkflows: 15,
        activeWorkflows: 12,
        totalExecutions: 1453,
        recentExecutions: 87,
        successRate: 96.8,
        avgDuration: 45,
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'status-active';
            case 'paused':
                return 'status-paused';
            case 'failed':
                return 'status-failed';
            default:
                return 'status-completed';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'scheduled':
                return <Clock className="type-icon" />;
            case 'triggered':
                return <Zap className="type-icon" />;
            default:
                return <Play className="type-icon" />;
        }
    };

    return (
        <div className="orchestration-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="title-section">
                        <Activity className="page-icon" />
                        <div>
                            <h1 className="page-title">Orchestration Hub</h1>
                            <p className="page-subtitle">Central workflow management & monitoring</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <motion.div
                    className="stat-card total"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="stat-icon-wrapper">
                        <Server className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.totalWorkflows}</div>
                        <div className="stat-label">Total Workflows</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card active"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="stat-icon-wrapper">
                        <Play className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.activeWorkflows}</div>
                        <div className="stat-label">Active</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card executions"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="stat-icon-wrapper">
                        <TrendingUp className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.totalExecutions}</div>
                        <div className="stat-label">Total Executions</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card success"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="stat-icon-wrapper">
                        <CheckCircle className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.successRate}%</div>
                        <div className="stat-label">Success Rate</div>
                    </div>
                </motion.div>
            </div>

            {/* Workflows Section */}
            <div className="workflows-section">
                <h2 className="section-title">Active Workflows</h2>

                <div className="workflows-list">
                    {workflows.map((workflow, index) => (
                        <motion.div
                            key={workflow.id}
                            className={`workflow-card ${getStatusColor(workflow.status)}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="workflow-header">
                                <div className="workflow-name">{workflow.name}</div>
                                <div className={`workflow-status ${workflow.status}`}>
                                    {workflow.status === 'active' ? <Play /> : <Pause />}
                                    {workflow.status}
                                </div>
                            </div>

                            <div className="workflow-body">
                                <div className="workflow-module">{workflow.module}</div>
                                <div className="workflow-type">
                                    {getTypeIcon(workflow.type)}
                                    <span>{workflow.type}</span>
                                </div>
                            </div>

                            <div className="workflow-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Executions</span>
                                    <span className="stat-value">{workflow.executionCount}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Success Rate</span>
                                    <span className="stat-value">{workflow.successRate}%</span>
                                </div>
                            </div>

                            {workflow.lastExecuted && (
                                <div className="workflow-footer">
                                    <Clock className="footer-icon" />
                                    Last: {new Date(workflow.lastExecuted).toLocaleString()}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
