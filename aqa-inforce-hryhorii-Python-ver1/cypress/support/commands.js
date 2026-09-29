/// <reference types="cypress" />

const api = () => Cypress.env('apiUrl');

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

// cy.request stores the returned `token` cookie, so following admin
// requests are authorised automatically. Cypress clears cookies before
// each test, therefore admin commands log in every time (cheap call).
Cypress.Commands.add('adminLogin', () => {
  cy.request('POST', `${api()}/auth/login`, {
    username: Cypress.env('adminUser'),
    password: Cypress.env('adminPassword'),
  }).its('status').should('eq', 200);
});

/* ------------------------------------------------------------------ */
/* Admin API                                                           */
/* ------------------------------------------------------------------ */

Cypress.Commands.add('adminCreateRoom', (room) => {
  cy.adminLogin();
  cy.request({ method: 'POST', url: `${api()}/room`, body: room })
    .its('status')
    .should('eq', 201);
  // API response shape differs between versions -> find created room by unique name
  return cy.userGetRooms().then((rooms) => {
    const created = rooms.find((r) => r.roomName === room.roomName);
    expect(created, `room ${room.roomName} exists`).to.exist;
    return created;
  });
});

Cypress.Commands.add('adminUpdateRoom', (roomid, room) => {
  cy.adminLogin();
  return cy.request({
    method: 'PUT',
    url: `${api()}/room/${roomid}`,
    body: { roomid, ...room },
  });
});

Cypress.Commands.add('adminDeleteRoom', (roomid) => {
  cy.adminLogin();
  return cy.request({
    method: 'DELETE',
    url: `${api()}/room/${roomid}`,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('adminGetBookings', (roomid) => {
  cy.adminLogin();
  return cy
    .request(`${api()}/booking?roomid=${roomid}`)
    .then((res) => {
      expect(res.status).to.eq(200);
      return res.body.bookings;
    });
});

/* ------------------------------------------------------------------ */
/* User API (no authorisation – cookies are cleared first)             */
/* ------------------------------------------------------------------ */

Cypress.Commands.add('userGetRooms', () => {
  cy.clearCookies();
  return cy.request(`${api()}/room`).then((res) => {
    expect(res.status).to.eq(200);
    return res.body.rooms;
  });
});

Cypress.Commands.add('userBookRoom', (booking) => {
  cy.clearCookies();
  return cy.request({
    method: 'POST',
    url: `${api()}/booking`,
    body: booking,
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('userGetBookingSummary', (roomid) => {
  cy.clearCookies();
  return cy.request(`${api()}/booking/summary?roomid=${roomid}`).then((res) => {
    expect(res.status).to.eq(200);
    return res.body.bookings;
  });
});

/* ------------------------------------------------------------------ */
/* UI helpers                                                          */
/* ------------------------------------------------------------------ */

/**
 * Drag-selects days on the react-big-calendar of the reservation page.
 * Goes to the NEXT month first (guarantees future dates) and drags inside
 * the 2nd week row, cells [fromIdx .. toIdx].
 */
Cypress.Commands.add('selectDatesOnCalendar', (fromIdx = 2, toIdx = 4) => {
  cy.contains('button', 'Next').click();
  const cell = (i) => cy.get('.rbc-month-row').eq(1).find('.rbc-day-bg').eq(i);
  cell(fromIdx).trigger('mousedown', { button: 0, force: true });
  cell(toIdx).trigger('mousemove', { force: true });
  cell(toIdx).trigger('mouseup', { force: true });
});

Cypress.Commands.add('fillBookingForm', (data) => {
  const fields = ['firstname', 'lastname', 'email', 'phone'];
  fields.forEach((name) => {
    cy.get(`input[name="${name}"]`).clear();
    if (data[name]) cy.get(`input[name="${name}"]`).type(data[name]);
  });
});
