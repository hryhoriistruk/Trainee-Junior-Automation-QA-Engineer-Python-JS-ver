"""API client abstraction for the room booking application."""

import os
from typing import Dict, List, Optional

import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_URL = os.getenv("API_URL", "https://automationintesting.online/api")
ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "password")


class APIClient:
    """Base API client for the booking application."""

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.token: Optional[str] = None

    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        json: Optional[Dict] = None,
        headers: Optional[Dict] = None,
        **kwargs,
    ) -> requests.Response:
        """Make an HTTP request."""
        url = f"{self.base_url}{endpoint}"
        if headers is None:
            headers = {}
        if self.token:
            headers["Cookie"] = f"token={self.token}"
        return self.session.request(method, url, params=params, json=json, headers=headers, **kwargs)


class AdminAPIClient(APIClient):
    """Admin API client with authentication."""

    def __init__(self, base_url: str = BASE_URL):
        super().__init__(base_url)
        self.login()

    def login(self) -> None:
        """Authenticate as admin and store the token."""
        response = self._request(
            "POST",
            "/auth/login",
            json={"username": ADMIN_USER, "password": ADMIN_PASSWORD},
        )
        response.raise_for_status()
        self.token = response.json().get("token")
        if not self.token:
            raise ValueError("Login failed: no token received")

    def create_room(self, room_data: Dict) -> Dict:
        """Create a new room."""
        response = self._request("POST", "/room", json=room_data)
        response.raise_for_status()
        return response.json()

    def update_room(self, room_id: int, room_data: Dict) -> requests.Response:
        """Update an existing room."""
        return self._request("PUT", f"/room/{room_id}", json={"roomid": room_id, **room_data})

    def delete_room(self, room_id: int) -> requests.Response:
        """Delete a room."""
        return self._request("DELETE", f"/room/{room_id}")

    def get_bookings(self, room_id: int) -> List[Dict]:
        """Get all bookings for a specific room."""
        response = self._request("GET", "/booking", params={"roomid": room_id})
        response.raise_for_status()
        return response.json().get("bookings", [])


class UserAPIClient(APIClient):
    """User API client (no authentication required)."""

    def get_rooms(self) -> List[Dict]:
        """Get all available rooms."""
        response = self._request("GET", "/room")
        response.raise_for_status()
        return response.json().get("rooms", [])

    def book_room(self, booking_data: Dict) -> requests.Response:
        """Create a booking."""
        return self._request("POST", "/booking", json=booking_data)

    def get_unavailable_dates(self, room_id: int) -> List[Dict]:
        """Get unavailable dates for a room."""
        response = self._request("GET", f"/report/room/{room_id}")
        response.raise_for_status()
        body = response.json()
        # Handle both array and object response formats
        return body if isinstance(body, list) else body.get("report", [])
