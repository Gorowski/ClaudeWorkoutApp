/* The Calendar tab — month grid plus a reverse-chronological list of
   everything logged. Both are just different reads of the same sessions. */

import { state } from '../store.js';
import { MON, monthGrid, todayKey, shortDate } from '../dates.js';
import { esc, hasWork, sessionTotals } from '../util.js';

function grid(ui) {
  const { y, m, startDow, days } = monthGrid(ui.cal);
  const tk = todayKey();

  let h = `<div class="cal-head">
    <button class="arrow" data-act="mon" data-v="-1" aria-label="Previous month">&lsaquo;</button>
    <h3>${MON[m]} ${y}</h3>
    <button class="arrow" data-act="mon" data-v="1" aria-label="Next month">&rsaquo;</button></div><div class="grid">`;

  h += ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<div class="dow">${d}</div>`).join('');
  h += '<div class="cell blank"></div>'.repeat(startDow);

  for (let d = 1; d <= days; d++) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const e = state.sessions[k];
    const routineKey = e ? e.routine : (state.schedule[String(new Date(y, m, d).getDay())] || '');
    const name = routineKey && state.routines[routineKey] ? state.routines[routineKey].name : '';
    const cls = ['cell',
      hasWork(e) ? 'logged' : '',
      k === tk ? 'today' : '',
      k === ui.date ? 'sel' : '',
      k > tk ? 'future' : ''].filter(Boolean).join(' ');
    h += `<button class="${cls}" data-act="pick" data-v="${k}">
      <span class="dn">${d}</span><span class="tag">${esc(name.replace(/ /g, ''))}</span></button>`;
  }
  return h + '</div>';
}

function recent() {
  const keys = Object.keys(state.sessions).sort().reverse()
    .filter((k) => hasWork(state.sessions[k]) || state.sessions[k]?.notes);

  let h = '<div class="recent"><span class="lbl">Logged sessions</span>';
  if (!keys.length) {
    return h + `<div class="empty" style="margin-top:8px">Nothing logged yet. Open a day,
      type your reps and weights, and it lands here.</div></div>`;
  }
  h += keys.slice(0, 40).map((k) => {
    const e = state.sessions[k];
    const r = state.routines[e.routine];
    const { sets, volume } = sessionTotals(e);
    return `<button class="rrow" data-act="pick" data-v="${k}">
      <span class="rd">${esc(shortDate(k))}</span>
      <span class="rn">${esc(r ? r.name : 'Rest')}</span>
      <span class="rv">${sets} sets &middot; ${Math.round(volume)} kg</span></button>`;
  }).join('');
  return h + '</div>';
}

export const viewCalendar = (ui) => grid(ui) + recent();
