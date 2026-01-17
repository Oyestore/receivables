import React, { useState } from 'react';
import {
    Box,
    Toolbar,
    Checkbox,
    Button,
    Typography,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    LinearProgress,
    Alert,
    IconButton,
    Chip,
} from '@mui/material';
import {
    Delete,
    Send,
    Archive,
    MoreVert,
    Close,
    CheckCircle,
    Error as ErrorIcon,
} from '@mui/icons-material';

interface Props {
    selectedIds: string[];
    totalCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onBulkAction: (action: string) => void;
}

interface BulkOperationStatus {
    id: string;
    status: 'processing' | 'completed' | 'failed';
    total_items: number;
    processed_items: number;
    success_count: number;
    failure_count: number;
    errors?: Array<{ invoice_id: string; error: string }>;
}

export const BulkActionToolbar: React.FC<Props> = ({
    selectedIds,
    totalCount,
    onSelectAll,
    onDeselectAll,
    onBulkAction,
}) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [progressDialogOpen, setProgressDialogOpen] = useState(false);
    const [operation, setOperation] = useState<BulkOperationStatus | null>(null);

    const handleAction = async (action: string) => {
        setAnchorEl(null);

        // Queue bulk operation
        const response = await fetch('/api/v1/bulk-operations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation_type: action,
                parameters: { invoice_ids: selectedIds },
            }),
        });

        const operationData = await response.json();
        setOperation(operationData);
        setProgressDialogOpen(true);

        // Poll for progress
        pollOperationStatus(operationData.id);
    };

    const pollOperationStatus = async (operationId: string) => {
        const interval = setInterval(async () => {
            const response = await fetch(`/api/v1/bulk-operations/${operationId}`);
            const data = await response.json();
            setOperation(data);

            if (data.status === 'completed' || data.status === 'failed') {
                clearInterval(interval);
            }
        }, 1000);
    };

    const progress = operation
        ? (operation.processed_items / operation.total_items) * 100
        : 0;

    return (
        <>
            <Toolbar
                sx={{
                    pl: { sm: 2 },
                    pr: { xs: 1, sm: 1 },
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                    borderRadius: 1,
                    mb: 2,
                }}
            >
                <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < totalCount}
                    checked={selectedIds.length === totalCount && totalCount > 0}
                    onChange={(e) => (e.target.checked ? onSelectAll() : onDeselectAll())}
                />
                <Typography sx={{ flex: '1 1 100%' }} variant="h6">
                    {selectedIds.length} selected
                </Typography>

                {selectedIds.length > 0 && (
                    <Box display="flex" gap={1}>
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<Send />}
                            onClick={() => handleAction('bulk_send')}
                        >
                            Send
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Delete />}
                            onClick={() => handleAction('bulk_delete')}
                            sx={{ borderColor: 'white', color: 'white' }}
                        >
                            Delete
                        </Button>
                        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
                            <MoreVert />
                        </IconButton>
                    </Box>
                )}
            </Toolbar>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem onClick={() => handleAction('bulk_archive')}>
                    <Archive sx={{ mr: 1 }} /> Archive
                </MenuItem>
                <MenuItem onClick={() => handleAction('bulk_export')}>
                    Export Selected
                </MenuItem>
            </Menu>

            {/* Progress Dialog */}
            <Dialog
                open={progressDialogOpen}
                onClose={() => setProgressDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        Bulk Operation in Progress
                        <IconButton onClick={() => setProgressDialogOpen(false)}>
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {operation && (
                        <>
                            <Box mb={2}>
                                <LinearProgress variant="determinate" value={progress} />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                    {operation.processed_items} / {operation.total_items} items processed
                                </Typography>
                            </Box>

                            <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} mb={2}>
                                <Chip
                                    icon={<CheckCircle />}
                                    label={`Success: ${operation.success_count}`}
                                    color="success"
                                    variant="outlined"
                                />
                                <Chip
                                    icon={<ErrorIcon />}
                                    label={`Failed: ${operation.failure_count}`}
                                    color="error"
                                    variant="outlined"
                                />
                            </Box>

                            {operation.status === 'completed' && (
                                <Alert severity="success">
                                    Operation completed successfully!
                                </Alert>
                            )}

                            {operation.status === 'failed' && (
                                <Alert severity="error">
                                    Operation failed. Check errors below.
                                </Alert>
                            )}

                            {operation.errors && operation.errors.length > 0 && (
                                <Box mt={2}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Errors:
                                    </Typography>
                                    {operation.errors.slice(0, 5).map((error, index) => (
                                        <Alert key={index} severity="warning" sx={{ mb: 1 }}>
                                            {error.error}
                                        </Alert>
                                    ))}
                                    {operation.errors.length > 5 && (
                                        <Typography variant="caption" color="text.secondary">
                                            ... and {operation.errors.length - 5} more errors
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    {operation?.status === 'completed' && (
                        <Button onClick={() => setProgressDialogOpen(false)} variant="contained">
                            Done
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </>
    );
};
