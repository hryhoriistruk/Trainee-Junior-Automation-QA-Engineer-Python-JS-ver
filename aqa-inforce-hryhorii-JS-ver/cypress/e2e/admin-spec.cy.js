import { buildRoom, buildBooking, nextMonthRange, datesOf } from '../support/utils';

const api = () => Cypress.env('apiUrl');

describe('API – Admin & User flows for rooms', () => {
  let roomBase;
  let bookingBase;
  const createdRoomIds = [];

  before(() => {
    cy.fixture('room').then((r) => (roomBase = r));
    cy.fixture('booking').then((b) => (bookingBase = b));
  });

  // Independent tests: every test creates its own room and removes it afterwards.
  afterEach(() => {
    createdRoomIds.splice(0).forEach((id) => cy.adminDeleteRoom(id));
  });

  const createRoom = (overrides) =>
    cy.adminCreateRoom(buildRoom(roomBase, overrides)).then((room) => {
      createdRoomIds.push(room.roomid);
      return room;
    });

  it('TC-API-01: creates a room via Admin API and sees it via User API', () => {
    const room = buildRoom(roomBase);

    cy.adminCreateRoom(room).then((created) => {
      createdRoomIds.push(created.roomid);

      cy.userGetRooms().then((rooms) => {
        const found = rooms.find((r) => r.roomid === created.roomid);
        expect(found, 'created room is visible for the user').to.exist;
        expect(found).to.include({
          roomName: room.roomName,
          type: room.type,
          accessible: room.accessible,
          roomPrice: room.roomPrice,
          description: room.description,
          image: room.image,
        });
        expect(found.features).to.have.members(room.features);
      });
    });
  });

  it('TC-API-02: books a room via User API and sees the booking via Admin API', () => {
    createRoom().then((room) => {
      const dates = nextMonthRange(10, 2);

      cy.userBookRoom(buildBooking(bookingBase, room.roomid, dates)).then((res) => {
        expect(res.status).to.eq(201);
      });

      // Admin sees exactly this booking
      cy.adminGetBookings(room.roomid).then((bookings) => {
        expect(bookings).to.have.length(1);
        expect(bookings[0]).to.include({
          roomid: room.roomid,
          firstname: bookingBase.firstname,
          lastname: bookingBase.lastname,
        });
        expect(datesOf(bookings[0])).to.deep.equal(dates);
      });

      // ...and the dates are published to users as "Unavailable"
      cy.userGetUnavailableDates(room.roomid).then((entries) => {
        expect(entries).to.have.length(1);
        expect(entries[0]).to.include({
          title: 'Unavailable',
          start: dates.checkin,
          end: dates.checkout,
        });
      });
    });
  });

  it('TC-API-03: edits a room via Admin API and sees changes via User API', () => {
    createRoom().then((room) => {
      const updated = {
        ...roomBase,
        roomName: room.roomName,
        type: 'Suite',
        roomPrice: 275,
        accessible: false,
        description: 'Updated description of the automated test room.',
        features: ['Views', 'TV'],
      };

      cy.adminUpdateRoom(room.roomid, updated).then((res) => {
        expect(res.status).to.be.oneOf([200, 202]); // gateway answers 200, room service 202
      });

      cy.userGetRooms().then((rooms) => {
        const found = rooms.find((r) => r.roomid === room.roomid);
        expect(found, 'edited room is still visible').to.exist;
        expect(found).to.include({
          roomName: room.roomName,
          type: 'Suite',
          roomPrice: 275,
          accessible: false,
          description: updated.description,
        });
        expect(found.features).to.have.members(['Views', 'TV']);
      });
    });
  });

  it('TC-API-04: deletes a room via Admin API and it disappears for the User API', () => {
    // not registered in createdRoomIds - this test deletes the room itself
    cy.adminCreateRoom(buildRoom(roomBase)).then((room) => {
      cy.userGetRooms().then((rooms) => {
        expect(rooms.map((r) => r.roomid)).to.include(room.roomid);
      });

      cy.adminDeleteRoom(room.roomid).then((res) => {
        expect(res.status).to.be.oneOf([200, 202, 204]);
      });

      cy.userGetRooms().then((rooms) => {
        expect(rooms.map((r) => r.roomid)).to.not.include(room.roomid);
      });
    });
  });

  it('TC-API-05: rejects create / edit / delete of a room without authorisation', () => {
    const denied = [401, 403];

    cy.request({
      method: 'POST',
      url: `${api()}/room`,
      body: buildRoom(roomBase),
      failOnStatusCode: false,
    })
      .its('status')
      .should('be.oneOf', denied);

    createRoom().then((room) => {
      cy.request({
        method: 'PUT',
        url: `${api()}/room/${room.roomid}`,
        body: { roomid: room.roomid, ...roomBase, roomName: room.roomName, roomPrice: 999 },
        failOnStatusCode: false,
      })
        .its('status')
        .should('be.oneOf', denied);

      cy.request({
        method: 'DELETE',
        url: `${api()}/room/${room.roomid}`,
        failOnStatusCode: false,
      })
        .its('status')
        .should('be.oneOf', denied);

      // the room is untouched
      cy.userGetRooms().then((rooms) => {
        const found = rooms.find((r) => r.roomid === room.roomid);
        expect(found, 'room still exists').to.exist;
        expect(found.roomPrice).to.eq(roomBase.roomPrice);
      });
    });
  });

  context('TC-API-06: booking with invalid data is rejected', () => {
    let room;

    before(() => {
      cy.adminCreateRoom(buildRoom(roomBase)).then((created) => (room = created));
    });

    after(() => {
      if (room) cy.adminDeleteRoom(room.roomid);
    });

    const cases = [
      { title: 'invalid email', overrides: { email: 'invalid' } },
      { title: 'firstname too short', overrides: { firstname: 'Jo' } },
      { title: 'lastname empty', overrides: { lastname: '' } },
      { title: 'phone too short', overrides: { phone: '123' } },
      { title: 'no dates at all', overrides: { bookingdates: {} } },
    ];

    cases.forEach(({ title, overrides }) => {
      it(`rejects: ${title}`, () => {
        const dates = nextMonthRange(5, 2);
        cy.userBookRoom(buildBooking(bookingBase, room.roomid, dates, overrides)).then((res) => {
          // 400 = field validation, 409 = date validation (checkin/checkout missing)
          expect(res.status).to.be.oneOf([400, 409]);
          if (res.status === 400) {
            expect(res.body.errors).to.be.an('array').and.not.be.empty;
          }
        });

        cy.adminGetBookings(room.roomid).should('have.length', 0);
      });
    });
  });

  it('TC-API-07: home page loads rooms from GET /api/room (cy.intercept)', () => {
    createRoom().then((room) => {
      cy.intercept({ method: 'GET', pathname: '/api/room' }).as('getRooms');
      cy.visit('/');

      cy.wait('@getRooms').then(({ response }) => {
        expect(response.statusCode).to.eq(200);
        expect(response.body.rooms).to.be.an('array').and.not.be.empty;
        // the freshly created room comes from the same API the UI uses
        expect(response.body.rooms.map((r) => r.roomid)).to.include(room.roomid);
      });
    });
  });

  it('TC-API-08: the same dates cannot be booked twice', () => {
    createRoom().then((room) => {
      const dates = nextMonthRange(14, 3);

      cy.userBookRoom(buildBooking(bookingBase, room.roomid, dates))
        .its('status')
        .should('eq', 201);

      // identical dates
      cy.userBookRoom(buildBooking(bookingBase, room.roomid, dates))
        .its('status')
        .should('eq', 409);

      // overlapping dates
      const overlapping = nextMonthRange(15, 3);
      cy.userBookRoom(buildBooking(bookingBase, room.roomid, overlapping))
        .its('status')
        .should('eq', 409);

      cy.adminGetBookings(room.roomid).should('have.length', 1);
    });
  });

  it('TC-API-09: rejects wrong credentials and anonymous access to bookings', () => {
    cy.request({
      method: 'POST',
      url: `${api()}/auth/login`,
      body: { username: Cypress.env('adminUser'), password: 'definitely-wrong' },
      failOnStatusCode: false,
    })
      .its('status')
      .should('be.oneOf', [401, 403]);

    createRoom().then((room) => {
      cy.request({ url: `${api()}/booking?roomid=${room.roomid}`, failOnStatusCode: false })
        .its('status')
        .should('be.oneOf', [401, 403]);
    });
  });
});
