/// <reference types="cypress" />
import { reportEntries } from './utils';

/**
 * How authentication works on https://automationintesting.online (verified in the app source):
 *   - POST /api/auth/login returns 200 {"token": "..."} in the JSON BODY (no Set-Cookie header),
 *   - the browser app then stores it in a cookie called `token`,
 *   - every protected endpoint reads that cookie and answers 401 "Authentication required" when
 *     it is missing.
 * So for cy.request() the token must be sent explicitly as `Cookie: token=<token>`.
 */

const api = () => Cypress.env('apiUrl');
const authHeaders = (token) => ({ Cookie: `token=${token}` });

/* ------------------------------------------------------------------ */
/* Admin API                                                           */
/* ------------------------------------------------------------------ */

/** Logs in as admin and yields the token string. */
Cypress.Commands.add('adminLogin', () => {
  return cy
    .request({
      method: 'POST',
      url: `${api()}/auth/login`,
      body: { username: Cypress.env('adminUser'), password: Cypress.env('adminPassword') },
    })
    .then((res) => {
      expect(res.status, 'login status').to.eq(200);
      expect(res.body.token, 'login token').to.be.a('string').and.not.be.empty;
      return res.body.token;
    });
});

/**
 * Creates a room and yields the created room object (including `roomid`).
 * POST /api/room only answers {"success": true}, so the room is looked up by its unique name.
 */
Cypress.Commands.add('adminCreateRoom', (room) => {
  return cy.adminLogin().then((token) => {
    return cy
      .request({ method: 'POST', url: `${api()}/room`, body: room, headers: authHeaders(token) })
      .then((res) => {
        expect(res.status, 'create room status').to.be.oneOf([200, 201]);
        return cy.request(`${api()}/room`).then((list) => {
          const created = list.body.rooms.find((r) => r.roomName === room.roomName);
          expect(created, `room "${room.roomName}" exists in the room list`).to.exist;
          return created;
        });
      });
  });
});

/** Yields the raw response so the test can assert on status and body. */
Cypress.Commands.add('adminUpdateRoom', (roomid, room) => {
  return cy.adminLogin().then((token) => {
    return cy.request({
      method: 'PUT',
      url: `${api()}/room/${roomid}`,
      body: { roomid, ...room },
      headers: authHeaders(token),
      failOnStatusCode: false,
    });
  });
});

/** Yields the raw response (never fails - used for both assertions and cleanup). */
Cypress.Commands.add('adminDeleteRoom', (roomid) => {
  return cy.adminLogin().then((token) => {
    return cy.request({
      method: 'DELETE',
      url: `${api()}/room/${roomid}`,
      headers: authHeaders(token),
      failOnStatusCode: false,
    });
  });
});

/** Yields the array of bookings of a room, as the admin sees them. */
Cypress.Commands.add('adminGetBookings', (roomid) => {
  return cy.adminLogin().then((token) => {
    return cy
      .request({ url: `${api()}/booking?roomid=${roomid}`, headers: authHeaders(token) })
      .then((res) => {
        expect(res.status, 'admin bookings status').to.eq(200);
        return res.body.bookings;
      });
  });
});

/* ------------------------------------------------------------------ */
/* User API (public - no token is sent)                                */
/* ------------------------------------------------------------------ */

Cypress.Commands.add('userGetRooms', () => {
  return cy.request(`${api()}/room`).then((res) => {
    expect(res.status, 'user rooms status').to.eq(200);
    return res.body.rooms;
  });
});

/** Yields the raw response so the test can assert on 201 / 400 / 409. */
Cypress.Commands.add('userBookRoom', (booking) => {
  return cy.request({
    method: 'POST',
    url: `${api()}/booking`,
    body: booking,
    failOnStatusCode: false,
  });
});

/** The list the calendar uses to paint "Unavailable" days: [{ start, end, title }]. */
Cypress.Commands.add('userGetUnavailableDates', (roomid) => {
  return cy.request(`${api()}/report/room/${roomid}`).then((res) => {
    expect(res.status, 'report status').to.eq(200);
    return reportEntries(res.body);
  });
});

/* ------------------------------------------------------------------ */
/* UI helpers (reservation page)                                       */
/* ------------------------------------------------------------------ */

/**
 * Opens the reservation page the same way the home page "Book now" button does:
 * /reservation/{id}?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD.
 * The dates in the query string are REQUIRED - without them the app shows a spinner forever.
 */
Cypress.Commands.add('visitReservation', (roomid, { checkin, checkout }) => {
  cy.visit(`/reservation/${roomid}?checkin=${checkin}&checkout=${checkout}`);
  cy.get('#doReservation').should('be.visible'); // calendar card is rendered and ready
});

/** Clicks "Reserve Now" under the calendar and waits for the booking form. */
Cypress.Commands.add('openBookingForm', () => {
  cy.get('#doReservation').click();
  cy.get('input[name="firstname"]').should('be.visible');
});

/** Fills the booking form; empty / missing values leave the field empty. */
Cypress.Commands.add('fillBookingForm', (data) => {
  ['firstname', 'lastname', 'email', 'phone'].forEach((name) => {
    cy.get(`input[name="${name}"]`).clear();
    if (data[name]) {
      cy.get(`input[name="${name}"]`).type(data[name]);
    }
  });
});

/** Clicks the "Reserve Now" button of the booking form (the one without id). */
Cypress.Commands.add('submitBooking', () => {
  cy.contains('button', 'Reserve Now').click();
});

/** Goes to the next month of the calendar. */
Cypress.Commands.add('calendarNextMonth', () => {
  cy.contains('.rbc-toolbar button', 'Next').click();
});
