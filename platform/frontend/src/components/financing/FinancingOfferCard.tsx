import React from 'react';
import { Card, CardContent, Typography, Button, Box, Chip } from '@mui/material';
import { FinancingOffer } from '../../types/financing';
import { Percent, CalendarMonth, LocalOffer } from '@mui/icons-material';

interface FinancingOfferCardProps {
    offer: FinancingOffer;
    onAccept: (id: string) => void;
}

export const FinancingOfferCard: React.FC<FinancingOfferCardProps> = ({ offer, onAccept }) => {
    return (
        <Card sx={{
            position: 'relative',
            overflow: 'visible',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 }
        }}>
            {offer.status === 'AVAILABLE' && (
                <Chip
                    label="Instant Approval"
                    color="success"
                    size="small"
                    sx={{ position: 'absolute', top: -10, right: 16 }}
                />
            )}

            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Offer from {offer.provider}
                    </Typography>
                    <LocalOffer color="primary" />
                </Box>

                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    ₹{offer.amount.toLocaleString()}
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, my: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Percent fontSize="small" color="action" />
                        <Box>
                            <Typography variant="caption" display="block">Interest Rate</Typography>
                            <Typography variant="subtitle2">{offer.interestRate}% / mo</Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarMonth fontSize="small" color="action" />
                        <Box>
                            <Typography variant="caption" display="block">Tenure</Typography>
                            <Typography variant="subtitle2">{offer.tenureDays} Days</Typography>
                        </Box>
                    </Box>
                </Box>

                <Button
                    variant="contained"
                    fullWidth
                    onClick={() => onAccept(offer.id)}
                    disabled={offer.status !== 'AVAILABLE'}
                >
                    {offer.status === 'AVAILABLE' ? 'Get Funds Now' : 'Application Sent'}
                </Button>
            </CardContent>
        </Card>
    );
};
