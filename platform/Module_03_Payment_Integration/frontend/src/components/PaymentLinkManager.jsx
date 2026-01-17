import React, { useState, useEffect } from 'react';
import {
    Link2,
    Copy,
    Check,
    QrCode,
    Trash2,
    Eye,
    EyeOff,
    Plus,
    Calendar,
    IndianRupee,
    Clock,
    ExternalLink,
    Download,
} from 'lucide-react';
import '../styles/design-system.css';

/**
 * Premium Payment Link Manager Component
 * 
 * Features:
 * - Create payment links with custom amounts
 * - Generate QR codes for links
 * - Track link usage and status
 * - Copy links with one click
 * - Set expiration dates
 * - Delete/cancel links
 * - Beautiful card-based layout
 */
const PaymentLinkManager = () => {
    const [links, setLinks] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLinks();
    }, []);

    const loadLinks = async () => {
        try {
            const response = await fetch('/api/payment-links');
            const data = await response.json();
            setLinks(data);
        } catch (error) {
            console.error('Failed to load links:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusColor = (status) => {
        const colors = {
            active: 'var(--success)',
            expired: 'var(--warning)',
            used: 'var(--info)',
            cancelled: 'var(--text-tertiary)',
        };
        return colors[status] || colors.active;
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem' }}>
                <div className="grid grid-cols-3 gap-lg">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: '200px' }}></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-lg fade-in">
                <div>
                    <h1 className="text-3xl font-bold mb-sm">Payment Links</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Create and manage shareable payment links
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateModal(true)}
                >
                    <Plus size={18} />
                    Create New Link
                </button>
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-3 gap-lg">
                {links.map((link, index) => (
                    <PaymentLinkCard
                        key={link.id}
                        link={link}
                        onRefresh={loadLinks}
                        style={{ animationDelay: `${index * 50}ms` }}
                    />
                ))}

                {links.length === 0 && (
                    <div
                        className="glass-card"
                        style={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: '4rem',
                        }}
                    >
                        <Link2
                            size={64}
                            style={{ margin: '0 auto 1rem', opacity: 0.3, color: 'var(--text-tertiary)' }}
                        />
                        <h3 className="font-bold mb-sm">No payment links yet</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Create your first payment link to get started
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={18} />
                            Create Payment Link
                        </button>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateLinkModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        loadLinks();
                    }}
                />
            )}
        </div>
    );
};

// Payment Link Card Component
const PaymentLinkCard = ({ link, onRefresh }) => {
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);

    const copyLink = () => {
        navigator.clipboard.writeText(link.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const deleteLink = async () => {
        if (!confirm('Are you sure you want to delete this link?')) return;

        try {
            await fetch(`/api/payment-links/${link.shortCode}`, { method: 'DELETE' });
            onRefresh();
        } catch (error) {
            console.error('Failed to delete link:', error);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className="gradient-card fade-in">
            {/* Status Badge */}
            <div className="flex items-center justify-between mb-md">
                <span
                    className="badge"
                    style={{
                        background: `${link.status === 'active' ? 'var(--success-light)' : 'var(--warning-light)'}`,
                        color: `${link.status === 'active' ? 'var(--success)' : 'var(--warning)'}`,
                    }}
                >
                    {link.status}
                </span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                    {link.use_count || 0} uses
                </span>
            </div>

            {/* Amount */}
            <div className="mb-md">
                <div className="stat-value" style={{ fontSize: '2rem' }}>
                    {formatCurrency(link.amount)}
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {link.description}
                </p>
            </div>

            {/* Link */}
            <div
                style={{
                    background: 'var(--bg-glass)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}
            >
                <code
                    style={{
                        flex: 1,
                        fontSize: '0.75rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--primary-500)',
                    }}
                >
                    {link.url}
                </code>
                <button
                    className="btn btn-ghost"
                    onClick={copyLink}
                    style={{ padding: '0.5rem', minWidth: 'auto' }}
                >
                    {copied ? (
                        <Check size={16} style={{ color: 'var(--success)' }} />
                    ) : (
                        <Copy size={16} />
                    )}
                </button>
            </div>

            {/* Meta Info */}
            {link.expires_at && (
                <div
                    className="flex items-center gap-sm mb-md"
                    style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}
                >
                    <Clock size={14} />
                    Expires: {formatDate(link.expires_at)}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-sm">
                <button
                    className="btn btn-ghost"
                    onClick={() => setShowQR(!showQR)}
                    style={{ flex: 1, fontSize: '0.875rem' }}
                >
                    {showQR ? <EyeOff size={16} /> : <Eye size={16} />}
                    {showQR ? 'Hide' : 'Show'} QR
                </button>
                <button
                    className="btn btn-ghost"
                    onClick={deleteLink}
                    style={{ padding: '0.5rem', minWidth: 'auto', color: 'var(--danger)' }}
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* QR Code */}
            {showQR && (
                <div
                    className="fade-in"
                    style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'white',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                    }}
                >
                    <img
                        src={link.qrCode}
                        alt="QR Code"
                        style={{ width: '100%', maxWidth: '200px', margin: '0 auto' }}
                    />
                    <button
                        className="btn btn-ghost mt-sm"
                        style={{ fontSize: '0.75rem' }}
                    >
                        <Download size={14} />
                        Download QR
                    </button>
                </div>
            )}
        </div>
    );
};

// Create Link Modal
const CreateLinkModal = ({ onClose, onCreated }) => {
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        customerEmail: '',
        expiresAt: '',
        maxUses: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/payment-links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount),
                    maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
                    expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
                }),
            });

            if (response.ok) {
                onCreated();
            }
        } catch (error) {
            console.error('Failed to create link:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '2rem',
            }}
            onClick={onClose}
        >
            <div
                className="glass-card fade-in"
                style={{ maxWidth: '500px', width: '100%' }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold mb-lg">Create Payment Link</h2>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Amount (INR)*</label>
                        <input
                            type="number"
                            className="input-field"
                            placeholder="10000"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Description*</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Payment for Invoice #123"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Customer Email (optional)</label>
                        <input
                            type="email"
                            className="input-field"
                            placeholder="customer@example.com"
                            value={formData.customerEmail}
                            onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-md">
                        <div className="input-group">
                            <label className="input-label">Expires At (optional)</label>
                            <input
                                type="datetime-local"
                                className="input-field"
                                value={formData.expiresAt}
                                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Max Uses (optional)</label>
                            <input
                                type="number"
                                className="input-field"
                                placeholder="1"
                                value={formData.maxUses}
                                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-md mt-lg">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={onClose}
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{
                                flex: 1,
                                opacity: loading ? 0.5 : 1,
                            }}
                        >
                            {loading ? 'Creating...' : 'Create Link'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentLinkManager;
