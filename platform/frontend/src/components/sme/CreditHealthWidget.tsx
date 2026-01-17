import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Button, LinearProgress } from '@mui/material';
import { TrendingUp, VerifiedUser, GppBad } from '@mui/icons-material';

interface CreditHealthProps {
    riskTier: 'PRIME' | 'NEAR_PRIME' | 'SUB_PRIME' | 'REJECT';
    score: number;
    offersCount: number;
}

export const CreditHealthWidget: React.FC<CreditHealthProps> = ({ riskTier, score, offersCount }) => {
    const getColor = () => {
        if (riskTier === 'PRIME') return 'success';
        if (riskTier === 'NEAR_PRIME') return 'info';
        if (riskTier === 'SUB_PRIME') return 'warning';
        return 'error';
    };

    return (
        <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold">Credit Health</Typography>
                    <Chip
                        label={riskTier.replace('_', ' ')}
                        color={getColor()}
                        icon={riskTier === 'REJECT' ? <GppBad /> : <VerifiedUser />}
                    />
                </Box>

                <Box mb={3}>
                    <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2" color="textSecondary">Platform Score</Typography>
                        <Typography variant="body1" fontWeight="bold">{score}/900</Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={(score / 900) * 100}
                        color={getColor()}
                        sx={{ height: 8, borderRadius: 4, mt: 1 }}
                    />
                </Box>

                <Box bgcolor="#f5f7fa" p={2} borderRadius={2} mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                        <TrendingUp fontSize="small" style={{ verticalAlign: 'bottom', marginRight: 4 }} />
                        Available Capital
                    </Typography>
                    {offersCount > 0 ? (
                        <Typography variant="body2">
                            You have <b>{offersCount} pre-approved offers</b> based on your invoice history.
                        </Typography>
                    ) : (
                        <Typography variant="body2" color="textSecondary">
                            Complete more milestones to unlock financing offers.
                        </Typography>
                    )}
                </Box>

                <Button fullWidth variant="contained" color="primary" disabled={offersCount === 0}>
                    View {offersCount} Offers
                </Button>
            </CardContent>
        </Card>
    );
};
