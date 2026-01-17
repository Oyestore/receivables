import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    Plus,
    Calendar,
    Users,
    TrendingUp,
    ChevronRight,
    BarChart3,
} from 'lucide-react';
import './MilestoneDashboard.css';

interface Milestone {
    id: string;
    name: string;
    progress: number;
    dueDate: string;
    status: 'on_track' | 'at_risk' | 'delayed' | 'completed';
    tasksCompleted: number;
    tasksTotal: number;
    assignees: number;
}

export const MilestoneDashboard: React.FC = () => {
    const [milestones, setMilestones] = useState<Milestone[]>([
        {
            id: '1',
            name: 'Product Launch Phase 1',
            progress: 75,
            dueDate: '2025-02-15',
            status: 'on_track',
            tasksCompleted: 15,
            tasksTotal: 20,
            assignees: 5,
        },
        {
            id: '2',
            name: 'Website Redesign',
            progress: 60,
            dueDate: '2025-01-30',
            status: 'at_risk',
            tasksCompleted: 12,
            tasksTotal: 20,
            assignees: 3,
        },
        {
            id: '3',
            name: 'Q1 Marketing Campaign',
            progress: 30,
            dueDate: '2025-03-31',
            status: 'delayed',
            tasksCompleted: 6,
            tasksTotal: 20,
            assignees: 4,
        },
        {
            id: '4',
            name: 'Client Onboarding System',
            progress: 100,
            dueDate: '2025-01-15',
            status: 'completed',
            tasksCompleted: 18,
            tasksTotal: 18,
            assignees: 6,
        },
    ]);

    const [filter, setFilter] = useState<string>('all');

    const stats = {
        total: milestones.length,
        active: milestones.filter((m) => m.status !== 'completed').length,
        completed: milestones.filter((m) => m.status === 'completed').length,
        atRisk: milestones.filter((m) => m.status === 'at_risk' || m.status === 'delayed').length,
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'on_track':
                return 'status-on-track';
            case 'at_risk':
                return 'status-at-risk';
            case 'delayed':
                return 'status-delayed';
            case 'completed':
                return 'status-completed';
            default:
                return '';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'on_track':
                return <TrendingUp className="status-icon" />;
            case 'at_risk':
                return <AlertCircle className="status-icon" />;
            case 'delayed':
                return <Clock className="status-icon" />;
            case 'completed':
                return <CheckCircle2 className="status-icon" />;
            default:
                return null;
        }
    };

    const filteredMilestones = filter === 'all'
        ? milestones
        : milestones.filter((m) => m.status === filter);

    return (
        <div className="milestone-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="title-section">
                        <BarChart3 className="page-icon" />
                        <div>
                            <h1 className="page-title">Milestone Dashboard</h1>
                            <p className="page-subtitle">Track progress across all projects</p>
                        </div>
                    </div>

                    <motion.button
                        className="btn-create"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => (window.location.href = '/sme/workflows/new')}
                    >
                        <Plus className="btn-icon" />
                        New Milestone
                    </motion.button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="stat-icon-wrapper total">
                        <BarChart3 className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Milestones</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="stat-icon-wrapper active">
                        <Clock className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">Active</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="stat-icon-wrapper completed">
                        <CheckCircle2 className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.completed}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="stat-icon-wrapper risk">
                        <AlertCircle className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.atRisk}</div>
                        <div className="stat-label">At Risk</div>
                    </div>
                </motion.div>
            </div>

            {/* Filters */}
            <div className="filters">
                {['all', 'on_track', 'at_risk', 'delayed', 'completed'].map((status) => (
                    <button
                        key={status}
                        className={`filter-btn ${filter === status ? 'filter-active' : ''}`}
                        onClick={() => setFilter(status)}
                    >
                        {status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </button>
                ))}
            </div>

            {/* Milestones Grid */}
            <div className="milestones-grid">
                {filteredMilestones.map((milestone, index) => (
                    <motion.div
                        key={milestone.id}
                        className={`milestone-card ${getStatusColor(milestone.status)}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => (window.location.href = `/sme/milestones/${milestone.id}`)}
                    >
                        {/* Status Badge */}
                        <div className="status-badge">
                            {getStatusIcon(milestone.status)}
                            <span>{milestone.status.replace('_', ' ')}</span>
                        </div>

                        {/* Milestone Content */}
                        <h3 className="milestone-name">{milestone.name}</h3>

                        {/* Progress */}
                        <div className="progress-section">
                            <div className="progress-header">
                                <span className="progress-label">Progress</span>
                                <span className="progress-percentage">{milestone.progress}%</span>
                            </div>
                            <div className="progress-bar">
                                <motion.div
                                    className="progress-fill"
                                    style={{ width: `${milestone.progress}%` }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${milestone.progress}%` }}
                                    transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                                />
                            </div>
                        </div>

                        {/* Details */}
                        <div className="milestone-details">
                            <div className="detail-item">
                                <CheckCircle2 className="detail-icon" />
                                <span>
                                    {milestone.tasksCompleted}/{milestone.tasksTotal} Tasks
                                </span>
                            </div>
                            <div className="detail-item">
                                <Calendar className="detail-icon" />
                                <span>{new Date(milestone.dueDate).toLocaleDateString()}</span>
                            </div>
                            <div className="detail-item">
                                <Users className="detail-icon" />
                                <span>{milestone.assignees} Assignees</span>
                            </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="card-arrow" />
                    </motion.div>
                ))}
            </div>

            {filteredMilestones.length === 0 && (
                <div className="empty-state">
                    <BarChart3 className="empty-icon" />
                    <h3 className="empty-title">No milestones found</h3>
                    <p className="empty-text">Create a new milestone to get started</p>
                </div>
            )}
        </div>
    );
};
