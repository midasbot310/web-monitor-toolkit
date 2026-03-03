import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import { AuditResult } from './audit';

const dataDir = path.join(__dirname, '../data');
const publicDir = path.join(__dirname, '../public');

export interface ReportData {
    timestamp: string;
    siteId: string;
    siteName: string;
    targetUrl: string;
    results: AuditResult[];
    previousResults?: AuditResult[];
    diffs?: any;
}

export interface SiteSummary {
    siteId: string;
    siteName: string;
    targetUrl: string;
    totalPagesDiscovered: number;
    auditPageCount: number;
    brokenLinksCount: number;
    totalAccessibilityViolations: number;
    violationDiff: number; // vs previous run
    timestamp: string;
}

export async function generateReport(siteId: string, siteName: string, targetUrl: string, currentResults: AuditResult[], totalPagesDiscovered: number, brokenLinksCount: number): Promise<SiteSummary> {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

    const latestFile = path.join(dataDir, `${siteId}_latest.json`);
    const previousFile = path.join(dataDir, `${siteId}_previous.json`);

    let previousResults: AuditResult[] | undefined;

    // Rotate latest to previous
    if (fs.existsSync(latestFile)) {
        fs.copyFileSync(latestFile, previousFile);
        previousResults = JSON.parse(fs.readFileSync(previousFile, 'utf-8'));
    }

    // Save new latest
    fs.writeFileSync(latestFile, JSON.stringify(currentResults, null, 2));

    const totalViolations = currentResults.reduce((acc, r) => acc + r.accessibility.violationCount, 0);
    
    let previousTotalViolations = 0;
    if (previousResults) {
        previousTotalViolations = previousResults.reduce((acc, r) => acc + r.accessibility.violationCount, 0);
    }
    const violationDiff = previousResults ? (totalViolations - previousTotalViolations) : 0;

    const reportData: ReportData = {
        timestamp: new Date().toISOString(),
        siteId,
        siteName,
        targetUrl,
        results: currentResults,
        previousResults
    };

    // Render HTML for the specific site
    const templatePath = path.join(__dirname, '../views/report.ejs');
    if (fs.existsSync(templatePath)) {
        const html = await ejs.renderFile(templatePath, { report: reportData });
        const outPath = path.join(publicDir, `${siteId}.html`);
        fs.writeFileSync(outPath, html);
        console.log(`Report generated successfully: ${outPath}`);
    }

    return {
        siteId,
        siteName,
        targetUrl,
        totalPagesDiscovered,
        auditPageCount: currentResults.length,
        brokenLinksCount,
        totalAccessibilityViolations: totalViolations,
        violationDiff,
        timestamp: reportData.timestamp
    };
}

export async function generateDashboard(summaries: SiteSummary[]) {
    const templatePath = path.join(__dirname, '../views/dashboard.ejs');
    if (fs.existsSync(templatePath)) {
        const html = await ejs.renderFile(templatePath, { summaries });
        const outPath = path.join(publicDir, 'index.html');
        fs.writeFileSync(outPath, html);
        console.log(`\nHub Dashboard generated successfully: ${outPath}`);
    }
}