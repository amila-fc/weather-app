import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

/** Kept in sync with the backend cache TTL and the localStorage cache. */
const WEATHER_API_CACHE_SECONDS = 5 * 60
const OSM_TILE_CACHE_SECONDS = 60 * 24 * 60 * 60

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isTest = mode === 'test'
  const isProductionBuild = mode === 'production' || mode === 'analyze'

  return {
    plugins: [
      react(),
      // Production-only: the plugin injects the registration script into the built index.html and is inert
      // in dev and in Vitest, so no test (or dev server) ever registers a worker.
      !isTest &&
        VitePWA({
          registerType: 'autoUpdate',
          injectRegister: 'auto',
          manifest: {
            name: 'Weather App',
            short_name: 'Weather',
            description: 'Current weather, 24-hour trends and location comparison.',
            theme_color: '#1f2937',
            background_color: '#f7f9fb',
            display: 'standalone',
            start_url: '/',
            icons: [{ src: '/vite.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
          },
          workbox: {
            // App shell, icons and copy are precached, so a reload while offline still boots the SPA.
            globPatterns: ['**/*.{js,css,html,svg,woff2}'],
            // The bundle analyse report is a local artefact, never part of the shipped cache.
            globIgnores: ['**/stats.html'],
            navigateFallback: 'index.html',
            navigateFallbackDenylist: [/^\/api\//],
            cleanupOutdatedCaches: true,
            runtimeCaching: [
              {
                urlPattern: ({ url }) => url.pathname.startsWith('/api/weather'),
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'weather-api',
                  networkTimeoutSeconds: 3,
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: WEATHER_API_CACHE_SECONDS,
                  },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                urlPattern: /^https:\/\/tile\.openstreetmap\.org\//,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'osm-tiles',
                  expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: OSM_TILE_CACHE_SECONDS,
                  },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
            ],
          },
        }),
      // Every production build emits the interactive size report; `npm run analyze` adds the budget gate.
      isProductionBuild &&
        visualizer({          filename: 'dist/stats.html',
          template: 'treemap',
          gzipSize: true,
          open: false,
        }),
    ],
    esbuild: isProductionBuild ? { drop: ['console', 'debugger'] } : {},
    build: {
      target: 'es2020',
      manifest: true,
      // The weather icons stay real files: inlining them as data URIs would make the placeholder -> image
      // swap and the viewport gating in ProgressiveImage purely decorative.
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          // Granular vendor groups keep the React runtime cached while the app code changes. A function is
          // used instead of the object form so CJS dependencies (react-dom, scheduler) land with their owner.
          manualChunks: (id: string) => {
            const moduleId = id.split('\\').join('/');
            if (!moduleId.includes('/node_modules/')) {
              return undefined;
            }
            if (moduleId.includes('leaflet')) {
              return 'leaflet';
            }
            if (moduleId.includes('/node_modules/@tanstack/')) {
              return 'tanstack';
            }
            if (/\/(react|react-dom|scheduler)\//.test(moduleId)) {
              return 'react';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          // The backend serves its endpoints under /api, so the prefix must be forwarded as-is.
          target: 'http://localhost:8080',
          changeOrigin: true
        }
      }
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      globals: true,
      css: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'html', 'lcov'],
        reportsDirectory: 'coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/vite-env.d.ts', 'src/main.tsx'],
      }
    }
  }
})
