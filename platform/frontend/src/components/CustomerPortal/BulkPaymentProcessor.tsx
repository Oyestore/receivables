import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiCheck, FiCreditCard, FiZap } from 'react-icons/fi';
import axios from 'axios';
import './BulkPaymentProcessor.css';

interface Invoice {
    id: string;
    number: string;
    vendor: string;
    amount: number;
    dueDate: string;
    status: string;
}

interface BulkPaymentProcessorProps {
    onPaymentSuccess: () => void;
}

const BulkPaymentProcessor: React.FC<BulkPaymentProcessorProps> = ({
    onPaymentSuccess,
}) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [aiOptimization, setAIOptimization] = useState<any>(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        fetchPendingInvoices();
    }, []);

    useEffect(() => {
        if (selectedIds.size > 0) {
            optimizeBulkPayment();
        } else {
            setAIOptimization(null);
        }
    }, [selectedIds]);

    const fetchPendingInvoices = async () => {
        // TODO: Fetch from actual API
        // Mock data
        const mockInvoices: Invoice[] = [
            {
                id: 'inv1',
                number: 'INV-001',
                vendor: 'ABC Consulting',
                amount: 25000,
                dueDate: '2025-12-20',
                status: 'pending',
            },
            {
                id: 'inv2',
                number: 'INV-002',
                vendor: 'Tech Solutions',
                amount: 18000,
                dueDate: '2025-12-22',
                status: 'pending',
            },
            {
                id: 'inv3',
                number: 'INV-003',
                vendor: 'Global Services',
                amount: 32000,
                dueDate: '2025-12-25',
                status: 'pending',
            },
            {
                id: 'inv4',
                number: 'INV-004',
                vendor: 'Local Supplies',
                amount: 15000,
                dueDate: '2025-12-18',
                status: 'pending',
            },
        ];

        setInvoices(mockInvoices);
    };

    const optimizeBulkPayment = async () => {
        // AI optimization logic
        const selectedInvoices = invoices.filter(inv => selectedIds.has(inv.id));
        const totalAmount = selectedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        
        const optimization = {
            suggestedPaymentMethod: 'UPI',
            estimatedTimeSavings: selectedInvoices.length * 5, // 5 minutes per payment
            cashbackPotential: totalAmount * 0.01, // 1% cashback
            recommendedSchedule: 'Pay high-amount invoices first',
        };

        setAIOptimization(optimization);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === invoices.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(invoices.map(inv => inv.id)));
        }
    };

    const handleSelectInvoice = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkPayment = async () => {
        if (selectedIds.size === 0) {
            setToastMessage('Please select at least one invoice');
            setToastType('error');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            return;
        }

        setLoading(true);
        try {
            // TODO: Integrate with actual payment API
            const selectedInvoices = invoices.filter(inv => selectedIds.has(inv.id));
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));

            setToastMessage(`Successfully processed ${selectedInvoices.length} payments`);
            setToastType('success');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            
            onPaymentSuccess();
        } catch (error) {
            setToastMessage('Payment processing failed. Please try again.');
            setToastType('error');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'green';
            case 'pending':
                return 'orange';
            case 'overdue':
                return 'red';
            default:
                return 'gray';
        }
    };

    const selectedInvoices = invoices.filter(inv => selectedIds.has(inv.id));
    const totalAmount = selectedInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    return (
        <div className="bulk-payment-container">
            <VStack gap={6} align="stretch">
                {/* Header */}
                <h2 className="heading heading-lg color-gray-800">
                    <Icon as={FiCreditCard} className="icon mr-2" />
                    Bulk Payment Processor
                </h2>

                {/* Stats Overview */}
                <div className="stats-grid">
                    <div className="stat-card bg-gradient-to-br bg-blue-50 border-top-4 border-blue-500">
                        <div className="stat">
                            <div className="stat-label">Pending Invoices</div>
                            <div className="stat-number">{invoices.length}</div>
                            <div className="stat-help-text">
                                <Icon as={FiCheck} className="icon mr-1" />
                                Ready for processing
                            </div>
                        </div>
                    </div>

                    <div className="stat-card bg-gradient-to-br bg-green-50 border-top-4 border-green-500">
                        <div className="stat">
                            <div className="stat-label">Selected</div>
                            <div className="stat-number">{selectedIds.size}</div>
                            <div className="stat-help-text">
                                <Icon as={FiCheck} className="icon mr-1" />
                                For bulk payment
                            </div>
                        </div>
                    </div>

                    <div className="stat-card bg-gradient-to-br bg-orange-50 border-top-4 border-orange-500">
                        <div className="stat">
                            <div className="stat-label">Total Amount</div>
                            <div className="stat-number">₹{(totalAmount / 1000).toFixed(0)}K</div>
                            <div className="stat-help-text">
                                <Icon as={FiCreditCard} className="icon mr-1" />
                                Selected invoices
                            </div>
                        </div>
                    </div>

                    <div className="stat-card bg-gradient-to-br bg-purple-50 border-top-4 border-purple-500">
                        <div className="stat">
                            <div className="stat-label">Time Savings</div>
                            <div className="stat-number">{aiOptimization ? aiOptimization.estimatedTimeSavings : 0} min</div>
                            <div className="stat-help-text">
                                <Icon as={FiZap} className="icon mr-1" />
                                AI-optimized
                            </div>
                        </div>
                    </div>
                </div>

                {/* Invoice Selection */}
                <div className="card">
                    <div className="card-header">
                        <div className="selection-header">
                            <div className="selection-info">
                                <div className="checkbox">
                                    <input
                                        type="checkbox"
                                        className="checkbox-input"
                                        checked={selectedIds.size === invoices.length && invoices.length > 0}
                                        onChange={handleSelectAll}
                                    />
                                    <span className="checkbox-label">Select All</span>
                                </div>
                                <div className="selected-count">
                                    {selectedIds.size} of {invoices.length} selected
                                </div>
                                <div className="total-amount">
                                    Total: ₹{totalAmount.toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div className="payment-actions">
                                <button
                                    className="button button-outline button-sm"
                                    onClick={() => setSelectedIds(new Set())}
                                    disabled={selectedIds.size === 0}
                                >
                                    Clear Selection
                                </button>
                                <button
                                    className={`button button-green button-sm ${loading ? 'loading' : ''}`}
                                    onClick={handleBulkPayment}
                                    disabled={selectedIds.size === 0 || loading}
                                >
                                    {loading ? 'Processing...' : `Pay ${selectedIds.size} Invoices`}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="card-body pt-0">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px' }}></th>
                                    <th>Invoice</th>
                                    <th>Vendor</th>
                                    <th>Amount</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((invoice) => (
                                    <tr 
                                        key={invoice.id} 
                                        className={`invoice-row ${selectedIds.has(invoice.id) ? 'selected' : ''}`}
                                    >
                                        <td>
                                            <input
                                                type="checkbox"
                                                className="checkbox-input invoice-checkbox"
                                                checked={selectedIds.has(invoice.id)}
                                                onChange={() => handleSelectInvoice(invoice.id)}
                                            />
                                        </td>
                                        <td>
                                            <div className="invoice-details">
                                                <span className="invoice-number">{invoice.number}</span>
                                            </div>
                                        </td>
                                        <td>{invoice.vendor}</td>
                                        <td>
                                            <span className="invoice-amount">
                                                ₹{invoice.amount.toLocaleString('en-IN')}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="invoice-due-date">
                                                {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                                            </span>
                                        </td>
                                        <td>
                                            <Badge className={`badge badge-${getStatusColor(invoice.status)}`}>
                                                {invoice.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* AI Optimization */}
                {aiOptimization && (
                    <div className="ai-optimization">
                        <div className="ai-title">
                            <Icon as={FiZap} className="icon" />
                            AI Payment Optimization
                        </div>
                        <div className="v-stack gap-3">
                            <div className="ai-suggestion">
                                <Icon as={FiCreditCard} className="ai-icon" />
                                <span className="ai-text">
                                    Use {aiOptimization.suggestedPaymentMethod} for best cashback rewards
                                </span>
                            </div>
                            <div className="ai-suggestion">
                                <Icon as={FiZap} className="ai-icon" />
                                <span className="ai-text">
                                    Save {aiOptimization.estimatedTimeSavings} minutes with optimized processing
                                </span>
                            </div>
                            <div className="ai-suggestion">
                                <Icon as={FiCheck} className="ai-icon" />
                                <span className="ai-text">
                                    {aiOptimization.recommendedSchedule}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Summary */}
                {selectedIds.size > 0 && (
                    <div className="payment-summary">
                        <h3 className="summary-title">Payment Summary</h3>
                        <div className="summary-row">
                            <span className="summary-label">Number of Invoices</span>
                            <span className="summary-value">{selectedIds.size}</span>
                        </div>
                        <div className="summary-row">
                            <span className="summary-label">Subtotal</span>
                            <span className="summary-value">₹{totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="summary-row">
                            <span className="summary-label">Processing Fee</span>
                            <span className="summary-value">₹0</span>
                        </div>
                        {aiOptimization && (
                            <div className="summary-row">
                                <span className="summary-label">Estimated Cashback</span>
                                <span className="summary-value color-green-600">
                                    +₹{aiOptimization.cashbackPotential.toLocaleString('en-IN')}
                                </span>
                            </div>
                        )}
                        <div className="summary-row total">
                            <span className="summary-label">Total Amount</span>
                            <span className="summary-value">
                                ₹{totalAmount.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {invoices.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">📄</div>
                        <div className="empty-state-text">No pending invoices</div>
                        <div className="empty-state-subtext">
                            All your invoices have been paid
                        </div>
                    </div>
                )}
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

export default BulkPaymentProcessor;
