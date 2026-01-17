import React, { useState, useEffect } from 'react';
import {
    Smartphone,
    QrCode,
    Copy,
    Check,
    Clock,
    ArrowRight,
    Loader,
    CheckCircle_2,
    XCircle,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';
import '../styles/design-system.css';

// Payment provider logos (using gradient placeholders)
const ProviderLogos = {
    phonepe: '🟣',
    googlepay: '🟢',
    paytm: '🔵',
    bhim: '🟠',
};

/**
 * Premium UPI Payment Interface
 * 
 * Features:
 * - Dynamic QR code display with auto-refresh
 * - VPA input with real-time validation
 * - Provider selection with smooth transitions
 * - Payment status tracking with animations
 * - Timeout countdown
 * - Copy-to-clipboard with feedback
 * - Beautiful glassmorphism design
 */
const UpiPaymentInterface = ({ amount, invoiceId, onSuccess, onCancel }) => {
    const [selectedProvider, setSelectedProvider] = useState('phonepe');
    const [vpa, setVpa] = useState('');
    const [vpaValid, setVpaValid] = useState(null);
    const [paymentMode, setPaymentMode] = useState('qr'); // 'qr' or 'collect'
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [upiLink, setUpiLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, checking, success, failed, expired
    const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Generate QR code on mount
        generatePayment();

        // Start countdown timer
        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setPaymentStatus('expired');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Poll for payment status
        const statusCheck = setInterval(checkPaymentStatus, 3000);

        return () => {
            clearInterval(timer);
            clearInterval(statusCheck);
        };
    }, [selectedProvider]);

    const generatePayment = async () => {
        setLoading(true);
        try {
            // Mock API call - replace with actual API
            const response = await fetch('/api/upi/generate-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: selectedProvider,
                    amount,
                    invoiceId,
                    mode: paymentMode,
                }),
            });

            const data = await response.json();
            setQrCodeUrl(data.qrCodeDataUrl);
            setUpiLink(data.upiLink);
        } catch (error) {
            console.error('Failed to generate QR:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkPaymentStatus = async () => {
        if (paymentStatus !== 'pending') return;

        try {
            const response = await fetch(`/api/upi/status/${invoiceId}`);
            const data = await response.json();

            if (data.status === 'completed') {
                setPaymentStatus('success');
                setTimeout(() => onSuccess?.(data), 1500);
            } else if (data.status === 'failed') {
                setPaymentStatus('failed');
            }
        } catch (error) {
            // Silent fail for status check
        }
    };

    const validateVPA = async (value) => {
        if (!value) {
            setVpaValid(null);
            return;
        }

        const vpaRegex = /^[\w.-]+@[\w.-]+$/;
        if (!vpaRegex.test(value)) {
            setVpaValid(false);
            return;
        }

        try {
            const response = await fetch(`/api/upi/validate-vpa?vpa=${value}`);
            const data = await response.json();
            setVpaValid(data.valid);
        } catch (error) {
            setVpaValid(false);
        }
    };

    const handleVpaChange = (e) => {
        const value = e.target.value;
        setVpa(value);
        // Debounce validation
        clearTimeout(window.vpaValidationTimeout);
        window.vpaValidationTimeout = setTimeout(() => validateVPA(value), 500);
    };

    const initiateCollectRequest = async () => {
        if (!vpaValid) return;

        setLoading(true);
        try {
            const response = await fetch('/api/upi/collect-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vpa,
                    amount,
                    invoiceId,
                    provider: selectedProvider,
                }),
            });

            const data = await response.json();
            setPaymentStatus('checking');
        } catch (error) {
            console.error('Collect request failed:', error);
            setPaymentStatus('failed');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(upiLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    // Success Screen
    if (paymentStatus === 'success') {
        return (
            <div className="glass-card fade-in" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
                <div
                    style={{
                        width: '100px',
                        height: '100px',
                        margin: '0 auto 1.5rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--success-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pulse 1s ease-in-out',
                    }}
                >
                    <CheckCircle2 size={60} color="white" />
                </div>
                <h2 className="text-2xl font-bold mb-sm">Payment Successful!</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Your payment of {formatAmount(amount)} has been processed successfully
                </p>
                <button className="btn btn-primary" onClick={() => onSuccess?.()}>
                    Continue
                </button>
            </div>
        );
    }

    // Expired Screen
    if (paymentStatus === 'expired') {
        return (
            <div className="glass-card fade-in" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
                <div
                    style={{
                        width: '100px',
                        height: '100px',
                        margin: '0 auto 1.5rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--warning-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Clock size={60} color="white" />
                </div>
                <h2 className="text-2xl font-bold mb-sm">Payment Expired</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    The payment session has timed out. Please try again.
                </p>
                <div className="flex gap-md" style={{ justifyContent: 'center' }}>
                    <button className="btn btn-ghost" onClick={onCancel}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={() => window.location.reload()}>
                        <RefreshCw size={18} />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="upi-payment-container" style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem' }}>
            {/* Header */}
            <div className="text-center mb-lg fade-in">
                <div
                    style={{
                        fontSize: '3rem',
                        marginBottom: '1rem',
                    }}
                >
                    💳
                </div>
                <h1 className="text-3xl font-bold mb-sm">UPI Payment</h1>
                <div className="stat-value" style={{ fontSize: '2.5rem' }}>
                    {formatAmount(amount)}
                </div>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                    Invoice #{invoiceId}
                </p>
            </div>

            {/* Timer */}
            <div className="glass-card mb-lg fade-in" style={{ animationDelay: '50ms', textAlign: 'center' }}>
                <div className="flex items-center justify-center gap-md">
                    <Clock size={20} style={{ color: timeRemaining < 60 ? 'var(--danger)' : 'var(--primary-500)' }} />
                    <span style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: timeRemaining < 60 ? 'var(--danger)' : 'var(--text-primary)',
                    }}>
                        {formatTime(timeRemaining)}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>remaining</span>
                </div>
            </div>

            {/* Provider Selection */}
            <div className="glass-card mb-lg fade-in" style={{ animationDelay: '100ms' }}>
                <h3 className="font-bold mb-md">Select UPI Provider</h3>
                <div className="grid grid-cols-4 gap-md">
                    {['phonepe', 'googlepay', 'paytm', 'bhim'].map((provider) => (
                        <button
                            key={provider}
                            className={`provider-btn ${selectedProvider === provider ? 'active' : ''}`}
                            onClick={() => setSelectedProvider(provider)}
                            style={{
                                padding: '1rem',
                                borderRadius: 'var(--radius-lg)',
                                border: selectedProvider === provider
                                    ? '2px solid var(--primary-500)'
                                    : '1px solid var(--border-color)',
                                background: selectedProvider === provider
                                    ? 'var(--bg-glass-hover)'
                                    : 'var(--bg-glass)',
                                cursor: 'pointer',
                                transition: 'all var(--transition-base)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <span style={{ fontSize: '2rem' }}>{ProviderLogos[provider]}</span>
                            <span style={{ fontSize: '0.875rem', textTransform: 'capitalize', fontWeight: 600 }}>
                                {provider}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Payment Mode Selection */}
            <div className="glass-card mb-lg fade-in" style={{ animationDelay: '150ms' }}>
                <div className="grid grid-cols-2 gap-md">
                    <button
                        className={`btn ${paymentMode === 'qr' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setPaymentMode('qr')}
                        style={{ width: '100%', padding: '1rem' }}
                    >
                        <QrCode size={20} />
                        Scan QR Code
                    </button>
                    <button
                        className={`btn ${paymentMode === 'collect' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setPaymentMode('collect')}
                        style={{ width: '100%', padding: '1rem' }}
                    >
                        <Smartphone size={20} />
                        Enter UPI ID
                    </button>
                </div>
            </div>

            {/* QR Code Mode */}
            {paymentMode === 'qr' && (
                <div className="glass-card fade-in">
                    <div className="text-center">
                        {loading ? (
                            <div style={{ padding: '3rem' }}>
                                <Loader className="animate-pulse" size={48} style={{ margin: '0 auto', color: 'var(--primary-500)' }} />
                                <p className="mt-md" style={{ color: 'var(--text-secondary)' }}>Generating QR code...</p>
                            </div>
                        ) : (
                            <>
                                {/* QR Code */}
                                <div
                                    style={{
                                        width: '300px',
                                        height: '300px',
                                        margin: '0 auto 1.5rem',
                                        padding: '1.5rem',
                                        background: 'white',
                                        borderRadius: 'var(--radius-xl)',
                                        boxShadow: 'var(--shadow-xl)',
                                    }}
                                >
                                    {qrCodeUrl ? (
                                        <img src={qrCodeUrl} alt="UPI QR Code" style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <QrCode size={64} style={{ color: '#ccc' }} />
                                        </div>
                                    )}
                                </div>

                                {/* Instructions */}
                                <p className="font-bold mb-sm">Scan with any UPI app</p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                    Open your UPI app and scan this QR code to complete payment
                                </p>

                                {/* UPI Link */}
                                {upiLink && (
                                    <div
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            padding: '1rem',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            marginTop: '1rem',
                                        }}
                                    >
                                        <code style={{ flex: 1, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {upiLink}
                                        </code>
                                        <button
                                            className="btn btn-ghost"
                                            onClick={copyToClipboard}
                                            style={{ padding: '0.5rem' }}
                                        >
                                            {copied ? <Check size={18} style={{ color: 'var(--success)' }} /> : <Copy size={18} />}
                                        </button>
                                    </div>
                                )}

                                {/* Status */}
                                {paymentStatus === 'checking' && (
                                    <div className="flex items-center justify-center gap-sm mt-lg" style={{ color: 'var(--primary-500)' }}>
                                        <Loader className="animate-pulse" size={20} />
                                        <span>Waiting for payment confirmation...</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Collect Mode */}
            {paymentMode === 'collect' && (
                <div className="glass-card fade-in">
                    <h3 className="font-bold mb-md">Enter UPI ID</h3>
                    <div className="input-group">
                        <label className="input-label">UPI ID / VPA</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="yourname@upi"
                                value={vpa}
                                onChange={handleVpaChange}
                                style={{
                                    paddingRight: '40px',
                                    borderColor: vpaValid === false ? 'var(--danger)' : vpaValid === true ? 'var(--success)' : 'var(--border-color)',
                                }}
                            />
                            {vpaValid !== null && (
                                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                                    {vpaValid ? (
                                        <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
                                    ) : (
                                        <XCircle size={20} style={{ color: 'var(--danger)' }} />
                                    )}
                                </div>
                            )}
                        </div>
                        {vpaValid === false && (
                            <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                Invalid UPI ID format
                            </p>
                        )}
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={initiateCollectRequest}
                        disabled={!vpaValid || loading}
                        style={{
                            width: '100%',
                            justifyContent: 'center',
                            opacity: !vpaValid || loading ? 0.5 : 1,
                            cursor: !vpaValid || loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader className="animate-pulse" size={18} />
                                Initiating...
                            </>
                        ) : (
                            <>
                                Request Payment
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>

                    {paymentStatus === 'checking' && (
                        <div className="glass-card mt-md" style={{ padding: '1rem', textAlign: 'center' }}>
                            <Loader className="animate-pulse" size={32} style={{ margin: '0 auto 0.5rem', color: 'var(--primary-500)' }} />
                            <p className="font-bold">Payment request sent</p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                Please approve the payment in your UPI app ({selectedProvider})
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Cancel Button */}
            <div className="text-center mt-lg">
                <button className="btn btn-ghost" onClick={onCancel}>
                    Cancel Payment
                </button>
            </div>
        </div>
    );
};

export default UpiPaymentInterface;
