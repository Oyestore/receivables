import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
    Play,
    Pause,
    CheckCircle,
    Clock,
    TrendingUp,
    AlertCircle,
    DollarSign,
    Users,
} from 'lucide-react';
import './WorkflowDashboard.css';

/**
 * Workflow Dashboard
 * 
 * Real-time milestone and workflow tracking
 * - Live workflow status
 * - Milestone progress visualization
 * - Payment tracking
 * - Timeline view
 */
const WorkflowDashboard = ({ tenantId }) => {
    const [workflows, setWorkflows] = useState([]);
    const [stats, setStats] = useState(null);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWorkflows();

        // WebSocket connection for real-time updates
        const socket = io('http://localhost:3005/workflows', {
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('subscribe', tenantId);
        });

        socket.on('workflow.updated', (data) => {
            setWorkflows(prev =>
                prev.map(w => w.id === data.workflowId ? { ...w, ...data.updates } : w)
            );
        });

        socket.on('milestone.completed', (data) => {
            console.log('Milestone completed:', data);
            fetchWorkflows(); // Refresh data
        });

        return () => socket.disconnect();
    }, [tenantId]);

    const fetchWorkflows = async () => {
        try {
            const response = await fetch(`http://localhost:3005/api/v1/workflows?tenantId=${tenantId}`);
            const data = await response.json();
            setWorkflows(data.data || []);
            calculateStats(data.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
            setLoading(false);
        }
    };

    const calculateStats = (workflowData) => {
        const stats = {
            total: workflowData.length,
            active: workflowData.filter(w => w.status === 'IN_PROGRESS').length,
            completed: workflowData.filter(w => w.status === 'COMPLETED').length,
            totalValue: workflowData.reduce((sum, w) => sum + (w.totalValue || 0), 0),
        };
        setStats(stats);
    };

    if (loading) {
        return <div className="loading-screen">Loading workflows...</div>;
    }

    return (
        <div className="workflow-dashboard">
            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card total">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <div className="stat-label">Total Workflows</div>
                        <div className="stat-value">{stats?.total || 0}</div>
                    </div>
                </div>

                <div className="stat-card active">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-content">
                        <div className="stat-label">Active Now</div>
                        <div className="stat-value">{stats?.active || 0}</div>
                        <div className="stat-change">
                            <Play size={14} /> In progress
                        </div>
                    </div>
                </div>

                <div className="stat-card completed">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-label">Completed</div>
                        <div className="stat-value">{stats?.completed || 0}</div>
                    </div>
                </div>

                <div className="stat-card value">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <div className="stat-label">Total Value</div>
                        <div className="stat-value">
                            ₹{stats?.totalValue ? (stats.totalValue / 100000).toFixed(1) : '0'}L
                        </div>
                    </div>
                </div>
            </div>

            {/* Workflows List */}
            <div className="workflows-section">
                <div className="section-header">
                    <h2>Active Workflows</h2>
                    <div className="connection-badge">
                        <div className={`dot ${connected ? 'connected' : 'disconnected'}`}></div>
                        {connected ? 'Live Updates' : 'Offline'}
                    </div>
                </div>

                <div className="workflows-list">
                    {workflows.length === 0 ? (
                        <div className="empty-state">
                            <Activity size={64} />
                            <h3>No workflows yet</h3>
                            <p>Create your first workflow to get started</p>
                        </div>
                    ) : (
                        workflows.map(workflow => (
                            <div key={workflow.id} className={`workflow-card status-${workflow.status.toLowerCase()}`}>
                                {/* Workflow Header */}
                                <div className="workflow-header">
                                    <div className="workflow-title-section">
                                        <h3 className="workflow-title">{workflow.name}</h3>
                                        <span className={`status-badge ${workflow.status.toLowerCase()}`}>
                                            {workflow.status}
                                        </span>
                                    </div>
                                    <div className="workflow-meta">
                                        <div className="meta-item">
                                            <Users size={14} />
                                            <span>{workflow.client || 'No client'}</span>
                                        </div>
                                        <div className="meta-item">
                                            <DollarSign size={14} />
                                            <span>₹{((workflow.totalValue || 0) / 100000).toFixed(1)}L</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="progress-section">
                                    <div className="progress-label">
                                        <span>Progress</span>
                                        <span className="progress-percentage">
                                            {workflow.completionPercentage || 0}%
                                        </span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${workflow.completionPercentage || 0}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Milestones */}
                                <div className="milestones-section">
                                    <div className="milestones-header">
                                        <span>Milestones</span>
                                        <span className="milestone-count">
                                            {workflow.completedMilestones || 0} / {workflow.totalMilestones || 0}
                                        </span>
                                    </div>
                                    <div className="milestones-grid">
                                        {(workflow.milestones || []).slice(0, 4).map((milestone, idx) => (
                                            <div key={idx} className={`milestone-chip status-${milestone.status.toLowerCase()}`}>
                                                {milestone.status === 'COMPLETED' && <CheckCircle size={12} />}
                                                {milestone.status === 'IN_PROGRESS' && <Clock size={12} />}
                                                {milestone.status === 'PENDING' && <Pause size={12} />}
                                                <span>{milestone.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="workflow-footer">
                                    <div className="timeline-info">
                                        <Clock size={14} />
                                        <span>
                                            {workflow.dueDate
                                                ? `Due ${new Date(workflow.dueDate).toLocaleDateString()}`
                                                : 'No due date'}
                                        </span>
                                    </div>
                                    <button className="view-details-btn">View Details →</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkflowDashboard;
