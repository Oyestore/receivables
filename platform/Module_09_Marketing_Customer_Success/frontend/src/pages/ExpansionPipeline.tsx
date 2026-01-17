import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Calendar, User, MoreVertical } from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

/**
 * Expansion Pipeline
 * 
 * Kanban board for upsell/cross-sell opportunity management
 */

type Stage = 'discovery' | 'qualified' | 'proposal' | 'negotiation' | 'won';

interface Opportunity {
    id: string;
    customer: string;
    title: string;
    value: number;
    probability: number;
    stage: Stage;
    owner: string;
    daysInStage: number;
    nextAction: string;
}

const ExpansionPipeline: React.FC = () => {
    const [opportunities] = useState<Opportunity[]>([
        {
            id: '1',
            customer: 'Acme Corp',
            title: 'Enterprise Plan Upgrade',
            value: 50000,
            probability: 0.8,
            stage: 'negotiation',
            owner: 'Sarah Chen',
            daysInStage: 5,
            nextAction: 'Send final proposal',
        },
        {
            id: '2',
            customer: 'TechStart Inc',
            title: 'Add Credit Module',
            value: 25000,
            probability: 0.65,
            stage: 'proposal',
            owner: 'Mike Johnson',
            daysInStage: 12,
            nextAction: 'Schedule demo call',
        },
        {
            id: '3',
            customer: 'Global Solutions',
            title: 'Analytics Package',
            value: 18000,
            probability: 0.5,
            stage: 'qualified',
            owner: 'Emma Davis',
            daysInStage: 8,
            nextAction: 'Requirements gathering',
        },
    ]);

    const stages: { id: Stage; title: string; color: string }[] = [
        { id: 'discovery', title: 'Discovery', color: 'bg-gray-200 dark:bg-gray-700' },
        { id: 'qualified', title: 'Qualified', color: 'bg-blue-200 dark:bg-blue-900' },
        { id: 'proposal', title: 'Proposal', color: 'bg-purple-200 dark:bg-purple-900' },
        { id: 'negotiation', title: 'Negotiation', color: 'bg-amber-200 dark:bg-amber-900' },
        { id: 'won', title: 'Won', color: 'bg-green-200 dark:bg-green-900' },
    ];

    const getStageOpportunities = (stage: Stage) =>
        opportunities.filter((o) => o.stage === stage);

    const totalValue = opportunities.reduce((sum, o) => sum + o.value, 0);
    const weightedValue = opportunities.reduce((sum, o) => sum + o.value * o.probability, 0);

    return (
        <div className="min-h-screen bg-background p-6 space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold text-gradient">Expansion Pipeline</h1>
                <p className="text-muted-foreground mt-1">Track upsell and cross-sell opportunities</p>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Total Pipeline"
                    value={formatCurrency(totalValue)}
                    icon={<DollarSign size={24} />}
                    gradient="primary"
                />
                <MetricCard
                    title="Weighted Forecast"
                    value={formatCurrency(weightedValue)}
                    icon={<TrendingUp size={24} />}
                    gradient="success"
                />
                <MetricCard
                    title="Opportunities"
                    value={opportunities.length}
                    icon={<User size={24} />}
                    gradient="warning"
                />
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-5 gap-4">
                {stages.map((stage) => {
                    const stageOpps = getStageOpportunities(stage.id);
                    const stageValue = stageOpps.reduce((sum, o) => sum + o.value, 0);

                    return (
                        <div key={stage.id} className="space-y-3">
                            <div className={`p-3 rounded-lg ${stage.color}`}>
                                <h3 className="font-semibold">{stage.title}</h3>
                                <div className="flex justify-between mt-1 text-sm">
                                    <span>{stageOpps.length} opps</span>
                                    <span className="font-bold">{formatCurrency(stageValue)}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {stageOpps.map((opp, index) => (
                                    <motion.div
                                        key={opp.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card className="p-4 hover:shadow-lg transition-shadow cursor-move">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-semibold text-sm">{opp.customer}</h4>
                                                <button className="p-1 hover:bg-muted rounded">
                                                    <MoreVertical size={14} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-3">{opp.title}</p>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Value</span>
                                                    <span className="font-bold text-green-600">{formatCurrency(opp.value)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Probability</span>
                                                    <span className="font-medium">{(opp.probability * 100).toFixed(0)}%</span>
                                                </div>
                                                <div className="pt-2 border-t border-border">
                                                    <p className="text-xs text-muted-foreground">Next: {opp.nextAction}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {opp.daysInStage} days in stage
                                                    </p>
                                                </div>
                                                <Badge variant="default" size="sm">
                                                    <User size={12} className="mr-1" />
                                                    {opp.owner}
                                                </Badge>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExpansionPipeline;
