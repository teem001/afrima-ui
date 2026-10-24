import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom", "@tanstack/react-query", "zustand"],
          map: ["leaflet", "react-leaflet"],
        },
      },
    },
  },
  server: {
    // 5174 avoids clash with other local Vite apps that often take 5173.
    port: 5174,
    strictPort: true,
    proxy: {
      "/ws": {
        target: "http://127.0.0.1:8087",
        ws: true,
        changeOrigin: true,
      },
      "/api": {
        target: "http://127.0.0.1:8087",
        changeOrigin: true,
      },
      "/actuator": {
        target: "http://127.0.0.1:8087",
        changeOrigin: true,
      },
    },
  },
});
