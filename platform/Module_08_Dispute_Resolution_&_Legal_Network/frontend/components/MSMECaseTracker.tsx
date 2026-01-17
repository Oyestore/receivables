import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineOppositeContent,
    Chip,
    Button,
    CircularProgress,
} from '@mui/material';
import {
    CheckCircle,
    Schedule,
    Send,
    Gavel,
    CloudUpload,
    Sync,
} from '@mui/icons-material';
import axios from 'axios';

interface MSMECase {
    id: string;
    msmeCaseNumber: string;
    status: string;
    supplierName: string;
    buyerName: string;
    amountClaimed: number;
    conciliatorAssigned?: string;
    hearingDate?: string;
    timeline: Array<{
        date: string;
        status: string;
        description: string;
    }>;
}

const MSMECaseTracker: React.FC<{ caseId: string }> = ({ caseId }) => {
    const [msmeCase, setMsmeCase] = useState<MSMECase | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        loadCaseDetails();
    }, [caseId]);

    const loadCaseDetails = async () => {
        try {
            const response = await axios.get(`/api/v1/msme/cases/${caseId}`);
            setMsmeCase(response.data);
        } catch (error) {
            console.error('Failed to load MSME case:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const response = await axios.post(`/api/v1/msme/cases/${caseId}/sync`);
            setMsmeCase(response.data);
        } catch (error) {
            console.error('Failed to sync case:', error);
        } finally {
            setSyncing(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case 'submitted':
                return <Send />;
            case 'under_review':
                return <Schedule />;
            case 'hearing_scheduled':
                return <Gavel />;
            case 'award_passed':
                return <CheckCircle />;
            default:
                return <Schedule />;
        }
    };

    const getStatusColor = (status: string): any => {
        switch (status.toLowerCase()) {
            case 'submitted':
                return 'primary';
            case 'under_review':
                return 'warning';
            case 'hearing_scheduled':
                return 'info';
            case 'award_passed':
                return 'success';
            case 'closed':
                return 'success';
            case 'rejected':
                return 'error';
            default:
                return 'default';
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    if (!msmeCase) {
        return (
            <Typography color="error">MSME case not found</Typography>
        );
    }

    return (
        <Box p={3}>
            {/* Header */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                        <Typography variant="h5" fontWeight="bold">
                            {msmeCase.msmeCaseNumber}
                        </Typography>
                        <Chip
                            label={msmeCase.status.replace('_', ' ').toUpperCase()}
                            color={getStatusColor(msmeCase.status)}
                            sx={{ mt: 1 }}
                        />
                    </Box>
                    <Button
                        variant="outlined"
                        startIcon={syncing ? <CircularProgress size={16} /> : <Sync />}
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        Sync Status
                    </Button>
                </Box>

                <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} mt={3}>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Supplier
                        </Typography>
                        <Typography variant="body1">{msmeCase.supplierName}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Buyer
                        </Typography>
                        <Typography variant="body1">{msmeCase.buyerName}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Amount Claimed
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                            ₹{msmeCase.amountClaimed.toLocaleString('en-IN')}
                        </Typography>
                    </Box>
                    {msmeCase.conciliatorAssigned && (
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Conciliator Assigned
                            </Typography>
                            <Typography variant="body1">{msmeCase.conciliatorAssigned}</Typography>
                        </Box>
                    )}
                    {msmeCase.hearingDate && (
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Hearing Date
                            </Typography>
                            <Typography variant="body1">
                                {new Date(msmeCase.hearingDate).toLocaleDateString('en-IN')}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Paper>

            {/* Timeline */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Case Timeline
                </Typography>
                <Timeline position="right">
                    {msmeCase.timeline.map((event, index) => (
                        <TimelineItem key={index}>
                            <TimelineOppositeContent color="text.secondary">
                                {new Date(event.date).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                                <br />
                                <Typography variant="caption">
                                    {new Date(event.date).toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Typography>
                            </TimelineOppositeContent>
                            <TimelineSeparator>
                                <TimelineDot color={getStatusColor(event.status)}>
                                    {getStatusIcon(event.status)}
                                </TimelineDot>
                                {index < msmeCase.timeline.length - 1 && <TimelineConnector />}
                            </TimelineSeparator>
                            <TimelineContent>
                                <Typography variant="subtitle2" fontWeight="bold">
                                    {event.status.replace('_', ' ').toUpperCase()}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {event.description}
                                </Typography>
                            </TimelineContent>
                        </TimelineItem>
                    ))}
                </Timeline>
            </Paper>
        </Box>
    );
};

export default MSMECaseTracker;
