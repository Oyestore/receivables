import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Paper, Grid, List, ListItem, ListItemIcon, ListItemText, Divider, Alert } from '@mui/material';
import { TrendingUp, TrendingDown, Info } from '@mui/icons-material';
import { creditAPI } from '../../../config/api';
import { CreditScore } from '../../../types/credit';
import { CreditScoreGauge } from '../../../components/credit/CreditScoreGauge';

const CreditProfile: React.FC = () => {
    const { data: creditScore, isLoading, isError } = useQuery<CreditScore>({
        queryKey: ['creditScore'],
        queryFn: () => creditAPI.getCreditProfile('defaultTenant').then((res) => res.data),
    });

    if (isLoading) return <Typography>Loading credit profile...</Typography>;
    if (isError) return <Typography color="error">Failed to load credit profile.</Typography>;

    if (!creditScore) return <Typography>No credit data available.</Typography>;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4 }}>Credit Health</Typography>

            <Grid container spacing={4}>
                {/* Visual Gauge */}
                <Grid item xs={12} md={5} lg={4}>
                    <Paper sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CreditScoreGauge creditScore={creditScore} />
                    </Paper>
                </Grid>

                {/* Factors List */}
                <Grid item xs={12} md={7} lg={8}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>Factors Affecting Your Score</Typography>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Paying invoices on time and maintaining low credit utilization helps improve your score.
                        </Alert>
                        <List>
                            {creditScore.factors.map((factor, index) => (
                                <React.Fragment key={index}>
                                    <ListItem alignItems="flex-start">
                                        <ListItemIcon>
                                            {factor.impact === 'POSITIVE' ?
                                                <TrendingUp color="success" /> :
                                                <TrendingDown color="error" />
                                            }
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={factor.name}
                                            secondary={factor.description}
                                            primaryTypographyProps={{ fontWeight: 'medium' }}
                                        />
                                    </ListItem>
                                    {index < creditScore.factors.length - 1 && <Divider component="li" />}
                                </React.Fragment>
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default CreditProfile;
