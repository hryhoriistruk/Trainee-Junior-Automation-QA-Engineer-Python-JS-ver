import { buildRoom, buildBooking, nextMonthRange } from '../support/utils';

describe('User UI – room booking', () => {
  let room;
  let bookingData;

  before(() => {
    cy.fixture('booking').then((b) => (bookingData = b));
    cy.fixture('room').then((base) =>
      cy.adminCreateRoom(buildRoom(base)).then((r) => (room = r))
    );
  });

  after(() => {
    if (room) cy.adminDeleteRoom(room.roomid);
  });

  beforeEach(() => {
    cy.intercept('GET', '**/api/booking/summary*').as('getSummary');
    cy.intercept('POST', '**/api/booking').as('createBooking');
    cy.visit(`/reservation/${room.roomid}`);
    cy.wait('@getSummary');
  });

  // TC-UI-01
  it('books a room with valid data', () => {
    cy.selectDatesOnCalendar(2, 4);
    cy.contains('button', 'Reserve Now').click();
    cy.fillBookingForm(bookingData);
    cy.contains('button', 'Reserve Now').click();

    cy.wait('@createBooking').its('response.statusCode').should('eq', 201);
    cy.contains('Booking Confirmed').should('be.visible');
  });

  // TC-UI-02 … TC-UI-06
  const invalidCases = [
    { id: 'TC-UI-02', title: 'all fields empty', data: { firstname: '', lastname: '', email: '', phone: '' } },
    { id: 'TC-UI-03', title: 'firstname too short', data: { firstname: 'Jo', lastname: 'Tester', email: 'john@example.com', phone: '01234567890' } },
    { id: 'TC-UI-04', title: 'invalid email format', data: { firstname: 'John', lastname: 'Tester', email: 'not-an-email', phone: '01234567890' } },
    { id: 'TC-UI-05', title: 'phone too short', data: { firstname: 'John', lastname: 'Tester', email: 'john@example.com', phone: '123' } },
    { id: 'TC-UI-06', title: 'lastname empty', data: { firstname: 'John', lastname: '', email: 'john@example.com', phone: '01234567890' } },
  ];

  invalidCases.forEach(({ id, title, data }) => {
    it(`${id}: does not book a room – ${title}`, () => {
      cy.selectDatesOnCalendar(6, 8);
      cy.contains('button', 'Reserve Now').click();
      cy.fillBookingForm(data);
      cy.contains('button', 'Reserve Now').click();

      cy.wait('@createBooking').its('response.statusCode').should('eq', 400);
      cy.get('.alert-danger').should('be.visible');
      cy.contains('Booking Confirmed').should('not.exist');
    });
  });

  // TC-UI-07
  it('does not allow submitting the booking without selecting dates', () => {
    cy.contains('button', 'Reserve Now').click();
    cy.fillBookingForm(bookingData);
    cy.contains('button', 'Reserve Now').click();
    cy.contains('Booking Confirmed').should('not.exist');
  });

  // TC-UI-08
  it('shows earlier booked dates as Unavailable', () => {
    // arrange: booking made via API for the 3rd week of next month
    const dates = nextMonthRange(20, 2);
    cy.userBookRoom(buildBooking(bookingData, room.roomid, dates)).its('status').should('eq', 201);

    cy.reload();
    cy.wait('@getSummary');
    cy.contains('button', 'Next').click();
    cy.get('.rbc-event').should('exist').and('contain.text', 'Unavailable');
  });
});
