# aqa-inforce (Python Version)

Automated tests for <https://automationintesting.online/>:
UI tests for the User App (room booking) and API tests for the Admin/User flows.

This repository contains the Python implementation using Playwright + pytest + requests.

---

## Requirements
- Python 3.9+
- pip

## Setup
```bash
git clone https://github.com/<your-account>/aqa-inforce-hryhoriistruk.git
cd aqa-inforce-hryhoriistruk
cd python
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

## Environment Configuration
Copy `.env.example` to `.env` and customize if needed:
```bash
cp .env.example .env
```

## Run
```bash
pytest                            # all tests
pytest tests/test_ui_booking.py   # UI only  (TC-UI-01…07, 08, 10; UI half of TC-UI-08 skipped, BUG-03)
pytest tests/test_api_rooms.py    # API only (TC-API-01…09)
pytest --html=reports/report.html --self-contained-html   # HTML report
pytest --alluredir=allure-results   # Generate Allure report
allure serve allure-results        # View Allure report
pytest --headed                   # watch the browser
pytest -m ui                      # run only UI tests (marked)
pytest -m api                     # run only API tests (marked)
```

## Code Quality
```bash
flake8 .                          # lint with flake8
black --check .                   # check code formatting
black .                           # format code
isort --check-only .              # check import sorting
isort .                           # sort imports
```

## Test cases
| What | File | Location |
|---|---|---|
| Manual test cases (UI + API) | `test-cases.txt` | repository root |
| UI automation (TC-UI-01…08, TC-UI-10) | `test_ui_booking.py` | `python/tests/` |
| API automation (TC-API-01…09) | `test_api_rooms.py` | `python/tests/` |
| Fixtures (admin/user sessions, temp room) | `conftest.py` | `python/` |
| Data builders | `helpers.py` | `python/` |

## Structure
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
  reports/         # HTML test reports (generated)
test-cases.txt
README.md
CONTRIBUTING.md
LICENSE
.github/workflows/python-ci.yml  # CI/CD pipeline
```

## CI/CD

GitHub Actions workflow (`.github/workflows/python-ci.yml`):
- Runs tests on Python 3.9, 3., 3.11, 3.12
- Executes flake8, black, and isort for code quality
- Uploads HTML test reports as artifacts
- Triggers on push to main/develop branches and pull requests

## Notes

- Each test creates its own room with a unique name via Admin API and deletes it afterwards,
  so tests are independent and don't pollute the shared demo site.
- The demo site is shared and periodically reset – if a test flakes, simply re-run it.
- Environment variables can be set via `.env` file or CI/CD secrets.
- `page.expect_response(...)` plays the role of `cy.intercept` in the Python UI tests.
- Tests use pytest fixtures for session management and test data.
- HTML reports are generated in `python/reports/` when running pytest.
