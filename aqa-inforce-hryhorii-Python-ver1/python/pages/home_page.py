import re

from playwright.sync_api import Page, expect

BOOK_NOW_HREF = re.compile(
    r"^/reservation/\d+\?checkin=\d{4}-\d{2}-\d{2}&checkout=\d{4}-\d{2}-\d{2}$"
)


class HomePage:
    def __init__(self, page: Page):
        self.page = page
        # NOT just "Book now": the hero banner also has a "Book Now" button (href="#booking").
        # We want the room card link, which points to the reservation page.
        self.book_now_button = page.locator("a.btn[href^='/reservation/']", has_text="Book now")

    def visit(self):
        self.page.goto("/")
        return self

    def click_book_now(self):
        self.book_now_button.first.click()
        return self

    def assert_book_now_link_has_dates(self):
        expect(self.book_now_button.first).to_have_attribute("href", BOOK_NOW_HREF)
        return self