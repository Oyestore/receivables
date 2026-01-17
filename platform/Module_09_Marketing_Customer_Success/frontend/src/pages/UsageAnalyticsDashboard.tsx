import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Activity,
    Users,
    Zap,
    Award,
    Target,
    BarChart3,
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

/**
 * Usage Analytics Dashboard
 * 
 * Track feature adoption, engagement, and identify power users
 */

const UsageAnalyticsDashboard: React.FC = () => {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    // Mock data
    const featureAdoption = [
        { feature: 'Invoicing', adoption: 95, users: 427 },
        { feature: 'Payments', adoption: 88, users: 396 },
        { feature: 'Disputes', adoption: 67, users: 302 },
        { feature: 'Analytics', adoption: 54, users: 243 },
        { feature: 'Financing', adoption: 42, users: 189 },
        { feature: 'Credit Scoring', adoption: 38, users: 171 },
    ];

    const engagementTrend = [
        { week: 'Week 1', score: 65, active: 380 },
        { week: 'Week 2', score: 68, active: 395 },
        { week: 'Week 3', score: 71, active: 410 },
        { week: 'Week 4', score: 74, active: 425 },
    ];

    const powerUsers = [
        { name: 'Sarah Chen', company: 'TechCorp', score: 98, features: 12 },
        { name: 'Mike Johnson', company: 'Global Inc', score: 96, features: 11 },
        { name: 'Emma Davis', company: 'StartupXYZ', score: 94, features: 11 },
        { name: 'James Wilson', company: 'Enterprise Co', score: 92, features: 10 },
        { name: 'Lisa Anderson', company: 'Growth Ltd', score: 89, features: 10 },
    ];

    const stats = {
        avgEngagement: 74,
        activeUsers: 425,
        featuresCovered: 8.4,
        powerUsers: powerUsers.length,
    };

    const getColor = (value: number) => {
        if (value >= 80) return '#22c55e';
        if (value >= 60) return '#3b82f6';
        if (value >= 40) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-3xl font-bold text-gradient">
                        Usage Analytics Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Feature adoption and engagement tracking
                    </p>
                </div>
                <div className="flex gap-2">
                    {(['7d', '30d', '90d'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${timeRange === range
                                    ? 'bg-primary text-white shadow-glow'
                                    : 'bg-card border border-border hover:border-primary'
                                }`}
                        >
                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="Avg Engagement Score"
                    value={stats.avgEngagement}
                    change={{ value: 6.8, label: 'vs last period' }}
                    icon={<Activity size={24} />}
                    gradient="primary"
                />
                <MetricCard
                    title="Active Users"
                    value={stats.activeUsers}
                    change={{ value: 11.8, label: 'growth' }}
                    icon={<Users size={24} />}
                    gradient="success"
                />
                <MetricCard
                    title="Features per User"
                    value={stats.featuresCovered.toFixed(1)}
                    change={{ value: 8.5, label: 'increase' }}
                    icon={<Zap size={24} />}
                    gradient="warning"
                />
                <MetricCard
                    title="Power Users"
                    value={stats.powerUsers}
                    icon={<Award size={24} />}
                    gradient="success"
                />
            </div>

            {/* Feature Adoption Heatmap */}
            <Card>
                <h3 className="text-lg font-semibold mb-4">Feature Adoption</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={featureAdoption}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="feature" />
                        <YAxis />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                            }}
                        />
                        <Bar dataKey="adoption">
                            {featureAdoption.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColor(entry.adoption)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-3 gap-4">
                    {featureAdoption.map((feature) => (
                        <div key={feature.feature} className="p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm font-medium">{feature.feature}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full"
                                        style={{
                                            width: `${feature.adoption}%`,
                                            backgroundColor: getColor(feature.adoption),
                                        }}
                                    />
                                </div>
                                <span className="text-sm font-bold">{feature.adoption}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Engagement Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-semibold mb-4">Engagement Score Trend</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={engagementTrend}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="week" />
                            <YAxis />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                dot={{ fill: '#8b5cf6', r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                <Card>
                    <h3 className="text-lg font-semibold mb-4">Active Users Trend</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={engagementTrend}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                            <XAxis dataKey="week" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="active" fill="#22c55e" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            {/* Power Users Leaderboard */}
            <Card>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold">Power Users</h3>
                        <p className="text-sm text-muted-foreground">
                            Top users by engagement score
                        </p>
                    </div>
                    <Badge variant="success" size="lg">
                        <Award size={16} className="mr-1" />
                        Top Performers
                    </Badge>
                </div>

                <div className="space-y-3">
                    {powerUsers.map((user, index) => (
                        <motion.div
                            key={user.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800"
                        >
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white font-bold text-lg">
                                #{index + 1}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold">{user.name}</h4>
                                <p className="text-sm text-muted-foreground">{user.company}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {user.score}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {user.features} features
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default UsageAnalyticsDashboard;
