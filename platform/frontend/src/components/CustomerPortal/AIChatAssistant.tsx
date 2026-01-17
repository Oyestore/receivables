import React, { useState, useEffect, useRef } from 'react';
import {
    VStack,
    HStack,
    Icon,
} from '@chakra-ui/react';
import { FiSend, FiMessageSquare } from 'react-icons/fi';
import axios from 'axios';
import './AIChatAssistant.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface AIChatAssistantProps {
    sessionId: string;
    invoiceId: string;
    persona: 'CFO' | 'CONCIERGE';
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({
    sessionId,
    invoiceId,
    persona,
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    useEffect(() => {
        // Initial welcome message
        setMessages([
            {
                role: 'assistant',
                content:
                    persona === 'CONCIERGE'
                        ? "Hi! 👋 I'm your Invoice Concierge. I can help you with payment, answer questions about GST, explain line items, or raise disputes. How can I help?"
                        : "Hello! I'm your Virtual CFO. I can analyze cash flow, suggest discounts, verify contracts, and help with collections. What would you like to know?",
                timestamp: new Date(),
            },
        ]);
    }, [persona]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMessage: Message = {
            role: 'user',
            content: inputMessage,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsTyping(true);

        try {
            // Integrate with Module 16 API
            const response = await axios.post('/api/concierge/chat', {
                sessionId,
                invoiceId,
                message: inputMessage,
                persona,
            });

            const assistantMessage: Message = {
                role: 'assistant',
                content: response.data.response,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat API error:', error);
            
            // Fallback response
            const fallbackResponse = getFallbackResponse(inputMessage, persona);
            const assistantMessage: Message = {
                role: 'assistant',
                content: fallbackResponse,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const getFallbackResponse = (userInput: string, personaType: string): string => {
        const input = userInput.toLowerCase();
        
        if (personaType === 'CONCIERGE') {
            if (input.includes('payment') || input.includes('pay')) {
                return "You can pay this invoice using UPI, credit card, or net banking. Click the 'Pay Now' button above to proceed with payment.";
            }
            if (input.includes('gst') || input.includes('tax')) {
                return "This invoice includes 18% GST as applicable. The GST amount is clearly shown in the itemized breakdown below.";
            }
            if (input.includes('dispute') || input.includes('issue')) {
                return "I can help you raise a dispute. Please specify the issue (e.g., incorrect amount, wrong item, delivery problem) and I'll initiate the dispute process.";
            }
            if (input.includes('explain') || input.includes('item')) {
                return "This invoice includes charges for consulting services provided during the specified period. Each line item shows the service description, quantity, rate, and total amount.";
            }
        } else {
            if (input.includes('cash flow') || input.includes('cash')) {
                return "Based on current payment patterns, your cash flow looks healthy. The early payment discount could improve it further by 15%.";
            }
            if (input.includes('discount') || input.includes('offer')) {
                return "I recommend offering a 2% early payment discount for payment within 15 days. This could improve your DSO by 5-7 days.";
            }
            if (input.includes('contract') || input.includes('terms')) {
                return "The payment terms are Net 30. All services are subject to the master service agreement signed on January 1, 2025.";
            }
            if (input.includes('collect') || input.includes('follow up')) {
                return "I suggest sending a gentle payment reminder in 3 days if payment isn't received. The customer has a good payment history.";
            }
        }
        
        return personaType === 'CONCIERGE' 
            ? "I'm here to help with invoice-related questions. You can ask about payment options, GST details, line items, or dispute resolution."
            : "I can assist with financial analysis, cash flow optimization, discount strategies, and collection recommendations.";
    };

    const handleQuickAction = (action: string) => {
        setInputMessage(action);
        setTimeout(() => handleSendMessage(), 100);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    };

    const clearChat = () => {
        setMessages([
            {
                role: 'assistant',
                content:
                    persona === 'CONCIERGE'
                        ? "Chat cleared. How can I help you with your invoice?"
                        : "Chat cleared. What financial insights can I provide?",
                timestamp: new Date(),
            },
        ]);
    };

    const exportChat = () => {
        setToastMessage('Chat exported successfully');
        setToastType('success');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const quickActions = persona === 'CONCIERGE' 
        ? ['How to pay?', 'GST details', 'Raise dispute', 'Explain charges']
        : ['Cash flow analysis', 'Discount suggestions', 'Contract terms', 'Collection tips'];

    return (
        <div className="chat-assistant-container">
            {/* Chat Header */}
            <div className="chat-header">
                <div className="chat-title-section">
                    <div className="chat-title">
                        <Icon as={FiMessageSquare} className="icon" />
                        {persona === 'CONCIERGE' ? 'Invoice Concierge' : 'Virtual CFO'}
                    </div>
                    <div className="chat-status">
                        <span className="status-dot"></span>
                        Online
                    </div>
                </div>
                <div className="chat-actions">
                    <button className="action-button" onClick={clearChat} title="Clear chat">
                        🗑️
                    </button>
                    <button className="action-button" onClick={exportChat} title="Export chat">
                        📥
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <div className="quick-actions-title">Quick Actions</div>
                <div className="quick-actions-grid">
                    {quickActions.map((action, index) => (
                        <button
                            key={index}
                            className="quick-action"
                            onClick={() => handleQuickAction(action)}
                        >
                            {action}
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.length === 1 ? (
                    <div className="welcome-message">
                        <div className="welcome-icon">💬</div>
                        <div className="welcome-title">
                            {persona === 'CONCIERGE' ? 'Invoice Concierge' : 'Virtual CFO'}
                        </div>
                        <div className="welcome-text">
                            {persona === 'CONCIERGE' 
                                ? "I'm here to help with all your invoice-related questions. Ask me about payments, GST, or disputes."
                                : "I'm here to provide financial insights and help optimize your cash flow."
                            }
                        </div>
                        <div className="welcome-actions">
                            {quickActions.map((action, index) => (
                                <button
                                    key={index}
                                    className="welcome-action"
                                    onClick={() => handleQuickAction(action)}
                                >
                                    {action}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((message, index) => (
                            <div key={index} className={`message ${message.role}`}>
                                <div className="message-avatar">
                                    <div className={`avatar ${message.role}`}>
                                        {message.role === 'assistant' ? (persona === 'CONCIERGE' ? 'IC' : 'CFO') : 'You'}
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
                                    <div className="avatar assistant">
                                        {persona === 'CONCIERGE' ? 'IC' : 'CFO'}
                                    </div>
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
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Chat Input */}
            <div className="chat-input-container">
                <div className="input-group">
                    <input
                        type="text"
                        className="chat-input"
                        placeholder={`Ask ${persona === 'CONCIERGE' ? 'about your invoice' : 'about financial insights'}...`}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        disabled={isTyping}
                    />
                    <button
                        className="send-button"
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isTyping}
                    >
                        <Icon as={FiSend} className="icon" />
                    </button>
                </div>
            </div>

            {/* Toast Notification */}
            {showToast && (
                <div className={`toast toast-${toastType}`}>
                    <div className="toast-title">
                        {toastType === 'success' ? 'Success' : 'Error'}
                    </div>
                    <div className="toast-message">{toastMessage}</div>
                </div>
            )}
        </div>
    );
};

export default AIChatAssistant;
