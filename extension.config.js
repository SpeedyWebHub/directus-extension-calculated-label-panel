import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: true,       // Generates source maps for better stack traces
    minify: false,         // Prevents code obfuscation
    target: 'esnext',      // More readable output
  },
  define: {
    'process.env.NODE_ENV': '"development"',
  },
});
