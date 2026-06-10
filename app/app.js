// App shell: hash router + shared state. Views render into #main and
// persist through ctx.persist; everything re-renders from state.

import { loadAll, save } from '../shared/store.js';
import { mondayOf, todayISO } from '../shared/time.js';
import dashboard from './views/dashboard.js';
import rota from './views/rota.js';
import staff from './views/staff.js';
import templates from './views/templates.js';
import leave from './views/leave.js';
import sync from './views/sync.js';
import settings from './views/settings.js';

const VIEWS = { dashboard, rota, staff, templates, leave, sync, settings };

const state = {
  staff: [],
  entries: [],
  leave: [],
  settings: {},
  weekMonday: mondayOf(todayISO()),
  ui: {} // per-view scratch (selected staff member, last sync results, …)
};

let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
}

async function persist(...parts) {
  for (const p of parts) await save(p, state[p]);
}

function currentRoute() {
  const r = (location.hash || '#dashboard').slice(1);
  return VIEWS[r] ? r : 'dashboard';
}

function render() {
  const route = currentRoute();
  document.querySelectorAll('#nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === route);
  });
  const main = document.getElementById('main');
  main.innerHTML = '';
  VIEWS[route].render(main, ctx);
}

const ctx = {
  state,
  persist,
  rerender: render,
  toast,
  async reload() {
    Object.assign(state, await loadAll());
    render();
  }
};

window.addEventListener('hashchange', render);

(async function init() {
  Object.assign(state, await loadAll());
  render();
})();
