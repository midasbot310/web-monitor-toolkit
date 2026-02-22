import re
from urllib.parse import urljoin, urlparse
from collections import deque
from core.auditor import WebsiteAuditor

class Crawler:
    def __init__(self, start_url, settings):
        self.start_url = start_url
        self.settings = settings
        self.visited = set()
        self.queue = deque([start_url])
        self.domain = urlparse(start_url).netloc
        self.results = {}

    def is_internal(self, url):
        return urlparse(url).netloc == self.domain

    def get_links(self, html, base_url):
        links = set()
        # Simple regex to find hrefs. 
        # Note: A real HTML parser (HTMLParser or BeautifulSoup) is better, 
        # but regex works for a dependency-free MVP.
        pattern = r'href=["\'](.*?)["\']'
        matches = re.findall(pattern, html, re.IGNORECASE)
        
        for match in matches:
            # Clean url
            url = match.split('#')[0] 
            full_url = urljoin(base_url, url)
            
            if self.is_internal(full_url) and full_url not in self.visited:
                links.add(full_url)
        return links

    def crawl(self, limit=50):
        print(f"Starting crawl of {self.start_url} (Limit: {limit} pages)...")
        
        while self.queue and len(self.visited) < limit:
            url = self.queue.popleft()
            
            if url in self.visited:
                continue
            
            print(f"  Crawling: {url}")
            
            auditor = WebsiteAuditor(url, self.settings)
            success = auditor.fetch()
            
            if success:
                self.visited.add(url)
                self.results[url] = auditor
                
                html = auditor.get_html_content()
                links = self.get_links(html, url)
                
                for link in links:
                    if link not in self.visited:
                        self.queue.append(link)
            else:
                print(f"  Failed to fetch: {url}")

        print(f"Crawl complete. Visited {len(self.visited)} pages.")
        return self.results
