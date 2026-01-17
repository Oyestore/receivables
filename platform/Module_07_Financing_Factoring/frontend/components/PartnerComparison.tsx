import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Grid,
    Button,
    Chip,
    Paper,
    LinearProgress,
    Avatar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    CheckCircle as CheckIcon,
    AccessTime as TimeIcon,
    AccountBalance as BankIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface Partner {
    partnerId: string;
    partnerName: string;
    logoUrl: string;
    approvalRate: string;
    estimatedRate: string;
    processingFee: string;
    estimatedNetAmount: string;
    turnaroundDays: number;
    totalFunded: number;
}

interface PartnerComparisonProps {
    requestedAmount: number;
    onSelectPartner: (partnerId: string) => void;
}

export const PartnerComparison: React.FC<PartnerComparisonProps> = ({
    requestedAmount,
    onSelectPartner,
}) => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPartner, setSelectedPartner] = useState<string | null>(null);

    useEffect(() => {
        loadPartners();
    }, [requestedAmount]);

    const loadPartners = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/v1/financing/partners/compare/${requestedAmount}`);
            setPartners(response.data);
        } catch (error) {
            console.error('Failed to load partners:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPartner = (partnerId: string) => {
        setSelectedPartner(partnerId);
        onSelectPartner(partnerId);
    };

    const formatCurrency = (amount: string | number) => {
        return `₹${parseFloat(amount.toString()).toLocaleString('en-IN')}`;
    };

    return (
        <Box>
            <Typography variant="h5" sx={{ mb: 3 }}>
                Compare Financing Partners
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
                <Typography variant="body1" fontWeight="bold">
                    Requested Amount: {formatCurrency(requestedAmount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {partners.length} partner(s) available for this amount
                </Typography>
            </Paper>

            {loading ? (
                <LinearProgress />
            ) : partners.length === 0 ? (
                <Card>
                    <CardContent>
                        <Typography variant="body1" color="text.secondary" textAlign="center">
                            No partners available for the requested amount
                        </Typography>
                    </CardContent>
                </Card>
            ) : (
                <Grid container spacing={3}>
                    {partners.map((partner) => (
                        <Grid item xs={12} md={6} lg={4} key={partner.partnerId}>
                            <Card
                                variant="outlined"
                                sx={{
                                    borderColor: selectedPartner === partner.partnerId ? 'primary.main' : 'divider',
                                    borderWidth: selectedPartner === partner.partnerId ? 2 : 1,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        boxShadow: 3,
                                    },
                                }}
                                onClick={() => handleSelectPartner(partner.partnerId)}
                            >
                                <CardHeader
                                    avatar={
                                        partner.logoUrl ? (
                                            <Avatar src={partner.logoUrl} />
                                        ) : (
                                            <Avatar>
                                                <BankIcon />
                                            </Avatar>
                                        )
                                    }
                                    title={partner.partnerName}
                                    action={
                                        selectedPartner === partner.partnerId && (
                                            <CheckIcon color="primary" />
                                        )
                                    }
                                />
                                <CardContent>
                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="h4" color="success.main" fontWeight="bold">
                                            {formatCurrency(partner.estimatedNetAmount)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Net Amount (After Fees)
                                        </Typography>
                                    </Box>

                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                        <Grid item xs={6}>
                                            <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    Discount Rate
                                                </Typography>
                                                <Typography variant="h6" fontWeight="bold">
                                                    {partner.estimatedRate}%
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    Processing Fee
                                                </Typography>
                                                <Typography variant="h6" fontWeight="bold">
                                                    {formatCurrency(partner.processingFee)}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    </Grid>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <TrendingUpIcon fontSize="small" color="success" />
                                            <Typography variant="body2">
                                                Approval Rate: {partner.approvalRate}%
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <TimeIcon fontSize="small" color="action" />
                                            <Typography variant="body2">
                                                {partner.turnaroundDays} days
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Typography variant="caption" color="text.secondary">
                                        Total Funded: {formatCurrency(partner.totalFunded)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {selectedPartner && (
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => onSelectPartner(selectedPartner)}
                    >
                        Continue with Selected Partner
                    </Button>
                </Box>
            )}
        </Box>
    );
};
