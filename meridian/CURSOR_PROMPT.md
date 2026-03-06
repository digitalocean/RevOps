# MERIDIAN — Complete Rebuild Prompt for Cursor / AI Coding Assistant

Use this prompt to rebuild Meridian from scratch or extend it in Cursor, Claude, or any AI coding assistant.

---

## MASTER PROMPT

Build **Meridian — Peak Performance**, a premium project management web application for engineering teams. This is a full-stack app with a React frontend, Node.js/Express backend, and PostgreSQL database.

---

## BRAND & DESIGN SYSTEM

**Product Name:** Meridian  
**Tagline:** Peak Performance  
**Theme:** Alpine / nautical hybrid — dark, deep, premium  
**Aesthetic:** Editorial luxury SaaS — think Linear meets Notion meets a high-end magazine

### Logo
SVG shield shape containing a nautical anchor symbol. Gold gradient fill (`#f0b05a` → `#c9823a`) on a dark navy background (`#0f1420`). Anchor has: ring at top (circle), vertical shaft, horizontal crossbar, curved flukes at bottom, cross piece. No text inside the mark.

### Typography
- **Display / Headings:** Playfair Display (Google Fonts) — weights 400, 500, 600, 700. Use italic style on page titles and modal titles for editorial feel.
- **Body / UI:** Plus Jakarta Sans (Google Fonts) — weights 300, 400, 500, 600, 700
- **Monospace / Data:** Fira Code (Google Fonts) — for story points, IDs, timestamps, technical values

### Color System (CSS Custom Properties)
```css
:root {
  /* Backgrounds — deep navy layers */
  --bg0: #060810;   /* page background */
  --bg1: #0b0e17;   /* topbar, sidebar */
  --bg2: #10141f;   /* cards, tables */
  --bg3: #161c2a;   /* inputs, hover states */
  --bg4: #1c2333;   /* badges, muted elements */

  /* Text */
  --t1: #edf2ff;    /* primary text */
  --t2: #aab4cc;    /* secondary text */
  --t3: #677089;    /* muted text */
  --t4: #3d4a63;    /* dim / placeholder */

  /* Brand — warm gold */
  --gold:  #d4943a;
  --gold2: #f0b05a;
  --golds: rgba(212,148,58,.14);   /* gold soft bg */
  --goldg: rgba(212,148,58,.28);   /* gold glow */

  /* Accents */
  --jade: #00c9a7;  --jades: rgba(0,201,167,.11);    /* done / success */
  --rose: #ff5470;  --roses: rgba(255,84,112,.11);   /* error / blocked */
  --sky:  #3d9be9;  --skys:  rgba(61,155,233,.11);   /* info / in progress */
  --lav:  #9b7dff;  --lavs:  rgba(155,125,255,.11);  /* review / special */
  --sun:  #f59e0b;  --suns:  rgba(245,158,11,.11);   /* warning / medium */

  /* Borders */
  --bd:  rgba(255,255,255,.055);
  --bd2: rgba(255,255,255,.09);
  --bd3: rgba(255,255,255,.14);

  /* Border radius */
  --r1: 6px; --r2: 10px; --r3: 14px; --r4: 20px;
}
```

### Visual Details
- **Noise texture overlay:** SVG feTurbulence noise on `body::after`, opacity 0.025, pointer-events:none, z-index:9999
- **Card hover:** `translateY(-2px)` + shadow elevation + 2px colored gradient top border (opacity 0 → 1)
- **Modals:** backdrop-filter blur(5px), spring animation `cubic-bezier(.34,1.4,.64,1)`, scale 0.97→1
- **Scrollbars:** 3px wide, transparent track, `var(--bg4)` thumb
- **Icons:** Font Awesome 6 throughout (`fa-solid`, `fa-regular`, `fa-brands`)
- **Transitions:** 0.14s–0.22s, ease or cubic-bezier

---

## NAMING CONVENTIONS (Meridian-specific)

| Generic Term | Meridian Term |
|---|---|
| Project | Campaign |
| Sprint | Expedition |
| Kanban Board | Summit Board |
| Work Item / Ticket | Summit Item |
| Backlog | Base Camp |
| In Progress | In Ascent |
| In Review | At Base Camp |
| Done | Peak Reached |
| Roadmap/Gantt | Expedition Map |
| List View | Manifest |
| Metrics Dashboard | Observatory |
| Admin Panel | Base Camp Admin |
| Activity Log | Captain's Log |
| Team Members | Crew |
| Tracker / Custom Table | Field Notes |
| Labels/Tags | Blazons |

---

## APPLICATION LAYOUT

```
┌─────────────────────────────────────────────────────────┐
│  TOPBAR (52px)                                           │
│  [Logo] [WS: RevOps | Platform | Infra] ... [Voice][Log]│
├──────────┬──────────────────────────────────────────────┤
│          │  PAGE HEADER                                  │
│          │  breadcrumb → Sprint 14 — Revenue Horizon     │
│  SIDEBAR │  [Active tag] [Date] [Progress] [Points]      │
│  (220px) ├──────────────────────────────────────────────┤
│          │  VIEW TABS                                     │
│  Nav     │  Board | Manifest | Expedition Map | ...      │
│  Sprints ├──────────────────────────────────────────────┤
│  Campaigns│                                              │
│          │  ACTIVE VIEW CONTENT                          │
│  Crew    │                                               │
│  (at     │                          [Captain's Log Panel]│
│  bottom) │                          (258px, toggleable)  │
└──────────┴──────────────────────────────────────────────┘
```

---

## VIEWS — Detailed Specs

### 1. Summit Board (Kanban)
- 5 columns: Base Camp, Summit Ready, In Ascent, At Base Camp, Peak Reached
- Each column has: colored dot, name, item count badge
- Cards show: type badge (color-coded), title, story points (Fira Code), priority badge, assignee avatar
- Card hover: lift + colored gradient top border matching column color
- Click a "Peak Reached" card → confetti celebration (55 particles, 8 colors) + toast notification
- "Add Summit Item" button at bottom of each column
- Captain's Log panel slides in from right (258px)

### 2. Manifest (List/Table)
- Sticky header row
- Toggleable columns: Title, Type, Status, Priority, Points, Assignee, Due Date, Sprint, Labels
- Status column: clickable pill that cycles through all column statuses; cycling to Peak Reached triggers confetti
- "+ Column" button in header opens Column Manager modal
- Custom fields appear as additional columns
- "+ Summit Item" bar at bottom

### 3. Expedition Map (Gantt)
- Left sticky column: item title
- Columns: Pts, Crew, then date columns (Mar 1, Mar 3, Mar 5…)
- Colored gradient bars spanning date range, color matches item's current column
- Done items show "✓" prefix

### 4. Field Notes (Trackers)
- Tab row: Big Rocks | OKRs | Risk Radar | [+] (add custom tab)
- Each tab is a table with its own columns
- Big Rocks: Initiative, Category, Priority, Summit?, Owner, Status, Question, Description
- OKRs: Objective, Category, Priority, Owner, Status, Description
- Risk Radar: Risk, Likelihood, Impact, Owner, Mitigation, Status
- All status pills are clickable (cycle through states)
- "+ Add Row" bar at bottom of each

### 5. Observatory (Metrics)
- 4 stat cards (2px gradient top border each):
  - Total Points (sky/lav gradient)
  - Peaks Reached (jade/gold gradient)
  - Active Blockers (rose/sun gradient)
  - Days to Summit (gold gradient)
- Burndown chart: CSS bars, hover tooltip, actual days solid, projected days dashed border
- Crew workload: avatar + name + progress bar (jade→gold gradient) + pts/pts label

### 6. Base Camp (Admin Center)
- 6 cards grid: Summit Item Fields | Campaign Fields | Expedition Fields | Board Columns | Crew Management | Integrations
- Each card drills down to a sub-panel
- Field sub-panels (item/project/sprint): list of custom fields with type badge and delete button, + Add Custom Field button
- Board Columns: list of columns with color swatch and inline name edit
- Crew Management: list with avatar, name, role, edit button
- Back button returns to admin home

---

## CAPTAIN'S LOG (Right Panel)

- Toggleable panel, 258px wide, slides with CSS transition
- Header: icon, "Captain's Log" title (Playfair italic), current date
- Entry list: each entry has type badge (Voice/AI/Note), timestamp, content bubble with colored left border
  - Voice entries: rose left border
  - AI entries: lavender left border
  - Note entries: gold left border
- Footer: textarea + "Log it" button (gold) + "Voice" button (rose)
- Keyboard shortcut: Cmd/Ctrl+L toggles panel

---

## MODALS

### Summit Item Modal
Fields: Title (full width), Type + Priority (2-col), Points + Assignee (2-col), Column (full width), Description (textarea), Custom Fields (dynamic, based on admin config)
CTA: "Summit It" (gold button)

### Voice Log Modal
- Large orb (94px circle) with pulsing animation when recording
- Transcript box below (shows rotating sample transcripts in demo mode)
- 3 type buttons: Log Note | Create Story | Create Task
- "Create with AI" button (gold)
- When OPENAI_API_KEY set: uses Whisper for transcription, GPT-4o to structure the item

### Column Manager Modal
- Toggle rows for each column (icon + name + sliding toggle)
- Custom fields listed below with "custom" gold badge
- "+ Add Custom Field" link at bottom

### Custom Field Modal
- Field name input
- 6-cell type grid: Text | Number | Date | Dropdown | Checkbox | URL (each with icon)
- Selected type highlighted gold
- "Add Field" CTA

---

## STATE MANAGEMENT & PERSISTENCE

### localStorage Keys (prefix: `mer_`)
- `mer_items` — all work items array
- `mer_view` — current active view string
- `mer_colVis` — object of column visibility booleans
- `mer_customFields` — object with `item`, `project`, `sprint` arrays
- `mer_logOpen` — boolean for Captain's Log panel state
- `mer_log` — Captain's Log entries array

### Rules
- Every state change saves to localStorage immediately
- On page load, restore all state from localStorage with sensible defaults
- API calls augment localStorage (write-through cache): local state updates instantly, API saves in background
- If API fails, local state remains intact (graceful degradation)

---

## BACKEND API

### Tech Stack
- Node.js + Express
- PostgreSQL with `pg` driver
- `dotenv`, `cors`, `uuid`, `multer`, `openai` packages
- `nodemon` for dev

### Database Tables (10)
1. `workspaces` — id, name, slug, color, icon
2. `crew` — id, workspace_id, name, email, initials, color, role, status (online/away/offline), active
3. `projects` — id, workspace_id, name, description, color, status, owner_id
4. `board_columns` — id, project_id, name, slug, color, sort_order, is_done
5. `sprints` — id, project_id, name, goal, status, start_date, end_date, capacity
6. `items` — id, project_id, sprint_id, parent_id, type, title, description, status, column_id, priority, points, assignee_id, due_date, labels[], custom_vals JSONB, sort_order, created_at, updated_at
7. `custom_fields` — id, workspace_id, target (item/project/sprint), name, field_type, options[], sort_order
8. `column_prefs` — id, crew_id, project_id, visible_cols JSONB
9. `log_entries` — id, project_id, sprint_id, author_id, entry_type (note/voice/ai), content, voice_url
10. `trackers` — id, project_id, name, icon, columns JSONB, sort_order
11. `tracker_rows` — id, tracker_id, data JSONB, sort_order
12. `voice_recordings` — id, crew_id, transcript, item_type, result_id

### REST Endpoints
- `GET /api/health`
- `GET|POST /api/items` — query params: `sprint_id`, `project_id`
- `GET|PATCH|DELETE /api/items/:id`
- `GET|POST|PATCH /api/sprints`
- `GET|POST|PATCH /api/projects`
- `GET|POST|PATCH|DELETE /api/crew`
- `GET|POST|DELETE /api/log`
- `GET|POST /api/trackers` — query: `project_id`
- `GET|POST /api/trackers/:id/rows`
- `PATCH /api/trackers/:id/rows/:rowId`
- `GET|POST|DELETE /api/custom-fields`
- `GET|POST|PATCH|DELETE /api/columns`
- `POST /api/voice/transcribe` — multipart audio upload → Whisper transcription
- `POST /api/voice/create` — transcript → GPT-4o → item or log entry

### CORS
Allow: `localhost:5173`, `.ondigitalocean.app`, `.onrender.com`

### SSL
PostgreSQL: `ssl: { rejectUnauthorized: false }` when `NODE_ENV=production`

---

## SEED DATA

Pre-populate with realistic DigitalOcean RevOps Sprint 14 data:

**Crew:** Raj Kumar (Lead Dev, #6366f1), Sara Kim (Architect, #8b5cf6), Aman Mehta (Developer, #059669), Priya Patel (QA, #f59e0b)

**Sprint:** Sprint 14 — Revenue Horizon, Mar 1–14 2026, 42pt capacity

**Work Items:**
1. Build agent availability detection system for Omni-Channel (task, high, 8pt, RK, summit)
2. Custom pre-chat LWC form with Omni-Channel routing flows (story, high, 13pt, RK, ascent)
3. SOQL query limit errors in account revenue rollup (bug, medium, 5pt, SK, ascent)
4. Opportunity rollup batch with 5+ level hierarchy traversal (story, medium, 8pt, AM, basecamp)
5. SNS topic migration for auto-panda to QA account (task, low, 3pt, PP, peak)
6. AgentWork trigger refactor to trigger-handler pattern (epic, high, 8pt, RK, peak)
7. AckCopyEmailService test coverage — target 85-95% (task, medium, 5pt, SK, summit)

**Captain's Log:** 3 entries (AI summary, voice note, manual note)

**Trackers:** Big Rocks (4 rows), OKRs (2 rows), Risk Radar (3 rows)

---

## VOICE FEATURE

### With OPENAI_API_KEY set:
1. POST audio blob to `/api/voice/transcribe` → OpenAI Whisper API → returns transcript text
2. POST transcript to `/api/voice/create` with `item_type`:
   - `note` → GPT-4o extracts clean note → saves to `log_entries` as `ai` type
   - `story`/`task` → GPT-4o extracts structured item (title, desc, type, priority, points) → saves to `items`

### Without OPENAI_API_KEY (demo mode):
- Transcribe: returns rotating sample transcripts from hardcoded array
- Create: saves transcript directly to log_entries as `voice` type

---

## CELEBRATION SYSTEM

When any item moves to the "Peak Reached" (done) column:
1. Launch 55 confetti particles:
   - Random colors: gold, jade, rose, sky, lav, sun, white
   - Random sizes: 6–13px
   - Random shapes: circle or square
   - CSS animation: fall down + rotate 800deg, 1.2–2.5s duration
   - Staggered start: 0–0.5s delay
   - Auto-cleanup after 3s
2. Show toast notification (bottom center):
   - Random emoji from: 🎉 🏔️ ⛰️ 🚀 ✨ 💫 🎯 🏆 🌟 ⚡
   - Random message: "Peak reached!" / "Summit conquered!" / "Another one done!" / etc.
   - Spring animation in (cubic-bezier .34,1.4,.64,1)
   - Auto-dismiss after 3.4s

---

## DIGITALOCEAN DEPLOYMENT

### App Platform Structure
- **Backend Service:** Node.js web service, source `/backend`, run command `node server.js`, port 4000
- **Frontend Service:** Static site, source `/frontend`, build command `npm install && npm run build`, output dir `dist`
- **Database:** Managed PostgreSQL, DO auto-injects `DATABASE_URL`

### Required Environment Variables
Backend: `DATABASE_URL`, `NODE_ENV=production`, `FRONTEND_URL`, optionally `OPENAI_API_KEY`  
Frontend (build-time): `VITE_API_URL=https://your-backend.ondigitalocean.app`

### After First Deploy
Run in DO Console (backend service):
```bash
node scripts/init-db.js
node scripts/seed-db.js
```

---

## ADDITIONAL REQUIREMENTS

1. **Everything persists:** Any click, toggle, field value, or status change must save to localStorage immediately (frontend) and sync to API in background
2. **Graceful offline:** If API is unreachable, app works fully via localStorage — no errors shown to user
3. **Custom fields in Add Modal:** When custom fields exist for items (set in Admin), they appear as extra inputs in the Add Summit Item modal
4. **Column visibility:** The Column Manager modal toggles which columns show in the Manifest list view — this persists across page loads
5. **Admin drill-down:** Each admin card navigates to a sub-panel with a Back button — not a modal
6. **Tracker tabs:** Clicking "＋" on tracker tabs prompts for a name and creates a new empty tracker tab
7. **No loading spinners for localStorage data:** Show seed/cached data immediately, update silently when API responds
8. **Keyboard shortcuts:** Cmd/Ctrl+L for Captain's Log, Escape closes modals
9. **Responsive scrollbars:** 3px, only visible on hover
10. **Zero external CSS frameworks:** Pure CSS only (no Tailwind, Bootstrap, etc.)

---

## STANDALONE DEMO MODE

Also build a single `meridian-demo.html` file (no build step required) that:
- Contains all CSS, JS, and HTML in one file
- Uses CDN for Google Fonts and Font Awesome
- Implements all 6 views with vanilla JavaScript
- Uses localStorage for all persistence
- Has the same full feature set as the React app
- Works by simply opening the file in a browser

This file should be ~1500–2000 lines and include:
- All modals working
- Confetti + toast system
- Voice simulation (no API key needed)
- Admin Center with custom field creation/deletion
- Column visibility toggles
- Captain's Log with save/voice buttons
- All 5 tracker tabs clickable
- Burndown chart and workload bars in Observatory
