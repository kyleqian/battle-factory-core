# Factory AI voluntary-switch scout

> **FROZEN EVIDENCE CHECKPOINT — 2026-07-29.** Prep-only Gate-5 rung-13
> ground truth, derived at run HEAD `3566a390808295aff0dbe2215e7e08bff4c0e5da`
> from the pinned pret source and the production engine. No production source,
> generated data, probe, or fixture changed. The selected oracle was
> `battle-scene-off` at `http://127.0.0.1:8014` (`bin/oracle info` reported
> bootstrap v5 and the expected `9c89c741…` anchor).
>
> Frozen engine grep:
>
> - `factoryAiLiveDriver.ts:101` names
>   `factory-ai-switch-precheck-unimplemented`;
> - `factoryBattleScriptFullTurnDecision.ts:1229` says trainer voluntary
>   switching is deliberately out of scope;
> - that reducer publishes trainer moves only at `:1702` and rejects anything
>   but a trainer `use-move` at `:1708-1716`;
> - the shared boundary already types/parses a command `{kind:"switch",
>   partyIndex}` at `battleDecisionBoundary.ts:25-42,335-363`;
> - player voluntary-switch execution already exists at
>   `factoryBattleScriptFullTurnDecision.ts:895-1025,1803-1819` (landed in
>   `31826b3b`).

This is an implementation dossier, not an oracle acceptance receipt. The
stretch live receipt was deliberately not run inside this bounded scout; §7
specifies three process-isolated receipts precisely enough for the
implementation worker to bank one without rediscovering the source path.

## 1. Source decision and execution path

### 1.1 Entry and hard gates

The opponent controller answers `ChooseAction` by calling
`AI_TrySwitchOrUseItem` before it ever receives `ChooseMove`
(`battle_controller_opponent.c:1540-1544`). In a trainer battle,
`AI_TrySwitchOrUseItem` calls `ShouldSwitch` first; success returns immediately,
failure tries an item, and only failure of both emits `B_ACTION_USE_MOVE`
(`battle_ai_switch_items.c:528-603`). Thus switch-precheck RNG is before all
move-policy RNG.

`ShouldSwitch` rejects, in this exact order:

1. wrapped or escape-prevented active mon (`battle_ai_switch_items.c:439-440`);
2. rooted (`:441-442`);
3. opposing Shadow Tag (`:443-444`);
4. opposing Arena Trap, **without** the player path's Flying/Levitate
   exceptions—the source calls this out as a miss (`:445-446`);
5. Magnet Pull anywhere on field when the active mon is Steel (`:447-451`);
6. Battle Arena (`:452-453`).

It then resolves the active battler and, only in doubles, its live partner
(`:455-468`). Two-opponent/link-multi battles restrict each battler to its
party half; ordinary singles scan party indexes `0..5` (`:470-485`). The
availability scan is ascending and excludes fainted, empty, egg, either active
slot, and either already-reserved `monToSwitchIntoId` (`:487-505`). Zero
candidates exits before any helper or RNG (`:507-508`).

With a candidate, helpers run in this exact short-circuit order:

1. `ShouldSwitchIfPerishSong`;
2. `ShouldSwitchIfWonderGuard`;
3. `FindMonThatAbsorbsOpponentsMove`;
4. `ShouldSwitchIfNaturalCure`;
5. `HasSuperEffectiveMoveAgainstOpponents(FALSE)` as a **do-not-switch**
   guard;
6. `AreStatsRaised` as another **do-not-switch** guard;
7. immunity fallback, then not-very-effective fallback
   (`battle_ai_switch_items.c:509-525`).

The mask selected by `GetAiScriptsInBattleFactory` is not consulted anywhere
in this ladder. Mask 0, 1, and 7 opponents all run the same switch precheck.

### 1.2 Perish Song

`ShouldSwitchIfPerishSong` succeeds exactly when the active battler has
`STATUS3_PERISH_SONG` and its `perishSongTimer == 0`. It writes the sentinel
`AI_monToSwitchIntoId = PARTY_SIZE`, emits `B_ACTION_SWITCH`, and consumes zero
RNG (`battle_ai_switch_items.c:20-33`). The sentinel means “choose later,” not
party slot 6.

### 1.3 Wonder Guard

`ShouldSwitchIfWonderGuard` is singles-only (`battle_ai_switch_items.c:35-47`).
It identifies the opposing active battler and returns unless its **actual**
ability is Wonder Guard (`:49-52`). It scans the AI active mon's move slots
`0..3`; any nonzero move that `AI_TypeCalc` marks super-effective suppresses
the switch with zero RNG (`:54-64`).

Otherwise it selects the ordinary singles party and scans party indexes
ascending (`:66-85`), skipping fainted/empty/egg/current (`:87-94`). For each
candidate it scans move slots ascending (`:99-105`). Every super-effective
move consumes `Random() % 3`; result `0` or `1` succeeds (probability `2/3`),
writes that candidate's exact party index, emits `B_ACTION_SWITCH`, and returns
(`:106-112`). Result `2` continues at the next move, so one candidate with
several super-effective moves can spend several draws. No qualifying move
means zero draws; exhaustion returns false (`:113-116`).

`AI_TypeCalc` uses the supplied move, target species, and actual ability. It
special-cases Levitate/Ground and Wonder Guard and otherwise walks the type
chart; it consumes no RNG (`battle_script_commands.c:1594-1636`).

### 1.4 Absorb a previously landed move

`FindMonThatAbsorbsOpponentsMove` first calls
`HasSuperEffectiveMoveAgainstOpponents(TRUE)`. `TRUE` makes that probe
RNG-free. If the active AI mon has a super-effective move, the helper then
spends `Random() % 3`: results `1` or `2` abort switching (probability `2/3`);
only `0` continues. If it has no super-effective move, this gate spends zero
draws (`battle_ai_switch_items.c:119-129,258-285`).

It next requires `gLastLandedMoves[active]` to be neither `MOVE_NONE` nor
`MOVE_UNAVAILABLE`, and requires nonzero move power (`:130-135`). Fire maps to
Flash Fire, Water to Water Absorb, Electric to Volt Absorb; other types return
false (`:151-158`). An active mon already holding the matching ability returns
false (`:160-161`).

The singles candidate scan is party index `0..5` (`:163-180`). It skips
fainted/empty/egg, the active slot, and reserved incoming slots (`:185-198`).
Ability is derived from species plus `MON_DATA_ABILITY_NUM` (`:200-204`).
Each candidate with the matching ability spends `Random() & 1`; odd succeeds
(probability `1/2`), writes that exact party index, emits switch, and returns.
Even continues to the next party index (`:206-215`). Therefore with `k`
matching candidates this phase spends from one through `k` draws; all-even
fails.

The doubles battler-pair exclusions at `:137-149` and split-party bounds at
`:163-169` do not execute in Factory L50 singles.

### 1.5 Natural Cure

`ShouldSwitchIfNaturalCure` requires sleep, actual Natural Cure, and
`hp >= maxHP/2`, in that order (`battle_ai_switch_items.c:218-225`). It then:

1. if last landed move is `NONE` or `UNAVAILABLE`, spends `Random() & 1`; odd
   emits an unspecified switch (`:227-234`);
2. **else if** the last landed move has zero power, spends `Random() & 1`; odd
   emits an unspecified switch (`:235-241`);
3. tries `FindMonWithFlagsAndSuperEffective(IMMUNE, 1)`, then its NVE sibling
   (`:243-246`);
4. spends a final `Random() & 1`; odd emits an unspecified switch, even returns
   false (`:248-255`).

The first random condition is part of an `if/else if`: if a `NONE`/
`UNAVAILABLE` case rolls even, evaluation proceeds to the `else if` expression
using that same move id. `MOVE_NONE` indexes the zero row; `MOVE_UNAVAILABLE`
is the source's unsafe edge. A faithful port must preserve evaluation order
while safely representing that pinned-source quirk.

The modulo-1 helper calls are not RNG-free: every qualifying
super-effective candidate move evaluates `Random() % 1 == 0`, spends one draw,
and necessarily succeeds.

### 1.6 “I already have a good move” and boosted-stat suppressors

`HasSuperEffectiveMoveAgainstOpponents(noRng)` scans active move slots
ascending against the opposing active (`battle_ai_switch_items.c:258-285`).
With `noRng=TRUE`, the first super-effective move returns true without a draw.
With `FALSE`, each super-effective move spends `Random() % 10`; results `1..9`
return true (probability `9/10`), while `0` continues to the next move. In
singles, exhaustion returns false before the doubles partner arm (`:287-311`).
At the main call site, true means **do not switch** (`:517-518`).

`AreStatsRaised` sums every stage above the default 6 across all
`NUM_BATTLE_STATS`; total boosts greater than 3 return true and suppress
switching, with zero RNG (`:314-326,519-520`). Debuffs do not offset boosts.

### 1.7 Defensive-flag plus offensive-SE fallback

`FindMonWithFlagsAndSuperEffective(flags, moduloPercent)` requires a real,
damaging last landed move and a valid `gLastHitBy[active]`
(`battle_ai_switch_items.c:328-345`). Its ordinary-singles scan is ascending
party index (`:347-378`) and skips fainted/empty/egg, active, and reserved
slots (`:383-396`). It derives each candidate's actual ability from its
ability slot and asks whether the last landed move is immune/NVE against that
candidate (`:398-405`).

For a defensive match it uses `gLastHitBy[active]` as the opponent and scans
the candidate's moves ascending. Each move super-effective against that
opponent spends `Random() % moduloPercent`; zero selects the candidate
(`:407-420`). Main-ladder immunity runs first with modulo 2 (success `1/2`
per qualifying move); only complete failure reaches NVE with modulo 3
(success `1/3` per qualifying move), because the C `||` short-circuits
(`:521-523`). Natural Cure's modulo-1 calls use the same scan and guaranteed
post-draw success (`:243-246,416`).

### 1.8 From choice to action

Every successful helper has already emitted `B_ACTION_SWITCH`. If it wrote an
exact party index, `AI_TrySwitchOrUseItem` copies it to
`monToSwitchIntoId` and returns. If it wrote `PARTY_SIZE`, it calls
`GetMostSuitableMonToSwitchInto`; if that still returns the sentinel, the
ascending first live legal party slot is the final fallback
(`battle_ai_switch_items.c:541-595`).

The opponent controller's later Pokémon-choice callback repeats the suitable
selection only when `AI_monToSwitchIntoId` is still the sentinel
(`battle_controller_opponent.c:1621-1653`). Normal voluntary-switch selection
already leaves a concrete id.

Action selection copies the controller's returned action into
`gChosenActionByBattler` (`battle_main.c:4175-4182`). Switch selection checks
the player-facing trapping rules and asks the controller for a party member
(`:4240-4267`). After all commands are collected, item/switch actions are
placed before all other actions, in ascending battler order; speed comparison
is applied only when neither action is item nor switch (`:4817-4850`).
`HandleAction_Switch` installs `BattleScript_ActionSwitch`
(`battle_util.c:294-310`), whose script performs Pursuit interception,
switch-out abilities, party reconstruction, switch-in animation/effects, and
move-end cleanup (`data/battle_scripts_1.s:3088-3121`).

## 2. `GetMostSuitableMonToSwitchInto`, exactly

An already concrete `monToSwitchIntoId` is returned unchanged. Arena returns
the next party index. Doubles alone spends one `Random() & BIT_FLANK` to pick
an opponent, correcting an absent flank; singles deterministically uses the
opposing active and aliases both own battlers to the active
(`battle_ai_switch_items.c:629-669`). Factory singles uses party bounds
`0..5` (`:671-686`).

The first pass is iterative:

1. Start `invalidMons=0`; each round starts `bestDmg=TYPE_MUL_NO_EFFECT`,
   `bestMonId=PARTY_SIZE` (`:688-695`).
2. Scan party indexes ascending. A candidate must be nonempty, alive,
   not invalid, not active, and not reserved (`:695-704`).
3. Start `typeDmg=TYPE_MUL_NORMAL`, then treat each of the opponent's two
   types as an attacking type against the candidate's two species types
   (`:706-710`, with type-chart multiplication at `:605-627`).
4. The source deliberately/accidentally keeps the **largest** `typeDmg`
   (`bestDmg < typeDmg`), i.e. the candidate taking most damage. Strict `<`
   makes the earliest party index win ties (`:712-719`).
5. Scan that candidate's moves `0..3`; any nonzero move for which `TypeCalc`
   reports super-effective returns the candidate (`:727-738`). Otherwise mark
   it invalid and repeat (`:740-746`).

If no defensively ranked candidate also has an SE move, the damage fallback
resets global damage/type/crit scratch and scans party index then move slot,
both ascending (`:748-774`). For every nonzero move whose power is not the
special value 1, it calls `AI_CalcDmg(gActiveBattler, opposingBattler)` and
then `TypeCalc(move, gActiveBattler, opposingBattler)` (`:775-780`).
Notably the base-damage caller uses the current active battler and
`gCurrentMove`, not the candidate/local `move`
(`battle_ai_switch_items.c:772-780`; `battle_script_commands.c:1306-1319`).
The pinned non-`BUGFIX` build also declares `bestDmg` as `u8` even though
actual damage is signed-width (`battle_ai_switch_items.c:632-636`). A strict
greater-than comparison selects the earliest party/move attaining the maximum
as represented by those source semantics (`:781-789`).

There are **zero Random calls in the entire singles scoring path**. The only
draw in this function is the unreachable-for-this-mission doubles opponent
coin at `:660`.

## 3. Factory L50 singles reachability

The Factory is a trainer/frontier/factory singles battle with three live party
records and three empty tail slots. The main gates and party scan are active;
doubles, two-opponent, link-multi, Arena, partner, and split-party arms are
not.

| Path | L50 singles status | Proof / necessary staging |
| --- | --- | --- |
| trapping exits | reachable | Wrap/Mean Look/Ingrain and Shadow Tag/Arena Trap/Magnet Pull are ordinary battle state; `ShouldSwitch :439-451`. The AI Arena Trap check is stricter than the player gate. |
| no bench | reachable | after two party members faint, availability is zero; `:487-508`. |
| Perish Song | reachable | Perish Song state/timer are implemented engine state; helper `:20-27`. Requires one live bench. |
| Wonder Guard | reachable | singles-only helper explicitly accepts this topology; `:46-52`. Shedinja plus a bench SE move satisfies it. |
| absorber | reachable | a damaging landed Fire/Water/Electric move plus Flash Fire/Water Absorb/Volt Absorb bench satisfies `:130-210`. |
| Natural Cure | reachable | sleep, Natural Cure, at least half HP satisfy `:218-255`. |
| active-SE suppressor | reachable | any active SE move; `:258-285,517-518`. |
| raised-stats suppressor | reachable | total positive stage distance >3; `:314-326,519-520`. |
| immunity/NVE fallback | reachable | a damaging last hit, candidate resistance/immunity, and candidate SE move; `:328-426,521-523`. |
| suitable-mon scoring | reachable | Perish Song/Natural Cure write the sentinel; `:25,231,238,250,545-590`. |
| trainer item | source-unreachable | Frontier is excluded while trainer item history is populated (`battle_ai_script_commands.c:291-306`), so `ShouldUseItem :833-943` sees only `ITEM_NONE`; it spends no RNG. |
| doubles opponent coin / partner exclusions | unreachable | Factory L50 singles has no `BATTLE_TYPE_DOUBLE`; `battle_ai_switch_items.c:137-149,347-359,651-663`. |
| two-opponent split party | unreachable | no TWO_OPPONENTS/TOWER_LINK_MULTI; `:163-173,361-371,470-480,671-681`. |
| Battle Arena hard stop | unreachable gate | this is Factory, not Arena; `:452-453,648-650`. |

The three-mon party does not change the source scan bound: indexes 3, 4, 5 are
visited and rejected as `SPECIES_NONE`, without RNG.

## 4. Ordered RNG ledger

Let `P` be the BattleState cursor on entry to the trainer command. The complete
order is:

1. `ShouldSwitch` gate/helper draws in the exact §1 call order.
2. On successful switch, stop. Direct-selector helpers use their selected
   party index; sentinel helpers run deterministic singles scoring. No
   move-setup or best-move draw occurs.
3. On no switch, `ShouldUseItem` is source-empty and draws zero.
4. Only then `BattleAI_SetupAIData` spends four unconditional
   `100 - Random()%16` draws, slots 0..3
   (`battle_ai_script_commands.c:312-342`).
5. Mask scoring scripts spend their own branch-dependent draws in
   logic-id-major, move-slot-major order; singles finally spends
   `Random()%numOfBestMoves`, even with one best move
   (`battle_ai_script_commands.c:396-445`).

Therefore a previously banked 11- or 13-draw move receipt remains the same
ordered suffix, but begins at `P + N`, where `N` is the exact number of failed
precheck draws. Total command delta is `N+11` or `N+13`. A successful switch
delta is only `N`; it must not burn the four setup draws or final tie draw.
This is cursor continuity, not a separate AI RNG.

Draw sites in source evaluation order:

| Site | Draw count / success |
| --- | --- |
| Wonder Guard candidate SE move `:106` | one per qualifying move; `%3 < 2` |
| absorber active-SE reluctance `:128` | exactly one iff active has SE; continue only `%3 == 0` |
| absorber matching candidate `:206` | one per matching candidate; `&1 != 0` |
| Natural Cure early `:229` or status-move `:236` | mutually exclusive condition arms; `&1 != 0` |
| Natural Cure immunity/NVE modulo-1 `:416` | one at first qualifying SE move, guaranteed success |
| Natural Cure final `:248` | one iff earlier paths did not succeed; `&1 != 0` |
| main active-SE suppressor `:282` | one per active SE move until `%10 != 0` |
| main immunity fallback `:416,521` | one per qualifying move until `%2 == 0` |
| main NVE fallback `:416,522` | reached only after immunity exhaustion; one until `%3 == 0` |
| suitable selector doubles coin `:660` | unreachable; singles zero |

All short-circuiting matters. In particular, a successful Wonder Guard switch
prevents every later draw; a failed active-SE `%10` suppressor returns false
from `ShouldSwitch` and immediately enters the 4+script+tie move ledger.

## 5. History and state surface

Rung 6 already persists `BattleHistory.usedMoves`, known abilities, known item
effects, and party-index cells
(`factoryAiLiveDriver.ts:67-82,118-213`). It records the target's last used
move before scoring, clears used-move/known-ability history on party change,
and intentionally retains item history, matching
`battle_ai_script_commands.c:618-660` and
`battle_main.c:3259-3261,3352-3354`.

`ShouldSwitch` itself reads **none** of that guessed/known `BattleHistory`.
It reads actual live and party data:

- active `status2/status3`, Perish timer, HP/maxHP, stat stages, types, ability,
  moves, and party index;
- opposing active species/types/actual ability;
- full trainer party HP/species/egg/ability slot/moves and reserved incoming
  indexes;
- `gLastLandedMoves[active]` and `gLastHitBy[active]`;
- battle flags, absent flags, and field trapping abilities
  (`battle_ai_switch_items.c:20-525`).

The engine already carries Perish timers and the move-end history arrays
(`battleScriptRulesContext.ts:322-323,612-614,900-902`), and its party members
already carry species, HP, egg, ability slot, and moves specifically for
switch selection (`:534-565`). Rung 13 needs an adapter/evaluator over these
fields plus generated species ability/type data; it does **not** need to add a
second persistent history store. Rung-6 known move/ability/item history must
remain cursor-continuous for the move-scoring suffix when switching declines.

## 6. Challenge masks and current dispatch

`FRONTIER_STAGES_PER_CHALLENGE` is 7
(`include/constants/battle_frontier.h:57`). For non-Tent play,
`challengeNum = floor(factoryWinStreak / 7)`. Frontier Brain always gets mask
7; ordinary challenges 0-1 get mask 0, 2-3 mask 1, and 4+ mask 7
(`battle_factory.c:889-911`):

| Streak before battle | Challenge | Mask | Scripts |
| --- | ---: | ---: | --- |
| 0-13 | 0-1 | 0 | none |
| 14-27 | 2-3 | 1 | CheckBadMove |
| 28+ | 4+ | 7 | CheckBadMove, TryToFaint, CheckViability |
| any Brain | any | 7 | same three |
| Tent | n/a | 0 | none (outside this mission anchor) |

Production `factoryAiMaskSelection.ts:17-23,126-187` enumerates all masks and
source branches. `submitFactoryAiDecision` dispatches mask 0 to the random
chooser and masks 1/7 to the scored chooser
(`factoryAiDecisionPolicy.ts:1053-1082`). The scored chooser runs CheckBadMove
for mask 1/7 and adds TryToFaint then CheckViability only for 7
(`:676-680,808-870`). Unsupported scoring effects remain explicit barriers.

Every mask first applies `CheckMoveLimitations`, then spends all four setup
draws (`battle_ai_script_commands.c:333-342`). Mask 0 leaves every legal
score at 100, so its final `%numOfBestMoves` draw is a tie across all legal
slots. Mask 1 changes scores through CheckBadMove; mask 7 changes them through
all three scripts. Both scored masks still resolve equal maximum scores with
the same final party-independent tie draw (`:396-445`). The source records the
target's last move before any mask script (`:403-405`): mask 0 does not inspect
that history because it runs no script, CheckBadMove can read known
ability/item facts in mask 1, and mask 7 additionally exposes the same
persistent facts to TryToFaint/CheckViability.

Implemented today: mask selection, move limitations, four setup draws,
mask-0 tie selection, masks 1/7 scoring and branch draws, persistent
used-move/ability/item history. Gated today: the mask-independent switch
precheck; trainer command enumeration exposes only moves; trainer reducer
accepts only a move. Switching does not add new masks, but every mask test must
prove the same precheck occurs before its distinct scoring suffix.

## 7. Staged receipt recipes

All recipes use `mechanicLab.overrides.parties`, Battle Scene OFF, three
complete legal mons per side, and only species with one Gen-3 ability. Give
the non-driving side four copies of one legal move only where the lab requires
AI constraint; otherwise use distinct legal moves. Run each case in a fresh
process because emulator instrumentation state is not safely reusable—the
equal-speed receipt precedent established process isolation.

For attribution, copy the narrow method from
`tools/probe/attribute-factory-ai-random-callers.py`: fast-pass
`sRandCount` per frame; rerun the identical case fresh; single-step only
nonzero-delta frames; record each hit at `Random()+2`, LR, pre/post RNG, return
u16, expression result, chosen action, and `AI_monToSwitchIntoId`. Invoke any
new probe through `python3 tools/run-mgba-probe.py <fresh-output.json> -- ...`.

### A. Absorber, minimal one-draw success

- Player active: Blastoise (Torrent), all relevant decisions constrained to
  WATER_GUN.
- AI party: active Raichu (Static; no SE move versus Blastoise), bench
  Vaporeon (Water Absorb), bench Ditto (Limber). Put Vaporeon at party index 1.
- First let Water Gun land on Raichu. At the next AI command,
  `lastLandedMoves[1]=WATER_GUN`, `lastHitBy[1]=0`.
- Prediction: no active-SE reluctance draw; party 0 skips; party 1 consumes
  exactly one `FindMonThatAbsorbsOpponentsMove+Random()&1`. Choose an isolated
  initial seed whose returned u16 is odd. It emits switch to index 1. Command
  delta **1**, with zero setup/tie draws.
- Control seed: choose an even return. That one draw fails, Ditto is not an
  absorber, and the later ladder continues. Make the Vaporeon moves non-SE
  versus Blastoise so the final NVE helper adds no draw; the command then has
  the ordinary move ledger shifted by exactly +1.

### B. Wonder Guard direct selector

- Player active: Shedinja (Wonder Guard).
- AI active: Vaporeon with Surf/Ice Beam/Toxic/Protect—none is SE against
  Bug/Ghost. Bench Charmander (Blaze) at index 1 with exactly one
  Shedinja-SE move, Flamethrower, placed after three non-SE moves. Third mon
  Ditto (Limber).
- Prediction: active scan zero draws; candidate/move scan reaches
  Charmander's Flamethrower and spends one `%3`. Result 0/1 selects index 1;
  result 2 fails that helper. Successful command delta **1** and no move
  chooser. This pins party-major then move-major order.

### C. Natural Cure sentinel plus deterministic scoring

- Player active: Parasect (Effect Spore), constrain the staging turn to Spore.
- AI active: Swablu (Natural Cure), kept at full HP. Benches: Vaporeon at
  index 1 with Bite, Jolteon at index 2. All named abilities are single in the
  pinned Gen-3 species table.
- After Spore lands, last landed move has power zero. At the next AI command,
  the Natural Cure status-move arm consumes one `Random()&1`. Odd writes the
  sentinel.
- `GetMostSuitableMonToSwitchInto` then consumes zero singles RNG. Against a
  Ghost target variant (use Misdreavus/Perish Song instead of Parasect/Spore
  if isolating scoring), equal type scores tie to party index 1 and Bite
  supplies the SE gate. The selected switch remains deterministic.
- For the pure Perish Song variant, stage Misdreavus's Perish Song until the
  AI timer reaches zero: helper delta **0**, suitable-selector delta **0**,
  switch index 1. This is the clean sentinel/scoring receipt; the Natural Cure
  case separately pins the one/two-draw probabilistic ladder.

No receipt was run in this scout, so none of these predictions is represented
as oracle-accepted fact yet.

## 8. Ordered implementation plan (each rung at most 45 minutes)

### R13-A — pure switch policy and branch receipts (≤45 min)

Add a pure source-shaped switch evaluator over the existing rules context and
generated species/move/type data. Return chosen/sentinel/no-switch plus an
ordered draw receipt and branch receipt. Port §1 in source order, including
modulo-1 draws, party/move scan ordering, Arena Trap's AI quirk, and
single-suitable scoring (§2).

Acceptance:

```sh
npx vitest run tests/factoryAiSwitchPolicy.test.ts
npm test
npm run build
git diff --check
```

Expected ledgers: zero-draw Perish/suitable case; one-draw absorber and Wonder
Guard successes; Natural Cure 1/2-draw cases; active-SE and fallback
multi-candidate continuation. The production rung-6 constraint remains until
wiring; no barrier is retired in this isolated pure rung.

### R13-B — trainer switch kernel surface (≤45 min)

Generalize trainer command enumeration from
`legalMoveDecisions(...,1)` to legal commands, respecting locked moves and the
AI trapping precheck. Generalize `runVoluntarySwitchAction` from battler 0 to
either singles battler, and allow the awaiting-trainer reducer arm to accept a
switch. Preserve source ordering: switches before moves, dual switches in
battler order, no speed-tie draw when either compared action is a switch. A
player move must hit the trainer's incoming mon after the trainer switches.
Reuse the landed switch script/entry hooks from `31826b3b`; do not build a
second switch reducer.

Acceptance:

```sh
npx vitest run tests/factoryBattleScriptFullTurnDecision.test.ts
npx vitest run tests/battleDecisionBoundary.test.ts
npm test
npm run build
```

Expected kernel action delta for an already-chosen non-Pursuit switch: zero
RNG. Retire the comments/guards “trainer voluntary switching is deliberately
out of scope” and “requires ... trainer use-move command.” Preserve or
symmetrically narrow the existing Pursuit interception barrier; do not
silently execute the normal move path.

### R13-C — live driver integration and headline constraint retirement (≤45 min)

Run the R13-A precheck on the original kernel request and shared cursor before
calling the move policy. Submit a successful switch through the original
request/reducer. On no-switch, pass the advanced cursor into the unchanged
mask policy. Delete switch filtering and retire
`factory-ai-switch-precheck-unimplemented`; keep
`frontier-trainer-items-source-unreachable`.

Acceptance:

```sh
npx vitest run tests/factoryAiLiveDriver.test.ts tests/factoryWholeBattle.test.ts
npx vitest run tests/factoryRoundBattleOrchestrator.test.ts
npm test
npm run build
```

Expected ledgers: successful switch totals only precheck `N`; failed precheck
followed by the banked Alakazam/Marowak receipt totals `N+11`; add a 13-draw
scoring carrier proving `N+13`. Exact suffix reasons/order and final cursor
must equal the old receipts advanced from the post-precheck seed.

### R13-D — mask/history breadth and one OFF receipt (≤45 min)

Run the same reachable switch/no-switch fixtures at streaks 0, 14, and 28
(masks 0/1/7) plus Brain override. Pin legal-move limitations, score ties,
multi-candidate party/move ties, helper history after a player switch, and
clear-on-switch behavior for the subsequent scoring command. Bank one
process-isolated OFF receipt from §7 with `sRandCount`/LR attribution and an
explicit `oracleProfile:"battle-scene-off"`.

Acceptance:

```sh
python3 tools/run-mgba-probe.py <fresh-output.json> -- <new-switch-probe>
npx vitest run tests/factoryAiMaskSelection.test.ts tests/factoryAiScoredDecision.test.ts tests/factoryAiLiveDriver.test.ts
npm test
npm run build
bin/oracle info
```

Expected mask-independent successful-switch ledger is identical at all four
policies. Failed-precheck prefixes are identical; only their already-ported
mask scoring suffix differs. This rung closes evidence breadth, not a new
production barrier. Census artifacts should regenerate byte-identically
throughout R13 because no new move/effect/ability/item universe is introduced.
