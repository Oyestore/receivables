/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                    50: 'hsl(250, 100%, 97%)',
                    100: 'hsl(250, 95%, 93%)',
                    200: 'hsl(250, 90%, 85%)',
                    300: 'hsl(250, 85%, 75%)',
                    400: 'hsl(250, 82%, 65%)',
                    500: 'hsl(250, 80%, 60%)',
                    600: 'hsl(250, 78%, 50%)',
                    700: 'hsl(250, 75%, 40%)',
                    800: 'hsl(250, 72%, 30%)',
                    900: 'hsl(250, 70%, 20%)',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                success: {
                    light: 'hsl(142, 76%, 45%)',
                    DEFAULT: 'hsl(142, 76%, 36%)',
                    dark: 'hsl(142, 76%, 25%)',
                    foreground: 'hsl(0, 0%, 100%)',
                },
                warning: {
                    light: 'hsl(38, 92%, 50%)',
                    DEFAULT: 'hsl(25, 95%, 53%)',
                    dark: 'hsl(25, 95%, 40%)',
                    foreground: 'hsl(0, 0%, 100%)',
                },
                danger: {
                    light: 'hsl(0, 84%, 60%)',
                    DEFAULT: 'hsl(0, 72%, 51%)',
                    dark: 'hsl(0, 72%, 40%)',
                    foreground: 'hsl(0, 0%, 100%)',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
                'slide-in-right': {
                    from: { transform: 'translateX(4rem)', opacity: '0' },
                    to: { transform: 'translateX(0)', opacity: '1' },
                },
                'slide-in-bottom': {
                    from: { transform: 'translateY(2rem)', opacity: '0' },
                    to: { transform: 'translateY(0)', opacity: '1' },
                },
                'fade-in': {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                pulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                },
                'spin-slow': {
                    from: { transform: 'rotate(0deg)' },
                    to: { transform: 'rotate(360deg)' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'slide-in-right': 'slide-in-right 0.3s ease-out',
                'slide-in-bottom': 'slide-in-bottom 0.3s ease-out',
                'fade-in': 'fade-in 0.2s ease-out',
                'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'spin-slow': 'spin-slow 3s linear infinite',
                'float': 'float 6s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },
        },
    },
    plugins: [],
}
