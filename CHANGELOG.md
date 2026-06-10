# Changelog

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
