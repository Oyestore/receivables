import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    Paper,
    Tabs,
    Tab,
    Container,
    CircularProgress,
    Fade,
    useTheme
} from '@mui/material';
import { Download, AccountBalanceWallet } from '@mui/icons-material';
import { paymentAPI } from '../../../config/api';
import { PaymentHistoryTable } from '../../../components/payments/PaymentHistoryTable';
import { Payment } from '../../../types/payment';

const PaymentHistory: React.FC = () => {
    const [tabValue, setTabValue] = React.useState(0);
    const theme = useTheme();

    const { data: payments = [], isLoading, isError } = useQuery<Payment[]>({
        queryKey: ['payments'],
        queryFn: async () => {
            const res = await paymentAPI.getPayments('defaultTenant');
            return res.data;
        },
    });

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress size={60} thickness={4} />
            </Box>
        );
    }

    if (isError) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="error" variant="h6">
                    Unable to load payment history. Please try again later.
                </Typography>
            </Box>
        );
    }

    // Filter payments based on tab
    // 0: All, 1: Incoming (Credit), 2: Refunds (Debit/Refund)
    const filteredPayments = React.useMemo(() => {
        if (tabValue === 0) return payments;
        if (tabValue === 1) return payments.filter(p => !p.status.includes('refund'));
        if (tabValue === 2) return payments.filter(p => p.status.includes('refund'));
        return payments;
    }, [payments, tabValue]);

    return (
        <Fade in timeout={800}>
            <Box
                sx={{
                    p: 4,
                    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                    minHeight: '100vh',
                }}
            >
                <Container maxWidth="xl">
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 4
                    }}>
                        <Box>
                            <Typography variant="h3" sx={{ fontWeight: 800, color: '#1a365d', mb: 1 }}>
                                Payment History
                            </Typography>
                            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                                Track all your incoming transactions and settlements
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<Download />}
                            sx={{
                                borderRadius: 2,
                                px: 4,
                                py: 1.5,
                                textTransform: 'none',
                                fontWeight: 600,
                                boxShadow: theme.shadows[4]
                            }}
                        >
                            Export Statement
                        </Button>
                    </Box>

                    {/* Summary Cards Row could go here */}

                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}
                    >
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 2, bgcolor: '#fff' }}>
                            <Tabs
                                value={tabValue}
                                onChange={handleTabChange}
                                sx={{
                                    '& .MuiTab-root': {
                                        fontWeight: 600,
                                        fontSize: '1rem',
                                        textTransform: 'none',
                                        minHeight: 60,
                                    }
                                }}
                            >
                                <Tab icon={<AccountBalanceWallet sx={{ fontSize: 20 }} />} iconPosition="start" label="All Transactions" />
                                <Tab label="Incoming" />
                                <Tab label="Refounded / Failed" />
                            </Tabs>
                        </Box>

                        <Box sx={{ p: 0 }}>
                            <PaymentHistoryTable payments={filteredPayments} />
                        </Box>
                    </Paper>
                </Container>
            </Box>
        </Fade>
    );
};

export default PaymentHistory;
