/* Date helpers. Every date in the app is a local-time "YYYY-MM-DD" key —
   never a Date object in storage, never UTC. A session logged at 9pm in
   Queensland belongs to that calendar day, not the next one in UTC. */

export const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MON = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n) => String(n).padStart(2, '0');

export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = () => keyOf(new Date());

export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftKey(k, days) {
  const d = parseKey(k);
  d.setDate(d.getDate() + days);
  return keyOf(d);
}

export const dayOfWeek = (k) => parseKey(k).getDay();
export const monthOf = (k) => k.slice(0, 7);

export function longDate(k) {
  const d = parseKey(k);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()].slice(0, 3)}`;
}

export function shortDate(k) {
  const d = parseKey(k);
  return `${DOW[d.getDay()].slice(0, 3)} ${d.getDate()} ${MON[d.getMonth()].slice(0, 3)}`;
}

/** Days in a month, and the weekday its 1st falls on. */
export function monthGrid(ym) {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7)) - 1;
  return { y, m, startDow: new Date(y, m, 1).getDay(), days: new Date(y, m + 1, 0).getDate() };
}

export function shiftMonth(ym, n) {
  const { y, m } = monthGrid(ym);
  const d = new Date(y, m + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
