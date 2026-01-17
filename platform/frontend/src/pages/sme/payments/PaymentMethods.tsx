import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Typography, Button, Grid, Alert, Paper } from '@mui/material';
import { Add } from '@mui/icons-material';
import { paymentAPI } from '../../../config/api';
import { PaymentMethodCard } from '../../../components/payments/PaymentMethodCard';
import { PaymentMethod } from '../../../types/payment';

const PaymentMethods: React.FC = () => {
    const queryClient = useQueryClient();

    const { data: methods = [], isLoading, isError } = useQuery<PaymentMethod[]>({
        queryKey: ['paymentMethods'],
        queryFn: () => paymentAPI.getPaymentMethods('defaultTenant').then((res) => res.data),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => paymentAPI.deletePaymentMethod('defaultTenant', id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
        },
    });

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to remove this payment method?')) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) return <Typography>Loading payment methods...</Typography>;
    if (isError) return <Typography color="error">Failed to load payment methods.</Typography>;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    Payment Methods
                </Typography>
                <Button variant="contained" startIcon={<Add />}>
                    Add New Method
                </Button>
            </Box>

            {/* Alert for user education */}
            <Alert severity="info" sx={{ mb: 4 }}>
                Default payment methods are used for auto-debit of subscription fees.
            </Alert>

            <Grid container spacing={3}>
                {methods.map((method) => (
                    <Grid item xs={12} md={6} lg={4} key={method.id}>
                        <PaymentMethodCard method={method} onDelete={handleDelete} />
                    </Grid>
                ))}
                {methods.length === 0 && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">No payment methods saved.</Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>
        </Box>
    );
};

export default PaymentMethods; // Ensure default export
