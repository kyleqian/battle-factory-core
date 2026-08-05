# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
## 926 — [bounded MAIN worker, 2026-08-04 ~18:05] ISSUES #74 FIXED — generated-route player materialize tail-tick off-by-one, RAM-confirmed on both committed traces, prediction-pinned and exact; YOSHI 700/751 + MAGNETON 703/751 restored

- **State:** master at this docs commit (src fix `src/engine/battleScene.ts`
  + test update, prior commit). `npm test` **721/721 files, 6,927
  passed/1 skipped**, `npm run build` green. `npm run compare --
  factory-arbitrary-intro-yoshi-off --summary` **700/751** (run twice
  fresh, byte-identical); `... -magneton-off --summary` **703/751** (same,
  twice fresh byte-identical) — both exactly the predicted counts pinned
  *before* the post-fix rerun, frames 640/621 now matched, zero newly-
  mismatched frames. Insurance spot-check `battle2-player-sendout-dense`
  **170/170**, unmoved.
- **Did:** Step 1 (probe): RAM-probed the ACTUAL committed
  `factory-arbitrary-intro-{yoshi,magneton}-off` battle-lab scenarios
  directly (not just the banked KADABRA scenario) around the player
  materialize/settle boundary. Both traces show the identical
  species-agnostic 13-value descent (`14,13,...,2,0`) `docs/probes/
  materialize-hitmarker-gating/` already found — confirming it on the two
  actually-regressed leads (GRIMER, DELCATTY). Reconciling RAM ticks with
  displayed pixels via this codebase's own established one-tick
  write→display lag convention pins the exact defect:
  `drawGeneratedPlayerMaterialize`'s mechanism-1 window
  (`PLAYER_MATERIALIZE_START_TICK.._END_TICK`) consumes only
  `MATERIALIZE_Y2_TABLE`'s first 11 of 12
  entries, so the table's final value (`2`) is never drawn — the very next
  tick (`PLAYER_MATERIALIZE_SETTLE_START_TICK`, 1664) falls straight to
  `generatedPlayerMaterializeSettleY2`'s species branch, which drew flat
  `y2=0` for every non-ONIX species. Frames 640 (YOSHI) and 621 (MAGNETON)
  are exactly `playerVisualT=1664` in both traces — the shared missing
  tick. This is why the old (pre-entry-894) all-species ONIX-wobble code
  matched the oracle here: `PLAYER_SETTLE_WOBBLE_Y2_TABLE[0]` independently
  RAM-derives to the same value (`2`) — two unrelated derivations agreeing
  by coincidence, not because the wobble table is broadly correct. Verdict
  **(a)**, crisp, with an exact named tick boundary — full evidence banked
  at `docs/probes/generated-player-materialize-tail-tick/README.md`
  (RAM dumps included).
  Step 2 (fix): `generatedPlayerMaterializeSettleY2` now special-cases
  `playerVisualT === PLAYER_MATERIALIZE_SETTLE_START_TICK`, returning
  `MATERIALIZE_Y2_TABLE`'s last entry for every species (a no-op for ONIX,
  which was already coincidentally correct there) before falling through
  to the existing species-gated/flat logic for every later tick. No touch
  to `PLAYER_MATERIALIZE_START_TICK`/`_END_TICK` (shared with the
  out-of-scope canonical `drawPlayerMaterialize` path) or to
  `battleMenu.ts` (out of scope per brief). Red-verified: reverting the
  fix flips 3 of `tests/generatedPlayerMaterializeSettleSpecies.test.ts`'s
  7 cases, which were pinning the pre-fix flat-0 behavior at this exact
  tick; updated in the same commit to pin the corrected value (all 7
  green post-fix).
- **Next:** #74 closed below. Standing: #39, #55. Entry 922's flagged
  possible-latent bug in `PLAYER_SETTLE_WOBBLE_Y2_TABLE`'s ONIX-only
  partial application (ticks 1665-1669, the genuine per-species
  `BACK_ANIM_V_SHAKE` portion) is untouched and still open — this step's
  probe found no new evidence bearing on it (only the shared tail tick,
  1664, was ever in scope here).
- **Notes:** no PAPERCUT. The RAM-probe driver script and the app-side
  `renderAppTrace`-instrumented clock-mapping script were both scratch
  (not committed), same convention as this run's other RAM probes; only
  the trimmed evidence windows are banked under `docs/probes/`.

---
## 925 — [supervisor wind-down, 2026-08-04 ~17:15] Session close: LOSS window CLOSED 236/236 + WIN wired 65/65 + #75 same-day fix, #72 REACHABLE closed, Slice-D double premise-inversion resolved honestly; final union green 721 files / 6,927

- **State:** master `3dd61f73` (final animation fold: Steel Wing
  reconciliation, opponent 197/197 + player 180/197; `master..animation-main`
  empty at close). Final independent union: full `npm test` **721 files /
  6,927 passed / 1 skipped**, `npm run build` green. Terminal windows:
  LOSS **236/236**, WIN **65/65** (both supervisor-rerun post-merge).
  Play-preview rebuilt at `3dd61f73`, serving on :5199. Working tree clean.
  **No open DEFERRED entries.** No stale worker worktrees or branches
  (`.worktrees/animation-main` permanent; play-preview intentional).
- **Session totals:** 6 rounds, 10 workers (6 main / 4 side), 0 lost —
  1 cap-kill salvaged (R1 cursor gating), 2 premise-stops that were correct
  outcomes (R3 Slice D, R5 back-dispatcher). Landed: #73 LOSS 1/236 →
  236/236 (cursor mechanism + RAM-probe-derived scaffold constants); WIN
  wired 65/65 with its own probe constants; **#75 found and fixed same
  day** (button dismiss-skip race, red-verified on DESTIN's real lines);
  **#72 REACHABLE backlog CLOSED** (Magnitude batch 9, census 39→38);
  selection-rejection subsystem scouted (6 causes; census structurally
  blind to `printselectionstring`; advisory-slice recommendation banked);
  rung-3 dispatcher folded; OFF-seam rest-offset landmine removed with RAM
  receipt; #74 filed, bisected to `7e14afae` (facts stand), mechanism
  re-attributed by R5's probe (back anims gated identically under OFF;
  KADABRA descent = species-agnostic affine-emerge).
- **Next session (recommended order):** (1) #74 — probe whether YOSHI
  frame 640 / MAGNETON 621 sit in the affine-emerge window (alignment bug
  in `MATERIALIZE_Y2_TABLE` consumption) or the settle window (where flat
  is right and the oracle diff means something else); entry 922 has the
  worker's guided next step. (2) #73 — extend `winTerminalWindowStage`
  past the now-fixed dismiss wait toward 241/241 (probe constants in the
  entry). (3) Torment/selection-rejection advisory slice (scout doc ready,
  needs scheduling decision). (4) #71 §1e + coordinated hand-fit
  retirements. Standing: #39, #55.
- **Notes:** the animation supervisor ran concurrently and wound down
  cleanly (~16:45); both folds this session were boring, as designed. Both
  dispatcher halves (front + back) are animation-lane-only consumers under
  Scene OFF by real-game design — recorded in #71's Slice-D record so the
  next session doesn't re-litigate. Oracle-freshness FAIL remains the
  docs-only false-positive class (services untouched all session).

---
## 924 — [bounded MAIN worker, 2026-08-04 ~17:05] R6 MAIN: ISSUES #75 FIXED — button-message dismiss-skip race closed, red-verified on DESTIN's real 23-char lines; full regression sweep green; stretch not attempted (time)

- **State:** master at `e88fb4a5` (src fix + test) plus this docs commit.
  `npm test` **721/721 files, 6,926 passed/1 skipped** (unchanged baseline —
  no existing pin depended on the old skip timing). `npm run build` green.
  `npm run compare -- loss-terminal-window-off --summary` **236/236**;
  `npm run compare -- win-terminal-window-off --summary` **65/65**;
  `npm run compare:differential -- battle-command-generated-off.json --base
  80efbfd8 --summary` **128/128 byte-identical**.
- **Did:** fixed the race probe doc §4 diagnosed —
  `isBattleResolutionCommandComplete` (`battleResolutionPresentationRender.ts`)
  now defers to `isBattleResolutionButtonMessageReady` for any
  `message`+`advance:"button"` command, instead of letting
  `battleResolutionCommandDuration`'s `max(minimumFrames, printableLength)`
  formula report "complete" one tick before "ready" whenever a message's
  printable length sat within 1 of `minimumFrames` (DESTIN's real
  `speechLose`, "PLEASE I NEED"/"SOME WATER", is exactly 23 — the 24-frame
  floor minus 1). Added a Tier-1 test to
  `tests/presentationTerminalSeamTrainerSlide.test.ts` driving DESTIN's own
  production WIN fixture tick-by-tick without ever pressing A: pins that the
  message stays `"presenting"`/not-ready through `phaseElapsed: 23` (the
  exact tick the old formula flagged complete), only enters
  `"awaiting-message-dismiss"` once genuinely ready, stays frozen there
  under continued no-input, and only advances (to `terminal-handoff`, the
  segment's last command) on a real press. Red-verified by stashing the src
  fix: the new test's `isBattleResolutionCommandComplete(held)` assertion
  flips true→false at `phaseElapsed: 23`, exactly the bug's fingerprint.
  DESTIN's 23 chars is itself the `minimumFrames-1` boundary case, so no
  separate boundary fixture was needed. Full suite has zero old-pin
  fallout — nothing asserted the buggy skip timing.
- **Docs:** ISSUES #75 deleted (fixed); its resolution folded into #73's
  WIN-window paragraph, which now explicitly notes the fix unblocks but
  does **not by itself complete** the WIN window's remaining ~320 frames
  (settled quote hold + real dismiss + fade) — `winTerminalWindowStage`
  extension is still open, next pickup.
- **Next:** the STRETCH (extending `winTerminalWindowStage` in
  `tools/compare/appTrace.ts` past the now-fixed dismiss wait toward the
  full 241-frame window, reusing `readyTick=4262`/`dismissTick=4608`/
  `frozenCursorAge=346`) was **not attempted** — steps 1-3 plus docs
  consumed the bulk of this bounded session and there wasn't confident
  runway left to do the extension plus twice-fresh oracle verification
  honestly. Whoever picks it up next has a clean, fixed dismiss wait to
  build on; #73's entry has the exact probe constants.
- **Notes:** no PAPERCUT. `isBattleResolutionButtonMessageReady` is declared
  after `isBattleResolutionCommandComplete` in the same module but both are
  `function` declarations (hoisted), so the forward reference is fine —
  flagged here only because it's easy to second-guess on a quick read.

---
