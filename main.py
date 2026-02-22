import json
import argparse
import sys
import os
from datetime import datetime

# Add current directory to path so imports work
sys.path.append(os.getcwd())

from core.auditor import WebsiteAuditor
from core.reporter import HTMLReporter
from plugins.seo import SEOAuditor
from plugins.health import HealthAuditor
from plugins.security import SecurityAuditor
from plugins.crawler import Crawler
from plugins.google_services import GoogleAnalytics, GoogleSearchConsole

def load_config(path='config.json'):
    if not os.path.exists(path):
        default_config = {
            "sites": [
                "https://www.puzzledaddy.store/"
            ],
            "settings": {
                "timeout": 10,
                "user_agent": "MidasBot-WebMonitor/1.0",
                "crawl_limit": 50
            },
            "google_services": {
                "enabled": False,
                "ga_property_id": "YOUR_GA4_PROPERTY_ID",
                "gsc_site_url": "YOUR_GSC_SITE_URL",
                "service_account_file": "path/to/service_account.json"
            }
        }
        with open(path, 'w') as f:
            json.dump(default_config, f, indent=4)
        return default_config
    
    with open(path, 'r') as f:
        return json.load(f)

def run_single_audit(url, config):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Auditing: {url}")
    auditor = WebsiteAuditor(url, config['settings'])
    
    # Run Health Check first
    health_results = HealthAuditor(auditor).run()
    
    seo_results = {}
    sec_results = {}

    if health_results.get('status') == 200:
        seo_results = SEOAuditor(auditor).run()
        sec_results = SecurityAuditor(auditor).run()

    return {
        "url": url,
        "health": health_results,
        "seo": seo_results,
        "security": sec_results,
        "auditor": auditor
    }

def main():
    parser = argparse.ArgumentParser(description="MidasBot Web Monitor Toolkit")
    parser.add_argument('--url', help='Target URL to audit (overrides config)')
    parser.add_argument('--crawl', action='store_true', help='Crawl the site for internal links')
    args = parser.parse_args()

    config = load_config()
    sites = [args.url] if args.url else config.get('sites', [])

    print(f"Starting audit for {len(sites)} sites...")
    print("-" * 50)

    for base_url in sites:
        final_results = {}
        
        if args.crawl or config.get('settings', {}).get('crawl_enabled', False):
            crawler = Crawler(base_url, config['settings'])
            crawl_results = crawler.crawl(limit=config['settings'].get('crawl_limit', 50))
            
            # Use crawler results directly
            # Re-map results to structure reporter expects
            mapped_results = {}
            for url, auditor in crawl_results.items():
                mapped_results[url] = auditor
            
            # Google Services Check (Stub)
            google_data = {}
            gs_conf = config.get('google_services', {})
            if gs_conf.get('enabled'):
                ga = GoogleAnalytics(gs_conf.get('ga_property_id'), gs_conf.get('service_account_file'))
                gsc = GoogleSearchConsole(gs_conf.get('gsc_site_url'), gs_conf.get('service_account_file'))
                
                # These will print connection stubs
                ga.connect() 
                gsc.connect()
                
                google_data = {
                    'ga': ga.get_users(),
                    'gsc': gsc.get_performance()
                }

            # Generate Report
            reporter = HTMLReporter(f"report_{datetime.now().strftime('%Y%m%d')}.html")
            reporter.generate(mapped_results, google_data)

        else:
            # Single page mode
            res = run_single_audit(base_url, config)
            print(f"  Health: {res['health']}")
            print(f"  SEO: {res['seo']}")
            print(f"  Security: {res['security']}")
        
        print("-" * 50)

if __name__ == "__main__":
    main()
