import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port:3000,
        proxy: {
            '/api': 'http://localhost:5173',
        },
    },
	resolve: {
        alias: {
            $components: '/src/components',
            $stores: '/src/stores'
        }
    }
});
