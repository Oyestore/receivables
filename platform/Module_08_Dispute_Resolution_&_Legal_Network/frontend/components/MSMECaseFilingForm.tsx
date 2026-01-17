import React, { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Grid,
    Stepper,
    Step,
    StepLabel,
    Alert,
    CircularProgress,
} from '@mui/material';
import { CloudUpload, Send } from '@mui/icons-material';
import axios from 'axios';

const steps = ['Supplier Details', 'Buyer Details', 'Dispute Details', 'Review & Submit'];

const MSMECaseFilingForm: React.FC = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        // Supplier (MSME) Details
        supplierName: '',
        supplierUdyamNumber: '',
        supplierEmail: '',
        supplierPhone: '',
        supplierAddress: '',

        // Buyer Details
        buyerName: '',
        buyerPAN: '',
        buyerEmail: '',
        buyerPhone: '',
        buyerAddress: '',

        // Dispute Details
        amountClaimed: '',
        disputeDescription: '',
        invoiceNumbers: '',
        documents: [],
    });

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [field]: event.target.value });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/v1/msme/cases/file', {
                ...formData,
                amountClaimed: parseFloat(formData.amountClaimed),
                invoiceNumbers: formData.invoiceNumbers.split(',').map((s) => s.trim()),
            });

            setSuccess(true);
            setActiveStep(steps.length);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to file MSME case');
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Supplier (MSME) Information
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Supplier Name"
                                value={formData.supplierName}
                                onChange={handleChange('supplierName')}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Udyam Registration Number"
                                value={formData.supplierUdyamNumber}
                                onChange={handleChange('supplierUdyamNumber')}
                                required
                                helperText="MSME registration number"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={formData.supplierEmail}
                                onChange={handleChange('supplierEmail')}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Phone"
                                value={formData.supplierPhone}
                                onChange={handleChange('supplierPhone')}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Address"
                                multiline
                                rows={3}
                                value={formData.supplierAddress}
                                onChange={handleChange('supplierAddress')}
                                required
                            />
                        </Grid>
                    </Grid>
                );

            case 1:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Buyer Information
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Buyer Name"
                                value={formData.buyerName}
                                onChange={handleChange('buyerName')}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="PAN Number"
                                value={formData.buyerPAN}
                                onChange={handleChange('buyerPAN')}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={formData.buyerEmail}
                                onChange={handleChange('buyerEmail')}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Phone"
                                value={formData.buyerPhone}
                                onChange={handleChange('buyerPhone')}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Address"
                                multiline
                                rows={3}
                                value={formData.buyerAddress}
                                onChange={handleChange('buyerAddress')}
                                required
                            />
                        </Grid>
                    </Grid>
                );

            case 2:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Dispute Details
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Amount Claimed (₹)"
                                type="number"
                                value={formData.amountClaimed}
                                onChange={handleChange('amountClaimed')}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Invoice Numbers"
                                value={formData.invoiceNumbers}
                                onChange={handleChange('invoiceNumbers')}
                                helperText="Comma-separated (e.g., INV-001, INV-002)"
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Dispute Description"
                                multiline
                                rows={5}
                                value={formData.disputeDescription}
                                onChange={handleChange('disputeDescription')}
                                required
                                helperText="Describe the nature of the dispute and payment delay"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Button variant="outlined" startIcon={<CloudUpload />} component="label">
                                Upload Documents
                                <input type="file" hidden multiple />
                            </Button>
                            <Typography variant="caption" display="block" mt={1}>
                                Upload invoices, purchase orders, and supporting documents
                            </Typography>
                        </Grid>
                    </Grid>
                );

            case 3:
                return (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Review Your Submission
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                                <Typography variant="subtitle2" color="primary">
                                    Supplier Information
                                </Typography>
                                <Typography variant="body2">Name: {formData.supplierName}</Typography>
                                <Typography variant="body2">Udyam: {formData.supplierUdyamNumber}</Typography>
                                <Typography variant="body2">Email: {formData.supplierEmail}</Typography>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                                <Typography variant="subtitle2" color="primary">
                                    Buyer Information
                                </Typography>
                                <Typography variant="body2">Name: {formData.buyerName}</Typography>
                                <Typography variant="body2">PAN: {formData.buyerPAN}</Typography>
                            </Paper>

                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="primary">
                                    Dispute Details
                                </Typography>
                                <Typography variant="body2">
                                    Amount: ₹{parseFloat(formData.amountClaimed || '0').toLocaleString('en-IN')}
                                </Typography>
                                <Typography variant="body2">Invoices: {formData.invoiceNumbers}</Typography>
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    {formData.disputeDescription}
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                );

            default:
                return null;
        }
    };

    if (success) {
        return (
            <Box p={3} textAlign="center">
                <Alert severity="success" sx={{ mb: 3 }}>
                    MSME Case Filed Successfully!
                </Alert>
                <Typography variant="h6" gutterBottom>
                    Your case has been submitted to MSME Samadhaan Portal
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    You will receive a confirmation email with your case number.
                </Typography>
                <Button variant="contained" sx={{ mt: 3 }} onClick={() => window.location.reload()}>
                    File Another Case
                </Button>
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
                File MSME Case
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                File a case with MSME Samadhaan Portal for delayed payment disputes
            </Typography>

            <Paper sx={{ p: 3 }}>
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {renderStepContent(activeStep)}

                <Box display="flex" justifyContent="space-between" mt={4}>
                    <Button disabled={activeStep === 0} onClick={handleBack}>
                        Back
                    </Button>
                    <Box>
                        {activeStep === steps.length - 1 ? (
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={20} /> : <Send />}
                            >
                                Submit to MSME Portal
                            </Button>
                        ) : (
                            <Button variant="contained" onClick={handleNext}>
                                Next
                            </Button>
                        )}
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default MSMECaseFilingForm;
