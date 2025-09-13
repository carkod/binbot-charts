import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/main.tsx", "!./src/charting-library"],
  format: ["cjs", "esm"], // Build for commonJS and ESmodules
  dts: true, // Generate declaration file (.d.ts)
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
});
