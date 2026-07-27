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

---
## 490 — [BOUNDED WORKER 2026-07-26 ~23:45] §18/§22 "5-6 draws not 4" anomaly SOLVED by instrument — real engine gap found, not fixed (probe-only step)

- **State:** tree committed and green at **231 files / 3191 tests** (unchanged
  from entry 489 — this was an INSTRUMENT/PROBE step, no `src/` edits per
  scope), `npm run build` clean. Two new files only: `tools/probe/attribute-
  factory-ai-cv-drawsite-callers.py` and `docs/factory-ai-draw-discrepancy-
  probe.md` (does NOT edit `docs/factory-ai-checkviability-ground-truth.md`,
  side-owned this round, per brief).
- **Did:** attributed, by exact caller, the recurring "5-6 draws where the
  branch derivation predicts 4" anomaly first flagged at §18.4
  (`AI_CV_DefenseUp`) and recurring at §22.3-22.4 (`AI_CV_SpDefUp`).
  **Verdict: real engine port gap, not noise, not outside the AI-decision
  subsystem.** Extended the precedent probe
  (`attribute-factory-ai-random-callers.py`) with a second disambiguator:
  `gAIScriptPtr` (`battle_ai_script_commands.c:154`, EWRAM `0x0203ab38`)
  still points at the *start* of the firing `if_random_less_than`
  instruction at the moment `Random()` is entered (`Cmd_if_random_less_than`
  only advances it after the call returns) — reading it alongside the
  existing `cpu.lr` read resolves *which* of the AI script's 144
  `if_random_less_than` sites fired, closing the gap the old probe couldn't
  (its own caller resolution bottoms out at the one shared C function every
  site returns through). Root cause, confirmed BOTH by a raw ROM byte
  disassembly (`arm-none-eabi-nm` label addresses + manual opcode decode
  against `sBattleAICmdTable`) AND live single-step instrument evidence (5
  fixture runs, all `PASS`, all fully reconciled): `AI_CV_DefenseUp`'s DRAW
  SITE 4 (`if_random_less_than 60, ...End`, `:936`) does not cleanly
  terminate on failure — its fall-through target (`+6` bytes) is DRAW SITE
  5's *own* instruction (`:938`), byte-for-byte identical for `AI_CV_SpDefUp`
  (`:1011`/`:1013`). Reaching this branch means 1 draw (23.4%, site4
  succeeds) or 2 draws (76.6%, site4 fails and chains into site5) **per
  move-slot invocation** — 4 identical slots × 1-or-2 draws explains the
  5-8 realized range exactly (doc's observed 5-6/13-14 are ordinary draws
  from this distribution, not a second anomaly). Confirmed the ported
  `runCvDefenseUp`/`runCvSpDefUp` (`factoryAiCheckViability.ts:1528-1534`,
  `:1664-1670`) both draw once at DRAW SITE 4 and return unconditionally —
  missing the chain into DRAW SITE 5. This is a real behavioral gap, not
  cosmetic: under-draws `Random()` by 1 whenever site4 fails (~76.6% of the
  time reached), AND over-applies the -2 score penalty (port's ~76.6% vs
  the real ROM's ~58.65%, since BOTH rolls must fail for the penalty, not
  just the first) — a close-score tie could flip which move Factory AI
  picks. Sized the exact fix shape in the new doc §5 (shared-helper chain,
  matching both handlers' near-identical bodies) but did NOT implement it
  or touch the Tier-1 tests that currently pin the wrong "always 4" derived
  count — out of scope this step, flagged as next-step work. 5 live probe
  runs this session (all seed 1, window `0 732`, oracle `127.0.0.1:8014`):
  `defenseup-physicallastmove` (14 total, 6 handler draws, 4×site4+2×site5),
  `defenseup-lowhp-control` (14 total, same split, second independent
  fixture), `defenseup-nonphysicallastmove` (8 total, **0** handler draws —
  negative control, Gate F routes away entirely, confirms the probe doesn't
  fabricate a draw), `spdefup-cosmicpower-reach` (14 total, same 4×site4+2×
  site5 split, confirms the SAME shape on the second handler, not just
  derived by analogy), `spdefup-cosmicpower-control` (8 total, 0 handler
  draws, negative control mirrors DefenseUp's). All `known-outside`/
  `hit-chain-proc` caller composition matches §18.4's/§22.4's own prior
  (coarser) tables exactly — this doesn't contradict the old probe, it
  resolves what its shared-LR bucket actually was.
- **Next:** the sized fix from doc §5 — replace both handlers' single-draw
  DRAW SITE 4 block with the real draw4→(if fail)draw5→(if both fail)-2
  chain, likely as one shared helper given the two handlers' near-identical
  bodies (matching entry 489's own `runCvStatDown`-style precedent), then
  update the Tier-1 tests currently pinning the wrong "always 4" count.
  Otherwise entry 489's own carried Next list stands: weather trio
  (RainDance/SunnyDay/Hail, §25, last 3 of 22 CV handlers); §19.5's unstaged
  AccuracyDown sites 2-6; §24.5's unexercised `AI_CV_EvasionUp` draw sites;
  ENDTURN_ITEMS2 after Yawn/Thrash.
- **Notes:** no PAPERCUT. Time went almost entirely into the instrument
  design + root-cause derivation (byte-level ROM disassembly to compute
  exact DRAW SITE addresses ahead of the live run, so the single-step pass
  could positively classify every hit on the first try) rather than
  breadth — per the brief's own time-split guidance, this fully closes
  DefenseUp §18.4 AND, with budget left over, independently reproduces the
  identical finding on SpDefUp §22.3-22.4 live (not just derived by
  analogy), settling the "2-handler-wide, not a one-off" question the brief
  posed.

---
