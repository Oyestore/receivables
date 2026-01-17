import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UserRole } from './types/auth.types';

// Lazy load route components
const SignIn = lazy(() => import('./pages/auth/signin-new'));
const Login = lazy(() => import('./pages/auth/Login'));
const SMELayout = lazy(() => import('./layouts/SMELayout'));
const LegalLayout = lazy(() => import('./layouts/LegalLayout'));
const AccountantLayout = lazy(() => import('./layouts/AccountantLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

// SME Owner Routes
const SMEDashboard = lazy(() => import('./pages/sme/Dashboard'));
const InvoiceList = lazy(() => import('./pages/sme/InvoiceList'));
const InvoiceDetails = lazy(() => import('./pages/sme/InvoiceDetails'));
const CollectionsAutopilot = lazy(() => import('./pages/sme/CollectionsAutopilot'));
const CashFlowAnalytics = lazy(() => import('./pages/sme/Analytics'));
const PaymentHistory = lazy(() => import('./pages/sme/payments/PaymentHistory'));
const PaymentMethods = lazy(() => import('./pages/sme/payments/PaymentMethods'));
const Settlements = React.lazy(() => import('./pages/sme/payments/Settlements'));

const FinancingDashboard = lazy(() => import('./pages/sme/financing/Dashboard'));
const NewFinancingApplication = lazy(() => import('./pages/sme/financing/NewApplication'));
const CreditProfile = lazy(() => import('./pages/sme/credit/CreditProfile'));

// Phase 8 Imports
const ProjectList = lazy(() => import('./pages/sme/projects/ProjectList'));
const ProjectDetails = lazy(() => import('./pages/sme/projects/ProjectDetails'));
const DisputeList = lazy(() => import('./pages/sme/disputes/DisputeList'));
const DisputeChat = lazy(() => import('./pages/sme/disputes/DisputeChat'));
const CampaignDashboard = lazy(() => import('./pages/sme/marketing/CampaignDashboard'));
const CreateCampaign = lazy(() => import('./pages/sme/marketing/CreateCampaign'));

const AdvancedReports = lazy(() => import('./pages/sme/analytics/AdvancedReports'));

// Module 17: Reconciliation & GL Routes
const ReconciliationDashboard = lazy(() => import('./pages/reconciliation/ReconciliationDashboard').then(m => ({ default: m.ReconciliationDashboard })));
const MatchReview = lazy(() => import('./pages/reconciliation/MatchReview').then(m => ({ default: m.MatchReview })));
const GeneralLedger = lazy(() => import('./pages/general-ledger/GeneralLedger').then(m => ({ default: m.GeneralLedger })));

// Module 05: Milestone Workflows
const MilestoneDashboard = lazy(() => import('./pages/milestones').then(m => ({ default: m.MilestoneDashboard })));

// Module 16: Invoice Concierge
const ConciergeChat = lazy(() => import('./pages/concierge').then(m => ({ default: m.ConciergeChat })));

// Module 13: Cross-Border Trade
const TradeDashboard = lazy(() => import('./pages/cross-border-trade').then(m => ({ default: m.TradeDashboard })));

// Module 14: Globalization & Localization
const GlobalizationDashboard = lazy(() => import('./pages/globalization').then(m => ({ default: m.GlobalizationDashboard })));

// Module 15: Credit Decisioning
const DecisionDashboard = lazy(() => import('./pages/credit-decisioning').then(m => ({ default: m.DecisionDashboard })));

// Module 10: Orchestration Hub
const OrchestrationDashboard = lazy(() => import('./pages/orchestration').then(m => ({ default: m.OrchestrationDashboard })));
const ExplainabilityDashboard = lazy(() => import('./pages/orchestration').then(m => ({ default: m.ExplainabilityDashboard })));
const ABTestAnalyzer = lazy(() => import('./pages/orchestration').then(m => ({ default: m.ABTestAnalyzer })));
const PageRankDashboard = lazy(() => import('./pages/orchestration').then(m => ({ default: m.PageRankDashboard })));
const WhatIfSimulator = lazy(() => import('./pages/orchestration').then(m => ({ default: m.WhatIfSimulator })));
const CascadePredictor = lazy(() => import('./pages/orchestration').then(m => ({ default: m.CascadePredictor })));

// Module 02: Intelligent Distribution
const DistributionDashboard = lazy(() => import('./pages/distribution').then(m => ({ default: m.DistributionDashboard })));

// New Stunning Dashboards (Phases 1-3)
const InvoiceDashboard = lazy(() => import('./pages/sme').then(m => ({ default: m.InvoiceDashboard })));
const PaymentDashboard = lazy(() => import('./pages/sme').then(m => ({ default: m.PaymentDashboard })));
const AnalyticsDashboard = lazy(() => import('./pages/sme').then(m => ({ default: m.AnalyticsDashboard })));
const CreditScoringDashboard = lazy(() => import('./pages/sme').then(m => ({ default: m.CreditScoringDashboard })));
const FinancingDashboardNew = lazy(() => import('./pages/sme').then(m => ({ default: m.FinancingDashboard })));
const DisputeDashboard = lazy(() => import('./pages/sme').then(m => ({ default: m.DisputeDashboard })));
const MarketingDashboardNew = lazy(() => import('./pages/sme').then(m => ({ default: m.MarketingDashboard })));
const NotificationDashboard = lazy(() => import('./pages/sme').then(m => ({ default: m.NotificationDashboard })));
const AdministrationDashboard = lazy(() => import('./pages/sme').then(m => ({ default: m.AdministrationDashboard })));

const Settings = React.lazy(() => import('./pages/sme/Settings'));

// Legal Partner Routes
const LegalCases = lazy(() => import('./pages/legal/Cases'));
const LegalDocuments = lazy(() => import('./pages/legal/Documents'));
const LegalClients = lazy(() => import('./pages/legal/Clients'));
const LegalCalendar = lazy(() => import('./pages/legal/Calendar'));
const LegalProfile = lazy(() => import('./pages/legal/Profile'));

// Accountant Routes
const AccountantDashboard = lazy(() => import('./pages/accountant/Dashboard'));
const Reconciliation = lazy(() => import('./pages/accountant/Reconciliation'));
const Reports = lazy(() => import('./pages/accountant/Reports'));
const BulkUpload = lazy(() => import('./pages/accountant/BulkUpload'));
const AccountantSettings = lazy(() => import('./pages/accountant/Settings'));

// Admin Routes
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const TenantManagement = lazy(() => import('./pages/admin/TenantManagement'));
const SystemConfig = lazy(() => import('./pages/admin/SystemConfig'));
const SystemLogs = lazy(() => import('./pages/admin/SystemLogs'));

const LoadingFallback = () => (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
    </Box>
);

export const AppRouter: React.FC = () => {
    return (
        <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />

                    {/* SME Owner routes */}
                    <Route
                        path="/sme/*"
                        element={
                            <ProtectedRoute requiredRoles={[UserRole.SME_OWNER]}>
                                <SMELayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="dashboard" element={<SMEDashboard />} />
                        <Route path="invoices" element={<InvoiceList />} />
                        <Route path="invoices/:id" element={<InvoiceDetails />} />
                        <Route path="autopilot" element={<CollectionsAutopilot />} />
                        <Route path="analytics" element={<CashFlowAnalytics />} />
                        <Route path="reports" element={<AdvancedReports />} />
                        <Route path="payments/history" element={<PaymentHistory />} />
                        <Route path="payments/methods" element={<PaymentMethods />} />
                        <Route path="payments/methods" element={<PaymentMethods />} />
                        <Route path="payments/settlements" element={<Settlements />} />
                        <Route path="financing" element={<FinancingDashboard />} />
                        <Route path="financing/new" element={<NewFinancingApplication />} />
                        <Route path="credit" element={<CreditProfile />} />

                        {/* Phase 8 Routes */}
                        <Route path="projects" element={<ProjectList />} />
                        <Route path="projects/:id" element={<ProjectDetails />} />
                        <Route path="disputes" element={<DisputeList />} />
                        <Route path="disputes/:id" element={<DisputeChat />} />
                        <Route path="marketing" element={<CampaignDashboard />} />
                        <Route path="marketing/new" element={<CreateCampaign />} />

                        {/* Module 05: Milestones */}
                        <Route path="milestones" element={<MilestoneDashboard />} />

                        {/* Module 16: Invoice Concierge */}
                        <Route path="concierge" element={<ConciergeChat />} />

                        {/* Module 13: Cross-Border Trade */}
                        <Route path="cross-border-trade" element={<TradeDashboard />} />

                        {/* Module 14: Globalization & Localization */}
                        <Route path="globalization" element={<GlobalizationDashboard />} />

                        {/* Module 15: Credit Decisioning */}
                        <Route path="credit-decisioning" element={<DecisionDashboard />} />

                        {/* Module 10: Orchestration Hub */}
                        <Route path="orchestration/*" element={<OrchestrationDashboard />}>
                            <Route index element={<Navigate to="explainability" replace />} />
                            <Route path="explainability" element={<ExplainabilityDashboard tenantId="current" />} />
                            <Route path="ab-test" element={<ABTestAnalyzer tenantId="current" />} />
                            <Route path="pagerank" element={<PageRankDashboard tenantId="current" />} />
                            <Route path="simulator" element={<WhatIfSimulator tenantId="current" />} />
                            <Route path="cascade" element={<CascadePredictor tenantId="current" />} />
                        </Route>

                        {/* Module 02: Intelligent Distribution */}
                        <Route path="distribution" element={<DistributionDashboard />} />

                        {/* Module 17: Reconciliation & GL */}
                        <Route path="reconciliation" element={<ReconciliationDashboard />} />
                        <Route path="reconciliation/matches" element={<MatchReview />} />
                        <Route path="general-ledger" element={<GeneralLedger />} />

                        {/* New Stunning Dashboards */}
                        <Route path="invoices-new" element={<InvoiceDashboard />} />
                        <Route path="payments-new" element={<PaymentDashboard />} />
                        <Route path="analytics-new" element={<AnalyticsDashboard />} />
                        <Route path="credit-scoring" element={<CreditScoringDashboard />} />
                        <Route path="financing-new" element={<FinancingDashboardNew />} />
                        <Route path="disputes-new" element={<DisputeDashboard />} />
                        <Route path="marketing-new" element={<MarketingDashboardNew />} />
                        <Route path="notifications" element={<NotificationDashboard />} />
                        <Route path="administration" element={<AdministrationDashboard />} />

                        <Route path="settings" element={<Settings />} />
                        <Route path="*" element={<Navigate to="/sme/dashboard" replace />} />
                    </Route>

                    {/* Legal Partner routes */}
                    <Route
                        path="/legal/*"
                        element={
                            <ProtectedRoute requiredRoles={[UserRole.LEGAL_PARTNER]}>
                                <LegalLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="cases" element={<LegalCases />} />
                        <Route path="documents" element={<LegalDocuments />} />
                        <Route path="clients" element={<LegalClients />} />
                        <Route path="calendar" element={<LegalCalendar />} />
                        <Route path="profile" element={<LegalProfile />} />
                        <Route path="*" element={<Navigate to="/legal/cases" replace />} />
                    </Route>

                    {/* Accountant routes */}
                    <Route
                        path="/accounting/*"
                        element={
                            <ProtectedRoute requiredRoles={[UserRole.ACCOUNTANT]}>
                                <AccountantLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="dashboard" element={<AccountantDashboard />} />
                        <Route path="reconciliation" element={<Reconciliation />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="bulk" element={<BulkUpload />} />
                        <Route path="settings" element={<AccountantSettings />} />
                        <Route path="*" element={<Navigate to="/accounting/dashboard" replace />} />
                    </Route>

                    {/* Admin routes */}
                    <Route
                        path="/admin/*"
                        element={
                            <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
                                <AdminLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="users" element={<UserManagement />} />
                        <Route path="tenants" element={<TenantManagement />} />
                        <Route path="system" element={<SystemConfig />} />
                        <Route path="logs" element={<SystemLogs />} />
                        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                    </Route>

                    {/* Authentication routes */}
                    <Route path="/auth/signin" element={<SignIn />} />
                    <Route path="/login" element={<Login />} />

                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/auth/signin" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
};
