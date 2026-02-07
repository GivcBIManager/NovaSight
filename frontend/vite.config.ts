import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['host.docker.internal', 'localhost', 'frontend'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunk
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Animation libraries
          motion: ['framer-motion'],
          // Marketing pages bundle (lazy loaded)
          marketing: [
            './src/pages/marketing/HomePage.tsx',
            './src/pages/marketing/FeaturesPage.tsx',
            './src/pages/marketing/SolutionsPage.tsx',
            './src/pages/marketing/PricingPage.tsx',
            './src/pages/marketing/AboutPage.tsx',
            './src/pages/marketing/ContactPage.tsx',
          ],
          // Marketing components
          'marketing-components': [
            './src/components/marketing/sections/FeatureShowcase.tsx',
            './src/components/marketing/sections/BentoFeatures.tsx',
            './src/components/marketing/sections/HowItWorks.tsx',
            './src/components/marketing/sections/MetricsSection.tsx',
            './src/components/marketing/sections/TestimonialsCarousel.tsx',
            './src/components/marketing/sections/ComparisonTable.tsx',
            './src/components/marketing/sections/PricingCards.tsx',
          ],
        },
      },
    },
    // Increase chunk size warning limit for marketing bundle
    chunkSizeWarningLimit: 800,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'e2e/**'],
  },
})
