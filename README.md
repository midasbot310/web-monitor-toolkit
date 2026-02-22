# Web Monitor Toolkit

A Python-based toolkit for auditing and monitoring websites. Designed to be extensible and modular.

## Features

- **Health Checks:** Monitor HTTP status codes, response times, and redirects.
- **SEO Audits:** Check for critical meta tags (Title, Description, H1, Canonical).
- **Security Audits:** Verify SSL certificate validity and expiration.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/midasbot310/web-monitor-toolkit.git
    cd web-monitor-toolkit
    ```

2.  (Optional) Create a virtual environment:
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    ```

3.  Install dependencies (if any):
    ```bash
    pip install -r requirements.txt
    ```
    *Note: Currently, the toolkit uses standard Python libraries only, so no external dependencies are required.*

## Usage

1.  Edit `config.json` to add target websites:
    ```json
    {
      "sites": [
        "https://www.puzzledaddy.store/"
      ],
      "settings": {
        "timeout": 10
      }
    }
    ```

2.  Run the audit:
    ```bash
    python3 main.py
    ```

3.  Audit a specific URL:
    ```bash
    python3 main.py --url https://example.com
    ```

## Future Roadmap

- [ ] Broken Link Checker (Recursive Crawler)
- [ ] Core Web Vitals (via Lighthouse/PageSpeed API)
- [ ] Accessibility Checks (WCAG compliance)
- [ ] Keyword Ranking Tracker
- [ ] Email Alerts for Downtime
