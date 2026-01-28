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
          if (!id.includes("node_modules")) return undefined;

          // Core framework - keep in main bundle to guarantee availability
          if (id.includes("node_modules/react")) return undefined;
          if (id.includes("node_modules/react-dom")) return undefined;

          // UI/runtime-heavy libraries
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("lucide-react") || id.includes("react-icons")) return "icons";
          if (id.includes("react-hook-form") || id.includes("@hookform")) return "forms";
          if (id.includes("@tanstack/react-query")) return "react-query";
          if (id.includes("wouter")) return "router";
          if (id.includes("date-fns") || id.includes("react-day-picker")) return "dates";

          // Reporting/exports
          if (id.includes("recharts")) return "charts";
          if (id.includes("jspdf") || id.includes("jspdf-autotable")) return "pdf";
          if (id.includes("exceljs")) return "excel";

          // Tailwind utility helpers (used across UI)
          if (
            id.includes("class-variance-authority") ||
            id.includes("clsx") ||
            id.includes("tailwind-merge") ||
            id.includes("tailwindcss-animate") ||
            id.includes("tw-animate-css")
          ) {
            return "ui-utils";
          }

          // Fallback: avoid one giant vendor chunk by grouping by package
          const modulePath = id.split("node_modules/")[1];
          if (!modulePath) return "vendor";
          const parts = modulePath.split("/");
          const pkgName = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
          return `vendor-${pkgName.replace("@", "").replace("/", "-")}`;
        },
        // Ensure proper chunk loading order
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
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
