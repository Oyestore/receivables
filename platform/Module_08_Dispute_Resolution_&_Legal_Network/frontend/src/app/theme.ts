import { createTheme } from '@mui/material/styles';

// Premium dark theme matching Module 07 design system
export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: 'hsl(210, 100%, 56%)', // Electric Blue
            dark: 'hsl(210, 100%, 45%)',
            light: 'hsl(210, 100%, 70%)',
        },
        secondary: {
            main: 'hsl(280, 100%, 65%)', // Purple Accent
            dark: 'hsl(280, 100%, 55%)',
            light: 'hsl(280, 100%, 75%)',
        },
        success: {
            main: 'hsl(142, 71%, 45%)',
        },
        warning: {
            main: 'hsl(45, 100%, 51%)',
        },
        error: {
            main: 'hsl(0, 84%, 60%)',
        },
        background: {
            default: 'hsl(220, 18%, 10%)', // Dark navy
            paper: 'hsl(220, 15%, 15%)',   // Card background
        },
        text: {
            primary: 'hsl(0, 0%, 95%)',
            secondary: 'hsl(0, 0%, 70%)',
            disabled: 'hsl(0, 0%, 50%)',
        },
        divider: 'hsl(220, 15%, 25%)',
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 600,
            fontSize: '2.5rem',
        },
        h2: {
            fontWeight: 600,
            fontSize: '2rem',
        },
        h3: {
            fontWeight: 600,
            fontSize: '1.75rem',
        },
        h4: {
            fontWeight: 600,
            fontSize: '1.5rem',
        },
        h5: {
            fontWeight: 600,
            fontSize: '1.25rem',
        },
        h6: {
            fontWeight: 600,
            fontSize: '1rem',
        },
        button: {
            textTransform: 'none',
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: 'hsl(220, 15%, 15%)',
                    border: '1px solid hsl(220, 15%, 20%)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        backgroundColor: 'hsl(220, 15%, 17%)',
                        borderColor: 'hsl(220, 15%, 30%)',
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 16px',
                    transition: 'all 0.2s ease',
                },
                contained: {
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    '&:hover': {
                        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                },
            },
        },
    },
});
