import json
from datetime import datetime
import os

class HTMLReporter:
    def __init__(self, filename="report.html"):
        self.filename = filename
        self.timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def generate(self, crawl_results, google_data=None):
        """Generates a simple HTML dashboard of the crawl results."""
        
        # Calculate summary metrics
        total_pages = len(crawl_results)
        total_errors = sum(1 for res in crawl_results.values() if res.get_status_code() != 200)
        avg_response_time = sum(res.get_response_time() for res in crawl_results.values()) / total_pages if total_pages > 0 else 0

        html = f"""
        <html>
        <head>
            <title>Web Monitor Report - {self.timestamp}</title>
            <style>
                body {{ font-family: sans-serif; padding: 20px; }}
                h1 {{ color: #333; }}
                .summary {{ display: flex; gap: 20px; margin-bottom: 20px; }}
                .card {{ border: 1px solid #ddd; padding: 15px; border-radius: 5px; min-width: 150px; text-align: center; }}
                .card h3 {{ margin: 0; font-size: 2em; }}
                .card p {{ margin: 5px 0 0; color: #666; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                th, td {{ padding: 10px; border: 1px solid #ddd; text-align: left; }}
                th {{ background: #f4f4f4; }}
                .error {{ color: red; font-weight: bold; }}
                .ok {{ color: green; }}
            </style>
        </head>
        <body>
            <h1>Web Monitor Report</h1>
            <p>Generated: {self.timestamp}</p>
            
            <div class="summary">
                <div class="card">
                    <h3>{total_pages}</h3>
                    <p>Pages Crawled</p>
                </div>
                <div class="card">
                    <h3 class="{ 'error' if total_errors > 0 else 'ok' }">{total_errors}</h3>
                    <p>Errors (4xx/5xx)</p>
                </div>
                <div class="card">
                    <h3>{avg_response_time:.0f}ms</h3>
                    <p>Avg Response Time</p>
                </div>
        """

        if google_data:
            ga = google_data.get('ga', {})
            gsc = google_data.get('gsc', {})
            html += f"""
                <div class="card">
                    <h3>{ga.get('users', 'N/A')}</h3>
                    <p>Active Users (7d)</p>
                </div>
                <div class="card">
                    <h3>{gsc.get('clicks', 'N/A')}</h3>
                    <p>Search Clicks (7d)</p>
                </div>
            """

        html += """
            </div>
            
            <h2>Page Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>URL</th>
                        <th>Status</th>
                        <th>Time (ms)</th>
                        <th>Title</th>
                    </tr>
                </thead>
                <tbody>
        """

        for url, auditor in crawl_results.items():
            status = auditor.get_status_code()
            status_class = "error" if status != 200 else "ok"
            title = "N/A" # Would need SEO plugin run on each page to populate this properly
            # For MVP, we can grab title via regex again or rely on the SEO plugin integration logic in main.py
            
            html += f"""
                <tr>
                    <td><a href="{url}" target="_blank">{url}</a></td>
                    <td class="{status_class}">{status}</td>
                    <td>{auditor.get_response_time()}</td>
                    <td>-</td> 
                </tr>
            """

        html += """
                </tbody>
            </table>
        </body>
        </html>
        """

        with open(self.filename, "w") as f:
            f.write(html)
        
        print(f"Report generated: {self.filename}")
