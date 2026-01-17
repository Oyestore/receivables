import React, { useEffect, useState } from 'react';
import {
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineOppositeContent,
} from '@mui/lab';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    Alert,
    CircularProgress,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    CheckCircle,
    Visibility,
    Send,
    Payment,
    Warning,
    Email,
    Download,
    Link as LinkIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

interface LifecycleEvent {
    id: string;
    event_type: string;
    occurred_at: Date;
    metadata?: any;
}

interface LifecycleMetrics {
    days_in_draft: number;
    days_to_first_view: number;
    days_to_payment: number;
    total_reminders_sent: number;
    views_count: number;
    payment_link_clicks: number;
}

interface Props {
    invoiceId: string;
    tenantId: string;
}

export const InvoiceJourneyTracker: React.FC<Props> = ({ invoiceId, tenantId }) => {
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<LifecycleEvent[]>([]);
    const [metrics, setMetrics] = useState<LifecycleMetrics | null>(null);
    const [bottlenecks, setBottlenecks] = useState<string[]>([]);

    useEffect(() => {
        loadJourney();
    }, [invoiceId]);

    const loadJourney = async () => {
        try {
            const response = await fetch(
                `/api/v1/invoices/${invoiceId}/lifecycle?tenant_id=${tenantId}`
            );
            const data = await response.json();
            setEvents(data.events);
            setMetrics(data.metrics);
            setBottlenecks(data.bottlenecks);
        } catch (error) {
            console.error('Failed to load journey:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEventIcon = (eventType: string) => {
        const iconMap: { [key: string]: JSX.Element } = {
            created: <CheckCircle />,
            sent: <Send />,
            viewed: <Visibility />,
            downloaded: <Download />,
            payment_link_clicked: <LinkIcon />,
            fully_paid: <Payment />,
            reminder_sent: <Email />,
        };
        return iconMap[eventType] || <CheckCircle />;
    };

    const getEventColor = (eventType: string): 'success' | 'primary' | 'warning' | 'error' => {
        if (eventType === 'fully_paid') return 'success';
        if (eventType.includes('overdue')) return 'error';
        if (eventType.includes('reminder')) return 'warning';
        return 'primary';
    };

    const formatDuration = (days: number): string => {
        if (days === 0) return 'Same day';
        if (days === 1) return '1 day';
        if (days < 1) return `${Math.floor(days * 24)} hours`;
        return `${Math.floor(days)} days`;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Invoice Journey
                </Typography>

                {/* Bottlenecks */}
                {bottlenecks.length > 0 && (
                    <Box mb={3}>
                        {bottlenecks.map((bottleneck, index) => (
                            <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                                {bottleneck}
                            </Alert>
                        ))}
                    </Box>
                )}

                {/* Metrics Summary */}
                {metrics && (
                    <Box
                        mb={3}
                        display="grid"
                        gridTemplateColumns="repeat(auto-fit, minmax(150px, 1fr))"
                        gap={2}
                    >
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Time in Draft
                            </Typography>
                            <Typography variant="h6">{formatDuration(metrics.days_in_draft)}</Typography>
                        </Box>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                To First View
                            </Typography>
                            <Typography variant="h6">{formatDuration(metrics.days_to_first_view)}</Typography>
                        </Box>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                To Payment
                            </Typography>
                            <Typography variant="h6">{formatDuration(metrics.days_to_payment)}</Typography>
                        </Box>
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                Views
                            </Typography>
                            <Typography variant="h6">{metrics.views_count}</Typography>
                        </Box>
                    </Box>
                )}

                {/* Timeline */}
                <Timeline position="right">
                    {events.map((event, index) => {
                        const nextEvent = events[index + 1];
                        const duration = nextEvent
                            ? (new Date(nextEvent.occurred_at).getTime() -
                                new Date(event.occurred_at).getTime()) /
                            (1000 * 60 * 60 * 24)
                            : 0;

                        const isBottleneck = duration > 7;

                        return (
                            <TimelineItem key={event.id}>
                                <TimelineOppositeContent color="text.secondary" sx={{ flex: 0.3 }}>
                                    <Typography variant="caption">
                                        {format(new Date(event.occurred_at), 'MMM dd, yyyy')}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                        {format(new Date(event.occurred_at), 'HH:mm')}
                                    </Typography>
                                    {duration > 0 && (
                                        <Chip
                                            label={formatDuration(duration)}
                                            size="small"
                                            color={isBottleneck ? 'error' : 'default'}
                                            sx={{ mt: 0.5 }}
                                        />
                                    )}
                                </TimelineOppositeContent>

                                <TimelineSeparator>
                                    <TimelineDot color={getEventColor(event.event_type)}>
                                        {getEventIcon(event.event_type)}
                                    </TimelineDot>
                                    {index < events.length - 1 && (
                                        <TimelineConnector
                                            sx={{
                                                bgcolor: isBottleneck ? 'error.main' : 'grey.300',
                                                width: isBottleneck ? 3 : 2,
                                            }}
                                        />
                                    )}
                                </TimelineSeparator>

                                <TimelineContent>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                    </Typography>
                                    {event.metadata && (
                                        <Box mt={0.5}>
                                            {event.metadata.channel && (
                                                <Chip label={event.metadata.channel} size="small" sx={{ mr: 0.5 }} />
                                            )}
                                            {event.metadata.amount && (
                                                <Typography variant="caption" color="text.secondary">
                                                    ₹{event.metadata.amount.toLocaleString()}
                                                </Typography>
                                            )}
                                            {event.metadata.ip_address && (
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    From {event.metadata.ip_address}
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                </TimelineContent>
                            </TimelineItem>
                        );
                    })}
                </Timeline>
            </CardContent>
        </Card>
    );
};
