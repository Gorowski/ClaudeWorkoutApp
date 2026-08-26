/* The Session tab — the one you actually stand in front of a rack holding. */

import { state } from '../store.js';
import { longDate, shortDate, todayKey } from '../dates.js';
import { esc, fmt, isDone } from '../util.js';
import { sessionFor, exStateOf, lastTime, progressionHint } from '../session.js';

function dateBar(k) {
  const isToday = k === todayKey();
  return `<div class="datebar">
    <button class="arrow" data-act="day" data-v="-1" aria-label="Previous day">&lsaquo;</button>
    <div class="d"><span class="lbl">${isToday ? 'Today' : 'Session'}</span>
      <strong>${esc(longDate(k))}</strong></div>
    <button class="arrow" data-act="day" data-v="1" aria-label="Next day">&rsaquo;</button>
    <button class="today${isToday ? '' : ' hot'}" data-act="today">Today</button></div>`;
}

function picker(routineKey) {
  const opts = state.order.map((id) =>
    `<button data-act="setr" data-v="${id}" aria-pressed="${routineKey === id}">${esc(state.routines[id].name)}</button>`
  ).join('');
  return `<div class="pick">${opts}<button class="rest" data-act="setr" data-v="" aria-pressed="${!routineKey}">Rest</button></div>`;
}

function notesBlock(sess) {
  return `<div class="sect"><span class="lbl">Session notes</span>
    <textarea data-act="notes" placeholder="How it felt, what to change, anything that got in the way.">${esc(sess.notes || '')}</textarea></div>`;
}

function exerciseCard(tpl, i, sess, dateKey, routineKey) {
  const st = exStateOf(sess, tpl);
  const sets = st?.sets || [];
  const prev = lastTime(dateKey, routineKey, tpl.id, tpl.name);
  const hint = progressionHint(tpl, st);

  let h = `<div class="ex" data-ex="${tpl.id}">
    <div class="ex-top"><span class="n">${String(i + 1).padStart(2, '0')}</span>
      <span class="nm">${esc(tpl.name)}</span>
      <span class="tgt">${tpl.sets} &times; ${tpl.lo}&ndash;${tpl.hi}<br>${tpl.load ? fmt(tpl.load) + ' kg' : 'BW'}</span></div>`;

  if (prev) {
    const best = prev.sets.filter(isDone)
      .map((s) => `${s.r}&times;${s.w ? fmt(s.w) : 'BW'}`).join('  ');
    h += `<div class="prev">Last ${esc(shortDate(prev.date))} &mdash; <b>${best}</b></div>`;
  }

  const n = sets.length || tpl.sets;
  h += '<div class="sets">';
  for (let j = 0; j < n; j++) {
    const s = sets[j] || {};
    h += `<span class="setbox${isDone(s) ? ' filled' : ''}">
      <span class="si">${j + 1}</span>
      <input type="number" inputmode="numeric" step="1" min="0" placeholder="${tpl.lo}"
        value="${s.r != null ? esc(s.r) : ''}" data-f="r" data-i="${j}" aria-label="Set ${j + 1} reps">
      <span class="x">&times;</span>
      <input class="w" type="number" inputmode="decimal" step="0.25" min="0"
        placeholder="${tpl.load ? fmt(tpl.load) : '0'}" value="${s.w != null ? esc(fmt(s.w)) : ''}"
        data-f="w" data-i="${j}" aria-label="Set ${j + 1} weight">
      <span class="u">kg</span></span>`;
  }
  h += '<button class="mini" data-act="addset">+ set</button>';
  if (n > 1) h += '<button class="mini danger" data-act="delset">&minus;</button>';
  h += '</div>';

  if (hint) {
    h += `<div class="prev"><span class="up">Earned the jump &mdash; ${fmt(hint.next)} kg next time (+${fmt(hint.step)})</span></div>`;
  }
  if (tpl.cue) h += `<div class="cue">${esc(tpl.cue)}</div>`;
  return h + '</div>';
}

export function viewSession(ui) {
  const k = ui.date;
  const sess = sessionFor(k);
  const routineKey = sess.routine;
  const r = state.routines[routineKey];

  let h = dateBar(k) + picker(routineKey);

  if (!r) {
    h += `<div class="empty"><h2>Rest</h2><p>Nothing scheduled. Pick a session above if you're
      training today &mdash; two hard sets per exercise only builds anything if the recovery
      underneath it is real.</p></div>`;
    return h + notesBlock(sess);
  }

  const count = r.ex.reduce((n, x) => n + x.sets, 0);
  h += `<div class="shead"><div class="bar"><h2>${esc(r.name)} &middot; ${esc(r.focus)}</h2>
    <span>${count} sets</span></div>`;
  if (r.warmup) h += `<div class="body"><b>Warm-up &mdash; not counted</b>${esc(r.warmup)}</div>`;
  h += '</div>';

  h += r.ex.map((tpl, i) => exerciseCard(tpl, i, sess, k, routineKey)).join('');

  if (r.cardio) {
    h += `<div class="sect"><span class="lbl">After the session</span><div class="shead">
      <div class="body" style="color:var(--cool)">${esc(r.cardio)}</div></div></div>`;
  }
  return h + notesBlock(sess);
}
