# Primary status-move opcode cluster — ground truth

Prep-scout for the registration step named in
`docs/executable-frontier-census.md`'s ranked table: `B_SCR_OP_SETEFFECTPRIMARY`,
`B_SCR_OP_JUMPIFSTATUS`, `B_SCR_OP_JUMPIFTYPE`, `B_SCR_OP_JUMPIFSIDEAFFECTING`,
`B_SCR_OP_JUMPIFCANTMAKEASLEEP` — the shared opcode set blocking `EFFECT_SLEEP`
(6 moves), `EFFECT_TOXIC` (1, weight 26), `EFFECT_POISON` (2), `EFFECT_PARALYZE`
(3, weight 64), `EFFECT_CONFUSE` (3, weight 48). No `src/` edits in this scout;
`applySetMoveEffect` (`src/engine/battleScriptHitChainOpcode.ts:1922-2137`) is
read but not touched.

## Headline correction to the census's optimism

**Registering exactly the five named opcodes does NOT fully unlock four of
the five effects.** It fully unlocks only `EFFECT_SLEEP`. The other four
(`EFFECT_TOXIC`, `EFFECT_POISON`, `EFFECT_PARALYZE`, `EFFECT_CONFUSE`) each
open with a script-level `jumpifability` call the census does not list as
missing, because `B_SCR_OP_JUMPIFABILITY` already has a dispatch entry
(registered in `src/engine/battleScriptIngrainLeechSeedWrapOpcode.ts:261`,
for Leech Seed's Liquid Ooze check) — but that handler is narrowed to
`ABILITY_LIQUID_OOZE` only (`createJumpifabilityHandler`,
`battleScriptIngrainLeechSeedWrapOpcode.ts:183-193`) and throws
`unsupportedBranch` for any other ability constant. This is exactly the
"registered opcode, narrow-input barrier" pattern the census's own Caveats
section (`docs/executable-frontier-census.md:285`) warns is invisible to its
opcode-existence walk: *"if a future dispatcher gains the same pattern...
this tool will overstate its effects as fully executable."* `JUMPIFABILITY`
already has that pattern; the census doesn't special-case it (only
`Cmd_seteffectwithchance`'s dispatch has a tracked exception), so this
specific gap doesn't show up as a blocker anywhere in the census today.

Per-script requirement (`reference/pokeemerald/data/battle_scripts_1.s`):

| Effect | Entry line | `jumpifability` call | Ability needed |
| --- | --- | --- | --- |
| `EFFECT_SLEEP` | `BattleScript_EffectSleep:284` | none | — |
| `EFFECT_TOXIC` | `BattleScript_EffectToxic:686`, line 690 | `ABILITY_IMMUNITY` -> `BattleScript_ImmunityProtected` | `ABILITY_IMMUNITY` |
| `EFFECT_POISON` | `BattleScript_EffectPoison:986`, line 990 | `ABILITY_IMMUNITY` -> `BattleScript_ImmunityProtected` | `ABILITY_IMMUNITY` |
| `EFFECT_PARALYZE` | `BattleScript_EffectParalyze:1007`, line 1011 | `ABILITY_LIMBER` -> `BattleScript_LimberProtected` | `ABILITY_LIMBER` |
| `EFFECT_CONFUSE` | `BattleScript_EffectConfuse:903`, line 907 | `ABILITY_OWN_TEMPO` -> `BattleScript_OwnTempoPrevents` | `ABILITY_OWN_TEMPO` |

So the follow-up registration step's real scope is: the five named opcodes
**plus** widening `JUMPIFABILITY`'s value table to include `ABILITY_IMMUNITY`,
`ABILITY_LIMBER`, and `ABILITY_OWN_TEMPO` (three new concrete values on an
opcode that is technically already "registered"). Only `EFFECT_SLEEP` is
opcode-cluster-complete as the census's row states.

## Opcode-by-opcode classification (reference/pokeemerald/src/battle_script_commands.c)

All five are genuinely unregistered today (`grep` over `src/engine/*.ts` for
each `B_SCR_OP_*` name returns nothing) — the census is right that none of
them have any dispatch entry yet.

### `Cmd_seteffectprimary` (:2941-2944) — (a) portable, once `applySetMoveEffect` gains a `primary` flag

```c
static void Cmd_seteffectprimary(void) { SetMoveEffect(TRUE, 0); }
```

Zero-operand opcode; the effect byte itself was already written by a prior
(generically-registered) `setbyte cEFFECT_CHOOSER, <effect>` instruction (the
`setmoveeffect` macro, `asm/macros/battle_script.inc:1370` — expands to plain
`setbyte`, not a dedicated opcode). `Cmd_seteffectprimary` always calls
`SetMoveEffect` with `certain` hardcoded to `0`; the semantic weight is
entirely in `primary=TRUE`.

**Certainty semantics vs `Cmd_seteffectwithchance`'s path.** Every ability-block
branch inside `SetMoveEffect` gates on `(primary == TRUE || certain ==
MOVE_EFFECT_CERTAIN)` (`:2301`, `:2322`, `:2343`, `:2363`, `:2398`, `:2428`,
`:2449`). Because `Cmd_seteffectprimary` always passes `primary=TRUE`, that OR
is unconditionally true regardless of `certain`'s value — so **every
ability-prevention branch in the family-A switch is live on the primary path**,
in contrast to today's ported `applySetMoveEffect`, whose doc comment
(`battleScriptHitChainOpcode.ts:1910-1920`) explicitly narrows to the
`Cmd_seteffectwithchance` call site where `primary` is always `FALSE` and
`certain` is caller-derived. Registration must add a `primary: boolean`
parameter (or a second code path) rather than just widening `certain`.

**Shield Dust / Safeguard interaction — the one true behavioral divergence.**
Both of `SetMoveEffect`'s early generic gates are conditioned on `!primary`:

```c
if (... ABILITY_SHIELD_DUST ... && !primary && byte <= 9) INCREMENT_RESET_RETURN
if (gSideStatuses[...] & SIDE_STATUS_SAFEGUARD && !primary && byte <= 7) INCREMENT_RESET_RETURN
```

(`:2253-2259`). For `Cmd_seteffectprimary`, `primary` is always `TRUE`, so
**both of these generic early-outs are dead code on the primary path** — they
only ever fire for `Cmd_seteffectwithchance`'s secondary-effect callers (e.g.
Poison Sting's 30% poison chance, Static's paralysis proc). This is *not* a
gap: each of the five scripts already gates Safeguard itself at the
script level via its own `jumpifsideaffecting ... SIDE_STATUS_SAFEGUARD ...`
call before ever reaching `seteffectprimary` (see the per-script tables
below), and none of the five is a Shield-Dust-relevant contact/powder
interaction in this cluster. Today's ported `applySetMoveEffect`
(`battleScriptHitChainOpcode.ts:1950-1961`) applies these two gates
*unconditionally* (no `primary` check at all) because its only caller today
never sets `primary=TRUE`; wiring `Cmd_seteffectprimary` into the same
function without adding the `!primary` condition would incorrectly let
Shield Dust/Safeguard silently no-op primary-path sleep/toxic/poison/paralyze
even though the script's own Safeguard check already ran (a real
correctness bug to avoid, not a wash — Shield Dust in particular has no
script-level gate anywhere in this cluster, so skipping the `!primary` guard
would make Shield Dust incorrectly block Sleep Powder/Toxic/etc., which the
real game does not do since Shield Dust only blocks *secondary* effects).

**`affectsUser` bit.** None of these five scripts' `setmoveeffect` calls OR in
`MOVE_EFFECT_AFFECTS_USER` (`1 << 6`) — all five always target the opponent
(`gBattlerTarget`), never the user. `affectsUser` is always `0` for this
cluster; the bit exists in the byte format but is dead weight here.

**Confusion's primary path is the same code as its already-modeled secondary
path.** `MOVE_EFFECT_CONFUSION` (7) is `> PRIMARY_STATUS_MOVE_EFFECT` (6), so
it dispatches through `SetMoveEffect`'s *family-B* (status2) branch
(`:2531-2546`), which does not read `primary` or `certain` at all except
inside other `case`s (flinch's Inner Focus). `applyConfusionMoveEffect`
(already live, called from `applySetMoveEffect`'s `effectByte >
PRIMARY_STATUS_MOVE_EFFECT` arm at `battleScriptHitChainOpcode.ts:1974-1976`)
is therefore **already correct for the primary path with zero changes** — the
existing (b) barrier is purely "the opcode that reaches this line
(`Cmd_seteffectprimary`) isn't wired," not a missing branch inside the
function itself. This directly answers the brief's confound check: yes,
`applySetMoveEffect`'s own reachable `MOVE_EFFECT_CONFUSION` case is already
primary-path-correct; the only barrier is dispatch-level.

### `Cmd_jumpifstatus` (:3081-3091) — (a) fully portable

```c
if (gBattleMons[battler].status1 & flags && gBattleMons[battler].hp != 0)
    jump; else advance +10;
```

Pure state read (`status1 & flags`, `hp != 0`), no RNG, no ability/item
interaction. Operands: battler selector (1 byte), `flags` (u32, T2_READ_32),
jump pointer (T2_READ_PTR). Used by all five scripts (`STATUS1_SLEEP`,
`STATUS1_POISON`, `STATUS1_TOXIC_POISON`, `STATUS1_PARALYSIS`, `STATUS1_ANY`
masks — five concrete mask values needed, all derivable from the same
`STATUS1_*` constants `battleScriptRulesContext.ts` already knows).
`Cmd_jumpifstatus2` (:3093-3103, the status2 sibling) is a **different,
already-registered** opcode (`B_SCR_OP_JUMPIFSTATUS2`,
`battleScriptStatbuffchangeOpcode.ts:295-330`), narrowed today to
`STATUS2_SUBSTITUTE` only — which is exactly the one value `EFFECT_SLEEP`,
`EFFECT_TOXIC`, and `EFFECT_CONFUSE` need it for (`jumpifstatus2 BS_TARGET,
STATUS2_SUBSTITUTE, BattleScript_ButItFailed`), plus `EFFECT_CONFUSE`'s
second use for `STATUS2_CONFUSION` (`:909`, **not yet in the registered
`JUMPIFSTATUS2_VALUES` map** — a second narrow-value gap alongside the
`JUMPIFABILITY` one above, same shape, also invisible to the census for the
same reason).

### `Cmd_jumpiftype` (:3243-3253) — (a) fully portable

```c
if (IS_BATTLER_OF_TYPE(battler, type)) jump; else advance +7;
```

`IS_BATTLER_OF_TYPE` is a pure two-type-slot compare, already used
non-opcode-side by `applySetMoveEffect`'s own `isBattlerOfType` helper
(`battleScriptHitChainOpcode.ts`, used at line 2053 etc.) — the opcode
wrapper is a trivial port reusing that existing helper. Used by
`EFFECT_TOXIC`/`EFFECT_POISON` for `TYPE_POISON`/`TYPE_STEEL` immunity
checks (`:695-696`, `:994-995`).

### `Cmd_jumpifsideaffecting` (:3158-3176) — (a) fully portable

```c
side = (operand == BS_ATTACKER) ? GET_BATTLER_SIDE(attacker) : GET_BATTLER_SIDE(target);
if (gSideStatuses[side] & flags) jump; else advance +8;
```

Pure side-status-bitfield read (`gSideStatuses`, already modeled elsewhere
per `BATTLE_SCRIPT_...` side-status constants used by
`battleScriptSetSideStatusOpcode.ts`). All five scripts call it with
`BS_TARGET, SIDE_STATUS_SAFEGUARD` — one selector, one flag value, no other
concrete value needed for this cluster.

**Safeguard's block point for this cluster:** in every one of the five
scripts, `jumpifsideaffecting ... SIDE_STATUS_SAFEGUARD ...` runs *after*
`accuracycheck` and *before* `attackanimation`/`seteffectprimary` (see the
per-script line numbers below). So Safeguard still lets the move's own
accuracy roll consume RNG (see the ledger below), then blocks purely at the
script level — the target's status is never touched and `SetMoveEffect` is
never reached. This script-level gate is the *only* functioning
Safeguard interaction for this cluster once `Cmd_seteffectprimary` bypasses
`SetMoveEffect`'s own (secondary-only) Safeguard early-out, per the
Shield-Dust/Safeguard note above.

### `Cmd_jumpifcantmakeasleep` (:6828-6848) — (a) fully portable, including `UproarWakeUpCheck`

```c
if (UproarWakeUpCheck(gBattlerTarget)) jump;
else if (ability == ABILITY_INSOMNIA || ability == ABILITY_VITAL_SPIRIT) { record ability; jump; }
else advance +5;
```

`UproarWakeUpCheck` (:6801-6826) is a bounded loop over `gBattlersCount`
(2 in Level-50 singles) checking `status2 & STATUS2_UPROAR` and
`ability == ABILITY_SOUNDPROOF` — no RNG, fully deterministic, and already
Factory-singles-shaped (the loop only ever runs 0..1 in singles, matching
`AtkCanceler_UnableToUseMove`'s existing Uproar-loop pattern already ported
in `battleScriptActionAdmission.ts:1344-1357`, which can be reused directly).
Because `EFFECT_SLEEP` is the only one of the five scripts that calls this
opcode (`:290`), and it has no `jumpifability` prerequisite, `EFFECT_SLEEP`
is confirmed as the one effect the census's exact 4-opcode blocker set
actually finishes.

Note: `SetMoveEffect`'s own `STATUS1_SLEEP` case (`:2273-2298`) *also*
contains an Insomnia/Vital-Spirit/Uproar re-check, but by the time
`seteffectprimary` runs, `jumpifcantmakeasleep` has already filtered those
cases out at the script level — so `SetMoveEffect`'s own copy of that logic
is dead code on every real path through this cluster (defensive
redundancy in the source, not a live branch to port with different
semantics).

## Full per-script topology walk (confirms the blocker set, per effect)

| Effect | Entry | Full opcode sequence | Every opcode already registered? |
| --- | --- | --- | --- |
| `EFFECT_SLEEP` | `:284-298` | attackcanceler, attackstring, ppreduce, **jumpifstatus2**(SUBSTITUTE, registered), **jumpifstatus**(SLEEP), **jumpifcantmakeasleep**, **jumpifstatus**(ANY), accuracycheck, **jumpifsideaffecting**(SAFEGUARD), attackanimation, waitanimation, setbyte, **seteffectprimary**, goto | All but the 4 bolded-unregistered are already live; `jumpifstatus2` is registered+sufficient. |
| `EFFECT_TOXIC` | `:686-705` | attackcanceler, attackstring, ppreduce, **jumpifability**(IMMUNITY, *registered but narrow*), **jumpifstatus2**(SUBSTITUTE, registered), **jumpifstatus**(POISON), **jumpifstatus**(TOXIC_POISON), **jumpifstatus**(ANY), **jumpiftype**(POISON), **jumpiftype**(STEEL), accuracycheck, **jumpifsideaffecting**(SAFEGUARD), attackanimation, waitanimation, setbyte, **seteffectprimary**, resultmessage, waitmessage, goto | Needs the 4 named opcodes **and** `jumpifability` widened to `ABILITY_IMMUNITY`. |
| `EFFECT_POISON` | `:986-1005` | same shape as Toxic (immunity, substitute, already-poisoned, already-any, two type checks, accuracy, safeguard, `seteffectprimary`) | Same as Toxic. |
| `EFFECT_PARALYZE` | `:1007-1025` | attackcanceler, attackstring, ppreduce, **jumpifability**(LIMBER, *registered but narrow*), **jumpifstatus2**(SUBSTITUTE, registered), typecalc (registered — used by every executable damaging move), jumpifmovehadnoeffect (registered — same), **jumpifstatus**(PARALYSIS), **jumpifstatus**(ANY), accuracycheck, **jumpifsideaffecting**(SAFEGUARD), attackanimation, waitanimation, setbyte, **seteffectprimary**, resultmessage, waitmessage, goto | Needs the named opcodes **and** `jumpifability` widened to `ABILITY_LIMBER`. `typecalc`/`jumpifmovehadnoeffect` are already registered (used by `EFFECT_HIT` etc.) — confirmed not a hidden extra blocker. |
| `EFFECT_CONFUSE` | `:903-918` | attackcanceler, attackstring, ppreduce, **jumpifability**(OWN_TEMPO, *registered but narrow*), **jumpifstatus2**(SUBSTITUTE, registered), **jumpifstatus2**(CONFUSION, *registered opcode, but this concrete value is also missing from `JUMPIFSTATUS2_VALUES` today*), accuracycheck, **jumpifsideaffecting**(SAFEGUARD), attackanimation, waitanimation, setbyte, **seteffectprimary**, resultmessage, waitmessage, goto | Needs the named opcodes, `jumpifability` widened to `ABILITY_OWN_TEMPO`, **and** `JUMPIFSTATUS2_VALUES` widened to include `STATUS2_CONFUSION`. |

Every non-bolded opcode above (`attackcanceler`, `attackstring`, `ppreduce`,
`accuracycheck`, `attackanimation`, `waitanimation`, `setbyte`,
`resultmessage`, `waitmessage`, `goto`, `typecalc`, `jumpifmovehadnoeffect`)
is already registered and exercised by other already-executable effects
(`EFFECT_HIT`, `EFFECT_POISON_HIT`, etc.), so the topology walk finds no
additional silent blocker beyond the ones named above. The tail scripts
(`BattleScript_AlreadyAsleep`, `_AlreadyPoisoned`, `_AlreadyConfused`,
`_AlreadyParalyzed`, `_ImmunityProtected`, `_LimberProtected`,
`_OwnTempoPrevents`, `_CantMakeAsleep`, `_SafeguardProtected`,
`_NotAffected`, `_ButItFailed`) all resolve to
`setalreadystatusedmoveattempt`/`pause`/`printstring`/`printfromtable`/
`waitmessage`/`goto`/`call`/`copybyte` — the same already-registered
message-tail vocabulary used throughout the executable frontier.

## RNG ledger (live-verified against the Battle Scene OFF oracle)

Fixtures: `tools/battle-lab/mechanic-status-cluster-paralyze.json` (PIKACHU
Thunder Wave -> EEVEE, opponent's 4 slots all Splash) and
`tools/battle-lab/mechanic-status-cluster-sleep.json` (ODDISH Sleep Powder ->
MACHOP, opponent's 4 slots all Splash). Both sides are single-ability species
(Static/Run Away/Chlorophyll/Guts) so `abilitySlot` is unambiguous without
needing to model the AI's ability-dependent viability scoring. RNG advance
formula: `gRngValue = (1103515245 * gRngValue + 24691) mod 2^32`
(`reference/pokeemerald/include/random.h`); `Random()`'s result is the
top 16 bits of the *new* value.

**EFFECT_PARALYZE (Thunder Wave, 100 accuracy, no duration draw):**

| Seed | Roll #1 (`accuracycheck`, `:1176`) | Result | status1 before -> after | Total Random() calls, frame 0 -> 450 |
| --- | --- | --- | --- | --- |
| 1 | u16 % 100 = varies, always < 100 | hit (guaranteed at 100 acc) | 0 -> 64 (`STATUS1_PARALYSIS`, `1<<6`) | 8 |
| 2, 3, 4 | same | same | same | 8 |

Verified: `SetMoveEffect`'s `STATUS1_PARALYSIS` arm (`:2395-2426`) contains
**zero** `Random()` calls — paralysis has no duration counter, unlike sleep.
So `Cmd_seteffectprimary`'s own contribution to the ledger is exactly the
one `accuracycheck` roll already drawn before it runs; nothing this cluster
owns draws a second roll. The observed 8-call total per full turn factors as:
**1** (Thunder Wave's own accuracycheck) + **1** (Eevee's own full-paralysis
25% check, drawn when *it* attempts its Splash action next — a
`battle_util.c` mechanic outside this opcode cluster, not part of
`SetMoveEffect`) + **6** (a fixed downstream cost, empirically constant
across every seed tested in both fixtures below — most likely the next
turn's AI move-viability scoring pass creeping into the fixed 450-frame
capture window, the same phenomenon `docs/set-move-effect-ground-truth.md`
already documents for its control seed). This 6-call tail is not attributed
further here; it is outside this cluster's scope and constant regardless of
which of the two fixtures or which seed is used (see table below).

**EFFECT_SLEEP (Sleep Powder, 75 accuracy, `(Random() & 3) + 2` duration draw
at `:2481`):**

| Seed | Roll #1 (`accuracycheck`) % 100 | Hit? | Roll #2 (duration) & 3 | status1 after | Total calls, frame 0 -> 450 |
| --- | --- | --- | --- | --- | --- |
| 1 | 17 | yes | 2 -> turns = 4 | 4 | 8 |
| 7 | 30 | yes | 1 -> turns = 3 | 3 | 8 |
| 8 | 35 | yes | 1 -> turns = 3 | 3 | 8 |
| 2, 3, 4, 5, 6 | 84 / 79 / 76 / 79 / 79 | no | (not drawn) | 0 | 7 |

All three hit seeds' `status1` value equals `(roll2 & 3) + 2` **exactly**,
matching `STATUS1_SLEEP_TURN(num) = num << 0` (`battle.h:116`) — the raw
`status1` byte *is* the turn counter, with no separate "set counter" step.
This is the exact convention `battleScriptActionAdmission.ts:1402-1404`
already assumes when decrementing sleep
(`sourceBattler.status1 - sleepDecrement`, gated on `sleepBefore <
sleepDecrement` to clear rather than underflow) — **confirmed matching, no
correction needed**. Miss seeds cost exactly 1 fewer total call than hit
seeds (7 vs 8), i.e. the same fixed-6 downstream tail as the paralyze
fixture, plus the accuracy roll, plus the duration roll only when the move
actually connects. No roll is drawn for whether the *target* can act on a
sleep turn (unlike paralysis's 25% full-paralysis check) — an asleep
Pokemon's turn is skipped by decrementing the counter, not by any RNG call,
consistent with `battleScriptActionAdmission.ts`'s deterministic
`sleepBefore !== 0` branch.

**Determinism:** every fixture/seed pair above was run twice through
`bin`/the oracle HTTP endpoint directly; frame 0 and frame 450 state were
byte-identical both times (verified in `tools/probe/verify-status-cluster-ground-truth.ts`).

## Other status lifecycle facts needed for registration

- **Toxic counter init.** `STATUS1_TOXIC_POISON` is bit 7; the toxic counter
  occupies bits 8-11 (`STATUS1_TOXIC_COUNTER`, `battle.h:120-121`), a disjoint
  range. `SetMoveEffect`'s `STATUS1_TOXIC_POISON` case
  (`:2427-2474`) only ever `|=`s bit 7 (`gBattleMons[...].status1 |=
  sStatusFlagsForMoveEffects[byte]`, `:2483`) and is only reached when
  `status1 == 0` beforehand (`:2457`'s `if (status1) break`), so the counter
  bits are implicitly `0` the instant Toxic first lands — no separate
  "init the counter" step exists or is needed. This matches
  `battleEndTurnOrchestration.ts`'s already-modeled `bumpToxicCounter`
  (`:316-320`), which reads/increments those same bits 8-11 from whatever
  the status1 write left them at; **no correction needed, no dependency
  the toxic-counter code doesn't already have**.
- **Sleep counter decrement site.** Confirmed above — direct arithmetic
  match, `battleScriptActionAdmission.ts:1402-1404` vs
  `STATUS1_SLEEP_TURN`'s `num << 0` convention.
- **Safeguard's block point.** Confirmed above — script-level
  `jumpifsideaffecting`, after `accuracycheck`, before the status write;
  the only functioning Safeguard gate for the primary path in this cluster.

## (a)/(b) classification summary

| Opcode | Classification | Notes |
| --- | --- | --- |
| `B_SCR_OP_SETEFFECTPRIMARY` | (a) portable, needs a `primary` flag threaded into `applySetMoveEffect` (or a parallel function) so the Shield Dust/Safeguard generic early-outs correctly become dead code (`!primary`), not so they keep firing unconditionally as they do for today's single caller | `Cmd_seteffectprimary`, `:2941-2944` |
| `B_SCR_OP_JUMPIFSTATUS` | (a) fully portable | `:3081-3091` |
| `B_SCR_OP_JUMPIFTYPE` | (a) fully portable | `:3243-3253` |
| `B_SCR_OP_JUMPIFSIDEAFFECTING` | (a) fully portable | `:3158-3176` |
| `B_SCR_OP_JUMPIFCANTMAKEASLEEP` | (a) fully portable, including `UproarWakeUpCheck` (bounded 2-battler loop, reuse the pattern already ported in `battleScriptActionAdmission.ts:1344-1357`) | `:6828-6848` + `:6801-6826` |
| `B_SCR_OP_JUMPIFABILITY` (already registered, narrow) | needs 3 new concrete values (`ABILITY_IMMUNITY`, `ABILITY_LIMBER`, `ABILITY_OWN_TEMPO`) added to its value table — **not named in the supervisor brief's opcode list, but required for 4 of the 5 effects** | `battleScriptIngrainLeechSeedWrapOpcode.ts:183-193, 261` |
| `B_SCR_OP_JUMPIFSTATUS2` (already registered, narrow) | needs 1 new concrete value (`STATUS2_CONFUSION`) added to `JUMPIFSTATUS2_VALUES` for `EFFECT_CONFUSE`'s already-confused check | `battleScriptStatbuffchangeOpcode.ts:291-293` |

## Fixtures and verify script

- `tools/battle-lab/mechanic-status-cluster-paralyze.json`
- `tools/battle-lab/mechanic-status-cluster-sleep.json`
- `tools/probe/verify-status-cluster-ground-truth.ts` — run:
  `node --experimental-strip-types tools/probe/verify-status-cluster-ground-truth.ts`
  (or `npx tsx`). All checks PASS, run twice.

## Out of scope (not attempted here, per brief)

`EFFECT_CONFUSE`'s confusion-duration draw (stretch item 3c) was not
separately live-staged — its RNG shape is already proven identical to the
existing `applyConfusionMoveEffect` secondary-path code (`(Random() % 4) + 2`,
same call already exercised via `Cmd_seteffectwithchance` elsewhere), and the
`JUMPIFABILITY`/`JUMPIFSTATUS2` narrow-value gaps above are a bigger real
blocker for that effect than the duration draw itself. No `src/` changes were
made; no factory-AI, ENDTURN/END3, or seam/animation files were touched.
