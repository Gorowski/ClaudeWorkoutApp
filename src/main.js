/* Bootstrap: render loop and event wiring.

   Rendering is deliberately dumb — build a string, set innerHTML, done. With
   a screen this size that is fast enough to be imperceptible, and it means
   there is no framework between you and the markup. The one thing it costs is
   focus: re-rendering while you are typing in a set box would throw you out of
   the field, so set entry updates state without a re-render. */

import * as store from './store.js';
import { state, onChange } from './store.js';
import { todayKey, shiftKey, shiftMonth, monthOf } from './dates.js';
import { esc, num } from './util.js';
import { commit, sessionFor, ensureExState, recordSet } from './session.js';
import { viewSession } from './views/session.js';
import { viewCalendar } from './views/calendar.js';
import { viewProgram } from './views/program.js';
import { viewReference } from './views/reference.js';

const app = document.getElementById('app');
const UI_KEY = 'nucs.ui.v3';

const ui = { tab: 'session', date: todayKey(), cal: monthOf(todayKey()), scroll: 0 };
try {
  const saved = JSON.parse(sessionStorage.getItem(UI_KEY) || 'null');
  if (saved) Object.assign(ui, saved);
} catch { /* a corrupt UI hint is not worth failing over */ }

const saveUi = () => {
  try { sessionStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch { /* private mode */ }
};

/* ---------- chrome ---------- */

function statusChip() {
  const el = document.getElementById('saveChip');
  if (!el) return;
  let cls = 'clean', txt = 'Saved';
  if (store.status.error) { cls = 'err'; txt = store.status.error; }
  else if (store.status.pending) { cls = 'busy'; txt = 'Saving'; }
  el.innerHTML = `<span class="chip ${cls}">${esc(txt)}</span>`;
}

const TABS = [['session', 'Session'], ['calendar', 'Calendar'], ['program', 'Program'], ['reference', 'Reference']];

function render() {
  const logged = Object.values(state.sessions)
    .filter((e) => (e.ex || []).some((x) => (x.sets || []).some((s) => s.r != null))).length;

  app.innerHTML = `
    <header class="masthead"><div><p class="sub lbl">Gold Coast Unit &middot; Nights</p>
      <h1>Night Unit Call Sheet</h1></div><div id="saveChip"></div></header>
    <nav class="nav">${TABS.map(([id, label]) =>
      `<button data-act="tab" data-v="${id}" aria-selected="${ui.tab === id}">${label}</button>`).join('')}</nav>
    ${ui.tab === 'session' ? viewSession(ui)
      : ui.tab === 'calendar' ? viewCalendar(ui)
      : ui.tab === 'program' ? viewProgram()
      : viewReference()}
    <footer><span>Rev. C &middot; ${logged} session${logged === 1 ? '' : 's'} logged</span>
      <span>Loads carry forward automatically</span></footer>`;
  statusChip();
  saveUi();
}

/* ---------- resolving a click back to a template ---------- */

function templateFor(el) {
  const card = el.closest('.ex');
  if (!card) return null;
  const sess = commit(ui.date);
  const r = state.routines[sess.routine];
  if (!r) return null;
  const tpl = r.ex.find((x) => x.id === card.getAttribute('data-ex'));
  return tpl ? { sess, tpl } : null;
}

/* ---------- export / import ---------- */

function exportLog() {
  const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `night-unit-log-${todayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importLog() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const n = await store.importAll(JSON.parse(await file.text()));
      render();
      alert(`Imported ${n} session${n === 1 ? '' : 's'}.`);
    } catch (err) {
      alert(`Could not import that file.\n\n${err.message}`);
    }
  };
  input.click();
}

/* ---------- interaction ---------- */

app.addEventListener('click', (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  const act = b.getAttribute('data-act');
  const v = b.getAttribute('data-v');

  switch (act) {
    case 'tab':
      ui.tab = v; render(); window.scrollTo(0, 0); return;
    case 'day':
      ui.date = shiftKey(ui.date, Number(v)); ui.cal = monthOf(ui.date); render(); return;
    case 'today':
      ui.date = todayKey(); ui.cal = monthOf(ui.date); render(); return;
    case 'mon':
      ui.cal = shiftMonth(ui.cal, Number(v)); render(); return;
    case 'pick':
      ui.date = v; ui.cal = monthOf(v); ui.tab = 'session'; render(); window.scrollTo(0, 0); return;
    case 'export':
      exportLog(); return;
    case 'import':
      importLog(); return;

    case 'setr': {
      // Keep any sets already logged — ids are scoped per routine, so
      // switching days does not silently discard what you lifted.
      commit(ui.date).routine = v;
      store.touchSession(ui.date);
      render();
      return;
    }

    case 'addset':
    case 'delset': {
      const found = templateFor(b);
      if (!found) return;
      const st = ensureExState(found.sess, found.tpl);
      if (act === 'addset') st.sets.push({ r: null, w: null });
      else if (st.sets.length > 1) st.sets.pop();
      store.touchSession(ui.date);
      render();
      return;
    }

    case 'mv':
    case 'rmex':
    case 'addex': {
      const details = b.closest('.rt');
      if (!details) return;
      const r = state.routines[details.getAttribute('data-rt')];
      if (act === 'addex') {
        r.ex.push({ id: 'x' + Math.random().toString(36).slice(2, 8), name: 'New exercise', sets: 2, lo: 8, hi: 12, load: 0, cue: '' });
      } else {
        const i = Number(b.closest('.pe').getAttribute('data-ei'));
        if (act === 'rmex') r.ex.splice(i, 1);
        else {
          const j = i + Number(v);
          if (j >= 0 && j < r.ex.length) [r.ex[i], r.ex[j]] = [r.ex[j], r.ex[i]];
        }
      }
      store.touchProgram();
      const open = [...app.querySelectorAll('.rt[open]')].map((d) => d.getAttribute('data-rt'));
      render();
      open.forEach((id) => {
        const d = app.querySelector(`.rt[data-rt="${id}"]`);
        if (d) d.open = true;
      });
      return;
    }
    default:
  }
});

app.addEventListener('input', (ev) => {
  const el = ev.target;

  // Set entry: update state in place and repaint only this box. Re-rendering
  // here would move focus out of the field mid-keystroke.
  if (el.matches('.setbox input')) {
    const found = templateFor(el);
    if (!found) return;
    const st = recordSet(ui.date, found.tpl, Number(el.getAttribute('data-i')),
      el.getAttribute('data-f'), num(el.value));
    const i = Number(el.getAttribute('data-i'));
    el.closest('.setbox').classList.toggle('filled', st.sets[i].r != null);
    return;
  }

  if (el.matches('textarea[data-act="notes"]')) {
    commit(ui.date).notes = el.value;
    store.touchSession(ui.date);
    return;
  }

  if (el.matches('.pe input')) {
    const r = state.routines[el.closest('.rt').getAttribute('data-rt')];
    const x = r.ex[Number(el.closest('.pe').getAttribute('data-ei'))];
    const p = el.getAttribute('data-p');
    if (p === 'name' || p === 'cue') x[p] = el.value;
    else {
      const n = num(el.value);
      if (n != null) x[p] = p === 'load' ? n : Math.max(1, Math.round(n));
    }
    store.touchProgram();
  }
});

app.addEventListener('change', (ev) => {
  if (ev.target.matches('select[data-act="sched"]')) {
    state.schedule[ev.target.getAttribute('data-v')] = ev.target.value;
    store.touchProgram();
  }
});

// Never lose a set to a backgrounded tab or a killed browser.
document.addEventListener('visibilitychange', () => { if (document.hidden) store.flush(); });
window.addEventListener('pagehide', () => { store.flush(); saveUi(); });

onChange(statusChip);

/* ---------- boot ---------- */

function fatal(title, message, err) {
  console.error(err);
  app.innerHTML = `<div class="empty"><h2>${title}</h2><p>${message}</p></div>`;
}

// Keep these two failures apart. Folding them into one catch would report a
// rendering bug as a storage problem and send you looking in the wrong place.
store.init().then(
  () => {
    try {
      render();
      if (ui.scroll) setTimeout(() => window.scrollTo(0, ui.scroll), 30);
    } catch (err) {
      fatal('Broke on render', 'The log loaded but the page could not be drawn. Details are in the console.', err);
    }
  },
  (err) => fatal('No storage', 'This browser would not open a database, so there is nowhere to keep your log. Private browsing usually causes this.', err)
);

window.addEventListener('scroll', () => { ui.scroll = window.scrollY; }, { passive: true });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline is a bonus, not a requirement */ });
  });
}

// Exposed for debugging from the console.
window.nucs = { state, store, ui, render };
