import os
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

from helpers import build_room

# Load environment variables from .env file if it exists
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

BASE_URL = os.getenv("BASE_URL", "https://automationintesting.online")
API_URL = os.getenv("API_URL", f"{BASE_URL}/api")
ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "password")


@pytest.fixture(scope="session")
def base_url():
    # used by pytest-playwright for page.goto("/relative/path")
    return BASE_URL


@pytest.fixture(scope="session")
def api_url():
    return API_URL


@pytest.fixture()
def admin_api(api_url):
    """requests.Session authorised as admin (token is stored in Cookie header)."""
    s = requests.Session()
    r = s.post(f"{api_url}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    token = r.json().get("token")
    if token:
        s.headers.update({"Cookie": f"token={token}"})
    return s


@pytest.fixture()
def user_api():
    """requests.Session WITHOUT any credentials – behaves like a site visitor."""
    return requests.Session()


def _find_room(user_api, api_url, name):
    rooms = user_api.get(f"{api_url}/room").json()["rooms"]
    return next((r for r in rooms if r["roomName"] == name), None)


@pytest.fixture()
def room(admin_api, user_api, api_url):
    """Creates a unique room via Admin API and deletes it after the test."""
    payload = build_room()
    r = admin_api.post(f"{api_url}/room", json=payload)
    assert r.status_code == 200, r.text
    created = _find_room(user_api, api_url, payload["roomName"])
    assert created, "created room not found in GET /api/room"
    yield created
    admin_api.delete(f"{api_url}/room/{created['roomid']}")
