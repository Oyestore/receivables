import React, { useState } from 'react';
import {
    VStack,
    HStack,
    Icon,
} from '@chakra-ui/react';
import { FiSend, FiMessageSquare } from 'react-icons/fi';
import './CFOChatAssistant.css';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface CFOChatAssistantProps {
    tenantId: string;
}

const CFOChatAssistant: React.FC<CFOChatAssistantProps> = ({ tenantId }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'm1',
            role: 'assistant',
            content: "Hello! I'm your Virtual CFO AI. I can help with collections, forecasting, margin analysis, and cash flow optimization. What would you like to know?",
            timestamp: new Date(),
        },
    ]);

    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [suggestedQuestions] = useState([
        'What\'s our DSO this month?',
        'Which customers are overdue?',
        'Show me margin analysis',
        'Forecast next quarter revenue',
    ]);

    const handleSend = () => {
        if (!inputMessage.trim()) return;

        const userMsg: Message = {
            id: `m${messages.length + 1}`,
            role: 'user',
            content: inputMessage,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInputMessage('');
        setIsTyping(true);

        // Simulate AI response (uses Module 16's mockInternalReasoning logic)
        setTimeout(() => {
            const aiMsg: Message = {
                id: `m${messages.length + 2}`,
                role: 'assistant',
                content: getAIResponse(inputMessage),
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1000);
    };

    const getAIResponse = (userInput: string): string => {
        const input = userInput.toLowerCase();
        
        if (input.includes('dso') || input.includes('days sales outstanding')) {
            return "Your current DSO is 32 days, which is 4 days better than last month. The top 3 customers contributing to this improvement are Tech Solutions (15 days), Acme Corp (22 days), and Global Services (28 days).";
        }
        
        if (input.includes('overdue') || input.includes('late')) {
            return "You have 4 overdue invoices totaling ₹125,000. The highest priority is Startup Inc (₹45,000, 18 days overdue). I recommend sending a gentle reminder today.";
        }
        
        if (input.includes('margin') || input.includes('profitability')) {
            return "Your overall gross margin is 42%, up from 38% last quarter. Tech Services has the highest margin at 58%, while Consulting is at 35%. Consider optimizing pricing for lower-margin services.";
        }
        
        if (input.includes('forecast') || input.includes('revenue')) {
            return "Based on current trends, I forecast Q1 2026 revenue of ₹2.8M, representing 15% growth YoY. The strongest growth is expected from Technology services (+22%) while Consulting shows steady growth (+8%).";
        }
        
        if (input.includes('cash flow') || input.includes('cash')) {
            return "Your cash flow position is strong with ₹450K in reserves. The upcoming large payment from Acme Corp (₹180K) on the 15th will further strengthen your position. Consider investing excess cash in short-term instruments.";
        }
        
        return "I can help you analyze financial data, optimize cash flow, improve collections, and provide forecasting insights. Try asking about DSO, overdue invoices, margin analysis, or revenue forecasts.";
    };

    const handleQuickQuestion = (question: string) => {
        setInputMessage(question);
        setTimeout(() => handleSend(), 100);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    };

    return (
        <div className="chat-container">
            {/* Chat Header */}
            <div className="chat-header">
                <div className="h-stack justify-between">
                    <div className="chat-title">
                        <Icon as={FiMessageSquare} className="icon" />
                        Virtual CFO Assistant
                    </div>
                    <div className="chat-status">
                        <span className="status-dot"></span>
                        Online
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <div className="quick-actions-title">Quick Questions</div>
                <div className="quick-actions-grid">
                    {suggestedQuestions.map((question, index) => (
                        <button
                            key={index}
                            className="quick-action"
                            onClick={() => handleQuickQuestion(question)}
                        >
                            {question}
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.map((message) => (
                    <div key={message.id} className={`message ${message.role}`}>
                        <div className="message-avatar">
                            <div className={`avatar ${message.role}`}>
                                {message.role === 'assistant' ? 'CFO' : 'You'}
                            </div>
                        </div>
                        <div className="message-content">
                            <div className="message-bubble">
                                {message.content}
                            </div>
                            <div className="message-time">
                                {formatTime(message.timestamp)}
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                    <div className="message assistant">
                        <div className="message-avatar">
                            <div className="avatar assistant">CFO</div>
                        </div>
                        <div className="message-content">
                            <div className="typing-indicator">
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                                <span className="typing-dot"></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Input */}
            <div className="chat-input-container">
                <div className="input-group">
                    <input
                        type="text"
                        className="chat-input"
                        placeholder="Ask me about your financial data..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isTyping}
                    />
                    <button
                        className="send-button"
                        onClick={handleSend}
                        disabled={!inputMessage.trim() || isTyping}
                    >
                        <Icon as={FiSend} className="icon" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CFOChatAssistant;
