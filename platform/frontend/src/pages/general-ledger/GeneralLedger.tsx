import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign,
    Plus,
    TrendingUp,
    TrendingDown,
    FileText,
    Search,
    Filter,
    Download,
    AlertTriangle,
} from 'lucide-react';
import './GeneralLedger.css';

interface GLAccount {
    id: string;
    code: string;
    name: string;
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    balance: number;
    normalBalance: 'debit' | 'credit';
}

interface JournalEntry {
    id: string;
    number: string;
    date: string;
    description: string;
    totalDebit: number;
    totalCredit: number;
    status: string;
}

export const GeneralLedger: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'accounts' | 'journal' | 'trial'>('accounts');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const accounts: GLAccount[] = [
        { id: '1', code: '1050', name: 'Bank - ICICI', type: 'asset', balance: 250000, normalBalance: 'debit' },
        { id: '2', code: '1100', name: 'Accounts Receivable', type: 'asset', balance: 500000, normalBalance: 'debit' },
        { id: '3', code: '1999', name: 'Suspense Account', type: 'asset', balance: 15000, normalBalance: 'debit' },
        { id: '4', code: '4000', name: 'Sales Revenue', type: 'revenue', balance: 1200000, normalBalance: 'credit' },
        { id: '5', code: '5100', name: 'Bank Charges', type: 'expense', balance: 5000, normalBalance: 'debit' },
    ];

    const journalEntries: JournalEntry[] = [
        {
            id: '1',
            number: 'JE-2025-001',
            date: '2025-01-13',
            description: 'Payment received - INV-2025-001',
            totalDebit: 10000,
            totalCredit: 10000,
            status: 'posted',
        },
        {
            id: '2',
            number: 'JE-2025-002',
            date: '2025-01-12',
            description: 'Invoice created - INV-2025-002',
            totalDebit: 25000,
            totalCredit: 25000,
            status: 'posted',
        },
    ];

    const trialBalance = {
        totalDebits: 770000,
        totalCredits: 770000,
        balanced: true,
    };

    return (
        <div className="general-ledger">
            {/* Header */}
            <div className="gl-header">
                <div className="gl-title-section">
                    <FileText className="gl-icon" />
                    <div>
                        <h1 className="gl-title">General Ledger</h1>
                        <p className="gl-subtitle">Double-Entry Accounting System</p>
                    </div>
                </div>

                <div className="gl-actions">
                    <button className="btn-outline" onClick={() => alert('Exporting...')}>
                        <Download className="icon" />
                        Export
                    </button>
                    <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus className="icon" />
                        New Entry
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="gl-tabs">
                {['accounts', 'journal', 'trial'].map((tab) => (
                    <button
                        key={tab}
                        className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab(tab as any)}
                    >
                        {tab === 'accounts' && 'Chart of Accounts'}
                        {tab === 'journal' && 'Journal Entries'}
                        {tab === 'trial' && 'Trial Balance'}
                    </button>
                ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'accounts' && (
                    <motion.div
                        key="accounts"
                        className="gl-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className="accounts-grid">
                            {['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => {
                                const typeAccounts = accounts.filter((a) => a.type === type);
                                const totalBalance = typeAccounts.reduce((sum, a) => sum + a.balance, 0);

                                return (
                                    <div key={type} className="account-group">
                                        <div className="group-header">
                                            <h3 className="group-title">{type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                                            <span className="group-total">₹{totalBalance.toLocaleString()}</span>
                                        </div>

                                        <div className="account-list">
                                            {typeAccounts.map((account) => (
                                                <div key={account.id} className="account-item">
                                                    <div className="account-info">
                                                        <span className="account-code">{account.code}</span>
                                                        <span className="account-name">{account.name}</span>
                                                    </div>
                                                    <div className="account-balance">
                                                        <span className={`balance ${account.normalBalance === 'debit' ? 'debit' : 'credit'}`}>
                                                            ₹{account.balance.toLocaleString()}
                                                        </span>
                                                        {account.normalBalance === 'debit' ? (
                                                            <TrendingUp className="balance-icon debit" />
                                                        ) : (
                                                            <TrendingDown className="balance-icon credit" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'journal' && (
                    <motion.div
                        key="journal"
                        className="gl-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className="journal-list">
                            {journalEntries.map((entry) => (
                                <div key={entry.id} className="journal-entry-card">
                                    <div className="entry-header">
                                        <div className="entry-number">{entry.number}</div>
                                        <div className="entry-date">{new Date(entry.date).toLocaleDateString()}</div>
                                    </div>
                                    <div className="entry-description">{entry.description}</div>
                                    <div className="entry-amounts">
                                        <div className="entry-amount debit">
                                            <span className="amount-label">Debit</span>
                                            <span className="amount-value">₹{entry.totalDebit.toLocaleString()}</span>
                                        </div>
                                        <div className="entry-amount credit">
                                            <span className="amount-label">Credit</span>
                                            <span className="amount-value">₹{entry.totalCredit.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="entry-status">
                                        <span className="status-badge status-posted">Posted</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'trial' && (
                    <motion.div
                        key="trial"
                        className="gl-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <div className="trial-balance-card">
                            <h2 className="trial-title">Trial Balance Summary</h2>

                            <div className="trial-summary">
                                <div className="trial-total">
                                    <span className="trial-label">Total Debits</span>
                                    <span className="trial-value debit">₹{trialBalance.totalDebits.toLocaleString()}</span>
                                </div>
                                <div className="trial-total">
                                    <span className="trial-label">Total Credits</span>
                                    <span className="trial-value credit">₹{trialBalance.totalCredits.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className={`trial-status ${trialBalance.balanced ? 'balanced' : 'unbalanced'}`}>
                                {trialBalance.balanced ? (
                                    <>
                                        <DollarSign className="status-icon" />
                                        <span>Books are balanced!</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="status-icon" />
                                        <span>Imbalance detected</span>
                                    </>
                                )}
                            </div>

                            <div className="trial-table">
                                <div className="trial-table-header">
                                    <div>Account Code</div>
                                    <div>Account Name</div>
                                    <div className="text-right">Debit Balance</div>
                                    <div className="text-right">Credit Balance</div>
                                </div>

                                {accounts.map((account) => (
                                    <div key={account.id} className="trial-table-row">
                                        <div className="account-code-cell">{account.code}</div>
                                        <div>{account.name}</div>
                                        <div className="text-right">
                                            {account.normalBalance === 'debit' ? `₹${account.balance.toLocaleString()}` : '-'}
                                        </div>
                                        <div className="text-right">
                                            {account.normalBalance === 'credit' ? `₹${account.balance.toLocaleString()}` : '-'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
