import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    Grid,
    Paper,
    Container,
    Fade,
    Chip,
    Avatar,
    useTheme,
    CircularProgress
} from '@mui/material';
import { Add, TrendingUp, Assignment, MonetizationOn } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { financingAPI } from '../../../config/api';
import { FinancingOffer, LoanApplication } from '../../../types/financing';
import { FinancingOfferCard } from '../../../components/financing/FinancingOfferCard';

const FinancingDashboard: React.FC = () => {
    const navigate = useNavigate();
    const theme = useTheme();

    const { data: offers = [], isLoading: offersLoading } = useQuery<FinancingOffer[]>({
        queryKey: ['financingOffers'],
        queryFn: () => financingAPI.getOffers('defaultTenant').then((res) => res.data),
    });

    const { data: applications = [], isLoading: appsLoading } = useQuery<LoanApplication[]>({
        queryKey: ['financingApplications'],
        queryFn: () => financingAPI.getApplications('defaultTenant').then((res) => res.data),
    });

    const handleAcceptOffer = (id: string) => {
        // Logic to accept offer or verify details
        alert('Offer acceptance flow initiated. Funds typically disbursed within 2 hours.');
    };

    if (offersLoading || appsLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress size={60} thickness={4} />
            </Box>
        );
    }

    return (
        <Fade in timeout={800}>
            <Box
                sx={{
                    p: 4,
                    background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)',
                    minHeight: '100vh',
                }}
            >
                <Container maxWidth="xl">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 5 }}>
                        <Box>
                            <Typography variant="h3" sx={{ fontWeight: 800, color: '#1a365d', mb: 1 }}>
                                Financing & Capital
                            </Typography>
                            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                                Unlock working capital to grow your business
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<Add />}
                            onClick={() => navigate('/sme/financing/new')}
                            sx={{
                                borderRadius: 2,
                                px: 4,
                                py: 1.5,
                                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '1.1rem'
                            }}
                        >
                            New Application
                        </Button>
                    </Box>

                    {/* Quick Stats Row could be added here */}

                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center' }}>
                        <MonetizationOn sx={{ mr: 1, color: 'warning.main' }} />
                        Recommended Offers
                    </Typography>

                    <Grid container spacing={4} sx={{ mb: 6 }}>
                        {offers.length > 0 ? offers.map((offer) => (
                            <Grid item xs={12} md={6} lg={4} key={offer.id}>
                                <FinancingOfferCard offer={offer} onAccept={handleAcceptOffer} />
                            </Grid>
                        )) : (
                            <Grid item xs={12}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 6,
                                        textAlign: 'center',
                                        borderRadius: 3,
                                        bgcolor: 'rgba(255,255,255,0.6)',
                                        border: '1px dashed rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <Typography variant="h6" color="text.secondary">
                                        No pre-approved offers available at this moment.
                                    </Typography>
                                    <Button sx={{ mt: 2 }} onClick={() => navigate('/sme/credit-score')}>
                                        Check Credit Health
                                    </Button>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>

                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 4,
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        }}
                    >
                        <Box sx={{
                            p: 3,
                            bgcolor: '#fff',
                            borderBottom: '1px solid rgba(0,0,0,0.06)',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <Avatar sx={{ bgcolor: 'secondary.light', mr: 2 }}>
                                <Assignment />
                            </Avatar>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                Recent Applications
                            </Typography>
                        </Box>
                        {applications.length === 0 ? (
                            <Box sx={{ p: 6, textAlign: 'center', bgcolor: '#fafafa' }}>
                                <Typography color="text.secondary">You have no active or past applications.</Typography>
                            </Box>
                        ) : (
                            <Box>
                                {applications.map((app, index) => (
                                    <Box
                                        key={app.id}
                                        sx={{
                                            p: 3,
                                            borderBottom: index === applications.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: '#f9fafb' }
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                Application #{app.id.substring(0, 8)}...
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Submitted on {new Date(app.submittedAt).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                                ₹{app.totalAmount.toLocaleString()}
                                            </Typography>
                                            <Chip
                                                label={app.status}
                                                size="small"
                                                color={
                                                    app.status === 'APPROVED' ? 'success' :
                                                        app.status === 'REJECTED' ? 'error' : 'warning'
                                                }
                                                variant="filled"
                                                sx={{ mt: 0.5, fontWeight: 600 }}
                                            />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Paper>
                </Container>
            </Box>
        </Fade>
    );
};

export default FinancingDashboard;
