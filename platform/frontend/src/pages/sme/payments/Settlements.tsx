import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Paper, Grid, Card, CardContent } from '@mui/material';
import { paymentAPI } from '../../../config/api';
import { Settlement } from '../../../types/payment';
import { AccountBalanceWallet, TrendingUp, PendingActions } from '@mui/icons-material';

const Settlements: React.FC = () => {
    const { data: settlements = [], isLoading, isError } = useQuery<Settlement[]>({
        queryKey: ['settlements'],
        queryFn: () => paymentAPI.getSettlements('defaultTenant').then((res) => res.data),
    });

    if (isLoading) return <Typography>Loading settlements...</Typography>;
    if (isError) return <Typography color="error">Failed to load settlements.</Typography>;

    const totalSettled = settlements
        .filter(s => s.status === 'PROCESSED')
        .reduce((sum, s) => sum + s.amount, 0);

    const pendingSettlement = settlements
        .filter(s => s.status === 'PENDING')
        .reduce((sum, s) => sum + s.amount, 0);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4 }}>
                Settlements
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                    <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AccountBalanceWallet sx={{ mr: 1 }} />
                                <Typography variant="h6">Total Settled</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">
                                ₹{totalSettled.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <PendingActions sx={{ mr: 1 }} />
                                <Typography variant="h6">Pending Settlement</Typography>
                            </Box>
                            <Typography variant="h3" fontWeight="bold">
                                ₹{pendingSettlement.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* List of recent settlements would go here */}
            <Typography variant="h6" gutterBottom>Recent Settlements</Typography>
            {settlements.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">No settlement history available.</Typography>
                </Paper>
            ) : (
                <Paper>
                    {/* Simplified list for MVP */}
                    {settlements.map(s => (
                        <Box key={s.id} sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="subtitle1">Settlement #{s.id}</Typography>
                                <Typography variant="caption" color="text.secondary">{new Date(s.date).toLocaleDateString()}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="subtitle1" fontWeight="bold">₹{s.amount.toLocaleString()}</Typography>
                                <Typography variant="caption" color={s.status === 'PROCESSED' ? 'success.main' : 'warning.main'}>{s.status}</Typography>
                            </Box>
                        </Box>
                    ))}
                </Paper>
            )}
        </Box>
    );
};

export default Settlements; // Ensure default export
