/* Storage.

   The whole dataset is small — a few hundred sessions of numbers — so it is
   held in memory and rendered from synchronously, while writes go through to
   IndexedDB in the background. That keeps rendering simple and makes the app
   work with no network at all.

   Two object stores rather than one JSON blob:
     meta      key/value: the program, the default week, the schema version
     sessions  one record per calendar day, keyed by "YYYY-MM-DD"

   Writing one day's record on each keystroke, instead of rewriting the entire
   training history, is what keeps this cheap as the log grows. */

const DB_NAME = 'nucs';
const DB_VERSION = 1;

let db = null;

/** In-memory mirror. Views read this synchronously. */
export const state = {
  routines: {},
  order: [],
  schedule: {},
  sessions: {},   // dateKey -> session
  ready: false,
};

const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn());

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const d = req.result;
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
      if (!d.objectStoreNames.contains('sessions')) d.createObjectStore('sessions', { keyPath: 'date' });
      // Future schema changes branch on ev.oldVersion here.
      void ev;
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return new Promise((resolve, reject) => {
    if (!db) return reject(new Error('database not open'));
    const t = db.transaction(store, mode);
    const out = fn(t.objectStore(store));
    // Resolve with the request's value when fn returned a request, and with
    // nothing when it did not. Note that a get() for a key that is not there
    // succeeds with result === undefined, which must stay undefined — coalescing
    // it to the request object would make a miss look like a hit.
    t.oncomplete = () => resolve(out instanceof IDBRequest ? out.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const getMeta = (k) => tx('meta', 'readonly', (s) => s.get(k));
const putMeta = (k, v) => tx('meta', 'readwrite', (s) => s.put(v, k));

function allSessions() {
  return new Promise((resolve, reject) => {
    const t = db.transaction('sessions', 'readonly');
    const req = t.objectStore('sessions').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function seed() {
  const [program, log] = await Promise.all([
    fetch('./data/program.seed.json').then((r) => r.json()),
    fetch('./data/log.seed.json').then((r) => r.json()),
  ]);
  await putMeta('program', { routines: program.routines, order: program.order, schedule: program.schedule });
  const days = Object.entries(log).map(([date, sess]) => ({ ...sess, date }));
  await tx('sessions', 'readwrite', (s) => days.forEach((d) => s.put(d)));
  return { program, days };
}

/** Open the database, seeding it on first run, and fill the in-memory mirror. */
export async function init() {
  db = await open();
  let program = await getMeta('program');
  if (!program) {
    const fresh = await seed();
    program = { routines: fresh.program.routines, order: fresh.program.order, schedule: fresh.program.schedule };
  }
  state.routines = program.routines;
  state.order = program.order;
  state.schedule = program.schedule;
  state.sessions = {};
  for (const rec of await allSessions()) state.sessions[rec.date] = rec;
  state.ready = true;
  emit();
}

/* ---- writes -------------------------------------------------------------
   Callers mutate the in-memory object, then declare what changed. Writes are
   coalesced so a burst of keystrokes costs one transaction. */

const dirtyDays = new Set();
let programDirty = false;
let flushTimer = null;
let inFlight = null;

export const status = { pending: false, error: '' };

function schedule() {
  status.pending = true;
  emit();
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { flush(); }, 400);
}

export function touchSession(dateKey) { dirtyDays.add(dateKey); schedule(); }
export function touchProgram() { programDirty = true; schedule(); }

/** Write everything outstanding. Safe to call at any time. */
export async function flush() {
  clearTimeout(flushTimer);
  if (inFlight) return inFlight;
  if (!dirtyDays.size && !programDirty) { status.pending = false; emit(); return; }

  const days = [...dirtyDays]; dirtyDays.clear();
  const doProgram = programDirty; programDirty = false;

  inFlight = (async () => {
    try {
      if (doProgram) {
        await putMeta('program', { routines: state.routines, order: state.order, schedule: state.schedule });
      }
      if (days.length) {
        await tx('sessions', 'readwrite', (s) => days.forEach((k) => {
          const sess = state.sessions[k];
          if (sess) s.put({ ...sess, date: k });
          else s.delete(k);
        }));
      }
      status.error = '';
    } catch (err) {
      // Put the work back so the next flush retries it rather than losing it.
      days.forEach((k) => dirtyDays.add(k));
      if (doProgram) programDirty = true;
      status.error = 'Not saved — retrying';
      console.error('flush failed', err);
    } finally {
      inFlight = null;
      status.pending = dirtyDays.size > 0 || programDirty;
      emit();
      if (status.pending) schedule();
    }
  })();
  return inFlight;
}

/* ---- portability --------------------------------------------------------
   The point of owning your own log is being able to take it somewhere else. */

export function exportAll() {
  return {
    format: 'nucs.export',
    version: DB_VERSION,
    exported: new Date().toISOString(),
    program: { routines: state.routines, order: state.order, schedule: state.schedule },
    sessions: state.sessions,
  };
}

export async function importAll(data, { merge = true } = {}) {
  if (!data || data.format !== 'nucs.export') throw new Error('Not a Night Unit export file');
  if (data.program?.routines) {
    state.routines = data.program.routines;
    state.order = data.program.order || Object.keys(data.program.routines);
    state.schedule = data.program.schedule || {};
    programDirty = true;
  }
  const incoming = data.sessions || {};
  if (!merge) {
    await tx('sessions', 'readwrite', (s) => s.clear());
    state.sessions = {};
  }
  for (const [date, sess] of Object.entries(incoming)) {
    state.sessions[date] = { ...sess, date };
    dirtyDays.add(date);
  }
  await flush();
  emit();
  return Object.keys(incoming).length;
}
