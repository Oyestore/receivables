import React, { useState, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Grid,
    GridItem,
    Badge,
    Button,
    Icon,
} from '@chakra-ui/react';
import {
    FiUsers,
    FiDollarSign,
    FiAlertCircle,
    FiTrendingUp,
    FiClock,
    FiCheckCircle,
} from 'react-icons/fi';
import axios from 'axios';
import './TenantConciergeHub.css';

interface CustomerStatus {
    id: string;
    name: string;
    email: string;
    totalOutstanding: number;
    overdueAmount: number;
    invoiceCount: number;
    lastPayment: Date;
    avgPaymentDays: number;
    status: 'excellent' | 'good' | 'warning' | 'overdue';
}

interface TenantConciergeHubProps {
    tenantId: string;
}

const TenantConciergeHub: React.FC<TenantConciergeHubProps> = ({ tenantId }) => {
    const [customers, setCustomers] = useState<CustomerStatus[]>([]);
    const [stats, setStats] = useState({
        totalOutstanding: 0,
        overdueAmount: 0,
        activeCustomers: 0,
        avgCollectionDays: 0,
        collectionRate: 0,
    });

    useEffect(() => {
        fetchCollectionData();
    }, [tenantId]);

    const fetchCollectionData = async () => {
        try {
            // TODO: Integrate with actual API
            const mockCustomers: CustomerStatus[] = [
                {
                    id: 'c1',
                    name: 'Acme Corp',
                    email: 'finance@acme.com',
                    totalOutstanding: 150000,
                    overdueAmount: 50000,
                    invoiceCount: 3,
                    lastPayment: new Date('2025-12-01'),
                    avgPaymentDays: 35,
                    status: 'warning',
                },
                {
                    id: 'c2',
                    name: 'Tech Solutions Ltd',
                    email: 'ap@techsolutions.com',
                    totalOutstanding: 80000,
                    overdueAmount: 0,
                    invoiceCount: 2,
                    lastPayment: new Date('2025-12-10'),
                    avgPaymentDays: 15,
                    status: 'excellent',
                },
            ];

            setCustomers(mockCustomers);

            setStats({
                totalOutstanding: 230000,
                overdueAmount: 50000,
                activeCustomers: 2,
                avgCollectionDays: 25,
                collectionRate: 85,
            });
        } catch (error) {
            console.error('Failed to fetch collection data:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'excellent':
                return 'green';
            case 'good':
                return 'blue';
            case 'warning':
                return 'orange';
            case 'overdue':
                return 'red';
            default:
                return 'gray';
        }
    };

    return (
        <Box>
            <VStack gap={4} align="stretch">
                {/* Header */}
                <HStack justify="space-between">
                    <h2 className="heading heading-lg">
                        <Icon as={FiUsers} className="icon mr-2" />
                        Collections Dashboard
                    </h2>
                    <Button className="button button-blue">
                        <FiTrendingUp style={{ marginRight: '8px' }} />
                        View Analytics
                    </Button>
                </HStack>

                {/* Stats Grid */}
                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6}>
                    <GridItem>
                        <div className="card bg-gradient-to-br bg-cfo-primary-50 border-top-4 border-cfo-primary-500">
                            <div className="card-body">
                                <div className="stat">
                                    <div className="stat-label">Total Outstanding</div>
                                    <div className="stat-number">₹{(stats.totalOutstanding / 100000).toFixed(1)}L</div>
                                    <div className="stat-help-text">
                                        Across {stats.activeCustomers} customers
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GridItem>

                    <GridItem>
                        <div className="card bg-gradient-to-br bg-red-50 border-top-4 border-red-500">
                            <div className="card-body">
                                <div className="stat">
                                    <div className="stat-label">Overdue Amount</div>
                                    <div className="stat-number">₹{(stats.overdueAmount / 1000).toFixed(0)}K</div>
                                    <div className="stat-help-text">
                                        <Icon as={FiAlertCircle} className="icon mr-1" />
                                        Needs attention
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GridItem>

                    <GridItem>
                        <div className="card bg-gradient-to-br bg-green-50 border-top-4 border-green-500">
                            <div className="card-body">
                                <div className="stat">
                                    <div className="stat-label">Collection Rate</div>
                                    <div className="stat-number">{stats.collectionRate}%</div>
                                    <div className="stat-help-text">
                                        <Icon as={FiTrendingUp} className="icon mr-1" />
                                        +5% this month
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GridItem>

                    <GridItem>
                        <div className="card bg-gradient-to-br bg-blue-50 border-top-4 border-blue-500">
                            <div className="card-body">
                                <div className="stat">
                                    <div className="stat-label">Avg Collection Days</div>
                                    <div className="stat-number">{stats.avgCollectionDays}</div>
                                    <div className="stat-help-text">
                                        <Icon as={FiClock} className="icon mr-1" />
                                        Target: 30 days
                                    </div>
                                </div>
                            </div>
                        </div>
                    </GridItem>
                </Grid>

                {/* Customer List */}
                <div className="card">
                    <div className="card-header">
                        <HStack justify="space-between">
                            <h3 className="heading heading-md">Customer Payment Status</h3>
                            <Button className="button button-outline button-xs">
                                Export Report
                            </Button>
                        </HStack>
                    </div>
                    <div className="card-body pt-0">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Status</th>
                                    <th className="text-right">Outstanding</th>
                                    <th className="text-right">Overdue</th>
                                    <th>Invoices</th>
                                    <th>Avg Days</th>
                                    <th>Last Payment</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((customer) => (
                                    <tr key={customer.id} className="cursor-pointer">
                                        <td>
                                            <HStack>
                                                <div className="avatar avatar-sm">{customer.name.charAt(0)}</div>
                                                <VStack align="start" gap={0}>
                                                    <span className="text font-medium">{customer.name}</span>
                                                    <span className="text text-xs color-gray-500">
                                                        {customer.email}
                                                    </span>
                                                </VStack>
                                            </HStack>
                                        </td>
                                        <td>
                                            <Badge className={`badge badge-${getStatusColor(customer.status)}`}>
                                                {customer.status}
                                            </Badge>
                                        </td>
                                        <td className="text-right font-semibold">
                                            ₹{customer.totalOutstanding.toLocaleString('en-IN')}
                                        </td>
                                        <td className="text-right">
                                            {customer.overdueAmount > 0 ? (
                                                <span className="text font-bold color-red-600">
                                                    ₹{customer.overdueAmount.toLocaleString('en-IN')}
                                                </span>
                                            ) : (
                                                <span className="text color-gray-400">—</span>
                                            )}
                                        </td>
                                        <td>
                                            <Badge className="badge badge-purple">{customer.invoiceCount}</Badge>
                                        </td>
                                        <td>
                                            <HStack>
                                                <Icon
                                                    as={customer.avgPaymentDays <= 30 ? FiCheckCircle : FiAlertCircle}
                                                    className={customer.avgPaymentDays <= 30 ? 'color-green-500' : 'color-orange-500'}
                                                />
                                                <span>{customer.avgPaymentDays} days</span>
                                            </HStack>
                                        </td>
                                        <td className="text-sm">
                                            {customer.lastPayment.toLocaleDateString('en-IN', {
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </td>
                                        <td>
                                            <HStack gap={2}>
                                                <Button className="button button-outline button-xs">
                                                    View
                                                </Button>
                                                {customer.overdueAmount > 0 && (
                                                    <Button className="button button-orange button-xs">
                                                        Send Reminder
                                                    </Button>
                                                )}
                                            </HStack>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* AI Insights */}
                <div className="card bg-cfo-secondary-50 border-radius-lg">
                    <div className="card-body">
                        <HStack gap={3}>
                            <Icon as={FiTrendingUp} className="icon" style={{ width: '24px', height: '24px', color: '#805ad5' }} />
                            <VStack align="start" gap={1}>
                                <span className="text font-semibold color-gray-800">
                                    💡 AI Collection Insights
                                </span>
                                <span className="text text-sm color-gray-700">
                                    Acme Corp's payment is 5 days overdue. Historical data shows they respond well to
                                    phone calls. Suggested: Call tomorrow morning for best response rate (72% success).
                                </span>
                            </VStack>
                        </HStack>
                    </div>
                </div>
            </VStack>
        </Box>
    );
};

export default TenantConciergeHub;
