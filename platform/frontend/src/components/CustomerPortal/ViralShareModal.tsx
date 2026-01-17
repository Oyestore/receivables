import React from 'react';
import {
    VStack,
    HStack,
    Icon,
} from '@chakra-ui/react';
import { FiShare2, FiCopy, FiMail, FiTwitter } from 'react-icons/fi';
import { SiWhatsapp, SiLinkedin } from 'react-icons/si';
import axios from 'axios';
import './ViralShareModal.css';

interface ViralShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    vendorName: string;
}

const ViralShareModal: React.FC<ViralShareModalProps> = ({
    isOpen,
    onClose,
    sessionId,
    vendorName,
}) => {
    const [referralCode, setReferralCode] = React.useState('');
    const [showToast, setShowToast] = React.useState(false);
    const [toastMessage, setToastMessage] = React.useState('');
    const [toastType, setToastType] = React.useState<'success' | 'error'>('success');

    React.useEffect(() => {
        if (isOpen) {
            generateReferralLink();
        }
    }, [isOpen, sessionId]);

    const generateReferralLink = async () => {
        try {
            // Integrate with Module 09 (Referral Engine)
            const response = await axios.post(`/api/concierge/${sessionId}/share-referral`, {
                channel: 'link',
                recipientType: 'peer',
            });

            setReferralCode(response.data.referralCode);
        } catch (error) {
            console.error('Failed to generate referral link:', error);
        }
    };

    const shareUrl = `https://platform.com/signup?ref=${referralCode}`;
    const shareMessage = `I just paid ${vendorName} instantly using this AI-powered platform! Check it out: ${shareUrl}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setToastMessage('Link copied!');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    const handleShare = async (platform: string) => {
        let url = '';

        switch (platform) {
            case 'twitter':
                url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`;
                break;
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
                break;
            case 'whatsapp':
                url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
                break;
            case 'email':
                url = `mailto:?subject=Check out this AI payment platform&body=${encodeURIComponent(shareMessage)}`;
                break;
        }

        if (url) {
            window.open(url, '_blank');
        }

        // Track share event
        try {
            await axios.post(`/api/concierge/${sessionId}/track-share`, {
                platform,
                referralCode,
            });
        } catch (error) {
            console.error('Failed to track share:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">
                            <Icon as={FiShare2} className="icon mr-2" />
                            Share Your Experience
                        </h3>
                        <button className="modal-close-button" onClick={onClose}>
                            ×
                        </button>
                    </div>

                    <div className="modal-body">
                        {/* Share Preview */}
                        <div className="share-preview">
                            <div className="preview-title">Share Preview</div>
                            <div className="preview-description">
                                I just paid {vendorName} instantly using this AI-powered platform! 
                                Get early payment discounts, smart scheduling, and automated approvals.
                            </div>
                            <div className="preview-url">{shareUrl}</div>
                        </div>

                        {/* Share Options */}
                        <div>
                            <div className="preview-title">Share via</div>
                            <div className="share-options">
                                <div className="share-option" onClick={() => handleShare('twitter')}>
                                    <div className="share-option-icon twitter">
                                        <FiTwitter size={20} />
                                    </div>
                                    <div className="share-option-label">Twitter</div>
                                </div>

                                <div className="share-option" onClick={() => handleShare('linkedin')}>
                                    <div className="share-option-icon linkedin">
                                        <SiLinkedin size={20} />
                                    </div>
                                    <div className="share-option-label">LinkedIn</div>
                                </div>

                                <div className="share-option" onClick={() => handleShare('whatsapp')}>
                                    <div className="share-option-icon whatsapp">
                                        <SiWhatsapp size={20} />
                                    </div>
                                    <div className="share-option-label">WhatsApp</div>
                                </div>

                                <div className="share-option" onClick={() => handleShare('email')}>
                                    <div className="share-option-icon email">
                                        <FiMail size={20} />
                                    </div>
                                    <div className="share-option-label">Email</div>
                                </div>
                            </div>
                        </div>

                        {/* Share Link */}
                        <div className="share-link-section">
                            <div className="share-link-title">Referral Link</div>
                            <div className="share-link-input-group">
                                <input
                                    type="text"
                                    className="share-link-input"
                                    value={shareUrl}
                                    readOnly
                                />
                                <button className="copy-button" onClick={handleCopyLink}>
                                    <Icon as={FiCopy} className="icon mr-1" />
                                    Copy
                                </button>
                            </div>
                        </div>

                        {/* Custom Message */}
                        <div className="share-message-section">
                            <div className="share-message-title">Custom Message</div>
                            <textarea
                                className="share-message-textarea"
                                value={shareMessage}
                                onChange={(e) => {
                                    // Update message if needed
                                }}
                                placeholder="Add your personal touch..."
                                rows={3}
                            />
                        </div>

                        {/* Share Actions */}
                        <div className="share-actions">
                            <button className="button button-outline" onClick={onClose}>
                                Cancel
                            </button>
                            <button className="button button-blue" onClick={handleCopyLink}>
                                <Icon as={FiCopy} className="icon mr-1" />
                                Copy Link
                            </button>
                        </div>

                        {/* Success Message */}
                        {showToast && (
                            <div className="success-message">
                                <Icon as={FiCopy} className="success-icon" />
                                Link copied to clipboard!
                            </div>
                        )}
                    </div>
                </div>
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

export default ViralShareModal;
