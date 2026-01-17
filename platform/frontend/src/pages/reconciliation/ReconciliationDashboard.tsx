import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    CheckCircle,
    Clock,
    AlertTriangle,
    TrendingUp,
    RefreshCw,
    Sparkles,
    ChevronRight,
} from 'lucide-react';
import './ReconciliationDashboard.css';

interface DashboardStats {
    total: number;
    matched: number;
    pending: number;
    suspended: number;
    matchRate: string;
}

interface RecentMatch {
    id: string;
    amount: number;
    invoiceNumber: string;
    customerName: string;
    matchScore: number;
    status: string;
    timestamp: string;
}

import { reconciliationApi, DashboardStats as ServiceDashboardStats, ReconciliationMatch } from '../../services/module17.service';

interface LocalDashboardStats extends ServiceDashboardStats {
    suspended: number;
    matchRate: string;
}

export const ReconciliationDashboard: React.FC = () => {
    const [stats, setStats] = useState<LocalDashboardStats>({
        total: 0,
        matched: 0,
        pending: 0,
        suspended: 0,
        matchRate: '0%',
    });

    const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [dashboardData, matchesData] = await Promise.all([
                reconciliationApi.getDashboardStats(),
                reconciliationApi.getMatches('pending') // Fetch pending or relevant status
            ]);
            
            // Map service data to local interface
            const localStats: LocalDashboardStats = {
                ...dashboardData,
                suspended: 0, // Default value since service doesn't provide this
                matchRate: dashboardData.total > 0 
                    ? `${Math.round((dashboardData.matched / dashboardData.total) * 100)}%`
                    : '0%'
            };
            setStats(localStats);

            // Map service data to UI format
            const mappedMatches = matchesData.slice(0, 5).map((m: ReconciliationMatch) => ({
                id: m.id,
                amount: m.bankTransaction?.amount || 0,
                invoiceNumber: m.invoiceId || 'N/A', // Service has invoiceId
                customerName: m.bankTransaction?.parsedData?.customerName || 'Unknown',
                matchScore: m.matchScore,
                status: m.status,
                timestamp: 'Just now' // Service doesn't provide relative time, would need logic
            }));
            setRecentMatches(mappedMatches);
        } catch (error) {
            console.error("Failed to load reconciliation data", error);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
    };

    const handleRunMatching = async () => {
        try {
            await reconciliationApi.runMatching();
            alert('Reconciliation started! AI matching in progress...');
            handleRefresh();
        } catch (error) {
            console.error("Failed to start matching", error);
            alert("Failed to start matching process");
        }
    };

    return (
        <div className="reconciliation-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="title-section">
                        <Sparkles className="title-icon" />
                        <div>
                            <h1 className="dashboard-title">Reconciliation Center</h1>
                            <p className="dashboard-subtitle">AI-Powered Bank Reconciliation</p>
                        </div>
                    </div>

                    <div className="header-actions">
                        <motion.button
                            className="btn-secondary"
                            onClick={handleRefresh}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <RefreshCw className={`icon ${isRefreshing ? 'spinning' : ''}`} />
                            Refresh
                        </motion.button>

                        <motion.button
                            className="btn-primary"
                            onClick={handleRunMatching}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Sparkles className="icon" />
                            Run Auto-Match
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <motion.div
                    className="stat-card stat-card-total"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="stat-header">
                        <span className="stat-label">Total Transactions</span>
                        <TrendingUp className="stat-icon" />
                    </div>
                    <div className="stat-value">{stats.total.toLocaleString()}</div>
                    <div className="stat-trend positive">+12% from last month</div>
                </motion.div>

                <motion.div
                    className="stat-card stat-card-matched"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="stat-header">
                        <span className="stat-label">Matched</span>
                        <CheckCircle className="stat-icon" />
                    </div>
                    <div className="stat-value">{stats.matched.toLocaleString()}</div>
                    <div className="stat-percentage">{stats.matchRate} Match Rate</div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: stats.matchRate }} />
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card stat-card-pending"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="stat-header">
                        <span className="stat-label">Pending Review</span>
                        <Clock className="stat-icon" />
                    </div>
                    <div className="stat-value">{stats.pending}</div>
                    <div className="stat-sub">Needs manual approval</div>
                </motion.div>

                <motion.div
                    className="stat-card stat-card-suspense"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="stat-header">
                        <span className="stat-label">Suspense Account</span>
                        <AlertTriangle className="stat-icon" />
                    </div>
                    <div className="stat-value">{stats.suspended}</div>
                    <div className="stat-sub">Unmatched after 24h</div>
                </motion.div>
            </div>

            {/* Recent Matches Table */}
            <motion.div
                className="recent-matches-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <div className="section-header">
                    <h2 className="section-title">Recent Matches</h2>
                    <a href="/reconciliation/matches" className="view-all-link">
                        View All <ChevronRight className="icon-sm" />
                    </a>
                </div>

                <div className="matches-table">
                    <div className="table-header">
                        <div className="col-amount">Amount</div>
                        <div className="col-invoice">Invoice</div>
                        <div className="col-customer">Customer</div>
                        <div className="col-score">Match Score</div>
                        <div className="col-status">Status</div>
                        <div className="col-time">Time</div>
                    </div>

                    {recentMatches.map((match, index) => (
                        <motion.div
                            key={match.id}
                            className="table-row"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                        >
                            <div className="col-amount">
                                ₹{match.amount.toLocaleString()}
                            </div>
                            <div className="col-invoice">
                                <span className="invoice-badge">{match.invoiceNumber}</span>
                            </div>
                            <div className="col-customer">{match.customerName}</div>
                            <div className="col-score">
                                <div className="score-badge">
                                    <div
                                        className="score-bar"
                                        style={{
                                            width: `${match.matchScore}%`,
                                            background:
                                                match.matchScore >= 90
                                                    ? 'var(--success-gradient)'
                                                    : match.matchScore >= 70
                                                        ? 'var(--warning-gradient)'
                                                        : 'var(--error-gradient)',
                                        }}
                                    />
                                    <span className="score-text">{match.matchScore}</span>
                                </div>
                            </div>
                            <div className="col-status">
                                {match.status === 'auto_approved' ? (
                                    <span className="status-badge status-approved">
                                        <CheckCircle className="icon-xs" />
                                        Auto-Approved
                                    </span>
                                ) : (
                                    <span className="status-badge status-pending">
                                        <Clock className="icon-xs" />
                                        Review
                                    </span>
                                )}
                            </div>
                            <div className="col-time text-muted">{match.timestamp}</div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <div className="action-card" onClick={() => (window.location.href = '/reconciliation/match-review')}>
                    <Clock className="action-icon" />
                    <div className="action-content">
                        <h3 className="action-title">Review Pending Matches</h3>
                        <p className="action-desc">{stats.pending} suggestions waiting</p>
                    </div>
                    <ChevronRight className="action-arrow" />
                </div>

                <div className="action-card" onClick={() => (window.location.href = '/reconciliation/suspense')}>
                    <AlertTriangle className="action-icon warning" />
                    <div className="action-content">
                        <h3 className="action-title">Resolve Suspense Items</h3>
                        <p className="action-desc">{stats.suspended} unmatched transactions</p>
                    </div>
                    <ChevronRight className="action-arrow" />
                </div>

                <div className="action-card" onClick={() => (window.location.href = '/reconciliation/import')}>
                    <TrendingUp className="action-icon" />
                    <div className="action-content">
                        <h3 className="action-title">Import Bank Statement</h3>
                        <p className="action-desc">Upload CSV or connect bank</p>
                    </div>
                    <ChevronRight className="action-arrow" />
                </div>
            </div>
        </div>
    );
};
