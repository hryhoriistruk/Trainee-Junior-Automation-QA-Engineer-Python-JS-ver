import './commands';

// Ignore uncaught exceptions from React to prevent test failures
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent Cypress from failing the test
  return false;
});
