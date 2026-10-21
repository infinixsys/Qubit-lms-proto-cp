import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
export default defineConfig({
  testDir: "./tests",
  timeout: 90000,
  workers: 1,
  reporter: "list",
  use: {
    headless: true,
    actionTimeout: 10000,
    launchOptions: {
      ...(existsSync("/usr/bin/chromium")
        ? { executablePath: "/usr/bin/chromium" }
        : {}),
      args: ["--no-sandbox"],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "npm run build --prefix ../Qubit-lms-proto-app && npm run preview --prefix ../Qubit-lms-proto-app -- --port 4174",
      url: "http://localhost:4174",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: "npm run start",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: "npm run dev --prefix ../Qubit-lms-proto-app",
      url: "http://localhost:5174",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
