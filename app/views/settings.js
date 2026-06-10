// Settings: practice configuration, safe-staffing policy knobs,
// backup/restore and demo data.

import { esc } from '../../shared/esc.js';
import { DAY_KEYS, DEFAULT_SETTINGS } from '../../shared/model.js';
import { isValidPracticeCode } from '../../shared/medicus-api.js';
import { exportEnvelope, importEnvelope, wipe, save, uid } from '../../shared/store.js';
import { demoData } from '../../shared/demo.js';
import { mondayOf, todayISO, addDays } from '../../shared/time.js';
import { buildEvidenceReport } from '../../engine/evidence.js';
import { download } from './ui.js';

export default {
  render(root, ctx) {
    const { state } = ctx;
    const s = state.settings;

    const syncStatus = state.ui.syncStatus || 'off';
    root.innerHTML = `
      <h1>Settings</h1>
      <div class="card">
        <h2 class="mt0">You &amp; practice sync</h2>
        <div class="formgrid">
          <label class="field">Your name (audit trail)
            <input id="s-username" value="${esc(s.userName || '')}" placeholder="e.g. Jo Bloggs (PM)">
          </label>
          <label class="field">Your role on this machine
            <select id="s-userrole">
              <option value="manager" ${s.userRole !== 'staff' ? 'selected' : ''}>Manager (full access)</option>
              <option value="staff" ${s.userRole === 'staff' ? 'selected' : ''}>Staff (My week focused)</option>
            </select>
          </label>
        </div>
        <div class="toolbar" style="margin-top:6px">
          ${syncStatus === 'unsupported'
            ? '<span class="sub">Shared-folder sync is not supported by this browser.</span>'
            : syncStatus === 'connected'
              ? `<span class="pill approved">sync connected</span><span class="sub">v${ctx.sync.status().version} — changes share via the folder, polled every 15s</span>
                 <span class="spacer"></span><button id="s-syncoff" class="danger">Disconnect</button>`
              : syncStatus === 'needs-permission'
                ? `<span class="pill requested">reconnect needed</span>
                   <button id="s-syncperm" class="primary">Re-allow folder access</button>`
                : `<button id="s-syncon" class="primary">Connect shared folder…</button>
                   <span class="sub">Pick a folder on the practice's shared drive — every machine pointed at the same folder shares one live rota. Data never leaves the practice.</span>`}
        </div>
      </div>

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
        <div class="formgrid" style="margin-top:10px">
          <label class="field">Sites (one per line — leave empty for single-site)
            <textarea id="s-sites" rows="3" style="display:block;margin-top:4px;min-width:220px">${esc((s.sites || []).join('\n'))}</textarea>
          </label>
          <label class="field">Bank holidays (YYYY-MM-DD, one per line)
            <textarea id="s-bh" rows="3" style="display:block;margin-top:4px;min-width:220px">${esc((s.bankHolidays || []).join('\n'))}</textarea>
          </label>
          <label class="field">Peak leave periods (name,start,end,maxSessions per line)
            <textarea id="s-peaks" rows="3" style="display:block;margin-top:4px;min-width:220px" placeholder="Summer,2026-07-20,2026-09-01,12">${esc((s.peakPeriods || []).map((p) => `${p.name},${p.start},${p.end},${p.maxSessions}`).join('\n'))}</textarea>
          </label>
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
        <h2 class="mt0">Reports</h2>
        <div class="toolbar">
          <select id="s-evweeks">${[4, 8, 12, 26].map((n) => `<option value="${n}" ${n === 12 ? 'selected' : ''}>Last ${n} weeks</option>`).join('')}</select>
          <button id="s-evidence" class="primary">Generate CQC evidence pack</button>
          <span class="sub">Safe-staffing rules in force + the weekly compliance record — opens printable, save as PDF.</span>
        </div>
      </div>

      ${(state.audit || []).length ? `
      <div class="card">
        <h2 class="mt0">Audit log <span class="sub" style="font-weight:400">(last ${Math.min(state.audit.length, 25)} of ${state.audit.length})</span></h2>
        <table>
          <thead><tr><th>When</th><th>Who</th><th>Action</th></tr></thead>
          <tbody>${state.audit.slice(-25).reverse().map((a) => `
            <tr><td class="sub">${esc(new Date(a.at).toLocaleString('en-GB'))}</td><td>${esc(a.by || '—')}</td><td>${esc(a.summary)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

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
      s.userName = root.querySelector('#s-username').value.trim();
      s.userRole = root.querySelector('#s-userrole').value;
      s.sites = root.querySelector('#s-sites').value.split('\n').map((x) => x.trim()).filter(Boolean);
      s.bankHolidays = root.querySelector('#s-bh').value.split('\n').map((x) => x.trim()).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
      s.peakPeriods = root.querySelector('#s-peaks').value.split('\n').map((line) => {
        const [name, start, end, max] = line.split(',').map((x) => x.trim());
        if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(end || '')) return null;
        return { name, start, end, maxSessions: Number(max) || 0 };
      }).filter(Boolean);
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

    const syncOn = root.querySelector('#s-syncon');
    if (syncOn) syncOn.onclick = async () => {
      try {
        await ctx.sync.connect();
        await ctx.syncConnected();
        ctx.toast('Shared folder connected — this machine now syncs');
      } catch (err) {
        if (err && err.name !== 'AbortError') ctx.toast(`Could not connect: ${err.message || err}`);
      }
    };
    const syncPerm = root.querySelector('#s-syncperm');
    if (syncPerm) syncPerm.onclick = async () => {
      if (await ctx.sync.requestPermission()) {
        await ctx.syncConnected();
        ctx.toast('Folder access restored');
      } else ctx.toast('Permission was not granted');
    };
    const syncOff = root.querySelector('#s-syncoff');
    if (syncOff) syncOff.onclick = async () => {
      await ctx.sync.disconnect();
      state.ui.syncStatus = 'off';
      state.ui.syncReady = false;
      ctx.toast('Sync disconnected — this machine is standalone again');
      ctx.rerender();
    };

    root.querySelector('#s-evidence').onclick = async () => {
      const weeks = Number(root.querySelector('#s-evweeks').value);
      const startMonday = addDays(mondayOf(todayISO()), -7 * (weeks - 1));
      const html = buildEvidenceReport({
        startMonday, weeks,
        staff: state.staff, entries: state.entries, leave: state.leave,
        rooms: state.rooms || [], settings: s, audit: state.audit || [],
        generatedBy: s.userName
      });
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      window.open(url, '_blank');
      await ctx.log(`Generated CQC evidence pack (${weeks} weeks)`);
      ctx.toast('Evidence pack opened — use the browser print dialog to save as PDF');
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
      await save('swaps', []);
      await save('audit', []);
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
