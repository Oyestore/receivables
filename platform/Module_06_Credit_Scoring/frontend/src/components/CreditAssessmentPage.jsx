import { useState } from 'react';
import { BarChart3, User, Building, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import './CreditAssessmentPage.css';

function CreditAssessmentPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        buyerName: '',
        buyerPAN: '',
        industry: '',
        revenue: '',
        region: '',
    });
    const [assessment, setAssessment] = useState(null);

    const handleSubmit = () => {
        // Mock assessment
        setAssessment({
            creditScore: 782,
            riskLevel: 'LOW',
            recommendedLimit: 5000000,
            paymentTerms: 45,
            approvalStatus: 'AUTO_APPROVED',
            factors: [
                { name: 'Payment History', score: 92, weight: 35 },
                { name: 'Credit Utilization', score: 85, weight: 30 },
                { name: 'Industry Risk', score: 78, weight: 20 },
                { name: 'Business Age', score: 70, weight: 15 },
            ],
        });
        setStep(3);
    };

    return (
        <div className="credit-assessment-page">
            {/* Progress Steps */}
            <div className="assessment-steps">
                <div className={`step ${step >= 1 ? 'active' : ''}`}>
                    <div className="step-number">1</div>
                    <div className="step-label">Buyer Info</div>
                </div>
                <div className="step-connector"></div>
                <div className={`step ${step >= 2 ? 'active' : ''}`}>
                    <div className="step-number">2</div>
                    <div className="step-label">Review</div>
                </div>
                <div className="step-connector"></div>
                <div className={`step ${step >= 3 ? 'active' : ''}`}>
                    <div className="step-number">3</div>
                    <div className="step-label">Results</div>
                </div>
            </div>

            {/* Step 1: Buyer Information */}
            {step === 1 && (
                <div className="assessment-form">
                    <h2>Buyer Information</h2>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Buyer Name</label>
                            <input
                                type="text"
                                value={formData.buyerName}
                                onChange={(e) => setFormData({ ...formData, buyerName: e.target.value })}
                                placeholder="Enter buyer company name"
                            />
                        </div>
                        <div className="form-group">
                            <label>PAN Number</label>
                            <input
                                type="text"
                                value={formData.buyerPAN}
                                onChange={(e) => setFormData({ ...formData, buyerPAN: e.target.value.toUpperCase() })}
                                placeholder="ABCDE1234F"
                            />
                        </div>
                        <div className="form-group">
                            <label>Industry</label>
                            <select
                                value={formData.industry}
                                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                            >
                                <option value="">Select Industry</option>
                                <option value="manufacturing">Manufacturing</option>
                                <option value="retail">Retail</option>
                                <option value="services">Services</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Annual Revenue</label>
                            <input
                                type="text"
                                value={formData.revenue}
                                onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                                placeholder="₹ 10,00,000"
                            />
                        </div>
                    </div>
                    <button className="next-btn" onClick={() => setStep(2)}>
                        Continue to Review
                    </button>
                </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
                <div className="assessment-review">
                    <h2>Review Information</h2>
                    <div className="review-card">
                        <div className="review-item">
                            <User size={20} />
                            <div>
                                <div className="review-label">Buyer Name</div>
                                <div className="review-value">{formData.buyerName || 'N/A'}</div>
                            </div>
                        </div>
                        <div className="review-item">
                            <Building size={20} />
                            <div>
                                <div className="review-label">Industry</div>
                                <div className="review-value">{formData.industry || 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                    <div className="review-actions">
                        <button className="back-btn" onClick={() => setStep(1)}>Back</button>
                        <button className="submit-btn" onClick={handleSubmit}>Run Assessment</button>
                    </div>
                </div>
            )}

            {/* Step 3: Results */}
            {step === 3 && assessment && (
                <div className="assessment-results">
                    <div className="result-hero">
                        <div className="score-circle">
                            <div className="score-value">{assessment.creditScore}</div>
                            <div className="score-label">Credit Score</div>
                        </div>
                        <div className={`risk-badge ${assessment.riskLevel.toLowerCase()}`}>
                            {assessment.riskLevel} RISK
                        </div>
                    </div>

                    <div className="result-metrics">
                        <div className="metric">
                            <div className="metric-label">Recommended Limit</div>
                            <div className="metric-value">₹{(assessment.recommendedLimit / 100000).toFixed(1)}L</div>
                        </div>
                        <div className="metric">
                            <div className="metric-label">Payment Terms</div>
                            <div className="metric-value">{assessment.paymentTerms} days</div>
                        </div>
                        <div className="metric">
                            <div className="metric-label">Status</div>
                            <div className="metric-value approved">
                                <CheckCircle size={20} /> {assessment.approvalStatus}
                            </div>
                        </div>
                    </div>

                    <div className="score-factors">
                        <h3>Score Factors</h3>
                        {assessment.factors.map((factor, index) => (
                            <div key={index} className="factor-item">
                                <div className="factor-header">
                                    <span>{factor.name}</span>
                                    <span className="factor-score">{factor.score}/100</span>
                                </div>
                                <div className="factor-bar">
                                    <div className="factor-fill" style={{ width: `${factor.score}%` }}></div>
                                </div>
                                <div className="factor-weight">Weight: {factor.weight}%</div>
                            </div>
                        ))}
                    </div>

                    <button className="new-assessment-btn" onClick={() => { setStep(1); setAssessment(null); }}>
                        New Assessment
                    </button>
                </div>
            )}
        </div>
    );
}

export default CreditAssessmentPage;
