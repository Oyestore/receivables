import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import {
    Sliders,
    RotateCcw,
    Save,
    TrendingUp,
    TrendingDown,
    Activity,
    Zap,
} from 'lucide-react';
import { module10API } from '../../services/module10-api';
import './WhatIfSimulator.css';

interface WhatIfSimulatorProps {
    tenantId: string;
    entityId?: string;
    entityType?: 'invoice' | 'customer';
}

interface FeatureControl {
    name: string;
    currentValue: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
    tenantId,
    entityId: initialEntityId = '',
    entityType: initialEntityType = 'invoice',
}) => {
    const [entityId, setEntityId] = useState(initialEntityId);
    const [entityType, setEntityType] = useState(initialEntityType);
    const [baselinePrediction, setBaselinePrediction] = useState<number | null>(null);
    const [currentPrediction, setCurrentPrediction] = useState<number | null>(null);

    // Sample features - in production, these would come from the API
    const [features, setFeatures] = useState<FeatureControl[]>([
        { name: 'daysOverdue', currentValue: 30, min: 0, max: 180, step: 1, unit: 'days' },
        { name: 'invoiceAmount', currentValue: 50000, min: 1000, max: 500000, step: 1000, unit: '₹' },
        { name: 'paymentHistory', currentValue: 0.75, min: 0, max: 1, step: 0.05 },
        { name: 'customerScore', currentValue: 650, min: 300, max: 850, step: 10 },
        { name: 'industryRisk', currentValue: 0.3, min: 0, max: 1, step: 0.1 },
    ]);

    const simulateMutation = useMutation({
        mutationFn: (params: any) => module10API.simulateScenario(params),
        onSuccess: (data: any) => {
            setCurrentPrediction(data.prediction);
            if (baselinePrediction === null) {
                setBaselinePrediction(data.prediction);
            }
        },
    });

    const handleFeatureChange = (index: number, value: number) => {
        const updatedFeatures = [...features];
        updatedFeatures[index].currentValue = value;
        setFeatures(updatedFeatures);

        // Trigger simulation
        if (entityId) {
            const featureChanges = updatedFeatures.reduce((acc, f) => {
                acc[f.name] = f.currentValue;
                return acc;
            }, {} as Record<string, number>);

            simulateMutation.mutate({
                tenantId,
                entityId,
                entityType,
                featureChanges,
            });
        }
    };

    const handleReset = () => {
        // Reset to baseline values
        setFeatures([
            { name: 'daysOverdue', currentValue: 30, min: 0, max: 180, step: 1, unit: 'days' },
            { name: 'invoiceAmount', currentValue: 50000, min: 1000, max: 500000, step: 1000, unit: '₹' },
            { name: 'paymentHistory', currentValue: 0.75, min: 0, max: 1, step: 0.05 },
            { name: 'customerScore', currentValue: 650, min: 300, max: 850, step: 10 },
            { name: 'industryRisk', currentValue: 0.3, min: 0, max: 1, step: 0.1 },
        ]);
        setCurrentPrediction(baselinePrediction);
    };

    const formatValue = (feature: FeatureControl) => {
        if (feature.unit === '₹') {
            return `₹${feature.currentValue.toLocaleString()}`;
        } else if (feature.unit === 'days') {
            return `${feature.currentValue} ${feature.unit}`;
        } else if (feature.currentValue < 1) {
            return (feature.currentValue * 100).toFixed(0) + '%';
        }
        return feature.currentValue.toString();
    };

    const impactPercentage = baselinePrediction && currentPrediction
        ? ((currentPrediction - baselinePrediction) / baselinePrediction) * 100
        : 0;

    return (
        <div className="whatif-simulator">
            {/* Header */}
            <motion.div
                className="dashboard-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="header-content">
                    <div className="title-section">
                        <Sliders className="page-icon" />
                        <div>
                            <h1 className="page-title">What-If Simulator</h1>
                            <p className="page-subtitle">Interactive scenario analysis with real-time predictions</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Entity Selector */}
            <motion.div
                className="entity-selector"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="selector-grid">
                    <div className="selector-group">
                        <label>Entity ID</label>
                        <input
                            type="text"
                            value={entityId}
                            onChange={(e) => setEntityId(e.target.value)}
                            placeholder="Enter entity ID"
                            className="entity-input"
                        />
                    </div>
                    <div className="selector-group">
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
                </div>
            </motion.div>

            {/* Prediction Display */}
            {currentPrediction !== null && (
                <motion.div
                    className="prediction-display"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="prediction-grid">
                        <div className="prediction-card baseline">
                            <Activity className="pred-icon" />
                            <div className="pred-content">
                                <span className="pred-label">Baseline</span>
                                <span className="pred-value">{baselinePrediction?.toFixed(3) || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="impact-arrow">
                            {impactPercentage > 0 ? (
                                <TrendingUp size={40} className="arrow-up" />
                            ) : impactPercentage < 0 ? (
                                <TrendingDown size={40} className="arrow-down" />
                            ) : (
                                <Activity size={40} className="arrow-neutral" />
                            )}
                            <span className={`impact-value ${impactPercentage > 0 ? 'positive' : impactPercentage < 0 ? 'negative' : 'neutral'}`}>
                                {impactPercentage > 0 && '+'}{impactPercentage.toFixed(2)}%
                            </span>
                        </div>

                        <div className="prediction-card current">
                            <Zap className="pred-icon" />
                            <div className="pred-content">
                                <span className="pred-label">Current Scenario</span>
                                <span className="pred-value">{currentPrediction.toFixed(3)}</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Feature Controls */}
            <motion.div
                className="controls-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="controls-header">
                    <h2 className="section-title">Adjust Features</h2>
                    <button onClick={handleReset} className="reset-btn">
                        <RotateCcw size={18} />
                        Reset to Baseline
                    </button>
                </div>

                <div className="features-grid">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.name}
                            className="feature-control"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + index * 0.05 }}
                        >
                            <div className="feature-header">
                                <span className="feature-name">
                                    {feature.name.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className="feature-value">{formatValue(feature)}</span>
                            </div>

                            <input
                                type="range"
                                min={feature.min}
                                max={feature.max}
                                step={feature.step}
                                value={feature.currentValue}
                                onChange={(e) => handleFeatureChange(index, parseFloat(e.target.value))}
                                className="feature-slider"
                            />

                            <div className="slider-labels">
                                <span className="slider-min">{feature.min}</span>
                                <span className="slider-max">{feature.max}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Save Scenario */}
            {currentPrediction !== null && (
                <motion.div
                    className="save-section"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <button className="save-btn">
                        <Save size={20} />
                        Save Scenario
                    </button>
                </motion.div>
            )}

            {/* Loading State */}
            {simulateMutation.isPending && (
                <div className="loading-overlay">
                    <div className="loader-spinner" />
                    <p>Simulating scenario...</p>
                </div>
            )}

            {/* Empty State */}
            {!entityId && (
                <motion.div
                    className="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <Sliders size={64} className="empty-icon" />
                    <h3>Start Simulating Scenarios</h3>
                    <p>Enter an entity ID above to begin interactive what-if analysis with real-time predictions</p>
                </motion.div>
            )}
        </div>
    );
};
