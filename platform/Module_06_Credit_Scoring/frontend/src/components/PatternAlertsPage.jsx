import { AlertCircle, TrendingDown, MapPin } from 'lucide-react';
import './PatternAlertsPage.css';

function PatternAlertsPage() {
    const patterns = [
        {
            type: 'EMERGING_RISK',
            severity: 'HIGH',
            title: 'Real Estate sector payment delays increased 42%',
            affectedBuyers: 1834,
            recommendation: 'Tighten credit terms for this sector',
        },
        {
            type: 'GEOGRAPHIC_STRESS',
            severity: 'MEDIUM',
            title: 'Karnataka region showing payment stress',
            affectedBuyers: 512,
            recommendation: 'Monitor regional economic indicators',
        },
    ];

    return (
        <div className="pattern-alerts-page">
            <div className="page-header">
                <AlertCircle size={48} className="header-icon" />
                <div>
                    <h1>AI Pattern Detection</h1>
                    <p>Network-wide intelligence and emerging risk alerts</p>
                </div>
            </div>

            <div className="alerts-list">
                {patterns.map((pattern, index) => (
                    <div key={index} className={`alert-card severity-${pattern.severity.toLowerCase()}`}>
                        <div className="alert-badge">{pattern.severity}</div>
                        <h3>{pattern.title}</h3>
                        <div className="alert-meta">
                            🎯 {pattern.affectedBuyers.toLocaleString()} buyers affected
                        </div>
                        <div className="alert-recommendation">
                            💡 {pattern.recommendation}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default PatternAlertsPage;
