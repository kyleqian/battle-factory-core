# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-13 — fpp150: #139 Focus Punch pre-pass — kernel + Scene OFF / ON timing + drawn general animation (main/ts)

- **State:** local master, production src `d44b83144` (kernel) + `49c6c7c7b` (presentation / render). verify-rcp143-r4 **PASS**
  (pin flipped). R4 anchors == ROM in both scenes (empty box 72; focus glyph 109 / 199; foe's glyph 215 / 305). fps147's 7 Scene ON
  windows **0 px through the production render** (controls 0 / 7). Census 0..999 27,196 / 27,016 live (unchanged).
- **Did:** the kernel runs BattleScript_FocusPunchSetUp before action 1 (index order; sleep / Truant guards; no RNG). The presentation
  adds a `general-animation` command (124 frames; 3 behind a Substitute). Pre-pass prints: empty box = interpreter rows + 1
  (ON 3 / OFF 37); focus print + 11-frame action lead. The handoff ends at stop-bounce-request. The render draws the fps147 reducer
  (`generalAnimationRenderView`). x2 history zeroes the attacker. The census reports general animations apart.
- **Ripple:** census: 36 battles frames-only (+20,848). All 36 attributed: alone == after, and == base with the pre-pass off.
  100 general animations (opp 65 / player 35). Differential 641 / 641 byte-identical. Tests moved: rcp143 R4 pin, fps147 "unwired" pin.
- **Next:** #139 remainder (voluntary-switch recall order; two-user / other-prologue leads unprobed). Charge-turn EMPTYSTRING3
  (#167 sentence kept): needs a dense charge-turn card per scene + an anchor run like `fpp150Anchors.ts` (doc §4).
- **Notes:** gates on the final tree: typecheck 0, smoke 448, full `npm test` (4 shards) 1,663 files / 13,822 tests passed, 0 failed
  (44 / 223 skipped), build OK; soak vanilla 0:20 20 / 20 OK, per-seed lines identical to thr153 (`b4 t0`). core-rs: no port (not edited).
  Docs `docs/fpp150-focus-punch-prepass.md`; scratch `.integration/validation/fpp150/`.

---

## 2026-10-13 — thr153: #141a THRASH / OUTRAGE / PETAL DANCE lock-in re-run RE-LANDED (ISSUES #141 FIXED; main/ts gameplay)

- **State:** local master; F1 `0f9b5301e` re-applied (cherry-pick) + 8 attributed re-pins. verify-rcp143 R1 / R2 / R3 /
  R3-control all PASS. Census 0..999 **27,196 / 27,016 live** (99.34 % / 99.60 %); vanilla soak 0:20 20 / 20 OK, every seed `b4 t0`.
- **Did:** R1 pin flipped (rng146 test + rcp143). Re-pins (only diff vs master is F1; F1-off toggle restores every old value):
  orchestrator seed 16 1315 -> 1294, seed 24 1623 -> 1479, scene parity 470 -> 467 (one Petal Dance lock-in each); rentsCount
  "lost after swap" seed 58 -> 250 (58 now wins after a lock-in; 250 = only accept-0 / lose-1 round in 1..260); sa125 + seed 49
  (BRN player routes; battles 18 / 76 moved); fix122 move 113 battle 32 -> 41; sgl138 seed 32 -> 808 (32 now carries a Dig the
  later-hit anchor misreads; receipt regenerated, summary 90 -> 98 anchors, all cells / equalities kept); soak (b) seed 34 -> 1.
- **Ripple:** census vs master (27,271 / 27,090): 46 battles changed, each first diverging at / right after a Petal Dance / Thrash /
  Outrage (rng146's 45 + 811, an F3 battle that now also hits a lock-in). 0 unattributed. Soak: every seed b2 t16 -> b4 t0 (expected).
- **Next:** #139 (Focus Punch pre-pass; reuses the F3 `chosenMoveByBattler` bank). Optional ROM card for rng146's 811 phazing route.
- **Notes:** gates: typecheck 0, smoke 448, full `npm test` (2 shards) 1,660 files / 13,789 tests passed, 0 failed, build OK.
  core-rs has no port of the THRASH arm (not edited). sgs134 `exposure.json` is a census projection from before F1, so it is stale
  for the 46 moved battles (no test reads those seeds). docs/rng146-rng-draw-fixes.md § thr153. Scratch: `.integration/validation/thr153/`.

---

## 2026-10-13 — rng146: #141b Sticky Hold + #140 `:133` RNG draws FIXED; #141a THRASH fix built but deferred (main/ts gameplay)

- **State:** local master; production src `e8843465a` (F2 `8726675ec` + F3) with F1 `0f9b5301e` reverted in `52340a10e`.
  verify-rcp143 R2 / R3 / R3-control PASS, R1 FAIL (deferred). Census 0..999 27,271 / 27,090 live (99.34 % / 99.60 %).
- **Did:** F2: STEAL_ITEM Sticky Hold arm `"call-current"` (BattleScriptPushCursor). F3: the rules-context cell
  `chosenMoveByBattler` (gChosenMoveByBattler, threaded with chosenActionByBattler), banked at selection and reset at
  BattleTurnPassed; `runMoveAction` takes `battle_util.c:130-134` at the battler's own action (GetMoveTarget draws).
  F1 (THRASH re-runs seteffectwithchance) is correct (R1 PASS) but moves 8 pins, all via Petal Dance / Thrash lock-ins
  (per-fix toggles), and 5 of them need new-seed scans, so it was reverted. Docs: docs/rng146-rng-draw-fixes.md.
- **Ripple (landed tree):** tests moved: none beyond the receipt pins. Census vs ret165: 2 battles changed, both F3
  (269 Solar Beam slept by GrassWhistle; 811 a Whirlwind-dragged GLOOM now runs its own slot move instead of ROAR;
  this route was not anticipated and has no ROM receipt yet). Soak vanilla 0:20 20 / 20 OK, per-seed lines identical.
- **Next:** re-land #141a: cherry-pick `0f9b5301e` + the 8 re-pins listed in ISSUES #141 (expect census 45 battles,
  vanilla soak b2 t16 -> b4 t0). Optional ROM card for the 811 phazing route. Then #139 (reuses the F3 bank).
- **Notes:** gates on `299f35e0e`: typecheck 0, full `npm test` (2 shards) 1,657 files / 13,747 tests passed, 0 failed
  (44 / 223 skipped), build OK; smoke 448 earlier. ISSUES #140 removed; #141 trimmed to #141a. Scratch: `.integration/validation/rng146/`.
