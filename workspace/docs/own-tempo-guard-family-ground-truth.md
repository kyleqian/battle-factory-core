# Pre-emptive Own Tempo confusion-guard family — source ground truth (Rank 5)

Prep-lane evidence contract for `docs/gate6-family-worklist.md` Rank 5 (the
five moves whose *own* entry scripts embed a `jumpifability BS_TARGET,
ABILITY_OWN_TEMPO, ...` guard directly, before any generic
`AbilityBattleEffects`/`Cmd_moveend` involvement: `MOVE_CONFUSE_RAY`,
`MOVE_SWEET_KISS`, `MOVE_SWAGGER`, `MOVE_FLATTER`, `MOVE_TEETER_DANCE`). Best
staged alongside Rank 2 per the worklist's own dependency note
(`docs/gate6-family-worklist.md:274-276`), since both exercise the Own
Tempo/immunity-family ability set. This is the prep half of a prep→consume
pair; it does not touch the worklist, the coverage manifest, or
`level50-move-parameterization.json`.

## 0. `jumpifability BS_TARGET` mechanics (shared by all five guards)

`Cmd_jumpifability` (`battle_script_commands.c:3105-3156`); the `BS_TARGET`
operand resolves through the final `else` branch (`:3141-3155`):

```c
battler = GetBattlerForBattleScript(gBattlescriptCurrInstr[1]);
if (gBattleMons[battler].ability == ability)
{
    gLastUsedAbility = ability;
    gBattlescriptCurrInstr = jumpPtr;
    RecordAbilityBattle(battler, gLastUsedAbility);
    gBattleScripting.battlerWithAbility = battler;
}
else
{
    gBattlescriptCurrInstr += 7;
}
```

On a match: sets `gLastUsedAbility` (message-formatting global — but see the
important caveat below), jumps to the guard's fail-script, and calls
`RecordAbilityBattle(battler, ability)` (`battle_ai_script_commands.c:643-646`,
`BATTLE_HISTORY->abilities[battler] = abilityId`) — this is **AI-decision
bookkeeping only**, not a `gBattleMons[].ability` write and not visible in the
public battle-lab manifest; it never mutates any battler's actual ability.
`gBattleScripting.battlerWithAbility` feeds the `{B_DEF_ABILITY}` text-buffer
substitution used by the fail message (§1).

**Caveat, confirmed live by this step's own receipt (see §4's note)**:
`AbilityBattleEffects` — a *different*, much more frequently called function —
unconditionally overwrites `gLastUsedAbility = gBattleMons[battler].ability`
at the top of *every* call (`battle_util.c:2471-2473`), including the routine
`ABILITYEFFECT_ON_SWITCHIN`/`ABILITYEFFECT_ENDTURN` bookkeeping every battler
receives every turn regardless of which move was used. `Cmd_jumpifability`
itself is a distinct, simpler command that does not call
`AbilityBattleEffects` at all, but because both write the same global, any
observation of `gLastUsedAbility` after a full turn has elapsed is
contaminated by these unrelated per-battler hooks and cannot be attributed
to the `jumpifability` guard specifically without also isolating the exact
frame the guard itself fires on. `docs/ability-manipulation-family-ground-truth.md`
§4 documents the same contamination for `Cmd_trycopyability`'s adjacent case.

## 1. The fail scripts: two labels, two behaviors

`STRINGID_PKMNPREVENTSCONFUSIONWITH` (`battle_string_ids.h:202`) →
`sText_PkmnPreventsConfusionWith` (`battle_message.c:273`): `"{B_DEF_NAME_WITH_PREFIX}'s
{B_DEF_ABILITY}\nprevents confusion!"` — both fail scripts print this exact
string; they differ only in what happens *after* the message, matching the
brief's ask for the "redirect target" distinction:

- **`BattleScript_OwnTempoPrevents`** (`battle_scripts_1.s:4152-4156`): `pause
  → printstring STRINGID_PKMNPREVENTSCONFUSIONWITH → waitmessage → goto
  BattleScript_MoveEnd`. Used by Confuse Ray/Sweet Kiss, Swagger, and
  Flatter — all single-target moves, so blocking ends the whole move.
- **`BattleScript_TeeterDanceOwnTempoPrevents`** (`:2598-2602`): identical
  message sequence, but `goto BattleScript_TeeterDanceDoMoveEndIncrement`
  instead — which does **not** end the move. It re-enters Teeter Dance's own
  per-target loop (`moveendto MOVEEND_NEXT_TARGET` then
  `addbyte gBattlerTarget, 1` / loop-continue, `:2591-2595`), because Teeter
  Dance is `MOVE_TARGET_FOES_AND_ALLY` and iterates every other battler in
  one move use — an Own Tempo block on one target must not skip the rest.
  This is the structural reason Teeter Dance needs its *own* fail-script
  label distinct from the shared `BattleScript_OwnTempoPrevents`, confirming
  the worklist's citation of both labels as genuinely distinct redirect
  targets (`docs/gate6-family-worklist.md:247-249`), not a naming
  variant of the same behavior.

Both `AlreadyConfused`, and both Own-Tempo-prevents variants, are distinct
from `docs/skill-swap-off-evidence.md`/`docs/immunity-abilities-ground-truth.md`'s
Rank-2 `BattleScript_AbilityCuredStatus` — that script fires from the
generic end-of-turn/`MOVEEND_STATUS_CURE` machinery for an ability that
*retroactively cures* an already-applied status; `BattleScript_OwnTempoPrevents`
fires from an entry-script `jumpifability` *before* the status is ever
applied at all, and never runs `AbilityBattleEffects`'s cure path. The two
message shapes also differ: the cure line names the mon and reads "cured
its ??? problem" (past tense, after-the-fact), while this family's line
reads "prevents confusion!" (pre-emptive block, present tense) — confirmed
by inspecting both string tables side by side.

## 2. Per-move entry-script citations, re-verified exact

| Move | Script | Guard line | Notes |
| --- | --- | --- | --- |
| `MOVE_CONFUSE_RAY` (`.effect = EFFECT_CONFUSE`, `.accuracy = 100`, `battle_moves.h:1420-1431`) / `MOVE_SWEET_KISS` (`.effect = EFFECT_CONFUSE`, `.accuracy = 75`, `battle_moves.h:2421-2432`) | `BattleScript_EffectConfuse` (`battle_scripts_1.s:903-919`) | `:907`, first guard in the script — before the Substitute check (`:908`), the already-confused check (`:909`), and `accuracycheck` (`:910`) | The **only** move pair in this family where the ability check is unconditionally the very first thing the script does after `ppreduce`. Both moves share the identical script and guard; only their own `.accuracy` field differs (100 vs. 75), irrelevant to the Own Tempo guard itself since it precedes the accuracy roll either way. |
| `MOVE_SWAGGER` (`.effect = EFFECT_SWAGGER`, `.accuracy = 90`, `battle_moves.h:2694-2705`) | `BattleScript_EffectSwagger` (`:1608-1629`) | `:1625`, at label `BattleScript_SwaggerTryConfuse` | Reached only *after* the Atk+2 stat change (`:1617-1623`) already executed — §3 below. |
| `MOVE_FLATTER` (`.effect = EFFECT_FLATTER`, `.accuracy = 100`, `battle_moves.h:3383-3394`) | `BattleScript_EffectFlatter` (`:2151-2172`) | `:2168`, at label `BattleScript_FlatterTryConfuse` | Identical shape to Swagger, SpAtk+1 instead of Atk+2 (`:2160`). |
| `MOVE_TEETER_DANCE` (`.effect = EFFECT_TEETER_DANCE`, `.target = MOVE_TARGET_FOES_AND_ALLY`, `battle_moves.h:3877-3888`) | `BattleScript_EffectTeeterDance` (`:2571-2609`) | `:2580`, inside `BattleScript_TeeterDanceLoop`, **after** the self-exclusion jump (`:2579`, see §4) | Per-target, re-entered once per battler in the loop. |

All four `.4byte BattleScript_Effect*` effect-table entries and all five
guard line numbers were re-read directly from the pinned source above; the
worklist's citations (`docs/gate6-family-worklist.md:240-248`) are confirmed
exact.

## 3. Swagger's split: stat-raise vs. confuse-attempt (the brief's requested derivation)

`BattleScript_EffectSwagger` (`battle_scripts_1.s:1608-1629`), in execution
order:

```
attackcanceler
jumpifstatus2 BS_TARGET, STATUS2_SUBSTITUTE, BattleScript_MakeMoveMissed
accuracycheck BattleScript_PrintMoveMissed, ACC_CURR_MOVE
attackstring
ppreduce
jumpifconfusedandstatmaxed STAT_ATK, BattleScript_ButItFailed
attackanimation
waitanimation
setstatchanger STAT_ATK, 2, FALSE
statbuffchange STAT_CHANGE_ALLOW_PTR, BattleScript_SwaggerTryConfuse
jumpifbyte CMP_EQUAL, cMULTISTRING_CHOOSER, B_MSG_STAT_WONT_INCREASE, BattleScript_SwaggerTryConfuse
setgraphicalstatchangevalues
playanimation BS_TARGET, B_ANIM_STATS_CHANGE, sB_ANIM_ARG1
printfromtable gStatUpStringIds
waitmessage B_WAIT_TIME_LONG
BattleScript_SwaggerTryConfuse::
    jumpifability BS_TARGET, ABILITY_OWN_TEMPO, BattleScript_OwnTempoPrevents
    jumpifsideaffecting BS_TARGET, SIDE_STATUS_SAFEGUARD, BattleScript_SafeguardProtected
    setmoveeffect MOVE_EFFECT_CONFUSION
    seteffectprimary
    goto BattleScript_MoveEnd
```

**The split, exactly**: the Atk+2 stat change (`setstatchanger` /
`statbuffchange`, unconditional once accuracy/Substitute/stat-maxed pass) is
applied **before** `BattleScript_SwaggerTryConfuse`'s `jumpifability` guard
even runs. The Own Tempo check gates **only** the confusion half
(`setmoveeffect MOVE_EFFECT_CONFUSION` / `seteffectprimary`), which comes
after. **Consequence**: Swagger against an Own Tempo holder still raises the
target's Attack by two stages — the stat message and animation play in
full — and *only then* prints "prevents confusion!" instead of applying
confusion. This is a real behavioral split a batch-test author must encode
as two independent assertions (stat delta always applies; confusion applies
iff no Own Tempo), not a single pass/fail outcome. `BattleScript_EffectFlatter`
is the same shape one stat lower (SpAtk+1, `:2160`), confirmed by the same
label pattern (`BattleScript_FlatterTryConfuse`). No receipt is staged for
Swagger/Flatter this step per the brief's scope — this derivation is the
batch-test author's input.

## 4. Teeter Dance: the worklist's self-hit claim is wrong — corrected

`docs/gate6-family-worklist.md:245-246` states "Teeter Dance also hits the
user, whose own Own Tempo would separately no-op the self-hit." **This is
incorrect for this pinned source.** `BattleScript_EffectTeeterDance`
(`battle_scripts_1.s:2571-2596`):

```
BattleScript_EffectTeeterDance::
    attackcanceler
    attackstring
    ppreduce
    setbyte gBattlerTarget, 0
BattleScript_TeeterDanceLoop::
    movevaluescleanup
    setmoveeffect MOVE_EFFECT_CONFUSION
    jumpifbyteequal gBattlerAttacker, gBattlerTarget, BattleScript_TeeterDanceLoopIncrement
    jumpifability BS_TARGET, ABILITY_OWN_TEMPO, BattleScript_TeeterDanceOwnTempoPrevents
    ...
BattleScript_TeeterDanceLoopIncrement::
    addbyte gBattlerTarget, 1
    jumpifbytenotequal gBattlerTarget, gBattlersCount, BattleScript_TeeterDanceLoop
    end
```

The loop iterates `gBattlerTarget` from `0` to `gBattlersCount - 1`. The very
first check inside each iteration, **before** the Own Tempo `jumpifability`,
is `jumpifbyteequal gBattlerAttacker, gBattlerTarget,
BattleScript_TeeterDanceLoopIncrement` — when the loop's current target *is*
the attacker itself, it unconditionally skips straight to the increment,
never reaching the Own Tempo check (or the confusion-application code) for
that iteration at all. **The user is unconditionally excluded from Teeter
Dance's own target loop; there is no self-hit code path for the user's own
Own Tempo to "separately no-op."** This matches the real game's documented
behavior (Teeter Dance confuses all *other* battlers, not the user) and is a
correction this doc's audit surfaces, not a restatement of the worklist. In
a singles battle (`gBattlersCount == 2`), the practical effect is simply
that Teeter Dance behaves like a single-target confuse move aimed at the
one opponent battler — relevant context for why this family's Rank-5
representative receipt (§5) does not need doubles staging to exercise any
of these five moves' guards.

## 5. Representative receipt — `MOVE_CONFUSE_RAY` blocked by Own Tempo vs. confusion-applies control

**Carrier verification** (re-checked directly against
`docs/gate6-coverage-manifest.json#sections.corpus.level50Sets` and
`src/data/gen/species-stats.json`):

- Set 25 = `FRONTIER_MON_ZUBAT`, species `SPECIES_ZUBAT`, moves
  `['MOVE_POISON_FANG', 'MOVE_WHIRLWIND', 'MOVE_CONFUSE_RAY', 'MOVE_AERIAL_ACE']`
  — confirmed, `MOVE_CONFUSE_RAY` present. Single-ability
  (`["ABILITY_INNER_FOCUS", "ABILITY_NONE"]`). Base speed 55.
- Set 32 = `FRONTIER_MON_SMEARGLE`, species `SPECIES_SMEARGLE` — confirmed.
  **Single-ability** (`["ABILITY_OWN_TEMPO", "ABILITY_NONE"]`) — confirmed,
  matches the worklist's claim exactly. Base speed 75 (faster than Zubat by
  base stat — the fixture compensates with speed EVs, see below, rather than
  contradicting the worklist).
- Control defender: `SPECIES_DITTO` (set 54's species, already verified in
  `docs/ability-manipulation-family-ground-truth.md` §4) — **single-ability**
  Limber, which blocks paralysis only, not confusion, so Confuse Ray applies
  normally against it. Chosen over an arbitrary species specifically because
  it is already a verified-single-ability Level-50 carrier in this run's own
  corpus, keeping the control arm inside the same carrier pool.

**Selected pair:** attacker `SPECIES_ZUBAT` (id 41), `MOVE_CONFUSE_RAY` (id
109) in all four slots, **max speed EVs** — Zubat's base 55 is lower than
Smeargle's base 75, so without EV compensation the defender would move
first; at level 50 with 252 EV/31 IV/neutral nature Zubat reaches 107 speed
against 0-EV Smeargle's 95 and 0-EV Ditto's 68, strictly ordering Zubat
first in both fixtures (worked from the standard `floor(floor((2*base + iv +
floor(ev/4)) * level / 100) + 5)` formula). Defender `MOVE_SPLASH` (id 150,
zero-effect/zero-RNG filler) in all four slots, zero speed EVs, so the
opponent's forced move never complicates the read regardless of who
would've moved first.

**Two fixtures, identical except the opponent lead's species**:

- `tools/battle-lab/mechanic-own-tempo-guard-confuseray-block-off.json` —
  opponent lead `SPECIES_SMEARGLE` (id 235), `abilitySlot: 0` (Own Tempo, id
  20) — `jumpifability` redirects to `BattleScript_OwnTempoPrevents`, no
  confusion applied.
- `tools/battle-lab/mechanic-own-tempo-guard-confuseray-control-off.json` —
  opponent lead `SPECIES_DITTO` (id 132), `abilitySlot: 0` (Limber, id 7) —
  the ability check fails to match, script falls through to the normal
  accuracy roll and `seteffectprimary`, confusion applies.

**Verified via**
`tools/probe/verify-own-tempo-guard-confuseray-off.py` (source/fixture static
check plus a live Battle Scene OFF check, one `EmeraldOracle` core per
subprocess per fixture, mirroring
`verify-item-manipulation-covet-off.py`/`verify-ability-manipulation-roleplay-off.py`'s
convention). Run twice independently; both receipts reproduced
**byte-identically** — see the run's final report for the exact command
transcript and frame numbers.

**Asserted shape:**

- Block arm: defender's `status2 & STATUS2_CONFUSION` (mask `0x7`,
  `battle.h:129`) stays `0` for the entire trace — confusion is never
  applied, not merely cured. The displayed text at the block frame contains
  "prevents confusion!" (`STRINGID_PKMNPREVENTSCONFUSIONWITH`, §1) rather
  than any hit/miss message. Because `jumpifability` (`:907`) precedes
  `accuracycheck` (`:910`) in `BattleScript_EffectConfuse`, the block arm
  **never rolls the accuracy `Random()` call at all** — it short-circuits
  before reaching it.
- Control arm: defender's `status2 & STATUS2_CONFUSION` becomes nonzero
  (turn-counter bits set) at the frame Confuse Ray resolves; the displayed
  text shows the normal "became confused!" hit message, and the accuracy
  `Random()` roll **does** execute (100%-accuracy convention, per
  `docs/item-move-end-family-ground-truth.md` §5).
- **RNG delta between arms, this receipt's fixed seed: 4 calls (block=6,
  control=10), fully attributed by the frame each call fires on** (mirroring
  `probe-immunity-limber-off.py`'s per-call attribution convention). The
  *within-turn* delta breaks down as:
  1. The accuracy roll (`Cmd_accuracycheck`, `:910`) the block arm skips
     entirely by short-circuiting at `jumpifability` (`:907`) before
     `accuracycheck` is ever reached — this is the guard's own, unconditional
     one-call signature.
  2. The confusion-duration roll (`Random() % 4 + 2`,
     `battle_script_commands.c:2541`, inside `Cmd_seteffectprimary`'s
     `MOVE_EFFECT_CONFUSION` case), paid once when confusion is actually
     applied.
  3. **and 4.** — *stochastic, not guaranteed*: once the defender is
     confused, its own subsequent action **that same turn** first runs the
     `CANCELER_CONFUSED` check (`battle_util.c:2156-2187`) — a genuine
     `Random() & 1` self-hit-chance roll (`:2162`) that decrements the
     confusion counter and either lets the chosen move (`MOVE_SPLASH` here)
     proceed normally, or replaces it with a typeless, Pound-shaped
     (power-40) self-hit whose damage is computed via
     `CalculateBaseDamage(...)` (`:2173`) and then adjusted through
     `BattleScript_MoveUsedIsConfused`'s `adjustnormaldamage2` step
     (`battle_scripts_1.s:3803`), which itself rolls a damage-variance
     `Random()` call via `ApplyRandomDmgMultiplier()`
     (`battle_script_commands.c:1705`). **This receipt's fixed seed happens
     to self-hit**, so both of these fire (contributing calls 3 and 4); a
     different seed where the defender doesn't self-hit that turn would show
     a control/block delta of 2, not 4, and a seed where the confusion wears
     off before the defender's own turn changes the picture further. A
     batch-test author must not hard-code "confusion delta = N" as a general
     law — only the two-call minimum (accuracy roll + duration roll) is
     unconditional; the self-hit pair is real but seed-dependent.
  Both receipts also show an **identical**, `currentMove == 0`, 6-call burst
  (`1` then `5`) a handful of frames after each arm's turn-ending message
  settles — confirmed byte-for-byte equal between the two arms by this
  step's own verify script, so it cancels out of the block/control
  comparison and is not attributed to Confuse Ray or Own Tempo at all; it is
  most plausibly the Factory AI's speculative evaluation for the
  (never-taken) following turn, since both fixtures force the same `MOVE_SPLASH`
  × 4 opponent moveset, but this doc does not claim a precise internal
  citation for it — flagged here as an open question for whoever next
  touches this family's RNG ledger, not resolved by this step.
  This is the family's distinguishing RNG signature (distinct from Rank 3's
  item-manipulation family, §6 of that doc, where the natural control had
  *zero* RNG divergence): here the Own Tempo guard's position **before** the
  accuracy check, not after, is exactly what produces the guaranteed part of
  the gap, and a batch-test author should expect the same accuracy-roll skip
  for Sweet Kiss (shares `BattleScript_EffectConfuse` verbatim) but **not**
  for Swagger/Flatter/Teeter Dance, whose own `jumpifability` calls sit
  *downstream* of their respective `accuracycheck`s (§2's table; Teeter
  Dance's own accuracy check per target is even further downstream, at
  `:2584`, after the Own Tempo check at `:2580` — so for Teeter Dance
  specifically, an Own-Tempo block *does* still skip that target's own
  accuracy roll, same shape as Confuse Ray, but a *different* target's
  accuracy roll in the same multi-target loop is unaffected).
- Both arms: Zubat's Confuse Ray PP decrements by exactly 1 (`10 → 9`);
  Zubat's own ability (Inner Focus) and both defenders' abilities are
  unchanged throughout (this family never writes `gBattleMons[].ability`,
  unlike Rank 4 — `jumpifability` only *reads* it).

## 6. Not covered by this step

- No receipt for `MOVE_SWEET_KISS` (shares `BattleScript_EffectConfuse`
  verbatim with Confuse Ray — same guard, same script, no additional
  citation needed per the worklist's own selector note,
  `docs/gate6-family-worklist.md:241-243`).
- No receipt for `MOVE_SWAGGER`, `MOVE_FLATTER`, or `MOVE_TEETER_DANCE` — out
  of scope per the brief; §3 and §4 above are this step's derivation for the
  batch-test author to build those receipts from without re-deriving the
  source.
