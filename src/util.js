/* Small shared helpers. */

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Parse a form field to a number, treating blank as "not entered" (null). */
export function num(v) {
  if (v === '' || v == null) return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

/** Trim float noise for display: 42.50 -> "42.5", null -> "". */
export function fmt(n) {
  if (n == null || n === '') return '';
  return String(Math.round(n * 100) / 100);
}

export const rid = () => 'x' + Math.random().toString(36).slice(2, 8);

/** Has this set actually been performed? A weight with no reps is not a set. */
export const isDone = (s) => s && s.r != null && s.r !== '';

/** Does a session contain any performed set? */
export function hasWork(sess) {
  return !!(sess && sess.ex && sess.ex.some((x) => (x.sets || []).some(isDone)));
}

/** Total performed sets and volume (reps x kg) for a session. */
export function sessionTotals(sess) {
  let sets = 0, volume = 0;
  (sess?.ex || []).forEach((x) => (x.sets || []).forEach((s) => {
    if (isDone(s)) { sets++; volume += s.r * (s.w || 0); }
  }));
  return { sets, volume };
}

export const debounce = (fn, ms) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};
