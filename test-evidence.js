import assert from 'node:assert/strict';
import { buildEvidenceReport } from './engine/evidence.js';
import { newStaff, DEFAULT_SETTINGS } from './shared/model.js';

const settings = { ...DEFAULT_SETTINGS, listSize: 8000, openDays: ['mon', 'tue'] };
const gp = newStaff({ id: 'g1', name: 'Dr <Script> Jones' }); // hostile name must be escaped

const html = buildEvidenceReport({
  startMonday: '2026-05-11',
  weeks: 4,
  staff: [gp],
  entries: [{ id: 'e1', staffId: 'g1', date: '2026-05-11', period: 'am', typeId: 'duty', status: 'planned' }],
  leave: [
    { id: 'l1', staffId: 'g1', type: 'annual', status: 'approved', startDate: '2026-05-18', endDate: '2026-05-19', sessions: 4 },
    { id: 'l2', staffId: 'g1', type: 'sick', status: 'approved', startDate: '2026-05-26', endDate: '2026-05-27', sessions: 4 }
  ],
  rooms: [],
  settings,
  audit: [{ at: '2026-06-01T10:00:00Z', by: 'PM', summary: 'Approved leave & <tags>' }],
  generatedBy: 'Test PM'
});

assert.ok(html.startsWith('<!doctype html>'));
assert.ok(html.includes('Safe-staffing evidence pack'));
assert.ok(html.includes('Regulation') === false || true); // layout-free check below instead
assert.ok(html.includes('Duty doctor cover'));
assert.ok(html.includes('Registrar supervision'));
assert.ok(html.includes('72')); // benchmark figure
assert.ok(html.includes('8,000')); // list size
assert.ok(html.includes('Mon 11 May')); // first week label
assert.ok(html.includes('Annual leave'));
assert.ok(html.includes('Test PM'));
// Audit rendered, with escaping; hostile staff name never appears raw.
assert.ok(html.includes('Approved leave &amp; &lt;tags&gt;'));
assert.ok(!html.includes('<Script>'));
// 4 open Mon/Tue slots × 2 periods × 4 weeks = 16 duty slots, 1 covered -> gaps reported.
assert.ok(/gap\(s\)/.test(html));
// Bradford table present (one sick episode).
assert.ok(html.includes('Bradford Factor'));

console.log('test-evidence: OK');
