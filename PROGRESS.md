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

---
## 494 — [BOUNDED WORKER 2026-07-27 ~01:15] Yawn Rung 1 landed (SETYAWN + JUMPIFABILITY widening) — plus a real accuracycheck gap the design doc's own census missed

- **State:** tree green at **232 files / 3276 tests** (+9 over entry 493's
  3267), `npm run build` clean. Census: 93/214 effects (+1), 188/355 moves
  (+1), 151/276 Factory-L50 unweighted (+1), 1894/2957 weighted (**+10, not
  the design doc's ~14** — see below), all 32 checks pass.
  `executableFrontierRatchet.test.ts`: **`battleScriptHitChainOpcode.ts`
  barrier pin moved 22→23, named and justified in the ratchet's own comment**
  — a real widening (8 of 11 non-`ACC_CURR_MOVE` `accuracycheck` sites now
  execute instead of halting) that adds exactly one new named barrier
  (`STATUS3_ALWAYS_HITS`/Lock-On, mirroring the existing `ACC_CURR_MOVE`
  branch's identical barrier, provably unreachable today).
- **Did:** landed `docs/yawn-thrash-endturn-design.md` Rung 1 exactly as
  scoped — new `battleScriptSetyawnOpcode.ts` (`Cmd_setyawn`,
  `battle_script_commands.c:9352-9364`, two-branch jump on
  `STATUS3_YAWN|status1` gate, writes `STATUS3_YAWN_TURN(2)`), two new
  `BATTLE_SCRIPT_STATUS3_YAWN`/`_TURN_2` constants, and widened
  `JUMPIFABILITY_VALUES` (`battleScriptIngrainLeechSeedWrapOpcode.ts`) with
  `ABILITY_VITAL_SPIRIT`(72)/`ABILITY_INSOMNIA`(15). No (b) barrier material
  needed for either, confirming the doc's own claim.
- **CONFIRM-OR-CORRECT finding (real, not assumed):** the doc's own §0 opcode
  census marked `accuracycheck BattleScript_ButItFailed,
  NO_ACC_CALC_CHECK_LOCK_ON` — Yawn's own accuracy check — "`[registered]`"
  because `B_SCR_OP_ACCURACYCHECK` has a dispatch entry, but that entry was
  narrowed to ONLY the `ACC_CURR_MOVE` operand form; the `NO_ACC_CALC_CHECK_
  LOCK_ON` literal (a completely different source branch, `battle_script_
  commands.c:1103-1113`, that skips the `Random()` accuracy roll entirely)
  hit `unsupportedBranch` every time — confirmed live via a debug run before
  writing any fix. This would have blocked Rung 1's own pass-through test
  outright, so it was in-scope to fix, not deferred: added
  `accuracycheckNoAccCalcCheckLockOn` (sure-hit Lock-On barrier reusing the
  `ACC_CURR_MOVE` branch's own precedent; semi-invulnerable bare-jump miss;
  `JumpIfMoveAffectedByProtect(0)`'s Protect gate, which reads `gCurrentMove`
  for its flag check despite the literal `0` argument). Net effect: **Yawn's
  own move-use side draws ZERO `Random()` calls** (not 1, as I first assumed
  by analogy to Thunder Wave's `ACC_CURR_MOVE` accuracy roll) — this actually
  matches, not contradicts, the design doc's own §2 remark that end-turn's
  sleep-turn roll is "the only `Random()` in end-turn" for the whole Yawn
  mechanic. 7 of the 8 `NO_ACC_CALC_CHECK_LOCK_ON` sites besides Yawn's own
  remain barriered behind their own separate unregistered opcodes (Roar,
  OHKO, Mimic, Pain Split, Curse, Role Play, Skill Swap) — this fix only
  widens the shared opcode's operand-form dispatch, it doesn't newly unblock
  any of those scripts end-to-end.
- **Second finding, in the census refresh itself:** the doc's §1c "14 unique
  Factory L50 carrier species" for `MOVE_YAWN` was counted against the raw
  882-entry `battle-frontier-mons.json` catalog with no tier filter. The
  census's own weighted metric restricts to `factory-round-policy.json`'s
  `rentalSelection.ranges.level50` (a union of real `GetFactoryMonId` rank
  bands, effectively indices 110-849 of the 882) — 6 of the doc's 14 species
  (WOOPER, TOGEPI, SLUGMA, SLAKOTH, **GULPIN**, SLOWPOKE, all at catalog
  indices <110) fall outside every modeled Level-50 rental-rank band, leaving
  8 species / 10 catalog entries (WARTORTLE, TOGETIC, WALREIN, SLAKING ×3,
  QUAGSIRE, SLOWBRO, SLOWKING, URSARING) — exactly the census's own
  precomputed `frontierMonCount:10, speciesCount:8` for `MOVE_YAWN`, and
  exactly the +10 observed. GULPIN (the brief's own suggested live-fixture
  species) is one of the excluded six — the live fixture below still proves
  the mechanic correctly (mechanicLab's `overrides.parties` explicitly
  permits any species regardless of real rental-draft legality), it just
  isn't itself evidence of a Level-50-legal encounter; QUAGSIRE or
  SLOWBRO/SLOWKING would be if that distinction mattered for a future step.
- **Tests (+9):** `tests/battleScriptSetyawnOpcode.test.ts` (new, 5): sets
  `STATUS3_YAWN_TURN(2)` on ordinary landing (zero RNG) / no-ops (fails) when
  already yawning or status1-nonzero / `ButItFailed` via `jumpifability` for
  both Vital Spirit and Insomnia, ahead of `setyawn` ever running.
  `tests/battleScriptHitChainOpcode.test.ts` (+4, new `NO_ACC_CALC_CHECK_
  LOCK_ON` describe block via `BattleScript_EffectRoar`'s own instance, kept
  opcode-generic rather than Yawn-specific): ordinary advance (zero RNG),
  Protect gate (MISSED+B_MSG_PROTECTED), semi-invulnerable bare-jump miss,
  STATUS3_ALWAYS_HITS barrier. Fixed one now-stale barrier-count test in the
  same file (its `.find()` for "any non-ACC_CURR_MOVE site" now finds a
  newly-supported one first; narrowed to the still-genuinely-unsupported
  subset, corrected its stale "9 sites" count to the real 11).
- **Live fixture (`tools/battle-lab/mechanic-yawn-landing-off.json`, GULPIN
  vs MAGIKARP filler, `bin/oracle lab`):** opponent `status3` observed
  **0 → 4096 (0x1000, `STATUS3_YAWN_TURN(2)`) → 2048 (0x800,
  `STATUS3_YAWN_TURN(1)`)** across frames 160/180/300/320 — the middle value
  is Cmd_setyawn's own write, byte-for-byte my `BATTLE_SCRIPT_STATUS3_YAWN_
  TURN_2` constant; the drop to 2048 by frame 320 is the REAL ROM's own
  `ENDTURN_YAWN` decrement already firing once (Rung 2, not yet built in
  this engine) — free live corroboration of Rung 2's own decrement math
  ahead of landing it. Frame 180 screenshot: "GULPIN used YAWN!"; frame 300:
  status3 still 4096 (pre-decrement). Second fixture
  (`mechanic-yawn-vitalspirit-blocked-off.json`, opponent MANKEY,
  ability 72/Vital Spirit): `status3` stays **0** the whole trace; frame 300
  screenshot: "Foe MANKEY's VITAL SPIRIT made it ineffective!" — confirms the
  `ButItFailed` branch live, satisfying the brief's "if stageable in-cap"
  ask (it was).
- **Next:** Rung 2 (`ENDTURN_YAWN` end-turn case, `runYawnTick` in
  `battleEndTurnOrchestration.ts`) is fully scoped by the design doc and
  partially de-risked by this session's own findings: `cancelBattleScript
  MultiTurnMoves` (the doc assumed this needed building) **already exists**
  (`battleScriptMultiTurnCancellation.ts`, used by `battleScriptAction
  Admission.ts`) — Rung 2 can call it directly, no new helper needed. The
  `UproarWakeUpCheck`-omission citation was re-verified this session
  (`STATUS2_UPROAR`/`MOVE_EFFECT_UPROAR` are never set by any production
  code — confirmed by grep, not assumed) and holds. Not started this session
  (time went to the accuracycheck fix + two live fixtures instead) — next
  worker can start directly from `docs/yawn-thrash-endturn-design.md` §2/
  Rung 2 plus this entry's own de-risking notes.
- **Notes:** no PAPERCUT. Ratchet moved deliberately (named above); census
  pins moved deliberately (named above, both effect/move counts and the
  weighted-delta shortfall explanation). Spent more of the time budget than
  planned on the accuracycheck gap and the tier-filter cross-check, so Rung 2
  is banked as the next step rather than rushed — per the brief's own
  time-split allowance ("Rung 1 alone is a complete, committable step").

---
## 493 — [BOUNDED WORKER 2026-07-27 ~00:45] AI_CV_SpeedDownFromChance ported — genuine 22/22 CV handlers now, closing the §14-§25 program

- **State:** tree committed and green at **231 files / 3267 tests** (+23 over
  entry 492's 3244), `npm run build` clean. Census re-run byte-identical
  (92/214 effects, 187/355 moves, 150/276 Factory-L50, 1884/2957 weighted,
  all 32 checks pass, `git status --porcelain docs/executable-frontier-
  census.md` empty — AI-decision subsystem, not effect-execution).
  `executableFrontierRatchet.test.ts` unmoved (6/6 green, no new barrier).
- **CONFIRM-OR-CORRECT (per brief):** `EFFECT_SPEED_DOWN_HIT` had **no**
  dispatch entry in `factoryAiCheckViability.ts` — it sat only in
  `AI_CHECK_VIABILITY_TABLE_EFFECTS`'s barriered set (confirmed by grep),
  i.e. it hit the `"factory-ai-check-viability"` unsupported-branch barrier
  for every one of its 6 moves before this session. Also checked whether the
  brief's own framing ("§6's ledger was staged VIA this handler's
  ICY_WIND/ROCK_TOMB/MUD_SHOT path") was accurate: **it was not** — inspected
  `tools/battle-lab/mechanic-factory-ai-cv-speeddown-opponent-{faster,
  slower}-off.json` directly; both dispatch move ID 81 (`MOVE_STRING_SHOT`,
  `EFFECT_SPEED_DOWN`, a DIRECT dispatch to the already-ported
  `AI_CV_SpeedDown`), not any of `SpeedDownFromChance`'s 6 covered moves.
  §10's *recommendation* (stage a future fixture via ICY_WIND to avoid a CBM
  dependency) got conflated with what §6 actually staged. Net effect: no
  existing fixture/test exercised this handler's own code before this
  session, and none of §6's two banked fixtures do even now — flagged below.
- **Did:** re-derived the handler body from the raw assembly, not the doc's
  gloss (`reference/pokeemerald/data/battle_ai_scripts.s:1136-1141`): a
  plain `if_move` literal-ID compare (`Cmd_if_move`, zero `if_random_less_
  than` sites of its own) against 3 of its 6 covered moves
  (`MOVE_ICY_WIND`/`MOVE_ROCK_TOMB`/`MOVE_MUD_SHOT`) that `goto`s straight
  into `AI_CV_SpeedDown`'s own label; the other 3
  (`MOVE_BUBBLE_BEAM`/`MOVE_CONSTRICT`/`MOVE_BUBBLE`) fall through to `end`
  (genuine zero). Cross-checked against move data: the 3 redirecting moves
  all carry `secondaryEffectChance: 100`, the 3 falling through all carry
  `secondaryEffectChance: 10` — confirms "FromChance" names the in-game move
  *category*, not anything the handler itself reads; it never inspects a
  chance datum, only the literal move ID. `factoryAiCheckViability.ts`:
  added `runCvSpeedDownFromChance` — calls `runCvSpeedDown(input)` directly
  for the 3 redirect moves (no duplicated gate/roll logic, per brief), else
  returns zero score/zero draws — and wired `EFFECT_SPEED_DOWN_HIT` to it in
  `runCheckViability`, ahead of the barrier check. **No new input field
  needed** in `FactoryAiCheckViabilityBattler`/`FactoryAiScoredBattlerView`/
  `factoryAiDecisionPolicy.ts` (confirmed by grep): `moveId` was already
  plumbed through the one production construction site for the
  `MOVES_BY_ID` lookup every handler dispatch uses. Corrected two stale
  doc-comments while in the area: this file's own top-of-file comment
  ("except five, dispatched before that barrier check" — already stale
  before this session, long past five) now cites the doc's §5 table instead
  of a numeral that always drifts; `factoryAiCheckBadMove.ts`'s top comment
  wrongly claimed the weather-trio session already "completes all 22
  reachable `AI_CV_*` handlers" (it completed the 12th and last CBM-blocked
  *pair*; `SpeedDownFromChance` is CV-only-reachable, no CBM counterpart,
  and is the actual 22nd/last — landed this session).
- **Tests:** `tests/factoryAiCheckViability.test.ts` 253→273 (+20): both
  redirect branches (deterministic -3 / probabilistic 0 or +2) × all 3
  redirecting moves, the shared speed-tie quirk, both fall-through branches
  × all 3 non-redirecting moves (zero score/draws regardless of relative
  speed), and a redirect-equivalence check (Icy Wind's post-gate result is
  byte-identical to `MOVE_STRING_SHOT`'s own direct `EFFECT_SPEED_DOWN`
  dispatch, same rng/battlers, across all 3 branch shapes).
  `tests/factoryAiScoredDecision.test.ts` 106→109 (+3): real mask-7
  dispatcher (`chooseFactoryAiScoredDecision`) end-to-end coverage of the
  new `EFFECT_SPEED_DOWN_HIT` wiring (Icy Wind redirect, both speed
  directions; Bubblebeam fall-through, both directions), scoped to the
  check-viability phase's own draws/delta rather than total draw counts
  (Icy Wind is a real 55-power move whose Ice-vs-Ground/Ground matchup can
  also engage `AI_TryToFaint`'s own orthogonal x4-effective gate). **Named
  gap, explicitly flagged in-file:** no live-oracle fixture exists for any
  of `SpeedDownFromChance`'s 6 moves (checked `tools/battle-lab/` — none
  named `speeddownfromchance*`), and creating one was out of this step's
  scope (`tools/battle-lab` fixtures are read-only per the brief) — the
  mask-7 coverage above is real dispatcher coverage, not a banked live
  ledger the way §6's own two fixtures are. Ran §6's two existing fixture-
  reproduction tests as a regression check only (still green, confirming
  the new dispatch branch didn't disturb `EFFECT_SPEED_DOWN`'s neighboring
  direct-dispatch path) — they do not newly cover this handler.
- **Recount vs the doc's own §5 table: 22/22, true this time.** All 22
  reachable `AI_CV_*` handlers named in
  `docs/factory-ai-checkviability-ground-truth.md` §5 now have a dispatch
  entry in `factoryAiCheckViability.ts`. This does **not** mean the whole
  `AI_CheckViability` script is ported — §5's 22 are the subset with ≥1
  currently-executable triggering move; ~68 more handlers exist in the full
  90-handler dispatch table (doc §0 item 2, audit §3) and remain barriered,
  a separate uncounted phase.
- **Next:** the §14-§25 program (all 22 reachable CV handlers) is complete;
  no further `AI_CV_*` work is scoped by that doc. Carried from entry 492:
  §19.5's unstaged `AccuracyDown` sites 2-6; §24's own follow-up (a live
  oracle fixture for `AI_CV_EvasionUp`'s toxic-poisoned + own-HP<=50%
  branch); §25.6's 4 not-staged-live items (Swift Swim bypass, Rain Dish
  tail, the `<40%` HP-gate branch, `get_weather`'s `AI_WEATHER_NONE`
  stale-read bug — all covered by Tier-1 tests, none live-oracle-verified);
  a new one from this session: a live-oracle fixture for
  `AI_CV_SpeedDownFromChance` itself (ICY_WIND-redirect and BUBBLE_BEAM-
  fall-through variants, Dugtrio/Shuckle-shaped like §6's own) would upgrade
  this step's mask-7 pipeline coverage to a banked ledger — fixture
  authoring is side-lane/out-of-this-lane's-current-scope work, not main's;
  ENDTURN_ITEMS2 after Yawn/Thrash remains the next MAIN-lane program item.
- **Notes:** no PAPERCUT. Landed well inside the cap, as briefed (smallest
  port of the program) — spent the saved time on the confirm-or-correct
  (the brief's own §6-staging claim didn't hold up) and on closing two
  stale doc-comments discovered while reading the surrounding code, rather
  than leaving them to compound.

---
## 492 — [BOUNDED WORKER 2026-07-27 ~00:15] §25 weather-trio CBM+CV pair ported (RainDance/SunnyDay/Hail) — 21/22 CV handlers now ported, NOT 22/22 (one real handler remains, see Next)

- **State:** tree committed and green at **231 files / 3244 tests** (+49
  over entry 491's 3195), `npm run build` clean. Census re-run
  byte-identical (92/214 effects, 187/355 moves, 150/276 Factory-L50,
  1884/2957 weighted, all 32 checks pass, `git status --porcelain docs/
  executable-frontier-census.md` empty — AI-decision subsystem, not
  effect-execution). `executableFrontierRatchet.test.ts` barrier counts
  unmoved (6/6 green, no new barrier). Three commits: CBM trio + wiring +
  CBM tests; CV handler bodies (already included in the first commit); CV
  handler-level tests; mask-7 fixture-reproduction tests.
- **Did:** landed §25's full six-handler weather trio per its ground truth
  (`docs/factory-ai-checkviability-ground-truth.md` §25, supervisor-verified
  live). (1) `factoryAiCheckBadMove.ts`: `runCbmRainDance`/`SunnyDay`/`Hail`
  — §25.1 confirmed all three are three SEPARATELY NAMED dispatch targets
  (not a shared handler, correcting §5's own "shared handler" guess) but
  byte-for-byte identical 3-instruction bodies (`get_weather; if_equal <OWN
  AI_WEATHER_*>, Score_Minus8; end`) — one parameterized helper covers all
  three. Added `AI_WEATHER_SUN/RAIN/SANDSTORM/HAIL` constants + `AiWeatherValue`
  type (0-3, the AI's OWN `get_weather` encoding, NOT `gBattleWeather`'s raw
  bits — a distinct existing `rulesContext.weather` field elsewhere in the
  engine uses the raw-bit encoding, confirmed by grep before assuming §5.4's
  "already landed" claim; it hadn't, for this subsystem) and optional
  `currentWeather?: AiWeatherValue` to `FactoryAiCheckBadMoveAttacker`, `undefined`
  defaulting to "no weather bit set" (never equals any of the four
  constants, so it never fires any handler's gate either way — the pinned
  ROM's own `AI_WEATHER_NONE` stale-read bug, §25.1, is real but NOT
  reachable by any of this step's staged/tested flows, so it is not modeled
  or cited beyond this note per the brief's own citation instruction). (2)
  `factoryAiCheckViability.ts`: `runCvSunnyDay`/`runCvHail` share a
  `weatherSetterCvScore` helper (HP<40%→-1, else weather in the "other
  three" real values→+1, else 0 — zero `if_random_less_than`, confirmed
  independently from the raw assembly per §25.2, NOT assumed identical
  siblings). `runCvRainDance` is genuinely bespoke (7 conditional
  instructions vs the twins' 4, §25.2/§25.8): Gate P (`if_user_faster`,
  reusing the SAME `getWhoStrikesFirst`/tie-break-`Random()` machinery
  `AI_CV_SpeedDown`'s own `target-faster-tie` already ports, inverse
  comparison target — a new `"user-faster-tie"` draw kind) → Gate S (own
  ability == Swift Swim bypass, +1, skips HP/weather entirely) → the SAME
  `weatherSetterCvScore` span → Gate R tail (own ability == Rain Dish, +1,
  only reached when the span falls all the way through). Added `ability?:
  string` (AI_USER's own real ability, direct field read — the FIRST
  handler in this doc needing the attacker's own real ability, distinct
  from the target-guessing `ability`/`knownAbility` pair every prior
  handler used) and `currentWeather?` to `FactoryAiCheckViabilityBattler`.
  (3) `factoryAiDecisionPolicy.ts`: wired both new optional fields through
  `FactoryAiScoredBattlerView` (attacker-side only — both CBM and CV read
  the same `view.attacker.currentWeather`/`.ability`). **Construction-site
  grep performed** (`FactoryAiCheckBadMoveTarget\|Attacker` construction +
  `runCheckViability(`/`runCheckBadMovePreamble(` call sites across `src/`):
  confirms `factoryAiDecisionPolicy.ts` remains the ONLY production
  construction site for both extended input types, both fully wired — no
  repeat of entry 483's gap. (4) Tests: 114 CBM tests (+10: own-weather/
  cross-weather/omitted-weather per handler, cross-handler byte-identity
  parity), 253 CV tests (+37: SunnyDay/Hail's shared span per HP boundary +
  each "other three" value + own-weather exclusion; RainDance's Gate P
  including both the deterministic and hidden-tie-break-draw cases at the
  SAME seeds `AI_CV_SpeedDown`'s own tie tests use, Gate S, Gate H/weather
  span, Gate R), 106 mask-7 tests (+12: ALL SIX §25 fixtures — raindance/
  sunnyday/hail × cbmreach/cvreach, 2 seeds each — reproducing the doc's own
  pick-based design: `cbmreach` nets -8/0, AI picks a Growl slot, never slot
  0; `cvreach` nets 0/+1, AI always picks slot 0, no tie; policy-own draws
  reconcile to a clean 5 in all twelve cases — setup(4)+CBM(0, single-ability
  Shuckle target)+TryToFaint(0, all 0-power moves)+CV(0, deterministic span
  + zero-draw AttackDown control)+tie(1) — with zero residual, since §25.4's
  own design deliberately abandoned the draw-count channel for this section,
  so there is no live draw-count window to reconcile against beyond
  confirming the mechanism draws nothing extra).
- **CORRECTION to the brief's own "22/22 if true" framing — it is NOT true:**
  re-derived the count from the ground truth doc's own master table (§5,
  "all 22 reachable handlers") rather than trusting the brief's phrasing.
  21 of 22 are now ported; **`AI_CV_SpeedDownFromChance` (`EFFECT_SPEED_DOWN_HIT`,
  `data/battle_ai_scripts.s:1136-1141`) is the one that remains** — confirmed
  by grep, `EFFECT_SPEED_DOWN_HIT` sits only in `AI_CHECK_VIABILITY_TABLE_
  EFFECTS`'s barriered set, no dispatch entry exists. It was never in this
  step's scope (§25 is the weather trio only) and was already correctly
  flagged as future work in doc §10/§4 — this entry just makes the exact gap
  explicit rather than letting "last 3 of 22" language get misread as "then
  we're done." Per the doc's own footnote (§4/§5.216-229): it's CBM-free (no
  paired `AI_CBM_*` handler needed, 0 `if_random` of its own) and literally
  forwards 3 of its 6 covered moves (`MOVE_ICY_WIND`/`MOVE_ROCK_TOMB`/
  `MOVE_MUD_SHOT`, matched by exact `if_move` ID) into the ALREADY-PORTED
  `runCvSpeedDown`'s own body verbatim; the other 3 (`MOVE_BUBBLEBEAM`/
  `MOVE_CONSTRICT`/`MOVE_BUBBLE`) fall through to a deterministic zero. This
  is a small, well-scoped follow-up (an `if_move`-keyed redirect wrapping
  the existing handler, not new handler logic) — a strong next-step
  candidate given how little new code it needs.
- **Next:** `AI_CV_SpeedDownFromChance` (`EFFECT_SPEED_DOWN_HIT`) closes the
  true 22/22 — small, CBM-free, redirects into the already-ported
  `runCvSpeedDown` (see above). Otherwise entry 491's own carried Next list
  stands: §19.5's unstaged AccuracyDown sites 2-6; §24's own follow-up from
  §7.4 (a live oracle fixture for `AI_CV_EvasionUp`'s toxic-poisoned +
  own-HP<=50% branch); §25.6's own 4 not-staged-live items (Swift Swim
  bypass, Rain Dish tail, the `<40%` HP-gate branch, `get_weather`'s own
  `AI_WEATHER_NONE` stale-read bug — all recipe-only per the doc, all now
  covered by this entry's own Tier-1 handler-level tests even though not
  live-oracle-verified); ENDTURN_ITEMS2 after Yawn/Thrash.
- **Notes:** no PAPERCUT. Time split beat the brief's own guidance: all
  three rungs (CBM trio, CV SunnyDay+Hail+RainDance together, mask-7
  fixtures) landed green well inside the 40-minute mark, each as its own
  commit, leaving room to re-derive the handler count from the doc's master
  table instead of trusting the brief's own "22/22 if true" framing at face
  value — worth the time given the brief explicitly asked for a
  confirm-or-correct, and the correction is real (see above).

