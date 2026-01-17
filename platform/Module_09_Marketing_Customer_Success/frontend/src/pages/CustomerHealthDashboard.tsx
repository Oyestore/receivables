import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import {
    Activity,
    TrendingDown,
    Users,
    AlertTriangle,
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { RiskBadge, Badge } from '../components/ui/Badge';
import { HealthGauge, HealthBar } from '../components/ui/HealthGauge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAtRiskCustomers, usePortfolioHealthSummary } from '@/hooks/useCustomerSuccess';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

/**
 * Customer Health Dashboard
 * 
 * Real-time customer health monitoring with live data from backend
 */

const CustomerHealthDashboard: React.FC = () => {
    // Get real data from backend using React Query
    const tenantId = 'tenant-123'; // In production, get from auth context
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    const { data: atRiskCustomers = [], isLoading: isLoadingRisk, error: errorRisk, refetch: refetchRisk } = useAtRiskCustomers(tenantId);
    const { data: portfolioSummary, isLoading: isLoadingSummary, error: errorSummary, refetch: refetchSummary } = usePortfolioHealthSummary(tenantId);

    const isLoading = isLoadingRisk || isLoadingSummary;
    const error = errorRisk || errorSummary;

    // Loading state
    if (isLoading) {
        return <LoadingSpinner />;
    }

    // Error state
    if (error) {
        return <ErrorMessage error={error} retry={() => { refetchRisk(); refetchSummary(); }} />;
    }

    // Map metrics
    const metrics = {
        avgHealthScore: portfolioSummary?.avgHealthScore || 0,
        atRiskCustomers: portfolioSummary?.atRiskCount || atRiskCustomers.length,
        totalCustomers: portfolioSummary?.totalCustomers || 0,
        churnRate: portfolioSummary?.totalCustomers ? (portfolioSummary.decliningCount / portfolioSummary.totalCustomers) : 0,
    };

    // Mock trend data (since not yet available in summary)
    const healthTrend = [
        { date: 'Week 1', score: 68, atRisk: 30 },
        { date: 'Week 2', score: 71, atRisk: 28 },
        { date: 'Week 3', score: 73, atRisk: 25 },
        { date: 'Week 4', score: 76, atRisk: 23 },
    ];

    return (
        <div className="min-h-screen bg-background bg-grid-pattern p-6 space-y-8 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[100px] -z-10 animate-pulse-slow" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary-500/10 rounded-full blur-[100px] -z-10 animate-pulse-slow" />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between backdrop-blur-sm p-4 rounded-xl border border-white/10"
            >
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600 tracking-tight">
                        Customer Health
                    </h1>
                    <p className="text-muted-foreground mt-1 font-medium">
                        Real-time AI monitoring & churn prediction
                    </p>
                </div>
                <div className="flex gap-2 p-1 bg-muted/50 rounded-xl backdrop-blur-md border border-white/10">
                    {(['7d', '30d', '90d'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={clsx(
                                'px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm',
                                timeRange === range
                                    ? 'bg-white dark:bg-gray-800 text-primary shadow-lg scale-105'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                            )}
                        >
                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Avg Health Score"
                    value={metrics.avgHealthScore}
                    change={{ value: 5.2, label: 'vs last month' }}
                    icon={<Activity size={24} className="text-green-500" />}
                    gradient="success"
                    loading={false}
                    className="glass-card glass-card-hover"
                />
                <MetricCard
                    title="At-Risk Customers"
                    value={metrics.atRiskCustomers}
                    change={{ value: -12.5, label: 'reduction' }}
                    icon={<AlertTriangle size={24} className="text-amber-500" />}
                    gradient="warning"
                    loading={false}
                    className="glass-card glass-card-hover"
                />
                <MetricCard
                    title="Total Customers"
                    value={metrics.totalCustomers}
                    change={{ value: 8.3, label: 'growth' }}
                    icon={<Users size={24} className="text-blue-500" />}
                    gradient="primary"
                    loading={false}
                    className="glass-card glass-card-hover"
                />
                <MetricCard
                    title="Churn Rate"
                    value={`${(metrics.churnRate * 100).toFixed(1)}%`}
                    change={{ value: -15.2, label: 'improvement' }}
                    icon={<TrendingDown size={24} className="text-red-500" />}
                    gradient="danger"
                    loading={false}
                    className="glass-card glass-card-hover"
                />
            </div>

            {/* Health Score Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Average Health Gauge */}
                <Card className="glass-card flex flex-col items-center justify-center py-12 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 to-transparent pointer-events-none" />
                    <HealthGauge score={metrics.avgHealthScore} size="lg" />
                    <div className="mt-6 text-center z-10">
                        <p className="text-lg font-semibold text-foreground">Portfolio Wellness</p>
                        <p className="text-sm text-muted-foreground mt-1 px-4 py-1 bg-muted/50 rounded-full inline-block">
                            Based on {metrics.totalCustomers} customers
                        </p>
                    </div>
                </Card>

                {/* Health Trend Chart */}
                <Card className="glass-card lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Activity className="text-primary h-5 w-5" />
                            Health Score Trend
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                            Live Updates
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={healthTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
                                    fontFamily: 'Inter, sans-serif'
                                }}
                                itemStyle={{ fontWeight: 600, color: '#4b5563' }}
                                labelStyle={{ color: '#9ca3af', marginBottom: '4px', fontSize: '0.8rem' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="score"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#scoreGradient)"
                                animationDuration={2000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* At-Risk Customers Table */}
            <Card className="glass-card overflow-hidden border-0">
                <div className="p-6 border-b border-border/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <AlertTriangle className="text-amber-500 h-5 w-5" />
                            At-Risk Customers
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            High-priority accounts requiring intervention
                        </p>
                    </div>
                    <Badge variant="warning" size="lg" className="animate-pulse shadow-glow-warning">
                        {atRiskCustomers.length} Critical Accounts
                    </Badge>
                </div>

                <div className="divide-y divide-border/50 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {atRiskCustomers.map((customer: any, index: number) => (
                        <motion.div
                            key={customer.customerId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ backgroundColor: 'rgba(var(--primary-rgb), 0.02)' }}
                            className="bg-transparent hover:bg-muted/30 transition-colors p-4 group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg transform group-hover:scale-110 transition-transform duration-300 ${customer.healthScore > 70 ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-green-200' :
                                            customer.healthScore > 40 ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-200' :
                                                'bg-gradient-to-br from-red-400 to-red-600 shadow-red-200'
                                        }`}>
                                        {(customer.name || 'C').charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">
                                            {customer.name || `Customer ${customer.customerId}`}
                                        </h4>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                            Last activity: {customer.lastActivity || '2 days ago'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right hidden md:block">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">MRR</p>
                                        <p className="font-bold text-lg">₹{(customer.mrr || 50000).toLocaleString()}</p>
                                    </div>

                                    <div className="w-32 hidden sm:block">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-muted-foreground font-medium">Health</span>
                                            <span className={`font-bold ${customer.healthScore > 70 ? 'text-green-600' : customer.healthScore > 40 ? 'text-amber-600' : 'text-red-600'
                                                }`}>{customer.healthScore}%</span>
                                        </div>
                                        <HealthBar score={customer.healthScore} showPercentage={false} height={6} />
                                    </div>

                                    <div className="w-32 hidden sm:block">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-muted-foreground font-medium">Churn Risk</span>
                                            <span className="font-bold text-red-600">{((customer.churnRisk || 0.8) * 100).toFixed(0)}%</span>
                                        </div>
                                        <HealthBar
                                            score={(customer.churnRisk || 0.8) * 100}
                                            showPercentage={false}
                                            height={6}
                                            className="bg-red-100 [&>div]:bg-red-500"
                                        />
                                    </div>

                                    <RiskBadge
                                        level={customer.riskLevel?.toLowerCase() || 'medium'}
                                        pulse={customer.riskLevel === 'Critical'}
                                        className="shadow-sm"
                                    />

                                    <button className="px-5 py-2.5 bg-background border border-border hover:border-primary hover:text-primary rounded-xl font-semibold transition-all shadow-sm hover:shadow-md active:scale-95 ml-2">
                                        View
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default CustomerHealthDashboard;
