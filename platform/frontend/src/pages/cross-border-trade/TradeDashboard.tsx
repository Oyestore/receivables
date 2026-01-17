import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Ship,
    Package,
    TrendingUp,
    TrendingDown,
    Globe,
    FileText,
    Clock,
    CheckCircle,
    AlertCircle,
    Plane,
    Truck,
    Plus,
} from 'lucide-react';
import './TradeDashboard.css';
import { ForexService, Currency } from '../../services/forex.service';

interface Trade {
    id: string;
    tradeNumber: string;
    type: 'export' | 'import';
    originCountry: string;
    destinationCountry: string;
    amount: number;
    currency: string;
    status: 'draft' | 'pending_approval' | 'approved' | 'in_transit' | 'customs_clearance' | 'delivered' | 'cancelled';
    customsStatus: 'pending' | 'submitted' | 'approved' | 'rejected' | 'cleared';
    shippingMethod: 'air' | 'sea' | 'land' | 'courier';
    estimatedArrivalDate?: string;
    createdAt: string;
}

export const TradeDashboard: React.FC = () => {
    const [trades, setTrades] = useState<Trade[]>([
        {
            id: '1',
            tradeNumber: 'TR-2025-000001',
            type: 'export',
            originCountry: 'India',
            destinationCountry: 'United States',
            amount: 125000,
            currency: 'USD',
            status: 'in_transit',
            customsStatus: 'cleared',
            shippingMethod: 'sea',
            estimatedArrivalDate: '2025-02-15',
            createdAt: '2025-01-10',
        },
        {
            id: '2',
            tradeNumber: 'TR-2025-000002',
            type: 'import',
            originCountry: 'China',
            destinationCountry: 'India',
            amount: 85000,
            currency: 'USD',
            status: 'customs_clearance',
            customsStatus: 'submitted',
            shippingMethod: 'air',
            estimatedArrivalDate: '2025-01-28',
            createdAt: '2025-01-12',
        },
    ]);

    const [filter, setFilter] = useState<string>('all');

    const stats = {
        totalTrades: trades.length,
        exports: trades.filter((t) => t.type === 'export').length,
        imports: trades.filter((t) => t.type === 'import').length,
        inTransit: trades.filter((t) => t.status === 'in_transit').length,
        customsClearance: trades.filter((t) => t.status === 'customs_clearance').length,
        totalValue: trades.reduce((sum, t) => sum + t.amount, 0),
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delivered':
                return 'status-delivered';
            case 'in_transit':
                return 'status-transit';
            case 'customs_clearance':
                return 'status-customs';
            case 'approved':
                return 'status-approved';
            default:
                return 'status-pending';
        }
    };

    const getShippingIcon = (method: string) => {
        switch (method) {
            case 'air':
                return <Plane className="shipping-icon" />;
            case 'sea':
                return <Ship className="shipping-icon" />;
            case 'land':
            case 'courier':
                return <Truck className="shipping-icon" />;
            default:
                return <Package className="shipping-icon" />;
        }
    };

    return (
        <div className="trade-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="title-section">
                        <Globe className="page-icon" />
                        <div>
                            <h1 className="page-title">Cross-Border Trade</h1>
                            <p className="page-subtitle">Manage international trade operations</p>
                        </div>
                    </div>

                    <motion.button
                        className="btn-create"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Plus className="btn-icon" />
                        New Trade
                    </motion.button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <motion.div
                    className="stat-card total"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="stat-icon-wrapper">
                        <FileText className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.totalTrades}</div>
                        <div className="stat-label">Total Trades</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card exports"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="stat-icon-wrapper">
                        <TrendingUp className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.exports}</div>
                        <div className="stat-label">Exports</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card imports"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="stat-icon-wrapper">
                        <TrendingDown className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.imports}</div>
                        <div className="stat-label">Imports</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card value"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="stat-icon-wrapper">
                        <Globe className="stat-icon" />
                    </div>
                    <div className="stat-info">
                        <div className="stat-value">${(stats.totalValue / 1000).toFixed(0)}K</div>
                        <div className="stat-label">Trade Value</div>
                    </div>
                </motion.div>
            </div>

            {/* Currency Converter Widget */}
            <div className="converter-section" style={{ margin: '20px 0', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Globe className="section-icon" size={20} />
                    Live Currency Converter
                </h2>
                <div className="converter-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '20px', alignItems: 'end' }}>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Amount</label>
                        <input
                            type="number"
                            defaultValue={100}
                            id="amount-input"
                            style={{ padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>From</label>
                        <select id="from-currency" style={{ padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <option value="USD">USD - US Dollar</option>
                            <option value="INR">INR - Indian Rupee</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>To</label>
                        <select id="to-currency" style={{ padding: '10px', width: '100%', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <option value="INR">INR - Indian Rupee</option>
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="AED">AED - UAE Dirham</option>
                        </select>
                    </div>
                    <button
                        onClick={async () => {
                            const amount = (document.getElementById('amount-input') as HTMLInputElement).value;
                            const from = (document.getElementById('from-currency') as HTMLSelectElement).value as Currency;
                            const to = (document.getElementById('to-currency') as HTMLSelectElement).value as Currency;

                            try {
                                // Using the new ForexService
                                const result = await ForexService.convertCurrency(Number(amount), from, to);
                                alert(`${amount} ${from} = ${result.totalInTargetCurrency} ${to}\nRate: ${result.exchangeRate}\nFees: ${result.fees}`);
                            } catch (e) {
                                console.error(e);
                                alert('Conversion failed. Ensure backend module 13 is running.');
                            }
                        }}
                        style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', height: '42px' }}
                    >
                        Check Rate
                    </button>
                </div>
            </div>

            {/* Trades List */}
            <div className="trades-section">
                <h2 className="section-title">Recent Trades</h2>

                <div className="trades-grid">
                    {trades.map((trade, index) => (
                        <motion.div
                            key={trade.id}
                            className={`trade-card ${getStatusColor(trade.status)}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            {/* Trade Header */}
                            <div className="trade-header">
                                <div className="trade-number">{trade.tradeNumber}</div>
                                <div className={`trade-type ${trade.type}`}>
                                    {trade.type === 'export' ? (
                                        <TrendingUp className="type-icon" />
                                    ) : (
                                        <TrendingDown className="type-icon" />
                                    )}
                                    {trade.type.toUpperCase()}
                                </div>
                            </div>

                            {/* Route */}
                            <div className="trade-route">
                                <div className="country">{trade.originCountry}</div>
                                <div className="route-arrow">→</div>
                                <div className="country">{trade.destinationCountry}</div>
                            </div>

                            {/* Amount */}
                            <div className="trade-amount">
                                {trade.currency} ${trade.amount.toLocaleString()}
                            </div>

                            {/* Details */}
                            <div className="trade-details">
                                <div className="detail-item">
                                    {getShippingIcon(trade.shippingMethod)}
                                    <span>{trade.shippingMethod}</span>
                                </div>
                                {trade.estimatedArrivalDate && (
                                    <div className="detail-item">
                                        <Clock className="detail-icon" />
                                        <span>ETA: {new Date(trade.estimatedArrivalDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Status */}
                            <div className="trade-footer">
                                <div className="status-badge">
                                    <CheckCircle className="status-icon" />
                                    {trade.status.replace('_', ' ')}
                                </div>
                                <div className={`customs-badge customs-${trade.customsStatus}`}>
                                    Customs: {trade.customsStatus}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
