# Ability/item speed & turn-order scout (side-lane prep pack)

Side-lane scout for the two gaps flagged after entry 658's ability/item
parity census landed. **No `src/` edits, no census/generator/docs-ledger
edits this session** — read-only source + engine analysis, one new doc. No
oracle traces were run this session (see §4's note on why); every citation
below is either a direct command/grep result (marked **verified**) or an
explicit inference from that evidence (marked **inferred**).

## Part A — census string-literal false-negative audit

### A1. Method

The census's engine-reference scan (`tools/report/ability-item-parity-
census.ts:259-274`) walks `src/engine/*.ts` with a per-line regex looking for
bare `ABILITY_*`/`HOLD_EFFECT_*` identifiers, then explicitly **skips any
match that falls inside a string literal** (`insideStringLiteral()`,
`tools/report/ability-item-parity-census.ts:185-198`, called at line 264).
That exclusion is deliberate and already fixes one real problem (see A3) —
but it means every *functional* `"ABILITY_X"`/`"HOLD_EFFECT_X"` string
comparison is invisible to the census, independent of whether the code
actually branches on it. **Verified** via:

```
grep -rn '"ABILITY_[A-Z_]*"' src/ --include='*.ts' | grep -v '\.test\.ts' | grep -v '/gen/'
grep -rn '"HOLD_EFFECT_[A-Z_]*"' src/ --include='*.ts' | grep -v '\.test\.ts' | grep -v '/gen/'
```

Every hit from both greps was read in context and classified below. `/gen/`
data JSON and `*.test.ts` are excluded (out of the census's own scan scope).

### A2. Classification table

**(1) = live rule/branch, (2) = pure name/symbol table, (3) = test-only,
(1-AI) = live rule but AI-file-scoped (informational per the census's own
caveat, doesn't gate rules-parity).**

| Member | file:line | What it implements | Census status | Verdict |
| --- | --- | --- | --- | --- |
| ABILITY_GUTS | `damageCalc.ts:187` | burn-damage-halving skip (physical branch) | unreferenced | **false-negative (full)** |
| ABILITY_HUSTLE | `damageCalc.ts:429` | physical-move accuracy ×0.8 | unreferenced | **false-negative (full)** |
| ABILITY_COMPOUND_EYES | `damageCalc.ts:427` | accuracy ×1.30 | unreferenced | **false-negative (full)** — not one of the brief's two seed examples, found independently |
| ABILITY_SWIFT_SWIM | `turnOrder.ts:39` | speed ×2 in rain | unreferenced | **false-negative (full)** — Part B's subject |
| ABILITY_CHLOROPHYLL | `turnOrder.ts:40` | speed ×2 in sun | unreferenced | **false-negative (full)** — Part B's subject |
| ABILITY_GUTS | `battleScriptActionAdmission.ts:2764` | confusion self-hit damage plumbs `hasGuts` into `calculateBaseDamage` | unreferenced | false-negative, same member as row 1 (redundant site) |
| ABILITY_GUTS | `battleScriptTrysetfutureattackOpcode.ts:111` | same plumbing, numeric-id (`62`) source | unreferenced | false-negative, same member (redundant site) |
| ABILITY_SWIFT_SWIM | `factoryAiCheckViability.ts:2579,2636` | `AI_CV_RainDance`'s Swift-Swim scoring bypass | unreferenced | false-negative, same member, **AI-scope** |
| ABILITY_SHADOW_TAG / MAGNET_PULL / ARENA_TRAP | `factoryAiCheckBadMove.ts:177-180` (`TRAPPER_ABILITIES` set) | AI "can't flee" trapper check | all 3 unreferenced (AI col. shows 3 source sites each, Engine refs 0) | **false-negative, AI-scope** |
| ABILITY_LEVITATE | `factoryAiTryToFaint.ts:132,160` | Ground-immunity fainting gate | engine-referenced (9 refs elsewhere) | correct status, redundant site |
| ABILITY_SOUNDPROOF | `factoryAiCheckBadMove.ts:903`, `battleScriptHealpartystatusOpcode.ts:75` | sound-move immunity checks | engine-referenced (22 refs) | correct status, redundant site |
| ABILITY_TRUANT | `battleScriptActionAdmission.ts:356,1829` | loafing-turn admission | engine-referenced (7 refs) | correct status, redundant site |
| ABILITY_SAND_VEIL | `damageCalc.ts:428` | sandstorm accuracy ×0.8 | engine-referenced (2 refs) | correct status, redundant site |
| ABILITY_RAIN_DISH | `factoryAiCheckViability.ts:2661` | AI rain-dish tail check | engine-referenced (2 refs) | correct status, redundant site |
| VOLT_ABSORB/WATER_ABSORB/FLASH_FIRE/WONDER_GUARD/LEVITATE | `factoryAiCheckBadMove.ts:184-188` (`NEGATING_ABILITIES`) | AI type-immunity negation map | all already engine-referenced | correct status, redundant site |
| ABILITY_SPEED_BOOST/HYPER_CUTTER/KEEN_EYE/CLEAR_BODY/WHITE_SMOKE | `factoryAiCheckBadMove.ts:396-400` (`const ABILITY_X = "ABILITY_X"`) | local const declarations; every *use* elsewhere is the bare identifier | all already engine-referenced | correct status — literal only at declaration, census catches the identifier uses |
| LIQUID_OOZE/LIMBER/IMMUNITY/OWN_TEMPO/VITAL_SPIRIT/INSOMNIA/SUCTION_CUPS/ROCK_HEAD/SOUNDPROOF/WATER_VEIL/CLEAR_BODY/HYPER_CUTTER/WHITE_SMOKE | `battleScriptIngrainLeechSeedWrapOpcode.ts:380-392` | `["ABILITY_X", ABILITY_X]` pairs — string is a display key, identifier is the value | all already engine-referenced | correct status, redundant site |
| CLOUD_NINE/AIR_LOCK | `battleScriptJumpifabilitypresentOpcode.ts:48-49` | same key/value pattern | already engine-referenced | correct status, redundant site |
| (70-member exhaustive symbol table) | `battleScriptSwitchinOpcode.ts:102-122` (`ABILITY_SYMBOLS`) | id→name lookup table, `include/constants/abilities.h` order | n/a | **(2) correctly excluded** — this is exactly the table entry 658 called out as making naive counting vacuous at 70/70; `insideStringLiteral` is the fix that keeps it excluded |
| SAND_VEIL/COMPOUND_EYES/HUSTLE/GUTS (ids 8/14/55/62) | `battleScriptHitChainOpcode.ts:153-156` | small numeric-id→name table feeding the `damageCalc.ts` accuracy checks | n/a | **(2)**, adjacent-to-live-rule (feeds the false-negatives above, doesn't itself compare) |
| ABILITY_BATTLE_ARMOR | `battle2Turn1.ts:77` | fixed canonical-scenario battler construction | already engine-referenced elsewhere | **(3)-adjacent** — hardcoded fixture data, not branch logic |
| ABILITY_NONE (×4 sites) | `factoryAiCheckBadMove.ts:376,425`, `factoryAiCheckViability.ts:2626`, `factorySwapPresentation.ts:116` | none-ability guards / dual-slot structural checks | member explicitly out of census scope (`census.ts:364` skips it) | out of scope, no effect |
| (JSDoc mentions) | `factoryAiCheckViability.ts:299`, `factoryAiDecisionPolicy.ts:517` | doc comments describing a default value | n/a | excluded — `stripComments()` removes these before the scan even runs |

**Hold effects:**

| Member | file:line | What it implements | Census status | Verdict |
| --- | --- | --- | --- | --- |
| HOLD_EFFECT_MACHO_BRACE | `turnOrder.ts:46` | speed ÷2 | zero-carrier (0/0 corpus carriers) | **false-negative on the Engine-refs column only** — `classify()` (`census.ts:356-359`) returns `zero-carrier` whenever `l50Carriers===0`, *before* even checking engine refs, so the member's **status** is unaffected either way; the table's own "Engine refs: 0" cell is still wrong in isolation |
| HOLD_EFFECT_SCOPE_LENS/LUCKY_PUNCH/STICK | `damageCalc.ts:276-278`, `battleScriptHitChainOpcode.ts:1277-1281` | crit-chance bonuses | all already engine-referenced (2 refs each) | **correct status, fragile mechanism** — see A3 |
| HOLD_EFFECT_EVASION_UP | `damageCalc.ts:432`, `battleScriptHitChainOpcode.ts:1056-1057` | evasion-up accuracy debuff | already engine-referenced (2 refs) | correct status, same fragile mechanism suspected (not independently re-verified this session) |
| CONFUSE_SPICY/DRY/SWEET/BITTER/SOUR, DEFENSE_UP, SP_DEFENSE_UP, CRITICAL_UP, RANDOM_STAT_UP | `battleEndTurnOrchestration.ts:216-224` | `[IDENTIFIER, "STRING"]` pairs (reverse of the ability pattern — string is the value) | all zero-carrier | out of scope — carrier-gated regardless of literal-counting |

**Bonus finding (outside the brief's literal scope, same blind spot, one
level worse — numeric ability-ID comparisons have no string trace at all):**
`battleScriptTrysetfutureattackOpcode.ts:95,98,99` compare `attacker.ability
=== 58/62` and `defender.ability === 63` (id table cross-checked against
`battleScriptHitChainOpcode.ts:153-156` and the `ABILITY_SYMBOLS` order at
`battleScriptSwitchinOpcode.ts:102-122`: 58=ABILITY_MINUS, 62=ABILITY_GUTS,
63=ABILITY_MARVEL_SCALE) — implementing Guts's own attack boost (+50% when
statused, separate from its burn-halving check), Marvel Scale's defense
boost (+50% when statused), and half of the Plus/Minus combo (line 95 also
needs `fieldAbilities.includes(57)` = ABILITY_PLUS). MARVEL_SCALE, PLUS, and
MINUS are all "unreferenced" in the census and are invisible to *any*
string-based scan, not just the literal-exclusion one.

### A3. Why the census misses these (mechanism), and the minimal fix

`ABILITY_SYMBOLS` (`battleScriptSwitchinOpcode.ts:102-122`) is a 70-entry
array of quoted ability names in `include/constants/abilities.h` id order —
exactly the table entry 658 says made a *naive* identifier-only count
vacuous at 70/70 (every ability "referenced" just by appearing in the
spelling table). The current generator's fix was a blanket one:
`insideStringLiteral()` excludes **every** string-literal match, not just
this table's. That correctly kills the 70/70 problem but throws out every
genuine live-rule string comparison with it — the exact false-negatives in
A2.

One partial, fragile mitigation already exists by accident: `dealias()`
(`census.ts:233-246`) strips an `_ID_` infix, so a *locally declared numeric
id constant* named `HOLD_EFFECT_ID_SCOPE_LENS` (`battleScriptHitChainOpcode.
ts:164`, used at `:1276`) dealiases back to `HOLD_EFFECT_SCOPE_LENS` and gets
counted — even though the actual `"HOLD_EFFECT_SCOPE_LENS"` string comparison
(`damageCalc.ts:276`) stays invisible. This only works because whoever wrote
`battleScriptHitChainOpcode.ts` happened to name the numeric constant after
the member; `GUTS`/`HUSTLE`/`COMPOUND_EYES`/`SWIFT_SWIM`/`CHLOROPHYLL` have no
such named constant nearby and get no such accidental credit.

**Minimal fix that closes this class without reintroducing 70/70,
recommended:** don't touch the existing blanket string-literal exclusion at
all; add a *second*, narrow pass that only fires on lines the first pass
already flagged as "inside a string literal, family-prefixed" (the current
code silently drops these — capture them into a separate list first). For
each captured hit, count it as a real reference only if **both**: (a) the
line contains at most one family-prefixed string literal total (a table row
reliably has several — `ABILITY_SYMBOLS` has 4 per line, `TRAPPER_ABILITIES`
has 1 per line but spans a multi-element array so this alone isn't
sufficient — see caveat below), and (b) the string is adjacent to a
comparison/branch shape on the same line: `===`, `!==`, `==`, `!=`,
`.has(`/`.includes(` immediately before or after it, or it sits as one arm
of a ternary whose condition is on the same line (`cond ? "ABILITY_X" :
...`). This catches every false-negative in A2's table (all are single
comparisons or single ternary arms) while leaving `ABILITY_SYMBOLS`,
`TRAPPER_ABILITIES`, and `NEGATING_ABILITIES`-style multi-element table
arrays excluded (no comparison operator adjacent to any individual element).
**Caveat:** `TRAPPER_ABILITIES`/`NEGATING_ABILITIES` are `Set`/object
*table* literals, not comparisons, so they're correctly excluded by (b) even
though they're multi-element — good, that's the intended behavior for those.

**Even more minimal alternative, explicitly acceptable per this task's own
framing:** hard-exclude only the one known file (`battleScriptSwitchinOpcode
.ts`) via a small `SYMBOL_TABLE_FILES` allowlist (the file already has a
sibling allowlist precedent, `ENGINE_INFRA_SPELLINGS`,
`census.ts:200-`), and count every other family-prefixed string literal
unconditionally. Trivial to implement, but brittle: any future exhaustive
table added anywhere else in `src/engine` (a hold-effect symbol table
doesn't exist yet, but would hit the same 70/70-style vacuity) would need
a matching manual allowlist entry, silently, with no test catching the
regression until someone reads the headline number and doubts it.

### A4. Verdict counts (self-check: every row above re-grepped and re-read
this session — none pulled from memory)

- **False-negative (full — status is wrong), rules-scope:** 5 members
  distinct (GUTS, HUSTLE, COMPOUND_EYES, SWIFT_SWIM, CHLOROPHYLL), 8 sites.
- **False-negative, AI-scope only (doesn't gate rules-parity rows per the
  census's own caveat, but the Engine-refs column undercounts):** 4 members
  (SWIFT_SWIM again + SHADOW_TAG/MAGNET_PULL/ARENA_TRAP), 4 sites.
- **False-negative, column-only (status already correct via the
  zero-carrier short-circuit):** 1 member (MACHO_BRACE).
- **Correct status via a fragile accidental mechanism** (`_ID_` dealias):
  3 members confirmed (SCOPE_LENS/LUCKY_PUNCH/STICK), 1 more suspected
  (EVASION_UP, not independently re-verified).
- **Correct / out of scope** (name tables, `ABILITY_NONE`, comments, fixture
  data, redundant-but-already-referenced sites): everything else enumerated
  above — roughly 30 sites across ~20 members, zero status changes.
- **Bonus, outside the literal audit's scope:** 3 numeric-ID sites
  (MINUS, GUTS-again, MARVEL_SCALE) with zero string trace at all.

### A5. Current-tree prediction before the recovery-pass regeneration

Re-derived on 2026-07-28 after the damage and turn-order identifier-constant
changes. The §A3 predicate should recover exactly these comment-stripped
string-literal occurrences:

- **Rules scope (11):** `battleScriptActionAdmission.ts` GUTS (1);
  `battleScriptHealpartystatusOpcode.ts` SOUNDPROOF (1);
  `battleScriptHitChainOpcode.ts` EVASION_UP (1);
  `battleScriptTrysetfutureattackOpcode.ts` GUTS (1); and `damageCalc.ts`
  COMPOUND_EYES, SAND_VEIL, HUSTLE, EVASION_UP, SCOPE_LENS, LUCKY_PUNCH,
  and STICK (7).
- **AI scope (8):** `factoryAiTryToFaint.ts` LEVITATE (2);
  `factoryAiCheckBadMove.ts` ABILITY_NONE (2) and SOUNDPROOF (1); and
  `factoryAiCheckViability.ts` SWIFT_SWIM (2) and RAIN_DISH (1).
- **Structural/presentation, out-of-scope member (1):**
  `factorySwapPresentation.ts` ABILITY_NONE (1). No table or fixture literal
  satisfies the narrow predicate.

Thus the exact reference-column prediction is LEVITATE +2, ABILITY_NONE +3,
SOUNDPROOF +2, GUTS +2, SWIFT_SWIM +2, RAIN_DISH +1, COMPOUND_EYES +1,
SAND_VEIL +1, HUSTLE +1; EVASION_UP +2, SCOPE_LENS +1, LUCKY_PUNCH +1,
and STICK +1. Only COMPOUND_EYES should change status:
abilities **57/70, 977/1103 → 58/70, 981/1103** (`977 + 4 = 981`);
hold effects remain **42/42, 850/850**. Any other recovered site or headline
change is a stop-and-explain discrepancy.

## Part B — speed/turn-order prep pack

### B1. Ground truth: `GetWhoStrikesFirst` (`reference/pokeemerald/src/
battle_main.c:4595-4754`), **verified** by direct read this session

**Weather gate.** `WEATHER_HAS_EFFECT` (`include/battle_util.h:47`) =
`!ABILITY_ON_FIELD(ABILITY_CLOUD_NINE) && !ABILITY_ON_FIELD(ABILITY_AIR_LOCK)`.
`ABILITY_ON_FIELD(id)` (`battle_util.h:37`) calls
`AbilityBattleEffects(ABILITYEFFECT_CHECK_ON_FIELD, 0, id, 0, 0)`, whose
`ABILITYEFFECT_CHECK_ON_FIELD` case (`battle_util.c:3140-3148`) loops **every
battler on the field on both sides** and sets `effect` if `gBattleMons[i].
ability == ability && gBattleMons[i].hp != 0` — i.e. Cloud Nine/Air Lock gate
weather (for speed *and* everything else weather touches) whenever either
side's active, non-fainted battler has it; a fainted holder doesn't count.

**Per-battler effective speed** (repeated identically for battler1 then
battler2, `:4605-4654` / `:4655-4690`):
1. `speedMultiplier = 2` if `WEATHER_HAS_EFFECT` and (`ability==SWIFT_SWIM &&
   weather&B_WEATHER_RAIN`) or (`ability==CHLOROPHYLL && weather&B_WEATHER_
   SUN`), else `1` (and unconditionally `1` when weather has no effect).
2. `speed = floor(baseSpeed * speedMultiplier * stageRatioNum /
   stageRatioDen)` (`gStatStageRatios`, same table `damageCalc.ts`'s
   `STAT_STAGE_RATIOS` already ports).
3. Enigma Berry special-cases the holdEffect/holdEffectParam lookup source
   (irrelevant here — no Frontier set carries it).
4. **Badge boost**: `speed = floor(speed*110/100)` iff NOT
   `(BATTLE_TYPE_LINK|RECORDED_LINK|FRONTIER)` AND `FLAG_BADGE03_GET` AND
   side is the player (`:4636-4642`/`:4675-4681`). Every battle this engine
   models is `BATTLE_TYPE_FRONTIER`, so this branch is always skipped —
   matches `damageCalc.ts`'s own badge-boost note and `turnOrder.ts:8-10`'s
   comment; **already correctly assumed off**, not a new finding.
5. `HOLD_EFFECT_MACHO_BRACE`: `speed = floor(speed/2)`.
6. Paralysis (`STATUS1_PARALYSIS`): `speed = floor(speed/4)`.
7. **Quick Claw**: `if (holdEffect==HOLD_EFFECT_QUICK_CLAW && gRandomTurnNumber
   < (0xFFFF * holdEffectParam) / 100) speed = UINT_MAX` (an unconditional
   win over the other battler, priority notwithstanding — it just replaces
   the speed value fed into the comparison below).

**Quick Claw's RNG source is `gRandomTurnNumber`, an EWRAM `u16` global
(`battle_main.c:208`, `extern` at `include/battle.h:690`) — NOT a fresh
`Random()` call inside `GetWhoStrikesFirst`.** It is only ever *read*
(compared) here. **Verified** every write site
(`grep -n "gRandomTurnNumber" reference/pokeemerald/src/battle_main.c`):
`gRandomTurnNumber = Random();` at exactly three call sites, each drawing
one fresh `Random()` u16 and overwriting the global:
- `battle_main.c:3140`, inside `BattleStartClearSetData` (battle init, once
  per battle, before turn 1's setup).
- `battle_main.c:3923`, inside `TryDoEventsBeforeFirstTurn` (function starts
  `:3841`) — turn 1's transition into `HandleTurnActionSelectionState`.
- `battle_main.c:4013`, inside `BattleTurnPassed` (function starts `:3956`)
  — every subsequent turn's transition into `HandleTurnActionSelectionState`.

So the value is redrawn **exactly once per turn**, at the moment the
previous turn's resolution ends and action selection for the next turn
begins — unconditionally, whether or not anyone holds Quick Claw that turn
— and then read (not redrawn) by every `GetWhoStrikesFirst` call that turn,
including every AI `if_user_goes`/`AI_CV_SpeedDown`/`AI_CV_RainDance` call
(`Cmd_if_user_goes`, `battle_ai_script_commands.c:1268-1274`, already ported
as `factoryAiCheckViability.ts`'s `runCvSpeedDown`/`runCvRainDance`, both of
which correctly draw their OWN separate tie-break `Random()` but do not — and
per the real source, should not — redraw `gRandomTurnNumber` itself).

**Threshold arithmetic, verified** against `src/data/gen/battle-frontier-
held-items.json`'s Quick Claw row (`itemTableId 24`, `holdEffectParam: 20`):
`(0xFFFF * 20) / 100` = `1310700 / 100` = `13107` exactly (integer, no
rounding fuzz at this specific param value). So the proc fires whenever the
turn's `gRandomTurnNumber` (uniform `u16`, 0-65535) is `< 13107`, i.e.
**13107/65536 ≈ 20.00%** of the range.

**Speed-tie coin flip**: a *fresh* `Random()&1` (a real, distinct `Random()`
call), fired only when both effective speeds compare equal **and** the
priority brackets tie (`:4728` for the nonzero-equal-priority branch,
`:4745` for the both-zero branch — mutually exclusive, so at most one such
draw per `GetWhoStrikesFirst` call). This exactly matches `turnOrder.ts`'s
own `speedTieRngRoll` parameter contract.

### B2. Consumer map

`src/engine/turnOrder.ts` (115 lines, entire file) is the ported math:
`effectiveSpeed()` (`:37-49`) implements B1 steps 1-6 (badge boost
deliberately omitted, matching the always-off Frontier case — see the
module's own header comment `:1-10`). **Quick Claw is not implemented
anywhere in `turnOrder.ts` or any other `src/` file — verified**, `grep -rn
"QUICK_CLAW" src/ --include='*.ts' | grep -v /gen/` returns zero hits,
despite the module's own header comment (`turnOrder.ts:5-7`) claiming Quick
Claw is "ported structurally" — **that comment is inaccurate/aspirational,
not a description of present code.** `getWhoStrikesFirst()` (`:60-80`) and
`sortBattlersByTurnOrder()` (`:89-114`) correctly implement the
priority/speed/tie logic and N-battler bubble sort.

**The one real per-action call site never populates the fields that would
trigger any of this.** `factoryBattleScriptFullTurnDecision.ts:810-813`'s
`turnOrderBattler()` builds a `TurnOrderBattler` as `{ speed: b.speed,
speedStage: b.statStages[STAT_SPEED], movePriority: movePriority(moveId) }`
— `ability`, `holdEffect`, `holdEffectParam`, `isParalyzed` are all left
`undefined`. It's called at `:1422-1423`, and `effectiveSpeed`/
`getWhoStrikesFirst` are invoked at `:1427`/`:1430` with **no weather
argument**, so `effectiveSpeed`'s `weather` parameter defaults to `{}`
(`turnOrder.ts:37`) — `isRaining`/`isSunny` both `undefined`/falsy
regardless of the real battle's weather. **Consequence: Chlorophyll, Swift
Swim, Macho Brace, and the paralysis speed-quarter are all currently dead
code at the only production call site that decides real turn order** —
this is true even though the math for 3 of those 4 is already correct in
`turnOrder.ts` itself.

**Weather state is already available at the call site and just isn't
threaded through.** `BattleScriptRulesContext` carries a `weather: number`
bitfield (`battleScriptRulesContext.ts:782`, populated at `:2605`) using the
same bit convention `damageCalc.ts:218-221` already decodes (rain/sandstorm/
sun/hail bit-groups) — so wiring Chlorophyll/Swift Swim needs a
`WeatherState` built from `rc0.weather` at `factoryBattleScriptFullTurnDecision
.ts:1422-1423`'s call site, not new state.

**Ability/hold-effect state exists but as numeric ids, not the string names
`TurnOrderBattler` expects.** `BattleScriptRulesContext`'s battler shape
stores `ability: number` (`battleScriptRulesContext.ts:241`, `2032`) and
`holdEffectId: number`/`holdEffectParam: number` (`:1055-1056`) — matching
the numeric-id comparisons already seen in `battleScriptTrysetfutureattackOpcode
.ts:95-99`. `ABILITY_SYMBOLS` (`battleScriptSwitchinOpcode.ts:102-122`) is
the only existing id→name table and it is **not exported** (`grep -n
"^export const ABILITY" battleScriptSwitchinOpcode.ts` — zero hits) — a
future wiring pass needs either to export it (or an id→name resolver like
`battleScriptHitChainOpcode.ts:153-156`'s narrower table, generalized) plus
build an equivalent hold-effect id→name resolver (no such table currently
exists for hold effects at all, **inferred** from not finding one in the
files read this session — not exhaustively searched).

**Quick Claw's wiring gap is bigger than "add a branch."** It needs a
per-turn persisted RNG value (`gRandomTurnNumber`'s equivalent) threaded
through `BattleScriptRulesContext`, drawn once at the real turn-transition
point and read (not redrawn) by every `getWhoStrikesFirst` call that turn —
not a fresh draw inside `effectiveSpeed`/`getWhoStrikesFirst` itself (doing
that would double-draw once per pairwise comparison instead of once per
turn, desyncing the RNG stream the moment more than one comparison needs it
in the same turn, e.g. any AI `if_user_goes` check plus the real turn-order
sort in the same turn).

**Single riskiest unknown (inferred, not oracle-verified this session):**
`grep -rn "gRandomTurnNumber\|randomTurnNumber" src/ --include='*.ts'` (excl.
`/gen/`) returns **zero hits** anywhere in `src/engine`, including
`battleEndTurnOrchestration.ts` and `battleScriptCallbackStack.ts` (which do
model `BattleTurnPassed`'s other bookkeeping in detail) and `battleTurn.ts`
(an older, separate turn model whose `turnEndRngGroups: readonly number[]`
field only records an opaque per-turn draw *count*, not this specific draw's
value or position). `docs/battle-turn-notes.md:98,460,625,2973` already
documents this exact `Random()` call as a **real, observed RNG-consuming
step in the oracle's own turn-transition trace** ("RESOLVED" there means "we
identified which C statement produced this tick," not "our engine also
performs an equivalent draw"). If the production engine's turn-transition
path does not also consume one `Random()` call at the equivalent point
(regardless of whether any battler holds Quick Claw that turn), then **every
turn after the first would already be one `Random()` call short relative to
the oracle for any multi-turn battle** — a systemic RNG-position desync far
larger than "Quick Claw doesn't work," and worth resolving before staging
any Quick Claw fixture, since a Quick Claw test built on a desynced RNG
stream would misattribute the mismatch. This needs a direct oracle check
(a short 2-turn trace, no Quick Claw involved, comparing the exact `Random()`
call count/attribution turn-over-turn against this engine's `rng.draw()`
ledger) before the next session trusts either the Quick Claw fixture below
or any downstream RNG-consuming turn 2+ mechanic.

### B3. Fixtures (species/nature/speed **computed this session**, formula
`floor(((2*base + iv + floor(ev/4)) * 50) / 100) + 5`, then ×1.1/×0.9
truncated per a speed-affecting nature — verified against
`src/data/gen/species-stats.json`/`natures.json`/`battle-frontier-mons.json`
via an inline Python script this session, IV 31 / EV 0 chosen for clean
round numbers, not a claim about the real Factory's rental IV/EV algorithm)

All three are **deterministic single-ability carriers** (species' ability
slot 1 is `ABILITY_NONE` or duplicates slot 0) from the real Frontier L50
corpus (`index < 850`), per the census's own carrier rule
(`ability-item-parity-census.ts:377-380`).

| Role | FRONTIER_MON index | Species | Nature | Ability (sole) | Base spd | L50 spd (IV31/EV0) | Real corpus moveset (has its own weather setter?) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chlorophyll carrier | 0 | SUNKERN | RELAXED (spd −) | CHLOROPHYLL | 30 | **45** | MEGA_DRAIN, HELPING_HAND, **SUNNY_DAY**, LIGHT_SCREEN — self-sufficient |
| Swift Swim carrier | 42 | SURSKIT | RELAXED (spd −) | SWIFT_SWIM | 65 | **76** | BUBBLE_BEAM, **RAIN_DANCE**, SWEET_SCENT, QUICK_ATTACK — self-sufficient |
| Quick Claw holder (slow) | 299 | MAGCARGO (`FRONTIER_MON_MAGCARGO_2`) | QUIET (spd −) | MAGMA_ARMOR/FLAME_BODY (dual — pick either via `abilitySlot`, neither affects speed) | 30 | **45** | OVERHEAT, EARTHQUAKE, ROCK_SLIDE, BODY_SLAM; real corpus item is Quick Claw already (`itemTableId 24`, `holdEffectParam 20`) |
| Quick Claw opponent (fast, no item) | 32 | SMEARGLE | HARDY (neutral) | OWN_TEMPO (sole) | 75 | **95** | (moveset not needed — override its item to `ITEM_NONE` to isolate Quick Claw as the only speed-affecting variable; real corpus item is King's Rock, irrelevant to speed either way) |

For `overrides.parties`, build each as a full legal L50 mon (species, level
50, the nature above, IVs 31/31/31/31/31/31, EVs 0/0/0/0/0/0, the real
corpus moveset unless noted, PP Ups 0, item per row, `abilitySlot` forcing
the ability named above, arbitrary legal friendship/gender/shiny/
personality) — three complete Pokémon per side per the mechanicLab contract
even though only one matters per test; the other two can reuse any
already-proven-legal filler set from an existing staged trace.

### B4. Staged oracle recipes (sketches for the next session — **not run
this session**, see note below)

1. **Chlorophyll speed flip.** Sunkern (idx 0, 45 spd) vs Smeargle (idx 32,
   95 spd, item forced to `ITEM_NONE`). Turn 1: Sunkern uses `SUNNY_DAY`
   (self-target, always hits, priority 0 — both sides' move priority is 0
   this turn only if Smeargle's forced move is also priority 0; constrain
   Smeargle's AI to a single legal non-priority move via identical move
   slots). **Prediction:** turn 1 order is plain speed (95 > 45, Smeargle
   first, 0 tie-break draws — priorities equal at 0 only if Smeargle's
   forced move is priority 0). Turn 2: Sunkern uses any damaging move.
   **Prediction:** with sun now active, Sunkern's effective speed doubles to
   90 — **still less than Smeargle's 95**, so turn 2 order is unchanged
   (Smeargle first) *unless* Smeargle's own move that turn has negative
   priority or Sunkern's chosen move has positive priority. This pairing
   doesn't actually flip order at these exact numbers — swap in a slower
   opponent (spd 46-89) or note explicitly that the recipe demonstrates "sun
   raises effective speed to 90, observably still second" rather than a
   flip; re-pick the opponent's speed before running this to get an actual
   order flip if a flip is the desired demonstration.
2. **Swift Swim self-stage.** Surskit (idx 42, 76 spd, knows `RAIN_DANCE`
   itself) vs the same Smeargle (95 spd, no item). Turn 1: plain speed,
   Smeargle first (95 > 76), 0 tie draws (constrain Smeargle to one legal
   priority-0 move). Turn 1 also has Surskit use `RAIN_DANCE`. Turn 2:
   Surskit's effective speed doubles under rain to 152, now firmly ahead of
   Smeargle's 95 — **prediction: turn 2 order flips, Surskit first**, 0 tie
   draws (no exact-speed collision at these numbers). This is the clean flip
   recipe — prefer it as the first one run.
3. **Quick Claw stress test.** Magcargo (idx 299, 45 spd, Quick Claw,
   `holdEffectParam 20`) vs Smeargle (idx 32, 95 spd, item forced to
   `ITEM_NONE`). No weather, no setup turn needed. Run several turns with
   both sides locked to a single legal priority-0 move (constrain both via
   identical move slots, or via PP exhaustion of the other three).
   **Prediction per turn:** ~20.00% of turns, Magcargo (despite being 50
   slower) strikes first because its effective speed is forced to
   `UINT_MAX`; the remaining ~80.00% of turns Smeargle strikes first at
   plain 95>45. **RNG draw-count prediction is the actual point of this
   recipe**: per B1/B2, the real ROM draws exactly one `Random()` for
   `gRandomTurnNumber` at each turn's transition (independent of whether
   Quick Claw procs), consumed (not redrawn) by the turn-order check; there
   should be **zero** additional `Random()` calls attributable to "Quick
   Claw checking" beyond that one per-turn draw, and the speed-tie coin flip
   should **never** fire in this pairing (45 vs 95 vs `UINT_MAX` never tie).
   Run this only after B2's "single riskiest unknown" is resolved, or the
   RNG-count prediction here can't be trusted to isolate Quick Claw's own
   behavior from a pre-existing per-turn draw-count bug.

**Why nothing was actually run this session:** the 32-minute cap was mostly
spent on B1's source read (confirming the exact `gRandomTurnNumber` call
sites and threshold arithmetic command-by-command) and B2's consumer-map
trace (which turned out to be the load-bearing finding — wiring, not new
math, is what's missing for Chlorophyll/Swift Swim). Staging and running
three oracle traces plus reading capture output would not have fit inside
the remaining budget at the same verification depth; recipe 1 above already
needed a correction once the actual numbers were computed, which is exactly
the kind of mistake running-without-computing-first would have baked into a
"confirmed" result instead of a caught-and-flagged one.

### B5. Turn-boundary RNG gap — **REFUTED** (2026-07-28 side-lane instrument)

**Verdict: REFUTED — the production engine is one draw short at every
continuing turn boundary.** The ROM draw is real and unconditional; the
production full-turn path does not absorb it under another name.

#### Engine-side mechanism

The production reducer enters `runBattleEndTurnOrchestration` at
`factoryBattleScriptFullTurnDecision.ts:1101-1108`. A clean result becomes
`kind: "next-turn"` by applying only `finishTurnValuesCleanUp` at
`battleEndTurnOrchestration.ts:1910-1918`; the public orchestration entry at
`:2181-2229` performs field, battler, faint, delayed-attack, and cleanup work,
but has no unconditional RNG draw at its continuing tail. The reducer then
immediately computes locked decisions or publishes the next request at
`factoryBattleScriptFullTurnDecision.ts:1137-1209`. `battleScriptCallbackStack
.ts:1-10` is explicitly an unwired prototype and therefore cannot close the
gap either.

`battleTurn.ts` is not that path. Its `turnEndRngGroups` field (`:39-45`) is
an older scenario-owned opaque draw-count list, consumed at `:172-179`.
Only `battle2OffScenario.ts:44` supplies it (`[1,2,5]`). The already-banked
kernel seam audit explains the endpoint mask precisely
(`docs/battle2-off-kernel-seam-scout.md:171-201`): the old fixture
hand-injects the ROM's boundary + switch-AI + setup/tie totals, while the real
full-turn reducer stops at its four move draws.

The multi-turn staged assertions are per-engine-stream counts, not oracle
position comparisons:

| Existing test | What it pins | What it omits |
| --- | --- | --- |
| `factoryBattleScriptFullTurnDecision.test.ts:303-346` | 8 then 16 cumulative: two four-draw hit chains per turn | boundary draw and AI selection |
| same file `:526-600` | 19 then 38 cumulative: 11 policy + 8 hit-chain draws per turn | boundary draw |
| `battleEndTurnOrchestration.test.ts:483-513` | RNG value and calls remain identical across two clean Burn boundaries | this positively pins the missing unconditional draw |

Thus “single and continuous” is true only of the engine's own shorter stream;
none of those assertions compares the same position against the ROM.

#### Battle Scene OFF fixture and observed order

`tools/battle-lab/mechanic-swift-swim-turn-boundary-off.json` stages three
complete legal L50 mons per side. The active pair is the requested Surskit
(species 311 / Frontier index 42, Relaxed, IV31/EV0, real four-move corpus,
Mystic Water item 209, Swift Swim slot 0) versus Smeargle (species 235 /
index 32, Hardy, IV31/EV0, item none, all four move slots Pound). The staged
stats read back as 76 versus 95 Speed.

The observed action transitions were:

| Turn | Frame | Attacker | Move | Result |
| ---: | ---: | --- | --- | --- |
| 1 | 71 | Smeargle | Pound | 95 > 76, acts first |
| 1 | 210 | Surskit | Rain Dance | rain established |
| 2 | 1037 | Surskit | Bubble Beam | Swift Swim gives 152 > 95, acts first |
| 2 | 1230 | Smeargle | Pound | acts second |

So the concurrent speed-wiring premise is corroborated by the ROM: the
predicted order flip is observed exactly.

#### Full ROM attribution, turn-1 resolution through turn-3 selection

`attribute-factory-ai-random-callers.py` was run through
`tools/run-mgba-probe.py` over frames 0..1932. Its fast `sRandCount` pass and
targeted LR single-step pass both found **24**, with exact reconciliation:

| Position(s) | Frame(s) | Caller | Count | Attribution |
| ---: | ---: | --- | ---: | --- |
| 1 | 74 | `Cmd_accuracycheck+0x305` | 1 | turn-1 Smeargle Pound |
| 2 | 101 | `Cmd_critcalc+0x127` | 1 | turn-1 Pound |
| 3 | 104 | `Cmd_adjustnormaldamage+0x7` | 1 | turn-1 Pound |
| 4 | 201 | `Cmd_seteffectwithchance+0x81` | 1 | turn-1 Pound |
| **5** | **503** | **`BattleTurnPassed+0x157`** | **1** | **unconditional turn-2 `gRandomTurnNumber`** |
| 6-9 | 509 | `BattleAI_SetupAIData+0x83` | 4 | turn-2 simulated RNG slots |
| 10 | 509 | `ChooseMoveOrAction_Singles+0xf7` | 1 | turn-2 identical-move tie selection |
| 11 | 1042 | `Cmd_accuracycheck+0x305` | 1 | turn-2 Surskit Bubble Beam |
| 12 | 1069 | `Cmd_critcalc+0x127` | 1 | turn-2 Bubble Beam |
| 13 | 1072 | `Cmd_adjustnormaldamage+0x7` | 1 | turn-2 Bubble Beam |
| 14 | 1221 | `Cmd_seteffectwithchance+0x81` | 1 | turn-2 Bubble Beam |
| 15 | 1233 | `Cmd_accuracycheck+0x305` | 1 | turn-2 Smeargle Pound |
| 16 | 1260 | `Cmd_critcalc+0x127` | 1 | turn-2 Pound |
| 17 | 1263 | `Cmd_adjustnormaldamage+0x7` | 1 | turn-2 Pound |
| 18 | 1362 | `Cmd_seteffectwithchance+0x81` | 1 | turn-2 Pound |
| **19** | **1499** | **`BattleTurnPassed+0x157`** | **1** | **unconditional turn-3 `gRandomTurnNumber`** |
| 20-23 | 1505 | `BattleAI_SetupAIData+0x83` | 4 | turn-3 simulated RNG slots |
| 24 | 1505 | `ChooseMoveOrAction_Singles+0xf7` | 1 | turn-3 identical-move tie selection |

Rain Dance itself draws zero. There were no switch-AI draws in this fixture.
The instrument also read `gRandomTurnNumber`: 25804 before the first
transition, 2913 after frame 503, and 1052 after frame 1499.

The closest production staged ledger is therefore positionally:
turn-1 move draws 1-4, then turn-2 AI begins at engine position 5 instead of
ROM position 6; after turn 2's eight move draws, turn-3 AI begins at engine
position 18 instead of ROM position 20. It is one draw short from turn 2
selection onward and two draws short from turn 3 selection onward. The
current branch cannot run a semantically identical engine weather fixture:
as B2 records, the production call site does not yet thread ability or
weather, so its turn-2 order would itself differ. That limitation does not
mask this verdict—the clean orchestration tests explicitly pin zero boundary
draws, while the ROM instrument identifies one.

#### Required fix shape (not implemented here)

Add one unconditional `ctx.rng.draw(...)` for every nonterminal transition,
persist its u16 result as the rules-context equivalent of
`gRandomTurnNumber`, and have all Quick Claw/`GetWhoStrikesFirst` consumers
read that stored value without redrawing. It belongs after the full
`runBattleEndTurnOrchestration` continuing cleanup has completed and before
`runEndTurnTail` computes locked decisions or publishes the next player/
trainer request (`factoryBattleScriptFullTurnDecision.ts:1137` onward).

Source assigns `gBattleMainFunc = HandleTurnActionSelectionState` at
`battle_main.c:4012`, then draws at `:4013`; the callback executes later.
The instrument confirms the practical ordering: boundary draw frame 503,
then AI decision draws frame 509 (and 1499 then 1505). Therefore the fix must
advance and store the random-turn value **before any next-turn AI decision
draw**, not inside turn ordering and not after decision collection.

Mechanical recheck:

```sh
python3 tools/probe/verify-turn-boundary-rng-gap.py
```

The same verifier accepts a fresh output path under `tools/run-mgba-probe.py`
to restage the OFF fixture and assert the four-action order.

### B6. Quick Claw turn-boundary corroboration (2026-07-28, Battle Scene OFF)

`tools/battle-lab/mechanic-quick-claw-turn-boundary-off.json` stages the B4
recipe with complete legal L50 parties. The active player is the real Frontier
index-299 Magcargo shape: Quiet, IV31/EV0, its corpus
Overheat/Earthquake/Rock Slide/Body Slam moveset, and the corpus Quick Claw
(item 183, hold effect parameter 20). The active opponent is index-32
Smeargle, Hardy IV31/EV0, forced itemless and constrained to Recover in all
four slots. Recover safely extends the stress window without changing
priority. The bench species were chosen so all six base Speeds are distinct
(`30,45,5,75,70,91`); the live active stats read back as **45 versus 95**.

The deterministic five-complete-turn window produced:

| Turn | Boundary source/frame | `gRandomTurnNumber` | `< 13107` | Observed order |
| ---: | --- | ---: | --- | --- |
| 1 | pre-window first-turn value | 25804 | no proc | Smeargle → Magcargo |
| 2 | `BattleTurnPassed+0x157`, 1214 | 44835 | no proc | Smeargle → Magcargo |
| 3 | `BattleTurnPassed+0x157`, 2556 | 15553 | no proc | Smeargle → Magcargo |
| 4 | `BattleTurnPassed+0x157`, 3480 | 45723 | no proc | Smeargle → Magcargo |
| 5 | `BattleTurnPassed+0x157`, 4222 | **10727** | **proc** | **Magcargo → Smeargle** |

Observed frequency was **1/5**; this small-n ratio is only descriptive. The
acceptance is the exact value-to-order mapping on both sides of the threshold.
The fifth completed turn also transitioned cleanly to turn 6 at frame 5155
(value 41836), though no turn-6 actions were requested.

The fast pass read `sRandCount` every frame. A fresh targeted single-step pass
then stepped only the five continuing boundary frames (hardware exec
breakpoints remain unusable on this libmgba-py build). Each frame had
`sRandCount delta == 1`, and every sole `Random()` entry resolved by LR to
**`BattleTurnPassed+0x157`**. There was therefore exactly one boundary draw
per transition. Source plus production execution also pins **zero** Quick
Claw-check draws: `turnOrder.ts` only reads the stored value, and the staged
proc/non-proc engine runs each consume the same nine calls (eight ordinary
Strength hit-chain calls plus one continuing boundary call). Effective Speeds
are always 45/95 or `UINT_MAX`/95, so the tie branch is unreachable; no
speed-tie draw fires.

#### Engine reconciliation

The RNG representation aligns directly: `FactoryFullTurnConfig.rngSeed` is
the same raw 32-bit state as ROM `gRngValue` at a chosen ledger anchor.
`verify-quick-claw-engine.ts` seeded the production reducer from each raw
pre-boundary state and used a zero-RNG Splash turn so its sole draw was the
boundary draw. Position by position, the engine reproduced the ROM's raw
post-draw state and stored u16:

| ROM pre-draw `gRngValue` / engine `rngSeed` | ROM + engine post-draw state | ROM + engine stored u16 |
| ---: | ---: | ---: |
| 1780301801 | 2938344616 | 44835 |
| 3656179860 | 1019287415 | 15553 |
| 1154923059 | 2996515370 | 45723 |
| 3795871350 | 703067313 | 10727 |

That proves the LCG and boundary storage are bit-exact at the same ledger
position. A single uninterrupted semantic engine replay is **not** alignable
through this fixture as currently exposed: the full-turn reducer deliberately
accepts already-chosen trainer decisions and does not itself consume the ROM
Factory AI's five draws between a boundary and the following actions. This is
the same decision-source seam B5's typed ledger models by explicit cursor
advancement, not an RNG-port discrepancy. Under the required fallback,
production was directly staged with two values observed above: 10727 gives
Magcargo → Smeargle, while 44835 gives Smeargle → Magcargo, and both have the
identical nine-call ledger.

Mechanical recheck:

```sh
python3 tools/probe/verify-quick-claw-turn-boundary.py

out_dir="$(mktemp -d /tmp/quick-claw-verify.XXXXXX)"
python3 tools/run-mgba-probe.py "$out_dir/result.json" -- \
  /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
  tools/probe/verify-quick-claw-turn-boundary.py "$out_dir/result.json"
```

## Self-check summary

- All Part A file:line citations: **verified by grep + Read this session**
  (both greps re-run fresh, every hit's surrounding code read).
- All Part A "already engine-referenced" claims: **verified against the
  committed `docs/ability-item-parity-census.md` table** (read this
  session, not from memory).
- Part B1's source citations: **verified by direct `Read`/`grep` of
  `reference/pokeemerald/src/battle_main.c` and `include/battle_util.h`**
  this session (line ranges quoted are the actual read output).
- Part B1's Quick Claw threshold arithmetic: **verified by command**
  (`battle-frontier-held-items.json`'s row + hand-computed integer division,
  double-checked exact: `1310700/100=13107`).
- Part B2's "zero hits" claims (`QUICK_CLAW`, `gRandomTurnNumber`): **verified
  by grep this session**, but "the production engine doesn't draw an
  equivalent per-turn RNG value anywhere" is an **inference** from that
  absence, not a proof of absence across every file — flagged as the single
  riskiest unknown rather than asserted as fact.
- Part B3's species/speed numbers: **verified by an inline Python script
  this session** reading `species-stats.json`/`natures.json`/
  `battle-frontier-mons.json` directly (formula shown, re-run twice with
  matching output).
- Part B4's recipe 1 flip claim: **caught as wrong by re-computing the
  actual numbers before committing** — left in with the correction rather
  than silently fixed, since the corrected framing (sun raises effective
  speed but doesn't flip order at these specific base stats) is itself a
  useful fixture-selection lesson for the next session.
