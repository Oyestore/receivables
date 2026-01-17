import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    Chip,
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import collectionApi from '../../services/collectionApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';

export default function CollectionList() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const { data: collections, isLoading } = useQuery({
        queryKey: ['collections', statusFilter],
        queryFn: () => collectionApi.getAll({ status: statusFilter || undefined }),
    });

    if (isLoading) {
        return <LoadingSpinner message="Loading collections..." />;
    }

    const filteredCollections = collections?.filter(collection =>
        collection.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        collection.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Collections
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage debt collection cases and recovery workflows
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/collections/create')}
                    sx={{ borderRadius: 2, px: 3, py: 1.5 }}
                >
                    New Collection
                </Button>
            </Box>

            {/* Filters */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <TextField
                        placeholder="Search by case number or customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{ flexGrow: 1 }}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                    />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            label="Status"
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="new">New</MenuItem>
                            <MenuItem value="in_progress">In Progress</MenuItem>
                            <MenuItem value="payment_plan">Payment Plan</MenuItem>
                            <MenuItem value="settled">Settled</MenuItem>
                            <MenuItem value="written_off">Written Off</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Case Number</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Original Amount</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Outstanding</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Strategy</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCollections.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                    <Typography color="text.secondary">
                                        No collection cases found
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCollections.map((collection) => (
                                <TableRow
                                    key={collection.id}
                                    sx={{
                                        '&:hover': {
                                            backgroundColor: 'background.default',
                                            cursor: 'pointer',
                                        },
                                    }}
                                    onClick={() => navigate(`/collections/${collection.id}`)}
                                >
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {collection.caseNumber}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{collection.customerName}</TableCell>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 600 }}>
                                            ₹{collection.originalAmount.toLocaleString()}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 700, color: 'error.main' }}>
                                            ₹{collection.outstandingAmount.toLocaleString()}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={collection.status} />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={collection.strategy.replace('_', ' ')}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {format(new Date(collection.createdAt), 'MMM dd, yyyy')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
