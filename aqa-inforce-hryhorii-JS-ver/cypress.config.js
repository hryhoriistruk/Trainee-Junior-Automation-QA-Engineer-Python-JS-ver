const { defineConfig } = require('cypress');
const dotenv = require('dotenv');

// Optional local overrides (.env is git-ignored, .env.example is the template)
dotenv.config();

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://automationintesting.online',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    viewportWidth: 1366,
    viewportHeight: 900,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    video: false,
    screenshotOnRunFailure: true,
    // One retry in CI-style runs only; every test creates its own room, so a retry is always safe.
    retries: { runMode: 1, openMode: 0 },
    env: {
      apiUrl: process.env.CYPRESS_API_URL || 'https://automationintesting.online/api',
      adminUser: process.env.CYPRESS_ADMIN_USER || 'admin',
      adminPassword: process.env.CYPRESS_ADMIN_PASSWORD || 'password',
    },
  },
});
