# Night Unit Call Sheet

A training log for a six-day push/pull/legs split, styled after a film
production call sheet. It opens instantly, works with no signal, and installs
to a phone home screen like an app.

```
npm install                      # dev dependency: Playwright
npx playwright install chromium  # the browser itself — once, ~150 MB
npm start                        # http://127.0.0.1:8899
npm test                         # 20 end-to-end checks in a real browser
```

Node 18 or newer. Installing Playwright does not fetch a browser on its own,
which is why the second line is separate — skip it and `npm test` fails with
"Executable doesn't exist". Nothing but the tests needs it; `npm start` runs
with no dependencies at all.

There is no build step. The files in `src/` are the files the browser runs —
what you edit is what executes, with no bundler in between. A static server is
still needed (`npm start`), because ES modules and service workers both refuse
to run from a `file://` path.

## How it is put together

```
index.html              markup shell — loads one module and gets out of the way
manifest.webmanifest    makes it installable to a home screen
sw.js                   service worker: caches everything so it opens offline
styles/app.css          all styling, light and dark
src/
  main.js               render loop and event wiring
  store.js              IndexedDB: the only file that knows about persistence
  session.js            training rules — what today is, progression, carry-forward
  dates.js              local-time date keys
  util.js               small shared helpers
  views/*.js            one module per tab; each returns an HTML string
data/*.seed.json        the starting program and log, loaded on first run
tests/browser.mjs       end-to-end tests
tools/serve.mjs         the dev server
```

Four decisions worth understanding, because they are the ones that shape
everything else:

**Rendering is a string.** Each view returns HTML as text, and `main.js` sets
`innerHTML` once. No framework, no virtual DOM, no reactivity. At this size it
is imperceptibly fast and there is nothing between you and the markup. It costs
exactly one thing: re-rendering while you are typing would throw focus out of
the input, so set entry updates state *without* a re-render and repaints only
the box you are in. That exception is the whole price of the simplicity.

**State lives in memory; writes go through to IndexedDB.** Views read
`store.state` synchronously, which is what keeps them simple. Every mutation
marks a day dirty and a debounced flush writes just that day's record, so a
burst of keystrokes costs one transaction and the cost does not grow as the log
does. The database has two stores: `meta` for the program, `sessions` keyed by
`YYYY-MM-DD`.

**Dates are local-time strings, never `Date` objects.** A session logged at
9pm belongs to that calendar day, not to whatever day it is in UTC. Storing
`"2026-08-26"` makes that unambiguous, and sorts correctly as plain text.

**Offline is the default, not a fallback.** A gym is a concrete box. If the app
needed a signal to show what you lifted last Tuesday, it would fail exactly when
you need it. The service worker caches every file on install and serves from
cache first.

## Training logic

Two rules live in `src/session.js` rather than in your head:

- **Load carry-forward** — log a heavier top set and the program's target
  weight follows it. Only from the most recent session, so correcting an old
  day never rewrites what you are about to lift today.
- **Double progression** — clear the top of the rep range on every work set and
  the app tells you the next jump: 2.5 kg upper body, 5 kg lower. It suggests;
  it does not move the weight for you.

## Your data

The log is in your browser's own database, on that device. **Export log** on
the Program tab writes plain JSON you can read, back up, or import on another
device. Nothing is sent anywhere, because there is nowhere to send it — there
is no server and no account.

That is also the current limitation: two devices keep two separate logs, and
moving history between them is a manual export and import. Syncing them means
adding a backend, which is the next real piece of work rather than a setting.

## Tests

`npm test` starts a server, drives a real Chromium, and checks the things most
likely to actually break: that a number typed into a box survives closing the
app, that the page still opens with the network off, that typing does not throw
focus out of the field, and that edits to the program persist. They are
integration tests on purpose — none of those can be verified without a browser.

## Trying it on a phone

`http://localhost` is treated as a secure context, so service workers register
there and the app installs from your own machine. A LAN address like
`http://192.168.1.4:8899` is **not** — the page will load, but the service
worker will silently not register and there will be no install prompt, so
offline mode cannot be tested that way.

To try it properly on a phone you need real HTTPS: a tunnel
(`npx localtunnel --port 8899`, `cloudflared tunnel`, `ngrok http 8899`) or a
static host.

## Deploying

Any static host works, and it must be HTTPS or service workers will not
register. GitHub Pages serves this repository as-is with no build step.
