import json
import argparse
import sys
import os
from datetime import datetime

# Add current directory to path so imports work
sys.path.append(os.getcwd())

from core.auditor import WebsiteAuditor
from plugins.seo import SEOAuditor
from plugins.health import HealthAuditor
from plugins.security import SecurityAuditor

def load_config(path='config.json'):
    if not os.path.exists(path):
        default_config = {
            "sites": [
                "https://www.puzzledaddy.store/"
            ],
            "settings": {
                "timeout": 10,
                "user_agent": "MidasBot-WebMonitor/1.0"
            }
        }
        with open(path, 'w') as f:
            json.dump(default_config, f, indent=4)
        return default_config
    
    with open(path, 'r') as f:
        return json.load(f)

def main():
    parser = argparse.ArgumentParser(description="MidasBot Web Monitor Toolkit")
    parser.add_argument('--url', help='Target URL to audit (overrides config)')
    args = parser.parse_args()

    config = load_config()
    sites = [args.url] if args.url else config.get('sites', [])

    print(f"Starting audit for {len(sites)} sites...")
    print("-" * 50)

    for url in sites:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Auditing: {url}")
        
        auditor = WebsiteAuditor(url, config['settings'])
        
        # Run Health Check first
        health_results = HealthAuditor(auditor).run()
        print(f"  Health: {health_results}")

        if health_results.get('status') == 200:
            # Run other checks if site is up
            seo_results = SEOAuditor(auditor).run()
            print(f"  SEO: {seo_results}")

            sec_results = SecurityAuditor(auditor).run()
            print(f"  Security: {sec_results}")
        
        print("-" * 50)

if __name__ == "__main__":
    main()
