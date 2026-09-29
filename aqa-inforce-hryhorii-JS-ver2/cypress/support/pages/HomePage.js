/// <reference types="cypress" />

class HomePage {
  // The hero banner also has a "Book Now" button (href="#booking"); we want the room card link.
  // cy.contains() is case-sensitive and ':has-text()' is Playwright-only, so it is not used here.
  getBookNowLink() {
    return cy.contains('a.btn[href^="/reservation/"]', 'Book now');
  }

  visit() {
    cy.visit('/');
    return this;
  }

  clickBookNow() {
    this.getBookNowLink().click();
    return this;
  }

  assertBookNowLinkHasDates() {
    this.getBookNowLink()
      .should('have.attr', 'href')
      .and('match', /^\/reservation\/\d+\?checkin=\d{4}-\d{2}-\d{2}&checkout=\d{4}-\d{2}-\d{2}$/);
    return this;
  }
}

export default HomePage;
