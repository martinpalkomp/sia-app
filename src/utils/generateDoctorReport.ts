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
    if (!f) return '—';
    const factors = [];
    if (f.caffeine?.consumed) factors.push(`☕ ${f.caffeine.amount || '?'}c ${f.caffeine.lastIntake ? '@'+f.caffeine.lastIntake : ''}`.trim());
    if (f.alcohol?.consumed) factors.push(`🍷 ${f.alcohol.drinks || '?'}d ${f.alcohol.lastIntake ? '@'+f.alcohol.lastIntake : ''}`.trim());
    if (f.exercise?.completed) factors.push(`🏃 ${f.exercise.type || 'Yes'} ${f.exercise.time ? '@'+f.exercise.time : ''}`.trim());
    if (f.screensInBed) factors.push('📱 Screens');
    if ((f.stressLevel || 0) >= 4) factors.push(`⚡ Stress ${f.stressLevel}`);
    return factors.length ? factors.join(', ') : '—';
  };

  const getTools = (log: DailyLog) => {
    const gList = log.factors?.sleepGadgets || [];
    if (!gList.length) return '—';
    return gList.map(g => {
      const name = g.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const details = [g.durationMinutes ? `${g.durationMinutes}m` : '', g.timeOfUse ? `${g.timeOfUse.replace(/_/g, ' ')}` : ''].filter(Boolean).join(', ');
      return details ? `${name} (${details})` : name;
    }).join('; ');
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
        : type === 'awake-in' ? '#cbd5e1' // Lighter grey/blue for print visibility
        : '#f4f4f5'; // Lightest grey
      return `display:inline-block;width:${100/96}%;height:16px;background:${bg};`;
    };

    return `<div style="display:flex;width:100%;border:1px solid #ddd;border-radius:2px;overflow:hidden;line-height:0;">${slots.map(s => `<span style="${cellStyle(s)}"></span>`).join('')}</div>`;
  }

  const timeLabels = ['20', '22', '00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20'];

  return `
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; background: white; color: #1e293b; max-width: 1200px; margin: 0 auto; padding: 20px; font-size: 11px; }
          .no-print { display: block; }
          @media print {
            .no-print { display: none; }
            span[style*="background:#f4f4f5"] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            span[style*="background:#18181b"] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            span[style*="background:#cbd5e1"] { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          .gap-2 { gap: 0.5rem; }
          .text-slate-500 { color: #64748b; }
          .text-slate-900 { color: #0f172a; }
          .font-bold { font-weight: 700; }
          .font-black { font-weight: 900; }
          .text-xs { font-size: 10px; }
          .text-sm { font-size: 12px; }
          .text-2xl { font-size: 24px; }
          .uppercase { text-transform: uppercase; }
          .tracking-widest { letter-spacing: 0.1em; }
          .border-b { border-bottom: 2px solid #e2e8f0; }
          .border { border: 1px solid #e2e8f0; }
          .rounded { border-radius: 4px; }
          .p-4 { padding: 1rem; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { text-align: left; padding: 8px 4px; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
          td { padding: 8px 4px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
          
          .ribbon-cell { width: 30%; padding: 0 8px; }
          .circadian-axis { display: flex; justify-content: space-between; font-family: monospace; font-size: 8px; color: #94a3b8; margin-bottom: 2px; }
          .metric-box { padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 6px; flex: 1; margin-right: 12px; }
          .metric-box:last-child { margin-right: 0; }
          .metric-title { font-size: 11px; color: #64748b; margin-bottom: 4px; }
          .metric-value { font-size: 18px; font-weight: 800; }
        </style>
      </head>
      <body>
        <button class="no-print" onclick="window.print()" style="position:fixed; bottom:20px; right:20px; padding:12px 24px; background:#1e1b4b; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
          SAVE AS PDF
        </button>

        <div class="flex justify-between items-start" style="margin-bottom: 8px;">
          <div>
            <h1 class="text-2xl font-black text-slate-900" style="margin:0;">SIA Sleep Intelligence Report — ${dateRange.label}</h1>
            <p class="text-slate-500 text-xs" style="margin:4px 0 24px 0;">Generated for clinical review — not a medical diagnosis</p>
          </div>
          <div style="opacity: 0.4;">
            <pre style="font-family: monospace; font-size: 1.5px; line-height: 1.5px; color: #64748b; margin: 0; padding: 0; background: transparent; border: none; letter-spacing: 0;">
------------------------------------------------------++----------------------------------------------------
------------------------------------------------------------------+-----------------------------------------
--------------------------------------------------------------------+---------------------------------------
-----------------------------------++++-----------------+---------------++----------------------------------
----------------------------------------------------+--------------------+----------------------------------
-----------------------------------------------++--+----------------------+---------------------------------
-----------------------------------------------++--------+++----------------+-------------------------------
-------------------------------------+----++-------------------+++----+------++-----------------------------
-----------------------------++--+-++--++++-----------------++---++++--+--+--++-----------------------------
-----------------------------++----+-++------------------------------+--+-----+-----------------------------
-----------------------------+++--------------------------------------------+++-----------------------------
----------------------------+++----++----------------------------------+-----+++----------------------------
----------------------------+++------------+++++++++++++++++++++-------------+++----------------------------
--------------------------++++----------++++++++#############++++++-----------++-+--------------------------
--------------------------++++---------+++++++################+++++++---------++++--------------------------
--------------------------+++--------+++++++++################+++++++++------+++++--------------------------
--------------------------++++------++++++++++################++++++++++-------+++--------------------------
--------------------------+++++----+++++++++++#################++++++++++----+++++-------++-----------------
---------------------------++++----+++++++++++#################+++++++++++---++++---------------------------
----------------------------+-+---+++++++++++###################++++++++++---+-++---------------------------
-----------------------------++--+##++++++++++#################+++++++++##+--++-----------------------------
-----------------------------++--+##++----+++++++++++++++++++++++-----++###+--+-----------------------------
----------------------------+---+###+++++++-----++++++++++++-----+++++++###+---+----------------------------
--------------------------------+##++---++++++----++++++++----++++++---++##+--------------------------------
-----------------------------+--+#++----+++#++++--++++++++--+++###++----++#+--------------------------------
-----------------------------+--+#+++----++++++++++++##++++++++++++----+++#+--++----------------------------
---------------------------+++--+#+++++-------++#++++##++++#++-------+++++#+--++----------------------------
-------------------------+----+-+#++++++++++++###++++##+++####++++++++++++#++++---++------------------------
----------------------++------+++#++++++++#######++++##++++########+++++++#+++------++----------------------
--------------------++---------+++#++++++#######+++++##+++++########+++++#+++---------++--------------------
-------------------++-----------++#+++++++#####++++++##++++++#####+++++++#++-----------++-------------------
------------------++--------------+++++++++##++++++++##+++++++###+++++++++---------------+------------------
-----------------++---------------+++--+++++++++++--++++--++++++++++++++++------++-------++-----------------
----------------++-----------------+++--+++++++##+--------++#++++++++-+++-----------------++----------------
---------------+++------------------+---++++++++#++++++++++##++++++++-+++-----------------+++---------------
---------------+++------------------+---+++++++++++++++#++++++++++++--++------------------+++---------------
---------------+++-------------------+----+++++++-----+----++++++++--++-------------------++++--------------
--------------++++-------------------------+++++-++++++++++-+++++++-----------------------++++--------------
--------------+++++----------------------++-+++++++++++++++++++++++-----------------------++++--------------
--------------+++----------------------------++++---------+++++-------------------------+--++++-------------
-------------++++-----------------------------+++++++++++++++++----------------------------++++-------------
------------+#+++------------------------------+++++++++++++++-----------------------------+++#+++----------
------------+++-+-----------------.--------------++++++++++--------------------------+-----+-++++-----------
------------+++------------------------------------------------------------------------------+++------------
------------++------+----+-----+--------------------------------------------------+-----------++------------
-------------+-------------+---++--.------------------------------------.--++---++------------+-------------
----------------------------+++-++----------------------------------------++-+++----------------------------
-------------------------++----++++--------------------------------------+++++---++-------------------------
-------------++-------------+----++++-----------------------------------++++---+-------------+++------------
------++##++++----------------++-+-+++---------------------------------++-+-++----------------++++##++------
----+#++++----------------------++-+-++------------------------------++-+-++-----------------------+++++----
--++++--------------------.-------++---+----------------------------+----+-------.---------------------+++--
++++-------------------------------++----------------------------------++-------------------------------+++#
+++--------++----------+-------------+--------------++++--------------+-------------++---------++--------+++
+--------+++++---------++-------------+-------+-+---++++-----+---------------------++---------++++++-------+
---------++--++--+----------------------------++++--++++--+++++---------------------------+--++--+++--------
------+-----+++---+--------------------------+++++---++---+++++--------------------------++--++++----+------
--------++--------++--------------------------+++++-++++--++++---------------------------++-----+-++--------
-------------------+-------+++------++---------++++-+++++++++---------++------+++-------+-------------------
            </pre>
          </div>
        </div>

        <div class="flex justify-between border-b" style="padding-bottom: 16px; margin-bottom: 32px;">
          <div style="flex:1;">
            <div class="text-xs text-slate-500 uppercase tracking-widest font-bold">Patient</div>
            <div class="font-bold text-sm">${userName}</div>
          </div>
          <div style="flex:1;">
            <div class="text-xs text-slate-500 uppercase tracking-widest font-bold">Age / Sex</div>
            <div class="font-bold text-sm">${age} / ${sex}</div>
          </div>
          <div style="flex:1;">
            <div class="text-xs text-slate-500 uppercase tracking-widest font-bold">Period</div>
            <div class="font-bold text-sm">${dateRange.from} to ${dateRange.to}</div>
          </div>
          <div style="flex:1;">
            <div class="text-xs text-slate-500 uppercase tracking-widest font-bold">Generated</div>
            <div class="font-bold text-sm">${new Date().toLocaleDateString()}</div>
          </div>
          <div style="flex:0.5;">
            <div class="text-xs text-slate-500 uppercase tracking-widest font-bold">Nights</div>
            <div class="font-bold text-sm">${logs.length}</div>
          </div>
        </div>

        <h2 class="text-slate-900 font-bold" style="margin-bottom: 12px; font-size: 16px;">Executive Summary</h2>
        <div class="flex" style="margin-bottom: 32px;">
          <div class="metric-box">
            <div class="metric-title">Quality</div>
            <div class="metric-value" style="color:${getStatusColor(avg('sleep_quality'), 7)}">${Math.round(avg('sleep_quality'))}<span style="font-size:12px;color:#94a3b8;">/10</span></div>
          </div>
          <div class="metric-box">
            <div class="metric-title">Alertness</div>
            <div class="metric-value" style="color:${getStatusColor(avg('morning_alertness'), 7)}">${Math.round(avg('morning_alertness'))}<span style="font-size:12px;color:#94a3b8;">/10</span></div>
          </div>
          <div class="metric-box">
            <div class="metric-title">Energy</div>
            <div class="metric-value" style="color:${getStatusColor(avg('daytime_energy'), 7)}">${Math.round(avg('daytime_energy'))}<span style="font-size:12px;color:#94a3b8;">/10</span></div>
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

        <h2 class="text-slate-900 font-bold" style="margin-bottom: 4px; font-size: 16px;">Detailed Log</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 80px;">Date</th>
              <th class="ribbon-cell">
                <div class="circadian-axis">
                  ${timeLabels.map(t => `<span>${t}</span>`).join('')}
                </div>
                Circadian (20:00 &rarr; 20:00)
              </th>
              <th>Bed</th>
              <th>Wake</th>
              <th>Dur</th>
              <th>Eff</th>
              <th>SQ</th>
              <th>Alert</th>
              <th>Energy</th>
              <th>Factors</th>
              <th style="min-width: 120px;">Tools</th>
              <th style="min-width: 140px;">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${recentLogs.map(l => {
              const bed = l.sleepEvents?.find(e => e.type === 'sleep')?.start || '—';
              const wake = l.sleepEvents?.length ? l.sleepEvents[l.sleepEvents.length - 1].end : '—';
              const eff = calculateSleepEfficiency(l.sleepEvents || []);
              const durRaw = calculateSleepDuration(l.sleepEvents || []);
              
              return `
                <tr>
                  <td style="color: #1e293b;">${format(parseISO(l.date), 'MMM dd')}</td>
                  <td class="ribbon-cell">${buildRibbonRow(l)}</td>
                  <td style="color: #1e293b; font-family: monospace;">${bed}</td>
                  <td style="color: #1e293b; font-family: monospace;">${wake}</td>
                  <td style="color: #1e293b;">${durRaw > 0 ? formatDuration(durRaw) : '—'}</td>
                  <td style="color: #1e293b;">${durRaw > 0 ? Math.round(Number(eff)) + '%' : '—'}</td>
                  <td style="color: #1e293b;">${l.sleep_quality || '—'}</td>
                  <td style="color: #1e293b;">${l.morning_alertness || '—'}</td>
                  <td style="color: #1e293b;">${l.daytime_energy || '—'}</td>
                  <td style="font-size: 10px; color: #64748b; line-height: 1.2;">${getFactors(l)}</td>
                  <td style="font-size: 10px; color: #64748b; line-height: 1.2;">${getTools(l)}</td>
                  <td style="font-size: 10px; color: #64748b; line-height: 1.2;">${l.daily_remarks || '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div style="margin-top: 32px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; min-height: 120px;">
          <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Clinical Notes</div>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between;">
          <div>
            <strong>Legend:</strong>
            <span style="display:inline-block;width:10px;height:10px;background:#18181b;margin:0 4px 0 8px;"></span>Asleep
            <span style="display:inline-block;width:10px;height:10px;background:#cbd5e1;margin:0 4px 0 8px;"></span>Awake in bed
            <span style="display:inline-block;width:10px;height:10px;background:#f4f4f5;border:1px solid #e2e8f0;margin:0 4px 0 8px;"></span>Out of bed
            <span style="margin-left: 16px;"><strong>Factors:</strong> ☕ Caffeine, 🍷 Alcohol, 🏃 Exercise, 📱 Screens, ⚡ Stress</span>
          </div>
          <div style="text-align: right; font-style: italic;">
            SIA (Sleep Intelligence Agent) — For informational purposes only.
          </div>
        </div>
      </body>
    </html>
  `;
}
