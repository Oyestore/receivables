import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    TrendingDown,
    Clock,
    DollarSign,
    Target,
    CheckCircle2,
    Play,
    X,
    ChevronRight,
    Activity,
    Mail,
    Phone,
    MessageSquare,
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { RiskBadge, Badge, StatusBadge } from '../components/ui/Badge';
import { HealthBar } from '../components/ui/HealthGauge';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

/**
 * Churn Intervention Center
 * 
 * Proactive customer save workflows with AI-powered recommendations
 */

interface ChurnAlert {
    id: string;
    customerId: string;
    customerName: string;
    priority: 'critical' | 'high' | 'medium';
    churnRisk: number;
    healthScore: number;
    mrr: number;
    daysAtRisk: number;
    topRiskFactors: string[];
    recommendedActions: string[];
    lastActivity: Date;
    status: 'new' | 'in_progress' | 'resolved' | 'escalated';
}

interface InterventionStep {
    id: string;
    title: string;
    description: string;
    actionType: 'email' | 'call' | 'meeting' | 'discount' | 'automation';
    completed: boolean;
}

const ChurnInterventionCenter: React.FC = () => {
    const [selectedAlert, setSelectedAlert] = useState<ChurnAlert | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [filter, setFilter] = useState<'all' | 'new' | 'in_progress'>('all');

    // Mock data - in production, fetch from API
    const [alerts] = useState<ChurnAlert[]>([
        {
            id: '1',
            customerId: 'C001',
            customerName: 'Acme Corporation',
            priority: 'critical',
            churnRisk: 0.92,
            healthScore: 28,
            mrr: 12000,
            daysAtRisk: 45,
            topRiskFactors: [
                'No login activity for 21 days',
                'Payment declined twice',
                'Support tickets unresolved',
                'Usage dropped 85%',
            ],
            recommendedActions: [
                'Schedule executive check-in call',
                'Offer 3-month discount (20%)',
                'Assign dedicated success manager',
                'Run health check playbook',
            ],
            lastActivity: new Date(Date.now() - 21 * 24 * 3600000),
            status: 'new',
        },
        {
            id: '2',
            customerId: 'C002',
            customerName: 'TechStart Inc',
            priority: 'high',
            churnRisk: 0.78,
            healthScore: 42,
            mrr: 8500,
            daysAtRisk: 28,
            topRiskFactors: [
                'Feature adoption stalled',
                'No champion engagement',
                'Competitor mentioned in support',
            ],
            recommendedActions: [
                'Send feature adoption guide',
                'Offer live training session',
                'Share success stories',
            ],
            lastActivity: new Date(Date.now() - 14 * 24 * 3600000),
            status: 'in_progress',
        },
        {
            id: '3',
            customerId: 'C003',
            customerName: 'Global Solutions Ltd',
            priority: 'high',
            churnRisk: 0.71,
            healthScore: 51,
            mrr: 15000,
            daysAtRisk: 18,
            topRiskFactors: [
                'NPS score dropped to 3',
                'Multiple feature requests ignored',
                'Contract renewal in 60 days',
            ],
            recommendedActions: [
                'Product roadmap review',
                'Escalate feature requests',
                'Early renewal discussion',
            ],
            lastActivity: new Date(Date.now() - 7 * 24 * 3600000),
            status: 'new',
        },
    ]);

    const interventionSteps: InterventionStep[] = [
        {
            id: 'step1',
            title: 'Assess Situation',
            description: 'Review customer health metrics and identify root causes',
            actionType: 'automation',
            completed: false,
        },
        {
            id: 'step2',
            title: 'Outreach',
            description: 'Contact customer via preferred channel',
            actionType: 'email',
            completed: false,
        },
        {
            id: 'step3',
            title: 'Diagnosis Call',
            description: 'Schedule and conduct deep-dive conversation',
            actionType: 'call',
            completed: false,
        },
        {
            id: 'step4',
            title: 'Action Plan',
            description: 'Create and execute recovery plan',
            actionType: 'meeting',
            completed: false,
        },
        {
            id: 'step5',
            title: 'Follow-up',
            description: 'Monitor progress and adjust as needed',
            actionType: 'automation',
            completed: false,
        },
    ];

    const stats = {
        totalAlerts: alerts.length,
        critical: alerts.filter(a => a.priority === 'critical').length,
        inProgress: alerts.filter(a => a.status === 'in_progress').length,
        successRate: 0.73,
    };

    const filteredAlerts = alerts.filter(alert => {
        if (filter === 'all') return true;
        return alert.status === filter;
    });

    const handleStartIntervention = (alert: ChurnAlert) => {
        setSelectedAlert(alert);
        setShowWizard(true);
        setCurrentStep(0);
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
                        Churn Intervention Center
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Proactive customer save workflows powered by AI
                    </p>
                </div>
                <div className="flex gap-2">
                    {(['all', 'new', 'in_progress'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${filter === f
                                    ? 'bg-primary text-white shadow-glow'
                                    : 'bg-card border border-border hover:border-primary'
                                }`}
                        >
                            {f.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="Total At-Risk"
                    value={stats.totalAlerts}
                    icon={<AlertTriangle size={24} />}
                    gradient="warning"
                />
                <MetricCard
                    title="Critical Priority"
                    value={stats.critical}
                    icon={<TrendingDown size={24} />}
                    gradient="danger"
                />
                <MetricCard
                    title="In Progress"
                    value={stats.inProgress}
                    icon={<Activity size={24} />}
                    gradient="primary"
                />
                <MetricCard
                    title="Success Rate"
                    value={`${(stats.successRate * 100).toFixed(0)}%`}
                    change={{ value: 8.2, label: 'vs last month' }}
                    icon={<Target size={24} />}
                    gradient="success"
                />
            </div>

            {/* Alert Feed */}
            <Card>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold">Active Alerts</h3>
                        <p className="text-sm text-muted-foreground">
                            {filteredAlerts.length} customers requiring attention
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <AnimatePresence>
                        {filteredAlerts.map((alert, index) => (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.05 }}
                                className="group relative"
                            >
                                <div
                                    className={`p-5 rounded-lg border-2 transition-all cursor-pointer ${alert.priority === 'critical'
                                            ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 hover:shadow-glow-danger'
                                            : 'border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 hover:shadow-glow-warning'
                                        }`}
                                    onClick={() => setSelectedAlert(alert)}
                                >
                                    {/* Alert Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="h-14 w-14 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xl font-bold">
                                                {alert.customerName.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="text-lg font-bold">{alert.customerName}</h4>
                                                    <RiskBadge
                                                        level={
                                                            alert.priority === 'critical'
                                                                ? 'critical'
                                                                : alert.priority === 'high'
                                                                    ? 'high'
                                                                    : 'medium'
                                                        }
                                                        pulse={alert.priority === 'critical'}
                                                    />
                                                    <StatusBadge status={alert.status === 'in_progress' ? 'active' : 'paused'} />
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={14} />
                                                        At risk for {alert.daysAtRisk} days
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <DollarSign size={14} />
                                                        {formatCurrency(alert.mrr)}/mo MRR
                                                    </span>
                                                    <span>Last activity: {formatRelativeTime(alert.lastActivity)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Health & Risk Metrics */}
                                    <div className="grid grid-cols-2 gap-6 mb-4">
                                        <div>
                                            <HealthBar score={alert.healthScore} label="Health Score" />
                                        </div>
                                        <div>
                                            <HealthBar
                                                score={alert.churnRisk * 100}
                                                label="Churn Risk"
                                                height={8}
                                            />
                                        </div>
                                    </div>

                                    {/* Risk Factors */}
                                    <div className="mb-4">
                                        <p className="text-sm font-medium mb-2">Top Risk Factors:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {alert.topRiskFactors.slice(0, 3).map((factor, i) => (
                                                <Badge key={i} variant="danger" size="sm">
                                                    {factor}
                                                </Badge>
                                            ))}
                                            {alert.topRiskFactors.length > 3 && (
                                                <Badge variant="default" size="sm">
                                                    +{alert.topRiskFactors.length - 3} more
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2">
                                            <button className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-1">
                                                <Mail size={14} />
                                                Email
                                            </button>
                                            <button className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-1">
                                                <Phone size={14} />
                                                Call
                                            </button>
                                            <button className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-1">
                                                <MessageSquare size={14} />
                                                Note
                                            </button>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartIntervention(alert);
                                            }}
                                            className="px-6 py-2 bg-gradient-primary text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                                        >
                                            <Play size={16} />
                                            Start Intervention
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </Card>

            {/* Intervention Wizard Modal */}
            <AnimatePresence>
                {showWizard && selectedAlert && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
                        onClick={() => setShowWizard(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-950 dark:to-purple-950">
                                <div>
                                    <h2 className="text-2xl font-bold">Intervention Wizard</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {selectedAlert.customerName}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowWizard(false)}
                                    className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Steps Progress */}
                            <div className="p-6 border-b border-border">
                                <div className="flex items-center justify-between mb-4">
                                    {interventionSteps.map((step, index) => (
                                        <div key={step.id} className="flex items-center flex-1">
                                            <div className="flex flex-col items-center">
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${index === currentStep
                                                            ? 'bg-gradient-primary text-white shadow-glow'
                                                            : index < currentStep
                                                                ? 'bg-green-500 text-white'
                                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                                        }`}
                                                >
                                                    {index < currentStep ? <CheckCircle2 size={20} /> : index + 1}
                                                </div>
                                                <p className="text-xs mt-2 text-center font-medium">
                                                    {step.title}
                                                </p>
                                            </div>
                                            {index < interventionSteps.length - 1 && (
                                                <div
                                                    className={`flex-1 h-1 mx-2 rounded ${index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                                                        }`}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Step Content */}
                            <div className="p-6 overflow-y-auto max-h-96">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentStep}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="space-y-4"
                                    >
                                        <h3 className="text-xl font-bold">
                                            {interventionSteps[currentStep].title}
                                        </h3>
                                        <p className="text-muted-foreground">
                                            {interventionSteps[currentStep].description}
                                        </p>

                                        {currentStep === 0 && (
                                            <div className="space-y-3">
                                                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                                                    <h4 className="font-semibold mb-2">Critical Risk Factors:</h4>
                                                    <ul className="space-y-1 text-sm">
                                                        {selectedAlert.topRiskFactors.map((factor, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <span className="text-red-500">•</span>
                                                                {factor}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                                    <h4 className="font-semibold mb-2">Recommended Actions:</h4>
                                                    <ul className="space-y-1 text-sm">
                                                        {selectedAlert.recommendedActions.map((action, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <span className="text-green-500">✓</span>
                                                                {action}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-border flex items-center justify-between bg-muted/30">
                                <button
                                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                                    disabled={currentStep === 0}
                                    className="px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                                >
                                    Previous
                                </button>
                                <div className="text-sm text-muted-foreground">
                                    Step {currentStep + 1} of {interventionSteps.length}
                                </div>
                                <button
                                    onClick={() => {
                                        if (currentStep < interventionSteps.length - 1) {
                                            setCurrentStep(currentStep + 1);
                                        } else {
                                            setShowWizard(false);
                                        }
                                    }}
                                    className="px-6 py-2 bg-gradient-primary text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                                >
                                    {currentStep < interventionSteps.length - 1 ? (
                                        <>
                                            Next <ChevronRight size={16} />
                                        </>
                                    ) : (
                                        'Complete'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChurnInterventionCenter;
