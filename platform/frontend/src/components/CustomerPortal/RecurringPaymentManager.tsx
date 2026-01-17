import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    Icon,
    Badge,
} from '@chakra-ui/react';
import { FiRepeat, FiCalendar, FiCheck } from 'react-icons/fi';
import axios from 'axios';
import './RecurringPaymentManager.css';

interface RecurringRule {
    id: string;
    vendor: string;
    amount: number;
    frequency: 'monthly' | 'weekly' | 'quarterly';
    dayOfMonth?: number;
    paymentMethod: string;
    isActive: boolean;
    nextPaymentDate: Date;
}

interface RecurringPaymentManagerProps {
    customerId: string;
}

const RecurringPaymentManager: React.FC<RecurringPaymentManagerProps> = ({
    customerId,
}) => {
    const [rules, setRules] = useState<RecurringRule[]>([]);
    const [aiSuggestion, setAiSuggestion] = useState<any>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        fetchRecurringRules();
        detectRecurringPatterns();
    }, [customerId]);

    const fetchRecurringRules = async () => {
        // TODO: Fetch from API
        const mockRules: RecurringRule[] = [
            {
                id: 'rec1',
                vendor: 'ABC Consulting',
                amount: 50000,
                frequency: 'monthly',
                dayOfMonth: 1,
                paymentMethod: 'UPI',
                isActive: true,
                nextPaymentDate: new Date('2026-01-01'),
            },
            {
                id: 'rec2',
                vendor: 'XYZ Services',
                amount: 25000,
                frequency: 'monthly',
                dayOfMonth: 15,
                paymentMethod: 'Bank Transfer',
                isActive: true,
                nextPaymentDate: new Date('2025-12-15'),
            },
            {
                id: 'rec3',
                vendor: 'Global Tech',
                amount: 75000,
                frequency: 'quarterly',
                dayOfMonth: 1,
                paymentMethod: 'Credit Card',
                isActive: false,
                nextPaymentDate: new Date('2026-03-01'),
            },
        ];

        setRules(mockRules);
    };

    const detectRecurringPatterns = async () => {
        // AI analyzes payment history to suggest recurring payments
        const mockSuggestion = {
            vendor: 'Startup Inc',
            amount: 30000,
            frequency: 'monthly',
            confidence: 92,
            reason: 'Detected consistent monthly payments for the last 6 months',
        };

        setAiSuggestion(mockSuggestion);
    };

    const handleToggleRule = (id: string) => {
        setRules(prev => prev.map(rule =>
            rule.id === id ? { ...rule, isActive: !rule.isActive } : rule
        ));

        setToastMessage('Payment rule updated');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleDeleteRule = (id: string) => {
        setRules(prev => prev.filter(rule => rule.id !== id));

        setToastMessage('Payment rule deleted');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleAddRule = () => {
        const newRule: RecurringRule = {
            id: `rec${rules.length + 1}`,
            vendor: 'New Vendor',
            amount: 0,
            frequency: 'monthly',
            paymentMethod: 'UPI',
            isActive: true,
            nextPaymentDate: new Date(),
        };

        setRules(prev => [...prev, newRule]);
        setShowAddForm(false);

        setToastMessage('New payment rule created');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getFrequencyLabel = (frequency: string) => {
        switch (frequency) {
            case 'monthly':
                return 'Monthly';
            case 'weekly':
                return 'Weekly';
            case 'quarterly':
                return 'Quarterly';
            default:
                return frequency;
        }
    };

    const filteredRules = rules.filter(rule => {
        if (selectedFilter === 'all') return true;
        if (selectedFilter === 'active') return rule.isActive;
        if (selectedFilter === 'inactive') return !rule.isActive;
        return true;
    });

    const activeRules = rules.filter(rule => rule.isActive);
    const totalMonthlyAmount = activeRules.reduce((sum, rule) => {
        const multiplier = rule.frequency === 'monthly' ? 1 : 
                          rule.frequency === 'weekly' ? 4.33 : 
                          rule.frequency === 'quarterly' ? 0.33 : 1;
        return sum + (rule.amount * multiplier);
    }, 0);

    return (
        <div className="recurring-payment-manager">
            <VStack gap={6} align="stretch">
                {/* Header */}
                <div className="manager-header">
                    <h2 className="manager-title">
                        <Icon as={FiRepeat} className="icon mr-2" />
                        Recurring Payment Manager
                    </h2>
                    <div className="manager-actions">
                        <button className="button button-blue button-sm" onClick={() => setShowAddForm(true)}>
                            <Icon as={FiCalendar} className="icon mr-1" />
                            Add Recurring Payment
                        </button>
                    </div>
                </div>

                {/* Overview */}
                <div className="payment-overview">
                    <div className="overview-card active">
                        <div className="overview-icon active">
                            <Icon as={FiCheck} className="icon-lg" />
                        </div>
                        <div className="overview-value">{activeRules.length}</div>
                        <div className="overview-label">Active Rules</div>
                        <div className="overview-change positive">
                            <Icon as={FiCheck} className="icon" />
                            All payments scheduled
                        </div>
                    </div>

                    <div className="overview-card active">
                        <div className="overview-icon active">
                            <Icon as={FiCalendar} className="icon-lg" />
                        </div>
                        <div className="overview-value">{formatCurrency(totalMonthlyAmount)}</div>
                        <div className="overview-label">Monthly Total</div>
                        <div className="overview-change positive">
                            <Icon as={FiRepeat} className="icon" />
                            Automated payments
                        </div>
                    </div>

                    <div className="overview-card inactive">
                        <div className="overview-icon inactive">
                            <Icon as={FiRepeat} className="icon-lg" />
                        </div>
                        <div className="overview-value">{rules.filter(r => !r.isActive).length}</div>
                        <div className="overview-label">Paused Rules</div>
                        <div className="overview-change negative">
                            <Icon as={FiCalendar} className="icon" />
                            Temporarily inactive
                        </div>
                    </div>

                    <div className="overview-card active">
                        <div className="overview-icon active">
                            <Icon as={FiCalendar} className="icon-lg" />
                        </div>
                        <div className="overview-value">{rules.length}</div>
                        <div className="overview-label">Total Rules</div>
                        <div className="overview-change positive">
                            <Icon as={FiCheck} className="icon" />
                            All configured
                        </div>
                    </div>
                </div>

                {/* AI Suggestion */}
                {aiSuggestion && (
                    <div className="alert alert-info">
                        <Icon as={FiCalendar} className="alert-icon" />
                        <div className="alert-content">
                            <div className="alert-title">AI Pattern Detection</div>
                            <div className="alert-description">
                                We detected a recurring payment pattern with {aiSuggestion.vendor} 
                                ({formatCurrency(aiSuggestion.amount)} {getFrequencyLabel(aiSuggestion.frequency)}). 
                                Confidence: {aiSuggestion.confidence}%
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Payment Form */}
                {showAddForm && (
                    <div className="add-payment-form">
                        <div className="form-header">
                            <h3 className="form-title">Add Recurring Payment</h3>
                            <button className="button button-outline button-sm" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </button>
                        </div>
                        <div className="form-grid">
                            <div className="form-control">
                                <label className="form-label required">Vendor Name</label>
                                <input type="text" className="input" placeholder="Enter vendor name" />
                            </div>
                            <div className="form-control">
                                <label className="form-label required">Amount</label>
                                <input type="number" className="input" placeholder="Enter amount" />
                            </div>
                            <div className="form-control">
                                <label className="form-label required">Frequency</label>
                                <select className="select">
                                    <option value="monthly">Monthly</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="quarterly">Quarterly</option>
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="form-label">Payment Method</label>
                                <select className="select">
                                    <option value="UPI">UPI</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Credit Card">Credit Card</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-actions">
                            <button className="button button-outline button-sm" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </button>
                            <button className="button button-blue button-sm" onClick={handleAddRule}>
                                <Icon as={FiCheck} className="icon mr-1" />
                                Create Rule
                            </button>
                        </div>
                    </div>
                )}

                {/* Payments List */}
                <div className="payments-list">
                    <div className="list-header">
                        <h3 className="list-title">Recurring Payments</h3>
                        <div className="list-filters">
                            <button
                                className={`filter-button ${selectedFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedFilter('all')}
                            >
                                All ({rules.length})
                            </button>
                            <button
                                className={`filter-button ${selectedFilter === 'active' ? 'active' : ''}`}
                                onClick={() => setSelectedFilter('active')}
                            >
                                Active ({activeRules.length})
                            </button>
                            <button
                                className={`filter-button ${selectedFilter === 'inactive' ? 'active' : ''}`}
                                onClick={() => setSelectedFilter('inactive')}
                            >
                                Paused ({rules.filter(r => !r.isActive).length})
                            </button>
                        </div>
                    </div>

                    <div className="payments-grid">
                        {filteredRules.map((rule) => (
                            <div key={rule.id} className={`payment-item ${rule.isActive ? 'active' : 'inactive'}`}>
                                <div className="payment-info">
                                    <div className="payment-name">{rule.vendor}</div>
                                    <div className="payment-details">
                                        {getFrequencyLabel(rule.frequency)} • {rule.paymentMethod}
                                    </div>
                                    <div className="payment-schedule">
                                        Next: {formatDate(rule.nextPaymentDate)}
                                        {rule.dayOfMonth && ` (Day ${rule.dayOfMonth})`}
                                    </div>
                                </div>
                                <div className="payment-amount">
                                    {formatCurrency(rule.amount)}
                                </div>
                                <div className="payment-status">
                                    <Badge className={`badge ${rule.isActive ? 'badge-green' : 'badge-gray'}`}>
                                        {rule.isActive ? 'Active' : 'Paused'}
                                    </Badge>
                                </div>
                                <div className="payment-actions">
                                    <button
                                        className="action-button"
                                        onClick={() => handleToggleRule(rule.id)}
                                        title={rule.isActive ? 'Pause' : 'Activate'}
                                    >
                                        <Icon as={FiRepeat} className={`icon ${rule.isActive ? 'color-green-500' : 'color-gray-400'}`} />
                                    </button>
                                    <button
                                        className="action-button"
                                        onClick={() => handleDeleteRule(rule.id)}
                                        title="Delete rule"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredRules.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-state-icon">📅</div>
                            <div className="empty-state-text">No recurring payments found</div>
                            <div className="empty-state-subtext">
                                {selectedFilter === 'all' 
                                    ? 'Create your first recurring payment rule to automate regular payments'
                                    : 'No payments match the selected filter'
                                }
                            </div>
                        </div>
                    )}
                </div>

                {/* Payment History */}
                <div className="payment-history">
                    <div className="history-header">
                        <h3 className="history-title">Recent Payments</h3>
                    </div>
                    <div className="history-list">
                        <div className="history-item">
                            <div className="history-date">Dec 1</div>
                            <div className="history-description">ABC Consulting - Monthly payment</div>
                            <div className="history-amount">{formatCurrency(50000)}</div>
                        </div>
                        <div className="history-item">
                            <div className="history-date">Nov 15</div>
                            <div className="history-description">XYZ Services - Monthly payment</div>
                            <div className="history-amount">{formatCurrency(25000)}</div>
                        </div>
                        <div className="history-item">
                            <div className="history-date">Nov 1</div>
                            <div className="history-description">ABC Consulting - Monthly payment</div>
                            <div className="history-amount">{formatCurrency(50000)}</div>
                        </div>
                    </div>
                </div>
            </VStack>

            {/* Toast Notification */}
            {showToast && (
                <div className={`toast toast-${toastType}`}>
                    <div className="toast-title">
                        {toastType === 'success' ? 'Success' : 'Error'}
                    </div>
                    <div className="toast-message">{toastMessage}</div>
                </div>
            )}
        </div>
    );
};

export default RecurringPaymentManager;
