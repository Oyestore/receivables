import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
    Brain,
    Sparkles,
    ArrowRightLeft,
    Sliders,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import { module10API, SHAPExplanation, CounterfactualRecommendation } from '../../services/module10-api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './ExplainabilityDashboard.css';

interface ExplainabilityProps {
    tenantId: string;
}

export const ExplainabilityDashboard: React.FC<ExplainabilityProps> = ({ tenantId }) => {
    const [selectedEntity, setSelectedEntity] = useState('');
    const [entityType, setEntityType] = useState<'invoice' | 'customer'>('invoice');
    const [predictionType, setPredictionType] = useState<'payment' | 'collection' | 'dispute'>('payment');
    const [desiredOutcome, setDesiredOutcome] = useState('approved');

    // Fetch SHAP explanation
    const { data: shapData, isLoading: shapLoading, refetch: refetchSHAP } = useQuery({
        queryKey: ['shap-explanation', selectedEntity, predictionType],
        queryFn: () => module10API.getSHAPExplanation({
            entityId: selectedEntity,
            tenantId,
            type: predictionType
        }),
        enabled: !!selectedEntity
    });

    // Fetch counterfactuals
    const { data: counterfactuals, isLoading: counterfactualsLoading, refetch: refetchCounterfactuals } = useQuery({
        queryKey: ['counterfactuals', selectedEntity, desiredOutcome],
        queryFn: () => module10API.generateCounterfactual({
            tenantId,
            entityId: selectedEntity,
            entityType,
            desiredOutcome
        }),
        enabled: false
    });

    const handleAnalyze = () => {
        if (selectedEntity) {
            refetchSHAP();
        }
    };

    const handleGenerateCounterfactuals = () => {
        if (selectedEntity) {
            refetchCounterfactuals();
        }
    };

    // Prepare chart data from SHAP values
    const chartData = shapData?.data?.shapValues
        ?.slice(0, 10)
        .map((item: any) => ({
            feature: item.feature.length > 15 ? item.feature.substring(0, 15) + '...' : item.feature,
            value: item.shapValue,
            contribution: item.contribution,
        }))
        .sort((a: any, b: any) => Math.abs(b.value) - Math.abs(a.value));

    const getFeasibilityColor = (feasibility: string) => {
        switch (feasibility) {
            case 'easy': return '#10b981';
            case 'moderate': return '#f59e0b';
            case 'hard': return '#ef4444';
            default: return '#64748b';
        }
    };

    const getFeasibilityBadgeClass = (feasibility: string) => {
        switch (feasibility) {
            case 'easy': return 'feasibility-easy';
            case 'moderate': return 'feasibility-moderate';
            case 'hard': return 'feasibility-hard';
            default: return '';
        }
    };

    return (
        <div className="explainability-dashboard">
            {/* Header */}
            <motion.div
                className="dashboard-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="header-content">
                    <div className="title-section">
                        <Brain className="page-icon" />
                        <div>
                            <h1 className="page-title">Explainable AI</h1>
                            <p className="page-subtitle">Understand predictions with SHAP values & counterfactuals</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Control Panel */}
            <motion.div
                className="control-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="control-grid">
                    <div className="control-item">
                        <label>Entity ID</label>
                        <input
                            type="text"
                            value={selectedEntity}
                            onChange={(e) => setSelectedEntity(e.target.value)}
                            placeholder="Enter invoice or customer ID"
                            className="entity-input"
                        />
                    </div>

                    <div className="control-item">
                        <label>Entity Type</label>
                        <select
                            value={entityType}
                            onChange={(e) => setEntityType(e.target.value as any)}
                            className="entity-select"
                        >
                            <option value="invoice">Invoice</option>
                            <option value="customer">Customer</option>
                        </select>
                    </div>

                    <div className="control-item">
                        <label>Prediction Type</label>
                        <select
                            value={predictionType}
                            onChange={(e) => setPredictionType(e.target.value as any)}
                            className="entity-select"
                        >
                            <option value="payment">Payment</option>
                            <option value="collection">Collection</option>
                            <option value="dispute">Dispute</option>
                        </select>
                    </div>

                    <div className="control-item">
                        <button onClick={handleAnalyze} className="analyze-button" disabled={!selectedEntity}>
                            <Sparkles size={20} />
                            Analyze Prediction
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* SHAP Explanation Section */}
            {shapData && (
                <motion.div
                    className="explanation-section"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <h2 className="section-title">
                        <TrendingUp size={24} />
                        Feature Importance (SHAP Values)
                    </h2>

                    {/* Prediction Summary */}
                    <div className="prediction-summary">
                        <div className="prediction-card">
                            <div className="prediction-label">Base Value</div>
                            <div className="prediction-value base">{shapData?.data?.baseValue?.toFixed(3) || 'N/A'}</div>
                        </div>
                        <div className="arrow-icon">
                            <ArrowRightLeft size={32} />
                        </div>
                        <div className="prediction-card">
                            <div className="prediction-label">Final Prediction</div>
                            <div className="prediction-value final">{shapData?.data?.prediction?.toFixed(3) || 'N/A'}</div>
                        </div>
                    </div>

                    {/* SHAP Bar Chart */}
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" stroke="#64748b" />
                                <YAxis dataKey="feature" type="category" stroke="#64748b" width={150} />
                                <Tooltip
                                    contentStyle={{
                                        background: 'rgba(255, 255, 255, 0.95)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
                                    }}
                                    formatter={(value: number, name: string) => [
                                        `${value.toFixed(4)}`,
                                        name === 'value' ? 'SHAP Value' : name
                                    ]}
                                />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                                    {chartData?.map((entry: any, index: number) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.value > 0 ? '#10b981' : '#ef4444'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Top Features Cards */}
                    <div className="top-features">
                        <h3 className="subsection-title">Top Contributing Features</h3>
                        <div className="features-grid">
                            {shapData?.data?.topFeatures?.slice(0, 5).map((feature: any, index: number) => (
                                <motion.div
                                    key={feature.feature}
                                    className="feature-card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + index * 0.05 }}
                                >
                                    <div className="feature-rank">#{index + 1}</div>
                                    <div className="feature-name">{feature.feature}</div>
                                    <div className="feature-importance">
                                        <div className="importance-bar">
                                            <div
                                                className="importance-fill"
                                                style={{ width: `${feature.percentContribution}%` }}
                                            />
                                        </div>
                                        <span className="importance-value">
                                            {feature.percentContribution?.toFixed(1)}%
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Counterfactual Section */}
            <motion.div
                className="counterfactual-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h2 className="section-title">
                    <Sliders size={24} />
                    Counterfactual Analysis
                </h2>

                <div className="counterfactual-controls">
                    <div className="control-item">
                        <label>Desired Outcome</label>
                        <input
                            type="text"
                            value={desiredOutcome}
                            onChange={(e) => setDesiredOutcome(e.target.value)}
                            placeholder="e.g., approved, paid"
                            className="entity-input"
                        />
                    </div>
                    <button
                        onClick={handleGenerateCounterfactuals}
                        className="generate-button"
                        disabled={!selectedEntity}
                    >
                        <Sparkles size={20} />
                        Generate Counterfactuals
                    </button>
                </div>

                {counterfactuals?.data?.recommendations && (
                    <div className="recommendations-grid">
                        {counterfactuals.data.recommendations.map((rec: CounterfactualRecommendation, index: number) => (
                            <motion.div
                                key={index}
                                className="recommendation-card"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                            >
                                <div className="rec-header">
                                    <div className="rec-feature">{rec.feature}</div>
                                    <div className={`feasibility-badge ${getFeasibilityBadgeClass(rec.feasibility)}`}>
                                        {rec.feasibility}
                                    </div>
                                </div>
                                <div className="rec-change">
                                    <div className="change-from">
                                        <span className="change-label">Current</span>
                                        <span className="change-value">{rec.currentValue}</span>
                                    </div>
                                    <ArrowRightLeft size={20} className="change-arrow" />
                                    <div className="change-to">
                                        <span className="change-label">Recommended</span>
                                        <span className="change-value recommended">{rec.recommendedValue}</span>
                                    </div>
                                </div>
                                <div className="rec-reasoning">{rec.reasoning}</div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {counterfactualsLoading && (
                    <div className="loading-state">
                        <div className="spinner" />
                        <p>Generating counterfactuals...</p>
                    </div>
                )}
            </motion.div>

            {/* Loading State */}
            {shapLoading && !shapData && (
                <motion.div
                    className="loading-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="loading-content">
                        <div className="loader-spinner" />
                        <p>Analyzing prediction with SHAP...</p>
                    </div>
                </motion.div>
            )}

            {/* Empty State */}
            {!selectedEntity && !shapData && (
                <motion.div
                    className="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <Brain size={64} className="empty-icon" />
                    <h3>Get Started with Explainable AI</h3>
                    <p>Enter an entity ID above to see SHAP explanations and counterfactual recommendations</p>
                </motion.div>
            )}
        </div>
    );
};
