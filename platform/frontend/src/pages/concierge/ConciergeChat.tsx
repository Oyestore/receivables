import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import {
    Send,
    Bot,
    User,
    Clock,
    FileText,
    CreditCard,
    TrendingUp,
    AlertCircle,
    Paperclip,
    Mic,
    MoreHorizontal,
    Sparkles,
    Shield
} from 'lucide-react';
import { conciergeAPI } from '../../config/api';

interface Message {
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
    isTyping?: boolean;
}

export const ConciergeChat: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            type: 'ai',
            content: "👋 Hi! I'm your Invoice Concierge. I can help with invoice status, payment options, and financial summaries. How can I assist you today?",
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const quickActions = [
        { icon: <FileText size={18} />, label: 'Invoice Status', action: 'status', color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { icon: <CreditCard size={18} />, label: 'Pay Invoice', action: 'payment', color: 'text-green-500', bg: 'bg-green-500/10' },
        { icon: <TrendingUp size={18} />, label: 'AR Summary', action: 'summary', color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { icon: <AlertCircle size={18} />, label: 'Overdue Items', action: 'overdue', color: 'text-red-500', bg: 'bg-red-500/10' },
    ];

    const [sessionId, setSessionId] = useState<string | null>(null);
    const hasStartedSession = useRef(false);

    const startSessionMutation = useMutation({
        mutationFn: async () => {
            const tenantId = 'defaultTenant';
            const { data } = await conciergeAPI.startSession(tenantId, 'concierge');
            return data;
        },
        onSuccess: (data) => {
            setSessionId(data.id);
        },
        onError: (error) => {
            console.error('Failed to start concierge session:', error);
            setMessages(prev => [...prev, {
                id: 'error-init',
                type: 'ai',
                content: "I'm having trouble connecting to the network. Please try again later.",
                timestamp: new Date()
            }]);
        }
    });

    const sendMessageMutation = useMutation({
        mutationFn: async ({ id, content }: { id: string, content: string }) => {
            const { data } = await conciergeAPI.sendMessage(id, content);
            return data;
        },
        onSuccess: (data) => {
            const aiMessage: Message = {
                id: Date.now().toString(),
                type: 'ai',
                content: data.response || "I'm sorry, I didn't get that.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
        },
        onError: (error) => {
            const errorMessage: Message = {
                id: Date.now().toString(),
                type: 'ai',
                content: "Sorry, I couldn't process your request. Please try again.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        }
    });

    useEffect(() => {
        if (!hasStartedSession.current) {
            hasStartedSession.current = true;
            startSessionMutation.mutate();
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        if (!sessionId) {
            if (startSessionMutation.isError) {
                startSessionMutation.mutate();
            }
            return;
        }

        const content = inputValue;
        setInputValue('');

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        sendMessageMutation.mutate({ id: sessionId, content });
    };

    const handleQuickAction = (action: string) => {
        const actionMessages: Record<string, string> = {
            status: 'Show me invoice status',
            payment: 'What payment options do I have?',
            summary: 'Give me an AR summary',
            overdue: 'Show overdue invoices',
        };
        const msg = actionMessages[action] || '';
        setInputValue(msg);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const isTyping = sendMessageMutation.isPending;

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto bg-background rounded-3xl overflow-hidden glass-card shadow-2xl border-white/20 dark:border-white/5 relative">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none -z-10" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />

            {/* Header */}
            <div className="p-6 border-b border-border/50 bg-white/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/30">
                            <Bot className="text-white w-7 h-7" />
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${sessionId ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            Invoice Concierge
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20 flex items-center gap-1">
                                <Sparkles size={10} /> AI Powered
                            </span>
                        </h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            {startSessionMutation.isPending ? 'Connecting neural network...' : (sessionId ? 'Online • Ready to assist' : 'Offline')}
                        </p>
                    </div>
                </div>
                <button className="p-2 hover:bg-muted/50 rounded-xl transition-colors text-muted-foreground">
                    <MoreHorizontal />
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar">
                <AnimatePresence initial={false}>
                    {messages.map((message) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'user' ? 'bg-indigo-600 text-white' : 'bg-primary/20 text-primary'}`}>
                                    {message.type === 'user' ? <User size={16} /> : <Bot size={16} />}
                                </div>
                                <div className={`group relative p-4 rounded-2xl shadow-sm ${message.type === 'user'
                                        ? 'bg-gradient-to-br from-primary-600 to-indigo-600 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-gray-800 border border-border rounded-tl-none'
                                    }`}>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                    <span className={`text-[10px] mt-2 block opacity-70 ${message.type === 'user' ? 'text-indigo-100' : 'text-muted-foreground'}`}>
                                        {formatTime(message.timestamp)}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isTyping && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                            <Bot size={16} />
                        </div>
                        <div className="bg-white dark:bg-gray-800 border border-border p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                        </div>
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions & Input */}
            <div className="p-6 border-t border-border/50 bg-white/50 dark:bg-black/20 backdrop-blur-md space-y-4">
                {messages.length < 3 && (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {quickActions.map((action) => (
                            <button
                                key={action.action}
                                onClick={() => handleQuickAction(action.action)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-border hover:border-primary/50 hover:shadow-md transition-all whitespace-nowrap group"
                            >
                                <div className={`p-1.5 rounded-lg ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
                                    {action.icon}
                                </div>
                                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">{action.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="relative flex items-center gap-3 bg-white dark:bg-gray-900 border border-border p-2 rounded-2xl shadow-inner focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                    <button className="p-2.5 text-muted-foreground hover:bg-muted rounded-xl transition-colors">
                        <Paperclip size={20} />
                    </button>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message..."
                        disabled={startSessionMutation.isPending}
                        className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm font-medium placeholder:text-muted-foreground/70"
                    />
                    <button className="p-2.5 text-muted-foreground hover:bg-muted rounded-xl transition-colors">
                        <Mic size={20} />
                    </button>
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isTyping}
                        className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-primary/20"
                    >
                        <Send size={18} />
                    </button>
                </div>

                <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground select-none">
                    <Shield size={10} />
                    <span>Secure End-to-End Encrypted Session</span>
                </div>
            </div>
        </div>
    );
};
