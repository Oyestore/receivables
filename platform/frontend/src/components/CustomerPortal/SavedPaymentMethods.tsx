import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    Icon,
    Badge,
} from '@chakra-ui/react';
import { FiCreditCard, FiSmartphone, FiTrash2, FiPlus, FiCheck } from 'react-icons/fi';
import { SiGooglepay, SiPhonepe, SiPaytm } from 'react-icons/si';
import './SavedPaymentMethods.css';

interface PaymentMethod {
    id: string;
    type: 'upi' | 'card' | 'netbanking';
    provider: string;
    identifier: string; // UPI ID, last 4 digits, bank name
    isDefault: boolean;
    lastUsed: Date;
}

interface SavedPaymentMethodsProps {
    customerId: string;
    onMethodSelected?: (method: PaymentMethod) => void;
}

const SavedPaymentMethods: React.FC<SavedPaymentMethodsProps> = ({
    customerId,
    onMethodSelected,
}) => {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [selectedId, setSelectedId] = useState<string>('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        fetchPaymentMethods();
    }, [customerId]);

    const fetchPaymentMethods = async () => {
        // TODO: Fetch from API
        const mockMethods: PaymentMethod[] = [
            {
                id: 'pm1',
                type: 'upi',
                provider: 'phonepe',
                identifier: '9876543210@ybl',
                isDefault: true,
                lastUsed: new Date('2025-12-10'),
            },
            {
                id: 'pm2',
                type: 'upi',
                provider: 'gpay',
                identifier: 'user@okaxis',
                isDefault: false,
                lastUsed: new Date('2025-11-28'),
            },
            {
                id: 'pm3',
                type: 'card',
                provider: 'visa',
                identifier: '**** **** **** 1234',
                isDefault: false,
                lastUsed: new Date('2025-11-15'),
            },
            {
                id: 'pm4',
                type: 'netbanking',
                provider: 'hdfc',
                identifier: 'HDFC Bank',
                isDefault: false,
                lastUsed: new Date('2025-10-20'),
            },
        ];

        setMethods(mockMethods);
        if (mockMethods.length > 0) {
            const defaultMethod = mockMethods.find(m => m.isDefault) || mockMethods[0];
            setSelectedId(defaultMethod.id);
        }
    };

    const handleSelectMethod = (method: PaymentMethod) => {
        setSelectedId(method.id);
        if (onMethodSelected) {
            onMethodSelected(method);
        }
    };

    const handleSetDefault = async (methodId: string) => {
        setMethods(prev => prev.map(method =>
            method.id === methodId ? { ...method, isDefault: true } : { ...method, isDefault: false }
        ));

        setToastMessage('Default payment method updated');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleDeleteMethod = async (methodId: string) => {
        setMethods(prev => prev.filter(method => method.id !== methodId));

        if (selectedId === methodId && methods.length > 1) {
            const remainingMethods = methods.filter(m => m.id !== methodId);
            if (remainingMethods.length > 0) {
                setSelectedId(remainingMethods[0].id);
            }
        }

        setToastMessage('Payment method deleted');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleAddMethod = () => {
        const newMethod: PaymentMethod = {
            id: `pm${methods.length + 1}`,
            type: 'upi',
            provider: 'paytm',
            identifier: 'newuser@paytm',
            isDefault: false,
            lastUsed: new Date(),
        };

        setMethods(prev => [...prev, newMethod]);
        setShowAddForm(false);

        setToastMessage('New payment method added');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getProviderIcon = (provider: string, type: string) => {
        if (type === 'upi') {
            switch (provider) {
                case 'phonepe':
                    return <SiPhonepe size={20} />;
                case 'gpay':
                    return <SiGooglepay size={20} />;
                case 'paytm':
                    return <SiPaytm size={20} />;
                default:
                    return <FiSmartphone size={20} />;
            }
        } else if (type === 'card') {
            return <FiCreditCard size={20} />;
        } else {
            return <FiSmartphone size={20} />;
        }
    };

    const getProviderName = (provider: string, type: string) => {
        if (type === 'upi') {
            switch (provider) {
                case 'phonepe':
                    return 'PhonePe';
                case 'gpay':
                    return 'Google Pay';
                case 'paytm':
                    return 'Paytm';
                default:
                    return provider;
            }
        } else if (type === 'card') {
            return provider.toUpperCase();
        } else {
            return provider;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'upi':
                return 'upi';
            case 'card':
                return 'credit-card';
            case 'netbanking':
                return 'bank';
            default:
                return 'credit-card';
        }
    };

    return (
        <div className="saved-payment-methods">
            <VStack gap={6} align="stretch">
                {/* Header */}
                <div className="methods-header">
                    <h2 className="methods-title">
                        <Icon as={FiCreditCard} className="icon mr-2" />
                        Saved Payment Methods
                    </h2>
                    <div className="methods-actions">
                        <button className="button button-blue button-sm" onClick={() => setShowAddForm(true)}>
                            <Icon as={FiPlus} className="icon mr-1" />
                            Add Method
                        </button>
                    </div>
                </div>

                {/* Payment Methods List */}
                <div className="payment-methods-list">
                    {methods.map((method) => (
                        <div
                            key={method.id}
                            className={`payment-method-card ${selectedId === method.id ? 'selected' : ''}`}
                            onClick={() => handleSelectMethod(method)}
                        >
                            <div className="method-header">
                                <div className="method-info">
                                    <div className="method-type">
                                        <div className={`method-icon ${getTypeIcon(method.type)}`}>
                                            {getProviderIcon(method.provider, method.type)}
                                        </div>
                                        <div className="method-details">
                                            <div className="method-name">{getProviderName(method.provider, method.type)}</div>
                                            <div className="method-description">{method.identifier}</div>
                                        </div>
                                    </div>
                                    {method.isDefault && (
                                        <div className="default-method-indicator">
                                            <Icon as={FiCheck} className="icon mr-1" />
                                            Default
                                        </div>
                                    )}
                                </div>
                                <div className="method-actions">
                                    {!method.isDefault && (
                                        <button
                                            className="button button-ghost button-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSetDefault(method.id);
                                            }}
                                            title="Set as default"
                                        >
                                            Set Default
                                        </button>
                                    )}
                                    <button
                                        className="icon-button danger"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteMethod(method.id);
                                        }}
                                        title="Delete method"
                                    >
                                        <Icon as={FiTrash2} className="icon" />
                                    </button>
                                </div>
                            </div>
                            <div className="method-content">
                                <div className="method-field">
                                    <div className="field-label">Type</div>
                                    <div className="field-value">
                                        <Badge className={`badge badge-${method.type === 'upi' ? 'green' : method.type === 'card' ? 'blue' : 'orange'}`}>
                                            {method.type.toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="method-field">
                                    <div className="field-label">Last Used</div>
                                    <div className="field-value">{formatDate(method.lastUsed)}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add Payment Method Form */}
                {showAddForm && (
                    <div className="add-payment-form">
                        <div className="form-header">
                            <h3 className="form-title">Add Payment Method</h3>
                            <button className="button button-outline button-sm" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </button>
                        </div>
                        <div className="form-content">
                            {/* Payment Type Selection */}
                            <div className="payment-type-selection">
                                <div className="type-option selected">
                                    <div className="type-icon upi">
                                        <FiSmartphone size={20} />
                                    </div>
                                    <div className="type-content">
                                        <div className="type-title">UPI</div>
                                        <div className="type-description">Pay using PhonePe, Google Pay, Paytm, etc.</div>
                                    </div>
                                </div>
                                <div className="type-option">
                                    <div className="type-icon credit-card">
                                        <FiCreditCard size={20} />
                                    </div>
                                    <div className="type-content">
                                        <div className="type-title">Credit/Debit Card</div>
                                        <div className="type-description">Visa, Mastercard, RuPay, and more</div>
                                    </div>
                                </div>
                                <div className="type-option">
                                    <div className="type-icon bank">
                                        <FiSmartphone size={20} />
                                    </div>
                                    <div className="type-content">
                                        <div className="type-title">Net Banking</div>
                                        <div className="type-description">Direct bank transfer</div>
                                    </div>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="form-group">
                                <label className="form-label required">Select Provider</label>
                                <select className="form-select">
                                    <option value="">Choose a provider</option>
                                    <option value="phonepe">PhonePe</option>
                                    <option value="gpay">Google Pay</option>
                                    <option value="paytm">Paytm</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label required">UPI ID</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter your UPI ID (e.g., 9876543210@ybl)"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    <input type="checkbox" /> Set as default payment method
                                </label>
                            </div>

                            <div className="form-actions">
                                <button className="button button-outline button-sm" onClick={() => setShowAddForm(false)}>
                                    Cancel
                                </button>
                                <button className="button button-blue button-sm" onClick={handleAddMethod}>
                                    <Icon as={FiPlus} className="icon mr-1" />
                                    Add Method
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Security Notice */}
                <div className="security-notice">
                    <div className="notice-header">
                        <Icon as={FiCheck} className="icon color-green-600" />
                        <div className="notice-title">Secure Payments</div>
                    </div>
                    <div className="notice-description">
                        Your payment information is encrypted and securely stored. We comply with PCI DSS standards to ensure your data is protected.
                    </div>
                </div>

                {/* Empty State */}
                {methods.length === 0 && !showAddForm && (
                    <div className="empty-state">
                        <div className="empty-state-icon">💳</div>
                        <div className="empty-state-text">No payment methods saved</div>
                        <div className="empty-state-subtext">
                            Add a payment method to make quick and secure payments
                        </div>
                        <button className="button button-blue button-sm mt-4" onClick={() => setShowAddForm(true)}>
                            <Icon as={FiPlus} className="icon mr-1" />
                            Add Your First Method
                        </button>
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

export default SavedPaymentMethods;
