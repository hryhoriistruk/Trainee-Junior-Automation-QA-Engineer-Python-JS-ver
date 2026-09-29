/// <reference types="cypress" />

class ReservationPage {
  constructor() {
    this.reserveButton = '#doReservation';
    this.firstnameInput = 'input[name="firstname"]';
    this.lastnameInput = 'input[name="lastname"]';
    this.emailInput = 'input[name="email"]';
    this.phoneInput = 'input[name="phone"]';
    this.alertDanger = '.alert.alert-danger';
    this.calendarEvent = '.rbc-month-view .rbc-event';
  }

  visit(roomId, dates) {
    const query = `checkin=${dates.checkin}&checkout=${dates.checkout}`;
    cy.visit(`/reservation/${roomId}?${query}`);
    cy.get(this.reserveButton).should('be.visible');
    return this;
  }

  openBookingForm() {
    cy.get(this.reserveButton).click();
    cy.get(this.firstnameInput).should('be.visible');
    return this;
  }

  fillBookingForm(data) {
    const fields = {
      firstname: this.firstnameInput,
      lastname: this.lastnameInput,
      email: this.emailInput,
      phone: this.phoneInput,
    };

    Object.entries(fields).forEach(([name, selector]) => {
      cy.get(selector).clear();
      if (data[name]) {
        cy.get(selector).type(data[name]);
      }
    });
    return this;
  }

  // The form's "Reserve Now" button (the one under the calendar has the id #doReservation).
  // NB: ':has-text()' is a Playwright selector and does not exist in Cypress - use cy.contains().
  submitBooking() {
    cy.contains('button:not(#doReservation)', 'Reserve Now').click();
    return this;
  }

  assertBookingConfirmed(dates) {
    cy.contains('h2', 'Booking Confirmed').should('be.visible');
    cy.contains('strong', `${dates.checkin} - ${dates.checkout}`).should('be.visible');
    return this;
  }

  assertValidationError(errorPattern) {
    cy.get(this.alertDanger).should('be.visible');
    // NB: chai's 'contain.text' does not accept a RegExp - compare the alert text with 'match'
    const pattern = errorPattern instanceof RegExp ? errorPattern : new RegExp(errorPattern, 'i');
    cy.get(this.alertDanger).invoke('text').should('match', pattern);
    cy.contains('Booking Confirmed').should('not.exist');
    cy.get(this.firstnameInput).should('be.visible');
    return this;
  }

  goToNextMonth() {
    cy.contains('.rbc-toolbar button', 'Next').click();
    return this;
  }

  assertCalendarHasEvent(text) {
    cy.get(this.calendarEvent).should('contain.text', text);
    return this;
  }
}

export default ReservationPage;
