import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import {
    LineChart,
    TrendingUp,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Upload,
    BarChart3,
} from 'lucide-react';
import { module10API, ABTestResult } from '../../services/module10-api';
import './ABTestAnalyzer.css';

interface ABTestAnalyzerProps {
    tenantId: string;
}

export const ABTestAnalyzer: React.FC<ABTestAnalyzerProps> = ({ tenantId }) => {
    const [testId, setTestId] = useState('');
    const [confidenceLevel, setConfidenceLevel] = useState(0.95);
    const [variantAData, setVariantAData] = useState('');
    const [variantBData, setVariantBData] = useState('');

    const analyzeMutation = useMutation({
        mutationFn: (params: any) => module10API.analyzeABTest(params),
    });

    const parseDataInput = (input: string): number[] => {
        try {
            // Try parsing as JSON array
            const parsed = JSON.parse(input);
            if (Array.isArray(parsed)) {
                return parsed.filter(x => typeof x === 'number');
            }
        } catch {
            // Try parsing as comma-separated values
            return input.split(',')
                .map(x => parseFloat(x.trim()))
                .filter(x => !isNaN(x));
        }
        return [];
    };

    const handleAnalyze = () => {
        const aData = parseDataInput(variantAData);
        const bData = parseDataInput(variantBData);

        if (aData.length === 0 || bData.length === 0) {
            alert('Please provide valid data for both variants');
            return;
        }

        analyzeMutation.mutate({
            tenantId,
            testId,
            variantAData: aData,
            variantBData: bData,
            confidenceLevel,
        });
    };

    const result = analyzeMutation.data as ABTestResult | undefined;

    return (
        <div className="abtest-analyzer">
            {/* Header */}
            <motion.div
                className="dashboard-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="header-content">
                    <div className="title-section">
                        <BarChart3 className="page-icon" />
                        <div>
                            <h1 className="page-title">A/B Test Analyzer</h1>
                            <p className="page-subtitle">Statistical analysis with confidence intervals & p-values</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Input Section */}
            <motion.div
                className="input-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <div className="input-grid">
                    <div className="input-group">
                        <label>Test ID</label>
                        <input
                            type="text"
                            value={testId}
                            onChange={(e) => setTestId(e.target.value)}
                            placeholder="e.g., email_campaign_2024"
                            className="test-input"
                        />
                    </div>

                    <div className="input-group">
                        <label>Confidence Level</label>
                        <select
                            value={confidenceLevel}
                            onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
                            className="test-select"
                        >
                            <option value={0.90}>90%</option>
                            <option value={0.95}>95%</option>
                            <option value={0.99}>99%</option>
                        </select>
                    </div>
                </div>

                <div className="data-input-grid">
                    <div className="data-input-group">
                        <label>
                            <Upload size={16} />
                            Variant A Data (Control)
                        </label>
                        <textarea
                            value={variantAData}
                            onChange={(e) => setVariantAData(e.target.value)}
                            placeholder="Enter comma-separated values or JSON array&#10;e.g., [234.5, 245.2, 198.7, ...]"
                            className="data-textarea"
                            rows={6}
                        />
                    </div>

                    <div className="data-input-group">
                        <label>
                            <Upload size={16} />
                            Variant B Data (Treatment)
                        </label>
                        <textarea
                            value={variantBData}
                            onChange={(e) => setVariantBData(e.target.value)}
                            placeholder="Enter comma-separated values or JSON array&#10;e.g., [256.3, 289.1, 241.5, ...]"
                            className="data-textarea"
                            rows={6}
                        />
                    </div>
                </div>

                <button
                    onClick={handleAnalyze}
                    disabled={analyzeMutation.isPending || !testId}
                    className="analyze-btn"
                >
                    <LineChart size={20} />
                    {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze A/B Test'}
                </button>
            </motion.div>

            {/* Results Section */}
            {result && (
                <motion.div
                    className="results-section"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    {/* Statistical Significance Badge */}
                    <div className="significance-banner">
                        {result.statisticallySignificant ? (
                            <>
                                <CheckCircle2 size={40} className="sig-icon success" />
                                <div className="sig-content">
                                    <h3>Statistically Significant!</h3>
                                    <p>The results show a meaningful difference between variants</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <XCircle size={40} className="sig-icon failure" />
                                <div className="sig-content">
                                    <h3>Not Statistically Significant</h3>
                                    <p>The difference could be due to random chance</p>
                                </div>
                            </>
                        )}
                        <div className="sig-pvalue">
                            <span className="pvalue-label">p-value</span>
                            <span className="pvalue-value">{result.pValue.toExponential(3)}</span>
                        </div>
                    </div>

                    {/* Comparison Table */}
                    <div className="comparison-section">
                        <h2 className="section-title">
                            <BarChart3 size={24} />
                            Variant Comparison
                        </h2>

                        <div className="comparison-grid">
                            <div className="variant-card control">
                                <div className="variant-header">
                                    <span className="variant-label">Control (A)</span>
                                    <span className="variant-badge control-badge">Baseline</span>
                                </div>
                                <div className="metric-row">
                                    <span className="metric-label">Sample Size</span>
                                    <span className="metric-value">{result.variantA.sampleSize}</span>
                                </div>
                                <div className="metric-row">
                                    <span className="metric-label">Mean</span>
                                    <span className="metric-value">{result.variantA.mean.toFixed(2)}</span>
                                </div>
                                <div className="metric-row">
                                    <span className="metric-label">Std Dev</span>
                                    <span className="metric-value">{result.variantA.stdDev.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="vs-divider">VS</div>

                            <div className="variant-card treatment">
                                <div className="variant-header">
                                    <span className="variant-label">Treatment (B)</span>
                                    <span className="variant-badge treatment-badge">Test</span>
                                </div>
                                <div className="metric-row">
                                    <span className="metric-label">Sample Size</span>
                                    <span className="metric-value">{result.variantB.sampleSize}</span>
                                </div>
                                <div className="metric-row">
                                    <span className="metric-label">Mean</span>
                                    <span className="metric-value">{result.variantB.mean.toFixed(2)}</span>
                                </div>
                                <div className="metric-row">
                                    <span className="metric-label">Std Dev</span>
                                    <span className="metric-value">{result.variantB.stdDev.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lift Gauge */}
                    <div className="lift-section">
                        <h2 className="section-title">
                            <TrendingUp size={24} />
                            Relative Lift
                        </h2>

                        <div className="lift-display">
                            <div className="lift-gauge">
                                <svg className="circular-progress" viewBox="0 0 200 200">
                                    <circle
                                        className="circle-bg"
                                        cx="100"
                                        cy="100"
                                        r="90"
                                        fill="none"
                                        stroke="#e2e8f0"
                                        strokeWidth="20"
                                    />
                                    <circle
                                        className="circle-progress"
                                        cx="100"
                                        cy="100"
                                        r="90"
                                        fill="none"
                                        stroke={result.relativeLift > 0 ? '#10b981' : '#ef4444'}
                                        strokeWidth="20"
                                        strokeDasharray={`${Math.min(Math.abs(result.relativeLift) * 5.65, 565)} 565`}
                                        strokeDashoffset="0"
                                        transform="rotate(-90 100 100)"
                                    />
                                    <text x="100" y="100" textAnchor="middle" dy="7" className="gauge-text">
                                        {result.relativeLift > 0 ? '+' : ''}{result.relativeLift.toFixed(2)}%
                                    </text>
                                </svg>
                            </div>

                            <div className="lift-explanation">
                                {result.relativeLift > 0 ? (
                                    <div className="lift-positive">
                                        <TrendingUp size={24} />
                                        <p>Treatment performs <strong>{result.relativeLift.toFixed(2)}%</strong> better than control</p>
                                    </div>
                                ) : (
                                    <div className="lift-negative">
                                        <AlertTriangle size={24} />
                                        <p>Treatment performs <strong>{Math.abs(result.relativeLift).toFixed(2)}%</strong> worse than control</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Confidence Interval */}
                    <div className="ci-section">
                        <h2 className="section-title">Confidence Interval ({(result.confidenceLevel * 100).toFixed(0)}%)</h2>
                        <div className="ci-display">
                            <div className="ci-bar">
                                <div className="ci-range">
                                    <span className="ci-bound lower">{result.confidenceInterval.lower.toFixed(2)}</span>
                                    <div className="ci-line">
                                        <div className="ci-marker" style={{ left: '50%' }} />
                                    </div>
                                    <span className="ci-bound upper">{result.confidenceInterval.upper.toFixed(2)}</span>
                                </div>
                            </div>
                            <p className="ci-explanation">
                                We can be {(result.confidenceLevel * 100).toFixed(0)}% confident that the true difference lies within this range
                            </p>
                        </div>
                    </div>

                    {/* Test Conclusion */}
                    <div className="conclusion-section">
                        <h2 className="section-title">Conclusion</h2>
                        <div className={`conclusion-box ${result.statisticallySignificant ? 'significant' : 'not-significant'}`}>
                            {result.statisticallySignificant ? (
                                <>
                                    <CheckCircle2 size={32} />
                                    <div>
                                        <p className="conclusion-text">
                                            Based on the {(result.confidenceLevel * 100).toFixed(0)}% confidence level analysis,
                                            <strong> Variant B ({result.variantB.name}) </strong>
                                            shows a statistically significant {result.relativeLift > 0 ? 'improvement' : 'decline'} of
                                            <strong> {Math.abs(result.relativeLift).toFixed(2)}%</strong> compared to the control.
                                        </p>
                                        <p className="conclusion-action">
                                            {result.relativeLift > 0
                                                ? '✅ Recommendation: Implement Variant B'
                                                : '❌ Recommendation: Keep Control (Variant A)'}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={32} />
                                    <div>
                                        <p className="conclusion-text">
                                            The observed difference of <strong>{Math.abs(result.relativeLift).toFixed(2)}%</strong> is not
                                            statistically significant (p = {result.pValue.toExponential(3)}). This could be due to random variation.
                                        </p>
                                        <p className="conclusion-action">
                                            ⏸️ Recommendation: Continue testing with more data or refine the test design
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Loading State */}
            {analyzeMutation.isPending && (
                <motion.div
                    className="loading-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <div className="loading-content">
                        <div className="loader-spinner" />
                        <p>Performing statistical analysis...</p>
                    </div>
                </motion.div>
            )}

            {/* Empty State */}
            {!result && !analyzeMutation.isPending && (
                <motion.div
                    className="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <LineChart size={64} className="empty-icon" />
                    <h3>Get Started with A/B Testing</h3>
                    <p>Enter your variant data above to get rigorous statistical analysis with confidence intervals</p>
                </motion.div>
            )}
        </div>
    );
};
