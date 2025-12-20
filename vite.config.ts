import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for the DEMO only (not library build)
// Library is built with tsup
export default defineConfig({
  plugins: [react()],
  root: ".",
  publicDir: "public",
  server: {
    port: 3001,
    proxy: {
      "/binance": {
        target: "https://api.binance.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/binance/, ""),
      },
      "/kucoin": {
        target: "https://api.kucoin.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/kucoin/, ""),
      },
    },
  },
});
