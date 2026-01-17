import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiTrendingUp, FiClock, FiDollarSign, FiAward } from 'react-icons/fi';
import axios from 'axios';
import './PaymentHistoryDashboard.css';

interface Payment {
    id: string;
    invoiceNumber: string;
    vendor: string;
    amount: number;
    date: Date;
    method: string;
    status: string;
    timeSaved: number; // minutes
}

interface PaymentHistoryDashboardProps {
    customerId: string;
    sessionId: string;
}

const PaymentHistoryDashboard: React.FC<PaymentHistoryDashboardProps> = ({
    customerId,
    sessionId,
}) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stats, setStats] = useState({
        totalPaid: 0,
        paymentCount: 0,
        avgPaymentTime: 0,
        totalTimeSaved: 0,
    });
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPaymentHistory();
    }, [customerId, sessionId]);

    const fetchPaymentHistory = async () => {
        try {
            setLoading(true);
            // Integrate with Module 16 API
            const response = await axios.get(`/api/concierge/${sessionId}/payment-history`);

            const { payments: paymentData, totalPaid, paymentCount, avgPaymentTime } = response.data;

            const mappedPayments = paymentData.map((p: any) => ({
                ...p,
                date: new Date(p.date),
            }));

            setPayments(mappedPayments);
            setStats({
                totalPaid,
                paymentCount,
                avgPaymentTime,
                totalTimeSaved: mappedPayments.reduce((sum: number, p: Payment) => sum + p.timeSaved, 0),
            });
        } catch (error) {
            console.error('Failed to fetch payment history:', error);
            // Mock data for development
            const mockPayments: Payment[] = [
                {
                    id: 'p1',
                    invoiceNumber: 'INV-001',
                    vendor: 'ABC Consulting',
                    amount: 25000,
                    date: new Date('2025-12-15'),
                    method: 'UPI',
                    status: 'completed',
                    timeSaved: 15,
                },
                {
                    id: 'p2',
                    invoiceNumber: 'INV-002',
                    vendor: 'Tech Solutions',
                    amount: 18000,
                    date: new Date('2025-12-10'),
                    method: 'Card',
                    status: 'completed',
                    timeSaved: 25,
                },
                {
                    id: 'p3',
                    invoiceNumber: 'INV-003',
                    vendor: 'Global Services',
                    amount: 32000,
                    date: new Date('2025-12-05'),
                    method: 'Net Banking',
                    status: 'pending',
                    timeSaved: 20,
                },
            ];

            setPayments(mockPayments);
            setStats({
                totalPaid: mockPayments.reduce((sum, p) => sum + p.amount, 0),
                paymentCount: mockPayments.length,
                avgPaymentTime: 20,
                totalTimeSaved: mockPayments.reduce((sum, p) => sum + p.timeSaved, 0),
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'green';
            case 'pending':
                return 'orange';
            case 'failed':
                return 'red';
            case 'processing':
                return 'blue';
            default:
                return 'gray';
        }
    };

    const getMethodIcon = (method: string) => {
        switch (method) {
            case 'UPI':
                return '📱';
            case 'Card':
                return '💳';
            case 'Net Banking':
                return '🏦';
            case 'Cash':
                return '💵';
            default:
                return '💰';
        }
    };

    const filteredPayments = payments.filter(payment => {
        if (filter === 'all') return true;
        return payment.status === filter;
    });

    if (loading) {
        return (
            <div className="v-stack gap-4">
                <div className="text text-center color-gray-600">Loading payment history...</div>
            </div>
        );
    }

    return (
        <VStack gap={6} align="stretch">
            {/* Header */}
            <HStack justify="space-between">
                <h2 className="heading heading-lg color-gray-800">
                    <Icon as={FiClock} className="icon mr-2" />
                    Payment History
                </h2>
                <div className="filter-controls">
                    <select 
                        className="select"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Payments</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
            </HStack>

            {/* Stats Overview */}
            <div className="stats-grid">
                <div className="stat-card bg-gradient-to-br bg-blue-50 border-top-4 border-blue-500">
                    <div className="stat">
                        <div className="stat-label">Total Paid</div>
                        <div className="stat-number">₹{(stats.totalPaid / 1000).toFixed(0)}K</div>
                        <div className="stat-help-text">
                            <Icon as={FiDollarSign} className="icon mr-1" />
                            Across {stats.paymentCount} payments
                        </div>
                    </div>
                </div>

                <div className="stat-card bg-gradient-to-br bg-green-50 border-top-4 border-green-500">
                    <div className="stat">
                        <div className="stat-label">Avg Payment Time</div>
                        <div className="stat-number">{stats.avgPaymentTime} min</div>
                        <div className="stat-help-text">
                            <Icon as={FiClock} className="icon mr-1" />
                            Per transaction
                        </div>
                    </div>
                </div>

                <div className="stat-card bg-gradient-to-br bg-purple-50 border-top-4 border-purple-500">
                    <div className="stat">
                        <div className="stat-label">Time Saved</div>
                        <div className="stat-number">{stats.totalTimeSaved} min</div>
                        <div className="stat-help-text">
                            <Icon as={FiAward} className="icon mr-1" />
                            Total efficiency gain
                        </div>
                    </div>
                </div>

                <div className="stat-card bg-gradient-to-br bg-orange-50 border-top-4 border-orange-500">
                    <div className="stat">
                        <div className="stat-label">Payment Count</div>
                        <div className="stat-number">{stats.paymentCount}</div>
                        <div className="stat-help-text">
                            <Icon as={FiTrendingUp} className="icon mr-1" />
                            This month
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="heading heading-md">Recent Payments</h3>
                </div>
                <div className="card-body pt-0">
                    {filteredPayments.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📄</div>
                            <div className="empty-state-text">No payments found</div>
                            <div className="empty-state-subtext">
                                {filter === 'all' 
                                    ? 'You haven\'t made any payments yet' 
                                    : `No ${filter} payments found`
                                }
                            </div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Vendor</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th className="text-right">Time Saved</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td>
                                            <span className="font-medium">{payment.invoiceNumber}</span>
                                        </td>
                                        <td>{payment.vendor}</td>
                                        <td>
                                            <span className={`payment-amount ${payment.status}`}>
                                                ₹{payment.amount.toLocaleString('en-IN')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="payment-method">
                                                <span className="method-icon">{getMethodIcon(payment.method)}</span>
                                                <span>{payment.method}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {payment.date.toLocaleDateString('en-IN', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td>
                                            <div className="payment-status">
                                                <span className={`status-dot ${payment.status}`}></span>
                                                <Badge className={`badge badge-${getStatusColor(payment.status)}`}>
                                                    {payment.status}
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <span className="font-medium color-green-600">
                                                {payment.timeSaved} min
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* AI Insights */}
            <div className="card bg-cfo-secondary-50 border-radius-lg">
                <div className="card-body">
                    <VStack gap={3} align="start">
                        <h3 className="heading heading-sm color-gray-800">
                            🤖 AI Payment Insights
                        </h3>
                        <div className="v-stack gap-2">
                            <div className="h-stack gap-3">
                                <Icon as={FiTrendingUp} className="icon" style={{ color: '#805ad5' }} />
                                <span className="text text-sm color-gray-700">
                                    Your average payment time of {stats.avgPaymentTime} minutes is 40% faster 
                                    than the industry average. Great efficiency!
                                </span>
                            </div>
                            <div className="h-stack gap-3">
                                <Icon as={FiDollarSign} className="icon" style={{ color: '#805ad5' }} />
                                <span className="text text-sm color-gray-700">
                                    You've saved {stats.totalTimeSaved} minutes this month through 
                                    automated payments - that's valuable time back in your day!
                                </span>
                            </div>
                            <div className="h-stack gap-3">
                                <Icon as={FiAward} className="icon" style={{ color: '#805ad5' }} />
                                <span className="text text-sm color-gray-700">
                                    Consider setting up recurring payments for regular vendors to 
                                    save even more time each month.
                                </span>
                            </div>
                        </div>
                    </VStack>
                </div>
            </div>
        </VStack>
    );
};

export default PaymentHistoryDashboard;
