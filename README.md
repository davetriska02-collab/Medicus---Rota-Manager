# Medicus Rota Manager

A rota manager built **for general practice** and **around the Medicus EHR**. It is a Chrome (MV3)
extension — the same proven, read-only architecture as the Medicus Suite — whose whole reason to
exist is the one thing no rota product on the market does: **reconciling the planned rota against
the live Medicus appointment book.**

> Rota says Dr X is consulting Tuesday AM, but no clinic is built in Medicus → lost capacity.
> Medicus has a clinic built for Dr Y who is on approved leave → 14 booked patients to rebook.
> This tool finds both, every day, in one click.

## Features (v1)

| Area | What it does |
|---|---|
| **Rota grid** | Staff × AM/PM week grid, colour-coded session types (surgery, triage, duty, visits, enhanced access, admin, CPD, tutorial, meeting), inline cell editing |
| **Templates** | Repeating 1/2/4-week working patterns per person; one click rolls them forward for up to 12 weeks, skipping anything already rostered and punching out approved leave |
| **Leave** | Entitlements counted in **sessions** (the only unit that works for part-timers), April–March leave year, instant guardrails on every request: balance, simultaneous-absence caps per role group, duty/cover impact. Approval automatically converts the person's clinical sessions into a cover worklist |
| **Rules engine** | Duty-doctor cover every open AM/PM · registrar sessions require a co-rostered eligible supervising GP (never a locum) · HCA sessions require a registered professional in the building · capacity vs the 72 appts/1,000 patients/week access benchmark · duty fairness pro-rata to contracted sessions. All warnings, no hard blocks — guidance, not regulation |
| **Auto-assign duty** | Fair constraint assignment: converts the surgery/triage session of the eligible GP carrying the lowest duty debt (8-week history, pro-rata to contracted sessions) |
| **Live sync** | Reads the Medicus appointment book (read-only, via your logged-in session) and diffs it against the rota: missing clinics, ghost clinics, unplanned clinics, unknown clinicians — with one-click clinician import to seed the staff registry |
| **Sickness HR** | Fit-note expiry and return-to-work tracking, **Bradford Factor** scoring (rolling 52 weeks, configurable bands), and SFE flags when episodes cross the 2-week locum-reimbursement threshold |
| **Rooms** | Room registry, per-session room assignment from the rota grid, double-booking warnings |
| **Data** | Versioned backup export/import, demo dataset, no patient-identifiable data ever persisted |

## Install

**From a release (recommended):** download the latest
`medicus-rota-manager-v*.zip` from the [Releases page](../../releases), unzip it, then
Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the
unzipped folder.

**From source:**

1. Clone this repository.
2. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the repo folder.
3. Click the extension action button — the app opens in a tab.
4. Settings → enter your Medicus practice code (the 4–8 hex chars in your `*.api.england.medicus.health` subdomain), or load the demo dataset to explore.
5. Live sync requires being signed in to Medicus in the same browser profile.

`app/app.html` also runs in a plain browser tab during development (storage falls back to
`localStorage`; live sync needs the extension context).

## Architecture

Plain JavaScript, no bundler, no dependencies.

```
manifest.json          MV3, host permissions for *.medicus.health only
service-worker.js      opens/focuses the app tab
app/                   shell + hash router + 7 views (dashboard, rota, staff,
                       templates, leave, sync, settings)
engine/                pure business logic, fully unit-tested, no DOM/chrome:
  template.js          pattern roll-forward
  leave.js             session accounting, guardrails, punch-out, SFE flags
  rules.js             safe-staffing rules engine + capacity + fairness
  fairness.js          duty auto-assignment
  reconcile.js         appointment-book parser + rota diff
shared/                model, storage (chrome.storage.local), time, Medicus API
                       client, demo data, esc()
test-*.js              node tests — `npm test`
docs/                  product plan + the research that shaped it
```

Key data source: `GET {practice}.api.england.medicus.health/scheduling/data/appointment-book/embedded-overview?date=YYYY-MM-DD`
— per-clinician sessions with slot/appointment entries, statuses and delivery modes. Read-only,
credentialed by the user's own Medicus session. Patient names in payloads are counted, never stored.

## Roadmap

See [docs/PLAN.md](docs/PLAN.md) — headline next steps: write-back of session templates into the
Medicus appointment book (live two-way sync), demand-forecast-driven session planning from
appointment history, locum gap-to-cover pipeline, enhanced-access PCN view, NHS pension form
generation.

## Licence

Proprietary — all rights reserved. Public visibility for transparency only.
