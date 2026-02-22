import requests
import time
import socket
import ssl
import re

class WebsiteAuditor:
    def __init__(self, url, settings):
        self.url = url
        self.settings = settings
        self.response = None
        self.html = None
        self.start_time = 0
        self.end_time = 0

    def fetch(self):
        """Fetch the URL and store response."""
        try:
            headers = {'User-Agent': self.settings.get('user_agent', 'Mozilla/5.0')}
            self.start_time = time.time()
            self.response = requests.get(self.url, headers=headers, timeout=self.settings.get('timeout', 10), allow_redirects=True)
            self.end_time = time.time()
            self.html = self.response.text
            return True
        except requests.exceptions.RequestException as e:
            print(f"Fetch Error: {e}")
            self.response = None
            return False

    def get_status_code(self):
        if self.response:
            return self.response.status_code
        return None

    def get_response_time(self):
        if self.end_time > 0:
            return round((self.end_time - self.start_time) * 1000, 2)
        return -1

    def get_html_content(self):
        return self.html or ""

    def get_domain(self):
        # simple regex to extract domain
        match = re.search(r"https?://(?:www\.)?([^/]+)", self.url)
        return match.group(1) if match else None
