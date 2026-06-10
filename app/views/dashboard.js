// Dashboard: what a practice manager needs at 8am — today's duty cover,
// this week's risk picture, the cover worklist and pending decisions.

import { esc } from '../../shared/esc.js';
import { todayISO, mondayOf, weekDates, fmtDay } from '../../shared/time.js';
import { typeById } from '../../shared/model.js';
import { checkWeek, capacitySummary } from '../../engine/rules.js';
import { approvedLeaveFor, sfeReimbursementFlags, fitNoteFlags } from '../../engine/leave.js';
import { bradfordRows } from '../../engine/bradford.js';
import { warnHTML } from './ui.js';

export default {
  render(root, ctx) {
    const { state } = ctx;
    const today = todayISO();
    const monday = mondayOf(today);
    const dates = weekDates(monday);

    const warnings = checkWeek({ dates, entries: state.entries, staff: state.staff, leaveList: state.leave, settings: state.settings });
    const high = warnings.filter((w) => w.severity === 'high');
    const cap = capacitySummary({ dates, entries: state.entries, staff: state.staff, leaveList: state.leave, settings: state.settings });
    const vacancies = state.entries.filter((e) => e.status === 'vacancy' && e.date >= today);
    const pending = state.leave.filter((l) => l.status === 'requested');
    const sfe = sfeReimbursementFlags(state.leave, state.staff);
    const fitFlags = fitNoteFlags(state.leave, state.staff);
    const bradfordFlagged = bradfordRows({ staff: state.staff, leaveList: state.leave, settings: state.settings })
      .filter((r) => r.band === 'high' || r.band === 'severe');

    const dutyToday = {};
    for (const period of ['am', 'pm']) {
      dutyToday[period] = state.entries
        .filter((e) => e.date === today && e.period === period && e.typeId === 'duty' && e.status !== 'vacancy' && e.status !== 'cancelled')
        .map((e) => state.staff.find((s) => s.id === e.staffId))
        .filter((p) => p && !approvedLeaveFor(state.leave, p.id, today))
        .map((p) => p.name);
    }
    const onLeaveToday = state.staff.filter((p) => approvedLeaveFor(state.leave, p.id, today)).map((p) => p.name);

    root.innerHTML = `
      <h1>Dashboard — ${esc(fmtDay(today))}</h1>
      <div class="cards">
        <div class="card">
          <div class="kpi ${dutyToday.am.length && dutyToday.pm.length ? 'good' : 'bad'}">${dutyToday.am.length && dutyToday.pm.length ? '✓' : '✗'}</div>
          <div class="sub">Duty today — AM: ${esc(dutyToday.am.join(', ') || 'nobody')} · PM: ${esc(dutyToday.pm.join(', ') || 'nobody')}</div>
        </div>
        <div class="card"><div class="kpi ${high.length ? 'bad' : 'good'}">${high.length}</div><div class="sub">High-priority warnings this week</div></div>
        <div class="card"><div class="kpi ${vacancies.length ? 'bad' : 'good'}">${vacancies.length}</div><div class="sub">Upcoming sessions needing cover</div></div>
        <div class="card"><div class="kpi">${pending.length}</div><div class="sub">Leave requests awaiting decision</div></div>
        <div class="card"><div class="kpi ${cap.estimated >= cap.target ? 'good' : ''}">${cap.estimated}<span class="sub" style="font-size:14px"> / ${cap.target}</span></div><div class="sub">GP appointments this week vs benchmark</div></div>
      </div>

      ${onLeaveToday.length ? `<div class="card"><strong>On leave today:</strong> ${esc(onLeaveToday.join(', '))}</div>` : ''}
      ${sfe.length || fitFlags.length || bradfordFlagged.length ? `<div class="card">
        ${sfe.map((f) => `<div class="warn"><span class="sev ${f.eligible ? 'high' : 'medium'}">SFE</span><span>${esc(f.name)} — sickness day ${f.days}${f.eligible ? ', locum reimbursement claimable' : ''}</span></div>`).join('')}
        ${fitFlags.map((f) => `<div class="warn"><span class="sev ${esc(f.severity)}">fit note</span><span>${esc(f.message)}</span></div>`).join('')}
        ${bradfordFlagged.map((r) => `<div class="warn"><span class="sev ${r.band === 'severe' ? 'high' : 'medium'}">Bradford</span><span>${esc(r.name)} — score ${r.score} (${r.episodes} episodes, ${r.days} days, 52-week rolling) — <a href="#leave">review</a></span></div>`).join('')}
      </div>` : ''}

      <div class="card">
        <h2 class="mt0">This week's checks <a href="#rota" class="sub" style="font-weight:400">open rota →</a></h2>
        ${warnHTML(warnings.slice(0, 10))}
        ${warnings.length > 10 ? `<div class="sub" style="margin-top:6px">…and ${warnings.length - 10} more on the Rota page.</div>` : ''}
      </div>

      ${vacancies.length ? `
        <div class="card">
          <h2 class="mt0">Cover worklist</h2>
          <table>
            <thead><tr><th>Date</th><th>Session</th><th>Was</th><th>Note</th></tr></thead>
            <tbody>
              ${vacancies.slice(0, 12).map((e) => {
                const p = state.staff.find((s) => s.id === e.staffId);
                const t = typeById(e.typeId);
                return `<tr><td>${esc(fmtDay(e.date))} ${e.period.toUpperCase()}</td><td>${esc(t ? t.name : e.typeId)}</td><td>${esc(p ? p.name : '?')}</td><td class="sub">${esc(e.note || '')}</td></tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>` : ''}

      ${state.staff.length ? '' : `
        <div class="card">
          <h2 class="mt0">Getting started</h2>
          <ol>
            <li>Load the <a href="#settings">demo dataset</a> to explore, or</li>
            <li>Set your practice code in <a href="#settings">Settings</a> and import your clinicians from the Medicus appointment book via <a href="#sync">Live sync</a>,</li>
            <li>then set each person's weekly pattern under <a href="#templates">Templates</a> and generate the rota.</li>
          </ol>
        </div>`}
    `;
  }
};
