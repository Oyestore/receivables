import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './RiskDashboard.css';

function RiskDashboard() {
    const [riskBuyers, setRiskBuyers] = useState([]);
    const [riskTrend, setRiskTrend] = useState([]);

    useEffect(() => {
        // Mock data
        setRiskBuyers([
            { id: 1, name: 'Acme Corp', score: 35, trend: 'declining', daysOverdue: 45, exposure: 2500000 },
            { id: 2, name: 'TechStart Ltd', score: 42, trend: 'stable', daysOverdue: 30, exposure: 1800000 },
            { id: 3, name: 'BuildCo Inc', score: 38, trend: 'declining', daysOverdue: 60, exposure: 3200000 },
        ]);

        setRiskTrend([
            { month: 'Jan', highRisk: 12, mediumRisk: 25, lowRisk: 63 },
            { month: 'Feb', highRisk: 15, mediumRisk: 28, lowRisk: 57 },
            { month: 'Mar', highRisk: 18, mediumRisk: 32, lowRisk: 50 },
            { month: 'Apr', highRisk: 14, mediumRisk: 25, lowRisk: 61 },
        ]);
    }, []);

    const getRiskColor = (score) => {
        if (score < 40) return '#ef4444';
        if (score < 60) return '#f59e0b';
        return '#10b981';
    };

    return (
        <div className="risk-dashboard">
            <div className="dashboard-header">
                <div className="header-icon">
                    <Shield size={48} />
                </div>
                <div>
                    <h1>Risk Management Dashboard</h1>
                    <p>Real-time buyer risk monitoring and early warning system</p>
                </div>
            </div>

            {/* Risk Stats */}
            <div className="risk-stats">
                <div className="stat-card high-risk">
                    <AlertTriangle size={32} />
                    <div>
                        <div className="stat-value">18</div>
                        <div className="stat-label">High Risk Buyers</div>
                    </div>
                </div>
                <div className="stat-card medium-risk">
                    <AlertCircle size={32} />
                    <div>
                        <div className="stat-value">32</div>
                        <div className="stat-label">Medium Risk Buyers</div>
                    </div>
                </div>
                <div className="stat-card total-exposure">
                    <TrendingDown size={32} />
                    <div>
                        <div className="stat-value">₹75L</div>
                        <div className="stat-label">At-Risk Exposure</div>
                    </div>
                </div>
            </div>

            {/* Risk Trend Chart */}
            <div className="chart-section">
                <h2>Risk Trend (Last 4 Months)</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={riskTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="month" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip
                            contentStyle={{
                                background: 'rgba(17, 25, 40, 0.95)',
                                border: '1px solid rgba(255, 255, 255, 0.18)',
                                borderRadius: '12px',
                            }}
                        />
                        <Area type="monotone" dataKey="highRisk" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="mediumRisk" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="lowRisk" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* High Risk Buyers List */}
            <div className="risk-buyers-section">
                <h2>High Risk Buyers</h2>
                <div className="buyers-list">
                    {riskBuyers.map((buyer) => (
                        <div key={buyer.id} className="buyer-card">
                            <div className="buyer-header">
                                <div>
                                    <h3>{buyer.name}</h3>
                                    <div className="buyer-meta">
                                        {buyer.daysOverdue} days overdue • ₹{(buyer.exposure / 100000).toFixed(1)}L exposure
                                    </div>
                                </div>
                                <div className="risk-score" style={{ borderColor: getRiskColor(buyer.score) }}>
                                    {buyer.score}
                                </div>
                            </div>
                            <div className="buyer-actions">
                                <button className="action-btn primary">Review Credit</button>
                                <button className="action-btn secondary">Send Reminder</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default RiskDashboard;
