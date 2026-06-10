// The rota grid: staff × (day, AM/PM) for one week, with inline cell
// editing, template generation, fair duty auto-assignment and the
// rules-engine warnings panel underneath.

import { esc } from '../../shared/esc.js';
import { weekDates, dayKey, fmtDay, addDays, mondayOf, todayISO } from '../../shared/time.js';
import { SESSION_TYPES } from '../../shared/model.js';
import { uid } from '../../shared/store.js';
import { checkWeek, capacitySummary, dutyFairness } from '../../engine/rules.js';
import { generateEntries } from '../../engine/template.js';
import { autoAssignDuty, applyDutyChanges } from '../../engine/fairness.js';
import { approvedLeaveFor } from '../../engine/leave.js';
import { staffSorted, staffLabel, typeChip, leaveChip, warnHTML } from './ui.js';

function closeMenu() {
  const m = document.getElementById('cellmenu');
  if (m) m.remove();
}

function openCellMenu(ctx, cell, person, date, period) {
  closeMenu();
  const { state } = ctx;
  const entry = state.entries.find((e) => e.staffId === person.id && e.date === date && e.period === period);
  const rooms = state.rooms || [];
  const menu = document.createElement('div');
  menu.id = 'cellmenu';
  menu.innerHTML = `
    <div class="who">${esc(person.name)} — ${esc(fmtDay(date))} ${period.toUpperCase()}</div>
    ${SESSION_TYPES.map((t) => `
      <button data-type="${esc(t.id)}"><span class="chip" style="background:${esc(t.colour)}">${esc(t.short)}</span>${esc(t.name)}</button>
    `).join('')}
    ${entry && rooms.length ? `
      <div class="who">Room</div>
      ${rooms.map((r) => `<button data-room="${esc(r.id)}"><span class="chip" style="background:${entry.roomId === r.id ? '#0d9488' : '#cbd5e1'}">RM</span>${esc(r.name)}${entry.roomId === r.id ? ' ✓' : ''}</button>`).join('')}
      ${entry.roomId ? '<button data-room=""><span class="chip" style="background:#94a3b8">×</span>No room</button>' : ''}
    ` : ''}
    ${entry ? '<button data-act="note"><span class="chip" style="background:#64748b">…</span>Edit note</button>' : ''}
    ${entry && entry.status === 'vacancy' ? '<button data-act="covered"><span class="chip covered" style="background:#059669">LOC</span>Mark covered (locum)</button>' : ''}
    ${entry ? '<button data-act="clear"><span class="chip" style="background:#94a3b8">×</span>Clear session</button>' : ''}
  `;
  document.body.appendChild(menu);
  const r = cell.getBoundingClientRect();
  menu.style.left = `${Math.min(r.left, window.innerWidth - menu.offsetWidth - 12)}px`;
  menu.style.top = `${Math.min(r.bottom + 4, window.innerHeight - menu.offsetHeight - 12)}px`;

  menu.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.dataset.type) {
      if (entry) {
        entry.typeId = btn.dataset.type;
        entry.status = 'planned';
        entry.source = 'manual';
        entry.note = '';
      } else {
        state.entries.push({
          id: uid(), staffId: person.id, date, period,
          typeId: btn.dataset.type, status: 'planned', source: 'manual', note: ''
        });
      }
    } else if ('room' in btn.dataset && entry) {
      entry.roomId = btn.dataset.room || null;
    } else if (btn.dataset.act === 'note' && entry) {
      const note = prompt('Note for this session', entry.note || '');
      if (note === null) return; // cancelled — keep the menu open state simple: bail without saving
      entry.note = note.trim();
    } else if (btn.dataset.act === 'covered' && entry) {
      entry.status = 'covered';
      entry.note = 'Covered by locum';
    } else if (btn.dataset.act === 'clear' && entry) {
      state.entries = state.entries.filter((e) => e.id !== entry.id);
    }
    closeMenu();
    await ctx.persist('entries');
    ctx.rerender();
  });
}

document.addEventListener('click', (ev) => {
  if (!ev.target.closest('#cellmenu') && !ev.target.closest('td.cell')) closeMenu();
});

export default {
  render(root, ctx) {
    const { state } = ctx;
    const s = state.settings;
    const dates = weekDates(state.weekMonday);
    const today = todayISO();
    const showDates = dates.filter(
      (d) => s.openDays.includes(dayKey(d)) || state.entries.some((e) => e.date === d)
    );
    const people = staffSorted(state.staff);

    const warnings = checkWeek({ dates, entries: state.entries, staff: state.staff, leaveList: state.leave, settings: s, rooms: state.rooms || [] });
    const cap = capacitySummary({ dates, entries: state.entries, staff: state.staff, leaveList: state.leave, settings: s });
    const fairnessWindowStart = addDays(state.weekMonday, -56);
    const fair = dutyFairness({
      entries: state.entries.filter((e) => e.date >= fairnessWindowStart && e.date <= dates[6]),
      staff: state.staff
    });
    for (const f of fair.flagged) {
      warnings.push({ severity: 'info', kind: 'fairness', message: `Duty fairness: ${f.name} carries ${f.dutyCount} duty sessions in the last 8 weeks — well above the pro-rata practice average` });
    }
    const high = warnings.filter((w) => w.severity === 'high').length;

    root.innerHTML = `
      <h1>Rota</h1>
      <div class="toolbar">
        <button id="prev">‹</button>
        <button id="todaybtn">This week</button>
        <button id="next">›</button>
        <span class="weeklabel">${esc(fmtDay(dates[0]))} – ${esc(fmtDay(dates[6]))}</span>
        <span class="spacer"></span>
        <select id="genweeks">
          ${[1, 2, 4, 6, 8, 12].map((n) => `<option value="${n}">${n} week${n > 1 ? 's' : ''}</option>`).join('')}
        </select>
        <button id="generate">Generate from templates</button>
        <button id="autoduty" class="primary">Auto-assign duty</button>
      </div>
      <div class="rotawrap">
        <table class="rota">
          <thead>
            <tr>
              <th rowspan="2">Staff</th>
              ${showDates.map((d) => `<th colspan="2" class="day${d === today ? ' today' : ''}">${esc(fmtDay(d))}</th>`).join('')}
            </tr>
            <tr>${showDates.map((d) => `<th class="${d === today ? 'today' : ''}">AM</th><th class="${d === today ? 'today' : ''}">PM</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${people.map((p) => `
              <tr>
                <td class="staffname">${staffLabel(p)}</td>
                ${showDates.map((d) => {
                  const onLeave = approvedLeaveFor(state.leave, p.id, d);
                  return ['am', 'pm'].map((period) => {
                    const entry = state.entries.find((e) => e.staffId === p.id && e.date === d && e.period === period);
                    const room = entry && entry.roomId ? (state.rooms || []).find((r) => r.id === entry.roomId) : null;
                    const extra = entry ? [room && room.name, entry.note].filter(Boolean).join(' — ') : '';
                    let inner;
                    if (entry && entry.status === 'vacancy') inner = typeChip(entry.typeId, 'vacancy', extra);
                    else if (onLeave) inner = leaveChip(onLeave);
                    else if (entry) inner = typeChip(entry.typeId, entry.status, extra);
                    else inner = '<span class="empty">·</span>';
                    if (entry && !onLeave && (room || entry.note)) {
                      inner += `<div class="roomtag">${esc(room ? room.name : '')}${entry.note ? (room ? ' ' : '') + '📝' : ''}</div>`;
                    }
                    return `<td class="cell${d === today ? ' today' : ''}" data-staff="${esc(p.id)}" data-date="${esc(d)}" data-period="${period}">${inner}</td>`;
                  }).join('');
                }).join('')}
              </tr>
            `).join('')}
            ${people.length ? '' : `<tr><td colspan="99" class="muted">No staff yet — add your team under Staff, or load the demo dataset from Settings.</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="card">
        <h2 class="mt0">Checks — ${high ? `<span style="color:var(--high)">${high} high-priority</span>, ` : ''}${warnings.length} total</h2>
        <div class="sub" style="margin-bottom:8px">
          Capacity: ${cap.gpClinicalSessions} GP clinical sessions ≈ ${cap.estimated} appointments vs benchmark ${cap.target}
          (${esc(String(s.accessBenchmarkPer1000))}/1,000 × ${Number(s.listSize).toLocaleString()} patients)
        </div>
        ${warnHTML(warnings)}
      </div>
    `;

    root.querySelector('#prev').onclick = () => { state.weekMonday = addDays(state.weekMonday, -7); ctx.rerender(); };
    root.querySelector('#next').onclick = () => { state.weekMonday = addDays(state.weekMonday, 7); ctx.rerender(); };
    root.querySelector('#todaybtn').onclick = () => { state.weekMonday = mondayOf(todayISO()); ctx.rerender(); };

    root.querySelector('#generate').onclick = async () => {
      const weeks = Number(root.querySelector('#genweeks').value);
      if (!state.settings.templateAnchorMonday) {
        state.settings.templateAnchorMonday = state.weekMonday;
        await ctx.persist('settings');
      }
      const created = generateEntries({
        staff: state.staff,
        startDate: state.weekMonday,
        endDate: addDays(state.weekMonday, weeks * 7 - 1),
        existingEntries: state.entries,
        leaveList: state.leave,
        settings: state.settings
      });
      state.entries.push(...created);
      await ctx.persist('entries');
      ctx.toast(`Generated ${created.length} sessions over ${weeks} week(s)`);
      ctx.rerender();
    };

    root.querySelector('#autoduty').onclick = async () => {
      const history = state.entries.filter((e) => e.date >= fairnessWindowStart && e.date < dates[0]);
      const { changes, unfilled } = autoAssignDuty({
        dates, entries: state.entries, staff: state.staff,
        leaveList: state.leave, settings: state.settings, historyEntries: history
      });
      if (changes.length) {
        state.entries = applyDutyChanges(state.entries, changes);
        await ctx.persist('entries');
      }
      ctx.toast(`Duty assigned: ${changes.length} session(s)${unfilled.length ? `; ${unfilled.length} slot(s) had no eligible GP` : ''}`);
      ctx.rerender();
    };

    root.querySelectorAll('td.cell').forEach((cell) => {
      cell.addEventListener('click', () => {
        const person = state.staff.find((p) => p.id === cell.dataset.staff);
        if (person) openCellMenu(ctx, cell, person, cell.dataset.date, cell.dataset.period);
      });
    });
  }
};
