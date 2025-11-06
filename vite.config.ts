import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['Chrome >= 88'], // OBS CEF version compatibility
      modernPolyfills: true
    })
  ],
  
  // Build configuration
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production'
      }
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          'google-apis': ['googleapis'],
          'obs-websocket': ['obs-websocket-js']
        }
      }
    }
  },

  // Development server
  server: {
    port: 3000,
    host: true,
    cors: true
  },

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@integrations': resolve(__dirname, 'src/integrations'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@data': resolve(__dirname, 'src/data'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  },

  // Node.js polyfills for browser compatibility
  define: {
    global: 'globalThis',
    __DEV__: process.env.NODE_ENV !== 'production',
    __PROD__: process.env.NODE_ENV === 'production'
  },

  optimizeDeps: {
    include: ['googleapis'],
    exclude: ['googleapis/build/src/apis']
  },

  // CSS configuration
  css: {
    devSourcemap: true
  }
});
