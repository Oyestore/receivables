import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
    message?: string;
    fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Loading...', fullScreen = false }) => {
    const content = (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                padding: '2rem',
            }}
        >
            <Loader2
                size={48}
                style={{ color: '#667eea', animation: 'spin 1s linear infinite' }}
            />
            <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 500 }}>
                {message}
            </p>
        </motion.div>
    );

    if (fullScreen) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                zIndex: 9999,
            }}>
                {content}
            </div>
        );
    }

    return content;
};

// CSS for spin animation (add to global styles)
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
