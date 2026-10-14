# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-10-13 — chg161: #167 (d) charge-turn EMPTYSTRING3 box per scene (main/ts, presentation only)

- **State:** local master, production src `b048842dc` (+ pins `8ac2edd8f`). off108's Dig / Razor Wind / Solar Beam windows re-probed fresh
  (6 / 6 r1 == r2 == off108). Charge print's first glyph vs ROM: OFF **0 / 0 / 0** (was +24), ON **0 / -1 / 0** (was +16 / +15 / +16;
  Razor Wind -1 = its 48-frame live adapter vs the 49-row ROM run).
- **Did:** `chargeTurnEmptyBoxTiming` (BattleScriptFirstChargingTurn's box, every two-turn move): OFF 1 row (the off108 pause counts it,
  P 42 -> 41); ON one frame per interpreter execution to the charge print (8). olnd113's 3 charge rows re-pinned (box from G + 1).
- **Ripple:** census 0..999: the same 252 battles in both scenes, 639 charge turns (ON -16, OFF -24 each); ON keys / live 27,084
  unchanged; `battleDigestExcludingFrames` identical outside the budget-stalled tails (796 ON, 881 OFF +1 command). Differential
  641 / 641 byte-identical.
- **Next:** #167 (d) remainder: the ON live charge animation starts 7 rows late (it needs a presented post-animation hold). The
  held print -> next "used" edge is -10 .. -14 (general: the Sand-Attack control is -12; same family as (a)).
- **Notes:** gates: typecheck 0, smoke 448, full `npm test` (see commit), build. Docs `docs/chg161-charge-turn-print.md`; receipt
  `tools/integration/fixtures/chg161/receipt.json`; scratch `.integration/validation/chg161/`.

---

## 2026-10-13 — sub157: #153 Scene OFF plays the Substitute / Transform attack animations (main/ts, presentation only)

- **State:** local master `62b8de71f`, production src `ca4ea3618` (kernel) + `eec0aca08` (OFF x2). 5 / 5 dense Scene OFF Substitute ROM windows
  (PERSIAN<->SLOWBRO, GOLEM<->ONIX both sides, prep37 OFF) **87 / 87 rows 0 px** through production `renderBattleResolutionLiveView`.
- **Did:** `Cmd_attackanimation` exempts Transform / Substitute from HITMARKER_NO_ANIMATIONS (`:1748`). OFF command streams now == ON
  (30 / 30 uses, seeds 0..399). OFF bodies / fades read x2 {0,0} (no front animation in OFF, `pokemon.c:6805`; GOLEM -> ONIX was
  94,917 px). `liveShareCensus.ts --scene=on|off` + `sub157Census.sh`.
- **Ripple:** census 0..999 ON 10 / 10 shards byte-identical. OFF: 27 battles changed, all attributed (47 bodies live +50 frames each,
  1 Transform 39 -> 32, 6 fades now live, battle 881's stalled tail -1 command); `battleDigestExcludingFrames` identical.
  Differential 641 / 641 byte-identical.
- **Next:** #153 remainder (both scenes): Substitute HP command −6 vs ROM (Scene ON route timing); Transform has no live adapter
  (ROM 108 rows, production 32 undrawn); unmeasured OFF fade window and doll <-> mon swaps.
- **Notes:** gates: typecheck 0, smoke 448, build OK; soak vanilla 0:20 --parallel 10 20 / 20 OK, per-seed lines identical to a base
  (`bbd9c6748`) run; full `npm test` (4 shards) 1,667 files / 13,851 tests,
  0 failing after one attributed re-pin (`substituteDollFieldState` BLISSEY 60/28 asserted the old OFF doll-from-prompt; its file 7 / 7).
  Docs
  `docs/sub157-scene-off-substitute.md`; receipt `tools/integration/fixtures/sub157/receipt.json`; scratch `.integration/validation/sub157/`.

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
