import './commands';

// BUG-02 (see test-cases.txt): the demo app throws a React hydration error (#418) on page
// load. The page still works, so this one error is ignored; every other uncaught application
// error still fails the test.
Cypress.on('uncaught:exception', (err) => {
  if (/Minified React error #418|Hydration failed/i.test(err.message)) {
    return false;
  }
  return true;
});
