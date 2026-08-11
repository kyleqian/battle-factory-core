# `Cmd_attackcanceler`: Lightning Rod and Protect/Detect audit

Status: source and Battle Scene OFF evidence only. This does not register
opcode 0 or change the machine, controller, rules, round, presentation, or
animation layers.

## Exact source order and ownership

After Magic Coat and the ordered Snatch scan, `Cmd_attackcanceler` checks the
target's per-battler `gSpecialStatuses[].lightningRodRedirected` first, then
the defender's per-battler `gProtectStructs[].protected` (`reference/
pokeemerald/src/battle_script_commands.c:984-1004`). Both are downstream of
the earlier no-PP, obedience, Magic Coat, and Snatch work.

| branch | predicate | direct writes and handoff | RNG in this branch |
| --- | --- | --- | --- |
| Lightning Rod | `gSpecialStatuses[gBattlerTarget].lightningRodRedirected` | clears that target bit; sets global `gLastUsedAbility = ABILITY_LIGHTNING_ROD`; pushes the current attackcanceler PC; jumps to `BattleScript_TookAttack`; records `ABILITY_LIGHTNING_ROD` for the target in `BATTLE_HISTORY->abilities[target]`. | 0 |
| Protect / Detect | `gProtectStructs[target].protected`, current move has `FLAG_PROTECT_AFFECTED`, current move is not non-Ghost Curse, and either is not a two-turn move or attacker has `STATUS2_MULTIPLETURNS` | `CancelMultiTurnMoves(attacker)`; ORs `MOVE_RESULT_MISSED`; clears `gLastLandedMoves[target]` and `gLastHitByType[target]`; writes `B_MSG_PROTECTED` to `gBattleCommunication[MISS_TYPE]`; advances the current script PC one byte. | 0 |
| fallthrough | otherwise | advances the current script PC one byte. | 0 |

`DEFENDER_IS_PROTECTED` is exactly the target `protected` bit plus
`FLAG_PROTECT_AFFECTED` (`battle_script_commands.c:57`). Protect and Detect
both have `EFFECT_PROTECT`; their setup command sets only the acting
battler's `ProtectStruct.protected` and increments its `DisableStruct`
`protectUses` when its `Random()` comparison succeeds (`battle_script_commands.c:6503-6535`). Thus setup consumes one RNG call even for the guaranteed first
use; the later attack-canceler interception does not. It does not emit a
controller command itself. The subsequent scripts/controller lifecycle remain
separate work.

The Curse exception is source literal: a non-Ghost user's Curse bypasses this
early protection branch, whereas Ghost Curse does not. `IsTwoTurnsMove`
recognizes Skull Bash, Razor Wind, Sky Attack, Solar Beam, semi-invulnerable
moves, and Bide (`battle_script_commands.c:8196-8206`); the protection branch
only cancels an in-progress one. `CancelMultiTurnMoves` clears MULTIPLETURNS,
LOCK_CONFUSE, UPROAR, BIDE, SEMI_INVULNERABLE, Rollout, and Fury Cutter state
(`battle_util.c:877-886`). Keep that multi-turn state transformation delegated
to its existing bounded helper rather than folding it into a new intercept
seam.

`BattleScript_TookAttack` prints the action/took-attack message, sets only
`HITMARKER_ATTACKSTRING_PRINTED`, and returns (`data/battle_scripts_1.s:
4058-4064`). The pushed cursor resumes the same attack-canceler command.
`RecordAbilityBattle` is an AI-history write only (`battle_ai_script_commands.c:
643-646`), not a controller emission. Target selection’s doubles redirect
also records once before setting the bit, so a real redirect reaches the
canceler with an existing record and then records the same target/ability
again; this audit deliberately keeps ability-history recording distinct from
controller behavior.

## Why Lightning Rod cannot reach this branch in Factory singles

The target-selection code only sets `lightningRodRedirected` inside an explicit
`gBattleTypeFlags & BATTLE_TYPE_DOUBLE` branch (`battle_util.c:151-219`). It
requires an Electric move, a non-Lightning-Rod selected target, and another
opposing Lightning-Rod battler earlier in turn order; that battler becomes
target and receives the bit. The random-target fallback is separately inside
the doubles paths. Level-50 Factory is singles, so it has two battlers and
never enters either redirect path. No direct SpecialStatus injection or
fabricated doubles scenario is used here.

The generated Level-50 corpus nevertheless has **15 / 850** sets from the
six Lightning-Rod-capable species (Electrike, Cubone, Rhyhorn, Marowak,
Manectric, Rhydon): ids **64, 104, 133, 387, 393, 403, 470, 489, 499, 579,
585, 595, 675, 681, 691**. Factory builds party Pokémon with a nature-matched
random personality and preserves the resulting `abilityNum` into rentals and
opponents (`battle_factory.c:395-398, 435-464, 476-503`; `pokemon.c:
2562-2579`), so those sets can carry their species' Lightning Rod ability.
This establishes ability reachability, but source proves redirection itself is
doubles-only.

## Level-50 corpus coverage

- Protect: **40 / 850** set entries; Detect: **5 / 850** (45 distinct
  Protect-like users).
- Curse: **18 / 850** entries.
- Moves carrying `FLAG_PROTECT_AFFECTED`: **843 / 850** set entries.
- `IsTwoTurnsMove` union: **61 / 850** entries: Bide 1, Bounce 3, Dig 26,
  Dive 7, Fly 6, Razor Wind 2, Sky Attack 1, Solar Beam 16, Skull Bash 0.
  Dig/Dive overlap in one entry, producing the union of 61.

These counts are derived and pinned by
`tests/attackCancelerLightningRodProtectAudit.test.ts`; they are not guesses
from scenario overrides.

## OFF legal witness and control

`tools/battle-lab/mechanic-protect-intercept-off.json` and its control use the
same legal Level-50 Factory parties. BattleLab changes only active legal
loadouts: player Protect (or Splash control), opponent Aerial Ace, no ability
override, then ordinary `A` input. `tools/probe/audit-protect-off.py` reads
RAM after construction only and must be run through `tools/run-mgba-probe.py`
with the mGBA venv.

Fresh OFF result (684 frames): in the intercept, Protect PP is 10→9 at tick
62, the player protected bit arms at **63**, opponent Aerial Ace becomes the
current move at **195**, and `MOVE_RESULT_MISSED` appears at **197**. Its PP
is decremented at 225 but player HP stays **153**; the target's landed-move
and hit-type fields are zero at the interception. In the no-Protect control,
the identical Aerial Ace spends PP at 69, hits at **177** for **153→123** HP,
and records landed move 332 / type 2 at 187. This demonstrates the local
intercept and its control, not pixels or an implementation shortcut.

## Smallest next seam

If assigned, add one post-Snatch pure **early-target-intercept** join with
explicit target SpecialStatus/ProtectStruct ownership, a script-PC stack
receipt, hit/result/history/communication writes, and zero added RNG. Split
the reachable singles Protect/Detect result from the source-required but
singles-unreachable Lightning Rod resume. Leave (1) doubled target selection
and the two ability-history records, (2) `BattleScript_TookAttack`/
controller messaging, and (3) `CancelMultiTurnMoves` behind their established
helpers or later controller/mechanics work. Do not merge it into PP admission
or implement opcode 0 in this seam.
