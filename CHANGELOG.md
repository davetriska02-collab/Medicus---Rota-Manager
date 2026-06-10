# Changelog

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
