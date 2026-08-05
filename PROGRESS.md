# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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
## 923 — [supervisor, 2026-08-04 ~16:50] R4-side WIN window merged (65/65 twice-run + supervisor rerun; LOSS holds 236/236 post-merge); #75 filed (button dismiss-skip race); R5's premise-stop accepted (#74 stays open, corrected); R6 launched (#75 fix, final round)

- **State:** master at this docs commit. Post-merge supervisor reruns:
  `win-terminal-window-off` **65/65**, `loss-terminal-window-off`
  **236/236**. Worker gates at `af036937`: full suite 721 green, build
  green, canary 128/128, LOSS unchanged by the shared-helper
  generalization.
- **Did:** (1) merged the WIN wiring (probe constants banked:
  `readyTick=4262`/`dismissTick=4608`/`frozenCursorAge=346`; two
  scaffold-side bugs found+fixed during transplant are documented in
  `docs/terminal-seam-win-window-probe.md`); (2) filed **ISSUES #75** —
  the genuine src race the WIN worker isolated (button messages ≥23
  printable chars silently skip their dismiss wait → live-path crash;
  independently corroborated by R1's test comment that dodged it);
  (3) accepted R5's premise-stop as correct (`BattleAnimateBackSprite`
  carries the SAME Scene-OFF gate — supervisor's own bisect-verdict
  mechanism attribution was wrong; the bisect FACTS stand, #74 stays
  open with the worker's sharper next-step: probe whether frames 640/621
  sit in the affine-emerge window (alignment bug) or the settle window);
  (4) during the #73 trim, briefly clobbered #74's entry with a bad
  python slice — caught immediately and restored verbatim from git
  (`61d1ffd5`) before commit.
- **Next:** R6 in flight — MAIN: #75 invariant fix (button message never
  completes without its dismiss input), red-verified on DESTIN's exact
  23-char lines, regression sweep, optional WIN-window extension stretch.
  Then wind-down: final animation fold, ONE full union suite,
  play-preview rebuild, session report.
- **Notes:** #74's open next-step is a next-session probe; the back/front
  dispatchers both stay animation-lane-only consumers by real-game design
  (both halves gated identically under Scene OFF).

---
## 922 — [bounded MAIN worker, 2026-08-04 ~17:45] R5 MAIN: STOPPED before wiring — ISSUES #74's back-dispatcher premise FAILS its own step-1 check; docs-only, no src edits

- **State:** master at this docs commit only (no `src/` changes). `npm
  test`/`npm run build` verified green (see commit message for exact
  numbers). Nothing to differential/oracle-compare — no render code touched.
- **Did:** the R5 brief's step 1 required verifying, at source, that the
  back-sprite materialize path is NOT gated by Scene OFF (unlike front's
  `SKIP_FRONT_ANIM`) before wiring `backSendOutFrameAtTick` into
  `drawGeneratedPlayerMaterialize`'s settle path, with an explicit
  instruction to STOP if it IS gated. It is: `BattleAnimateBackSprite`
  (`pokemon.c:6886-6897`) checks the identical `HITMARKER_NO_ANIMATIONS`
  gate as the front path, reached via the identical unconditional
  `BATTLER_AFFINE_EMERGE` ball-emerge handoff on both sides — no asymmetry
  in source. Went beyond a source read: RAM-probed `gHitMarker`/
  `gBattleTypeFlags`/both battlers' sprite state across the full banked
  KADABRA scenario (reused from `docs/probes/kadabra-materialize-settle/`)
  and confirmed live that the gate's condition holds throughout. Also found
  the "KADABRA descent 14→0" evidence entry 894/895's Slice-D bisect
  attributed to a per-species back-anim family is actually the
  species-agnostic, unconditional `BATTLER_AFFINE_EMERGE` collapse —
  reproduced byte-identically on the FRONT sprite of a different species in
  the same trace, and complete before either sprite's callback leaves its
  `...MonFromBall` state (i.e. before the per-species-gated
  `BattleAnimate{Front,Back}Sprite` call even runs) — already banked in this
  codebase as `MATERIALIZE_Y2_TABLE`/`drawPlayerSideAffineMaterialize`
  (`battleScene.ts:4900-5011`, doc'd species-independent) and already
  consumed by `drawGeneratedPlayerMaterialize`'s first phase. Full evidence
  + citations: `docs/probes/materialize-hitmarker-gating/README.md` (raw RAM
  transition dumps banked alongside it). ISSUES #74 addended with the
  correction (not closed — still open, re-scope needed); #71 untouched
  pending that re-scope.
- **Next:** #74 needs re-scoping, not the R5 brief's original wiring plan.
  Whoever picks it up next should probe the actual committed
  `factory-arbitrary-intro-{yoshi,magneton}-off` traces directly (not the
  standalone KADABRA scenario) to determine whether the regressed frames
  640/621 fall inside the already-modeled affine-emerge window (a clock/
  alignment bug) or the later settle window (where flat `y2=0` for every
  species, ONIX included, is likely the source-correct draw under Scene
  OFF — not a species-keyed dispatcher call). `playerMaterializeSettleY2`'s
  own doc comment already flags its ONIX table as Scene-ON-derived, applied
  at a Scene-OFF seam — worth revisiting whether even the ONIX-only partial
  application (ticks 1664-1669) is itself a latent bug.
- **Notes:** no PAPERCUT. This step never reached the src-edit/test/
  acceptance stages (2-7) of its own brief since step 1's own stop condition
  fired; `npm test`/`npm run build` run anyway per the finish requirement.
