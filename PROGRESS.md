# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 846 — [bounded MAIN worker, 2026-08-01] turn-4 predecessor retired with immutable epoch

- **State:** proof `75d9c1d3`, migration `350d5aa0`; `rg -n '\\bturn4Resolved\\b' src tests` is empty. The receipt publishes at the source-owned first choose-action callback: absolute **5352**, runtime elapsed **4312** (the 5351 handler-install tick still rejects A).
- **Did:** migrated turn-5 dispatch, generic HP/content, ENDEAVOR routing, slot-0 PP, all turn-5 clock consumers, and direct presentation calls to PP **[7,20,19,10]**, slot **0**, HP **88/1**, settled/ready, and DoBounceEffect seeds **192/128**, delta **7**, amplitude **1**. Turn-5's open and B-close/A-reopen retain the same receipt object; its existing legacy continuation phase is receipt-derived, not republished.
- **Next:** stay scoped: `opponentFaintDismissElapsed` and dispatcher debt remain #39 work; do not reopen turns 1–4.
- **Notes:** clean-parent `b7cdbe46` (`75d9c1d3^`) app replays are byte-identical: turn-4 DOUBLE_TEAM **256/256**, ROCK_SLIDE **256/256**; turn-5/6 readers **51/51 + 42/42 + 254/254 + 256/256 + 121/121 + 252/252 + 145/145 + 47/47 = 1,168/1,168**; upstream turn-3 **161/161**; total **1,841/1,841** raw RGBA captures. Focused Tier-1 **510/510** (16 files), `npx tsc --noEmit`, and `npm run build` green; full `npm test` deliberately unrun per the bounded brief.

## 845 — [bounded MAIN worker, 2026-08-01] turn-3 predecessor retired with immutable epoch

- **State:** proof `3487117c`, migration `0e7fd346` + follow-up `c0c2c228`; `rg -n '\\bturn3Resolved\\b' src tests` is empty. The receipt publishes at the
  source-owned first choose-action callback: absolute **4212**, runtime
  elapsed **3172** (the 4211 handler-install tick still rejects A).
- **Did:** migrated turn-4 dispatch, generic HP/content, DOUBLE_TEAM routing,
  slot-0 PP, all turn-4 bounce consumers, and direct presentation calls to
  PP **[8,20,19,10]**, slot **0**, HP **88/41**, settled/ready, and the
  DoBounceEffect **192/128**, delta **7**, amplitude **1** receipt. A
  turn-4 B-close/A-reopen retains the same receipt object/epoch. The
  turn-5-only fallback explicitly clears its no-longer-applicable turn-3
  receipt rather than passing a stale positional boolean.
- **Next:** stay scoped: turn 4, `opponentFaintDismissElapsed`, and dispatcher
  debt remain #39 work; do not reopen turns 1–3.
- **Notes:** clean-parent `354ebc89` (`3487117c^`) app replays are byte-
  identical: turn-3 **416/416**, turn-4 readers **512/512**, upstream
  turn-2 **237/237**, total **1,165/1,165** raw RGBA captures. Focused
  Tier-1 **528/528** (19 files), `npx tsc --noEmit`, and `npm run build`
  green; full `npm test` deliberately unrun per the bounded brief.

## 844 — [supervisor session open, 2026-08-01 19:25] animation-main folded; turn-3 + turn-5-OFF-banking lanes launching

- **State:** master `ca227c9c` (fold merge of `animation-main`, 8 commits:
  lunge-grow + circle idle families, sendout fixtures). Union verified by me:
  full `npm test` **6,061 passed + 1 skipped** (19:12), `npm run build`
  green. Oracle 8014 freshness FAIL re-confirmed as the known docs-only
  false positive (harness `9cadad7`/`acc5c4e` are template/CLI-output-only;
  no service schema change) — no restart. 8012 fresh; animation session
  live until 20:56.
- **Did:** orient + fold + union verification.
- **Next:** parallel lanes — MAIN: `turn3Resolved` retirement per
  `docs/turn1-4-epoch-prep.md` (Terra/max); SIDE: bank the missing turn-5
  OFF reader set as **new files only** (Sol/high). **Decision (supervisor,
  reversible):** banking the turn-5 OFF reader set is additive evidence,
  precedented by the pre-adoption rank-5/6 OFF ground-truth banking; it
  does NOT adopt the turns 5-8 ON-pin re-timing policy, which remains an
  open user question. Then turn-4 slice with exact `512 + N` acceptance.
- **Notes:** hard deadline 21:11; wind-down target ~20:50 with a re-check
  of `animation-main` for new commits.

## 843 — [supervisor final close-out, 2026-08-01 19:10] turns 1+2 also retired — session total SIX turn-flag retirements

- **State:** master `34c4efec`, tree clean. Final union full `npm test`
  **6,045 passed + 1 skipped** (18:58 run) and build green; the two commits
  since are docs-only (papercut + this entry). Retired today: `turn9/10/11/
  12Resolved` (entries 830-836), then `turn1Resolved` (841, second attempt
  landed with the epoch-continuation rule after 838/839's honest checkpoint
  + same-session evidence scout) and `turn2Resolved` (842, first try,
  990/990). **Remaining `#39` fields: turns 3 and 4, then
  `opponentFaintDismissElapsed`, then dispatcher debt — all with merged
  prep/evidence dossiers.** Supervisor spot compares after each landing all
  exact, incl. previously-failing `turn2-endeavor-off` now 256/256 live.
- **Did (since entry 840):** turn-1 retry (evidence-doc prescription —
  differential 1,162/1,162); turn-2 slice (990/990); verified both; new
  papercut recorded (nested diff worktree doubles vitest discovery); temp
  diff worktrees swept.
- **Next session:** turn-3 then turn-4 per `docs/turn1-4-epoch-prep.md`
  (turn-4's acceptance first needs the turn-5 OFF reader-set decision —
  turns 5-8 OFF re-timing policy still un-adopted); then item 7 per
  `docs/opponent-faint-dismiss-owner-prep.md`. Fold `animation-main` at
  orient: a NEW animation session (started 17:56, deadline 20:56, still
  live at close) has it 8+ commits ahead — deliberately left unfolded per
  protocol since their branch is still moving.
- **Notes:** 12 briefs total this session, 11 landed + 1 honest checkpoint
  converted to a landing same-day; 0 unresolved failures; no exit-42;
  DEFERRED.md empty — no open questions block the next session.

## 842 — [bounded MAIN worker, 2026-08-01] turn-2 predecessor retired with immutable epoch

- **State:** proof `c16386d6`, migration `7a3fca06`; the production/test
  census has no `turn2Resolved` reference. The receipt is published at the
  source-owned first choose-action callback (absolute **3237**, runtime
  elapsed **2197**; the handler install at 3236 still rejects A).
- **Did:** migrated core dispatch/predecessor, generic HP/content,
  ENDEAVOR-family routing, slot-2 PP, and every turn-3 submenu/kickoff clock
  onto the immutable receipt: PP **[9,20,19,10]**, slot **2**, HP
  **101/88**, settled/ready, and DoBounceEffect seeds **192/128** with
  delta **7** and amplitude **1**. The later turn-3 open and its B-close/A-
  reopen consume that epoch rather than replacing it.
- **Next:** stay scoped: turns 3–4, `opponentFaintDismissElapsed`, and
  dispatcher debt remain #39 work; do not reopen turn 2.
- **Notes:** clean-parent `ace2b44c` (`c16386d6^`) app replays are
  byte-identical: turn-2 **493/493**, turn-3 readers **416/416**, upstream
  **81/81**, total **990/990** raw RGBA captures. (The known #61 live-oracle
  residual remains `turn3-endeavor-off` 254/255, but this differential is
  255/255.) Focused Tier-1 **461/461** (8 files), `npx tsc --noEmit`, and
  `npm run build` green; full `npm test` deliberately unrun per the bounded
  brief. No trace/capture-list, recording import, ratchet/barrier, or
  selector changes.
