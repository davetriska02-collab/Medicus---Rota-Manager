import assert from 'node:assert/strict';
import { sessionsInRange, leaveBalance, checkLeaveRequest, applyApprovedLeave, sfeReimbursementFlags } from './engine/leave.js';
import { newStaff, blankPattern, DEFAULT_SETTINGS } from './shared/model.js';

const settings = { ...DEFAULT_SETTINGS, templateAnchorMonday: '2026-06-08' };

const gp = newStaff({ id: 'gp1', name: 'Dr A', entitlement: { annual: 10, study: 2 }, pattern: blankPattern(1) });
gp.pattern[0].mon = { am: 'surgery', pm: 'surgery' };
gp.pattern[0].tue = { am: 'surgery', pm: null };

// Session cost from pattern when no entries exist: Mon (2) + Tue (1) = 3.
assert.equal(sessionsInRange(gp, '2026-06-08', '2026-06-12', [], settings), 3);

// Rostered entries take precedence over the pattern.
const entries = [
  { id: 'e1', staffId: 'gp1', date: '2026-06-08', period: 'am', typeId: 'duty', status: 'planned' },
  { id: 'e2', staffId: 'gp1', date: '2026-06-08', period: 'pm', typeId: 'surgery', status: 'planned' },
  { id: 'e3', staffId: 'gp1', date: '2026-06-09', period: 'am', typeId: 'admin', status: 'planned' }
];
assert.equal(sessionsInRange(gp, '2026-06-08', '2026-06-12', entries, settings), 3);

// Balance subtracts approved leave in the same leave year only.
const leaveList = [
  { id: 'l1', staffId: 'gp1', type: 'annual', status: 'approved', startDate: '2026-05-04', endDate: '2026-05-05', sessions: 3 },
  { id: 'l2', staffId: 'gp1', type: 'annual', status: 'approved', startDate: '2026-02-02', endDate: '2026-02-03', sessions: 3 }, // previous leave year
  { id: 'l3', staffId: 'gp1', type: 'annual', status: 'requested', startDate: '2026-07-06', endDate: '2026-07-07', sessions: 3 } // not approved
];
const bal = leaveBalance(gp, leaveList, 'annual', '2026-06-10');
assert.equal(bal.used, 3);
assert.equal(bal.remaining, 7);

// Over-entitlement request triggers a high warning.
const bigReq = { id: 'r1', staffId: 'gp1', type: 'annual', startDate: '2026-06-08', endDate: '2026-07-03' }; // 4 weeks × 3 = 12 > 7
let res = checkLeaveRequest(bigReq, { staff: [gp], leaveList, entries: [], settings });
assert.equal(res.sessions, 12);
assert.ok(res.warnings.some((w) => w.severity === 'high' && /remain/.test(w.message)));

// Simultaneous-cap warning when too many of the same group are off.
const gp2 = newStaff({ id: 'gp2', name: 'Dr B' });
const gp3 = newStaff({ id: 'gp3', name: 'Dr C' });
const capSettings = { ...settings, maxSimultaneousLeave: { ...settings.maxSimultaneousLeave, gp: 1 } };
const clashLeave = [{ id: 'lx', staffId: 'gp2', type: 'annual', status: 'approved', startDate: '2026-06-08', endDate: '2026-06-12', sessions: 5 }];
res = checkLeaveRequest(
  { id: 'r2', staffId: 'gp3', type: 'annual', startDate: '2026-06-10', endDate: '2026-06-11' },
  { staff: [gp, gp2, gp3], leaveList: clashLeave, entries: [], settings: capSettings }
);
assert.ok(res.warnings.some((w) => /cap is 1/.test(w.message)));

// Duty impact warning.
res = checkLeaveRequest(
  { id: 'r3', staffId: 'gp1', type: 'annual', startDate: '2026-06-08', endDate: '2026-06-08' },
  { staff: [gp], leaveList: [], entries, settings }
);
assert.ok(res.warnings.some((w) => /duty doctor/.test(w.message)));

// Approval punches out: clinical -> vacancy, admin removed.
const applied = applyApprovedLeave({ staffId: 'gp1', type: 'annual', startDate: '2026-06-08', endDate: '2026-06-09' }, entries);
assert.equal(applied.vacancies, 2);
assert.equal(applied.removed, 1);
assert.equal(applied.entries.find((e) => e.id === 'e1').status, 'vacancy');
assert.ok(!applied.entries.some((e) => e.id === 'e3'));

// SFE: sickness over 14 days flags as reimbursement-eligible.
const flags = sfeReimbursementFlags(
  [{ id: 's1', staffId: 'gp1', type: 'sick', status: 'approved', startDate: '2026-05-20', endDate: '2026-06-20' }],
  [gp], '2026-06-10'
);
assert.equal(flags.length, 1);
assert.equal(flags[0].eligible, true);

console.log('test-leave: OK');
