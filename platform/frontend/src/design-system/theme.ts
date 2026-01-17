/**
 * SME Platform Design System - Theme Configuration
 * 
 * Centralized color themes, typography, spacing, and design tokens
 * Consistent with best practices from modules M02, M05, M10, M13-17
 */

// ============================================================================
// COLOR THEMES - By Module Category
// ============================================================================

export const moduleThemes = {
    // Financial & Invoicing
    invoicing: {
        primary: '#10b981',
        secondary: '#059669',
        gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        light: '#d1fae5',
        dark: '#064e3b',
    },

    // Payments & Transactions
    payments: {
        primary: '#3b82f6',
        secondary: '#2563eb',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        light: '#dbeafe',
        dark: '#1e3a8a',
    },

    // Analytics & Data
    analytics: {
        primary: '#8b5cf6',
        secondary: '#7c3aed',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        light: '#ede9fe',
        dark: '#5b21b6',
    },

    // Operations & Distribution
    operations: {
        primary: '#f59e0b',
        secondary: '#fb923c',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)',
        light: '#fef3c7',
        dark: '#92400e',
    },

    // Workflow & Orchestration
    workflow: {
        primary: '#047857',
        secondary: '#14b8a6',
        gradient: 'linear-gradient(135deg, #047857 0%, #14b8a6 100%)',
        light: '#ccfbf1',
        dark: '#134e4a',
    },

    // Globalization & Localization
    globalization: {
        primary: '#3b82f6',
        secondary: '#6366f1',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
        light: '#dbeafe',
        dark: '#1e3a8a',
    },

    // Risk & Decisioning
    decisioning: {
        primary: '#8b5cf6',
        secondary: '#a78bfa',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
        light: '#ede9fe',
        dark: '#5b21b6',
    },

    // Trade & International
    trade: {
        primary: '#14b8a6',
        secondary: '#06b6d4',
        gradient: 'linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)',
        light: '#ccfbf1',
        dark: '#134e4a',
    },

    // Marketing & Campaigns
    marketing: {
        primary: '#ec4899',
        secondary: '#d946ef',
        gradient: 'linear-gradient(135deg, #ec4899 0%, #d946ef 100%)',
        light: '#fce7f3',
        dark: '#831843',
    },

    // AI & Intelligent Systems
    ai: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        light: '#e0e7ff',
        dark: '#3730a3',
    },

    // Critical & Alerts
    critical: {
        primary: '#ef4444',
        secondary: '#f97316',
        gradient: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
        light: '#fee2e2',
        dark: '#991b1b',
    },
};

// ============================================================================
// NEUTRAL COLORS
// ============================================================================

export const neutralColors = {
    white: '#ffffff',
    black: '#000000',

    // Grays (Tailwind-like scale)
    gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
    },

    // Slate (for text)
    slate: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
    },
};

// ============================================================================
// SEMANTIC COLORS
// ============================================================================

export const semanticColors = {
    success: {
        main: '#10b981',
        light: '#d1fae5',
        dark: '#059669',
    },
    warning: {
        main: '#f59e0b',
        light: '#fef3c7',
        dark: '#d97706',
    },
    error: {
        main: '#ef4444',
        light: '#fee2e2',
        dark: '#dc2626',
    },
    info: {
        main: '#3b82f6',
        light: '#dbeafe',
        dark: '#2563eb',
    },
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
    fontFamily: {
        primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },

    fontSize: {
        xs: '0.75rem',      // 12px
        sm: '0.875rem',     // 14px
        base: '1rem',       // 16px
        lg: '1.125rem',     // 18px
        xl: '1.25rem',      // 20px
        '2xl': '1.5rem',    // 24px
        '3xl': '1.875rem',  // 30px
        '4xl': '2.25rem',   // 36px
        '5xl': '3rem',      // 48px
    },

    fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },

    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
    },
};

// ============================================================================
// SPACING (8px grid system)
// ============================================================================

export const spacing = {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
};

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
    none: '0',
    sm: '0.25rem',    // 4px
    base: '0.5rem',   // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    full: '9999px',   // Circle
};

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 4px 12px rgba(0, 0, 0, 0.1)',
    md: '0 8px 20px rgba(0, 0, 0, 0.12)',
    lg: '0 12px 30px rgba(0, 0, 0, 0.15)',
    xl: '0 20px 60px rgba(0, 0, 0, 0.2)',

    // Colored shadows for specific themes
    colored: {
        primary: '0 8px 20px rgba(99, 102, 241, 0.4)',
        success: '0 8px 20px rgba(16, 185, 129, 0.4)',
        warning: '0 8px 20px rgba(245, 158, 11, 0.4)',
        error: '0 8px 20px rgba(239, 68, 68, 0.4)',
    },
};

// ============================================================================
// GLASSMORPHISM EFFECTS
// ============================================================================

export const glassmorphism = {
    light: {
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    medium: {
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(15px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
    },
    dark: {
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
    },
};

// ============================================================================
// ANIMATIONS
// ============================================================================

export const animations = {
    duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
    },

    easing: {
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },

    // Framer Motion variants
    framer: {
        fadeIn: {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
        },
        slideUp: {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -20 },
        },
        slideDown: {
            initial: { opacity: 0, y: -20 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: 20 },
        },
        scaleIn: {
            initial: { opacity: 0, scale: 0.9 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.9 },
        },
    },
};

// ============================================================================
// BREAKPOINTS (Responsive Design)
// ============================================================================

export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
};

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================

export const zIndex = {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
};

// ============================================================================
// EXPORT DEFAULT THEME
// ============================================================================

export const theme = {
    modules: moduleThemes,
    colors: {
        ...neutralColors,
        semantic: semanticColors,
    },
    typography,
    spacing,
    borderRadius,
    shadows,
    glassmorphism,
    animations,
    breakpoints,
    zIndex,
};

export type Theme = typeof theme;

export default theme;
