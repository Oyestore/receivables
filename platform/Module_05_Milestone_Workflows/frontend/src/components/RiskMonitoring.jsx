import React, { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, Shield, Activity } from 'lucide-react';
import './RiskMonitoring.css';

/**
 * Risk Monitoring Dashboard
 * 
 * Real-time risk detection and monitoring
 * - Multi-factor risk analysis
 * - Risk trend visualization
 * - Auto-escalation alerts
 */
const RiskMonitoring = ({ tenantId }) => {
    const [riskAlerts, setRiskAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRiskAlerts();
    }, [tenantId]);

    const fetchRiskAlerts = async () => {
        try {
            // Mock data for demo
            const mockAlerts = [
                {
                    milestoneId: 'm-001',
                    milestoneName: 'Backend API Development',
                    riskScore: 87,
                    alertLevel: 'CRITICAL',
                    reason: 'High risk due to: velocityRisk (95%), deadlineProximity (82%)',
                    recommendations: [
                        'Increase resource allocation to improve velocity',
                        'Consider deadline extension or scope reduction',
                    ],
                    breakdown: {
                        velocityRisk: 95,
                        dependencyRisk: 45,
                        resourceRisk: 70,
                        historicalRisk: 25,
                        deadlineProximity: 82,
                        complexityRisk: 60,
                        stakeholderRisk: 20,
                    },
                },
                {
                    milestoneId: 'm-002',
                    milestoneName: 'UI/UX Design Phase',
                    riskScore: 68,
                    alertLevel: 'WARNING',
                    reason: 'Medium risk due to: resourceRisk (75%), velocityRisk (60%)',
                    recommendations: ['Monitor closely and review progress daily'],
                    breakdown: {
                        velocityRisk: 60,
                        dependencyRisk: 30,
                        resourceRisk: 75,
                        historicalRisk: 15,
                        deadlineProximity: 45,
                        complexityRisk: 50,
                        stakeholderRisk: 10,
                    },
                },
            ];

            setRiskAlerts(mockAlerts);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch risk alerts:', error);
            setLoading(false);
        }
    };

    const getRiskColor = (level) => {
        switch (level) {
            case 'CRITICAL': return '#dc2626';
            case 'DANGER': return '#ef4444';
            case 'WARNING': return '#f59e0b';
            default: return '#10b981';
        }
    };

    if (loading) {
        return <div className="loading-screen">Analyzing risks...</div>;
    }

    return (
        <div className="risk-monitoring">
            {/* Hero */}
            <div className="risk-hero">
                <Shield size={48} className="hero-icon" />
                <h1>Risk Monitoring</h1>
                <p>Real-time multi-factor risk analysis with auto-escalation</p>
            </div>

            {/* Overall Stats */}
            <div className="risk-stats">
                <div className="risk-stat-card critical">
                    <AlertTriangle size={24} />
                    <div>
                        <div className="stat-value">{riskAlerts.filter(a => a.alertLevel === 'CRITICAL').length}</div>
                        <div className="stat-label">Critical Risks</div>
                    </div>
                </div>
                <div className="risk-stat-card warning">
                    <TrendingDown size={24} />
                    <div>
                        <div className="stat-value">{riskAlerts.filter(a => a.alertLevel === 'WARNING').length}</div>
                        <div className="stat-label">Warnings</div>
                    </div>
                </div>
                <div className="risk-stat-card healthy">
                    <Activity size={24} />
                    <div>
                        <div className="stat-value">
                            {riskAlerts.length > 0
                                ? (riskAlerts.reduce((sum, a) => sum + a.riskScore, 0) / riskAlerts.length).toFixed(0)
                                : 0}
                        </div>
                        <div className="stat-label">Avg Risk Score</div>
                    </div>
                </div>
            </div>

            {/* Risk Alerts */}
            <div className="risk-alerts-section">
                <h2>Active Risk Alerts</h2>

                {riskAlerts.length === 0 ? (
                    <div className="empty-state">
                        <Shield size={64} />
                        <h3>All Clear!</h3>
                        <p>No high-risk milestones detected</p>
                    </div>
                ) : (
                    <div className="risk-alerts-list">
                        {riskAlerts.map((alert, idx) => (
                            <div key={idx} className={`risk-alert-card alert-${alert.alertLevel.toLowerCase()}`}>
                                {/* Header */}
                                <div className="alert-header">
                                    <div className="alert-title-section">
                                        <h3>{alert.milestoneName}</h3>
                                        <span
                                            className="alert-badge"
                                            style={{ backgroundColor: getRiskColor(alert.alertLevel) }}
                                        >
                                            {alert.alertLevel}
                                        </span>
                                    </div>
                                    <div className="risk-score-big">
                                        <div className="score-circle" style={{ borderColor: getRiskColor(alert.alertLevel) }}>
                                            <span className="score-number">{alert.riskScore}</span>
                                        </div>
                                        <span className="score-label">Risk Score</span>
                                    </div>
                                </div>

                                {/* Reason */}
                                <div className="alert-reason">
                                    <AlertTriangle size={16} />
                                    <span>{alert.reason}</span>
                                </div>

                                {/* Risk Breakdown */}
                                <div className="risk-breakdown">
                                    <h4>Risk Factors</h4>
                                    <div className="factors-grid">
                                        {Object.entries(alert.breakdown).map(([key, value]) => (
                                            <div key={key} className="factor-item">
                                                <div className="factor-header">
                                                    <span className="factor-name">{key.replace(/Risk$/, '').replace(/([A-Z])/g, ' $1').trim()}</span>
                                                    <span className="factor-value">{value}%</span>
                                                </div>
                                                <div className="factor-bar">
                                                    <div
                                                        className="factor-fill"
                                                        style={{
                                                            width: `${value}%`,
                                                            backgroundColor: value > 70 ? '#ef4444' : value > 50 ? '#f59e0b' : '#10b981',
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Recommendations */}
                                <div className="recommendations">
                                    <h4>AI Recommendations</h4>
                                    <ul className="recommendations-list">
                                        {alert.recommendations.map((rec, i) => (
                                            <li key={i}>{rec}</li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Actions */}
                                <div className="alert-actions">
                                    <button className="action-btn escalate">Escalate Now</button>
                                    <button className="action-btn details">View Details</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RiskMonitoring;
