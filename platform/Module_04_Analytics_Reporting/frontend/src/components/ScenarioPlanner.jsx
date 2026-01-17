import React, { useState } from 'react';
import { Calculator, TrendingUp, TrendingDown, AlertCircle, Play } from 'lucide-react';
import './ScenarioPlanner.css';

/**
 * Scenario Planning Tool
 * 
 * "What-if" analysis for business decisions
 * - Early payment discounts
 * - Price changes
 * - Payment term adjustments
 * - Customer churn scenarios
 */
const ScenarioPlanner = ({ tenantId = 'tenant-123' }) => {
    const [activeScenario, setActiveScenario] = useState('discount');
    const [inputs, setInputs] = useState({
        discountPercent: 5,
        priceChange: 10,
        termDays: 30,
        churnRate: 15,
    });
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    const scenarios = {
        discount: {
            title: 'Early Payment Discount',
            description: 'Impact of offering early payment discount',
            icon: <TrendingUp size={24} />,
            fields: [
                { key: 'discountPercent', label: 'Discount %', min: 1, max: 15, step: 0.5 }
            ],
        },
        pricing: {
            title: 'Price Change Impact',
            description: 'Effect of increasing/decreasing prices',
            icon: <Calculator size={24} />,
            fields: [
                { key: 'priceChange', label: 'Price Change %', min: -20, max: 30, step: 1 }
            ],
        },
        terms: {
            title: 'Payment Terms Adjustment',
            description: 'Impact of changing payment terms',
            icon: <AlertCircle size={24} />,
            fields: [
                { key: 'termDays', label: 'New Term Days', min: 7, max: 90, step: 7 }
            ],
        },
    };

    const handleInputChange = (key, value) => {
        setInputs(prev => ({ ...prev, [key]: parseFloat(value) }));
    };

    const runScenario = async () => {
        setLoading(true);

        try {
            // Simulate scenario calculation
            await new Promise(resolve => setTimeout(resolve, 1000));

            const scenarioResults = calculateScenario(activeScenario, inputs);
            setResults(scenarioResults);
        } catch (error) {
            console.error('Scenario failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateScenario = (type, params) => {
        switch (type) {
            case 'discount':
                return {
                    totalRevenue: 250000000,
                    discountCost: params.discountPercent * 2500000,
                    earlyPayments: 35,
                    cashFlowImprovement: 21000000,
                    netBenefit: 16750000,
                    roi: 670,
                    recommendation: params.discountPercent <= 5
                        ? 'Recommended - Strong positive impact'
                        : 'Consider lower discount for better ROI',
                    impacts: [
                        `₹${(params.discountPercent * 25000).toFixed(0)}L discount cost`,
                        `₹${(210).toFixed(0)}L faster cash collection`,
                        `Net gain: ₹${(167.5).toFixed(1)}L`,
                        `${Math.floor(35 + params.discountPercent * 2)}% customers will opt-in`,
                    ],
                };

            case 'pricing':
                const revenueChange = params.priceChange;
                const customerLoss = params.priceChange > 10 ? (params.priceChange - 10) * 0.5 : 0;

                return {
                    totalRevenue: 250000000 * (1 + revenueChange / 100) * (1 - customerLoss / 100),
                    priceIncrease: revenueChange,
                    expectedChurn: customerLoss,
                    netImpact: revenueChange > 0 ? 'positive' : 'negative',
                    recommendation: revenueChange <= 10
                        ? 'Safe increase with minimal churn risk'
                        : 'High churn risk - proceed with caution',
                    impacts: [
                        `Revenue ${revenueChange > 0 ? 'increase' : 'decrease'}: ${Math.abs(revenueChange)}%`,
                        `Expected churn: ${customerLoss.toFixed(1)}%`,
                        `Net revenue change: ₹${((revenueChange - customerLoss) * 2.5).toFixed(1)}L`,
                    ],
                };

            case 'terms':
                const daysChange = params.termDays - 30;
                const cashFlowImpact = daysChange * -850000;

                return {
                    currentTerms: 30,
                    newTerms: params.termDays,
                    cashFlowImpact: cashFlowImpact,
                    dsoChange: daysChange,
                    recommendation: params.termDays < 30
                        ? 'Improves cash flow but may reduce customer satisfaction'
                        : 'May improve customer satisfaction but delays cash',
                    impacts: [
                        `DSO change: ${daysChange > 0 ? '+' : ''}${daysChange} days`,
                        `Cash flow impact: ${cashFlowImpact > 0 ? '+' : ''}₹${(Math.abs(cashFlowImpact) / 100000).toFixed(1)}L`,
                        `Customer satisfaction: ${daysChange > 0 ? 'Higher' : 'Lower'}`,
                    ],
                };

            default:
                return null;
        }
    };

    const currentScenario = scenarios[activeScenario];

    return (
        <div className="scenario-planner">
            <div className="planner-header">
                <h2>💡 Scenario Planning</h2>
                <p>Run "what-if" simulations to make better business decisions</p>
            </div>

            {/* Scenario Selector */}
            <div className="scenario-selector">
                {Object.entries(scenarios).map(([key, scenario]) => (
                    <button
                        key={key}
                        className={`scenario-card ${activeScenario === key ? 'active' : ''}`}
                        onClick={() => setActiveScenario(key)}
                    >
                        <div className="scenario-icon">{scenario.icon}</div>
                        <div className="scenario-info">
                            <h3>{scenario.title}</h3>
                            <p>{scenario.description}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Input Panel */}
            <div className="input-panel">
                <h3>Configure Scenario</h3>

                {currentScenario.fields.map(field => (
                    <div key={field.key} className="input-group">
                        <label>{field.label}</label>
                        <div className="slider-container">
                            <input
                                type="range"
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                value={inputs[field.key]}
                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                            />
                            <span className="value-display">{inputs[field.key]}{field.label.includes('%') ? '%' : ''}</span>
                        </div>
                    </div>
                ))}

                <button
                    className="run-scenario-btn"
                    onClick={runScenario}
                    disabled={loading}
                >
                    {loading ? 'Calculating...' : (
                        <>
                            <Play size={20} />
                            Run Scenario
                        </>
                    )}
                </button>
            </div>

            {/* Results Panel */}
            {results && (
                <div className="results-panel">
                    <h3>Scenario Results</h3>

                    <div className="result-summary">
                        <div className={`recommendation ${results.netImpact === 'positive' ? 'positive' : 'warning'}`}>
                            <AlertCircle size={20} />
                            <div>
                                <strong>Recommendation</strong>
                                <p>{results.recommendation}</p>
                            </div>
                        </div>
                    </div>

                    <div className="impact-grid">
                        <h4>Key Impacts:</h4>
                        {results.impacts.map((impact, idx) => (
                            <div key={idx} className="impact-item">
                                <span className="impact-bullet">•</span>
                                <span>{impact}</span>
                            </div>
                        ))}
                    </div>

                    {results.netBenefit && (
                        <div className="financial-summary">
                            <div className="summary-item">
                                <span>Net Benefit</span>
                                <strong className="positive">+₹{(results.netBenefit / 100000).toFixed(1)}L</strong>
                            </div>
                            <div className="summary-item">
                                <span>ROI</span>
                                <strong>{results.roi}%</strong>
                            </div>
                        </div>
                    )}

                    <div className="action-buttons">
                        <button className="apply-btn">Apply This Scenario</button>
                        <button className="save-btn">Save for Later</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScenarioPlanner;
