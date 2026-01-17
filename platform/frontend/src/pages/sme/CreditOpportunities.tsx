import React from 'react';
import {
    Grid, Card, CardContent, Typography, Button, Box, Avatar, Chip
} from '@mui/material';
import { LocalOffer, Bolt } from '@mui/icons-material';

const mockOffers = [
    { id: 1, bank: 'HDFC Bank', rate: 12.5, type: 'Term Loan', amount: '₹15,00,000', tags: ['Lowest Rate'] },
    { id: 2, bank: 'Bajaj Finserv', rate: 14.2, type: 'Invoice Discounting', amount: '₹5,00,000', tags: ['Fast Disbursal'] },
    { id: 3, bank: 'Oxyzo', rate: 13.8, type: 'Credit Line', amount: '₹25,00,000', tags: ['Flexible'] },
];

export const CreditOpportunities: React.FC = () => {
    return (
        <Box p={3}>
            <Box mb={3}>
                <Typography variant="h5" fontWeight="bold">Your Pre-Approved Offers</Typography>
                <Typography variant="body2" color="textSecondary">
                    Based on your Module 06 Score and Module 10 Cash Flow Projections.
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {mockOffers.map((offer) => (
                    <Grid item xs={12} md={4} key={offer.id}>
                        <Card elevation={2} sx={{ position: 'relative', overflow: 'visible' }}>
                            {offer.tags.includes('Lowest Rate') && (
                                <Chip
                                    label="Best Value"
                                    color="success"
                                    size="small"
                                    icon={<LocalOffer />}
                                    sx={{ position: 'absolute', top: -10, right: 10 }}
                                />
                            )}
                            {offer.tags.includes('Fast Disbursal') && (
                                <Chip
                                    label="Instant"
                                    color="warning"
                                    size="small"
                                    icon={<Bolt />}
                                    sx={{ position: 'absolute', top: -10, right: 10 }}
                                />
                            )}

                            <CardContent>
                                <Box display="flex" alignItems="center" mb={2} gap={2}>
                                    <Avatar variant="rounded" sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }}>
                                        {offer.bank[0]}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="bold">{offer.bank}</Typography>
                                        <Typography variant="caption">{offer.type}</Typography>
                                    </Box>
                                </Box>

                                <Grid container spacing={2} mb={3}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary">Interest Rate</Typography>
                                        <Typography variant="h6" color="primary">{offer.rate}%</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary">Max Amount</Typography>
                                        <Typography variant="h6">{offer.amount}</Typography>
                                    </Grid>
                                </Grid>

                                <Button fullWidth variant="outlined" color="primary">
                                    View Details
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};
