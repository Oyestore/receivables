import { DollarSign, TrendingUp } from 'lucide-react';
import './CreditLimitPage.css';

function CreditLimitPage() {
    const limits = [
        { buyer: 'Acme Corp', current: 5000000, utilized: 3500000, recommended: 6000000, status: 'increase' },
        { buyer: 'TechStart Ltd', current: 3000000, utilized: 2800000, recommended: 2500000, status: 'decrease' },
    ];

    return (
        <div className="credit-limit-page">
            <div className="page-header">
                <DollarSign size={48} className="header-icon" />
                <div>
                    <h1>Credit Limit Management</h1>
                    <p>Monitor and adjust buyer credit limits based on risk and utilization</p>
                </div>
            </div>

            <div className="limits-grid">
                {limits.map((limit, index) => (
                    <div key={index} className="limit-card">
                        <h3>{limit.buyer}</h3>
                        <div className="limit-metrics">
                            <div className="metric">
                                <div className="metric-label">Current Limit</div>
                                <div className="metric-value">₹{(limit.current / 100000).toFixed(1)}L</div>
                            </div>
                            <div className="metric">
                                <div className="metric-label">Utilized</div>
                                <div className="metric-value">₹{(limit.utilized / 100000).toFixed(1)}L</div>
                            </div>
                            <div className="metric">
                                <div className="metric-label">Recommended</div>
                                <div className={`metric-value ${limit.status}`}>
                                    <TrendingUp size={16} />
                                    ₹{(limit.recommended / 100000).toFixed(1)}L
                                </div>
                            </div>
                        </div>
                        <div className="utilization-bar">
                            <div className="utilization-fill" style={{ width: `${(limit.utilized / limit.current) * 100}%` }}></div>
                        </div>
                        <button className="apply-btn">Apply Recommendation</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default CreditLimitPage;
