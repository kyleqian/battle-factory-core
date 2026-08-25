# Ability activation-path audit — source vs port (2026-08-25)

**Tree at audit start:** `86d7b62b26d3e71275477335da5d5dff5ad8d78b` (HEAD `2a84050e`).
**Scope:** the 38 abilities that `docs/gate6-coverage-manifest.md`
§"Held-effect and ability hook universes" → "Abilities" marks
`engine-referenced-no-oracle-receipt` **and** that have ≥1 Level-50 Factory
carrier. Docs-only; no engine/test/tool/data edits.

**Time budget: 45-minute bounded worker step.** The audit did NOT finish.
11 abilities are fully paired source↔engine, 2 are DIVERGENT, and **25 are
UNVERIFIED** — for each of those the exact unread site(s) are named in
§Per-ability site tables. Nothing below is marked SOURCE-EXACT that was not
read in both halves at the cited `file:line`.

**What was NOT read at all** (named so the next session starts there):
- `AbilityBattleEffects` `ABILITYEFFECT_ON_DAMAGE` engine pairing was read
  (`battleScriptMoveEndOpcode.ts:507-608`) but its `ordinaryContactGate`
  helper was not opened — so the contact family (Rough Skin / Effect Spore /
  Poison Point / Flame Body / Cute Charm) is UNVERIFIED on the guard set
  (`MOVE_RESULT_NO_EFFECT`, attacker hp, `confusionSelfDmg`,
  `TARGET_TURN_DAMAGED`, `FLAG_MAKES_CONTACT`).
- `ABILITYEFFECT_IMMUNITY` engine pairing (Insomnia / Vital Spirit /
  Water Veil / Magma Armor end-turn cure) — source read
  (`battle_util.c:2873-2953`), engine side not opened.
- `ABILITYEFFECT_TRACE` engine pairing — source read in full
  (`battle_util.c:3017-3073`), engine side not opened; the coverage
  baseline §6b "Trace never on a lead in 114,756 samples" question is
  therefore **undecided**, see §Findings F3.
- Sticky Hold (4 source sites), Suction Cups, Liquid Ooze, Rock Head,
  Clear Body / White Smoke, Shield Dust, Inner Focus, Rain Dish / Shed Skin /
  Truant, Shadow Tag / Arena Trap — engine halves grep-located only.

---

## Summary table

| Ability | L50 carriers | Verdict | Sites audited/total | Note |
| --- | ---: | --- | ---: | --- |
| ABILITY_MAGNET_PULL | 4 | SOURCE-EXACT | 6/6 | `ABILITY_ON_FIELD2` writes **no** history record (`14 < 12` false); port's extra `absentBattlerFlags` skip is singles-unreachable (F1) |
| ABILITY_PLUS | 2 | SOURCE-EXACT | 2/2 | same; `damageCalc.ts:370-376` matches the ungated `default:` scan (F2) |
| ABILITY_MINUS | 2 | SOURCE-EXACT | 2/2 | mirror of Plus (F2) |
| ABILITY_BATTLE_ARMOR | 8 | SOURCE-EXACT | 2/2 | crit denial short-circuits the `Random()` in both halves |
| ABILITY_SHELL_ARMOR | 21 | SOURCE-EXACT | 1/1 | same `Cmd_critcalc` predicate |
| ABILITY_STURDY | 42 | SOURCE-EXACT | 2/2 | Focus Band roll first, then unconditional OHKO block |
| ABILITY_DAMP | 16 | SOURCE-EXACT | 3/3 | scan-all-battlers order + target re-point + AI −10 |
| ABILITY_SERENE_GRACE | 11 | SOURCE-EXACT | 1/1 | `chance * 2` before the `% 100` compare |
| ABILITY_HUSTLE | 6 | SOURCE-EXACT | 2/2 | atk ×1.5 ungated, acc ×0.8 gated on physical type |
| ABILITY_HUGE_POWER | 4 | SOURCE-EXACT | 1/1 | atk ×2 before every later stat modifier |
| ABILITY_PURE_POWER | 5 | SOURCE-EXACT | 1/1 | shares the Huge Power predicate |
| ABILITY_MARVEL_SCALE | 4 | SOURCE-EXACT | 1/1 | def ×1.5 on any `status1`, before the Explosion halving |
| ABILITY_TORRENT | 21 | SOURCE-EXACT | 1/1 | `hp <= maxHP/3` truncating divide, power ×1.5 |
| ABILITY_SWARM | 18 | SOURCE-EXACT | 1/1 | same pinch shape, TYPE_BUG |
| ABILITY_EARLY_BIRD | 29 | UNVERIFIED | 1/2 | AtkCanceler paired; `battle_util2.c:151` twin unpaired |
| ABILITY_ROUGH_SKIN | 3 | UNVERIFIED | 1/1* | engine guard helper unread |
| ABILITY_EFFECT_SPORE | 8 | UNVERIFIED | 1/2* | engine guard helper unread; AI table row unpaired |
| ABILITY_POISON_POINT | 18 | UNVERIFIED | 1/1* | engine guard helper unread |
| ABILITY_FLAME_BODY | 8 | UNVERIFIED | 1/1* | engine guard helper unread |
| ABILITY_CUTE_CHARM | 13 | UNVERIFIED | 1/2* | engine guard helper unread; AI table row unpaired |
| ABILITY_INSOMNIA | 15 | UNVERIFIED | 0/6 | 6 source sites; only `Cmd_jumpifcantmakeasleep`/Yawn read on the source side |
| ABILITY_VITAL_SPIRIT | 6 | UNVERIFIED | 0/6 | as Insomnia |
| ABILITY_WATER_VEIL | 9 | UNVERIFIED | 0/6 | inline burn block + `WaterVeilPrevents` + IMMUNITY cure + AI |
| ABILITY_MAGMA_ARMOR | 5 | UNVERIFIED | 0/2 | freeze block + IMMUNITY cure |
| ABILITY_TRACE | 16 | UNVERIFIED | 0/2 | source read in full; engine unread — see F3 |
| ABILITY_CLEAR_BODY | 34 | UNVERIFIED | 0/4 | `Cmd_statbuffchange` + anim count + Intimidate script + AI |
| ABILITY_WHITE_SMOKE | 2 | UNVERIFIED | 0/4 | mirror of Clear Body |
| ABILITY_SHIELD_DUST | 6 | UNVERIFIED | 0/3 | `SetMoveEffect` gate + `statbuffchange` gate + AI table |
| ABILITY_INNER_FOCUS | 24 | UNVERIFIED | 0/1 | flinch denial (`bsc:2548-2560`) |
| ABILITY_SUCTION_CUPS | 7 | UNVERIFIED | 0/2 | Roar script jump + AI −10 |
| ABILITY_STICKY_HOLD | 8 | UNVERIFIED | 0/5 | Thief/Covet, Knock Off, Trick, AI |
| ABILITY_LIQUID_OOZE | 8 | UNVERIFIED | 0/2 | absorb + Leech Seed drain sign flip |
| ABILITY_ROCK_HEAD | 40 | UNVERIFIED | 0/1 | recoil script incl. the Struggle bypass |
| ABILITY_RAIN_DISH | 6 | UNVERIFIED | 0/3 | ENDTURN heal + AI Rain Dance bonus + AI table |
| ABILITY_SHED_SKIN | 14 | UNVERIFIED | 0/2 | ENDTURN cure + AI table |
| ABILITY_TRUANT | 5 | UNVERIFIED | 0/5 | switch-in hack, AtkCanceler, ENDTURN toggle, 2 doubles AI rows |
| ABILITY_SHADOW_TAG | 3 | UNVERIFIED | 0/5 | AI escape checks + player switch legality |
| ABILITY_ARENA_TRAP | 6 | UNVERIFIED | 0/5 | as Shadow Tag |

`*` = the source site was read in full and the engine site was opened, but
one shared engine guard helper was not — so the row cannot be called exact.

**Counts:** SOURCE-EXACT **11**, DIVERGENT **3**,
UNREACHABLE-IN-FACTORY-L50 **0**, UNVERIFIED **24**.

---

## §Findings (ranked by severity)

### F1 — Magnet Pull: `ABILITY_ON_FIELD2` — **REFUTED** (was DIVERGENT), now SOURCE-EXACT

**Correction (2026-08-25, this session).** The earlier DIVERGENT verdict rested
on the claim that `AbilityBattleEffects`' tail
(`reference/pokeemerald/src/battle_util.c:3194-3195`)
`if (effect && caseID < ABILITYEFFECT_CHECK_OTHER_SIDE && gLastUsedAbility != 0xFF) RecordAbilityBattle(battler, gLastUsedAbility);`
fires for `ABILITYEFFECT_FIELD_SPORT`. **It does not.**
`reference/pokeemerald/include/battle_util.h:24` defines
`ABILITYEFFECT_CHECK_OTHER_SIDE` as **12** — the previous entry misread it as
15, which is `ABILITYEFFECT_CHECK_FIELD_EXCEPT_BATTLER` (`:27`).
`ABILITYEFFECT_FIELD_SPORT` is **14** (`:26`), so `14 < 12` is false and
**no `RecordAbilityBattle` occurs**. There is no false history write, no
poisoned `BATTLE_HISTORY->abilities[0]`, and no skipped `Random() & 1`.

**Source (re-derived at HEAD).** `include/battle_util.h:38` expands
`ABILITY_ON_FIELD2(abilityId)` to
`AbilityBattleEffects(ABILITYEFFECT_FIELD_SPORT, 0, abilityId, 0, 0)`.
The `ABILITYEFFECT_FIELD_SPORT` case (`src/battle_util.c:3111-3138`) switches
on the **global `gLastUsedAbility`**, not on the `ability` argument; since
`gLastUsedAbility` can never hold `ABILITYEFFECT_MUD_SPORT` (253) or
`ABILITYEFFECT_WATER_SPORT` (254), the `default:` branch (`:3128-3137`) always
runs: a scan of `i < gBattlersCount` for `gBattleMons[i].ability == ability`
with **no `hp != 0` gate** (unlike `ABILITYEFFECT_CHECK_ON_FIELD` at
`:3141-3148`) and **no `i != battler` exclusion** (unlike
`ABILITYEFFECT_CHECK_FIELD_EXCEPT_BATTLER` at `:3151-3158`) — so the caller's
own battler counts.

`src/battle_ai_switch_items.c:447` calls `ABILITY_ON_FIELD2(ABILITY_MAGNET_PULL)`
from `ShouldSwitch`, gated on the escaping mon being `TYPE_STEEL`.

**Port.** `src/engine/factoryAiSwitchPolicy.ts:250-257` (`"magnet-pull-steel"`
hard gate) scans `rules.battlers.slice(0, 2)` for
`battler.ability === MAGNET_PULL` and `&&`s it with
`active.types.includes("TYPE_STEEL")` — same predicate, same no-`hp` gate, and
it does **not** exclude the caller's own battler, matching the source
`default:` branch. No history write on either side. **SOURCE-EXACT.**

**Singles-unreachable nuance (not a divergence).** The port additionally
requires `(rules.absentBattlerFlags & (1 << index)) === 0` for a battler to
count; the ROM's `default:` scan has no absent check. In Factory singles
`gBattlersCount` is 2 and neither active slot is ever flagged absent while
`ShouldSwitch` runs (absent flags are a doubles/fainted-slot concept), so the
extra conjunct can never change the result. Flagged here so a future doubles
port does not inherit it silently.

**Reachability.** 4 Level-50 Magnet Pull carriers. No finding — nothing to file.

### F2 — Plus / Minus: same refutation; the damage path matches

**Source.** `reference/pokeemerald/src/pokemon.c:3207-3210`:
`if (attacker->ability == ABILITY_PLUS && ABILITY_ON_FIELD2(ABILITY_MINUS)) spAttack = (150 * spAttack) / 100;`
and the `ABILITY_MINUS` mirror. Same `ABILITYEFFECT_FIELD_SPORT` expansion as
F1, so — per the corrected constants above — a successful check performs **no**
`RecordAbilityBattle`. The membership test is the ungated all-battler
`default:` scan.

**Port.** `src/engine/damageCalc.ts:370-376` computes exactly that:
`activeBattlerAbilities` defaults to `[attacker.ability, defender.ability]` (the
full singles battler set), the test is `.some((a) => a === ABILITY_MINUS)` with
no `hp` gate and no self-exclusion, and the boost is
`Math.trunc((150 * spAttack) / 100)` — C truncating division. It sits between
Hustle (`:367-369`) and Guts (`:377-379`), matching `pokemon.c`'s order.
No history write on either side. **SOURCE-EXACT.**

**Reachability.** 2 L50 Plus carriers, 2 L50 Minus carriers. No finding.

### F3 — Trace: the "never on a lead in 114,756 samples" question is **undecided**, not resolved

Source read in full: `ABILITYEFFECT_ON_SWITCHIN` only *arms* Trace
(`src/battle_util.c:2575-2581`: sets `STATUS3_TRACE` and
`gSpecialStatuses[battler].traced`, copies nothing); the copy happens later
under `ABILITYEFFECT_TRACE` (`:3017-3073`). The singles branch is `:3051-3060`
— `gActiveBattler = target1` unconditionally, then copy only if
`gBattleMons[target1].ability && gBattleMons[target1].hp`, i.e. Trace copies
whatever the single opposing battler has, refuses `ABILITY_NONE` and a
fainted target, and on success clears `STATUS3_TRACE` and announces via
`BattleScript_TraceActivates` with the traced-**from** mon's nickname
buffered (`:3063-3068`).

The engine half was not opened, so this audit **cannot** say whether the
coverage baseline's zero-Trace-lead observation is instrument sampling or a
resolution bug. Do not close that question on this document. Next session:
pair `src/battle_util.c:2575-2581` and `:3017-3073` against the port's
switch-in path and re-run the lead census.

---

## §Per-ability site tables

Only the rows this session actually paired are given as `source` ↔ `engine`.
Everything else is listed as an unread site so the next session can resume
without re-deriving the inventory.

### Crit denial — BATTLE_ARMOR (8), SHELL_ARMOR (21) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `reference/pokeemerald/src/battle_script_commands.c:1279-1285` | `src/engine/battleScriptHitChainOpcode.ts:1472-1484` | Both put the ability test **before** the `Random()`; source's `&&` chain short-circuits, engine wraps the draw in `if (!immune)`. RNG is not consumed on a denied crit in either. `STATUS3_CANT_SCORE_A_CRIT` and the `WALLY_TUTORIAL\|FIRST_BATTLE` flags are carried identically. |
| `reference/pokeemerald/data/battle_ai_scripts.s:2375` (`AI_CV_ChangeSelfAbility_AbilitiesToEncourage`) | `src/engine/factoryAiCheckViability.ts:8356` | Battle Armor is present in the port's copy of the 16-entry encourage table, same position. |

### OHKO — STURDY (42) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_script_commands.c:7507-7519` | `src/engine/battleScriptTryKOOpcode.ts:120-148` | Focus Band's `Random() % 100 < param` roll runs **first** and is consumed even when Sturdy then blocks — both halves. Sturdy sets `MOVE_RESULT_MISSED`, `gLastUsedAbility`, records the reveal, and jumps to `BattleScript_SturdyPreventsOHKO` by direct assignment (no push) — the port uses a `jump` transition, not a call. |
| `data/battle_ai_scripts.s:358-363` (`AI_CBM_OneHitKO`) | `src/engine/factoryAiCheckBadMove.ts:2844,2862` | Sturdy → −10, then the level condition; port fuses them as `ability === STURDY \|\| attackerLevel < target.level`, matching the source's fall-through-to-`end` shape. |

### Explosion — DAMP (16) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_script_commands.c:6538-6575` | `src/engine/battleScriptExplosionOpcode.ts:118-163` | Damp scan walks **all** battlers (not just the target side), so an ally's Damp also blocks; the failing branch re-points `selectorRoles.target` to the Damp holder before jumping to `BattleScript_DampStopsExplosion`, matching source's `gBattlerTarget` loop exit. |
| `data/battle_ai_scripts.s:224-235` (`AI_CBM_Explosion`) | `src/engine/factoryAiCheckBadMove.ts:3054,3073` | x0-effectiveness → −10, then target ability → Damp −10, then the paired `count_usable_party_mons` gates. |
| `src/battle_script_commands.c:6571-6572` | `src/engine/battleResolutionPresentation.ts:1484-1500` | The message resolves `B_DEF_NAME_WITH_PREFIX` off the re-pointed Damp holder. |

### Secondary-effect chance — SERENE_GRACE (11) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_script_commands.c:2908-2925` | `src/engine/battleScriptHitChainOpcode.ts:4030-4037` | `secondaryEffectChance * 2` computed **before** the compare, so the doubled value participates in `Random() % 100 < percentChance`; the `MOVE_EFFECT_CERTAIN` branch is checked ahead of the roll in both. |

### Damage multipliers — HUSTLE (6), HUGE_POWER (4), PURE_POWER (5), MARVEL_SCALE (4), TORRENT (21), SWARM (18) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `src/pokemon.c:3158-3159` | `src/engine/damageCalc.ts:299-302` | Huge/Pure Power double raw Attack **before** badge and hold-item modifiers. |
| `src/pokemon.c:3205-3206` | `src/engine/damageCalc.ts:367-369` | Hustle's Attack ×1.5 is **ungated** — no physical-type test on this half. |
| `src/battle_script_commands.c:1156-1157` | `src/engine/damageCalc.ts:659` | Hustle's accuracy ×0.8 *is* gated on `IS_TYPE_PHYSICAL(type)` (the dynamic move type), and sits after Compound Eyes / Sand Veil in both. |
| `src/pokemon.c:3213-3214` | `src/engine/damageCalc.ts:380-382` | Marvel Scale ×1.5 Defense on **any** `status1`, and it lands *before* the Explosion `defense /= 2` (`src/pokemon.c:3228-3230` ↔ `damageCalc.ts:398-400`), so the two stack. |
| `src/pokemon.c:3223-3226` | `src/engine/damageCalc.ts:387-396` | Torrent/Swarm: `hp <= maxHP / 3` with C truncating division, power ×1.5, keyed off move type. |
| `src/pokemon.c:3207-3210` | `src/engine/damageCalc.ts:370-376` | Plus/Minus spAttack ×1.5 keyed off `ABILITY_ON_FIELD2`'s ungated all-battler scan; matches. See F1/F2 for the refuted history-write claim. |

### Recoil denial — ROCK_HEAD (40) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `data/battle_scripts_1.s:3938-3949` (`BattleScript_MoveEffectRecoil`) | `src/data/gen/battle-script-program.json` block `BattleScript_MoveEffectRecoil` (`line: 3938`) | The port carries the assembly verbatim, statement for statement: `jumpifmove MOVE_STRUGGLE, BattleScript_DoRecoil` is statement 0 (line 3939) and `jumpifability BS_ATTACKER, ABILITY_ROCK_HEAD, BattleScript_RecoilEnd` is statement 1 (line 3940). **The Struggle bypass precedes the ability jump in both halves**, so Struggle's 25% recoil is dealt to a Rock Head user. `BattleScript_DoRecoil` (3941) and `BattleScript_RecoilEnd` (3948, bare `return`) are present as their own blocks. |
| `src/battle_script_commands.c:2636-2643` (`MOVE_EFFECT_RECOIL_25`: `gHpDealt / 4`, clamp to 1, **push**+jump) | `src/engine/battleScriptHitChainOpcode.ts:3038-3053` | `Math.max(1, Math.trunc(hpDealt / 4))` then a `{kind: "call"}` transition — the source's `BattleScriptPush(instr+1)` is a call, not a jump. Matches. |
| `src/battle_script_commands.c:2843-2850` (`MOVE_EFFECT_RECOIL_33`: `gHpDealt / 3`) | `src/engine/battleScriptHitChainOpcode.ts:3055-3072` | Same shape, `/3`. |
| `src/battle_script_commands.c:3105-3149` (`Cmd_jumpifability`, plain `GetBattlerForBattleScript` branch: compare, set `gLastUsedAbility`, jump, `RecordAbilityBattle`, `gBattleScripting.battlerWithAbility`) | `src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:418-465` | All four writes ported: `lastUsedAbility`, `battlerWithAbility`, the jump, and `recordBattleScriptAbilityReveal` (`src/engine/battleScriptAiReveal.ts:10-24` — the port **does** model `RecordAbilityBattle`, as `aiObservedAbilityIds[battler]`). `ABILITY_ROCK_HEAD = 69` (`:371`) matches `include/constants/abilities.h:73`. |
| callers: `data/battle_scripts_1.s:897-902` (`BattleScript_EffectRecoil`, incl. Struggle's own `jumpifnotmove` detour) and `:2567-2569` (`BattleScript_EffectDoubleEdge`) | same program JSON | Take Down / Submission / Struggle reach the 25% case; Double-Edge the 33% case. |

**Site count 5/5.** There is **no** AI recoil scoring to pair:
`rg -in recoil` over `data/battle_ai_scripts.s` and
`src/battle_ai_script_commands.c` returns **zero** hits, and
`data/battle_ai_scripts.s` contains no `DOUBLE_EDGE`/`EFFECT_RECOIL` gate —
Emerald's AI has no recoil-specific term, so Rock Head has no AI half. (The
step brief's "AI's recoil scoring" does not exist in this ROM.)

### Sleep countdown — EARLY_BIRD (29) — SOURCE-EXACT (2/2, one site unreachable)
| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_util.c:2015-2050` (`AtkCanceler` `CANCELER_ASLEEP`) | `src/engine/battleScriptActionAdmission.ts:1401-1441` | `toSub = 2` for Early Bird else 1; then `if ((status1 & STATUS1_SLEEP) < toSub) clear else status1 -= toSub` — the port is the same two-branch subtract on the **whole** `status1` word (`sourceBattler.status1 - sleepDecrement`), not on the masked counter, so the borrow behaviour is identical. `ABILITY_EARLY_BIRD = 48` (`battleScriptSourceConstants.ts:162`) matches `include/constants/abilities.h:52`. The post-decrement branch (`Snore`/`Sleep Talk` still-asleep exemption, `HITMARKER_UNABLE_TO_USE_MOVE`, `effect = 2`, `BattleScript_MoveUsedIsAsleep`; else clear `STATUS2_NIGHTMARE` + `MoveUsedWokeUp`) is ported line for line. `UproarWakeUpCheck` runs first in both. |
| `src/battle_util2.c:151-153` | *(no engine site)* | **UNREACHABLE-IN-FACTORY-L50.** This `toSub` twin lives in `BattlePalace_TryEscapeStatus` (`src/battle_util2.c:126`), whose only caller is `src/battle_script_commands.c:6484` inside the Battle **Palace** action-selection path. The Factory never enters it. No divergence: the port correctly has no counterpart. |

### Flinch denial — INNER_FOCUS (24) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_script_commands.c:2521-2523` (family-B prologue: `if (status2 & sStatusFlagsForMoveEffects[MOVE_EFFECT_BYTE]) gBattlescriptCurrInstr++;`) | `src/engine/battleScriptHitChainOpcode.ts:3652-3659` | The already-flinched early-out precedes the Inner Focus test in **both**; `sStatusFlagsForMoveEffects[MOVE_EFFECT_FLINCH] = STATUS2_FLINCHED` (`:617`). |
| `src/battle_script_commands.c:2547-2560` (`MOVE_EFFECT_FLINCH`) | `src/engine/battleScriptHitChainOpcode.ts:3660-3679` | `primary == TRUE \|\| certain == MOVE_EFFECT_CERTAIN` → set `gLastUsedAbility`, `RecordAbilityBattle`, **plain assignment** to `BattleScript_FlinchPrevention` (no `BattleScriptPush`); else silent `gBattlescriptCurrInstr++` with no reveal. The port's `{kind: "jump"}` (not `"call"`) matches the un-pushed assignment, and the non-certain path returns `advance` with `baseRulesContext` untouched — no reveal, no message. |
| `src/battle_script_commands.c:2561-2565` (non-Inner-Focus fall-through, gated on `GetBattlerTurnOrderNum(gEffectBattler) > gCurrentTurnActionNumber`) | `src/engine/battleScriptHitChainOpcode.ts:3681-3706` and `:3739-3751` | Both the `certain` and the non-certain writers re-test Inner Focus / turn order; `gBattlescriptCurrInstr++` unconditionally either way. |

**`primary` is never TRUE on this path** — re-derived, not assumed. Every
`MOVE_EFFECT_FLINCH` producer in the ROM is secondary or certain:
`data/battle_scripts_1.s:669,792,1272,1831` are plain `setmoveeffect`
(secondary chance), `:2051` is **Fake Out**'s
`setmoveeffect MOVE_EFFECT_FLINCH | MOVE_EFFECT_CERTAIN` (so Fake Out *does*
announce Flinch Prevention against Inner Focus, and the port takes the
`certain` branch), King's Rock calls `SetMoveEffect(FALSE, 0)`
(`src/battle_util.c:3781-3784`), and Secret Power's cave environment
(`src/battle_script_commands.c:9645`) sets the byte for a secondary. No
`seteffectprimary` script sets `MOVE_EFFECT_FLINCH`. The engine's
"`primary` is always FALSE here" comment (`:3627-3629`) is therefore correct.

### Contact family (ABILITYEFFECT_ON_DAMAGE) — POISON_POINT (18), CUTE_CHARM (13), EFFECT_SPORE (8), FLAME_BODY (8), ROUGH_SKIN (3) — SOURCE-EXACT
The previous session's one open item was the `ordinaryContactGate` helper; it
is `src/engine/battleScriptMoveEndOpcode.ts:479-480` —
`attackerState.hp !== 0 && attackerState.confusionSelfDmg !== 1 && makesContact`
— with `!(moveResultFlags & MOVE_RESULT_NO_EFFECT) && targetTurnDamaged`
hoisted above it at `:470-476`.

| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_util.c:2767-2780` (Rough Skin) | `moveEndOpcode.ts:507-521` | Guard set matches exactly: `!NO_EFFECT`, attacker `hp != 0`, `!confusionSelfDmg`, `TARGET_TURN_DAMAGED`, `FLAG_MAKES_CONTACT`. Damage `maxHP / 16` clamped to ≥1 (`Math.max(1, Math.floor(...))` — unsigned, so `floor` ≡ C truncation). |
| `src/battle_util.c:2782-2804` (Effect Spore) | `moveEndOpcode.ts:523-598` | `Random() % 10 == 0`, then `do { Random() & 3 } while (== 0)`, then the burn→paralysis remap, then `\|= MOVE_EFFECT_AFFECTS_USER` and `HITMARKER_STATUS_ABILITY_EFFECT`. Same draw count, same order. |
| `src/battle_util.c:2806-2819` (Poison Point) | `moveEndOpcode.ts:523-535,555-598` | `Random() % 3 == 0` → `MOVE_EFFECT_AFFECTS_USER \| MOVE_EFFECT_POISON`, `BattleScript_ApplySecondaryEffect`. |
| `src/battle_util.c:2836-2849` (Flame Body) | same | Source orders `FLAG_MAKES_CONTACT` **before** `TARGET_TURN_DAMAGED` here (Rough Skin/Effect Spore/Poison Point/Static order them the other way); both are pure `&&` with no side effects, so hoisting `targetTurnDamaged` above the dispatch is semantically identical. Every one of the seven `ON_DAMAGE` cases carries `!NO_EFFECT` **and** `TARGET_TURN_DAMAGED`, including Color Change (`:2752-2757`) — verified case by case, so the hoist is sound for the whole switch. |
| `src/battle_util.c:2851-2869` (Cute Charm) | `moveEndOpcode.ts:533-535,559-586` | **RNG ordering confirmed:** source's `&&` chain places `gBattleMons[gBattlerTarget].hp != 0` (`:2857`) *before* `(Random() % 3) == 0` (`:2858`); the port's `if (ability === ABILITY_CUTE_CHARM && targetState.hp === 0) return` sits at `:533-535`, above the `drawBattleScriptRng` at `:558`. Same draw is skipped in both. The post-roll six-way eligibility (target hp, attacker not Oblivious, genders differ, no existing `STATUS2_INFATUATION`, neither genderless) is ported at `:566-572` in source order, and the infatuation bit is `(1 << target) << 16` ≡ `STATUS2_INFATUATED_WITH(gBattlerTarget)`. |
| `data/battle_ai_scripts.s:2373-2390` (`AI_CV_ChangeSelfAbility_AbilitiesToEncourage`, 16 entries incl. `ABILITY_EFFECT_SPORE` :2380 and `ABILITY_CUTE_CHARM` :2384) | `src/engine/factoryAiCheckViability.ts:8356-8361` | The port's `AI_CV_CHANGE_SELF_ABILITY_ENCOURAGED` set holds all 16 names in source order. This is the only AI site either ability has. |

Poison Point, Flame Body and Rough Skin have **exactly one** source site each
(`rg ABILITY_<n>` over `src` ∪ `data`, minus `src/data/`), so those rows are
complete at 1/1; Effect Spore and Cute Charm are 2/2. (`src/wild_encounter.c:397`
Cute Charm and `src/egg_hatch.c:934` Flame Body are overworld, not battle.)

### Everything else — UNVERIFIED, with the exact unread sites
Source inventory below is complete (produced by the §Method sweep); the
engine column names where to start, from `docs/ability-item-parity-census.md`
plus this session's `rg`.

- **IMMUNITY family.** Source: inline "can't be inflicted" sites
  `src/battle_script_commands.c:2291-2294` (Vital Spirit / Insomnia sleep),
  `:2342-2374` (Water Veil burn, incl. the `primary || certain` announce
  branch and the silent `break`), `:2389-2390` (Magma Armor freeze); the
  end-turn/switch-in cure `src/battle_util.c:2899-2921` + apply at
  `:2930-2951`; `Cmd_jumpifcantmakeasleep` `:6828-6848`; Yawn's end-turn
  gate `src/battle_util.c:1753-1769`; script jumps
  `data/battle_scripts_1.s:2181` (Will-O-Wisp), `:2455-2456` (Yawn); AI
  `data/battle_ai_scripts.s:216-222` and `:531-539`. Engine starts:
  `battleScriptStatusPrimaryOpcode.ts:236`,
  `battleScriptHitChainOpcode.ts:3389`, `battleEndTurnOrchestration.ts:1042`,
  `battleScriptMoveEndOpcode.ts:154`, `factoryAiCheckBadMove.ts:2733`.
- **Stat-drop denial.** Source: `src/battle_script_commands.c:6987-7000`
  (the `!certain && gCurrentMove != MOVE_CURSE` guard),
  `:4142-4145` (the *animation* count, a separate predicate list),
  `data/battle_scripts_1.s:4030-4032` (Intimidate), AI
  `data/battle_ai_scripts.s:306-312`. Engine starts:
  `battleScriptStatBuffs.ts:266`,
  `battleScriptPlaystatchangeanimationOpcode.ts:161`,
  `factoryAiCheckBadMove.ts:810,846,871,918`.
- **Trapping.** Source: `src/battle_ai_switch_items.c:443-451`,
  `src/battle_ai_script_commands.c:1369-1376` and `:1420-1425`,
  `src/battle_main.c:4046,4056,4064,4248-4252`. Engine starts:
  `factoryAiSwitchPolicy.ts:54,254`, `battleScriptSwitchinOpcode.ts:902-908`,
  `factoryBattleScriptFullTurnDecision.ts:2104`.
  Note `src/battle_ai_switch_items.c:445`'s stock comment "Misses the flying
  type and Levitate check" — Arena Trap's AI half really does trap Flying/
  Levitate mons; a port that fixed it would be DIVERGENT.
- **ENDTURN.** Source: `src/battle_util.c:2607-2618` (Rain Dish),
  `:2620-2641` (Shed Skin, `Random() % 3 == 0`, and it clears
  `STATUS2_NIGHTMARE`), `:2653-2655` (Truant's `^= 1`),
  `src/battle_script_commands.c:5260-5263` (the switch-in truant hack),
  `src/battle_util.c:2087-2095` (AtkCanceler half). Engine starts:
  `battleEndTurnOrchestration.ts:1181-1221`,
  `battleScriptSwitchinOpcode.ts:1182-1184`.
- **Item theft/swap denial (Sticky Hold).** Source:
  `src/battle_script_commands.c:2767-2775` (Thief/Covet — note it sits
  *after* the Frontier-exempt knocked-off check at `:2757-2766`),
  `:2864-2877` (Knock Off, with the empty-hand fall-through),
  `:9229-9234` (Trick), AI `data/battle_ai_scripts.s:545-548`.
- **Forced switch (Suction Cups).** `data/battle_scripts_1.s:597` — the jump
  is **before** both `accuracycheck`s, so Roar fails against Suction Cups
  without an accuracy roll; AI `data/battle_ai_scripts.s:334-339`.
- **Drain reversal (Liquid Ooze).** `data/battle_scripts_1.s:345-350`
  (absorb) and `:3271-3276` (Leech Seed) — in both, Liquid Ooze *skips* the
  `manipulatedamage DMG_CHANGE_SIGN`, it does not add one.
- **Shield Dust.** `src/battle_script_commands.c:2253-2255` (needs
  `!HITMARKER_STATUS_ABILITY_EFFECT && !primary && effectByte <= 9`) and
  `:7035-7037` (the `flags == 0` stat-drop gate). Engine notes at
  `battleScriptStatBuffs.ts:16-18` claim the second is structurally
  unreachable — an engine comment is not evidence; re-derive it.

---

## §Method (reproducible)

Ability list (38 rows):
```sh
sed -n '/^### Abilities (all legal-universe rows)/,/^### Hold effects/p' \
  docs/gate6-coverage-manifest.md \
| awk -F'|' '/^\| ABILITY_/ {gsub(/ /,"",$2); gsub(/ /,"",$3); gsub(/ /,"",$4);
    if ($3=="engine-referenced-no-oracle-receipt" && $4+0>0) print $2, $4}'
```

Complete source-site inventory (129 hits across the 38). **`reference/` is a
symlink, so plain `rg reference/pokeemerald/src` silently returns nothing** —
resolve it first (this cost this session ~4 minutes):
```sh
REF=$(cd reference/pokeemerald && pwd -P)
while read -r n c; do
  echo "===== $n ($c carriers)"
  rg -n --no-heading "\b$n\b" "$REF/src" "$REF/data" \
    | grep -v "$REF/src/data/" | sed "s|$REF/||"
done < abilities.txt
```
(`src/data/` is excluded because it is the species/ability tables, not
behaviour. `$REF/data` supplies the `battle_scripts_1.s` /
`battle_ai_scripts.s` `jumpifability` and `if_equal` sites that
`src/data/gen/ability-item-hooks.json` does not index.)

Engine sites — the engine spells abilities both as string literals and as
numeric identity consts, so match both:
```sh
while read -r n c; do
  rg -n --no-heading -i "\b$n\b|$(echo "${n#ABILITY_}" | tr '_' ' ')" \
     src/engine src/data/*.ts
done < abilities.txt
```
Caveat found the hard way: the prose match makes `ABILITY_TRACE`,
`ABILITY_PLUS`, `ABILITY_MINUS` and `ABILITY_TRUANT` extremely noisy
(449 / 203 / 169 / 81 hits — "trace", "plus", "minus" appear throughout the
presentation modules). Filter those four by the literal token only.

Throw-site census on any audited path:
```sh
tools/probe/premise-census.py --help
```
No premise-worded throw was reached on any path audited above.

**Note on the zsh trap:** this workspace's shell is zsh, where
`for n in $NAMES` does **not** word-split. Use `while read`.
