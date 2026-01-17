import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play,
    Pause,
    Plus,
    Settings,
    Zap,
    Mail,
    Phone,
    MessageSquare,
    Calendar,
    DollarSign,
    CheckCircle2,
    Clock,
    TrendingUp,
    Users,
    Database,
    GitBranch,
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { Badge, StatusBadge } from '../components/ui/Badge';

/**
 * Automated Playbook Builder
 * 
 * Visual workflow designer for customer success automation
 */

type TriggerType =
    | 'health_score_drop'
    | 'no_activity'
    | 'payment_failed'
    | 'nps_detractor'
    | 'usage_decline'
    | 'milestone_reached'
    | 'contract_renewal';

type ActionType = 'email' | 'sms' | 'call_task' | 'meeting' | 'discount' | 'webhook' | 'delay';

interface PlaybookAction {
    id: string;
    type: ActionType;
    title: string;
    description: string;
    config: Record<string, any>;
}

interface Playbook {
    id: string;
    name: string;
    description: string;
    trigger: {
        type: TriggerType;
        condition: string;
    };
    actions: PlaybookAction[];
    status: 'active' | 'paused' | 'draft';
    executions: number;
    successRate: number;
    lastRun?: Date;
}

const PlaybookBuilder: React.FC = () => {
    const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
    const [showActionLibrary, setShowActionLibrary] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Mock data - in production, fetch from API
    const [playbooks] = useState<Playbook[]>([
        {
            id: '1',
            name: 'Health Score Recovery',
            description: 'Automated intervention when customer health drops below 50',
            trigger: {
                type: 'health_score_drop',
                condition: 'Health score < 50',
            },
            actions: [
                {
                    id: 'a1',
                    type: 'email',
                    title: 'Send Check-in Email',
                    description: 'Personalized email from CSM',
                    config: { template: 'health-checkin' },
                },
                {
                    id: 'a2',
                    type: 'delay',
                    title: 'Wait 2 Days',
                    description: 'Delay before next action',
                    config: { days: 2 },
                },
                {
                    id: 'a3',
                    type: 'call_task',
                    title: 'Schedule Call',
                    description: 'Create task for CSM to call',
                    config: { priority: 'high' },
                },
            ],
            status: 'active',
            executions: 47,
            successRate: 0.73,
            lastRun: new Date(Date.now() - 2 * 3600000),
        },
        {
            id: '2',
            name: 'Inactivity Re-engagement',
            description: 'Trigger when user has no login for 14 days',
            trigger: {
                type: 'no_activity',
                condition: 'No login for 14 days',
            },
            actions: [
                {
                    id: 'a1',
                    type: 'email',
                    title: 'Feature Highlight Email',
                    description: 'Showcase unused features',
                    config: { template: 'feature-showcase' },
                },
                {
                    id: 'a2',
                    type: 'meeting',
                    title: 'Offer Training Session',
                    description: 'Invite to live training',
                    config: { duration: 30 },
                },
            ],
            status: 'active',
            executions: 32,
            successRate: 0.65,
            lastRun: new Date(Date.now() - 5 * 3600000),
        },
        {
            id: '3',
            name: 'Payment Failure Recovery',
            description: 'Immediate action on payment decline',
            trigger: {
                type: 'payment_failed',
                condition: 'Payment declined',
            },
            actions: [
                {
                    id: 'a1',
                    type: 'email',
                    title: 'Payment Issue Alert',
                    description: 'Notify customer of payment issue',
                    config: { template: 'payment-failed' },
                },
                {
                    id: 'a2',
                    type: 'sms',
                    title: 'SMS Reminder',
                    description: 'Send SMS with payment link',
                    config: { template: 'payment-reminder' },
                },
                {
                    id: 'a3',
                    type: 'delay',
                    title: 'Wait 1 Day',
                    description: 'Grace period',
                    config: { days: 1 },
                },
                {
                    id: 'a4',
                    type: 'call_task',
                    title: 'Personal Outreach',
                    description: 'CSM call task',
                    config: { priority: 'critical' },
                },
            ],
            status: 'active',
            executions: 15,
            successRate: 0.87,
            lastRun: new Date(Date.now() - 1 * 3600000),
        },
    ]);

    const actionLibrary: Array<{
        type: ActionType;
        title: string;
        description: string;
        icon: React.ReactNode;
        color: string;
    }> = [
            {
                type: 'email',
                title: 'Send Email',
                description: 'Automated personalized email',
                icon: <Mail size={20} />,
                color: 'bg-blue-500',
            },
            {
                type: 'sms',
                title: 'Send SMS',
                description: 'Text message notification',
                icon: <MessageSquare size={20} />,
                color: 'bg-green-500',
            },
            {
                type: 'call_task',
                title: 'Create Call Task',
                description: 'Assign call to CSM',
                icon: <Phone size={20} />,
                color: 'bg-purple-500',
            },
            {
                type: 'meeting',
                title: 'Schedule Meeting',
                description: 'Book calendar event',
                icon: <Calendar size={20} />,
                color: 'bg-orange-500',
            },
            {
                type: 'discount',
                title: 'Apply Discount',
                description: 'Offer pricing incentive',
                icon: <DollarSign size={20} />,
                color: 'bg-red-500',
            },
            {
                type: 'webhook',
                title: 'Trigger Webhook',
                description: 'Call external API',
                icon: <Database size={20} />,
                color: 'bg-gray-500',
            },
            {
                type: 'delay',
                title: 'Add Delay',
                description: 'Wait before next action',
                icon: <Clock size={20} />,
                color: 'bg-amber-500',
            },
        ];

    const triggerTypes: Array<{
        type: TriggerType;
        title: string;
        description: string;
        icon: React.ReactNode;
    }> = [
            {
                type: 'health_score_drop',
                title: 'Health Score Drop',
                description: 'When customer health falls below threshold',
                icon: <TrendingUp size={16} />,
            },
            {
                type: 'no_activity',
                title: 'Inactivity',
                description: 'No login for specified days',
                icon: <Clock size={16} />,
            },
            {
                type: 'payment_failed',
                title: 'Payment Failed',
                description: 'Payment declined or failed',
                icon: <DollarSign size={16} />,
            },
            {
                type: 'nps_detractor',
                title: 'NPS Detractor',
                description: 'Customer gives low NPS score',
                icon: <Users size={16} />,
            },
            {
                type: 'usage_decline',
                title: 'Usage Decline',
                description: 'Feature usage drops significantly',
                icon: <TrendingUp size={16} />,
            },
            {
                type: 'milestone_reached',
                title: 'Milestone Reached',
                description: 'Customer hits success milestone',
                icon: <CheckCircle2 size={16} />,
            },
            {
                type: 'contract_renewal',
                title: 'Contract Renewal',
                description: 'Renewal date approaching',
                icon: <Calendar size={16} />,
            },
        ];

    const stats = {
        activePlaybooks: playbooks.filter((p) => p.status === 'active').length,
        totalExecutions: playbooks.reduce((sum, p) => sum + p.executions, 0),
        avgSuccessRate:
            playbooks.reduce((sum, p) => sum + p.successRate, 0) / playbooks.length,
    };

    const getActionIcon = (type: ActionType) => {
        const action = actionLibrary.find((a) => a.type === type);
        return action?.icon || <Zap size={16} />;
    };

    const getActionColor = (type: ActionType) => {
        const action = actionLibrary.find((a) => a.type === type);
        return action?.color || 'bg-gray-500';
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
                    <h1 className="text-3xl font-bold text-gradient">Playbook Builder</h1>
                    <p className="text-muted-foreground mt-1">
                        Automate customer success workflows with visual playbooks
                    </p>
                </div>
                <button className="px-6 py-3 bg-gradient-primary text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                    <Plus size={20} />
                    Create Playbook
                </button>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Active Playbooks"
                    value={stats.activePlaybooks}
                    icon={<Play size={24} />}
                    gradient="primary"
                />
                <MetricCard
                    title="Total Executions"
                    value={stats.totalExecutions}
                    icon={<Zap size={24} />}
                    gradient="success"
                />
                <MetricCard
                    title="Avg Success Rate"
                    value={`${(stats.avgSuccessRate * 100).toFixed(0)}%`}
                    icon={<CheckCircle2 size={24} />}
                    gradient="success"
                />
            </div>

            {/* Playbooks Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {playbooks.map((playbook, index) => (
                    <motion.div
                        key={playbook.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card hover onClick={() => setSelectedPlaybook(playbook)}>
                            {/* Playbook Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold">{playbook.name}</h3>
                                        <StatusBadge status={playbook.status} />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {playbook.description}
                                    </p>
                                </div>
                                <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                                    <Settings size={20} />
                                </button>
                            </div>

                            {/* Trigger */}
                            <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                                <div className="flex items-center gap-2 mb-1">
                                    <Zap size={16} className="text-primary" />
                                    <span className="text-sm font-semibold text-primary">Trigger</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {playbook.trigger.condition}
                                </p>
                            </div>

                            {/* Actions Flow */}
                            <div className="mb-4">
                                <p className="text-sm font-semibold mb-3">
                                    Workflow ({playbook.actions.length} steps)
                                </p>
                                <div className="space-y-2">
                                    {playbook.actions.map((action, idx) => (
                                        <div key={action.id} className="flex items-center gap-2">
                                            <div
                                                className={`w-8 h-8 rounded-lg ${getActionColor(
                                                    action.type
                                                )} flex items-center justify-center text-white`}
                                            >
                                                {getActionIcon(action.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{action.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {action.description}
                                                </p>
                                            </div>
                                            {idx < playbook.actions.length - 1 && (
                                                <ChevronRight size={16} className="text-muted-foreground" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>{playbook.executions} executions</span>
                                    <span>
                                        {(playbook.successRate * 100).toFixed(0)}% success rate
                                    </span>
                                </div>
                                {playbook.lastRun && (
                                    <span className="text-xs text-muted-foreground">
                                        Last run: {formatRelativeTime(playbook.lastRun)}
                                    </span>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Detailed Playbook View Modal */}
            <AnimatePresence>
                {selectedPlaybook && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
                        onClick={() => setSelectedPlaybook(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-border bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-950 dark:to-purple-950">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold">{selectedPlaybook.name}</h2>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {selectedPlaybook.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={selectedPlaybook.status} />
                                        <button
                                            onClick={() => setSelectedPlaybook(null)}
                                            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                                        >
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto max-h-[70vh]">
                                {/* Workflow Visualization */}
                                <div className="space-y-6">
                                    {/* Trigger Block */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3">Trigger Event</h3>
                                        <div className="p-4 bg-gradient-to-r from-primary-100 to-purple-100 dark:from-primary-900/30 dark:to-purple-900/30 rounded-lg border-2 border-primary-300 dark:border-primary-700">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 rounded-lg bg-primary text-white">
                                                    <Zap size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">
                                                        {
                                                            triggerTypes.find(
                                                                (t) => t.type === selectedPlaybook.trigger.type
                                                            )?.title
                                                        }
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {selectedPlaybook.trigger.condition}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Flow */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3">
                                            Action Workflow ({selectedPlaybook.actions.length} steps)
                                        </h3>
                                        <div className="relative">
                                            {/* Vertical connector line */}
                                            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary-300 to-purple-300 dark:from-primary-700 dark:to-purple-700" />

                                            <div className="space-y-4">
                                                {selectedPlaybook.actions.map((action, idx) => (
                                                    <motion.div
                                                        key={action.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        className="relative pl-16"
                                                    >
                                                        {/* Step number */}
                                                        <div className="absolute left-0 top-3 w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold shadow-lg z-10">
                                                            {idx + 1}
                                                        </div>

                                                        {/* Action card */}
                                                        <div className="p-4 bg-muted/50 rounded-lg border border-border hover:border-primary transition-colors">
                                                            <div className="flex items-start gap-3">
                                                                <div
                                                                    className={`p-2 rounded-lg ${getActionColor(
                                                                        action.type
                                                                    )} text-white flex-shrink-0`}
                                                                >
                                                                    {getActionIcon(action.type)}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="font-semibold">{action.title}</h4>
                                                                    <p className="text-sm text-muted-foreground mt-1">
                                                                        {action.description}
                                                                    </p>
                                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                                        {Object.entries(action.config).map(([key, value]) => (
                                                                            <Badge key={key} variant="default" size="sm">
                                                                                {key}: {String(value)}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Performance Metrics */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3">Performance</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="p-4 bg-muted/30 rounded-lg">
                                                <p className="text-sm text-muted-foreground">Executions</p>
                                                <p className="text-2xl font-bold mt-1">
                                                    {selectedPlaybook.executions}
                                                </p>
                                            </div>
                                            <div className="p-4 bg-muted/30 rounded-lg">
                                                <p className="text-sm text-muted-foreground">Success Rate</p>
                                                <p className="text-2xl font-bold mt-1 text-green-500">
                                                    {(selectedPlaybook.successRate * 100).toFixed(0)}%
                                                </p>
                                            </div>
                                            <div className="p-4 bg-muted/30 rounded-lg">
                                                <p className="text-sm text-muted-foreground">Last Run</p>
                                                <p className="text-sm font-medium mt-1">
                                                    {selectedPlaybook.lastRun
                                                        ? formatRelativeTime(selectedPlaybook.lastRun)
                                                        : 'Never'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-border bg-muted/30 flex justify-between">
                                <button className="px-6 py-2 rounded-lg font-medium hover:bg-muted transition-colors">
                                    Duplicate
                                </button>
                                <div className="flex gap-2">
                                    <button className="px-6 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors flex items-center gap-2">
                                        <Pause size={16} />
                                        Pause
                                    </button>
                                    <button className="px-6 py-2 bg-gradient-primary text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                                        <Settings size={16} />
                                        Edit Playbook
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper function (re-use from utils)
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 3600));

    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function ChevronRight({ size, className }: { size: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}

function X({ size, className }: { size: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

export default PlaybookBuilder;
