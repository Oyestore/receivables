import { useState } from 'react';
import { Network, TrendingUp, Shield, DollarSign, AlertCircle, Settings, BarChart3 } from 'lucide-react';
import NetworkDashboard from './components/NetworkDashboard';
import CommunityScoreCard from './components/CommunityScoreCard';
import CreditAssessmentPage from './components/CreditAssessmentPage';
import RiskDashboard from './components/RiskDashboard';
import CreditLimitPage from './components/CreditLimitPage';
import PatternAlertsPage from './components/PatternAlertsPage';
import SettingsPage from './components/SettingsPage';
import './App.css';

function App() {
    const [activeTab, setActiveTab] = useState('network');

    const tabs = [
        { id: 'network', name: 'Network Intelligence', icon: Network },
        { id: 'community', name: 'Community Scores', icon: TrendingUp },
        { id: 'assessment', name: 'Credit Assessment', icon: BarChart3 },
        { id: 'risk', name: 'Risk Management', icon: Shield },
        { id: 'limits', name: 'Credit Limits', icon: DollarSign },
        { id: 'patterns', name: 'Pattern Alerts', icon: AlertCircle },
        { id: 'settings', name: 'Settings', icon: Settings },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'network':
                return <NetworkDashboard />;
            case 'community':
                return <CommunityScoreCard />;
            case 'assessment':
                return <CreditAssessmentPage />;
            case 'risk':
                return <RiskDashboard />;
            case 'limits':
                return <CreditLimitPage />;
            case 'patterns':
                return <PatternAlertsPage />;
            case 'settings':
                return <SettingsPage />;
            default:
                return <NetworkDashboard />;
        }
    };

    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="header-content">
                    <div className="logo-section">
                        <div className="logo">🏦</div>
                        <div>
                            <h1 className="app-title">Network Credit Intelligence</h1>
                            <p className="app-subtitle">Community-Powered Risk Management</p>
                        </div>
                    </div>
                    <div className="live-indicator">
                        <div className="pulse-dot"></div>
                        <span>Network Live</span>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <nav className="tab-navigation">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={18} />
                            <span>{tab.name}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Main Content */}
            <main className="app-content">{renderContent()}</main>
        </div>
    );
}

export default App;
