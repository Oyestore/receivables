import React, { useState } from 'react';
import {
    VStack,
    HStack,
    Icon,
} from '@chakra-ui/react';
import { FiStar, FiThumbsUp, FiThumbsDown } from 'react-icons/fi';
import './VendorRating.css';

interface VendorRatingProps {
    isOpen: boolean;
    onClose: () => void;
    vendor: {
        id: string;
        name: string;
        logo?: string;
    };
    invoiceId: string;
}

const VendorRating: React.FC<VendorRatingProps> = ({
    isOpen,
    onClose,
    vendor,
    invoiceId,
}) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [review, setReview] = useState('');
    const [categories, setCategories] = useState({
        quality: 0,
        communication: 0,
        timeliness: 0,
        value: 0,
    });
    const [submitting, setSubmitting] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

    const handleSubmit = async () => {
        if (rating === 0) {
            setToastMessage('Please select a rating');
            setToastType('warning');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
            return;
        }

        try {
            setSubmitting(true);

            // TODO: Submit to API
            await new Promise(resolve => setTimeout(resolve, 1000));

            setToastMessage('Rating submitted successfully!');
            setToastType('success');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);

            // Reset form
            setRating(0);
            setHoverRating(0);
            setReview('');
            setCategories({
                quality: 0,
                communication: 0,
                timeliness: 0,
                value: 0,
            });

            onClose();
        } catch (error) {
            setToastMessage('Failed to submit rating');
            setToastType('error');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    const StarIcon = ({ filled }: { filled: boolean }) => (
        <Icon
            as={FiStar}
            className={`star ${filled ? 'filled' : ''}`}
            style={{
                color: filled ? '#ecc94b' : '#e2e8f0',
            }}
        />
    );

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">Rate {vendor.name}</h3>
                        <button className="modal-close-button" onClick={onClose}>
                            ×
                        </button>
                    </div>

                    <div className="modal-body">
                        {/* Overall Rating */}
                        <div className="form-group">
                            <label className="form-label">Overall Rating</label>
                            <div className="form-stars">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <StarIcon
                                        key={star}
                                        filled={star <= (hoverRating || rating)}
                                    />
                                ))}
                            </div>
                            <div className="text text-sm color-gray-500">
                                {rating === 0 ? 'Select a rating' : `${rating} out of 5 stars`}
                            </div>
                        </div>

                        {/* Category Ratings */}
                        <div className="form-group">
                            <label className="form-label">Rate by Category</label>
                            <div className="v-stack gap-3">
                                {Object.entries({
                                    quality: 'Quality of Service',
                                    communication: 'Communication',
                                    timeliness: 'Timeliness',
                                    value: 'Value for Money',
                                }).map(([key, label]) => (
                                    <div key={key} className="h-stack justify-between">
                                        <span className="text text-sm">{label}</span>
                                        <div className="star-rating">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Icon
                                                    key={star}
                                                    as={FiStar}
                                                    className={`star ${star <= categories[key as keyof typeof categories] ? 'filled' : ''}`}
                                                    style={{
                                                        color: star <= categories[key as keyof typeof categories] ? '#ecc94b' : '#e2e8f0',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => setCategories(prev => ({
                                                        ...prev,
                                                        [key]: star,
                                                    }))}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Review Text */}
                        <div className="form-group">
                            <label className="form-label">Tell us more about your experience</label>
                            <textarea
                                className="form-textarea"
                                value={review}
                                onChange={(e) => setReview(e.target.value)}
                                placeholder="Share your experience with this vendor..."
                                rows={4}
                            />
                        </div>

                        {/* Recent Reviews */}
                        <div className="form-group">
                            <label className="form-label">Recent Reviews</label>
                            <div className="reviews-list">
                                {/* Mock Review 1 */}
                                <div className="review-item">
                                    <div className="review-header">
                                        <div className="review-author">
                                            <div className="review-avatar">JD</div>
                                            <div className="review-info">
                                                <div className="review-name">John Doe</div>
                                                <div className="review-date">2 days ago</div>
                                            </div>
                                        </div>
                                        <div className="review-rating">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Icon
                                                    key={star}
                                                    as={FiStar}
                                                    className={`review-star ${star <= 4 ? 'filled' : ''}`}
                                                    style={{
                                                        color: star <= 4 ? '#ecc94b' : '#e2e8f0',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="review-content">
                                        Great service! The team was very responsive and delivered on time. 
                                        Quality exceeded expectations.
                                    </div>
                                    <div className="review-actions">
                                        <button className="review-action helpful">
                                            <Icon as={FiThumbsUp} className="icon mr-1" />
                                            Helpful (12)
                                        </button>
                                        <button className="review-action">
                                            <Icon as={FiThumbsDown} className="icon mr-1" />
                                            Not Helpful (1)
                                        </button>
                                    </div>
                                </div>

                                {/* Mock Review 2 */}
                                <div className="review-item">
                                    <div className="review-header">
                                        <div className="review-author">
                                            <div className="review-avatar">SM</div>
                                            <div className="review-info">
                                                <div className="review-name">Sarah Miller</div>
                                                <div className="review-date">1 week ago</div>
                                            </div>
                                        </div>
                                        <div className="review-rating">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Icon
                                                    key={star}
                                                    as={FiStar}
                                                    className={`review-star ${star <= 3 ? 'filled' : ''}`}
                                                    style={{
                                                        color: star <= 3 ? '#ecc94b' : '#e2e8f0',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="review-content">
                                        Good service overall, but there were some delays in communication. 
                                        The final result was satisfactory though.
                                    </div>
                                    <div className="review-actions">
                                        <button className="review-action">
                                            <Icon as={FiThumbsUp} className="icon mr-1" />
                                            Helpful (8)
                                        </button>
                                        <button className="review-action">
                                            <Icon as={FiThumbsDown} className="icon mr-1" />
                                            Not Helpful (2)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="form-actions">
                            <button className="button button-outline" onClick={onClose}>
                                Cancel
                            </button>
                            <button 
                                className="button button-yellow" 
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? 'Submitting...' : 'Submit Rating'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {showToast && (
                <div className={`toast toast-${toastType}`}>
                    <div className="toast-title">
                        {toastType === 'success' ? 'Success' : toastType === 'error' ? 'Error' : 'Warning'}
                    </div>
                    <div className="toast-message">{toastMessage}</div>
                </div>
            )}
        </>
    );
};

export default VendorRating;
