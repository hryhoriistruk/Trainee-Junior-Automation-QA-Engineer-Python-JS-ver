import './commands';

// The demo site throws React hydration errors (#418/#423/#425) on page load. They are an
// application problem that does not affect the flows under test, so ONLY those are ignored.
// Any other uncaught application error still fails the test.
const KNOWN_HYDRATION_ERROR = /Minified React error #(418|423|425)|hydrat/i;

Cypress.on('uncaught:exception', (err) => {
  if (KNOWN_HYDRATION_ERROR.test(err.message)) {
    return false;
  }
  return undefined;
});
