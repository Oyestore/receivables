import React, { useState, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiTrendingUp, FiDollarSign, FiCalendar } from 'react-icons/fi';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import './RevenueForecasting.css';

interface RevenueForecastingProps {
    tenantId: string;
}

const RevenueForecasting: React.FC<RevenueForecastingProps> = ({ tenantId }) => {
    const [forecastData, setForecastData] = useState<any[]>([]);
    const [timeframe, setTimeframe] = useState<'3month' | '6month' | '12month'>('3month');

    useEffect(() => {
        generateRevenueForecast();
    }, [tenantId, timeframe]);

    const generateRevenueForecast = () => {
        // AI-powered revenue forecasting
        const mockData = [
            { month: 'Oct', actual: 450000, forecast: null, confidence: null },
            { month: 'Nov', actual: 520000, forecast: null, confidence: null },
            { month: 'Dec', actual: 480000, forecast: null, confidence: null },
            { month: 'Jan', actual: null, forecast: 550000, confidence: 85 },
            { month: 'Feb', actual: null, forecast: 580000, confidence: 82 },
            { month: 'Mar', actual: null, forecast: 620000, confidence: 78 },
        ];

        setForecastData(mockData);
    };

    const currentRevenue = 480000;
    const forecastedRevenue = 550000;
    const growthRate = ((forecastedRevenue - currentRevenue) / currentRevenue) * 100;
    const confidenceScore = 85;

    return (
        <Box>
            <VStack gap={6} align="stretch">
                <HStack justify="space-between">
                    <h2 className="heading heading-md color-gray-800">
                        <Icon as={FiTrendingUp} className="icon mr-2" />
                        Revenue Forecasting
                    </h2>
                    <select 
                        className="select"
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value as any)}
                    >
                        <option value="3month">3 Months</option>
                        <option value="6month">6 Months</option>
                        <option value="12month">12 Months</option>
                    </select>
                </HStack>

                {/* Key Metrics */}
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                    <div className="card bg-gradient-to-br bg-blue-50 border-top-4 border-blue-500">
                        <div className="card-body">
                            <div className="stat">
                                <div className="stat-label">Current Revenue</div>
                                <div className="stat-number">₹{(currentRevenue / 100000).toFixed(1)}L</div>
                                <div className="stat-help-text">
                                    <Icon as={FiDollarSign} className="icon mr-1" />
                                    Last month
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br bg-green-50 border-top-4 border-green-500">
                        <div className="card-body">
                            <div className="stat">
                                <div className="stat-label">Forecasted Revenue</div>
                                <div className="stat-number">₹{(forecastedRevenue / 100000).toFixed(1)}L</div>
                                <div className="stat-help-text">
                                    <Icon as={FiTrendingUp} className="icon mr-1" />
                                    +{growthRate.toFixed(1)}% growth
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br bg-purple-50 border-top-4 border-purple-500">
                        <div className="card-body">
                            <div className="stat">
                                <div className="stat-label">Confidence Score</div>
                                <div className="stat-number">{confidenceScore}%</div>
                                <div className="stat-help-text">
                                    <Icon as={FiCalendar} className="icon mr-1" />
                                    High accuracy
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Revenue Chart */}
                <div className="card">
                    <div className="card-body">
                        <h3 className="heading heading-sm mb-4">Revenue Trend Analysis</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={forecastData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="month" stroke="#64748b" />
                                    <YAxis stroke="#64748b" />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: 'white', 
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '6px'
                                        }} 
                                    />
                                    <Legend />
                                    <Area
                                        type="monotone"
                                        dataKey="actual"
                                        stroke="#3182ce"
                                        fill="#3182ce"
                                        fillOpacity={0.6}
                                        name="Actual Revenue"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="forecast"
                                        stroke="#10b981"
                                        fill="#10b981"
                                        fillOpacity={0.6}
                                        strokeDasharray="5 5"
                                        name="Forecasted Revenue"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Monthly Breakdown */}
                <div className="card">
                    <div className="card-body">
                        <h3 className="heading heading-sm mb-4">Monthly Revenue Breakdown</h3>
                        <div className="v-stack gap-3">
                            {forecastData.map((data, index) => (
                                <div key={index} className="forecast-item">
                                    <div className="h-stack justify-between">
                                        <span className="forecast-label">{data.month}</span>
                                        <div className="h-stack gap-3">
                                            {data.actual && (
                                                <span className="forecast-value">₹{(data.actual / 100000).toFixed(1)}L</span>
                                            )}
                                            {data.forecast && (
                                                <>
                                                    <span className="forecast-value">₹{(data.forecast / 100000).toFixed(1)}L</span>
                                                    {data.confidence && (
                                                        <Badge className={`badge ${data.confidence >= 80 ? 'badge-green' : 'badge-orange'}`}>
                                                            {data.confidence}% confidence
                                                        </Badge>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* AI Insights */}
                <div className="card bg-cfo-secondary-50 border-radius-lg">
                    <div className="card-body">
                        <VStack gap={3} align="start">
                            <h3 className="heading heading-sm color-gray-800">
                                💡 AI Revenue Insights
                            </h3>
                            <div className="v-stack gap-2">
                                <p className="text text-sm color-gray-700">
                                    Revenue is projected to grow by {growthRate.toFixed(1)}% over the next 3 months,
                                    driven by seasonal demand and new customer acquisition.
                                </p>
                                <p className="text text-sm color-gray-700">
                                    Q1 performance shows strong potential with {confidenceScore}% confidence in
                                    forecast accuracy. Consider increasing marketing spend by 15% to capitalize on growth trends.
                                </p>
                                <p className="text text-sm color-gray-700">
                                    Risk factors: Market volatility in Q2 could impact projections. Monitor competitor
                                    pricing strategies and customer retention metrics closely.
                                </p>
                            </div>
                        </VStack>
                    </div>
                </div>
            </VStack>
        </Box>
    );
};

export default RevenueForecasting;
