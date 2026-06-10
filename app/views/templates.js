// Working-pattern templates: each staff member's repeating 1/2/4-week
// pattern. The rota view rolls these forward into real entries.

import { esc } from '../../shared/esc.js';
import { SESSION_TYPES, DAY_KEYS, blankPattern } from '../../shared/model.js';
import { staffSorted } from './ui.js';

const DAY_LABELS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

export default {
  render(root, ctx) {
    const { state } = ctx;
    const people = staffSorted(state.staff);
    if (!state.ui.tplStaff && people.length) state.ui.tplStaff = people[0].id;
    const person = state.staff.find((s) => s.id === state.ui.tplStaff);

    root.innerHTML = `
      <h1>Templates</h1>
      <p class="sub">Repeating week patterns per staff member. “Generate from templates” on the Rota page rolls them forward,
      skipping anything already rostered and punching out approved leave. Pattern weeks count from the anchor Monday
      (${esc(state.settings.templateAnchorMonday || 'set on first generation')}).</p>
      <div class="toolbar">
        <select id="who">
          ${people.map((p) => `<option value="${esc(p.id)}" ${person && p.id === person.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
        ${person ? `
          <select id="weeks">
            ${[1, 2, 4].map((n) => `<option value="${n}" ${(person.pattern || []).length === n ? 'selected' : ''}>${n}-week pattern</option>`).join('')}
          </select>
          <button id="save" class="primary">Save pattern</button>
        ` : ''}
      </div>
      ${person ? pattern(person) : '<div class="muted card">Add staff first.</div>'}
    `;

    root.querySelector('#who')?.addEventListener('change', (e) => {
      state.ui.tplStaff = e.target.value;
      ctx.rerender();
    });

    if (!person) return;

    root.querySelector('#weeks').addEventListener('change', (e) => {
      const n = Number(e.target.value);
      const next = blankPattern(n);
      (person.pattern || []).slice(0, n).forEach((week, i) => { next[i] = week; });
      person.pattern = next;
      ctx.rerender();
    });

    root.querySelector('#save').onclick = async () => {
      root.querySelectorAll('select.cellpick').forEach((sel) => {
        const { week, day, period } = sel.dataset;
        person.pattern[Number(week)][day][period] = sel.value || null;
      });
      await ctx.persist('staff');
      ctx.toast(`Pattern saved for ${person.name}`);
      ctx.rerender();
    };
  }
};

function pattern(person) {
  const weeks = person.pattern || [];
  return weeks.map((week, wi) => `
    <div class="card">
      <h2 class="mt0">${weeks.length > 1 ? `Week ${wi + 1}` : 'Every week'}</h2>
      <table>
        <thead><tr><th></th>${DAY_KEYS.map((d) => `<th>${DAY_LABELS[d]}</th>`).join('')}</tr></thead>
        <tbody>
          ${['am', 'pm'].map((period) => `
            <tr>
              <th>${period.toUpperCase()}</th>
              ${DAY_KEYS.map((day) => `
                <td>
                  <select class="cellpick" data-week="${wi}" data-day="${day}" data-period="${period}">
                    <option value="">—</option>
                    ${SESSION_TYPES.map((t) => `<option value="${t.id}" ${week[day] && week[day][period] === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
                  </select>
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');
}
