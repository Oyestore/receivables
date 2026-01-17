import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    Icon,
} from '@chakra-ui/react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiCalendar } from 'react-icons/fi';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import './CashFlowIntelligence.css';

interface CashFlowIntelligenceProps {
    customerId: string;
}

const CashFlowIntelligence: React.FC<CashFlowIntelligenceProps> = ({
    customerId,
}) => {
    const [forecastData, setForecastData] = useState<any[]>([]);
    const [insights, setInsights] = useState<any>(null);
    const [selectedPeriod, setSelectedPeriod] = useState('3months');

    useEffect(() => {
        generateCashFlowForecast();
    }, [customerId]);

    const generateCashFlowForecast = () => {
        // AI-generated cash flow forecast based on pending invoices and payment history
        const mockData = [
            { month: 'Nov', actual: 180000, forecast: null },
            { month: 'Dec', actual: null, forecast: 220000 },
            { month: 'Jan', actual: null, forecast: 195000 },
            { month: 'Feb', actual: null, forecast: 240000 },
        ];

        const mockInsights = {
            nextMonthSpend: 220000,
            avgMonthlySpend: 200000,
            trend: 'up',
            percentageChange: 10,
            peakMonth: 'February',
            recommendation: 'Budget will be 10% higher than average next month due to 3 pending high-value invoices.',
        };

        setForecastData(mockData);
        setInsights(mockInsights);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const formatCompactCurrency = (amount: number) => {
        if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)}L`;
        } else if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(0)}K`;
        }
        return `₹${amount}`;
    };

    return (
        <div className="cash-flow-intelligence">
            <VStack gap={6} align="stretch">
                {/* Header */}
                <div className="intelligence-header">
                    <h2 className="intelligence-title">
                        <Icon as={FiDollarSign} className="icon mr-2" />
                        Cash Flow Intelligence
                    </h2>
                    <div className="intelligence-actions">
                        <select
                            className="chart-control"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            <option value="1month">1 Month</option>
                            <option value="3months">3 Months</option>
                            <option value="6months">6 Months</option>
                            <option value="1year">1 Year</option>
                        </select>
                    </div>
                </div>

                {/* Cash Flow Overview */}
                <div className="cash-flow-overview">
                    <div className="overview-card positive">
                        <div className="overview-icon positive">
                            <Icon as={FiTrendingUp} className="icon-lg" />
                        </div>
                        <div className="overview-value">{formatCompactCurrency(insights?.nextMonthSpend || 0)}</div>
                        <div className="overview-label">Next Month Forecast</div>
                        <div className="overview-change positive">
                            <Icon as={FiTrendingUp} className="icon" />
                            +{insights?.percentageChange || 0}% vs average
                        </div>
                    </div>

                    <div className="overview-card neutral">
                        <div className="overview-icon neutral">
                            <Icon as={FiCalendar} className="icon-lg" />
                        </div>
                        <div className="overview-value">{formatCompactCurrency(insights?.avgMonthlySpend || 0)}</div>
                        <div className="overview-label">Average Monthly</div>
                        <div className="overview-change">
                            <Icon as={FiTrendingUp} className="icon" />
                            Based on last 6 months
                        </div>
                    </div>

                    <div className="overview-card positive">
                        <div className="overview-icon positive">
                            <Icon as={FiDollarSign} className="icon-lg" />
                        </div>
                        <div className="overview-value">{insights?.peakMonth || 'N/A'}</div>
                        <div className="overview-label">Peak Month</div>
                        <div className="overview-change positive">
                            <Icon as={FiTrendingUp} className="icon" />
                            Highest spending period
                        </div>
                    </div>

                    <div className="overview-card negative">
                        <div className="overview-icon negative">
                            <Icon as={FiTrendingDown} className="icon-lg" />
                        </div>
                        <div className="overview-value">{formatCompactCurrency(45000)}</div>
                        <div className="overview-label">Pending Invoices</div>
                        <div className="overview-change negative">
                            <Icon as={FiTrendingDown} className="icon" />
                            3 invoices awaiting approval
                        </div>
                    </div>
                </div>

                {/* Cash Flow Chart */}
                <div className="cash-flow-chart">
                    <div className="chart-header">
                        <h3 className="chart-title">Cash Flow Trend</h3>
                        <div className="chart-controls">
                            <button className={`chart-control ${selectedPeriod === '3months' ? 'active' : ''}`}>
                                3M
                            </button>
                            <button className={`chart-control ${selectedPeriod === '6months' ? 'active' : ''}`}>
                                6M
                            </button>
                            <button className={`chart-control ${selectedPeriod === '1year' ? 'active' : ''}`}>
                                1Y
                            </button>
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={forecastData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="month" stroke="#718096" />
                                <YAxis stroke="#718096" tickFormatter={(value) => formatCompactCurrency(value)} />
                                <Tooltip 
                                    formatter={(value: any) => [formatCurrency(value), 'Amount']}
                                    contentStyle={{ 
                                        backgroundColor: 'white', 
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="actual"
                                    stackId="1"
                                    stroke="#3182ce"
                                    fill="#3182ce"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="forecast"
                                    stackId="1"
                                    stroke="#805ad5"
                                    fill="#805ad5"
                                    fillOpacity={0.6}
                                    strokeDasharray="5 5"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Cash Flow Insights */}
                <div className="cash-flow-insights">
                    <div className="insights-header">
                        <h3 className="insights-title">AI Insights</h3>
                    </div>
                    <div className="insights-list">
                        <div className="insight-item positive">
                            <div className="insight-icon positive">
                                <Icon as={FiTrendingUp} className="icon" />
                            </div>
                            <div className="insight-content">
                                <div className="insight-title">Positive Cash Flow Trend</div>
                                <div className="insight-description">
                                    Your cash flow is showing an upward trend with a {insights?.percentageChange || 0}% increase expected next month.
                                </div>
                                <div className="insight-action">
                                    <button className="insight-button">View Details</button>
                                </div>
                            </div>
                        </div>

                        <div className="insight-item warning">
                            <div className="insight-icon warning">
                                <Icon as={FiCalendar} className="icon" />
                            </div>
                            <div className="insight-content">
                                <div className="insight-title">Upcoming Large Payment</div>
                                <div className="insight-description">
                                    A payment of ₹75,000 is due next week. Consider scheduling this payment to optimize cash flow.
                                </div>
                                <div className="insight-action">
                                    <button className="insight-button">Schedule Payment</button>
                                </div>
                            </div>
                        </div>

                        <div className="insight-item negative">
                            <div className="insight-icon negative">
                                <Icon as={FiTrendingDown} className="icon" />
                            </div>
                            <div className="insight-content">
                                <div className="insight-title">Pending Invoice Approvals</div>
                                <div className="insight-description">
                                    3 high-value invoices are pending approval, totaling ₹45,000. This may impact your cash flow projections.
                                </div>
                                <div className="insight-action">
                                    <button className="insight-button">Review Invoices</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cash Flow Forecast */}
                <div className="cash-flow-forecast">
                    <div className="forecast-header">
                        <h3 className="forecast-title">3-Month Forecast</h3>
                    </div>
                    <div className="forecast-periods">
                        <div className="forecast-period">
                            <div className="forecast-period-header">December</div>
                            <div className="forecast-period-value">{formatCompactCurrency(220000)}</div>
                            <div className="forecast-period-change positive">
                                <Icon as={FiTrendingUp} className="icon" />
                                +10% vs average
                            </div>
                        </div>
                        <div className="forecast-period">
                            <div className="forecast-period-header">January</div>
                            <div className="forecast-period-value">{formatCompactCurrency(195000)}</div>
                            <div className="forecast-period-change negative">
                                <Icon as={FiTrendingDown} className="icon" />
                                -2.5% vs average
                            </div>
                        </div>
                        <div className="forecast-period">
                            <div className="forecast-period-header">February</div>
                            <div className="forecast-period-value">{formatCompactCurrency(240000)}</div>
                            <div className="forecast-period-change positive">
                                <Icon as={FiTrendingUp} className="icon" />
                                +20% vs average
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cash Flow Recommendations */}
                <div className="cash-flow-recommendations">
                    <h3 className="recommendations-title">AI Recommendations</h3>
                    <div className="recommendations-list">
                        <div className="recommendation-item">
                            <div className="recommendation-icon">
                                <Icon as={FiTrendingUp} className="icon" />
                            </div>
                            <div className="recommendation-content">
                                <div className="recommendation-title">Optimize Payment Timing</div>
                                <div className="recommendation-description">
                                    Schedule 2 payments for early next month to take advantage of early payment discounts.
                                </div>
                                <div className="recommendation-impact">Potential savings: ₹2,000</div>
                            </div>
                        </div>
                        <div className="recommendation-item">
                            <div className="recommendation-icon">
                                <Icon as={FiCalendar} className="icon" />
                            </div>
                            <div className="recommendation-content">
                                <div className="recommendation-title">Improve Cash Flow Buffer</div>
                                <div className="recommendation-description">
                                    Maintain a 15% cash buffer based on your forecast to handle unexpected expenses.
                                </div>
                                <div className="recommendation-impact">Recommended buffer: ₹30,000</div>
                            </div>
                        </div>
                        <div className="recommendation-item">
                            <div className="recommendation-icon">
                                <Icon as={FiDollarSign} className="icon" />
                            </div>
                            <div className="recommendation-content">
                                <div className="recommendation-title">Review Recurring Payments</div>
                                <div className="recommendation-description">
                                    3 recurring payments show seasonal patterns. Consider adjusting payment schedules.
                                </div>
                                <div className="recommendation-impact">Optimization potential: 8%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </VStack>
        </div>
    );
};

export default CashFlowIntelligence;
