import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../design-system';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '2rem',
                }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '1rem',
                            padding: '3rem',
                            maxWidth: '500px',
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                        }}
                    >
                        <AlertTriangle
                            size={64}
                            style={{ color: '#ef4444', marginBottom: '1.5rem' }}
                        />
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
                            Oops! Something went wrong
                        </h1>
                        <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                            {this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
                        </p>
                        <Button
                            variant="primary"
                            icon={RefreshCw}
                            onClick={this.handleReset}
                            size="lg"
                        >
                            Refresh Page
                        </Button>
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}
