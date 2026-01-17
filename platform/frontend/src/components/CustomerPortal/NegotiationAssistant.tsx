import React, { useState, useEffect } from 'react';
import {
    VStack,
    HStack,
    Icon,
    Badge,
} from '@chakra-ui/react';
import { FiTrendingDown, FiMail, FiSearch, FiAlertCircle, FiCheck } from 'react-icons/fi';
import axios from 'axios';
import './NegotiationAssistant.css';

interface NegotiationAssistantProps {
    invoice: any;
    sessionId: string;
}

const NegotiationAssistant: React.FC<NegotiationAssistantProps> = ({
    invoice,
    sessionId,
}) => {
    const [showAssistant, setShowAssistant] = useState(false);
    const [marketPrice, setMarketPrice] = useState<number | null>(null);
    const [draftEmail, setDraftEmail] = useState('');
    const [customizing, setCustomizing] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        analyzePrice();
    }, [invoice]);

    const analyzePrice = async () => {
        // TODO: Integrate with actual pricing API
        // For now, simulate market analysis

        // Mock: Generate market average (15-20% below current)
        const mockMarketAvg = invoice.total * (0.80 + Math.random() * 0.05);
        setMarketPrice(mockMarketAvg);

        // Show assistant if price is significantly above market
        const percentageDiff = ((invoice.total - mockMarketAvg) / mockMarketAvg) * 100;
        if (percentageDiff > 10) {
            setShowAssistant(true);
            generateNegotiationEmail(percentageDiff);
        }
    };

    const generateNegotiationEmail = (percentageDiff: number) => {
        const suggestedDiscount = Math.min(percentageDiff, 20).toFixed(0);

        const email = `Subject: Discussion on Invoice #${invoice.number} Pricing

Dear ${invoice.vendor.name} Team,

Thank you for Invoice #${invoice.number}. We value our partnership and appreciate your services.

However, we've noticed the current pricing is approximately ${percentageDiff.toFixed(0)}% above market average for similar services. To maintain a sustainable partnership, we'd like to discuss a ${suggestedDiscount}% reduction to align with industry standards.

We believe this adjustment would benefit both parties in the long run and look forward to continuing our collaboration.

Best regards,
[Your Name]`;

        setDraftEmail(email);
    };

    const sendEmail = async () => {
        try {
            // TODO: Integrate with actual email service
            await axios.post('/api/send-negotiation-email', {
                to: invoice.vendor.email,
                subject: `Discussion on Invoice #${invoice.number}`,
                body: draftEmail,
                sessionId,
            });

            setToastMessage('Negotiation email sent successfully!');
            setToastType('success');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            setToastMessage('Failed to send email');
            setToastType('error');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    if (!showAssistant) return null;

    const percentageDiff = marketPrice ? 
        ((invoice.total - marketPrice) / marketPrice) * 100 : 0;

    return (
        <>
            <div className="negotiation-assistant">
                <VStack gap={6} align="stretch">
                    {/* Header */}
                    <div className="assistant-header">
                        <h2 className="assistant-title">
                            <Icon as={FiTrendingDown} className="icon mr-2" />
                            AI Negotiation Assistant
                        </h2>
                        <div className="assistant-actions">
                            <button 
                                className="button button-outline button-sm"
                                onClick={() => setShowAssistant(false)}
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>

                    {/* Alert */}
                    <div className="negotiation-context">
                        <div className="context-header">
                            <h3 className="context-title">Price Analysis Alert</h3>
                            <Badge className="badge badge-orange">
                                {percentageDiff.toFixed(0)}% Above Market
                            </Badge>
                        </div>
                        <div className="context-info">
                            <div className="context-item">
                                <div className="context-label">Current Price</div>
                                <div className="context-value">{formatCurrency(invoice.total)}</div>
                            </div>
                            <div className="context-item">
                                <div className="context-label">Market Average</div>
                                <div className="context-value">{formatCurrency(marketPrice || 0)}</div>
                            </div>
                            <div className="context-item">
                                <div className="context-label">Potential Savings</div>
                                <div className="context-value color-green-600">
                                    {formatCurrency(invoice.total - (marketPrice || 0))}
                                </div>
                            </div>
                            <div className="context-item">
                                <div className="context-label">Confidence</div>
                                <div className="context-value">85%</div>
                            </div>
                        </div>
                    </div>

                    {/* Negotiation Strategies */}
                    <div className="negotiation-strategies">
                        <div className="strategies-header">
                            <h3 className="strategies-title">Recommended Strategies</h3>
                        </div>
                        <div className="strategies-list">
                            <div className="strategy-item">
                                <div className="strategy-icon">
                                    <Icon as={FiTrendingDown} className="icon" />
                                </div>
                                <div className="strategy-content">
                                    <div className="strategy-title">Price Negotiation</div>
                                    <div className="strategy-description">
                                        Request a {Math.min(percentageDiff, 20).toFixed(0)}% reduction based on market analysis
                                    </div>
                                    <div className="strategy-impact">
                                        Potential savings: {formatCurrency(invoice.total - (marketPrice || 0))}
                                    </div>
                                </div>
                            </div>
                            <div className="strategy-item">
                                <div className="strategy-icon">
                                    <Icon as={FiMail} className="icon" />
                                </div>
                                <div className="strategy-content">
                                    <div className="strategy-title">Professional Communication</div>
                                    <div className="strategy-description">
                                        Maintain partnership tone while discussing pricing concerns
                                    </div>
                                    <div className="strategy-impact">
                                        Success rate: 78% for similar cases
                                    </div>
                                </div>
                            </div>
                            <div className="strategy-item">
                                <div className="strategy-icon">
                                    <Icon as={FiSearch} className="icon" />
                                </div>
                                <div className="strategy-content">
                                    <div className="strategy-title">Market Research Backup</div>
                                    <div className="strategy-description">
                                        Provide market data to support negotiation position
                                    </div>
                                    <div className="strategy-impact">
                                        Increases success rate by 25%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Email Draft */}
                    <div className="message-input-container">
                        <div className="input-header">
                            <Icon as={FiMail} className="icon mr-2" />
                            Negotiation Email Draft
                        </div>
                        <textarea
                            className="message-textarea"
                            value={draftEmail}
                            onChange={(e) => setDraftEmail(e.target.value)}
                            placeholder="Customize your negotiation message..."
                            rows={8}
                        />
                        <div className="input-actions">
                            <button 
                                className="button button-outline button-sm"
                                onClick={() => setCustomizing(!customizing)}
                            >
                                {customizing ? 'Preview' : 'Customize'}
                            </button>
                            <button className="button button-blue button-sm" onClick={sendEmail}>
                                <Icon as={FiMail} className="icon mr-1" />
                                Send Email
                            </button>
                        </div>
                    </div>

                    {/* Negotiation Tips */}
                    <div className="negotiation-tips">
                        <h3 className="tips-title">Pro Tips for Success</h3>
                        <div className="tips-list">
                            <div className="tip-item">
                                <div className="tip-icon">
                                    <Icon as={FiCheck} className="icon" />
                                </div>
                                <div className="tip-content">
                                    <div className="tip-text">
                                        Send the email during business hours (9 AM - 5 PM) for better response rates
                                    </div>
                                </div>
                            </div>
                            <div className="tip-item">
                                <div className="tip-icon">
                                    <Icon as={FiCheck} className="icon" />
                                </div>
                                <div className="tip-content">
                                    <div className="tip-text">
                                        Follow up within 3-5 business days if no response received
                                    </div>
                                </div>
                            </div>
                            <div className="tip-item">
                                <div className="tip-icon">
                                    <Icon as={FiAlertCircle} className="icon" />
                                </div>
                                <div className="tip-content">
                                    <div className="tip-text">
                                        Be prepared to compromise - aim for 10-15% reduction as a realistic target
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="progress-indicator">
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '75%' }}></div>
                        </div>
                        <div className="progress-text">75% Negotiation Success Probability</div>
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

export default NegotiationAssistant;
