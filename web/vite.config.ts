import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies /api to the Spring Boot backend.
// Override the target with VITE_API_TARGET (defaults to http://localhost:8088).
const apiTarget = process.env.VITE_API_TARGET || "http://localhost:8088";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into separate, cacheable chunks
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          mantine: [
            "@mantine/core", "@mantine/hooks", "@mantine/form",
            "@mantine/notifications", "@mantine/modals", "@mantine/dates",
          ],
          charts: ["@mantine/charts", "recharts"],
        },
      },
    },
  },
});
