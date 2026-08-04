# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

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

---
## 919 — [bounded MAIN worker, 2026-08-04 ~15:25] ISSUES #71 Slice D found NOT APPLICABLE to the main lane's oracle — no src edits landed, docs-only

- **State:** master `519b6bf8` unchanged + this docs commit. No production
  code touched — the step's own premise didn't survive first contact with
  the oracle, so nothing was landed rather than a fitted/regressing wiring.
  `npm test`/`npm run build` unaffected by this commit (docs only); ran both
  anyway per the finish requirement (see commit message for exact numbers).
- **Did:** before writing render code (per the brief's own instruction to
  validate the anchor first), checked whether Battle Scene OFF — this lane's
  oracle — plays the front send-out per-tick animation at all. It does not.
  Four independent sources converge: (1) `bin/oracle info`'s own bootstrap
  description states outright *"Move/effect and species front-sprite
  entrance animations are skipped by the real game"* under
  `battle-scene-off` (contrast `--profile battle-scene-on`: *"front-sprite
  entrance animations play"*); (2) source
  (`reference/pokeemerald/src/pokemon.c:6803-6852`,
  `DoMonFrontSpriteAnimation`'s `HITMARKER_NO_ANIMATIONS`/`SKIP_FRONT_ANIM`
  branch) never launches the movement task under Scene OFF, set once at
  battle init and never cleared; (3) `drawGeneratedOpponentRelease`'s own
  pre-existing doc comment already says so verbatim ("Battle Scene OFF skips
  the later species front-animation callback"); (4) ISSUES #56's closure
  audit found **zero** front-sprite-movement residual in the two committed
  generated-route Scene-OFF dense windows (YOSHI 700/751, MAGNETON 703/751)
  despite YOSHI/COMBUSKEN's real `ANIM_V_JUMPS_H_JUMPS` family — every
  residual frame there is unrelated (display-tail + idle-menu-bounce).
  Wiring `frontSendOutFrameAtTick`/`frontSendOutSpriteFrameAtTick` into the
  OFF-oracle-compared generated seam would therefore *introduce* mismatches,
  not fix any. A speculative implementation was written to sanity-check this
  live (type widening for the front-pic `frame2` asset + the per-tick call
  site), then reverted (`git checkout`) once the evidence closed — tree was
  never left dirty at a bad commit. `PAPERCUTS.md`'s existing "mechanicLab
  send-out fast-forward silently inert under battle-scene-off" entry asserts
  the opposite ("Real OFF-profile battles DO play send-out anims") and is
  wrong per all four sources above; flagged for a solo session to correct
  since supervised workers don't edit `PAPERCUTS.md`. ISSUES #71 rewritten:
  Slice D closed as not-applicable (full reasoning + citations in place of
  the old "gated on the dispatcher" framing), §1e patch-site retirement +
  the coordinated hand-fit retirements are the only main-lane share left.
- **Next:** #71's main-lane share is down to the §1e 56/58 move-window
  patch-site retirement (separate pair-guard-refactor effort) and the
  coordinated KABUTO/MAGBY/ONIX hand-fit retirement (needs the animation
  lane, not solo). Worth a supervisor look: Slice A (already-landed, applies
  `speciesFrontIdleRestOffset`'s static terminal offset at the generated
  route's `coeff===0`) rests on the same `SKIP_FRONT_ANIM` mechanism this
  entry found — flagged, not touched, since it's a separate already-merged
  decision outside this step's scope.
- **Notes:** the cross-lane ask (`frontSendOutFrameAtTick` +
  `frontSendOutSpriteFrameAtTick`) is real, correct, tested work on the
  animation lane's own terms — it simply has no valid consumer in the main
  lane's OFF-oracle render seams, all of which this same real-game mechanism
  gates off. PAPERCUT: the incorrect PAPERCUTS.md claim cost ~15min to
  chase down and rule out via source+oracle-doc+audit cross-checking before
  the (correct) reversal.
