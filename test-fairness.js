import assert from 'node:assert/strict';
import { autoAssignDuty, applyDutyChanges } from './engine/fairness.js';
import { newStaff, DEFAULT_SETTINGS } from './shared/model.js';
import { weekDates } from './shared/time.js';

const dates = weekDates('2026-06-08');
const settings = { ...DEFAULT_SETTINGS, openDays: ['mon'] };

const gpA = newStaff({ id: 'a', name: 'Dr A', contractedSessions: 8 });
const gpB = newStaff({ id: 'b', name: 'Dr B', contractedSessions: 8 });
const nurse = newStaff({ id: 'n', name: 'Nurse', role: 'nurse', dutyEligible: false });

const e = (id, staffId, period, typeId, status = 'planned') =>
  ({ id, staffId, date: '2026-06-08', period, typeId, status });

// A carries duty history, so B (lower debt) gets Monday AM duty.
let result = autoAssignDuty({
  dates, settings, leaveList: [], staff: [gpA, gpB, nurse],
  entries: [e('e1', 'a', 'am', 'surgery'), e('e2', 'b', 'am', 'surgery'), e('e3', 'n', 'am', 'surgery'),
            e('e4', 'a', 'pm', 'surgery'), e('e5', 'b', 'pm', 'surgery')],
  historyEntries: [
    { staffId: 'a', typeId: 'duty', status: 'planned' } // A has 1 past duty
  ]
});
assert.equal(result.unfilled.length, 0);
assert.equal(result.changes.length, 2);
const amChange = result.changes.find((c) => c.period === 'am');
assert.equal(amChange.staffId, 'b');
// PM goes to A: B's debt rose after taking AM.
const pmChange = result.changes.find((c) => c.period === 'pm');
assert.equal(pmChange.staffId, 'a');

// Existing duty cover means no changes.
result = autoAssignDuty({
  dates, settings, leaveList: [], staff: [gpA, gpB],
  entries: [e('e1', 'a', 'am', 'duty'), e('e2', 'b', 'pm', 'duty')],
  historyEntries: []
});
assert.equal(result.changes.length, 0);
assert.equal(result.unfilled.length, 0);

// Nobody eligible rostered -> unfilled, never assigns a nurse.
result = autoAssignDuty({
  dates, settings, leaveList: [], staff: [nurse],
  entries: [e('e1', 'n', 'am', 'surgery')],
  historyEntries: []
});
assert.deepEqual(result.unfilled, [{ date: '2026-06-08', period: 'am' }, { date: '2026-06-08', period: 'pm' }]);

// GP on approved leave is skipped.
result = autoAssignDuty({
  dates, settings, staff: [gpA, gpB],
  leaveList: [{ staffId: 'a', status: 'approved', type: 'annual', startDate: '2026-06-08', endDate: '2026-06-08' }],
  entries: [e('e1', 'a', 'am', 'surgery'), e('e2', 'b', 'am', 'surgery')],
  historyEntries: []
});
assert.equal(result.changes.find((c) => c.period === 'am').staffId, 'b');

// applyDutyChanges rewrites the entry type and source.
const entries = [e('e1', 'a', 'am', 'surgery')];
const applied = applyDutyChanges(entries, [{ entryId: 'e1', to: 'duty' }]);
assert.equal(applied[0].typeId, 'duty');
assert.equal(applied[0].source, 'auto-duty');

console.log('test-fairness: OK');
