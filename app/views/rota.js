// The rota grid: staff × (day, AM/PM) for one week, with inline cell
// editing, template generation, fair duty auto-assignment and the
// rules-engine warnings panel underneath.

import { esc } from '../../shared/esc.js';
import { weekDates, dayKey, fmtDay, addDays, mondayOf, todayISO } from '../../shared/time.js';
import { SESSION_TYPES, typeById } from '../../shared/model.js';
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
      <div class="printhead">Rota — ${esc(fmtDay(dates[0]))} to ${esc(fmtDay(dates[6]))}</div>
      <div class="toolbar">
        <button id="prev">‹</button>
        <button id="todaybtn">This week</button>
        <button id="next">›</button>
        <input type="date" id="jump" value="${esc(state.weekMonday)}" title="Jump to week">
        <span class="weeklabel">${esc(fmtDay(dates[0]))} – ${esc(fmtDay(dates[6]))}</span>
        <span class="spacer"></span>
        <button id="copyweek" title="Copy last week's sessions into empty cells this week">Copy previous week</button>
        <select id="genweeks">
          ${[1, 2, 4, 6, 8, 12].map((n) => `<option value="${n}">${n} week${n > 1 ? 's' : ''}</option>`).join('')}
        </select>
        <button id="generate">Generate from templates</button>
        <button id="autoduty" class="primary">Auto-assign duty</button>
        <button id="printbtn" title="Print this week">Print</button>
      </div>
      <div class="rotawrap">
        <table class="rota">
          <thead>
            <tr>
              <th rowspan="2">Staff</th>
              ${showDates.map((d) => `<th colspan="2" class="day${d === today ? ' today' : ''}">${esc(fmtDay(d))}</th>`).join('')}
              <th rowspan="2" title="Sessions rostered this week / contracted per week">Σ</th>
            </tr>
            <tr>${showDates.map((d) => `<th class="${d === today ? 'today' : ''}">AM</th><th class="${d === today ? 'today' : ''}">PM</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${people.map((p) => {
              const rostered = state.entries.filter(
                (e) => e.staffId === p.id && dates.includes(e.date) &&
                  (e.status === 'planned' || e.status === 'confirmed' || e.status === 'covered')
              ).length;
              const over = p.contractedSessions > 0 && rostered > p.contractedSessions;
              return `
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
                    return `<td class="cell${d === today ? ' today' : ''}"${entry ? ' draggable="true"' : ''} data-staff="${esc(p.id)}" data-date="${esc(d)}" data-period="${period}">${inner}</td>`;
                  }).join('');
                }).join('')}
                <td class="right" title="${rostered} rostered / ${esc(String(p.contractedSessions))} contracted" style="${over ? 'color:var(--med);font-weight:700' : rostered < p.contractedSessions ? 'color:var(--muted)' : ''}">${rostered}/${esc(String(p.contractedSessions))}</td>
              </tr>
            `;
            }).join('')}
            ${people.length ? '' : `<tr><td colspan="99" class="muted">No staff yet — add your team under Staff, or load the demo dataset from Settings.</td></tr>`}
          </tbody>
          ${people.length ? `
          <tfoot>
            <tr>
              <th>Clinical on site</th>
              ${showDates.map((d) => ['am', 'pm'].map((period) => {
                const present = state.entries.filter((e) => {
                  if (e.date !== d || e.period !== period) return false;
                  if (e.status !== 'planned' && e.status !== 'confirmed' && e.status !== 'covered') return false;
                  const t = typeById(e.typeId);
                  if (!t || !t.clinical) return false;
                  const person = state.staff.find((x) => x.id === e.staffId);
                  return person && !approvedLeaveFor(state.leave, person.id, d);
                });
                const duty = present.some((e) => {
                  const person = state.staff.find((x) => x.id === e.staffId);
                  return e.typeId === 'duty' && person && person.dutyEligible;
                });
                const open = s.openDays.includes(dayKey(d));
                if (!open) return '<th class="muted">—</th>';
                return `<th title="${present.length} clinical staff, duty ${duty ? 'covered' : 'NOT covered'}" style="color:${duty ? 'var(--ok)' : 'var(--high)'}">${present.length} ${duty ? '✓' : '✗'}</th>`;
              }).join('')).join('')}
              <th></th>
            </tr>
          </tfoot>` : ''}
        </table>
      </div>
      <div class="sub" style="margin:6px 0 14px">Click a cell to edit · drag a session to move it · drop on an occupied cell to swap · hold Ctrl (or Alt) while dropping to copy.</div>
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
    root.querySelector('#jump').onchange = (e) => {
      if (e.target.value) { state.weekMonday = mondayOf(e.target.value); ctx.rerender(); }
    };
    root.querySelector('#printbtn').onclick = () => window.print();

    root.querySelector('#copyweek').onclick = async () => {
      const prevDates = weekDates(addDays(state.weekMonday, -7));
      let copied = 0;
      let skipped = 0;
      const source = state.entries.filter(
        (e) => prevDates.includes(e.date) && (e.status === 'planned' || e.status === 'confirmed' || e.status === 'covered')
      );
      for (const e of source) {
        const date = addDays(e.date, 7);
        const occupied = state.entries.some((t) => t.staffId === e.staffId && t.date === date && t.period === e.period);
        if (occupied || approvedLeaveFor(state.leave, e.staffId, date)) { skipped += 1; continue; }
        state.entries.push({
          id: uid(), staffId: e.staffId, date, period: e.period, typeId: e.typeId,
          status: 'planned', source: 'manual', note: '', roomId: e.roomId || null
        });
        copied += 1;
      }
      if (copied) await ctx.persist('entries');
      ctx.toast(`Copied ${copied} session(s) from last week${skipped ? `; ${skipped} skipped (occupied or on leave)` : ''}`);
      ctx.rerender();
    };

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

      // Drag & drop: move a session; drop on an occupied cell to swap;
      // Ctrl/Alt-drop copies the session type into an empty cell.
      cell.addEventListener('dragstart', (ev) => {
        const entry = state.entries.find(
          (e) => e.staffId === cell.dataset.staff && e.date === cell.dataset.date && e.period === cell.dataset.period
        );
        if (!entry) { ev.preventDefault(); return; }
        closeMenu();
        ev.dataTransfer.setData('text/plain', entry.id);
        ev.dataTransfer.effectAllowed = 'copyMove';
      });
      cell.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        cell.classList.add('dragover');
      });
      cell.addEventListener('dragleave', () => cell.classList.remove('dragover'));
      cell.addEventListener('drop', async (ev) => {
        ev.preventDefault();
        cell.classList.remove('dragover');
        const src = state.entries.find((e) => e.id === ev.dataTransfer.getData('text/plain'));
        if (!src) return;
        const { staff: staffId, date, period } = cell.dataset;
        if (src.staffId === staffId && src.date === date && src.period === period) return;
        const person = state.staff.find((p) => p.id === staffId);
        if (!person) return;
        if (approvedLeaveFor(state.leave, staffId, date)) {
          ctx.toast(`${person.name} is on approved leave that day`);
          return;
        }
        const target = state.entries.find((e) => e.staffId === staffId && e.date === date && e.period === period);
        if (ev.ctrlKey || ev.altKey || ev.metaKey) {
          if (target) { ctx.toast('Cannot copy onto an occupied session'); return; }
          state.entries.push({
            id: uid(), staffId, date, period, typeId: src.typeId,
            status: 'planned', source: 'manual', note: '', roomId: null
          });
        } else if (target) {
          const pos = { staffId: src.staffId, date: src.date, period: src.period };
          Object.assign(src, { staffId, date, period });
          Object.assign(target, pos);
        } else {
          Object.assign(src, { staffId, date, period });
        }
        await ctx.persist('entries');
        ctx.rerender();
      });
    });
  }
};
