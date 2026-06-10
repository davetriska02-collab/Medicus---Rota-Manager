// Settings: practice configuration, safe-staffing policy knobs,
// backup/restore and demo data.

import { esc } from '../../shared/esc.js';
import { DAY_KEYS, DEFAULT_SETTINGS } from '../../shared/model.js';
import { isValidPracticeCode } from '../../shared/medicus-api.js';
import { exportEnvelope, importEnvelope, wipe, save, uid } from '../../shared/store.js';
import { demoData } from '../../shared/demo.js';
import { download } from './ui.js';

export default {
  render(root, ctx) {
    const { state } = ctx;
    const s = state.settings;

    root.innerHTML = `
      <h1>Settings</h1>
      <div class="card">
        <h2 class="mt0">Practice</h2>
        <div class="formgrid">
          <label class="field">Medicus practice code
            <input id="s-code" value="${esc(s.practiceCode)}" placeholder="e.g. a3f2b1 (4–8 hex chars)">
          </label>
          <label class="field">List size (patients)
            <input id="s-list" type="number" min="0" value="${esc(String(s.listSize))}">
          </label>
          <label class="field">Template anchor Monday
            <input id="s-anchor" type="date" value="${esc(s.templateAnchorMonday || '')}">
          </label>
        </div>
        <div style="margin-top:6px">
          <strong>Open days:</strong>
          ${DAY_KEYS.map((d) => `<label class="check"><input type="checkbox" class="s-day" value="${d}" ${s.openDays.includes(d) ? 'checked' : ''}>${d.toUpperCase()}</label>`).join('')}
        </div>
      </div>

      <div class="card">
        <h2 class="mt0">Safe-staffing policy <span class="sub" style="font-weight:400">(guidance defaults — configure to local policy)</span></h2>
        <div class="formgrid">
          <label class="field">Duty doctors required — AM<input id="s-dutyam" type="number" min="0" max="5" value="${esc(String(s.dutyRequired.am))}"></label>
          <label class="field">Duty doctors required — PM<input id="s-dutypm" type="number" min="0" max="5" value="${esc(String(s.dutyRequired.pm))}"></label>
          <label class="field">Appointments per clinical session<input id="s-appts" type="number" min="1" value="${esc(String(s.apptsPerSurgerySession))}"></label>
          <label class="field">Access benchmark (appts / 1,000 patients / week)<input id="s-bench" type="number" min="0" value="${esc(String(s.accessBenchmarkPer1000))}"></label>
          <label class="field">Max simultaneous leave — GPs<input id="s-maxgp" type="number" min="0" value="${esc(String(s.maxSimultaneousLeave.gp))}"></label>
          <label class="field">Max simultaneous leave — nursing<input id="s-maxnur" type="number" min="0" value="${esc(String(s.maxSimultaneousLeave.nursing))}"></label>
          <label class="field">Max simultaneous leave — ARRS<input id="s-maxarrs" type="number" min="0" value="${esc(String(s.maxSimultaneousLeave.arrs))}"></label>
          <label class="field">Max simultaneous leave — non-clinical<input id="s-maxnon" type="number" min="0" value="${esc(String(s.maxSimultaneousLeave.nonclinical))}"></label>
          <label class="field">Bradford Factor — monitor at<input id="s-bfmon" type="number" min="0" value="${esc(String(s.bradfordThresholds.monitor))}"></label>
          <label class="field">Bradford Factor — high at<input id="s-bfhigh" type="number" min="0" value="${esc(String(s.bradfordThresholds.high))}"></label>
          <label class="field">Bradford Factor — severe at<input id="s-bfsev" type="number" min="0" value="${esc(String(s.bradfordThresholds.severe))}"></label>
        </div>
        <button id="s-save" class="primary" style="margin-top:8px">Save settings</button>
      </div>

      <div class="card">
        <h2 class="mt0">Rooms</h2>
        ${(state.rooms || []).map((r) => `
          <div class="toolbar" style="margin-bottom:4px">
            <span>${esc(r.name)}</span><span class="spacer"></span>
            <button class="small danger" data-delroom="${esc(r.id)}">Remove</button>
          </div>`).join('') || '<div class="sub" style="margin-bottom:8px">No rooms yet — add consulting/treatment rooms to assign them on the rota and catch double-bookings.</div>'}
        <div class="toolbar">
          <input id="s-newroom" placeholder="e.g. Room 3 / Treatment 1" style="width:220px">
          <button id="s-addroom">Add room</button>
        </div>
      </div>

      <div class="card">
        <h2 class="mt0">Data</h2>
        <div class="toolbar">
          <button id="s-export">Export backup</button>
          <button id="s-import">Import backup</button>
          <input id="s-file" type="file" accept="application/json" hidden>
          <span class="spacer"></span>
          <button id="s-demo">Load demo dataset</button>
          <button id="s-wipe" class="danger">Wipe all data</button>
        </div>
        <p class="sub">Backups contain staff, rota entries, leave and settings — no patient data is ever stored by this product.</p>
      </div>
    `;

    root.querySelector('#s-save').onclick = async () => {
      const code = root.querySelector('#s-code').value.trim().toLowerCase();
      if (code && !isValidPracticeCode(code)) { ctx.toast('Practice code must be 4–8 hex characters'); return; }
      s.practiceCode = code;
      s.listSize = Number(root.querySelector('#s-list').value) || 0;
      s.templateAnchorMonday = root.querySelector('#s-anchor').value || null;
      s.openDays = [...root.querySelectorAll('.s-day:checked')].map((c) => c.value);
      s.dutyRequired = {
        am: Number(root.querySelector('#s-dutyam').value) || 0,
        pm: Number(root.querySelector('#s-dutypm').value) || 0
      };
      s.apptsPerSurgerySession = Number(root.querySelector('#s-appts').value) || DEFAULT_SETTINGS.apptsPerSurgerySession;
      s.accessBenchmarkPer1000 = Number(root.querySelector('#s-bench').value) || 0;
      s.maxSimultaneousLeave = {
        gp: Number(root.querySelector('#s-maxgp').value) || 0,
        nursing: Number(root.querySelector('#s-maxnur').value) || 0,
        arrs: Number(root.querySelector('#s-maxarrs').value) || 0,
        nonclinical: Number(root.querySelector('#s-maxnon').value) || 0
      };
      s.bradfordThresholds = {
        monitor: Number(root.querySelector('#s-bfmon').value) || 0,
        high: Number(root.querySelector('#s-bfhigh').value) || 0,
        severe: Number(root.querySelector('#s-bfsev').value) || 0
      };
      await ctx.persist('settings');
      ctx.toast('Settings saved');
      ctx.rerender();
    };

    root.querySelector('#s-addroom').onclick = async () => {
      const name = root.querySelector('#s-newroom').value.trim();
      if (!name) return;
      state.rooms = [...(state.rooms || []), { id: uid(), name }];
      await ctx.persist('rooms');
      ctx.rerender();
    };
    root.querySelectorAll('[data-delroom]').forEach((btn) => {
      btn.onclick = async () => {
        state.rooms = state.rooms.filter((r) => r.id !== btn.dataset.delroom);
        state.entries = state.entries.map((e) => (e.roomId === btn.dataset.delroom ? { ...e, roomId: null } : e));
        await ctx.persist('rooms', 'entries');
        ctx.rerender();
      };
    });

    root.querySelector('#s-export').onclick = async () => {
      const env = await exportEnvelope();
      download(`rota-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(env, null, 2));
    };

    root.querySelector('#s-import').onclick = () => root.querySelector('#s-file').click();
    root.querySelector('#s-file').onchange = async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      try {
        await importEnvelope(JSON.parse(await file.text()));
        await ctx.reload();
        ctx.toast('Backup imported');
      } catch (err) {
        ctx.toast(err instanceof Error ? err.message : 'Import failed');
      }
    };

    root.querySelector('#s-demo').onclick = async () => {
      if (state.staff.length && !confirm('Replace current data with the demo dataset?')) return;
      const demo = demoData();
      await save('staff', demo.staff);
      await save('entries', demo.entries);
      await save('leave', demo.leave);
      await save('rooms', demo.rooms);
      await save('settings', demo.settings);
      await ctx.reload();
      ctx.toast('Demo practice loaded — try “Generate from templates” on the Rota page');
    };

    root.querySelector('#s-wipe').onclick = async () => {
      if (!confirm('Delete ALL rota manager data? This cannot be undone.')) return;
      await wipe();
      await ctx.reload();
      ctx.toast('All data wiped');
    };
  }
};
