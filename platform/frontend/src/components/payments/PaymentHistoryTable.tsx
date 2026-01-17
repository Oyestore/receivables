import React from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Box,
    Typography,
} from '@mui/material';
import { Payment, PaymentStatus } from '../../types/payment';
import { Warning, CheckCircle, Error, Replay } from '@mui/icons-material';

interface PaymentHistoryTableProps {
    payments: Payment[];
}

const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
        case PaymentStatus.COMPLETED:
            return 'success';
        case PaymentStatus.PENDING:
            return 'warning';
        case PaymentStatus.FAILED:
            return 'error';
        case PaymentStatus.REFUNDED:
            return 'default';
        default:
            return 'default';
    }
};

const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
        case PaymentStatus.COMPLETED:
            return <CheckCircle fontSize="small" />;
        case PaymentStatus.PENDING:
            return <Warning fontSize="small" />;
        case PaymentStatus.FAILED:
            return <Error fontSize="small" />;
        case PaymentStatus.REFUNDED:
            return <Replay fontSize="small" />;
        default:
            return null;
    }
};

export const PaymentHistoryTable: React.FC<PaymentHistoryTableProps> = ({ payments }) => {
    if (payments.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <Typography>No transactions found.</Typography>
            </Box>
        );
    }

    return (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
            <Table sx={{ minWidth: 650 }} aria-label="payment history table">
                <TableHead sx={{ bgcolor: '#f9fafb' }}>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Transaction ID</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {payments.map((payment) => (
                        <TableRow
                            key={payment.id}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: '#f5f5f5' } }}
                        >
                            <TableCell component="th" scope="row">
                                {new Date(payment.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{payment.customerName}</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>
                                {payment.currency} {payment.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>{payment.method}</TableCell>
                            <TableCell>
                                <Chip
                                    icon={getStatusIcon(payment.status) as any}
                                    label={payment.status}
                                    color={getStatusColor(payment.status) as any}
                                    size="small"
                                    variant="outlined"
                                />
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{payment.id}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
