#!/usr/bin/env bun
/**
 * Import historical data from existing markdown reports
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import type { HistoricalDataPoint, HistoricalData } from "./history.js";
import { saveHistory, loadHistory } from "./history.js";
import { getConfig } from "./config.js";

interface ParsedReport {
  timestamp: string;
  windowHours: number;
  prsCreated: number;
  prsClosed: number;
  prsMerged: number;
  prsOpen: number;
  issuesCreated: number;
  issuesClosed: number;
  issuesOpen: number;
  mergeRate: number;
  health: "healthy" | "warning" | "critical";
  hotZones: Array<{ label: string; count: number }>;
  topContributors: Array<{ login: string; activity: number }>;
  newcomersCount: number;
  quickWinsCount: number;
  topQuickWinScore: number;
}

function parseMarkdownReport(content: string): ParsedReport | null {
  try {
    // Extract timestamp
    const genMatch = content.match(/\*\*Generated:\*\* (.+)/);
    if (!genMatch) return null;
    const timestamp = new Date(genMatch[1].replace(" UTC", "Z")).toISOString();
    
    // Extract window
    const windowMatch = content.match(/\*\*Window:\*\* (\d+)h/);
    const windowHours = windowMatch ? parseInt(windowMatch[1]) : 4;
    
    // Extract vital signs from table
    const prsCreatedMatch = content.match(/PRs Created \| (\d+)/);
    const prsClosedMatch = content.match(/PRs Closed \| (\d+)/);
    const prsMergedMatch = content.match(/PRs Merged \| (\d+)/);
    const prsOpenMatch = content.match(/Open PRs \| (\d+)/);
    const issuesCreatedMatch = content.match(/Issues Created \| (\d+)/);
    const issuesClosedMatch = content.match(/Issues Closed \| (\d+)/);
    const issuesOpenMatch = content.match(/Open Issues \| (\d+)/);
    const mergeRateMatch = content.match(/Merge Rate \| (\d+)%/);
    const healthMatch = content.match(/Health \| (\w+)/);
    
    // Extract hot zones from table
    const hotZones: Array<{ label: string; count: number }> = [];
    const hotZoneSection = content.match(/## 🔥 Hot Zones[\s\S]*?\n\n/);
    if (hotZoneSection) {
      const rows = hotZoneSection[0].match(/\| ([^|]+) \| (\d+) \|/g);
      if (rows) {
        for (const row of rows) {
          const match = row.match(/\| ([^|]+) \| (\d+) \|/);
          if (match && match[1].trim() !== "Label") {
            hotZones.push({ label: match[1].trim(), count: parseInt(match[2]) });
          }
        }
      }
    }
    
    // Extract top contributors
    const topContributors: Array<{ login: string; activity: number }> = [];
    const contribMatches = content.matchAll(/\*\*@(\w+)\*\* - (\d+) activit/g);
    for (const match of contribMatches) {
      topContributors.push({ login: match[1], activity: parseInt(match[2]) });
    }
    
    // Count newcomers
    const newcomersSection = content.match(/### 🆕 Newcomers\n([\s\S]*?)(?=\n##|\n---)/);
    const newcomersCount = newcomersSection 
      ? (newcomersSection[1].match(/@\w+/g)?.length ?? 0)
      : 0;
    
    // Extract quick wins
    const quickWinsSection = content.match(/## 🎯 Quick Wins[\s\S]*?\n\n/);
    let quickWinsCount = 0;
    let topQuickWinScore = 0;
    if (quickWinsSection) {
      const qwRows = quickWinsSection[0].match(/\| \[#\d+\]/g);
      quickWinsCount = qwRows?.length ?? 0;
      const scoreMatch = quickWinsSection[0].match(/\| (\d+) \|/);
      topQuickWinScore = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    }
    
    return {
      timestamp,
      windowHours,
      prsCreated: prsCreatedMatch ? parseInt(prsCreatedMatch[1]) : 0,
      prsClosed: prsClosedMatch ? parseInt(prsClosedMatch[1]) : 0,
      prsMerged: prsMergedMatch ? parseInt(prsMergedMatch[1]) : 0,
      prsOpen: prsOpenMatch ? parseInt(prsOpenMatch[1]) : 0,
      issuesCreated: issuesCreatedMatch ? parseInt(issuesCreatedMatch[1]) : 0,
      issuesClosed: issuesClosedMatch ? parseInt(issuesClosedMatch[1]) : 0,
      issuesOpen: issuesOpenMatch ? parseInt(issuesOpenMatch[1]) : 0,
      mergeRate: mergeRateMatch ? parseInt(mergeRateMatch[1]) : 0,
      health: (healthMatch?.[1]?.toLowerCase() ?? "warning") as "healthy" | "warning" | "critical",
      hotZones,
      topContributors,
      newcomersCount,
      quickWinsCount,
      topQuickWinScore,
    };
  } catch (e) {
    console.error(`Failed to parse report: ${e}`);
    return null;
  }
}

function reportToDataPoint(parsed: ParsedReport): HistoricalDataPoint {
  return {
    timestamp: parsed.timestamp,
    windowHours: parsed.windowHours,
    prsCreated: parsed.prsCreated,
    prsClosed: parsed.prsClosed,
    prsMerged: parsed.prsMerged,
    prsOpen: parsed.prsOpen,
    prsNetDelta: parsed.prsCreated - parsed.prsClosed,
    issuesCreated: parsed.issuesCreated,
    issuesClosed: parsed.issuesClosed,
    issuesOpen: parsed.issuesOpen,
    issuesNetDelta: parsed.issuesCreated - parsed.issuesClosed,
    mergeRate: parsed.mergeRate,
    health: parsed.health,
    totalActivity: parsed.prsCreated + parsed.prsClosed + parsed.issuesCreated + parsed.issuesClosed,
    hotZones: parsed.hotZones.slice(0, 10),
    topContributors: parsed.topContributors.slice(0, 10),
    newcomersCount: parsed.newcomersCount,
    returnedCount: 0,
    quickWinsCount: parsed.quickWinsCount,
    topQuickWinScore: parsed.topQuickWinScore,
    attentionItemsCount: 0,
    stalePRsCount: 0,
    staleIssuesCount: 0,
  };
}

async function main() {
  const config = getConfig();
  const reportDirs = [
    config.reportsDir,
    resolve(config.skillsDir, "../agents/moltbot/memory/reports"),
  ];
  
  const allReports: Array<{ path: string; parsed: ParsedReport }> = [];
  
  for (const dir of reportDirs) {
    if (!existsSync(dir)) continue;
    
    const files = readdirSync(dir).filter(f => f.endsWith(".md"));
    console.log(`Found ${files.length} reports in ${dir}`);
    
    for (const file of files) {
      const content = readFileSync(join(dir, file), "utf-8");
      const parsed = parseMarkdownReport(content);
      if (parsed) {
        allReports.push({ path: join(dir, file), parsed });
      }
    }
  }
  
  // Sort by timestamp
  allReports.sort((a, b) => new Date(a.parsed.timestamp).getTime() - new Date(b.parsed.timestamp).getTime());
  
  console.log(`\nParsed ${allReports.length} reports successfully`);
  
  // Load existing history or create new
  let history = loadHistory(config.historyFile);
  const existingTimestamps = new Set(history?.dataPoints.map(p => p.timestamp) ?? []);
  
  if (!history) {
    history = {
      repo: "openclaw/openclaw",
      createdAt: allReports[0]?.parsed.timestamp ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dataPoints: [],
    };
  }
  
  // Add new data points (avoid duplicates)
  let added = 0;
  for (const { parsed } of allReports) {
    if (!existingTimestamps.has(parsed.timestamp)) {
      history.dataPoints.push(reportToDataPoint(parsed));
      added++;
    }
  }
  
  // Sort by timestamp
  history.dataPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  if (history.dataPoints.length > 0) {
    history.createdAt = history.dataPoints[0].timestamp;
    history.updatedAt = history.dataPoints[history.dataPoints.length - 1].timestamp;
  }
  
  // Save
  saveHistory(config.historyFile, history);
  
  console.log(`Added ${added} new data points`);
  console.log(`Total data points: ${history.dataPoints.length}`);
  console.log(`Saved to: ${config.historyFile}`);
}

main();
