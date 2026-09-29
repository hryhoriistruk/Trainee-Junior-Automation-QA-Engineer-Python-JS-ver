/// <reference types="cypress" />

const api = () => Cypress.env('apiUrl');

const bodyList = (body, key) => (Array.isArray(body) ? body : (body && body[key]) || []);

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

// cy.request stores the returned `token` cookie, so the following admin requests are
// authorised automatically. Cypress clears cookies before each test and the user commands
// clear them on purpose, therefore every admin command logs in first (cheap call).
Cypress.Commands.add('adminLogin', () => {
  cy.request('POST', `${api()}/auth/login`, {
    username: Cypress.env('adminUser'),
    password: Cypress.env('adminPassword'),
  })
    .its('status')
    .should('eq', 200);
});

/* ------------------------------------------------------------------ */
/* Admin API                                                           */
/* ------------------------------------------------------------------ */

Cypress.Commands.add('adminCreateRoom', (room) => {
  cy.adminLogin();
  cy.request({ method: 'POST', url: `${api()}/room`, body: room }).then((res) => {
    // 200 on the public site, 201 in the room service (OBS-03)
    expect([200, 201], 'create room status').to.include(res.status);
  });
  // the response shape differs between versions -> find the created room by its unique name
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
    failOnStatusCode: false,
  });
});

Cypress.Commands.add('adminGetBookings', (roomid) => {
  cy.adminLogin();
  return cy.request(`${api()}/booking?roomid=${roomid}`).then((res) => {
    expect(res.status).to.eq(200);
    return res.body.bookings;
  });
});

// Deletes the bookings of the room first: on the shared demo site bookings survive the
// deletion of their room and a re-used room id would show leftovers of another test.
Cypress.Commands.add('adminDeleteRoom', (roomid) => {
  cy.adminLogin();
  cy.request({ url: `${api()}/booking?roomid=${roomid}`, failOnStatusCode: false }).then(
    (res) => {
      const bookings = res.status === 200 ? bodyList(res.body, 'bookings') : [];
      bookings.forEach((b) =>
        cy.request({
          method: 'DELETE',
          url: `${api()}/booking/${b.bookingid}`,
          failOnStatusCode: false,
        })
      );
    }
  );
  return cy.request({
    method: 'DELETE',
    url: `${api()}/room/${roomid}`,
    failOnStatusCode: false,
  });
});

/* ------------------------------------------------------------------ */
/* User API (no authorisation - cookies are cleared first)             */
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

// The feed the calendar is built from. It answers { report: [...] } on the live site
// (OBS-05) - both shapes are supported.
Cypress.Commands.add('userGetRoomReport', (roomid) => {
  cy.clearCookies();
  return cy.request(`${api()}/report/room/${roomid}`).then((res) => {
    expect(res.status).to.eq(200);
    return bodyList(res.body, 'report');
  });
});

/* ------------------------------------------------------------------ */
/* UI helpers                                                          */
/* ------------------------------------------------------------------ */

// Opens the reservation page with preselected dates (the same URL the "Book now" button
// builds) - reliable, unlike a synthetic mouse-drag on react-big-calendar (see TC-UI-09).
Cypress.Commands.add('visitReservation', (roomid, dates) => {
  cy.visit(`/reservation/${roomid}?checkin=${dates.checkin}&checkout=${dates.checkout}`);
  cy.get('#doReservation').should('be.visible');
});

Cypress.Commands.add('openBookingForm', () => {
  cy.get('#doReservation').click();
  cy.get('input[name="firstname"]').should('be.visible');
});

Cypress.Commands.add('fillBookingForm', (data) => {
  ['firstname', 'lastname', 'email', 'phone'].forEach((name) => {
    cy.get(`input[name="${name}"]`).clear();
    if (data[name]) cy.get(`input[name="${name}"]`).type(data[name]);
  });
});

// "Reserve Now" of the form (the one under the calendar has id #doReservation)
Cypress.Commands.add('submitBooking', () => {
  cy.get('button:contains("Reserve Now"):not(#doReservation)').click();
});
