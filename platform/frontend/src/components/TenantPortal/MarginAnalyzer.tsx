import React, { useState } from 'react';
import {
    Box,
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiPieChart, FiTrendingDown, FiAlertTriangle } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import './MarginAnalyzer.css';

interface MarginAnalyzerProps {
    tenantId: string;
}

const MarginAnalyzer: React.FC<MarginAnalyzerProps> = ({ tenantId }) => {
    const [marginData, setMarginData] = useState({
        grossMargin: 42,
        netMargin: 28,
        targetMargin: 35,
        topCustomers: [
            { name: 'Acme Corp', margin: 45, color: '#52C41A' },
            { name: 'Tech Solutions', margin: 38, color: '#1890FF' },
            { name: 'Startup Inc', margin: 22, color: '#FA8C16' },
        ],
    });

    const pieData = marginData.topCustomers.map(c => ({
        name: c.name,
        value: c.margin,
    }));

    return (
        <Box>
            <VStack gap={6} align="stretch">
                <h2 className="heading heading-md color-gray-800">
                    <Icon as={FiPieChart} className="icon mr-2" />
                    Margin Analyzer (AI-Powered)
                </h2>

                {/* Margin Summary */}
                <HStack gap={4}>
                    <div className="card flex-1" style={{ background: 'linear-gradient(to bottom right, #f0fff4, white)', borderTop: '4px solid #48bb78' }}>
                        <div className="card-body">
                            <VStack align="start" gap={2}>
                                <span className="text text-sm color-gray-600">Gross Margin</span>
                                <span className="text text-3xl font-bold color-green-700">
                                    {marginData.grossMargin}%
                                </span>
                                <div className="progress">
                                    <div 
                                        className="progress-bar progress-bar-green" 
                                        style={{ width: `${marginData.grossMargin}%` }}
                                    />
                                </div>
                            </VStack>
                        </div>
                    </div>

                    <div className="card flex-1" style={{ background: 'linear-gradient(to bottom right, #ebf8ff, white)', borderTop: '4px solid #3182ce' }}>
                        <div className="card-body">
                            <VStack align="start" gap={2}>
                                <span className="text text-sm color-gray-600">Net Margin</span>
                                <span className="text text-3xl font-bold color-blue-700">
                                    {marginData.netMargin}%
                                </span>
                                <div className="progress">
                                    <div 
                                        className="progress-bar" 
                                        style={{ width: `${marginData.netMargin}%` }}
                                    />
                                </div>
                            </VStack>
                        </div>
                    </div>

                    <div className="card flex-1" style={{ background: 'linear-gradient(to bottom right, #fff5f5, white)', borderTop: '4px solid #e53e3e' }}>
                        <div className="card-body">
                            <VStack align="start" gap={2}>
                                <span className="text text-sm color-gray-600">Target Margin</span>
                                <span className="text text-3xl font-bold color-red-700">
                                    {marginData.targetMargin}%
                                </span>
                                <div className="progress">
                                    <div 
                                        className="progress-bar progress-bar-red" 
                                        style={{ width: `${marginData.targetMargin}%` }}
                                    />
                                </div>
                            </VStack>
                        </div>
                    </div>
                </HStack>

                {/* Alert */}
                {marginData.netMargin < marginData.targetMargin && (
                    <div className="alert alert-warning border-radius-lg">
                        <div className="h-stack align-start">
                            <Icon as={FiAlertTriangle} className="alert-icon" />
                            <VStack align="start" gap={1}>
                                <span className="text font-semibold">Margin Gap Detected</span>
                                <span className="text text-sm">
                                    Net margin is {marginData.targetMargin - marginData.netMargin}% below target. 
                                    Consider optimizing costs or increasing prices.
                                </span>
                            </VStack>
                        </div>
                    </div>
                )}

                {/* Customer Margin Breakdown */}
                <div className="card">
                    <div className="card-body">
                        <h3 className="heading heading-sm mb-4">Customer Margin Analysis</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={marginData.topCustomers[index].color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="v-stack gap-3">
                                <h4 className="heading heading-sm">Top Customers by Margin</h4>
                                {marginData.topCustomers.map((customer, index) => (
                                    <div key={index} className="product-item">
                                        <div className="h-stack justify-between">
                                            <span className="product-name">{customer.name}</span>
                                            <div className="product-metrics">
                                                <span className="product-revenue">{customer.margin}%</span>
                                                <span 
                                                    className={`metric-change ${customer.margin >= 35 ? 'positive' : 'negative'}`}
                                                >
                                                    {customer.margin >= 35 ? '↑' : '↓'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Insights */}
                <div className="card bg-cfo-secondary-50 border-radius-lg">
                    <div className="card-body">
                        <VStack gap={3} align="start">
                            <h3 className="heading heading-sm color-gray-800">
                                🤖 AI Margin Insights
                            </h3>
                            <div className="v-stack gap-2">
                                <div className="insight-item">
                                    <Icon as={FiTrendingDown} className="insight-icon" />
                                    <span className="insight-text">
                                        Acme Corp shows excellent margin performance at 45%. Consider expanding 
                                        service offerings to this high-margin customer.
                                    </span>
                                </div>
                                <div className="insight-item">
                                    <Icon as={FiAlertTriangle} className="insight-icon" />
                                    <span className="insight-text">
                                        Startup Inc has low margins (22%). Review pricing strategy and cost 
                                        structure for this customer to improve profitability.
                                    </span>
                                </div>
                                <div className="insight-item">
                                    <Icon as={FiPieChart} className="insight-icon" />
                                    <span className="insight-text">
                                        Overall margin distribution is healthy. Focus on maintaining current 
                                        gross margins while optimizing operational costs to improve net margins.
                                    </span>
                                </div>
                            </div>
                        </VStack>
                    </div>
                </div>
            </VStack>
        </Box>
    );
};

export default MarginAnalyzer;
