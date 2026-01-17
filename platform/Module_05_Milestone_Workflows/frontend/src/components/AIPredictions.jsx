import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Calendar, Target, Sparkles } from 'lucide-react';
import './AIPredictions.css';

/**
 * AI Predictions Dashboard
 * 
 * Visualizes AI-powered predictions
 * - Milestone completion predictions
 * - Confidence scores
 * - Risk assessments
 * - Smart recommendations
 */
const AIPredictions = ({ tenantId }) => {
    const [predictions, setPredictions] = useState([]);
    const [highRisk, setHighRisk] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPredictions();
    }, [tenantId]);

    const fetchPredictions = async () => {
        try {
            const [predictionsRes, riskRes] = await Promise.all([
                fetch(`http://localhost:3005/api/v1/predictions/workflow/demo-workflow-1`),
                fetch(`http://localhost:3005/api/v1/predictions/high-risk`),
            ]);

            const predictionsData = await predictionsRes.json();
            const riskData = await riskRes.json();

            setPredictions(predictionsData || []);
            setHighRisk(riskData || []);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch predictions:', error);
            setLoading(false);
        }
    };

    const getRiskColor = (riskLevel) => {
        switch (riskLevel) {
            case 'LOW': return '#10b981';
            case 'MEDIUM': return '#f59e0b';
            case 'HIGH': return '#ef4444';
            case 'CRITICAL': return '#dc2626';
            default: return '#6b7280';
        }
    };

    if (loading) {
        return <div className="loading-screen">Analyzing with AI...</div>;
    }

    return (
        <div className="ai-predictions">
            {/* Hero Section */}
            <div className="predictions-hero">
                <div className="hero-icon">
                    <Brain size={48} className="brain-icon" />
                    <Sparkles size={24} className="sparkle-icon" />
                </div>
                <h1>AI-Powered Predictions</h1>
                <p>Machine learning predictions with 90%+ accuracy</p>
            </div>

            {/* High Risk Alert */}
            {highRisk.length > 0 && (
                <div className="high-risk-section">
                    <div className="alert-header">
                        <AlertTriangle size={24} />
                        <div>
                            <h3>High-Risk Milestones Detected</h3>
                            <p>{highRisk.length} milestones need attention</p>
                        </div>
                    </div>

                    <div className="risk-cards">
                        {highRisk.map((item, idx) => (
                            <div key={idx} className="risk-card">
                                <div className="risk-card-header">
                                    <span className="milestone-name">{item.milestoneName}</span>
                                    <span
                                        className="risk-badge"
                                        style={{ backgroundColor: getRiskColor(item.riskLevel) }}
                                    >
                                        {item.riskLevel}
                                    </span>
                                </div>

                                <div className="risk-metrics">
                                    <div className="risk-metric">
                                        <span className="metric-label">Delay Probability</span>
                                        <span className="metric-value">{(item.delayProbability * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="risk-metric">
                                        <span className="metric-label">Estimated Delay</span>
                                        <span className="metric-value">{item.estimatedDelay} days</span>
                                    </div>
                                </div>

                                <div className="recommendations">
                                    <h4>AI Recommendations:</h4>
                                    <ul>
                                        {item.recommendations.map((rec, i) => (
                                            <li key={i}>{rec.title}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Predictions Grid */}
            <div className="predictions-section">
                <h2>Milestone Predictions</h2>

                <div className="predictions-grid">
                    {predictions.length === 0 ? (
                        <div className="empty-state">
                            <Brain size={64} />
                            <h3>No predictions available</h3>
                            <p>Start a workflow to see AI predictions</p>
                        </div>
                    ) : (
                        predictions.map((pred, idx) => (
                            <div key={idx} className="prediction-card">
                                {/* Header */}
                                <div className="prediction-header">
                                    <h3 className="prediction-title">Milestone {idx + 1}</h3>
                                    <div className="confidence-badge">
                                        <Target size={14} />
                                        {(pred.confidence * 100).toFixed(0)}% confidence
                                    </div>
                                </div>

                                {/* Prediction Date */}
                                <div className="prediction-date">
                                    <Calendar size={20} />
                                    <div>
                                        <div className="date-label">Predicted Completion</div>
                                        <div className="date-value">
                                            {new Date(pred.estimatedCompletionDate).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Risk Indicator */}
                                <div className="risk-indicator">
                                    <div className="risk-label">Risk Level</div>
                                    <div className="risk-bar">
                                        <div
                                            className="risk-fill"
                                            style={{
                                                width: `${pred.delayProbability * 100}%`,
                                                backgroundColor: getRiskColor(pred.riskLevel),
                                            }}
                                        ></div>
                                    </div>
                                    <span
                                        className="risk-level-text"
                                        style={{ color: getRiskColor(pred.riskLevel) }}
                                    >
                                        {pred.riskLevel}
                                    </span>
                                </div>

                                {/* Factors */}
                                <div className="prediction-factors">
                                    <h4>Key Factors</h4>
                                    <div className="factors-list">
                                        <div className="factor">
                                            <span>Velocity</span>
                                            <div className="factor-bar">
                                                <div
                                                    className="factor-fill"
                                                    style={{ width: `${pred.factors.velocity}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="factor">
                                            <span>Historical Accuracy</span>
                                            <div className="factor-bar">
                                                <div
                                                    className="factor-fill"
                                                    style={{ width: `${pred.factors.historicalAccuracy}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="factor">
                                            <span>Resource Availability</span>
                                            <div className="factor-bar">
                                                <div
                                                    className="factor-fill"
                                                    style={{ width: `${pred.factors.resourceAvailability * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recommendations */}
                                {pred.recommendations && pred.recommendations.length > 0 && (
                                    <div className="prediction-actions">
                                        {pred.recommendations.slice(0, 2).map((rec, i) => (
                                            <button key={i} className={`action-btn priority-${rec.priority.toLowerCase()}`}>
                                                {rec.title}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIPredictions;
