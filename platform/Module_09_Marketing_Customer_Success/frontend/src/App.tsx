import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CustomerHealthDashboard from './pages/CustomerHealthDashboard';
import ChurnInterventionCenter from './pages/ChurnInterventionCenter';
import PlaybookBuilder from './pages/PlaybookBuilder';
import UsageAnalyticsDashboard from './pages/UsageAnalyticsDashboard';
import FeedbackCenter from './pages/FeedbackCenter';
import ExpansionPipeline from './pages/ExpansionPipeline';
import NetworkIntelligenceDashboard from './pages/NetworkIntelligenceDashboard';
import ReferralDashboard from './pages/ReferralDashboard';
import CommunityPlatform from './pages/CommunityPlatform';
import RevenueAnalyticsDashboard from './pages/RevenueAnalyticsDashboard';
import PartnerAPIPortal from './pages/PartnerAPIPortal';

function App() {
    return (
        <div className="min-h-screen bg-background">
            <Routes>
                <Route path="/" element={<Navigate to="/customer-success/health" replace />} />
                <Route path="/customer-success">
                    <Route path="health" element={<CustomerHealthDashboard />} />
                    <Route path="churn-intervention" element={<ChurnInterventionCenter />} />
                    <Route path="playbooks" element={<PlaybookBuilder />} />
                    <Route path="usage-analytics" element={<UsageAnalyticsDashboard />} />
                    <Route path="feedback" element={<FeedbackCenter />} />
                    <Route path="expansion" element={<ExpansionPipeline />} />
                    <Route index element={<Navigate to="health" replace />} />
                </Route>
                <Route path="/growth">
                    <Route path="network-intelligence" element={<NetworkIntelligenceDashboard />} />
                    <Route path="referrals" element={<ReferralDashboard />} />
                    <Route path="community" element={<CommunityPlatform />} />
                </Route>
                <Route path="/analytics">
                    <Route path="revenue" element={<RevenueAnalyticsDashboard />} />
                </Route>
                <Route path="/partners">
                    <Route path="dashboard" element={<PartnerAPIPortal />} />
                </Route>
            </Routes>
        </div>
    );
}

export default App;
