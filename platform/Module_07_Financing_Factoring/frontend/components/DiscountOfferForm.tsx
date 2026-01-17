import React, { useState } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    TextField,
    Button,
    Typography,
    Box,
    Grid,
    Alert,
    CircularProgress,
    InputAdornment
} from '@mui/material';
import { LocalOffer as DiscountIcon } from '@mui/icons-material';

interface DiscountOfferFormProps {
    invoiceId: string;
    invoiceAmount: number;
    onOfferCreated?: (offer: any) => void;
}

export const DiscountOfferForm: React.FC<DiscountOfferFormProps> = ({
    invoiceId,
    invoiceAmount,
    onOfferCreated
}) => {
    const [apr, setApr] = useState<number>(12);
    const [expiryDays, setExpiryDays] = useState<number>(7);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Calculate discounted amount
    const calculateDiscount = () => {
        const dailyRate = apr / 365 / 100;
        const paymentDays = 30; // Assume invoice due in 30 days
        const earlyPaymentDays = 5; // Assume early payment in 5 days
        const daysEarly = paymentDays - earlyPaymentDays;

        const discountAmount = invoiceAmount * dailyRate * daysEarly;
        const discountedAmount = invoiceAmount - discountAmount;

        return {
            discountAmount: discountAmount.toFixed(2),
            discountedAmount: discountedAmount.toFixed(2),
            discountPercentage: ((discountAmount / invoiceAmount) * 100).toFixed(2)
        };
    };

    const discount = calculateDiscount();

    const handleCreateOffer = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/v1/discounts/offers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    invoiceId,
                    apr,
                    expiryDays
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create discount offer');
            }

            const data = await response.json();
            setSuccess(true);

            if (onOfferCreated) {
                onOfferCreated(data);
            }

            // Reset form after 2 seconds
            setTimeout(() => {
                setSuccess(false);
                setApr(12);
                setExpiryDays(7);
            }, 2000);

        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card elevation={3}>
            <CardHeader
                avatar={<DiscountIcon color="primary" />}
                title="Create Early Payment Discount"
                subheader={`Invoice #${invoiceId}`}
            />
            <CardContent>
                <Grid container spacing={3}>
                    {/* APR Input */}
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Annual Percentage Rate (APR)"
                            type="number"
                            value={apr}
                            onChange={(e) => setApr(Number(e.target.value))}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">%</InputAdornment>
                            }}
                            helperText="Typical range: 6% - 18%"
                            disabled={loading}
                        />
                    </Grid>

                    {/* Expiry Days */}
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Offer Expires In"
                            type="number"
                            value={expiryDays}
                            onChange={(e) => setExpiryDays(Number(e.target.value))}
                            InputProps={{
                                endAdornment: <InputAdornment position="end">days</InputAdornment>
                            }}
                            helperText="How long the offer is valid"
                            disabled={loading}
                        />
                    </Grid>

                    {/* Discount Calculation Display */}
                    <Grid item xs={12}>
                        <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="h6" gutterBottom color="primary">
                                Discount Calculation
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="textSecondary">
                                        Original Amount:
                                    </Typography>
                                    <Typography variant="h6">
                                        ₹{invoiceAmount.toLocaleString()}
                                    </Typography>
                                </Grid>

                                <Grid item xs={6}>
                                    <Typography variant="body2" color="textSecondary">
                                        Discount ({discount.discountPercentage}%):
                                    </Typography>
                                    <Typography variant="h6" color="success.main">
                                        -₹{Number(discount.discountAmount).toLocaleString()}
                                    </Typography>
                                </Grid>

                                <Grid item xs={12}>
                                    <Box sx={{ bgcolor: 'primary.light', p: 2, borderRadius: 1, mt: 1 }}>
                                        <Typography variant="body2" color="primary.dark">
                                            Discounted Amount (if paid early):
                                        </Typography>
                                        <Typography variant="h4" color="primary.dark">
                                            ₹{Number(discount.discountedAmount).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    </Grid>

                    {/* Error/Success Messages */}
                    {error && (
                        <Grid item xs={12}>
                            <Alert severity="error" onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        </Grid>
                    )}

                    {success && (
                        <Grid item xs={12}>
                            <Alert severity="success">
                                Discount offer created successfully! Buyer will be notified.
                            </Alert>
                        </Grid>
                    )}

                    {/* Action Button */}
                    <Grid item xs={12}>
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={handleCreateOffer}
                            disabled={loading || success}
                            startIcon={loading ? <CircularProgress size={20} /> : <DiscountIcon />}
                        >
                            {loading ? 'Creating Offer...' : 'Create Discount Offer'}
                        </Button>
                    </Grid>

                    {/* Info Text */}
                    <Grid item xs={12}>
                        <Typography variant="caption" color="textSecondary" display="block">
                            💡 Early payment discounts incentivize buyers to pay faster, improving your cash flow.
                            The buyer receives a discount for paying before the due date.
                        </Typography>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export default DiscountOfferForm;
