import { useState } from 'react';
import { Award, TrendingUp, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import './CommunityScoreCard.css';

function CommunityScoreCard() {
    const [buyerPAN, setBuyerPAN] = useState('');
    const [scoreData, setScoreData] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!buyerPAN) return;

        setLoading(true);
        // Mock API call
        setTimeout(() => {
            setScoreData({
                communityScore: 87,
                trustTier: 'Platinum',
                dataPoints: 247,
                confidence: 94,
                aggregateMetrics: {
                    avgDaysToPay: 32,
                    onTimePaymentRate: 89,
                    disputeRate: 2,
                },
                industryRank: 12,
                trendDirection: 'improving',
                badges: [
                    'Verified by 50+ businesses',
                    'Excellent payment record',
                    'Top 15% in industry',
                ],
            });
            setLoading(false);
        }, 800);
    };

    const getTrustTierColor = (tier) => {
        const colors = {
            Diamond: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
            Platinum: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
            Gold: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            Silver: 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
            Bronze: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
        };
        return colors[tier] || colors.Bronze;
    };

    return (
        <div className="community-score-card">
            {/* Search Section */}
            <div className="search-section">
                <h2 className="section-title">Check Community Credit Score</h2>
                <div className="search-box">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Enter Buyer PAN..."
                        value={buyerPAN}
                        onChange={(e) => setBuyerPAN(e.target.value.toUpperCase())}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <button className="search-btn" onClick={handleSearch} disabled={loading}>
                        {loading ? 'Searching...' : 'Get Score'}
                    </button>
                </div>
            </div>

            {/* Score Display */}
            {scoreData && (
                <div className="score-results">
                    {/* Trust Tier Badge */}
                    <div className="trust-tier-display" style={{ background: getTrustTierColor(scoreData.trustTier) }}>
                        <div className="tier-icon">
                            <Award size={64} />
                        </div>
                        <h1 className="tier-name">{scoreData.trustTier}</h1>
                        <div className="tier-score">{scoreData.communityScore}/100</div>
                        <div className="tier-subtitle">Community Credit Score</div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="score-metrics">
                        <div className="metric-item">
                            <div className="metric-label">Data Points</div>
                            <div className="metric-value">{scoreData.dataPoints}</div>
                            <div className="metric-subtitle">Network observations</div>
                        </div>
                        <div className="metric-item">
                            <div className="metric-label">Confidence</div>
                            <div className="metric-value">{scoreData.confidence}%</div>
                            <div className="metric-subtitle">Score reliability</div>
                        </div>
                        <div className="metric-item">
                            <div className="metric-label">Industry Rank</div>
                            <div className="metric-value">Top {scoreData.industryRank}%</div>
                            <div className="metric-subtitle">Percentile</div>
                        </div>
                        <div className="metric-item trend">
                            <div className="metric-label">Trend</div>
                            <div className="metric-value trending">
                                <TrendingUp size={24} />
                                {scoreData.trendDirection}
                            </div>
                            <div className="metric-subtitle">Last 90 days</div>
                        </div>
                    </div>

                    {/* Aggregate Metrics */}
                    <div className="aggregate-section">
                        <h3>Payment Behavior</h3>
                        <div className="aggregate-grid">
                            <div className="aggregate-card">
                                <div className="aggregate-icon good">
                                    <CheckCircle size={24} />
                                </div>
                                <div className="aggregate-content">
                                    <div className="aggregate-label">On-Time Rate</div>
                                    <div className="aggregate-value">{scoreData.aggregateMetrics.onTimePaymentRate}%</div>
                                </div>
                            </div>
                            <div className="aggregate-card">
                                <div className="aggregate-icon neutral">
                                    <Shield size={24} />
                                </div>
                                <div className="aggregate-content">
                                    <div className="aggregate-label">Avg Days to Pay</div>
                                    <div className="aggregate-value">{scoreData.aggregateMetrics.avgDaysToPay} days</div>
                                </div>
                            </div>
                            <div className="aggregate-card">
                                <div className="aggregate-icon excellent">
                                    <AlertCircle size={24} />
                                </div>
                                <div className="aggregate-content">
                                    <div className="aggregate-label">Dispute Rate</div>
                                    <div className="aggregate-value">{scoreData.aggregateMetrics.disputeRate}%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trust Badges */}
                    <div className="badges-section">
                        <h3>Trust Badges</h3>
                        <div className="badges-grid">
                            {scoreData.badges.map((badge, index) => (
                                <div key={index} className="trust-badge">
                                    <CheckCircle size={16} />
                                    <span>{badge}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!scoreData && !loading && (
                <div className="empty-state">
                    <Shield size={64} className="empty-icon" />
                    <h3>Enter a Buyer PAN</h3>
                    <p>Get instant access to community-verified credit intelligence</p>
                </div>
            )}
        </div>
    );
}

export default CommunityScoreCard;
