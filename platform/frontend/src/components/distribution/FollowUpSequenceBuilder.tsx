import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    IconButton,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Grid,
    Chip,
} from '@mui/material';
import { Add, Delete, Save, PlayArrow } from '@mui/icons-material';

interface FollowUpStep {
    id: string;
    order: number;
    delay_hours: number;
    channel: 'email' | 'sms' | 'whatsapp';
    template_id: string;
    template_name?: string;
}

interface FollowUpSequence {
    id?: string;
    name: string;
    description: string;
    is_active: boolean;
    steps: FollowUpStep[];
}

export const FollowUpSequenceBuilder: React.FC = () => {
    const [sequence, setSequence] = useState<FollowUpSequence>({
        name: '',
        description: '',
        is_active: true,
        steps: [],
    });

    const [templates, setTemplates] = useState<Array<{ id: string; name: string; channel: string }>>([]);
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        const response = await fetch('/api/v1/distribution/templates?status=approved');
        const data = await response.json();
        setTemplates(data.templates || []);
    };

    const addStep = () => {
        const newStep: FollowUpStep = {
            id: `temp-${Date.now()}`,
            order: sequence.steps.length + 1,
            delay_hours: 24,
            channel: 'email',
            template_id: '',
        };

        setSequence({
            ...sequence,
            steps: [...sequence.steps, newStep],
        });

        setActiveStep(sequence.steps.length);
    };

    const updateStep = (index: number, updates: Partial<FollowUpStep>) => {
        const updatedSteps = [...sequence.steps];
        updatedSteps[index] = { ...updatedSteps[index], ...updates };
        setSequence({ ...sequence, steps: updatedSteps });
    };

    const deleteStep = (index: number) => {
        const updatedSteps = sequence.steps.filter((_, i) => i !== index);
        // Reorder
        updatedSteps.forEach((step, i) => {
            step.order = i + 1;
        });
        setSequence({ ...sequence, steps: updatedSteps });
        if (activeStep >= updatedSteps.length) {
            setActiveStep(Math.max(0, updatedSteps.length - 1));
        }
    };

    const handleSave = async () => {
        const response = await fetch('/api/v1/distribution/follow-up/sequences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sequence),
        });

        if (response.ok) {
            alert('Sequence saved successfully!');
        }
    };

    const calculateTotalDelay = (): number => {
        return sequence.steps.reduce((sum, step) => sum + step.delay_hours, 0);
    };

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight={600}>
                    Follow-up Sequence Builder
                </Typography>
                <Box display="flex" gap={2}>
                    <Button variant="outlined" onClick={() => window.history.back()}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSave}
                        sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                    >
                        Save Sequence
                    </Button>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Left Panel - Sequence Details */}
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                Sequence Details
                            </Typography>

                            <TextField
                                fullWidth
                                label="Sequence Name"
                                value={sequence.name}
                                onChange={(e) => setSequence({ ...sequence, name: e.target.value })}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                label="Description"
                                value={sequence.description}
                                onChange={(e) => setSequence({ ...sequence, description: e.target.value })}
                                multiline
                                rows={3}
                                sx={{ mb: 2 }}
                            />

                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: 'rgba(102, 126, 234, 0.1)',
                                    borderRadius: 1,
                                    mb: 2,
                                }}
                            >
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Total Steps
                                </Typography>
                                <Typography variant="h4" fontWeight={700}>
                                    {sequence.steps.length}
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    p: 2,
                                    bgcolor: 'rgba(118, 75, 162, 0.1)',
                                    borderRadius: 1,
                                }}
                            >
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Total Duration
                                </Typography>
                                <Typography variant="h4" fontWeight={700}>
                                    {calculateTotalDelay()}h
                                </Typography>
                            </Box>

                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<Add />}
                                onClick={addStep}
                                sx={{ mt: 3 }}
                            >
                                Add Step
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Panel - Step Builder */}
                <Grid item xs={12} md={8}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                Follow-up Steps
                            </Typography>

                            {sequence.steps.length === 0 && (
                                <Box textAlign="center" py={8}>
                                    <Typography variant="body1" color="text.secondary" gutterBottom>
                                        No steps added yet
                                    </Typography>
                                    <Button variant="outlined" startIcon={<Add />} onClick={addStep}>
                                        Add First Step
                                    </Button>
                                </Box>
                            )}

                            {sequence.steps.length > 0 && (
                                <Stepper activeStep={activeStep} orientation="vertical">
                                    {sequence.steps.map((step, index) => (
                                        <Step key={step.id} expanded={activeStep === index}>
                                            <StepLabel
                                                onClick={() => setActiveStep(index)}
                                                sx={{ cursor: 'pointer' }}
                                            >
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography>Step {index + 1}</Typography>
                                                    <Chip
                                                        label={`${step.delay_hours}h delay`}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                    <Chip
                                                        label={step.channel}
                                                        size="small"
                                                        sx={{ textTransform: 'capitalize' }}
                                                    />
                                                </Box>
                                            </StepLabel>
                                            <StepContent>
                                                <Box sx={{ pl: 2, pr: 2 }}>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={12} md={6}>
                                                            <TextField
                                                                fullWidth
                                                                label="Delay (hours)"
                                                                type="number"
                                                                value={step.delay_hours}
                                                                onChange={(e) =>
                                                                    updateStep(index, {
                                                                        delay_hours: parseInt(e.target.value) || 0,
                                                                    })
                                                                }
                                                                helperText={`After ${step.delay_hours} hours from ${index === 0 ? 'invoice sent' : 'previous step'
                                                                    }`}
                                                            />
                                                        </Grid>

                                                        <Grid item xs={12} md={6}>
                                                            <FormControl fullWidth>
                                                                <InputLabel>Channel</InputLabel>
                                                                <Select
                                                                    value={step.channel}
                                                                    onChange={(e) =>
                                                                        updateStep(index, {
                                                                            channel: e.target.value as any,
                                                                        })
                                                                    }
                                                                    label="Channel"
                                                                >
                                                                    <MenuItem value="email">📧 Email</MenuItem>
                                                                    <MenuItem value="sms">📱 SMS</MenuItem>
                                                                    <MenuItem value="whatsapp">💬 WhatsApp</MenuItem>
                                                                </Select>
                                                            </FormControl>
                                                        </Grid>

                                                        <Grid item xs={12}>
                                                            <FormControl fullWidth>
                                                                <InputLabel>Template</InputLabel>
                                                                <Select
                                                                    value={step.template_id}
                                                                    onChange={(e) =>
                                                                        updateStep(index, {
                                                                            template_id: e.target.value,
                                                                        })
                                                                    }
                                                                    label="Template"
                                                                >
                                                                    {templates
                                                                        .filter((t) => t.channel === step.channel)
                                                                        .map((template) => (
                                                                            <MenuItem key={template.id} value={template.id}>
                                                                                {template.name}
                                                                            </MenuItem>
                                                                        ))}
                                                                </Select>
                                                            </FormControl>
                                                        </Grid>
                                                    </Grid>

                                                    <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
                                                        <IconButton
                                                            color="error"
                                                            size="small"
                                                            onClick={() => deleteStep(index)}
                                                        >
                                                            <Delete />
                                                        </IconButton>
                                                    </Box>
                                                </Box>
                                            </StepContent>
                                        </Step>
                                    ))}
                                </Stepper>
                            )}
                        </CardContent>
                    </Card>

                    {/* Timeline Preview */}
                    {sequence.steps.length > 0 && (
                        <Card
                            elevation={0}
                            sx={{ border: '1px solid', borderColor: 'divider', mt: 3 }}
                        >
                            <CardContent>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Timeline Preview
                                </Typography>
                                <Box position="relative" p={2}>
                                    {sequence.steps.map((step, index) => {
                                        const cumulativeDelay = sequence.steps
                                            .slice(0, index + 1)
                                            .reduce((sum, s) => sum + s.delay_hours, 0);

                                        return (
                                            <Box key={step.id} display="flex" alignItems="center" gap={2} mb={2}>
                                                <Chip
                                                    label={`+${cumulativeDelay}h`}
                                                    color="primary"
                                                    size="small"
                                                />
                                                <Typography variant="body2">
                                                    Step {index + 1}: {step.channel} - Template {step.template_id}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </CardContent>
                        </Card>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};
