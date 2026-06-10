# Changelog

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
