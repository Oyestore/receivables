import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Globe2,
    DollarSign,
    Languages,
    TrendingUp,
    ArrowRight,
    RefreshCw,
    Check,
} from 'lucide-react';
import './GlobalizationDashboard.css';

interface ExchangeRate {
    from: string;
    to: string;
    rate: number;
    change: number;
}

export const GlobalizationDashboard: React.FC = () => {
    const [amount, setAmount] = useState<string>('1000');
    const [fromCurrency, setFromCurrency] = useState<string>('USD');
    const [toCurrency, setToCurrency] = useState<string>('INR');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('en_US');

    const currencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CNY', 'AUD', 'CAD'];

    const languages = [
        { code: 'en_US', name: 'English (US)', flag: '🇺🇸' },
        { code: 'en_GB', name: 'English (UK)', flag: '🇬🇧' },
        { code: 'hi_IN', name: 'Hindi', flag: '🇮🇳' },
        { code: 'es_ES', name: 'Spanish', flag: '🇪🇸' },
        { code: 'fr_FR', name: 'French', flag: '🇫🇷' },
        { code: 'de_DE', name: 'German', flag: '🇩🇪' },
        { code: 'zh_CN', name: 'Chinese', flag: '🇨🇳' },
        { code: 'ja_JP', name: 'Japanese', flag: '🇯🇵' },
    ];

    const exchangeRates: ExchangeRate[] = [
        { from: 'USD', to: 'EUR', rate: 0.92, change: -0.5 },
        { from: 'USD', to: 'GBP', rate: 0.79, change: 0.2 },
        { from: 'USD', to: 'INR', rate: 83.25, change: 0.8 },
        { from: 'USD', to: 'JPY', rate: 149.50, change: -0.3 },
    ];

    const mockRate = 83.25; // USD to INR
    const convertedAmount = (parseFloat(amount) || 0) * mockRate;

    const swapCurrencies = () => {
        const temp = fromCurrency;
        setFromCurrency(toCurrency);
        setToCurrency(temp);
    };

    return (
        <div className="globalization-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div className="title-section">
                        <Globe2 className="page-icon" />
                        <div>
                            <h1 className="page-title">Globalization & Localization</h1>
                            <p className="page-subtitle">Multi-currency and multi-language support</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="content-grid">
                {/* Currency Converter */}
                <motion.div
                    className="converter-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="card-header">
                        <DollarSign className="card-icon" />
                        <h2 className="card-title">Currency Converter</h2>
                    </div>

                    <div className="converter-body">
                        {/* From Currency */}
                        <div className="currency-input-wrapper">
                            <label className="input-label">From</label>
                            <div className="currency-input-row">
                                <input
                                    type="number"
                                    className="amount-input"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                />
                                <select
                                    className="currency-select"
                                    value={fromCurrency}
                                    onChange={(e) => setFromCurrency(e.target.value)}
                                >
                                    {currencies.map((curr) => (
                                        <option key={curr} value={curr}>
                                            {curr}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Swap Button */}
                        <motion.button
                            className="swap-btn"
                            whileHover={{ scale: 1.1, rotate: 180 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={swapCurrencies}
                        >
                            <RefreshCw className="swap-icon" />
                        </motion.button>

                        {/* To Currency */}
                        <div className="currency-input-wrapper">
                            <label className="input-label">To</label>
                            <div className="currency-input-row">
                                <input
                                    type="text"
                                    className="amount-input result"
                                    value={convertedAmount.toFixed(2)}
                                    readOnly
                                />
                                <select
                                    className="currency-select"
                                    value={toCurrency}
                                    onChange={(e) => setToCurrency(e.target.value)}
                                >
                                    {currencies.map((curr) => (
                                        <option key={curr} value={curr}>
                                            {curr}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Exchange Rate Info */}
                        <div className="rate-info">
                            <span className="rate-text">
                                1 {fromCurrency} = {mockRate} {toCurrency}
                            </span>
                            <span className="rate-update">Updated: Just now</span>
                        </div>
                    </div>
                </motion.div>

                {/* Language Selector */}
                <motion.div
                    className="language-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="card-header">
                        <Languages className="card-icon" />
                        <h2 className="card-title">Language Preferences</h2>
                    </div>

                    <div className="language-grid">
                        {languages.map((lang, index) => (
                            <motion.div
                                key={lang.code}
                                className={`language-option ${selectedLanguage === lang.code ? 'selected' : ''}`}
                                onClick={() => setSelectedLanguage(lang.code)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <div className="language-flag">{lang.flag}</div>
                                <div className="language-name">{lang.name}</div>
                                {selectedLanguage === lang.code && (
                                    <Check className="check-icon" />
                                )}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Exchange Rates Section */}
            <motion.div
                className="rates-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h2 className="section-title">Live Exchange Rates</h2>
                <div className="rates-grid">
                    {exchangeRates.map((rate, index) => (
                        <motion.div
                            key={`${rate.from}-${rate.to}`}
                            className="rate-card"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                        >
                            <div className="rate-header">
                                <div className="currency-pair">
                                    {rate.from} <ArrowRight className="arrow-icon" /> {rate.to}
                                </div>
                                <div className={`rate-change ${rate.change >= 0 ? 'positive' : 'negative'}`}>
                                    <TrendingUp className="trend-icon" />
                                    {rate.change > 0 ? '+' : ''}{rate.change}%
                                </div>
                            </div>
                            <div className="rate-value">{rate.rate.toFixed(4)}</div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};
