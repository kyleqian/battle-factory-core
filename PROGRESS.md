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

---
## 491 — [BOUNDED WORKER 2026-07-26 ~23:50] Landed the DefenseUp/SpDefUp DRAW SITE 4/5 chain fix (entry 490's own finding) + whole-surface audit found and fixed a second instance in EvasionUp

- **State:** tree committed and green at **231 test files / 3195 tests**
  (+4 over entry 490's 3191), `npm run build` clean. Census re-run
  byte-identical (92/214 effects, 187/355 moves, 150/276 Factory-L50,
  1884/2957 weighted, all 32 checks pass, `git status --porcelain docs/
  executable-frontier-census.md` empty). `executableFrontierRatchet.test.ts`
  barrier counts unmoved (6/6 green, no new barrier). Three commits: the
  DefenseUp/SpDefUp fix, the EvasionUp fix, and the audit-doc update.
- **Did (RUNG 1):** fixed `runCvDefenseUp`/`runCvSpDefUp`
  (`factoryAiCheckViability.ts`) per entry 490's own sized recommendation:
  DRAW SITE 4's own failure (roll >= 60) no longer applies `-2` on the spot
  — it now chains into a second draw at DRAW SITE 5 (same `<60`-stops
  semantics), and `-2` fires only when BOTH rolls fail (`(196/256)^2 ≈
  58.65%`, not the old single-roll ~76.6%). Corrected both functions' own
  doc comments, which had claimed DRAW SITE 4/5 were "mutually exclusive"
  (the exact claim entry 490's probe disproved). Added three-outcome
  Tier-1 tests for both handlers (pass@4, fail@4+pass@5, fail@4+fail@5).
  **Mask-7 reconciliation (brief's own requested numbers):** the
  `AI_CV_DefenseUp`/`AI_CV_SpDefUp` mask-7 fixture-reproduction tests in
  `factoryAiScoredDecision.test.ts` previously hard-coded **4**
  check-viability draws (the "always 4" derivation entry 490 showed was
  wrong); re-run against the fixed handler at the same seed, all three
  physical-list fixtures now reproduce **7** draws (2+2+1+2 across the 4
  slots: fail+fail, fail+fail, pass, fail+pass) — inside the fixed model's
  own valid `[4,8]` range. This test's own RNG-stream offset is a
  construction convenience, not a replay of the live ROM's frame, so its 7
  does not need to equal the live probe's own 6 number-for-number, and the
  two don't need to reconcile against each other — what reconciles to
  **zero unexplained** is the mechanism itself: every draw count anywhere
  (live probe's 6, this test's 7, the `[4,8]` theoretical range) is now
  fully explained by "each of the 4 slots draws once (passes) or twice
  (fails and chains)," with no residual unattributed component, superseding
  the old comments' "EXACTLY 4" claim.
- **Did (RUNG 2 — whole-surface audit):** mechanically cross-checked all 46
  `if_random_less_than` sites across the 18 dispatched `AI_CV_*` handlers
  (of the file's 144 total) against their literal assembly fall-through,
  full table in `docs/factory-ai-draw-discrepancy-probe.md` §7.2. Found a
  SECOND, independent instance of the identical defect class in
  `AI_CV_EvasionUp`'s Gates C/D (DRAW SITE 3/4, `:1048-1050`) — ported
  (entry 489) as two mutually-exclusive single-draw sites keyed on the
  opponent's own HP band, but the real assembly chains DRAW SITE 3's own
  failure (roll >= 80, reached only when target is toxic-poisoned AND own
  HP <= 50%) straight into DRAW SITE 4's own roll, byte-for-byte the same
  shape as DefenseUp's bug. This is exactly the brief's own predicted
  highest-risk shape: `AI_CV_EvasionUp`'s one banked live fixture (§24.3)
  never sets target toxic-poison status, so it could never have exercised
  this branch at all — a fixture gap, not a probe gap, only findable by
  reading the assembly. Fixed the same way (chain + three-outcome tests:
  pass@3, fail@3+pass@4, fail@3+fail@4); the direct `own HP > 50%` entry to
  DRAW SITE 4 alone (unaffected, not part of the chain) stays as-is. Every
  OTHER site across all 18 handlers confirmed OK: either a self-contained
  deterministic `score`/`goto` action, or an already-correctly-modeled
  chain (`AI_CV_HighCrit`, `AI_CV_VitalThrow`, both already used the
  `jumpedToEnd`/fallthrough-roll pattern this step's fixes now also use).
  Confirmed the CBM side is genuinely if_random-free (`grep -c
  if_random_less_than` over `AI_CheckBadMove`'s own `:51-651` range = 0) —
  trivially clean of this defect class as the brief predicted, verified not
  assumed.
- **Next:** entry 490's own carried Next list stands, minus the item this
  step closed: weather trio (RainDance/SunnyDay/Hail, §25, last 3 of 22 CV
  handlers, explicitly out of THIS step's scope); §19.5's unstaged
  AccuracyDown sites 2-6 (now confirmed structurally safe by this step's
  audit — no chain risk there, just never independently live-verified);
  §24's own newly-surfaced follow-up from §7.4: a live oracle fixture for
  `AI_CV_EvasionUp`'s toxic-poisoned + own-HP<=50% branch does not exist
  yet in `tools/battle-lab/` — building one and rerunning §2's own
  `attribute-factory-ai-cv-drawsite-callers.py` probe (parameterized by
  `DRAW_SITE_TABLE`) against it would give this fix the same live
  corroboration `DefenseUp`/`SpDefUp` already have, but wasn't in this
  step's scope or time budget; ENDTURN_ITEMS2 after Yawn/Thrash.
- **Notes:** no PAPERCUT. Time split roughly matched the brief's guidance —
  rung 1 (fix + tests + reconciliation) landed at ~30min elapsed, leaving
  enough room to run the full rung-2 audit (not just a partial table with a
  named remainder) and land its own fix + tests green, with the doc/
  PROGRESS writeup absorbing the reserved tail.

