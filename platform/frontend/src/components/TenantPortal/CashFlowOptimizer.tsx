import React, { useState } from 'react';
import {
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiDollarSign, FiTrendingUp, FiZap, FiCheckCircle } from 'react-icons/fi';
import './CashFlowOptimizer.css';

interface Optimization {
    id: string;
    title: string;
    impact: 'high' | 'medium' | 'low';
    savingsAmount: number;
    description: string;
    actionRequired: string;
}

interface CashFlowOptimizerProps {
    tenantId: string;
}

const CashFlowOptimizer: React.FC<CashFlowOptimizerProps> = ({ tenantId }) => {
    const [optimizations, setOptimizations] = useState<Optimization[]>([
        {
            id: 'o1',
            title: 'Early Payment Incentive for Acme Corp',
            impact: 'high',
            savingsAmount: 15000,
            description: 'Offer 2% discount for payment within 15 days instead of net 30',
            actionRequired: 'Send updated payment terms via email',
        },
        {
            id: 'o2',
            title: 'Optimize Invoice Timing',
            impact: 'medium',
            savingsAmount: 8000,
            description: 'Send invoices on 1st of month when corporate budgets reset',
            actionRequired: 'Enable auto-scheduling in settings',
        },
        {
            id: 'o3',
            title: 'Reduce Late Payment Penalties',
            impact: 'low',
            savingsAmount: 3000,
            description: 'Streamline collection process to reduce DSO by 5 days',
            actionRequired: 'Enable automated reminders',
        },
    ]);

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const handleApplyOptimization = (id: string) => {
        setToastMessage('Optimization Applied');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);

        setOptimizations(prev => prev.filter(o => o.id !== id));
    };

    const totalSavings = optimizations.reduce((sum, opt) => sum + opt.savingsAmount, 0);
    const highImpactCount = optimizations.filter(o => o.impact === 'high').length;
    const mediumImpactCount = optimizations.filter(o => o.impact === 'medium').length;
    const lowImpactCount = optimizations.filter(o => o.impact === 'low').length;

    return (
        <VStack gap={6} align="stretch">
            {/* Header */}
            <h2 className="heading heading-lg color-gray-800">
                <Icon as={FiDollarSign} className="icon mr-2" />
                Cash Flow Optimizer
            </h2>

            {/* Cash Flow Overview */}
            <div className="cash-flow-overview">
                <div className="cash-flow-card bg-gradient-to-br bg-blue-50 border-top-4 border-blue-500">
                    <div className="metric-value">₹{(totalSavings / 1000).toFixed(0)}K</div>
                    <div className="metric-label">Potential Savings</div>
                    <div className="metric-change positive">
                        <Icon as={FiTrendingUp} className="icon mr-1" />
                        Available optimizations
                    </div>
                </div>

                <div className="cash-flow-card bg-gradient-to-br bg-green-50 border-top-4 border-green-500">
                    <div className="metric-value">{highImpactCount}</div>
                    <div className="metric-label">High Impact</div>
                    <div className="metric-change positive">
                        <Icon as={FiZap} className="icon mr-1" />
                        Priority actions
                    </div>
                </div>

                <div className="cash-flow-card bg-gradient-to-br bg-orange-50 border-top-4 border-orange-500">
                    <div className="metric-value">{mediumImpactCount}</div>
                    <div className="metric-label">Medium Impact</div>
                    <div className="metric-change positive">
                        <Icon as={FiTrendingUp} className="icon mr-1" />
                        Quick wins
                    </div>
                </div>

                <div className="cash-flow-card bg-gradient-to-br bg-purple-50 border-top-4 border-purple-500">
                    <div className="metric-value">{lowImpactCount}</div>
                    <div className="metric-label">Low Impact</div>
                    <div className="metric-change positive">
                        <Icon as={FiCheckCircle} className="icon mr-1" />
                        Long-term improvements
                    </div>
                </div>
            </div>

            {/* Optimization Opportunities */}
            <div className="optimization-opportunities">
                {optimizations.map((optimization) => (
                    <div key={optimization.id} className="optimization-card">
                        <div className="optimization-header">
                            <div>
                                <h4 className="optimization-title">{optimization.title}</h4>
                                <div className={`optimization-impact ${optimization.impact}`}>
                                    <span className="status-dot active"></span>
                                    {optimization.impact} impact
                                </div>
                            </div>
                        </div>

                        <div className="optimization-description">
                            {optimization.description}
                        </div>

                        <div className="optimization-savings">
                            Potential Savings: ₹{optimization.savingsAmount.toLocaleString('en-IN')}
                        </div>

                        <div className="optimization-actions">
                            <button
                                className="button button-blue button-sm"
                                onClick={() => handleApplyOptimization(optimization.id)}
                            >
                                <Icon as={FiZap} className="icon mr-1" />
                                Apply Now
                            </button>
                            <button className="button button-outline button-sm">
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Cash Flow Chart */}
            <div className="cash-flow-chart">
                <h3 className="heading heading-md mb-4">Cash Flow Projection</h3>
                <div className="chart-container">
                    {/* Simple CSS-based chart representation */}
                    <div className="v-stack gap-3 align-center">
                        <div className="w-full">
                            <div className="h-stack justify-between mb-1">
                                <span className="text text-sm font-medium">Current Month</span>
                                <span className="text text-sm color-gray-600">₹250K</span>
                            </div>
                            <div className="progress" style={{ height: '12px' }}>
                                <div className="progress-bar progress-bar-blue" style={{ width: '60%' }} />
                            </div>
                        </div>
                        <div className="w-full">
                            <div className="h-stack justify-between mb-1">
                                <span className="text text-sm font-medium">With Optimizations</span>
                                <span className="text text-sm color-green-600">₹{(250 + totalSavings / 1000).toFixed(0)}K</span>
                            </div>
                            <div className="progress" style={{ height: '12px' }}>
                                <div className="progress-bar progress-bar-green" style={{ width: `${60 + (totalSavings / 2500)}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Insights */}
            <div className="ai-insights">
                <div className="ai-title">
                    <Icon as={FiZap} className="icon" />
                    AI Cash Flow Insights
                </div>
                <div className="v-stack gap-3">
                    <div className="ai-suggestion">
                        <Icon as={FiDollarSign} className="ai-icon" />
                        <span className="ai-text">
                            Your early payment incentive strategy could improve cash flow by ₹15K monthly 
                            with minimal impact on customer relationships.
                        </span>
                    </div>
                    <div className="ai-suggestion">
                        <Icon as={FiTrendingUp} className="ai-icon" />
                        <span className="ai-text">
                            Invoice timing optimization typically reduces DSO by 3-5 days, 
                            significantly improving working capital.
                        </span>
                    </div>
                    <div className="ai-suggestion">
                        <Icon as={FiCheckCircle} className="ai-icon" />
                        <span className="ai-text">
                            Implementing all suggested optimizations could increase your 
                            monthly cash flow by {((totalSavings / 250000) * 100).toFixed(1)}%.
                        </span>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
                <button className="button button-blue button-sm">
                    <Icon as={FiZap} className="icon mr-1" />
                    Apply All Optimizations
                </button>
                <button className="button button-outline button-sm">
                    <Icon as={FiTrendingUp} className="icon mr-1" />
                    Generate Cash Flow Report
                </button>
            </div>

            {/* Empty State */}
            {optimizations.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">🎉</div>
                    <div className="empty-state-text">All Optimizations Applied!</div>
                    <div className="empty-state-subtext">
                        Your cash flow is fully optimized. Check back next month for new opportunities.
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {showToast && (
                <div className={`toast toast-${toastType}`}>
                    <div className="toast-title">
                        {toastType === 'success' ? 'Success' : 'Error'}
                    </div>
                    <div className="toast-message">{toastMessage}</div>
                </div>
            )}
        </VStack>
    );
};

export default CashFlowOptimizer;
