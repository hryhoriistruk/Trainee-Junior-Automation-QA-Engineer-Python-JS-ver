# aqa-inforce-hryhoriistruk

[![Python CI](https://github.com/hryhoriistruk/aqa-inforce-hryhoriistruk/actions/workflows/python-ci.yml/badge.svg)](https://github.com/hryhoriistruk/aqa-inforce-hryhoriistruk/actions/workflows/python-ci.yml)
[![Cypress CI](https://github.com/hryhoriistruk/aqa-inforce-hryhoriistruk/actions/workflows/cypress-ci.yml/badge.svg)](https://github.com/hryhoriistruk/aqa-inforce-hryhoriistruk/actions/workflows/cypress-ci.yml)

Automated tests for <https://automationintesting.online/> (Restful-booker platform):
UI tests for the User App (room booking) and API tests for the Admin / User flows.

The same test cases (`test-cases.txt`) are automated twice:

| Framework | Folder | Run from |
|---|---|---|
| **Cypress** (JavaScript) | `cypress/` | repository root |
| **Playwright + pytest** (Python) | `python/` | `python/` |

## Test cases (where to find them)

| What | File | Location |
|---|---|---|
| Manual test cases (UI + API), defects and observations | `test-cases.txt` | repository root |
| UI automation - Cypress (TC-UI-01…08, TC-UI-10) | `user-spec.cy.js` | `cypress/e2e/` |
| API automation - Cypress (TC-API-01…09) | `admin-spec.cy.js` | `cypress/e2e/` |
| UI automation - Playwright (TC-UI-01…08, TC-UI-10) | `test_ui_booking.py` | `python/tests/` |
| API automation - pytest (TC-API-01…09) | `test_api_rooms.py` | `python/tests/` |

Manual only: TC-UI-09 (calendar mouse-drag), TC-UI-11…15 (extra edge cases) and the calendar
drawing of TC-UI-08. Known application defects are described in `test-cases.txt`
(BUG-01…03 and OBS-01…06). Because of BUG-03 (the calendar does not draw earlier booked days)
the calendar drawing is checked manually; the calendar data feed and the "cannot be booked
again" behaviour of TC-UI-08 are fully automated.

`cy.intercept` (Cypress) and `page.expect_response` (Playwright) are used to check the
requests behind the UI (booking POST, room list, calendar feed).

---

## Cypress

Requirements: Node.js 18+.

```bash
git clone https://github.com/hryhoriistruk/aqa-inforce-hryhoriistruk.git
cd aqa-inforce-hryhoriistruk
npm ci
```

```bash
npm test               # all specs, headless
npm run test:ui        # UI spec only
npm run test:api       # API spec only
npm run test:headed    # headed browser (useful for debugging)
npm run cy:open        # interactive runner
```

Base URL and admin credentials are set in `cypress.config.js` and can be overridden, e.g.
`CYPRESS_BASE_URL=... CYPRESS_apiUrl=... npm test`.

## Python (Playwright + pytest)

Requirements: Python 3.9+ (CI runs the suite on 3.9, 3.10, 3.11 and 3.12).

```bash
cd python
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env             # optional, defaults point to the public demo site
```

```bash
pytest                                                    # all tests
pytest -m ui                                              # UI tests only
pytest -m api                                             # API tests only
pytest --headed                                           # watch the browser
pytest -n auto                                            # parallel run (pytest-xdist)
pytest --html=reports/report.html --self-contained-html   # HTML report
pytest --alluredir=allure-results && allure serve allure-results   # Allure report
```

Flaky tests are retried automatically (`--reruns 2` via `pytest-rerunfailures`), which is
useful on the shared demo site.

Code quality (run inside `python/`): `flake8 .`, `black --check .`, `isort --check-only .`

## Repository structure

```
aqa-inforce-hryhoriistruk
├── .github
│   └── workflows
│       ├── python-ci.yml        # flake8, black, isort, pytest (matrix 3.9-3.12)
│       └── cypress-ci.yml       # Cypress run in Chrome
├── cypress
│   ├── downloads                # Cypress downloads (gitkeep only)
│   ├── e2e
│   │   ├── user-spec.cy.js      # UI tests
│   │   └── admin-spec.cy.js     # API tests
│   ├── fixtures                 # room.json, booking.json
│   └── support                  # commands.js, utils.js, e2e.js
├── python
│   ├── tests                    # test_ui_booking.py, test_api_rooms.py
│   ├── pages                    # Page Objects (home, reservation)
│   ├── conftest.py              # fixtures: admin_api, user_api, room
│   ├── helpers.py               # data builders
│   └── pytest.ini, pyproject.toml, .flake8, requirements.txt, .env.example
├── .editorconfig                # editor settings for all contributors
├── .gitignore
├── .pre-commit-config.yaml      # black, isort, flake8
├── test-cases.txt
├── cypress.config.js
├── package.json
├── package-lock.json
└── README.md
```

## Notes

- Every test creates its own room with a unique name through the Admin API and deletes it
  (with its bookings) afterwards, so tests are independent and do not pollute the shared site.
- The demo site is shared and reset periodically - if a test flakes, simply re-run it
  (or rely on the automatic retries in CI).
- API tests accept both response codes where the public gateway and the room service differ
  (200/202, 401/403); see OBS-03 in `test-cases.txt`.

## CI

GitHub Actions, triggered on push to `main`, `develop`, `working`, on pull requests to
`main`/`develop`, and manually via `workflow_dispatch`:

- **`python-ci.yml`** — matrix over Python 3.9-3.12: `flake8`, `black --check`, `isort
  --check-only`, then `pytest` with automatic retries and both HTML + Allure artifacts.
- **`cypress-ci.yml`** — `npm ci` + Cypress run in Chrome; screenshots and videos are
  uploaded as artifacts on failure.
