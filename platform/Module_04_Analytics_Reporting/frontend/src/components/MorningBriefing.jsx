import React, { useState, useEffect } from 'react';
import {
    Sun,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Clock,
    Target,
    ArrowRight,
    ChevronRight
} from 'lucide-react';
import './MorningBriefing.css';

/**
 * Morning Briefing Component
 * 
 * Daily AI-generated business summary
 * Delivered every morning at 9 AM
 * Shows priority actions, highlights, predictions
 */
const MorningBriefing = ({ tenantId = 'tenant-123', onClose }) => {
    const [briefing, setBriefing] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBriefing();
    }, [tenantId]);

    const fetchBriefing = async () => {
        try {
            const response = await fetch(
                `http://localhost:3004/api/v1/intelligence/morning-briefing/${tenantId}`
            );
            const data = await response.json();
            setBriefing(data.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch briefing:', error);
            setLoading(false);
        }
    };

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return { icon: <Sun size={32} />, text: 'Good Morning' };
        if (hour < 17) return { icon: <Sun size={32} />, text: 'Good Afternoon' };
        return { icon: <Sun size={32} />, text: 'Good Evening' };
    };

    if (loading) {
        return (
            <div className="briefing-container">
                <div className="briefing-loading">Loading your briefing...</div>
            </div>
        );
    }

    const greeting = getTimeGreeting();

    return (
        <div className="briefing-container">
            {/* Header */}
            <div className="briefing-header">
                <div className="briefing-greeting">
                    <div className="greeting-icon">{greeting.icon}</div>
                    <div>
                        <h1>{greeting.text}!</h1>
                        <p>Here's your business briefing for {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric'
                        })}</p>
                    </div>
                </div>
                {onClose && (
                    <button className="close-briefing" onClick={onClose}>×</button>
                )}
            </div>

            {/* Priority Actions */}
            <div className="briefing-section priority-section">
                <div className="section-header">
                    <Clock size={20} />
                    <h2>Priority Actions</h2>
                    <span className="time-estimate">~5 minutes</span>
                </div>

                <div className="priority-actions">
                    {(briefing?.priorityActions || [
                        'Call XYZ Corp about ₹2.5L invoice',
                        'Review ABC Corp upsell proposal',
                        'Approve payment plan for 3 customers'
                    ]).map((action, idx) => (
                        <div key={idx} className="priority-item">
                            <div className="priority-number">{idx + 1}</div>
                            <div className="priority-content">
                                <span>{action}</span>
                                <button className="quick-action-btn">
                                    Take Action <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cash Position */}
            <div className="briefing-section cash-section">
                <div className="section-header">
                    <TrendingUp size={20} />
                    <h2>Cash Position</h2>
                </div>

                <div className="cash-overview">
                    <div className="cash-main">
                        <div className="cash-status healthy">Healthy</div>
                        <div className="cash-amount">{briefing?.cashPosition || '+₹12.5L'}</div>
                    </div>

                    <div className="cash-details">
                        <div className="cash-detail">
                            <span>Expected in 7 days:</span>
                            <strong>₹8.2L</strong>
                        </div>
                        <div className="cash-detail warning">
                            <span>At risk:</span>
                            <strong>₹1.5L (3 invoices)</strong>
                        </div>
                    </div>
                </div>
            </div>

            {/* Yesterday's Highlights */}
            <div className="briefing-section highlights-section">
                <div className="section-header">
                    <CheckCircle size={20} />
                    <h2>Yesterday's Highlights</h2>
                </div>

                <div className="highlights-grid">
                    {(briefing?.highlights || [
                        { type: 'success', text: '12 invoices paid (₹4.2L)' },
                        { type: 'warning', text: '2 payment failures (Gateway issue)' },
                        { type: 'achievement', text: 'New record: Fastest payment (2 hours!)' }
                    ]).map((highlight, idx) => (
                        <div key={idx} className={`highlight-item ${highlight.type || 'info'}`}>
                            {highlight.type === 'success' && '✅'}
                            {highlight.type === 'warning' && '⚠️'}
                            {highlight.type === 'achievement' && '🎉'}
                            <span>{highlight.text || highlight}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Prediction */}
            <div className="briefing-section prediction-section">
                <div className="section-header">
                    <Target size={20} />
                    <h2>Today's Prediction</h2>
                </div>

                <div className="prediction-card">
                    <div className="prediction-content">
                        <div className="prediction-text">
                            {briefing?.prediction || "You'll hit monthly target by Jan 25"}
                        </div>
                        <div className="prediction-confidence">
                            <div className="confidence-bar">
                                <div className="confidence-fill" style={{ width: '92%' }}></div>
                            </div>
                            <span>92% confidence</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="briefing-stats">
                <div className="stat-item">
                    <div className="stat-value">15</div>
                    <div className="stat-label">Invoices Due This Week</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">₹18.5L</div>
                    <div className="stat-label">Total Due</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">3</div>
                    <div className="stat-label">Urgent Follow-ups</div>
                </div>
            </div>

            {/* Actions */}
            <div className="briefing-actions">
                <button className="primary-btn" onClick={() => window.location.href = '#dashboard'}>
                    View Full Dashboard
                    <ChevronRight size={20} />
                </button>
                <button className="secondary-btn" onClick={onClose}>
                    Dismiss Briefing
                </button>
            </div>
        </div>
    );
};

export default MorningBriefing;
