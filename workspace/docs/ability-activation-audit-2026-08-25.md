# Ability activation-path audit — source vs port (2026-08-25)

**Tree at audit start:** `86d7b62b26d3e71275477335da5d5dff5ad8d78b` (HEAD `a2e72119`).
**Scope:** the 38 abilities that `docs/gate6-coverage-manifest.md`
§"Held-effect and ability hook universes" → "Abilities" marks
`engine-referenced-no-oracle-receipt` **and** that have ≥1 Level-50 Factory
carrier. Docs-only; no engine/test/tool/data edits.

**Status: COMPLETE.** All 38 rows are paired source↔engine at cited
`file:line`, both halves opened at HEAD. Two bounded worker sessions:
the first paired 11 rows and raised 3 findings; this one refuted all 3,
converted the remaining 24, and raised **one real finding (F1, Trace)** plus
one latent ordering finding (F2) and one out-of-scope adjacent observation
(Intimidate). Nothing below is marked SOURCE-EXACT that was not read in both
halves.

**Verdicts: SOURCE-EXACT 38, DIVERGENT 0, UNREACHABLE-IN-FACTORY-L50 0,
UNVERIFIED 0.** Twelve *sites* inside otherwise-exact rows are
UNREACHABLE-IN-FACTORY-L50 with proof (Battle Palace, Battle Arena, Battle
Pike, doubles-only AI labels, the roaming-Pokémon AI, overworld code, and the
Frontier disobedience short-circuit); each is called out in its row.

**Findings:** F1 Trace's `RecordAbilityBattle(0, copiedAbility)` is unported
(RNG-stream affecting, 16 L50 carriers) · F2 `nextGetAbilityDraw` inverts the
history-vs-trapper order (latent, becomes live once F1 is fixed) · adjacent:
Intimidate shares F1's tail and its record is outright false.

**Throw-site census (`python3 tools/probe/premise-census.py --only <file> --premise`,
run this session).** Across the 15 engine files audited here, **five**
premise-worded `throw`s sit on an audited path; each is an assertion this audit
independently confirms rather than a divergence, but all five are recorded
because a premise is a claim:

| Site | Premise | On which audited path | Status |
| --- | --- | --- | --- |
| `src/engine/factoryBattleStart.ts:242` | `${entryLabel} unexpectedly consumed battle RNG` | `runEntryScript("BattleScript_TraceActivates", …)` (`:509`) and the Intimidate twin (`:466-483`) | Holds — `BattleScript_TraceActivates` is message/wait only, no RNG opcode. |
| `src/engine/factoryBattleStart.ts:307` and `:320` | battle-start `ON_SWITCHIN` callback/dispatch consumed no RNG | the Trace/Intimidate **arm** pass (`:437-462`) | Holds — arming is two flag writes (`battle_util.c:2575-2581`). |
| `src/engine/battleScriptHitChainOpcode.ts:3475` | `applySetMoveEffect: unreachable MOVE_EFFECT_BYTE` | the family-A status switch behind Insomnia / Vital Spirit / Water Veil / Magma Armor / Shield Dust | Holds for every byte this audit reached; it is a genuine closed-world claim over `MOVE_EFFECT_*`, not a source guard. |
| `src/engine/battleScriptMoveEndOpcode.ts:271` | `Cmd_moveend: statStages width invariant violated` | `MOVEEND_ON_DAMAGE_ABILITIES` / `MOVEEND_IMMUNITY_ABILITIES` | Holds — width is fixed by `battleScriptRulesContext`. |

Two further `throw`s on audited paths are ordinary unresolved-label lookups
against the committed program, not premises
(`battleScriptIngrainLeechSeedWrapOpcode.ts:445`,
`battleEndTurnOrchestration.ts:1123-1125`). No premise-worded throw was
*reached* on any path audited above.

---

## Summary table

| Ability | L50 carriers | Verdict | Sites audited/total | Note |
| --- | ---: | --- | ---: | --- |
| ABILITY_MAGNET_PULL | 4 | SOURCE-EXACT | 6/6 | `ABILITY_ON_FIELD2` writes **no** history record (`14 < 12` false); port's extra `absentBattlerFlags` skip is singles-unreachable (first pass's F1, refuted) |
| ABILITY_PLUS | 2 | SOURCE-EXACT | 2/2 | same; `damageCalc.ts:370-376` matches the ungated `default:` scan (first pass's F2, refuted) |
| ABILITY_MINUS | 2 | SOURCE-EXACT | 2/2 | mirror of Plus (refuted) |
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
| ABILITY_EARLY_BIRD | 29 | SOURCE-EXACT | 2/2 | AtkCanceler `toSub`; the `battle_util2.c:151` twin is Battle Palace only |
| ABILITY_ROUGH_SKIN | 3 | SOURCE-EXACT | 1/1 | `ordinaryContactGate` opened — full guard set matches |
| ABILITY_EFFECT_SPORE | 8 | SOURCE-EXACT | 2/2 | `%10` then `do{&3}while(==0)`; AI encourage-table row paired |
| ABILITY_POISON_POINT | 18 | SOURCE-EXACT | 1/1 | `%3` → AFFECTS_USER\|POISON |
| ABILITY_FLAME_BODY | 8 | SOURCE-EXACT | 1/1 | contact-before-damaged ordering is pure `&&` |
| ABILITY_CUTE_CHARM | 13 | SOURCE-EXACT | 2/2 | hp test precedes the `%3` draw in both halves |
| ABILITY_INSOMNIA | 15 | SOURCE-EXACT | 6/6 | one site (obedience) unreachable: Frontier short-circuit |
| ABILITY_VITAL_SPIRIT | 6 | SOURCE-EXACT | 6/6 | as Insomnia |
| ABILITY_WATER_VEIL | 9 | SOURCE-EXACT | 6/6 | announce needs `primary\|\|certain`; silent fall-through ported |
| ABILITY_MAGMA_ARMOR | 5 | SOURCE-EXACT | 2/2 | freeze block + IMMUNITY cure, both silent |
| ABILITY_TRACE | 16 | SOURCE-EXACT | 4/4 | **F1**: the tail's `RecordAbilityBattle(0, …)` is unported |
| ABILITY_CLEAR_BODY | 34 | SOURCE-EXACT | 4/4 | `statLowered` short-circuit unrepresented — singles-unreachable |
| ABILITY_WHITE_SMOKE | 2 | SOURCE-EXACT | 4/4 | mirror of Clear Body |
| ABILITY_SHIELD_DUST | 6 | SOURCE-EXACT | 3/3 | the `flags == 0` stat-drop gate IS implemented (`statBuffs.ts:278`) |
| ABILITY_INNER_FOCUS | 24 | SOURCE-EXACT | 1/1 | `primary` never TRUE on this path — re-derived from every producer |
| ABILITY_SUCTION_CUPS | 7 | SOURCE-EXACT | 2/2 | jump precedes both `accuracycheck`s — no RNG on the block |
| ABILITY_STICKY_HOLD | 8 | SOURCE-EXACT | 4/4 | Thief pushes, Knock Off / Trick jump — port matches each |
| ABILITY_LIQUID_OOZE | 8 | SOURCE-EXACT | 2/2 | Absorb **adds** the sign flip, Leech Seed **skips** it (gloss corrected) |
| ABILITY_ROCK_HEAD | 40 | SOURCE-EXACT | 5/5 | Struggle bypass precedes the ability jump; ROM has no AI recoil term |
| ABILITY_RAIN_DISH | 6 | SOURCE-EXACT | 3/3 | ENDTURN heal + `AI_CV_RainDance` Gate R + encourage table |
| ABILITY_SHED_SKIN | 14 | SOURCE-EXACT | 2/2 | status test precedes the `%3` draw; NIGHTMARE cleared |
| ABILITY_TRUANT | 5 | SOURCE-EXACT | 5/5 | 2 doubles AI rows unreachable; `truantSwitchInHack` is Arena-only |
| ABILITY_SHADOW_TAG | 3 | SOURCE-EXACT | 5/5 | AI/player gates differ in source and in the port, identically |
| ABILITY_ARENA_TRAP | 6 | SOURCE-EXACT | 5/5 | the AI half's missing Flying/Levitate check is faithfully kept |

**Counts:** SOURCE-EXACT **38**, DIVERGENT **0**,
UNREACHABLE-IN-FACTORY-L50 **0** (rows) / **12** (individual sites inside
exact rows, each proved in its row), UNVERIFIED **0**.

---

## §Findings (ranked by severity)

### F1 — Trace: `AbilityBattleEffects`' tail records the copied ability onto **battler 0**; the port makes no such write

**Source.** `AbilityBattleEffects` ends every non-Safari dispatch with
(`reference/pokeemerald/src/battle_util.c:3194-3195`):
`if (effect && caseID < ABILITYEFFECT_CHECK_OTHER_SIDE && gLastUsedAbility != 0xFF) RecordAbilityBattle(battler, gLastUsedAbility);`
`ABILITYEFFECT_CHECK_OTHER_SIDE` is **12** (`include/battle_util.h:24`) and
`ABILITYEFFECT_TRACE` is **11** (`:23`), so **the guard passes for Trace.**
The tail sits after the outer `switch (caseID)` inside the
`if (!(gBattleTypeFlags & BATTLE_TYPE_SAFARI))` block (`:2464`), and the
`ABILITYEFFECT_TRACE` case (`:3017-3072`) never reassigns `battler` — it works
through `i`, `target1`, `target2`, `gActiveBattler`. Both Trace dispatch sites
pass the literal **0** for `battler`
(`src/battle_main.c:3882`, `src/battle_util.c:1960`). On a successful copy
`gLastUsedAbility` holds the **copied** ability, so the ROM executes
`RecordAbilityBattle(0, copiedAbility)` — and `RecordAbilityBattle`
(`src/battle_ai_script_commands.c:643-646`) is an unguarded
`BATTLE_HISTORY->abilities[battler] = abilityId`.

In Factory singles battler 0 is the **player**. The value written is not
false — the tracer copies the opposing battler's ability, so when the AI's mon
traces, `copiedAbility` *is* the player's ability — but that is exactly the
point: **the ROM hands the AI the player's real ability for free**, and
`Cmd_get_ability` (`src/battle_ai_script_commands.c:1361-1366`) /
`Cmd_check_ability` (`:1414-1418`) read `BATTLE_HISTORY->abilities[battler]`
**before** the two-ability `Random() & 1` guess (`:1383-1386`). So the record
both changes ability-gated AI scores and **removes a `Random()` draw** from the
AI's scoring — an RNG-stream divergence, not only a score one.

**Port.** Neither Trace resolution site writes the record:
- `src/engine/factoryBattleStart.ts:484-513` (battle start) sets
  `scriptingBattler`, `lastUsedAbility` and `battleTextBuff1MonNick` and makes
  **no** `aiObservedAbilityIds` write at all.
- `src/engine/battleScriptFaintedActionsOrchestration.ts:437-471` (post-faint)
  *does* write, but to `aiObservedAbilityIds[id]` where `id` is the **tracer**
  (`:454-459`), not the hardcoded battler 0.

That field is the port's `BATTLE_HISTORY->abilities`: it flows
`aiObservedAbilityIds[0]` → `syncFactoryAiBattleHistory`
(`src/engine/factoryAiLiveDriver.ts:230-238`) → `knownAbilities[0]` →
`target.knownAbility` (`:395`) → the short-circuit at
`src/engine/factoryAiCheckBadMove.ts:723-725` and
`src/engine/factoryAiCheckViability.ts:8419-8421` that skips the `Random() & 1`.

**Separating input.** Opponent lead = a Trace carrier (Gardevoir / Porygon /
Porygon2); player lead = a **two-ability** species. The AI's Trace copies the
player's ability at battle start. ROM: `BATTLE_HISTORY->abilities[0]` is set,
so every later `get_ability AI_TARGET` / `check_ability AI_TARGET` returns it
with **no draw**. Port: `knownAbilities[0]` is still `null`, so the same gate
draws `Random() & 1` and may guess the wrong ability. First observable
difference: the AI's RNG call count on the first turn that runs any
ability-gated CBM/CV handler, and any score that depends on the guess.

**Reachability.** 16 Level-50 Trace carriers
(`docs/soak-coverage-baseline-2026-08-25.md:211`: Porygon ×2 sets, Porygon2 ×4,
Gardevoir ×8), drafted on both sides; the AI-side case needs only the Trace mon
to be active when the copy resolves, and the record then persists until that
battler switches (`ClearBattlerAbilityHistory`, `src/battle_main.c:3260,3354`,
mirrored by the port's party-index clear at `factoryAiLiveDriver.ts:198-208`).

**Staging recipe (`mechanicLab`, `overrides.parties`, stock ROM).** Opponent
slot 1 = GARDEVOIR (level 50, complete legal set per
`tools/battle-lab/README.md`'s complete-mon shape: species, level, nature, six
IVs, six EVs, four moves, PP Ups, item, `abilitySlot` = the Trace slot,
friendship, gender, shiny) plus two fillers; player slot 1 = a species with
**two** legal abilities (so the guess branch is the one being skipped) plus two
fillers. Give every opponent slot a single legal move so the AI has one legal
choice, and give the player's lead a move whose AI handler reads
`get_ability AI_TARGET` (e.g. any of the stat-down family, so
`CheckIfAbilityBlocksStatChange` runs). Trace two runs from the same seed —
one with the Gardevoir active, one with a non-Trace filler active — and diff
the AI's RNG call count and chosen move.

**Proposed ISSUES.md entry (supervisor files this):**
> **Trace — the ROM's `RecordAbilityBattle(0, copiedAbility)` is not ported.**
> `AbilityBattleEffects`' tail (`src/battle_util.c:3194-3195`) fires for
> `ABILITYEFFECT_TRACE` (11 < 12, `include/battle_util.h:23-24`) with the
> literal `battler = 0` both dispatch sites pass
> (`src/battle_main.c:3882`, `src/battle_util.c:1960`), stamping the copied
> ability into `BATTLE_HISTORY->abilities[0]` — the player's slot in Factory
> singles. `Cmd_get_ability` (`:1361`) then short-circuits ahead of the
> `Random() & 1` two-ability guess (`:1383`), changing AI scores **and** the
> RNG stream. The port writes nothing at battle start
> (`src/engine/factoryBattleStart.ts:484-513`) and writes the tracer's own
> index post-faint (`src/engine/battleScriptFaintedActionsOrchestration.ts:454-459`).
> 16 L50 carriers. Needs a stock-ROM receipt before any fix.

### F2 — `nextGetAbilityDraw` tests the trapper abilities **before** the history cache; source tests the cache first

**Source.** `Cmd_get_ability` (`src/battle_ai_script_commands.c:1361-1376`) and
`Cmd_check_ability` (`:1414-1425`) both read
`BATTLE_HISTORY->abilities[battler]` **first** and only then fall through to
the Shadow Tag / Magnet Pull / Arena Trap direct-field branch.

**Port.** `src/engine/factoryAiCheckViability.ts:8419-8427` has the source
order. `src/engine/factoryAiCheckBadMove.ts:720-725` (`nextGetAbilityDraw`) and
`:772-776` have it **inverted** — `TRAPPER_ABILITIES.has(target.realAbility)`
is checked before `target.knownAbility`.

**Currently unobservable, and why.** A nonzero history cell always equals the
current occupant's real ability: `ClearBattlerAbilityHistory` runs on every
switch-in and faint (`src/battle_main.c:3260,3354`), and every ordinary
`RecordAbilityBattle` call site passes the battler whose ability it is. The two
orders therefore return the same value today.

**Why it still matters.** The `AbilityBattleEffects` tail is the one call site
that writes a *different* battler's ability into slot 0 (F1, and the adjacent
Intimidate observation below). The moment F1 is fixed, a player-side trapper
carrier facing an AI-side Intimidate or Trace mon separates the two orders.
Fix F2 in the same change as F1, or the fix will be half-right.
**No separate ISSUES entry needed if F1's entry names this file:line.**

### Adjacent observation (out of this audit's 24 rows) — Intimidate takes the same tail, and its record *is* false

`ABILITYEFFECT_INTIMIDATE1` is **9** (`include/battle_util.h:21`), also `< 12`,
and its case (`src/battle_util.c:3003-3016`) sets
`gLastUsedAbility = ABILITY_INTIMIDATE` without touching `battler`. Its
dispatch sites pass the literal 0 as well (`src/battle_main.c:3880`,
`src/battle_util.c:1959`). So when the **AI's** mon has Intimidate the ROM
records `ABILITY_INTIMIDATE` as **battler 0's** — the player's — ability, which
unlike the Trace case is simply **wrong**, and it likewise removes the
`Random() & 1` guess. The port writes the holder's own index
(`src/engine/battleScriptFaintedActionsOrchestration.ts:424-433`,
`src/engine/factoryBattleStart.ts:466-483` writes nothing). Intimidate is not
one of this audit's 24 abilities (it has an oracle receipt), so this is
recorded, not filed — but any F1 fix should cover caseIDs 9, 10 and 11
together, since they share the tail.

### Refuted by this session (were F1/F2/F3 in the first pass)

- **Magnet Pull / Plus / Minus `ABILITY_ON_FIELD2` "false history write"** —
  refuted. `ABILITYEFFECT_FIELD_SPORT` is **14** and the tail's guard is
  `caseID < 12`, so `14 < 12` is false and no record is written. Details and
  the corrected pairings are in the per-ability tables above
  (§"`ABILITY_ON_FIELD2` — MAGNET_PULL / PLUS / MINUS" in §Per-ability site tables).
  The first pass misread `ABILITYEFFECT_CHECK_OTHER_SIDE` as 15 (that is
  `ABILITYEFFECT_CHECK_FIELD_EXCEPT_BATTLER`, `include/battle_util.h:27`).
- **Trace "never on a lead in 114,756 samples" is undecided** — resolved:
  **instrument sampling**, not a resolution bug. See the Trace row's F3
  paragraph in §Per-ability site tables.

## §Per-ability site tables

Every one of the 38 rows is given as `source` ↔ `engine`, grouped by shared
hook. Each row's site count in the summary table is the number of source sites
in the complete inventory (§Method's sweep, minus `src/data/`), and each
unreachable site is named with its proof inline rather than left implicit.

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
| `src/pokemon.c:3207-3210` | `src/engine/damageCalc.ts:370-376` | Plus/Minus spAttack ×1.5 keyed off `ABILITY_ON_FIELD2`'s ungated all-battler scan; matches. See §`ABILITY_ON_FIELD2` above for the refuted history-write claim. |

### `ABILITY_ON_FIELD2` — MAGNET_PULL (4), PLUS (2), MINUS (2) — SOURCE-EXACT (first pass's DIVERGENT verdict refuted)
| Source | Engine | Note |
| --- | --- | --- |
| `include/battle_util.h:38` — `ABILITY_ON_FIELD2(abilityId)` ⇒ `AbilityBattleEffects(ABILITYEFFECT_FIELD_SPORT, 0, abilityId, 0, 0)` | — | The dispatch is `ABILITYEFFECT_FIELD_SPORT` = **14** (`:26`). |
| `src/battle_util.c:3111-3138` (`ABILITYEFFECT_FIELD_SPORT`) | — | Switches on the **global `gLastUsedAbility`**, not the `ability` argument; `gLastUsedAbility` can never hold `ABILITYEFFECT_MUD_SPORT` (253) or `ABILITYEFFECT_WATER_SPORT` (254), so the `default:` branch (`:3128-3137`) always runs: scan `i < gBattlersCount` for `gBattleMons[i].ability == ability` with **no `hp != 0` gate** (contrast `ABILITYEFFECT_CHECK_ON_FIELD`, `:3141-3148`) and **no `i != battler` exclusion** (contrast `ABILITYEFFECT_CHECK_FIELD_EXCEPT_BATTLER`, `:3151-3158`). |
| `src/battle_util.c:3194-3195` (the shared record tail) | — | **No record is written for this caseID.** The guard is `caseID < ABILITYEFFECT_CHECK_OTHER_SIDE`, and that constant is **12** (`include/battle_util.h:24`); `14 < 12` is false. The first pass read the constant as 15 — that value is `ABILITYEFFECT_CHECK_FIELD_EXCEPT_BATTLER` (`:27`) — and filed a DIVERGENT verdict on the resulting phantom `RecordAbilityBattle(0, …)`. Refuted at source, both files opened at HEAD. (Contrast **F1**: caseIDs 9/10/11 *do* pass this guard.) |
| `src/battle_ai_switch_items.c:447` (`ShouldSwitch`'s `ABILITY_ON_FIELD2(ABILITY_MAGNET_PULL)`, `&&`-gated on the escaper being `TYPE_STEEL`) | `src/engine/factoryAiSwitchPolicy.ts:250-257` (`"magnet-pull-steel"`) | Same predicate, same missing `hp` gate, and — matching the `default:` branch — **no self-exclusion**. |
| `src/pokemon.c:3207-3210` (Plus / Minus, `spAttack = (150 * spAttack) / 100`) | `src/engine/damageCalc.ts:370-376` | `activeBattlerAbilities` defaults to `[attacker.ability, defender.ability]` (the full singles battler set), tested with `.some(...)`, no `hp` gate, no self-exclusion; `Math.trunc((150 * spAttack) / 100)` is C truncating division. Sits between Hustle (`:367-369`) and Guts (`:377-379`), matching `pokemon.c`'s order. |

**One nuance, singles-unreachable.** The port additionally requires
`(rules.absentBattlerFlags & (1 << index)) === 0` for a battler to count
(`factoryAiSwitchPolicy.ts:252-253`); the ROM's `default:` scan has no absent
check. In Factory singles `battlersCount` is 2 and `absentBattlerFlags` starts
at 0 (`src/engine/factoryBattleStart.ts:424`) — absent flags are a doubles /
empty-slot concept — so the extra conjunct can never change the result.
Recorded so a future doubles port does not inherit it silently.

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

### Ability copy — TRACE (16) — SOURCE-EXACT; the coverage question is **instrument sampling**
| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_util.c:2575-2581` (`ABILITYEFFECT_ON_SWITCHIN` arm: `if (!gSpecialStatuses[battler].traced) { gStatuses3[battler] \|= STATUS3_TRACE; traced = 1; }` — copies nothing) | `src/engine/battleScriptSwitchinOpcode.ts:1236-1246` and `src/engine/factoryBattleStart.ts:449-456` | Arm-only in both; `STATUS3_TRACE = 1 << 20` (`switchinOpcode.ts:117`, `factoryBattleStart.ts:53`) matches `include/constants/battle.h:177`. **Nuance:** the port has no `SpecialStatus::traced` (explicitly unrepresented, `src/engine/battleActionFinished.ts:15`) and guards on `!(status3 & STATUS3_TRACE)` instead. The two differ only if `ON_SWITCHIN` re-dispatches for the same battler after a *successful* copy within one `SpecialStatusesClear` window — which requires the tracer to still hold `ABILITY_TRACE` after copying, i.e. to have traced a Trace. Not reachable through a single switch-in per battler per turn; recorded, not filed. |
| `src/battle_util.c:3017-3073` (`ABILITYEFFECT_TRACE`), singles branch `:3050-3060` | `src/engine/factoryBattleStart.ts:484-513` (battle start) and `src/engine/battleScriptFaintedActionsOrchestration.ts:437-471` (post-faint) | Singles: source sets `gActiveBattler = target1` unconditionally, then copies only if `gBattleMons[target1].ability && gBattleMons[target1].hp`. The port's `findIndex(candidate.side !== active.side && hp !== 0 && ability !== 0)` is the same predicate with `battlersCount === 2`. Both **refuse `ABILITY_NONE` and a fainted target**, both write the copied id into the live slot (`gBattleMons[i].ability` ↔ `battlers[id].ability`), both set `gLastUsedAbility` ↔ `lastUsedAbility`, clear `STATUS3_TRACE`, set `gBattleScripting.battler` ↔ `scriptingBattler`, and call `BattleScript_TraceActivates`. `RecordAbilityBattle` equivalence: `faintedActionsOrchestration.ts:454-459` writes `aiObservedAbilityIds[id] = copiedAbility`. |
| `PREPARE_MON_NICK_WITH_PREFIX_BUFFER(gBattleTextBuff1, gActiveBattler, …)` + `PREPARE_ABILITY_BUFFER(gBattleTextBuff2, gLastUsedAbility)` (`:3067-3068`) | `battleTextBuff1MonNick = {battler: opposing, partyIndex}` (`factoryBattleStart.ts:503-506`, `faintedActionsOrchestration.ts:466-469`); `{B_BUFF2}` ← `lastUsedAbility` at `src/engine/factoryBattleScriptFullTurnDecision.ts:1205-1215,1345-1352`; message wiring at `src/engine/battleResolutionPresentation.ts:2753-2756` | `STRINGID_PKMNTRACED` buffers the **traced-from** mon's name-with-prefix in `{B_BUFF1}` and the **copied** ability in `{B_BUFF2}` in both halves. |
| dispatch sites: `src/battle_main.c:3880-3883` (before turn 1, Intimidate1 then Trace, both battler-index ordered) and `src/battle_util.c:1959-1963` (`DoFaintedActions` case 6) | `factoryBattleStart.ts:466-513` and `battleScriptFaintedActionsOrchestration.ts:412-471` | **Exactly two dispatch sites in each half**, in the same order relative to Intimidate. A voluntary mid-battle switch arms but does not dispatch, in both halves. |

**Refusal set (asked for explicitly):** Trace refuses `ABILITY_NONE` (id 0) and
a fainted opposing battler. It does **not** refuse any named ability — unlike
later generations there is no Multitype/Illusion exclusion list in Emerald, so
a Trace mon facing a Trace mon copies Trace.

**One ordering nuance, singles-unreachable.** Source clears `STATUS3_TRACE`
*only inside* `if (effect != 0)` (`:3061-3069`), so a refused copy leaves the
flag armed for a later dispatch. `factoryBattleStart.ts:487-497` clears the
flag **before** testing `copiedAbility === 0 || hp === 0` and then `continue`s,
so a refused copy at battle start would disarm. Unreachable: at battle start
both leads have `hp > 0` and every Level-50 corpus species resolves to a
non-zero ability id, and `absentBattlerFlags` is 0 (`factoryBattleStart.ts:424`).
The post-faint copy (`faintedActionsOrchestration.ts:440,451`) has the source's
order. Recorded as a latent shape difference, not a finding.

**F3 resolved — the baseline's zero-Trace question is INSTRUMENT SAMPLING, not
a resolution bug.** `docs/soak-coverage-baseline-2026-08-25.md:205-224` records
lead abilities from `rulesContext.battlers[0]/[1].ability`
(`tools/soak/randomRoundSoakCoverage.ts:56-58,567-583`), sampled on the first
ticked frame at which the kernel party is populated
(`:547 if (!this.battleStartRecorded) this.recordBattleStart(rulesContext)`).
`createFactoryBattleStart` resolves the whole switch-in chain — including the
Trace copy that **overwrites `battlers[battler].ability`** at
`factoryBattleStart.ts:494-501` — *before* it returns the state the driver ever
ticks. So a Trace lead is observable only as its **copied** ability;
`ABILITY_TRACE` is structurally uncountable in that dimension, and 114,756
zero-samples is exactly what a correct engine produces. The `unknown` WHY in
§6b should be changed to a sampling note by whoever next regenerates that doc
(out of scope here). No engine finding.

### End-turn — SHED_SKIN (14), RAIN_DISH (6), TRUANT (5) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_util.c:2601-2604` (`ABILITYEFFECT_ENDTURN` prologue: `hp != 0`, then `gBattlerAttacker = battler`) | `src/engine/battleEndTurnOrchestration.ts:1172-1179` | `if (b.hp === 0) return advance` — same guard, same per-battler shape, no early return on a miss. |
| `src/battle_util.c:2607-2618` (Rain Dish) | `battleEndTurnOrchestration.ts:1180-1192` | `WEATHER_HAS_EFFECT && (gBattleWeather & B_WEATHER_RAIN) && maxHP > hp`, heal `maxHP / 16` clamped to ≥1 then negated — the port's `floorDivAtLeastOne(b.maxHP, 16)` stored as `battleMoveDamage: -heal` is the same signed value, and `BattleScript_RainDishActivates` is entered through the push-cursor-and-callback helper. |
| `src/battle_util.c:2620-2641` (Shed Skin) | `battleEndTurnOrchestration.ts:1114-1160` | `(status1 & STATUS1_ANY)` is tested **before** `Random() % 3`, so a clean mon consumes no draw — the port draws only after the same test (`:1121` then `:1127`). Both clear `status1 = 0` **and** `STATUS2_NIGHTMARE`. The five sequential `StringCopy` branches are last-match-wins in source (poison → sleep → paralysis → burn → freeze); the port's `statusName` chain (`:1140-1144`) reproduces exactly that precedence, and has no confusion branch (Shed Skin never touches `STATUS2_CONFUSION`). |
| `src/battle_util.c:2653-2655` (Truant `truantCounter ^= 1`, **unconditional, no script, no `effect++`**) | `battleEndTurnOrchestration.ts:1218-1222` | Straight XOR with `advance`; no reveal, no message — matches the source's silent toggle. |
| `src/battle_script_commands.c:5260-5263` (switch-in hack: `if (ability == TRUANT && !truantSwitchInHack) truantCounter = 1;` then `truantSwitchInHack = 0`) | `src/engine/battleScriptSwitchinOpcode.ts:1182-1188` | The port guards on `active.truantCounter !== 1` instead of on `truantSwitchInHack`, and writes the same `1`. Equivalent in the Factory: **`truantSwitchInHack` is written only by the Battle Arena judgment cases** `VARIOUS_ARENA_OPPONENT_MON_LOST` / `_PLAYER_MON_LOST` / `_BOTH_MONS_LOST` (`src/battle_script_commands.c:6413,6420,6430-6431`), which the Factory never reaches, so the source guard is always true and setting an already-1 counter to 1 is a no-op. |
| `src/battle_util.c:2085-2095` (`CANCELER_TRUANT`) | `src/engine/battleScriptActionAdmission.ts:1734-1810` | `ability == TRUANT && truantCounter != 0` → `CancelMultiTurnMoves`, `HITMARKER_UNABLE_TO_USE_MOVE`, `B_MSG_LOAFING`, `BattleScript_MoveUsedLoafingAround`, `MOVE_RESULT_MISSED`, `effect = 1`; tracker advances to `CANCELER_RECHARGE` exactly once either way. |
| `data/battle_ai_scripts.s:2037-2058` (`AI_CV_RainDance`, incl. `:2048 if_equal ABILITY_RAIN_DISH, AI_CV_RainDance3`) | `src/engine/factoryAiCheckViability.ts:4486-4516` (documented gate map) and `:4533-4557` (`rainDanceFuncResultAfter`, Gate R) | Gate R (`get_ability AI_USER` → Rain Dish → `+1`) is ported as its own tail branch, including the `funcResult` collision write that Gate S/R leave behind. |
| `data/battle_ai_scripts.s:2383` / `:2385` (Rain Dish, Shed Skin in the encourage table) | `src/engine/factoryAiCheckViability.ts:8356-8361` | Both present in the 16-entry set (see the contact-family row). |
| `data/battle_ai_scripts.s:2836` (`AI_DoubleBattleSkillSwap`, Truant → `Score_Plus5`) and `:2883` (`AI_TrySkillSwapOnAlly`, Truant → `Score_Plus10`) | *(no engine site)* | **UNREACHABLE-IN-FACTORY-L50.** Both labels are reached only from the doubles dispatch (`AI_DoubleBattle*` / `AI_TryOnAlly`, which needs `AI_USER_PARTNER`/`AI_TARGET_PARTNER`). Factory battles are singles (`battlersCount: 2`, `factoryBattleStart.ts:420`). No port counterpart is expected. |

### Status immunity — INSOMNIA (15), WATER_VEIL (9), VITAL_SPIRIT (6), MAGMA_ARMOR (5) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_script_commands.c:2274-2298` (`SetMoveEffect` `STATUS1_SLEEP`: uproar scan skipped when the candidate has Soundproof, then `status1`, uproar result, Vital Spirit, Insomnia) | `src/engine/battleScriptHitChainOpcode.ts:3365-3392` | The Soundproof-gated uproar scan and the four `break` guards are ported as one `statusChanged = !(…)` disjunction in source order. Neither half announces anything here — Insomnia/Vital Spirit block **silently** on this path (no `RecordAbilityBattle`, no `BattleScript_*Prevention`). |
| `src/battle_script_commands.c:2341-2377` (`STATUS1_BURN`) | `src/engine/battleScriptHitChainOpcode.ts:3412-3426` | Water Veil's announce branch needs `primary == TRUE \|\| certain == MOVE_EFFECT_CERTAIN`; it sets `gLastUsedAbility`, `RecordAbilityBattle`, **pushes** and jumps to `BattleScript_BRNPrevention`, and picks `B_MSG_ABILITY_PREVENTS_ABILITY_STATUS` vs `B_MSG_ABILITY_PREVENTS_MOVE_STATUS` off `HITMARKER_STATUS_ABILITY_EFFECT`, clearing that bit in the first case. The port's `preventionCall("BattleScript_BRNPrevention", true, ABILITY_WATER_VEIL)` (`:3300-3361`) does all four: `{kind: "call"}` (= push), the reveal, the multistring choice, and the conditional hitMarker clear. The **silent** fall-through `if (ability == ABILITY_WATER_VEIL) break;` (`:2373-2374`) is the port's `|| ability === ABILITY_WATER_VEIL` in `statusChanged` — no reveal, matching source. |
| `src/battle_script_commands.c:2379-2394` (`STATUS1_FREEZE`) | `src/engine/battleScriptHitChainOpcode.ts:3428-3437` | `noSunCanFreeze` is computed from `WEATHER_HAS_EFFECT && (gBattleWeather & B_WEATHER_SUN)` first, then Ice type, `status1`, `noSunCanFreeze`, Magma Armor — the port's inverted `!noSunCanFreeze` disjunction preserves that exact order. Magma Armor is silent (no prevention script) in both. |
| `src/battle_script_commands.c:6828-6848` (`Cmd_jumpifcantmakeasleep`) | `src/engine/battleScriptStatusPrimaryOpcode.ts:220-252` | Uproar first (with its own `B_MSG_CANT_SLEEP_UPROAR` / `B_MSG_UPROAR_KEPT_AWAKE` split), then Insomnia/Vital Spirit → `gLastUsedAbility`, `B_MSG_STAYED_AWAKE_USING`, jump, `RecordAbilityBattle`; else `+= 5` (advance). All four writes present in the port. |
| `src/battle_util.c:2873-2953` (`ABILITYEFFECT_IMMUNITY`) | `src/engine/battleScriptMoveEndOpcode.ts:106-181` (per-ability cure table) and `:652-712` (`MOVEEND_IMMUNITY_ABILITIES`) | Per-ability status masks match one for one, incl. Insomnia/Vital Spirit sharing a case **and clearing `STATUS2_NIGHTMARE`** alongside `status1 = 0`, Water Veil on `STATUS1_BURN`, Magma Armor on `STATUS1_FREEZE`, and the "ability alone is a no-op" shape (`effect` stays 0, scan continues). Both halves scan every battler, `return` on the first cure, set `gBattleScripting.battler` ↔ `scriptingBattler`, emit `REQUEST_STATUS_BATTLE` ↔ `markBattleScriptControllerPending`, and **stay on moveend state 4** so the next `RETURN` rescans from battler 0 (`src/battle_script_commands.c:4285-4290`'s `else gBattleScripting.moveendState++` ↔ the port's `call-current`). |
| `src/battle_util.c:1753-1769` (`ENDTURN_YAWN` gate) | `src/engine/battleEndTurnOrchestration.ts:1029-1078` | `STATUS3_YAWN` decrement happens **before** the gate and is kept even when the gate fails, in both. Gate: expired, no `STATUS1_ANY`, not Vital Spirit, not Insomnia, `!UproarWakeUpCheck` (Soundproof-gated scan). Sleep duration `(Random() & 3) + 2` drawn only after the gate passes. |
| `data/battle_scripts_1.s:2181` (Will-O-Wisp `jumpifability BS_TARGET, ABILITY_WATER_VEIL, BattleScript_WaterVeilPrevents`, **before** the `accuracycheck` at `:2183`) | `src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:390` (`ABILITY_WATER_VEIL = 41`, registered in `JUMPIFABILITY_VALUES`) + the shared handler at `:418-465` | Water Veil makes Will-O-Wisp fail **without an accuracy roll**; the port's registered jumpifability id reproduces the pre-accuracy jump from the committed program. |
| `data/battle_scripts_1.s:2455-2456` (Yawn `jumpifability` Vital Spirit / Insomnia → `BattleScript_PrintBankAbilityMadeIneffective`, before `jumpifstatus2`/`accuracycheck`/`jumpifcantmakeasleep`) | same handler; `ABILITY_VITAL_SPIRIT` / `ABILITY_INSOMNIA` are both in `JUMPIFABILITY_VALUES` (`:386-387`) | Same pre-accuracy shape. |
| `data/battle_ai_scripts.s:216-222` (`AI_CBM_Sleep`) | `src/engine/factoryAiCheckBadMove.ts:2722-2741` (`runCbmSleep`) | One `get_ability AI_TARGET` draw, then Insomnia / Vital Spirit / any-status / Safeguard → −10, in source order, with the draw consumed exactly once. |
| `data/battle_ai_scripts.s:531-539` (`AI_CBM_WillOWisp`) | `src/engine/factoryAiCheckBadMove.ts:2942-2965` (`runCbmWillOWisp`) | One ability draw, then Water Veil / any-status / x0 / x0.5 / x0.25 / Safeguard → −10. |
| `src/battle_util.c:4005` (disobedience "try putting asleep" Vital Spirit/Insomnia exemption) | *(no engine site)* | **UNREACHABLE-IN-FACTORY-L50.** `IsMonDisobedient` returns `DISOBEDIENCE_OBEDIENT` at `src/battle_util.c:3939-3940` for `gBattleTypeFlags & BATTLE_TYPE_FRONTIER`, and `BATTLE_TYPE_FRONTIER` includes `BATTLE_TYPE_FACTORY` (`include/constants/battle.h:91`), which the port's battle-type invariant sets (`src/engine/factoryBattleScriptFullTurnDecision.ts:246-249`). Line 4005 can never execute in a Factory battle. |
| `src/battle_pike.c:818,822,830` (Insomnia/Vital Spirit/Water Veil/Magma Armor status-room exemptions) | *(no engine site)* | **UNREACHABLE-IN-FACTORY-L50.** Battle Pike facility code. |

### Item theft/swap denial — STICKY_HOLD (8) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_script_commands.c:2738-2775` (`MOVE_EFFECT_STEAL_ITEM`, Thief/Covet) | `src/engine/battleScriptHitChainOpcode.ts:3106-3138` | The whole prologue ladder is ported in source order: Trainer Hill skip; the opponent-side skip that is itself **exempted** for `BATTLE_TYPE_EREADER_TRAINER \| FRONTIER \| LINK \| RECORDED_LINK \| SECRET_BASE` (port: `ITEM_STEAL_ALLOWED_SPECIAL_BATTLES`, `:2865-2871`, so the Factory's AI *can* steal); the same-mask `knockedOffMons` skip; then `target.item != ITEM_NONE && ability == STICKY_HOLD` → `BattleScriptPushCursor()` + `BattleScript_NoItemSteal` + reveal. The port uses `{kind: "call"}` for that **push**, and reveals via `recordBattleScriptAbilityReveal`. |
| `src/battle_script_commands.c:2863-2877` (`MOVE_EFFECT_KNOCK_OFF`) | `src/engine/battleScriptHitChainOpcode.ts:3267-3290` | Sticky Hold is tested **before** the item test; an empty-handed Sticky Hold holder falls through silently (`gBattlescriptCurrInstr++` ↔ `passThrough()`), a holding one jumps to `BattleScript_StickyHoldActivates` by **plain assignment** (port: `{kind: "jump"}`, not `call`) with the reveal. |
| `src/battle_script_commands.c:9229-9234` (`Cmd_tryswapitems`, Trick) | `src/engine/battleScriptTryswapitemsOpcode.ts:152-176` | Sticky Hold sits **after** the both-empty / Enigma Berry / mail ladder and before the swap, and again uses a plain jump + reveal. Both halves check only the **target's** ability. |
| `data/battle_ai_scripts.s:545-548` (`AI_CBM_TrickAndKnockOff`) | `src/engine/factoryAiCheckBadMove.ts:3006-3022` | One `get_ability AI_TARGET` draw, Sticky Hold → −10, everything else falls through to 0. |
| `src/field_player_avatar.c:1860` | *(no engine site)* | **UNREACHABLE-IN-FACTORY-L50** — overworld escape-rope/`Cmd_...` field code. |

### Drain reversal — LIQUID_OOZE (8) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `data/battle_scripts_1.s:345-350` (Absorb family) | `src/data/gen/battle-script-program.json` (`BattleScript_AbsorbLiquidOoze`) + `src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:383` (`ABILITY_LIQUID_OOZE` in `JUMPIFABILITY_VALUES`) and the `Cmd_manipulatedamage` `DMG_CHANGE_SIGN` handler at `:481-495` | Confirmed at source: `negativedamage` runs **first**, then `jumpifability BS_TARGET, ABILITY_LIQUID_OOZE, BattleScript_AbsorbLiquidOoze`, and the Liquid Ooze label **adds** `manipulatedamage DMG_CHANGE_SIGN` (flipping the already-negated drain back to damage) plus `B_MSG_ABSORB_OOZE`. The port executes the committed program, so the two-`manipulatedamage` composition is structural. |
| `data/battle_scripts_1.s:3271-3276` (Leech Seed end-turn drain) | same handler | Here the polarity is the other way: the **non**-Liquid-Ooze path takes `manipulatedamage DMG_CHANGE_SIGN`, and `BattleScript_LeechSeedTurnPrintLiquidOoze` **skips** it (only setting `B_MSG_LEECH_SEED_OOZE`). The audit's earlier one-line gloss ("in both, Liquid Ooze *skips* the sign flip") is right for Leech Seed and **wrong for Absorb** — corrected here. Selector differs too: Leech Seed tests `BS_ATTACKER` (the seeded mon draining), Absorb tests `BS_TARGET`. Both selectors are registered in the port's handler (`:421-428`). |

### Forced switch — SUCTION_CUPS (7) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `data/battle_scripts_1.s:593-601` (`BattleScript_EffectRoar`) | committed program + `src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:365,389` (`ABILITY_SUCTION_CUPS = 21`) | Re-derived: `jumpifability BS_TARGET, ABILITY_SUCTION_CUPS, BattleScript_AbilityPreventsPhasingOut` (`:597`) precedes the `jumpifstatus3 ROOTED` **and both** `accuracycheck`s (`:599-600`), so Roar/Whirlwind fail against Suction Cups with **no accuracy roll and no RNG draw** in either half. |
| `data/battle_ai_scripts.s:334-339` (`AI_CBM_Roar`) | `src/engine/factoryAiCheckBadMove.ts:2976-2995` (`runCbmRoar`) | `count_usable_party_mons AI_TARGET == 0` → −10 **without** an ability read (no draw consumed); otherwise exactly one `get_ability` draw, Suction Cups → −10. |
| `src/field_player_avatar.c:1860` | *(no engine site)* | **UNREACHABLE-IN-FACTORY-L50** — overworld. |

### Secondary-effect denial — SHIELD_DUST (6) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_script_commands.c:2253-2255` | `src/engine/battleScriptHitChainOpcode.ts:2929-2934` | All four conjuncts ported: `ability == SHIELD_DUST`, `!(gHitMarker & HITMARKER_STATUS_ABILITY_EFFECT)`, `!primary`, `MOVE_EFFECT_BYTE <= 9`. `INCREMENT_RESET_RETURN` ↔ `passThrough()`. Sits immediately before the structurally identical Safeguard gate (`<= 7`), same order. |
| `src/battle_script_commands.c:7035-7037` (`ChangeStatBuffs`, `flags == 0`) | `src/engine/battleScriptStatBuffs.ts:278-280` | **The port DOES implement it** — the previous session's flag ("an engine comment claims it structurally unreachable") was about the *primary* route only. The file header (`:16-19`) states the correct, narrower claim: on the secondary route (`flags == 0`) Shield Dust is reachable and implemented; on the ALLOW_PTR route it can't fire because `flags != 0`. Guard-ladder position matches source exactly: Mist → Protect → Clear Body/White Smoke → Keen Eye → Hyper Cutter → **Shield Dust** → apply. |
| `data/battle_ai_scripts.s:2389` (encourage table) | `src/engine/factoryAiCheckViability.ts:8356-8361` | Present, same position. |

### Stat-drop denial — CLEAR_BODY (34), WHITE_SMOKE (2) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_script_commands.c:6987-7009` (`ChangeStatBuffs`) | `src/engine/battleScriptStatBuffs.ts:266-271` | Guard is `(ability == CLEAR_BODY \|\| ability == WHITE_SMOKE) && !certain && gCurrentMove != MOVE_CURSE`, positioned after Mist and Protect and before Keen Eye — identical in the port. `flags == STAT_CHANGE_ALLOW_PTR` → `BattleScriptPush(BS_ptr)` + `BattleScript_AbilityNoStatLoss` + `gLastUsedAbility` + `RecordAbilityBattle` (port: `blockedMessage`, `:202-232`, a `call-explicit` with `returnProgramCounter = BS_ptr` — the push modelled exactly); otherwise a silent `STAT_CHANGE_DIDNT_WORK` (`blockedSilent`). |
| `src/battle_script_commands.c:4141-4145` (`Cmd_playstatchangeanimation`'s **separate** changeable-stat count) | `src/engine/battleScriptPlaystatchangeanimationOpcode.ts:159-170` | This second predicate list (`mistTimer`, Clear Body, White Smoke, Keen Eye+ACC, Hyper Cutter+ATK) is *not* the ChangeStatBuffs ladder and is ported as its own loop, including the `STAT_CHANGE_CANT_PREVENT` bypass branch and the `changeableStatsCount > 1` multi-anim collapse. |
| `data/battle_scripts_1.s:4030-4032` (Intimidate: `jumpifability BS_TARGET` Clear Body / Hyper Cutter / White Smoke → `BattleScript_IntimidatePrevented`, **before** the `statbuffchange`) | `src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:392-394` (`ABILITY_CLEAR_BODY = 29`, `ABILITY_HYPER_CUTTER = 52`, `ABILITY_WHITE_SMOKE = 73` all registered) + the committed program | Intimidate is blocked before the stat machinery runs, so the `AbilityNoStatLoss` message never appears for Intimidate — the dedicated `IntimidatePrevented` script does. Same in both. |
| `data/battle_ai_scripts.s:306-312` (`CheckIfAbilityBlocksStatChange`, shared tail of the stat-down handlers) | `src/engine/factoryAiCheckBadMove.ts:810`, `:846`, `:871`, `:918` | Every stat-down handler's shared tail tests Clear Body **and** White Smoke → −10 off one `get_ability AI_TARGET` draw; `AI_CBM_AttackDown`'s documented **second** draw (its own Hyper Cutter read plus the tail's) is preserved (`:815-846`). |

**One nuance, unreachable in Factory singles.** Source's ALLOW_PTR branch has
an inner short-circuit: `if (gSpecialStatuses[gActiveBattler].statLowered) gBattlescriptCurrInstr = BS_ptr;`
(`:6993-6995`) — a *second* blocked stat-drop against the same battler skips
the message and the push. The port does not represent `statLowered`
(`src/engine/battleActionFinished.ts:11-16`) and always takes the push branch.
Re-derived reachability: `statLowered` is written **only** at `:6976` and
`:7004` (both inside the same ALLOW_PTR message branches) and cleared by
`SpecialStatusesClear()`, which runs per **action** (`HandleAction_ActionFinished`,
`src/battle_util.c:657-663`; also `battle_main.c:3041,3902`). Reaching it needs
two ALLOW_PTR stat-lower attempts on the same battler inside one action —
Intimidate's loop hits one target in singles, and this registration's scope is
single-stat moves. No Level-50 singles separating input exists; recorded, not filed.

### Trapping — ARENA_TRAP (6), SHADOW_TAG (3) — SOURCE-EXACT
| Source | Engine | Note |
| --- | --- | --- |
| `src/battle_ai_switch_items.c:439-453` (`ShouldSwitch` hard prefix) | `src/engine/factoryAiSwitchPolicy.ts:230-260` (`factoryAiSwitchHardGates`) | Order preserved: wrapped/escape-prevention → rooted → `ABILITY_ON_OPPOSING_FIELD(SHADOW_TAG)` → `ABILITY_ON_OPPOSING_FIELD(ARENA_TRAP)` → Magnet Pull+Steel → Battle Arena. **The stock comment at `:445` ("Misses the flying type and Levitate check") is faithful in the port** — `{ name: "arena-trap", blocked: target.ability === ARENA_TRAP }` (`:248`) has no Flying/Levitate exception, and the port carries the source comment verbatim at `:247`. A port that "fixed" it would be DIVERGENT; it did not. |
| `src/battle_ai_script_commands.c:1359-1402` (`Cmd_get_ability`) | `src/engine/factoryAiCheckViability.ts:8418-8442` | Source order — history cache → the three trapper abilities read straight off `gBattleMons` → one-ability species → two-ability `Random() & 1` (**one draw**) → the `abilities[1]` dead branch — is reproduced exactly, `known` first, trapper second. |
| `src/battle_ai_script_commands.c:1408-1430` (`Cmd_check_ability`) | `src/engine/factoryAiCheckBadMove.ts:770-780` | Same ladder for the boolean form. **Order nuance:** `factoryAiCheckBadMove.ts:720-725` (`nextGetAbilityDraw`) and `:772-776` test `TRAPPER_ABILITIES` **before** `knownAbility`, the reverse of source. Currently indistinguishable — `ClearBattlerAbilityHistory` runs on every switch-in and faint (`src/battle_main.c:3260`, `:3354`), and every ordinary `RecordAbilityBattle` call site writes the battler's *own* ability, so a nonzero history cell always equals the real ability. It stops being indistinguishable the moment finding **F1** below is fixed; see F2. |
| `src/battle_main.c:4043-4070` (run-away legality, `BATTLE_RUN_FAILURE`) | `src/engine/battleScriptSwitchinOpcode.ts:903-957` | Same nested scan: per candidate battler, Shadow Tag first then Arena Trap (the latter **with** the Levitate/Flying exception the AI half lacks), first match wins; then the separate `ABILITYEFFECT_CHECK_FIELD_EXCEPT_BATTLER` Magnet Pull scan whose **last** (highest-index) holder wins and which writes `gLastUsedAbility` even when the escaper is not Steel (`:929-944`). `gBattleScripting.battler` ↔ `scriptingBattler`, `B_MSG_PREVENTS_ESCAPE` ↔ `multistringChooser`. |
| `src/battle_main.c:4240-4256` (`B_ACTION_SWITCH` party-menu legality) | `src/engine/factoryBattleScriptFullTurnDecision.ts:2088-2114` (`isVoluntarySwitchTrapped`) + `:2125-2135` | Source's `||` chain — Shadow Tag, then Arena Trap **gated on `!Flying && ability != LEVITATE`**, then Magnet Pull+Steel — is ported verbatim, and `legalCommandDecisions` correctly routes the **player** through this gate and the **AI** through `isFactoryAiSwitchPrecheckBlocked` (the Flying/Levitate-less one). The wrapped/arena/rooted prefix matches too. |
| `data/battle_ai_scripts.s:2838` (`AI_DoubleBattleSkillSwap`, Shadow Tag → `Score_Plus2`) | *(no engine site)* | **UNREACHABLE-IN-FACTORY-L50** — doubles-only dispatch. |
| `data/battle_ai_scripts.s:3211-3222` (`AI_Roaming`: Shadow Tag / Arena Trap gates on `flee`) | *(no engine site)* | **UNREACHABLE-IN-FACTORY-L50** — the roaming-Pokémon AI (Latias/Latios overworld encounters), never selected for a Frontier trainer battle. |
| `src/wild_encounter.c:521` (Arena Trap wild-encounter rate) | *(no engine site)* | **UNREACHABLE-IN-FACTORY-L50** — overworld. |

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

Throw-site census on any audited path (note the file is not executable —
invoke it through `python3`):
```sh
python3 tools/probe/premise-census.py --only src/engine/<file>.ts --premise
```
Results for the 15 engine files audited here are in the header's
§Throw-site census table: five premise-worded throws sit on audited paths and
all five hold; none was *reached*.

**Note on the zsh trap:** this workspace's shell is zsh, where
`for n in $NAMES` does **not** word-split. Use `while read`.
