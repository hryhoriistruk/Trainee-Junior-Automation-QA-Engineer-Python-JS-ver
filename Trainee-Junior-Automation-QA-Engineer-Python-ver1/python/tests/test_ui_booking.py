import re

import pytest
from playwright.sync_api import Page, expect

from helpers import BOOKING_DEFAULTS, build_booking, next_month_range

# Locator of the "Reserve Now" button of the booking FORM (the one under the calendar has the
# id #doReservation and only opens the form).
SUBMIT_BUTTON = "button:has-text('Reserve Now'):not(#doReservation)"


def open_reservation(page: Page, room: dict, dates: dict):
    """Opens the page like the home page 'Book now' button does.

    The dates in the query string are REQUIRED - without them the app shows a spinner forever
    (BUG-01 in test-cases.txt).
    """
    query = f"checkin={dates['checkin']}&checkout={dates['checkout']}"
    page.goto(f"/reservation/{room['roomid']}?{query}")
    expect(page.locator("#doReservation")).to_be_visible()


def open_booking_form(page: Page):
    page.locator("#doReservation").click()
    expect(page.locator('input[name="firstname"]')).to_be_visible()


def fill_form(page: Page, data: dict):
    for name in ("firstname", "lastname", "email", "phone"):
        page.locator(f'input[name="{name}"]').fill(data.get(name, ""))


def submit_and_capture(page: Page):
    """Clicks the form's 'Reserve Now' and returns the intercepted POST /api/booking response."""
    with page.expect_response(
        lambda r: r.url.endswith("/api/booking") and r.request.method == "POST"
    ) as resp:
        page.locator(SUBMIT_BUTTON).click()
    return resp.value


def admin_bookings(admin_api, api_url, room: dict) -> list:
    r = admin_api.get(f"{api_url}/booking", params={"roomid": room["roomid"]})
    assert r.status_code == 200, r.text
    return r.json()["bookings"]


# TC-UI-01
@pytest.mark.ui
def test_room_can_be_booked_with_valid_data(page: Page, room, admin_api, api_url):
    dates = next_month_range(10, 3)

    open_reservation(page, room, dates)
    open_booking_form(page)
    fill_form(page, BOOKING_DEFAULTS)
    response = submit_and_capture(page)

    assert response.status == 201
    body = response.request.post_data_json
    assert body["roomid"] == room["roomid"]
    assert body["firstname"] == BOOKING_DEFAULTS["firstname"]
    assert body["lastname"] == BOOKING_DEFAULTS["lastname"]
    assert body["email"] == BOOKING_DEFAULTS["email"]
    assert body["phone"] == BOOKING_DEFAULTS["phone"]
    assert body["bookingdates"] == dates

    expect(page.locator("h2", has_text="Booking Confirmed")).to_be_visible()
    period = f"{dates['checkin']} - {dates['checkout']}"
    expect(page.locator("strong", has_text=period)).to_be_visible()

    # the booking is really stored
    bookings = admin_bookings(admin_api, api_url, room)
    assert len(bookings) == 1
    assert bookings[0]["firstname"] == BOOKING_DEFAULTS["firstname"]


# TC-UI-02 … TC-UI-06 (valid data + ONE broken field, except TC-UI-02)
INVALID_CASES = [
    pytest.param(
        {"firstname": "", "lastname": "", "email": "", "phone": ""},
        re.compile(r".+"),
        id="TC-UI-02-all-empty",
    ),
    pytest.param(
        {"firstname": "Jo"},
        re.compile(r"size must be between 3 and 18", re.I),
        id="TC-UI-03-firstname-too-short",
    ),
    pytest.param(
        {"email": "not-an-email"},
        re.compile(r"email", re.I),
        id="TC-UI-04-invalid-email",
    ),
    pytest.param(
        {"phone": "123"},
        re.compile(r"size must be between 11 and 21", re.I),
        id="TC-UI-05-phone-too-short",
    ),
    pytest.param(
        {"lastname": ""},
        re.compile(r"lastname|size must be between 3 and 30", re.I),
        id="TC-UI-06-lastname-empty",
    ),
]


@pytest.mark.ui
@pytest.mark.parametrize("broken, error", INVALID_CASES)
def test_room_cannot_be_booked_with_invalid_data(
    page: Page, room, admin_api, api_url, broken, error
):
    dates = next_month_range(12, 2)

    open_reservation(page, room, dates)
    open_booking_form(page)
    fill_form(page, {**BOOKING_DEFAULTS, **broken})
    response = submit_and_capture(page)

    assert response.status == 400
    assert response.json()["errors"], "the API must return a list of validation errors"

    # validation errors are shown, the form stays open, nothing is confirmed
    alert = page.locator(".alert.alert-danger")
    expect(alert).to_be_visible()
    expect(alert.locator("li").first).to_be_visible()
    expect(alert).to_contain_text(error)
    expect(page.get_by_text("Booking Confirmed")).to_have_count(0)
    expect(page.locator('input[name="firstname"]')).to_be_visible()

    assert admin_bookings(admin_api, api_url, room) == []


# TC-UI-07
@pytest.mark.ui
def test_room_cannot_be_booked_without_dates(page: Page, room, admin_api, api_url):
    # Without ?checkin&checkout the calendar never renders, so the booking form cannot be
    # reached (BUG-01 in test-cases.txt).
    page.goto(f"/reservation/{room['roomid']}")
    expect(page.locator("h1", has_text=f"{room['type']} Room")).to_be_visible()

    expect(page.locator(".booking-card .spinner-border")).to_be_visible()
    expect(page.locator("#doReservation")).to_have_count(0)
    expect(page.locator('input[name="firstname"]')).to_have_count(0)
    expect(page.get_by_text("Booking Confirmed")).to_have_count(0)

    assert admin_bookings(admin_api, api_url, room) == []


# TC-UI-08 (part 1): the data the calendar is built from
@pytest.mark.ui
def test_calendar_feed_reports_earlier_booked_dates_as_unavailable(
    page: Page, room, user_api, api_url
):
    booked = next_month_range(20, 2)
    r = user_api.post(f"{api_url}/booking", json=build_booking(room["roomid"], booked))
    assert r.status_code == 201, r.text

    # open the page with a DIFFERENT selection, so "Selected" and "Unavailable" never coincide
    other = next_month_range(5, 2)
    with page.expect_response(lambda x: "/api/report/room/" in x.url) as resp:
        query = f"checkin={other['checkin']}&checkout={other['checkout']}"
        page.goto(f"/reservation/{room['roomid']}?{query}")
    assert resp.value.status == 200
    body = resp.value.json()
    entries = body["report"] if isinstance(body, dict) else body  # object on the live site
    assert len(entries) == 1
    assert entries[0]["title"] == "Unavailable"
    assert entries[0]["start"] == booked["checkin"]
    assert entries[0]["end"] == booked["checkout"]

    # the calendar is on the right month and draws the current selection ...
    expect(page.locator("#doReservation")).to_be_visible()
    page.locator(".rbc-toolbar button", has_text="Next").click()
    expect(page.locator(".rbc-month-view .rbc-event", has_text="Selected")).to_be_visible()


# TC-UI-08 (part 2): what the user sees. SKIPPED because of BUG-03 in test-cases.txt: the feed
# above is correct, but the page never draws "Unavailable" (the word is not in the DOM at all).
# Remove the skip marker when the bug is fixed.
@pytest.mark.ui
@pytest.mark.skip(reason="BUG-03: the calendar does not draw earlier booked dates as Unavailable")
def test_calendar_draws_earlier_booked_dates_as_unavailable(page: Page, room, user_api, api_url):
    booked = next_month_range(20, 2)
    r = user_api.post(f"{api_url}/booking", json=build_booking(room["roomid"], booked))
    assert r.status_code == 201, r.text

    other = next_month_range(5, 2)
    open_reservation(page, room, other)
    page.locator(".rbc-toolbar button", has_text="Next").click()

    expect(page.locator(".rbc-month-view .rbc-event", has_text="Unavailable")).to_be_visible()


# TC-UI-10
@pytest.mark.ui
def test_book_now_on_home_page_opens_reservation_with_dates(page: Page):
    with page.expect_response(
        lambda r: r.url.endswith("/api/room") and r.request.method == "GET"
    ) as resp:
        page.goto("/")
    assert resp.value.status == 200

    # NOT just "Book now": the hero banner also has a "Book Now" button (href="#booking").
    # We want the room card link, which points to the reservation page.
    link = page.locator("a.btn[href^='/reservation/']", has_text="Book now").first
    expect(link).to_have_attribute(
        "href",
        re.compile(r"^/reservation/\d+\?checkin=\d{4}-\d{2}-\d{2}&checkout=\d{4}-\d{2}-\d{2}$"),
    )


    link.click()
    expect(page).to_have_url(re.compile(r"/reservation/\d+"))
    expect(page.locator("#doReservation")).to_be_visible()