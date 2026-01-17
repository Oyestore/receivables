import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Smile, Meh, Frown, TrendingUp, MessageSquare, Send } from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { HealthGauge } from '../components/ui/HealthGauge';

/**
 * Feedback Center
 * 
 * NPS/CSAT management and sentiment analysis
 */

const FeedbackCenter: React.FC = () => {
    const [filter, setFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');

    const npsData = {
        score: 42,
        promoters: 156,
        passives: 189,
        detractors: 105,
        total: 450,
        trend: 0.08,
    };

    const feedback = [
        {
            id: '1',
            customer: 'Acme Corp',
            type: 'NPS',
            score: 9,
            sentiment: 'positive' as const,
            comment: 'Excellent platform! The invoice automation saved us hours each week.',
            date: new Date(Date.now() - 2 * 24 * 3600000),
            replied: false,
        },
        {
            id: '2',
            customer: 'TechStart Inc',
            type: 'CSAT',
            score: 4,
            sentiment: 'positive' as const,
            comment: 'Great customer support team. Very responsive and helpful.',
            date: new Date(Date.now() - 5 * 24 * 3600000),
            replied: true,
        },
        {
            id: '3',
            customer: 'Global Solutions',
            type: 'NPS',
            score: 3,
            sentiment: 'negative' as const,
            comment: 'Platform lacks some key features we need. Waiting for updates.',
            date: new Date(Date.now() - 1 * 24 * 3600000),
            replied: false,
        },
    ];

    const filteredFeedback = feedback.filter((f) => {
        if (filter === 'all') return true;
        return f.sentiment === filter;
    });

    const getSentimentIcon = (sentiment: string) => {
        if (sentiment === 'positive') return <Smile className="text-green-500" size={20} />;
        if (sentiment === 'neutral') return <Meh className="text-amber-500" size={20} />;
        return <Frown className="text-red-500" size={20} />;
    };

    const getSentimentColor = (sentiment: string) => {
        if (sentiment === 'positive') return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
        if (sentiment === 'neutral') return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800';
        return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
    };

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-3xl font-bold text-gradient">Feedback Center</h1>
                    <p className="text-muted-foreground mt-1">
                        NPS, CSAT, and customer sentiment analysis
                    </p>
                </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="NPS Score"
                    value={npsData.score}
                    change={{ value: npsData.trend * 100, label: 'vs last month' }}
                    icon={<TrendingUp size={24} />}
                    gradient="primary"
                />
                <MetricCard
                    title="Promoters"
                    value={npsData.promoters}
                    icon={<Smile size={24} />}
                    gradient="success"
                />
                <MetricCard
                    title="Passives"
                    value={npsData.passives}
                    icon={<Meh size={24} />}
                    gradient="warning"
                />
                <MetricCard
                    title="Detractors"
                    value={npsData.detractors}
                    icon={<Frown size={24} />}
                    gradient="danger"
                />
            </div>

            {/* NPS Gauge */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="flex flex-col items-center justify-center py-8">
                    <HealthGauge score={npsData.score + 50} size="lg" showLabel={false} />
                    <div className="mt-4 text-center">
                        <p className="text-sm text-muted-foreground">Net Promoter Score</p>
                        <p className="text-3xl font-bold text-gradient mt-1">{npsData.score}</p>
                    </div>
                </Card>

                <Card className="lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4">Distribution</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-green-600">Promoters (9-10)</span>
                                <span className="text-sm font-bold">{npsData.promoters} ({((npsData.promoters / npsData.total) * 100).toFixed(0)}%)</span>
                            </div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500"
                                    style={{ width: `${(npsData.promoters / npsData.total) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-amber-600">Passives (7-8)</span>
                                <span className="text-sm font-bold">{npsData.passives} ({((npsData.passives / npsData.total) * 100).toFixed(0)}%)</span>
                            </div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-500"
                                    style={{ width: `${(npsData.passives / npsData.total) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-red-600">Detractors (0-6)</span>
                                <span className="text-sm font-bold">{npsData.detractors} ({((npsData.detractors / npsData.total) * 100).toFixed(0)}%)</span>
                            </div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500"
                                    style={{ width: `${(npsData.detractors / npsData.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Feedback Inbox */}
            <Card>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold">Feedback Inbox</h3>
                        <p className="text-sm text-muted-foreground">{filteredFeedback.length} feedback items</p>
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'positive', 'neutral', 'negative'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === f
                                        ? 'bg-primary text-white'
                                        : 'bg-muted hover:bg-muted/70'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    {filteredFeedback.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-4 rounded-lg border ${getSentimentColor(item.sentiment)}`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {getSentimentIcon(item.sentiment)}
                                    <div>
                                        <h4 className="font-semibold">{item.customer}</h4>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Badge variant="default" size="sm">{item.type}</Badge>
                                            <span>Score: {item.score}/10</span>
                                            <span>{new Date(item.date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                {item.replied ? (
                                    <Badge variant="success" size="sm">Replied</Badge>
                                ) : (
                                    <Badge variant="warning" size="sm">Pending</Badge>
                                )}
                            </div>
                            <p className="text-sm mb-3">{item.comment}</p>
                            {!item.replied && (
                                <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
                                    <Send size={14} />
                                    Reply
                                </button>
                            )}
                        </motion.div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default FeedbackCenter;
