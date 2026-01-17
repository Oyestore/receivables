import React, { useState } from 'react';
import {
    CreditCard,
    Globe,
    Wallet,
    Building2,
    Check,
    ArrowRight,
    Info,
    Lock,
    Zap,
} from 'lucide-react';
import '../styles/design-system.css';

/**
 * Gateway Selector Component
 * 
 * Beautiful gateway selection interface with:
 * - Domestic vs International tabs
 * - Gateway cards with features
 * - Real-time fee calculation
 * - Recommended gateway highlighting
 * - Smooth animations
 */
const GatewaySelector = ({ amount, currency, onSelect }) => {
    const [selectedTab, setSelectedTab] = useState('domestic');
    const [selectedGateway, setSelectedGateway] = useState(null);

    const domesticGateways = [
        {
            id: 'razorpay',
            name: 'Razorpay',
            icon: '💳',
            tagline: 'Most Popular',
            fee: 2.0,
            features: ['UPI', 'Cards', 'Net Banking', 'Wallets'],
            processingTime: 'Instant',
            recommended: true,
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
        {
            id: 'phonepe',
            name: 'PhonePe',
            icon: '📱',
            tagline: 'UPI Specialist',
            fee: 1.5,
            features: ['UPI', 'Wallets'],
            processingTime: 'Instant',
            gradient: 'linear-gradient(135deg, #5f2c82 0%, #49a09d 100%)',
        },
        {
            id: 'payu',
            name: 'PayU',
            icon: '🏦',
            tagline: 'Trusted Partner',
            fee: 2.5,
            features: ['Cards', 'Net Banking', 'EMI'],
            processingTime: '1-2 hours',
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        },
    ];

    const internationalGateways = [
        {
            id: 'stripe',
            name: 'Stripe',
            icon: '🌍',
            tagline: 'Global Leader',
            fee: 2.9,
            fixedFee: 0.30,
            features: ['Cards', '3D Secure', '135+ Currencies'],
            processingTime: 'Instant',
            recommended: true,
            gradient: 'linear-gradient(135deg, #6772e5 0%, #5469d4 100%)',
        },
        {
            id: 'paypal',
            name: 'PayPal',
            icon: '💼',
            tagline: 'Trusted Worldwide',
            fee: 3.5,
            fixedFee: 0.35,
            features: ['PayPal Balance', 'Cards', 'Buyer Protection'],
            processingTime: 'Instant',
            gradient: 'linear-gradient(135deg, #0070ba 0%, #1546a0 100%)',
        },
    ];

    const gateways = selectedTab === 'domestic' ? domesticGateways : internationalGateways;

    const calculateFee = (gateway) => {
        const percentageFee = amount * (gateway.fee / 100);
        const fixedFee = gateway.fixedFee || 0;
        return percentageFee + fixedFee;
    };

    const handleSelect = (gateway) => {
        setSelectedGateway(gateway.id);
        setTimeout(() => {
            onSelect?.(gateway);
        }, 300);
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
            {/* Header */}
            <div className="text-center mb-lg fade-in">
                <h1 className="text-3xl font-bold mb-sm">Select Payment Gateway</h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Choose the best payment method for your transaction
                </p>
                {amount && (
                    <div className="stat-value mt-md" style={{ fontSize: '2.5rem' }}>
                        {new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: currency || 'INR',
                        }).format(amount)}
                    </div>
                )}
            </div>

            {/* Tab Switcher */}
            <div className="glass-card mb-lg fade-in" style={{ animationDelay: '50ms', padding: '0.5rem' }}>
                <div className="grid grid-cols-2 gap-sm">
                    <button
                        className={`btn ${selectedTab === 'domestic' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setSelectedTab('domestic')}
                        style={{ padding: '1rem' }}
                    >
                        <Building2 size={20} />
                        Domestic (India)
                    </button>
                    <button
                        className={`btn ${selectedTab === 'international' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setSelectedTab('international')}
                        style={{ padding: '1rem' }}
                    >
                        <Globe size={20} />
                        International
                    </button>
                </div>
            </div>

            {/* Gateway Cards */}
            <div className="grid grid-cols-1 gap-lg">
                {gateways.map((gateway, index) => (
                    <div
                        key={gateway.id}
                        className="gradient-card fade-in"
                        style={{
                            animationDelay: `${100 + index * 50}ms`,
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'visible',
                            border: selectedGateway === gateway.id ? '2px solid var(--primary-500)' : '1px solid var(--border-color)',
                            transform: selectedGateway === gateway.id ? 'scale(1.02)' : 'scale(1)',
                            transition: 'all var(--transition-base)',
                        }}
                        onClick={() => handleSelect(gateway)}
                    >
                        {/* Recommended Badge */}
                        {gateway.recommended && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    right: '20px',
                                    padding: '0.25rem 0.75rem',
                                    background: 'var(--success-gradient)',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: 'white',
                                    boxShadow: 'var(--shadow-lg)',
                                }}
                            >
                                <Zap size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                RECOMMENDED
                            </div>
                        )}

                        <div className="flex items-start gap-lg">
                            {/* Icon */}
                            <div
                                style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: 'var(--radius-xl)',
                                    background: gateway.gradient,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '3rem',
                                    flexShrink: 0,
                                }}
                            >
                                {gateway.icon}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1 }}>
                                <div className="flex items-center justify-between mb-sm">
                                    <div>
                                        <h3 className="text-2xl font-bold">{gateway.name}</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                            {gateway.tagline}
                                        </p>
                                    </div>
                                    {selectedGateway === gateway.id && (
                                        <div
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: 'var(--radius-full)',
                                                background: 'var(--success-gradient)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Check size={24} color="white" />
                                        </div>
                                    )}
                                </div>

                                {/* Features */}
                                <div className="flex gap-sm mb-md" style={{ flexWrap: 'wrap' }}>
                                    {gateway.features.map((feature) => (
                                        <span key={feature} className="badge badge-info">
                                            {feature}
                                        </span>
                                    ))}
                                </div>

                                {/* Fees & Timing */}
                                <div className="flex items-center justify-between">
                                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                                Processing Fee
                                            </div>
                                            <div className="font-bold">
                                                {gateway.fee}% {gateway.fixedFee && `+ $${gateway.fixedFee}`}
                                            </div>
                                            {amount && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    ≈ {new Intl.NumberFormat('en-IN', {
                                                        style: 'currency',
                                                        currency: currency || 'INR',
                                                    }).format(calculateFee(gateway))}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>
                                                Processing Time
                                            </div>
                                            <div className="font-bold">{gateway.processingTime}</div>
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-primary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelect(gateway);
                                        }}
                                        style={{ minWidth: '120px' }}
                                    >
                                        Select
                                        <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Security Notice */}
            <div className="glass-card mt-lg fade-in" style={{ animationDelay: '300ms', textAlign: 'center' }}>
                <div className="flex items-center justify-center gap-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Lock size={16} />
                    <span style={{ fontSize: '0.875rem' }}>
                        All payments are secured with 256-bit SSL encryption and PCI DSS Level 1 compliance
                    </span>
                </div>
            </div>
        </div>
    );
};

export default GatewaySelector;
