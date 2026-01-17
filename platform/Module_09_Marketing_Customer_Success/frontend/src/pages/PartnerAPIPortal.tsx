import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, DollarSign, Award, Key } from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

/**
 * Partner & API Portal
 * 
 * Combined partner management and API marketplace
 */

const PartnerAPIPortal: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'partners' | 'integrations'>('partners');

    const partnerStats = {
        totalPartners: 24,
        activeRevenue: 145000,
        tier: 'Gold',
        commission: 32500,
    };

    const integrations = [
        { id: '1', name: 'WhatsApp Business API', status: 'Active', usage: 12453, category: 'Communication' },
        { id: '2', name: 'Payment Gateway SDK', status: 'Active', usage: 8721, category: 'Payments' },
        { id: '3', name: 'SMS Provider API', status: 'Inactive', usage: 0, category: 'Communication' },
    ];

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-gradient">Partner & API Portal</h1>
                <p className="text-muted-foreground mt-1">Manage partnerships and integrations</p>
            </motion.div>

            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('partners')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'partners'
                            ? 'bg-gradient-primary text-white shadow-glow'
                            : 'bg-card border border-border'
                        }`}
                >
                    Partner Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('integrations')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'integrations'
                            ? 'bg-gradient-primary text-white shadow-glow'
                            : 'bg-card border border-border'
                        }`}
                >
                    API Marketplace
                </button>
            </div>

            {activeTab === 'partners' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <MetricCard
                            title="Active Partners"
                            value={partnerStats.totalPartners}
                            icon={<Users size={24} />}
                            gradient="primary"
                        />
                        <MetricCard
                            title="Revenue Generated"
                            value={formatCurrency(partnerStats.activeRevenue)}
                            icon={<DollarSign size={24} />}
                            gradient="success"
                        />
                        <MetricCard
                            title="Partner Tier"
                            value={partnerStats.tier}
                            icon={<Award size={24} />}
                            gradient="warning"
                        />
                        <MetricCard
                            title="Commission Earned"
                            value={formatCurrency(partnerStats.commission)}
                            icon={<DollarSign size={24} />}
                            gradient="success"
                        />
                    </div>

                    <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-200">
                        <div className="text-center py-8">
                            <div className="text-6xl mb-4">🤝</div>
                            <h2 className="text-2xl font-bold mb-2">Grow Your Partner Network</h2>
                            <p className="text-muted-foreground mb-6">Invite partners and earn 15% commission on all revenue</p>
                            <button className="px-8 py-3 bg-gradient-primary text-white rounded-lg font-semibold shadow-lg">
                                Invite Partner
                            </button>
                        </div>
                    </Card>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MetricCard
                            title="Active Integrations"
                            value={integrations.filter((i) => i.status === 'Active').length}
                            icon={<Key size={24} />}
                            gradient="primary"
                        />
                        <MetricCard
                            title="API Calls (Month)"
                            value="21.2K"
                            icon={<Key size={24} />}
                            gradient="success"
                        />
                        <MetricCard
                            title="Available APIs"
                            value={integrations.length}
                            icon={<Key size={24} />}
                            gradient="warning"
                        />
                    </div>

                    <Card>
                        <h3 className="text-lg font-semibold mb-4">Your Integrations</h3>
                        <div className="space-y-3">
                            {integrations.map((integration) => (
                                <div key={integration.id} className="p-4 bg-muted/30 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center text-white">
                                            <Key size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{integration.name}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="default" size="sm">{integration.category}</Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    {integration.usage.toLocaleString()} calls
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {integration.status === 'Active' ? (
                                            <Badge variant="success">Active</Badge>
                                        ) : (
                                            <Badge variant="default">Inactive</Badge>
                                        )}
                                        <button className="px-4 py-2 bg-muted hover:bg-muted/70 rounded-lg text-sm font-medium transition-colors">
                                            Manage
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default PartnerAPIPortal;
