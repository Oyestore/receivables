import React, { useState, useEffect } from 'react';
import {
    Shield,
    AlertTriangle,
    TrendingDown,
    CheckCircle,
    XCircle,
    Upload,
    Eye,
    Sparkles,
} from 'lucide-react';
import './EvidenceValidation.css';

/**
 * Evidence Validation UI
 * 
 * AI-powered autonomous evidence verification
 * - Upload evidence
 * - Real-time AI validation
 * - Auto-approval visualization
 * - Human review interface
 */
const EvidenceValidation = ({ tenantId }) => {
    const [validations, setValidations] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchValidations();
    }, [tenantId]);

    const fetchValidations = async () => {
        try {
            // Mock data for demo
            const mockValidations = [
                {
                    id: '1',
                    evidenceId: 'ev-001',
                    milestoneName: 'Design Phase Complete',
                    confidence: 0.95,
                    status: 'AUTO_APPROVED',
                    qualityScore: 92,
                    findings: [
                        { type: 'PASS', requirement: 'Signed contract present', confidence: 0.98 },
                        { type: 'PASS', requirement: 'Project timeline included', confidence: 0.92 },
                    ],
                    matchedRequirements: ['Contract', 'Timeline', 'Signatures'],
                    missingRequirements: [],
                    autoApproved: true,
                    validatedAt: new Date(),
                },
                {
                    id: '2',
                    evidenceId: 'ev-002',
                    milestoneName: 'Development Milestone 1',
                    confidence: 0.68,
                    status: 'HUMAN_REVIEW_REQUIRED',
                    qualityScore: 71,
                    findings: [
                        { type: 'PASS', requirement: 'Code repository link', confidence: 0.95 },
                        { type: 'WARNING', requirement: 'Test coverage report', confidence: 0.42 },
                    ],
                    matchedRequirements: ['Code repository'],
                    missingRequirements: ['Test coverage'],
                    requiresHumanReview: true,
                    validatedAt: new Date(),
                },
            ];

            setValidations(mockValidations);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch validations:', error);
            setLoading(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        // Simulate upload and validation
        setTimeout(() => {
            alert(`File "${file.name}" uploaded and validated with AI`);
            setUploading(false);
            fetchValidations();
        }, 2000);
    };

    const handleApprove = async (validationId) => {
        alert(`Validation ${validationId} approved!`);
        setValidations(prev =>
            prev.map(v => v.id === validationId ? { ...v, status: 'APPROVED' } : v)
        );
    };

    const handleReject = async (validationId) => {
        alert(`Validation ${validationId} rejected!`);
        setValidations(prev =>
            prev.map(v => v.id === validationId ? { ...v, status: 'REJECTED' } : v)
        );
    };

    if (loading) {
        return <div className="loading-screen">Loading validations...</div>;
    }

    return (
        <div className="evidence-validation">
            {/* Hero Section */}
            <div className="validation-hero">
                <div className="hero-badge">
                    <Shield size={32} />
                    <Sparkles size={16} className="sparkle" />
                </div>
                <h1>Autonomous Evidence Validation</h1>
                <p>AI validates evidence in 30 seconds with 85%+ accuracy</p>

                {/* Upload Section */}
                <div className="upload-section">
                    <label className="upload-btn" htmlFor="file-upload">
                        <Upload size={20} />
                        <span>Upload Evidence</span>
                        <input
                            id="file-upload"
                            type="file"
                            hidden
                            onChange={handleFileUpload}
                            accept=".pdf,.jpg,.png,.doc,.docx"
                        />
                    </label>
                    {uploading && (
                        <div className="uploading-indicator">
                            <div className="spinner"></div>
                            <span>Validating with AI...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="validation-stats">
                <div className="stat-box">
                    <div className="stat-value">{validations.filter(v => v.autoApproved).length}</div>
                    <div className="stat-label">Auto-Approved</div>
                </div>
                <div className="stat-box">
                    <div className="stat-value">{validations.filter(v => v.requiresHumanReview).length}</div>
                    <div className="stat-label">Pending Review</div>
                </div>
                <div className="stat-box">
                    <div className="stat-value">
                        {validations.length > 0
                            ? ((validations.reduce((sum, v) => sum + v.confidence, 0) / validations.length) * 100).toFixed(0)
                            : 0}%
                    </div>
                    <div className="stat-label">Avg Confidence</div>
                </div>
            </div>

            {/* Validations List */}
            <div className="validations-section">
                <h2>Recent Validations</h2>

                <div className="validations-list">
                    {validations.map(validation => (
                        <div key={validation.id} className={`validation-card status-${validation.status.toLowerCase()}`}>
                            {/* Header */}
                            <div className="validation-header">
                                <div className="validation-title-section">
                                    <h3>{validation.milestoneName}</h3>
                                    <span className={`status-badge ${validation.status.toLowerCase()}`}>
                                        {validation.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className="validation-meta">
                                    <span className="timestamp">
                                        {validation.validatedAt.toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>

                            {/* AI Scores */}
                            <div className="ai-scores">
                                <div className="score-item confidence">
                                    <div className="score-label">AI Confidence</div>
                                    <div className="score-bar">
                                        <div
                                            className="score-fill"
                                            style={{ width: `${validation.confidence * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="score-value">{(validation.confidence * 100).toFixed(0)}%</span>
                                </div>
                                <div className="score-item quality">
                                    <div className="score-label">Quality Score</div>
                                    <div className="score-bar">
                                        <div
                                            className="score-fill"
                                            style={{ width: `${validation.qualityScore}%` }}
                                        ></div>
                                    </div>
                                    <span className="score-value">{validation.qualityScore}%</span>
                                </div>
                            </div>

                            {/* Findings */}
                            <div className="findings-section">
                                <h4>AI Findings</h4>
                                <div className="findings-list">
                                    {validation.findings.map((finding, idx) => (
                                        <div key={idx} className={`finding-item finding-${finding.type.toLowerCase()}`}>
                                            {finding.type === 'PASS' && <CheckCircle size={16} />}
                                            {finding.type === 'WARNING' && <AlertTriangle size={16} />}
                                            {finding.type === 'FAIL' && <XCircle size={16} />}
                                            <span className="finding-text">{finding.requirement}</span>
                                            <span className="finding-confidence">{(finding.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Requirements */}
                            <div className="requirements-section">
                                <div className="requirements-matched">
                                    <CheckCircle size={14} />
                                    <span>Matched: {validation.matchedRequirements.join(', ')}</span>
                                </div>
                                {validation.missingRequirements.length > 0 && (
                                    <div className="requirements-missing">
                                        <XCircle size={14} />
                                        <span>Missing: {validation.missingRequirements.join(', ')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {validation.requiresHumanReview && (
                                <div className="validation-actions">
                                    <button
                                        className="action-btn approve"
                                        onClick={() => handleApprove(validation.id)}
                                    >
                                        <CheckCircle size={16} />
                                        Approve
                                    </button>
                                    <button
                                        className="action-btn reject"
                                        onClick={() => handleReject(validation.id)}
                                    >
                                        <XCircle size={16} />
                                        Reject
                                    </button>
                                    <button className="action-btn view">
                                        <Eye size={16} />
                                        View Evidence
                                    </button>
                                </div>
                            )}

                            {validation.autoApproved && (
                                <div className="auto-approved-banner">
                                    <Sparkles size={16} />
                                    <span>Automatically approved by AI</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EvidenceValidation;
