# Changelog

## 1.8.0 — 2026-06-11

Demand-curve planning, pulled straight from the EHR.

- **New Demand view**: pulls booked-appointment history (appointment book) and inbound task
  arrivals (the five patient-request task lists, counted and discarded — never persisted) over
  a configurable window, builds a per-weekday demand profile, converts it into required
  clinical sessions, and compares against the rostered rota for any of the next four weeks
  (short/OK/over per day and period).
- **Granular model controls**: history window (2–26 weeks), recency half-life (exponential
  decay, 0 = equal weighting), safety buffer %, include/exclude task load, and a tasks/day
  threshold that flags days worth a second duty doctor.
- **Manual correction of pulled data**: every day's AM/PM booked and task figures are editable
  (corrections override pulled values and survive re-pulls, marked "edited" with one-click
  reset), and any day can be excluded from the model entirely (flu clinics, closures).
  Bank holidays are excluded automatically.
- `engine/demand.js` (pure, tested) + `fetchTaskCounts` in the Medicus client; demand data is
  in the backup envelope and practice sync. Sample-data mode for exploring without Medicus.

## 1.7.1 — 2026-06-11

- Rooms are now renameable: the Settings room list shows each name as an editable field that
  saves on change (blank rejected, audited). Usual-room and session assignments follow the
  room id, so renaming "Room 3" to "Treatment 1" updates everywhere instantly.

## 1.7.0 — 2026-06-11

The Gauntlet response: table-stakes gaps closed plus one-click setup.

- **One-click setup wizard** (Dashboard): reads 4 weeks of the Medicus appointment book and,
  in one run, imports unknown clinicians, infers each person's week pattern, infers rooms and
  usual-room assignments, and generates the next 4 weeks of rota. Additive only; sample-data
  mode included. Time-to-live: minutes.
- **WTD checks** in the rules engine (warn, never block, employed staff only): weekly rostered
  hours vs the configurable 48h average cap, and a no-rest-day check across seven days.
- **TOIL**: banked sessions per person (staff editor), spent via a TOIL leave type with a
  balance guardrail at request time, shown in the Leave balances table.
- **Timesheet CSV export** (`engine/timesheet.js`, Settings → Reports): sessions worked per
  person by type, hours from session lengths, locum-covered counts, approved leave by type —
  payroll-ready, RFC-safe CSV escaping.
- **Browser notifications** (opt-in, Settings): shared-rota sync updates, and an approvals
  alert for managers when new leave/swap requests arrive via sync. chrome.notifications in the
  extension, web Notifications in a dev tab.
- Benchmark report from the first Gauntlet run committed at docs/benchmark/.

## 1.6.0 — 2026-06-10

Enhanced-access periods and automatic room inference.

- **EARLY (07:00–08:00) and EVE (18:30–20:00) periods**, toggled in Settings: extra columns on
  the rota grid, rooms view and pattern templates; ICS export times; supervision/HCA/room rules
  apply across all periods while duty-doctor requirements stay core-hours (AM/PM). Extended
  slots running without a GP rostered are flagged (DES "GP physically present" rule).
- **Enhanced Access DES arithmetic** on the rota checks panel: minutes provided this week
  (EARLY 60 + EVE 90 per session) vs the required 60 min/1,000 patients/week.
- **Room inference** (`engine/room-infer.js`): reads 4 weeks of appointment-book history,
  takes the peak number of clinicians consulting face-to-face at once as the room count
  (remote/telephone sessions excluded via deliveryMode), and greedy-colours the overlap graph
  so every clinician gets a stable usual room that never clashes. Settings → Rooms →
  "Suggest from Medicus" (or sample data) → preview → one-click apply creates the rooms and
  pins each person's usual room.
- **Assign rooms** button on the Rota page: fills every clinic session this week with its
  owner's usual room, spilling to the lowest free room on clashes — never double-books,
  leaves sessions unassigned (and warned) when rooms run out. Undoable and audited.
- Staff editor gains a "Usual room" field; `parseOverview` now counts face-to-face bookings.

## 1.5.0 — 2026-06-10

The auto-rota solver.

- **`engine/solver.js`** (spec: docs/SOLVER-SPEC.md): optimises session-type assignment over a
  fixed presence matrix — it never moves anyone's contractual working days. Greedy duty fill
  seeded by pro-rata duty debt, then simulated annealing (seeded mulberry32, deterministic,
  best-seen tracking) over four move types. Weighted scoring: duty coverage per slot/site,
  fairness as squared deviation of duty share, registrar VTS protection, same-day double duty,
  weekly duty caps, locum-duty cost, avoid-duty preferences, and minimal-churn. Manual,
  confirmed, covered and vacancy entries are pinned (but still count toward coverage).
  Supervision gaps can't be fixed by type flips, so they are reported as unresolved
  diagnostics rather than ignored. Advisor pattern: returns a change-set, never applies itself.
- **Solve rota panel** on the Rota page: horizon 1–8 weeks, max duty/week, quick/standard/
  thorough effort; previews score before→after with the full change list and unresolved items;
  Apply is undoable and audited, or Discard.
- **Avoid-duty preferences**: per-person Mon–Fri × AM/PM multi-select in the staff editor,
  honoured by the solver as a soft penalty.
- 13th test suite (`test-solver.js`) covering coverage, locks, fairness splits, excess-duty
  revert, VTS fixes, caps, preferences, bank holidays, determinism and unresolved reporting.

## 1.4.0 — 2026-06-10

The market-leading push: inference, shared state, self-service, evidence, domain round-out.

- **Auto-template inference** (`engine/infer.js`): reads 4 weeks of Medicus appointment-book
  history and proposes each clinician's week pattern (cell proposed at ≥60% weekday presence),
  one-click apply per person from the Templates page. Sample-data mode included.
- **Practice sync** (`shared/sync.js`): multi-user shared state over a folder on the practice's
  shared drive (File System Access API) — versioned JSON, debounced push on every change,
  15-second pull, last-writer-wins, reconnect flow. No server; data never leaves the practice.
- **Identity & audit trail**: who-am-I (name + manager/staff role) in Settings; every material
  action (edits, approvals, covers, swaps, reports) recorded in a capped, synced audit log.
- **My week self-service** (new view): each clinician sees their upcoming sessions, balances,
  exports their ICS, submits leave requests and proposes **shift swaps** (role-group and leave
  validated); managers approve swaps from the Dashboard and the sessions exchange people.
- **CQC evidence pack** (`engine/evidence.js`): printable report of the safe-staffing rules in
  force plus a weekly compliance record (duty cover %, supervision/HCA/room breaches,
  capacity vs benchmark), leave totals, Bradford table and the change log. Settings → Reports.
- **Domain round-out**: England & Wales bank holidays (closed: no duty checks, no generation,
  no leave cost; editable list); seasonal peak-period leave caps; per-site duty cover for
  multi-site practices with a site filter on the grid; enhanced-access "GP physically present"
  check; registrar VTS half-day protection; registrar-weighted capacity (ST1/2 ×0.5, ST3 ×0.75);
  debrief time auto-noted on the supervisor's generated session.

## 1.3.0 — 2026-06-10

Everything from the deferred list, plus the cover assistant.

- **Undo** on the rota: every grid mutation (cell edits, drag/swap/copy, bulk edits, keyboard
  deletes, copy-week, generation, auto-duty) is undoable — toolbar button or Ctrl+Z, 30 levels.
- **Multi-select bulk editing**: Shift-click cells to select; a floating bar sets the session
  type, sets/clears the room, or clears the lot in one go (leave days skipped).
- **Rooms view**: a rooms × day/period pivot of the same week — who is in each room per session,
  clashes outlined in red, plus an Unassigned row of clinic sessions still needing a room.
- **Keyboard navigation**: arrow keys move around the grid, Enter/Space opens the cell editor,
  Delete clears a session, Escape closes the menu.
- **ICS calendar export** per clinician from the Staff page — RFC 5545 VEVENTs (AM 08:00–13:00,
  PM 13:00–18:30 local), rooms as LOCATION, notes as DESCRIPTION; vacancies excluded.
- **Same-day sickness assistant** (dashboard): mark someone sick today — approves the episode,
  punches out their sessions — and the cover worklist now ranks who could take each vacancy:
  same role group, free that period, ordered by unrostered contracted capacity, then extra
  sessions, then locums. One click assigns the cover and inherits the freed room.
- New engine modules `engine/ics.js` and `engine/cover.js`, fully unit-tested.

## 1.2.0 — 2026-06-10

UI pass: fluid rota editing and a full glassmorphism redesign.

- **Drag & drop** on the rota grid: drag a session to move it between staff/days/periods, drop
  onto an occupied cell to swap the two sessions, hold Ctrl/Alt while dropping to copy the
  session type into an empty cell. Drops onto approved-leave days are refused with a toast.
- **Row totals**: sessions rostered vs contracted per person (amber when over).
- **Coverage footer**: clinical headcount per AM/PM with a duty-cover ✓/✗ at a glance.
- **Copy previous week**: clones last week's sessions into empty cells (skips occupied cells
  and people on leave; rooms carried over).
- **Jump-to-date** picker in the rota toolbar; **Print** button with a dedicated plain-paper
  print stylesheet (nav/toolbars stripped, week header added, chips colour-printed).
- **Glass theme**: dark glassmorphism redesign — translucent blurred cards, nav and menus over
  an ambient gradient; animated view transitions, pop-in cell menu, sliding toast, hover
  micro-interactions throughout. `prefers-reduced-motion` fully respected; print stays plain.

## 1.1.0 — 2026-06-10

Sickness HR tooling and rooms.

- **Bradford Factor**: S²×D over a rolling 52-week window from approved sickness episodes
  (contiguous records merge into one episode; only working days count). Banded
  ok/monitor/high/severe with thresholds configurable in Settings; surfaced on the Leave page
  and as dashboard flags. Triggers a conversation, never automatic action.
- **Fit notes & return-to-work**: sickness episodes carry a fit-note expiry date and an RTW-done
  flag, editable on the Leave page. Warnings for: off sick >7 days with no fit note
  (self-certification limit), fit note expired or expiring within 7 days, and RTW conversation
  not recorded after an episode ends.
- **Rooms**: room registry in Settings, room assignment per session from the rota cell menu,
  room shown under the session chip, and double-booking warnings in the rules engine.
- Session notes editable from the rota cell menu (shown in the chip tooltip with a 📝 marker).
- Rooms included in the backup envelope and demo dataset (incl. a sickness history that
  exercises Bradford and RTW flags).

## 1.0.0 — 2026-06-10

Initial release.

- Rota week grid (staff × AM/PM) with colour-coded session types and inline cell editing.
- Repeating 1/2/4-week working-pattern templates with roll-forward generation (leave punch-out,
  no overwrites of existing entries).
- Leave management: session-based entitlement accounting (April–March leave year), request
  guardrails (balance, simultaneous-absence caps per role group, duty/cover impact), approval
  punch-out into a cover worklist, SFE sickness-reimbursement flags.
- Safe-staffing rules engine: duty-doctor cover, registrar supervision, HCA delegation cover,
  capacity vs access benchmark, duty-fairness monitoring.
- Fair duty-doctor auto-assignment (pro-rata duty debt over an 8-week window).
- Live sync: read-only reconciliation of the rota against the Medicus appointment book
  (missing clinics, ghost clinics, unplanned clinics, unknown clinicians) with one-click
  clinician import.
- Dashboard, settings, versioned backup export/import, demo dataset.
- Engine fully unit-tested (`npm test`, no dependencies).
- Release engineering: extension icons, CI test workflow, and a release workflow that packs a
  versioned zip and attaches it to a GitHub release on `v*` tags.
