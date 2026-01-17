import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
    TrendingUp,
    AlertTriangle,
    Zap,
    Target,
    ArrowRight,
    Check,
    X,
    Bell,
    Activity,
} from 'lucide-react';
import './CommandCenter.css';

/**
 * Command Center Dashboard
 * 
 * Premium Business Intelligence Dashboard
 * - Real-time metrics with WebSocket
 * - AI-generated insights with actions
 * - One-click action execution
 * - Glassmorphism design
 */
const CommandCenter = ({ tenantId = 'tenant-123' }) => {
    const [metrics, setMetrics] = useState(null);
    const [insights, setInsights] = useState([]);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch initial data
        fetchDashboardData();

        // Connect to WebSocket
        const socket = io('http://localhost:3004/intelligence', {
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            console.log('Connected to intelligence server');
            setConnected(true);
            socket.emit('subscribe', tenantId);
        });

        socket.on('initial-data', (data) => {
            console.log('Received initial data', data);
            setInsights(data.insights || []);
            setMetrics(data.metrics || {});
            setLoading(false);
        });

        socket.on('new-insight', (data) => {
            console.log('New insight received', data);
            setInsights(prev => [data.insight, ...prev]);
        });

        socket.on('metric-update', (data) => {
            console.log('Metric updated', data);
            setMetrics(prev => ({
                ...prev,
                [data.metric]: data.value,
            }));
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        return () => {
            socket.emit('unsubscribe', tenantId);
            socket.disconnect();
        };
    }, [tenantId]);

    const fetchDashboardData = async () => {
        try {
            const [metricsRes, insightsRes] = await Promise.all([
                fetch(`http://localhost:3004/api/v1/intelligence/metrics/${tenantId}`),
                fetch(`http://localhost:3004/api/v1/intelligence/insights/${tenantId}`),
            ]);

            const metricsData = await metricsRes.json();
            const insightsData = await insightsRes.json();

            setMetrics(metricsData.data);
            setInsights(insightsData.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setLoading(false);
        }
    };

    const handleActionClick = async (action) => {
        try {
            const response = await fetch(`http://localhost:3004/api/v1/intelligence/actions/${action.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(action.payload || {}),
            });

            const result = await response.json();
            console.log('Action executed:', result);

            // Show success notification
            alert(`Action "${action.label}" executed successfully!`);
        } catch (error) {
            console.error('Action failed:', error);
            alert('Action failed. Please try again.');
        }
    };

    const dismissInsight = (insightId) => {
        setInsights(prev => prev.filter(i => i.id !== insightId));
    };

    if (loading) {
        return <div className="loading-screen">Loading Intelligence...</div>;
    }

    return (
        <div className="command-center">
            {/* Header */}
            <div className="command-header">
                <div>
                    <h1 className="command-title">Business Command Center</h1>
                    <p className="command-subtitle">Your AI-Powered CFO Dashboard</p>
                </div>
                <div className="connection-status">
                    <div className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></div>
                    <span>{connected ? 'Live' : 'Offline'}</span>
                    <Bell size={20} className="notification-icon" />
                    <span className="notification-badge">3</span>
                </div>
            </div>

            {/* Hero Metrics */}
            <div className="hero-metrics">
                <div className="metric-card cash-flow">
                    <div className="metric-icon">💰</div>
                    <div className="metric-content">
                        <div className="metric-label">Cash Flow</div>
                        <div className="metric-value">
                            ₹{metrics?.cashFlow?.current ? (metrics.cashFlow.current / 100000).toFixed(1) : '0'}L
                        </div>
                        <div className={`metric-change ${metrics?.cashFlow?.trend === 'up' ? 'positive' : 'negative'}`}>
                            <TrendingUp size={16} />
                            {metrics?.cashFlow?.change || 0}% this week
                        </div>
                    </div>
                </div>

                <div className="metric-card actions">
                    <div className="metric-icon">⚡</div>
                    <div className="metric-content">
                        <div className="metric-label">Pending Actions</div>
                        <div className="metric-value">{metrics?.pendingActions?.count || 0}</div>
                        <div className="metric-change urgent">
                            {metrics?.pendingActions?.urgent || 0} urgent
                        </div>
                    </div>
                </div>

                <div className="metric-card goals">
                    <div className="metric-icon">🎯</div>
                    <div className="metric-content">
                        <div className="metric-label">Goal Progress</div>
                        <div className="metric-value">{metrics?.goalProgress?.percentage || 0}%</div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${metrics?.goalProgress?.percentage || 0}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Insights */}
            <div className="insights-section">
                <div className="section-header">
                    <h2>🤖 AI Insights</h2>
                    <span className="insight-count">{insights.length} active</span>
                </div>

                <div className="insights-container">
                    {insights.length === 0 ? (
                        <div className="no-insights">
                            <Activity size={48} />
                            <p>All good! No urgent insights right now.</p>
                        </div>
                    ) : (
                        insights.map((insight) => (
                            <div
                                key={insight.id}
                                className={`insight-card insight-${insight.type} severity-${insight.severity}`}
                            >
                                {/* Insight Header */}
                                <div className="insight-header">
                                    <div className="insight-icon">
                                        {insight.type === 'opportunity' && '🟢'}
                                        {insight.type === 'risk' && '🟡'}
                                        {insight.type === 'alert' && '🔴'}
                                        {insight.type === 'efficiency' && '🔵'}
                                    </div>
                                    <div className="insight-title-section">
                                        <h3className="insight-title">{insight.title}</h3>
                                    <span className="insight-confidence">{insight.confidence}% confidence</span>
                                </div>
                                <button
                                    className="dismiss-btn"
                                    onClick={() => dismissInsight(insight.id)}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                {/* Insight Body */ }
                            < p className = "insight-message" > { insight.message }</p>

                {insight.impact && (
                    <div className="insight-impact">
                        <Zap size={16} />
                        <span>{insight.impact}</span>
                    </div>
                )}

                {/* Actions */}
                {insight.actions && insight.actions.length > 0 && (
                    <div className="insight-actions">
                        {insight.actions.map((action) => (
                            <button
                                key={action.id}
                                className={`action-btn action-${action.type}`}
                                onClick={() => handleActionClick(action)}
                            >
                                {action.label}
                                <ArrowRight size={16} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
            ))
          )}
        </div>
      </div >

    {/* Business Pulse */ }
    < div className = "pulse-section" >
        <h2>📊 Business Pulse</h2>
        <div className="pulse-grid">
          <div className="pulse-card">
            <div className="pulse-label">Revenue Today</div>
            <div className="pulse-value">₹{metrics?.revenue?.today ? (metrics.revenue.today / 100000).toFixed(1) : '0'}L</div>
          </div>
          <div className="pulse-card">
            <div className="pulse-label">This Week</div>
            <div className="pulse-value">₹{metrics?.revenue?.thisWeek ? (metrics.revenue.thisWeek / 100000).toFixed(1) : '0'}L</div>
          </div>
          <div className="pulse-card">
            <div className="pulse-label">This Month</div>
            <div className="pulse-value">₹{metrics?.revenue?.thisMonth ? (metrics.revenue.thisMonth / 100000).toFixed(1) : '0'}L</div>
          </div>
          <div className="pulse-card">
            <div className="pulse-label">Target</div>
            <div className="pulse-value">₹{metrics?.revenue?.target ? (metrics.revenue.target / 100000).toFixed(1) : '0'}L</div>
          </div>
        </div>
      </div >
    </div >
  );
};

export default CommandCenter;
