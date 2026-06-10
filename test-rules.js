import assert from 'node:assert/strict';
import { checkWeek, capacitySummary, dutyFairness } from './engine/rules.js';
import { newStaff, DEFAULT_SETTINGS } from './shared/model.js';
import { weekDates } from './shared/time.js';

const dates = weekDates('2026-06-08');
const settings = { ...DEFAULT_SETTINGS, listSize: 2000, openDays: ['mon'] }; // keep the noise down: Monday only

const partner = newStaff({ id: 'p1', name: 'Dr Partner', employmentType: 'partner', supervisor: true });
const reg = newStaff({ id: 'r1', name: 'Dr Reg', employmentType: 'registrar', registrarStage: 'ST2', dutyEligible: false });
const locum = newStaff({ id: 'l1', name: 'Dr Locum', employmentType: 'locum', supervisor: true }); // locums can't supervise
const hca = newStaff({ id: 'h1', name: 'HCA Jo', role: 'hca', dutyEligible: false });

const e = (staffId, date, period, typeId, status = 'planned') => ({ id: `${staffId}${date}${period}`, staffId, date, period, typeId, status });

// No duty doctor Monday AM/PM -> two high warnings.
let w = checkWeek({ dates, entries: [e('p1', '2026-06-08', 'am', 'surgery')], staff: [partner], leaveList: [], settings });
assert.equal(w.filter((x) => x.kind === 'duty' && x.severity === 'high').length, 2);

// Duty rostered AM -> only PM flagged.
w = checkWeek({ dates, entries: [e('p1', '2026-06-08', 'am', 'duty')], staff: [partner], leaveList: [], settings });
assert.equal(w.filter((x) => x.kind === 'duty').length, 1);
assert.equal(w.find((x) => x.kind === 'duty').period, 'pm');

// Duty doctor on approved leave doesn't count as cover.
w = checkWeek({
  dates, entries: [e('p1', '2026-06-08', 'am', 'duty')], staff: [partner],
  leaveList: [{ staffId: 'p1', status: 'approved', type: 'annual', startDate: '2026-06-08', endDate: '2026-06-08' }],
  settings
});
assert.equal(w.filter((x) => x.kind === 'duty').length, 2);

// Registrar with no supervisor co-rostered -> supervision warning; locum doesn't count.
w = checkWeek({
  dates, entries: [e('r1', '2026-06-08', 'am', 'surgery'), e('l1', '2026-06-08', 'am', 'duty')],
  staff: [reg, locum], leaveList: [], settings
});
assert.equal(w.filter((x) => x.kind === 'supervision').length, 1);

// Partner co-rostered -> no supervision warning.
w = checkWeek({
  dates, entries: [e('r1', '2026-06-08', 'am', 'surgery'), e('p1', '2026-06-08', 'am', 'duty')],
  staff: [reg, partner], leaveList: [], settings
});
assert.equal(w.filter((x) => x.kind === 'supervision').length, 0);

// HCA alone -> warning; with a GP present -> none.
w = checkWeek({ dates, entries: [e('h1', '2026-06-08', 'am', 'surgery')], staff: [hca], leaveList: [], settings });
assert.equal(w.filter((x) => x.kind === 'hca').length, 1);
w = checkWeek({
  dates, entries: [e('h1', '2026-06-08', 'am', 'surgery'), e('p1', '2026-06-08', 'am', 'duty')],
  staff: [hca, partner], leaveList: [], settings
});
assert.equal(w.filter((x) => x.kind === 'hca').length, 0);

// Vacancy surfaces in the worklist.
w = checkWeek({ dates, entries: [e('p1', '2026-06-08', 'am', 'surgery', 'vacancy'), e('p1', '2026-06-08', 'pm', 'duty')], staff: [partner], leaveList: [], settings });
assert.equal(w.filter((x) => x.kind === 'vacancy').length, 1);

// Capacity: 1 GP clinical session × 15 appts vs 2,000-patient list target 144.
const cap = capacitySummary({ dates, entries: [e('p1', '2026-06-08', 'am', 'surgery')], staff: [partner], leaveList: [], settings });
assert.equal(cap.gpClinicalSessions, 1);
assert.equal(cap.estimated, 15);
assert.equal(cap.target, 144);

// Fairness: a 4-session GP doing 3x the duties of an 8-session GP is
// well above 1.5x the practice mean share and gets flagged.
const gpBig = newStaff({ id: 'g8', name: 'Dr Eight', contractedSessions: 8 });
const gpSmall = newStaff({ id: 'g4', name: 'Dr Four', contractedSessions: 4 });
const hist = [
  e('g8', '2026-06-01', 'am', 'duty'),
  e('g4', '2026-06-01', 'pm', 'duty'), e('g4', '2026-06-02', 'pm', 'duty'), e('g4', '2026-06-03', 'pm', 'duty')
];
const fair = dutyFairness({ entries: hist, staff: [gpBig, gpSmall] });
assert.equal(fair.flagged.length, 1);
assert.equal(fair.flagged[0].staffId, 'g4');

console.log('test-rules: OK');
