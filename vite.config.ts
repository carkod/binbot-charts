import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config for the DEMO only (not library build)
// Library is built with tsup
export default defineConfig({
  plugins: [react()],
  root: ".",
  publicDir: "public",
  server: {
    port: 3000,
  },
});
