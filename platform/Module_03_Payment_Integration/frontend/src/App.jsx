import React, { useState } from 'react';
import PaymentDashboard from './components/PaymentDashboard';
import UpiPaymentInterface from './components/UpiPaymentInterface';
import PaymentLinkManager from './components/PaymentLinkManager';
import {
    LayoutDashboard,
    CreditCard,
    Link2,
    Settings,
    LogOut,
} from 'lucide-react';
import './styles/design-system.css';

/**
 * Main Payment Module Application
 * 
 * Features:
 * - Navigation sidebar with smooth transitions
 * - Multiple views: Dashboard, UPI Payment, Payment Links
 * - Glassmorphism design throughout
 * - Responsive layout
 * - Premium animations
 */
const PaymentApp = () => {
    const [currentView, setCurrentView] = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const navigation = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'upi', label: 'UPI Payment', icon: CreditCard },
        { id: 'links', label: 'Payment Links', icon: Link2 },
    ];

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <PaymentDashboard />;
            case 'upi':
                return (
                    <UpiPaymentInterface
                        amount={10000}
                        invoiceId="INV-001"
                        onSuccess={() => setCurrentView('dashboard')}
                        onCancel={() => setCurrentView('dashboard')}
                    />
                );
            case 'links':
                return <PaymentLinkManager />;
            default:
                return <PaymentDashboard />;
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Sidebar */}
            <aside
                style={{
                    width: sidebarCollapsed ? '80px' : '260px',
                    background: 'var(--bg-secondary)',
                    borderRight: '1px solid var(--border-color)',
                    transition: 'width var(--transition-base)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Logo */}
                <div
                    style={{
                        padding: '1.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                    }}
                >
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--primary-gradient)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                        }}
                    >
                        💳
                    </div>
                    {!sidebarCollapsed && (
                        <div>
                            <div className="font-bold">Payment Hub</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Module 03
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '1rem' }}>
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => setCurrentView(item.id)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    marginBottom: '0.5rem',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    background: isActive ? 'var(--primary-gradient)' : 'transparent',
                                    color: isActive ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-base)',
                                    fontSize: '0.875rem',
                                    fontWeight: isActive ? 600 : 400,
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'var(--bg-glass)';
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                    }
                                }}
                            >
                                <Icon size={20} />
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* Settings */}
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button
                        className="btn btn-ghost"
                        style={{ width: '100%', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
                    >
                        <Settings size={20} />
                        {!sidebarCollapsed && <span>Settings</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main
                style={{
                    flex: 1,
                    overflow: 'auto',
                    background: 'var(--bg-primary)',
                }}
            >
                {/* Top Bar */}
                <header
                    style={{
                        height: '64px',
                        background: 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 2rem',
                    }}
                >
                    <button
                        className="btn btn-ghost"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        style={{ padding: '0.5rem' }}
                    >
                        ☰
                    </button>

                    <div className="flex items-center gap-md">
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--primary-gradient)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 600,
                            }}
                        >
                            U
                        </div>
                    </div>
                </header>

                {/* View Content */}
                <div className="fade-in">{renderView()}</div>
            </main>
        </div>
    );
};

export default PaymentApp;
