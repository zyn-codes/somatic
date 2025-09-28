import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      // Babel options for better error handling
      babel: {
        plugins: [
          mode === 'development' && [
            '@babel/plugin-transform-react-jsx-source',
            { runtime: 'automatic' }
          ]
        ].filter(Boolean)
      }
    })
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        timeout: 30000,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('proxy error', err);
            res.writeHead(500, {
              'Content-Type': 'text/plain',
            });
            res.end('Something went wrong with the proxy');
          });
        }
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        timeout: 30000
      },
    },
    hmr: {
      overlay: true
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          form: ['react-phone-number-input'],
        }
      }
    },
    // Improve build performance
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  // Better error handling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  },
  // Environment variables validation
  env: {
    VITE_API_BASE: process.env.VITE_API_BASE || '',
  }
}))