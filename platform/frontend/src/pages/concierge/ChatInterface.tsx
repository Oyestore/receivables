import React, { useState, useEffect, useRef } from 'react';
import {
    Box, TextField, IconButton, Paper, Typography,
    Avatar, Fade, CircularProgress, Chip, Button
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MicIcon from '@mui/icons-material/Mic'; // Voice Ops
import { keyframes } from '@emotion/react';

// Animations
const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0px); }
`;

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatInterfaceProps {
    sessionId: string;
    persona: 'CFO' | 'CONCIERGE';
    onSendMessage: (msg: string) => Promise<string>;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId, persona, onSendMessage }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: 'user', content: input, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await onSendMessage(input);
            const aiMsg: Message = { role: 'assistant', content: response, timestamp: new Date() };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Chat Error", error);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <Paper
            elevation={3}
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <Box sx={{
                p: 2,
                background: persona === 'CFO' ? 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)' : 'linear-gradient(135deg, #006064 0%, #0097a7 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 2
            }}>
                <Avatar sx={{ bgcolor: 'white', color: 'primary.main' }}>
                    <SmartToyIcon />
                </Avatar>
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {persona === 'CFO' ? 'Virtual CFO' : 'Invoice Concierge'}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        {persona === 'CFO' ? 'Internal Advisor' : '24/7 Support Agent'}
                    </Typography>
                </Box>
            </Box>

            {/* Messages Area */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {messages.length === 0 && (
                    <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.6 }}>
                        <SmartToyIcon sx={{ fontSize: 60, mb: 1, animation: `${float} 3s ease-in-out infinite` }} />
                        <Typography>
                            {persona === 'CFO'
                                ? "Ask me about Cash Flow, Margins, or Contracts."
                                : "Hi! I can help you with this invoice or payment."}
                        </Typography>
                    </Box>
                )}

                {messages.map((msg, index) => (
                    <Box
                        key={index}
                        sx={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '80%'
                        }}
                    >
                        <Paper sx={{
                            p: 1.5,
                            borderRadius: '12px',
                            bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                            color: msg.role === 'user' ? 'white' : 'text.primary',
                            boxShadow: 1
                        }}>
                            <Typography variant="body1">{msg.content}</Typography>
                        </Paper>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, textAlign: msg.role === 'user' ? 'right' : 'left', opacity: 0.6 }}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                    </Box>
                ))}

                {isTyping && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="caption" color="text.secondary">Concierge is thinking...</Typography>
                    </Box>
                )}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input Area */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.1)', bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        fullWidth
                        placeholder={persona === 'CFO' ? "Ask about cash flow..." : "Ask a question..."}
                        variant="outlined"
                        size="small"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        sx={{
                            '& .MuiOutlinedInput-root': { borderRadius: '24px' }
                        }}
                    />
                    <IconButton color="primary" onClick={() => alert("Voice Mode (Polyglot) coming soon!")}>
                        <MicIcon />
                    </IconButton>
                    <IconButton color="primary" onClick={handleSend} disabled={!input.trim()}>
                        <SendIcon />
                    </IconButton>
                </Box>
            </Box>
        </Paper>
    );
};
