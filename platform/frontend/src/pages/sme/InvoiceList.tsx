import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Search, ChevronRight, FilterList } from '@mui/icons-material';
import { JourneyStage, Invoice } from '../../types/invoice';
import { invoiceAPI } from '../../config/api';
import { Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { CreateInvoiceModal } from '../../components/sme/CreateInvoiceModal';

// Helper functions for stage styling
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

const InvoiceList: React.FC = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = React.useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

    const { data: invoices = [], isLoading, isError } = useQuery({
        queryKey: ['invoices'],
        queryFn: () => invoiceAPI.getInvoices('defaultTenant').then((res) => res.data)
    });

    const filteredInvoices = invoices.filter((inv: Invoice) => {
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

    return (
        <Box
            sx={{
                p: 3,
                background: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)',
                minHeight: '100vh',
                borderRadius: 2,
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    Invoices
                </Typography>
                <Box display="flex" alignItems="center">
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
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => setIsCreateModalOpen(true)}
                        sx={{ mr: 1 }}
                    >
                        Create Invoice
                    </Button>
                    <IconButton>
                        <FilterList />
                    </IconButton>
                </Box>
            </Box>

            {/* Integrated Module 13 Modal */}
            <CreateInvoiceModal
                visible={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                onCreate={async (values) => {
                    try {
                        console.log('Creating Invoice:', values);
                        await invoiceAPI.createInvoice('defaultTenant', values);
                        // Refresh list
                        // In a real app, use queryClient.invalidateQueries(['invoices'])
                        setIsCreateModalOpen(false);
                        window.location.reload(); // Simple reload for now
                    } catch (error) {
                        console.error('Failed to create invoice:', error);
                        alert('Failed to create invoice');
                    }
                }}
            />

            <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ backgroundColor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white' }}>Invoice ID</TableCell>
                            <TableCell sx={{ color: 'white' }}>Customer</TableCell>
                            <TableCell sx={{ color: 'white' }}>Amount</TableCell>
                            <TableCell sx={{ color: 'white' }}>Due Date</TableCell>
                            <TableCell sx={{ color: 'white' }}>Journey Stage</TableCell>
                            <TableCell align="right" sx={{ color: 'white' }}>Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredInvoices.map((invoice: Invoice) => (
                            <TableRow
                                key={invoice.id}
                                hover
                                onClick={() => handleRowClick(invoice.id)}
                                sx={{
                                    cursor: 'pointer',
                                    bgcolor: invoice.isStuck ? '#fff5f5' : 'inherit',
                                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                                }}
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
                                <TableCell align="right">
                                    <IconButton size="small">
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

export default InvoiceList;
