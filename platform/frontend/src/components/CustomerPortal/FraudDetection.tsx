import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    Icon,
    Badge,
} from '@chakra-ui/react';
import { FiAlertTriangle, FiShield, FiX, FiCheck } from 'react-icons/fi';
import axios from 'axios';
import './FraudDetection.css';

interface FraudAlert {
    type: 'bank_account_change' | 'amount_anomaly' | 'email_domain_change' | 'suspicious_pattern';
    severity: 'high' | 'medium' | 'low';
    message: string;
}

interface FraudDetectionProps {
    invoice: any;
    sessionId: string;
    vendorHistory?: any[];
}

const FraudDetection: React.FC<FraudDetectionProps> = ({
    invoice,
    sessionId,
    vendorHistory = [],
}) => {
    const [alerts, setAlerts] = useState<FraudAlert[]>([]);
    const [isSuspicious, setIsSuspicious] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [isOpen, setIsOpen] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        analyzeInvoiceForFraud();
    }, [invoice, vendorHistory]);

    const analyzeInvoiceForFraud = () => {
        const detectedAlerts: FraudAlert[] = [];

        if (vendorHistory.length > 0) {
            const lastInvoice = vendorHistory[0];

            // Check 1: Bank Account Change
            if (invoice.bankAccount && lastInvoice.bankAccount !== invoice.bankAccount) {
                detectedAlerts.push({
                    type: 'bank_account_change',
                    severity: 'high',
                    message: 'Bank account is different from previous invoices',
                });
            }

            // Check 2: Amount Anomaly
            const avgAmount = vendorHistory.reduce((sum, inv) => sum + inv.amount, 0) / vendorHistory.length;
            const percentageDiff = ((invoice.total - avgAmount) / avgAmount) * 100;

            if (percentageDiff > 200) {
                detectedAlerts.push({
                    type: 'amount_anomaly',
                    severity: 'high',
                    message: `Invoice amount is ${percentageDiff.toFixed(0)}% higher than average`,
                });
            } else if (percentageDiff > 100) {
                detectedAlerts.push({
                    type: 'amount_anomaly',
                    severity: 'medium',
                    message: `Invoice amount is ${percentageDiff.toFixed(0)}% higher than average`,
                });
            }

            // Check 3: Email Domain Change
            if (invoice.vendor.email && lastInvoice.vendor.email) {
                const lastDomain = lastInvoice.vendor.email.split('@')[1];
                const currentDomain = invoice.vendor.email.split('@')[1];

                if (lastDomain !== currentDomain) {
                    detectedAlerts.push({
                        type: 'email_domain_change',
                        severity: 'medium',
                        message: 'Vendor email domain has changed',
                    });
                }
            }
        }

        // Check 4: Suspicious Pattern
        if (invoice.total > 1000000 && invoice.vendor.isNew) {
            detectedAlerts.push({
                type: 'suspicious_pattern',
                severity: 'high',
                message: 'High-value invoice from new vendor',
            });
        }

        setAlerts(detectedAlerts);
        setIsSuspicious(detectedAlerts.some(alert => alert.severity === 'high'));
    };

    const handleDismiss = () => {
        setDismissed(true);
        setIsOpen(false);
    };

    const handleReportFraud = async () => {
        try {
            await axios.post('/api/report-fraud', {
                invoiceId: invoice.id,
                vendorId: invoice.vendor.id,
                sessionId,
                alerts,
            });

            setToastMessage('Fraud report submitted successfully');
            setToastType('success');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            setToastMessage('Failed to submit fraud report');
            setToastType('error');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    const handleProceedAnyway = () => {
        setToastMessage('Proceeding with payment - please verify manually');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        handleDismiss();
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high':
                return 'danger';
            case 'medium':
                return 'warning';
            case 'low':
                return 'info';
            default:
                return 'info';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'high':
                return <FiAlertTriangle />;
            case 'medium':
                return <FiAlertTriangle />;
            case 'low':
                return <FiShield />;
            default:
                return <FiShield />;
        }
    };

    const getAlertTypeLabel = (type: string) => {
        switch (type) {
            case 'bank_account_change':
                return 'Bank Account Change';
            case 'amount_anomaly':
                return 'Amount Anomaly';
            case 'email_domain_change':
                return 'Email Domain Change';
            case 'suspicious_pattern':
                return 'Suspicious Pattern';
            default:
                return 'Unknown';
        }
    };

    const calculateRiskScore = () => {
        let score = 0;
        alerts.forEach(alert => {
            switch (alert.severity) {
                case 'high':
                    score += 30;
                    break;
                case 'medium':
                    score += 15;
                    break;
                case 'low':
                    score += 5;
                    break;
            }
        });
        return Math.min(score, 100);
    };

    const getRiskLevel = (score: number) => {
        if (score >= 70) return 'high';
        if (score >= 40) return 'medium';
        return 'low';
    };

    const riskScore = calculateRiskScore();
    const riskLevel = getRiskLevel(riskScore);

    if (dismissed || alerts.length === 0) return null;

    return (
        <>
            <div className="fraud-detection">
                <VStack gap={6} align="stretch">
                    {/* Header */}
                    <div className="detection-header">
                        <h2 className="detection-title">
                            <Icon as={FiShield} className="icon mr-2" />
                            Fraud Detection System
                        </h2>
                        <div className="detection-actions">
                            <button className="button button-outline button-sm" onClick={handleDismiss}>
                                Dismiss
                            </button>
                        </div>
                    </div>

                    {/* Risk Assessment */}
                    <div className="risk-assessment">
                        <div className="assessment-header">
                            <h3 className="assessment-title">Risk Assessment</h3>
                            <div className="risk-score">
                                <span className={`score-value ${riskLevel}`}>
                                    {riskScore}/100
                                </span>
                                <span className="score-label">
                                    Risk Level: {riskLevel.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div className="progress-bar">
                            <div className={`progress-fill ${riskLevel}`} style={{ width: `${riskScore}%` }}></div>
                        </div>
                        <div className="assessment-factors">
                            <div className="factor-item">
                                <div className={`factor-icon ${riskLevel}`}>
                                    {getSeverityIcon(riskLevel)}
                                </div>
                                <div className="factor-content">
                                    <div className="factor-title">Overall Risk Score</div>
                                    <div className="factor-description">
                                        Based on {alerts.length} detected risk factors
                                    </div>
                                </div>
                                <div className={`factor-score ${riskLevel}`}>
                                    {riskScore}/100
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detection Results */}
                    <div className="detection-results">
                        <div className="results-header">
                            <h3 className="results-title">Detection Results</h3>
                            <div className="status-indicator danger">
                                <Icon as={FiAlertTriangle} className="icon mr-1" />
                                {alerts.length} Alerts Found
                            </div>
                        </div>
                        <div className="results-list">
                            {alerts.map((alert, index) => (
                                <div key={index} className={`result-item ${getSeverityColor(alert.severity)}`}>
                                    <div className={`result-icon ${getSeverityColor(alert.severity)}`}>
                                        {getSeverityIcon(alert.severity)}
                                    </div>
                                    <div className="result-content">
                                        <div className="result-title">
                                            {getAlertTypeLabel(alert.type)}
                                        </div>
                                        <div className="result-description">
                                            {alert.message}
                                        </div>
                                        <div className="result-action">
                                            <button className={`result-button ${getSeverityColor(alert.severity)}`}>
                                                Review Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="recommendations">
                        <h3 className="recommendations-title">
                            <Icon as={FiShield} className="icon mr-2" />
                            AI Recommendations
                        </h3>
                        <div className="recommendations-list">
                            <div className="recommendation-item">
                                <div className="recommendation-icon">
                                    <Icon as={FiCheck} className="icon" />
                                </div>
                                <div className="recommendation-content">
                                    <div className="recommendation-title">Manual Verification Required</div>
                                    <div className="recommendation-description">
                                        Due to detected risk factors, we recommend manual verification before proceeding with payment.
                                    </div>
                                </div>
                            </div>
                            <div className="recommendation-item">
                                <div className="recommendation-icon">
                                    <Icon as={FiAlertTriangle} className="icon" />
                                </div>
                                <div className="recommendation-content">
                                    <div className="recommendation-title">Contact Vendor Directly</div>
                                    <div className="recommendation-description">
                                        Verify the invoice details directly with the vendor using known contact information.
                                    </div>
                                </div>
                            </div>
                            <div className="recommendation-item">
                                <div className="recommendation-icon">
                                    <Icon as={FiShield} className="icon" />
                                </div>
                                <div className="recommendation-content">
                                    <div className="recommendation-title">Enable Additional Security</div>
                                    <div className="recommendation-description">
                                        Consider enabling two-factor authentication for this payment if available.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="action-buttons">
                        <button className="action-button primary" onClick={handleReportFraud}>
                            <Icon as={FiAlertTriangle} className="icon mr-1" />
                            Report as Fraud
                        </button>
                        <button className="action-button secondary" onClick={handleProceedAnyway}>
                            <Icon as={FiCheck} className="icon mr-1" />
                            Proceed Anyway
                        </button>
                    </div>
                </VStack>
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
        </>
    );
};

export default FraudDetection;
