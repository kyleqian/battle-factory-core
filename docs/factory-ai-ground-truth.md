# Battle Factory AI move-selection: bytecode + live-RNG ground truth

Status: source audit (bytecode-level, one layer deeper than
`docs/factory-ai-boundary-audit.md`) plus three live oracle scenarios staged
via `overrides.parties` (shipped 2026-07-24, `tools/battle-lab/README.md`),
which supersedes the blocker `docs/factory-ai-mask-oracle-probe.md` hit under
the older `overrides.battlers` contract. Source citations are to the pinned
`reference/pokeemerald` at `83df84e40623b79281f2397faa611cbf044170bd` (same
commit as both prior audits). Live citations are to the Battle Scene OFF
oracle (`http://127.0.0.1:8014`). Singles, move-selection only — switch/item
AI and Frontier Brains are out of scope (see the boundary audit for those).

This document answers the open question left by
`docs/hit-chain-ground-truth.md` (the "**+14 more `Random()` calls** ...
next-turn move-selection scoring/tie-break draws", line 119-124) and
`docs/set-move-effect-ground-truth.md` §"one asymmetry worth flagging" (the
"familiar `+14`-ish next-turn AI move-selection scoring pass", line 260-275):
**where exactly those rolls come from, and how many there really are for a
controlled matchup.**

## 1. Source enumeration

### 1.1 Entry point and per-slot script loop

`BattleAI_ChooseMoveOrAction` (`src/battle_ai_script_commands.c:382-394`)
dispatches singles battles to `ChooseMoveOrAction_Singles` (`:396-446`).
Before it runs, `BattleAI_SetupAIData` (`:312-380`) zeroes the entire
`AI_THINKING_STRUCT` (`:312-320`), computes `CheckMoveLimitations` once
(`:322`), and then — in one loop over `i = 0..3` — zeroes the score of any
move-limited slot **and unconditionally draws**
`simulatedRNG[i] = 100 - (Random() % 16)` **for every slot regardless of
that zeroing** (`:333-342`). This is the ordinary global `Random()`/
`gRngValue` LCG (`#include "random.h"`), not a separate generator. Singles
then sets `gBattlerTarget` with no draw (`:357`); the doubles flank-pick
draw (`:350`) is unreachable for Factory singles.

`ChooseMoveOrAction_Singles`'s own loop (`:396-415`) walks the bits of
`AI_THINKING_STRUCT.aiFlags` (the Factory mask) in ascending order and calls
`BattleAI_DoAIProcessing()` once per set bit. `gBattleAI_ScriptsTable[]`
(`data/battle_ai_scripts.s:17-28`) maps bit 0/1/2 to
`AI_CheckBadMove`/`AI_TryToFaint`/`AI_CheckViability`
(`include/constants/battle_ai.h:38-40`), so for Factory mask **7** the three
scripts always run in that fixed order, each **once per legal move slot**
(mask 1 runs only `AI_CheckBadMove`; mask 0 runs none of the three but still
pays the 4 setup draws and the final tie draw, per the boundary audit).

`BattleAI_DoAIProcessing` (`:572-616`) is the per-slot state machine for the
*current* script: for `pp[slot] == 0` it forces `moveConsidered = 0` and
**never invokes the bytecode interpreter** for that slot this pass — no
opcode runs, `score[slot] = 0` is forced directly (`:592-599`) — but this
check only tests live PP, not the legality mask computed once at setup, so a
move that was *legality*-zeroed at setup (Disabled/Taunted/etc. but PP > 0)
still runs the **full** bytecode script every pass, and since `Cmd_score`
has no upper clamp (`score` is `s8`, `include/battle.h:181`) a positive
branch inside `AI_CheckViability`/`AI_TryToFaint` can pull that slot back
above the setup-time zero. This is a genuine native quirk worth flagging for
any future port: native does not re-enforce the legality mask after setup.

### 1.2 Bytecode interpreter and every reachable `Random()` site

`sBattleAICmdTable[]` (`src/battle_ai_script_commands.c:160-261`) is the
99-opcode dispatch table, invoked at `:595`. Grepping every `Random()` call
in this file (10 sites) and in `battle_ai_switch_items.c` (10 sites, all
switch/item-only — not reachable from move scoring) gives the complete
picture. Reachable for Factory singles move-selection:

| Site | Function | Reachability |
| --- | --- | --- |
| `battle_ai_script_commands.c:341` | `BattleAI_SetupAIData` | always — 4 draws, one per slot, unconditional |
| `battle_ai_script_commands.c:445` | `ChooseMoveOrAction_Singles` final tie-break | always — see §1.4, unconditional even for a lone winner |
| `battle_ai_script_commands.c:665` (`Cmd_if_random_less_than`) | interpreter opcode `0x0` | the **only** `if_random_*` variant any Factory script actually emits (`if_random_greater_than`/`_equal`/`_not_equal` have zero uses anywhere in `data/battle_ai_scripts.s`) |
| `battle_ai_script_commands.c:1383` (`Cmd_get_ability`) | ability-guess coin flip | fires when the target's ability is unknown, not an anti-flee trapper, and the species has two distinct abilities; used pervasively via `get_ability AI_TARGET` inside `AI_CheckBadMove` |
| `battle_main.c:4728,4745` (inside `GetWhoStrikesFirst`) | speed-tie coin flip | reached via `if_user_faster`/`if_target_faster` (alias for opcode `0x28`, `Cmd_if_user_goes`), used 24 times across `AI_CheckViability` |

Doubles-only sites (`:350,536,568`) and the Safari-only site (`:2033`) are
confirmed unreachable for `BATTLE_TYPE_FACTORY` singles.

### 1.3 The three scripts themselves

- **`AI_CheckBadMove`** (`data/battle_ai_scripts.s:51-651`) is **fully
  deterministic — zero `if_random_*` instances**. It dispatches on move
  effect (`if_effect` table `:104-214`) into ~100 `AI_CBM_*` handlers, each
  applying a fixed `Score_Minus{1,2,3,5,8,10,12,30}`/`Score_Plus{1,2,3,5,10}`
  (`:600-650`) for conditions like type-immune/ability-nulled moves, sleep
  vs. an already-statused target, stat-change moves at a maxed/minned stage,
  Explosion with no legal target, etc.
- **`AI_CheckViability`** (`:652-2615`) is where almost all of the
  interpreter's `if_random_less_than` budget lives: **130 instances** across
  ~80 named `AI_CV_*` move-effect sub-scripts (one per `EFFECT_*`), each
  gating a small `+1..+4`/`-1..-8` score nudge behind a probability
  (threshold/256). A plain `EFFECT_HIT` move with no named sub-script (e.g.
  Surf, Rock Slide in this doc's own scenario) takes **none** of these
  branches — it only receives whatever deterministic type-effectiveness/
  speed/HP-tier bonus the un-named top-level path applies. `EFFECT_PARALYZE_HIT`
  (Body Slam) **does** dispatch to `AI_CV_Paralyze` (`:1524-1534`, one
  `if_random_less_than 20` at `:1531`), which is the concrete mechanism
  behind §2.2's Body Slam / Surf reversal.
- **`AI_TryToFaint`** (`:2616-2637`) is short: `if_can_faint` (which itself
  calls `AI_CalcDmg`+`TypeCalc`, no fresh `Random()`) branches to either a
  deterministic `+4`/`+6` "can't faint yet, keep attacking" bonus, or — if
  it *can* faint — a `-1` if this isn't the strongest fainting move, then
  **exactly one** `if_random_less_than 80` (`:2625`) gating a `+2` bonus for
  quad-effective (x4) faint attempts specifically. Neither of this doc's
  scenarios reaches x4 effectiveness (Surf is 2x vs pure Ground), so this
  branch's random draw still executes (the opcode always draws) but never
  grants the bonus.

### 1.4 Damage-calc reuse and the final choice rule

`AI_CalcDmg` (`src/battle_script_commands.c:1306-1319`) and the real
move-execution `Cmd_damagecalc` (`:1290-1304`) call the **identical**
`CalculateBaseDamage(...)` (`src/pokemon.c:3106-3372`) — same base-power/
level/atk/def formula, same STAB/weather/item modifiers, same `+2` floor.
`TypeCalc` (`:1536-1592`, used by `Cmd_if_can_faint`/`Cmd_if_cant_faint`) is
likewise the **same** type-effectiveness/STAB function the real hit chain's
`Cmd_typecalc` uses — not the separate, simplified `AI_TypeCalc`
(`:1594-1636`, species-level types, no STAB, no Foresight check) that only
the switch/item heuristics in `battle_ai_switch_items.c` call. The one
deliberate divergence: `AI_CalcDmg`'s crit multiplier is hard-forced to `×1`
(no crit ever assumed), and the 85–100% variance roll is not a fresh
`Random()` — it reuses the **per-slot** `simulatedRNG[i]` value drawn once
at setup (`Cmd_if_can_faint`, `:1760-1764`), applied to every damage
estimate against that slot for the rest of the turn's scoring.

Final choice (`src/battle_ai_script_commands.c:423-446`): `numOfBestMoves`
starts at 1 (slot 0 pre-seeded); for `i=1..3`, a strictly-higher score resets
the best-set to that slot, an *equal* score appends it. The return statement
—

```c
return consideredMoveArray[Random() % numOfBestMoves];
```

— is **unconditional**: there is no `if (numOfBestMoves > 1)` guard anywhere
in the function. This confirms the boundary audit's claim exactly: the
tie-break `Random()` call executes every time, whether there's a real tie or
a lone winner. §2 below verifies this live via roll-count stability, not
just by reading the source.

## 2. Live ledgers

### 2.1 Setup

All three scenarios use `mechanicLab` + `overrides.parties`, challenge band
7 (`GetAiScriptsInBattleFactory`'s "otherwise" branch, `src/battle_factory.c
:889-910` → mask **7**, `CHECK_BAD_MOVE | TRY_TO_FAINT | CHECK_VIABILITY`),
reusing the already-legal-at-band-7 set IDs from
`tools/battle-lab/factory-disobedience-off.json` (`playerSetIds: [659, 675,
402]`, `opponentSetIds: [460, 648, 540]`) since `overrides.parties` only
needs *a* legal base battle at that band, not species-specific legality.

- **Player**: Marowak (pure Ground, `species: 105`), moves = Pound×4
  (`MOVE_POUND` — 100 accuracy, `EFFECT_HIT`, 0 secondary chance — chosen
  specifically so the player's own turn-1 attacker chain is a fixed,
  seed-independent **4 rolls**: accuracycheck (never misses), critcalc,
  adjustnormaldamage, seteffectwithchance (always fails its `%100<0` gate) —
  the same shape `docs/hit-chain-ground-truth.md` Scenario 1 established).
- **Opponent**: Alakazam (pure Psychic, `species: 65` — chosen so none of
  the candidate moves get a same-type-attack bonus, keeping the score gap
  purely about type-effectiveness/power/effect, not STAB).
- Trace: 2×`A` (dismiss send-out), 30 idle, 2×`A` (confirm the only legal
  move, since the player's four slots are identical), then 700 idle frames
  with **no further input** — so turn 2's opponent action is *decided*
  (per `docs/hit-chain-ground-truth.md`'s established finding that the next
  turn's AI decision fires immediately once the current turn's processing
  finishes, without waiting for player input) but never *executed*, cleanly
  separating "decision" from "execution" RNG.
- Fixtures: `tools/battle-lab/mechanic-factory-ai-{unambiguous,tie,
  degenerate}-off.json`. Captures at frames `[0, 100, 300, 732]`.

**Isolation method**: `rngValue` is frozen from frame 100 through frame 300
in every run below (opponent's own turn-1 move has already fully resolved by
frame 100; the player's Pound hasn't started yet). The delta from frame 100
to the final settled frame 732 is therefore *exactly* {player's 4-roll Pound
chain} + {turn 2's AI decision}, with no contaminating end-turn RNG (no
weather/status is active, matching `docs/end-turn-ground-truth.md`'s
near-zero end-turn baseline). The gap is measured by forward-searching the
real Emerald LCG (`gRngValue = 1103515245 * gRngValue + 24691 mod 2^32`,
`reference/pokeemerald/include/random.h:16`) from the frame-100 value until
it lands exactly on the frame-732 value — the same `stepsToReach` technique
`tools/probe/verify-set-move-effect-ground-truth.ts` already uses. Turn 1's
*own* AI decision is **not** observable this way — like every prior ledger
in this codebase, it's already baked into `rngValue` before frame 0 — so
turn 1's contribution is read from its **pick** (opponent PP decrement
between frame 0 and frame 100), and turn 2's contribution is read from its
**roll count** (the isolated frame 100→732 delta minus the known 4-roll
player chain). All numbers below are reproduced live by
`tools/probe/verify-factory-ai-ground-truth.ts`.

### 2.2 Scenario A — unambiguous (`mechanic-factory-ai-unambiguous-off.json`)

Opponent moves: `[MOVE_SURF (57), MOVE_ROCK_SLIDE (157), MOVE_BODY_SLAM (34),
MOVE_THUNDERBOLT (85)]` vs. pure-Ground Marowak: Water is 2x super
effective, Normal is neutral, Rock is resisted (0.5x, Rock's own
not-very-effective-vs-Ground entry), Electric is a **complete immunity**
(0x) — a clean, monotonic type-multiplier ladder with no same-named
`AI_CV_*` handler in play for three of the four (Surf/Rock Slide/Thunderbolt
are plain `EFFECT_HIT`; Body Slam alone is `EFFECT_PARALYZE_HIT`).

| Seed | Turn-1 pick (frame 0→100 PP delta) | Total Random() calls, frame 100→732 | Attributed turn-2 decision rolls (total − 4) |
| -: | --- | -: | -: |
| 1 | slot 0 (Surf) | 19 | **15** |
| 99 | slot 0 (Surf) | 19 | **15** |

Same pick, same roll *count*, both seeds — confirming count stability
independent of the actual `Random()` values drawn (which do differ: e.g.
seed 1's frame-100 `rngValue` is `249678687`, seed 99's is `4009132340`).

**A real, unplanned finding** (kept because it's informative, not because it
was requested): a two-turn follow-on probe (not committed as a fixture,
timing wasn't tunable in the remaining budget — see §4) showed turn 2's
*actual* execution can pick **Body Slam over Surf** once the opponent has
taken some damage, even though nothing about the matchup's typing changed.
This is fully explained by §1.3: Body Slam's `AI_CV_Paralyze` branch grants
it a scoring path Surf's plain-`EFFECT_HIT` handling never gets, so the
"obviously best" move by raw type-effectiveness is not always the game's
actual pick — a real subtlety a future port must reproduce via the named
per-effect handlers, not a raw damage-maximization heuristic.

### 2.3 Scenario B — tie (`mechanic-factory-ai-tie-off.json`)

Opponent moves: `[Surf, Rock Slide, Surf, Thunderbolt]` — slots 0 and 2 are
the literal same move against the same target, so `AI_CheckBadMove`'s and
`AI_CheckViability`'s deterministic paths score them identically; Surf isn't
x4 anywhere here, so `AI_TryToFaint`'s one random branch (§1.3) can't create
a fluke split either — a genuine, guaranteed `numOfBestMoves == 2` tie.

| Seed | Turn-1 pick | Total calls, 100→732 | Attributed turn-2 rolls |
| -: | --- | -: | -: |
| 1 | slot 0 | 19 | 15 |
| 99 | slot 0 | 19 | 15 |

Both tested seeds resolved the tie to slot 0. With only two seeds this
cannot distinguish "always slot 0" from "a fair coin landing the same way
twice" (50% chance by construction) — **honestly flagged as an open
confirmation**, not claimed as proof of bias. What *is* proven: the total
roll count (19, i.e. 15 attributed to the decision) is identical to
Scenario A's non-tied case. Since §1.4 already shows the tie-break call is
unconditional (fires the same whether `numOfBestMoves` is 1 or 2), this live
parity is exactly what the source predicts — a tie doesn't cost an *extra*
roll, it just changes which of the two identical-role calls the modulus
lands on.

### 2.4 Scenario C — degenerate control (`mechanic-factory-ai-degenerate-off.json`)

Opponent moves: `[Surf, Surf, Surf, Surf]` — the four-identical-move pattern
`tools/battle-lab/README.md` calls out as "constrains the Factory AI to one
legal choice without injecting a decision." Confirmed **not** "no AI/RNG":

| Seed | Turn-1 pick | Total calls, 100→732 | Attributed turn-2 rolls |
| -: | --- | -: | -: |
| 1 | slot 1 | 21 | **17** |
| 99 | slot 3 | 21 | **17** |

The scoring pass still runs in full (all 3 scripts × 4 slots + 4 setup
draws + the tie draw) and still draws RNG — 17 per decision here, 2 more
than Scenarios A/B's 15, because every slot now takes the same "is this the
strongest, is it x4" path through `AI_TryToFaint` instead of three of four
slots short-circuiting through a plain, cheaper `EFFECT_HIT` pass. **Turn 1's
pick differs by seed (slot 1 vs. slot 3)** — direct, live proof that the
4-way tie-break genuinely consumes distinguishing entropy from `Random()`
rather than deterministically favoring, say, always the first candidate.

### 2.5 Cross-scenario summary

| Scenario | numOfBestMoves | Turn-2 decision rolls | Notes |
| --- | -: | -: | --- |
| Unambiguous | 1 | 15 | 4 setup + interpreter opcodes across 3 scripts × 4 slots (mostly deterministic paths) + 1 tie draw |
| Tie (2-way) | 2 | 15 | identical count to the unambiguous case — the tie-break call is unconditional either way (§1.4) |
| Degenerate (4-way tie) | 4 | 17 | all four slots take the costlier "could this one faint / is it x4" path |

## 3. Verify script

`tools/probe/verify-factory-ai-ground-truth.ts`
(`node --experimental-strip-types tools/probe/verify-factory-ai-ground-truth.ts`)
reruns all three fixtures at both seeds and checks, PASS/FAIL: determinism
(frame-0 identity across reruns), the frame-100→300 stability window, each
scenario's turn-1 pick, the frame-100→732 total-step count against the
table above, and cross-seed count stability. All PASS at commit time.

## 4. Recommended implementation slices (for the eventual kernel-side AI port)

**Pure scoring (no battle-state mutation, safe to port as a standalone
function of a frozen view):**
- `AI_CheckBadMove` in full — zero RNG, purely a function of (move, user,
  target, field) as already exposed by `docs/factory-ai-boundary-audit.md`'s
  read-dependency table. The cleanest first slice: no `if_random_*`, no
  crit/damage estimation, just table lookups and comparisons.
- The 4 setup `simulatedRNG` draws and the final `Random() % numOfBestMoves`
  tie-break — both trivial, already fully characterized (§1.1, §1.4), and
  both **must** be modeled as ordinary attributable draws on the same
  `gRngValue` stream the rest of the kernel uses (this doc's live ledgers
  are the pin for "how many, in what order, relative to what else").
- `AI_CheckViability`'s ~80 `AI_CV_*` handlers, **once the move-effect
  dispatch and damage/type helpers below exist** — each handler itself is a
  short, pure function of (move, user, target, field, one `simulatedRNG`
  slot) plus at most a handful of `if_random_less_than` draws. This is the
  single largest body of work (130 random branch points across ~80 named
  effects) but is uniformly pure once its inputs are supplied; a partial
  port (only the effects the current move roster actually needs) is a
  reasonable phased boundary, matching the existing effect-by-effect
  registration discipline this run already uses for the hit-chain opcodes.
- `AI_TryToFaint` — short, pure given `AI_CalcDmg`/`TypeCalc` results.

**Needs battle-state / kernel machinery the context doesn't model on its
own (must be injected, not reimplemented):**
- `AI_CalcDmg`/`TypeCalc` themselves — confirmed (§1.4) to be the *same*
  formula as real move execution (`CalculateBaseDamage`, the real
  `TypeCalc`), so the port must **call the kernel's existing damage/type
  pipeline** with the crit forced to ×1 and the variance roll replaced by
  the pre-drawn per-slot `simulatedRNG` value — not a second, hand-rolled
  copy of the damage formula. Reusing exactly what
  `docs/hit-chain-ground-truth.md`'s damage arithmetic already ports avoids
  a formula-drift bug class entirely.
- `Cmd_get_ability`'s unknown-ability coin flip and the `GetWhoStrikesFirst`
  speed-tie draws (§1.2) — both depend on `BattleHistory` (known-information
  state, `docs/factory-ai-boundary-audit.md` §"Known information versus
  omniscient state") and live stat/stage state respectively; these are
  legitimate additional `Random()` sites a full port must attribute, but
  they're conditionally reached (path-dependent on the actual matchup), so
  they can't be pinned by a fixed roll-count constant the way the setup/
  tie-break draws can.
- The move-limitation legality mask and its **not-re-enforced-after-setup**
  quirk (§1.1) — this is native engine behavior the kernel must reproduce
  exactly (a Disabled move can still out-score its setup-time zero), not
  something a pure policy function can decide on its own; it needs the
  kernel's own `CheckMoveLimitations` equivalent as an injected input,
  called only once, matching native's timing.
- The turn-to-turn scoring drift observed in §2.2 (Body Slam overtaking Surf
  once the AI has taken damage) is **not** a bug in the live ledger — it is
  the real `AI_CV_Paralyze`/similar per-effect handlers reacting to
  something in the current battle state (HP tier, stat stages, or simply a
  fresh set of `if_random_less_than` draws for that turn's script pass).
  A future two-turn ground-truth pass should pin down which, with a trace
  whose message-length timing is tuned per scenario rather than reused
  wholesale from a single-turn baseline (this run's own §2.2 caveat).

**Explicitly out of scope for this document** (per the assigned step):
switch/item AI (already covered by the boundary audit, unchanged here),
doubles branches, Frontier Brain masks (0 uses the same setup/tie-break
plumbing but never enters any of the three named scripts), and any src/
implementation of the policy itself.

## 2026-07-25 — port-subset audit (settles the exactly-bounded first slice)

Status: read-only source/artifact audit for the upcoming main-lane port; no
src/ changes. Re-verified §2's live ledgers by rerunning
`tools/probe/verify-factory-ai-ground-truth.ts` against the running Battle
Scene OFF oracle this session — **ALL PASS**, same 15/15/17 attributed-roll
counts as originally banked, confirming the numeric ledgers in §2.2-2.4
still hold. This section also finds and corrects two source-level errors in
§1.3/§2.2's *prose explanation* of those numbers — the counts are right, the
named mechanism wasn't. Both are cited against
`reference/pokeemerald@83df84e40623b79281f2397faa611cbf044170bd`.

### 0. Two corrections to §1.3/§2.2, verified against source this session

1. **Scenario A's moves are not "Surf/Rock Slide/Thunderbolt = plain
   EFFECT_HIT, Body Slam alone = EFFECT_PARALYZE_HIT."** Direct read of
   `reference/pokeemerald/src/data/battle_moves.h`: `MOVE_SURF` (57) is
   `EFFECT_HIT`, but `MOVE_ROCK_SLIDE` (157) is `EFFECT_FLINCH_HIT`
   (:2046) and `MOVE_THUNDERBOLT` (85) is `EFFECT_PARALYZE_HIT` (:1110) —
   the *same* effect as Body Slam (:447), not `EFFECT_HIT`.
2. **None of the four opponent moves in any of the three banked scenarios
   reach a named `AI_CBM_*`/`AI_CV_*` handler at all** — including Body
   Slam, which §1.3/§2.2 claims dispatches to `AI_CV_Paralyze`. Grepping
   `data/battle_ai_scripts.s` for `EFFECT_PARALYZE_HIT`/`EFFECT_FLINCH_HIT`
   in either script returns **zero matches** (confirmed: neither
   `AI_CheckBadMove`'s nor `AI_CheckViability`'s `if_effect` dispatch chain
   has an entry for either effect; `EFFECT_PARALYZE` at `:704`, which does
   map to `AI_CV_Paralyze`, is Thunder-Wave-class pure status, a different
   effect ID from Thunderbolt/Body Slam's `EFFECT_PARALYZE_HIT`).
   `Cmd_if_effect` (`src/battle_ai_script_commands.c:1667-1673`) is a plain
   `==` against `gBattleMoves[moveConsidered].effect`, so there is no
   partial/family match that could route `EFFECT_PARALYZE_HIT` into
   `EFFECT_PARALYZE`'s handler. All four of Scenario A's moves (and by
   extension B's and C's, which reuse the same four) fall straight through
   both scripts' entire `if_effect` chain to each chain's trailing `end`
   (`data/battle_ai_scripts.s:776` for `AI_CheckViability`) — **zero
   named-handler score contribution, zero named-handler `Random()` draws**,
   for all 12 move-slots across the three fixtures. The real "Body Slam can
   overtake Surf" mechanism (§2.2's flagged finding) is therefore *not*
   `AI_CV_Paralyze` reacting to anything — it must come from
   `AI_CheckBadMove`'s un-named preamble and/or `AI_TryToFaint`'s
   damage-estimate ranking (both described below), which do differentiate
   the four moves. Re-deriving *exactly* which is genuinely the §4 two-turn
   drift follow-up this doc already named as future work; this session
   only had budget to confirm the wrong mechanism was named, not to name
   the right one with the same live-ledger rigor as §2.

Two secondary, source-confirmed corrections worth carrying into a port
(neither changes any banked number, both are "the doc's prose was
imprecise about *when* a draw fires," not "the count is wrong"):

- `Cmd_if_can_faint` (`:1741-1764`) **jumps to its operand label when the
  move CAN faint the target** (`gBattleMons[target].hp <=
  gBattleMoveDamage`), landing on `AI_TryToFaint_TryToEncourageQuickAttack`
  — the `+4`/`+2` "go for it" branch. Only the *fallthrough* (cannot faint)
  reaches the `-1 if not strongest` check and the `if_type_effectiveness
  x4` gate; the `if_random_less_than 80` draw only executes on that
  fallthrough path **and** only when effectiveness is exactly x4
  (`data/battle_ai_scripts.s:2616-2637`). It is not, as §1.3 states, an
  unconditional once-per-slot draw — it is reachable only for a
  can't-currently-faint, exactly-x4-effective candidate.
- `Cmd_get_ability` (`src/battle_ai_script_commands.c:1667+`, exact fn
  `:~1383` per §1.2) **never caches its coin-flip guess** —
  `BATTLE_HISTORY->abilities[target]` is read but never written by this
  command, so every `get_ability AI_TARGET` call redraws fresh if the
  target's ability is still unrecorded, even multiple times within the
  same slot's `AI_CheckBadMove` pass (`get_ability AI_TARGET` appears twice
  in `AI_CheckBadMove`'s own preamble alone: the ability-negation block at
  `:60` and the Soundproof block at `:90`, both reachable per-slot whenever
  `if_type_effectiveness AI_EFFECTIVENESS_x0` doesn't short-circuit past
  them). For Scenario A, Marowak (the target) has two distinct abilities
  (Rock Head/Lightning Rod), so this is very likely the dominant
  contributor to the 15/17 attributed rolls the existing doc under-credits
  to "interpreter opcodes across 3 scripts x 4 slots" without singling it
  out. This redraw-every-call behavior is itself a real port hazard: a
  naive "guess once per battler" cache would under-draw relative to
  native.

### 1. Mask per challenge band 0-7 (`GetAiScriptsInBattleFactory`,
`src/battle_factory.c:889-911`)

Source-verified branch table (also mechanically preserved by
`src/data/gen/factory-ai-policy.json`'s 5 `branches` entries and 13
`aiScriptFlags`, cross-checked live: `python3 -c` load of that JSON this
session reproduces exactly this table):

| Input | Mask | Scripts |
| --- | -: | --- |
| `lvlMode == FRONTIER_LVL_TENT` (any band) | 0 | none |
| `gTrainerBattleOpponent_A == TRAINER_FRONTIER_BRAIN` (any band) | 7 | CheckBadMove, TryToFaint, CheckViability |
| challenge band 0 or 1 (`challengeNum < 2`) | 0 | none |
| challenge band 2 or 3 (`challengeNum < 4`) | 1 | CheckBadMove only |
| challenge band 4, 5, 6, 7 (and beyond — no upper clamp in source) | 7 | CheckBadMove, TryToFaint, CheckViability |

Mask 0 is not "no AI" — setup (4 `simulatedRNG` draws) and the final tie
`Random()%numOfBestMoves` still run unconditionally (§1.1/§1.4, confirmed
unchanged this session).

**The three banked fixtures**: all three (`mechanic-factory-ai-{unambiguous,
tie,degenerate}-off.json`) set `"challengeNum": 7` directly (verified by
reading each fixture's JSON this session) — **all three ran under mask 7**,
the same branch a Frontier Brain match would use. No banked scenario
currently exercises mask 0 or mask 1 (an ordinary band-2/3 trainer). That is
a real coverage gap for validating a CheckBadMove-only port slice against a
live ledger, flagged for whoever picks this up next — cheap to fill (same
`overrides.parties` recipe, `challengeNum: 2` or `3`).

### 2. Per-scenario handler set and CheckBadMove/CheckBadMove+TryToFaint reproduction

Per §0(2): **zero `AI_CBM_*`/`AI_CV_*` named handlers fire in any of the
three banked scenarios** — every move-slot in all three fixtures takes the
fully generic path through both scripts. That collapses what "exact handler
set" means for these three ledgers specifically:

| Scenario | Handler set actually exercised (branch-aware) |
| --- | --- |
| Unambiguous | `AI_CheckBadMove` universal preamble only (`if_type_effectiveness x0`→immunity `Score_Minus10` for Thunderbolt; `get_ability AI_TARGET` redrawn ≥2x/slot for the 3 non-immune slots per §0; Soundproof list, all false) + `AI_TryToFaint`'s un-named `if_can_faint`/`-1`-if-not-strongest/x4-gated-`if_random_less_than 80` path, every slot + setup(4) + tie(1). No `AI_CV_*` handler reached (CheckViability's `if_effect` chain misses all 4 effects, falls to its trailing `end`, contributing 0 score / 0 draws). |
| Tie | Identical handler set to Unambiguous, per-slot (slots 0/2 are the literal same move, so identical CBM/TryToFaint results by construction — that's *why* they tie, not a CV-level tie-break). |
| Degenerate | Identical handler set again, but all 4 slots are Surf (non-immune, no ability-negation) — so the only per-slot differentiator is `AI_TryToFaint`'s damage estimate using each slot's distinct `simulatedRNG[i]` from setup, consistent with the doc's own observed seed-dependent turn-1 pick (slot 1 vs slot 3). |

**Reproduction verdict** (the specific ask: does any banked scenario
reproduce under a phased port?):

- **CheckBadMove-only (mask 1 shape): NO**, not for the final *pick*.
  `AI_CheckBadMove`'s universal preamble only ever produces `Score_Minus10`
  (type-immune) or `Score_Minus12` (ability-negated) — it has no branch
  that rewards a merely-better-than-neutral type multiplier (0.5x vs 1x vs
  2x are all untouched by the preamble, and none of the 4 moves' effects
  reach a named `AI_CBM_*` handler that could add more). Scenario A under
  CheckBadMove-only would score Thunderbolt at -10 and Surf/Rock
  Slide/Body Slam all at 0 — a **3-way tie**, not native's clean
  "Surf wins" pick. The roll *count* would also differ (no TryToFaint/CV
  passes at all, but CBM's own `get_ability` redraws still fire).
- **CheckBadMove + TryToFaint (no CheckViability): YES**, for both pick and
  roll count, for **all three** banked scenarios. Since CheckViability is
  proven (§0(2)) to contribute exactly zero score and zero draws to every
  move in all three fixtures, a port that implements CheckBadMove +
  TryToFaint in full and stubs CheckViability entirely is
  indistinguishable from the full mask-7 native behavior for these
  specific ledgers. This is the load-bearing finding for §4's
  recommendation below.

### 3. `AI_CV_*` handlers reachable given the current 122-move executable
roster (not 144 — see note)

**Note on the brief's "144 executable moves" figure**: current
`docs/executable-frontier-census.md` (regenerated at commit `abcf93e`,
same session as this doc's last PROGRESS entry) reports **122** executable
moves (355 total; 92 unweighted / 1099 weighted Factory-L50). No occurrence
of "144" exists anywhere in that census doc or its generating tool's output
at any prior commit checked (`b4b9f42`: 105; `2398407`: 74). Recording both
per VERIFY-DON'T-ASSUME: the brief's number appears stale or mistaken;
**122 is what's live on this branch right now** and is what the table below
uses.

Method: parsed all 122 `if_effect EFFECT_X, AI_CV_Y` lines inside
`AI_CheckViability` (`data/battle_ai_scripts.s:652-2615`; a plain `==`
dispatch per §0), grouped by handler (**90 unique `AI_CV_*` handlers** —
the doc's own "~80" in §1.3 was a rough estimate, 90 is the exact count),
and cross-referenced each triggering `EFFECT_*`'s executable/blocked
classification and move count directly from
`docs/executable-frontier-census.md`'s per-effect table (confirmed: summing
its `Moves` column across all 214 effect rows = 355 exactly, so it's a
clean partition safe to join against).

**Headline**: of 90 `AI_CV_*` handlers, only **16** have at least one
currently-executable move that would select them; those 16 cover **48** of
the roster's 122 executable moves (the remaining 74 executable moves — Surf/
Rock Slide/Thunderbolt/Body Slam's own effects among them, per §0 —have no
named `AI_CV_*` handler at all and take the zero-contribution generic
path). Across the full 355-move game, those same 16 handlers cover 53 moves
(vs 48 today) — registering the rest of the roster barely moves these 16's
own reach; the real full-game payoff is in the other 74 handlers this
roster doesn't touch yet. Per-handler figures (executable-roster vs
full-355) below are what matters for scoping:

| Handler | Triggering `EFFECT_*` | Executable-roster moves | Full-355 moves | Size class |
| --- | --- | -: | -: | --- |
| `AI_CV_AlwaysHit` | `EFFECT_ALWAYS_HIT` | 6 | 6 | trivial (5 instr, 0 `if_random`) |
| `AI_CV_HighCrit` | `EFFECT_HIGH_CRITICAL`, `EFFECT_BLAZE_KICK`, `EFFECT_POISON_TAIL` | 10 | 10 | multi-branch, 1 `if_random_less_than` |
| `AI_CV_DefenseUp` | `EFFECT_DEFENSE_UP(_2)`, `EFFECT_BULK_UP` | 5 | 6 | multi-branch, 1 `if_random` |
| `AI_CV_AccuracyDown` | `EFFECT_ACCURACY_DOWN(_2)` | 4 | 4 | trivial (2 instr, 0 `if_random`) |
| `AI_CV_AttackUp` | `EFFECT_ATTACK_UP(_2)` | 4 | 4 | multi-branch, 1 `if_random` |
| `AI_CV_AttackDown` | `EFFECT_ATTACK_DOWN(_2)` | 3 | 3 | trivial (4 instr, 0 `if_random`) |
| `AI_CV_DefenseDown` | `EFFECT_DEFENSE_DOWN(_2)`, `EFFECT_TICKLE` | 3 | 4 | trivial (2 instr, 0 `if_random`) |
| `AI_CV_SpeedDown` | `EFFECT_SPEED_DOWN(_2)` | 3 | 3 | trivial (3 instr, 0 `if_random`) |
| `AI_CV_SpAtkUp` | `EFFECT_SPECIAL_ATTACK_UP(_2)` | 2 | 2 | multi-branch, 1 `if_random` |
| `AI_CV_SpDefDown` | `EFFECT_SPECIAL_DEFENSE_DOWN(_2)` | 2 | 2 | trivial (2 instr, 0 `if_random`) |
| `AI_CV_SpDefUp` | `EFFECT_SPECIAL_DEFENSE_UP(_2)`, `EFFECT_COSMIC_POWER`, `EFFECT_CALM_MIND` | 1 | 3 | multi-branch, 1 `if_random` |
| `AI_CV_SpeedUp` | `EFFECT_SPEED_UP(_2)` | 1 | 1 | trivial (3 instr, 0 `if_random`) |
| `AI_CV_EvasionUp` | `EFFECT_EVASION_UP(_2)`, `EFFECT_MINIMIZE` | 1 | 2 | multi-branch, 1 `if_random` |
| `AI_CV_EvasionDown` | `EFFECT_EVASION_DOWN(_2)` | 1 | 1 | trivial (2 instr, 0 `if_random`) |
| `AI_CV_VitalThrow` | `EFFECT_VITAL_THROW` | 1 | 1 | multi-branch, 1 `if_random` |
| `AI_CV_Pursuit` | `EFFECT_PURSUIT` | 1 | 1 | trivial-ish (11 instr, but 0 `if_random` — purely deterministic branching) |

9 of these 16 are fully deterministic (0 `if_random_less_than`); 7 gate a
single `+1..+3`-class score nudge behind one probability roll. None come
close to the ~130-draw, 80-handler mass §1.3 describes for the *full*
355-move roster — the current executable roster only exercises **7 total
`if_random_less_than` sites** across all reachable `AI_CV_*` handlers. The
other 74 `AI_CV_*` handlers (Sleep, Absorb, SelfKO/Explosion, Paralyze,
Toxic, Trap, OHKO, etc. — the effects with real move-selection weight in
the actual game) stay unreachable until their own `EFFECT_*` gets
registered per the existing effect-by-effect discipline; §1.3's "~80
handlers, 130 draws" estimate is the honest full-game target, this
section's 16/7 is what a port needs *today*.

### 4. Recommended first main-lane port slice

**Port now** (proven sufficient for all 3 banked ledgers, §2):
1. Setup: `CheckMoveLimitations`-equivalent (kernel-owned, already a
   defined boundary per `docs/factory-ai-boundary-audit.md`) + the 4
   `simulatedRNG[i] = 100 - Random()%16` draws, one per slot, unconditional
   — including PP-legal-but-limited slots.
2. `AI_CheckBadMove`'s universal preamble in full: the `if_type_effectiveness
   x0`→`Score_Minus10` immunity check, the 5 ability-negation branches
   (Volt/Water Absorb, Flash Fire, Wonder Guard, Levitate,
   `Score_Minus12`/`Score_Minus10`), and the Soundproof 9-move list —
   **including** `get_ability`'s no-cache redraw-per-call semantics (§0),
   which is load-bearing for roll-count parity, not an optional detail.
3. `AI_TryToFaint` in full: `if_can_faint` (delegates to the kernel's
   `AI_CalcDmg`/`TypeCalc` — the *same* `CalculateBaseDamage`/`TypeCalc`
   real move execution uses, crit forced x1, variance = that slot's
   `simulatedRNG`, per §1.4, unchanged this session) → the can-faint
   `+4`/`+2` branch, or the cannot-faint `-1`-if-not-strongest +
   x4-gated-`if_random_less_than 80` branch (§0's corrected reading).
4. The final `Random() % numOfBestMoves` tie-break, unconditional.
5. **Stub `AI_CheckViability` entirely** behind a named barrier (e.g.
   `unsupported-branch: factory-ai-check-viability`) that fires whenever a
   scored move's effect has *any* `if_effect` entry in
   `AI_CheckViability`'s dispatch chain (the 90-handler set from §3, not
   just the 16 currently reachable — a future move registration could add
   an effect this port doesn't yet know) — this is honest per the ratchet
   discipline (`tests/executableFrontierRatchet.test.ts`) rather than
   silently no-op'ing forever.
6. **Also barrier, not silently skip, any move whose effect has a named
   `AI_CBM_*` handler** in `AI_CheckBadMove`'s own `if_effect` chain
   (`:104-214`) — none of the 3 banked ledgers reach one, but the current
   roster almost certainly has moves that do (Sleep/Explosion/DreamEater/
   stat-changers/etc. are named `AI_CBM_*` targets); porting only the
   universal preamble and claiming "CheckBadMove is done" would be wrong
   the moment such a move enters a Factory rental set. Sizing that barrier
   precisely (how many of the current 122 executable moves hit a named
   `AI_CBM_*` handler) is a same-shape follow-up to §3's CV table this
   session didn't have budget to also produce — flagged, not done.

**Must reproduce end-to-end**: all three of
`mechanic-factory-ai-{unambiguous,tie,degenerate}-off.json` at both banked
seeds (1 and 99) — same turn-1 pick, same frame-100→732 total step count
(19/19/21 per §2's table), matching `tools/probe/verify-factory-ai-ground-
truth.ts`'s existing PASS criteria (that script is already the right
acceptance harness — no new fixture needed for this slice).

**Expected Random() attribution for the slice**: 4 (setup) + a
per-move-per-slot `get_ability` redraw count that is now known to be
real but not yet exactly re-derived (§0 flags this precisely — it's the
concrete gap between "the count reproduces" and "the doc explains the
count") + 0-1 per slot from `AI_TryToFaint`'s x4 gate + 1 (final tie) = the
already-banked 15/15/17 totals. A worker landing this slice should expect
to spend real budget instrumenting `get_ability`'s call count per slot
(cheapest path: a one-off console-log build or an mGBA probe counting
`Random()` call sites by return address, not further live-ledger
guessing) before wiring the port's own RNG draw count, or the port will
get the *pick* right and the *draw count* wrong — silently correct on
score, silently wrong on RNG stream position for whatever runs after it
in the turn.

**Honest sizing for a 60-minute worker**: items 1-4 + 6's barrier
(CheckBadMove's universal preamble, TryToFaint, setup/tie, one named
CBM-handler barrier) is a reasonable single slice — it's the same
shape (kernel-injected pure policy calling existing damage/type helpers,
per the boundary audit) as recent hit-chain opcode registrations this run
has already landed repeatedly. Item 5 (CheckViability stub) is cheap
(one barrier, zero new logic) *as long as it stays a stub* — do **not**
scope in any `AI_CV_*` handler implementation this round; §3 shows that's
a genuinely separate, much larger body of work (16 handlers reachable
today, 90 at full registration) that deserves its own phased slices per
handler, exactly like the existing effect-by-effect opcode registration
discipline. The `get_ability` redraw-count gap above is the one piece of
real risk in the 60-minute estimate — budget the first 10-15 minutes of
that session to nailing it down before writing port code, or size it out
as its own follow-up if it doesn't fit.

## 2026-07-25 — instrumented caller attribution closes PROGRESS entry 455's
"2-roll gap" (§5, this session)

Status: read-only instrumented-probe audit, no src/ changes. Entry 455
(previous session) reached a live-data-driven model of **13** AI-decision
`Random()` draws (setup 4 + `Cmd_get_ability` 6/8 + `ShouldSwitch`'s
switch-AI pre-check 2 + tie-break 1) against the pinned **15/15/17**
attributed totals for `mechanic-factory-ai-{unambiguous,tie,
degenerate}-off.json` — a 2-roll-per-scenario gap, with paper tracing
exhausted. This section closes it by instrument: every `Random()` call in
each fixture's frame-100→732 window, tagged with its exact caller function
by reading the ARM link register at the moment of entry into `Random()`.

### 0. Method — a live-fire exec-breakpoint attempt segfaulted; the fallback used instead

A hardware execution breakpoint (`lib.mDebuggerCreate(lib.DEBUGGER_CLI, core)`
+ `lib.mDebuggerAttach(...)`, `vendor/libmgba-py/mgba/debugger.py`'s
`NativeDebugger.set_breakpoint`) was tried first — `mDebuggerCreate` only
returns a non-NULL debugger for `DEBUGGER_CLI`/`DEBUGGER_GDB` in this build
(`DEBUGGER_CUSTOM`/`DEBUGGER_NONE` both return NULL), but `mDebuggerAttach`
with the CLI debugger **segfaults immediately (exit 139)**, before any
breakpoint fires, on this libmgba-py build. Not pursued further given the
budget — worth flagging for whoever next needs exec breakpoints on this
harness.

The fallback actually used, per this step's own brief:
1. **Fast pass, no single-stepping.** `src/random.c:5,14` defines
   `EWRAM_DATA static u32 sRandCount`, incremented unconditionally on every
   `Random()` call (confirmed by disassembling `Random()` itself,
   `0x0806f5cc`-`0x0806f5e4`: the second counter store at
   `0x0806f5da-0x0806f5e0`, address `0x020249c0`, cross-checked against
   `arm-none-eabi-nm`). This is real, already-shipped source instrumentation,
   not a probe-injected hack — a single RAM read before/after each
   `oracle.advance()` gives an **exact** per-frame draw count at full
   emulation speed, no LCG inversion needed. Driving the identical
   `mechanicLab` staging `verify-factory-ai-ground-truth.ts` already uses
   (`BattleLab(oracle, "battle-scene-off").prepare(request)` with the
   fixture's own JSON as the request body) and summing `sRandCount` deltas
   over frames 101-732 reproduces the pinned totals exactly: **19/19/21**.
2. **Targeted single-step pass.** Pass 1 flags only a handful of frames per
   fixture as nonzero (13 of ~632 for unambiguous/tie, 13 for degenerate) —
   single-stepping is bounded to just those, not the whole window. Fresh
   session, fast-forward via `oracle.advance()` through unflagged frames,
   `core.step()` (one ARM/Thumb instruction) through flagged ones, reading
   `core.cpu.pc`/`core.cpu.lr` at each step. **Load-bearing gotcha**:
   libmgba-py's `cpu.pc` reads the *pipelined* PC (Thumb: executing-
   instruction address **+2**, the same convention real ARM7TDMI code relies
   on for PC-relative literal-pool loads) — empirically confirmed by
   single-stepping `Random()`'s own 13-instruction body and observing
   `cpu.pc` visit `0x0806f5ce..0x0806f5e6`, every value shifted +2 from the
   real instruction addresses. The entry check must therefore compare
   against `RANDOM_ADDR + 2`, not `RANDOM_ADDR`; comparing against the raw
   symbol address silently finds zero hits despite `sRandCount` changing.
   Each hit's LR is bisected against a full local+global function symbol
   table (`arm-none-eabi-nm --defined-only -n reference/pokeemerald/
   pokeemerald.elf`, sections `t`/`T` — this, not the linker map, is what
   resolves *static* functions like `Cmd_get_ability`/`ShouldSwitch` that
   `bin/oracle symbols`/`pokeemerald.map` don't carry).

Pass-1 and pass-2 totals match exactly for all three fixtures (19/19/21),
and the two passes are independent runs (separate fresh `EmeraldOracle`
sessions) — this is a real reconciliation, not a tautology.

Probe: `tools/probe/attribute-factory-ai-random-callers.py`. Invocation
(one fixture; swap the filename for the other two):
```
python3 tools/run-mgba-probe.py /tmp/factory-ai-callers-unambiguous.json -- \
    /Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python \
    tools/probe/attribute-factory-ai-random-callers.py \
    tools/battle-lab/mechanic-factory-ai-unambiguous-off.json \
    /tmp/factory-ai-callers-unambiguous.json
```
Runs in ~7-8s per fixture (single-stepping is bounded to the ~13 flagged
frames, not the ~632-frame window).

### 1. Ordered caller table — unambiguous (identical shape for tie; degenerate differs only in `get_ability` count/ticks)

| Tick | Caller | Count | Role |
| -: | --- | -: | --- |
| 366 | `Cmd_seteffectwithchance+0x81` (`battle_script_commands.c:2923`) | 1 | **turn 1**, opponent's own trailing Surf hit-chain draw (see §2) |
| 378 | `Cmd_accuracycheck+0x305` | 1 | turn 1, player's Pound chain |
| 400 | `Cmd_critcalc+0x127` | 1 | turn 1, player's Pound chain |
| 403 | `Cmd_adjustnormaldamage+0x7` | 1 | turn 1, player's Pound chain |
| 507 | `Cmd_seteffectwithchance+0x81` | 1 | turn 1, player's Pound chain (4th roll) |
| 517 | `BattleTurnPassed+0x157` (`battle_main.c:4013`) | 1 | **new site**, per-turn `gRandomTurnNumber` draw (see §3) |
| 522 | `FindMonThatAbsorbsOpponentsMove+0x1d` | 1 | switch-AI pre-check (entry 455's own finding) |
| 522 | `HasSuperEffectiveMoveAgainstOpponents+0x85` | 1 | switch-AI pre-check (entry 455's own finding) |
| 524 | `BattleAI_SetupAIData+0x83` | 4 | setup `simulatedRNG[i]` draws (§1.1) |
| 524-528 | `Cmd_get_ability+0x9d` | 6 | `AI_CheckBadMove` ability-guess redraws (§0(2)) |
| 531 | `ChooseMoveOrAction_Singles+0xf7` | 1 | final tie-break (§1.4) |

Sums to **19**, exactly matching `sRandCount`'s own frame-100→732 delta and
the pinned total — every draw in the window is now named, with zero
unattributed remainder. Tie and degenerate reproduce the identical shape
(`orderedCallerTable` in each fixture's probe output): tie is
tick-for-tick identical to unambiguous; degenerate shifts every tick by
+2 (its own setup route takes 2 frames longer) and draws `Cmd_get_ability`
8 times instead of 6 (2 per slot × 4 non-immune slots instead of 3, per
entry 455's already-confirmed model), reconciling to 21.

### 2. What `Cmd_seteffectwithchance`'s second appearance actually is

Reading `gCurrentMove`/`gBattlerAttacker` (`bin/oracle symbols gCurrentMove
gBattlerAttacker`) at tick 366 shows `gCurrentMove=57` (`MOVE_SURF`),
`gBattlerAttacker=1` (the **opponent's** battler slot) — this is not a
second player draw, nor a new AI-decision site: it is the **opponent's own
turn-1 Surf attack's trailing secondary-effect-chance check**, the same
`Cmd_seteffectwithchance` instance any `EFFECT_HIT` move takes once per
real execution (`battle_script_commands.c:2908-2935`; Surf's own 0%
secondary chance means the `Random()%100 < 0` gate always fails, same
shape as Pound's). At tick 403/508, `gCurrentMove=1` (`MOVE_POUND`),
`gBattlerAttacker=0` (the **player**) confirms ticks 378-507 are the
player's own Pound chain exactly as already established. §2.1's isolation
claim ("opponent's own turn-1 move has already fully resolved by frame
100") is therefore imprecise in one respect: the RNG-relevant portion of
the opponent's move *is* done by frame 100 (rngValue is provably stable
100→300), but the same script's trailing, RNG-consuming
`seteffectwithchance` opcode is delayed until tick 366 by ordinary
message-print pacing (many frames of text-scroll between damage-applied
and the secondary-effect check, a pattern already established elsewhere in
this codebase's own hit-chain ground truth). The original doc's
`totalSteps - 4` subtraction (§2.2-2.4, `verify-factory-ai-ground-
truth.ts`'s `PLAYER_CHAIN_ROLLS`) assumed exactly one
`Cmd_seteffectwithchance` draw in the window; there are actually two, and
the subtraction silently folds the extra (opponent-tail) one into what it
labels "turn-2 decision rolls" even though it is a turn-1 draw with zero
relationship to the AI's move-selection scoring.

### 3. The genuinely new site: `BattleTurnPassed`'s per-turn `gRandomTurnNumber` draw

`battle_main.c:4013`, inside `BattleTurnPassed` (the turn-cleanup function
that transitions from "turn N finished" to `HandleTurnActionSelectionState`
for turn N+1): `gRandomTurnNumber = Random();` — **unconditional**, for
every turn of every battle type, executed *before* the
`BATTLE_TYPE_PALACE`/`BATTLE_TYPE_ARENA` checks that follow it. This site is
outside both files §1.2's source enumeration grepped
(`battle_ai_script_commands.c`, `battle_ai_switch_items.c`), so the original
doc never had a chance to find it — it isn't AI code at all, it's core
turn-passage bookkeeping in `battle_main.c`.

`gRandomTurnNumber` is **not** decoration: `GetWhoStrikesFirst`
(`battle_main.c:4653,4687`, already named in §1.2's table as the speed-tie
site) reads it for the `HOLD_EFFECT_QUICK_CLAW` check
(`gRandomTurnNumber < (0xFFFF * holdEffectParam) / 100` forces
`speedBattler = UINT_MAX`, i.e. guaranteed-first if the roll succeeds), and
`BattleScript_PalacePrintFlavorText`/arena-turn-counter logic consume it for
`BATTLE_TYPE_PALACE`/`BATTLE_TYPE_ARENA`. For these 3 fixtures specifically
it is provably inert: `oracle/battle_lab.py:839`'s custom-party builder
defaults every mon's `item` to `0` (`ITEM_NONE`) when the fixture doesn't
specify one, and none of the 3 fixtures' 6 party slots (per each fixture's
own `overrides.parties`) specify an item — no Quick Claw holder exists in
any banked scenario, and Battle Factory is `BATTLE_TYPE_FRONTIER`, never
Palace/Arena. So the draw fires, shifts `gRngValue`, and its *result* is
read by nothing, for these specific ledgers. A future fixture with a
Quick-Claw-holding rental mon would make this draw's value genuinely
decision-relevant (to turn order, not to the AI's move scoring itself).

### 4. VERDICT

**Entry 455's own 13-draw AI-decision model was already correct** — the
"2-roll gap" was never inside the AI's scoring logic. The 2 missing rolls
are:

1. `Cmd_seteffectwithchance`'s second, opponent-tail instance (tick 366) —
   not a new site, a **window-accounting artifact**: the doc's own
   `totalSteps - PLAYER_CHAIN_ROLLS` subtraction assumed one
   `seteffectwithchance` draw in the window when there are really two, and
   silently misattributes the extra (turn-1) one to "turn-2 decision."
2. `BattleTurnPassed`'s `gRandomTurnNumber = Random()` (`battle_main.c:4013`)
   — a **genuinely new, always-fires-once-per-turn-transition site**,
   outside the two files the original source enumeration grepped.

**Neither influences the move decision itself** for these 3 fixtures: (1)
is turn-1's own hit-chain artifact, fully resolved and PP-decremented
before `BattleAI_SetupAIData` ever runs; (2)'s value is read only by
`GetWhoStrikesFirst`'s Quick Claw branch and Palace/Arena flavor text, both
provably unreached here (no Quick Claw item, Battle Factory ≠ Palace/Arena).
Both draws are pure `gRngValue`-position shifts relative to the AI's own
scoring, exactly like entry 455's already-confirmed switch-AI draws. This
directly answers entry 455's relax-option-(b) question: **yes**, the 2
draws in the gap are decision-independent, on the same evidentiary footing
as the switch-AI draws entry 455 already confirmed — a port targeting "same
final decision" needs neither; a port targeting **exact
`gRngValue`-position** parity (matching every downstream RNG consumer for
the rest of the turn, not just this decision) needs both, in the order
shown in §1 (`BattleTurnPassed` before the switch-AI pre-check, before
`BattleAI_SetupAIData`).

The true AI-decision-only roll count is **13/13/15** (setup 4 + CBM's
`get_ability` 6/6/8 + switch-AI pre-check 2 + tie-break 1); the pinned
**15/15/17** "attributed turn-2 decision rolls" figures remain correct as
totals (unchanged, still what `verify-factory-ai-ground-truth.ts` asserts)
but are now known to bundle in the 2 non-decision draws above rather than
being 15/15/17 pure AI-scoring draws. `tools/probe/verify-factory-ai-
ground-truth.ts` has been updated (comments/log labels only — no numeric
value or PASS/FAIL condition changed) to stop calling that remainder
"attributed turn-2 AI decision rolls" outright; rerun after the edit:
**ALL PASS**, same 19/19/21 totals.
