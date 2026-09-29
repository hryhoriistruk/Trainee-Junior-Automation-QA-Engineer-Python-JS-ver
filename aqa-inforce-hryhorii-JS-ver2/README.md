# aqa-inforce-hryhoriistruk

Automated tests (Cypress) for <https://automationintesting.online/> (restful-booker-platform):

- **UI tests** of the User App room booking flow (`cypress/e2e/user-spec.cy.js`)
- **API tests** of the Admin / User flows for rooms and bookings (`cypress/e2e/admin-spec.cy.js`)
- **Manual test cases** for the UI flow in `test-cases.txt`

## Requirements

- Node.js 18+ and npm
- Internet access (the tests run against the public demo site)

## Setup

```bash
git clone https://github.com/<your-account>/aqa-inforce-hryhoriistruk.git
cd aqa-inforce-hryhoriistruk
npm ci            # or: npm install
```

Optional: `cp .env.example .env` to override the base URL / admin credentials
(the defaults already point to the demo site with `admin` / `password`).

## Run

```bash
npm test              # all specs, headless
npm run test:ui       # UI tests only   (cypress/e2e/user-spec.cy.js)
npm run test:api      # API tests only  (cypress/e2e/admin-spec.cy.js)
npm run test:report   # all specs + Mochawesome HTML report in cypress/reports/
npm run cy:open       # interactive Cypress runner
```

## Code Quality

```bash
npm run lint          # check code with ESLint
npm run lint:fix      # fix ESLint issues automatically
npm run format        # format code with Prettier
npm run format:check  # check code formatting
```

## Pre-commit Hooks

This project uses pre-commit hooks to ensure code quality:

```bash
pip install pre-commit  # install pre-commit (Python)
pre-commit install      # install hooks
```

The hooks will automatically run:
- ESLint with auto-fix for JavaScript files
- Prettier for formatting

## Test cases

| What | File | Location |
|---|---|---|
| Manual test cases (UI TC-UI-01…10 + API TC-API-01…09) and findings (TC-UI-09 is manual only) | `test-cases.txt` | repository root |
| UI automation (TC-UI-01…08, TC-UI-10; the UI half of TC-UI-08 is skipped because of BUG-03) | `user-spec.cy.js` | `cypress/e2e/` |
| API automation (TC-API-01…09) | `admin-spec.cy.js` | `cypress/e2e/` |

Every automated test title starts with its test case id.

## Structure

```
cypress/
  e2e/         user-spec.cy.js, admin-spec.cy.js
  fixtures/    room.json, booking.json
  support/     commands.js (custom commands), utils.js (data builders), e2e.js
test-cases.txt
cypress.config.js
package.json / package-lock.json
.env.example  .eslintrc.json  .prettierrc
.github/workflows/ci.yml
```

## How the tests work

- **Independent tests.** Every test creates its own room with a unique name through the Admin API
  and deletes it afterwards, so tests can run in any order and can be retried safely.
- **Authentication.** `POST /api/auth/login` returns the token in the JSON body (not as a cookie),
  so the custom commands send it as `Cookie: token=<token>` on admin calls. User calls send no token.
- **Custom commands** (`cypress/support/commands.js`): `adminLogin`, `adminCreateRoom`,
  `adminUpdateRoom`, `adminDeleteRoom`, `adminGetBookings`, `userGetRooms`, `userBookRoom`,
  `userGetUnavailableDates`, `visitReservation`, `openBookingForm`, `fillBookingForm`,
  `submitBooking`, `calendarNextMonth`.
- **`cy.intercept`** is used to assert the real network traffic of the UI: `POST /api/booking`
  (request body, 201 / 400), `GET /api/report/room/*` (the "Unavailable" days) and `GET /api/room`.
- **UI flow.** The reservation page must be opened with `?checkin=…&checkout=…` (this is what the
  home page "Book now" button does).
- **Known application issues** (React hydration error, endless spinner without dates, …) are
  listed in the FINDINGS section of `test-cases.txt`.

## Known application defect

`TC-UI-08` contains a separate API-level assertion and a UI-level assertion. The live demo application currently returns the booked period as `title: "Unavailable"` from `GET /api/report/room/{roomId}`, but does not render an `Unavailable` event in the calendar DOM. The UI assertion is therefore intentionally marked `it.skip` rather than weakened or faked. Once the application defect is fixed, remove `.skip` and the UI test becomes a direct regression test. The API assertion remains active.

This is an application-under-test defect, not an automation failure. It is documented in `test-cases.txt` as `BUG-03`.

## Notes

- The demo site is shared and can be reset periodically. Tests create unique rooms and clean them up
  after execution. If the public demo is temporarily unavailable, the suite cannot run until it recovers.
- Failure screenshots go to `cypress/screenshots/` (git-ignored).

## CI

`.github/workflows/ci.yml` runs lint, format check and the Cypress suite (Chrome) on every push /
pull request and uploads screenshots and reports as artifacts.
