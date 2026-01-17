import { Chip } from '@mui/material';
import { DisputeStatus, CollectionStatus } from '../../types/dispute.types';

interface StatusBadgeProps {
    status: DisputeStatus | CollectionStatus | string;
    size?: 'small' | 'medium';
}

const statusConfig: Record<string, { color: any; label: string }> = {
    // Dispute statuses
    draft: { color: 'default', label: 'Draft' },
    filed: { color: 'info', label: 'Filed' },
    under_review: { color: 'primary', label: 'Under Review' },
    mediation: { color: 'warning', label: 'Mediation' },
    arbitration: { color: 'warning', label: 'Arbitration' },
    legal_notice_sent: { color: 'error', label: 'Legal Notice' },
    court_proceedings: { color: 'error', label: 'Court' },
    resolved: { color: 'success', label: 'Resolved' },
    closed: { color: 'default', label: 'Closed' },

    // Collection statuses
    new: { color: 'info', label: 'New' },
    in_progress: { color: 'primary', label: 'In Progress' },
    payment_plan: { color: 'warning', label: 'Payment Plan' },
    settled: { color: 'success', label: 'Settled' },
    legal_action: { color: 'error', label: 'Legal Action' },
    written_off: { color: 'default', label: 'Written Off' },
};

export default function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
    const config = statusConfig[status] || { color: 'default', label: status };

    return (
        <Chip
            label={config.label}
            color={config.color as any}
            size={size}
            sx={{
                fontWeight: 500,
                borderRadius: 2,
            }}
        />
    );
}
