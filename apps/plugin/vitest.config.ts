import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "bookmarklet/**/*.test.ts"],
    environment: "node",
  },
});
