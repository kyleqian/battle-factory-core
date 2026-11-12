# Held-item activation-path audit — source vs port (2026-08-25)

## Status header

| Field | Value |
| --- | --- |
| Date | 2026-08-25 |
| HEAD | `a2e72119bb91c9a4deac6f3dcdd453484cf20f3e` |
| Tree hash | `86d7b62b26d3e71275477335da5d5dff5ad8d78b` |
| Lane | side worktree, `worker/side-20260825-152515` |
| Oracle profile | `battle-scene-off` (not queried — this step is docs-only, no trace was run) |
| Scope | The 38 hold effects in `docs/gate6-coverage-manifest.md` §"Hold effects" whose Status is `engine-referenced-no-oracle-receipt` **and** whose Level-50 carrier count is > 0 |
| Method | Source read from `reference/pokeemerald/`; every engine citation opened at this HEAD |
| Deliverable class | docs-only. No engine, test, tool, or data file was edited. |

### What was NOT read (explicit)

- **`HandleFaintedMonActions` state 6's item poll reachability argument.** I read
  both sides of the site (`battle_util.c:1961` ↔
  `src/engine/battleScriptFaintedActionsOrchestration.ts:408`), but I did **not**
  re-derive the engine's claim that only White Herb is reachable there. Six
  CURE_* rows are marked UNVERIFIED for exactly this reason (Finding F2).
- **`battle_ai_switch_items.c`.** `rg HOLD_EFFECT_ reference/pokeemerald/src
  reference/pokeemerald/data` returns **zero** hits in that file at this HEAD, so
  it contributes no site to any of the 38 effects. Its item logic is
  Bag-item-only (`AI_TRY_TO_FAINT`-adjacent `ShouldUseItem`) and reads
  `gBattleResources->battleHistory->trainerItems`, not hold effects. I did not
  read the file itself; I am reporting the grep result, not a verdict on it.
- **`battle_ai_script_commands.c`.** Also zero `HOLD_EFFECT_` hits; the AI's
  hold-effect knowledge enters through `data/battle_ai_scripts.s`'s
  `get_hold_effect` + `.byte HOLD_EFFECT_*` tables, which **were** read.
- **`data/battle_scripts_1.s`.** Zero `HOLD_EFFECT_` hits. The item scripts it
  defines (`BattleScript_ItemHealHP_RemoveItem`, `BattleScript_BerryCure*`,
  `BattleScript_BerryStatRaiseEnd2`, …) are named by the C sites audited below;
  their opcode bodies were **not** line-by-line diffed against the engine's
  program — that is a separate axis (script-program parity) and is out of this
  step's scope.
- **No oracle trace was run.** Every DIVERGENT claim below is a source-vs-port
  code finding with a staging recipe attached; none has an oracle receipt yet.

### Evidence rules honoured

"Engine-referenced" from the coverage manifest was used only as a worklist. Every
row below cites a `reference/…:line` ↔ `src/engine/…:line` pair that I opened at
this HEAD. Engine comments asserting parity were treated as claims, not evidence.

---

## Summary table

`L50 carriers` is the coverage manifest's own count (its legal-universe
definition, used for ranking). `Items` is derived by me from
`src/data/gen/battle-frontier-held-items.json` joined to
`src/data/gen/battle-frontier-mons.json` over the Level-50 rental ranges in
`src/data/gen/factory-round-policy.json` (`rentalSelection.ranges.level50`,
union = mon indices 110–849); where my range-derived count differs from the
manifest's I show mine in parentheses, because the manifest's universe also
covers opponent-party draws I did not recompute.

| Hold effect | L50 carriers | Items (param) | Verdict | Sites audited/total | Note |
| --- | ---: | --- | --- | ---: | --- |
| HOLD_EFFECT_CHOICE_BAND | 12 (11) | ITEM_CHOICE_BAND (0) | **DIVERGENT** | 6/5 src + 1 engine-only | Port clears the choice lock on switch-in; the ROM never does (F1) |
| HOLD_EFFECT_CURE_PAR | 21 (15) | ITEM_CHERI_BERRY (0) | UNVERIFIED | 2/3 | fainted-actions poll narrowed to White Herb (F2) |
| HOLD_EFFECT_CURE_PSN | 7 (5) | ITEM_PECHA_BERRY (0) | UNVERIFIED | 2/3 | same as CURE_PAR |
| HOLD_EFFECT_CURE_BRN | 8 (5) | ITEM_RAWST_BERRY (0) | UNVERIFIED | 2/3 | same as CURE_PAR |
| HOLD_EFFECT_CURE_FRZ | 1 (0) | ITEM_ASPEAR_BERRY (0) | UNVERIFIED | 2/3 | same as CURE_PAR |
| HOLD_EFFECT_CURE_CONFUSION | 31 (22) | ITEM_PERSIM_BERRY (0) | UNVERIFIED | 2/3 | same as CURE_PAR |
| HOLD_EFFECT_CURE_ATTRACT | 4 (2) | ITEM_MENTAL_HERB (0) | UNVERIFIED | 2/3 | same as CURE_PAR |
| HOLD_EFFECT_EVASION_UP | 120 (97) | ITEM_BRIGHT_POWDER (10), ITEM_LAX_INCENSE (5) | SOURCE-EXACT | 2/2 | integer order matches |
| HOLD_EFFECT_QUICK_CLAW | 75 (75) | ITEM_QUICK_CLAW (20) | SOURCE-EXACT | 2/2 | `gRandomTurnNumber` draw position matches |
| HOLD_EFFECT_FOCUS_BAND | 78 (66) | ITEM_FOCUS_BAND (10) | SOURCE-EXACT | 4/4 | all four draw sites ported, draw order preserved |
| HOLD_EFFECT_SCOPE_LENS | 54 (49) | ITEM_SCOPE_LENS (0) | SOURCE-EXACT | 1/1 | +1 stage, stacks additively |
| HOLD_EFFECT_SHELL_BELL | 43 (42) | ITEM_SHELL_BELL (8) | SOURCE-EXACT | 1/1 | all five guards + the `== 0 → -1` clamp |
| HOLD_EFFECT_FLINCH | 27 (23) | ITEM_KINGS_ROCK (10) | SOURCE-EXACT | 1/1 | draw happens before the move-flag gate, as in source |
| HOLD_EFFECT_RESTORE_HP | 45 (32) | ITEM_SITRUS_BERRY (30); also Oran (10)/Berry Juice (20) in the table but no L50 carrier | SOURCE-EXACT | 2/2 | `hp <= maxHP/2`, `!moveTurn` |
| HOLD_EFFECT_RESTORE_PP | 2 (2) | ITEM_LEPPA_BERRY (10) | SOURCE-EXACT | 1/1 | first zero-PP slot; PP-Ups provably zero for rentals |
| HOLD_EFFECT_ATTACK_UP | 12 (8) | ITEM_LIECHI_BERRY (4) | SOURCE-EXACT | 1/1 | source's extra `gBattleTextBuff2` pre-set is dead (overwritten) |
| HOLD_EFFECT_SPEED_UP | 21 (20) | ITEM_SALAC_BERRY (4) | SOURCE-EXACT | 1/1 | `TRY_EAT_STAT_UP_BERRY` |
| HOLD_EFFECT_SP_ATTACK_UP | 16 (12) | ITEM_PETAYA_BERRY (4) | SOURCE-EXACT | 1/1 | `TRY_EAT_STAT_UP_BERRY` |
| HOLD_EFFECT_LIGHT_BALL | 1 (0) | ITEM_LIGHT_BALL (0) | SOURCE-EXACT | 2/2 | Pikachu SpAtk ×2 + AI Thief table |
| HOLD_EFFECT_THICK_CLUB | 4 (4) | ITEM_THICK_CLUB (0) | SOURCE-EXACT | 2/2 | Cubone/Marowak Atk ×2 + AI Thief table |
| HOLD_EFFECT_DEEP_SEA_SCALE | 1 (1) | ITEM_DEEP_SEA_SCALE (0) | SOURCE-EXACT | 1/1 | Clamperl SpDef ×2, defender side |
| HOLD_EFFECT_METAL_POWDER | 1 (0) | ITEM_METAL_POWDER (0) | SOURCE-EXACT | 1/1 | Ditto Def ×2; Transform is irrelevant (see §Per-effect) |
| HOLD_EFFECT_STICK | 1 (1) | ITEM_STICK (0) | SOURCE-EXACT | 1/1 | Farfetch'd +2 crit stage |
| HOLD_EFFECT_BUG_POWER | 1 (1) | ITEM_SILVER_POWDER (10) | SOURCE-EXACT | 1/1 | shared `sHoldEffectToType` loop |
| HOLD_EFFECT_STEEL_POWER | 1 (1) | ITEM_METAL_COAT (10) | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_GROUND_POWER | 5 (3) | ITEM_SOFT_SAND (10) | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_ROCK_POWER | 2 (2) | ITEM_HARD_STONE (10) | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_GRASS_POWER | 2 (1) | ITEM_MIRACLE_SEED (10) | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_DARK_POWER | 1 (1) | ITEM_BLACK_GLASSES (10) | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_FIGHTING_POWER | 4 (3) | ITEM_BLACK_BELT (10) | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_ELECTRIC_POWER | 3 (3) | ITEM_MAGNET (10) | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_WATER_POWER | 7 (3) | ITEM_MYSTIC_WATER (10); ITEM_SEA_INCENSE (5) tabled, no L50 carrier | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_FLYING_POWER | 4 (3) | ITEM_SHARP_BEAK (10) | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_POISON_POWER | 3 (2) | ITEM_POISON_BARB (10) | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_ICE_POWER | 4 (3) | ITEM_NEVER_MELT_ICE (10) | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_PSYCHIC_POWER | 10 (7) | ITEM_TWISTED_SPOON (10) | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_FIRE_POWER | 2 (2) | ITEM_CHARCOAL (10) | SOURCE-EXACT | 1/1 | shared loop |
| HOLD_EFFECT_NORMAL_POWER | 6 (5) | ITEM_SILK_SCARF (10) | SOURCE-EXACT | 1/1 | shared loop |

**Counts: SOURCE-EXACT 31 · DIVERGENT 1 · UNVERIFIED 6 · UNREACHABLE-IN-FACTORY-L50 0.**

---

## §Findings (ranked by severity)

### F1 — `HOLD_EFFECT_CHOICE_BAND`: the port clears the choice lock on switch-in; the ROM never does

**Severity: high.** 12 Level-50 carriers, and the divergence changes *which moves
are selectable*, i.e. it can change the AI's and the player's legal action set —
not just a message.

**Source.** `gBattleStruct->choicedMove[]` is written at exactly one place and
cleared at exactly four:

| Source site | What it does |
| --- | --- |
| `reference/pokeemerald/src/battle_script_commands.c:4296-4317` | `MOVEEND_CHOICE_MOVE` — sets `*choicedMoveAtk = gChosenMove` on the first obeyed non-Struggle move, then clears to `MOVE_NONE` only if the choiced move is **not in the attacker's current moveset** (`:4309-4315`) |
| `reference/pokeemerald/src/battle_script_commands.c:2800-2801`, `:2889-2890` | item-loss paths zero it byte-wise |
| `reference/pokeemerald/src/battle_script_commands.c:9255-9259` | Trick zeroes both battlers' entries |
| `reference/pokeemerald/src/battle_script_commands.c:6357-6372` | `VARIOUS_UPDATE_CHOICE_MOVE_ON_LVL_UP` — post-battle level-up only |

`SwitchInClearSetData` (`reference/pokeemerald/src/battle_util.c`, the function
`Cmd_switchindataupdate` calls) does **not** touch `choicedMove` — I verified
this by exhaustive grep: `grep -n 'choicedMove' reference/pokeemerald/src/battle_util.c`
returns only `:981`, `:1051`, `:1053`, `:1085`, `:1119`. There is no switch-in
clear anywhere in the ROM. This is the well-known Gen-3 Choice Band behaviour:
the lock is stored per **battler position**, survives switching out, and is only
released when the mon now occupying that position does not know the locked move —
and even then only lazily, at the next `MOVEEND_CHOICE_MOVE` for that battler.

**Engine.** `src/engine/battleScriptSwitchinOpcode.ts:638-640`, inside
`createSwitchindataupdateOpcodeHandler` (`:441`), unconditionally zeroes the
switching battler's entry:

```ts
const choicedMove = Object.freeze(
  rules.choicedMove.map((move, index) => index === battler ? 0 : move),
) as BattleScriptRulesContext["choicedMove"];
```

It carries no source citation and no justifying comment, unlike every other clear
in that block. The rest of the Choice Band port is faithful:

| Source | Engine | Verdict |
| --- | --- | --- |
| `pokemon.c:3185` (`CalculateBaseDamage`, ×1.5 attack) | `src/engine/damageCalc.ts:327-329` | match |
| `battle_util.c:1051-1060` (`TrySetCantSelectMoveBattleScript`) | `src/engine/battleScriptActionAdmission.ts:2504-2511`, `:2719-2728` | match |
| `battle_util.c:1119` (`CheckMoveLimitations`) | `src/engine/battleScriptSleepTalkOpcode.ts:151-168` | match |
| `battle_script_commands.c:4296-4317` (`MOVEEND_CHOICE_MOVE`) | `src/engine/battleScriptRulesContext.ts:1680-1710` | match, incl. the Baton Pass early-out and the stale-move cleanup |
| `data/battle_ai_scripts.s:2351`, `:2355` (`AI_CV_Trick` tables) | `src/engine/factoryAiCheckViability.ts:8250-8264` | match, incl. the `EffectsToEncourage2`-first ordering |
| — (no source site) | `src/engine/battleScriptSwitchinOpcode.ts:638-640` | **engine-only clear** |

**Concrete separating input.** A Choice Band holder uses move slot 0, is switched
out, and is switched back in with slot 0 still in its moveset.

- **Stock ROM:** on return, `TrySetCantSelectMoveBattleScript` still sees
  `*choicedMove == <slot-0 move>` and rejects any other slot with
  `BattleScript_SelectingMoveWithChoiceItem` (`gCurrentMove = *choicedMove`,
  `battle_util.c:1053`), re-printing the item message. For the AI side, the
  Frontier AI's move set is likewise constrained.
- **Port:** the lock is gone; every slot is selectable again with no message.

**Staging recipe (`mechanicLab`, `overrides.parties`, `tools/battle-lab/README.md` shape).**
Corpus-legal Level-50 Choice Band carriers (from
`src/data/gen/battle-frontier-mons.json` × `battle-frontier-held-items.json`):
FURRET, LINOONE, KECLEON, ABSOL, AERODACTYL, MR_MIME. Use the Choice Band
Aerodactyl set as the player's lead so the lock is trivially observable, and give
all three opponent slots the same single move so the AI is constrained.

```jsonc
{
  "oracleProfile": "battle-scene-off",
  "mechanicLab": {
    "overrides": {
      "parties": {
        "player": [
          { "species": "SPECIES_AERODACTYL", "level": 50, "nature": "NATURE_HARDY",
            "ivs": [31,31,31,31,31,31], "evs": [0,0,0,0,0,0],
            "moves": ["MOVE_ROCK_SLIDE", "MOVE_DOUBLE_EDGE", "MOVE_EARTHQUAKE", "MOVE_PROTECT"],
            "ppUps": [0,0,0,0], "item": "ITEM_CHOICE_BAND",
            "abilitySlot": 0, "friendship": 0, "gender": "male", "shiny": false },
          { "species": "SPECIES_FURRET", "level": 50, "nature": "NATURE_HARDY",
            "ivs": [31,31,31,31,31,31], "evs": [0,0,0,0,0,0],
            "moves": ["MOVE_QUICK_ATTACK", "MOVE_HEADBUTT", "MOVE_SURF", "MOVE_REST"],
            "ppUps": [0,0,0,0], "item": "ITEM_NONE",
            "abilitySlot": 0, "friendship": 0, "gender": "male", "shiny": false },
          { "species": "SPECIES_LINOONE", "level": 50, "nature": "NATURE_HARDY",
            "ivs": [31,31,31,31,31,31], "evs": [0,0,0,0,0,0],
            "moves": ["MOVE_HEADBUTT", "MOVE_DIG", "MOVE_SURF", "MOVE_REST"],
            "ppUps": [0,0,0,0], "item": "ITEM_NONE",
            "abilitySlot": 0, "friendship": 0, "gender": "male", "shiny": false }
        ],
        "opponent": [
          { "species": "SPECIES_SHUCKLE", "level": 50, "nature": "NATURE_HARDY",
            "ivs": [31,31,31,31,31,31], "evs": [0,0,0,0,0,0],
            "moves": ["MOVE_PROTECT", "MOVE_PROTECT", "MOVE_PROTECT", "MOVE_PROTECT"],
            "ppUps": [0,0,0,0], "item": "ITEM_LEFTOVERS",
            "abilitySlot": 0, "friendship": 0, "gender": "male", "shiny": false },
          { "species": "SPECIES_SHUCKLE", "level": 50, "nature": "NATURE_HARDY",
            "ivs": [31,31,31,31,31,31], "evs": [0,0,0,0,0,0],
            "moves": ["MOVE_PROTECT", "MOVE_PROTECT", "MOVE_PROTECT", "MOVE_PROTECT"],
            "ppUps": [0,0,0,0], "item": "ITEM_LEFTOVERS",
            "abilitySlot": 0, "friendship": 0, "gender": "male", "shiny": false },
          { "species": "SPECIES_SHUCKLE", "level": 50, "nature": "NATURE_HARDY",
            "ivs": [31,31,31,31,31,31], "evs": [0,0,0,0,0,0],
            "moves": ["MOVE_PROTECT", "MOVE_PROTECT", "MOVE_PROTECT", "MOVE_PROTECT"],
            "ppUps": [0,0,0,0], "item": "ITEM_LEFTOVERS",
            "abilitySlot": 0, "friendship": 0, "gender": "male", "shiny": false }
        ]
      }
    }
  }
}
```

Input sequence for the nested trace: **turn 1** Aerodactyl uses slot 0
(Rock Slide) — this writes the lock at `MOVEEND_CHOICE_MOVE`. **Turn 2** switch
Aerodactyl → Furret. **Turn 3** switch Furret → Aerodactyl. **Turn 4** open the
move menu and select slot 1 (Double-Edge). Capture the frames around the turn-4
selection. On the stock ROM the selection is refused and the Choice Band message
prints, keeping the menu open; the port accepts it.

*(Substitute any other listed Choice Band carrier if Aerodactyl's exact corpus
set differs from the moves above — the set list is in
`src/data/gen/battle-frontier-mons.json`; the recipe only needs a Choice Band
carrier with ≥ 2 usable moves plus a benched partner to switch through.)*

**Proposed `ISSUES.md` entry text (supervisor files it):**

> **Choice Band lock is wrongly cleared on switch-in.**
> `src/engine/battleScriptSwitchinOpcode.ts:638-640` (inside
> `createSwitchindataupdateOpcodeHandler`) zeroes `choicedMove[battler]` as part
> of the `SwitchInClearSetData` port. The ROM's `SwitchInClearSetData` never
> touches `gBattleStruct->choicedMove` — grep over
> `reference/pokeemerald/src/battle_util.c` finds only `:981`, `:1051`, `:1053`,
> `:1085`, `:1119`, all read-sites. In Gen 3 the lock lives on the *battler
> position*: it survives switching and is released only lazily at the next
> `MOVEEND_CHOICE_MOVE` when the current occupant does not know the locked move
> (`battle_script_commands.c:4309-4315`), or by Trick/item loss/level-up
> (`:2800`, `:2889`, `:9255`, `:6357`). Repro: Choice Band carrier uses slot 0,
> switches out, switches back in — the ROM still refuses every other slot with
> `BattleScript_SelectingMoveWithChoiceItem`; the port allows all four. 12
> Level-50 Factory carriers (ITEM_CHOICE_BAND). Fix: delete the switch-in clear
> and let `applyBattleScriptMoveEndChoiceOwnership`
> (`src/engine/battleScriptRulesContext.ts:1680-1710`) be the only releaser.
> Docs-audit source: `docs/held-item-activation-audit-2026-08-25.md` §F1.

---

### F2 — six CURE_* effects: the `HandleFaintedMonActions` item poll is narrowed to White Herb (unproven)

**Severity: medium-low, and NOT yet a proven divergence — it is why six rows are
UNVERIFIED rather than SOURCE-EXACT.**

**Source.** `reference/pokeemerald/src/battle_util.c:1955-1965`
(`HandleFaintedMonActions`, `faintedActionsState` case 6) calls

```c
if (AbilityBattleEffects(ABILITYEFFECT_INTIMIDATE1, 0, 0, 0, 0)
 || AbilityBattleEffects(ABILITYEFFECT_TRACE, 0, 0, 0, 0)
 || ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)
 || AbilityBattleEffects(ABILITYEFFECT_FORECAST, 0, 0, 0, 0))
    return TRUE;
```

`moveTurn = TRUE` suppresses `HOLD_EFFECT_RESTORE_HP` (`:3337`),
`HOLD_EFFECT_RESTORE_PP` (`:3348`), `HOLD_EFFECT_LEFTOVERS` (`:3401`), the five
confuse berries (`:3228`) and the stat-up berries (`:3245`, `:3430`) — but the
eight cure branches at `:3499-3600` carry **no `moveTurn` gate at all**, so on
the ROM a Cheri/Pecha/Rawst/Aspear/Persim/Lum/Chesto/Mental Herb held by
battler 0 can still fire from this poll.

**Engine.** `src/engine/battleScriptFaintedActionsOrchestration.ts:408` documents
state 6 as "Intimidate, Trace, then **the reachable White Herb item pass**", and
the module's header comment (`:32-39`) argues state 6 is a guaranteed no-op —
but that argument is written about the *ability* flags
(`Cmd_switchineffects`'s `ABILITYEFFECT_ON_SWITCHIN` barriers), not about the
item cases. The cure branches have no corresponding engine site at this poll.

**Why this is UNVERIFIED and not DIVERGENT.** In the common path the cure berry
has already been eaten one step earlier by `MOVEEND_ITEM_EFFECTS_ALL`
(`battle_script_commands.c:4330-4334` → `ITEMEFFECT_MOVE_END`, ported at
`src/engine/battleScriptMoveEndOpcode.ts:745-797`), which sweeps **all**
battlers for the same statuses. To separate the two engines you need a status
inflicted *after* the last `MOVEEND` of the turn and *before* fainted-actions —
i.e. an end-turn-applied status (Yawn→sleep at `ENDTURN_YAWN`) racing an
end-turn faint (poison/burn/Leech Seed) on the other side, with the sleeping
battler at index 0 holding a Chesto Berry, and `ENDTURN_ITEMS1/2` for battler 0
not having run yet. I did not have time to walk `TurnValuesCleanUp`/
`DoBattlerEndTurnEffects`'s per-battler ordering to decide whether that window
is real, so I am not claiming a divergence.

**Affected rows (all six marked UNVERIFIED, 2/3 sites matched):** CURE_PAR,
CURE_PSN, CURE_BRN, CURE_FRZ, CURE_CONFUSION, CURE_ATTRACT. Their other two
sites — `ITEMEFFECT_NORMAL` and `ITEMEFFECT_MOVE_END` — are exact (see
§Per-effect site tables).

**Next action for whoever picks this up:** read `battle_util.c`'s
`DoBattlerEndTurnEffects` tracker order (`ENDTURN_YAWN` vs `ENDTURN_ITEMS1`,
`ENDTURN_ITEMS2`) and decide reachability; if reachable, this becomes a
DIVERGENT row with a Yawn + end-turn-faint staging recipe. If unreachable, the
engine should say so in a comment naming the ordering, and all six rows become
SOURCE-EXACT.

**Proposed `ISSUES.md` entry text (supervisor decides whether to file):**

> **`HandleFaintedMonActions` state 6 narrows `ItemBattleEffects(ITEMEFFECT_NORMAL, 0, TRUE)` to White Herb without a proof.**
> `battle_util.c:1961` polls the full `ITEMEFFECT_NORMAL` switch with
> `moveTurn = TRUE`; the eight cure branches (`:3499-3600`) have no `moveTurn`
> gate, so Cheri/Pecha/Rawst/Aspear/Persim/Lum/Chesto/Mental Herb are live at
> that poll on the ROM.
> `src/engine/battleScriptFaintedActionsOrchestration.ts:408` implements only
> the `HOLD_EFFECT_RESTORE_STATS` pass and its header comment's no-op argument
> (`:32-39`) covers only the ability flags. Either prove the cure branches are
> unreachable there (the candidate window is an `ENDTURN_YAWN` sleep racing an
> end-turn faint before `ENDTURN_ITEMS1` for battler 0) and record the ordering
> in a comment, or port them. 71 Level-50 carriers across the six audited cure
> effects. Docs-audit source:
> `docs/held-item-activation-audit-2026-08-25.md` §F2.

---

### No other DIVERGENT rows

No `throw`-shaped premise was found on any audited path: `tools/probe/premise-census.py`'s
throw sites do not intersect the item paths read here — the only `throw`s
encountered were argument-validation guards
(`src/engine/battleScriptTryKOOpcode.ts:96`, `factoryBattleScriptFullTurnDecision.ts:2978`,
`battleScriptSwitchinOpcode.ts:446`, `battleScriptRulesContext.ts:1683`), each of
which fires on malformed engine input rather than on a legal battle state. I did
not run the census tool itself (docs-only step, no tooling invoked).

---

## §Per-effect site tables

Every `reference/…:line` and `src/engine/…:line` below was opened at this HEAD.

### Group A — `ItemBattleEffects`, `ITEMEFFECT_NORMAL` (`battle_util.c:3330-3620`)

Poll sites (shared by every Group A row):

| Source poll | Engine poll | Verdict |
| --- | --- | --- |
| `battle_util.c:1499-1502` `ENDTURN_ITEMS1` (`moveTurn = FALSE`) | `src/engine/battleEndTurnOrchestration.ts:1574` → `runItemsTick(..., moveTurn=false)` (helper at `:1264`) | match |
| `battle_util.c:1504-1507` `ENDTURN_ITEMS2` (`moveTurn = TRUE`) | `src/engine/battleEndTurnOrchestration.ts:1725` → `runItemsTick(..., moveTurn=true)` (helper at `:1264`) | match |
| `battle_util.c:1961` fainted-actions (`battler 0`, `moveTurn = TRUE`) | `src/engine/battleScriptFaintedActionsOrchestration.ts:408` | **narrowed — F2** |
| `battle_main.c:3887` / `battle_script_commands.c:5266` `ITEMEFFECT_ON_SWITCH_IN` | `src/engine/battleScriptSwitchinOpcode.ts:1119` (barrier-free; the case has only `DOUBLE_PRIZE` + `RESTORE_STATS`, `battle_util.c:3305-3327`) | match — no Group A effect appears in that case |

The `hp != 0` prologue (`battle_util.c:3331`) is ported in `runItemsTick`'s prologue
(`battleEndTurnOrchestration.ts:1264-1282`), which also reproduces
`gLastUsedItem = gBattleMons[battler].item` (`:3266`) before any gate.

| Hold effect | Source | Engine | Guards checked | Verdict |
| --- | --- | --- | --- | --- |
| RESTORE_HP | `battle_util.c:3336-3346` | `battleEndTurnOrchestration.ts:1382-1393` (+ gate `:247-249`) | `hp <= maxHP/2` (**not** `<`), `!moveTurn`, `gBattleMoveDamage = -min(param, maxHP-hp)`, script `BattleScript_ItemHealHP_RemoveItem`. Leftovers is a *different* effect at `:3400` / engine `:1283` and was not conflated. | SOURCE-EXACT |
| RESTORE_PP | `battle_util.c:3347-3373` | `battleEndTurnOrchestration.ts:1395-1419` (+ slot search `:257-259`) | `!moveTurn`; first slot `i` in `0..3` with `move != 0 && pp == 0` (source `break`s ⇒ `findIndex`, not "any"); `changedPP = min(pp+param, CalculatePPWithBonus(...))`. PP-Ups: Factory rentals are built by `CreateMon*` (`battle_factory.c:435,476,812`) which zeroes `ppBonuses`, so `maxPP` is the base `gBattleMoves[move].pp` — the engine states and relies on this. Script `BattleScript_BerryPPHealEnd2`. | SOURCE-EXACT |
| CURE_PAR | `battle_util.c:3499-3506` | `battleEndTurnOrchestration.ts:1312-1315` | `status1 & STATUS1_PARALYSIS`, clear that bit only, `BattleScript_BerryCurePrlzEnd2`, `ITEM_STATUS_CHANGE` ⇒ the `REQUEST_STATUS_BATTLE` party sync (`:3608-3611` ↔ engine `runStatus1CureTick` `:1228-1246`) | site match (row UNVERIFIED via F2) |
| CURE_PSN | `battle_util.c:3507-3514` | `:1316-1319` | clears `STATUS1_PSN_ANY | STATUS1_TOXIC_COUNTER` together | site match |
| CURE_BRN | `battle_util.c:3515-3522` | `:1320-1323` | `STATUS1_BURN` | site match |
| CURE_FRZ | `battle_util.c:3523-3530` | `:1324-1327` | `STATUS1_FREEZE` | site match |
| CURE_CONFUSION | `battle_util.c:3540-3547` | `:1335-1342` | `status2 & STATUS2_CONFUSION`, `ITEM_EFFECT_OTHER` (so **no** status-sync emit — engine correctly uses `runTickScript`, not `runStatus1CureTick`) | site match |
| CURE_ATTRACT | `battle_util.c:3593-3601` | `:1366-1381` | `status2 & STATUS2_INFATUATION`, `gBattleTextBuff1 = "love"`, `MULTISTRING_CHOOSER = B_MSG_CURED_PROBLEM`, `BattleScript_BerryCureChosenStatusEnd2`, `ITEM_EFFECT_OTHER`. Note source sets the chooser *after* `BattleScriptExecute` — harmless, the script reads it later; engine sets it before. | site match |
| ATTACK_UP | `battle_util.c:3429-3442` | `:1420-1445` | `hp <= maxHP/param`, `!moveTurn`, `statStages[STAT_ATK] < MAX_STAT_STAGE`, `SET_STATCHANGER(STAT_ATK, 1, FALSE)` = `stat | (1<<4)`, `animArg1 = STAT_ANIM_PLUS1 + stat`. Source's extra `PREPARE_STRING_BUFFER(gBattleTextBuff2, STRINGID_STATROSE)` at `:3434` (the "only the Attack berry has this" quirk) is **dead**: `ChangeStatBuffs` unconditionally rewrites `gBattleTextBuff2` with the same STATROSE payload at `battle_script_commands.c:7065-7077` before the print. The engine's omission is therefore not observable. | SOURCE-EXACT |
| SPEED_UP | `battle_util.c:3446-3448` → `TRY_EAT_STAT_UP_BERRY` `:3244-3255` | `:1420-1445` via `STAT_UP_BERRIES` `:214-216` | identical macro body | SOURCE-EXACT |
| SP_ATTACK_UP | `battle_util.c:3449-3451` → same macro | same | identical | SOURCE-EXACT |

**One deliberate constant to flag (not a divergence in-universe):** the engine
hardcodes the pinch threshold divisor as `STAT_UP_BERRY_HOLD_EFFECT_PARAM = 4`
(`battleEndTurnOrchestration.ts:200`, used at `:1422`), where source reads
`battlerHoldEffectParam`. All three Factory stat-up berries carry param 4
(`src/data/gen/battle-frontier-held-items.json`: LIECHI/SALAC/PETAYA = 4), so
this is behaviourally exact for every legal carrier. It would break if a
different-param carrier were ever added.

### Group B — `ITEMEFFECT_MOVE_END` (`battle_util.c:3625-3757`)

Poll site: `battle_script_commands.c:4330-4334` (`MOVEEND_ITEM_EFFECTS_ALL`,
loops **all** battlers, `break`s on the first effect and does **not** advance
`moveendState`) ↔ `src/engine/battleScriptMoveEndOpcode.ts:722-882` (`case
MOVEEND_ITEM_EFFECTS_ALL`, and `:880-881` reproduces the "only advance when no
effect" rule).

| Hold effect | Source | Engine | Verdict |
| --- | --- | --- | --- |
| CURE_PAR | `battle_util.c:3641-3649` | `battleScriptMoveEndOpcode.ts:745-751` | site match |
| CURE_PSN | `:3650-3658` | `:752-761` | site match (`PSN_ANY | TOXIC_COUNTER`) |
| CURE_BRN | `:3659-3667` | `:762-768` | site match |
| CURE_FRZ | `:3668-3676` | `:769-775` | site match |
| CURE_CONFUSION | `:3687-3695` | `:784-789` | site match |
| CURE_ATTRACT | `:3696-3706` | `:790-797` | site match (`"love"`, `B_MSG_CURED_PROBLEM`, `BattleScript_BerryCureChosenStatusRet`) |

Differences from the Group A twins that the engine reproduces correctly: this
case uses `BattleScriptPushCursor()` + `gBattlescriptCurrInstr = …Ret` (not
`BattleScriptExecute` + `…End2`), and its `CURE_STATUS` branch omits the `i`
counter, so it always prints `B_MSG_CURED_PROBLEM` rather than the "normalized"
variant (`:3707-3737` vs `:3548-3592`).

### Group C — `ITEMEFFECT_KINGSROCK_SHELLBELL` (`battle_util.c:3767-3806`)

Poll site: `battle_script_commands.c:4336-4340` (`MOVEEND_KINGSROCK_SHELLBELL`,
advances `moveendState` **unconditionally**, unlike state 11) ↔
`src/engine/battleScriptMoveEndOpcode.ts:883-967`. The outer
`if (gBattleMoveDamage)` guard (`:3769`) is at engine `:885`.

| Hold effect | Source | Engine | Guards | Verdict |
| --- | --- | --- | --- | --- |
| FLINCH (King's Rock) | `battle_util.c:3774-3786` | `battleScriptMoveEndOpcode.ts:887-931` | Source order is `!(gMoveResultFlags & MOVE_RESULT_NO_EFFECT)` → `TARGET_TURN_DAMAGED` → `(Random() % 100) < param` → `flags & FLAG_KINGS_ROCK_AFFECTED` → `target.hp`. The engine draws the RNG **after** the first two and **before** the flag/HP checks (`:900-905`), exactly reproducing C's `&&` short-circuit: a damaging non-King's-Rock-affected move still consumes the draw. `TARGET_TURN_DAMAGED` = `physicalDmg || specialDmg` is at engine `:892-894`. Then `MOVE_EFFECT_FLINCH` + `SetMoveEffect(FALSE, 0)` targeting `gBattlerTarget`, cursor pushed/popped (`:915-928`). Gen 3 has no Sheer Force, and none is introduced. | SOURCE-EXACT |
| SHELL_BELL | `battle_util.c:3787-3804` | `battleScriptMoveEndOpcode.ts:933-965` | All five guards present and in order: `!NO_EFFECT`, `shellBellDmg != 0`, `shellBellDmg != IGNORE_SHELL_BELL` (the Substitute/no-drain sentinel), `gBattlerAttacker != gBattlerTarget` (self-target), `attacker.hp != attacker.maxHP` (no heal at full HP), `attacker.hp != 0`. Drain is `shellBellDmg / atkHoldEffectParam` with param 8 ⇒ 1/8 of damage dealt, negated, and the `== 0 → -1` clamp is `Math.max(1, …)` at engine `:945`. `gSpecialStatuses[target].shellBellDmg = 0` at `:946-952`. `gLastUsedItem = atkItem`, `gPotentialItemEffectBattler`/`gBattleScripting.battler = attacker` at `:957-959`. Script `BattleScript_ItemHealHP_Ret`. | SOURCE-EXACT |

The King's Rock draw happens **before** the Shell Bell branch only in the sense
that they are mutually exclusive switch cases on the attacker's own hold
effect — one battler cannot hold both, so there is no draw-order interleaving to
reproduce. Verified against the `switch (atkHoldEffect)` at `battle_util.c:3771`.

### Group D — `CalculateBaseDamage` (`pokemon.c:3130-3230`)

Order in source, reproduced at `src/engine/damageCalc.ts:292-362`: Huge/Pure
Power → **type-power loop** → badge boosts (skipped, `BATTLE_TYPE_FRONTIER`) →
**Choice Band + the six species items** → Thick Fat/Hustle/etc.

| Hold effect | Source | Engine | Formula / guard | Verdict |
| --- | --- | --- | --- | --- |
| the 14 audited `*_POWER` effects | table `pokemon.c:1921-1937` (`sHoldEffectToType`), loop `pokemon.c:3171-3183` | table `damageCalc.ts:267-285`, loop `damageCalc.ts:313-322` | attacker-only; first match `break`s; **physical types boost `attack`, special types boost `spAttack`**; `x = (x * (param + 100)) / 100` with C integer truncation ⇒ `Math.trunc`. Param 10 ⇒ ×1.1; Lax Incense/Sea Incense-style param 5 ⇒ ×1.05. Table order and all 17 rows match (the 3 unaudited rows GHOST/DRAGON + the L50-zero ones are present too). | SOURCE-EXACT |
| CHOICE_BAND | `pokemon.c:3185-3186` | `damageCalc.ts:327-329` | `attack = (150 * attack) / 100`, attacker only, no species guard, applied *after* the type-power loop | SOURCE-EXACT (damage site; see F1 for the lock) |
| DEEP_SEA_SCALE | `pokemon.c:3193-3194` | `damageCalc.ts:347-349` | **defender**-side, `spDefense *= 2`, `species == SPECIES_CLAMPERL` | SOURCE-EXACT |
| LIGHT_BALL | `pokemon.c:3195-3196` | `damageCalc.ts:350-352` | attacker-side, `spAttack *= 2`, `species == SPECIES_PIKACHU` (Pichu/Raichu do **not** qualify — engine matches) | SOURCE-EXACT |
| METAL_POWDER | `pokemon.c:3197-3198` | `damageCalc.ts:353-355` | **defender**-side, `defense *= 2`, `species == SPECIES_DITTO`. Transform: the guard reads `defender->species`, which for a Transformed mon is the *transformed-into* species in `gBattleMons`, so a Transformed Ditto loses the boost on the ROM. The engine reads `defender.species` from the same battler struct, so it inherits that behaviour rather than special-casing it — no divergence introduced. | SOURCE-EXACT |
| THICK_CLUB | `pokemon.c:3199-3200` | `damageCalc.ts:356-361` | attacker-side, `attack *= 2`, `species == SPECIES_CUBONE || SPECIES_MAROWAK` | SOURCE-EXACT |

`SOUL_DEW` and `DEEP_SEA_TOOTH` sit in the same block and are ported
(`damageCalc.ts:331-346`) including the `!(gBattleTypeFlags & BATTLE_TYPE_FRONTIER)`
suppression at `pokemon.c:3187/3189`; they are outside this step's 38 rows.

### Group E — `GetWhoStrikesFirst` (`battle_main.c:4595-4754`)

| Hold effect | Source | Engine | Verdict |
| --- | --- | --- | --- |
| QUICK_CLAW | `battle_main.c:4653` (battler 1) and `:4687` (battler 2) — identical code, `holdEffect == HOLD_EFFECT_QUICK_CLAW && gRandomTurnNumber < (0xFFFF * holdEffectParam) / 100` ⇒ `speedBattlerN = UINT_MAX` | `src/engine/turnOrder.ts:60-65` (`effectiveSpeed`, factored once for both halves; `UINT_MAX = 0xffff_ffff` at `:20`) | SOURCE-EXACT |

**Draw position (the part most likely to be wrong, checked explicitly).**
`gRandomTurnNumber` is **not** drawn inside `GetWhoStrikesFirst` — it is a
turn-scoped value assigned by `Random()` at `battle_main.c:4013`
(`BattleTurnPassed`, immediately after `gBattleMainFunc = HandleTurnActionSelectionState`),
with two other assignment sites at `:3140` and `:3923` on the battle-start paths.
The engine draws it at exactly that point:
`src/engine/factoryBattleScriptFullTurnDecision.ts:2380-2394` (`ctxRng.draw("BattleTurnPassed gRandomTurnNumber (battle_main.c:4013)")`),
mirrored at `src/engine/factoryAiDecisionPolicy.ts:968`, stored in the rules
context (`src/engine/battleScriptRulesContext.ts:819-823`) and threaded into the
turn-order comparison at `factoryBattleScriptFullTurnDecision.ts:3001-3010`.
Both battlers' Quick Claw tests read the **same** turn value, so on a turn where
both hold a Quick Claw either both roll `UINT_MAX` (tie ⇒ the `Random() & 1`
tie-break at `battle_main.c:4728/4745`, engine `turnOrder.ts:126`) or neither
does — the engine reproduces this because `randomTurnNumber` is passed once into
both `effectiveSpeed` calls. The tie draw is taken **only** on a genuine tie
(`factoryBattleScriptFullTurnDecision.ts:3003-3004` pre-computes `isSpeedTie`
before deciding whether to consume an RNG step), matching source's structure.
Hold-effect plumbing is real, not stubbed:
`factoryBattleScriptFullTurnDecision.ts:1889-1901` (`turnOrderBattler`) resolves
`holdEffect`/`holdEffectParam` from the battler's actual item, and
`factoryBattleStart.ts:158-171` (`preHookEffectiveSpeed`) does the same via
`HELD_ITEM_BY_ID`. The `randomTurnNumber = 0xffff` default in `turnOrder.ts:48/83/113`
is a "Quick Claw never fires" sentinel (with param 20, `(0xFFFF*20)/100 = 13107`
and `0xffff < 13107` is false). I did not enumerate every caller that leaves it
at the default — the two real Factory turn-order paths above both pass a drawn
value (`factoryBattleStart.ts:427`, `:543`, and `factoryBattleScriptFullTurnDecision.ts:3010`).
I did not find a prior `gRandomTurnNumber` finding in `docs/` contradicting this;
`rg gRandomTurnNumber docs/` was not exhaustive across the whole `docs/` tree, so
treat "no prior finding" as unconfirmed rather than established.

`HOLD_EFFECT_MACHO_BRACE` (`battle_main.c:4647/4681` ↔ `turnOrder.ts:58`) and the
paralysis quarter (`:4650/4684` ↔ `:59`) are in the same block and match; both
are outside this step's 38 rows.

### Group F — `Cmd_critcalc` / `Cmd_accuracycheck` / the damage-clamp commands

| Hold effect | Source | Engine | Verdict |
| --- | --- | --- | --- |
| SCOPE_LENS | `battle_script_commands.c:1272` (inside the `critChance` sum, `:1267-1274`) | `src/engine/damageCalc.ts:506` (inside `getCriticalHitChanceStage`, `:499-512`) | SOURCE-EXACT |
| STICK | `battle_script_commands.c:1274` — `+ 2 * (holdEffect == HOLD_EFFECT_STICK && species == SPECIES_FARFETCHD)` | `src/engine/damageCalc.ts:508` | SOURCE-EXACT |
| EVASION_UP | `battle_script_commands.c:1172-1173` — `calc = (calc * (100 - param)) / 100`, applied **after** Compound Eyes / Sand Veil / Hustle and **immediately before** the `(Random() % 100 + 1) > calc` roll (`:1176`) | `src/engine/damageCalc.ts:662-664`, in the same position within `calculateAccuracy` (`:648-666`), with `Math.trunc` at each step; the roll is `rollAccuracyHits` at `:669-671` | SOURCE-EXACT |

Crit stacking is additive in a single expression, so Scope Lens (+1), Focus
Energy (+2) and Stick (+2) all sum, then clamp to
`ARRAY_COUNT(sCriticalHitChance) - 1` (`battle_script_commands.c:1276-1277` ↔
`damageCalc.ts:509-510`). `HOLD_EFFECT_LUCKY_PUNCH`'s Chansey guard
(`:1273` ↔ `:507`) is ported alongside but has no L50 carrier and is not one of
the 38.

`gPotentialItemEffectBattler = gBattlerAttacker/gBattlerTarget`
(`battle_script_commands.c:1265`, `:1170`, `:1675`, `:1718`, `:5877`, `:7506`) is a
display-only field for the "item is revealed" UI; the engine models the same idea
as `recordBattleScriptItemEffectReveal` on the Focus Band sites only. I did not
audit whether the crit/accuracy sites need it — flagged here as an unread
sub-detail, not counted as a site.

**FOCUS_BAND — all four source sites:**

| Source site | Function | Engine site | Verdict |
| --- | --- | --- | --- |
| `battle_script_commands.c:1677-1681` | `Cmd_adjustnormaldamage` (includes `EFFECT_FALSE_SWIPE` in the clamp) | `src/engine/battleScriptHitChainOpcode.ts:2029-2046` via `adjustNormalDamageOpcodeHandler(context, includeFalseSwipe = true)` | SOURCE-EXACT |
| `battle_script_commands.c:1720-1724` | `Cmd_adjustnormaldamage2` (no False Swipe) | same handler, `includeFalseSwipe = false` | SOURCE-EXACT |
| `battle_script_commands.c:5878-5882` | `Cmd_adjustsetdamage` (no variance draw, **does** include False Swipe) | `src/engine/battleScriptHitChainOpcode.ts:2142-2160` (`adjustsetdamageOpcodeHandler`) | SOURCE-EXACT |
| `battle_script_commands.c:7507-7511` | `Cmd_tryKO` (before the Sturdy branch) | `src/engine/battleScriptTryKOOpcode.ts:119-129` | SOURCE-EXACT |

Draw-order detail, checked because the brief called it out: in
`Cmd_adjustnormaldamage`/`2`, `ApplyRandomDmgMultiplier()` (`:1662`, `:1705`)
runs **before** the Focus Band draw. The engine draws the variance roll first
(`battleScriptHitChainOpcode.ts:2018-2024`) and the band roll second (`:2030-2035`),
preserving the order. In `Cmd_adjustsetdamage` there is no variance draw at all
(source's own comment at `:5860`), and the engine's handler correspondingly has
none — so the band draw is the first RNG step there. In `Cmd_tryKO` the band
draw precedes the accuracy/OHKO chance draw, matching source's layout
(`:7507` before `:7524`). The crit draw lives in `Cmd_critcalc`
(`battle_script_commands.c:1282`), a strictly earlier command in every damaging
script, so it is unaffected.

Clamp semantics (all four sites, identical in source and port): `!Substitute
&& (FalseSwipe|| endured || focusBanded) && target.hp <= damage` ⇒
`damage = target.hp - 1`, then `MOVE_RESULT_FOE_ENDURED` **or**
(`else if`) `MOVE_RESULT_FOE_HUNG_ON` + `gLastUsedItem = target.item`. Endure
wins the message when both apply — engine `battleScriptHitChainOpcode.ts:2058-2066`
uses the same `if/else if`. A Substitute suppresses the survival entirely.
The band roll is taken by any Focus Band holder even on a non-lethal hit, and the
`focusBanded` bit persists for the action (`gSpecialStatuses`, engine
`specialStatus.focusBanded`); both engines read the pre-existing bit before
drawing, so a second hit in a multi-hit move can survive off the first hit's set
bit.

### Group G — the Factory AI

`rg HOLD_EFFECT_ reference/pokeemerald/src reference/pokeemerald/data` finds the
AI's hold-effect sites **only** in `data/battle_ai_scripts.s` (15 hits); neither
`battle_ai_script_commands.c` nor `battle_ai_switch_items.c` names a hold effect
at this HEAD. The two relevant tables:

| Source | Contents | Engine | Verdict |
| --- | --- | --- | --- |
| `data/battle_ai_scripts.s:1848-1868` `AI_CV_Thief` + `AI_CV_Thief_EncourageItemsToSteal` (`:1861-1868`) | CURE_SLP, CURE_STATUS, **RESTORE_HP**, **EVASION_UP**, LEFTOVERS, **LIGHT_BALL**, **THICK_CLUB**, `-1` | `src/engine/factoryAiCheckViability.ts:9027-9036` (`AI_CV_THIEF_ENCOURAGED_HOLD_EFFECTS` = ids 3, 9, 1, 22, 43, 45, 65) + `runCvThief` `:9060-9075`, dispatched at `:6891-6893` | all 7 ids present, same set; the `if_not_in_bytes` ⇒ `-2`, else `if_random_less_than 50` ⇒ `+1` shape is reproduced | SOURCE-EXACT |
| `data/battle_ai_scripts.s:2340-2357` `AI_CV_Trick` + its two tables | `EffectsToEncourage` = 5 confuse berries + MACHO_BRACE + **CHOICE_BAND**; `EffectsToEncourage2` = {**CHOICE_BAND**} | `src/engine/factoryAiCheckViability.ts:8250-8264` | both sets and the "subset checked first" ordering match | SOURCE-EXACT |

`battle_ai_switch_items.c`'s item logic is Bag-item-only and reads the trainer's
item history, not hold effects — it contributes no site to any of the 38 rows.
That is a grep result, not a read of the file (see §"What was NOT read").

---

## §Method — exact commands

Worklist extraction (38 rows):

```sh
sed -n '/^### Hold effects (all legal-universe rows)/,$p' docs/gate6-coverage-manifest.md \
  | awk -F'|' '/^\| HOLD_EFFECT_/ {gsub(/ /,"",$2); gsub(/ /,"",$3); gsub(/ /,"",$4);
      if ($3 ~ /no-oracle-receipt/ && $4+0>0) print $2, $4}'
```

Complete source-site inventory (every `HOLD_EFFECT_` hit outside the item data
table, accounted for above):

```sh
rg -n 'HOLD_EFFECT_' reference/pokeemerald/src reference/pokeemerald/data --no-heading \
  | grep -v 'reference/pokeemerald/src/data/items.h' \
  | awk -F: '{print $1}' | sort | uniq -c | sort -rn
# 40 src/battle_util.c
# 29 src/pokemon.c
# 15 data/battle_ai_scripts.s
# 14 src/battle_script_commands.c
#  8 src/battle_main.c
```

Poll-site inventory:

```sh
grep -rn 'ItemBattleEffects\|ITEMEFFECT_' reference/pokeemerald/src reference/pokeemerald/include
```

Engine-side inventory (string literals **and** identity consts):

```sh
rg -n 'HOLD_EFFECT_' src/engine --no-heading | sed 's/:.*//' | sort | uniq -c | sort -rn
rg -ln 'holdEffect|HoldEffect' src/engine src/data/gen --type ts
rg -n 'randomTurnNumber|gRandomTurnNumber' src/engine --no-heading
rg -n 'CHOICE_BAND|choicedMove|choiced' src/engine --no-heading
grep -n 'choicedMove' reference/pokeemerald/src/battle_util.c   # proves no switch-in clear
```

Carrier/item derivation (Level-50 universe = union of
`factory-round-policy.json` → `rentalSelection.ranges.level50`, mon indices
110–849):

```sh
python3 - <<'PY'
import json, collections
hi = {e['itemTableId']: e for e in json.load(open('src/data/gen/battle-frontier-held-items.json'))['entries']}
mons = json.load(open('src/data/gen/battle-frontier-mons.json'))['entries']
L50 = set()
for lo, hi_ in [(110,199),(162,266),(267,371),(372,467),(468,563),(564,659),(660,755),(372,849)]:
    L50.update(range(lo, hi_ + 1))
agg = collections.defaultdict(lambda: [0, collections.Counter(), collections.Counter()])
for e in mons:
    if e['index'] not in L50: continue
    it = hi[e['itemTableId']]
    a = agg[it['holdEffect']]; a[0] += 1; a[1][it['item']] += 1; a[2][e['species']] += 1
for k, v in sorted(agg.items(), key=lambda kv: -kv[1][0]):
    print(k, v[0], dict(v[1]), v[2].most_common(6))
PY
```
