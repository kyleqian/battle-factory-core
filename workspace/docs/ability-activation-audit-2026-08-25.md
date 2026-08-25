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
| ABILITY_MAGNET_PULL | 4 | **DIVERGENT** | 3/6 | `ABILITY_ON_FIELD2` records a *false* ability onto battler 0; port has no such write (F1) |
| ABILITY_PLUS | 2 | **DIVERGENT** | 2/2 | same `ABILITY_ON_FIELD2` side effect, via `CalculateBaseDamage` (F2) |
| ABILITY_MINUS | 2 | **DIVERGENT** | 2/2 | mirror of Plus (F2) |
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

### F1 — Magnet Pull: `ABILITY_ON_FIELD2` writes a *false* ability into the AI's battle history; the port writes nothing

**Source.** `ABILITY_ON_FIELD2` does **not** dispatch to
`ABILITYEFFECT_CHECK_ON_FIELD`. `include/battle_util.h:38` expands it to
`AbilityBattleEffects(ABILITYEFFECT_FIELD_SPORT, 0, abilityId, 0, 0)`.
`ABILITYEFFECT_FIELD_SPORT` (`src/battle_util.c:3111-3138`) switches on the
**global `gLastUsedAbility`**, not on its `ability` argument; since
`gLastUsedAbility` can never hold `ABILITYEFFECT_MUD_SPORT` (253) or
`ABILITYEFFECT_WATER_SPORT` (254), the `default:` branch always runs — a
scan of every battler for `gBattleMons[i].ability == ability` with **no
`hp != 0` gate**.

The tail at `src/battle_util.c:3194-3195` then runs:
`if (effect && caseID < ABILITYEFFECT_CHECK_OTHER_SIDE && gLastUsedAbility != 0xFF) RecordAbilityBattle(battler, gLastUsedAbility);`
`ABILITYEFFECT_FIELD_SPORT` is 14 and `ABILITYEFFECT_CHECK_OTHER_SIDE` is 15,
so the guard passes, and `battler` is the literal `0` the macro hardcodes.
`RecordAbilityBattle` (`src/battle_ai_script_commands.c:643-646`) has **no
side guard** — it writes `BATTLE_HISTORY->abilities[0] = abilityId`
unconditionally.

`src/battle_ai_switch_items.c:447` calls
`ABILITY_ON_FIELD2(ABILITY_MAGNET_PULL)` from `ShouldSwitch`. In Factory
singles battler 0 is the **player's** active mon. So the moment the AI runs
its escape check with a Magnet Pull anywhere on the field (including the
AI's own mon), the ROM records `ABILITY_MAGNET_PULL` as the *player's*
ability.

That record is load-bearing for the AI: `Cmd_get_ability`
(`src/battle_ai_script_commands.c:1361-1366`) and `Cmd_check_ability`
(`:1414-1418`) return `BATTLE_HISTORY->abilities[battler]` first, **before**
the two-ability `Random() & 1` guess at `:1383-1386`. So the poisoned record
both (a) changes every ability-gated score gate against the player, and
(b) **removes a `Random()` call** from the AI's scoring — an RNG-stream
divergence, not just a score one.

**Port.** `src/engine/factoryAiSwitchPolicy.ts:56,254` implements the
Magnet Pull escape check itself (`battler.ability === MAGNET_PULL`) but the
file contains no ability-history write of any kind (`rg` for
`recordAbility|abilityHistory` in that file: 0 hits). The false record and
the skipped `Random() & 1` are both absent.

**Separating input.** AI-side mon with Magnet Pull (e.g. a Steel/Electric
carrier) active while the AI evaluates a switch, then any later AI turn
whose CheckBadMove/CheckViability path reads the player's ability where the
player's species has two possible abilities.

**Reachability.** 4 Level-50 Magnet Pull carriers in
`src/data/gen/battle-frontier-mons.json`; `ShouldSwitch` runs on every AI
turn, so once a Magnet Pull mon is out the record is set for the rest of the
battle.

**Staging recipe (`mechanicLab`, `overrides.parties`, stock ROM).** Give the
opponent a Magnet Pull carrier in slot 1 plus two fillers; give the player a
species with **two** legal abilities in slot 1 (so the AI's guess branch is
the one being skipped) and two fillers. Give all opponent slots one legal
move so the AI has one legal choice. Run two traces from the same seed —
one with the Magnet Pull carrier active, one with a non-Magnet-Pull filler
active — and diff the AI's chosen move / the post-turn RNG. Build both
parties per `tools/battle-lab/README.md`'s complete-mon shape (species,
level 50, nature, six IVs, six EVs, moves, PP Ups, item, `abilitySlot`,
friendship, gender, shiny).

**Proposed ISSUES.md entry (supervisor files this):**
> **Magnet Pull / `ABILITY_ON_FIELD2` — the ROM's false `BATTLE_HISTORY`
> write is not ported.** `ABILITY_ON_FIELD2` expands to
> `ABILITYEFFECT_FIELD_SPORT` (`include/battle_util.h:38`), whose tail
> (`src/battle_util.c:3194-3195`) calls `RecordAbilityBattle(0, abilityId)`
> — unguarded (`src/battle_ai_script_commands.c:643-646`). In Factory
> singles battler 0 is the player, so `ShouldSwitch`'s Magnet Pull check
> (`src/battle_ai_switch_items.c:447`) stamps `ABILITY_MAGNET_PULL` onto the
> player's history. `Cmd_get_ability` (`:1361`) then short-circuits ahead of
> the `Random() & 1` two-ability guess (`:1383`), changing both AI scores and
> the RNG stream. `src/engine/factoryAiSwitchPolicy.ts:254` ports the escape
> check but not the write. 4 L50 carriers. Needs a stock-ROM receipt before
> any fix.

### F2 — Plus / Minus: the same missing `ABILITY_ON_FIELD2` side effect, on the damage path

**Source.** `src/pokemon.c:3207-3210`:
`if (attacker->ability == ABILITY_PLUS && ABILITY_ON_FIELD2(ABILITY_MINUS)) spAttack = (150 * spAttack) / 100;` and the mirror.
Same expansion as F1, so a successful check also performs
`RecordAbilityBattle(0, ABILITY_MINUS)` / `(0, ABILITY_PLUS)`.

**Port.** `src/engine/damageCalc.ts:370-376` computes the membership test
correctly for singles (`activeBattlerAbilities` defaults to
`[attacker.ability, defender.ability]`, and — matching the source's
`default:` branch — applies no `hp != 0` gate), but performs no history
write.

**Separating input.** Plusle (Plus) attacking with a special move while a
Minun (Minus) is the opposing active mon: the ROM's boost and the port's
boost agree, but the ROM additionally reports `ABILITY_MINUS` as battler 0's
ability to the AI for the rest of the battle.

**Reachability.** 2 L50 Plus carriers and 2 L50 Minus carriers; the check
only runs when the Plus/Minus holder is the *attacker*, so this is the
lowest-reachability finding of the three. Rank: below F1.

**Staging recipe.** Player slot 1 = Plusle (level 50, complete legal set,
one special attacking move), opponent slot 1 = Minun, two legal fillers per
side, all opponent slots given the same single move. Compare the AI's
subsequent ability-gated scoring against a Minun→non-Minus control.

**Proposed ISSUES.md entry:** as F1, naming `src/pokemon.c:3207-3210` ↔
`src/engine/damageCalc.ts:370-376`; note it is the same root cause as the
Magnet Pull entry and should be fixed in one place if a shared
`ABILITY_ON_FIELD2` helper is introduced.

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
| `src/pokemon.c:3207-3210` | `src/engine/damageCalc.ts:370-376` | **DIVERGENT** — see F2. |

### Everything else — UNVERIFIED, with the exact unread sites
Source inventory below is complete (produced by the §Method sweep); the
engine column names where to start, from `docs/ability-item-parity-census.md`
plus this session's `rg`.

- **Contact family (ON_DAMAGE).** Source read in full:
  `src/battle_util.c:2767-2780` (Rough Skin), `:2782-2804` (Effect Spore),
  `:2806-2819` (Poison Point), `:2836-2849` (Flame Body), `:2851-2869`
  (Cute Charm). Engine read: `src/engine/battleScriptMoveEndOpcode.ts:507-608`
  — the proc divisors (10 for Effect Spore, 3 for the rest), the Effect
  Spore `do { Random() & 3 } while (== 0)` + burn→paralysis remap, and Cute
  Charm's full six-way eligibility guard all match at the line level.
  **Unread:** the `ordinaryContactGate` helper that stands in for source's
  `!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT) && attacker hp != 0 &&
  !confusionSelfDmg && TARGET_TURN_DAMAGED && FLAG_MAKES_CONTACT`. Note the
  source's per-sibling ordering differs (Flame Body and Cute Charm test
  contact *before* `TARGET_TURN_DAMAGED`; Rough Skin/Effect Spore/Poison
  Point/Static test it after) — pure `&&`, so semantically identical, but a
  port that reordered the RNG draw relative to a gate would not be.
  Cute Charm additionally re-tests `gBattleMons[gBattlerTarget].hp != 0`
  **before** its `Random() % 3` (`:2857-2858`); the port hoists that test
  above the draw (`moveEndOpcode.ts:533-535`) — same predicate, but the RNG
  ordering needs one confirming read.
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
- **Recoil denial (Rock Head).** `data/battle_scripts_1.s:3938-3949` —
  `jumpifmove MOVE_STRUGGLE, BattleScript_DoRecoil` comes **first**, so
  Struggle ignores Rock Head. 40 L50 carriers; this is the highest-carrier
  unread row and should be first next session.
- **Flinch immunity (Inner Focus).** `src/battle_script_commands.c:2548-2560`
  — the announce only happens on `primary || certain`; otherwise the flinch
  is dropped silently.
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
