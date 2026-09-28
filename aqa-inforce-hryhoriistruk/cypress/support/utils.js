const pad = (n) => String(n).padStart(2, '0');

export const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Date range inside the NEXT calendar month (always in the future, never crosses the month
 * end for startDay <= 26 and nights <= 2).
 */
export const nextMonthRange = (startDay = 20, nights = 2) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + 1, startDay);
  const end = new Date(start);
  end.setDate(end.getDate() + nights);
  return { checkin: formatDate(start), checkout: formatDate(end) };
};

/** Room name that is unique for every call, so tests never collide on the shared demo site. */
export const uniqueRoomName = () =>
  `AQA-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

export const buildRoom = (base, overrides = {}) => ({
  ...base,
  roomName: uniqueRoomName(),
  ...overrides,
});

export const buildBooking = (base, roomid, dates, overrides = {}) => ({
  roomid,
  ...base,
  depositpaid: false,
  bookingdates: dates,
  ...overrides,
});

/** Booking dates may come back as `bookingdates` or `bookingDates` depending on the service. */
export const datesOf = (booking) => booking.bookingdates || booking.bookingDates;

/** The calendar feed is `{ report: [...] }` on the live site (a bare array in older builds). */
export const reportEntries = (body) => (Array.isArray(body) ? body : body.report);
