import { PlaywrightCrawler, Dataset, enqueueLinks, Sitemap, RequestQueue } from 'crawlee';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';

const sitesFile = path.join(__dirname, '../sites.json');
const sites = JSON.parse(fs.readFileSync(sitesFile, 'utf-8'));

interface PageData {
    url: string;
    status: number;
    internalInboundLinks: number;
    title: string;
}

async function fetchSitemapUrls(baseUrl: string, productionBaseUrl?: string): Promise<string[]> {
    const sitemapUrl = new URL('/sitemap.xml', baseUrl).href;
    console.log(`Checking for sitemap at ${sitemapUrl}...`);
    try {
        const { urls } = await Sitemap.load(sitemapUrl);
        if (urls && urls.length > 0) {
            console.log(`Found sitemap with ${urls.length} URLs.`);
            if (productionBaseUrl) {
                return urls.map(u => u.replace(productionBaseUrl, baseUrl.replace(/\/$/, '')));
            }
            return urls;
        }
    } catch (e) {
        console.log(`Failed to load or parse sitemap at ${sitemapUrl}:`, (e as Error).message);
    }
    return [];
}

async function processSite(site: any) {
    const targetUrl = site.url;
    const siteId = site.id;
    const targetDomain = new URL(targetUrl).hostname;
    const pageGraph = new Map<string, PageData>();
    
    console.log(`\n========================================`);
    console.log(`Starting audit for ${site.name} (${targetUrl})...`);

    let startUrls: string[] = [];
    // Hardcoded production url mapping just for our initial staging case, generic enough for now
    const prodUrl = siteId === 'puzzledaddy-staging' ? 'https://www.puzzledaddy.store' : undefined;
    const sitemapUrls = await fetchSitemapUrls(targetUrl, prodUrl);

    if (sitemapUrls.length > 0) {
        console.log('Using sitemap URLs as primary crawl source.');
        startUrls = sitemapUrls;
    } else {
        console.log('No sitemap found. Falling back to homepage crawl.');
        startUrls = [targetUrl];
    }

    // Use a fresh named queue for each site so state doesn't leak between crawls
    const queueName = `queue-${siteId}`;
    const requestQueue = await RequestQueue.open(queueName);
    await requestQueue.drop(); // clear any previous run state
    const cleanQueue = await RequestQueue.open(queueName);

    const crawler = new PlaywrightCrawler({
        requestQueue: cleanQueue,
        maxRequestsPerCrawl: 100,
        
        async requestHandler({ request, page, enqueueLinks, response, log }) {
            const url = request.loadedUrl || request.url;
            const status = response?.status() || 0;
            const title = await page.title().catch(() => '');
            
            log.info(`Crawled ${url} - Status: ${status}`);

            if (!pageGraph.has(url)) {
                pageGraph.set(url, { url, status, internalInboundLinks: 0, title });
            } else {
                const existing = pageGraph.get(url)!;
                existing.status = status;
                existing.title = title;
            }

            const links = await page.$$eval('a', (els) => els.map(el => el.href));
            
            for (const href of links) {
                try {
                    const parsedUrl = new URL(href);
                    if (parsedUrl.hostname === targetDomain) {
                        parsedUrl.hash = '';
                        const cleanUrl = parsedUrl.href;
                        
                        if (!pageGraph.has(cleanUrl)) {
                             pageGraph.set(cleanUrl, { url: cleanUrl, status: 0, internalInboundLinks: 1, title: '' });
                        } else {
                             pageGraph.get(cleanUrl)!.internalInboundLinks++;
                        }
                    }
                } catch (e) {
                    // Ignore invalid URLs
                }
            }

            // Always enqueue to find orphaned pages and count links
            await enqueueLinks({
                strategy: 'same-domain',
            });
        },
        
        failedRequestHandler({ request, log }) {
            log.error(`Request ${request.url} failed too many times.`);
            if (!pageGraph.has(request.url)) {
                 pageGraph.set(request.url, { url: request.url, status: 0, internalInboundLinks: 0, title: '' });
            }
        },
    });

    await crawler.run(startUrls);

    console.log('\n--- Crawl Complete ---');
    console.log(`Total Pages Discovered: ${pageGraph.size}`);
    
    const sortedPages = Array.from(pageGraph.values()).sort((a, b) => b.internalInboundLinks - a.internalInboundLinks);
    const brokenLinksCount = Array.from(pageGraph.values()).filter(p => p.status >= 400).length;
    
    // --- Phase 3: Deep Audit ---
    const { runDeepAudit } = await import('./audit');
    
    const sampleUrlsSet = new Set<string>();
    
    // Always include the root/home page
    const homepageRegex = new RegExp(`^${targetUrl.replace(/\/$/, '')}/?$`);
    const homepageNode = sortedPages.find(p => homepageRegex.test(p.url));
    if (homepageNode) sampleUrlsSet.add(homepageNode.url);
    else sampleUrlsSet.add(targetUrl);

    for (const p of sortedPages) {
        if (sampleUrlsSet.size >= 5) break;
        if (p.status < 400) {
            sampleUrlsSet.add(p.url);
        }
    }
    const sampleUrls = Array.from(sampleUrlsSet);
    const auditResults = await runDeepAudit(sampleUrls);
    
    // --- Phase 4: Reporting ---
    const { generateReport } = await import('./report');
    const summary = await generateReport(siteId, site.name, targetUrl, auditResults, sortedPages.length, brokenLinksCount);
    return summary;
}

async function start() {
    const siteSummaries = [];
    
    for (const site of sites) {
        try {
            const summary = await processSite(site);
            siteSummaries.push(summary);
        } catch (e) {
            console.error(`Error processing site ${site.id}:`, e);
        }
    }
    
    // Generate Hub Dashboard
    const { generateDashboard } = await import('./report');
    await generateDashboard(siteSummaries);

    console.log('\n--- Web Monitor Toolkit Execution Complete ---');
    process.exit(0);
}

start().catch((e) => {
    console.error(e);
    process.exit(1);
});