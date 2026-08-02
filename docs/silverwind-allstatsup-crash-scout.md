# SILVER WIND / All-Stats-Up presentation crash — repro + root-cause scout

Same-day user report (2026-08-02): a drafted BUTTERFREE rental used SILVER
WIND in a real generated-route battle; the app crashed with a
"not implemented"-style exception. Crash correlated with the move's 10%
secondary-effect proc firing. This is a SIDE-lane scout: repro + root cause
only, no `src/` fix (that's a later main-lane step).

## 1. Repro (production code path, no mocks)

Driven through the exact production entry points: `createFactoryFullTurnBattleState`
+ `submitFactoryFullTurnDecision` (twice: player, then trainer) — the real
full-turn kernel reducer, `src/engine/factoryBattleScriptFullTurnDecision.ts`
— then the resulting real `transition` fed into `createBattleResolutionPresentation`
(`src/engine/battleResolutionPresentation.ts:999`), the production
presentation constructor wired into the live render path (see its own
provenance comment in `src/engine/battle2CommandAdapter.ts:21-38`: "driven
from the real kernel... this is production code, not a proof-of-concept").

Scenario: player BUTTERFREE (species 12) with SILVER_WIND (move 318, slot 0)
vs. trainer RATTATA (species 19) with TACKLE (move 33), `rngSeed: 13`
(the engine's `BattleScriptRngState` seed — i.e. the raw initial `gRngValue`,
not the oracle's separate ROM-level seed used in §4). RATTATA's speed (72)
exceeds BUTTERFREE's (70) so RATTATA's action resolves first (and crits this
particular seed — irrelevant to the bug, noted for completeness). BUTTERFREE's
own `Cmd_seteffectwithchance` roll is u16 63008 (`63008 % 100 = 8 < 10`) —
the secondary procs.

The kernel produces exactly the correct result: five real `stat-stage-change`
events (ATK/DEF/SPEED/SPATK/SPDEF, each 6→7) each immediately followed by a
`message` event with `messageId: "STRINGID_ATTACKERSSTATROSE"` — precisely
what `reference/pokeemerald/data/battle_scripts_1.s:3452-3483`
(`BattleScript_AllStatsUp`) does per stat. `transition.kind` is
`"decision-required"` — the kernel never throws.

Feeding that real `transition` into `createBattleResolutionPresentation`
throws immediately:

```
Error: battleStringResolver: STRINGID_ATTACKERSSTATROSE references placeholder {B_BUFF1} with no resolver supplied
    at resolveBattleStringLines (src/engine/battleStringResolver.ts:144:15)
    at messageLines (src/engine/battleResolutionPresentation.ts:594:10)
    at projectBattleResolutionCommands (src/engine/battleResolutionPresentation.ts:699:16)
    at createBattleResolutionPresentation (src/engine/battleResolutionPresentation.ts:1027:15)
```

This is the exact "not implemented"-style exception the user hit — a plain
`Error` thrown from a resolver-completeness guard, not a "feature not
implemented" string, but functionally identical from the player's seat (an
uncaught exception mid-battle).

### Alternatives falsified (per the assigned brief's ordered suspects)

- **Label/program-loading barrier** (`resolveRequiredLabelProgramCounter`
  throwing because `BattleScript_AllStatsUp` is missing from the loaded
  program): **false**. `loadBattleScriptProgram()`
  (`src/engine/battleScriptProgram.ts:229-362`) compiles **every** label in
  `battle-script-program.json` into `labelEntries` regardless of opcode
  support — there is no filtering by "executable" status at load time. The
  label resolves to a real `programCounter`; this repro's kernel run reaches
  it and returns past it without incident.
- **Kernel/script-machine can't execute this branch**: **false**. Confirmed
  twice: the pre-existing Tier-1 test
  `tests/battleScriptHitChainOpcode.test.ts` ("All Stats Up" case, ~line
  4645) already runs `BattleScript_EffectAllStatsUpHit` to a correct halt
  (`statStages` → `[7,7,7,7,7]`, seed 61); and this scout's own full-turn
  repro (seed 13, via the real production reducer, not a synthetic harness)
  reaches the identical correct conclusion.
- **Census false positive** (`EFFECT_ALL_STATS_UP_HIT` wrongly marked
  executable): **false**. `MOVE_EFFECT_ALL_STATS_UP` is genuinely dispatched
  to completion by `applySetMoveEffect`
  (`src/engine/battleScriptHitChainOpcode.ts:3138-3146`, calling
  `resolveRequiredLabelProgramCounter(..., "BattleScript_AllStatsUp")`) and is
  listed in `SET_MOVE_EFFECT_SUPPORTED_BYTES`
  (`battleScriptHitChainOpcode.ts:617`) — not a barrier, not a census
  mis-credit. The kernel's "executable" label for this effect is accurate;
  the break is strictly downstream, in presentation.

## 2. Root cause

`reference/pokeemerald/data/battle_scripts_1.s:3452-3483`
(`BattleScript_AllStatsUp`): each of its five stat-raise blocks runs
`statbuffchange MOVE_EFFECT_AFFECTS_USER | STAT_CHANGE_ALLOW_PTR, <next>`
then `printfromtable gStatUpStringIds`. Because `MOVE_EFFECT_AFFECTS_USER` is
set and `target === attacker`, `Cmd_statbuffchange`'s own MULTISTRING_CHOOSER
picks **index 0** of `gStatUpStringIds` = `STRINGID_ATTACKERSSTATROSE`
(`battle_message.c:1006-1015`, ported verbatim as the `gStatUpStringIds`
table in `src/engine/battleScriptHitChainOpcode.ts:412-417`) — **not** index
1 (`STRINGID_DEFENDERSSTATROSE`), which is the only variant every existing
staged/tested move (DOUBLE_TEAM, FEATHER_DANCE, SAND_ATTACK — see
`tests/turn4DoubleTeamPresentationStaging.test.ts`,
`tests/turn6FeatherDancePresentationStaging.test.ts`,
`tests/turn13SandAttackPresentationStaging.test.ts`, all of which explicitly
assert `messageIds).not.toContain("STRINGID_ATTACKERSSTATROSE")`) happens to
hit, because none of those moves' scripts target the attacker itself.

`src/engine/battleResolutionPresentation.ts`'s `messageLines` function — the
**only** message-text resolver on the production presentation path — has a
branch for `STRINGID_DEFENDERSSTATROSE`/`STRINGID_DEFENDERSSTATFELL`
(lines 479-504, supplying `B_DEF_NAME_WITH_PREFIX`/`B_BUFF1`/`B_BUFF2`
resolvers) and **no branch at all** for
`STRINGID_ATTACKERSSTATROSE`/`STRINGID_ATTACKERSSTATFELL` (confirmed by
grepping the whole file — zero matches). When one of those messageIds
reaches `resolveBattleStringLines`
(`src/engine/battleStringResolver.ts:129`), its template
(`{B_ATK_NAME_WITH_PREFIX}'s {B_BUFF1}\n{B_BUFF2}`,
`src/data/gen/battle-message-templates.json` id 213) hits an unresolved
placeholder and the resolver's own completeness guard throws
("don't guess" — `battleStringResolver.ts:125-127`'s own doc comment).

This gap was already flagged, unverified, inside
`tests/battleScriptStatbuffchangeOpcode.test.ts:184-187`'s own comment: it
notes that Swords Dance's kernel fixture "happens to pick"
`STRINGID_ATTACKERSSTATROSE` (index 0) — but that test only asserts
`.rulesContext`, never `.events`, let alone runs the event through
presentation. Nobody had driven that messageId through
`battleResolutionPresentation.ts` until this scout.

## 3. Classification: (a) production-consumption gap

One-line evidence: the kernel (opcode handlers, hit-chain,
`printfromtable`) executes `BattleScript_AllStatsUp`/
`BattleScript_EffectAllStatsUpHit` to a fully correct conclusion (proven
twice — the pre-existing Tier-1 test at seed 61, and this scout's own
full-turn repro at seed 13, both through real production code); the
exception is thrown three call-frames downstream, inside
`battleResolutionPresentation.ts`'s message-text resolver, which never
learned the ATTACKER-targeted variant of the stat-change banner.

- **Not (b) kernel branch gap**: the kernel branch runs to completion, no
  throw/barrier inside the machine itself.
- **Not (c) census false positive**: `MOVE_EFFECT_ALL_STATS_UP` is correctly
  registered and dispatches for real; the census's "executable" label for
  `EFFECT_ALL_STATS_UP_HIT` is accurate for the kernel — the census doesn't
  cover the presentation layer, which is where this actually breaks.

**Scope beyond Silver Wind**: this gap is generic to any move whose script
sets `MOVE_EFFECT_AFFECTS_USER` with the mover as its own stat-change target
(Swords Dance, Growth, Minimize, Superpower/Overheat's own self-drop halves,
Ancient Power's secondary, etc.) — Silver Wind's 10% secondary chance is
simply why the user's crash felt like bad luck rather than a guaranteed
break on every use of an affected move.

## 4. Oracle ground truth pin

`mechanicLab` `overrides.parties` scenario (profile `battle-scene-off`),
reusing the same base Factory matchup as `docs/hit-chain-ground-truth.md`
(`trainerId` 110, `challengeNum` 2, `battleNum` 2, `playerSetIds`
`[274,354,338]`, `opponentSetIds` `[349,339,327]`) — those base IDs only
seed the legal-Factory scaffold; `overrides.parties` replaces both actives
below entirely:

```json
{
  "schemaVersion": 1,
  "mode": "mechanicLab",
  "profile": "battle-scene-off",
  "level": 50,
  "challengeNum": 2,
  "battleNum": 2,
  "trainerId": 110,
  "playerSetIds": [274, 354, 338],
  "opponentSetIds": [349, 339, 327],
  "seed": 8,
  "overrides": {
    "parties": {
      "player": [
        {
          "species": 12,
          "level": 50,
          "nature": 24,
          "ivs": { "hp": 31, "attack": 31, "defense": 31, "speed": 31, "spAttack": 31, "spDefense": 31 },
          "evs": { "hp": 84, "attack": 0, "defense": 0, "speed": 0, "spAttack": 172, "spDefense": 0 },
          "moves": [318, 60, 92, 18],
          "ppUps": [0, 0, 0, 0],
          "item": 132,
          "abilitySlot": 0,
          "friendship": 70,
          "gender": "male",
          "shiny": false
        },
        { "species": 1, "level": 50, "nature": 0,
          "ivs": { "hp": 31, "attack": 31, "defense": 31, "speed": 31, "spAttack": 31, "spDefense": 31 },
          "evs": { "hp": 0, "attack": 0, "defense": 0, "speed": 0, "spAttack": 0, "spDefense": 0 },
          "moves": [33, 33, 33, 33], "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0,
          "friendship": 70, "gender": "male", "shiny": false },
        { "species": 4, "level": 50, "nature": 0,
          "ivs": { "hp": 31, "attack": 31, "defense": 31, "speed": 31, "spAttack": 31, "spDefense": 31 },
          "evs": { "hp": 0, "attack": 0, "defense": 0, "speed": 0, "spAttack": 0, "spDefense": 0 },
          "moves": [33, 33, 33, 33], "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0,
          "friendship": 70, "gender": "male", "shiny": false }
      ],
      "opponent": [
        { "species": 19, "level": 50, "nature": 0,
          "ivs": { "hp": 31, "attack": 31, "defense": 31, "speed": 0, "spAttack": 0, "spDefense": 31 },
          "evs": { "hp": 0, "attack": 0, "defense": 0, "speed": 0, "spAttack": 0, "spDefense": 0 },
          "moves": [33, 33, 33, 33], "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0,
          "friendship": 70, "gender": "female", "shiny": false },
        { "species": 129, "level": 50, "nature": 0,
          "ivs": { "hp": 31, "attack": 31, "defense": 31, "speed": 31, "spAttack": 31, "spDefense": 31 },
          "evs": { "hp": 0, "attack": 0, "defense": 0, "speed": 0, "spAttack": 0, "spDefense": 0 },
          "moves": [33, 33, 33, 33], "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0,
          "friendship": 70, "gender": "female", "shiny": false },
        { "species": 187, "level": 50, "nature": 0,
          "ivs": { "hp": 31, "attack": 31, "defense": 31, "speed": 31, "spAttack": 31, "spDefense": 31 },
          "evs": { "hp": 0, "attack": 0, "defense": 0, "speed": 0, "spAttack": 0, "spDefense": 0 },
          "moves": [33, 33, 33, 33], "ppUps": [0, 0, 0, 0], "item": 0, "abilitySlot": 0,
          "friendship": 70, "gender": "female", "shiny": false }
      ]
    }
  },
  "trace": {
    "segments": [
      { "frames": 2, "buttons": ["A"] },
      { "frames": 30, "buttons": [] },
      { "frames": 2, "buttons": ["A"] },
      { "frames": 800, "buttons": [] }
    ],
    "captureFrames": [0, 80, 160, 240, 320, 420, 540, 650, 734, 834]
  }
}
```

Player slot 0 is the real `FRONTIER_MON_BUTTERFREE` Factory set — index 153
in `src/data/gen/battle-frontier-mons.json`: species BUTTERFREE, moves
`[SILVER_WIND(318), PSYBEAM(60), TOXIC(92), WHIRLWIND(18)]`, item
`BATTLE_FRONTIER_ITEM_PECHA_BERRY` (132), nature `QUIRKY` (24), EV spread 17
(SP_ATTACK+HP, approximated here as 172/84 since the Factory's own EV-spread
table wasn't decoded this session — flag for the fix step if exact bytes
matter). Opponent's all-four-slots-identical-move convention (per
`tools/battle-lab/README.md`) constrains the Factory AI to one legal choice
(TACKLE) without injecting a decision.

`overrides.parties` **is live** on the running `battle-scene-off` oracle
(confirmed by running this scenario successfully) — supersedes
`docs/hit-chain-ground-truth.md`'s note that it was rejected as of
2026-07-24; the oracle has evidently been restarted since.

### RNG evidence / proc boundary (RAM-pinned via the manifest's semantic captures, seed 8)

| frame | rngValue | opponent hp | player statStages (ATK,DEF,SPD,SPA,SPD) |
| ---: | ---: | ---: | --- |
| 0 | 4156937941 | 105 | [6,6,6,6,6] |
| 240 | 3664104713 | 60 (Silver Wind hits for 45) | [6,6,6,6,6] |
| 320 | 3664104713 | 60 | [7,6,6,6,6] (ATK banner) |
| 420 | 3664104713 | 60 | [7,7,6,6,6] (DEF banner) |
| 540 | 3664104713 | 60 | [7,7,7,6,6] (SPEED banner) |
| 650 | 3664104713 | 60 | [7,7,7,7,6] (SPATK banner) |
| 734 | 3664104713 | 60 | [7,7,7,7,7] (SPDEF banner, final) |
| 834 | 476236786 | 60 | [7,7,7,7,7] |

`rngValue` stays pinned at 3664104713 from frame 240 through 734 — the
five-banner unfurl (`printfromtable`+`waitmessage B_WAIT_TIME_LONG` per stat)
consumes **zero** further RNG once `Cmd_seteffectwithchance`'s own single
chance roll has fired, exactly matching source (only that one roll gates the
whole five-stat write).

**Non-proc control**: seeds 1–7 (identical scenario, only `seed` varies) all
end at player `statStages` `[6,6,6,6,6]` — no proc, 7/7 consistent with the
~90% no-proc rate at `secondaryEffectChance` 10.

### App-side (engine) RNG draw-count cross-check

Independent of the oracle's ROM-level seed above, the engine's own
`BattleScriptRngState` seed numbering (§1's repro, `rngSeed: 13`) matches
`docs/hit-chain-ground-truth.md`'s documented 8-roll/4-per-attacker turn
shape exactly (`Random()` = `1103515245 * v + 24691 mod 2^32`, u16 = upper 16
bits of the new value):

| # | attacker | roll | u16 | %100 |
| - | - | - | -: | -: |
| 1 | trainer | accuracy | 22290 | 90 (hit) |
| 2 | trainer | crit | 52160 | 60 (crit fired this turn — a roll is always consumed regardless of outcome, matching the ground-truth doc) |
| 3 | trainer | damage-variance | 55507 | 7 |
| 4 | trainer | seteffectwithchance | 18437 | 37 (TACKLE's own 0% secondary — irrelevant) |
| 5 | player | accuracy | 34162 | 62 (hit; Silver Wind is 100 accuracy so always hits regardless of roll) |
| 6 | player | crit | 42237 | 37 |
| 7 | player | damage-variance | 37242 | 42 |
| 8 | player | seteffectwithchance | 63008 | **8 < 10 → PROCS** |

Exactly 8 `Random()` calls for the whole turn, matching the ground-truth
doc's documented shape for a plain two-attacker hit-chain turn.

## 5. Fix outline (for the later main-lane step)

1. In `src/engine/battleResolutionPresentation.ts`'s `messageLines`, add a
   branch for `STRINGID_ATTACKERSSTATROSE`/`STRINGID_ATTACKERSSTATFELL`
   mirroring the existing `STRINGID_DEFENDERSSTATROSE`/`FELL` branch
   (lines 479-504), resolving `B_ATK_NAME_WITH_PREFIX` (not
   `B_DEF_NAME_WITH_PREFIX`) from `lastStatChange.battler`, with the same
   `B_BUFF1`/`B_BUFF2` (stat name / rose-fell-sharply-harshly) logic.
2. **Acceptance (app-level)**: replay this scout's own full-turn repro
   (BUTTERFREE/SILVER_WIND, engine `rngSeed` 13) through
   `createBattleResolutionPresentation` and assert it no longer throws;
   assert the projected commands carry five text banners, in order, for ATK,
   DEF, SPEED, SPATK, SPDEF (each "…'s {stat} rose!"), matching the 6→7 stage
   deltas already proven in this scout.
3. **Acceptance (oracle)**: replay the pinned `mechanicLab` scenario above
   (seed 8) via `npm run compare` once the fix lands; the app's projected
   presentation commands should match the real ROM's five-banner cadence
   (bursts at frames 320/420/540/650/734, ~100-120 frames apart — the
   `printfromtable`+`waitmessage B_WAIT_TIME_LONG` pacing) and the final
   RAM-pinned `statStages` `[6,7,7,7,7,7,6,6]`.
4. **Same-root-cause sweep** (not blocking, but same fix should cover it):
   every other `MOVE_EFFECT_AFFECTS_USER` stat-changing move (Swords Dance,
   Growth, Minimize, Superpower/Overheat's own self-drop, Ancient Power's
   secondary) hits the identical missing branch — this scout only proves
   Silver Wind's instance, but the gap itself is move-agnostic, so one fix
   should close all of them; a follow-up Tier-1 test per move is cheap
   insurance once the branch exists.
