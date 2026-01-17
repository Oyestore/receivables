import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Tabs,
    Tab,
} from '@mui/material';
import {
    CheckCircle as ApproveIcon,
    Cancel as RejectIcon,
    Visibility as ViewIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index } = props;
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
        </div>
    );
}

// Mock data - in production, this would come from an API
const mockApprovals = [
    {
        id: '1',
        disputeId: 'dis-001',
        caseNumber: 'DIS-123456',
        customerName: 'ACME Corp',
        amount: 150000,
        type: 'Dispute Approval',
        level: 'L2',
        requestedBy: 'John Doe',
        requestedAt: new Date('2024-12-20'),
        status: 'pending',
    },
    {
        id: '2',
        disputeId: 'dis-002',
        caseNumber: 'DIS-123457',
        customerName: 'Tech Solutions Ltd',
        amount: 85000,
        type: 'Settlement Approval',
        level: 'L1',
        requestedBy: 'Jane Smith',
        requestedAt: new Date('2024-12-21'),
        status: 'pending',
    },
];

export default function ApprovalQueue() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState(0);
    const [selectedApproval, setSelectedApproval] = useState<any>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<'approve' | 'reject'>('approve');
    const [notes, setNotes] = useState('');

    // In production, replace with actual API call
    const { data: approvals, isLoading } = useQuery({
        queryKey: ['approvals', activeTab],
        queryFn: async () => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            return mockApprovals.filter(a =>
                activeTab === 0 ? a.status === 'pending' : a.status !== 'pending'
            );
        },
    });

    const approveMutation = useMutation({
        mutationFn: async (data: { id: string; notes: string }) => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            setDialogOpen(false);
            setNotes('');
        },
    });

    const rejectMutation = useMutation({
        mutationFn: async (data: { id: string; notes: string }) => {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            setDialogOpen(false);
            setNotes('');
        },
    });

    const handleApprove = (approval: any) => {
        setSelectedApproval(approval);
        setDialogType('approve');
        setDialogOpen(true);
    };

    const handleReject = (approval: any) => {
        setSelectedApproval(approval);
        setDialogType('reject');
        setDialogOpen(true);
    };

    const handleSubmit = () => {
        if (!selectedApproval) return;

        const mutation = dialogType === 'approve' ? approveMutation : rejectMutation;
        mutation.mutate({
            id: selectedApproval.id,
            notes,
        });
    };

    if (isLoading) {
        return <LoadingSpinner message="Loading approval queue..." />;
    }

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    Approval Queue
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Review and approve pending dispute and settlement requests
                </Typography>
            </Box>

            {/* Summary Cards */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Paper sx={{ p: 2, flexGrow: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Pending Approvals
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main', mt: 1 }}>
                        {mockApprovals.filter(a => a.status === 'pending').length}
                    </Typography>
                </Paper>
                <Paper sx={{ p: 2, flexGrow: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Total Amount
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                        ₹{mockApprovals
                            .filter(a => a.status === 'pending')
                            .reduce((sum, a) => sum + a.amount, 0)
                            .toLocaleString()}
                    </Typography>
                </Paper>
            </Stack>

            {/* Tabs */}
            <Paper>
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Pending" />
                    <Tab label="History" />
                </Tabs>

                <TabPanel value={activeTab} index={0}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 600 }}>Case Number</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Level</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Requested By</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Requested</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(!approvals || approvals.length === 0) ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                                            <Typography color="text.secondary">
                                                No pending approvals
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    approvals.map((approval) => (
                                        <TableRow
                                            key={approval.id}
                                            sx={{
                                                '&:hover': {
                                                    backgroundColor: 'background.default',
                                                },
                                            }}
                                        >
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {approval.caseNumber}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{approval.customerName}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={approval.type}
                                                    size="small"
                                                    color="info"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography sx={{ fontWeight: 600 }}>
                                                    ₹{approval.amount.toLocaleString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={approval.level}
                                                    size="small"
                                                    color={approval.level === 'L3' ? 'error' : 'warning'}
                                                />
                                            </TableCell>
                                            <TableCell>{approval.requestedBy}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {format(new Date(approval.requestedAt), 'MMM dd, yyyy')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                    <Button
                                                        size="small"
                                                        startIcon={<ViewIcon />}
                                                        onClick={() => navigate(`/disputes/${approval.disputeId}`)}
                                                    >
                                                        View
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="success"
                                                        startIcon={<ApproveIcon />}
                                                        onClick={() => handleApprove(approval)}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        startIcon={<RejectIcon />}
                                                        onClick={() => handleReject(approval)}
                                                    >
                                                        Reject
                                                    </Button>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </TabPanel>

                <TabPanel value={activeTab} index={1}>
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography color="text.secondary">
                            Approval history coming soon...
                        </Typography>
                    </Box>
                </TabPanel>
            </Paper>

            {/* Approval/Reject Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {dialogType === 'approve' ? 'Approve Request' : 'Reject Request'}
                </DialogTitle>
                <DialogContent>
                    {selectedApproval && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Case: <strong>{selectedApproval.caseNumber}</strong>
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Customer: <strong>{selectedApproval.customerName}</strong>
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Amount: <strong>₹{selectedApproval.amount.toLocaleString()}</strong>
                            </Typography>
                        </Box>
                    )}
                    <TextField
                        label="Notes (Optional)"
                        multiline
                        rows={4}
                        fullWidth
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any comments or reasons..."
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={dialogType === 'approve' ? 'success' : 'error'}
                        onClick={handleSubmit}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                        {approveMutation.isPending || rejectMutation.isPending
                            ? 'Processing...'
                            : dialogType === 'approve'
                                ? 'Approve'
                                : 'Reject'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
