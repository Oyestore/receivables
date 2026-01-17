import React, { useEffect, useState } from 'react';
import {
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    Chip,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    LinearProgress,
} from '@mui/material';
import {
    Gavel,
    Description,
    AccessTime,
    CheckCircle,
    Warning,
    TrendingUp,
} from '@mui/icons-material';

interface CaseData {
    id: string;
    caseNumber: string;
    clientName: string;
    invoiceAmount: number;
    status: 'active' | 'pending' | 'resolved';
    priority: 'low' | 'medium' | 'high';
    daysOpen: number;
    nextAction: string;
    nextActionDate: string;
}

const LegalCases: React.FC = () => {
    const [cases, setCases] = useState<CaseData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulated data load
        setTimeout(() => {
            setCases([
                {
                    id: '1',
                    caseNumber: 'CASE-2025-001',
                    clientName: 'Acme Corp',
                    invoiceAmount: 250000,
                    status: 'active',
                    priority: 'high',
                    daysOpen: 15,
                    nextAction: 'Send legal notice',
                    nextActionDate: '2025-11-26',
                },
                {
                    id: '2',
                    caseNumber: 'CASE-2025-002',
                    clientName: 'Tech Solutions Ltd',
                    invoiceAmount: 180000,
                    status: 'pending',
                    priority: 'medium',
                    daysOpen: 7,
                    nextAction: 'Wait for response',
                    nextActionDate: '2025-11-28',
                },
                {
                    id: '3',
                    caseNumber: 'CASE-2025-003',
                    clientName: 'XYZ Enterprises',
                    invoiceAmount: 95000,
                    status: 'active',
                    priority: 'low',
                    daysOpen: 3,
                    nextAction: 'Schedule hearing',
                    nextActionDate: '2025-12-01',
                },
            ]);
            setLoading(false);
        }, 1000);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'primary';
            case 'pending':
                return 'warning';
            case 'resolved':
                return 'success';
            default:
                return 'default';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            case 'low':
                return 'success';
            default:
                return 'default';
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight="bold">
                    My Cases
                </Typography>
                <Button variant="contained" startIcon={<Gavel />}>
                    New Case
                </Button>
            </Box>

            {/* Stats Grid */}
            <Grid container spacing={3} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <Gavel color="primary" sx={{ mr: 1 }} />
                                <Typography variant="h6">Active Cases</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">
                                12
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                +3 this month
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <CheckCircle color="success" sx={{ mr: 1 }} />
                                <Typography variant="h6">Resolved</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">
                                8
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                This month
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <Warning color="warning" sx={{ mr: 1 }} />
                                <Typography variant="h6">Pending</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">
                                5
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Awaiting response
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <TrendingUp color="success" sx={{ mr: 1 }} />
                                <Typography variant="h6">Success Rate</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">
                                87%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Last 6 months
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Cases List */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Active Cases
                </Typography>

                {loading ? (
                    <LinearProgress />
                ) : (
                    <List>
                        {cases.map((caseItem) => (
                            <ListItem
                                key={caseItem.id}
                                sx={{
                                    mb: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 2,
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar>
                                        <Gavel />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box display="flex" alignItems="center" gap={1}>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {caseItem.caseNumber}
                                            </Typography>
                                            <Chip
                                                label={caseItem.status}
                                                size="small"
                                                color={getStatusColor(caseItem.status)}
                                            />
                                            <Chip
                                                label={caseItem.priority}
                                                size="small"
                                                color={getPriorityColor(caseItem.priority)}
                                            />
                                        </Box>
                                    }
                                    secondary={
                                        <Box mt={1}>
                                            <Typography variant="body2">
                                                Client: {caseItem.clientName}
                                            </Typography>
                                            <Typography variant="body2">
                                                Amount: ₹{caseItem.invoiceAmount.toLocaleString('en-IN')}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Open for {caseItem.daysOpen} days
                                            </Typography>
                                            <Box display="flex" alignItems="center" mt={1}>
                                                <AccessTime fontSize="small" sx={{ mr: 0.5 }} />
                                                <Typography variant="caption">
                                                    Next: {caseItem.nextAction} ({caseItem.nextActionDate})
                                                </Typography>
                                            </Box>
                                        </Box>
                                    }
                                />
                                <Box display="flex" gap={1}>
                                    <Button variant="outlined" size="small">
                                        View Details
                                    </Button>
                                    <Button variant="contained" size="small" startIcon={<Description />}>
                                        Generate Doc
                                    </Button>
                                </Box>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>
        </Box>
    );
};

export default LegalCases;
