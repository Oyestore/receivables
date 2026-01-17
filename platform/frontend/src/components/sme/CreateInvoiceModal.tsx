import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    FormControlLabel,
    Switch,
    Typography,
    Box
} from '@mui/material';
import { ExportInvoiceDetails } from './ExportInvoiceDetails';

interface CreateInvoiceModalProps {
    visible: boolean;
    onCancel: () => void;
    onCreate: (values: any) => void;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ visible, onCancel, onCreate }) => {
    const [isExport, setIsExport] = useState(false);
    const [formData, setFormData] = useState({
        customerName: '',
        dueDate: '',
        amount: '',
        taxId: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = () => {
        onCreate({ ...formData, isExport });
    };

    return (
        <Dialog open={visible} onClose={onCancel} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">Create New Invoice</Typography>
                    <FormControlLabel
                        control={<Switch checked={isExport} onChange={(e) => setIsExport(e.target.checked)} />}
                        label={<Typography fontWeight={isExport ? 'bold' : 'normal'} color={isExport ? 'primary' : 'textSecondary'}>International Export</Typography>}
                    />
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={3}>
                    {/* Core M01 Fields */}
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Customer Name"
                            name="customerName"
                            value={formData.customerName}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            type="date"
                            label="Due Date"
                            name="dueDate"
                            InputLabelProps={{ shrink: true }}
                            value={formData.dueDate}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Amount (₹)"
                            name="amount"
                            type="number"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="GSTIN / Tax ID"
                            name="taxId"
                            value={formData.taxId}
                            onChange={handleChange}
                            placeholder="22AAAAA0000A1Z5"
                        />
                    </Grid>
                </Grid>

                {/* Module 13 Integrated Component */}
                <ExportInvoiceDetails visible={isExport} />

            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} color="inherit">Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary">Generare Invoice</Button>
            </DialogActions>
        </Dialog>
    );
};
