import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiTrendingUp, FiClock, FiDollarSign } from 'react-icons/fi';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import './CustomerPaymentPatterns.css';

interface PaymentPattern {
    customerId: string;
    customerName: string;
    avgPaymentDays: number;
    paymentConsistency: number;
    preferredMethod: string;
    preferredDay: string;
    riskScore: number;
    insights: string[];
}

interface CustomerPaymentPatternsProps {
    tenantId: string;
}

const CustomerPaymentPatterns: React.FC<CustomerPaymentPatternsProps> = ({
    tenantId,
}) => {
    const [patterns, setPatterns] = useState<PaymentPattern[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        analyzePaymentPatterns();
    }, [tenantId]);

    const analyzePaymentPatterns = () => {
        // AI-powered payment pattern analysis
        const mockPatterns: PaymentPattern[] = [
            {
                customerId: 'c1',
                customerName: 'Acme Corp',
                avgPaymentDays: 35,
                paymentConsistency: 75,
                preferredMethod: 'NetBanking',
                preferredDay: 'End of Month',
                riskScore: 45,
                insights: [
                    'Pays consistently at month-end',
                    'Prefers NetBanking for amounts >₹50K',
                    'Response rate to reminders: 85%',
                ],
            },
            {
                customerId: 'c2',
                customerName: 'Tech Solutions',
                avgPaymentDays: 22,
                paymentConsistency: 92,
                preferredMethod: 'UPI',
                preferredDay: '15th of Month',
                riskScore: 15,
                insights: [
                    'Very consistent payer',
                    'Prefers UPI for quick payments',
                    'Never requires reminders',
                ],
            },
            {
                customerId: 'c3',
                customerName: 'Global Services',
                avgPaymentDays: 48,
                paymentConsistency: 60,
                preferredMethod: 'Card',
                preferredDay: 'Irregular',
                riskScore: 75,
                insights: [
                    'Irregular payment schedule',
                    'Often requires follow-ups',
                    'Prefers card payments when available',
                ],
            },
        ];

        setPatterns(mockPatterns);

        // Prepare chart data
        const monthlyData = [
            { month: 'Jan', onTime: 85, late: 15 },
            { month: 'Feb', onTime: 78, late: 22 },
            { month: 'Mar', onTime: 92, late: 8 },
            { month: 'Apr', onTime: 88, late: 12 },
            { month: 'May', onTime: 75, late: 25 },
            { month: 'Jun', onTime: 90, late: 10 },
        ];

        setChartData(monthlyData);
    };

    const getRiskColor = (score: number) => {
        if (score <= 30) return 'green';
        if (score <= 60) return 'orange';
        return 'red';
    };

    const getConsistencyColor = (score: number) => {
        if (score >= 80) return 'green';
        if (score >= 60) return 'orange';
        return 'red';
    };

    const avgPaymentDays = patterns.reduce((sum, p) => sum + p.avgPaymentDays, 0) / patterns.length || 0;
    const avgConsistency = patterns.reduce((sum, p) => sum + p.paymentConsistency, 0) / patterns.length || 0;
    const highRiskCustomers = patterns.filter(p => p.riskScore > 60).length;
    const totalCustomers = patterns.length;

    return (
        <VStack gap={6} align="stretch">
            {/* Header */}
            <h2 className="heading heading-lg color-gray-800">
                <Icon as={FiTrendingUp} className="icon mr-2" />
                Customer Payment Patterns
            </h2>

            {/* Stats Overview */}
            <div className="stats-grid">
                <div className="stat-card bg-gradient-to-br bg-blue-50 border-top-4 border-blue-500">
                    <div className="stat-value">{avgPaymentDays.toFixed(0)} days</div>
                    <div className="stat-label">Avg Payment Time</div>
                    <div className="stat-change positive">
                        <Icon as={FiClock} className="icon mr-1" />
                        -3 days from last month
                    </div>
                </div>

                <div className="stat-card bg-gradient-to-br bg-green-50 border-top-4 border-green-500">
                    <div className="stat-value">{avgConsistency.toFixed(0)}%</div>
                    <div className="stat-label">Payment Consistency</div>
                    <div className="stat-change positive">
                        <Icon as={FiTrendingUp} className="icon mr-1" />
                        +5% improvement
                    </div>
                </div>

                <div className="stat-card bg-gradient-to-br bg-orange-50 border-top-4 border-orange-500">
                    <div className="stat-value">{highRiskCustomers}</div>
                    <div className="stat-label">High Risk Customers</div>
                    <div className="stat-change negative">
                        <Icon as={FiTrendingUp} className="icon mr-1" />
                        Requires attention
                    </div>
                </div>

                <div className="stat-card bg-gradient-to-br bg-purple-50 border-top-4 border-purple-500">
                    <div className="stat-value">{totalCustomers}</div>
                    <div className="stat-label">Total Analyzed</div>
                    <div className="stat-change positive">
                        <Icon as={FiDollarSign} className="icon mr-1" />
                        Active customers
                    </div>
                </div>
            </div>

            {/* Payment Trends Chart */}
            <div className="card">
                <div className="card-body">
                    <h3 className="heading heading-md mb-4">Payment Trends (Last 6 Months)</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line 
                                    type="monotone" 
                                    dataKey="onTime" 
                                    stroke="#48bb78" 
                                    strokeWidth={2}
                                    name="On-Time Payments"
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="late" 
                                    stroke="#e53e3e" 
                                    strokeWidth={2}
                                    name="Late Payments"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Customer Patterns */}
            <div className="v-stack gap-4">
                {patterns.map((pattern) => (
                    <div key={pattern.customerId} className="pattern-card">
                        <div className="pattern-header">
                            <h4 className="pattern-title">{pattern.customerName}</h4>
                            <div className="h-stack gap-2">
                                <Badge className={`badge badge-${getRiskColor(pattern.riskScore)}`}>
                                    Risk: {pattern.riskScore}
                                </Badge>
                                <Badge className={`badge badge-${getConsistencyColor(pattern.paymentConsistency)}`}>
                                    {pattern.paymentConsistency}% consistent
                                </Badge>
                            </div>
                        </div>

                        <div className="pattern-metrics">
                            <div className="metric-item">
                                <span className="metric-label">Avg Payment Days</span>
                                <span className="metric-value">{pattern.avgPaymentDays} days</span>
                            </div>
                            <div className="metric-item">
                                <span className="metric-label">Preferred Method</span>
                                <span className="metric-value">{pattern.preferredMethod}</span>
                            </div>
                            <div className="metric-item">
                                <span className="metric-label">Payment Day</span>
                                <span className="metric-value">{pattern.preferredDay}</span>
                            </div>
                            <div className="metric-item">
                                <span className="metric-label">Risk Score</span>
                                <div className="frequency-indicator">
                                    <div className="frequency-bar">
                                        <div 
                                            className={`frequency-fill ${pattern.riskScore <= 30 ? 'high' : pattern.riskScore <= 60 ? 'medium' : 'low'}`}
                                            style={{ width: `${pattern.riskScore}%` }}
                                        />
                                    </div>
                                    <span className="frequency-text">{pattern.riskScore}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pattern-details">
                            <h5 className="heading heading-sm mb-2">AI Insights</h5>
                            <div className="v-stack gap-2">
                                {pattern.insights.map((insight, index) => (
                                    <div key={index} className="h-stack gap-2">
                                        <span className="text text-xs color-gray-500">•</span>
                                        <span className="text text-sm color-gray-700">{insight}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Summary */}
            <div className="card bg-cfo-secondary-50 border-radius-lg">
                <div className="card-body">
                    <VStack gap={3} align="start">
                        <h3 className="heading heading-sm color-gray-800">
                            🤖 AI Payment Pattern Analysis
                        </h3>
                        <div className="v-stack gap-2">
                            <div className="h-stack gap-3">
                                <Icon as={FiTrendingUp} className="icon" style={{ color: '#805ad5' }} />
                                <span className="text text-sm color-gray-700">
                                    Overall payment consistency has improved by 15% this quarter. 
                                    Tech Solutions is your most reliable customer with 92% consistency.
                                </span>
                            </div>
                            <div className="h-stack gap-3">
                                <Icon as={FiClock} className="icon" style={{ color: '#805ad5' }} />
                                <span className="text text-sm color-gray-700">
                                    Average payment time has decreased from 38 days to 32 days. 
                                    Consider offering early payment discounts to maintain this trend.
                                </span>
                            </div>
                            <div className="h-stack gap-3">
                                <Icon as={FiDollarSign} className="icon" style={{ color: '#805ad5' }} />
                                <span className="text text-sm color-gray-700">
                                    3 customers require attention due to high risk scores. 
                                    Implement stricter payment terms or require advance payments for these accounts.
                                </span>
                            </div>
                        </div>
                    </VStack>
                </div>
            </div>
        </VStack>
    );
};

export default CustomerPaymentPatterns;
