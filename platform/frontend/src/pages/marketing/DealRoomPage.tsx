import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Box, Typography, Button, Paper, Container, Stepper, Step, StepLabel, TextField, Divider } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import GppGoodIcon from '@mui/icons-material/GppGood';

// Mock API
const mockFetchDeal = async (accessKey: string, pin?: string) => {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 800));
    const location = window.location;
    const path = location.pathname;
    if (path.includes('secure') && !pin) throw new Error('Auth Required');

    return {
        id: 'deal-123',
        title: 'Project Alpha - Supply Contract',
        smeName: 'Acme Corp',
        status: 'IN_PROGRESS',
        milestones: [
            { label: 'Contract Signed', completed: true },
            { label: 'Prototype Delivery', completed: true },
            { label: 'Batch 1 Production', completed: false },
            { label: 'Final Payment', completed: false },
        ]
    };
};

export const DealRoomPage: React.FC = () => {
    const { accessKey } = useParams<{ accessKey: string }>();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [pin, setPin] = useState('');
    const [deal, setDeal] = useState<any>(null);

    // Mock Login
    const handleLogin = () => {
        if (pin === '1234') {
            setIsAuthenticated(true);
            setDeal({
                title: 'Project Alpha - Supply Contract',
                smeName: 'Acme Corp',
                status: 'IN_PROGRESS',
                milestones: [
                    { label: 'Contract Signed', completed: true },
                    { label: 'Prototype Delivery', completed: true },
                    { label: 'Batch 1 Production', completed: false, active: true },
                    { label: 'Final Payment', completed: false },
                ]
            });
        } else {
            alert('Invalid PIN (Try 1234)');
        }
    };

    if (!isAuthenticated) {
        return (
            <Container maxWidth="xs" sx={{ mt: 10 }}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <LockIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>Secure Deal Room</Typography>
                    <Typography variant="body2" sx={{ mb: 3 }}>
                        Enter the 4-digit PIN shared by <strong>Acme Corp</strong> to access this workspace.
                    </Typography>
                    <TextField
                        fullWidth
                        label="Enter access PIN"
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <Button variant="contained" fullWidth onClick={handleLogin}>
                        Access Workspace
                    </Button>
                </Paper>
            </Container>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', p: 4 }}>
            <Container maxWidth="md">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Box>
                        <Typography variant="h4" gutterBottom>{deal.title}</Typography>
                        <Typography variant="subtitle1" color="text.secondary">Shared by {deal.smeName}</Typography>
                    </Box>
                    <Paper sx={{ p: 1, px: 2, bgcolor: '#e8f5e9', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <GppGoodIcon color="success" />
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            SECURE & IMMUTABLE
                        </Typography>
                    </Paper>
                </Box>

                <Paper sx={{ p: 4, mb: 4 }}>
                    <Typography variant="h6" gutterBottom>Project Progress</Typography>
                    <Stepper activeStep={2} alternativeLabel>
                        {deal.milestones.map((label: any, index: number) => (
                            <Step key={index}>
                                <StepLabel>{label.label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                </Paper>

                <Paper sx={{ p: 4 }}>
                    <Typography variant="h6" gutterBottom>Pending Actions</Typography>
                    <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 2, bgcolor: '#fff' }}>
                        <Typography variant="subtitle1">Batch 1 Production Approval</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Acme Corp has marked this milestone as complete. Please verify the goods receipt.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button variant="contained" color="success">Digital Sign & Approve</Button>
                            <Button variant="outlined" color="error">Raise Dispute</Button>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};
