# aqa-inforce-hryhoriistruk

Automated tests for <https://automationintesting.online/>:
UI tests for the User App (room booking) and API tests for the Admin/User flows.

This repository contains two implementations:
- **JavaScript version**: Cypress (UI + API)
- **Python version**: Playwright + pytest + requests (UI + API)

---

## JavaScript Version (Cypress)

### Requirements
- Node.js 18+ and npm

### Setup
```bash
git clone https://github.com/<your-account>/aqa-inforce-hryhoriistruk.git
cd aqa-inforce-hryhoriistruk
npm install
```

### Environment Configuration
Copy `.env.example` to `.env` and customize if needed:
```bash
cp .env.example .env
```

### Run
```bash
npm test              # all specs, headless
npm run test:ui       # only UI tests   (cypress/e2e/user-spec.cy.js)
npm run test:api      # only API tests  (cypress/e2e/admin-spec.cy.js)
npm run test:report   # all specs with Mochawesome HTML report
npm run cy:open       # interactive Cypress runner
```

### Code Quality
```bash
npm run lint          # check code with ESLint
npm run lint:fix      # fix ESLint issues automatically
npm run format        # format code with Prettier
npm run format:check  # check code formatting
```

### Test cases (JavaScript)
| What | File | Location |
|---|---|---|
| Manual test cases (UI + API) | `test-cases.txt` | repository root |
| UI automation (TC-UI-01…08) | `user-spec.cy.js` | `cypress/e2e` |
| API automation (TC-API-01…07) | `admin-spec.cy.js` | `cypress/e2e` |

### Structure (JavaScript)
```
cypress/
  e2e/         user-spec.cy.js, admin-spec.cy.js
  fixtures/    room.json, booking.json
  support/     commands.js (custom commands), utils.js (data builders), e2e.js
  reports/     Mochawesome test reports (generated)
test-cases.txt
cypress.config.js
package.json
.env.example   # Environment variables template
.eslintrc.json # ESLint configuration
.prettierrc    # Prettier configuration
.github/workflows/ci.yml  # CI/CD pipeline
```

---

## Python Version (Playwright + pytest + requests)

Same test cases (`test-cases.txt`) implemented in Python, folder `python/`.

### Requirements
- Python 3.9+
- pip

### Setup
```bash
cd python
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

### Environment Configuration
Copy `.env.example` to `.env` and customize if needed:
```bash
cp .env.example .env
```

### Run
```bash
pytest                            # all tests
pytest tests/test_ui_booking.py   # UI only  (TC-UI-01…07, 08, 10; UI half of TC-UI-08 skipped, BUG-03)
pytest tests/test_api_rooms.py    # API only (TC-API-01…06)
pytest --html=reports/report.html --self-contained-html   # HTML report
pytest --headed                   # watch the browser
pytest -m ui                      # run only UI tests (marked)
pytest -m api                     # run only API tests (marked)
```

### Code Quality
```bash
flake8 .                          # lint with flake8
black --check .                   # check code formatting
black .                           # format code
isort --check-only .              # check import sorting
isort .                           # sort imports
```

### Test cases (Python)
| What | File | Location |
|---|---|---|
| UI automation | `test_ui_booking.py` | `python/tests/` |
| API automation | `test_api_rooms.py` | `python/tests/` |
| Fixtures (admin/user sessions, temp room) | `conftest.py` | `python/` |
| Data builders | `helpers.py` | `python/` |

### Structure (Python)
```
python/
  tests/
    test_api_rooms.py
    test_ui_booking.py
  conftest.py      # pytest fixtures
  helpers.py       # data builders
  requirements.txt
  pytest.ini       # pytest configuration
  .env.example     # Environment variables template
  .flake8          # flake8 configuration
  pyproject.toml   # black/isort configuration
.github/workflows/python-ci.yml  # CI/CD pipeline
```

---

## CI/CD

### JavaScript (Cypress)
GitHub Actions workflow (`.github/workflows/ci.yml`):
- Runs tests on Chrome and Firefox
- Executes ESLint for code quality checks
- Uploads test reports and screenshots as artifacts
- Triggers on push to main/develop branches and pull requests

### Python (Playwright)
GitHub Actions workflow (`.github/workflows/python-ci.yml`):
- Runs tests on Python 3.9, 3.10, 3.11, 3.12
- Executes flake8, black, and isort for code quality
- Uploads HTML test reports as artifacts
- Triggers on push to main/develop branches and pull requests

---

## Notes

### Both versions
- Each spec creates its own room with a unique name via Admin API and deletes it afterwards,
  so tests are independent and don't pollute the shared demo site.
- The demo site is shared and periodically reset – if a test flakes, simply re-run it.
- Environment variables can be set via `.env` file or CI/CD secrets.

### JavaScript (Cypress)
- Custom commands: `adminLogin`, `adminCreateRoom`, `adminUpdateRoom`, `adminDeleteRoom`,
  `adminGetBookings`, `userGetRooms`, `userBookRoom`, `userGetBookingSummary`,
  `selectDatesOnCalendar`, `fillBookingForm`.
- `cy.intercept` is used to wait for / assert `GET /api/booking/summary`, `POST /api/booking`
  (status 201 / 400) and `GET /api/room`.
- Test reports are generated in `cypress/reports/` when running with `npm run test:report`.

### Python (Playwright)
- `page.expect_response(...)` plays the role of `cy.intercept` in the Python UI tests.
- Tests use pytest fixtures for session management and test data.
- HTML reports are generated in `python/reports/` when running pytest.
