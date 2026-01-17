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
    Chip,
    IconButton,
    Stack,
} from '@mui/material';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Visibility as ViewIcon,
    FilterList as FilterIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import disputeApi from '../../services/disputeApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';

export default function DisputeList() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');

    const { data: disputes, isLoading } = useQuery({
        queryKey: ['disputes', statusFilter, priorityFilter],
        queryFn: () => disputeApi.getAll({
            status: statusFilter || undefined,
            priority: priorityFilter || undefined,
        }),
    });

    if (isLoading) {
        return <LoadingSpinner message="Loading disputes..." />;
    }

    const filteredDisputes = disputes?.filter(dispute =>
        dispute.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dispute.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Disputes
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage and track all dispute cases
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/disputes/create')}
                    sx={{ borderRadius: 2, px: 3, py: 1.5 }}
                >
                    Create Dispute
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
                            <MenuItem value="draft">Draft</MenuItem>
                            <MenuItem value="filed">Filed</MenuItem>
                            <MenuItem value="under_review">Under Review</MenuItem>
                            <MenuItem value="resolved">Resolved</MenuItem>
                            <MenuItem value="closed">Closed</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Priority</InputLabel>
                        <Select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            label="Priority"
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="low">Low</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="high">High</MenuItem>
                            <MenuItem value="urgent">Urgent</MenuItem>
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
                            <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredDisputes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                    <Typography color="text.secondary">
                                        No disputes found
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDisputes.map((dispute) => (
                                <TableRow
                                    key={dispute.id}
                                    sx={{
                                        '&:hover': {
                                            backgroundColor: 'background.default',
                                            cursor: 'pointer',
                                        },
                                    }}
                                    onClick={() => navigate(`/disputes/${dispute.id}`)}
                                >
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {dispute.caseNumber}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{dispute.customerName}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={dispute.type.replace('_', ' ')}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 600 }}>
                                            ₹{dispute.disputedAmount.toLocaleString()}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={dispute.status} />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={dispute.priority}
                                            size="small"
                                            color={
                                                dispute.priority === 'urgent' ? 'error' :
                                                    dispute.priority === 'high' ? 'warning' :
                                                        dispute.priority === 'medium' ? 'info' : 'default'
                                            }
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {format(new Date(dispute.createdAt), 'MMM dd, yyyy')}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/disputes/${dispute.id}`);
                                            }}
                                        >
                                            <ViewIcon />
                                        </IconButton>
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
