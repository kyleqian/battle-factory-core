# Progress ledger — archive

Older entries moved out of `PROGRESS.md` to keep the live ledger lean. Newest
archived entry on top. Git history has the full detail regardless.

---

## 1 — Iteration 0: staged plan authored (supervisor)

- **State:** Baseline green (`npm test` 3/3, `npm run build` OK, oracle
  answering). `ROADMAP.md` now carries the staged plan S1–S9; no engine code
  yet. `tools/compare/traces/anchor.json` committed.
- **Did:** Verified skeleton baseline; probed the oracle (anchor = Lv-50
  single draft screen, ONIX slot 1; RIGHT/A semantics + timings observed);
  pinned the color expansion `(c<<3)|(c>>2)` against all 22 anchor colors;
  verified the dev-time RAM-inspection recipe (replay matches canonical sha
  byte-exactly; anchor `gRngValue = 0xd2ddeec8`); confirmed the per-frame
  VBlank `Random()` rule (`main.c:366`); authored ROADMAP.md stages S1–S9
  with command-backed acceptance criteria.
- **Next:** S1 via worker briefs — extraction pipeline + engine skeleton +
  `appTrace.ts` wiring, driving `npm run compare -- tools/compare/traces/
  anchor.json` to 0 diff.
- **Notes:** RAM-inspection quirks (mGBA log spam on stdout, benign exit-139
  teardown segfault) are documented in ROADMAP.md Domain notes.

---

## 0 — Run initialized

- **State:** Fresh run from the harness template. `npm test` and
  `npm run build` green on the skeleton; engine not started.
- **Did:** Template stamped by `initialize-run.sh` (see `.run.json` for the
  pinned reference revision, ROM SHA-1, and oracle bootstrap version).
- **Next:** Supervisor iteration 0 — bootstrap the plan: probe the oracle,
  survey the reference, replace `ROADMAP.md`'s PLAN PENDING section with
  staged, command-backed acceptance criteria (`SUPERVISOR.md` § "Fresh
  run"), and commit it before any implementation brief.
- **Notes:** The oracle contract and canonical-state description are in
  `bin/oracle info`. Read `AGENTS.md` before anything else.
