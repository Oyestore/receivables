import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Button,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Checkbox,
    FormControlLabel,
    Alert,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    ArrowForward as NextIcon,
    Send as SendIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { PartnerComparison } from './PartnerComparison';

const steps = ['Business Info', 'Select Invoices', 'Choose Partner', ' Review & Submit'];

export const FinancingApplicationForm: React.FC = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState({
        businessName: '',
        businessPan: '',
        businessGstin: '',
        annualRevenue: '',
        yearsInBusiness: '',
        financingType: 'invoice_discounting',
        selectedInvoices: [] as string[],
        totalInvoiceAmount: 0,
        requestedAmount: 0,
        partnerId: '',
    });
    const [availableInvoices, setAvailableInvoices] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const handleNext = () => {
        setActiveStep((prevStep) => prevStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleInvoiceToggle = (invoiceId: string, amount: number) => {
        setFormData((prev) => {
            const isSelected = prev.selectedInvoices.includes(invoiceId);
            const newSelected = isSelected
                ? prev.selectedInvoices.filter((id) => id !== invoiceId)
                : [...prev.selectedInvoices, invoiceId];

            const totalAmount = isSelected
                ? prev.totalInvoiceAmount - amount
                : prev.totalInvoiceAmount + amount;

            return {
                ...prev,
                selectedInvoices: newSelected,
                totalInvoiceAmount: totalAmount,
                requestedAmount: totalAmount * 0.8, // 80% of invoice value
            };
        });
    };

    const handlePartnerSelect = (partnerId: string) => {
        setFormData((prev) => ({ ...prev, partnerId }));
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);

            // Create application using unified API
            const createResponse = await axios.post('/api/v1/financing/applications', {
                financingType: formData.financingType,
                requestedAmount: formData.requestedAmount,
                urgency: 'flexible',
                businessDetails: {
                    businessName: formData.businessName,
                    businessPan: formData.businessPan,
                    businessGstin: formData.businessGstin,
                    annualRevenue: parseFloat(formData.annualRevenue) || 0,
                    yearsInBusiness: parseInt(formData.yearsInBusiness) || 0,
                    industry: 'General',  // TODO: Add industry field to form
                },
                invoiceIds: formData.selectedInvoices,
                preferences: {
                    prioritize: 'lowest_rate',
                },
            });

            const applicationId = createResponse.data.data.id;

            // Submit to selected partner using unified API
            await axios.post(`/api/v1/financing/applications/${applicationId}/submit`, {
                partnerIds: [formData.partnerId],
                mode: 'single',
            });

            alert(`Application submitted successfully! Application ID: ${applicationId}`);
        } catch (error: any) {
            console.error('Failed to submit application:', error);
            alert(error.response?.data?.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
        }
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Business Name"
                                value={formData.businessName}
                                onChange={(e) => handleInputChange('businessName', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="PAN Number"
                                value={formData.businessPan}
                                onChange={(e) => handleInputChange('businessPan', e.target.value)}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="GSTIN (Optional)"
                                value={formData.businessGstin}
                                onChange={(e) => handleInputChange('businessGstin', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Annual Revenue"
                                type="number"
                                value={formData.annualRevenue}
                                onChange={(e) => handleInputChange('annualRevenue', e.target.value)}
                                InputProps={{ startAdornment: '₹' }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Years in Business"
                                type="number"
                                value={formData.yearsInBusiness}
                                onChange={(e) => handleInputChange('yearsInBusiness', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Financing Type</InputLabel>
                                <Select
                                    value={formData.financingType}
                                    onChange={(e) => handleInputChange('financingType', e.target.value)}
                                    label="Financing Type"
                                >
                                    <MenuItem value="invoice_discounting">Invoice Discounting</MenuItem>
                                    <MenuItem value="invoice_factoring">invoice Factoring</MenuItem>
                                    <MenuItem value="working_capital">Working Capital</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                );

            case 1:
                return (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Select invoices to include in your financing application
                        </Typography>
                        {/* TODO: Load and display user's invoices */}
                        <Alert severity="info">
                            Invoice selection will be integrated with your invoice list
                        </Alert>
                        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                            <Typography variant="subtitle2">Selected Invoices</Typography>
                            <Typography variant="h5" color="primary">
                                ₹{formData.totalInvoiceAmount.toLocaleString('en-IN')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Eligible Amount: ₹{formData.requestedAmount.toLocaleString('en-IN')} (80%)
                            </Typography>
                        </Paper>
                    </Box>
                );

            case 2:
                return (
                    <PartnerComparison
                        requestedAmount={formData.requestedAmount}
                        onSelectPartner={handlePartnerSelect}
                    />
                );

            case 3:
                return (
                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Application Summary
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Business Name
                                    </Typography>
                                    <Typography variant="body1">{formData.businessName}</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        PAN Number
                                    </Typography>
                                    <Typography variant="body1">{formData.businessPan}</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Total Invoice Amount
                                    </Typography>
                                    <Typography variant="h6" color="primary">
                                        ₹{formData.totalInvoiceAmount.toLocaleString('en-IN')}
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Requested Amount
                                    </Typography>
                                    <Typography variant="h6" color="success.main">
                                        ₹{formData.requestedAmount.toLocaleString('en-IN')}
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                        <Alert severity="info" sx={{ mt: 2 }}>
                            By submitting, you agree to the partner's terms and conditions
                        </Alert>
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <Card>
            <CardContent>
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {renderStepContent(activeStep)}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                    <Button
                        disabled={activeStep === 0}
                        onClick={handleBack}
                        startIcon={<BackIcon />}
                    >
                        Back
                    </Button>

                    {activeStep === steps.length - 1 ? (
                        <Button
                            variant="contained"
                            onClick={handleSubmit}
                            disabled={submitting || !formData.partnerId}
                            startIcon={<SendIcon />}
                        >
                            {submitting ? 'Submitting...' : 'Submit Application'}
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={handleNext}
                            endIcon={<NextIcon />}
                            disabled={activeStep === 1 && formData.selectedInvoices.length === 0}
                        >
                            Next
                        </Button>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};
