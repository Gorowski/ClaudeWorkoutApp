# Night Unit Call Sheet

A workout tracker for a six-day push/pull/legs split, styled after a film
production call sheet.

## Current state

This repository contains a single-file baseline exported from the Claude
Artifact the app was prototyped in: `index.html` is vanilla HTML/CSS/JS with
no build step and no dependencies beyond Google Fonts. Open it in a browser
and it runs.

- **Four views** — Session, Calendar, Program, Reference.
- **Six routines** — Legs A, Push A, Pull A, Legs B, Push B, Pull B, mapped
  to a weekly schedule with one rest day.
- **Per-set logging** — reps and weight per set, with the last session's
  numbers for that exercise shown inline so loads carry forward.
- **State** lives in a `<script id="state" type="application/json">` block,
  mirrored to `localStorage`. In the Artifact, saving republished the page
  with the state block rewritten; outside it, saving falls back to
  `localStorage` on that device only.

## Known limits of the baseline

These are the reasons to rebuild it as a real application rather than
extend it in place:

- Data lives in the document. There is no server, no account, and no sync
  between devices — the log on a phone and the log on a laptop are
  different logs.
- Everything is one 49 KB file: markup, styles, application logic, program
  definition, and training history all in the same place.
- The program is hardcoded in the state block; editing it means editing
  JSON by hand.
- No tests, no schema, no migrations.
