import React from 'react';
import { motion } from 'framer-motion';
import { Gift, Users, TrendingUp, Award, Share2 } from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

/**
 * Referral Dashboard
 * 
 * Gamified referral program with earnings, leaderboard, and social sharing
 */

const ReferralDashboard: React.FC = () => {
    const stats = {
        totalEarnings: 12500,
        pendingEarnings: 3500,
        referralsSent: 28,
        conversions: 9,
        tier: 'Gold',
    };

    const leaderboard = [
        { rank: 1, name: 'Sarah Chen', earnings: 45000, referrals: 65, tier: 'Platinum' },
        { rank: 2, name: 'Mike Johnson', earnings: 32000, referrals: 48, tier: 'Gold' },
        { rank: 3, name: 'You', earnings: 12500, referrals: 28, tier: 'Gold' },
    ];

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-gradient">Referral Dashboard</h1>
                <p className="text-muted-foreground mt-1">Earn rewards by referring new customers</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Earnings"
                    value={formatCurrency(stats.totalEarnings)}
                    icon={<Gift size={24} />}
                    gradient="success"
                />
                <MetricCard
                    title="Pending"
                    value={formatCurrency(stats.pendingEarnings)}
                    icon={<TrendingUp size={24} />}
                    gradient="warning"
                />
                <MetricCard
                    title="Referrals"
                    value={`${stats.conversions}/${stats.referralsSent}`}
                    icon={<Users size={24} />}
                    gradient="primary"
                />
                <MetricCard
                    title="Tier"
                    value={stats.tier}
                    icon={<Award size={24} />}
                    gradient="warning"
                />
            </div>

            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200">
                <div className="text-center py-8">
                    <div className="text-6xl mb-4">🎁</div>
                    <h2 className="text-2xl font-bold mb-2">Invite Friends, Earn Rewards!</h2>
                    <p className="text-muted-foreground mb-6">Share your unique referral link and earn ₹5,000 per conversion</p>
                    <div className="flex justify-center gap-3">
                        <button className="px-6 py-3 bg-gradient-primary text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                            <Share2 size={20} />
                            Share Link
                        </button>
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="text-lg font-semibold mb-4">Leaderboard</h3>
                <div className="space-y-3">
                    {leaderboard.map((user) => (
                        <div
                            key={user.rank}
                            className={`p-4 rounded-lg ${user.name === 'You'
                                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-300'
                                    : 'bg-muted/30'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-primary text-white flex items-center justify-center font-bold text-lg">
                                    #{user.rank}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold">{user.name}</h4>
                                    <p className="text-sm text-muted-foreground">{user.referrals} referrals</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(user.earnings)}</p>
                                    <Badge variant="warning" size="sm">{user.tier}</Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default ReferralDashboard;
