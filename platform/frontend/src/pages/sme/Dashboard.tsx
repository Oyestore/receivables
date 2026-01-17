import React from 'react';
import { Box, Grid, Paper, Typography, Button, LinearProgress, Card, CardContent } from '@mui/material';
import { Description, Send, Visibility, CheckCircle, Schedule, Warning, Error, Paid, ArrowForward } from '@mui/icons-material';
import { JourneyStage, Invoice } from '../../types/invoice';
import { useQuery } from '@tanstack/react-query';
import { invoiceAPI } from '../../config/api';
import { InvoiceJourneyTracker } from '../../components/InvoiceJourneyTracker';

// Helper to aggregate journey stats
const aggregateJourney = (invoices: any[]) => {
    const stageMap: Record<string, { count: number; amount: number }> = {};
    invoices.forEach((inv) => {
        const stage = inv.journeyStage;
        if (!stageMap[stage]) {
            stageMap[stage] = { count: 0, amount: 0 };
        }
        stageMap[stage].count += 1;
        stageMap[stage].amount += inv.grandTotal ?? 0;
    });
    return Object.entries(stageMap).map(([stage, data]) => ({
        id: JourneyStage[stage as keyof typeof JourneyStage],
        label: stage.charAt(0) + stage.slice(1).toLowerCase(),
        count: data.count,
        amount: data.amount,
        color: getStageColor(stage as any),
        icon: getStageIcon(stage as any),
    }));
};

const getStageColor = (stage: JourneyStage) => {
    switch (stage) {
        case JourneyStage.CREATED:
            return 'text.secondary';
        case JourneyStage.SENT:
        case JourneyStage.VIEWED:
            return 'info.main';
        case JourneyStage.ACCEPTED:
        case JourneyStage.PAID:
            return 'success.main';
        case JourneyStage.PENDING:
        case JourneyStage.DUE_SOON:
            return 'warning.main';
        case JourneyStage.OVERDUE:
        case JourneyStage.CHASING:
        case JourneyStage.CRITICAL:
            return 'error.main';
        default:
            return 'default';
    }
};

const getStageIcon = (stage: JourneyStage) => {
    switch (stage) {
        case JourneyStage.CREATED:
            return <Description />;
        case JourneyStage.SENT:
            return <Send />;
        case JourneyStage.VIEWED:
            return <Visibility />;
        case JourneyStage.ACCEPTED:
            return <CheckCircle />;
        case JourneyStage.PENDING:
            return <Schedule />;
        case JourneyStage.DUE_SOON:
            return <Warning />;
        case JourneyStage.OVERDUE:
            return <Error />;
        case JourneyStage.PAID:
            return <Paid />;
        default:
            return <Description />;
    }
};

const Dashboard: React.FC = () => {
    const { data: invoices = [] } = useQuery<Invoice[]>({ queryKey: ['invoices'], queryFn: () => invoiceAPI.getInvoices('defaultTenant').then(res => res.data) });
    const journeyStages = aggregateJourney(invoices);

    // Compute stuck metrics (example: overdue invoices)
    const stuckInvoices = invoices.filter((inv: Invoice) => inv.journeyStage === JourneyStage.OVERDUE || inv.journeyStage === JourneyStage.CRITICAL);
    const stuckCount = stuckInvoices.length;
    const stuckAmount = stuckInvoices.reduce((sum: number, inv: Invoice) => sum + (inv.grandTotal ?? 0), 0);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>Invoice Journey Overview</Typography>
            {/* One Thing */}
            <Card sx={{ mb: 4, bgcolor: '#fff3f3', border: '1px solid #ffcdd2' }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={9}>
                            <Typography variant="h6" color="error" gutterBottom>🎯 <strong>Your One Thing Today:</strong> Unstick ₹{(stuckAmount / 100000).toFixed(1)} Lakhs</Typography>
                            <Typography variant="body1">You have <strong>{stuckCount}</strong> invoices stuck in the <strong>Overdue</strong> stage. Resolving these will improve your cash flow immediately.</Typography>
                        </Grid>
                        <Grid item xs={12} md={3} sx={{ textAlign: 'right' }}>
                            <Button variant="contained" color="error" endIcon={<ArrowForward />}>Start Autopilot</Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Journey Tracker Component */}


            {/* Journey Stages Grid (fallback if component not used) */}
            <Typography variant="h6" sx={{ mb: 2 }}>Live Invoices by Stage</Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {journeyStages.map((stage) => (
                    <Grid item xs={12} sm={6} md={3} lg={2.4} key={stage.id}>
                        <Paper sx={{ p: 2, height: '100%', position: 'relative', overflow: 'hidden' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: stage.color }}>
                                {stage.icon}
                                <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 'bold' }}>{stage.label}</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ mb: 0.5 }}>{stage.count}</Typography>
                            <Typography variant="body2" color="text.secondary">₹{(stage.amount / 1000).toFixed(1)}k</Typography>
                            {(stage.id === JourneyStage.OVERDUE || stage.id === JourneyStage.CRITICAL) && (
                                <Box sx={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', bgcolor: 'error.main' }} />
                            )}
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Recent Activity / Timeline Placeholder */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Journey Velocity</Typography>
                        <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="body2">Average Time to Paid</Typography>
                                <Typography variant="body2" fontWeight="bold">42 Days</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={70} color="primary" />
                        </Box>
                        <Typography variant="body2" color="text.secondary">Your invoices are moving 15% faster than last month.</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Automation Status</Typography>
                        <Typography variant="body1"><strong>15</strong> invoices on Autopilot</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Saving ~5 hours/week on follow-ups.</Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Dashboard;
