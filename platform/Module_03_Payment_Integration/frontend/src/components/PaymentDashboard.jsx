import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    TrendingUp,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Download,
    Filter,
    Search,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import '../styles/design-system.css';

// Mock API service (replace with actual API calls)
const paymentAPI = {
    async getStats() {
        return {
            totalRevenue: 2547850,
            todayRevenue: 45280,
            pendingPayments: 12,
            completedToday: 48,
            successRate: 98.5,
            avgTransactionValue: 12650,
        };
    },

    async getRecentTransactions() {
        return [
            {
                id: 'TXN001',
                amount: 15000,
                customer: 'Acme Corp',
                method: 'UPI',
                status: 'completed',
                timestamp: new Date(Date.now() - 2 * 60 * 1000),
            },
            {
                id: 'TXN002',
                amount: 8500,
                customer: 'TechStart Inc',
                method: 'Card',
                status: 'pending',
                timestamp: new Date(Date.now() - 15 * 60 * 1000),
            },
            {
                id: 'TXN003',
                amount: 32000,
                customer: 'Global Solutions',
                method: 'Bank Transfer',
                status: 'completed',
                timestamp: new Date(Date.now() - 45 * 60 * 1000),
            },
            {
                id: 'TXN004',
                amount: 5200,
                customer: 'StartupXYZ',
                method: 'UPI',
                status: 'failed',
                timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
            },
        ];
    },
};

/**
 * Premium Payment Dashboard Component
 * 
 * Features:
 * - Real-time stats with animated counters
 * - Recent transactions with live updates
 * - Glassmorphism design
 * - Smooth micro-animations
 * - Responsive grid layout
 * - Status badges with color coding
 */
const PaymentDashboard = () => {
    const [stats, setStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        loadDashboardData();
        // Refresh every 30 seconds
        const interval = setInterval(loadDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboardData = async () => {
        try {
            const [statsData, transactionsData] = await Promise.all([
                paymentAPI.getStats(),
                paymentAPI.getRecentTransactions(),
            ]);
            setStats(statsData);
            setTransactions(transactionsData);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
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

    const formatTime = (date) => {
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    const getStatusBadge = (status) => {
        const badges = {
            completed: <span className="badge badge-success"><CheckCircle size={12} /> Completed</span>,
            pending: <span className="badge badge-warning"><Clock size={12} /> Pending</span>,
            failed: <span className="badge badge-danger"><XCircle size={12} /> Failed</span>,
        };
        return badges[status] || null;
    };

    const filteredTransactions = transactions.filter(txn => {
        const matchesSearch = txn.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            txn.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || txn.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="dashboard-container" style={{ padding: '2rem' }}>
                <div className="grid grid-cols-4 gap-lg mb-lg">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: '120px' }}></div>
                    ))}
                </div>
                <div className="skeleton" style={{ height: '400px' }}></div>
            </div>
        );
    }

    return (
        <div className="dashboard-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-lg fade-in">
                <div>
                    <h1 className="text-3xl font-bold mb-sm">Payment Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Track and manage all your payments in real-time</p>
                </div>
                <button className="btn btn-primary">
                    <Download size={18} />
                    Export Report
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-lg mb-lg">
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(stats.totalRevenue)}
                    change="+12.5%"
                    isPositive={true}
                    icon={<TrendingUp size={24} />}
                    gradient="var(--primary-gradient)"
                />
                <StatCard
                    title="Today's Revenue"
                    value={formatCurrency(stats.todayRevenue)}
                    change="+8.2%"
                    isPositive={true}
                    icon={<CreditCard size={24} />}
                    gradient="var(--success-gradient)"
                />
                <StatCard
                    title="Pending Payments"
                    value={stats.pendingPayments}
                    change="-3"
                    isPositive={true}
                    icon={<Clock size={24} />}
                    gradient="var(--warning-gradient)"
                />
                <StatCard
                    title="Completed Today"
                    value={stats.completedToday}
                    change="+15"
                    isPositive={true}
                    icon={<CheckCircle size={24} />}
                    gradient="var(--info-gradient)"
                />
            </div>

            {/* Recent Transactions */}
            <div className="glass-card fade-in" style={{ animationDelay: '100ms' }}>
                {/* Search & Filter */}
                <div className="flex items-center justify-between mb-lg">
                    <h2 className="text-2xl font-bold">Recent Transactions</h2>
                    <div className="flex gap-md">
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <div style={{ position: 'relative' }}>
                                <Search
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--text-tertiary)',
                                    }}
                                />
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Search transactions..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ paddingLeft: '40px', minWidth: '250px' }}
                                />
                            </div>
                        </div>
                        <select
                            className="input-field"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ minWidth: '150px' }}
                        >
                            <option value="all">All Status</option>
                            <option value="completed">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                </div>

                {/* Transactions Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Transaction ID</th>
                                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Customer</th>
                                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Amount</th>
                                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Method</th>
                                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Status</th>
                                <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Time</th>
                                <th style={{ textAlign: 'right', padding: '12px', fontWeight: 600 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map((txn, index) => (
                                <tr
                                    key={txn.id}
                                    className="slide-in"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)',
                                        animationDelay: `${index * 50}ms`,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-tertiary)';
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-secondary)';
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    <td style={{ padding: '16px', borderRadius: 'var(--radius-md) 0 0 var(--radius-md)' }}>
                                        <span className="font-mono text-sm" style={{ color: 'var(--primary-500)' }}>{txn.id}</span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div>
                                            <div className="font-bold">{txn.customer}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span className="font-bold">{formatCurrency(txn.amount)}</span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span className="badge badge-info">{txn.method}</span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {getStatusBadge(txn.status)}
                                    </td>
                                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                                        {formatTime(txn.timestamp)}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
                                        <button className="btn btn-ghost" style={{ padding: '8px 12px' }}>
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredTransactions.length === 0 && (
                    <div className="text-center" style={{ padding: '3rem', color: 'var(--text-secondary)' }}>
                        <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <p>No transactions found matching your criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ title, value, change, isPositive, icon, gradient }) => {
    const [count, setCount] = useState(0);
    const numericValue = typeof value === 'string'
        ? parseFloat(value.replace(/[^0-9.-]+/g, ''))
        : value;

    useEffect(() => {
        // Animated counter
        const duration = 1000;
        const steps = 60;
        const increment = numericValue / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            if (currentStep <= steps) {
                setCount(Math.floor(increment * currentStep));
            } else {
                setCount(numericValue);
                clearInterval(timer);
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [numericValue]);

    return (
        <div
            className="gradient-card fade-in"
            style={{
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <div className="flex items-center justify-between mb-md">
                <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        {title}
                    </p>
                    <p className="stat-value">
                        {typeof value === 'string' && value.includes('₹')
                            ? `₹${count.toLocaleString('en-IN')}`
                            : count.toLocaleString('en-IN')}
                    </p>
                    <div className="flex items-center gap-sm mt-sm">
                        {isPositive ? (
                            <ArrowUpRight size={16} style={{ color: 'var(--success)' }} />
                        ) : (
                            <ArrowDownRight size={16} style={{ color: 'var(--danger)' }} />
                        )}
                        <span style={{ fontSize: '0.875rem', color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
                            {change}
                        </span>
                    </div>
                </div>
                <div
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: 'var(--radius-full)',
                        background: gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        opacity: 0.9,
                    }}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
};

export default PaymentDashboard;
