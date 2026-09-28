const { defineConfig } = require('cypress');
const dotenv = require('dotenv');

// Load environment variables from .env file if it exists
dotenv.config();

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'https://automationintesting.online',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    viewportWidth: 1366,
    viewportHeight: 900,
    defaultCommandTimeout: 10000,
    video: false,
    retries: { runMode: 1, openMode: 0 },
    env: {
      apiUrl: process.env.CYPRESS_API_URL || 'https://automationintesting.online/api',
      adminUser: process.env.CYPRESS_ADMIN_USER || 'admin',
      adminPassword: process.env.CYPRESS_ADMIN_PASSWORD || 'password',
    },
    reporter: 'mochawesome',
    reporterOptions: {
      reportDir: 'cypress/reports',
      overwrite: false,
      html: true,
      json: true,
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
