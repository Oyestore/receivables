import { useState, useEffect } from 'react';
import { Network, TrendingUp, AlertTriangle, Users, Activity, Zap } from 'lucide-react';
import './NetworkDashboard.css';

function NetworkDashboard() {
    const [networkMetrics, setNetworkMetrics] = useState(null);
    const [recentIntel, setRecentIntel] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data - replace with API call
        setTimeout(() => {
            setNetworkMetrics({
                totalBuyers: 487263,
                highTrustBuyers: 146178,
                riskBuyers: 97452,
                totalObservations: 8473821,
                dataQuality: 87,
            });
            setRecentIntel([
                {
                    type: 'EMERGING_RISK',
                    severity: 'HIGH',
                    title: 'Real Estate sector payment delays increased 42%',
                    evidence: { affectedBuyerCount: 1834, timeframe: 'Last 30 days' },
                },
                {
                    type: 'INDUSTRY_ALERT',
                    severity: 'MEDIUM',
                    title: 'Manufacturing sector showing payment improvement',
                    evidence: { affectedBuyerCount: 2341, timeframe: 'Last 60 days' },
                },
            ]);
            setLoading(false);
        }, 500);
    }, []);

    if (loading) {
        return <div className="loading-screen">Loading network intelligence...</div>;
    }

    return (
        <div className="network-dashboard">
            {/* Hero Section */}
            <div className="dashboard-hero">
                <div className="hero-icon-wrapper">
                    <Network className="hero-icon" size={64} />
                    <div className="hero-glow"></div>
                </div>
                <h1 className="hero-title">Network Credit Intelligence</h1>
                <p className="hero-subtitle">
                    Community-powered credit insights from <strong>{networkMetrics.totalObservations.toLocaleString()}</strong> observations
                </p>
            </div>

            {/* Network Metrics */}
            <div className="metrics-grid">
                <div className="metric-card total-buyers">
                    <div className="metric-icon">
                        <Users size={32} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-label">Total Network Buyers</div>
                        <div className="metric-value">{networkMetrics.totalBuyers.toLocaleString()}</div>
                        <div className="metric-change">
                            <TrendingUp size={14} />
                            <span>+12% this month</span>
                        </div>
                    </div>
                </div>

                <div className="metric-card high-trust">
                    <div className="metric-icon">
                        <Zap size={32} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-label">High Trust Buyers</div>
                        <div className="metric-value">{networkMetrics.highTrustBuyers.toLocaleString()}</div>
                        <div className="metric-change positive">30% of network</div>
                    </div>
                </div>

                <div className="metric-card risk-buyers">
                    <div className="metric-icon">
                        <AlertTriangle size={32} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-label">Risk Profile Buyers</div>
                        <div className="metric-value">{networkMetrics.riskBuyers.toLocaleString()}</div>
                        <div className="metric-change negative">20% of network</div>
                    </div>
                </div>

                <div className="metric-card data-quality">
                    <div className="metric-icon">
                        <Activity size={32} />
                    </div>
                    <div className="metric-content">
                        <div className="metric-label">Data Quality Score</div>
                        <div className="metric-value">{networkMetrics.dataQuality}%</div>
                        <div className="metric-change">Excellent</div>
                    </div>
                </div>
            </div>

            {/* Recent Intelligence */}
            <div className="intelligence-section">
                <h2 className="section-title">Recent Network Intelligence</h2>
                <div className="intelligence-list">
                    {recentIntel.map((intel, index) => (
                        <div key={index} className={`intelligence-card severity-${intel.severity.toLowerCase()}`}>
                            <div className="intel-header">
                                <div className="intel-type-badge">{intel.type.replace('_', ' ')}</div>
                                <div className={`severity-badge ${intel.severity.toLowerCase()}`}>
                                    {intel.severity}
                                </div>
                            </div>
                            <h3 className="intel-title">{intel.title}</h3>
                            <div className="intel-evidence">
                                <span>🎯 {intel.evidence.affectedBuyerCount.toLocaleString()} buyers affected</span>
                                <span>📅 {intel.evidence.timeframe}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Network Effect Visualization */}
            <div className="network-effect-section">
                <h2 className="section-title">The Network Effect</h2>
                <div className="effect-explanation">
                    <div className="effect-card">
                        <div className="effect-number">1</div>
                        <h3>More Tenants</h3>
                        <p>Every business that joins contributes payment data</p>
                    </div>
                    <div className="arrow">→</div>
                    <div className="effect-card">
                        <div className="effect-number">2</div>
                        <h3>More Data</h3>
                        <p>Millions of payment observations create intelligence</p>
                    </div>
                    <div className="arrow">→</div>
                    <div className="effect-card">
                        <div className="effect-number">3</div>
                        <h3>Better Scores</h3>
                        <p>Higher accuracy from cross-tenant validation</p>
                    </div>
                    <div className="arrow">→</div>
                    <div className="effect-card">
                        <div className="effect-number">4</div>
                        <h3>More Value</h3>
                        <p>Attracts more tenants - the cycle continues</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NetworkDashboard;
