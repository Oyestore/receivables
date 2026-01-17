import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import {
    GitBranch,
    AlertTriangle,
    TrendingDown,
    DollarSign,
    Users,
    Layers,
} from 'lucide-react';
import { module10API, PaymentCascade } from '../../services/module10-api';
import './CascadePredictor.css';

interface CascadePredictorProps {
    tenantId: string;
}

export const CascadePredictor: React.FC<CascadePredictorProps> = ({ tenantId }) => {
    const [originNode, setOriginNode] = useState('');
    const [scenario, setScenario] = useState<'late_payment' | 'default'>('late_payment');

    const predictMutation = useMutation({
        mutationFn: (params: any) => module10API.predictCascade(params),
    });

    const handlePredict = () => {
        if (!originNode) return;

        predictMutation.mutate({
            tenantId,
            originNodeId: originNode,
            scenario,
        });
    };

    const cascade = predictMutation.data as PaymentCascade | undefined;

    const getDepthColor = (depth: number) => {
        const colors = ['#047857', '#f59e0b', '#ef4444', '#7f1d1d'];
        return colors[Math.min(depth, 3)];
    };

    const getImpactColor = (impact: number) => {
        if (impact < 10000) return '#10b981';
        if (impact < 50000) return '#f59e0b';
        if (impact < 100000) return '#ef4444';
        return '#7f1d1d';
    };

    // Group nodes by depth for tree visualization
    const nodesByDepth = cascade?.affectedNodes.reduce((acc, node) => {
        if (!acc[node.depth]) acc[node.depth] = [];
        acc[node.depth].push(node);
        return acc;
    }, {} as Record<number, any[]>) || {};

    return (
        <div className="cascade-predictor">
            {/* Header */}
            <motion.div
                className="dashboard-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="header-content">
                    <div className="title-section">
                        <GitBranch className="page-icon" />
                        <div>
                            <h1 className="page-title">Payment Cascade Predictor</h1>
                            <p className="page-subtitle">Simulate payment failures and predict downstream impacts</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Controls */}
            <motion.div
                className="controls-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="controls-grid">
                    <div className="control-group">
                        <label>Origin Node (Customer ID)</label>
                        <input
                            type="text"
                            value={originNode}
                            onChange={(e) => setOriginNode(e.target.value)}
                            placeholder="Enter customer ID to simulate"
                            className="origin-input"
                        />
                    </div>

                    <div className="control-group">
                        <label>Scenario</label>
                        <select
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value as any)}
                            className="scenario-select"
                        >
                            <option value="late_payment">Late Payment</option>
                            <option value="default">Default</option>
                        </select>
                    </div>

                    <button onClick={handlePredict} disabled={!originNode} className="predict-btn">
                        <TrendingDown size={20} />
                        Predict Cascade
                    </button>
                </div>
            </motion.div>

            {/* Risk Summary */}
            {
                cascade && (
                    <motion.div
                        className="risk-summary"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="summary-grid">
                            <div className="summary-card total-risk">
                                <DollarSign className="summary-icon" />
                                <div className="summary-content">
                                    <span className="summary-label">Total Risk Amount</span>
                                    <span className="summary-value">₹{cascade.totalRiskAmount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="summary-card affected-nodes">
                                <Users className="summary-icon" />
                                <div className="summary-content">
                                    <span className="summary-label">Affected Nodes</span>
                                    <span className="summary-value">{cascade.affectedNodes.length}</span>
                                </div>
                            </div>

                            <div className="summary-card max-depth">
                                <Layers className="summary-icon" />
                                <div className="summary-content">
                                    <span className="summary-label">Max Cascade Depth</span>
                                    <span className="summary-value">{Math.max(...cascade.affectedNodes.map(n => n.depth))}</span>
                                </div>
                            </div>

                            <div className="summary-card scenario-type">
                                <AlertTriangle className="summary-icon" />
                                <div className="summary-content">
                                    <span className="summary-label">Scenario</span>
                                    <span className="summary-value">{scenario.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )
            }

            {/* Cascade Tree Visualization */}
            {
                cascade && (
                    <motion.div
                        className="cascade-tree-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h2 className="section-title">
                            <GitBranch size={24} />
                            Cascade Flow ({cascade.affectedNodes.length} nodes)
                        </h2>

                        <div className="tree-container">
                            {/* Origin Node */}
                            <div className="tree-level origin-level">
                                <div className="cascade-node origin-node">
                                    <div className="node-header">
                                        <span className="node-id">{cascade.originNode}</span>
                                        <span className="node-badge origin">Origin</span>
                                    </div>
                                    <div className="node-scenario">{scenario.replace('_', ' ')}</div>
                                </div>
                            </div>

                            {/* Cascade Levels */}
                            {Object.keys(nodesByDepth)
                                .map(Number)
                                .sort((a, b) => a - b)
                                .map((depth, levelIndex) => (
                                    <div key={depth} className="tree-level">
                                        <div className="depth-label">Depth {depth}</div>
                                        <div className="nodes-row">
                                            {nodesByDepth[depth].map((node, nodeIndex) => (
                                                <motion.div
                                                    key={node.nodeId}
                                                    className="cascade-node"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.4 + levelIndex * 0.05 + nodeIndex * 0.02 }}
                                                    style={{ borderLeftColor: getDepthColor(depth) }}
                                                >
                                                    <div className="node-header">
                                                        <span className="node-id">{node.nodeId}</span>
                                                        <span
                                                            className="node-badge depth"
                                                            style={{ background: getDepthColor(depth) }}
                                                        >
                                                            L{depth}
                                                        </span>
                                                    </div>

                                                    <div className="node-metrics">
                                                        <div className="metric-row">
                                                            <span className="metric-label">Probability</span>
                                                            <div className="probability-bar">
                                                                <div
                                                                    className="probability-fill"
                                                                    style={{
                                                                        width: `${node.probability * 100}%`,
                                                                        background: getDepthColor(depth)
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="metric-value">
                                                                {(node.probability * 100).toFixed(1)}%
                                                            </span>
                                                        </div>

                                                        <div className="metric-row">
                                                            <span className="metric-label">Impact</span>
                                                            <span
                                                                className="impact-amount"
                                                                style={{ color: getImpactColor(node.estimatedImpact) }}
                                                            >
                                                                ₹{node.estimatedImpact.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </motion.div>
                )
            }

            {/* Critical Path */}
            {
                cascade && cascade.criticalPath.length > 0 && (
                    <motion.div
                        className="critical-path-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <h2 className="section-title">
                            <AlertTriangle size={24} />
                            Critical Path (Highest Risk)
                        </h2>

                        <div className="critical-path-trail">
                            {cascade.criticalPath.map((nodeId, index) => (
                                <React.Fragment key={nodeId}>
                                    <div className="path-node">
                                        <div className="path-step">{index + 1}</div>
                                        <div className="path-id">{nodeId}</div>
                                    </div>
                                    {index < cascade.criticalPath.length - 1 && (
                                        <div className="path-arrow">→</div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </motion.div>
                )
            }

            {/* Loading State */}
            {
                predictMutation.isPending && (
                    <div className="loading-overlay">
                        <div className="loader-spinner" />
                        <p>Simulating payment cascade...</p>
                    </div>
                )
            }

            {/* Empty State */}
            {
                !cascade && !predictMutation.isPending && (
                    <motion.div
                        className="empty-state"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <GitBranch size={64} className="empty-icon" />
                        <h3>Predict Payment Cascades</h3>
                        <p>Enter an origin node above to simulate how payment failures propagate through the network</p>
                    </motion.div>
                )
            }
        </div >
    );
};
