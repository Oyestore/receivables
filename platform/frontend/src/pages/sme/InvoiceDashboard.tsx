import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    FileText,
    Plus,
    Send,
    Eye,
    CheckCircle,
    Clock,
    AlertTriangle,
    TrendingUp,
    Download,
    Filter,
} from 'lucide-react';
import {
    DashboardHeader,
    StatCard,
    GradientCard,
    StatusBadge,
    Button,
} from '../../design-system';
import './InvoiceDashboard.css';

interface Invoice {
    id: string;
    number: string;
    customer: string;
    amount: number;
    dueDate: string;
    status: 'draft' | 'sent' | 'viewed' | 'overdue' | 'paid';
    createdAt: string;
}

export const InvoiceDashboard: React.FC = () => {
    const [invoices] = useState<Invoice[]>([
        {
            id: '1',
            number: 'INV-001',
            customer: 'Tech Solutions Inc.',
            amount: 15000,
            dueDate: '2025-02-01',
            status: 'paid',
            createdAt: '2025-01-15',
        },
        {
            id: '2',
            number: 'INV-002',
            customer: 'Digital Marketing Co.',
            amount: 8500,
            dueDate: '2025-01-25',
            status: 'sent',
            createdAt: '2025-01-16',
        },
        {
            id: '3',
            number: 'INV-003',
            customer: 'Startup Ventures',
            amount: 12000,
            dueDate: '2025-01-20',
            status: 'overdue',
            createdAt: '2025-01-10',
        },
        {
            id: '4',
            number: 'INV-004',
            customer: 'Enterprise Corp',
            amount: 25000,
            dueDate: '2025-02-10',
            status: 'viewed',
            createdAt: '2025-01-17',
        },
    ]);

    const stats = {
        total: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
        sent: invoices.filter(inv => inv.status === 'sent' || inv.status === 'viewed').length,
        paid: invoices.filter(inv => inv.status === 'paid').length,
        overdue: invoices.filter(inv => inv.status === 'overdue').length,
    };

    const getStatusType = (status: Invoice['status']): 'success' | 'pending' | 'error' | 'info' | 'warning' => {
        switch (status) {
            case 'paid': return 'success';
            case 'sent': return 'info';
            case 'viewed': return 'info' as const;
            case 'overdue': return 'error';
            case 'draft': return 'pending';
            default: return 'pending';
        }
    };

    return (
        <div className="invoice-dashboard">
            <DashboardHeader
                title="Invoices"
                subtitle="Create, manage, and track all your invoices"
                icon={FileText}
                actions={
                    <>
                        <Button variant="outline" icon={Filter} size="md">
                            Filter
                        </Button>
                        <Button variant="outline" icon={Download} size="md">
                            Export
                        </Button>
                        <Button variant="primary" icon={Plus} theme="invoicing" size="md">
                            New Invoice
                        </Button>
                    </>
                }
            />

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    value={stats.total}
                    label="Total Invoices"
                    icon={FileText}
                    theme="invoicing"
                />
                <StatCard
                    value={`$${(stats.totalAmount / 1000).toFixed(1)}k`}
                    label="Total Amount"
                    icon={TrendingUp}
                    theme="invoicing"
                    trend={{ value: 12.5, direction: 'up' }}
                />
                <StatCard
                    value={stats.sent}
                    label="Sent & Viewed"
                    icon={Send}
                    theme="invoicing"
                />
                <StatCard
                    value={stats.paid}
                    label="Paid"
                    icon={CheckCircle}
                    theme="invoicing"
                />
                <StatCard
                    value={stats.overdue}
                    label="Overdue"
                    icon={AlertTriangle}
                    theme="critical"
                />
            </div>

            {/* Invoices List */}
            <GradientCard theme="invoicing" glass className="invoices-container">
                <div className="invoices-header">
                    <h2 className="section-title">Recent Invoices</h2>
                </div>

                <div className="invoices-table">
                    <div className="table-header">
                        <div className="col-number">Invoice #</div>
                        <div className="col-customer">Customer</div>
                        <div className="col-amount">Amount</div>
                        <div className="col-due">Due Date</div>
                        <div className="col-status">Status</div>
                        <div className="col-actions">Actions</div>
                    </div>

                    {invoices.map((invoice, index) => (
                        <motion.div
                            key={invoice.id}
                            className="table-row"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="col-number">
                                <FileText className="invoice-icon" />
                                <span className="invoice-number">{invoice.number}</span>
                            </div>
                            <div className="col-customer">{invoice.customer}</div>
                            <div className="col-amount">${invoice.amount.toLocaleString()}</div>
                            <div className="col-due">{new Date(invoice.dueDate).toLocaleDateString()}</div>
                            <div className="col-status">
                                <StatusBadge
                                    status={getStatusType(invoice.status)}
                                    label={invoice.status}
                                    size="sm"
                                />
                            </div>
                            <div className="col-actions">
                                <Button variant="ghost" size="sm" icon={Eye}>
                                    View
                                </Button>
                                <Button variant="ghost" size="sm" icon={Send}>
                                    Send
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </GradientCard>
        </div>
    );
};
