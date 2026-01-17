import React from 'react';
import { Card, CardContent, Typography, Box, IconButton, Chip } from '@mui/material';
import { Delete, CreditCard, AccountBalance, PhoneAndroid } from '@mui/icons-material';
import { PaymentMethod, PaymentMethodType } from '../../types/payment';

interface PaymentMethodCardProps {
    method: PaymentMethod;
    onDelete: (id: string) => void;
}

const getMethodIcon = (type: PaymentMethodType) => {
    switch (type) {
        case PaymentMethodType.CARD:
            return <CreditCard color="primary" sx={{ fontSize: 40 }} />;
        case PaymentMethodType.UPI:
            return <PhoneAndroid color="success" sx={{ fontSize: 40 }} />;
        case PaymentMethodType.BANK_TRANSFER:
            return <AccountBalance color="secondary" sx={{ fontSize: 40 }} />;
        default:
            return <CreditCard sx={{ fontSize: 40 }} />;
    }
};

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({ method, onDelete }) => {
    return (
        <Card
            sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                },
            }}
        >
            <Box sx={{ mr: 2 }}>{getMethodIcon(method.type)}</Box>
            <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" component="div">
                        {method.type === PaymentMethodType.CARD
                            ? `•••• ${method.last4}`
                            : method.type === PaymentMethodType.UPI
                                ? method.upiId
                                : method.bankName}
                    </Typography>
                    {method.isDefault && (
                        <Chip label="Default" size="small" color="primary" sx={{ height: 20, fontSize: '0.65rem' }} />
                    )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                    {method.type}
                </Typography>
            </Box>
            <IconButton aria-label="delete" onClick={() => onDelete(method.id)} color="error">
                <Delete />
            </IconButton>
        </Card>
    );
};
