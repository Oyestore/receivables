import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Users, Target } from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { formatCurrency } from '@/lib/utils';

/**
 * Revenue Analytics Dashboard
 * 
 * MRR/ARR tracking, growth trends, and forecasting
 */

const RevenueAnalyticsDashboard: React.FC = () => {
    const revenueData = [
        { month: 'Jan', mrr: 125000, arr: 1500000 },
        { month: 'Feb', mrr: 132000, arr: 1584000 },
        { month: 'Mar', mrr: 145000, arr: 1740000 },
        { month: 'Apr', mrr: 158000, arr: 1896000 },
        { month: 'May', mrr: 172000, arr: 2064000 },
        { month: 'Jun', mrr: 189000, arr: 2268000 },
    ];

    const currentMRR = revenueData[revenueData.length - 1].mrr;
    const currentARR = revenueData[revenueData.length - 1].arr;
    const growthRate = ((currentMRR / revenueData[0].mrr - 1) * 100).toFixed(1);

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-gradient">Revenue Analytics</h1>
                <p className="text-muted-foreground mt-1">MRR/ARR tracking and growth forecasting</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="MRR"
                    value={formatCurrency(currentMRR)}
                    change={{ value: parseFloat(growthRate), label: '6-month growth' }}
                    icon={<DollarSign size={24} />}
                    gradient="success"
                />
                <MetricCard
                    title="ARR"
                    value={formatCurrency(currentARR)}
                    icon={<TrendingUp size={24} />}
                    gradient="primary"
                />
                <MetricCard
                    title="Growth Rate"
                    value={`${growthRate}%`}
                    icon={<Target size={24} />}
                    gradient="success"
                />
                <MetricCard
                    title="Customers"
                    value={450}
                    change={{ value: 12.5, label: 'growth' }}
                    icon={<Users size={24} />}
                    gradient="primary"
                />
            </div>

            <Card>
                <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="mrr"
                            stroke="#22c55e"
                            strokeWidth={3}
                            dot={{ fill: '#22c55e', r: 5 }}
                            name="MRR"
                        />
                        <Line
                            type="monotone"
                            dataKey="arr"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            dot={{ fill: '#8b5cf6', r: 5 }}
                            name="ARR"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                    <h3 className="font-semibold mb-3">New MRR</h3>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(42000)}</p>
                    <p className="text-sm text-muted-foreground mt-1">This month</p>
                </Card>
                <Card>
                    <h3 className="font-semibold mb-3">Expansion MRR</h3>
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(18000)}</p>
                    <p className="text-sm text-muted-foreground mt-1">Upsells</p>
                </Card>
                <Card>
                    <h3 className="font-semibold mb-3">Churn MRR</h3>
                    <p className="text-3xl font-bold text-red-600">-{formatCurrency(8000)}</p>
                    <p className="text-sm text-muted-foreground mt-1">Lost revenue</p>
                </Card>
            </div>
        </div>
    );
};

export default RevenueAnalyticsDashboard;
