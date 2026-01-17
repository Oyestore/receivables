import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    Plus,
    MessageSquare,
    Clock,
    CheckCircle,
    XCircle,
    Filter,
    Search,
} from 'lucide-react';
import {
    DashboardHeader,
    StatCard,
    GradientCard,
    StatusBadge,
    Button,
} from '../../design-system';
import './DisputeDashboard.css';

interface Dispute {
    id: string;
    title: string;
    invoice: string;
    customer: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    createdAt: string;
    messages: number;
}

export const DisputeDashboard: React.FC = () => {
    const [disputes] = useState<Dispute[]>([
        {
            id: '1',
            title: 'Invoice amount discrepancy',
            invoice: 'INV-001',
            customer: 'Tech Solutions Inc.',
            priority: 'high',
            status: 'in_progress',
            createdAt: '2025-01-14T10:00:00',
            messages: 3,
        },
        {
            id: '2',
            title: 'Payment not received',
            invoice: 'INV-045',
            customer: 'Digital Marketing Co.',
            priority: 'urgent',
            status: 'open',
            createdAt: '2025-01-14T14:30:00',
            messages: 1,
        },
        {
            id: '3',
            title: 'Delivery confirmation needed',
            invoice: 'INV-032',
            customer: 'Startup Ventures',
            priority: 'medium',
            status: 'resolved',
            createdAt: '2025-01-13T09:15:00',
            messages: 8,
        },
    ]);

    const stats = {
        total: disputes.length,
        open: disputes.filter(d => d.status === 'open').length,
        inProgress: disputes.filter(d => d.status === 'in_progress').length,
        resolved: disputes.filter(d => d.status === 'resolved').length,
    };

    const getPriorityColor = (priority: Dispute['priority']) => {
        switch (priority) {
            case 'urgent': return '#ef4444';
            case 'high': return '#f59e0b';
            case 'medium': return '#3b82f6';
            case 'low': return '#64748b';
        }
    };

    return (
        <div className="dispute-dashboard">
            <DashboardHeader
                title="Dispute Resolution"
                subtitle="Manage and resolve payment disputes"
                icon={AlertCircle}
                actions={
                    <>
                        <Button variant="outline" icon={Filter} size="md">
                            Filter
                        </Button>
                        <Button variant="primary" icon={Plus} theme="critical" size="md">
                            New Dispute
                        </Button>
                    </>
                }
            />

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    value={stats.total}
                    label="Total Disputes"
                    icon={MessageSquare}
                    theme="critical"
                />
                <StatCard
                    value={stats.open}
                    label="Open"
                    icon={AlertCircle}
                    theme="critical"
                />
                <StatCard
                    value={stats.inProgress}
                    label="In Progress"
                    icon={Clock}
                    theme="operations"
                />
                <StatCard
                    value={stats.resolved}
                    label="Resolved"
                    icon={CheckCircle}
                    theme="invoicing"
                />
            </div>

            {/* Disputes List */}
            <GradientCard theme="critical" glass className="disputes-container">
                <div className="disputes-header">
                    <h3 className="section-title">Active Disputes</h3>
                    <div className="search-box">
                        <Search className="search-icon" />
                        <input type="text" placeholder="Search disputes..." className="search-input" />
                    </div>
                </div>

                <div className="disputes-list">
                    {disputes.map((dispute, index) => (
                        <motion.div
                            key={dispute.id}
                            className="dispute-item"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div
                                className="priority-indicator"
                                style={{ background: getPriorityColor(dispute.priority) }}
                            />

                            <div className="dispute-content">
                                <div className="dispute-main">
                                    <h4 className="dispute-title">{dispute.title}</h4>
                                    <div className="dispute-meta">
                                        <span className="meta-item">
                                            <strong>Invoice:</strong> {dispute.invoice}
                                        </span>
                                        <span className="meta-divider">•</span>
                                        <span className="meta-item">{dispute.customer}</span>
                                    </div>
                                </div>

                                <div className="dispute-badges">
                                    <span
                                        className="priority-badge"
                                        style={{
                                            background: `${getPriorityColor(dispute.priority)}15`,
                                            color: getPriorityColor(dispute.priority),
                                        }}
                                    >
                                        {dispute.priority.toUpperCase()}
                                    </span>
                                    <StatusBadge
                                        status={
                                            dispute.status === 'resolved' ? 'success' :
                                                dispute.status === 'in_progress' ? 'pending' :
                                                    dispute.status === 'closed' ? 'info' : 'warning'
                                        }
                                        label={dispute.status.replace('_', ' ')}
                                        size="sm"
                                    />
                                </div>
                            </div>

                            <div className="dispute-footer">
                                <div className="dispute-time">
                                    <Clock className="time-icon" />
                                    {new Date(dispute.createdAt).toLocaleDateString()}
                                </div>
                                <div className="dispute-messages">
                                    <MessageSquare className="msg-icon" />
                                    {dispute.messages} messages
                                </div>
                                <Button variant="ghost" size="sm">
                                    View Details
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </GradientCard>
        </div>
    );
};
