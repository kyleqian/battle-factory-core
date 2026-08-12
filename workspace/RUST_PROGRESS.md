# Rust lane progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`RUST_PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## R4 — [supervised session, 2026-08-11 night through 2026-08-12] **M5e folded: CheckViability is differential-green through WASM**

- **State:** rust-main = master `07f1aba5` (fast-forward merged at orient;
  main/animation content only) + verified M5e folds `cd97dc59`/`739c4df0`.
  M5's mask, CheckBadMove, and CheckViability surfaces are native and all
  cross the WASM differential harness. Main-tree artifact is 253,683 bytes,
  sha256 `d55486c8…`; Rust **662/662**, CheckViability parity **9/9** in
  both modes, prior WASM parity union **757/757**, smoke **375/375**.
  Start-of-session merged baseline was full npm **993 files / 9,591 passed /
  1 pre-existing skip** + build; the M5e worker's same-commit full npm gate
  was **994 files / 9,600 passed / 1 skip** + build. No open rust deferrals.
- **Did:** supervisor verification on the worker branch before fold:
  scope clean (5 files, all core-rs/), cargo **204/204** + fmt +
  clippy(--all-targets) + wasm build rerun independently, BOTH generators
  rerun byte-identical, 2 vector rows re-derived from the TS module by an
  independent script (inputs reconstructed from pokeemerald headers, not
  the generator): Ninjask stale-weather collision (−8, 0 draws) and
  Lanturn Magnitude 3-draw chain — every rng before/after, randomValue,
  and guessed ability exact. `CBM_HANDLED_EFFECTS_M5B1` = exactly the 32
  batch effects. Post-fold on rust-main: cargo 204/204, artifact rebuilt,
  smoke 375/375. Worker: sonnet, 23.6 min of a 90-min cap, 2 commits.
- **M5b-2 DONE (fold `cc1b07e1`):** all 33 RNG-gated status/stat-DOWN
  effects native (OHKO/Sleep/Roar/Paralyze/Confuse-Swagger-Flatter/
  Toxic-Poison/WillOWisp/LeechSeed/FakeOut, the 14-effect stat-DOWN
  shared-tail family, KnockOff+Trick, Attract full gender matrix,
  Explosion, DreamEater, SpitUp+Swallow) + `computeAiEffectiveness`
  ported once (x0→1 clamp preserved; its table-entry iteration naturally
  avoids dual-same-type double-count, unlike `typeMultiplierTenths`'s
  per-slot loop — asymmetry preserved and tested). Native tests 58→133;
  111 scored + 8 direct-handler TS-generated vector rows
  (gen-cbm-m5b2-vectors.mjs, byte-idempotent). Unported = 44, pinned.
  MAX_CHECK_BAD_MOVE_DRAWS re-verified UNCHANGED at 3 (AttackDown/AccDown
  add 2 handler draws but their movers are all power 0 → negates-type
  never co-occurs; KnockOff hits 3 via negates-type+soundproof+own).
  Worker quirk finding: FIVE M5b-2 effects have zero real Gen-3 moves
  (SPECIAL_ATTACK_DOWN(+_2), SPECIAL_DEFENSE_DOWN, ACCURACY_DOWN_2,
  EVASION_DOWN_2) — one more than the scout's vestigial list; siblings
  exercise their shared arms. Supervisor rerun: scope clean, cargo
  **282/282** + fmt/clippy(--all-targets) + wasm build, all THREE
  generators byte-idempotent, 2 rows re-derived independently (Growl vs
  Marowak 3-draw both-sites chain; Attract vs known-Oblivious −10/0-draw)
  — exact. Post-fold: artifact rebuilt, smoke 375/375. Worker: sonnet,
  30.0 min, 2 commits.
- **M5b-3 DONE (fold `b139100e`) — CheckBadMove is 109/109 native.** All
  44 zero-RNG stat-UP/screens/singles effects;
  `unported_cbm_table_effects()` = `[]`; completeness probe flipped to
  the all-ported arm; `NotYetPorted` barrier stays (honesty analog of
  TS's own dead barrier). Native tests 135→281; 107 scored + 9 direct
  AccUp vector rows (gen-cbm-m5b3-vectors.mjs, byte-idempotent). Both
  same-function pairs (Curse↔BulkUp, PsychUp↔Haze) proven identical
  through the full dispatcher. Port findings worth keeping: (1) dual-stat
  stat-UP composition is ADDITIVE (BulkUp both-maxed = −18, not −10) —
  TS doc phrasing "sequential, no interaction" is easy to misread;
  (2) Snore (power 40) is the ONE M5b-3 move where isMovePowerOther is
  false → negates-type + soundproof both draw (directed vector added);
  (3) hp_percent maxHp=0 guard saturates to i32::MAX — verified faithful:
  both TS uses compare `< threshold`, and Infinity/NaN/i32::MAX all fail
  `<` identically (unreachable input regardless). Supervisor rerun: scope
  clean, cargo **330/330** + fmt/clippy(--all-targets) + wasm build, all
  FOUR generators byte-idempotent, 2 rows re-derived independently
  (Snore ambiguous 2-draw preamble chain; BulkUp both-maxed −18) —
  exact. Post-fold: artifact rebuilt, smoke 375/375. Worker: sonnet,
  21.4 min, 1 commit. Worker PAPERCUT worth adopting as lane practice:
  always verify move ids against moves.json before hand-typing them in
  directed cases — several first-pass guesses were wrong.
- **M5c DONE (fold `570239fc`) — the Factory AI surface is behind the
  differential harness.** 2 additive fw_ exports (ABI v1 unchanged):
  `fw_select_factory_ai_mask` (scalar args in; 28 B ok / 10 B error out,
  all 4 FactoryAiMaskError sites cross as codes) and
  `fw_run_check_bad_move_preamble` (132 B input — rng, move_id,
  RoarTarget 29 + Attacker 29 fields, ~50 optionals presence-preserving
  via per-field flag byte; 105 B scored / 9 B not-yet-ported /
  variable-length error out; unknown-move throw crosses as
  message-matched error, no trap). Layout decision recorded: mirrored
  sequential byte-cursor reader/writer on both sides instead of
  hand-transcribed offset literals (~60 fields = transcription risk);
  offset table still documented in the doc comment. New
  `core-rs/adapter/factoryAiEngine.ts` + `tests/factoryAiMaskParity.test.ts`
  (17) + `tests/factoryAiCheckBadMoveParity.test.ts` (80, incl. 327-case
  seeded sweep across all 109 effects). Supervisor rerun: scope = core-rs
  + exactly the 2 authorized test files, cargo **335/335** + fmt/clippy +
  wasm build, new suites **97/97 in BOTH modes**, existing union 660/660
  in wasm mode, adapter wiring skimmed (wasm path genuinely routes
  through loadFactoryWasm encode/decode — no TS fallback faking parity).
  Worker ran full npm test green (977 files / 9,527 + 1 skip) + build in
  its tree; supervisor full suite on rust-main runs post-fold (doubles
  as the wind-down suite). Worker: sonnet, 33.1 min, 3 commits.
  **Scout correction from the sweep:** 10 (not 5) CBM_TABLE_EFFECTS
  members have zero real Gen-3 moves — the batching doc's §4 list plus
  EVASION_UP_2, EVASION_DOWN_2, SPECIAL_DEFENSE_DOWN, SPECIAL_DEFENSE_UP,
  SPEED_UP (base variants; their _2 siblings do carry moves). Verified
  against moves.json.
- **M5d batching scout folded (`abc54dfd`):**
  `docs/rust-m5d-checkviability-batching.md` — CheckViability (9516
  lines, 122 table effects, TS-side 598/598 complete) partitioned into
  **M5d-0 (preamble+shared infra) then M5d-1..5** (13/29/30/22/28
  effects, sum script-verified) with exact dispatch/handler/test ranges.
  Key scout verdicts, supervisor spot-verified: CV does NOT reuse CBM's
  draw plumbing (zero nextGetAbilityDraw hits — re-implements the
  cascade inline; a TS duplication to preserve, not fix); Flatter
  (M5d-5) calling Confuse (M5d-3) is the ONE cross-batch dependency
  (Swagger rides with Confuse in-batch); CBM's Curse→BulkUp /
  PsychUp→Haze reuse pairs do NOT transfer (independent CV bodies);
  ~half the 90 dispatched handlers have NO ground-truth-doc backing
  (both the module header and factory-ai-checkviability-ground-truth.md
  are stale ~22-handler snapshots) — future workers go straight to
  data/battle_ai_scripts.s. 89/122 EFFECT_* consts already exist in
  factory_ai_check_bad_move.rs. Worker: sonnet, 21.4 min, 1 commit,
  docs-only.
- **Wind-down gates (this tree, supervisor-run, post-M5c):** cargo
  **335/335** + fmt/clippy clean + wasm build, artifact rebuilt, parity
  union (rng+damage+turn+rental+partyMember+aiMask+aiCbm) **757/757 in
  wasm mode** (default mode covered inside the full suite), full npm
  test **977 files / 9,527 passed / 1 pre-existing skip**, npm build
  green, soak **vanilla 20/20 OK** + **full 60/60 OK**. No orphan
  worker worktrees or branches; RUST_DEFERRED.md has no open entries.
- **M5d-0 DONE (fold `19de08f6`):** `factory_ai_check_viability.rs` —
  unified `FactoryAiCheckViabilityBattler` (42 fields, recounted =
  scout), `CheckViabilityDraw` 62 variants over a shared flat
  101-leaf `CvDrawKind` enum (worker recount: **136** distinct TS leaf
  kind strings vs scout's "~85" — documented in-module; several TS
  members union multiple numbered kinds), `next_draw`, CV-specific
  stale-funcResult maps + 3 helpers (ability side reuses CBM's pub fn),
  33 new EFFECT consts appended to CBM's block (spot-verified against
  battle_move_effects.h), CV_TABLE_EFFECTS[122] + probe machinery +
  dispatcher shell with NotYetPorted trailing barrier and zero-score/
  funcResultCarry fallthrough. MAX_CHECK_VIABILITY_DRAWS = 8
  (deliberately conservative; proven single-pass worst case in
  EvasionUp is 7 — M5d-2 re-verifies). **Worker scoping judgment,
  supervisor-verified correct:** Result stays 2 variants
  (Scored/NotYetPorted) — TS's own "unsupported-branch" has exactly ONE
  emission site (the trailing barrier, :7205, dead at 122/122), so
  NotYetPorted IS that variant; the scout's "2 + a 3rd" phrasing was
  confused. 14 native tests + 41 shell vector rows
  (gen-cv-shell-vectors.mjs, byte-idempotent). Supervisor rerun: scope
  clean, cargo **350/350** + fmt/clippy + wasm, generator
  byte-idempotent, funcResultCarry pass-through re-derived from TS
  independently (fallback present→carried, absent→absent; table-effect
  sanity proves shell vectors can't cover them). Post-fold: artifact
  rebuilt, smoke 375/375. Worker: sonnet, 21.6 min, 1 commit.
- **M5d-1 DONE (fold `dfc75027`):** 13 effects (Sleep, SpeedDown+_2,
  SpeedDownFromChance→SpeedDown delegation ported as a call, Toxic+
  LeechSeed, Protect, Pursuit, HighCrit+BlazeKick+PoisonTail, AlwaysHit,
  VitalThrow — the last three are the module's CV-only handlers).
  unported = 109, pinned. 47 native tests (roll seeds FOUND via a
  find_seed search, not hand-picked) + 111 TS-generated vector rows with
  per-draw site/rng/funcResultAfter assertions (gen-cv-m5d1-vectors.mjs,
  byte-idempotent). Worker quirk findings: HighCrit's fallthrough burns
  1-or-2 draws depending on the first roll; AlwaysHit's ScoreUp1 does
  NOT short-circuit (falls into the second roll); Protect's
  EFFECT_ID_IN_WEATHER_RANGE map needed 2 file-local consts (EFFECT_HIT=0,
  EFFECT_POISON_HIT=2) the M5d-0 const inventory missed. Supervisor
  rerun: scope clean, cargo **384/384** + fmt/clippy + wasm, generator
  byte-idempotent, 2 rows re-derived independently (Protect roll-1 +1
  with funcResultAfter=0; Karate Chop vs Ghost immune 2-draw
  fallthrough) — exact. Post-fold: artifact rebuilt, smoke 375/375.
  Worker: sonnet, 29.0 min, 1 commit.
- **M5d-2 DONE (fold `7a035650`):** 29 effects, all three shared-tail
  clusters (run_cv_stat_down, run_cv_attack_style_stat_up,
  run_cv_side_screen_type_gate). unported = 80, pinned. 56 native
  tests + 208 vector rows (gen-cv-m5d2-vectors.mjs, byte-idempotent).
  **EvasionUp worst case proven 7, not 8** (site 1 needs hp≥90, site 8
  needs hp∈[40,70] — disjoint, exhaustively checked 0-100;
  MAX_CHECK_VIABILITY_DRAWS stays 8 per brief). Design note, verified
  behaviorally identical by supervisor re-derivation: TS's one-line
  pass-through wrappers (runCvDefenseDown etc.) collapsed into
  selector-driven shared-tail dispatch. 6 of 29 effects vestigial
  (SPEED_UP, SPECIAL_DEFENSE_UP, SPECIAL_DEFENSE_DOWN base variants +
  EVASION_UP_2/ACCURACY_DOWN_2/EVASION_DOWN_2), live-verified.
  Supervisor rerun: scope clean, cargo **441/441** + fmt/clippy + wasm,
  generator byte-idempotent, 2 rows re-derived independently (Tickle
  through the DefenseDown shared tail −2; Double Team toxic-pair 2-draw
  chain) — exact. Post-fold: artifact rebuilt, smoke 375/375. Worker:
  sonnet, 31.8 min, 2 commits.
- **M5d-3 DONE (fold `1f74ba5c`):** 30 effects (weather trio with
  SunnyDay/Hail sharing weather_setter_cv_score and RainDance's own
  diverging body kept separate; heal family; OHKO as an inline arm;
  SelfKO for Explosion+Memento; SemiInvulnerable 129-line handler;
  Confuse kept pub(crate) for M5d-5's Flatter; Swagger delegates to
  run_cv_confuse; Counter). unported = 50, pinned. ~130 native tests +
  181 vector rows (gen-cv-m5d3-vectors.mjs, byte-idempotent), incl. the
  weather stale-funcResult collision cases exercising M5d-0's maps
  end-to-end. **Port finding, supervisor-confirmed independently:**
  AI_CV_SemiInvulnerable5's tryEncourage tail returns its own fresh
  draws array, silently DROPPING the speed-tie draw's receipt while
  keeping its rng advance (TS :2180-2198; calls 2, draw_count 1,
  surviving ordinal 2) — caught by the differential vectors mid-port,
  replicated bug-for-bug. Supervisor rerun: scope clean, cargo
  **528/528** + fmt/clippy + wasm, generator byte-idempotent, 2 rows
  re-derived independently (Fly tie-draw dropped-receipt; SunnyDay
  stale-fallback carry) — exact. Post-fold: artifact rebuilt, smoke
  375/375. Worker: sonnet, 38.6 min, 1 commit.
- **M5d-4 DONE (fold `5d3f2f1c`):** 22 effects (BrickBreak, shared
  ChargeUpMove ×4, Overheat, Facade, Curse and PsychUp with their OWN
  independent bodies — the CBM reuse shortcuts verifiably don't
  transfer, MirrorCoat 91-line 7-roll handler, DragonDance, BatonPass,
  KnockOff, FocusPunch, Revenge, Superpower, MagicCoat, Foresight,
  Endeavor, Encore, HealBell, Substitute 107-line handler). unported =
  28 (M5d-5's set), pinned; barrier probe moved to EFFECT_TRICK. 74
  native tests + 153 vector rows (gen-cv-m5d4-vectors.mjs,
  byte-idempotent; all 153 matched first-run). Worker findings: Encore's
  EncouragedMovesToEncore = 61 raw effect ids (most have no EFFECT_*
  const here — inline literals with name comments, header-sourced);
  MagicCoat roll site 3 is dead code in the compiled ROM, ported
  faithfully; protect_last_move_effect_func_result is genuinely shared
  by Protect/Encore/Substitute in TS. Supervisor rerun: scope clean,
  cargo **601/601** + fmt/clippy + wasm, generator byte-idempotent, 2
  rows re-derived independently (MirrorCoat low-hp 4-roll chain +3;
  Curse neutral-stage 3-roll +2) — exact. Post-fold: artifact rebuilt,
  smoke 375/375. Worker: sonnet, 29.4 min, 2 commits.
- **M5d-5 DONE (fold `848988d8`) — CheckViability is 122/122 native;
  the M5d program is COMPLETE.** All 28 remaining effects (Trick,
  Snatch 94-line closer, MirrorMove, Haze, the MudSport/WaterSport
  same-function pair proven identical through both arms,
  Flatter→run_cv_confuse cross-batch delegation proven through the
  dispatcher, ChangeSelfAbility's inline ability cascade ported
  bug-for-bug — NOT CBM's plumbing, both vestigial handlers pub(crate)
  + direct-call tested). `unported_cv_table_effects()` = [];
  completeness probe flipped to the all-ported arm; ZERO
  #[allow(dead_code)] attributes remain on Draw variants/kinds; 4
  stale intermediate-state barrier pins updated (the M5b-3 precedent).
  320 native tests + 88 dispatcher + 9 vestigial direct-call vector
  rows (gen-cv-m5d5-vectors.mjs, byte-idempotent). **Port finding,
  supervisor-confirmed live:** run_cv_haze never increments `ordinal`
  between its two draw sites — both draws carry the SAME ordinal label
  while rng advances twice; bug-for-bug. Supervisor rerun: scope clean,
  cargo **662/662** + fmt/clippy + wasm, generator byte-idempotent, 2
  rows re-derived independently (Haze both-blocks repeated-ordinal;
  SkillSwap known-Static 1-draw) — exact. Worker: sonnet, 33.9 min,
  3 commits.
- **M5e DONE (folds `cd97dc59`/`739c4df0`) — CheckViability boundary,
  adapter, and parity.** Additive ABI-v1 `fw_run_check_viability` uses a
  236-byte fixed input prefix plus UTF-8 `reasonPrefix`: two complete
  108-byte, 42-field battlers preserve every optional's presence. The
  variable output preserves final RNG, optional `funcResultAfter`, score,
  and every typed draw receipt. `factoryAiEngine.ts` now has a genuine WASM
  path; `factoryAiCheckViabilityParity.test.ts` has 9 tests, a 122-effect
  census, and 672 runnable seeded cases across 112 source-addressable
  effects. Directed cases pin max-seven draws, stale carry/collisions,
  Haze's repeated ordinal, SemiInvulnerable's dropped receipt with retained
  RNG advance, UTF-8 reasons, and both caller errors. Supervisor reran scope
  audit, cargo **662/662** + fmt/clippy + wasm, new suite **9/9 BOTH modes**,
  prior WASM union **757/757**, post-fold smoke **375/375**. Worker:
  gpt-5.6-terra/max, ~45 min, 2 commits.
- **M5f-1 DONE (folds `eb8df0c4`/`5fdfca2c`) — TryToFaint native.**
  Complete 275-line leaf port in `factory_ai_try_to_faint.rs`; it reuses
  the shared damage/type/RNG modules and exposes DecisionPolicy-ready
  battler/target/input/result structs. Six directed native tests + 93
  TS-executed scored vectors (64 seeded) + 2 exact-error vectors; generator
  rerun byte-identical. Source quirks pinned: per-slot simulated RNG reuse,
  the sole optional x4 draw and >=80 fallthrough +2, Explosion +0, Quick
  Attack +6, strict sibling comparison, power-other behavior, unknown
  sibling zero vs unknown considered panic, and Levitate/Ground loop skip.
  Supervisor re-derived Pound's 19-HP KO and the x4 calls 4→5/ordinal-17
  receipt from TS, then reran cargo **670/670** + fmt/clippy + wasm. Post-fold
  artifact 253,573 bytes (`74b778ce…`), smoke **375/375**. Worker:
  gpt-5.6-terra/max, ~26 min, 2 commits; scope six `core-rs/**` files only.
- **Prior wind-down gates (this tree, supervisor-run):** cargo
  **662/662** + fmt/clippy clean, artifact rebuilt (final hash
  9d53f91e…), parity union (7 suites) **757/757 in wasm mode**, smoke
  375/375. Full npm test **977 files / 9,527 passed / 1 pre-existing
  skip**, npm build, soak **vanilla 20/20** + **full 60/60** were all
  recorded post-M5c this session; every fold after M5c was
  core-rs/-only (plus one rust-lane docs commit), so the TS side is
  bit-identical to those runs. No orphan worker worktrees or branches;
  RUST_DEFERRED.md has no open entries.
- **Next:** M5f-2 — port `factoryAiDecisionPolicy.ts`'s integration layer
  natively, reusing the four landed leaf surfaces. Split mask-zero and scored
  policy only if a fresh bounded scout proves the full 1,402-line module
  cannot land within one worker cap. Then M5f-3 adds the final WASM boundary,
  adapter, and both-mode family parity. Re-check TS conflicts before brief.
- **Notes:** worker moved one M5b-0 test's "still-unported power≤1"
  example pin from Psywave (now handled) to Mean Look — the exact
  staleness pattern the TS doc comment warns about for its own
  generic-barrier pins; M5b-2/3 workers will do the same dance.

---

## R3 — [supervised session, 2026-08-11 eve] **M4 COMPLETE + M5 opened: battle-kernel family end-to-end; AI family scouted and groundwork folded**

- **State:** rust-main = master (merged at orient, fast-forward) + the
  verified M4a fold `30a6da2a`. **M4a DONE:** all 13 exported
  functions/consts of `src/engine/damageCalc.ts` ported in source order to
  `core-rs/crates/factory-core/src/damage_calc.rs` (i32 arithmetic
  matching the C s32 widths, truncation order preserved, the pokemon.c:3371
  unconditional `+2` included), with 9 hand-written native tests (both
  RAM-pinned regressions carried over: Rock Slide 32→48→42, corrected
  Fury Cutter base=4) + 1129 TS-generated vector rows
  (`core-rs/tools/gen-damage-vectors.mjs` → checked-in
  `damage_vectors_gen.rs`, byte-idempotent, regeneration command in
  header). Supervisor verification: scope clean (5 files, all core-rs/),
  cargo **82/82** + fmt/clippy clean + wasm build OK rerun independently,
  generator rerun byte-identical, 2 vector rows re-derived from the TS
  module by hand (directed huge_power + sweep_0), type chart re-checked
  against src/data/gen/type-effectiveness.json (111 rows − 1
  TYPE_FORESIGHT sentinel = 110 embedded). TS-side baseline on this tree:
  full npm test **957 files / 9,153 passed / 1 pre-existing skip**, build
  green.
- **Did:** session opened per docs/rust-m4-battle-kernel-scout.md (user
  decision: battle-kernel leaf family first). Fresh conflict check at
  orient: zero ISSUES.md hits for damageCalc/turnOrder/turnRng; main lane
  is in #55 m4a-audio territory (unrelated namespace), animation lane in
  reducer coverage. M4a worker (sonnet-5, 90-min cap) finished in ~50 min.
- **M4b DONE (fold `45fa9e94`):** 12 new `fw_` exports (ABI v1 unchanged;
  fixed-width documented LE buffers: DamageCalcInput 117 B = 2×48 B
  battlers + 21 B top-level, AccuracyCalcInput 26 B, type-effectiveness
  8 B output); TYPE_EFFECTIVENESS_TABLE promoted out of the vector file
  into `gen_tables.rs` (codegen-owned by gen-data.mjs, sourced from
  type-effectiveness.json) so no 110-row table crosses the ABI; new
  `core-rs/adapter/damageEngine.ts` (TS default / POKEBENCH_ENGINE=wasm
  opt-in, strings→ids TS-side); `tests/damageCalcParity.test.ts` 14
  batched blocks (18×18 type grid, stage grids, ~230 base-damage cases,
  crit/STAB/endeavor/multiplier/accuracy sweeps). Boundary scoping
  decision, documented both sides: `activeBattlerAbilities` (doubles-only
  Plus/Minus field scan) is NOT encodable at this boundary — adapter
  throws if set; the singles default pairing IS the full field, and M4a's
  native hand tests cover the scan. Supervisor rerun: cargo **91/91** +
  fmt/clippy, artifact 68,963 B, damageCalcParity **14/14 in BOTH modes**,
  existing parity files 440/440 in wasm mode, smoke 375/375, both codegen
  scripts byte-idempotent. Worker also ran full npm test green twice
  (958 files / 9,167 passed / 1 skip); supervisor's one full-suite run
  happens at wind-down per the standing cadence.
- **M4c DONE (fold `63d38e65`):** `turn_order.rs` (effective_speed,
  get_who_strikes_first, sort_battlers_by_turn_order; reuses damage_calc's
  STAT_STAGE_RATIOS; ids verified: SWIFT_SWIM=33, CHLOROPHYLL=34,
  MACHO_BRACE=24, QUICK_CLAW=26) + `turn_rng.rs` (7-step/12-call ledger
  over GbaRng, u8-discriminant step enum); gen-turn-vectors.mjs → 204
  checked-in rows + 27 hand-directed native tests; 4 new fw_ exports
  (incl. a self-describing variable-length sort buffer);
  `core-rs/adapter/turnEngine.ts`; `tests/turnOrderParity.test.ts` 206
  tests. Supervisor rerun: cargo **126/126** + fmt/clippy, generator
  byte-idempotent, turnOrderParity 206/206 default mode, full parity
  union **660/660 in wasm mode**, smoke 375/375; Quick Claw
  threshold-boundary pair + speed-tie parity re-derived from the TS
  module by hand.
- **M5 scout folded (`91fcc87e`):** `docs/rust-m5-scout.md` — next family
  is the **Factory AI move-scoring leaves** (maskSelection → CheckBadMove
  → boundary → CheckViability in effect-group batches → TryToFaint +
  DecisionPolicy). factorySwap (state fused with #55-adjacent ball-anim
  presentation), round-policy consumers (= opponent selection, the R2
  exclusion), and draft-screen (no separable state core) all REJECTED
  with receipts. Supervisor re-verified: zero ISSUES/PROGRESS hits for
  factoryAi*, maskSelection imports only the policy JSON.
- **M5a DONE (fold `be53c146`):** `factory_ai_mask.rs`
  (select_factory_ai_mask + receipt, branch id as #[repr(u8)]
  discriminant; policy JSON codegen-validated into gen_tables so the
  no-branch-matched failPolicy is provably unreachable → documented
  .expect(); the 4 RangeError sites ported as FactoryAiMaskError with
  the documented quirk that Rust's u8/u32 inputs exclude TS's
  negative/NaN triggers — upper-bound violations remain) + 529
  TS-generated success vectors + 8 error-site vectors + **MOVES 355-row
  codegen table** (effect ids parsed from battle_move_effects.h, target/
  flag bits from battle.h:46-53 / pokemon.h:208-213). Supervisor rerun:
  cargo **145/145** + fmt/clippy, both generators byte-idempotent,
  FOCUS_PUNCH row cross-checked JSON↔table↔header (effect 170,
  priority −3), tent+brain mask case re-derived from TS by hand.
- **Wind-down gates (this tree, supervisor-run):** cargo **145/145**,
  fmt/clippy clean, artifact rebuilt 80,342 B, parity union
  (rng+damage+turn+rental+partyMember) **660/660 in BOTH engine modes**,
  smoke 375/375, full npm test **959 files / 9,373 passed / 1
  pre-existing skip**, npm build green, soak **vanilla 20/20 OK** +
  **full 60/60 OK**. No orphan worker worktrees or branches;
  RUST_DEFERRED.md has no open entries.
- **M5b batching scout folded (`f7a89ca7`):**
  `docs/rust-m5b-checkbadmove-batching.md` — the CheckBadMove port is now
  a mechanical four-step program: **M5b-0** (preamble + shared infra:
  nextGetAbilityDraw/checkAbilityAiTarget/typeMultiplierTenths +
  completeness-probe machinery + NotYetPorted trailing barrier), then
  **M5b-1** (HighRisk cluster + weather + zero-RNG singles, 32 effects),
  **M5b-2** (RNG-gated status/stat-DOWN, 33 effects, largest), **M5b-3**
  (stat-UP/screens/singles, 44 effects, cheapest) — each with exact
  dispatch/handler/test line ranges, shared-handler clusters kept whole,
  and the module's quirks enumerated (never-caching ability draws,
  abilityDummyVariable collapse, stale-funcResult weather bug,
  computeAiEffectiveness x0→1 clamp, vestigial dispatches needing
  direct-handler tests, CURSE→BulkUp / PSYCH_UP→Haze same-function
  pairs). Supervisor spot-verified handler/clamp line ranges and the
  109 = 32+33+44 partition.
- **M5b-0 DONE (fold `6f4935c8`):**
  `factory_ai_check_bad_move.rs` — 113 EFFECT_* consts verified
  line-by-line against battle_move_effects.h + 13 ABILITY_* consts
  (representation decision: abilities cross numerically, same id space
  as gen_tables::SpeciesRow.abilities); data heads (weather collision
  table, IGNORED_POWERFUL_MOVE_EFFECTS, trapper/negating/soundproof
  sets, ids verified against the JSONs); full Target/Attacker/RoarTarget
  structs (28/29/1 fields — the batching doc's 22/27 counts were stale);
  never-caching next_get_ability_draw + check_ability_ai_target
  (dummy-variable collapse) + type_multiplier_tenths; completeness-probe
  machinery (CBM_TABLE_EFFECTS[109], empty handled union,
  unported_cbm_table_effects, first_move_id_with_effect,
  Result::NotYetPorted trailing barrier); run_check_bad_move_preamble
  (immunity −10, FISSURE/HORN_DRILL short-circuit, 5 ability-negation
  branches, Soundproof, soundproofGuess stale-funcResult exposure). 29
  native tests + 48 TS-generated scored-case vectors
  (gen-cbm-preamble-vectors.mjs, byte-idempotent). **Worker scoping
  correction, verified live:** TS is 109/109 so its preamble never emits
  barrier results — NotYetPorted coverage is native-hand-test-only;
  TS-differential vectors use preamble-exit and non-table-effect flows.
  Supervisor rerun: cargo **175/175** total, fmt/clippy(--all-targets)
  clean, wasm build green, generator byte-identical, EFFECT consts
  spot-checked against the header, type-immunity case re-derived from TS
  by hand (scored −10, rng untouched, 0 draws — exact match).
- **Next:** M5b-1 (HighRisk cluster + weather + zero-RNG singles, 32
  effects), then M5b-2/M5b-3 (independent), per
  docs/rust-m5b-checkbadmove-batching.md — each batch adds its
  CBM_HANDLED_EFFECTS const + handler-direct tests + TS-differential
  vectors (now derivable per batch since handlers exist TS-side), and
  shrinks the pinned unported set. Then M5c boundary+adapter+parity.
  Re-verify scout conflict checks at orient per the standing M4+ rule.
- **Notes (ops):** the two parity suites HARD-FAIL under plain `npm test`
  in a tree whose gitignored `artifacts/wasm/factory_wasm.wasm` is
  present but STALE (absent → skip; stale → 204 failures, seen live this
  session when the R2-era 62,344 B artifact met the M4 suites). Recipe:
  `./core-rs/build-wasm.sh` before any full suite in a supervisor tree —
  exactly what launcher hardening `cfd80cb7` does for main-supervisor
  folds. Artifact hash is reproducible per source state but shifts with
  any factory-core change (M5a moved it despite no fw_ change).
- **Notes:** worker-reported TS quirks worth keeping: (1) Plus/Minus only
  boosts spAttack, never attack (damageCalc.ts:371-376) — dead weight on
  physical moves; (2) CritChanceInput.attackerSpecies declared but never
  read (:492 vs :499-511) — isChansey/isFarfetchd pre-resolve it; not
  ported; (3) Wonder Guard has no row in type-effectiveness.json (out of
  scope per the TS header); (4) the JSON's TYPE_FORESIGHT/TYPE_FORESIGHT
  sentinel row is excluded from the Rust embed (can never match real ids).
  Random sweeps include physically-unreachable flag combos (isBurned
  without hasStatus1) — deliberate: both engines get identical inputs and
  TS treats them as independent booleans.

---

## R2 — [supervised session, 2026-08-11] **M1→M3d landed: ABI, adapter, rental generation AND mon construction differential-green**

- **State:** **M1, M2, and the FULL M3 vertical slice (rental generation
  + mon construction, M3a–M3d) are DONE and folded into rust-main.**
  master merged in at session start; six worker folds, every one
  gate-verified by the supervisor before merging. Wind-down union gates,
  supervisor-run on rust-main: cargo **62/62** + fmt/clippy clean, wasm
  artifact 62,344 B, parity specs **440/440** (77 party-member + 290
  rental + 73 rng) in BOTH default and POKEBENCH_ENGINE=wasm modes, full
  npm test **950 files / 9,123 passed / 1 pre-existing skip**
  (tests/animation/hypnosisEvidence), soak **vanilla 20/20 OK** and
  **full 60/60 OK**. No file under src/ or tools/ was modified all
  session; tests/ gained exactly the three lane-created parity files.
  **M3c (mon-construction data groundwork) is also folded:** codegen
  extended additively (FRONTIER_MONS moves+ev_flags, MOVE_PP 355,
  held-item hold effects, SPECIES 376 rows with base
  stats/gender/abilities/exp@50, NATURE_MODIFIERS) plus stats/gender/
  shiny/EV helper ports — 52 native tests, idempotent, supervisor
  re-verified row samples (LUDICOLO species row + entries[400]
  moves/ev-mask) against the JSON independently. SPECIES is deliberately
  scoped to the 376 frontier-referenced species (25 SPECIES_OLD_UNOWN_*
  rows lack exp entries; check verified: 0 referenced species missing).
  - **M3d:** `create_factory_corpus_party_member`/`_party` ported
    (ability-slot taken from the instance per the TS spec — NOT
    `ability_slot_for_personality`, which is the generation-time
    derivation); `fw_create_factory_party_member` 91-byte documented
    boundary; decoder + `tests/factoryPartyMemberParity.test.ts` — full
    882-set sweep, 72-config variation block, error parity, party
    triple.
  - **M3a:** `core-rs/tools/gen-data.mjs` codegen → checked-in
    `gen_tables.rs` (882 frontier mons, 63 held items, 411
    species-second-ability, 25 natures, round policy), deterministic +
    idempotent (supervisor re-sampled rows 0/400/777/881 against the
    JSON independently); helper ports in `rental_data.rs` with
    TS-pinned tests. Worker added `core-rs/rustfmt.toml`
    (struct_lit_width=80) to keep generated rows one-line.
  - **M3b:** `rental_generation.rs` — faithful port incl. the
    curr_species stateful-retry quirk; `fw_generate_initial_rentals`
    LE-buffer boundary (layout doc'd in factory-wasm);
    `core-rs/adapter/factoryEngine.ts` decoder;
    `tests/factoryRentalParity.test.ts` with the FULL 288-config matrix
    (16 seeds × 3 winStreaks × 3 rentsCounts × 2 construction cursors)
    deep-equal on complete results including the draw ledger, plus
    challenge-8 error parity and the seed-0 fixture anchor. **Port
    finding:** TS deliberately throws on challengeNum 7 + better-range
    fixed IV (the documented retail-OOB non-portability boundary,
    factoryRentalGeneration.ts:184); the port mirrors the error and the
    matrix compares errors symmetrically.
  - **M1 (fold fe40ab19):** fw_ ABI v1 surface (fw_abi_version/
    fw_rng_advance/fw_rng_output/fw_alloc/fw_free), `core-rs/build-wasm.sh`
    → `artifacts/wasm/factory_wasm.wasm` (gitignored), hand-written typed
    Node loader `core-rs/adapter/loadFactoryWasm.ts`, smoke
    `core-rs/adapter/smoke.mts` pinning the wasm rng stream to the
    TS-generated values. One in-territory deviation: narrowly-scoped
    `#[allow(clippy::should_implement_trait)]` on `GbaRng::next` (mirrors
    the TS name deliberately).
  - **M2:** engine adapter `core-rs/adapter/rngEngine.ts` (TS default,
    `POKEBENCH_ENGINE=wasm` opt-in) + `tests/rngEngineParity.test.ts` —
    spec conformance parameterized over both engines, 64-seed ×
    1024-step differential sweep, ABI pin. Artifact-absent worktrees skip
    the wasm half (verified 4 passed/69 skipped); opt-in without the
    artifact hard-fails naming build-wasm.sh. No existing TS file
    modified; tsconfig untouched (adapter enters the tsc program via the
    test's import).
- **Did:** **M1 decision — hand-rolled C ABI; wasm-bindgen declined on
  merits, not necessity.** Receipt: network IS available in this session
  (crates.io CDN probe 2026-08-11: HTTP 200, 184,119 bytes for the
  wasm-bindgen 0.2.92 crate download), so the choice was free. Rationale:
  (a) preserves factory-core/factory-wasm's zero-dependency, fully-offline
  build — a property future sandboxed sessions rely on; (b) avoids the
  wasm-bindgen-cli install and its crate↔CLI version-locking; (c) the data
  crossing the boundary is fixed-width GBA-shaped structs (mons, seeds,
  ids), naturally expressed as documented little-endian byte layouts, not
  rich dynamic types; (d) the JS glue is a small hand-written loader we
  own. **Revisit trigger:** if the boundary ever genuinely needs dynamic
  types (strings/maps/callbacks), reopen the decision with wasm-bindgen as
  the candidate — record here first.
  **ABI conventions v1:** all exports prefixed `fw_`; `fw_abi_version()
  -> u32` (starts at 1, bumps on any breaking layout change); scalars
  cross as u32; structured data crosses as caller-allocated
  length-prefixed LE byte buffers via `fw_alloc(len) -> ptr` /
  `fw_free(ptr, len)`; every layout is documented in factory-wasm doc
  comments and mirrored by the TS-side decoder next to the adapter.
- **Next:** M4 expansion, port by family with the harness deciding
  done-ness. The natural candidates (opponent selection in
  `factoryRoundBattleOrchestrator.ts`, anything near
  `factoryConstructionClock.ts`) are ALL #55-adjacent modules the TS
  lane has open — per the sequencing rule they stay unported until TS
  closes and wires the clock. Conflict-free M4 openers to scout next
  session: `factoryDraftStateAdapter`/draft-screen state, swap-flow
  policy (`factory-round-policy.json` roundFlow), or the battle-kernel
  leaf families (type chart, damage stages) after checking ISSUES.md
  afresh. Keep following the M2/M3 pattern: codegen-data step, then
  port+boundary+parity step. **Resolved by user decision 2026-08-11
  (recorded by the planning session): open M4 with the battle-kernel
  leaf family — see the M4 bullet in RUST_SUPERVISOR.md and
  `docs/rust-m4-battle-kernel-scout.md`.**
- **Notes:** clippy/fmt gates are ON as of M1. Session ops findings:
  (1) the shared OFF oracle at :8014 was killed mid-session by a
  process-group sweep (its log ended mid-line at "listening"); restart
  recipe that survives: spawn `run-oracle.sh --profile battle-scene-off`
  via `python3 subprocess.Popen(..., start_new_session=True)` — plain
  nohup+disown from a tool shell did NOT survive. Rust-lane workers
  never query the oracle; it is only a run-subagent launch precondition.
  (2) A failed launch leaves a dead worker worktree + branch — remove
  exactly that timestamped pair before relaunching. (3) TS quirk
  discovered by the M3b port, worth knowing when reading parity output:
  challengeNum 7 + better-range fixed IV deliberately throws in TS
  (documented retail-OOB boundary, factoryRentalGeneration.ts:184); the
  parity matrix compares errors symmetrically there.
