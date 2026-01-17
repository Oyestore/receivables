import React, { useState } from 'react';
import {
    VStack,
    HStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { FiCheckCircle, FiAlertTriangle, FiFileText, FiZap } from 'react-icons/fi';
import './ComplianceChecker.css';

interface ComplianceCheck {
    id: string;
    category: 'contract' | 'tax' | 'legal';
    item: string;
    status: 'compliant' | 'warning' | 'non_compliant';
    details: string;
    recommendation?: string;
}

interface ComplianceCheckerProps {
    tenantId: string;
}

const ComplianceChecker: React.FC<ComplianceCheckerProps> = ({ tenantId }) => {
    const [checks, setChecks] = useState<ComplianceCheck[]>([
        {
            id: 'c1',
            category: 'contract',
            item: 'Payment Terms in Acme Corp MSA',
            status: 'compliant',
            details: 'Net 30 payment terms clearly defined',
        },
        {
            id: 'c2',
            category: 'tax',
            item: 'GST Compliance - Q4 2025',
            status: 'warning',
            details: 'One invoice missing HSN code',
            recommendation: 'Add HSN code 9983 to INV-045',
        },
        {
            id: 'c3',
            category: 'legal',
            item: 'NDA with Startup Inc',
            status: 'non_compliant',
            details: 'NDA expired 15 days ago',
            recommendation: 'Urgent: Renew NDA before next invoice',
        },
    ]);

    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const handleAutoFix = (id: string) => {
        setToastMessage('AI Auto-Fix Applied');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);

        setChecks(prev => prev.map(c =>
            c.id === id ? { ...c, status: 'compliant' as const } : c
        ));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'compliant':
                return 'green';
            case 'warning':
                return 'orange';
            case 'non_compliant':
                return 'red';
            default:
                return 'gray';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'compliant':
                return FiCheckCircle;
            case 'warning':
                return FiAlertTriangle;
            case 'non_compliant':
                return FiAlertTriangle;
            default:
                return FiFileText;
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'contract':
                return FiFileText;
            case 'tax':
                return FiFileText;
            case 'legal':
                return FiFileText;
            default:
                return FiFileText;
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'warning';
        return 'critical';
    };

    const getScoreDescription = (score: number) => {
        if (score >= 90) return 'Excellent';
        if (score >= 75) return 'Good';
        if (score >= 60) return 'Needs Attention';
        return 'Critical';
    };

    const compliantCount = checks.filter(c => c.status === 'compliant').length;
    const totalCount = checks.length;
    const complianceScore = (compliantCount / totalCount) * 100;
    const scoreColor = getScoreColor(complianceScore);

    const groupedChecks = checks.reduce((acc, check) => {
        if (!acc[check.category]) {
            acc[check.category] = [];
        }
        acc[check.category].push(check);
        return acc;
    }, {} as Record<string, ComplianceCheck[]>);

    return (
        <VStack gap={6} align="stretch">
            {/* Header */}
            <h2 className="heading heading-lg color-gray-800">
                <Icon as={FiFileText} className="icon mr-2" />
                Compliance Checker
            </h2>

            {/* Compliance Score Overview */}
            <div className="compliance-overview">
                <div className="compliance-score-card">
                    <div className={`score-value ${scoreColor}`}>
                        {complianceScore.toFixed(0)}%
                    </div>
                    <div className="score-label">Overall Score</div>
                    <div className="score-description">{getScoreDescription(complianceScore)}</div>
                </div>

                <div className="compliance-score-card">
                    <div className="score-value color-green-600">
                        {compliantCount}
                    </div>
                    <div className="score-label">Compliant Items</div>
                    <div className="score-description">Passed checks</div>
                </div>

                <div className="compliance-score-card">
                    <div className="score-value color-orange-500">
                        {checks.filter(c => c.status === 'warning').length}
                    </div>
                    <div className="score-label">Warnings</div>
                    <div className="score-description">Need attention</div>
                </div>

                <div className="compliance-score-card">
                    <div className="score-value color-red-600">
                        {checks.filter(c => c.status === 'non_compliant').length}
                    </div>
                    <div className="score-label">Non-Compliant</div>
                    <div className="score-description">Urgent action</div>
                </div>
            </div>

            {/* Compliance Categories */}
            <div className="compliance-categories">
                {Object.entries(groupedChecks).map(([category, categoryChecks]) => {
                    const categoryCompliant = categoryChecks.filter(c => c.status === 'compliant').length;
                    const categoryScore = (categoryCompliant / categoryChecks.length) * 100;
                    const categoryColor = getScoreColor(categoryScore);

                    return (
                        <div key={category} className="compliance-category">
                            <div className="category-header">
                                <h3 className="category-title">
                                    <Icon as={getCategoryIcon(category)} className="icon" />
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                </h3>
                                <span className={`category-score ${categoryColor}`}>
                                    {categoryScore.toFixed(0)}%
                                </span>
                            </div>

                            <div className="compliance-items">
                                {categoryChecks.map((check) => (
                                    <div key={check.id} className={`compliance-item ${check.status}`}>
                                        <Icon 
                                            as={getStatusIcon(check.status)} 
                                            className={`item-icon ${check.status}`}
                                        />
                                        <div className="item-content">
                                            <div className="item-title">{check.item}</div>
                                            <div className="item-description">{check.details}</div>
                                            {check.recommendation && (
                                                <div className="item-description color-orange-600 mt-2">
                                                    <strong>Recommendation:</strong> {check.recommendation}
                                                </div>
                                            )}
                                        </div>
                                        <div className="h-stack gap-2">
                                            <Badge className={`badge badge-${getStatusColor(check.status)}`}>
                                                {check.status.replace('_', ' ')}
                                            </Badge>
                                            {check.status !== 'compliant' && (
                                                <button
                                                    className="button button-blue button-sm"
                                                    onClick={() => handleAutoFix(check.id)}
                                                >
                                                    <Icon as={FiZap} className="icon mr-1" />
                                                    Auto-Fix
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Compliance Report */}
            <div className="compliance-report">
                <h3 className="report-title">Detailed Compliance Report</h3>
                
                <div className="report-section">
                    <h4 className="section-title">Summary Statistics</h4>
                    <div className="report-item">
                        <span className="report-label">Total Compliance Checks</span>
                        <span className="report-value">{totalCount}</span>
                    </div>
                    <div className="report-item">
                        <span className="report-label">Compliance Rate</span>
                        <span className="report-value">{complianceScore.toFixed(1)}%</span>
                    </div>
                    <div className="report-item">
                        <span className="report-label">Critical Issues</span>
                        <span className="report-value color-red-600">
                            {checks.filter(c => c.status === 'non_compliant').length}
                        </span>
                    </div>
                    <div className="report-item">
                        <span className="report-label">Warnings</span>
                        <span className="report-value color-orange-500">
                            {checks.filter(c => c.status === 'warning').length}
                        </span>
                    </div>
                </div>

                <div className="report-section">
                    <h4 className="section-title">Category Breakdown</h4>
                    {Object.entries(groupedChecks).map(([category, categoryChecks]) => {
                        const categoryCompliant = categoryChecks.filter(c => c.status === 'compliant').length;
                        const categoryScore = (categoryCompliant / categoryChecks.length) * 100;
                        
                        return (
                            <div key={category} className="report-item">
                                <span className="report-label">
                                    {category.charAt(0).toUpperCase() + category.slice(1)}
                                </span>
                                <span className="report-value">{categoryScore.toFixed(1)}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* AI Insights */}
            <div className="card bg-cfo-secondary-50 border-radius-lg">
                <div className="card-body">
                    <VStack gap={3} align="start">
                        <h3 className="heading heading-sm color-gray-800">
                            🤖 AI Compliance Insights
                        </h3>
                        <div className="v-stack gap-2">
                            <div className="h-stack gap-3">
                                <Icon as={FiCheckCircle} className="icon" style={{ color: '#805ad5' }} />
                                <span className="text text-sm color-gray-700">
                                    Your overall compliance score of {complianceScore.toFixed(0)}% is {complianceScore >= 75 ? 'good' : 'below target'}. 
                                    Focus on addressing critical issues first.
                                </span>
                            </div>
                            <div className="h-stack gap-3">
                                <Icon as={FiAlertTriangle} className="icon" style={{ color: '#805ad5' }} />
                                <span className="text text-sm color-gray-700">
                                    {checks.filter(c => c.status === 'non_compliant').length} critical issues require immediate attention 
                                    to avoid potential legal or financial penalties.
                                </span>
                            </div>
                            <div className="h-stack gap-3">
                                <Icon as={FiZap} className="icon" style={{ color: '#805ad5' }} />
                                <span className="text text-sm color-gray-700">
                                    AI Auto-Fix can resolve {checks.filter(c => c.status === 'warning').length} warning items automatically. 
                                    Review and apply fixes to improve compliance score.
                                </span>
                            </div>
                        </div>
                    </VStack>
                </div>
            </div>

            {/* Actions */}
            <div className="compliance-actions">
                <button className="button button-blue button-sm">
                    <Icon as={FiFileText} className="icon mr-1" />
                    Download Report
                </button>
                <button className="button button-outline button-sm">
                    <Icon as={FiZap} className="icon mr-1" />
                    Auto-Fix All Warnings
                </button>
            </div>

            {/* Toast Notification */}
            {showToast && (
                <div className={`toast toast-${toastType}`}>
                    <div className="toast-title">
                        {toastType === 'success' ? 'Success' : 'Error'}
                    </div>
                    <div className="toast-message">{toastMessage}</div>
                </div>
            )}
        </VStack>
    );
};

export default ComplianceChecker;
