import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          documents: ["pdfjs-dist"],
        },
      },
    },
  },
  preview: {
    port: 7311,
    strictPort: true,
  },
  server: {
    host: "0.0.0.0",
    port: 7311,
    strictPort: true,
    proxy: { "/api": { target: "http://127.0.0.1:7310", changeOrigin: true } },
  },
});
