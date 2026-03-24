# SIA_CONTEXT.md — Sleep Intelligence Agent External Memory

## 1. Project Identity
**Core Mission**: SIA is a Preventative Health & Diagnostic Engine designed to transform raw sleep data into clinical-grade insights. It focuses on identifying long-term correlations between lifestyle factors (metabolic, environmental, pharmacological) and sleep architecture to prevent chronic disease.

**Tech Stack**:
- **Frontend**: React 19, Vite 6, Tailwind CSS 4
- **Backend**: Firebase 12 (Firestore, Auth, Cloud Functions)
- **AI Engine**: Google Gemini 2.0 Flash (via `@google/genai`)
- **Data Processing**: `date-fns`, `xlsx`, `papaparse`

**SIA Personality Traits**:
- **Clinical Scientist**: Professional, data-backed, and precise.
- **Supportive Strategist**: Focuses on actionable recovery wins rather than just pointing out failures.
- **Pattern-Obsessed**: Always looking for the "Why" behind a bad night (e.g., "It's not just the coffee; it's the timing").

---

## 2. The 'SIA' Golden Rules

### Rule A: The '20:00 Anchor'
All sleep days begin at **20:00 (8:00 PM)** of the previous calendar day.
- A log for "2024-03-24" covers the period from 2024-03-23 20:00 to 2024-03-24 19:59.
- This ensures that pre-sleep factors (last meal, caffeine, evening routine) are correctly attributed to the subsequent sleep period.

### Rule B: 'Ledger over Totals'
Calculations must **always** use the `sleepEvents` array (the ledger) rather than pre-calculated totals.
- **Why?** Totals hide fragmentation. A 7-hour sleep with 5 wake events is biologically different from a 7-hour continuous block.
- **Implementation**: Always map over `sleepEvents` to derive `totalSleepHours` and `fragmentationIndex`.

### Rule C: 'Zero-Shift UI'
The interface must remain stable during data fetching and AI analysis.
- **Layout Constraints**: Use fixed-height skeletons or aspect-ratio containers for cards.
- **Loading States**: AI insights must use a dedicated `analyzingLabel` and pulse animation within a pre-defined container to prevent "jumping" content.

---

## 3. Diagnostic Logic Definitions

### Formulas
| Metric | Formula | Unit |
| :--- | :--- | :--- |
| **Fragmentation Index** | `awakeInEvents / totalSleepHours` | interruptions/hr |
| **Social Jetlag** | `abs(currentMidpoint - averageMidpoint7Days) / 60` | hours |
| **Metabolic Gap** | `(sleepStartMinutes - lastMealMinutes) / 60` | hours |

### Clinical Thresholds (SIA Standards)
- **Alzheimer’s Risk (Glymphatic Efficiency)**:
    - **High Risk**: Fragmentation Index > 1.5 OR Deep Sleep < 15% (if available via wearable).
    - **Warning**: Sleep Duration < 6h consistently.
- **Obesity Risk (Leptin/Ghrelin Balance)**:
    - **High Risk**: Metabolic Gap < 2.0 hours (Eating too close to sleep).
    - **Warning**: Social Jetlag > 2.0 hours (Circadian misalignment).
- **Oxygen Warning**:
    - **Critical**: SpO2 Avg or Min < 92% (Strong indicator of Sleep Apnea).

---

## 4. Codemap & Directory Structure
- `src/lib/firebase.ts`: Core infrastructure and service initialization.
- `src/types.ts`: Source of truth for all data schemas.
- `src/utils/diagnosticEngine.ts`: The "Brain" — contains all clinical math and summary builders.
- `src/utils/patternEngine.ts`: Predictive logic for habit suggestions and AI corrections.
- `src/components/AIInsightsAgent.tsx`: The primary interface for SIA's conversational analysis.
- `src/components/DataImporter.tsx`: Logic for normalizing external data (Excel/CSV) into SIA schema.

---

## 5. Schema Enforcement

### UserProfile (PersonalizationProfile)
- **Country**: Required for regional sleep norm adjustments.
- **Date of Birth**: Required for age-adjusted sleep duration targets (e.g., 60+ years = 6-7h normal).

### SleepLog (DailyLog)
- **lastMealTime**: `HH:mm` format. Critical for Metabolic Gap calculation.
- **naturalWake**: Boolean. Tracks whether the user woke without an alarm (Circadian alignment).
- **sleepEvents**: Array of `{ type: 'sleep' | 'awake-in', start: string, end: string }`.

---

## 6. UI/UX Standards
- **Aesthetic**: 'Medical Slate' — Deep dark backgrounds (`#0a0c10`), high-contrast text, and subtle indigo/violet accents.
- **Font Pairings**:
    - **Display**: `Space Grotesk` (Bold, tracking-tight).
    - **Body**: `Inter` (Clean, legible).
- **Brand Constraints**:
    - **No Purple**: Use **Indigo-600** (`#4f46e5`) for primary actions and **Violet-500** only for "Enhanced" mode states.
    - **Status Colors**: Emerald (Optimal), Amber (Warning), Red (Critical).
