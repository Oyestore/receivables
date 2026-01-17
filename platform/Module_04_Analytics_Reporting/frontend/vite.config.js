import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3004,
        proxy: {
            '/api': {
                target: 'http://localhost:3004',
                changeOrigin: true,
            },
            '/intelligence': {
                target: 'http://localhost:3004',
                ws: true, // Enable WebSocket proxying
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
