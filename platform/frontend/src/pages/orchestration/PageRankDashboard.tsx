import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
    Trophy,
    TrendingUp,
    Users,
    Download,
    Filter,
    Award,
} from 'lucide-react';
import { module10API, NodeImportance } from '../../services/module10-api';
import './PageRankDashboard.css';

interface PageRankProps {
    tenantId: string;
}

export const PageRankDashboard: React.FC<PageRankProps> = ({ tenantId }) => {
    const [topN, setTopN] = useState(20);

    const { data: customers, isLoading, refetch } = useQuery({
        queryKey: ['key-customers', tenantId, topN],
        queryFn: () => module10API.getKeyCustomers({ tenantId, topN }),
        enabled: !!tenantId
    });

    const getRiskColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'low': return '#10b981';
            case 'medium': return '#f59e0b';
            case 'high': return '#ef4444';
            case 'critical': return '#7f1d1d';
            default: return '#64748b';
        }
    };

    const getRiskBadgeClass = (riskLevel: string) => {
        switch (riskLevel) {
            case 'low': return 'risk-low';
            case 'medium': return 'risk-medium';
            case 'high': return 'risk-high';
            case 'critical': return 'risk-critical';
            default: return '';
        }
    };

    const handleExport = () => {
        if (!customers || !customers.data) return;

        const csvContent = [
            ['Rank', 'Customer ID', 'PageRank', 'Betweenness', 'Closeness', 'Degree', 'Centrality Score', 'Risk Level'],
            ...customers.data.map((c: NodeImportance, i: number) => [
                i + 1,
                c.nodeId,
                c.pageRank.toFixed(6),
                c.betweenness.toFixed(6),
                c.closeness.toFixed(6),
                c.degree,
                c.centralityScore.toFixed(6),
                c.riskLevel
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pagerank_top${topN}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="pagerank-dashboard">
            {/* Header */}
            <motion.div
                className="dashboard-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="header-content">
                    <div className="title-section">
                        <Trophy className="page-icon" />
                        <div>
                            <h1 className="page-title">PageRank Dashboard</h1>
                            <p className="page-subtitle">Key customer identification by network centrality</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Controls */}
            <motion.div
                className="controls-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="controls-grid">
                    <div className="control-group">
                        <Filter size={20} />
                        <label>Top Customers</label>
                        <select
                            value={topN}
                            onChange={(e) => setTopN(parseInt(e.target.value))}
                            className="top-select"
                        >
                            <option value={10}>Top 10</option>
                            <option value={20}>Top 20</option>
                            <option value={50}>Top 50</option>
                            <option value={100}>Top 100</option>
                        </select>
                    </div>

                    <button onClick={() => refetch()} className="refresh-btn">
                        <Users size={20} />
                        Refresh Rankings
                    </button>

                    <button onClick={handleExport} className="export-btn" disabled={!customers}>
                        <Download size={20} />
                        Export CSV
                    </button>
                </div>
            </motion.div>

            {/* Top 3 Podium */}
            {customers && customers.data && customers.data.length >= 3 && (
                <motion.div
                    className="podium-section"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="podium-grid">
                        {/* 2nd Place */}
                        <motion.div
                            className="podium-card second"
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="medal silver">
                                <Award size={48} />
                                <span className="rank">#2</span>
                            </div>
                            <h3 className="customer-id">{customers.data[1].nodeId}</h3>
                            <div className="pagerank-score">{customers.data[1].pageRank.toFixed(6)}</div>
                            <div className={`risk-badge ${getRiskBadgeClass(customers.data[1].riskLevel)}`}>
                                {customers.data[1].riskLevel}
                            </div>
                        </motion.div>

                        {/* 1st Place */}
                        <motion.div
                            className="podium-card first"
                            initial={{ opacity: 0, y: 60 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                        >
                            <div className="medal gold">
                                <Trophy size={64} />
                                <span className="rank">#1</span>
                            </div>
                            <h3 className="customer-id">{customers.data[0].nodeId}</h3>
                            <div className="pagerank-score">{customers.data[0].pageRank.toFixed(6)}</div>
                            <div className={`risk-badge ${getRiskBadgeClass(customers.data[0].riskLevel)}`}>
                                {customers.data[0].riskLevel}
                            </div>
                        </motion.div>

                        {/* 3rd Place */}
                        <motion.div
                            className="podium-card third"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                        >
                            <div className="medal bronze">
                                <Award size={40} />
                                <span className="rank">#3</span>
                            </div>
                            <h3 className="customer-id">{customers.data[2].nodeId}</h3>
                            <div className="pagerank-score">{customers.data[2].pageRank.toFixed(6)}</div>
                            <div className={`risk-badge ${getRiskBadgeClass(customers.data[2].riskLevel)}`}>
                                {customers.data[2].riskLevel}
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}

            {/* Rankings List */}
            {customers && (
                <motion.div
                    className="rankings-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <h2 className="section-title">
                        <TrendingUp size={24} />
                        Complete Rankings
                    </h2>

                    <div className="rankings-list">
                        {customers.data.map((customer: NodeImportance, index: number) => (
                            <motion.div
                                key={customer.nodeId}
                                className="ranking-card"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + index * 0.02 }}
                            >
                                <div className="rank-badge">#{index + 1}</div>

                                <div className="customer-info">
                                    <h4 className="customer-name">{customer.nodeId}</h4>
                                    <div className={`risk-level ${getRiskBadgeClass(customer.riskLevel)}`}>
                                        {customer.riskLevel} risk
                                    </div>
                                </div>

                                <div className="centrality-metrics">
                                    <div className="metric">
                                        <span className="metric-label">PageRank</span>
                                        <div className="metric-bar">
                                            <div
                                                className="metric-fill pagerank"
                                                style={{ width: `${Math.min(customer.pageRank * 1000, 100)}%` }}
                                            />
                                        </div>
                                        <span className="metric-value">{customer.pageRank.toFixed(6)}</span>
                                    </div>

                                    <div className="metric">
                                        <span className="metric-label">Betweenness</span>
                                        <div className="metric-bar">
                                            <div
                                                className="metric-fill betweenness"
                                                style={{ width: `${customer.betweenness * 100}%` }}
                                            />
                                        </div>
                                        <span className="metric-value">{customer.betweenness.toFixed(4)}</span>
                                    </div>

                                    <div className="metric">
                                        <span className="metric-label">Closeness</span>
                                        <div className="metric-bar">
                                            <div
                                                className="metric-fill closeness"
                                                style={{ width: `${customer.closeness * 100}%` }}
                                            />
                                        </div>
                                        <span className="metric-value">{customer.closeness.toFixed(4)}</span>
                                    </div>

                                    <div className="metric">
                                        <span className="metric-label">Degree</span>
                                        <div className="metric-bar">
                                            <div
                                                className="metric-fill degree"
                                                style={{ width: `${Math.min(customer.degree * 10, 100)}%` }}
                                            />
                                        </div>
                                        <span className="metric-value">{customer.degree}</span>
                                    </div>
                                </div>

                                <div className="composite-score">
                                    <span className="composite-label">Composite</span>
                                    <div className="composite-gauge">
                                        <svg className="gauge-svg" viewBox="0 0 100 100">
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                fill="none"
                                                stroke="#e2e8f0"
                                                strokeWidth="10"
                                            />
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                fill="none"
                                                stroke="#047857"
                                                strokeWidth="10"
                                                strokeDasharray={`${customer.centralityScore * 282.7} 282.7`}
                                                transform="rotate(-90 50 50)"
                                            />
                                            <text x="50" y="55" textAnchor="middle" className="gauge-text">
                                                {(customer.centralityScore * 100).toFixed(0)}
                                            </text>
                                        </svg>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Loading State */}
            {isLoading && (
                <motion.div
                    className="loading-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="loading-content">
                        <div className="loader-spinner" />
                        <p>Calculating PageRank rankings...</p>
                    </div>
                </motion.div>
            )}

            {/* Empty State */}
            {!customers && !isLoading && (
                <motion.div
                    className="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <Trophy size={64} className="empty-icon" />
                    <h3>No Data Available</h3>
                    <p>Build the customer relationship graph to see PageRank rankings</p>
                </motion.div>
            )}
        </div>
    );
};
