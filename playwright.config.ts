import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/features",
  testMatch: "**/*.browser.test.ts",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3107", viewport: { width: 1440, height: 1000 }, trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3107",
    url: "http://127.0.0.1:3107/login",
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:3107/api-test/v1",
      NEXT_PUBLIC_REVERB_APP_KEY: "test-key",
      NEXT_PUBLIC_REVERB_HOST: "127.0.0.1",
      NEXT_PUBLIC_REVERB_PORT: "3107",
      NEXT_PUBLIC_REVERB_SCHEME: "http",
    },
    timeout: 120_000,
  },
});
