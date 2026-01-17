import React, { useState } from 'react';
import {
    HStack,
    Icon,
} from '@chakra-ui/react';
import { FiHeart, FiShare2 } from 'react-icons/fi';
import './BrandedFooter.css';

interface BrandedFooterProps {
    invoiceVendor: string;
}

const BrandedFooter: React.FC<BrandedFooterProps> = ({ invoiceVendor }) => {
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const handleSharePlatform = () => {
        // TODO: Integrate with Module 09 (Referral Engine)
        const referralUrl = `https://platform.com/signup?ref=viral_footer`;

        if (navigator.share) {
            navigator.share({
                title: 'Smart Invoice Payments',
                text: `I just paid ${invoiceVendor} instantly! Check out this AI-powered payment platform.`,
                url: referralUrl,
            }).catch(() => {
                // Fallback to copy
                navigator.clipboard.writeText(referralUrl);
                setToastMessage('Link copied!');
                setToastType('success');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
            });
        } else {
            navigator.clipboard.writeText(referralUrl);
            setToastMessage('Link copied!');
            setToastType('success');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        }
    };

    return (
        <>
            <footer className="branded-footer">
                <div className="footer-content">
                    <div className="v-stack">
                        {/* Powered By */}
                        <div className="powered-by">
                            <span className="powered-by-text">Powered by</span>
                            <span className="brand-name">Smart Invoice Platform</span>
                        </div>

                        {/* Share Section */}
                        <div className="share-section">
                            <span className="share-text">
                                I just paid {invoiceVendor} instantly! Check out this AI-powered payment platform.
                            </span>
                            <button className="share-button" onClick={handleSharePlatform}>
                                <Icon as={FiShare2} className="icon" />
                                Share Platform
                            </button>
                        </div>

                        {/* Footer Links */}
                        <div className="footer-sections">
                            <div className="footer-section">
                                <h4 className="section-title">Product</h4>
                                <div className="section-links">
                                    <a href="#" className="footer-link">Features</a>
                                    <a href="#" className="footer-link">Pricing</a>
                                    <a href="#" className="footer-link">Security</a>
                                    <a href="#" className="footer-link">API</a>
                                </div>
                            </div>

                            <div className="footer-section">
                                <h4 className="section-title">Company</h4>
                                <div className="section-links">
                                    <a href="#" className="footer-link">About Us</a>
                                    <a href="#" className="footer-link">Careers</a>
                                    <a href="#" className="footer-link">Blog</a>
                                    <a href="#" className="footer-link">Contact</a>
                                </div>
                            </div>

                            <div className="footer-section">
                                <h4 className="section-title">Resources</h4>
                                <div className="section-links">
                                    <a href="#" className="footer-link">Documentation</a>
                                    <a href="#" className="footer-link">Help Center</a>
                                    <a href="#" className="footer-link">Community</a>
                                    <a href="#" className="footer-link">Status</a>
                                </div>
                            </div>

                            <div className="footer-section">
                                <h4 className="section-title">Legal</h4>
                                <div className="section-links">
                                    <a href="#" className="footer-link">Privacy Policy</a>
                                    <a href="#" className="footer-link">Terms of Service</a>
                                    <a href="#" className="footer-link">Cookie Policy</a>
                                    <a href="#" className="footer-link">GDPR</a>
                                </div>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="footer-social">
                            <a href="#" className="social-link" title="Twitter">
                                <Icon className="social-icon">𝕏</Icon>
                            </a>
                            <a href="#" className="social-link" title="LinkedIn">
                                <Icon className="social-icon">💼</Icon>
                            </a>
                            <a href="#" className="social-link" title="Facebook">
                                <Icon className="social-icon">📘</Icon>
                            </a>
                            <a href="#" className="social-link" title="GitHub">
                                <Icon className="social-icon">🐙</Icon>
                            </a>
                        </div>

                        {/* Legal Links */}
                        <div className="legal-links">
                            <a href="#" className="legal-link">Privacy Policy</a>
                            <a href="#" className="legal-link">Terms of Service</a>
                            <a href="#" className="legal-link">Cookie Policy</a>
                        </div>

                        {/* Copyright */}
                        <div className="copyright">
                            <div className="made-with-love">
                                Made with <Icon as={FiHeart} className="heart-icon" /> by Smart Invoice Platform
                            </div>
                            <div className="vendor-attribution">
                                Payment processed for <a href="#" className="vendor-link">{invoiceVendor}</a>
                            </div>
                            <div className="copyright">
                                © 2026 Smart Invoice Platform. All rights reserved.
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

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

export default BrandedFooter;
