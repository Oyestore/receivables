import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Check,
    X,
    Sparkles,
    ArrowRight,
    AlertCircle,
    Calendar,
    DollarSign,
    User,
} from 'lucide-react';
import './MatchReview.css';

interface BankTransaction {
    id: string;
    amount: number;
    description: string;
    date: string;
    utr: string;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    customerName: string;
    amount: number;
    date: string;
}

interface SuggestedMatch {
    id: string;
    transaction: BankTransaction;
    invoice: Invoice;
    score: number;
    criteria: {
        amountMatch: boolean;
        partyMatch: boolean;
        dateWithinWindow: boolean;
    };
}

export const MatchReview: React.FC = () => {
    const [matches, setMatches] = useState<SuggestedMatch[]>([
        {
            id: '1',
            transaction: {
                id: 't1',
                amount: 15000,
                description: 'UPI/12345/INV-2025-003/Tech Solutions',
                date: '2025-01-15',
                utr: 'UPI123456',
            },
            invoice: {
                id: 'i1',
                invoiceNumber: 'INV-2025-003',
                customerName: 'Tech Solutions Pvt Ltd',
                amount: 15000,
                date: '2025-01-13',
            },
            score: 85,
            criteria: {
                amountMatch: true,
                partyMatch: true,
                dateWithinWindow: true,
            },
        },
        {
            id: '2',
            transaction: {
                id: 't2',
                amount: 22500,
                description: 'NEFT/ABC Corp/Payment for services',
                date: '2025-01-14',
                utr: 'NEFT78901',
            },
            invoice: {
                id: 'i2',
                invoiceNumber: 'INV-2025-004',
                customerName: 'ABC Corporation',
                amount: 22500,
                date: '2025-01-12',
            },
            score: 78,
            criteria: {
                amountMatch: true,
                partyMatch: true,
                dateWithinWindow: true,
            },
        },
    ]);

    const handleReview = async (matchId: string, action: 'approve' | 'reject') => {
        if (action === 'approve') {
            // API call to approve match
            alert(`Match approved! GL entry posted automatically.`);
        } else {
            const reason = prompt('Rejection reason:');
            if (reason) {
                alert(`Match rejected: ${reason}`);
            }
        }

        // Remove from list
        setMatches(matches.filter((m) => m.id !== matchId));
    };

    return (
        <div className="match-review">
            {/* Header */}
            <div className="review-header">
                <div className="header-info">
                    <Sparkles className="header-icon" />
                    <div>
                        <h1 className="review-title">Match Review</h1>
                        <p className="review-subtitle">
                            {matches.length} AI-suggested matches pending approval
                        </p>
                    </div>
                </div>
            </div>

            {/* Matches List */}
            <div className="matches-container">
                {matches.length === 0 ? (
                    <div className="empty-state">
                        <Check className="empty-icon" />
                        <h2 className="empty-title">All Caught Up!</h2>
                        <p className="empty-text">No pending matches to review</p>
                    </div>
                ) : (
                    matches.map((match, index) => (
                        <motion.div
                            key={match.id}
                            className="match-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            {/* Score Badge */}
                            <div className="match-score-badge">
                                <Sparkles className="score-icon" />
                                <span className="score-text">{match.score}% Match</span>
                            </div>

                            {/* Transaction & Invoice Comparison */}
                            <div className="match-comparison">
                                {/* Bank Transaction */}
                                <div className="comparison-side transaction-side">
                                    <h3 className="side-title">Bank Transaction</h3>

                                    <div className="detail-group">
                                        <DollarSign className="detail-icon" />
                                        <div>
                                            <div className="detail-label">Amount</div>
                                            <div className="detail-value">
                                                ₹{match.transaction.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-group">
                                        <Calendar className="detail-icon" />
                                        <div>
                                            <div className="detail-label">Date</div>
                                            <div className="detail-value">
                                                {new Date(match.transaction.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-group">
                                        <User className="detail-icon" />
                                        <div>
                                            <div className="detail-label">Description</div>
                                            <div className="detail-value description-text">
                                                {match.transaction.description}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-group">
                                        <AlertCircle className="detail-icon" />
                                        <div>
                                            <div className="detail-label">UTR</div>
                                            <div className="detail-value">{match.transaction.utr}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="comparison-arrow">
                                    <ArrowRight className="arrow-icon" />
                                </div>

                                {/* Invoice */}
                                <div className="comparison-side invoice-side">
                                    <h3 className="side-title">Invoice Match</h3>

                                    <div className="detail-group">
                                        <DollarSign className="detail-icon" />
                                        <div>
                                            <div className="detail-label">Amount</div>
                                            <div className="detail-value">
                                                ₹{match.invoice.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-group">
                                        <Calendar className="detail-icon" />
                                        <div>
                                            <div className="detail-label">Invoice Date</div>
                                            <div className="detail-value">
                                                {new Date(match.invoice.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="detail-group">
                                        <User className="detail-icon" />
                                        <div>
                                            <div className="detail-label">Customer</div>
                                            <div className="detail-value">{match.invoice.customerName}</div>
                                        </div>
                                    </div>

                                    <div className="detail-group">
                                        <AlertCircle className="detail-icon" />
                                        <div>
                                            <div className="detail-label">Invoice Number</div>
                                            <div className="detail-value invoice-number">
                                                {match.invoice.invoiceNumber}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Match Criteria */}
                            <div className="match-criteria">
                                <div className="criteria-title">Match Criteria</div>
                                <div className="criteria-badges">
                                    <div className={`criteria-badge ${match.criteria.amountMatch ? 'matched' : 'unmatched'}`}>
                                        {match.criteria.amountMatch ? <Check className="badge-icon" /> : <X className="badge-icon" />}
                                        Amount Match
                                    </div>
                                    <div className={`criteria-badge ${match.criteria.partyMatch ? 'matched' : 'unmatched'}`}>
                                        {match.criteria.partyMatch ? <Check className="badge-icon" /> : <X className="badge-icon" />}
                                        Party Match
                                    </div>
                                    <div className={`criteria-badge ${match.criteria.dateWithinWindow ? 'matched' : 'unmatched'}`}>
                                        {match.criteria.dateWithinWindow ? <Check className="badge-icon" /> : <X className="badge-icon" />}
                                        Date Window
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="match-actions">
                                <motion.button
                                    className="btn-reject"
                                    onClick={() => handleReview(match.id, 'reject')}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <X className="btn-icon" />
                                    Reject
                                </motion.button>
                                <motion.button
                                    className="btn-approve"
                                    onClick={() => handleReview(match.id, 'approve')}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Check className="btn-icon" />
                                    Approve Match
                                </motion.button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};
