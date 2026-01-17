import React, { useState } from 'react';
import WorkflowDashboard from './components/WorkflowDashboard';
import AIPredictions from './components/AIPredictions';
import RiskMonitoring from './components/RiskMonitoring';
import EvidenceValidation from './components/EvidenceValidation';
import { Activity, Brain, AlertTriangle, FileCheck } from 'lucide-react';
import './App.css';

/**
 * Module 05: AI-Powered Workflow Management
 * 
 * Main application with tab navigation
 * - Workflow tracking with real-time updates
 * - AI predictions and risk monitoring
 * - Autonomous evidence validation
 */
function App() {
    const [activeTab, setActiveTab] = useState('workflows');
    const [tenantId] = useState('tenant-123');

    const tabs = [
        { id: 'workflows', label: 'Workflows', icon: Activity },
        { id: 'predictions', label: 'AI Predictions', icon: Brain },
        { id: 'risks', label: 'Risk Monitor', icon: AlertTriangle },
        { id: 'evidence', label: 'Evidence', icon: FileCheck },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'workflows':
                return <WorkflowDashboard tenantId={tenantId} />;
            case 'predictions':
                return <AIPredictions tenantId={tenantId} />;
            case 'risks':
                return <RiskMonitoring tenantId={tenantId} />;
            case 'evidence':
                return <EvidenceValidation tenantId={tenantId} />;
            default:
                return <WorkflowDashboard tenantId={tenantId} />;
        }
    };

    return (
        <div className="app">
            {/* Header */}
            <header className="app-header">
                <div className="header-content">
                    <div className="logo-section">
                        <div className="logo">🚀</div>
                        <div>
                            <h1 className="app-title">Milestone Workflows</h1>
                            <p className="app-subtitle">AI-Powered Project Management</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        <div className="live-indicator">
                            <div className="pulse-dot"></div>
                            <span>Live</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <nav className="tab-navigation">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={20} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Main Content */}
            <main className="app-content">
                {renderContent()}
            </main>
        </div>
    );
}

export default App;
