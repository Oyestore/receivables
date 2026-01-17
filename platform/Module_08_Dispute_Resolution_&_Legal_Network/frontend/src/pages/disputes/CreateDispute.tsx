import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Button,
    Paper,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import disputeApi from '../../services/disputeApi';

const steps = ['Basic Information', 'Dispute Details', 'Evidence', 'Review & Submit'];

const schema = yup.object({
    customerId: yup.string().required('Customer ID is required'),
    customerName: yup.string().required('Customer name is required'),
    invoiceId: yup.string().required('Invoice ID is required'),
    disputedAmount: yup.number().required('Amount is required').positive('Must be positive'),
    type: yup.string().required('Dispute type is required'),
    priority: yup.string().required('Priority is required'),
    description: yup.string().required('Description is required').min(20, 'Min 20 characters'),
}).required();

export default function CreateDispute() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeStep, setActiveStep] = useState(0);

    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            customerId: '',
            customerName: '',
            invoiceId: '',
            disputedAmount: 0,
            type: 'non_payment',
            priority: 'medium',
            description: '',
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => disputeApi.create({
            ...data,
            tenantId: 'tenant1',
            createdBy: 'user1',
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['disputes'] });
            navigate('/disputes');
        },
    });

    const handleNext = () => {
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const onSubmit = (data: any) => {
        if (activeStep === steps.length - 1) {
            createMutation.mutate(data);
        } else {
            handleNext();
        }
    };

    const formValues = watch();

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                    Create New Dispute
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    File a new dispute case for resolution
                </Typography>
            </Box>

            {/* Stepper */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* Step 1: Basic Information */}
                    {activeStep === 0 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="customerId"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Customer ID"
                                            fullWidth
                                            error={!!errors.customerId}
                                            helperText={errors.customerId?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="customerName"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Customer Name"
                                            fullWidth
                                            error={!!errors.customerName}
                                            helperText={errors.customerName?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="invoiceId"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Invoice ID"
                                            fullWidth
                                            error={!!errors.invoiceId}
                                            helperText={errors.invoiceId?.message}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Controller
                                    name="disputedAmount"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Disputed Amount (₹)"
                                            type="number"
                                            fullWidth
                                            error={!!errors.disputedAmount}
                                            helperText={errors.disputedAmount?.message}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    )}

                    {/* Step 2: Dispute Details */}
                    {activeStep === 1 && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth error={!!errors.type}>
                                    <InputLabel>Dispute Type</InputLabel>
                                    <Controller
                                        name="type"
                                        control={control}
                                        render={({ field }) => (
                                            <Select {...field} label="Dispute Type">
                                                <MenuItem value="non_payment">Non Payment</MenuItem>
                                                <MenuItem value="partial_payment">Partial Payment</MenuItem>
                                                <MenuItem value="delayed_payment">Delayed Payment</MenuItem>
                                                <MenuItem value="quality_dispute">Quality Dispute</MenuItem>
                                                <MenuItem value="quantity_dispute">Quantity Dispute</MenuItem>
                                                <MenuItem value="contract_breach">Contract Breach</MenuItem>
                                                <MenuItem value="other">Other</MenuItem>
                                            </Select>
                                        )}
                                    />
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth error={!!errors.priority}>
                                    <InputLabel>Priority</InputLabel>
                                    <Controller
                                        name="priority"
                                        control={control}
                                        render={({ field }) => (
                                            <Select {...field} label="Priority">
                                                <MenuItem value="low">Low</MenuItem>
                                                <MenuItem value="medium">Medium</MenuItem>
                                                <MenuItem value="high">High</MenuItem>
                                                <MenuItem value="urgent">Urgent</MenuItem>
                                            </Select>
                                        )}
                                    />
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Description"
                                            multiline
                                            rows={6}
                                            fullWidth
                                            error={!!errors.description}
                                            helperText={errors.description?.message || 'Describe the dispute in detail (min 20 characters)'}
                                        />
                                    )}
                                />
                            </Grid>
                        </Grid>
                    )}

                    {/* Step 3: Evidence */}
                    {activeStep === 2 && (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="h6" sx={{ mb: 2 }}>
                                Evidence Upload
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                File upload functionality coming soon...
                            </Typography>
                            <Alert severity="info">
                                You can skip this step and add evidence later from the dispute detail page
                            </Alert>
                        </Box>
                    )}

                    {/* Step 4: Review */}
                    {activeStep === 3 && (
                        <Box>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                                Review Your Submission
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Customer</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {formValues.customerName}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Invoice ID</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {formValues.invoiceId}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Amount</Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                                        ₹{formValues.disputedAmount?.toLocaleString()}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary">Type / Priority</Typography>
                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                        {formValues.type} / {formValues.priority}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">Description</Typography>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        {formValues.description}
                                    </Typography>
                                </Grid>
                            </Grid>

                            {createMutation.isError && (
                                <Alert severity="error" sx={{ mt: 3 }}>
                                    Failed to create dispute. Please try again.
                                </Alert>
                            )}
                        </Box>
                    )}

                    {/* Navigation Buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                        <Button
                            onClick={() => navigate('/disputes')}
                            disabled={createMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            {activeStep > 0 && (
                                <Button
                                    onClick={handleBack}
                                    disabled={createMutation.isPending}
                                >
                                    Back
                                </Button>
                            )}
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={createMutation.isPending}
                            >
                                {activeStep === steps.length - 1
                                    ? createMutation.isPending ? 'Creating...' : 'Submit'
                                    : 'Next'}
                            </Button>
                        </Box>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
}
