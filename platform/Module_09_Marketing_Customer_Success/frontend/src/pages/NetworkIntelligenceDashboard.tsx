import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Award, Users, Target } from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Network Intelligence Dashboard
 * 
 * Industry benchmarks and actionable insights powered by crowd-sourced data
 */

const NetworkIntelligenceDashboard: React.FC = () => {
    const benchmarks = [
        { metric: 'Avg Payment Time', you: 28, industry: 35, unit: 'days' },
        { metric: 'Collection Rate', you: 94, industry: 87, unit: '%' },
        { metric: 'Dispute Rate', you: 3.2, industry: 5.8, unit: '%' },
        { metric: 'Invoice Accuracy', you: 97, industry: 91, unit: '%' },
    ];

    const insights = [
        { id: '1', type: 'success', title: 'Excellent payment speed', description: 'Your 28-day average is 20% faster than industry' },
        { id: '2', type: 'warning', title: 'Opportunity in automation', description: '40% of peers use AI invoice processing' },
        { id: '3', type: 'info', title: 'Benchmark leader', description: 'Top 15% in collection rate performance' },
    ];

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-gradient">Network Intelligence</h1>
                <p className="text-muted-foreground mt-1">Industry benchmarks and AI-powered insights</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard title="Your Score" value={87} icon={<Award size={24} />} gradient="success" />
                <MetricCard title="Industry Avg" value={72} icon={<Users size={24} />} gradient="primary" />
                <MetricCard title="Percentile" value="85th" icon={<TrendingUp size={24} />} gradient="warning" />
                <MetricCard title="Insights" value={insights.length} icon={<Target size={24} />} gradient="success" />
            </div>

            <Card>
                <h3 className="text-lg font-semibold mb-4">Performance vs Industry</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={benchmarks}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="metric" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="you" fill="#22c55e" name="You" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="industry" fill="#8b5cf6" name="Industry Avg" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold mb-4">AI-Powered Insights</h3>
                <div className="space-y-3">
                    {insights.map((insight) => (
                        <div key={insight.id} className="p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-green-500 text-white">✓</div>
                                <div className="flex-1">
                                    <h4 className="font-semibold">{insight.title}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default NetworkIntelligenceDashboard;
