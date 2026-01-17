import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    Icon,
} from '@chakra-ui/react';
import { FiCreditCard, FiSmartphone } from 'react-icons/fi';
import axios from 'axios';
import './PaymentModal.css';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
    sessionId: string;
    onPaymentSuccess: () => void;
}

// Load Razorpay script
const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    invoice,
    sessionId,
    onPaymentSuccess,
}) => {
    const [loading, setLoading] = useState(false);
    const [razorpayLoaded, setRazorpayLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState('card');
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        loadScript();
    }, []);

    const loadScript = async (): Promise<void> => {
        const loaded = await loadRazorpayScript();
        setRazorpayLoaded(loaded);
    };

    const handlePayment = async (method: string) => {
        if (!razorpayLoaded) {
            setToastMessage('Payment gateway is loading...');
            setToastType('error');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            return;
        }

        setLoading(true);
        try {
            // Create Razorpay order
            const orderResponse = await axios.post('/api/payments/create-order', {
                amount: invoice.amount * 100, // Convert to paise
                currency: 'INR',
                receipt: `receipt_${invoice.id}`,
                sessionId,
            });

            const { data: orderData } = orderResponse;

            const options = {
                key: 'rzp_test_your_key_here', // Replace with actual key
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'SME Platform',
                description: `Payment for Invoice ${invoice.id}`,
                order_id: orderData.id,
                handler: async (response: any) => {
                    try {
                        // Verify payment
                        const verifyResponse = await axios.post('/api/payments/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            invoiceId: invoice.id,
                            sessionId,
                        });

                        if (verifyResponse.data.success) {
                            setToastMessage('Payment successful!');
                            setToastType('success');
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                            onPaymentSuccess();
                            onClose();
                        } else {
                            throw new Error('Payment verification failed');
                        }
                    } catch (error) {
                        setToastMessage('Payment verification failed');
                        setToastType('error');
                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 3000);
                    }
                },
                prefill: {
                    name: 'Customer Name',
                    email: 'customer@example.com',
                    contact: '9999999999',
                },
                theme: {
                    color: '#3182ce',
                },
            };

            const razorpay = new (window as any).Razorpay(options);
            razorpay.open();
        } catch (error) {
            setToastMessage('Payment failed. Please try again.');
            setToastType('error');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="modal-header">
                        <h2 className="modal-title">Complete Payment</h2>
                        <button className="modal-close" onClick={onClose}>
                            ×
                        </button>
                    </div>
                    <div className="modal-body">
                        <VStack gap={6} align="stretch">
                            {/* Invoice Summary */}
                            <div className="summary-section">
                                <h3 className="summary-title">Invoice Details</h3>
                                <div className="summary-row">
                                    <span className="summary-label">Invoice Number</span>
                                    <span className="summary-value">{invoice.id}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Due Date</span>
                                    <span className="summary-value">
                                        {new Date(invoice.dueDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Amount</span>
                                    <span className="summary-value">₹{invoice.amount.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">GST (18%)</span>
                                    <span className="summary-value">₹{(invoice.amount * 0.18).toLocaleString('en-IN')}</span>
                                </div>
                                <div className="summary-total">
                                    <div className="summary-row">
                                        <span className="summary-label">Total Amount</span>
                                        <span className="summary-value">
                                            ₹{(invoice.amount * 1.18).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Tabs */}
                            <div className="tabs">
                                <div className="tab-list">
                                    <button
                                        className={`tab ${activeTab === 'card' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('card')}
                                    >
                                        <Icon as={FiCreditCard} className="icon mr-2" />
                                        Card Payment
                                    </button>
                                    <button
                                        className={`tab ${activeTab === 'upi' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('upi')}
                                    >
                                        <Icon as={FiSmartphone} className="icon mr-2" />
                                        UPI Payment
                                    </button>
                                </div>

                                <div className="tab-panels">
                                    {/* Card Payment Tab */}
                                    <div className={`tab-panel ${activeTab === 'card' ? 'active' : ''}`}>
                                        <VStack gap={4} align="stretch">
                                            <div className="form-control">
                                                <label className="form-label">Card Number</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="1234 5678 9012 3456"
                                                    maxLength={19}
                                                />
                                            </div>
                                            <div className="h-stack gap-4">
                                                <div className="form-control flex-1">
                                                    <label className="form-label">Expiry Date</label>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        placeholder="MM/YY"
                                                        maxLength={5}
                                                    />
                                                </div>
                                                <div className="form-control flex-1">
                                                    <label className="form-label">CVV</label>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        placeholder="123"
                                                        maxLength={3}
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-control">
                                                <label className="form-label">Cardholder Name</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="John Doe"
                                                />
                                            </div>
                                            <div className="checkbox">
                                                <input type="checkbox" className="checkbox-input" />
                                                <span className="checkbox-label">Save card for future payments</span>
                                            </div>
                                        </VStack>
                                    </div>

                                    {/* UPI Payment Tab */}
                                    <div className={`tab-panel ${activeTab === 'upi' ? 'active' : ''}`}>
                                        <VStack gap={4} align="stretch">
                                            <div className="form-control">
                                                <label className="form-label">UPI ID</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="username@upi"
                                                />
                                            </div>
                                            <div className="form-control">
                                                <label className="form-label">Or select UPI app</label>
                                                <div className="v-stack gap-2">
                                                    <div className="payment-method">
                                                        <div className="payment-icon">
                                                            <Icon as={FiSmartphone} />
                                                        </div>
                                                        <div className="payment-details">
                                                            <div className="payment-name">PhonePe</div>
                                                            <div className="payment-description">Pay using PhonePe app</div>
                                                        </div>
                                                    </div>
                                                    <div className="payment-method">
                                                        <div className="payment-icon">
                                                            <Icon as={FiSmartphone} />
                                                        </div>
                                                        <div className="payment-details">
                                                            <div className="payment-name">Google Pay</div>
                                                            <div className="payment-description">Pay using Google Pay app</div>
                                                        </div>
                                                    </div>
                                                    <div className="payment-method">
                                                        <div className="payment-icon">
                                                            <Icon as={FiSmartphone} />
                                                        </div>
                                                        <div className="payment-details">
                                                            <div className="payment-name">Paytm</div>
                                                            <div className="payment-description">Pay using Paytm app</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </VStack>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Actions */}
                            <div className="v-stack gap-3">
                                <button
                                    className={`button button-blue button-lg button-full ${loading ? 'loading' : ''}`}
                                    onClick={() => handlePayment(activeTab)}
                                    disabled={loading}
                                >
                                    {loading ? 'Processing...' : `Pay ₹${(invoice.amount * 1.18).toLocaleString('en-IN')}`}
                                </button>
                                <button
                                    className="button button-outline button-full"
                                    onClick={onClose}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                            </div>

                            {/* Security Note */}
                            <div className="text-center">
                                <span className="text text-xs color-gray-500">
                                    🔒 Secured by Razorpay • Your payment information is encrypted and secure
                                </span>
                            </div>
                        </VStack>
                    </div>
                </div>
            </div>

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

export default PaymentModal;
