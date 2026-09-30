/// <reference types="cypress" />

const api = () => Cypress.env('apiUrl');

const bodyList = (body, key) => (Array.isArray(body) ? body : (body && body[key]) || []);

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

// NB (Sep 2026): the live demo moved to Next.js + Railway and stopped sending the
// `Set-Cookie: token=...` header on /api/auth/login, so Cypress can no longer rely
// on the cookie being stored automatically. We mirror the pytest suite instead:
// read the token from the response body and send it explicitly as a Cookie header.
Cypress.Commands.add('adminLogin', () => {
  return cy
    .request('POST', `${api()}/auth/login`, {
      username: Cypress.env('adminUser'),
      password: Cypress.env('adminPassword'),
    })
    .then((res) => {
      expect(res.status, 'login status').to.eq(200);
      const token = res.body && res.body.token;
      expect(token, 'login response must contain a token').to.be.a('string').and.not.be.empty;
      Cypress.env('adminToken', token);
      return token;
    });
});

// Cookie header for admin requests; empty when no token has been fetched yet.
const adminCookie = () => {
  const token = Cypress.env('adminToken');
  return token ? { Cookie: `token=${token}` } : {};
};

/* ------------------------------------------------------------------ */
/* Admin API                                                           */
/* ------------------------------------------------------------------ */

Cypress.Commands.add('adminCreateRoom', (room) => {
  return cy
    .adminLogin()
    .then(() =>
      cy.request({
        method: 'POST',
        url: `${api()}/room`,
        body: room,
        headers: adminCookie(),
        failOnStatusCode: false,
      })
    )
    .then((res) => {
      // 200 on the public site, 201 in the room service (OBS-03)
      expect([200, 201], 'create room status').to.include(res.status);
    })
    // the response shape differs between versions -> find the created room by its unique name
    .then(() =>
      cy.userGetRooms().then((rooms) => {
        const created = rooms.find((r) => r.roomName === room.roomName);
        expect(created, `room ${room.roomName} exists`).to.exist;
        return created;
      })
    );
});

Cypress.Commands.add('adminUpdateRoom', (roomid, room) => {
  return cy.adminLogin().then(() =>
    cy.request({
      method: 'PUT',
      url: `${api()}/room/${roomid}`,
      body: { roomid, ...room },
      headers: adminCookie(),
      failOnStatusCode: false,
    })
  );
});

Cypress.Commands.add('adminGetBookings', (roomid) => {
  return cy.adminLogin().then(() =>
    cy
      .request({
        url: `${api()}/booking?roomid=${roomid}`,
        headers: adminCookie(),
        failOnStatusCode: false,
      })
      .then((res) => {
        expect(res.status).to.eq(200);
        return res.body.bookings;
      })
  );
});

// Deletes the bookings of the room first: on the shared demo site bookings survive the
// deletion of their room and a re-used room id would show leftovers of another test.
Cypress.Commands.add('adminDeleteRoom', (roomid) => {
  return cy
    .adminLogin()
    .then(() =>
      cy.request({
        url: `${api()}/booking?roomid=${roomid}`,
        headers: adminCookie(),
        failOnStatusCode: false,
      })
    )
    .then((res) => {
      const bookings = res.status === 200 ? bodyList(res.body, 'bookings') : [];
      bookings.forEach((b) =>
        cy.request({
          method: 'DELETE',
          url: `${api()}/booking/${b.bookingid}`,
          headers: adminCookie(),
          failOnStatusCode: false,
        })
      );
    })
    .then(() =>
      cy.request({
        method: 'DELETE',
        url: `${api()}/room/${roomid}`,
        headers: adminCookie(),
        failOnStatusCode: false,
      })
    );
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

Cypress.Commands.add('userBookRoom', (booking, options = {}) => {
  cy.clearCookies();
  return cy.request({
    method: 'POST',
    url: `${api()}/booking`,
    body: booking,
    failOnStatusCode: false,
    timeout: options.timeout || 30000,
  });
});

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
