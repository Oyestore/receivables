import { createSystem } from '@chakra-ui/react';

// Module 16 Dual-Persona Theme Configuration

// Persona-specific color palettes
const colors = {
    // CONCIERGE (Customer) - Friendly, helpful
    concierge: {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#f59e0b',
    },
    // CFO (Tenant) - Professional, analytical
    cfo: {
        primary: '#059669',
        secondary: '#374151',
        accent: '#8b5cf6',
    },
};

const theme = createSystem({
    theme: {
        tokens: {
            colors: {
                concierge: {
                    primary: { value: '#2563eb' },
                    secondary: { value: '#64748b' },
                    accent: { value: '#f59e0b' },
                },
                cfo: {
                    primary: { value: '#059669' },
                    secondary: { value: '#374151' },
                    accent: { value: '#8b5cf6' },
                }
            }
        }
    }
});

export default theme;

// Export persona-specific theme selectors
export const getConciergeColor = (key: string) => `concierge.${key}`;
export const getCFOColor = (key: string) => `cfo.${key}`;
