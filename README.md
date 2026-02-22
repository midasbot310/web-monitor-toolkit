# Web Monitor Toolkit

A Python-based toolkit for auditing and monitoring websites. Designed to be extensible and modular.

## Features

- **Recursive Crawler:** Maps internal site structure.
- **Health Checks:** Monitor HTTP status codes, response times, and redirects.
- **SEO Audits:** Check for critical meta tags (Title, Description, H1, Canonical).
- **Security Audits:** Verify SSL certificate validity and expiration.
- **Google Integration (Stub):** Hooks for Google Analytics 4 and Search Console.
- **Reporting:** Generates HTML dashboard with metrics.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/midasbot310/web-monitor-toolkit.git
    cd web-monitor-toolkit
    ```

## Usage

1.  Edit `config.json` to add target websites and configure settings.

2.  Run the audit (crawl mode):
    ```bash
    python3 main.py --crawl --url https://www.puzzledaddy.store/
    ```

3.  The report will be generated as `report_YYYYMMDD.html`.

## Google Integration

To enable real Google data:
1.  Obtain a `service_account.json` from Google Cloud Console.
2.  Install libraries: `pip install google-api-python-client google-analytics-data`
3.  Update `plugins/google_services.py` with the actual API calls (currently stubs).
4.  Update `config.json` with your Property IDs.
