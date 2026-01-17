import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Paper,
    Button,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Stack,
    Chip,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Payment as PaymentIcon,
    Handshake as SettlementIcon,
    Cancel as WriteOffIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useState } from 'react';
import collectionApi from '../../services/collectionApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';

export default function CollectionDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);

    const { data: collection, isLoading } = useQuery({
        queryKey: ['collection', id],
        queryFn: () => collectionApi.getById(id!, 'tenant1'),
        enabled: !!id,
    });

    const recordPaymentMutation = useMutation({
        mutationFn: (amount: number) => collectionApi.recordPayment(id!, {
            tenantId: 'tenant1',
            amount,
            paymentMethod: 'bank_transfer',
            recordedBy: 'user1',
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collection', id] });
            setPaymentDialogOpen(false);
            setPaymentAmount(0);
        },
    });

    if (isLoading) {
        return <LoadingSpinner message="Loading collection details..." />;
    }

    if (!collection) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="error">
                    Collection case not found
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Button
                    startIcon={<BackIcon />}
                    onClick={() => navigate('/collections')}
                    sx={{ mb: 2 }}
                >
                    Back to Collections
                </Button>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            {collection.caseNumber}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <StatusBadge status={collection.status} size="medium" />
                            <Typography variant="body2" color="text.secondary">
                                Created {format(new Date(collection.createdAt), 'MMM dd, yyyy')}
                            </Typography>
                        </Stack>
                    </Box>

                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="contained"
                            startIcon={<PaymentIcon />}
                            onClick={() => setPaymentDialogOpen(true)}
                        >
                            Record Payment
                        </Button>
                        <Button variant="outlined" startIcon={<SettlementIcon />}>
                            Propose Settlement
                        </Button>
                    </Stack>
                </Box>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">
                                Original Amount
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                                ₹{collection.originalAmount.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">
                                Outstanding
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main', mt: 1 }}>
                                ₹{collection.outstandingAmount.toLocaleString()}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">
                                Recovery Rate
                            </Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main', mt: 1 }}>
                                {((1 - collection.outstandingAmount / collection.originalAmount) * 100).toFixed(1)}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Details & Payment History */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                            Case Details
                        </Typography>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Customer</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {collection.customerName}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Invoice ID</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                    {collection.invoiceId}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Strategy</Typography>
                                <Chip
                                    label={collection.strategy.replace('_', ' ')}
                                    size="small"
                                    sx={{ mt: 0.5 }}
                                />
                            </Box>
                            {collection.disputeId && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Related Dispute</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {collection.disputeId}
                                    </Typography>
                                </Box>
                            )}
                        </Stack>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                            Payment History
                        </Typography>
                        {collection.paymentHistory && collection.paymentHistory.length > 0 ? (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Amount</TableCell>
                                            <TableCell>Method</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {collection.paymentHistory.map((payment, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    {format(new Date(payment.date), 'MMM dd, yyyy')}
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 600 }}>
                                                    ₹{payment.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell>{payment.paymentMethod}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                                No payments recorded yet
                            </Typography>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Payment Dialog */}
            <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Payment Amount (₹)"
                        type="number"
                        fullWidth
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        sx={{ mt: 2 }}
                        helperText={`Outstanding: ₹${collection.outstandingAmount.toLocaleString()}`}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => recordPaymentMutation.mutate(paymentAmount)}
                        disabled={paymentAmount <= 0 || recordPaymentMutation.isPending}
                    >
                        {recordPaymentMutation.isPending ? 'Recording...' : 'Record'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
