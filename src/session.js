/* Training logic: what today's session is, what you did last time, and how
   loads carry forward. This is the part with actual rules in it, so it is
   kept clear of both storage and markup. */

import { state, touchSession, touchProgram } from './store.js';
import { dayOfWeek } from './dates.js';
import { isDone } from './util.js';

/** The session for a date: the logged one if it exists, else the default
    week's routine for that weekday, as an unsaved draft. */
export function sessionFor(dateKey) {
  const logged = state.sessions[dateKey];
  if (logged) return logged;
  return {
    date: dateKey,
    routine: state.schedule[String(dayOfWeek(dateKey))] || '',
    notes: '',
    ex: [],
    draft: true,
  };
}

/** Promote a draft to a real record, so it can be written to. */
export function commit(dateKey) {
  if (!state.sessions[dateKey]) {
    const s = sessionFor(dateKey);
    delete s.draft;
    state.sessions[dateKey] = s;
  }
  return state.sessions[dateKey];
}

export const routineOf = (sess) => (sess ? state.routines[sess.routine] : null);

export function exStateOf(sess, tpl) {
  return (sess.ex || []).find((x) => x.id === tpl.id) || null;
}

/** Get the per-exercise record for a session, creating it if needed and
    padding it out to the template's set count. */
export function ensureExState(sess, tpl) {
  let st = exStateOf(sess, tpl);
  if (!st) { st = { id: tpl.id, name: tpl.name, sets: [] }; sess.ex.push(st); }
  while (st.sets.length < tpl.sets) st.sets.push({ r: null, w: null });
  return st;
}

/** Is this the most recent day with any work logged? Editing an older day
    must not rewrite the loads you are about to train with today. */
export function isLatest(dateKey) {
  return !Object.keys(state.sessions).some((k) => {
    if (k <= dateKey) return false;
    const e = state.sessions[k];
    return !!(e?.ex || []).some((x) => (x.sets || []).some(isDone));
  });
}

/** The last time this exercise was performed before a given date. Matches on
    id within the same routine, and falls back to matching by name so an
    exercise that appears on two days still shows its real history. */
export function lastTime(dateKey, routineKey, exId, name) {
  const keys = Object.keys(state.sessions).filter((d) => d < dateKey).sort().reverse();
  for (const k of keys) {
    const e = state.sessions[k];
    for (const x of e?.ex || []) {
      const sameSlot = e.routine === routineKey && x.id === exId;
      const sameLift = x.name && name && x.name.toLowerCase() === name.toLowerCase();
      if ((sameSlot || sameLift) && (x.sets || []).some(isDone)) return { date: k, sets: x.sets };
    }
  }
  return null;
}

/** Record one field of one set, and carry the load forward onto the program
    when you train heavier — but only from the most recent session. */
export function recordSet(dateKey, tpl, index, field, value) {
  const sess = commit(dateKey);
  const st = ensureExState(sess, tpl);
  while (st.sets.length < index + 1) st.sets.push({ r: null, w: null });
  st.sets[index][field] = value;
  st.name = tpl.name;

  if (isLatest(dateKey)) {
    const heaviest = st.sets.reduce((hi, s) => (s.w != null && (hi == null || s.w > hi) ? s.w : hi), null);
    if (heaviest != null && heaviest > 0 && heaviest !== tpl.load) {
      tpl.load = heaviest;
      touchProgram();
    }
  }
  touchSession(dateKey);
  return st;
}

/** Double progression: both work sets at the top of the range earns the
    next jump — 2.5 kg upper body, 5 kg lower. Advisory only; it suggests,
    it does not move the load for you. */
const LOWER = /squat|deadlift|leg |calf|lunge|hip thrust|split squat/i;

export function progressionHint(tpl, st) {
  if (!st) return null;
  const done = (st.sets || []).filter(isDone).slice(0, tpl.sets);
  if (done.length < tpl.sets) return null;
  if (!done.every((s) => s.r >= tpl.hi)) return null;
  const step = LOWER.test(tpl.name) ? 5 : 2.5;
  const base = done.reduce((hi, s) => Math.max(hi, s.w || 0), 0);
  if (!base) return null;
  return { next: base + step, step };
}
