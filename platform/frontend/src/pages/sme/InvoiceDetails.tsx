import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, CircularProgress, IconButton, Divider } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { Invoice } from '../../types/invoice';
import { invoiceAPI } from '../../config/api';
import { InvoiceJourneyTracker } from '../../components/InvoiceJourneyTracker';

const InvoiceDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: invoice, isLoading, isError } = useQuery<Invoice>({
        queryKey: ['invoice', id],
        queryFn: () => invoiceAPI.getInvoiceById('defaultTenant', id!).then((res) => res.data)
    });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (isError || !invoice) {
        return (
            <Typography color="error" sx={{ mt: 4, textAlign: 'center' }}>
                Failed to load invoice details. Please try again later.
            </Typography>
        );
    }

    return (
        <Box
            sx={{
                p: 3,
                background: 'linear-gradient(135deg, #e0eafc, #cfdef3)',
                minHeight: '100vh',
                borderRadius: 2,
            }}
        >
            <IconButton onClick={() => navigate(-1)} sx={{ mb: 2 }}>
                <ArrowBack />
            </IconButton>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Invoice {invoice.id}
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Customer:</strong> {invoice.customerName}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Amount:</strong> ₹{invoice.grandTotal?.toLocaleString()}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Issue Date:</strong> {invoice.issueDate}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Due Date:</strong> {invoice.dueDate}
                </Typography>
                <Box sx={{ mt: 3 }}>
                    <InvoiceJourneyTracker invoice={invoice} />
                </Box>
            </Paper>
        </Box>
    );
};

export default InvoiceDetails;
