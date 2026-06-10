import { DailyLog, PersonalizationProfile } from '../types';
import { calculateSleepDuration, calculateSleepEfficiency, formatDuration } from './sleepUtils';
import { calculateAge } from './dateUtils';
import { format, parseISO, isWeekend } from 'date-fns';

function timeToMinutesFrom20(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  let hrs = h;
  if (hrs < 20) hrs += 24;
  return (hrs - 20) * 60 + m;
}

function timeToMinutesFrom00(timeStr: string): number {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

export function generateProviderReport(
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
    if (!f) return '<span style="color:#cbd5e1">—</span>';
    const factors = [];
    if (f.caffeine?.consumed) factors.push(`<span title="Caffeine: ${f.caffeine.amount || '?'}c @ ${f.caffeine.lastIntake || 'unknown'}">☕${f.caffeine.amount || ''}</span>`);
    if (f.alcohol?.consumed) factors.push(`<span title="Alcohol: ${f.alcohol.drinks || '?'}d @ ${f.alcohol.lastIntake || 'unknown'}">🍷${f.alcohol.drinks || ''}</span>`);
    if (f.exercise?.completed) factors.push(`<span title="Exercise: ${f.exercise.type || 'Yes'} @ ${f.exercise.time || 'unknown'}">🏃</span>`);
    if (f.screensInBed) factors.push(`<span title="Screens in bed">📱</span>`);
    if ((f.stressLevel || 0) >= 4) factors.push(`<span title="Stress: ${f.stressLevel}/5">😰</span>`);
    return factors.length ? factors.join(' ') : '<span style="color:#cbd5e1">—</span>';
  };

  const getTools = (log: DailyLog) => {
    const gList = log.factors?.sleepGadgets || [];
    if (!gList.length) return '<span style="color:#cbd5e1">—</span>';
    return gList.map(g => {
      const type = g.type.toLowerCase();
      let icon = '🛠️';
      if (type.includes('mask')) icon = '🌙';
      else if (type.includes('white_noise') || type.includes('sound') || type.includes('audio')) icon = '🎧';
      else if (type.includes('cooling') || type.includes('temperature') || type.includes('pad')) icon = '❄';
      else if (type.includes('breath')) icon = '💨';
      
      const title = `${g.type}: ${g.durationMinutes ? g.durationMinutes+'m ' : ''}${g.timeOfUse || ''}`;
      return `<span title="${title.trim()}">${icon}</span>`;
    }).join(' ');
  };

  function timeToSlot(hhmm: string): number {
    if (!hhmm || !hhmm.includes(':')) return 0;
    const [h, m] = hhmm.split(':').map(Number);
    return ((h + 24 - 20) % 24) * 4 + Math.floor(m / 15);
  }

  function buildRibbonRow(log: DailyLog): string {
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
        for (let i = start; i < 96; i++) slots[i] = color;
        for (let i = 0; i < end; i++) slots[i] = color;
      }
    });

    const cellStyle = (type: string) => {
      const bg = type === 'sleep' ? '#18181b'
        : type === 'awake-in' ? '#bfdbfe' // Lighter blue
        : '#f8fafc'; // Lightest grey
      return `display:inline-block;width:${100/96}%;height:16px;background:${bg};`;
    };

    return `<div style="display:flex;width:100%;border:1px solid #e2e8f0;border-radius:2px;overflow:hidden;line-height:0;box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);">${slots.map(s => `<span style="${cellStyle(s)}"></span>`).join('')}</div>`;
  }

  const timeLabels = ['20', '22', '00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20'];

  let tableRows = '';
  let currentWeek = -1;

  recentLogs.forEach((l, idx) => {
    const weekIndex = Math.floor(idx / 7);
    const isNewWeek = weekIndex !== currentWeek;
    if (isNewWeek) currentWeek = weekIndex;

    const remainingInWeek = Math.min(7, recentLogs.length - (weekIndex * 7));

    const bed = l.sleepEvents?.find(e => e.type === 'sleep')?.start || '—';
    const wake = l.sleepEvents?.length ? l.sleepEvents[l.sleepEvents.length - 1].end : '—';
    const eff = calculateSleepEfficiency(l.sleepEvents || []);
    const durRaw = calculateSleepDuration(l.sleepEvents || []);
    
    let rowStart = `<tr>`;
    if (isNewWeek) {
      rowStart = `<tr>
        <td rowspan="${remainingInWeek}" style="width:20px;writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;font-size:9px;color:#94a3b8;font-weight:700;border-right:1px solid #f1f5f9;letter-spacing:0.1em;">WEEK ${weekIndex + 1}</td>`;
    }

    tableRows += `
      ${rowStart}
        <td style="color: #1e293b; font-weight: 500;">${format(parseISO(l.date), 'MMM dd')}</td>
        <td class="ribbon-cell">${buildRibbonRow(l)}</td>
        <td style="color: #64748b; font-family: monospace;">${bed}</td>
        <td style="color: #64748b; font-family: monospace;">${wake}</td>
        <td style="color: #1e293b; font-weight: 500;">${durRaw > 0 ? formatDuration(durRaw) : '—'}</td>
        <td style="color: #1e293b; font-weight: 500;">${durRaw > 0 ? Math.round(Number(eff)) + '%' : '—'}</td>
        <td style="color: #1e293b;">${l.sleep_quality || '—'}</td>
        <td style="color: #1e293b;">${l.morning_alertness || '—'}</td>
        <td style="color: #1e293b;">${l.daytime_energy || '—'}</td>
        <td style="font-size: 11px; white-space: nowrap; line-height: 1.2; letter-spacing: 0.1em;">${getFactors(l)}</td>
        <td style="font-size: 11px; white-space: nowrap; line-height: 1.2; letter-spacing: 0.1em;">${getTools(l)}</td>
        <td style="font-size: 10px; color: #64748b; line-height: 1.2; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${l.daily_remarks || ''}">${l.daily_remarks || '<span style="color:#cbd5e1">—</span>'}</td>
      </tr>
    `;
  });

  // --- DYNAMIC PATTERNS ---
  const generatePatternHtml = () => {
    const patterns: {text: string, type: 'good' | 'warn', desc?: string}[] = [];
    
    // 1. Efficiency
    if (avgEfficiency >= 85) patterns.push({ text: '✓ High Sleep Efficiency', type: 'good', desc: 'Above 85% on average' });
    else if (avgEfficiency < 80) patterns.push({ text: '⚠ Low Sleep Efficiency', type: 'warn', desc: 'Below 80% on average' });

    // 2. Bedtime Consistency & Wake Drift
    const bedtimes: number[] = [];
    const weekdayWakes: number[] = [];
    const weekendWakes: number[] = [];

    recentLogs.forEach(l => {
      const bed = l.sleepEvents?.find(e => e.type === 'sleep')?.start;
      if (bed) bedtimes.push(timeToMinutesFrom20(bed));

      const wake = l.sleepEvents?.length ? l.sleepEvents[l.sleepEvents.length - 1].end : null;
      if (wake) {
        const d = parseISO(l.date);
        const wakeMins = timeToMinutesFrom00(wake);
        if (isWeekend(d)) weekendWakes.push(wakeMins);
        else weekdayWakes.push(wakeMins);
      }
    });

    if (bedtimes.length > 2) {
      const bAvg = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
      const bVar = bedtimes.reduce((acc, val) => acc + Math.pow(val - bAvg, 2), 0) / bedtimes.length;
      const bStd = Math.sqrt(bVar);
      if (bStd < 45) patterns.push({ text: '✓ Consistent Bedtime', type: 'good', desc: 'Low variability' });
      else if (bStd > 75) patterns.push({ text: '⚠ Variable Bedtime', type: 'warn', desc: 'High variability' });
    }

    if (weekdayWakes.length > 0 && weekendWakes.length > 0) {
      const avgWd = weekdayWakes.reduce((a, b) => a + b, 0) / weekdayWakes.length;
      const avgWe = weekendWakes.reduce((a, b) => a + b, 0) / weekendWakes.length;
      const drift = avgWe - avgWd;
      if (drift > 60) patterns.push({ text: '⚠ Weekend Oversleep', type: 'warn', desc: `+${Math.round(drift)} min on weekends` });
      else if (Math.abs(drift) < 30) patterns.push({ text: '✓ Stable Wake Time', type: 'good', desc: 'Consistent across week' });
    }

    // 3. Energy / Alertness
    const energy = avg('daytime_energy');
    if (energy > 0) {
      if (energy >= 7) patterns.push({ text: '✓ High Energy', type: 'good', desc: 'Consistently high' });
      else if (energy <= 5) patterns.push({ text: '⚠ Low Morning Energy', type: 'warn', desc: 'Below average' });
    }

    // Fallback if none found
    if (patterns.length === 0) patterns.push({ text: 'Insufficient data for patterns', type: 'warn' });

    return patterns.map(p => `
      <div class="pattern-item ${p.type}">
        <div>
          <div style="font-weight: 700; color: ${p.type === 'good' ? '#16a34a' : '#d97706'};">${p.text}</div>
          ${p.desc ? `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">${p.desc}</div>` : ''}
        </div>
      </div>
    `).join('');
  };

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background: white; color: #0f172a; max-width: 1200px; margin: 0 auto; padding: 20px; font-size: 11px; }
          .no-print { display: block; }
          @media print {
            .no-print { display: none; }
            span[style*="background:#f8fafc"] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            span[style*="background:#18181b"] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            span[style*="background:#bfdbfe"] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          .gap-2 { gap: 0.5rem; }
          .text-slate-500 { color: #64748b; }
          .text-slate-900 { color: #0f172a; }
          .font-bold { font-weight: 600; }
          .font-black { font-weight: 800; }
          .uppercase { text-transform: uppercase; }
          .tracking-widest { letter-spacing: 0.1em; }
          .border-b { border-bottom: 1px solid #e2e8f0; }
          .border { border: 1px solid #e2e8f0; }
          .rounded { border-radius: 4px; }
          .p-4 { padding: 1rem; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
          th { text-align: left; padding: 6px 4px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
          td { padding: 6px 4px; border-bottom: 1px solid #f8fafc; vertical-align: middle; }
          
          .ribbon-cell { width: 45%; padding: 0 12px; }
          .circadian-axis { display: flex; justify-content: space-between; font-family: monospace; font-size: 8px; color: #94a3b8; margin-bottom: 2px; }
          .metric-box { padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 6px; flex: 1; margin-right: 12px; background: #fff; text-align: center; }
          .metric-box:last-child { margin-right: 0; }
          .metric-title { font-size: 10px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
          .metric-value { font-size: 20px; font-weight: 800; }
          
          .header-box { flex: 1; display: flex; flex-direction: column; }
          .header-label { text-transform: uppercase; font-size: 9px; letter-spacing: 0.1em; color: #64748b; font-weight: 600; display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
          .header-value { font-size: 13px; font-weight: 600; color: #0f172a; }

          .pattern-summary { display: flex; align-items: center; padding: 12px; margin-bottom: 28px; border: 1px solid #e2e8f0; border-radius: 6px; gap: 24px; font-size: 11px; font-weight: 500; }
          .pattern-title { font-size: 10px; color: #0f172a; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-right: 8px; }
          .pattern-item { display: flex; align-items: center; gap: 6px; color: #334155; }
          .pattern-item.good { color: #16a34a; }
          .pattern-item.warn { color: #d97706; }
        </style>
      </head>
      <body style="border-top: 4px solid #1e1b4b; padding-top: 24px;">
        <button class="no-print" onclick="window.print()" style="position:fixed; bottom:20px; right:20px; padding:12px 24px; background:#1e1b4b; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          SAVE AS PDF
        </button>

        <!-- TOP HEADER -->
        <div class="flex justify-between items-center" style="margin-bottom: 32px;">
          <div>
            <div style="font-size: 18px; font-weight: 900; letter-spacing: 0.1em; color: #1e1b4b; display: flex; align-items: center; gap: 8px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e1b4b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              SIA
            </div>
            <div style="font-size: 9px; letter-spacing: 0.2em; color: #64748b; margin-top: 2px;">SLEEP INTELLIGENCE AGENT</div>
          </div>
          <div style="text-align: center;">
            <h1 class="font-black text-slate-900" style="margin:0; font-size: 22px; text-transform: uppercase; letter-spacing: -0.02em;">SIA Sleep Intelligence Report</h1>
            <p class="text-slate-500" style="margin:2px 0 0 0; font-size: 13px;">Clinical Sleep Pattern Analysis</p>
          </div>
          <div style="width: 120px;">
             <!-- placeholder for balance -->
          </div>
        </div>

        <!-- META HEADER -->
        <div class="flex border-b" style="padding-bottom: 16px; margin-bottom: 24px;">
          <div class="header-box">
            <div class="header-label">Patient</div>
            <div class="header-value">${userName}</div>
          </div>
          <div class="header-box">
            <div class="header-label">Age / Sex</div>
            <div class="header-value">${age} / ${sex}</div>
          </div>
          <div class="header-box">
            <div class="header-label">Period</div>
            <div class="header-value">${dateRange.from} – ${dateRange.to}</div>
          </div>
          <div class="header-box">
            <div class="header-label">Coverage</div>
            <div class="header-value">${logs.length} Nights Logged</div>
          </div>
          <div class="header-box" style="flex: 0.8;">
            <div class="header-label">Generated</div>
            <div class="header-value">${format(new Date(), 'MMM dd, yyyy')}</div>
          </div>
        </div>

        <!-- EXECUTIVE SUMMARY -->
        <h2 class="text-slate-900 font-bold" style="margin-bottom: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Executive Summary <span style="color:#94a3b8; font-weight: normal;">(Last ${logs.length} Days)</span></h2>
        <div class="flex" style="margin-bottom: 20px;">
          <div class="metric-box">
            <div class="metric-title">Quality</div>
            <div class="metric-value" style="color:${getStatusColor(avg('sleep_quality'), 7)}">${(avg('sleep_quality')).toFixed(1)}<span style="font-size:12px;color:#94a3b8;">/10</span></div>
          </div>
          <div class="metric-box">
            <div class="metric-title">Alertness</div>
            <div class="metric-value" style="color:${getStatusColor(avg('morning_alertness'), 7)}">${(avg('morning_alertness')).toFixed(1)}<span style="font-size:12px;color:#94a3b8;">/10</span></div>
          </div>
          <div class="metric-box">
            <div class="metric-title">Energy</div>
            <div class="metric-value" style="color:${getStatusColor(avg('daytime_energy'), 7)}">${(avg('daytime_energy')).toFixed(1)}<span style="font-size:12px;color:#94a3b8;">/10</span></div>
          </div>
          <div class="metric-box">
            <div class="metric-title">Duration</div>
            <div class="metric-value" style="color:${getStatusColor(avgDuration / 60, 7)}">${formatDuration(avgDuration)}</div>
          </div>
          <div class="metric-box">
            <div class="metric-title">Efficiency</div>
            <div class="metric-value" style="color:${getStatusColor(avgEfficiency, 85)}">${Math.round(avgEfficiency)}<span style="font-size:12px;color:#94a3b8;">%</span></div>
          </div>
        </div>

        <!-- PATTERN SUMMARY -->
        <div class="pattern-summary">
          <div style="font-size: 10px; color: #0f172a; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-right: 8px;">Pattern Summary</div>
          ${generatePatternHtml()}
        </div>

        <!-- DETAILED LOG -->
        <h2 class="text-slate-900 font-bold" style="margin-bottom: 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Detailed Sleep Log</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 20px;"></th>
              <th style="width: 50px;">Date</th>
              <th class="ribbon-cell">
                <div class="circadian-axis">
                  ${timeLabels.map(t => `<span>${t}</span>`).join('')}
                </div>
                Circadian Time (24-Hour Clock)
              </th>
              <th style="width: 45px;">Bed</th>
              <th style="width: 45px;">Wake</th>
              <th style="width: 45px;">Dur</th>
              <th style="width: 40px;">Eff</th>
              <th style="width: 25px;" title="Sleep Quality">SQ</th>
              <th style="width: 35px;" title="Morning Alertness">Alert</th>
              <th style="width: 45px;" title="Daytime Energy">Energy</th>
              <th style="width: 90px;">Factors</th>
              <th style="width: 70px;">Tools</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <!-- CLINICAL NOTES -->
        <div style="margin-top: 32px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; min-height: 120px;">
          <div style="font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Clinical Notes</div>
        </div>

        <!-- FOOTER & LEGEND -->
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #64748b; display: flex; justify-content: space-between;">
          <div style="flex: 1;">
            <div style="font-weight: 700; margin-bottom: 8px; color: #0f172a;">METHODOLOGY</div>
            <div>This report is generated from self-reported sleep logs and behavioral data.</div>
            <div>It is intended for educational and clinical review use only. Not a medical diagnosis.</div>
            <div style="margin-top: 8px; font-style: italic;">SIA Sleep Intelligence Agent • Evidence-Based Sleep Analysis</div>
          </div>
          
          <div style="width: 45%; padding-left: 24px; border-left: 1px solid #e2e8f0;">
            <div style="font-weight: 700; margin-bottom: 8px; color: #0f172a;">LEGEND</div>
            <div style="display: flex; gap: 16px; margin-bottom: 12px;">
              <div>
                <span style="display:inline-block;width:10px;height:10px;background:#18181b;margin-right:6px;"></span> Asleep
              </div>
              <div>
                 <span style="display:inline-block;width:10px;height:10px;background:#bfdbfe;margin-right:6px;"></span> Light / REM / Awake in bed
              </div>
            </div>
            <div>
              <div style="font-weight: 700; margin-bottom: 4px; color: #0f172a; font-size: 9px; text-transform: uppercase;">Factors & Tools</div>
              ☕ Caffeine &nbsp; 🍷 Alcohol &nbsp; 🏃 Exercise &nbsp; 📱 Screens &nbsp; 😰 High Stress<br/>
              🌙 Mask &nbsp; 🎧 Audio &nbsp; ❄ Cooling Pad &nbsp; 💨 Breathing
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}
