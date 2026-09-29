import requests

import pytest

from helpers import build_booking, build_room, next_month_range

pytestmark = pytest.mark.api


def get_rooms(user_api, api_url):
    r = user_api.get(f"{api_url}/room")
    assert r.status_code == 200
    return r.json()["rooms"]


# TC-API-01
def test_create_room_admin_visible_for_user(room, user_api, api_url):
    found = next(r for r in get_rooms(user_api, api_url) if r["roomid"] == room["roomid"])
    assert found["type"] == "Double"
    assert found["accessible"] is True
    assert found["roomPrice"] == 150


# TC-API-02
def test_book_room_user_visible_for_admin(room, admin_api, user_api, api_url):
    dates = next_month_range(10, 2)
    r = user_api.post(f"{api_url}/booking", json=build_booking(room["roomid"], dates))
    assert r.status_code == 201, r.text

    bookings = admin_api.get(f"{api_url}/booking", params={"roomid": room["roomid"]}).json()["bookings"]
    assert len(bookings) == 1
    assert bookings[0]["firstname"] == "John"
    assert bookings[0]["lastname"] == "Tester"
    assert bookings[0]["bookingdates"] == dates

    # Booking summary requires auth - use admin_api
    summary = admin_api.get(f"{api_url}/booking/summary", params={"roomid": room["roomid"]})
    assert len(summary.json()["bookings"]) == 1


# TC-API-03
def test_edit_room_admin_visible_for_user(room, admin_api, user_api, api_url):
    updated = build_room(
        roomName=room["roomName"],
        type="Suite",
        roomPrice=275,
        accessible=False,
        description="Updated description of the automated test room, long enough.",
        features=["Views", "TV"],
    )
    r = admin_api.put(f"{api_url}/room/{room['roomid']}", json={"roomid": room["roomid"], **updated})
    assert r.status_code in (200, 202), r.text  # 200 on the site, 202 in the service

    found = next(x for x in get_rooms(user_api, api_url) if x["roomid"] == room["roomid"])
    assert found["type"] == "Suite"
    assert found["roomPrice"] == 275
    assert found["accessible"] is False
    assert found["description"] == updated["description"]
    assert sorted(found["features"]) == ["TV", "Views"]


# TC-API-04
def test_delete_room_admin_removed_for_user(room, admin_api, user_api, api_url):
    r = admin_api.delete(f"{api_url}/room/{room['roomid']}")
    assert r.status_code in (200, 202, 204)

    assert room["roomid"] not in [x["roomid"] for x in get_rooms(user_api, api_url)]


# TC-API-05 (negative)
def test_create_room_without_auth_is_rejected(user_api, api_url):
    r = user_api.post(f"{api_url}/room", json=build_room())
    assert r.status_code == 401


# TC-API-06 (negative)
def test_booking_with_invalid_data_is_rejected(room, user_api, api_url):
    dates = next_month_range(5, 2)
    body = build_booking(room["roomid"], dates, email="invalid", firstname="Jo")
    assert user_api.post(f"{api_url}/booking", json=body).status_code == 400


# TC-API-07
def test_home_page_loads_rooms_from_api(room, user_api, api_url):
    r = user_api.get(f"{api_url}/room")
    assert r.status_code == 200
    assert r.json()["rooms"]
    assert room["roomid"] in [x["roomid"] for x in r.json()["rooms"]]


# TC-API-08
def test_same_dates_cannot_be_booked_twice(room, user_api, api_url):
    dates = next_month_range(14, 3)

    r = user_api.post(f"{api_url}/booking", json=build_booking(room["roomid"], dates))
    assert r.status_code == 201

    # identical dates
    r = user_api.post(f"{api_url}/booking", json=build_booking(room["roomid"], dates))
    assert r.status_code == 409

    # overlapping dates
    overlapping = next_month_range(15, 3)
    r = user_api.post(f"{api_url}/booking", json=build_booking(room["roomid"], overlapping))
    assert r.status_code == 409


# TC-API-09
def test_wrong_credentials_and_anonymous_access_are_rejected(api_url):
    # wrong password
    r = requests.post(
        f"{api_url}/auth/login",
        json={"username": "admin", "password": "definitely-wrong"},
    )
    assert r.status_code in (401, 403)

    # anonymous access to bookings
    r = requests.get(f"{api_url}/booking?roomid=123")
    assert r.status_code in (401, 403)
