# Web Monitor Toolkit

A high-performance, Hub-and-Spoke toolkit for auditing, monitoring, and tracking the health of multiple websites. Built with **TypeScript**, **Node.js**, **Playwright**, and **Crawlee**.

## Features

- **Multi-Site Hub Dashboard:** Manage and view top-level metrics for 5-10+ domains in one place.
- **Sitemap Crawling:** Automatically fetches `sitemap.xml` and discovers all relevant URLs.
- **Internal Link Analysis:** Builds a site map graph and automatically samples the most-interlinked pages.
- **Deep Audits:** Uses Playwright to extract SEO (Titles, Meta, H1s), Open Graph data, and Canonical Tags.
- **Accessibility:** Runs full WCAG compliance checks using `axe-core`.
- **Historical Diffing:** Tracks daily changes (e.g., "Gained 2 accessibility warnings since yesterday").

---

## Installation & Setup

> **Note:** This toolkit is built in **Node.js / TypeScript**, not Python. It requires Node and NPM to be installed on your system.

### 1. Prerequisites
Ensure you have Node.js (v18+) installed.

### 2. Install Dependencies
Clone the repository, then install the required Node modules and Playwright browsers:

```bash
# Install package dependencies
npm install

# Install Playwright headless browsers (required for crawling and Axe-Core)
npx playwright install chromium
```

### 3. Configuration
Add the domains you want to track to the `sites.json` file in the root directory.

```json
[
  {
    "id": "puzzledaddy-staging",
    "name": "Puzzledaddy Staging",
    "url": "https://puzzle-dev--puzzledaddy.netlify.app/"
  },
  {
    "id": "puzzledaddy-prod",
    "name": "Puzzledaddy Production",
    "url": "https://www.puzzledaddy.store/"
  }
]
```

---

## Running the Toolkit

To execute the crawl, audit, and report generation pipeline:

```bash
npm start
```

*(Alternatively: `npx ts-node src/index.ts`)*

### Output

1. **Raw Data:** JSON results are saved in the `data/` directory (e.g., `puzzledaddy-staging_latest.json`).
2. **Dashboard:** A static HTML Hub and individual site reports are generated in the `public/` directory.

To view the results, open `public/index.html` in your web browser.

---

## Architecture Overview

1. **Crawler Phase:** Maps the entire domain via sitemap and checks for global 404s.
2. **Sampling Phase:** Selects the homepage + top most-linked pages for deep analysis.
3. **Audit Phase:** Runs `cheerio` and `axe-core` via Playwright headless browser to extract SEO data and find accessibility violations.
4. **Reporting Phase:** Generates a clean EJS-templated HTML dashboard with 24-hour historical diff tracking.
