import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Brain,
    CheckCircle,
    XCircle,
    AlertTriangle,
    TrendingUp,
    Shield,
    Zap,
    BarChart3,
    Plus,
} from 'lucide-react';
import './DecisionDashboard.css';
import { CreditService } from '../../services/credit.service';

interface Decision {
    id: string;
    customerName: string;
    decisionType: string;
    result: 'approved' | 'rejected' | 'manual_review' | 'conditional';
    riskLevel: 'low' | 'medium' | 'high' | 'very_high';
    amount?: number;
    createdAt: string;
}

export const DecisionDashboard: React.FC = () => {
    const [decisions, setDecisions] = useState<Decision[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        rejected: 0,
        manualReview: 0,
        automationRate: 0,
    });

    useEffect(() => {
        // Simulating fetching a list of recent decisions from backend
        // In a real app, we would have a dedicated endpoint for decision history
        // For now, we will initialize with some data and allow adding to it
        const initialData: Decision[] = [
            {
                id: '1',
                customerName: 'Acme Corp',
                decisionType: 'Credit Limit',
                result: 'approved',
                riskLevel: 'low',
                amount: 50000,
                createdAt: new Date().toISOString(),
            },
            // ... keeping other mocks as initial state for demo continuity
        ];
        setDecisions(initialData);
        updateStats(initialData);
    }, []);

    const updateStats = (data: Decision[]) => {
        setStats({
            total: data.length,
            approved: data.filter(d => d.result === 'approved').length,
            rejected: data.filter(d => d.result === 'rejected').length,
            manualReview: data.filter(d => d.result === 'manual_review').length,
            automationRate: Math.round((data.filter(d => d.result !== 'manual_review').length / data.length) * 100) || 0,
        });
    };

    const handleNewCreditCheck = async () => {
        setLoading(true);
        try {
            // detailed real API call example
            // In a real UI, this would come from a modal form input
            const pan = "ABCDE1234F";
            const report = await CreditService.fetchCreditReport(pan, "CONSENT_DEMO");

            const newDecision: Decision = {
                id: Date.now().toString(),
                customerName: report.name || "New Applicant",
                decisionType: 'Live Check',
                result: report.score > 750 ? 'approved' : 'manual_review',
                riskLevel: report.score > 750 ? 'low' : 'medium',
                amount: 100000,
                createdAt: new Date().toISOString()
            };

            const updatedDecisions = [newDecision, ...decisions];
            setDecisions(updatedDecisions);
            updateStats(updatedDecisions);
        } catch (error) {
            console.error("Failed to fetch credit report", error);
            // Handle error UI
        } finally {
            setLoading(false);
        }
    };

    const getResultIcon = (result: string) => {
        switch (result) {
            case 'approved':
                return <CheckCircle className="result-icon approved" />;
            case 'rejected':
                return <XCircle className="result-icon rejected" />;
            case 'manual_review':
                return <AlertTriangle className="result-icon review" />;
            default:
                return <Shield className="result-icon" />;
        }
    };

    const getRiskClass = (level: string) => {
        return `risk-${level.replace('_', '-')}`;
    };

    return (
        <div className="decision-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="title-section">
                        <Brain className="page-icon" />
                        <div>
                            <h1 className="page-title">Credit Decisioning Engine</h1>
                            <p className="page-subtitle">AI-powered automated credit decision</p>
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
                        <BarChart3 className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Decisions</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card approved"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="stat-icon-wrapper">
                        <CheckCircle className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.approved}</div>
                        <div className="stat-label">Approved</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={handleNewCreditCheck}
                    style={{ cursor: 'pointer', border: '2px dashed #ccc' }}
                >
                    <div className="stat-icon-wrapper">
                        {loading ? <Zap className="stat-icon" /> : <Plus className="stat-icon" />}
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">New Check</div>
                        <div className="stat-label">{loading ? 'Processing...' : 'Run Simulation'}</div>
                    </div>
                </motion.div>

                <motion.div
                    className="statcard rejected"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="stat-icon-wrapper">
                        <XCircle className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.rejected}</div>
                        <div className="stat-label">Rejected</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card automation"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="stat-icon-wrapper">
                        <Zap className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.automationRate}%</div>
                        <div className="stat-label">Automation Rate</div>
                    </div>
                </motion.div>
            </div>

            {/* Decisions List */}
            <div className="decisions-section">
                <h2 className="section-title">Recent Decisions</h2>

                <div className="decisions-list">
                    {decisions.map((decision, index) => (
                        <motion.div
                            key={decision.id}
                            className={`decision-card ${decision.result}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="decision-header">
                                <div className="decision-customer">{decision.customerName}</div>
                                <div className="decision-result">
                                    {getResultIcon(decision.result)}
                                    <span className="result-text">{decision.result.replace('_', ' ')}</span>
                                </div>
                            </div>

                            <div className="decision-body">
                                <div className="decision-type">{decision.decisionType}</div>
                                {decision.amount && (
                                    <div className="decision-amount">${decision.amount.toLocaleString()}</div>
                                )}
                            </div>

                            <div className="decision-footer">
                                <div className={`risk-badge ${getRiskClass(decision.riskLevel)}`}>
                                    <Shield className="risk-icon" />
                                    {decision.riskLevel.replace('_', ' ')} risk
                                </div>
                                <div className="decision-date">
                                    {new Date(decision.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
