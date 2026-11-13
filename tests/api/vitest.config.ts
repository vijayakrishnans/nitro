import { defineConfig } from "vitest/config";
import * as path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../apps/api/server"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // beforeAll builds the app with Nitro (a few seconds on a cold cache).
    hookTimeout: 120_000,
  },
});
