const pad = (n) => String(n).padStart(2, '0');

export const formatDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Date N days from today, formatted YYYY-MM-DD */
export const daysFromToday = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return formatDate(d);
};

/** Date range inside NEXT calendar month (always in the future). */
export const nextMonthRange = (startDay = 20, nights = 2) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + 1, startDay);
  const end = new Date(start);
  end.setDate(end.getDate() + nights);
  return { checkin: formatDate(start), checkout: formatDate(end) };
};

/** Unique short room name so tests never collide */
export const uniqueRoomName = () => `AQA${Math.floor(1000 + Math.random() * 9000)}`;

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
