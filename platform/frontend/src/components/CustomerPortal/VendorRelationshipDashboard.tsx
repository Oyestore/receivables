import React, { useState, useEffect } from 'react';
import {
    Box,
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiBriefcase, FiTrendingUp, FiUserPlus, FiMail } from 'react-icons/fi';
import axios from 'axios';
import './VendorRelationshipDashboard.css';

interface Vendor {
    id: string;
    name: string;
    logo?: string;
    totalPaid: number;
    invoiceCount: number;
    onTimeRate: number;
    avgPaymentDays: number;
    lastPayment: Date;
    pendingInvoices: any[];
    rating: number;
}

interface VendorRelationshipDashboardProps {
    customerId: string;
}

const VendorRelationshipDashboard: React.FC<VendorRelationshipDashboardProps> = ({
    customerId,
}) => {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        fetchVendors();
    }, [customerId]);

    const fetchVendors = async () => {
        try {
            setLoading(true);
            // TODO: Integrate with actual vendor API
            // For now, mock data
            const mockVendors: Vendor[] = [
                {
                    id: 'v1',
                    name: 'ABC Consulting',
                    logo: '/logos/abc.png',
                    totalPaid: 245000,
                    invoiceCount: 12,
                    onTimeRate: 85,
                    avgPaymentDays: 28,
                    lastPayment: new Date('2025-12-15'),
                    pendingInvoices: [],
                    rating: 4.5,
                },
                {
                    id: 'v2',
                    name: 'Tech Solutions Ltd',
                    logo: '/logos/tech.png',
                    totalPaid: 180000,
                    invoiceCount: 8,
                    onTimeRate: 92,
                    avgPaymentDays: 22,
                    lastPayment: new Date('2025-12-10'),
                    pendingInvoices: [],
                    rating: 4.8,
                },
                {
                    id: 'v3',
                    name: 'Global Services Inc',
                    logo: '/logos/global.png',
                    totalPaid: 320000,
                    invoiceCount: 15,
                    onTimeRate: 78,
                    avgPaymentDays: 35,
                    lastPayment: new Date('2025-12-05'),
                    pendingInvoices: [],
                    rating: 4.2,
                },
            ];

            setVendors(mockVendors);
        } catch (error) {
            console.error('Failed to fetch vendors:', error);
            setToastMessage('Failed to load vendor data');
            setToastType('error');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleContactVendor = (vendorId: string) => {
        setToastMessage('Contact request sent to vendor');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const renderRatingStars = (rating: number) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;

        for (let i = 0; i < fullStars; i++) {
            stars.push(<span key={i} className="star">★</span>);
        }
        if (hasHalfStar) {
            stars.push(<span key="half" className="star">☆</span>);
        }
        for (let i = fullStars + (hasHalfStar ? 1 : 0); i < 5; i++) {
            stars.push(<span key={`empty-${i}`} className="star empty">☆</span>);
        }

        return <div className="rating-stars">{stars}</div>;
    };

    const getPerformanceColor = (rate: number) => {
        if (rate >= 90) return 'success';
        if (rate >= 75) return 'warning';
        return 'danger';
    };

    const totalVendors = vendors.length;
    const avgRating = vendors.reduce((sum, v) => sum + v.rating, 0) / totalVendors || 0;
    const totalSpent = vendors.reduce((sum, v) => sum + v.totalPaid, 0);
    const avgOnTimeRate = vendors.reduce((sum, v) => sum + v.onTimeRate, 0) / totalVendors || 0;

    if (loading) {
        return (
            <Box>
                <div className="v-stack gap-4">
                    <div className="text text-center color-gray-600">Loading vendor data...</div>
                </div>
            </Box>
        );
    }

    return (
        <Box>
            <VStack gap={6} align="stretch">
                {/* Header */}
                <HStack justify="space-between">
                    <h2 className="heading heading-lg color-gray-800">
                        <Icon as={FiBriefcase} className="icon mr-2" />
                        Vendor Relationships
                    </h2>
                    <button className="button button-blue button-sm">
                        <Icon as={FiUserPlus} className="icon mr-1" />
                        Add Vendor
                    </button>
                </HStack>

                {/* Stats Overview */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{totalVendors}</div>
                        <div className="stat-label">Total Vendors</div>
                        <div className="stat-change positive">
                            <Icon as={FiTrendingUp} className="icon mr-1" />
                            +2 this month
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">₹{(totalSpent / 100000).toFixed(1)}L</div>
                        <div className="stat-label">Total Spent</div>
                        <div className="stat-change positive">
                            <Icon as={FiTrendingUp} className="icon mr-1" />
                            +12% this quarter
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{avgRating.toFixed(1)}</div>
                        <div className="stat-label">Average Rating</div>
                        <div className="stat-change positive">
                            <Icon as={FiTrendingUp} className="icon mr-1" />
                            +0.3 this month
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{avgOnTimeRate.toFixed(0)}%</div>
                        <div className="stat-label">Avg On-Time Rate</div>
                        <div className="stat-change negative">
                            <Icon as={FiTrendingUp} className="icon mr-1" />
                            -3% this month
                        </div>
                    </div>
                </div>

                {/* Vendor List */}
                <div className="vendor-list">
                    {vendors.map((vendor) => (
                        <div key={vendor.id} className="vendor-card">
                            <div className="vendor-header">
                                <div className="avatar avatar-lg">
                                    {vendor.name.charAt(0)}
                                </div>
                                <div className="vendor-info">
                                    <div className="vendor-name">{vendor.name}</div>
                                    <div className="vendor-category">Consulting Services</div>
                                </div>
                                <div className="v-stack gap-1 align-end">
                                    {renderRatingStars(vendor.rating)}
                                    <span className="text text-xs color-gray-500">
                                        {vendor.rating.toFixed(1)} rating
                                    </span>
                                </div>
                            </div>

                            <div className="vendor-metrics">
                                <div className="metric-item">
                                    <span className="metric-label">Total Paid</span>
                                    <span className="metric-value">₹{(vendor.totalPaid / 100000).toFixed(1)}L</span>
                                </div>
                                <div className="metric-item">
                                    <span className="metric-label">Invoices</span>
                                    <span className="metric-value">{vendor.invoiceCount}</span>
                                </div>
                                <div className="metric-item">
                                    <span className="metric-label">On-Time Rate</span>
                                    <div className="performance-indicator">
                                        <div className="performance-bar">
                                            <div 
                                                className={`performance-fill ${getPerformanceColor(vendor.onTimeRate)}`}
                                                style={{ width: `${vendor.onTimeRate}%` }}
                                            />
                                        </div>
                                        <span className="performance-text">{vendor.onTimeRate}%</span>
                                    </div>
                                </div>
                                <div className="metric-item">
                                    <span className="metric-label">Avg Payment</span>
                                    <span className="metric-value">{vendor.avgPaymentDays} days</span>
                                </div>
                            </div>

                            <div className="vendor-actions">
                                <button className="button button-outline button-xs">
                                    View Details
                                </button>
                                <button 
                                    className="button button-blue button-xs"
                                    onClick={() => handleContactVendor(vendor.id)}
                                >
                                    <Icon as={FiMail} className="icon mr-1" />
                                    Contact
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* AI Insights */}
                <div className="card bg-cfo-secondary-50 border-radius-lg">
                    <div className="card-body">
                        <VStack gap={3} align="start">
                            <h3 className="heading heading-sm color-gray-800">
                                🤖 AI Vendor Insights
                            </h3>
                            <div className="v-stack gap-2">
                                <div className="insight-item">
                                    <Icon as={FiTrendingUp} className="insight-icon" />
                                    <span className="insight-text">
                                        Tech Solutions Ltd shows excellent payment performance with 92% on-time rate. 
                                        Consider expanding your relationship with this reliable vendor.
                                    </span>
                                </div>
                                <div className="insight-item">
                                    <Icon as={FiBriefcase} className="insight-icon" />
                                    <span className="insight-text">
                                        Global Services Inc has a lower on-time rate (78%). Consider implementing 
                                        stricter payment terms or early payment discounts to improve cash flow.
                                    </span>
                                </div>
                                <div className="insight-item">
                                    <Icon as={FiUserPlus} className="insight-icon" />
                                    <span className="insight-text">
                                        Based on your spending patterns, you could benefit from diversifying your vendor 
                                        portfolio to reduce dependency on single providers.
                                    </span>
                                </div>
                            </div>
                        </VStack>
                    </div>
                </div>
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
        </Box>
    );
};

export default VendorRelationshipDashboard;
