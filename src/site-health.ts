import sslChecker from 'ssl-checker';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';
import path from 'path';

export interface SiteHealthResult {
    ssl: {
        valid: boolean;
        daysRemaining: number;
    };
    trafficAnomaly?: {
        currentUsers: number;
        previousUsers: number;
        percentChange: number;
        isAnomaly: boolean;
    };
    gscData?: {
        impressionsAnomaly: boolean;
        clicksAnomaly: boolean;
        currentImpressions: number;
        previousImpressions: number;
        currentClicks: number;
        previousClicks: number;
        avgPosition: number;
        topKeywords: { keyword: string; position: number; clicks: number; impressions: number }[];
    };
}

export async function checkSiteHealth(hostname: string, ga4PropertyId?: string, gscUrl?: string): Promise<SiteHealthResult> {
    console.log(`\n--- Running Site-Wide Health Checks for ${hostname} ---`);
    
    // 1. SSL Check
    let sslResult = { valid: false, daysRemaining: 0 };
    try {
        const ssl = await sslChecker(hostname);
        sslResult = {
            valid: ssl.valid,
            daysRemaining: ssl.daysRemaining
        };
        console.log(`SSL: ${sslResult.valid ? 'Valid' : 'Invalid'} (${sslResult.daysRemaining} days remaining)`);
    } catch (e) {
        console.error(`SSL Check failed for ${hostname}:`, (e as Error).message);
    }

    // 2. GA4 Traffic Anomaly Check
    let trafficAnomaly;
    if (ga4PropertyId) {
        try {
            console.log(`Checking GA4 Traffic for property ${ga4PropertyId}...`);
            const keyFile = path.join(__dirname, '../service_account.json');
            const analyticsDataClient = new BetaAnalyticsDataClient({ keyFilename: keyFile });

            // Fetch last 7 days
            const [currentResponse] = await analyticsDataClient.runReport({
                property: `properties/${ga4PropertyId}`,
                dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
                metrics: [{ name: 'activeUsers' }],
            });

            // Fetch previous 7 days for comparison
            const [previousResponse] = await analyticsDataClient.runReport({
                property: `properties/${ga4PropertyId}`,
                dateRanges: [{ startDate: '14daysAgo', endDate: '8daysAgo' }],
                metrics: [{ name: 'activeUsers' }],
            });

            const currentUsers = parseInt(currentResponse.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
            const previousUsers = parseInt(previousResponse.rows?.[0]?.metricValues?.[0]?.value || '0', 10);

            let percentChange = 0;
            if (previousUsers > 0) {
                percentChange = ((currentUsers - previousUsers) / previousUsers) * 100;
            }

            trafficAnomaly = {
                currentUsers,
                previousUsers,
                percentChange: Math.round(percentChange),
                isAnomaly: percentChange <= -40 // Flag if traffic dropped by 40% or more
            };
            
            console.log(`GA4 Traffic: ${currentUsers} users (last 7d) vs ${previousUsers} users (prev 7d) -> ${trafficAnomaly.percentChange}%`);

        } catch (e) {
            console.error(`GA4 Check failed for property ${ga4PropertyId}:`, (e as Error).message);
        }
    } else {
        console.log(`Skipping GA4: No property ID provided.`);
    }

    // 3. Google Search Console Check
    let gscData;
    if (gscUrl) {
        try {
            console.log(`Checking GSC for property ${gscUrl}...`);
            const keyFile = path.join(__dirname, '../service_account.json');
            const auth = new google.auth.GoogleAuth({
                keyFile,
                scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
            });
            const searchconsole = google.searchconsole({ version: 'v1', auth });

            // 7-day blocks (excluding today as GSC is usually 2-3 days delayed)
            const d1 = new Date(); d1.setDate(d1.getDate() - 3); const endDateStr = d1.toISOString().split('T')[0];
            const d2 = new Date(); d2.setDate(d2.getDate() - 9); const startDateStr = d2.toISOString().split('T')[0];
            
            const d3 = new Date(); d3.setDate(d3.getDate() - 10); const prevEndDateStr = d3.toISOString().split('T')[0];
            const d4 = new Date(); d4.setDate(d4.getDate() - 16); const prevStartDateStr = d4.toISOString().split('T')[0];

            const [currentRes, prevRes, topKeywordsRes] = await Promise.all([
                searchconsole.searchanalytics.query({
                    siteUrl: gscUrl,
                    requestBody: { startDate: startDateStr, endDate: endDateStr }
                }),
                searchconsole.searchanalytics.query({
                    siteUrl: gscUrl,
                    requestBody: { startDate: prevStartDateStr, endDate: prevEndDateStr }
                }),
                searchconsole.searchanalytics.query({
                    siteUrl: gscUrl,
                    requestBody: { startDate: startDateStr, endDate: endDateStr, dimensions: ['query'], rowLimit: 5 }
                })
            ]);

            const current = currentRes.data.rows?.[0] || { clicks: 0, impressions: 0, position: 0 };
            const previous = prevRes.data.rows?.[0] || { clicks: 0, impressions: 0, position: 0 };

            const clicksChange = previous.clicks ? ((current.clicks! - previous.clicks) / previous.clicks) * 100 : 0;
            const impressionsChange = previous.impressions ? ((current.impressions! - previous.impressions) / previous.impressions) * 100 : 0;

            const topKeywords = (topKeywordsRes.data.rows || []).map(r => ({
                keyword: r.keys?.[0] || '',
                position: r.position || 0,
                clicks: r.clicks || 0,
                impressions: r.impressions || 0
            }));

            gscData = {
                impressionsAnomaly: impressionsChange <= -30, // Drop by 30%
                clicksAnomaly: clicksChange <= -30,
                currentImpressions: current.impressions || 0,
                previousImpressions: previous.impressions || 0,
                currentClicks: current.clicks || 0,
                previousClicks: previous.clicks || 0,
                avgPosition: current.position || 0,
                topKeywords
            };

            console.log(`GSC Clicks: ${gscData.currentClicks} (prev: ${gscData.previousClicks}), Impressions: ${gscData.currentImpressions} (prev: ${gscData.previousImpressions}), Pos: ${gscData.avgPosition.toFixed(1)}`);
            
        } catch (e) {
            console.error(`GSC Check failed for ${gscUrl}:`, (e as Error).message);
        }
    } else {
        console.log(`Skipping GSC: No gscUrl provided.`);
    }

    return {
        ssl: sslResult,
        trafficAnomaly,
        gscData
    };
}
