import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "tests/**",
        "**/*.test.{ts,tsx}",
        "**/*.config.{ts,js}",
        ".next/**",
        "vitest.setup.ts",
        "next-env.d.ts",
        "instrumentation-client.ts",
        // Exclude build and config files
        "postcss.config.mjs",
        "tailwind.config.js",
        // Exclude specific directories that don't need testing
        "app/globals.css",
        "public/**",
      ],
      include: [
        "lib/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "server/**/*.{ts,tsx}",
        "hooks/**/*.{ts,tsx}",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
