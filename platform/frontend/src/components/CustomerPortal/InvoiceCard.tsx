import React, { useState } from 'react';
import {
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiDownload, FiAlertCircle, FiCheck, FiCreditCard } from 'react-icons/fi';
import PaymentModal from './PaymentModal';
import './InvoiceCard.css';

interface InvoiceCardProps {
    invoice: any;
    sessionId: string;
    onPaymentComplete: () => void;
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({
    invoice,
    sessionId,
    onPaymentComplete,
}) => {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'green';
            case 'pending':
                return 'orange';
            case 'overdue':
                return 'red';
            case 'draft':
                return 'gray';
            default:
                return 'gray';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid':
                return FiCheck;
            case 'pending':
                return FiCreditCard;
            case 'overdue':
                return FiAlertCircle;
            default:
                return FiCreditCard;
        }
    };

    const handleDownload = () => {
        setToastMessage('Invoice downloaded successfully');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handlePayment = () => {
        setIsPaymentModalOpen(true);
    };

    const handlePaymentComplete = () => {
        setIsPaymentModalOpen(false);
        onPaymentComplete();
        setToastMessage('Payment completed successfully');
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

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const subtotal = invoice.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0) || invoice.amount || 0;
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;

    return (
        <>
            <div className="invoice-card">
                {/* Invoice Header */}
                <div className="invoice-header">
                    <div className="h-stack justify-between">
                        <div>
                            <div className="invoice-number">{invoice.invoiceNumber || `INV-${invoice.id}`}</div>
                            <div className="invoice-date">
                                Due: {formatDate(invoice.dueDate)}
                            </div>
                        </div>
                        <div className={`invoice-status ${invoice.status}`}>
                            <span className={`status-dot ${invoice.status}`}></span>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </div>
                    </div>
                </div>

                {/* Invoice Body */}
                <div className="invoice-body">
                    {/* Vendor/Customer Info */}
                    <div className="invoice-section">
                        <div className="invoice-details">
                            <div className="detail-item">
                                <span className="detail-label">Vendor</span>
                                <span className="detail-value">{invoice.vendor?.name || 'Unknown Vendor'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Invoice Date</span>
                                <span className="detail-value">{formatDate(invoice.invoiceDate)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Payment Terms</span>
                                <span className="detail-value">{invoice.paymentTerms || 'Net 30'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Category</span>
                                <span className="detail-value">{invoice.category || 'General'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Amount */}
                    <div className="invoice-section">
                        <div className={`invoice-amount ${invoice.status}`}>
                            {formatCurrency(total)}
                        </div>
                    </div>

                    {/* Invoice Items */}
                    {invoice.items && invoice.items.length > 0 && (
                        <div className="invoice-section">
                            <h4 className="section-title">Invoice Items</h4>
                            <table className="table invoice-items">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th className="text-center">Qty</th>
                                        <th className="text-right">Price</th>
                                        <th className="text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.items.map((item: any, index: number) => (
                                        <tr key={index}>
                                            <td>
                                                <div className="item-name">{item.name}</div>
                                                {item.description && (
                                                    <div className="item-description">{item.description}</div>
                                                )}
                                            </td>
                                            <td className="item-quantity">{item.quantity}</td>
                                            <td className="item-price">{formatCurrency(item.price)}</td>
                                            <td className="item-total">{formatCurrency(item.quantity * item.price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Invoice Summary */}
                    <div className="invoice-summary">
                        <div className="summary-row">
                            <span className="summary-label">Subtotal</span>
                            <span className="summary-value">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="summary-row">
                            <span className="summary-label">GST (18%)</span>
                            <span className="summary-value">{formatCurrency(tax)}</span>
                        </div>
                        {invoice.discount && (
                            <div className="summary-row">
                                <span className="summary-label">Discount</span>
                                <span className="summary-value">-{formatCurrency(invoice.discount)}</span>
                            </div>
                        )}
                        <div className="summary-row total">
                            <span className="summary-label">Total Amount</span>
                            <span className="summary-value">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="invoice-actions">
                        {invoice.status === 'pending' && (
                            <button
                                className="button button-blue button-sm"
                                onClick={handlePayment}
                            >
                                <Icon as={FiCreditCard} className="icon mr-1" />
                                Pay Now
                            </button>
                        )}
                        <button
                            className="button button-outline button-sm"
                            onClick={handleDownload}
                        >
                            <Icon as={FiDownload} className="icon mr-1" />
                            Download
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                invoice={invoice}
                sessionId={sessionId}
                onPaymentSuccess={handlePaymentComplete}
            />

            {/* Toast Notification */}
            {showToast && (
                <div className={`toast toast-${toastType}`}>
                    <div className="toast-title">
                        {toastType === 'success' ? 'Success' : 'Error'}
                    </div>
                    <div className="toast-message">{toastMessage}</div>
                </div>
            )}
        </>
    );
};

export default InvoiceCard;
