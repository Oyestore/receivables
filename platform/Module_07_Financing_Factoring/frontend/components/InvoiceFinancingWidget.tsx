import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Invoice {
    id: string;
    total: number;
    status: string;
    dueDate: string;
    buyerId: string;
    sellerId: string;
}

interface FinancingOption {
    available: boolean;
    amount: number;
    estimatedRate: number;
    approvalProbability: number;
    recommendedPartners: number;
    estimatedTime: string;
}

interface InvoiceFinancingWidgetProps {
    invoice: Invoice;
    onApply?: (amount: number) => void;
}

export const InvoiceFinancingWidget: React.FC<InvoiceFinancingWidgetProps> = ({
    invoice,
    onApply,
}) => {
    const [loading, setLoading] = useState(true);
    const [financing, setFinancing] = useState<FinancingOption | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        fetchFinancingOption();
    }, [invoice.id]);

    const fetchFinancingOption = async () => {
        try {
            setLoading(true);
            setError(null);

            // Quick pre-qualification check
            const response = await axios.post('/api/v1/financing/quick-check', {
                amount: invoice.total * 0.9, //90% of invoice
                purpose: 'invoice_financing',
                invoiceId: invoice.id,
            });

            setFinancing({
                available: response.data.decision !== 'decline',
                amount: invoice.total * 0.9,
                estimatedRate: response.data.estimatedRate || 15,
                approvalProbability: response.data.approvalProbability || 70,
                recommendedPartners: response.data.recommendedPartners?.length || 2,
                estimatedTime: '24-48 hours',
            });
        } catch (err: any) {
            setError(err.message || 'Failed to check financing availability');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickApply = async () => {
        if (!financing) return;

        try {
            setApplying(true);

            // One-click application
            const response = await axios.post('/api/v1/financing/applications/quick-apply', {
                invoiceId: invoice.id,
                amount: financing.amount,
                purpose: 'invoice_financing',
            });

            if (onApply) {
                onApply(financing.amount);
            }

            // Redirect to application status
            window.location.href = `/financing/applications/${response.data.applicationId}`;
        } catch (err: any) {
            setError(err.message || 'Failed to submit application');
            setApplying(false);
        }
    };

    if (loading) {
        return (
            <div className="invoice-financing-widget loading">
                <div className="spinner"></div>
                <p>Checking financing options...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="invoice-financing-widget error">
                <p>⚠️ {error}</p>
            </div>
        );
    }

    if (!financing || !financing.available) {
        return (
            <div className="invoice-financing-widget unavailable">
                <p>💡 Financing not available for this invoice</p>
            </div>
        );
    }

    return (
        <div className="invoice-financing-widget available">
            <div className="widget-header">
                <h4>💰 Finance This Invoice</h4>
                <span className={`badge ${financing.approvalProbability >= 70 ? 'success' : 'warning'}`}>
                    {financing.approvalProbability}% Approval Chance
                </span>
            </div>

            <div className="widget-body">
                <div className="financing-details">
                    <div className="detail-row">
                        <span className="label">Available Amount:</span>
                        <span className="value">₹{(financing.amount / 100000).toFixed(1)}L</span>
                    </div>
                    <div className="detail-row">
                        <span className="label">Estimated Rate:</span>
                        <span className="value">{financing.estimatedRate}% APR</span>
                    </div>
                    <div className="detail-row">
                        <span className="label">Top Partners:</span>
                        <span className="value">{financing.recommendedPartners} available</span>
                    </div>
                    <div className="detail-row">
                        <span className="label">Get funded in:</span>
                        <span className="value">{financing.estimatedTime}</span>
                    </div>
                </div>

                <button
                    className="btn btn-primary btn-block"
                    onClick={handleQuickApply}
                    disabled={applying}
                >
                    {applying ? 'Submitting...' : '🚀 Apply Now (One-Click)'}
                </button>

                <p className="help-text">
                    Pre-qualified based on your business profile. Application takes ~30 seconds.
                </p>
            </div>

            <style jsx>{`
        .invoice-financing-widget {
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          background: linear-gradient(135deg, #f5f7fa 0%, #e3f2fd 100%);
        }

        .invoice-financing-widget.available {
          border-color: #4caf50;
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .widget-header h4 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .badge.success {
          background: #4caf50;
          color: white;
        }

        .badge.warning {
          background: #ff9800;
          color: white;
        }

        .financing-details {
          background: white;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row .label {
          color: #666;
          font-size: 14px;
        }

        .detail-row .value {
          color: #333;
          font-weight: 600;
          font-size: 14px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-block {
          width: 100%;
        }

        .help-text {
          text-align: center;
          font-size: 12px;
          color: #666;
          margin-top: 8px;
          margin-bottom: 0;
        }

        .loading, .error, .unavailable {
          text-align: center;
          padding: 24px;
        }

        .spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
};

export default InvoiceFinancingWidget;
