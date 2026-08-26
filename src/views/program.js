/* The Program tab — editing the plan itself, so changing your routine never
   means editing JSON by hand. */

import { state } from '../store.js';
import { DOW } from '../dates.js';
import { esc, fmt } from '../util.js';

function exerciseRow(x, i, last) {
  return `<div class="pe" data-ei="${i}">
    <input type="text" value="${esc(x.name)}" data-p="name" aria-label="Exercise name">
    <span class="btns">
      <button class="mini" data-act="mv" data-v="-1"${i === 0 ? ' disabled' : ''} aria-label="Move up">&uarr;</button>
      <button class="mini" data-act="mv" data-v="1"${last ? ' disabled' : ''} aria-label="Move down">&darr;</button>
      <button class="mini danger" data-act="rmex" aria-label="Remove">&#10005;</button>
    </span>
    <span class="nums">
      <label><span>Sets</span><input type="number" min="1" max="10" step="1" value="${x.sets}" data-p="sets"></label>
      <label><span>Reps</span><input type="number" min="1" step="1" value="${x.lo}" data-p="lo"></label>
      <label><span>to</span><input type="number" min="1" step="1" value="${x.hi}" data-p="hi"></label>
      <label><span>kg</span><input type="number" min="0" step="0.25" value="${fmt(x.load)}" data-p="load"></label>
    </span>
    <span class="cin"><input type="text" value="${esc(x.cue || '')}" data-p="cue"
      placeholder="Cue or note" aria-label="Cue"></span></div>`;
}

function defaultWeek() {
  const rows = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const opts = ['<option value=""' + (!state.schedule[String(d)] ? ' selected' : '') + '>Rest</option>']
      .concat(state.order.map((id) =>
        `<option value="${id}"${state.schedule[String(d)] === id ? ' selected' : ''}>${esc(state.routines[id].name)}</option>`));
    return `<span class="lbl" style="padding-top:7px">${DOW[d].slice(0, 3)}</span>
      <select data-act="sched" data-v="${d}">${opts.join('')}</select>`;
  }).join('');

  return `<div class="sect"><span class="lbl">Default week</span><div class="sched">${rows}</div>
    <p style="font-size:.82rem;color:var(--muted);margin-top:9px">This is only the default. Any single
    day can be switched to any session from the Session tab without changing the week.</p></div>`;
}

function dataBlock() {
  return `<div class="sect"><span class="lbl">Your data</span>
    <p style="font-size:.84rem;color:var(--muted);margin:6px 0 9px">Your log lives in this browser.
    Export it to move it to another device or to keep a backup &mdash; it is plain JSON, readable
    by anything.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="mini" data-act="export">Export log</button>
      <button class="mini" data-act="import">Import log</button>
    </div></div>`;
}

export function viewProgram() {
  let h = `<p class="lede" style="margin:18px 0 14px;color:var(--muted);font-size:.88rem">Edit the
    program itself &mdash; rename lifts, change targets, reorder, add or remove. Weights here update
    themselves as you log heavier, so you usually won't need to touch the load field.</p>`;

  h += state.order.map((id) => {
    const r = state.routines[id];
    const n = r.ex.reduce((t, x) => t + x.sets, 0);
    return `<details class="rt" data-rt="${id}"><summary><h4>${esc(r.name)}</h4>
      <span class="c">${esc(r.focus)} &middot; ${n} sets</span></summary><div class="inner">
      ${r.ex.map((x, i) => exerciseRow(x, i, i === r.ex.length - 1)).join('')}
      <div style="padding-top:12px"><button class="mini" data-act="addex">+ Add exercise</button></div>
      </div></details>`;
  }).join('');

  return h + defaultWeek() + dataBlock();
}
