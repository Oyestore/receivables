import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Shield,
    AlertTriangle,
    CheckCircle,
    Clock,
    FileText,
    Download,
} from 'lucide-react';
import {
    DashboardHeader,
    StatCard,
    GradientCard,
    StatusBadge,
    Button,
} from '../../design-system';
import './CreditScoringDashboard.css';

interface CreditFactor {
    category: string;
    score: number;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
}

export const CreditScoringDashboard: React.FC = () => {
    const creditScore = 742;
    const maxScore = 900;
    const scorePercentage = (creditScore / maxScore) * 100;

    const [factors] = useState<CreditFactor[]>([
        {
            category: 'Payment History',
            score: 95,
            impact: 'positive',
            description: 'Excellent payment record',
        },
        {
            category: 'Credit Utilization',
            score: 78,
            impact: 'positive',
            description: 'Good utilization ratio',
        },
        {
            category: 'Business Age',
            score: 65,
            impact: 'neutral',
            description: '3 years in operation',
        },
        {
            category: 'Outstanding Debt',
            score: 45,
            impact: 'negative',
            description: 'High debt-to-income ratio',
        },
    ]);

    const getRiskLevel = (score: number): { level: string; color: string; status: 'success' | 'warning' | 'error' } => {
        if (score >= 700) return { level: 'Low Risk', color: '#10b981', status: 'success' };
        if (score >= 600) return { level: 'Medium Risk', color: '#f59e0b', status: 'warning' };
        return { level: 'High Risk', color: '#ef4444', status: 'error' };
    };

    const riskInfo = getRiskLevel(creditScore);

    return (
        <div className="credit-dashboard">
            <DashboardHeader
                title="Credit Scoring"
                subtitle="Monitor and improve your credit score"
                icon={Shield}
                actions={
                    <>
                        <Button variant="outline" icon={FileText} size="md">
                            View Report
                        </Button>
                        <Button variant="primary" icon={Download} theme="decisioning" size="md">
                            Download Score
                        </Button>
                    </>
                }
            />

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    value={creditScore}
                    label="Credit Score"
                    icon={TrendingUp}
                    theme="decisioning"
                    trend={{ value: 5.2, direction: 'up' }}
                />
                <StatCard
                    value="A+"
                    label="Credit Grade"
                    icon={Shield}
                    theme="decisioning"
                />
                <StatCard
                    value="12 days"
                    label="Avg Payment Time"
                    icon={Clock}
                    theme="decisioning"
                />
                <StatCard
                    value="98%"
                    label="On-Time Payments"
                    icon={CheckCircle}
                    theme="decisioning"
                />
            </div>

            {/* Score Visualization */}
            <div className="score-row">
                {/* Main Score Gauge */}
                <GradientCard theme="decisioning" glass className="score-card">
                    <h3 className="card-title">Current Score</h3>

                    <div className="score-gauge">
                        <svg className="gauge-svg" viewBox="0 0 200 200">
                            {/* Background circle */}
                            <circle
                                cx="100"
                                cy="100"
                                r="80"
                                fill="none"
                                stroke="#e2e8f0"
                                strokeWidth="16"
                            />

                            {/* Progress circle */}
                            <motion.circle
                                cx="100"
                                cy="100"
                                r="80"
                                fill="none"
                                stroke="url(#scoreGradient)"
                                strokeWidth="16"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 80}`}
                                strokeDashoffset={`${2 * Math.PI * 80 * (1 - scorePercentage / 100)}`}
                                transform="rotate(-90 100 100)"
                                initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - scorePercentage / 100) }}
                                transition={{ duration: 2, ease: 'easeOut' }}
                            />

                            {/* Gradient definition */}
                            <defs>
                                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="50%" stopColor="#f59e0b" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                            </defs>
                        </svg>

                        <div className="score-center">
                            <div className="score-number">{creditScore}</div>
                            <div className="score-max">/ {maxScore}</div>
                        </div>
                    </div>

                    <div className="risk-indicator" style={{ background: riskInfo.color }}>
                        <StatusBadge status={riskInfo.status} label={riskInfo.level} />
                    </div>
                </GradientCard>

                {/* Score Breakdown */}
                <GradientCard theme="decisioning" glass className="factors-card">
                    <h3 className="card-title">Score Factors</h3>

                    <div className="factors-list">
                        {factors.map((factor, index) => (
                            <motion.div
                                key={factor.category}
                                className="factor-item"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="factor-header">
                                    <span className="factor-name">{factor.category}</span>
                                    <span className={`factor-impact impact-${factor.impact}`}>
                                        {factor.impact === 'positive' && <CheckCircle className="impact-icon" />}
                                        {factor.impact === 'negative' && <AlertTriangle className="impact-icon" />}
                                        {factor.impact === 'neutral' && <Clock className="impact-icon" />}
                                        {factor.score}%
                                    </span>
                                </div>

                                <div className="factor-bar">
                                    <motion.div
                                        className={`factor-fill fill-${factor.impact}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${factor.score}%` }}
                                        transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                                    />
                                </div>

                                <p className="factor-description">{factor.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </GradientCard>
            </div>

            {/* Recommendations */}
            <GradientCard theme="decisioning" glass className="recommendations-card">
                <h3 className="card-title">Recommendations to Improve Score</h3>

                <div className="recommendations-grid">
                    {[
                        { title: 'Reduce Outstanding Debt', impact: 'High', priority: 'critical' },
                        { title: 'Maintain Payment Schedule', impact: 'Medium', priority: 'high' },
                        { title: 'Diversify Credit Mix', impact: 'Low', priority: 'medium' },
                    ].map((rec, index) => (
                        <motion.div
                            key={rec.title}
                            className={`recommendation-item priority-${rec.priority}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <h4 className="rec-title">{rec.title}</h4>
                            <div className="rec-meta">
                                <span className="rec-impact">Impact: {rec.impact}</span>
                                <StatusBadge
                                    status={rec.priority === 'critical' ? 'error' : rec.priority === 'high' ? 'warning' : 'info'}
                                    label={rec.priority}
                                    size="sm"
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </GradientCard>
        </div>
    );
};
