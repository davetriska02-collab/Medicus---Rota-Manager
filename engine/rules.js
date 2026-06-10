// The compliance rules engine. Evaluates a week of the rota against the
// constraints that make a GP rota safe and CQC-defensible:
//   1. Duty-doctor cover every open AM and PM (core hours 8:00–18:30).
//   2. Registrar clinical sessions need a co-rostered eligible supervisor
//      on site (a partner/salaried supervising GP — never a locum).
//   3. HCA clinical sessions need a registered professional in the building.
//   4. Open vacancies surfaced as a cover worklist.
//   5. Capacity vs the ~72 appointments/1,000 patients/week benchmark.
//   6. Duty fairness: share pro-rata to contracted sessions.
// All warnings, no hard blocks — guidance, not regulation.

import { dayKey, fmtDay } from '../shared/time.js';
import { typeById, roleById, canSupervise } from '../shared/model.js';
import { approvedLeaveFor } from './leave.js';

const ACTIVE = (e) => e.status === 'planned' || e.status === 'confirmed' || e.status === 'covered';

function rosteredOn(entries, staff, leaveList, date, period) {
  return entries
    .filter((e) => e.date === date && e.period === period && ACTIVE(e))
    .map((e) => ({ entry: e, person: staff.find((s) => s.id === e.staffId) }))
    .filter((x) => x.person && !approvedLeaveFor(leaveList, x.person.id, date));
}

export function checkWeek({ dates, entries, staff, leaveList, settings }) {
  const warnings = [];
  const weekEntries = entries.filter((e) => dates.includes(e.date));

  for (const date of dates) {
    if (!settings.openDays.includes(dayKey(date))) continue;
    for (const period of ['am', 'pm']) {
      const present = rosteredOn(weekEntries, staff, leaveList, date, period);

      // 1. Duty cover
      const required = (settings.dutyRequired || {})[period] ?? 1;
      const duty = present.filter((x) => x.entry.typeId === 'duty' && x.person.dutyEligible);
      if (duty.length < required) {
        warnings.push({
          severity: 'high', kind: 'duty', date, period,
          message: `${fmtDay(date)} ${period.toUpperCase()}: no duty doctor rostered (${duty.length}/${required})`
        });
      }

      // 2. Registrar supervision
      for (const { person, entry } of present) {
        if (person.employmentType !== 'registrar') continue;
        const t = typeById(entry.typeId);
        if (!t || !t.clinical) continue;
        const supervisor = present.find((x) => x.person.id !== person.id && canSupervise(x.person));
        if (!supervisor) {
          warnings.push({
            severity: 'high', kind: 'supervision', date, period, staffId: person.id,
            message: `${fmtDay(date)} ${period.toUpperCase()}: ${person.name} (${person.registrarStage || 'GPST'}) has a clinical session with no eligible supervising GP co-rostered`
          });
        }
      }

      // 3. HCA delegation cover
      for (const { person, entry } of present) {
        if (person.role !== 'hca') continue;
        const t = typeById(entry.typeId);
        if (!t || !t.clinical) continue;
        const registered = present.find((x) => x.person.id !== person.id && (roleById(x.person.role) || {}).registered);
        if (!registered) {
          warnings.push({
            severity: 'medium', kind: 'hca', date, period, staffId: person.id,
            message: `${fmtDay(date)} ${period.toUpperCase()}: ${person.name} (HCA) rostered with no registered professional in the building`
          });
        }
      }
    }
  }

  // 4. Vacancies
  for (const e of weekEntries.filter((x) => x.status === 'vacancy')) {
    const person = staff.find((s) => s.id === e.staffId);
    const t = typeById(e.typeId);
    warnings.push({
      severity: 'medium', kind: 'vacancy', date: e.date, period: e.period, staffId: e.staffId,
      message: `${fmtDay(e.date)} ${e.period.toUpperCase()}: ${t ? t.name : e.typeId} session needs cover${person ? ` (was ${person.name})` : ''}${e.note ? ` — ${e.note}` : ''}`
    });
  }

  // 5. Capacity vs access benchmark
  const cap = capacitySummary({ dates, entries: weekEntries, staff, leaveList, settings });
  if (cap.target > 0 && cap.estimated < cap.target) {
    warnings.push({
      severity: 'info', kind: 'capacity',
      message: `Capacity: ~${cap.estimated} GP appointments rostered this week vs ${cap.target} benchmark (${settings.accessBenchmarkPer1000}/1,000 × list of ${settings.listSize.toLocaleString()})`
    });
  }

  return warnings;
}

export function capacitySummary({ dates, entries, staff, leaveList, settings }) {
  let gpClinicalSessions = 0;
  for (const e of entries.filter((x) => dates.includes(x.date) && ACTIVE(x))) {
    const person = staff.find((s) => s.id === e.staffId);
    const t = typeById(e.typeId);
    if (!person || !t || !t.clinical || person.role !== 'gp') continue;
    if (approvedLeaveFor(leaveList, person.id, e.date)) continue;
    gpClinicalSessions += 1;
  }
  const estimated = gpClinicalSessions * (settings.apptsPerSurgerySession || 15);
  const target = Math.round(((settings.listSize || 0) / 1000) * (settings.accessBenchmarkPer1000 || 72));
  return { gpClinicalSessions, estimated, target };
}

// 6. Duty fairness over a history window: each duty-eligible GP's duty count
// per contracted session, vs the practice mean. Flags >1.5× the mean.
export function dutyFairness({ entries, staff }) {
  const eligible = staff.filter((s) => s.dutyEligible && s.role === 'gp' && (s.contractedSessions || 0) > 0);
  const rows = eligible.map((person) => {
    const count = entries.filter((e) => e.staffId === person.id && e.typeId === 'duty' && e.status !== 'cancelled' && e.status !== 'vacancy').length;
    return { staffId: person.id, name: person.name, dutyCount: count, share: count / person.contractedSessions };
  });
  const mean = rows.length ? rows.reduce((s, r) => s + r.share, 0) / rows.length : 0;
  const flagged = mean > 0 ? rows.filter((r) => r.share > mean * 1.5) : [];
  return { rows, mean, flagged };
}
