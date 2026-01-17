import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    Button,
    Grid,
    Card,
    CardContent,
    Chip,
    Divider,
    Stack,
    List,
    ListItem,
    ListItemText,
    IconButton,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Edit as EditIcon,
    Download as DownloadIcon,
    Psychology as AIIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import disputeApi from '../../services/disputeApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

export default function DisputeDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0);

    const { data: dispute, isLoading } = useQuery({
        queryKey: ['dispute', id],
        queryFn: () => disputeApi.getById(id!),
        enabled: !!id,
    });

    const { data: prediction } = useQuery({
        queryKey: ['prediction', id],
        queryFn: () => disputeApi.getPrediction(id!, 'tenant1'),
        enabled: !!id,
    });

    const { data: risk } = useQuery({
        queryKey: ['risk', id],
        queryFn: () => disputeApi.getRiskAssessment(id!, 'tenant1'),
        enabled: !!id,
    });

    if (isLoading) {
        return <LoadingSpinner message="Loading dispute details..." />;
    }

    if (!dispute) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="error">
                    Dispute not found
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Button
                    startIcon={<BackIcon />}
                    onClick={() => navigate('/disputes')}
                    sx={{ mb: 2 }}
                >
                    Back to Disputes
                </Button>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            {dispute.caseNumber}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <StatusBadge status={dispute.status} size="medium" />
                            <Chip
                                label={dispute.priority}
                                color={
                                    dispute.priority === 'urgent' ? 'error' :
                                        dispute.priority === 'high' ? 'warning' : 'default'
                                }
                            />
                            <Typography variant="body2" color="text.secondary">
                                Created {format(new Date(dispute.createdAt), 'MMM dd, yyyy')}
                            </Typography>
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={2}>
                        <Button variant="outlined" startIcon={<EditIcon />}>
                            Update Status
                        </Button>
                        <Button variant="contained">
                            Assign Lawyer
                        </Button>
                    </Stack>
                </Box>
            </Box>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Overview" />
                    <Tab label="Timeline" />
                    <Tab label="Evidence" />
                    <Tab label="AI Insights" icon={<AIIcon sx={{ ml: 1 }} />} iconPosition="end" />
                    <Tab label="Audit Log" />
                </Tabs>

                {/* Overview Tab */}
                <TabPanel value={activeTab} index={0}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                        Dispute Details
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Customer
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {dispute.customerName}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Invoice ID
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {dispute.invoiceId}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Disputed Amount
                                            </Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
                                                ₹{dispute.disputedAmount.toLocaleString()}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Type
                                            </Typography>
                                            <Chip
                                                label={dispute.type.replace('_', ' ')}
                                                size="small"
                                                sx={{ mt: 0.5 }}
                                            />
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                        Description
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {dispute.description}
                                    </Typography>
                                    {dispute.notes && (
                                        <>
                                            <Divider sx={{ my: 2 }} />
                                            <Typography variant="caption" color="text.secondary">
                                                Notes
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                {dispute.notes}
                                            </Typography>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </TabPanel>

                {/* Timeline Tab */}
                <TabPanel value={activeTab} index={1}>
                    <List>
                        {dispute.timeline && dispute.timeline.length > 0 ? (
                            dispute.timeline.map((event, index) => (
                                <ListItem key={index} sx={{ borderLeft: 2, borderColor: 'primary.main', pl: 2, mb: 2 }}>
                                    <ListItemText
                                        primary={event.event}
                                        secondary={
                                            <>
                                                <Typography variant="caption" display="block">
                                                    {format(new Date(event.date), 'MMM dd, yyyy HH:mm')}
                                                </Typography>
                                                <Typography variant="body2">{event.description}</Typography>
                                                <Typography variant="caption">By: {event.performedBy}</Typography>
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))
                        ) : (
                            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                No timeline events yet
                            </Typography>
                        )}
                    </List>
                </TabPanel>

                {/* Evidence Tab */}
                <TabPanel value={activeTab} index={2}>
                    <Box>
                        <Button variant="contained" sx={{ mb: 3 }}>
                            Upload Evidence
                        </Button>

                        {dispute.evidence && dispute.evidence.documents.length > 0 ? (
                            <Grid container spacing={2}>
                                {dispute.evidence.documents.map((doc) => (
                                    <Grid item xs={12} sm={6} md={4} key={doc.id}>
                                        <Card>
                                            <CardContent>
                                                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                                                    {doc.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {doc.type} • {format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}
                                                </Typography>
                                                <Box sx={{ mt: 2 }}>
                                                    <IconButton size="small">
                                                        <DownloadIcon />
                                                    </IconButton>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                No evidence uploaded yet
                            </Typography>
                        )}
                    </Box>
                </TabPanel>

                {/* AI Insights Tab */}
                <TabPanel value={activeTab} index={3}>
                    <Grid container spacing={3}>
                        {prediction && (
                            <Grid item xs={12} md={6}>
                                <Card sx={{ background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(156, 39, 176, 0.1))' }}>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                            Outcome Prediction
                                        </Typography>
                                        <Box sx={{ textAlign: 'center', py: 3 }}>
                                            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                                                {prediction.confidence.toFixed(0)}%
                                            </Typography>
                                            <Typography variant="h6" color="text.secondary">
                                                {prediction.predictedOutcome.toUpperCase()}
                                            </Typography>
                                        </Box>
                                        <Divider sx={{ my: 2 }} />
                                        <Stack spacing={1}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2">Duration</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {prediction.estimatedDuration} days
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body2">Estimated Cost</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    ₹{prediction.estimatedCost.toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}

                        {risk && (
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                            Risk Assessment
                                        </Typography>
                                        <Box sx={{ textAlign: 'center', py: 3 }}>
                                            <Typography
                                                variant="h3"
                                                sx={{
                                                    fontWeight: 700,
                                                    mb: 1,
                                                    color:
                                                        risk.riskLevel === 'critical' ? 'error.main' :
                                                            risk.riskLevel === 'high' ? 'warning.main' :
                                                                risk.riskLevel === 'medium' ? 'info.main' : 'success.main'
                                                }}
                                            >
                                                {risk.riskScore.toFixed(0)}
                                            </Typography>
                                            <Chip
                                                label={risk.riskLevel.toUpperCase()}
                                                color={
                                                    risk.riskLevel === 'critical' ? 'error' :
                                                        risk.riskLevel === 'high' ? 'warning' :
                                                            risk.riskLevel === 'medium' ? 'info' : 'success'
                                                }
                                            />
                                        </Box>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                            Recommendations
                                        </Typography>
                                        {risk.recommendations.map((rec, index) => (
                                            <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                                                • {rec}
                                            </Typography>
                                        ))}
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                </TabPanel>

                {/* Audit Log Tab */}
                <TabPanel value={activeTab} index={4}>
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        Audit log integration coming soon...
                    </Typography>
                </TabPanel>
            </Paper>
        </Box>
    );
}
