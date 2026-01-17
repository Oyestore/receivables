import React, { useEffect, useState } from 'react';
import {
    VStack,
    HStack,
    Icon,
} from '@chakra-ui/react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './CustomerPortal.css';

// Components (to be created)
import InvoiceCard from './InvoiceCard';
import AIChatAssistant from './AIChatAssistant';
import BrandedFooter from './BrandedFooter';

interface BrandedFooterProps {
    invoiceVendor: string;
}

interface CustomerPortalProps {
    magicLinkToken?: string;
}

interface PortalSession {
    sessionId: string;
    persona: 'CFO' | 'CONCIERGE';
    invoice: any;
    capabilities: string[];
}

interface InvoiceCardProps {
    invoice: any;
    sessionId: string;
    onPaymentComplete?: () => void;
}

const CustomerPortal: React.FC<CustomerPortalProps> = ({ magicLinkToken }) => {
    const [searchParams] = useSearchParams();
    const token = magicLinkToken || searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [session, setSession] = useState<PortalSession | null>(null);
    const [invoice, setInvoice] = useState<any>(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        initializeSession();
    }, [token]);

    const initializeSession = async () => {
        if (!token) {
            setError('No magic link token provided. Please check your email/SMS for the payment link.');
            setLoading(false);
            setToastMessage('No magic link token provided. Please check your email/SMS for the payment link.');
            setToastType('error');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            return;
        }

        try {
            setLoading(true);

            // Extract invoice ID from token (implement proper token parsing)
            // For now, assume format: base64(tenantId_invoiceId)
            const decoded = atob(token);
            const [tenantId, invoiceId] = decoded.split('_');

            // Start CONCIERGE session
            const sessionResponse = await axios.post('/api/concierge/start/payer', {
                tenantId,
                invoiceId,
            });

            const sessionData = sessionResponse.data;
            setSession(sessionData);
            setInvoice(sessionData.invoice);

            // Load invoice details
            const invoiceResponse = await axios.get(`/api/invoices/${invoiceId}`);
            setInvoice(invoiceResponse.data);

            setLoading(false);
        } catch (error) {
            setError('Failed to initialize session');
            setToastMessage('Failed to initialize session');
            setToastType('error');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN');
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <div className="loading-text">Initializing your portal...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container">
                <div className="alert alert-error">
                    <div className="alert-icon">⚠️</div>
                    <div className="alert-content">
                        <div className="alert-title">Error</div>
                        <div className="alert-description">{error}</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="customer-portal">
            <div className="portal-header">
                <div>
                    <h1 className="portal-title">
                        Welcome back, {session.persona === 'CFO' ? 'Chief Financial Officer' : 'Concierge'}
                    </h1>
                    <p className="portal-subtitle">
                        Session ID: {session.sessionId}
                    </p>
                </div>
            </div>

            <div className="portal-content">
                {/* Dashboard Overview */}
                <div className="dashboard-overview">
                    <div className="overview-card">
                        <div className="overview-icon blue">
                            💰
                        </div>
                        <div className="overview-title">Total Revenue</div>
                        <div className="overview-value">{formatCurrency(invoice?.total || 0)}</div>
                        <div className="overview-description">This month</div>
                        <div className="overview-change positive">
                            <span>↑ 12% from last month</span>
                        </div>
                    </div>

                    <div className="overview-card">
                        <div className="overview-icon green">
                            📊
                        </div>
                        <div className="overview-title">Pending Invoices</div>
                        <div className="overview-value">{invoice?.pendingCount || 0}</div>
                        <div className="overview-description">Awaiting payment</div>
                        <div className="overview-change negative">
                            <span>↓ 3 from last month</span>
                        </div>
                    </div>

                    <div className="overview-card">
                        <div className="overview-icon orange">
                            📈
                        </div>
                        <div className="overview-title">Average Processing Time</div>
                        <div className="overview-value">2.3 days</div>
                        <div className="overview-description">Across all invoices</div>
                        <div className="overview-change neutral">
                            <span>→ Same as last month</span>
                        </div>
                    </div>

                    <div className="overview-card">
                        <div className="overview-icon purple">
                            🎯
                        </div>
                        <div className="overview-title">AI Insights</div>
                        <div className="overview-value">Active</div>
                        <div className="overview-description">AI-powered analysis</div>
                        <div className="overview-change positive">
                            <span>↑ 25% more accurate</span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                    <a href="#" className="quick-action">
                        <div className="quick-action-icon">📊</div>
                        <div className="quick-action-title">Pay Invoice</div>
                        <div className="quick-action-description">
                            {invoice?.vendor?.name || 'Unknown Vendor'}
                        </div>
                    </a>
                    <a href="#" className="quick-action">
                        <div className="quick-action-icon">📊</div>
                        <div className="quick-action-title">View Analytics</div>
                        <div className="quick-action-description">
                            {formatCurrency(invoice?.total || 0)} Revenue
                        </div>
                    </a>
                    <a href="#" className="quick-action">
                        <div className="quick-action-icon">💬</div>
                        <div className="quick-action-title">Download Statement</div>
                        <div className="quick-action-description">
                            PDF Format
                        </div>
                    </a>
                </div>

                {/* Recent Activity */}
                <div className="recent-activity">
                    <div className="activity-header">
                        <h3 className="activity-title">Recent Activity</h3>
                        <a href="#" className="text text-sm color-blue-600">
                            View All
                        </a>
                    </div>
                    <div className="activity-list">
                        <div className="activity-item">
                            <div className="activity-icon invoice">
                                📄
                            </div>
                            <div className="activity-content">
                                <div className="activity-title">Invoice #{invoice?.number || 'N/A'}</div>
                                <div className="activity-description">
                                    {invoice?.vendor?.name || 'Unknown Vendor'} - {formatCurrency(invoice?.total || 0)}
                                </div>
                            </div>
                            <div className="activity-time">
                                {invoice?.date ? formatDate(invoice.date) : 'N/A'}
                            </div>
                        </div>
                        <div className="activity-item">
                            <div className="activity-icon payment">
                                💳
                            </div>
                            <div className="activity-content">
                                <div className="activity-title">Payment Received</div>
                                <div className="activity-description">
                                    {invoice?.vendor?.name || 'Unknown Vendor'} - {formatCurrency(invoice?.total || 0)}
                                </div>
                            </div>
                            <div className="activity-time">
                                {invoice?.date ? formatDate(invoice.date) : 'N/A'}
                            </div>
                        </div>
                        <div className="activity-item">
                            <div className="activity-icon alert">
                                ⚠️
                            </div>
                            <div className="activity-content">
                                <div className="activity-title">Payment Alert</div>
                                <div className="activity-description">
                                    {invoice?.vendor?.name || 'Unknown Vendor'} - High amount detected
                                </div>
                            </div>
                            <div className="activity-time">
                                {invoice?.date ? formatDate(invoice.date) : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Assistant */}
                <div className="ai-assistant">
                    <div className="ai-title">
                        <Icon className="icon mr-2" />
                        AI {session.persona === 'CFO' ? 'CFO Assistant' : 'Concierge'}
                    </div>
                    <div className="ai-description">
                        I'm your AI-powered {session.persona === 'CFO' ? 'financial advisor' : 'assistant'}. I can help with financial analysis, cost optimization, and strategic decisions.
                    </div>
                    <div className="ai-actions">
                        <button className="ai-button">
                            Start Conversation
                        </button>
                        <button className="ai-button">
                            View Insights
                        </button>
                    </div>
                </div>

                {/* Notifications */}
                <div className="notifications">
                    <div className="notifications-header">
                        <h3 className="notifications-title">Notifications</h3>
                        <a href="#" className="text text-sm color-blue-600">
                            Clear All
                        </a>
                    </div>
                    <div className="notifications-list">
                        <div className="notification-item">
                            <div className="notification-icon info">
                                📄
                            </div>
                            <div className="notification-content">
                                <div className="notification-title">New Invoice</div>
                                <div className="notification-description">
                                    {invoice?.vendor?.name || 'Unknown Vendor'} sent invoice #{invoice?.number || 'N/A'}
                                </div>
                            </div>
                            <div className="notification-time">
                                {invoice?.date ? formatDate(invoice.date) : 'N/A'}
                            </div>
                        </div>
                        <div className="notification-item">
                            <div className="notification-icon warning">
                                ⚠️
                            </div>
                            <div className="notification-content">
                                <div className="notification-title">Payment Due Soon</div>
                                <div className="notification-description">
                                    {invoice?.vendor?.name || 'Unknown Vendor'} payment due in 2 days
                                </div>
                            </div>
                            <div className="notification-time">
                                {invoice?.dueDate ? formatDate(invoice.dueDate) : 'N/A'}
                            </div>
                        </div>
                        <div className="notification-item">
                            <div className="notification-icon success">
                                ✅
                            </div>
                            <div className="notification-content">
                                <div className="notification-title">Payment Processed</div>
                                <div className="notification-description">
                                    {invoice?.vendor?.name || 'Unknown Vendor'} payment completed
                                </div>
                            </div>
                            <div className="notification-time">
                                {invoice?.paidDate ? formatDate(invoice.paidDate) : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Invoice Card */}
                {invoice && (
                    <InvoiceCard 
                        invoice={invoice} 
                        sessionId={session.sessionId}
                        onPaymentComplete={() => {
                            setToastMessage('Payment completed successfully');
                            setToastType('success');
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3000);
                        }}
                    />
                )}

                {/* Footer */}
                <BrandedFooter invoiceVendor={invoice?.vendor?.name || 'Unknown Vendor'} />
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
        </div>
    );
};

export default CustomerPortal;
