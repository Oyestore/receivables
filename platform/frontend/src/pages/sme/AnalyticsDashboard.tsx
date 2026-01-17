import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    Users,
    FileText,
    Calendar,
    Download,
    RefreshCw,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import {
    DashboardHeader,
    StatCard,
    GradientCard,
    Button,
} from '../../design-system';
import './AnalyticsDashboard.css';

interface ChartData {
    month: string;
    revenue: number;
    invoices: number;
}

interface KPI {
    label: string;
    value: string | number;
    change: number;
    trend: 'up' | 'down';
}

export const AnalyticsDashboard: React.FC = () => {
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

    const chartData: ChartData[] = [
        { month: 'Jan', revenue: 45000, invoices: 128 },
        { month: 'Feb', revenue: 52000, invoices: 142 },
        { month: 'Mar', revenue: 48000, invoices: 135 },
        { month: 'Apr', revenue: 61000, invoices: 156 },
        { month: 'May', revenue: 55000, invoices: 148 },
        { month: 'Jun', revenue: 67000, invoices: 172 },
    ];

    const kpis: KPI[] = [
        { label: 'Avg. Invoice Value', value: '$1,245', change: 8.2, trend: 'up' },
        { label: 'Collection Time', value: '12 days', change: -15.3, trend: 'up' },
        { label: 'Payment Success Rate', value: '94.5%', change: 2.1, trend: 'up' },
        { label: 'Customer Growth', value: '+18%', change: 5.7, trend: 'up' },
    ];

    const stats = {
        totalRevenue: chartData.reduce((sum, d) => sum + d.revenue, 0),
        totalInvoices: chartData.reduce((sum, d) => sum + d.invoices, 0),
        avgRevenue: Math.round(chartData.reduce((sum, d) => sum + d.revenue, 0) / chartData.length),
        growth: 23.5,
    };

    const maxRevenue = Math.max(...chartData.map(d => d.revenue));

    return (
        <div className="analytics-dashboard">
            <DashboardHeader
                title="Analytics & Reporting"
                subtitle="Insights and performance metrics"
                icon={BarChart3}
                actions={
                    <>
                        <div className="time-range-selector">
                            {(['week', 'month', 'year'] as const).map((range) => (
                                <button
                                    key={range}
                                    className={`range-btn ${timeRange === range ? 'active' : ''}`}
                                    onClick={() => setTimeRange(range)}
                                >
                                    {range.charAt(0).toUpperCase() + range.slice(1)}
                                </button>
                            ))}
                        </div>
                        <Button variant="outline" icon={RefreshCw} size="md">
                            Refresh
                        </Button>
                        <Button variant="primary" icon={Download} theme="analytics" size="md">
                            Export Report
                        </Button>
                    </>
                }
            />

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    value={`$${(stats.totalRevenue / 1000).toFixed(0)}k`}
                    label="Total Revenue"
                    icon={DollarSign}
                    theme="analytics"
                    trend={{ value: stats.growth, direction: 'up' }}
                />
                <StatCard
                    value={stats.totalInvoices}
                    label="Total Invoices"
                    icon={FileText}
                    theme="analytics"
                />
                <StatCard
                    value={`$${(stats.avgRevenue / 1000).toFixed(1)}k`}
                    label="Avg Revenue"
                    icon={TrendingUp}
                    theme="analytics"
                />
                <StatCard
                    value="248"
                    label="Active Customers"
                    icon={Users}
                    theme="analytics"
                />
            </div>

            {/* Charts Row */}
            <div className="charts-row">
                {/* Revenue Chart */}
                <GradientCard theme="analytics" glass className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title">
                            <TrendingUp className="chart-icon" />
                            Revenue Trend
                        </h3>
                        <span className="chart-period">Last 6 Months</span>
                    </div>

                    <div className="bar-chart">
                        {chartData.map((data, index) => (
                            <motion.div
                                key={data.month}
                                className="bar-group"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="bar-container">
                                    <motion.div
                                        className="bar"
                                        style={{
                                            height: `${(data.revenue / maxRevenue) * 200}px`,
                                            background: 'linear-gradient(180deg, #8b5cf6, #7c3aed)',
                                        }}
                                        initial={{ height: 0 }}
                                        animate={{ height: `${(data.revenue / maxRevenue) * 200}px` }}
                                        transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                                    >
                                        <span className="bar-value">${(data.revenue / 1000).toFixed(0)}k</span>
                                    </motion.div>
                                </div>
                                <span className="bar-label">{data.month}</span>
                            </motion.div>
                        ))}
                    </div>
                </GradientCard>

                {/* KPIs Card */}
                <GradientCard theme="analytics" glass className="kpi-card">
                    <div className="chart-header">
                        <h3 className="chart-title">
                            <Calendar className="chart-icon" />
                            Key Performance Indicators
                        </h3>
                    </div>

                    <div className="kpi-list">
                        {kpis.map((kpi, index) => (
                            <motion.div
                                key={kpi.label}
                                className="kpi-item"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <div className="kpi-info">
                                    <span className="kpi-label">{kpi.label}</span>
                                    <span className="kpi-value">{kpi.value}</span>
                                </div>
                                <div className={`kpi-change ${kpi.trend}`}>
                                    {kpi.trend === 'up' ? (
                                        <ArrowUp className="change-icon" />
                                    ) : (
                                        <ArrowDown className="change-icon" />
                                    )}
                                    <span>{Math.abs(kpi.change)}%</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </GradientCard>
            </div>

            {/* Invoice Distribution */}
            <GradientCard theme="analytics" glass className="distribution-card">
                <div className="chart-header">
                    <h3 className="chart-title">
                        <BarChart3 className="chart-icon" />
                        Invoice Distribution by Status
                    </h3>
                </div>

                <div className="distribution-grid">
                    {[
                        { status: 'Paid', count: 156, color: '#10b981', percentage: 62 },
                        { status: 'Pending', count: 48, color: '#f59e0b', percentage: 19 },
                        { status: 'Overdue', count: 28, color: '#ef4444', percentage: 11 },
                        { status: 'Draft', count: 20, color: '#64748b', percentage: 8 },
                    ].map((item, index) => (
                        <motion.div
                            key={item.status}
                            className="distribution-item"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="distribution-bar">
                                <motion.div
                                    className="distribution-fill"
                                    style={{ background: item.color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.percentage}%` }}
                                    transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                                />
                            </div>
                            <div className="distribution-details">
                                <span className="distribution-status" style={{ color: item.color }}>
                                    {item.status}
                                </span>
                                <div className="distribution-stats">
                                    <span className="distribution-count">{item.count}</span>
                                    <span className="distribution-percentage">{item.percentage}%</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </GradientCard>
        </div>
    );
};
