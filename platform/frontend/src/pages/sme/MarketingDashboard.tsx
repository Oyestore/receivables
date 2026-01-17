import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Megaphone,
    Plus,
    TrendingUp,
    Users,
    Eye,
    MousePointerClick,
    DollarSign,
    Calendar,
} from 'lucide-react';
import {
    DashboardHeader,
    StatCard,
    GradientCard,
    StatusBadge,
    Button,
} from '../../design-system';
import './MarketingDashboard.css';

interface Campaign {
    id: string;
    name: string;
    type: 'email' | 'sms' | 'social' | 'whatsapp';
    status: 'active' | 'scheduled' | 'completed' | 'draft';
    reach: number;
    clicks: number;
    conversions: number;
    budget: number;
    roi: number;
}

const campaignTypes = {
    email: { icon: '📧', label: 'Email', color: '#3b82f6' },
    sms: { icon: '📱', label: 'SMS', color: '#10b981' },
    social: { icon: '📱', label: 'Social', color: '#ec4899' },
    whatsapp: { icon: '💬', label: 'WhatsApp', color: '#059669' },
};

export const MarketingDashboard: React.FC = () => {
    const [campaigns] = useState<Campaign[]>([
        {
            id: '1',
            name: 'Q1 Payment Reminder Campaign',
            type: 'email',
            status: 'active',
            reach: 5420,
            clicks: 856,
            conversions: 124,
            budget: 2500,
            roi: 350,
        },
        {
            id: '2',
            name: 'New Year Offer - WhatsApp Blast',
            type: 'whatsapp',
            status: 'completed',
            reach: 3200,
            clicks: 1280,
            conversions: 200,
            budget: 1500,
            roi: 580,
        },
        {
            id: '3',
            name: 'Invoice Reminder - SMS',
            type: 'sms',
            status: 'scheduled',
            reach: 2800,
            clicks: 0,
            conversions: 0,
            budget: 800,
            roi: 0,
        },
    ]);

    const stats = {
        totalReach: campaigns.reduce((sum, c) => sum + c.reach, 0),
        totalClicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
        totalConversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
        avgROI: (campaigns.reduce((sum, c) => sum + c.roi, 0) / campaigns.filter(c => c.roi > 0).length).toFixed(0),
    };

    return (
        <div className="marketing-dashboard">
            <DashboardHeader
                title="Marketing Campaigns"
                subtitle="Create and manage marketing campaigns"
                icon={Megaphone}
                actions={
                    <Button variant="primary" icon={Plus} theme="marketing" size="md">
                        New Campaign
                    </Button>
                }
            />

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    value={`${(stats.totalReach / 1000).toFixed(1)}k`}
                    label="Total Reach"
                    icon={Users}
                    theme="marketing"
                    trend={{ value: 22.5, direction: 'up' }}
                />
                <StatCard
                    value={`${(stats.totalClicks / 1000).toFixed(1)}k`}
                    label="Total Clicks"
                    icon={MousePointerClick}
                    theme="marketing"
                />
                <StatCard
                    value={stats.totalConversions}
                    label="Conversions"
                    icon={TrendingUp}
                    theme="marketing"
                />
                <StatCard
                    value={`${stats.avgROI}%`}
                    label="Avg ROI"
                    icon={DollarSign}
                    theme="marketing"
                />
            </div>

            {/* Campaigns List */}
            <GradientCard theme="marketing" glass className="campaigns-container">
                <h3 className="section-title">Active Campaigns</h3>

                <div className="campaigns-list">
                    {campaigns.map((campaign, index) => (
                        <motion.div
                            key={campaign.id}
                            className="campaign-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="campaign-header">
                                <div className="campaign-type-badge" style={{ background: campaignTypes[campaign.type].color }}>
                                    <span className="type-icon">{campaignTypes[campaign.type].icon}</span>
                                    <span className="type-label">{campaignTypes[campaign.type].label}</span>
                                </div>
                                <StatusBadge
                                    status={
                                        campaign.status === 'active' ? 'active' :
                                            campaign.status === 'completed' ? 'success' :
                                                campaign.status === 'scheduled' ? 'pending' : 'info'
                                    }
                                    label={campaign.status}
                                    size="sm"
                                />
                            </div>

                            <h4 className="campaign-name">{campaign.name}</h4>

                            <div className="campaign-metrics">
                                <div className="metric-item">
                                    <Eye className="metric-icon" />
                                    <div>
                                        <div className="metric-value">{campaign.reach.toLocaleString()}</div>
                                        <div className="metric-label">Reach</div>
                                    </div>
                                </div>
                                <div className="metric-item">
                                    <MousePointerClick className="metric-icon" />
                                    <div>
                                        <div className="metric-value">{campaign.clicks.toLocaleString()}</div>
                                        <div className="metric-label">Clicks</div>
                                    </div>
                                </div>
                                <div className="metric-item">
                                    <TrendingUp className="metric-icon" />
                                    <div>
                                        <div className="metric-value">{campaign.conversions}</div>
                                        <div className="metric-label">Conversions</div>
                                    </div>
                                </div>
                            </div>

                            <div className="campaign-footer">
                                <div className="budget-info">
                                    <DollarSign className="budget-icon" />
                                    <span>Budget:${campaign.budget}</span>
                                </div>
                                {campaign.roi > 0 && (
                                    <div className="roi-badge">
                                        ROI: +{campaign.roi}%
                                    </div>
                                )}
                                <Button variant="ghost" size="sm">
                                    View Details
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </GradientCard>

            {/* Performance Overview */}
            <GradientCard theme="marketing" glass className="performance-card">
                <h3 className="section-title">Campaign Performance</h3>
                <div className="performance-grid">
                    {campaigns.map((campaign, i) => {
                        const clickRate = campaign.reach > 0 ? ((campaign.clicks / campaign.reach) * 100).toFixed(1) : '0';
                        const conversionRate = campaign.clicks > 0 ? ((campaign.conversions / campaign.clicks) * 100).toFixed(1) : '0';

                        return (
                            <motion.div
                                key={campaign.id}
                                className="performance-item"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <div className="perf-header">
                                    <span className="perf-name">{campaign.name}</span>
                                    <span className="perf-type" style={{ color: campaignTypes[campaign.type].color }}>
                                        {campaignTypes[campaign.type].label}
                                    </span>
                                </div>
                                <div className="perf-stats">
                                    <div className="perf-stat">
                                        <span className="stat-label">Click Rate</span>
                                        <span className="stat-value">{clickRate}%</span>
                                    </div>
                                    <div className="perf-stat">
                                        <span className="stat-label">Conversion Rate</span>
                                        <span className="stat-value">{conversionRate}%</span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </GradientCard>
        </div>
    );
};
