import React, { useState } from 'react';
import { Box, Typography, Button, Paper, TextField, Grid, Alert } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export const BoostTrust: React.FC = () => {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);

    const handleSend = () => {
        // Mock API Call
        setTimeout(() => setSent(true), 500);
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Boost Your Trust Score</Typography>
            <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
                Invite your trading partners to verify your payment history. Verified profiles get up to **2% lower interest rates**.
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 4 }}>
                        <Typography variant="h6" gutterBottom>Invite a Partner</Typography>

                        {sent ? (
                            <Alert severity="success">
                                Invitation sent! We will notify you when they verify.
                            </Alert>
                        ) : (
                            <>
                                <TextField
                                    fullWidth
                                    label="Partner Email"
                                    placeholder="vendor@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                                <Button
                                    variant="contained"
                                    endIcon={<SendIcon />}
                                    onClick={handleSend}
                                    disabled={!email}
                                >
                                    Send Verification Request
                                </Button>
                            </>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 4, bgcolor: '#f5f5f5' }}>
                        <Typography variant="h6" gutterBottom>Current Impact</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold', mr: 2 }}>720</Typography>
                            <Typography variant="body2">Current Credit Score</Typography>
                        </Box>
                        <Typography variant="body2">
                            Getting just **3 verifications** could boost this to **750+**.
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};
