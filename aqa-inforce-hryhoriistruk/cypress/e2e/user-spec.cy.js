import { buildRoom, buildBooking, nextMonthRange, datesOf, reportEntries } from '../support/utils';

describe('User UI – room booking', () => {
  let roomBase;
  let bookingData;
  let room;

  before(() => {
    cy.fixture('room').then((r) => (roomBase = r));
    cy.fixture('booking').then((b) => (bookingData = b));
  });

  // Every test gets its own room, so tests are independent and safe to retry.
  beforeEach(() => {
    cy.adminCreateRoom(buildRoom(roomBase)).then((created) => (room = created));
    cy.intercept({ method: 'POST', pathname: '/api/booking' }).as('createBooking');
    cy.intercept({ method: 'GET', pathname: '/api/report/room/*' }).as('getUnavailable');
  });

  afterEach(() => {
    if (room) {
      cy.adminDeleteRoom(room.roomid);
      room = undefined;
    }
  });

  // TC-UI-01
  it('TC-UI-01: books a room with valid data', () => {
    const dates = nextMonthRange(10, 3);

    cy.visitReservation(room.roomid, dates);
    cy.openBookingForm();
    cy.fillBookingForm(bookingData);
    cy.submitBooking();

    cy.wait('@createBooking').then(({ request, response }) => {
      expect(request.body.roomid).to.eq(room.roomid);
      expect(request.body.firstname).to.eq(bookingData.firstname);
      expect(request.body.lastname).to.eq(bookingData.lastname);
      expect(request.body.email).to.eq(bookingData.email);
      expect(request.body.phone).to.eq(bookingData.phone);
      expect(request.body.bookingdates).to.deep.equal(dates);
      expect(response.statusCode).to.eq(201);
    });

    cy.contains('h2', 'Booking Confirmed').should('be.visible');
    cy.contains('strong', `${dates.checkin} - ${dates.checkout}`).should('be.visible');

    // the booking is really stored
    cy.adminGetBookings(room.roomid).then((bookings) => {
      expect(bookings).to.have.length(1);
      expect(bookings[0].firstname).to.eq(bookingData.firstname);
      expect(datesOf(bookings[0])).to.deep.equal(dates);
    });
  });

  // TC-UI-02 … TC-UI-06
  const invalidCases = [
    {
      id: 'TC-UI-02',
      title: 'all fields empty',
      data: { firstname: '', lastname: '', email: '', phone: '' },
      error: /.+/,
    },
    {
      id: 'TC-UI-03',
      title: 'firstname too short (2 chars, minimum is 3)',
      data: { firstname: 'Jo' },
      error: /size must be between 3 and 18/i,
    },
    {
      id: 'TC-UI-04',
      title: 'invalid email format',
      data: { email: 'not-an-email' },
      error: /email/i,
    },
    {
      id: 'TC-UI-05',
      title: 'phone too short (3 digits, minimum is 11)',
      data: { phone: '123' },
      error: /size must be between 11 and 21/i,
    },
    {
      id: 'TC-UI-06',
      title: 'lastname empty',
      data: { lastname: '' },
      error: /lastname|size must be between 3 and 30/i,
    },
  ];

  invalidCases.forEach(({ id, title, data, error }) => {
    it(`${id}: does not book a room – ${title}`, () => {
      const dates = nextMonthRange(12, 2);
      const formData = { ...bookingData, ...data }; // valid data + the one broken field

      cy.visitReservation(room.roomid, dates);
      cy.openBookingForm();
      cy.fillBookingForm(formData);
      cy.submitBooking();

      cy.wait('@createBooking').then(({ response }) => {
        expect(response.statusCode).to.eq(400);
        expect(response.body.errors).to.be.an('array').and.not.be.empty;
      });

      // validation errors are shown to the user, the form stays open, nothing is confirmed
      cy.get('.alert.alert-danger li').should('have.length.greaterThan', 0);
      cy.get('.alert.alert-danger').invoke('text').should('match', error);
      cy.contains('Booking Confirmed').should('not.exist');
      cy.get('input[name="firstname"]').should('be.visible');

      cy.adminGetBookings(room.roomid).should('have.length', 0);
    });
  });

  // TC-UI-07
  it('TC-UI-07: cannot start a booking without selecting dates', () => {
    // The reservation page needs ?checkin&checkout. Without them the calendar never renders,
    // so the booking form cannot be reached (see BUG-01 in test-cases.txt).
    cy.visit(`/reservation/${room.roomid}`);
    cy.contains('h1', `${room.type} Room`).should('be.visible');

    cy.get('.booking-card .spinner-border').should('be.visible');
    cy.get('#doReservation').should('not.exist');
    cy.get('input[name="firstname"]').should('not.exist');
    cy.contains('Booking Confirmed').should('not.exist');

    cy.adminGetBookings(room.roomid).should('have.length', 0);
  });

  // TC-UI-08 (part 1): the data the calendar is built from
  it('TC-UI-08: the calendar feed reports earlier booked dates as Unavailable', () => {
    const booked = nextMonthRange(20, 2);
    cy.userBookRoom(buildBooking(bookingData, room.roomid, booked))
      .its('status')
      .should('eq', 201);

    // open the reservation page with a DIFFERENT selection, so "Selected" and "Unavailable"
    // are never the same event
    cy.visitReservation(room.roomid, nextMonthRange(5, 2));

    cy.wait('@getUnavailable').then(({ response }) => {
      expect(response.statusCode).to.eq(200);
      const entries = reportEntries(response.body);
      expect(entries).to.have.length(1);
      expect(entries[0]).to.include({
        title: 'Unavailable',
        start: booked.checkin,
        end: booked.checkout,
      });
    });

    // the calendar itself is on the right month and draws the current selection ...
    cy.calendarNextMonth();
    cy.get('.rbc-month-view .rbc-event').should('contain', 'Selected');
  });

  // TC-UI-08 (part 2): what the user sees. SKIPPED because of a defect of the application:
  // BUG-03 in test-cases.txt - the feed above is correct, but the page never draws "Unavailable"
  // (the word does not appear anywhere in the DOM). Remove `.skip` when the bug is fixed.
  it.skip('TC-UI-08 [BUG-03]: the calendar draws earlier booked dates as Unavailable', () => {
    const booked = nextMonthRange(20, 2);
    cy.userBookRoom(buildBooking(bookingData, room.roomid, booked))
      .its('status')
      .should('eq', 201);

    cy.visitReservation(room.roomid, nextMonthRange(5, 2));
    cy.calendarNextMonth();
    cy.contains('.rbc-month-view .rbc-event', 'Unavailable').should('be.visible');
  });

  // TC-UI-10
  it('TC-UI-10: "Book now" on the home page opens the reservation page with dates', () => {
    cy.intercept({ method: 'GET', pathname: '/api/room' }).as('getRooms');
    cy.visit('/');
    cy.wait('@getRooms').its('response.statusCode').should('eq', 200);

    cy.contains('a.btn', 'Book now')
      .first()
      .should('have.attr', 'href')
      .and('match', /^\/reservation\/\d+\?checkin=\d{4}-\d{2}-\d{2}&checkout=\d{4}-\d{2}-\d{2}$/);

    cy.contains('a.btn', 'Book now').first().click();
    cy.location('pathname').should('match', /^\/reservation\/\d+$/);
    cy.get('#doReservation').should('be.visible');
  });
});
