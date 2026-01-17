import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader } from 'lucide-react';
import './ConversationalCop ilot.css';

/**
 * Conversational Business Copilot
 * 
 * Natural language interface for business intelligence
 * Ask questions, get insights, take actions
 */
const ConversationalCopilot = ({ tenantId = 'tenant-123', minimized = false, onToggle }) => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: '👋 Hi! I'm your Business Copilot.Ask me anything about your business!',
      timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Suggested questions
    const suggestions = [
        'Which customers should I call today?',
        'Show me cash flow for next 30 days',
        'Which invoices are at risk?',
        'What's my best performing customer segment ? ',
    'Why did revenue drop last week?',
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage = {
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Call AI API
            const response = await fetch(`http://localhost:3004/api/v1/intelligence/copilot/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId,
                    query: input,
                }),
            });

            const data = await response.json();

            const assistantMessage = {
                role: 'assistant',
                content: data.answer || 'I couldn't process that request.Please try again.',
        actions: data.actions || [],
                data: data.data,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage = {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setInput(suggestion);
    };

    const handleAction = async (action) => {
        console.log('Executing action:', action);
        // Execute action via API
    };

    if (minimized) {
        return (
            <button className="copilot-fab" onClick={onToggle}>
                <Sparkles size={24} />
            </button>
        );
    }

    return (
        <div className="copilot-container">
            {/* Header */}
            <div className="copilot-header">
                <div className="copilot-title">
                    <Sparkles size={20} />
                    <span>Business Copilot</span>
                </div>
                <button className="minimize-btn" onClick={onToggle}>−</button>
            </div>

            {/* Messages */}
            <div className="copilot-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message message-${msg.role}`}>
                        <div className="message-content">
                            {msg.content}
                        </div>

                        {/* Actions */}
                        {msg.actions && msg.actions.length > 0 && (
                            <div className="message-actions">
                                {msg.actions.map((action, i) => (
                                    <button
                                        key={i}
                                        className="action-chip"
                                        onClick={() => handleAction(action)}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="message-time">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="message message-assistant">
                        <div className="message-content">
                            <Loader className="spinner" size={16} />
                            Thinking...
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {messages.length <= 2 && (
                <div className="copilot-suggestions">
                    <div className="suggestions-label">Try asking:</div>
                    {suggestions.map((suggestion, idx) => (
                        <button
                            key={idx}
                            className="suggestion-chip"
                            onClick={() => handleSuggestionClick(suggestion)}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="copilot-input">
                <input
                    type="text"
                    placeholder="Ask me anything about your business..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={loading}
                />
                <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                >
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};

export default ConversationalCopilot;
