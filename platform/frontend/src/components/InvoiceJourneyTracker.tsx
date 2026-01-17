import React from 'react';
import { Box, Typography, Tooltip, Button, Paper } from '@mui/material';
import {
    Description,
    Send,
    Visibility,
    CheckCircle,
    Schedule,
    Warning,
    Error,
    RunCircle,
    Dangerous,
    Paid
} from '@mui/icons-material';
import { Invoice, JourneyStage } from '../types/invoice';

interface InvoiceJourneyTrackerProps {
    invoice: Invoice;
    onAction?: (action: string) => void;
}

const stages = [
    { id: '1_CREATED', label: 'Created', icon: <Description /> },
    { id: '2_SENT', label: 'Sent', icon: <Send /> },
    { id: '3_VIEWED', label: 'Viewed', icon: <Visibility /> },
    { id: '4_ACCEPTED', label: 'Accepted', icon: <CheckCircle /> },
    { id: '5_PENDING', label: 'Pending', icon: <Schedule /> },
    { id: '6_DUE_SOON', label: 'Due Soon', icon: <Warning /> },
    { id: '7_OVERDUE', label: 'Overdue', icon: <Error /> },
    { id: '8_CHASING', label: 'Chasing', icon: <RunCircle /> },
    { id: '9_CRITICAL', label: 'Critical', icon: <Dangerous /> },
    { id: '10_PAID', label: 'Paid', icon: <Paid /> }
];

const getStageIndex = (stage: JourneyStage) => stages.findIndex(s => s.id === stage);

export const InvoiceJourneyTracker: React.FC<InvoiceJourneyTrackerProps> = ({ invoice, onAction }) => {
    const currentIndex = getStageIndex(invoice.journeyStage);

    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Invoice Journey</Typography>

            {/* Visual Timeline */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', mb: 4, overflowX: 'auto' }}>
                {/* Connecting Line */}
                <Box sx={{
                    position: 'absolute',
                    top: '24px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    bgcolor: 'grey.300',
                    zIndex: 0
                }} />

                {stages.map((stage, index) => {
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                        <Box key={stage.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, minWidth: '60px' }}>
                            <Box sx={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: isCurrent ? 'primary.main' : (isCompleted ? 'success.light' : 'grey.200'),
                                color: isCurrent || isCompleted ? 'white' : 'text.disabled',
                                mb: 1,
                                boxShadow: isCurrent ? 3 : 0
                            }}>
                                {stage.icon}
                            </Box>
                            <Typography variant="caption" color={isCurrent ? 'primary' : 'text.secondary'} fontWeight={isCurrent ? 'bold' : 'normal'}>
                                {stage.label}
                            </Typography>
                        </Box>
                    );
                })}
            </Box>

            {/* Stuck Indicator */}
            {invoice.isStuck && (
                <Box sx={{ bgcolor: 'error.light', p: 2, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="subtitle1" color="error.dark" fontWeight="bold">
                            ⚠️ Invoice Stuck at: {stages[currentIndex].label}
                        </Typography>
                        <Typography variant="body2">
                            {invoice.stuckReason} (Stuck for {invoice.daysStuck} days)
                        </Typography>
                    </Box>
                    {onAction && (
                        <Button variant="contained" color="error" onClick={() => onAction('FIX_STUCK')}>
                            Take Action
                        </Button>
                    )}
                </Box>
            )}
        </Paper>
    );
};
