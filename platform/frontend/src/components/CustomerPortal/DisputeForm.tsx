import React, { useState } from 'react';
import {
    VStack,
    HStack,
    Icon,
} from '@chakra-ui/react';
import { FiAlertTriangle, FiUpload } from 'react-icons/fi';
import axios from 'axios';
import './DisputeForm.css';

interface DisputeFormProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceId: string;
    sessionId: string;
}

const DISPUTE_TYPES = [
    { value: 'incorrect_amount', label: 'Incorrect Amount' },
    { value: 'wrong_items', label: 'Wrong Items/Services' },
    { value: 'unauthorized', label: 'Unauthorized Charge' },
    { value: 'quality_issue', label: 'Quality Issue' },
    { value: 'duplicate', label: 'Duplicate Invoice' },
    { value: 'other', label: 'Other' },
];

const DisputeForm: React.FC<DisputeFormProps> = ({
    isOpen,
    onClose,
    invoiceId,
    sessionId,
}) => {
    const [disputeType, setDisputeType] = useState('');
    const [description, setDescription] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [evidence, setEvidence] = useState<File[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
    const [priority, setPriority] = useState('medium');

    const handleSubmit = async () => {
        if (!disputeType || !description) {
            setToastMessage('Please fill all required fields');
            setToastType('warning');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            return;
        }

        try {
            setSubmitting(true);

            // Integrate with Module 16 and Module 08 (Dispute Resolution)
            const response = await axios.post(`/api/concierge/${sessionId}/raise-dispute`, {
                type: disputeType,
                description,
                contactEmail,
                evidence: evidence.map(file => ({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                })),
                priority,
                invoiceId,
            });

            setToastMessage('Dispute submitted successfully');
            setToastType('success');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);

            // Reset form
            setDisputeType('');
            setDescription('');
            setContactEmail('');
            setEvidence([]);
            setPriority('medium');
            onClose();
        } catch (error) {
            setToastMessage('Failed to submit dispute');
            setToastType('error');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        setEvidence(prev => [...prev, ...files]);
    };

    const removeFile = (index: number) => {
        setEvidence(prev => prev.filter((_, i) => i !== index));
    };

    const getDisputeTypeIcon = (type: string) => {
        switch (type) {
            case 'incorrect_amount':
                return '💰';
            case 'wrong_items':
                return '📦';
            case 'unauthorized':
                return '🚫';
            case 'quality_issue':
                return '⚠️';
            case 'duplicate':
                return '📋';
            default:
                return '📄';
        }
    };

    const getDisputeTypeColor = (type: string) => {
        switch (type) {
            case 'incorrect_amount':
                return 'amount';
            case 'wrong_items':
                return 'quality';
            case 'unauthorized':
                return 'other';
            case 'quality_issue':
                return 'quality';
            case 'duplicate':
                return 'other';
            default:
                return 'other';
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h3 className="modal-title">Raise Dispute</h3>
                        <button className="modal-close-button" onClick={onClose}>
                            ×
                        </button>
                    </div>

                    <div className="modal-body">
                        <div className="form-description">
                            Please provide details about your dispute. Our team will review and respond within 24 hours.
                        </div>

                        {/* Dispute Types */}
                        <div className="form-section">
                            <h4 className="section-title">
                                <Icon as={FiAlertTriangle} className="icon" />
                                Dispute Type
                            </h4>
                            <div className="dispute-types">
                                {DISPUTE_TYPES.map((type) => (
                                    <div
                                        key={type.value}
                                        className={`dispute-type ${disputeType === type.value ? 'selected' : ''}`}
                                        onClick={() => setDisputeType(type.value)}
                                    >
                                        <div className={`type-icon ${getDisputeTypeColor(type.value)}`}>
                                            {getDisputeTypeIcon(type.value)}
                                        </div>
                                        <div className="type-content">
                                            <div className="type-title">{type.label}</div>
                                            <div className="type-description">
                                                {type.value === 'incorrect_amount' && 'Amount charged is incorrect'}
                                                {type.value === 'wrong_items' && 'Items/services don\'t match'}
                                                {type.value === 'unauthorized' && 'Charge not authorized'}
                                                {type.value === 'quality_issue' && 'Quality of service/product'}
                                                {type.value === 'duplicate' && 'Duplicate invoice detected'}
                                                {type.value === 'other' && 'Other dispute reason'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="form-section">
                            <div className="form-field">
                                <label className="field-label required">Description</label>
                                <textarea
                                    className="field-textarea"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Please describe the issue in detail..."
                                    rows={4}
                                />
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="form-grid">
                            <div className="form-field">
                                <label className="field-label required">Contact Email</label>
                                <input
                                    type="email"
                                    className="field-input"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    placeholder="your.email@example.com"
                                />
                            </div>
                            <div className="form-field">
                                <label className="field-label">Priority</label>
                                <select
                                    className="field-select"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                        </div>

                        {/* Supporting Documents */}
                        <div className="supporting-documents">
                            <h4 className="documents-title">
                                <Icon as={FiUpload} className="icon" />
                                Supporting Documents
                            </h4>
                            <div className="documents-list">
                                {evidence.length === 0 ? (
                                    <div className="document-item">
                                        <div className="document-icon">📎</div>
                                        <div className="document-info">
                                            <div className="document-name">No files uploaded</div>
                                            <div className="document-size">Optional</div>
                                        </div>
                                        <div className="document-actions">
                                            <label className="document-button">
                                                <Icon as={FiUpload} className="icon mr-1" />
                                                Choose Files
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                    onChange={handleFileUpload}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                ) : (
                                    evidence.map((file, index) => (
                                        <div key={index} className="document-item">
                                            <div className="document-icon">📎</div>
                                            <div className="document-info">
                                                <div className="document-name">{file.name}</div>
                                                <div className="document-size">
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </div>
                                            </div>
                                            <div className="document-actions">
                                                <label className="document-button">
                                                    <Icon as={FiUpload} className="icon mr-1" />
                                                    Add More
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                        onChange={handleFileUpload}
                                                        style={{ display: 'none' }}
                                                    />
                                                </label>
                                                <button
                                                    className="document-button document-remove"
                                                    onClick={() => removeFile(index)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Priority Notice */}
                        <div className="priority-section">
                            <div className="priority-title">
                                <Icon as={FiAlertTriangle} className="icon" />
                                Priority Level
                            </div>
                            <div className="priority-description">
                                High priority disputes will be reviewed within 4-6 hours. Medium priority within 24 hours. Low priority within 48 hours.
                            </div>
                            <div className="priority-select">
                                <select
                                    className="field-select"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                >
                                    <option value="low">Low Priority</option>
                                    <option value="medium">Medium Priority</option>
                                    <option value="high">High Priority</option>
                                    <option value="urgent">Urgent Priority</option>
                                </select>
                            </div>
                        </div>

                        {/* Status Message */}
                        <div className="status-message info">
                            <Icon as={FiAlertTriangle} className="status-icon" />
                            <div className="status-text">
                                <strong>Important:</strong> Submitting a dispute will temporarily pause the payment process until the issue is resolved.
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button className="button button-outline" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className="button button-blue"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit Dispute'}
                        </button>
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

export default DisputeForm;
