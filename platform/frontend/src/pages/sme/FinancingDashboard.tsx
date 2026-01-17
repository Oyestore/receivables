import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    DollarSign,
    Plus,
    TrendingUp,
    Clock,
    CheckCircle,
    Building,
    Percent,
    ArrowRight,
} from 'lucide-react';
import {
    DashboardHeader,
    StatCard,
    GradientCard,
    StatusBadge,
    Button,
} from '../../design-system';
import './FinancingDashboard.css';

interface FinancingOption {
    id: string;
    provider: string;
    type: string;
    amount: number;
    interestRate: number;
    term: number;
    status: 'available' | 'applied' | 'approved' | 'rejected';
}

export const FinancingDashboard: React.FC = () => {
    const [options] = useState<FinancingOption[]>([
        {
            id: '1',
            provider: 'Capital Finance',
            type: 'Invoice Financing',
            amount: 500000,
            interestRate: 8.5,
            term: 90,
            status: 'available',
        },
        {
            id: '2',
            provider: 'Business Lenders',
            type: 'Working Capital',
            amount: 1000000,
            interestRate: 12.0,
            term: 180,
            status: 'applied',
        },
        {
            id: '3',
            provider: 'Quick Capital',
            type: 'Short-term Loan',
            amount: 250000,
            interestRate: 15.0,
            term: 30,
            status: 'approved',
        },
    ]);

    const stats = {
        totalAvailable: options.reduce((sum, opt) => sum + opt.amount, 0),
        applications: options.filter(o => o.status === 'applied').length,
        approved: options.filter(o => o.status === 'approved').length,
        avgRate: (options.reduce((sum, o) => sum + o.interestRate, 0) / options.length).toFixed(1),
    };

    return (
        <div className="financing-dashboard">
            <DashboardHeader
                title="Financing Options"
                subtitle="Explore and apply for business financing"
                icon={DollarSign}
                actions={
                    <Button variant="primary" icon={Plus} theme="payments" size="md">
                        Apply for Financing
                    </Button>
                }
            />

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    value={`$${(stats.totalAvailable / 1000000).toFixed(1)}M`}
                    label="Total Available"
                    icon={DollarSign}
                    theme="payments"
                />
                <StatCard
                    value={stats.applications}
                    label="In Progress"
                    icon={Clock}
                    theme="payments"
                />
                <StatCard
                    value={stats.approved}
                    label="Approved"
                    icon={CheckCircle}
                    theme="payments"
                />
                <StatCard
                    value={`${stats.avgRate}%`}
                    label="Avg Interest Rate"
                    icon={Percent}
                    theme="payments"
                />
            </div>

            {/* Financing Options */}
            <GradientCard theme="payments" glass className="options-container">
                <h3 className="section-title">Available Financing Options</h3>

                <div className="options-grid">
                    {options.map((option, index) => (
                        <motion.div
                            key={option.id}
                            className="financing-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="card-header">
                                <div className="provider-info">
                                    <Building className="provider-icon" />
                                    <div>
                                        <h4 className="provider-name">{option.provider}</h4>
                                        <span className="financing-type">{option.type}</span>
                                    </div>
                                </div>
                                <StatusBadge
                                    status={
                                        option.status === 'approved' ? 'success' :
                                            option.status === 'applied' ? 'pending' :
                                                option.status === 'rejected' ? 'error' : 'info'
                                    }
                                    label={option.status}
                                    size="sm"
                                />
                            </div>

                            <div className="card-amount">
                                <div className="amount-label">Financing Amount</div>
                                <div className="amount-value">${(option.amount / 1000).toLocaleString()}k</div>
                            </div>

                            <div className="card-details">
                                <div className="detail-item">
                                    <Percent className="detail-icon" />
                                    <div>
                                        <div className="detail-label">Interest Rate</div>
                                        <div className="detail-value">{option.interestRate}%</div>
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <Clock className="detail-icon" />
                                    <div>
                                        <div className="detail-label">Term</div>
                                        <div className="detail-value">{option.term} days</div>
                                    </div>
                                </div>
                            </div>

                            <Button
                                variant={option.status === 'available' ? 'primary' : 'outline'}
                                theme="payments"
                                fullWidth
                                iconRight={ArrowRight}
                            >
                                {option.status === 'available' ? 'Apply Now' : 'View Details'}
                            </Button>
                        </motion.div>
                    ))}
                </div>
            </GradientCard>

            {/* Partner Showcase */}
            <GradientCard theme="payments" glass className="partners-card">
                <h3 className="section-title">Our Financing Partners</h3>
                <div className="partners-grid">
                    {['Capital Finance', 'Business Lenders', 'Quick Capital', 'Growth Fund'].map((partner, i) => (
                        <motion.div
                            key={partner}
                            className="partner-badge"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Building className="partner-logo" />
                            <span>{partner}</span>
                        </motion.div>
                    ))}
                </div>
            </GradientCard>
        </div>
    );
};
