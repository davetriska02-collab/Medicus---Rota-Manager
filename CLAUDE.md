# CLAUDE.md — developer guide

## What this is

Chrome MV3 extension: a rota manager for UK general practice, integrated read-only with the
Medicus EHR. Sibling product to the Medicus Suite (`davetriska02-collab/medicus-suite`) and
follows its conventions.

## Conventions (inherited from Medicus Suite — keep them)

- **Plain JS, ES modules, no bundler, no runtime dependencies.** `package.json` exists only for
  `npm test` and `"type": "module"`.
- **engine/ is pure**: no DOM, no `chrome.*`, no `fetch`. Everything in engine/ must be importable
  and testable in node. UI and IO live in app/ and shared/.
- **Every value rendered into HTML goes through `esc()`** (`shared/esc.js`). No exceptions.
- **Local calendar dates only** (`YYYY-MM-DD` strings, `shared/time.js`) — never UTC; a rota built
  at 23:30 must not roll over.
- **Storage keys** are namespaced `rota.<thing>` in `chrome.storage.local` (localStorage fallback
  for dev in a plain tab). New persistent keys must be added to the backup envelope in
  `shared/store.js` (`exportEnvelope`/`importEnvelope`).
- **PHI minimisation**: patient data from Medicus payloads may be counted/displayed transiently but
  is NEVER persisted.
- **Medicus API**: read-only, `credentials: 'include'`, subdomain
  `{practiceCode}.api.england.medicus.health` (practice code = 4–8 hex chars). Concurrent fetches
  use `Promise.allSettled`; errors are surfaced to the user, never silent.
- **Version bumps**: semantic, bump `manifest.json` + `package.json` together, note in
  CHANGELOG.md.

## Testing

`npm test` runs every `test-*.js` with node (no framework, `node:assert/strict`). All engine
behaviour changes need a test. Tests must not touch chrome APIs.

## Domain invariants (don't break these)

- The **session** (date + AM/PM + type) is the atomic unit. Full-time ≈ 8 sessions/week but always
  use `staff.contractedSessions`, never a constant.
- Leave is accounted in **sessions**, leave year runs **April–March**.
- Registrar supervision: eligible supervisor = GP + `supervisor` flag + partner/salaried (a locum
  can never supervise). Registrars default `dutyEligible: false`.
- Duty fairness is **pro-rata to contracted sessions**.
- Safe-staffing rules **warn, never hard-block** — they encode guidance (BMA/CQC/NHSE), not law,
  and practices differ. Thresholds belong in `settings`, not constants.
- Rota↔Medicus matching is by clinician display name (`staff.medicusName`, fallback `staff.name`,
  case-insensitive) because the appointment-book endpoint exposes no clinician UUIDs.

## Research corpus

docs/research/ holds the three reports (market, GP domain rules, Medicus data surface) that drove
the design — check them before changing domain logic; they contain the source citations.
