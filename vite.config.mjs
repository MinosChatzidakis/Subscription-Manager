// vite.config.mjs
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // Ensures assets load correctly from local relative paths
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
  },
});
