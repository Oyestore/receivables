import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    TextField,
    InputAdornment,
    CircularProgress,
} from '@mui/material';
import { Search, ChevronRight, FilterList, Refresh } from '@mui/icons-material';
import { JourneyStage, Invoice } from '../../types/invoice';
import { invoiceAPI } from '../../config/api';

// Helper functions for stage styling – same as InvoiceList
const getStageColor = (stage: JourneyStage): 'default' | 'primary' | 'info' | 'warning' | 'error' | 'success' => {
    switch (stage) {
        case JourneyStage.CREATED:
            return 'default';
        case JourneyStage.SENT:
        case JourneyStage.VIEWED:
            return 'info';
        case JourneyStage.ACCEPTED:
        case JourneyStage.PAID:
            return 'success';
        case JourneyStage.PENDING:
        case JourneyStage.DUE_SOON:
            return 'warning';
        case JourneyStage.OVERDUE:
        case JourneyStage.CHASING:
        case JourneyStage.CRITICAL:
            return 'error';
        default:
            return 'default';
    }
};

const getStageLabel = (stage: JourneyStage): string => {
    return stage.split('_').slice(1).join(' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const CollectionsAutopilot: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = React.useState('');

    // Fetch all invoices using v5 object syntax
    const { data: invoices = [], isLoading, isError } = useQuery<Invoice[]>({
        queryKey: ['invoices'],
        queryFn: () => invoiceAPI.getInvoices('defaultTenant').then((res) => res.data),
    });

    // Mutation to refresh journey for a specific invoice using v5 object syntax
    const refreshMutation = useMutation({
        mutationFn: (invoiceId: string) => invoiceAPI.refreshJourney('defaultTenant', invoiceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
    });

    const filteredInvoices = invoices.filter((inv) => {
        const term = searchTerm.toLowerCase();
        return (
            inv.customerName?.toLowerCase().includes(term) || inv.id?.toLowerCase().includes(term)
        );
    });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (isError) {
        return (
            <Typography color="error" sx={{ mt: 4, textAlign: 'center' }}>
                Failed to load invoices. Please try again later.
            </Typography>
        );
    }

    const handleRowClick = (id: string) => {
        navigate(`/sme/invoices/${id}`);
    };

    const handleRefresh = (id: string) => {
        refreshMutation.mutate(id);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    Collections Autopilot
                </Typography>
                <Box>
                    <TextField
                        size="small"
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ mr: 2, bgcolor: 'background.paper' }}
                    />
                    <IconButton>
                        <FilterList />
                    </IconButton>
                </Box>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Invoice ID</TableCell>
                            <TableCell>Customer</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>Due Date</TableCell>
                            <TableCell>Journey Stage</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredInvoices.map((invoice: Invoice) => (
                            <TableRow
                                key={invoice.id}
                                hover
                                onClick={() => handleRowClick(invoice.id)}
                                sx={{ cursor: 'pointer', bgcolor: invoice.isStuck ? '#fff5f5' : 'inherit' }}
                            >
                                <TableCell sx={{ fontWeight: 'medium' }}>{invoice.id}</TableCell>
                                <TableCell>{invoice.customerName}</TableCell>
                                <TableCell>₹{invoice.grandTotal?.toLocaleString()}</TableCell>
                                <TableCell>{invoice.dueDate}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={getStageLabel(invoice.journeyStage)}
                                        color={getStageColor(invoice.journeyStage)}
                                        size="small"
                                        variant="outlined"
                                    />
                                    {invoice.isStuck && (
                                        <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                                            ⚠️ Stuck
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleRefresh(invoice.id)}
                                        disabled={refreshMutation.isPending} // Updated to isPending
                                        title="Refresh Journey"
                                    >
                                        <Refresh />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => handleRowClick(invoice.id)}>
                                        <ChevronRight />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default CollectionsAutopilot;
