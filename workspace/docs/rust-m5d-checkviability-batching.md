# Rust M5d batching scout — `factoryAiCheckViability.ts` partition

Written 2026-08-11 by a bounded rust-lane docs-only worker, for the M5d
native-port session(s) `docs/rust-m5-scout.md` opens next. Docs-only step;
no code/test/ledger touched. Source: `src/engine/factoryAiCheckViability.ts`
(9516 lines) + `tests/factoryAiCheckViability.test.ts` (7821 lines, 89
top-level `describe` blocks, 598 tests). Every line range below comes from
a script run directly against these two live files (`node -e` brace/regex
extraction over the full file text, not sampling), cross-checked in at
least one case against an independent method — see each section's own
"verified" note. This doc's own template and quality bar is
`docs/rust-m5b-checkbadmove-batching.md` (M5b/CheckBadMove); read that
first, its 4-step (M5b-0/1/2/3) precedent is assumed known below.

**122/122 live-verified, not doc-copied**: `AI_CHECK_VIABILITY_TABLE_EFFECTS`
is a 122-entry `Set` (script-counted directly from the literal, zero dupes).
Independently, a brace-parsing script over `runCheckViability`
(:5463-7222) found exactly **90 `if (move.effect === ...)` dispatch
blocks covering exactly 122 distinct `EFFECT_*` string literals**, matching
the source's own header-comment claim ("122 `if_effect` lines grouped into
90 unique `AI_CV_*` handlers", :7,193) from an independent extraction
method. Third check: `npx vitest run tests/factoryAiCheckViability.test.ts`
run live → **598/598 pass**, including every `expectNoUnportedViabilityBarrier`
call (test:16-23) — the module's actual completeness probe, which iterates
all 122 `AI_CHECK_VIABILITY_TABLE_EFFECTS` members and asserts
`{kind: "scored"}` (never the `"unsupported-branch"` barrier) for each one's
first real move. All three checks agree: TS is source-complete, 122/122,
today.

**PAPERCUT — two stale docs, do not trust their handler counts**: the
source's own top-of-file header comment (:1-108) and
`docs/factory-ai-checkviability-ground-truth.md` are both frozen at an
early ~22-handler snapshot ("The other ~68 are not ported this round",
:100). The ground-truth doc's own last section is §35 (`AI_CV_BrickBreak`,
2026-08-08, "the highest-weight remaining CV handler") — **only ~47 of the
now-90 dispatched handlers ever got a doc section**; everything dispatched
after `AI_CV_BrickBreak` (dispatch line 6383 onward — all of batch M5d-4
past its first entry, and all of M5d-5) was ported straight to source+tests
with **zero ground-truth-doc backing**, confirmed by the test file's own
`describe` titles switching from `docs/factory-ai-checkviability-ground-truth.md
§N` citations to bare `data/battle_ai_scripts.s:X-Y` citations exactly at
that boundary. A future M5d worker citing "doc §N" for anything past
BrickBreak will not find it — use `data/battle_ai_scripts.s` + the TS
handler's own inline JSDoc as the sole spec there.

## 1. Module anatomy

- **Data heads reused, not reinvented**: `MOVES_BY_ID`, `TYPE_EFFECTIVENESS`,
  `ABILITY_ID_IN_WEATHER_RANGE`, `AI_WEATHER_SUN/RAIN/SANDSTORM/HAIL`, and
  the `AiWeatherValue` type are all **imported from
  `factoryAiCheckBadMove.ts`** (:109-118), not redeclared — on the Rust
  side this is `gen_tables::MOVES` (already promoted, M5a) plus
  `factory_ai_check_bad_move::{ability_id_in_weather_range, AI_WEATHER_SUN,
  AI_WEATHER_RAIN, AI_WEATHER_SANDSTORM, AI_WEATHER_HAIL}` — all already
  `pub` in `core-rs/crates/factory-core/src/factory_ai_check_bad_move.rs`
  (:289-307), zero new Rust needed for this slice.
- **New CV-specific data heads** (:124-229): `TYPE_ID_IN_WEATHER_RANGE`
  (:136-141, 4 entries) and `HOLD_EFFECT_ID_IN_WEATHER_RANGE` (:163-168, 4
  entries) extend CBM's "Channel 1" stale-`funcResult` collision concept —
  CBM only collision-maps ABILITY writes; CV additionally collision-maps
  TYPE writes (`get_target_type1/2`) and HOLD_EFFECT writes
  (`get_hold_effect`), since `AI_CV_*` handlers write those funcResult
  kinds too. Small (~12 entries total), hand-portable, port once in M5d-0.
  `typeFuncResultCollision`/`abilityFuncResultCollision`/
  `typeChainFuncResultAfter` (:144-188) are the three lookup helpers over
  these maps, also M5d-0.
- **EFFECT_\* consts — 33 of 122 do not exist in Rust yet**: CBM's Rust
  module already has a `pub const EFFECT_*: u16` block (109 entries, one
  per CBM table effect). Diffed live (script) against CV's 122-entry Set:
  **89 already exist** (reused as-is), **33 do not**
  (`EFFECT_ABSORB, EFFECT_MIRROR_MOVE, EFFECT_ALWAYS_HIT, EFFECT_CONVERSION,
  EFFECT_RESTORE_HP, EFFECT_REST, EFFECT_TRAP, EFFECT_HIGH_CRITICAL,
  EFFECT_SPEED_DOWN_HIT, EFFECT_VITAL_THROW, EFFECT_PAIN_SPLIT,
  EFFECT_LOCK_ON, EFFECT_DESTINY_BOND, EFFECT_HEAL_BELL, EFFECT_THIEF,
  EFFECT_PROTECT, EFFECT_ENDURE, EFFECT_PURSUIT, EFFECT_MORNING_SUN,
  EFFECT_SYNTHESIS, EFFECT_MOONLIGHT, EFFECT_SEMI_INVULNERABLE,
  EFFECT_SOFTBOILED, EFFECT_FACADE, EFFECT_SMELLINGSALT, EFFECT_ROLE_PLAY,
  EFFECT_MAGIC_COAT, EFFECT_REVENGE, EFFECT_BRICK_BREAK, EFFECT_SKILL_SWAP,
  EFFECT_SNATCH, EFFECT_BLAZE_KICK, EFFECT_POISON_TAIL`). M5d-0 should add
  these 33 to the existing block in `factory_ai_check_bad_move.rs` (same
  registry, same `battle_move_effects.h` convention M5b already
  established) rather than starting a second, competing const block.
- **Input/result types — ONE unified battler type, not an
  attacker/target split**: `FactoryAiCheckViabilityBattler` (:256-439,
  **42 fields**, 11 required + 31 optional — counted directly, do not
  reuse any other doc's number) is passed as **both** `attacker` and
  `target` in every `runCheckViability` call; CBM's split
  `FactoryAiCheckBadMoveTarget`(22)/`Attacker`(27) design does **not**
  carry over — port one Rust struct, used for both roles, same as TS.
  `FactoryAiCheckViabilityDraw` (:441-1115, **62 discriminated-union
  members**, script-counted) is a receipt-per-draw-site catalog — each
  member is one struct shape with a literal `kind` field (several members
  union multiple numbered sites, e.g. `"defense-up-roll-1"|...|"-5"`,
  collectively covering ~85 distinct `kind` strings). `nextDraw` (:1142
  -1164, called 132 times) is a single generic RNG-draw primitive
  returning `{ordinal, reason, before, after, rawRngValue, randomValue}`
  — callers wrap it and attach their own `kind` literal + any extra
  fields; there is no per-effect draw function like CBM's. `Result` type
  (:1117-1140) is a 2-variant union today (`"scored"` /
  `"unsupported-branch"`); the Rust port adds a 3rd `NotYetPorted` variant
  during the multi-batch process (§3), same shape as CBM's.
- **RNG-draw plumbing is its own discipline, not CBM's**: CV does **not**
  call CBM's `nextGetAbilityDraw`/`checkAbilityAiTarget` at all (grep
  confirms zero references) — it has its own generic single-draw
  `nextDraw` above. The one place CV needs ability-guessing (trapper
  short-circuit → known-ability cache → single-ability species →
  `Random()&1` two-ability draw), `runCvChangeSelfAbility` (:8372-8443),
  **re-implements the same 4-branch cascade inline** using `nextDraw`
  rather than calling CBM's `next_get_ability_draw`/`check_ability_ai_target`
  (both already `pub fn` in Rust, :1035,1084) — a genuine TS-side
  duplication, not an oversight to "fix" while porting. Default to
  hand-porting CV's own inline version bug-for-bug (matches TS structure);
  only consolidate onto CBM's existing functions if a future worker proves
  byte-identical output, and say so explicitly if they do.
- **Damage/turn-order infra: reused directly, already `pub` in Rust**. CV
  imports `applyStab`/`applyTypeEffectiveness`/`DEFAULT_STAT_STAGE` from
  `damageCalc.ts` and `effectiveSpeed`/`getWhoStrikesFirst` from
  `turnOrder.ts` (:120-122) and calls them from **11 separate handlers**
  (`getWhoStrikesFirst`/`effectiveSpeed` pairs alone appear in SpeedDown,
  SpeedUp, Rest, HealBody-callers, SemiInvulnerable, Recharge, Flail,
  DestinyBond, and more — grep-counted). Rust already has exact 1:1
  matches, all `pub fn`/`pub const`, in `damage_calc.rs`
  (`apply_stab`, `apply_type_effectiveness`, `DEFAULT_STAT_STAGE`) and
  `turn_order.rs` (`effective_speed`, `get_who_strikes_first`) — zero new
  Rust needed, call them directly from every batch that needs them.
- **`runCheckViability`'s own shell is thin, unlike CBM's fat preamble**:
  setup is 5 lines (:5479-5483: move lookup + `funcResultCarry` init, no
  universal gate/ability-negation logic at all — CBM's 75-line
  type-immunity/ability-negation/Soundproof preamble has **no CV analog**).
  The dispatcher is one 1760-line function (:5463-7222, brace-matched)
  containing all 90 `if` blocks in strict source order, then the trailing
  `AI_CHECK_VIABILITY_TABLE_EFFECTS.has(...)` barrier + zero-score
  fallthrough (~:7202-7222). Handler bodies live both before (:1173-5460)
  and after (:7229-9516) the dispatcher — same JS-hoisting-makes-order-
  arbitrary situation as CBM.

## 2. Effect-group partition (122 effects, 90 dispatch blocks, 5 batches)

Partition is by dispatch source-order (matches the file's own thematic
grouping), split at cost boundaries (handler-body lines + matched test
`describe` lines, script-summed) landing near 13/30/25/16/15% of the total
11,782-line cost. **6 of the 7 internal shared-handler/shared-tail
relationships found by an exhaustive re-grep (every `runCv*`-calling-
`runCv*` site in the file, both `const x = runCvY(...)` and bare
`return runCvY(...)` forms — the first pass of this doc missed the latter
form once, caught on review) land entirely inside one batch — zero
cross-batch splits required by construction**, except one genuine
cross-batch call documented in M5d-5. Sum check (script): 13+29+30+22+28 =
**122**.

**Shared/reuse relationships found (grep over the whole file, all internal
`runCv*`-calling-`runCv*` sites), and which batch owns each**:
- `runCvSpeedDown` (:1355, called from another handler) — called by
  `runCvSpeedDownFromChance`(:1441) for 3 of its 6 covered moves — both in
  **M5d-1**.
- `runCvStatDown` (:3245, shared tail) — called by `DefenseDown`(:3290),
  `SpDefDown`(:3312), `EvasionDown`(:3342) — all 3 in **M5d-2**.
- `runCvAttackStyleStatUp` (:3407, shared tail) — called by
  `AttackUp`(:3475), `SpAtkUp`(:3506) — both in **M5d-2**.
- `runCvSideScreenTypeGate` (:3914, shared tail) — called by
  `LightScreen`(:3957), `Reflect`(:3977) — both in **M5d-2**.
- `runCvHealBody` (:1909, shared tail) — called by `HealWeather`(:2010),
  `Heal`(:2034) — both in **M5d-3**.
- `runCvSport` (:8821) — the one true **same-function, separate-dispatch
  pair** (CBM's Curse/PsychUp pattern): `EFFECT_MUD_SPORT`(:6914) and
  `EFFECT_WATER_SPORT`(:6934) are two distinct top-level `if` blocks both
  calling `runCvSport` — both in **M5d-5**. (CBM's own Curse→BulkUp/
  PsychUp→Haze shortcuts do **not** transfer to CV: `AI_CV_Curse` and
  `AI_CV_PsychUp` each have their own independent 46/39-line handler here.)
- `runCvConfuse` (:7370-7400) is called from **two other handlers'
  bodies**, not just its own dispatch: `runCvSwagger`(:7449, same batch,
  M5d-3) and **`runCvFlatter`(:8760, M5d-5)** — the one real cross-batch
  data dependency (M5b's weather/soundproofGuess analog): M5d-5's Flatter
  handler needs `run_cv_confuse` ported, which happens in M5d-3. Sequence
  M5d-3 before M5d-5, or port `run_cv_confuse` standalone in M5d-0/whichever
  batch lands first and have M5d-3 just wire its own dispatch to it.

### M5d-1 — sleep/speed/status openers + the 3 CV-only accuracy handlers (13 effects, small)

Dispatch `:5490-5646`. `EFFECT_SLEEP`→`runCvSleep`(:7229-7257,
test:229-278); `EFFECT_SPEED_DOWN(+_2)`→`runCvSpeedDown`(:1355-1395,
test:665-791); `EFFECT_SPEED_DOWN_HIT`→`runCvSpeedDownFromChance`
(:1432-1444, test:4612-4776, **not adjacent in dispatch order to
SpeedDown but calls into it** — confirmed by a full re-grep of every
internal `runCv*`-calling-`runCv*` site in the file: `runCvSpeedDownFromChance`
literally `return`s `runCvSpeedDown(input)` at :1441 for 3 of its 6 covered
moves, per source comment :1416-1430; both handlers land in this same
batch, so it is not a cross-batch dependency); `EFFECT_TOXIC+LEECH_SEED`
→`runCvToxic`(:1173-1233, test:562-614); `EFFECT_PROTECT`→`runCvProtect`
(:1249-1324, test:615-664); `EFFECT_PURSUIT`→`runCvPursuit`(:2362-2388,
test:792-886); `EFFECT_HIGH_CRITICAL+BLAZE_KICK+POISON_TAIL`→`runCvHighCrit`
(:2884-2917, test:887-1157, largest test block in this batch — 271 lines);
`EFFECT_ALWAYS_HIT`→`runCvAlwaysHit`(:2964-2989, test:1158-1290);
`EFFECT_VITAL_THROW`→`runCvVitalThrow`(:3039-3094, test:1291-1523). The
last three (`HighCrit`/`AlwaysHit`/`VitalThrow`) are the module's 3
**CV-only-reachable handlers** — no `AI_CBM_*` sibling exists in
`factoryAiCheckBadMove.ts`, confirmed by grep (zero `AI_CBM_HighCrit`
-style names anywhere).

### M5d-2 — the full stat-mod + screens family: all 6 CBM-paired stat handlers + EvasionUp/Down + LightScreen/Reflect (29 effects, largest — every internal shared-tail cluster lives here)

Dispatch `:5648-5942`. This is deliberately the biggest batch (30.4% of
cost) because it is the single most internally-coupled region — 3 of the
5 shared-tail clusters from §2's header (`runCvStatDown`,
`runCvAttackStyleStatUp`, `runCvSideScreenTypeGate`) are entirely inside
it. `EFFECT_ATTACK_DOWN(+_2)`→`runCvAttackDown`(:3157-3211,
test:1524-1748, standalone, does NOT use the shared tail);
`EFFECT_DEFENSE_DOWN(+_2)+TICKLE`→`runCvDefenseDown`(:3280-3300,
test:1749-1911); `EFFECT_SPECIAL_DEFENSE_DOWN(+_2)`→`runCvSpDefDown`
(:3302-3322, test:1912-2051); `EFFECT_ATTACK_UP(+_2)`→`runCvAttackUp`
(:3467-3487, test:2052-2290); `EFFECT_DEFENSE_UP(+_2)+BULK_UP`→
`runCvDefenseUp`(:3616-3715, 100 lines, test:2291-2548);
`EFFECT_ACCURACY_DOWN(+_2)`→`runCvAccuracyDown`(:4049-4151, 103 lines, **7
`if_random_less_than` sites, the largest ported CV handler by draw-site
count among the "Down" family**, test:2549-2925, 377 lines — biggest test
block in the module); `EFFECT_SPEED_UP(+_2)`→`runCvSpeedUp`(:1471-1510,
test:2926-3030); `EFFECT_SPECIAL_ATTACK_UP(+_2)`→`runCvSpAtkUp`
(:3498-3518, test:3031-3223); `EFFECT_SPECIAL_DEFENSE_UP(+_2)+COSMIC_POWER
+CALM_MIND`→`runCvSpDefUp`(:3776-3873, 98 lines, test:3224-3465);
`EFFECT_LIGHT_SCREEN`→`runCvLightScreen`(:3948-3958, test:3466-3647,
shared with Reflect); `EFFECT_REFLECT`→`runCvReflect`(:3968-3978,
same test block); `EFFECT_EVASION_UP(+_2)+MINIMIZE`→`runCvEvasionUp`
(:4226-4357, **132 lines, the single largest handler body in the whole
module, 8 `if_random_less_than` sites**, test:3648-4126, 479 lines);
`EFFECT_EVASION_DOWN(+_2)`→`runCvEvasionDown`(:3332-3352, test:4127-4265,
reuses `runCvStatDown` same as DefenseDown/SpDefDown above).

### M5d-3 — weather trio + heal family + damage/status singles + Counter (30 effects)

Dispatch `:5944-6381`. `EFFECT_SUNNY_DAY`→`runCvSunnyDay`(:4418-4433) /
`EFFECT_HAIL`→`runCvHail`(:4440-4455) — exact twins sharing
`weatherSetterCvScore`(:4385-4412), test:4266-4385;
`EFFECT_RAIN_DANCE`→`runCvRainDance`(:4530-4597, 68 lines, own extra
Speed-order/Swift-Swim/Rain-Dish logic, genuinely diverges from its
siblings, test:4386-4611); `EFFECT_REST`→`runCvRest`(:1562-1644, 83
lines, test:4777-4908); `EFFECT_MORNING_SUN+SYNTHESIS+MOONLIGHT`→
`runCvHealWeather`(:1997-2018, test:5191-5294, shares `runCvHealBody`);
`EFFECT_RESTORE_HP+SOFTBOILED+SWALLOW`→`runCvHeal`(:2026-2042, same test
block plus a dispatch-only extra describe at test:5738-5772 for the
SWALLOW arm specifically — same joined `||` block, not a separate
dispatch); `EFFECT_ABSORB`→`runCvAbsorb`(:1672-1691, test:4909-4974);
`EFFECT_DREAM_EATER`→`runCvDreamEater`(:1715-1728, test:4975-5024);
`EFFECT_SLEEP_TALK`→`runCvSleepTalk`(:1743-1752, test:5025-5062);
`EFFECT_ENDURE`→`runCvEndure`(:1843-1861, test:5117-5173);
`EFFECT_OHKO`→**inline literal, no handler function** (:6137-6149, `score
-10; end`, test:5174-5190); `EFFECT_ROAR`→`runCvRoar`(:7266-7295,
test:279-337); `EFFECT_FAKE_OUT`→`runCvFakeOut`(:2295-2299, 5 lines,
smallest handler in the module, test:5344-5361); `EFFECT_SUPER_FANG`→
`runCvSuperFang`(:2405-2416, test:5434-5461); `EFFECT_RECHARGE`→
`runCvRecharge`(:2447-2494, test:5462-5513); `EFFECT_FLAIL`→`runCvFlail`
(:2534-2592, test:5514-5579); `EFFECT_DESTINY_BOND`→`runCvDestinyBond`
(:2625-2682, test:5580-5658); `EFFECT_EXPLOSION+MEMENTO`→`runCvSelfKO`
(:2730-2811, test:5659-5737 plus a dispatch-only extra at
test:6365-6386 for the MEMENTO arm — same joined block);
`EFFECT_SEMI_INVULNERABLE`→`runCvSemiInvulnerable`(:2154-2282, **129
lines, 2nd-largest handler body**, test:5362-5433); `EFFECT_TRAP+MEAN_LOOK`
→`runCvTrap`(:2070-2090, test:5295-5343); `EFFECT_PARALYZE`→`runCvParalyze`
(:7305-7361, test:338-400); `EFFECT_CONFUSE`→`runCvConfuse`(:7370-7400,
test:401-451, **also called internally by Swagger below and by Flatter in
M5d-5, §2**); `EFFECT_SWAGGER`→`runCvSwagger`(:7412-7465, test:452-561,
calls `runCvConfuse` internally); `EFFECT_COUNTER`→`runCvCounter`
(:7471-7568, 98 lines, test:46-206, the test file's own first describe
block despite Counter being dispatch-order-last in this batch).

### M5d-4 — charge-up/status-cure/screen-siblings/Substitute cluster, straddles the doc-coverage boundary (22 effects)

Dispatch `:6383-6748`. **`EFFECT_BRICK_BREAK`→`runCvBrickBreak`
(:4620-4629, test:5773-5802) is the LAST handler with any
ground-truth-doc backing (§35)** — everything else in this batch and all
of M5d-5 is source-citation-only (§0's PAPERCUT). `EFFECT_SOLAR_BEAM+
RAZOR_WIND+SKY_ATTACK+SKULL_BASH`→`runCvChargeUpMove`(:4661-4691,
test:5803-5865); `EFFECT_OVERHEAT`→`runCvOverheat`(:4722-4766,
test:5866-5914); `EFFECT_FACADE`→`runCvFacade`(:4792-4808,
test:5915-5953); `EFFECT_CURSE`→`runCvCurse`(:4853-4898, **own
independent 46-line body — does NOT reuse `runCvDefenseUp`, unlike CBM's
Curse→BulkUp shortcut**, test:5954-6024); `EFFECT_PSYCH_UP`→`runCvPsychUp`
(:4942-4980, **own independent 39-line body — does NOT reuse
`runCvHaze`, unlike CBM's PsychUp→Haze shortcut**, test:6025-6073);
`EFFECT_MIRROR_COAT`→`runCvMirrorCoat`(:5076-5166, 91 lines,
test:6074-6172); `EFFECT_DRAGON_DANCE`→`runCvDragonDance`(:5196-5243,
test:6173-6227); `EFFECT_BATON_PASS`→`runCvBatonPass`(:5296-5363,
test:6228-6296); `EFFECT_KNOCK_OFF`→`runCvKnockOff`(:1775-1815,
test:5063-5116); `EFFECT_FOCUS_PUNCH`→`runCvFocusPunch`(:5411-5460,
test:6297-6364); `EFFECT_REVENGE`→`runCvRevenge`(:7592-7611,
test:6387-6422); `EFFECT_SUPERPOWER`→`runCvSuperpower`
(:7642-7696, test:6423-6465); `EFFECT_MAGIC_COAT`→`runCvMagicCoat`
(:7733-7775, test:6466-6521); `EFFECT_FORESIGHT`→`runCvForesight`
(:7808-7834, test:6522-6567); `EFFECT_ENDEAVOR`→`runCvEndeavor`
(:7861-7906, test:6568-6604); `EFFECT_ENCORE`→`runCvEncore`(:7962-8022,
test:6605-6660); `EFFECT_HEAL_BELL`→`runCvHealBell`(:8043-8054,
test:6661-6694); `EFFECT_SUBSTITUTE`→`runCvSubstitute`(:8114-8220, **107
lines, 3rd-largest handler body**, test:6695-6807).

### M5d-5 — remaining singles, MudSport/WaterSport pair, the 2 fully-vestigial exported handlers (28 effects, cheapest despite 2nd-highest count)

Dispatch `:6750-7201`. Entirely undocumented in the ground-truth doc
(§0). `EFFECT_TRICK`→`runCvTrick`(:8272-8319, test:6808-6860);
`EFFECT_SKILL_SWAP+ROLE_PLAY`→`runCvChangeSelfAbility`(:8372-8443,
test:6861-6923, the module's own ability-guessing cascade — §1);
`EFFECT_SNORE`→**inline literal, no handler function** (:7172-7182,
`score +2; end`, test:6924-6946); `EFFECT_ACCURACY_UP(+_2)`→
**`export function runCvAccuracyUp`(:8467-8492)**, test:6947-6994 —
**fully vestigial**: live-checked via `firstMoveIdWithEffect`
(imported from CBM's TS module, same helper CBM's own tests use) that
BOTH `EFFECT_ACCURACY_UP` and `EFFECT_ACCURACY_UP_2` return `undefined`
(no Gen-3 move carries either) — the dispatch entry is reachable only by
direct call, hence the `export`, matching CBM's own vestigial-export
pattern; keep the Rust equivalent `pub(crate)`. `EFFECT_DISABLE`→
`runCvDisable`(:8529-8578, test:6995-7054); `EFFECT_PAIN_SPLIT`→
`runCvPainSplit`(:8605-8641, test:7055-7099); `EFFECT_BELLY_DRUM`→
`runCvBellyDrum`(:8648-8659, test:7100-7126); `EFFECT_REFRESH`→
`runCvRefresh`(:8666-8677, test:7127-7153); `EFFECT_ERUPTION`→
`runCvEruption`(:8704-8743, test:7154-7207); `EFFECT_FLATTER`→
`runCvFlatter`(:8751-8775, test:7208-7250, **calls `runCvConfuse`
internally — cross-batch dependency on M5d-3, §2**);
`EFFECT_SMELLINGSALT`→`runCvSmellingSalt`(:8782-8791, test:7251-7277);
`EFFECT_MUD_SPORT`→`runCvSport`(:8821-8850, called from dispatch
:6914-6932); `EFFECT_WATER_SPORT`→ same `runCvSport`, dispatch
:6934-6952 (test for both: 7278-7326, the module's one same-function
separate-dispatch pair — §2); `EFFECT_POISON`→`runCvPoison`(:8868-8879,
test:7327-7359); `EFFECT_LOCK_ON`→`runCvLockOn`(:8885-8897,
test:7360-7386); `EFFECT_BIDE`→`runCvBide`(:8903-8914,
test:7387-7413); `EFFECT_IMPRISON`→`runCvImprison`(:8933-8951,
test:7414-7449); `EFFECT_CONVERSION`→`runCvConversion`(:8974-8997,
test:7450-7492); `EFFECT_THIEF`→`runCvThief`(:9032-9050,
test:7493-7528); `EFFECT_HAZE`→`runCvHaze`(:9087-9133,
test:7529-7587); `EFFECT_RECYCLE`→`runCvRecycle`(:9163-9182,
test:7588-7629); `EFFECT_SPIT_UP`→`runCvSpitUp`(:9202-9221,
test:7630-7665); `EFFECT_MIRROR_MOVE`→`runCvMirrorMove`(:9257-9308,
test:7666-7718); `EFFECT_SPECIAL_ATTACK_DOWN(+_2)`→
**`export function runCvSpAtkDown`(:9325-9378)**, test:7719-7774 —
**fully vestigial**, same live-check method as AccuracyUp above: both
members return `undefined` from `firstMoveIdWithEffect`; keep Rust
equivalent `pub(crate)`. `EFFECT_SNATCH`→`runCvSnatch`(:9423-9516, 94
lines, test:7775-7822, last function in the file).

## 3. Partial-port contract for the Rust side

CBM's TS module has its own `unportedCheckBadMoveTableEffects()` probe
that the Rust port mirrored directly (TS-to-Rust). **CV's TS module has no
such exported probe** — its completeness check lives only inside the test
file as `expectNoUnportedViabilityBarrier` (test:16-23), a private
per-test helper, not an importable function. There is nothing to mirror
1:1 here; instead follow CBM's own **Rust-side** precedent
(`CBM_TABLE_EFFECTS`/`cbm_handled_effects()`/`unported_cbm_table_effects()`/
`NotYetPorted`, `factory_ai_check_bad_move.rs:376,639,653,1010`) as the
template, applied fresh: a `CV_TABLE_EFFECTS: [u16; 122]` const (ported
once, M5d-0, from §2's effect list) plus one `CV_HANDLED_EFFECTS_M5D1`
through `_M5D5: &[u16]` const per landed batch, unioned by
`cv_handled_effects()`; `fn unported_cv_table_effects() -> Vec<u16>` as
the sorted set-difference; a 3rd `NotYetPorted { effect: u16, move_id: u16 }`
variant on `CheckViabilityResult`, returned by the dispatcher's own
trailing barrier (Rust analog of TS :7202-7208) for any `CV_TABLE_EFFECTS`
member not yet in `cv_handled_effects()`. Reuse
`factory_ai_check_bad_move::first_move_id_with_effect` directly for the
probe-test helper (already `pub fn`, :668) — do not reimplement it, same
as TS's own test file imports CBM's `firstMoveIdWithEffect` rather than
duplicating it. One completeness-probe native test per landed batch,
generic over `unported_cv_table_effects()`, same shape as CBM's own
(`factory_ai_check_bad_move.rs:3583-3593`).

## 4. Vector-sweep axes and TS quirks to preserve

- **Sweep axis**: one battler-field sweep per handler/cluster (§2's own
  describe blocks), same M4a-style convention as CBM — but note the
  **single unified `FactoryAiCheckViabilityBattler`** (§1) means a sweep
  for e.g. `AI_CV_AttackDown` only varies the fields that handler reads on
  each side; the type's other 30+ optional fields stay at documented
  defaults for that sweep, exactly as TS's own per-`describe` `NEUTRAL_
  BATTLER` fixture (test:31-44) does.
- **Two independent same-shape-not-same-function pairs, confirmed NOT
  reusable across each other** (§2/M5d-4): `AI_CV_Curse` vs
  `AI_CV_DefenseUp`, and `AI_CV_PsychUp` vs `AI_CV_Haze` — CBM's own
  Curse→BulkUp/PsychUp→Haze code-reuse shortcuts do not exist on the CV
  side despite the same-looking names; each has its own independently
  re-derived handler body. Do not assume the CBM precedent transfers just
  because the effect name matches.
- **The one real same-function pair**: `EFFECT_MUD_SPORT`/
  `EFFECT_WATER_SPORT` both dispatch to `runCvSport` from two separate
  `if` blocks (§2, M5d-5) — keep two match arms, one function, same
  discipline as CBM's Curse/PsychUp pattern (just relocated to a
  different effect pair on this module).
- **Cross-batch call, not just cross-batch data**: `runCvFlatter` (M5d-5)
  calls `runCvConfuse` (M5d-3) directly inside its own handler body, not
  through the dispatcher — verify `run_cv_confuse` is `pub(crate)` and
  ported before M5d-5 lands, or land batches in source order (M5d-3
  before M5d-5) to guarantee it.
- **Two fully-vestigial exported handlers, test-only-reachable** (M5d-5):
  `runCvAccuracyUp`/`runCvSpAtkDown` are `export`ed specifically because
  BOTH of their component effects (`EFFECT_ACCURACY_UP`+`_2`,
  `EFFECT_SPECIAL_ATTACK_DOWN`+`_2`) return no move from
  `firstMoveIdWithEffect` — live-verified, not assumed from CBM's own
  similarly-named vestigial set (CBM's `ACCURACY_UP(+_2)` vestigial
  status is a different, if analogous, fact about a different table).
  Rust needs direct-call tests for these two, not move-driven ones.
- **Ground-truth-doc coverage cliff** (§0): trust `docs/factory-ai-
  checkviability-ground-truth.md` §1-35 for M5d-1 through the first entry
  of M5d-4 (`AI_CV_BrickBreak`); for everything dispatched after that
  (rest of M5d-4, all of M5d-5), there is no doc section — go straight to
  `data/battle_ai_scripts.s` (cited inline in every `describe` title,
  §2) and the TS handler's own JSDoc.
- **Largest handlers by line count, budget review time accordingly**:
  `AI_CV_EvasionUp` (132, M5d-2, 8 draw sites), `AI_CV_SemiInvulnerable`
  (129, M5d-3), `AI_CV_AccuracyDown` (103, M5d-2, 7 draw sites),
  `AI_CV_Substitute` (107, M5d-4), `AI_CV_DefenseUp` (100, M5d-2),
  `AI_CV_Counter`/`AI_CV_SpDefUp` (98 each).

## 5. Preamble/shared-infra step: recommend M5d-0, smaller in scope than M5b-0

Unlike CBM, CV's dispatcher shell has **no universal preamble logic** to
port (§1 — 5 lines of setup, no type-immunity/ability-negation/Soundproof
checks). M5d-0's job is almost entirely **shared infra + completeness
machinery**, not preamble control flow: (a) the `FactoryAiCheckViabilityBattler`
(42 fields)/`Draw`(62 variants)/`Result`(2→3 variants) types; (b) `nextDraw`,
the sole generic RNG-draw primitive every batch calls; (c) the 3 stale-
`funcResult` collision helpers + their 2 lookup maps (§1); (d) the 33 new
`EFFECT_*` consts, added to `factory_ai_check_bad_move.rs`'s existing
block (§1); (e) `CV_TABLE_EFFECTS`/`cv_handled_effects()`/
`unported_cv_table_effects()`/`NotYetPorted` (§3); (f) the dispatcher
shell itself — move lookup + `funcResultCarry` init + the trailing barrier
and zero-score fallthrough (:5479-5483, :7202-7222) — with all 90 `if`
blocks initially absent (or all routed to `NotYetPorted`) until each batch
lands its own. Test coverage: the dispatch-shell's own dedicated block is
only 22 lines (`tests/factoryAiCheckViability.test.ts:207-228`,
"AI_CheckViability dispatch shell") — far smaller than CBM's 162-line
preamble block, consistent with there being far less preamble logic to
pin. M5d-1 through M5d-5 each depend on M5d-0, not on each other, except
the one M5d-3→M5d-5 `runCvConfuse` call noted in §4.
