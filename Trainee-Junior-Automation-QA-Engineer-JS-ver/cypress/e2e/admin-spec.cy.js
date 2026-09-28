import { buildRoom, buildBooking, nextMonthRange } from '../support/utils';

describe('API – Admin & User flows for rooms', () => {
  let roomBase;
  let bookingBase;
  const createdRoomIds = [];

  before(() => {
    cy.fixture('room').then((r) => (roomBase = r));
    cy.fixture('booking').then((b) => (bookingBase = b));
  });

  afterEach(() => {
    // cleanup – delete everything created by the test
    createdRoomIds.splice(0).forEach((id) => cy.adminDeleteRoom(id));
  });

  it('TC-API-01: creates a room via Admin API and sees it via User API', () => {
    const room = buildRoom(roomBase);
    cy.adminCreateRoom(room).then((created) => {
      createdRoomIds.push(created.roomid);
      cy.userGetRooms().then((rooms) => {
        const found = rooms.find((r) => r.roomid === created.roomid);
        expect(found).to.include({
          roomName: room.roomName,
          type: room.type,
          accessible: room.accessible,
          roomPrice: room.roomPrice,
        });
      });
    });
  });

  it('TC-API-02: books a room via User API and sees the booking via Admin API', () => {
    cy.adminCreateRoom(buildRoom(roomBase)).then((room) => {
      createdRoomIds.push(room.roomid);
      const dates = nextMonthRange(10, 2);

      cy.userBookRoom(buildBooking(bookingBase, room.roomid, dates)).then((res) => {
        expect(res.status).to.eq(201);
      });

      cy.adminGetBookings(room.roomid).then((bookings) => {
        expect(bookings).to.have.length(1);
        expect(bookings[0]).to.include({
          firstname: bookingBase.firstname,
          lastname: bookingBase.lastname,
        });
        expect(bookings[0].bookingdates.checkin).to.eq(dates.checkin);
        expect(bookings[0].bookingdates.checkout).to.eq(dates.checkout);
      });

      // and the dates are marked as taken for the user
      cy.userGetBookingSummary(room.roomid).then((summary) => {
        expect(summary).to.have.length(1);
      });
    });
  });

  it('TC-API-03: edits a room via Admin API and sees changes via User API', () => {
    cy.adminCreateRoom(buildRoom(roomBase)).then((room) => {
      createdRoomIds.push(room.roomid);
      const updated = {
        ...roomBase,
        roomName: room.roomName,
        type: 'Suite',
        roomPrice: 275,
        accessible: false,
        description: 'Updated description of the automated test room, long enough.',
        features: ['Views', 'TV'],
      };

      cy.adminUpdateRoom(room.roomid, updated).its('status').should('eq', 202);

      cy.userGetRooms().then((rooms) => {
        const found = rooms.find((r) => r.roomid === room.roomid);
        expect(found).to.include({ type: 'Suite', roomPrice: 275, accessible: false });
        expect(found.description).to.eq(updated.description);
        expect(found.features).to.have.members(['Views', 'TV']);
      });
    });
  });

  it('TC-API-04: deletes a room via Admin API and it disappears for the User API', () => {
    cy.adminCreateRoom(buildRoom(roomBase)).then((room) => {
      cy.adminDeleteRoom(room.roomid).then((res) => {
        expect([200, 202, 204]).to.include(res.status);
      });

      cy.userGetRooms().then((rooms) => {
        expect(rooms.map((r) => r.roomid)).to.not.include(room.roomid);
      });
    });
  });

  it('TC-API-05: rejects room creation without authorisation', () => {
    cy.clearCookies();
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/room`,
      body: buildRoom(roomBase),
      failOnStatusCode: false,
    }).its('status').should('eq', 401);
  });

  it('TC-API-06: rejects a booking with invalid data', () => {
    cy.adminCreateRoom(buildRoom(roomBase)).then((room) => {
      createdRoomIds.push(room.roomid);
      const dates = nextMonthRange(5, 2);
      cy.userBookRoom(
        buildBooking(bookingBase, room.roomid, dates, { email: 'invalid', firstname: 'Jo' })
      ).its('status').should('eq', 400);
    });
  });
});

// Intercept demo: the UI reacts on the very same API that we test above.
describe('UI ↔ API consistency (cy.intercept)', () => {
  it('TC-API-07: home page loads rooms from GET /api/room', () => {
    cy.intercept('GET', '**/api/room').as('getRooms');
    cy.visit('/');
    cy.wait('@getRooms').then(({ response }) => {
      expect(response.statusCode).to.eq(200);
      expect(response.body.rooms).to.be.an('array').and.not.be.empty;
    });
  });
});
