import React, { useState } from 'react';
import { Fab, Box, Fade } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import { ChatInterface } from './ChatInterface';

// MOCK API Call
const mockSendMessage = async (msg: string) => {
    return new Promise<string>((resolve) => {
        setTimeout(() => {
            if (msg.toLowerCase().includes('margin')) resolve("Your current margin on Invoice #102 is 22%. You can offer a 2% discount.");
            else if (msg.toLowerCase().includes('flow')) resolve("Based on M10 predictions, you will have a cash gap of $5k next week.");
            else resolve("I am your Virtual CFO. Ask me about your business.");
        }, 1500);
    });
};

export const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Box sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 9999 }}>
            <Fade in={isOpen} mountOnEnter unmountOnExit>
                <Box sx={{
                    position: 'absolute',
                    bottom: 80,
                    right: 0,
                    width: 350,
                    height: 500,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                }}>
                    <ChatInterface
                        sessionId="session-123"
                        persona="CFO"
                        onSendMessage={mockSendMessage}
                    />
                </Box>
            </Fade>

            <Fab
                color="primary"
                aria-label="chat"
                onClick={() => setIsOpen(!isOpen)}
                sx={{
                    width: 64,
                    height: 64,
                    background: 'linear-gradient(45deg, #1a237e 30%, #0d47a1 90%)',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'scale(1.1)' }
                }}
            >
                {isOpen ? <CloseIcon /> : <SmartToyIcon />}
            </Fab>
        </Box>
    );
};
