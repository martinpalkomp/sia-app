import { DailyLog, PersonalizationProfile } from '../types';
import { calculateSleepDuration, calculateSleepEfficiency, formatDuration } from './sleepUtils';
import { calculateAge } from './dateUtils';
import { format, parseISO } from 'date-fns';

export function generateDoctorReport(
  logs: DailyLog[],
  personalizationProfile: PersonalizationProfile | null,
  userName: string,
  dateRange: { from: string; to: string; label: string }
): string {
  const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const recentLogs = sortedLogs;
  
  const avg = (field: keyof DailyLog) => {
    const values = recentLogs.map(l => Number(l[field])).filter(v => !isNaN(v));
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  const avgDuration = recentLogs.reduce((acc, l) => acc + calculateSleepDuration(l.sleepEvents || []), 0) / recentLogs.length;
  const avgEfficiency = recentLogs.reduce((acc, l) => acc + Number(calculateSleepEfficiency(l.sleepEvents || [])), 0) / recentLogs.length;

  const lifestyleFactors = recentLogs.reduce((acc, log) => {
    if (log.factors) {
      if (log.factors.caffeine?.consumed) acc.caffeine++;
      if (log.factors.alcohol?.consumed) acc.alcohol++;
      if (log.factors.exercise?.completed) acc.exercise++;
      if (log.factors.screensInBed) acc.screens++;
      if ((log.factors.stressLevel || 0) >= 4) acc.stress++;
    }
    return acc;
  }, { caffeine: 0, alcohol: 0, exercise: 0, screens: 0, stress: 0 });

  const sleepTools = recentLogs.reduce((acc, log) => {
    if (log.factors?.sleepGadgets) {
      log.factors.sleepGadgets.forEach(g => {
        acc[g.type] = (acc[g.type] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);

  const age = personalizationProfile?.demographics?.dateOfBirth
    ? calculateAge(personalizationProfile.demographics.dateOfBirth)
    : 'N/A';
  const sex = personalizationProfile?.demographics?.sex || 'N/A';
  
  const getStatusColor = (val: number, threshold: number, isLowerBetter = false) => {
    const diff = Math.abs(val - threshold) / threshold;
    if (isLowerBetter ? val <= threshold : val >= threshold) return '#16a34a'; // Green
    if (diff <= 0.15) return '#d97706'; // Amber
    return '#dc2626'; // Red
  };

  const getFactors = (log: DailyLog) => {
    const f = log.factors;
    if (!f) return '';
    return [
      f.caffeine?.consumed ? '☕' : '',
      f.alcohol?.consumed ? '🍷' : '',
      f.exercise?.completed ? '🏃' : '',
      f.screensInBed ? '📱' : '',
      (f.stressLevel || 0) >= 4 ? '⚡' : ''
    ].join('');
  };

function timeToSlot(hhmm: string): number {
  if (!hhmm || !hhmm.includes(':')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return ((h + 24 - 20) % 24) * 4 + Math.floor(m / 15);
}

function buildRibbonRow(log: DailyLog): string {
  // Build 96-slot array, default awake-out
  const slots: string[] = new Array(96).fill('out');

  const events = log.sleepEvents || [];
  events.forEach(event => {
    const start = timeToSlot(event.start);
    const end = timeToSlot(event.end);
    const color = event.type === 'sleep' ? 'sleep'
      : event.type === 'awake-in' ? 'awake-in'
      : 'out';

    if (end >= start) {
      for (let i = start; i < end; i++) slots[i] = color;
    } else {
      // Wrap-around (e.g. sleep starts 23:00, ends 07:00)
      for (let i = start; i < 96; i++) slots[i] = color;
      for (let i = 0; i < end; i++) slots[i] = color;
    }
  });

  const cellStyle = (type: string) => {
    const bg = type === 'sleep' ? '#18181b'       // zinc-900 — matches app
      : type === 'awake-in' ? '#6366f1'            // indigo-500 — matches app
      : '#f4f4f5';                                  // zinc-100 — light for print
    return `display:inline-block;width:${100/96}%;height:18px;background:${bg};`;
  };

  const cells = slots.map(s => `<span style="${cellStyle(s)}"></span>`).join('');
  return cells;
}

function buildCircadianSection(logs: DailyLog[]): string {
  // Time axis: 7 labels at 0, 16, 32, 48, 64, 80, 96 slots = 20:00 00:00 04:00 08:00 12:00 16:00 20:00
  const timeLabels = ['20:00', '00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
  const axisHtml = `
    <div style="display:flex;margin-bottom:4px;padding-left:52px;">
      ${timeLabels.map((label, i) => `
        <span style="
          width:${i < 6 ? (100/6) + '%' : '0'};
          font-size:10px;
          color:#555;
          font-family:monospace;
          ${i === 6 ? 'margin-left:auto;margin-right:0;' : ''}
        ">${label}</span>
      `).join('')}
    </div>`;

  const rows = logs
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(log => {
      const label = new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      return `
        <div style="display:flex;align-items:center;margin-bottom:3px;">
          <span style="width:48px;font-size:10px;font-family:monospace;color:#333;flex-shrink:0;">${label}</span>
          <span style="flex:1;display:block;border:1px solid #ddd;border-radius:2px;overflow:hidden;line-height:0;">
            ${buildRibbonRow(log)}
          </span>
        </div>`;
    }).join('');

  const legend = `
    <div style="margin-top:8px;display:flex;gap:16px;font-size:10px;color:#555;">
      <span><span style="display:inline-block;width:12px;height:12px;background:#18181b;vertical-align:middle;margin-right:4px;"></span>Asleep</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:#6366f1;vertical-align:middle;margin-right:4px;"></span>Awake in bed</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:#f4f4f5;border:1px solid #ddd;vertical-align:middle;margin-right:4px;"></span>Out of bed</span>
    </div>`;

  return `
    <h2 style="font-size:14px;font-weight:bold;border-bottom:2px solid #1e1b4b;margin-top:32px;padding-bottom:4px;">Circadian Pattern Grid</h2>
    <div style="background:#fafafa;border:1px solid #ddd;border-radius:4px;padding:12px;margin-top:12px;">
      ${axisHtml}
      ${rows}
      ${legend}
    </div>`;
}

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Arial', sans-serif; background: white; color: black; max-width: 800px; margin: 0 auto; padding: 40px; }
          @page { size: A4; margin: 20mm; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 6px 10px; }
          .header-bg { background: #1e1b4b; color: white; }
          h2 { font-size: 14px; font-weight: bold; border-bottom: 2px solid #1e1b4b; margin-top: 32px; }
          pre { font-family: monospace; font-size: 11px; line-height: 1.4; background: #f8f8f8; padding: 12px; border: 1px solid #ddd; }
          @media print {
            span[style*="background:#f4f4f5"] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            span[style*="background:#18181b"] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            span[style*="background:#6366f1"] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div style="margin-bottom: 20px;">
          <h1 style="margin:0;">SIA Sleep Intelligence Report — ${dateRange.label}</h1>
          <p style="margin:0; font-style:italic;">Generated for clinical review — not a medical diagnosis</p>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <div>
            <p><strong>Patient:</strong> ${userName}</p>
            <p><strong>Age:</strong> ${age} | <strong>Sex:</strong> ${sex}</p>
            <p><strong>Report Period:</strong> ${dateRange.label} (${dateRange.from} to ${dateRange.to})</p>
          </div>
          <div style="text-align:right;">
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Nights Logged:</strong> ${logs.length}</p>
          </div>
        </div>

        <h2>Executive Summary</h2>
        <table>
          <tr class="header-bg"><th>Metric</th><th>7-Day Average</th><th>Reference</th></tr>
          <tr><td>Sleep Quality</td><td style="color:${getStatusColor(avg('sleep_quality'), 7)}">${Math.round(avg('sleep_quality'))}/10</td><td>≥7/10</td></tr>
          <tr><td>Morning Alertness</td><td style="color:${getStatusColor(avg('morning_alertness'), 7)}">${Math.round(avg('morning_alertness'))}/10</td><td>≥7/10</td></tr>
          <tr><td>Daytime Energy</td><td style="color:${getStatusColor(avg('daytime_energy'), 7)}">${Math.round(avg('daytime_energy'))}/10</td><td>≥7/10</td></tr>
          <tr><td>Sleep Duration</td><td style="color:${getStatusColor(avgDuration / 60, 7)}">${formatDuration(avgDuration)}</td><td>07:00–09:00</td></tr>
          <tr><td>Sleep Efficiency</td><td style="color:${getStatusColor(avgEfficiency, 85)}">${Math.round(avgEfficiency)}%</td><td>≥85%</td></tr>
        </table>

        <h2>Night-by-Night Log</h2>
        <table>
          <tr class="header-bg"><th>Date</th><th>Bedtime</th><th>Wake</th><th>Dur</th><th>Eff</th><th>SQ</th><th>Alert</th><th>Energy</th><th>Factors</th></tr>
          ${recentLogs.map(l => {
            const bed = l.sleepEvents?.find(e => e.type === 'sleep')?.start || '-';
            const wake = l.sleepEvents?.length ? l.sleepEvents[l.sleepEvents.length - 1].end : '-';
            const eff = calculateSleepEfficiency(l.sleepEvents || []);
            return `<tr style="${Number(eff) < 70 ? 'background:#fee2e2;' : ''}">
              <td>${format(parseISO(l.date), 'MMM dd')}</td>
              <td>${bed}</td><td>${wake}</td>
              <td>${formatDuration(calculateSleepDuration(l.sleepEvents || []))}</td>
              <td>${Math.round(Number(eff))}%</td>
              <td>${l.sleep_quality}</td><td>${l.morning_alertness}</td><td>${l.daytime_energy}</td>
              <td>${getFactors(l)}</td>
            </tr>`;
          }).join('')}
        </table>

        ${buildCircadianSection(logs)}

        <h2>Lifestyle Factors Summary</h2>
        <table>
          <tr class="header-bg"><th>Factor</th><th>Frequency</th></tr>
          <tr><td>Caffeine Intake</td><td>${lifestyleFactors.caffeine} nights</td></tr>
          <tr><td>Alcohol Intake</td><td>${lifestyleFactors.alcohol} nights</td></tr>
          <tr><td>Exercise Completed</td><td>${lifestyleFactors.exercise} nights</td></tr>
          <tr><td>Screens in Bed</td><td>${lifestyleFactors.screens} nights</td></tr>
          <tr><td>High Stress</td><td>${lifestyleFactors.stress} nights</td></tr>
        </table>

        <h2>Sleep Support Tools</h2>
        <table>
          <tr class="header-bg"><th>Tool</th><th>Usage Count</th></tr>
          ${Object.entries(sleepTools).map(([tool, count]) => `
            <tr><td>${tool.replace(/_/g, ' ')}</td><td>${count} nights</td></tr>
          `).join('')}
          ${Object.keys(sleepTools).length === 0 ? '<tr><td colspan="2">No tools logged</td></tr>' : ''}
        </table>

        <footer style="margin-top:40px; font-size:10px; color:#666; font-style:italic;">
          This report was generated by SIA (Sleep Intelligence Agent) and is based on self-reported data. It is provided for informational purposes only and does not constitute a medical diagnosis or replace professional evaluation. All values represent the user's self-reported experience during the period shown.
          <br>Generated: ${new Date().toLocaleString()}
        </footer>
      </body>
    </html>
  `;
}
