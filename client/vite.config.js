import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    preview: {
        host: '0.0.0.0',
        port: process.env.VITE_PORT || 4173,
        allowedHosts: [process.env.VITE_ALLOWED_HOST || 'localhost'],
    },
});