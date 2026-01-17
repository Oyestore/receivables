import React from 'react';
import { Box, Typography, Button, Paper, TextField, InputAdornment } from '@mui/material';
import { ArrowBack, AttachMoney } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const NewApplication: React.FC = () => {
    const navigate = useNavigate();
    const [amount, setAmount] = React.useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock submission
        alert('Application Submitted! Reference #APP-' + Math.floor(Math.random() * 10000));
        navigate('/sme/financing');
    };

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
                Back to Dashboard
            </Button>

            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
                Request Invoice Factoring
            </Typography>

            <Paper sx={{ p: 4 }}>
                <Typography variant="body1" gutterBottom sx={{ mb: 3 }}>
                    Select invoices or enter a specific amount you need to finance. Our partners will review and provide offers within 24 hours.
                </Typography>

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Amount Required"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        InputProps={{
                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        }}
                        sx={{ mb: 4 }}
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={!amount}
                    >
                        Submit Application
                    </Button>
                </form>
            </Paper>
        </Box>
    );
};

export default NewApplication;
