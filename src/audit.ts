import { chromium, Page } from 'playwright';
import * as cheerio from 'cheerio';
import AxeBuilder from '@axe-core/playwright';

export interface AuditResult {
    url: string;
    seo: {
        title: string;
        metaDescription: string;
        h1Count: number;
        canonicalUrl: string;
        ogTitle: string;
        ogImage: string;
    };
    accessibility: {
        violations: any[];
        violationCount: number;
    };
    links: {
        totalFound: number;
        brokenCount: number;
        brokenLinks: string[];
    };
}

export async function runDeepAudit(urls: string[]): Promise<AuditResult[]> {
    console.log(`\n--- Starting Deep Audit on ${urls.length} pages ---`);
    const results: AuditResult[] = [];
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    for (const url of urls) {
        console.log(`Auditing: ${url}`);
        const page = await context.newPage();
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            
            // Extract SEO data using Cheerio
            const content = await page.content();
            const $ = cheerio.load(content);
            
            const seo = {
                title: $('title').text() || '',
                metaDescription: $('meta[name="description"]').attr('content') || '',
                h1Count: $('h1').length,
                canonicalUrl: $('link[rel="canonical"]').attr('href') || '',
                ogTitle: $('meta[property="og:title"]').attr('content') || '',
                ogImage: $('meta[property="og:image"]').attr('content') || '',
            };

            // Run Accessibility Audit using Axe
            const accessibilityResults = await new AxeBuilder({ page }).analyze();
            
            // Link Checker
            const pageLinks = await page.$$eval('a', els => els.map(el => el.href).filter(href => href.startsWith('http')));
            const uniqueLinks = Array.from(new Set(pageLinks));
            const brokenLinks: string[] = [];
            
            console.log(`Checking ${uniqueLinks.length} links on ${url}...`);
            
            // Check links in parallel batches to be fast but polite
            const batchSize = 10;
            for (let i = 0; i < uniqueLinks.length; i += batchSize) {
                const batch = uniqueLinks.slice(i, i + batchSize);
                await Promise.all(batch.map(async (linkUrl) => {
                    try {
                        const res = await fetch(linkUrl, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
                        if (res.status >= 400 && res.status !== 403 && res.status !== 401) {
                             brokenLinks.push(linkUrl);
                        }
                    } catch (e) {
                        brokenLinks.push(linkUrl);
                    }
                }));
            }
            
            results.push({
                url,
                seo,
                accessibility: {
                    violations: accessibilityResults.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description })),
                    violationCount: accessibilityResults.violations.length
                },
                links: {
                    totalFound: uniqueLinks.length,
                    brokenCount: brokenLinks.length,
                    brokenLinks
                }
            });

        } catch (e) {
            console.error(`Failed to audit ${url}:`, (e as Error).message);
        } finally {
            await page.close();
        }
    }

    await browser.close();
    console.log('--- Deep Audit Complete ---\n');
    return results;
}
