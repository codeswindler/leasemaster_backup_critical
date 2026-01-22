import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    minify: 'esbuild', // Fast and efficient minification
    sourcemap: false, // Disable sourcemaps in production for smaller builds
    cssCodeSplit: true, // Split CSS into separate chunks
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep ALL React and React-dependent packages in main bundle
          // This ensures React is always available before anything tries to use it
          
          // React core - MUST be in main bundle
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return undefined; // Keep in main bundle
          }
          
          // All React-dependent libraries stay in main bundle to ensure React is loaded first
          if (id.includes('@tanstack/react-query') ||
              id.includes('@radix-ui') ||
              id.includes('lucide-react') ||
              id.includes('react-icons') ||
              id.includes('recharts') ||
              id.includes('react-hook-form') ||
              id.includes('@hookform') ||
              id.includes('framer-motion') ||
              id.includes('wouter')) {
            return undefined; // Keep in main bundle
          }
          
          // Only truly non-React dependencies go in vendor chunk
          if (id.includes('node_modules') && 
              !id.includes('react') && 
              !id.includes('react-dom')) {
            return 'vendor';
          }
        },
        // Ensure proper chunk loading order
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 500, // Warn if chunks exceed 500KB (aggressive optimization)
    target: 'es2020', // Modern browsers for smaller bundles
    reportCompressedSize: false, // Faster builds (don't calculate gzip sizes during build)
    cssMinify: 'esbuild', // Faster CSS minification
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
