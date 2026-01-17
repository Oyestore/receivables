import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Button, Container, Grid, Paper, Alert } from '@mui/material';
import { ChatInterface } from './ChatInterface';

// Mock API
const mockPayerSendMessage = async (msg: string) => {
    return new Promise<string>((resolve) => {
        setTimeout(() => {
            // Simulate Dispute
            if (msg.toLowerCase().includes('wrong') || msg.toLowerCase().includes('dispute')) {
                resolve("I understand. I have flagged this for the SME. Ticket #TKT-999 created.");
            }
            // Simulate Draft Approval
            else if (msg.toLowerCase().includes('approve')) {
                resolve("Great! I have marked this Draft as **APPROVED**.");
            }
            // Simulate Payment
            else if (msg.toLowerCase().includes('pay')) {
                resolve("You can pay securely right here. [Payment Widget Placeholder]");
            }
            else {
                resolve("I have forwarded your message to the SME's inbox. They will be notified instantly.");
            }
        }, 1000);
    });
};

export const PayerChatPage: React.FC = () => {
    const { invoiceId } = useParams<{ invoiceId: string }>();
    const [showNudge, setShowNudge] = useState(false);

    // Feature: Viral Loop Nudge after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => setShowNudge(true), 5000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', display: 'flex' }}>
            {/* Left Side: The Invoice (PDF Viewer Placeholder) */}
            <Box sx={{ width: '50%', p: 4, display: { xs: 'none', md: 'block' } }}>
                <Paper sx={{ height: '100%', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <Typography variant="h4" gutterBottom>Invoice {invoiceId}</Typography>
                    <Box sx={{ width: '80%', height: '600px', bgcolor: '#eee', borderRadius: 2 }} />
                    <Typography variant="caption" sx={{ mt: 2 }}>PDF Viewer Component</Typography>
                </Paper>
            </Box>

            {/* Right Side: The Concierge */}
            <Box sx={{ width: { xs: '100%', md: '50%' }, p: 4, position: 'relative' }}>
                <Container maxWidth="sm" sx={{ height: '100%' }}>
                    <ChatInterface
                        sessionId={`session-${invoiceId}`}
                        persona="CONCIERGE"
                        onSendMessage={mockPayerSendMessage}
                    />
                </Container>

                {/* Viral Nudge Overlay */}
                {showNudge && (
                    <Paper sx={{
                        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                        p: 2, bgcolor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: 2
                    }}>
                        <Typography variant="body2">
                            Using our AI Concierge?
                            <Button size="small" sx={{ ml: 1 }}>Get this for your business</Button>
                        </Typography>
                    </Paper>
                )}
            </Box>
        </Box>
    );
};
