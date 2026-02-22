import re

class SEOAuditor:
    def __init__(self, auditor):
        self.auditor = auditor

    def run(self):
        """Perform basic SEO checks: Title, Description, H1."""
        results = {}
        html = self.auditor.get_html_content()
        
        # 1. Title Tag
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        if title_match:
            results['title'] = title_match.group(1).strip()
        else:
            results['title'] = None

        # 2. Meta Description
        desc_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', html, re.IGNORECASE)
        if desc_match:
            results['description'] = desc_match.group(1).strip()
        else:
            results['description'] = None

        # 3. H1 Heading
        h1_match = re.search(r'<h1.*?>(.*?)</h1>', html, re.IGNORECASE | re.DOTALL)
        if h1_match:
            # strip tags from within h1
            h1_text = re.sub(r'<[^>]*>', '', h1_match.group(1))
            results['h1'] = h1_text.strip()
        else:
            results['h1'] = None

        # 4. Canonical URL (if exists)
        canon_match = re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\'](.*?)["\']', html, re.IGNORECASE)
        if canon_match:
            results['canonical'] = canon_match.group(1)
        else:
            results['canonical'] = None

        return results
