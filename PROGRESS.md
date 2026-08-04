# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 921 — [bounded MAIN worker, 2026-08-04 ~17:00] R4 MAIN: OFF-seam rest-offset landmine REMOVED (ISSUES #71 Slice-D follow-up); NEW pre-existing #74 filed, unrelated to this step

- **State:** master at this docs commit (3 commits since 920:
  `54979bf3` src fix + test flip, `2cf1e18b` RAM probe evidence,
  `bed1bf1b` #74 filing). `npm test`/`npm run build` verified green at the
  final commit (see that commit message for exact numbers).
  `compare:differential -- battle-command-generated-off.json --base
  1a12ce9c --summary`: **128/128 byte-identical**.
- **Did:** removed `speciesFrontIdleRestOffset` from the two generated-route
  OFF settle hooks (`drawGeneratedOpponentRelease`'s `coeff===0` branch +
  `renderGeneratedBattleStartPlayerRelease`'s duplicate) per entry 920's
  Slice-D-exposed landmine: Scene OFF never launches the front-sprite
  animation task at all (`SKIP_FRONT_ANIM`), so these two hooks were baking
  a nonzero ONIX/RATTATA `{+1,0}` the real game never shows. Left a
  one-line comment citing ISSUES #71's Slice-D record at each site; the
  four canonical hooks and `speciesIdleAnim.ts`'s ONIX hand-fit are
  untouched (their ON-legacy species are all `{0,0}` regardless — never
  wrong). Flipped the staged RATTATA pin in `tests/battleScene.test.ts` to
  `{0,0}`, red-verified (fails against the old `+1` behavior with the src
  edit stashed). Positive oracle evidence: cloned
  `send-out-front-idle-rattata.json` to a `battle-scene-off` variant,
  RAM-probed `gBattlerSpriteIds[1]` across the full 634-tick trace — flat
  `x2=0`/`y2=0`/`SpriteCallbackDummy` for all 635 ticks
  (`docs/rattata-off-seam-flat-settle-probe.md`); also corrected the probe
  script's own stale "OFF plays send-out anims" docstring claim (same wrong
  claim entry 920 retracted from PAPERCUTS.md). ISSUES #71 Slice-D record
  addended with the removal + receipt; entry 894's deferred staged
  non-ONIX settle check recorded as moot at this seam (no species-varying
  behavior left to check — every species settles flat).
- **Found, not fixed:** re-running the entry-890 §4 dense-window list as
  insurance, 4/6 matched their documented baseline exactly
  (`battle2-kabuto-sendout-dense` 151/151, `battle2-player-sendout-dense`
  170/170, `sendout` 255/256, `battle2-jenson-sendout-text` 39/39); the
  other 2 (`factory-arbitrary-intro-yoshi-off`,
  `-magneton-off`) are each **1 frame short** of their documented baseline
  (699/751 vs 700/751, frame 640; 702/751 vs 703/751, frame 621) — proven
  **pre-existing and unrelated** to this step (identical reproduction at
  `1a12ce9c` in a scratch worktree; `compare:differential` shows this
  step's commit is 751/751 byte-identical to base for both traces at every
  frame). Filed as **ISSUES #74** for the supervisor rather than
  root-caused here (needs bisecting the R2/R3/R4 merges between entry 890
  and 1a12ce9c, out of this step's scope).
- **Next:** #74 needs a bisection/root-cause session. #71's remaining
  main-lane share stays the §1e 56/58 move-window patch-site retirement +
  the coordinated KABUTO/MAGBY/ONIX hand-fit retirements.
- **Notes:** none beyond the #74 finding above.

---
## 920 — [supervisor, 2026-08-04 ~16:15] R3 verified both lanes: Slice D closure RATIFIED (4 sources checked) + LOSS window CLOSED 236/236; R4 launching (OFF-seam settle honesty MAIN + WIN compare wiring SIDE)

- **State:** master at the side-R3 merge + this docs commit. LOSS
  terminal-window compare **236/236** — worker twice-fresh + post-commit
  third run + independent supervisor rerun post-merge, all PNG-identical.
  Worker gates at `40b75dc6`: full suite 721 files green, build green,
  differential canary 128/128.
- **Did:** (1) verified the R3 MAIN worker's Slice-D-not-applicable verdict
  myself before ratifying (SUPERVISOR.md's no-silent-ratification rule):
  read `pokemon.c:6803-6852` (`SKIP_FRONT_ANIM` under
  `HITMARKER_NO_ANIMATIONS` — cry only, `SpriteCallbackDummy`, no movement
  task, no two-frame flip) and the OFF profile's own `bin/oracle info`
  contract text; cross-checked entry 890's "fast-forward gotcha" (its
  RATTATA `{1,0}` probes were `battle-scene-on` scenarios, and its OFF
  probe already saw the flat truth) — the worker's verdict stands,
  entry 919 + the ISSUES #71 Slice-D record are accurate. (2) Corrected
  `PAPERCUTS.md`'s wrong "Real OFF-profile battles DO play send-out anims"
  claim (supervisor is that file's writer; original kept for forensics).
  (3) Merged side R3's scaffold fix, re-verified 236/236 independently,
  applied the #73 trim. (4) Identified the follow-up the Slice-D evidence
  exposes: Slices A/B's `speciesFrontIdleRestOffset` at the TWO
  generated-route OFF hooks bakes ONIX/RATTATA `{+1,0}` the OFF oracle
  never shows — latent 1px landmine on uncommitted windows (all committed
  windows avoid those species; the 4 canonical ON-legacy hooks are
  unaffected — their species are all `{0,0}`).
- **Next:** R4 in flight — MAIN: remove the rest-offset application at the
  two generated OFF hooks, flip the staged RATTATA pin to `{0,0}`, and
  prove flat settle with a staged OFF dense window (also discharging entry
  894's deferred non-ONIX staged-window check); SIDE: WIN-side compare
  wiring (transplant the LOSS helpers, probe WIN's own
  readyTick/dismissTick, honest accounting vs the banked 241-frame
  fixture). Then wind-down: fold, ONE full union suite, play-preview
  rebuild, session report.
- **Notes:** #71's open remainder after R4 = §1e patch-site retirement +
  coordinated KABUTO/MAGBY/ONIX hand-fit retirements. The rung-3
  dispatcher stays correct-and-consumed on the animation lane's own terms
  (Scene ON); no main-lane consumer exists by real-game design.

