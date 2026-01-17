import React from 'react';

interface FinancingBadgeProps {
    available: boolean;
    amount: number;
    rate: number;
    approvalProbability?: number;
    onClick?: () => void;
}

export const FinancingBadge: React.FC<FinancingBadgeProps> = ({
    available,
    amount,
    rate,
    approvalProbability = 70,
    onClick,
}) => {
    if (!available) {
        return null; // Don't show if not available
    }

    const badgeColor = approvalProbability >= 70 ? '#4caf50' : approvalProbability >= 50 ? '#ff9800' : '#f44336';

    return (
        <div className="financing-badge" onClick={onClick} title={`Finance ₹${(amount / 100000).toFixed(1)}L @ ${rate}% APR\n${approvalProbability}% approval probability\nClick for details`}>
            <span className="badge-icon">💰</span>
            <span className="badge-text">
                Finance ₹{(amount / 100000).toFixed(1)}L @ {rate}%
            </span>

            <style jsx>{`
        .financing-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: linear-gradient(135deg, ${badgeColor}22 0%, ${badgeColor}11 100%);
          border: 1px solid ${badgeColor};
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          color: ${badgeColor};
          cursor: pointer;
          transition: all 0.2s;
        }

        .financing-badge:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 8px ${badgeColor}33;
        }

        .badge-icon {
          font-size: 14px;
        }

        .badge-text {
          white-space: nowrap;
        }
      `}</style>
        </div>
    );
};

export default FinancingBadge;
