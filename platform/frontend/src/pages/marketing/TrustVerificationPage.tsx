import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Button, Paper, TextField, Rating, Container } from '@mui/material';

// Mock API Call
const mockSubmitVerification = async (requestId: string, rating: number, comments: string) => {
    return new Promise(resolve => setTimeout(resolve, 1000));
};

export const TrustVerificationPage: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const [rating, setRating] = useState<number | null>(0);
    const [comments, setComments] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (!rating) return;
        await mockSubmitVerification(requestId || '', rating, comments);
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
                <Paper sx={{ p: 4, borderRadius: 2, bgcolor: '#e8f5e9' }}>
                    <Typography variant="h4" gutterBottom>Thank You!</Typography>
                    <Typography variant="body1">
                        Your verification helps build a stronger ecosystem.
                    </Typography>

                    {/* Viral Hook */}
                    <Box sx={{ mt: 4, pt: 4, borderTop: '1px solid #ccc' }}>
                        <Typography variant="h6">Do you run a business?</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Claim your own Trust Profile to get rated and access lower financing rates.
                        </Typography>
                        <Button variant="contained" color="primary">
                            Claim My Profile
                        </Button>
                    </Box>
                </Paper>
            </Container>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h5" gutterBottom>Trust Verification Request</Typography>
                <Typography variant="body1" sx={{ mb: 3 }}>
                    **Acme Suppliers Pvt Ltd** has requested your verification of their trading history.
                </Typography>

                <Typography component="legend">How would you rate your payment experience?</Typography>
                <Rating
                    name="simple-controlled"
                    value={rating}
                    onChange={(event, newValue) => {
                        setRating(newValue);
                    }}
                    size="large"
                />

                <TextField
                    fullWidth
                    label="Comments (Optional)"
                    multiline
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    sx={{ mt: 3, mb: 3 }}
                />

                <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={handleSubmit}
                    disabled={!rating}
                >
                    Verify & Submit
                </Button>
            </Paper>
        </Container>
    );
};
