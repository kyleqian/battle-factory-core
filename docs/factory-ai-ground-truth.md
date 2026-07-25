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
