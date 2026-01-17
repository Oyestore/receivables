import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard,
    Plus,
    CheckCircle,
    Clock,
    TrendingUp,
    Zap,
    DollarSign,
    ArrowUpRight,
    Filter,
    X
} from 'lucide-react';
import {
    DashboardHeader,
    StatCard,
    GradientCard,
    StatusBadge,
    Button,
} from '../../design-system';
import './PaymentDashboard.css';
import { PaymentService } from '../../services/payment.service';
import { Dialog, DialogContent, DialogTitle, TextField, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

// ... (Keeping interfaces and paymentMethods constant) ...
interface Payment {
    id: string;
    transactionId: string;
    customer: string;
    amount: number;
    method: 'upi' | 'card' | 'bank_transfer' | 'wallet';
    status: 'success' | 'pending' | 'error';
    date: string;
}

const paymentMethods = {
    upi: { icon: '📱', label: 'UPI', color: '#10b981' },
    card: { icon: '💳', label: 'Card', color: '#3b82f6' },
    bank_transfer: { icon: '🏦', label: 'Bank', color: '#8b5cf6' },
    wallet: { icon: '👛', label: 'Wallet', color: '#f59e0b' },
};

export const PaymentDashboard: React.FC = () => {
    // ... (Keeping existing state) ...
    const [payments, setPayments] = useState<Payment[]>([
        {
            id: '1',
            transactionId: 'TXN-20250114-001',
            customer: 'Tech Solutions Inc.',
            amount: 15000,
            method: 'upi',
            status: 'success',
            date: '2025-01-14T10:30:00',
        },
        // ... (truncated for brevity, assume keeping existing mocks for list display for now)
        {
            id: '2',
            transactionId: 'TXN-20250114-002',
            customer: 'Digital Marketing Co.',
            amount: 8500,
            method: 'card',
            status: 'success',
            date: '2025-01-14T11:15:00',
        }
    ]);

    const [modalOpen, setModalOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [predictionModalOpen, setPredictionModalOpen] = useState(false);
    const [predictInvoiceId, setPredictInvoiceId] = useState('');
    const [predictionResult, setPredictionResult] = useState<{ probability: number, riskLevel: string, factors: string[] } | null>(null);
    const [predicting, setPredicting] = useState(false);

    const stats = {
        total: payments.reduce((sum, p) => sum + (p.status === 'success' ? p.amount : 0), 0),
        successful: payments.filter(p => p.status === 'success').length,
        pending: payments.filter(p => p.status === 'pending').length,
        failed: payments.filter(p => p.status === 'error').length,
        transactions: payments.length,
    };

    const successRate = stats.transactions ? ((stats.successful / stats.transactions) * 100).toFixed(1) : '0.0';

    const [submitting, setSubmitting] = useState(false);

    const handleInitiatePayment = async () => {
        setSubmitting(true);
        try {
            await PaymentService.initiatePayment({
                amount: Number(amount),
                currency,
                description: 'Manual Payment Initiation',
                invoiceId: 'INV-MANUAL-001' // Mock invoice ID for isolated testing
            });
            alert('Payment Initiated Successfully');
            setModalOpen(false);
            // In real app, re-fetch list here
        } catch (error) {
            alert('Failed to initiate payment');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePredictPayment = async () => {
        if (!predictInvoiceId) return;
        setPredicting(true);
        setPredictionResult(null);
        try {
            // Mock tenant ID as it's usually from context
            const result = await PaymentService.predictPayment(predictInvoiceId, 'tenant-1');
            setPredictionResult(result);
        } catch (error) {
            alert('Failed to get prediction');
        } finally {
            setPredicting(false);
        }
    };

    const closePredictionModal = () => {
        setPredictionModalOpen(false);
        setPredictionResult(null);
        setPredictInvoiceId('');
    };

    return (
        <div className="payment-dashboard">
            <DashboardHeader
                title="Payment Integration"
                subtitle="Monitor and manage all payment transactions"
                icon={CreditCard}
                actions={
                    <>
                        <Button variant="outline" icon={Zap} size="md" onClick={() => setPredictionModalOpen(true)}>
                            AI Prediction
                        </Button>
                        <Button variant="outline" icon={Filter} size="md">
                            Filter
                        </Button>
                        <Button
                            variant="primary"
                            icon={Plus}
                            theme="payments"
                            size="md"
                            onClick={() => setModalOpen(true)}
                        >
                            Initiate Payment
                        </Button>
                    </>
                }
            />

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    value={`$${(stats.total / 1000).toFixed(1)}k`}
                    label="Total Collected"
                    icon={DollarSign}
                    theme="payments"
                    trend={{ value: 18.2, direction: 'up' }}
                />
                <StatCard
                    value={stats.successful}
                    label="Successful"
                    icon={CheckCircle}
                    theme="payments"
                />
                <StatCard
                    value={stats.pending}
                    label="Pending"
                    icon={Clock}
                    theme="payments"
                />
                <StatCard
                    value={`${successRate}%`}
                    label="Success Rate"
                    icon={TrendingUp}
                    theme="payments"
                />
            </div>

            {/* Payment Methods Grid */}
            <div className="payment-methods-grid">
                {Object.entries(paymentMethods).map(([key, method]) => {
                    const count = payments.filter(p => p.method === key).length;
                    const val = payments
                        .filter(p => p.method === key && p.status === 'success')
                        .reduce((sum, p) => sum + p.amount, 0);

                    return (
                        <motion.div
                            key={key}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="method-card"
                            style={{ borderColor: method.color }}
                        >
                            <div className="method-icon" style={{ background: method.color }}>
                                <span>{method.icon}</span>
                            </div>
                            <div className="method-info">
                                <h3 className="method-name">{method.label}</h3>
                                <div className="method-stats">
                                    <span className="method-count">{count} payments</span>
                                    <span className="method-amount">${(val / 1000).toFixed(1)}k</span>
                                </div>
                            </div>
                            <ArrowUpRight className="method-arrow" style={{ color: method.color }} />
                        </motion.div>
                    );
                })}
            </div>

            {/* Recent Payments */}
            <GradientCard theme="payments" glass className="payments-container">
                <div className="payments-header">
                    <h2 className="section-title">Recent Transactions</h2>
                    <div className="header-badges">
                        <span className="live-badge">
                            <Zap className="live-icon" />
                            Live
                        </span>
                    </div>
                </div>

                <div className="payments-list">
                    {payments.map((payment, index) => (
                        <motion.div
                            key={payment.id}
                            className="payment-item"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className="payment-method-indicator">
                                <div
                                    className="method-badge"
                                    style={{ background: paymentMethods[payment.method].color }}
                                >
                                    {paymentMethods[payment.method].icon}
                                </div>
                            </div>

                            <div className="payment-details">
                                <div className="payment-customer">{payment.customer}</div>
                                <div className="payment-id">{payment.transactionId}</div>
                            </div>

                            <div className="payment-amount">
                                ${payment.amount.toLocaleString()}
                            </div>

                            <div className="payment-time">
                                {new Date(payment.date).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </div>

                            <div className="payment-status">
                                <StatusBadge
                                    status={payment.status}
                                    size="sm"
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </GradientCard>

            <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
                <DialogTitle>Initiate New Payment</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1, minWidth: 300 }}>
                        <TextField
                            label="Amount"
                            type="number"
                            fullWidth
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Currency</InputLabel>
                            <Select
                                value={currency}
                                label="Currency"
                                onChange={(e) => setCurrency(e.target.value)}
                            >
                                <MenuItem value="USD">USD</MenuItem>
                                <MenuItem value="INR">INR</MenuItem>
                                <MenuItem value="EUR">EUR</MenuItem>
                            </Select>
                        </FormControl>
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleInitiatePayment}
                            disabled={submitting}
                        >
                            {submitting ? 'Processing...' : 'Confirm Payment'}
                        </Button>
                    </Box>
                </DialogContent>
            </Dialog>

            <Dialog open={predictionModalOpen} onClose={closePredictionModal}>
                <DialogTitle>AI Payment Probability Prediction</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gap: 2, mt: 1, minWidth: 350 }}>
                        <TextField
                            label="Invoice ID"
                            fullWidth
                            value={predictInvoiceId}
                            onChange={(e) => setPredictInvoiceId(e.target.value)}
                            placeholder="e.g. INV-2025-001"
                        />

                        {predictionResult && (
                            <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1, border: '1px solid #eee' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <strong>Probability:</strong>
                                    <span style={{ color: predictionResult.probability > 80 ? 'green' : 'orange' }}>
                                        {predictionResult.probability}%
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <strong>Risk Level:</strong>
                                    <span>{predictionResult.riskLevel}</span>
                                </div>
                                <div>
                                    <strong>Factors:</strong>
                                    <ul style={{ margin: '4px 0 0 20px', fontSize: '0.9em', color: '#666' }}>
                                        {predictionResult.factors.map((f, i) => <li key={i}>{f}</li>)}
                                    </ul>
                                </div>
                            </Box>
                        )}

                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handlePredictPayment}
                            disabled={predicting || !predictInvoiceId}
                        >
                            {predicting ? 'Analyzing...' : 'Predict Probability'}
                        </Button>
                    </Box>
                </DialogContent>
            </Dialog>
        </div>
    );
};
