import sslChecker from 'ssl-checker';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
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
}

export async function checkSiteHealth(hostname: string, ga4PropertyId?: string): Promise<SiteHealthResult> {
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
            const keyFile = path.join(__dirname, '../../service_account.json');
            const analyticsDataClient = new BetaAnalyticsDataClient({ keyFilename: keyFile });

            // Fetch last 3 days
            const [currentResponse] = await analyticsDataClient.runReport({
                property: `properties/${ga4PropertyId}`,
                dateRanges: [{ startDate: '3daysAgo', endDate: 'today' }],
                metrics: [{ name: 'activeUsers' }],
            });

            // Fetch previous 3 days for comparison
            const [previousResponse] = await analyticsDataClient.runReport({
                property: `properties/${ga4PropertyId}`,
                dateRanges: [{ startDate: '6daysAgo', endDate: '4daysAgo' }],
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
            
            console.log(`GA4 Traffic: ${currentUsers} users (last 3d) vs ${previousUsers} users (prev 3d) -> ${trafficAnomaly.percentChange}%`);

        } catch (e) {
            console.error(`GA4 Check failed for property ${ga4PropertyId}:`, (e as Error).message);
        }
    } else {
        console.log(`Skipping GA4: No property ID provided.`);
    }

    return {
        ssl: sslResult,
        trafficAnomaly
    };
}
