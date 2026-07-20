# Battle turn notes (S7 groundwork)

Ground-truth dossier for ROADMAP S7: turn 1 of battle 1 (Bug Catcher
DESTIN's Grovyle/Murkrow/Pidgeotto vs the player's Onix/Magby/Bayleef),
RAM-truthed and committed. **Groundwork only — no engine code.** This
extends `docs/turn-resolution-notes.md` (a prior session's own scratch-trace
scouting, uncommitted) with a **committed, dense, twice-verified-
deterministic** trace, a committed RAM dump, and committed pure-data
extraction, per `ROADMAP.md` S7's acceptance criteria groundwork. Read
`docs/battle-bringup-notes.md` first for how the anchor reaches the first
action menu (tick 1886 in this session's numbering, see §1).

Sources: `reference/pokeemerald/src/{battle_main.c, battle_script_commands.c,
pokemon.c, battle_interface.c}`, `include/battle.h`,
`include/constants/battle_move_effects.h`. All addresses from
`bin/oracle symbols <name>`. Oracle probes: `tools/probe/ram-probe.py` +
this session's own `tools/probe/dump-battle-bars.py` and
`tools/probe/dump-battler-snapshot.py` (both committed, both re-verified to
reproduce the committed RAM dump exactly — see §6).

## 1. The committed trace and why this move

`tools/compare/traces-groundtruth/battle1-turn1.json` (2620 frames, 223
captures) = `battle1-intro.json`'s own 40-segment, 1886-frame button script
(byte-for-byte copied, not re-derived — frame 1884/1885's capture sha
`d223d98a...` matches `battle1-intro.json`'s own settled tail exactly,
confirmed by direct comparison) **plus 4 new segments**:

| segment | frames | buttons | effect |
|---|---|---|---|
| 41 | 2 | `A` | tick 1886→1888: open the FIGHT submenu (cursor defaults to FIGHT) |
| 42 | 30 | — | settle |
| 43 | 2 | `A` | tick 1918→1920: select move slot 0 |
| 44 | 700 | — | idle through full turn resolution + settle margin |

**Move choice: Onix's slot 0, ROCK_SLIDE.** Onix's full moveset is
ROCK_SLIDE / BIND / DRAGON_BREATH / SANDSTORM (`docs/battle-bringup-notes.md`
§5). None is a "plain damaging move with no secondary effect" (the brief's
stated preference) — **ROCK_SLIDE** was chosen anyway as the closest fit and
simplest available: BIND is a multi-turn trap effect (extra turn-count RNG,
strictly more complex), SANDSTORM is a non-damaging weather move (no
accuracy/crit/damage roll at all, less useful as turn-resolution ground
truth), leaving ROCK_SLIDE (single-target, single-hit, ordinary damage calc
plus one secondary-effect roll for its 30% flinch chance) and DRAGON_BREATH
(also a secondary-effect single-hit move, paralysis instead of flinch) as
the two "simple" candidates; ROCK_SLIDE was picked arbitrarily between
those two equally-simple options (cursor default, slot 0, needs no extra
navigation). The opponent's move is **not scripted** — Grovyle is AI-picked;
this session's RNG stream (a different button-script idle-padding profile
than `docs/turn-resolution-notes.md`'s own scratch script, per
`battle-bringup-notes.md` §0's documented sensitivity) led the AI to choose
**DOUBLE_TEAM** (`gLastMoves[1]` RAM-read = 104), not FURY_CUTTER as the
other session saw — a different, independently-useful data point (a
status-only opponent move), not a bug (see §7 risk 1 for the mechanism).

**Determinism**: `bin/oracle run` on this exact trace twice (fresh sessions
both times) produced **0 sha mismatches across all 223 captures**.

## 2. Frame boundaries (RAM- and pixel-confirmed)

sha256 = first 12 hex chars unless spot-cited in full. All ticks are this
trace's own absolute indices (0-indexed, shared with `battle1-intro.json`'s
numbering since the first 1886 frames are identical).

| tick | sha256 | milestone |
|---|---|---|
| 1884-1886 | `d223d98a2da9` (full `d223d98a2da991439b96b110023841dbea049342e3d5a6c199a5fab74db28303`) | settled first action menu (= `battle1-intro.json`'s own tail) |
| 1887-1888 | `b145eaeff966` | **menu dismiss**: FIGHT submenu opens (1st `A`) |
| 1892-1924 | 4-6 distinct shas cycling (`9965bf5b2de9`→`1e6f506c5b5e`→`1be59a4ef8d4`→`d6f83c6fa9c3`→...) | **move-select open**: FIGHT submenu idle-cycling (same blink-cycle convention as the action menu's own idle animation, `battle-bringup-notes.md` §2) through the 2nd `A` press (registers ~1919-1920) |
| 1928-2173 | continuous distinct shas (e.g. `22e8c7fbed1d`@1932, `361833e8c91a`@2004, `f33cfdd146f8`@2104) | **move choice / Grovyle's animation**: opponent's move resolves and its (non-damaging) animation plays; `gLastMoves[1]` becomes 104 (MOVE_DOUBLE_TEAM) by tick 2173, RAM-confirmed |
| 2182 | `f33cfdd146f8` | Onix's accuracy roll (RNG step 1, §3) |
| 2206 | `1af9c633e8ae` | Onix's crit roll (RNG step 2) — attack animation window begins around here (pixel-distinct from 2182 onward, not further sub-divided this session) |
| 2209 | (same `1af9c633e8ae` window) | Onix's damage-spread roll (RNG step 3); `gBattleMoveDamage` locks to **42** this tick, RAM-confirmed |
| 2281 | `1af9c633e8ae` (bar sentinel `-32768` this tick, RAM-only — not a pixel change by itself) | **HP-bar drain start** (battler 1 / Grovyle's bar) |
| 2282-2323 | continuous per-tick pixel change (bar draining) | HP-bar drain, 42 ticks = 42 damage (§5) |
| 2323-2340 | flat `64857bf16c67` | bar "done", battle text holding; `gBattleMons[1].hp` itself updates to 101 at tick **2325** (RAM-only, 2 ticks after the bar's done sentinel at 2324 — see §5) |
| 2330 | (same flat window) | Onix's secondary-effect (30% flinch) roll (RNG step 4) — no pixel change, RAM-only |
| 2340-2344 | (same flat window) | turn-end RNG cluster starts (RNG steps 5-7, unattributed, §3/§7) |
| 2345-2347 | `70f4821905ff` | **battle text / menu return** begins |
| 2348-2359 | `c2a09dbe1350`→`229869e8d282`→... (4-phase cycle) | **next action menu settled**, same 4-phase/~36-tick idle-cycle signature as `battle-bringup-notes.md`'s own first-menu tail |
| 2360-2619 | same 4-phase cycle, confirmed at stride-10/stride-20 through the trace's end | stable/interactive, matching `battle1-intro.json`'s own acceptance-criteria convention |

## 3. RNG-consumption ledger for turn 1 (RAM-truthed, LCG-step-counted)

`gRngValue` (`0x3005d80`, LCG `next = 1103515245*v + 24691 mod 2^32`)
sampled every tick 1880-2620; step counts derived by replaying the known LCG
from each observed value until it matches the next observed value (not
assumed — every step count below is a verified LCG-distance, done
programmatically).

| tick | steps | value after | attribution |
|---|---|---|---|
| (1880-2181) | 0 | `3485459011` (flat) | menu nav + Grovyle's DOUBLE_TEAM (a self-target, always-hit status move — **consumes zero `Random()` calls**, confirmed by the flat window spanning past `gLastMoves[1]`'s write at tick 2173) |
| 2182 | 1 | `4000719098` | Onix's **accuracy** check (`Cmd_accuracycheck`, ROCK_SLIDE acc=90) |
| 2206 | 1 | `2176095973` | Onix's **crit** roll (`Cmd_critcalc`, `critChance=0` → 1-in-16, `gCritMultiplier` read back as **1** — not a crit) |
| 2209 | 1 | `435971572` | Onix's **damage-spread** roll (`ApplyRandomDmgMultiplier`, `100-(Random()%16)`); `gBattleMoveDamage` locks to 42 this same tick |
| 2330 | 1 | `3326091607` | Onix's **secondary-effect** roll (ROCK_SLIDE's 30% `EFFECT_FLINCH_HIT` chance) — fires *after* the HP-bar drain/animation window, not immediately after the damage roll |
| 2340 | 1 | `3552646270` | **RESOLVED (S7 worktree lane follow-up)** — `BattleTurnPassed`'s `gRandomTurnNumber = Random();` (`battle_main.c:4013`), the turn-transition bookkeeping step right after `HandleEndTurn_ContinueBattle` clears the turn's flags and before `gBattleMainFunc = HandleTurnActionSelectionState` takes over |
| 2345 | 2 | `1572843288` | **RESOLVED (S7 worktree lane follow-up)** — `AI_TrySwitchOrUseItem`'s `ShouldSwitch()` (`battle_ai_switch_items.c:429-526`, dispatched from `OpponentHandleChooseAction`, `battle_controller_opponent.c:1540-1544`, DESTIN's first controller call for turn 2's action): exactly 2 `Random()` calls for this exact state, both LCG-value-verified (§7 risk 1 below) |
| 2347 | 5 | `4098214719` | **RESOLVED (S7 worktree lane follow-up)** — `OpponentHandleChooseMove` -> `BattleAI_SetupAIData`'s `simulatedRNG[i] = 100 - (Random()%16)` loop (`battle_ai_script_commands.c:341`, 4 calls, one per move slot, unconditional regardless of move legality) + `ChooseMoveOrAction_Singles`'s final `Random() % numOfBestMoves` tie-break (`:445`, 1 call) = 5; `gRngValue` goes flat here through the trace's end (tick 2620) because this is Grovyle's *next*-turn move choice and the trace ends before turn 2 plays out |

**Total: 12 `Random()` calls this turn** (0 for Grovyle's DOUBLE_TEAM + 4 for
Onix's ROCK_SLIDE + 8 unattributed turn-end cluster). Cross-session
comparison: `docs/turn-resolution-notes.md` §3 (FURY_CUTTER vs ROCK_SLIDE,
different RNG stream) counted **16** steps = 3 (FURY_CUTTER: accuracy/crit/
spread, `secondaryEffectChance=0`) + 4 (ROCK_SLIDE, same 4 rolls as here) +
9 (its own turn-end cluster, structured as 1+1+2+5). This session's 8-step
tail (1+2+5) is a **strong structural match** to that session's own
2-step-then-5-step ending (both end in an identical "...1, 2, 5" or "...2,
5" LCG-step signature despite completely different moves/matchup context),
reinforcing (not proving) `turn-resolution-notes.md`'s Risk #2 hypothesis
that this tail is the opponent AI scoring next turn's move choice — a
computation that would run identically regardless of what actually happened
this turn. **Still not mapped to an exact call site** — carried forward as
an open item, §7.

## 4. Turn order (RAM-confirmed)

`gBattlerByTurnOrder` (`0x202407e`) = `[1, 0]` for the entire window —
battler 1 (Grovyle, speed 90) acts before battler 0 (Onix, speed 76),
matching the plain speed comparison in `GetWhoStrikesFirst`
(`battle_main.c:4747-4748`) — both moves priority 0, no stat-stage/item/
status modifiers in play, no speed tie. Same conclusion as
`turn-resolution-notes.md` §3, now from a second, independent RNG stream —
i.e. **not an artifact of that session's specific personality roll**, since
personality doesn't affect these stats (`turn-resolution-notes.md` §2).

## 5. Damage math, worked end-to-end against the RAM dump

**Battler snapshots** (`tools/probe/dump-battler-snapshot.py`, ticks 1880
and 2619 of this trace — full `struct BattlePokemon` read, not just hp):

| | species | atk | def | spd | spA | spD | hp before | hp after | status |
|---|---|---|---|---|---|---|---|---|---|
| battler 0 (ONIX) | 95 | 51 | 187 | 76 | 36 | 72 | 117/117 | 117/117 (unchanged) | 0/0 |
| battler 1 (GROVYLE) | 278 | 103 | 56 | 90 | 91 | 71 | 143/143 | 101/143 | 0/0 |

Matches `docs/turn-resolution-notes.md` §2's table exactly (species/stats
are anchor-fixed regardless of the personality roll or RNG-stream
differences between sessions — reconfirmed, not assumed).

**Grovyle's move (DOUBLE_TEAM)**: `effect: EFFECT_EVASION_UP`, `power: 0`,
`target: MOVE_TARGET_USER` (self) — a pure stat-stage move, deals no damage,
consumes no `Random()` call (§3). Battler 0's hp is **117 at every single
sampled tick** from 1880 through 2619 — directly confirms no damage was
dealt to Onix this turn.

**Onix's move (ROCK_SLIDE, slot 0)**: `power: 75`, `type: TYPE_ROCK`,
`accuracy: 90`. `gBattleMoveDamage` (RAM) = **42**, `gCritMultiplier` = **1**
(no crit). Reproducing `CalculateBaseDamage` (`pokemon.c:3106-3282`) +
`Cmd_typecalc`'s STAB step by hand against `src/data/gen/
damage-formula-constants.json`'s newly-extracted constants:

```
base   = floor(floor(attack * power * (2*level/5 + 2)) / defense) / 50
       = floor(floor(51 * 75 * (2*50/5 + 2)) / 56) / 50
       = floor(floor(51 * 75 * 22) / 56) / 50
       = floor(floor(84150) / 56) / 50
       = floor(1502) / 50
       = floor(30.04) = 30
STAB   = floor(30 * 15 / 10) = 45      (Onix is ROCK/GROUND, move is ROCK - STAB applies,
                                         src/data/gen/type-effectiveness.json confirms no
                                         ROCK,GRASS entry - Grovyle is GRASS - so no
                                         type-effectiveness multiplier, stays neutral 1x)
spread = floor(45 * m / 100), m in [85,100]  (src/data/gen/damage-formula-constants.json's
                                               randomDamageSpreadPercent)
       -> range [38, 45]; 42 falls inside (m in {94, 95})
```

**42 is inside the valid range and requires no crit** — consistent with the
RAM-read `gCritMultiplier=1`. This is the exact same matchup
`turn-resolution-notes.md` §3 hand-verified (that session's Onix-vs-Grovyle
ROCK_SLIDE hit also dealt 42) — a second independent RNG roll landing on
the same value is a coincidence of the roll landing in the same 2-point
sub-range (94-95%) of an 8-value-wide window, not a bug (spot-checked: not
every roll should reproduce the same number, and this dossier does not rely
on that coincidence for anything — the *formula*, not the *specific value*,
is what's being pinned).

**HP-bar drain** (`tools/probe/dump-battle-bars.py`, `gBattleSpritesDataPtr`
→ (deref) → `+0xC` → (deref) → `battleBars[1]` at `+0x10`): sentinel
`-32768` at tick 2281, decrements exactly 1 unit/tick from 142 down to 101
over ticks 2282-2323 (**42 ticks for 42 damage**), "done" sentinel (0) at
2324, **`gBattleMons[1].hp` itself updates to 101 one tick later, at
2325** — byte-for-byte the same rule `turn-resolution-notes.md` §4
documented (1 HP-unit/tick drain; stat updates 1 tick after the bar's own
"done" sentinel) — now confirmed by a **second, independent** hit (that
session's own two data points were both from this same trace's move
choices' matchup, so this is the third overall, and the first not
originating from that session).

## 6. RAM dump + probe tooling (committed)

- `src/data/gen/battle1-turn1-ram-dump.json` — dense per-tick (741 rows,
  ticks 1880-2620) `gRngValue`/`gBattleMons[0,1].hp`/health-bar `currValue`/
  `gBattleMainFunc`/`gBattleControllerExecFlags`/`gBattlerByTurnOrder`/
  `gLastMoves[0,1]`/`gCurrentMove`/`gBattlerAttacker`/`gBattlerTarget`/
  `gCritMultiplier`/`gBattleMoveDamage`, plus the derived RNG ledger (§3)
  and the two battler snapshots (§5), plus the exact RAM addresses used.
- `tools/probe/ram-probe.py` (pre-existing, generic single-deref watch
  tool) + `tools/probe/specs/battle1-turn1-watch.json` (this session's
  watch list — copy `battle1-turn1.json`'s own `segments` array into the
  spec's `"segments"` key before running, per the spec's own comment).
  `tools/probe/specs/battle1-turn1-statstages-watch.json` (S7 worktree
  lane follow-up, §7 point 2) is the same convention, with the trace's
  `segments` baked in directly (`ram-probe.py`'s single-`+` offset
  parser can't take a multi-term expression, so the struct-offset math
  is folded into one literal hex offset per watch entry, e.g.
  `gBattleMons+0x77` for battler 1's `STAT_EVASION`) — re-run twice this
  session, byte-identical output both times.
- `tools/probe/dump-battle-bars.py` (new, committed) — the HP-bar's
  **double**-indirection read (`gBattleSpritesDataPtr` is itself a pointer
  variable; deref once for the sprite-data struct, read its `+0xC` field
  which is *another* pointer, deref again for `battleBars[]`) that
  `ram-probe.py`'s single-deref `"watch"` spec can't express. Generalized
  (takes any trace file + start tick), not battle-1-turn-1-specific.
- `tools/probe/dump-battler-snapshot.py` (new, committed) — full `struct
  BattlePokemon` reads (species/stats/hp/level/status) at chosen ticks,
  all 4 `gBattleMons[]` slots.
- **Both new scripts were independently re-run this session and their
  output byte-diffed against `battle1-turn1-ram-dump.json`'s own columns —
  0 mismatches** — i.e. the committed dump is reproducible from the
  committed tooling, not a one-off hand transcription.
- **Move-anim task lifetimes**: `gBattleControllerExecFlags` (`0x2024068`)
  was watched but its exact bit semantics were **not** fully decoded this
  session — the naive "bit N = battler N's controller command is running"
  reading is contradicted by the dump (the flag reads nonzero throughout
  the *entire* settled idle tail 2343-2620, where nothing should be
  "running"), so this dossier does not claim a decoded meaning for it and
  reports the raw values only (see the committed dump's `execFlags`
  column) rather than asserting an unverified interpretation. Flagged as an
  open item for whichever engine slice needs actual move-animation task
  boundaries (§7).

## 7. Data-needs audit for S7's damage/order calc

**Already extracted, sufficient for this turn's math (verified above):**
`src/data/gen/moves.json` (now includes `effect`/`secondaryEffectChance`/
`target`/`priority`/`flags`, extended this session — previously only had
type/power/accuracy/pp/description/contest), `src/data/gen/
type-effectiveness.json` (new, 111 matchups, the full `gTypeEffectiveness`
table), `src/data/gen/damage-formula-constants.json` (new: crit-chance
table `[16,8,4,3,2]`, random-spread range `85-100%`, STAB `15/10`,
healthbar pixel/color-threshold constants), `src/data/gen/
species-stats.json` (pre-existing, base stats), `src/data/gen/
battle-frontier-mons.json` (pre-existing, opponent movesets/items/natures).

**Still missing, needed before S7 covers more than this one turn:**
1. **`CalculateBaseDamage`'s item/ability/weather/screen modifier chain**
   (`pokemon.c:3106-3282`) — badge boosts, hold-item type/power bonuses
   (Choice Band, type-boosting items, species-locked items), Reflect/Light
   Screen, burn-halving, double-battle target-split — all engine-logic
   branches, not extracted as data (correctly out of this scoped
   extractor's reach per its own doc comment) but **not yet even
   inventoried against battle 1's actual held items** (BRIGHT_POWDER/
   LAX_INCENSE/WHITE_HERB on the opponent side — none of these are damage
   modifiers per a quick source skim of `sHoldEffectToType`/the named
   hold-effect checks above, but this was not exhaustively confirmed this
   session). **CONFIRMED exhaustively (S7 worktree lane, follow-up
   session)**: battle 1's three opponent-side held items, per
   `battle-bringup-notes.md` §5's already-established assignment table
   (`FRONTIER_MON_GROVYLE_1`=188→BRIGHT_POWDER, `FRONTIER_MON_MURKROW_1`=184
   →LAX_INCENSE, `FRONTIER_MON_PIDGEOTTO`=135→WHITE_HERB — moveset
   cross-check against `battle-frontier-mons.json` confirms these are the
   *battle-1* table rows, not one of the pool's other same-species rows,
   e.g. `FRONTIER_MON_GROVYLE_1`'s FURY_CUTTER/ENDEAVOR/BRICK_BREAK/
   DOUBLE_TEAM moveset matches this dossier's own §8 point 2 rather than
   index 293's GIGA_DRAIN/CRUSH_CLAW/SCREECH/ROCK_TOMB LUM_BERRY row),
   resolve via `src/data/items.h` (`gItems[]`) to:
   - `ITEM_BRIGHT_POWDER`: `.holdEffect = HOLD_EFFECT_EVASION_UP,
     .holdEffectParam = 10` (`items.h:2191-2192`)
   - `ITEM_LAX_INCENSE`: `.holdEffect = HOLD_EFFECT_EVASION_UP,
     .holdEffectParam = 5` (`items.h:2721-2722`)
   - `ITEM_WHITE_HERB`: `.holdEffect = HOLD_EFFECT_RESTORE_STATS` (no
     explicit param, defaults to 0) (`items.h:2202`)

   Grepped every occurrence of `HOLD_EFFECT_EVASION_UP` and
   `HOLD_EFFECT_RESTORE_STATS` across `reference/pokeemerald/src/*.c`
   (excluding the `items.h` data-table assignments above) — each has
   **exactly one** engine call site, neither inside `CalculateBaseDamage`:
   - `HOLD_EFFECT_EVASION_UP` — `battle_script_commands.c:1172`, inside
     `Cmd_accuracycheck` (:1097-1183, `Cmd_accuracycheck` backs the
     `accuracycheck` battle-script command every damaging/status move with
     an accuracy check dispatches through): after the normal
     stat-stage/ability/weather accuracy calc, `if (holdEffect ==
     HOLD_EFFECT_EVASION_UP) calc = (calc * (100 - param)) / 100;` where
     `holdEffect`/`param` are read from **`gBattleMons[gBattlerTarget]
     .item`** (:1163-1170) — i.e. this is the *target's* held item cutting
     the *attacker's* hit chance by `param`%. **Confirmed accuracy-relevant
     as the brief anticipated**: any move directed at Grovyle is rolled at
     90% of its normal hit chance (10% cut), at Murkrow 95% (5% cut).
     ROCK_SLIDE's accuracy roll this turn (§3, tick 2182, RNG step 1)
     targeted Grovyle, so this mechanism was live for that exact roll —
     the move visibly hit (no `MOVE_RESULT_MISSED`, §2/§5), consistent
     with either a modified or unmodified 90%-accuracy pass, but the
     specific `calc` value (pre- vs post-10%-cut) was not RAM-extracted
     this session to confirm the cut's *magnitude* landed correctly, only
     that the code path is live for this matchup — a cheap follow-up in
     the same shape as item 2's, not done this session (time budget).
   - `HOLD_EFFECT_RESTORE_STATS` — `battle_util.c:3312` (`ITEMEFFECT_ON_
     SWITCH_IN`), `:3383` (`ITEMEFFECT_NORMAL`), `:3739` (`ITEMEFFECT_
     MOVE_END`) — all three identical: `for (i = 0; i < NUM_BATTLE_STATS;
     i++) if (statStages[i] < DEFAULT_STAT_STAGE) statStages[i] =
     DEFAULT_STAT_STAGE`, i.e. WHITE_HERB (Pidgeotto) resets any *lowered*
     stat stage back to neutral (6) the first time one of these three
     check-points runs after the drop, then is consumed (routes to
     `BattleScript_WhiteHerbEnd2`/`WhiteHerbRet`, which remove the item —
     not traced further this session, out of scope). **Stat-stage-
     relevant, not a damage modifier directly** — but since stat stages
     feed `CalculateBaseDamage`'s `APPLY_STAT_MOD` (:3238-3257), a future
     S7 slice modeling a turn where Pidgeotto gets its Attack/Defense/etc.
     lowered (not this turn — Pidgeotto never battles in this dossier's
     traced turn) needs this rule to get subsequent damage right.
   - `sHoldEffectToType[]` (`pokemon.c:1919-1938`, the type-boost lookup
     `CalculateBaseDamage` uses at :3171-3182) — 18 entries, all
     `HOLD_EFFECT_*_POWER` constants (bug/steel/ground/rock/grass/dark/
     fighting/electric/water/flying/poison/ice/ghost/psychic/fire/dragon/
     normal power) — **`HOLD_EFFECT_EVASION_UP` and `HOLD_EFFECT_
     RESTORE_STATS` are absent**, confirming by exhaustive table
     inspection (not just "not found by name-grep in the function body")
     that neither item can hit this path.
   - **Net: none of BRIGHT_POWDER/LAX_INCENSE/WHITE_HERB touch
     `CalculateBaseDamage` anywhere — confirmed, not assumed.** BRIGHT_
     POWDER/LAX_INCENSE are exclusively accuracy-relevant (one call site);
     WHITE_HERB is exclusively stat-stage-relevant (three call sites, same
     rule). Extracted as data since the accuracy path is real:
     `tools/extract/extract-item-hold-effects.ts` →
     `src/data/gen/item-hold-effects.json` (70 items with an explicit
     `.holdEffect`, `{item, holdEffect, holdEffectParam}`; items with only
     a stray `.holdEffectParam` and no `.holdEffect` — e.g. `ITEM_POTION`
     — correctly excluded, since an unset `.holdEffect` designated-
     initializer defaults to `HOLD_EFFECT_NONE` and no switch/case ever
     reads that param), pinned by `tests/itemHoldEffects.test.ts`,
     re-run-verified byte-identical.
2. **Status-move effect tables** (stat-stage deltas, evasion/accuracy
   stage math) — DOUBLE_TEAM this turn only *changed* battler 1's evasion
   stage; this dossier did not RAM-read `gBattleMons[1].statStages[]`
   before/after to confirm the stage actually moved (an obvious, cheap
   follow-up this session ran out of time for). **CONFIRMED (S7 worktree
   lane, follow-up session)**: watched all 8 of `gBattleMons[1]
   .statStages[]` (struct offset `+0x18` within the 0x58-byte
   `struct BattlePokemon`, i.e. `gBattleMons+0x70`..`+0x77` for battler 1;
   `include/pokemon.h:277`) plus battler 0's `STAT_ACC`/`STAT_EVASION`
   entries as a control, every tick 1880-2620 of `battle1-turn1.json`
   (`tools/probe/ram-probe.py` +
   `tools/probe/specs/battle1-turn1-statstages-watch.json`, output
   byte-identical across two independent runs — exit 139 both times is
   the tool's documented benign teardown segfault, not a failure).
   Result: **every stage stays at `DEFAULT_STAT_STAGE=6`
   (`include/constants/pokemon.h:90`) for the entire trace except
   `gBattleMons[1].statStages[STAT_EVASION]` (index 7), which flips
   `6→7` at tick 1959 and holds at 7 through tick 2620** (the trace's
   end) — i.e. exactly one `EFFECT_EVASION_UP` stage step, matching
   DOUBLE_TEAM's move data (`moves.json`'s `EFFECT_EVASION_UP`, no
   `stat`/`stages` multiplier beyond +1) and the "Foe GROVYLE's
   evasiveness\nrose!" text this turn actually prints (pixel-confirmed,
   frame 2182 — see item 4 below). No other stat/stage on either
   battler moves this turn. Tick 1959 lands inside §2's own
   1928-2173 "move choice / Grovyle's animation" window (well before
   `gLastMoves[1]` itself is written to 104, which per the committed RAM
   dump doesn't happen until later in that same window — the stage
   write and the `gLastMoves[]` bookkeeping write are evidently two
   separate script-command effects, not simultaneous). This closes §8
   risk 5.
3. **Multi-turn/secondary-effect mechanics**: BIND's turn-count roll,
   DRAGON_BREATH's paralysis chance, SANDSTORM's weather-turn-counter and
   per-turn chip damage, ENDEAVOR's HP-equalizing formula (not the normal
   damage calc at all) — all still unprobed (same gap
   `turn-resolution-notes.md` §6 risk 3 already flagged; not narrowed this
   session, since this session's own scripted move was ROCK_SLIDE not one
   of these).
4. ~~**Battle text strings for turn 1's messages**~~ **EXTRACTED (S7
   worktree lane, follow-up session)**:
   `tools/extract/extract-battle-messages.ts` →
   `src/data/gen/battle-message-templates.json` (365 of
   `gBattleStringsTable`'s 369 entries — 4 skipped, see below — plus the
   below-`BATTLESTRINGS_TABLE_START` `STRINGID_USEDMOVE`, 52 `B_TXT_*`
   placeholder tokens, `gStatNamesTable`'s 8 stat names, and the
   `gStatUpStringIds`/`gStatDownStringIds`/`gMissStringIds`
   `MULTISTRING_CHOOSER` sub-tables), source-verified against
   `src/battle_message.c` (`gBattleStringsTable`, every `sText_*`/`gText_*`
   definition, `gStatNamesTable`, the three `B_MSG_*` sub-tables),
   `include/constants/battle_string_ids.h` (`STRINGID_*`/`B_MSG_*` numeric
   ids), and `charmap.txt`'s "battle string placeholders" section (the
   `{TOKEN}` → `FD <id>` encoding). Templates are kept **machine-usable,
   not flattened**: each entry carries both its raw source text and a
   `segments` array splitting it into `{type:"placeholder", token}` /
   `{type:"control", name, args}` (non-`B_TXT_*` curly-brace macros like
   `{WAIT_SE}`/`{PAUSE 32}`) / `{type:"linebreak", code}` (`\n`/`\p`/`\l`)
   / `{type:"text", value}` runs, so a future renderer never re-parses
   curly braces itself. 4 `gBattleStringsTable` entries (PC-transfer/
   box-full messages, `STRINGID_PKMNTRANSFERRED{SOMEONES,LANETTES}PC` +
   their `BOX...FULL` variants) point at `gText_*` symbols defined outside
   `battle_message.c` in a `.inc` assembly-text file
   (`data/text/pc_transfer.inc`'s `.string` directives — a different text-
   compilation pathway entirely) — correctly skipped as out of scope (not
   combat/turn text, `extract-battle-messages.ts`'s own doc comment names
   them). Also new: `tools/extract/extract-species-names.ts` →
   `src/data/gen/species-names.json` (412 species, `gSpeciesNames`) —
   `B_ATK_NAME_WITH_PREFIX`/`B_DEF_NAME_WITH_PREFIX` resolve to a
   battler's nickname, and Battle Factory rentals/opponent trainer mons
   are never custom-nicknamed, so the in-battle name is always the plain
   species name; move names were already covered by the existing
   `moves.json`. Pinned by `tests/battleMessageTemplates.test.ts`
   (5 tests) — includes a resolves-every-referenced-placeholder-token
   check across all 366 extracted templates. Both new extractors re-run
   twice, byte-identical output both times.

   **Pixel cross-check (the brief's required minimum, both "used move"
   strings)**: ran `bin/oracle run` on the committed
   `tools/compare/traces-groundtruth/battle1-turn1.json` and inspected two
   of its own committed `captureFrames` ticks directly:
   - **tick 1960**: "Foe GROVYLE used\nDOUBLE TEAM!" — matches
     `STRINGID_USEDMOVE`'s template (`{B_ATK_NAME_WITH_PREFIX} used\n
     {B_BUFF2}`) with `B_ATK_NAME_WITH_PREFIX` → "Foe GROVYLE" (the
     opponent-trainer-battle name-prefix convention; species name "GROVYLE"
     from the new `species-names.json` matches exactly) and `B_BUFF2` →
     "DOUBLE TEAM!" (move name from the pre-existing `moves.json` + the
     appended "!" `Cmd_attackstring`/`ChooseTypeOfMoveUsedString` always
     adds in this English build, `battle_message.c:2907-2921`).
   - **tick 2270**: "ONIX used\nROCK SLIDE!" — same template,
     `B_ATK_NAME_WITH_PREFIX` → "ONIX" (no prefix — player side), `B_BUFF2`
     → "ROCK SLIDE!".
   - Both strings' full character sets (`G,R,O,V,Y,L,E, ,U,S,D,O,B,L,E,
     T,A,M,!` / `O,N,I,X, ,R,C,K,S,L,I,D,E,!`) are present in the run's
     existing `src/data/gen/charmap.json` (the font glyph-encoding table
     an engine renderer would use), confirmed programmatically — i.e. the
     extracted move/species names are renderable through the already-
     extracted font pipeline, not just visually similar.
   - **One correction this cross-check surfaced**: this dossier's own §7
     item 2 addition (and the original brief's own phrasing) wrote
     "GROVYLE's evasiveness rose!" and "GROVYLE used DOUBLE TEAM!" without
     the "Foe " prefix that tick 1960/2182's actual pixels show — corrected
     in place above (§7 item 2) now that pixel ground truth is in hand;
     the prefix itself is resolved inside `B_ATK_NAME_WITH_PREFIX`'s
     runtime construction (engine-side, not template-side), so this
     extraction's template (`{B_ATK_NAME_WITH_PREFIX} used\n{B_BUFF2}`,
     no literal "Foe " text) is still correct as extracted.
5. **Move-animation art assets** — explicitly out of scope per this
   session's brief (not listed as a need to extract, only to flag): ROCK_SLIDE's
   falling-rocks animation, DOUBLE_TEAM's afterimage-clone animation, and
   the generic hit-flash/shake effects all still need their own asset
   extraction + RAM/pixel probing pass before an engine slice can render
   them, same convention as `docs/battle-anim-assets.md`'s existing
   inventory for the intro (send-out) animations.
6. **`gBattleControllerExecFlags`'s bit semantics** (§6) — needed if an
   engine slice wants to key move-animation start/end off this field rather
   than off pixel/text-state polling.

## 8. Open questions / risk list for the engine slices

1. ~~**The turn-end 8-step (this session) / 9-step (`turn-resolution-notes.md`)
   RNG cluster is still not mapped to an exact call site.**~~ **RESOLVED
   (S7 worktree lane follow-up session)** — confirms
   `turn-resolution-notes.md` Risk #2's hypothesis exactly right, and pins
   every one of the 8 calls to a source line, with the two multi-step
   groups (2 and 5) individually **LCG-value-verified** against this
   dossier's own committed `gRngValue` samples (not just call-counted):

   - **tick 2340 (1 step)**: `BattleTurnPassed`'s `gRandomTurnNumber =
     Random();` (`battle_main.c:4013`) — unconditional, once per turn,
     independent of what happened during the turn.
   - **tick 2345 (2 steps)** = `HandleTurnActionSelectionState` dispatching
     DESTIN's first controller call for turn 2's action,
     `OpponentHandleChooseAction` -> `AI_TrySwitchOrUseItem` (both
     `battle_controller_opponent.c:1540-1544`/
     `battle_ai_switch_items.c:528-603`) -> `ShouldSwitch()`
     (`:429-526`). Traced call-by-call for this exact state (Grovyle
     101/143 hp, evasion stage 7, moveset FURY_CUTTER/ENDEAVOR/
     BRICK_BREAK/DOUBLE_TEAM, vs full-hp Onix ROCK/GROUND):
     `ShouldSwitchIfPerishSong()`/`ShouldSwitchIfWonderGuard()` = 0 calls
     (neither condition applies); `FindMonThatAbsorbsOpponentsMove()`
     (`:119-216`) = **1 call** (`Random() % 3` at `:128`, result `54504 %
     3 == 0` so the `&&` short-circuits false and the function keeps
     going, but `gLastLandedMoves[1]` = ROCK_SLIDE, type ROCK, matches
     none of `TYPE_FIRE`/`TYPE_WATER`/`TYPE_ELECTRIC` at `:151-158`, so it
     hits the `else return FALSE;` at `:158` before its own second
     `Random()` call at `:206` is ever reached); `ShouldSwitchIfNaturalCure()`
     = 0 calls (Grovyle isn't asleep, returns `FALSE` at the first check,
     `:220`); `HasSuperEffectiveMoveAgainstOpponents(FALSE)` (`:258-312`,
     called directly from `ShouldSwitch()` at `:517`) = **1 call**
     (BRICK_BREAK is fighting-type, 2x vs Onix's ROCK/GROUND typing, hits
     `Random() % 10 != 0` at `:282`, result `23999 % 10 == 9 != 0` so
     returns `TRUE` immediately, and `ShouldSwitch()` returns `FALSE` at
     `:517-518` — DESTIN doesn't switch, matching the observed turn
     (Grovyle used DOUBLE_TEAM)). `ShouldUseItem()` (`:808-...`) = 0 calls
     (no `Random()` anywhere in that function; Battle Factory trainers
     carry no mid-battle items in `battleHistory->trainerItems` here).
     Total: **exactly 2**, matching the observed step count. **LCG-value
     match**: applying the LCG twice to the tick-2340 post-value
     (`3552646270`) gives `3572006425` then `1572843288` — the *exact*
     value this dossier's own ledger records at tick 2345 (§3) — i.e. this
     isn't just "2 calls happen to occur somewhere in here", the specific
     branch outcomes above are the ones that actually fired.
   - **tick 2347 (5 steps)** = the very next controller call,
     `OpponentHandleChooseMove` (`battle_controller_opponent.c:1551-1567`)
     -> `BattleAI_SetupAIData(ALL_MOVES_MASK)` -> `BattleAI_ChooseMoveOrAction`
     -> `ChooseMoveOrAction_Singles`. **Crucially, no AI-script scoring
     runs at all here**: `GetAiScriptsInBattleFactory()`
     (`battle_factory.c:889-908`) returns AI script flags gated on
     `challengeNum = factoryWinStreaks[...] / FRONTIER_STAGES_PER_CHALLENGE`
     — for battle 1 of a fresh challenge (`challengeNum < 2`, DESTIN isn't
     `TRAINER_FRONTIER_BRAIN`) it returns **`0`**, RAM-confirmed directly
     (`tools/probe/dump-ai-and-hitmarker.py`'s `aiFlags` column reads `0`
     at every sampled tick 2330-2350) — so `ChooseMoveOrAction_Singles`'s
     `while (AI_THINKING_STRUCT->aiFlags != 0)` loop never calls
     `BattleAI_DoAIProcessing()` even once; `AI_CheckBadMove`/
     `AI_TryToFaint`/`AI_CheckViability` (hand-traced against all 4 of
     Grovyle's actual moves for this state — every branch is deterministic
     type/ability/HP/stat-stage comparisons for this exact matchup)
     contribute **zero** `Random()` calls. The 5 calls are entirely
     `BattleAI_SetupAIData`'s own `simulatedRNG[i] = 100 - (Random()%16)`
     loop (`battle_ai_script_commands.c:341`, **4 calls**, unconditional
     for all `MAX_MON_MOVES` slots regardless of legality) plus
     `ChooseMoveOrAction_Singles`'s final tie-break,
     `consideredMoveArray[Random() % numOfBestMoves]` (`:445`, **1
     call**) — since `aiFlags == 0` left every move's score at its
     initial `100` (all 4 tied), `numOfBestMoves == 4`. **LCG-value
     match**: applying the LCG 5 more times to the tick-2345 post-value
     (`1572843288`) lands on `4098214719` exactly, this dossier's own
     recorded tick-2347 value (§3). Bonus, falsifiable prediction for a
     future session: the tie-break's `Random()%4` result is `1`, i.e.
     `consideredMoveArray[1]` = Grovyle's move **slot 1** — if the
     dossier's own moveset order (FURY_CUTTER/ENDEAVOR/BRICK_BREAK/
     DOUBLE_TEAM, `battle-turn-notes.md` §1) is the literal slot order,
     this predicts Grovyle uses **ENDEAVOR** on turn 2, checkable by
     extending the committed trace past tick 2620.
   - **Total: 1 + 2 + 5 = 8**, matching the observed cluster exactly, with
     every step tied to a cited source line and the two multi-step groups
     additionally confirmed bit-for-bit against the LCG rather than just
     call-counted. New committed probe:
     `tools/probe/dump-ai-and-hitmarker.py` (double-derefs
     `gBattleResources->ai` for the `AI_ThinkingStruct` fields, plus
     `gHitMarker`/`gSaveBlock2Ptr->optionsBattleSceneOff` for
     `docs/battle-move-anim-notes.md`'s companion root-cause finding — see
     that doc's §6), re-run twice, byte-identical, and independently
     cross-checked against a from-scratch scratch probe of the same
     addresses before the script was written.
2. **Only 3 of battle 1's 8 distinct moves have any RAM ground truth**
   across both this dossier and `turn-resolution-notes.md`: ROCK_SLIDE
   (this session, 4 rolls, no crit, 42 dmg — and the earlier session, same
   move, same dmg, different RNG stream), FURY_CUTTER (earlier session
   only, 3 rolls, crit, 3 dmg), DOUBLE_TEAM (this session only, 0 rolls,
   0 dmg, status-only). **Unprobed**: BIND, DRAGON_BREATH, SANDSTORM
   (Onix); ENDEAVOR, BRICK_BREAK (Grovyle, beyond FURY_CUTTER/DOUBLE_TEAM);
   all 4 of Murkrow's and Pidgeotto's moves (never yet battled against, per
   both dossiers' battle-1-turn-1-only scope). Each needs its own scripted
   probe.
3. **This session's scripted turn only exercises player-slot-0 vs.
   Grovyle** — Murkrow and Pidgeotto (battle 1's other two enemy mons) are
   RAM-dumped for their starting stats (`battle-bringup-notes.md` §5/
   `turn-resolution-notes.md` §2) but never actually battled; a full S7
   engine slice needs at least one more scripted trace continuing past
   Grovyle's faint/switch to exercise the other two.
4. **No second turn or move-choice variant was added this session** —
   the brief allowed for one "if budget allows"; this session's time went
   to making the single required turn rigorous (twice-verified-
   deterministic trace, cross-checked probe tooling, worked-by-hand damage
   math) rather than breadth. A second trace (e.g. Onix's BIND, or
   continuing turn 2) is the natural next groundwork step.
5. ~~**Status-stage RAM verification gap**~~ **CLOSED (S7 worktree lane
   follow-up)** — `gBattleMons[1].statStages[STAT_EVASION]` RAM-confirmed
   `6→7` at tick 1959, all other stages/battlers flat at 6 all trace; see
   §7 point 2 for the full finding and probe tooling.
6. **HP-bar / stat-update lag (§5) is now confirmed 3 times across 2
   sessions, always in the `maxHP >= 48` branch** — still no battle-1 mon
   exercises the alternate `maxHP < 48` Q24.8 branch (all are level 50);
   unchanged from `turn-resolution-notes.md` §6 risk 8, still low-risk for
   S7 specifically.

## 9. CORRECTION BLOCK (S7 worktree lane, oracle v5 regen — Battle Scene ON): §1-§7 above describe the v3/v4-stale trace; this section is the re-verified v5 truth

Per PROGRESS #76/#77, the oracle's canonical bootstrap moved from Battle
Scene OFF (v3) to Battle Scene ON (v4, then v5 which bakes the same pixels
into the save file itself). `tools/compare/traces-groundtruth/
battle1-turn1.json` has been **replaced in place** (same filename, v3 truth
gone) with a new 2900-frame trace (was 2620), 242 dense captureFrames
(was 223), twice-run **0 sha mismatches**. `src/data/gen/
battle1-turn1-ram-dump.json` has been replaced likewise (1021 per-tick rows,
ticks 1880-2900; all four probe scripts re-run twice, byte-identical).
§1-§8 above remain historically accurate **descriptions of the v3
Battle-Scene-OFF trace** and are left unmodified as that record; treat every
tick number in §2/§3 as v3-only from here on. The old committed trace file
this dossier was built from is gone (replaced), but its own historical
numbers are preserved verbatim in the prose above.

**1. First-action-menu timing is UNCHANGED.** Directly re-verified (not
assumed) by replaying `battle1-intro.json`'s own 1886-frame button script
against the v5 oracle with extended idle padding: the settled first-menu
sha (`d223d98a2da9...`, full hash matches §2's table exactly) still lands at
tick **1884-1886**, the FIGHT-submenu-open sha (`b145eaeff966...`) still at
**1887-1888**, and the idle-cycling through the 2nd `A` press still matches
§2's table tick-for-tick through **tick 1924** (confirmed both by this
session's own oracle probe and by the already-recorded PROGRESS #76 finding
that replaying the *old* trace verbatim under v4/v5 shows "first divergence
tick 1968" — i.e. everything up to and including the two scripted `A`
presses at 1886/1888 and 1918/1920 registers identically). **Old→new tick
mapping for this phase: identity (no shift).** The brief's concern that
these presses "may no longer land on the settled menu" is **falsified for
this specific trace** — the front-sprite-entrance-animation timing change
that affects `sendout.json` (PROGRESS #76) does not measurably delay
`battle1-intro.json`'s own settle point.

**2. Everything from tick ~1928 onward now takes substantially longer**
(real move/effect animations play instead of the OFF-state's short generic
pause), so the new trace's absolute tick numbers diverge increasingly from
§2's table the further into the turn you go. New key ticks (all RAM- and/or
pixel-confirmed this session, `startTick`-anchored per-tick probes,
twice-run byte-identical):

| event | v3 tick (§2/§3, historical) | v5 tick (this session) | shift |
|---|---|---|---|
| evasion stage flips 6→7 (DOUBLE_TEAM's stat-stage effect fires) | 1959 | **1959** | +0 |
| DOUBLE_TEAM's own clone blend window (`AnimTask_DoubleTeam`, flat `BLDALPHA` eva=12/evb=8, script's literal `setalpha 12,8`) | never ran (§4/§6 of the anim-notes doc) | **1964-2094** (130 ticks) | n/a — new |
| `General_StatsChange` banner ramp (eva 0→10→0/evb 16→6→16) | 1999-2064 | **2127-2193** (66 ticks) | +128 |
| `gLastMoves[1]` write (=104, DOUBLE_TEAM) | ~2173 | **2301** | +128 |
| Onix's accuracy roll | 2182 | **2310** | +128 |
| Onix's crit roll | 2206 | **2334** | +128 |
| Onix's damage-spread roll (locks to 42) | 2209 | **2337** | +128 |
| ROCK_SLIDE's BG3_Y shake (`gBattle_BG3_Y` alternating 0/-7) | never ran (never observed under v3) | **~2348-2358** (~10 ticks) | n/a — new |
| HP-bar drain start (sentinel -32768) | 2281 | **2516** | +235 |
| HP-bar drain done (sentinel 0) | 2324 | **2559** | +235 |
| `gBattleMons[1].hp` updates to 101 | 2325 | **2560** | +235 |
| Onix's secondary-effect (flinch) roll | 2330 | **2565** | +235 |
| `BattleTurnPassed`'s `gRandomTurnNumber` roll | 2340 | **2575** | +235 |
| `ShouldSwitch()` 2-step roll resolves | 2345 | **2580** | +235 |
| `BattleAI_SetupAIData` 5-step roll resolves | 2347 | **2582** | +235 |
| next action menu settles into its 4-phase idle cycle | 2348 | **~2586** | +238 |

The shift is **not uniform**: +128 ticks accumulate entirely from
DOUBLE_TEAM's own clone animation + the stat-change banner (both now really
playing, back-to-back, before Onix's own turn even begins); a further +107
ticks (to +235) accumulate from ROCK_SLIDE's own attack animation (shake +
rocks + the generic hit-flash, which per `battle-move-anim-notes.md`'s v5
section now genuinely plays rather than being skipped) between the
damage-spread roll and the HP-bar drain start. The settled-menu 4-phase idle
cycle itself is confirmed identical in *content* (same four shas
`c2a09dbe1350`/`229869e8d282`/`0269314e68ff`/`a4bffb32ef6b`, same ~36-tick
period, re-confirmed stable for 20+ repeats out to tick 3318 in a scratch
probe) — only its start tick moved.

**3. RNG ledger: still exactly 12 `Random()` calls, and every value is
IDENTICAL to §3's table** — only the ticks moved (per the table above).
Verified programmatically (LCG-distance replay from each observed value to
the next, not just call-counted): accuracy/crit/damage-spread/secondary-
effect/turn-pass are each still exactly 1 step, `ShouldSwitch()` still
exactly 2, `BattleAI_SetupAIData`+tie-break still exactly 5. **Animation
tasks consume zero `Random()` calls** — confirmed, not assumed: `gRngValue`
is flat at `3485459011` for the *entire* 1880-2309 window (covering all of
DOUBLE_TEAM's clone animation and the stat banner), exactly mirroring §3's
own "DOUBLE_TEAM consumes zero Random() calls" finding, now additionally
proven true even with the real clone/banner animation code paths executing.
Total ledger: same 1+1+1+1+1+2+5=12 as v3, same values, just later.

**4. Damage, HP, turn order, stat stages all re-verified unchanged.**
`gBattleMoveDamage` locks to **42** at the new tick 2337 (same value, §5's
hand-worked damage formula therefore still applies verbatim — the roll
landing in the same `m∈{94,95}` sub-range is, as §5 already noted for the
v3↔`turn-resolution-notes.md` comparison, expected coincidence-range
behavior, not a re-derivation). `gCritMultiplier`=1 (no crit) unchanged.
Battler snapshots at ticks 1880/2900 are byte-identical to §5's own table
(ONIX 117/117 unchanged, GROVYLE 143→101). HP-bar drain is still exactly
**1 unit/tick over 42 ticks** (RAM-read `bar1Curr`: sentinel -32768 at 2516,
142→101 across 2517-2558, done-sentinel 0 at 2559, `gBattleMons[1].hp`
itself updates one tick later at 2560 — same lag rule as §5).
`gBattlerByTurnOrder`=[1,0] unchanged (Grovyle before Onix). Evasion stage
6→7 unchanged (§7 item 2's finding holds, just re-confirmed with a
re-baked `tools/probe/specs/battle1-turn1-statstages-watch.json` — segments
updated to the new 2900-frame trace, re-run twice, byte-identical).

**5. `gHitMarker`'s `HITMARKER_NO_ANIMATIONS` bit (byte 0 of
`0x2024280`) and `gSaveBlock2Ptr->optionsBattleSceneOff` are both
CLEAR (0) for the entire trace** (`tools/probe/dump-ai-and-hitmarker.py`
re-run against the new trace, ticks 1880-2900, twice, byte-identical) —
the exact inverse of §6's v3 finding in `battle-move-anim-notes.md`, as
expected: this is the mechanism directly responsible for every timing shift
in this section.

**Verification**: `npm test` 454/454, `npm run build` green. New trace +
new RAM dump both twice-run byte-identical. New probe outputs (RNG/hp/
moves/attacker/target/crit/damage/turnOrder/evasion/mainFunc/execFlags via
`ram-probe.py`; healthbar via `dump-battle-bars.py`; full battler stat
blocks via `dump-battler-snapshot.py`; hitMarker/AI/battleSceneOffBit via
`dump-ai-and-hitmarker.py`; a scratch register probe for `BLDCNT`/
`BLDALPHA`/`DISPCNT`/`gBattle_BG3_Y`/`gBattle_BG3_X`, not committed,
re-derivable from the committed trace's own segments) all re-run twice this
session, 0 mismatches.

## 10. Engine port (S7 worktree lane, turn-resolution core) — hermetic, no oracle this session

Ported the pure-logic core this dossier's groundwork enables:
`src/engine/damageCalc.ts` (`CalculateBaseDamage`, `Cmd_critcalc`,
`Cmd_typecalc`'s STAB/type-effectiveness steps, `ApplyRandomDmgMultiplier`,
`Cmd_accuracycheck`), `src/engine/turnOrder.ts` (`GetWhoStrikesFirst` +
a generalized N-battler turn-order sort), `src/engine/turnRng.ts` (the
12-step turn-1 RNG ledger, replaying on top of S3's existing `GbaRng`
rather than duplicating the LCG). Tests: `tests/damageCalc.test.ts`,
`tests/turnOrder.test.ts`, `tests/turnRng.test.ts` (19 new, `npm test`
574/574, `npm run build` green). Entirely hermetic — no oracle calls, no
new traces, no RAM probes; every pinned number comes from the already-
committed `src/data/gen/battle1-turn1-ram-dump.json` and reference source.

**Major discrepancy found and fixed: `CalculateBaseDamage` has an
unconditional `+2` at its very end (`pokemon.c:3371`, `return damage + 2;`)
that both this dossier's own §5 hand-verification AND `turn-resolution-
notes.md`'s §3 hand-verification missed.** It's easy to miss reading the
function top-down — it lives after the entire weather/Flash-Fire block, far
past where the physical/special branches' arithmetic ends. Discovered by
decoding the *exact* raw `Random()` u16 output for Rock Slide's
damage-spread roll from the committed dump's LCG transition
(`gRngValue`: `2176095973` → `435971572`, tick 2337) and finding that only
`base=32` (not §5's hand-derived `base=30`) reproduces the dump's own
`gBattleMoveDamage=42` bit-exactly against that real roll — `30→STAB 45→
spread with the real roll = 39 ≠ 42`; `32→STAB 48→spread with the real
roll = 42` exactly. Cross-checked against the dump's own raw per-tick
`moveDamage` column, which independently confirms the intermediate values:
tick 2335 (post-`Cmd_damagecalc`, pre-STAB) = **32**; tick 2336
(post-`Cmd_typecalc` STAB) = **48**; tick 2337 (post-spread) = **42**. This
is now `calculateBaseDamage`'s pinned Tier-1 regression case (`tests/
damageCalc.test.ts`), LCG-step-verified end to end: accuracy roll (hit,
`calc=60` after Grovyle's evasion stage 7 + BRIGHT_POWDER's 10% cut) → crit
roll (not a crit) → damage-spread roll (42) all independently reproduce the
dump's real per-step RNG transitions and outputs, not just the final
number.

**Second-order consequence: `turn-resolution-notes.md` §3's Fury Cutter
"this was a critical hit" conclusion is very likely itself an artifact of
the same missing-`+2` bug**, and the brief's own stated regression case
(`atk103/def56/pow10/lvl50/crit×2/no-STAB/neutral → 3`, inherited from
`turn-resolution-notes.md` §6 item 1's condensed one-liner) is internally
inconsistent with the corrected formula — `def56` is Grovyle's *own*
defense (irrelevant; Grovyle is Fury Cutter's attacker, not its defender)
and, worked through `calculateBaseDamage` with the `+2` fix, produces a
spread range of `[17,20]` (crit×2) or `[8,10]` (no crit) — **3 is
unreachable either way**. The defender is actually **Onix** (`def=187`,
matching `turn-resolution-notes.md` §3's own worked prose, not that same
document's §6 summary line), which with the `+2` fix gives `base=4` — and
**3 turns out to be reachable via the ordinary 85–100% spread with NO
crit at all** (15 of 16 equally-likely `Random()%16` outcomes floor to 3;
only the 100% outcome gives 4). Pinned as a corrected regression case in
`tests/damageCalc.test.ts` with the discrepancy documented inline. This
case is *not* independently RAM-verified this session (its source trace was
an uncommitted scratch session, per that document's own header) — the
correction is a formula-consistency argument, not a fresh oracle probe
(this session stayed hermetic per its brief), so it's reported as a
correction with reasoning shown, not asserted as re-verified ground truth.

**Branches exercised (Tier-1-tested) vs. structurally-present-but-untested
this step:**

- **Exercised**: physical-move damage (attack/level/power/defense chain,
  the `+2`, STAB, neutral type-effectiveness lookup), crit determination at
  `critChance` stage 0, the 85–100% random spread, accuracy calc including
  a target's `HOLD_EFFECT_EVASION_UP` item, `GetWhoStrikesFirst`'s plain
  speed comparison (real battle-1 stats, no tie), the full 12-step turn-1
  RNG ledger replayed bit-exactly against the committed dump.
- **Structurally present, NOT exercised by any battle-1 turn-1 fixture**:
  the special-move damage branch (mirrors the physical branch; no special
  move was traced this dossier), crit-chance boosters (Focus Energy,
  Scope Lens, Lucky Punch/Chansey, Stick/Farfetch'd, high-crit move
  effects), Reflect/Light Screen halving, double-battle target-split
  halving, burn-halves-attack (unless Guts), type-effectiveness
  multipliers other than 1x (no super/not-very-effective matchup occurs in
  battle 1 turn 1), `GetWhoStrikesFirst`'s weather-speed-double
  (Swift Swim/Chlorophyll), Macho Brace, paralysis speed-quarter, and Quick
  Claw. The `Random()&1` speed-tie branch is unit-tested **directly** with
  synthetic speeds (`tests/turnOrder.test.ts`), both bit values, since no
  battle-1 pairing ever ties (`turn-resolution-notes.md` §6 risk 4) and no
  oracle trace will ever exercise it.
- **NOT ported at all** (out of scope, no battle-1 turn needs them):
  weather-based damage modifiers (rain/sun/sandstorm/hail, Flash Fire),
  the 6 species-locked hold items (Soul Dew, Deep Sea Tooth/Scale, Light
  Ball, Metal Powder, Thick Club — none of battle 1's 6 mons are eligible
  species), badge boosts (hardcoded off — `ShouldGetStatBadgeBoost` is
  unconditionally `FALSE` for `BATTLE_TYPE_FRONTIER`, which every battle
  this engine models is), Wonder Guard's move-failure side effect (only its
  raw type multiplier is applied via the normal table lookup),
  `sHoldEffectToType`'s type-boosting hold items (battle 1 confirmed
  item-free of these, `docs/battle-turn-notes.md` §7 item 1).

**Data gap found (not fixed this step, noted per the brief's hermetic
constraint):** `src/data/gen/species-stats.json` and `summary-info.json`
(the only committed species-type data) are scoped to the 6-species player
draft pool (ONIX/MAGBY/BAYLEEF/BUTTERFREE/HAUNTER/QUILAVA per
`tools/extract/extract-species-header.ts`'s own `POOL_SPECIES` list) — the
opponent battle-1 mons (GROVYLE/MURKROW/PIDGEOTTO) have **no committed
type-data JSON at all**. This dossier's own §5 asserts "Grovyle is GRASS"
as prose, sourced from reading `reference/pokeemerald/src/data/pokemon/
species_info.h` directly rather than from extracted data — confirmed
again this session (`SPECIES_GROVYLE.types = { TYPE_GRASS, TYPE_GRASS }`,
`species_info.h:7657`) and used as a test fixture constant with that
citation, but a future S7 slice touching Murkrow/Pidgeotto (or any other
frontier-pool species) will need an actual extractor (e.g. widening
`extract-species-header.ts`'s pattern, or a new `extract-species-types.ts`
keyed off `battle-frontier-mons.json`'s species list) rather than
hand-citing source per-species.

**Follow-up (separate worker lane, same day):** the data gap above is
closed — `tools/extract/extract-species-types.ts` now emits a full
species->types table (`src/data/gen/species-types.json`, all 411 real
species) and `tests/damageCalc.test.ts`'s ONIX/GROVYLE fixtures read from
it instead of the hand-cited literal, pinned by `tests/speciesTypes.test.ts`.

## 11. FIGHT submenu ground truth (S7 worktree lane, oracle-only scout — no engine code)

Pins the window from the settled first action menu through the FIGHT
(move-select) submenu: open transition, DOWN/UP/RIGHT/LEFT cursor nav
(+ a held-repeat check), B-close, and the settled submenu's own idle
behavior over 200+ ticks. **Oracle/probe work + docs only** — no
`src/engine/` changes this session, per the worktree brief's scope.

**Method.** Both new traces reuse `battle1-turn1.json`'s own first 41
segments **verbatim** (cumulative 1888 frames, ending in the first `A`
press that dismisses the settled action menu) so every tick number below
stays directly comparable to §2/§9's tables — `identity` mapping, no
shift, per §9 finding 1 (re-verified this session by replaying that exact
prefix again: settled-menu sha and its tick range matched byte-for-byte).
From tick 1888 the two traces diverge:

- `tools/compare/traces-groundtruth/battle1-fight-submenu-nav.json` — open,
  then a full RIGHT->DOWN->LEFT->UP loop through Onix's 4 moves (returns to
  the start), a 40-frame held-DOWN repeat check, B-close, then idle to watch
  the resumed action menu. Dense capture, every tick 1884-2118 (235 of the
  256-capture cap).
- `tools/compare/traces-groundtruth/battle1-fight-submenu-idle.json` — open
  only, then idle-pads to tick 2139 with every tick captured (256 captures,
  the oracle's hard per-trace cap) to watch the settled submenu for drift
  over 200+ idle ticks undisturbed by any further input.

Both run twice, **0 sha mismatches** (235/235 and 256/256 identical across
runs) — every finding below, including the two odd single-tick anomalies in
finding 4, reproduced byte-for-byte on the second run, so they're real
deterministic emulator behavior, not capture flakiness.

**1. The submenu OPEN — a hard cut, not a progressive draw-in.**

| tick | sha256 (12 hex) | what |
|---|---|---|
| 1884-1886 | `d223d98a2da9` | settled action menu (identical to §2's own citation) |
| 1887-1891 (5t) | `b145eaeff966` | **held/frozen** — see below, not a new draw |
| **1892** | `9965bf5b2de9` | **submenu fully drawn** — window frame, all 4 move names, PP counter, type line, and cursor all present simultaneously |
| 1892-1924 | 4-phase cycle (`9965bf5b2de9`/`1e6f506c5b5e`/`1be59a4ef8d4`/`d6f83c6fa9c3`, 9 ticks each) | idle-cycling on ROCK_SLIDE (slot 0) — same 4 shas §2's table already cited for this range, now confirmed as the actual repeating cycle, not just a sample |

Densely capturing every tick 1887-1892 (not just the historically-sampled
ticks) shows **no intermediate/partially-drawn frame** — the screen sits
completely unchanged for 5 ticks (1887-1891), then the entire submenu
(all 5 element categories at once) appears in a single frame at 1892.
Source-confirmed why: `PlayerHandleChooseMove` (`battle_controller_player.c`)
calls `InitMoveSelectionsVarsAndStrings()` synchronously the instant FIGHT
is chosen — this draws the move names/PP string/PP number/type/cursor all
in one call, into an **off-screen** BG0 tilemap region — then hands off to
`HandleChooseMoveAfterDma3`, which just polls `IsDma3ManagerBusyWithBgCopy()`
every tick and does nothing else (no `DoBounceEffect` call, unlike
`HandleInputChooseAction`) until the copy finishes, at which point it flips
`gBattle_BG0_Y` to scroll the pre-drawn region into view in one step. The
5-tick hold is that DMA-wait window (variable-length, gated on `IsDma3Manager
BusyWithBgCopy()`, not a fixed animation): the screen is static because the
action menu's own bounce animation has *stopped being called*, not because
anything is still drawing. **Settle tick: 1892** (6 ticks after the last
settled-menu frame, 5 ticks after the `A` registers).

**2. Cursor navigation.** `gMoveSelectionCursor` (`0x20244b0`, per-battler
array, battler 0 = Onix/player) toggles bit0 on LEFT/RIGHT and bit1 on
UP/DOWN (`battle_controller_player.c`'s `HandleInputChooseMove`, e.g.
`gMoveSelectionCursor[gActiveBattler] ^= 1` for the RIGHT/LEFT branches),
giving a 2x2 grid: `0`=ROCK_SLIDE, `1`=BIND, `2`=DRAGON_BREATH,
`3`=SANDSTORM — confirmed both via this RAM read and via a direct RAM read
of Onix's own move/pp slots at the settle tick (`gBattleMons+0x0C`/`+0x24`,
species 95 = Onix): `move0`=MOVE_ROCK_SLIDE (pp 10/10, TYPE_ROCK),
`move1`=MOVE_BIND (pp 20/20, TYPE_NORMAL), `move2`=MOVE_DRAGON_BREATH
(pp 20/20, TYPE_DRAGON), `move3`=MOVE_SANDSTORM (pp 10/10, TYPE_ROCK) —
`ppBonuses`=0 so max==base PP for all four, matching `src/data/gen/
moves.json`. The nav script's RIGHT->DOWN->LEFT->UP loop (0->1->3->2->0)
exercises every direction exactly once and returns to the start:

| press | tick pressed | cursor RAM updates | pixel content changes |
|---|---|---|---|
| RIGHT (0->1, BIND) | 1909-1910 | same tick as press (1909) | 1 tick later (1910) |
| DOWN (1->3, SANDSTORM) | 1931-1932 | 1931 | 1932 |
| LEFT (3->2, DRAGON_BREATH) | 1953-1954 | 1953 | 1954 |
| UP (2->0, ROCK_SLIDE) | 1975-1976 | 1975 | 1976 |

Consistent 1-tick render lag every time: the RAM cursor write always lands
on the button's first held frame, the visible redraw always lands one tick
later (poll-then-commit-next-frame, the same pattern seen elsewhere in this
dossier). Each of the 4 slots has its **own distinct set of idle-cycling
shas** (zero overlap with any other slot's set) — direct pixel evidence,
independent of the RAM read above, that the PP counter/type line/move name
genuinely redraw per slot, not just the cursor sprite. Returning to
ROCK_SLIDE (the UP press) reuses the exact same 4 shas seen at the original
open (`1e6f506c5b5e`, `1be59a4ef8d4`, `d6f83c6fa9c3`, `9965bf5b2de9`) —
content is a pure function of (selected slot, global phase clock), not of
navigation history. DRAGON_BREATH (slot 2) got the longest dwell time in
this script (via the held-repeat window below) and its full 4-phase set is
directly confirmed twice over: `5dfb782aa6f7` -> `bb2275aaf67c` ->
`691bd17740d3` -> `7f26033168ed` -> repeat, 9 ticks each. BIND/SANDSTORM
were only visited for ~20-tick windows (less than one full 36-tick period),
so only 2-3 of their 4 phases were directly observed this session — the
same 9-tick/4-phase structure held everywhere it was checked, so the
remaining phases are inferred, not independently confirmed.

**Held-repeat check:** holding DOWN for 40 consecutive frames from
ROCK_SLIDE moves the cursor exactly **once** (0->2, on the hold's first
frame) and then holds there for the remaining 39 frames — RAM-confirmed,
`gMoveSelectionCursor` reads `2` for the entire hold plus the following
idle padding, through the B-close and beyond. **No auto-repeat.**
Source-confirmed why: `HandleInputChooseMove`'s DPAD branches all gate on
`JOY_NEW(...)`, never `JOY_REPEAT(...)` — unlike `HandleInputChooseAction`
(the action menu one level up), which tracks `gPlayerDpadHoldFrames` for
its L=A button-mode feature. This submenu's cursor nav has no repeat by
design, verified empirically, not assumed from the source read alone.

**3. B-close.** B registers, the screen holds static for 2 ticks (shorter
than the 5-tick open-side DMA-wait, but the same kind of window — B's
handler in `HandleInputChooseMove` also calls `MoveSelectionDisplayPPString/
PPNumber/MoveSelectionDisplayMoveType` before handing back to
`HandleInputChooseAction`), then cuts directly to the action menu's own
4-phase/36-tick idle cycle: `dfc21fafddb9` -> `d223d98a2da9` ->
`b145eaeff966` -> `fd778a4bb67c` -> repeat. **This set includes the exact
tick-1884-1886 sha (`d223d98a2da9`) and the "open" transition's frozen sha
(`b145eaeff966`) as ordinary 9-tick phases of the same cycle** — direct
confirmation that those weren't special one-off graphics, just the action
menu's regular animation caught mid-phase and frozen while its `DoBounceEffect`
call was suspended during the submenu's DMA-wait windows. **The action menu
resumes the same 4-phase idle cycle it was already running before FIGHT was
opened — it does not reset to a fresh phase.** Evidence beyond the shas
matching: the very first observed submenu-open phase was truncated to 6
ticks instead of a full 9 (`9965bf5b2de9` at 1892-1897, immediately
followed by a full 9-tick `1e6f506c5b5e` phase) — meaning that phase had
already been running for 3 ticks *before* the reveal at 1892, i.e. the
phase clock is a persistent/global counter that keeps advancing whether or
not the submenu (or even the action menu) is currently being redrawn;
opening/closing the submenu only pauses the *visible* redraw during its
DMA-wait windows, never the underlying clock.

**4. Settled-submenu idle behavior: cyclic, same 36-tick period as the
action menu — but not perfectly pixel-stable.** The dedicated 256-capture
idle-only trace (tick 1892-2139, ~6.9 full periods, no input after the
initial open) confirms the exact same 4-phase/9-tick-each/36-tick-total
cycle on ROCK_SLIDE as above, holding cleanly for the entire window with
one exception: **two single-tick anomalous frames**, each a distinct sha
not belonging to the 4-phase rotation, at tick **2071** and tick **2135**
(64 ticks apart; both reproduced identically on the second independent
run, so this is real deterministic behavior, not noise). Cause not
identified this session — a plausible candidate is a slower, independent
per-tick animation (e.g. the mon/healthbox bounce or a blend counter) that
occasionally intersects the submenu's own redraw; flagged as an **open
item** for whoever implements pixel-parity here, in case long-run cycle
fidelity (beyond ~4 periods) matters for that slice's acceptance criteria.

**5. RNG stays flat throughout.** `gRngValue` reads a single constant value
(`3485459011`) across the *entire* window of both traces (ticks 1880-2118
and 1880-2139 respectively) — open, all 4 nav presses, the held-repeat
check, B-close, and both idle-padding windows. Zero `Random()` calls,
confirmed via `tools/probe/ram-probe.py` +
`tools/probe/specs/battle1-fight-submenu-rng-watch.json` (segments spliced
in from the committed trace per that spec's own comment, matching this
project's established convention for specs that mirror a committed trace's
segments) — matches the dossier's established rule that menu navigation
never consumes RNG (§9 finding 3's "animation tasks consume zero `Random()`
calls", now confirmed for submenu nav/close too, not just the open-menu
idle cycle).

**Verification:** both traces run twice, 0 sha mismatches (235/235,
256/256). RNG probe run against both traces' segments, single distinct
value each run. `npm test` and `npm run build` green (no `src/` changes
this section — oracle/probe/docs only, per the worktree brief's scope).

## 12. Turn 2 ground truth (S7 worktree lane, oracle scout — no engine code)

Extends the canonical `battle1-turn1.json` prefix (v5, 2900 frames, §9) past
turn 1's resettled action menu into a full second turn: player picks
**Onix's DRAGON_BREATH** (move slot 2, §11's cursor-grid mapping
`0=ROCK_SLIDE,1=BIND,2=DRAGON_BREATH,3=SANDSTORM`, one `DOWN` press from the
cursor's slot-0 resting position toggles bit1 directly to slot 2 — no
diagonal nav needed). The opponent's move is AI-picked, not scripted;
discovered from RAM (not assumed) to be **ENDEAVOR** (`gLastMoves[1]`=283),
exactly matching §8 point 1's own falsifiable prediction from the prior
session's turn-end tie-break decode.

**Committed artifacts**: `tools/compare/traces-groundtruth/battle1-turn2.json`
(prefix's 44 segments, 2900 frames, byte-for-byte identical — its own tick
2900 capture sha `0269314e68ff...` matches `battle1-turn1.json`'s own final
capture exactly, directly re-verified this session — **plus 6 new
segments**: `A`(2f, open FIGHT), idle(30f), `DOWN`(2f, cursor 0→2), idle(10f),
`A`(2f, confirm DRAGON_BREATH), idle(900f, full turn resolution + settle
margin) — total **3846 frames**, 221 dense/strided `captureFrames` (under
the 256 cap, one file). `src/data/gen/battle1-turn2-ram-dump.json` (953
per-tick rows, ticks 2894-3846, same column convention as
`battle1-turn1-ram-dump.json` plus `status1_0`/`status1_1` columns for the
paralysis check). **Both twice-run byte-identical**: the trace via
`bin/oracle run` (0 sha mismatches across all 221 captures, both runs); the
RAM dump via `tools/probe/ram-probe.py` + `tools/probe/dump-battle-bars.py`
+ `tools/probe/dump-battler-snapshot.py` + `tools/probe/dump-ai-and-hitmarker.py`
(all four re-run independently, diffed byte-for-byte against the committed
dump — 0 mismatches). No new probe tooling needed — all four scripts are
the same ones §6/§9 already committed. No `src/engine/` changes.

### Frame boundaries and RNG ledger

All ticks below are this trace's own absolute indices (shared numbering
with `battle1-turn1.json` through tick 2900, since the prefix is identical).

| tick | event |
|---|---|
| 2894-2900 | settled post-turn-1 action menu (identical to §9's own tail) |
| 2901-2907 | `A` opens the FIGHT submenu (DMA-wait hold, same shape as §11 finding 1) |
| 2908-2932 | submenu settled, idle-cycling on ROCK_SLIDE (cursor's resting slot from turn 1's own choice) — PP now **9/10** (one use), pixel-confirmed at tick 2911 |
| 2933-2934 | `DOWN` pressed — `gMoveSelectionCursor` 0→2 same-tick (§11's cursor-write convention); pixel content (DRAGONBREATH highlighted, PP 20/20, TYPE/DRAGON) confirmed at tick 2940 |
| 2945-2946 | `A` confirms DRAGON_BREATH |
| 2948-2950 | `mainFunc` transitions (3 ticks, same shape as turn 1's own menu-dismiss); `attacker`→1 (Grovyle acts first — turn order unchanged, see below) |
| 2951 | `gCurrentMove`→283 (**MOVE_ENDEAVOR**, Grovyle's moveset slot 1: FURY_CUTTER/**ENDEAVOR**/BRICK_BREAK/DOUBLE_TEAM) |
| 2955-2960ish | "Foe GROVYLE used\nENDEAVOR!" text prints (partial text pixel-confirmed at tick 2955, full text at tick 3135 alongside Onix's already-updated 101/117 HP) |
| 2981 | `gBattleMoveDamage`→16 (`setdamagetohealthdifference`: Onix.hp(117) − Grovyle.hp(101), **not** the normal damage calc — see below) |
| 2983 | **ENDEAVOR's accuracy-check roll** (1 step) — always passes (`calc=100`, no roll can exceed it) |
| 2984 | `gBattleMoveDamage` 16→**8** (`typecalc`'s type-effectiveness step: ENDEAVOR is NORMAL, Onix is ROCK/GROUND — ROCK gives 0.5×, GROUND is neutral, combined 0.5×; no RNG cost) |
| 2987 | `gBattleMoveDamage` 8→**16** (`copyword gBattleMoveDamage, gHpDealt` restores the real HP-diff — type effectiveness only gates the `jumpifmovehadnoeffect` immunity check for this effect, never scales the actual damage dealt) |
| 3098 | Onix's HP-bar sentinel (`-32768`) |
| 3099-3114 | HP-bar drains 116→101 (16 ticks, 16 damage — same 1-unit/tick rule as §5/§9) |
| 3115 | bar "done" sentinel (0) |
| 3116 | `gBattleMons[0].hp` itself updates to **101** (1-tick lag, same rule) |
| 3121 | **unattributed 1-step RNG event** — occurs after Onix's hp updates, before Grovyle's `gLastMoves[]` bookkeeping write; call site not identified this session (flagged below, §12 needs list) |
| 3126 | `gLastMoves[1]`→283 (ENDEAVOR bookkeeping write) |
| 3128 | `gBattlerTarget` 0→1 |
| 3129-3130 | `gCurrentMove`→225 (**MOVE_DRAGON_BREATH**), `gBattlerAttacker`→0 (Onix acts) |
| 3135 | **DRAGON_BREATH's accuracy roll** (1 step) |
| ~3140-3170 | "ONIX used\nDRAGONBREATH!" text + attack animation window (pixel-confirmed at ticks 3170/3306) |
| 3161 | **crit roll** (1 step) |
| 3162 | `gBattleMoveDamage` locks to **15** (post-damagecalc, pre-STAB/type) |
| 3163 | STAB/type step — no change (no STAB, DRAGON-vs-GRASS neutral, no table entry) |
| 3164 | **damage-spread roll** (1 step); `gBattleMoveDamage` locks to **13** |
| 3298 | Grovyle's HP-bar sentinel (`-32768`) |
| 3299-3311 | HP-bar drains 100→88 (13 ticks, 13 damage) |
| 3312 | bar "done" sentinel (0) |
| 3313 | `gBattleMons[1].hp` itself updates to **88** (1-tick lag, same rule) |
| 3318 | **secondary-effect (30% paralysis) roll** (1 step) — does **not** proc (see below) |
| 3323 | `gLastMoves[0]`→225 (DRAGON_BREATH bookkeeping write) |
| 3326-3328 | turn-end bookkeeping begins; `BattleTurnPassed`'s `gRandomTurnNumber` roll (1 step) |
| 3333 | `ShouldSwitch()` group resolves (2 steps — same step count as §8 point 1's turn-1 finding) |
| 3335 | `BattleAI_SetupAIData`+tie-break group resolves (5 steps — same structure as §8 point 1) |
| ~3340-3846 | next (turn 3) action menu settles and idles stably through the trace's end (pixel-confirmed at tick 3846: "What will ONIX do?", Onix 101/117) |

**RNG ledger total: 14 `Random()` calls this turn** (1 ENDEAVOR-accuracy + 1
unattributed + 1 DRAGON_BREATH-accuracy + 1 crit + 1 spread + 1 secondary +
1 turn-pass + 2 ShouldSwitch + 5 AI-setup/tie-break). Every step count is an
LCG-distance replay (not just call-counted), programmatically verified
against the committed dump's own `gRngValue` column — see the dump's own
`rngLedger` field. This is 2 more than turn 1's 12: ENDEAVOR's own
always-passing accuracy check (turn 1's DOUBLE_TEAM, being self-targeted,
skipped `accuracycheck` entirely and cost 0 — §3) plus the one unattributed
step at tick 3121.

**Turn order unchanged**: `gBattlerByTurnOrder`=`[1,0]` (Grovyle before
Onix) — same plain speed comparison as turn 1 (§4), no stat/status change
affects either battler's speed this turn.

### Damage math, hand-worked against `damageCalc.ts`

**Grovyle's move (ENDEAVOR, `EFFECT_ENDEAVOR`)** does **not** exercise
`calculateBaseDamage` at all — confirmed by source
(`data/battle_scripts_1.s:2479-2491`, `BattleScript_EffectEndeavor`) and by
the RAM trace: `setdamagetohealthdifference` sets `gBattleMoveDamage` (via
`gHpDealt`) directly to `attacker_target.hp − user.hp` = 117−101 = **16**,
with no `Cmd_damagecalc`/STAB/spread roll in its path. `typecalc` still
runs afterward (for its `jumpifmovehadnoeffect` immunity gate) and visibly
scales `gBattleMoveDamage` by the type multiplier (16→8, confirmed
NORMAL-vs-ROCK/GROUND = 0.5×: `src/data/gen/type-effectiveness.json` has a
`TYPE_NORMAL`/`TYPE_ROCK` entry at `multiplierTenths:5` and no
`TYPE_NORMAL`/`TYPE_GROUND` entry (neutral 1×), combining to 0.5× overall),
but the script's
very next command (`copyword gBattleMoveDamage, gHpDealt`) **overwrites
that scaled value with the original HP-diff (16)** before it's ever
applied — i.e. type effectiveness gates whether ENDEAVOR *works* at all,
never how much damage it deals. `gBattleMons[0].hp` (Onix) does drop by
exactly 16 (117→101), matching `gHpDealt`, not the type-scaled 8. **This is
a genuinely different code path from `damageCalc.ts`'s ported formula** — a
future engine slice implementing `EFFECT_ENDEAVOR` needs its own
HP-difference function, not a `calculateBaseDamage` call with a fake power
value.

**Onix's move (DRAGON_BREATH, slot 2)**: `power: 60`, `type: TYPE_DRAGON`,
`accuracy: 100`, `effect: EFFECT_PARALYZE_HIT`, `secondaryEffectChance: 30`
(`src/data/gen/moves.json`). **TYPE_DRAGON is a *special*-split type**
under gen 3's type-based (not move-based) physical/special split
(`isTypeSpecial`, `damageCalc.ts` — `TYPE_DRAGON=16 > TYPE_MYSTERY=9`), so
this exercises the **special branch** of `calculateBaseDamage`, not yet
RAM-verified by any prior battle-1 fixture (§8 point 2 flagged this as a
gap — closed by this session for the special branch specifically, still
open for the rest of the item/weather modifier chain per §7's original
inventory).

```
base   = floor(floor(spAttack * power * (2*level/5 + 2)) / spDefense) / 50 + 2
       = floor(floor(36 * 60 * 22) / 71) / 50 + 2      (Onix spA=36, Grovyle spD=71, both RAM-confirmed unchanged since turn 1)
       = floor(floor(47520) / 71) / 50 + 2
       = floor(669.29..) / 50 + 2
       = floor(13.38) + 2 = 13 + 2 = 15
```

Matches the RAM-read pre-STAB `gBattleMoveDamage=15` (tick 3162) **bit-exactly**,
confirming the `+2`-corrected formula (§10) reproduces this fresh roll too,
not just Rock Slide's. No STAB (Onix is ROCK/GROUND, move is DRAGON). Type
effectiveness: DRAGON vs GRASS (Grovyle) has no `type-effectiveness.json`
entry — neutral, matching the observed flat tick 3163 (no change between
the pre-STAB value and the spread roll).

**Every RNG roll this turn independently LCG-decoded and hand-verified
against `damageCalc.ts`'s exported functions** (raw `Random()` u16 outputs
decoded via the exact same `GbaRng`-equivalent LCG the committed dump's
`gRngValue` column uses, replayed by hand for this dossier — not asserted,
computed):

| roll | `gRngValue` transition | raw `Random()` u16 | `damageCalc.ts` call | result |
|---|---|---|---|---|
| DRAGON_BREATH accuracy | `1916845633`→`114241568` | 1743 | `calculateAccuracy({moveAccuracy:100, attackerAccuracyStage:6, targetEvasionStage:7, targetHoldEffect:"HOLD_EFFECT_EVASION_UP", targetHoldEffectParam:10})`→`calc=67`; `rollAccuracyHits(67, 1743)` | **true** (hits) — matches (no miss observed) |
| crit | `114241568`→`1604427283` | 24481 | `rollIsCriticalHit(0, 24481)` (24481%16=1≠0) | **false** — matches `gCritMultiplier=1` |
| damage spread | `1604427283`→`195852426` | 2988 | `applyRandomDamageMultiplier(15, 2988)` (pct=100−(2988%16)=88, floor(15×88/100)) | **13** — matches `gBattleMoveDamage` locking to 13 bit-exactly |
| secondary (paralysis, 30%) | `195852426`→`3387277109` | 51685 | `51685 % 100 = 85`, `85 < 30` → | **false** (no proc) — matches `status1` staying 0 on both battlers the entire trace |
| ENDEAVOR accuracy | `4098214719`→`2002721862` | 30559 | `calculateAccuracy` for acc=100/neutral stages → `calc=100`; any roll passes | **true** (always) |

**Paralysis does not proc on this seed** — `gBattleMons[1].status1` (Grovyle,
the target) and `gBattleMons[0].status1` (Onix) both read `0` at every
single sampled tick 2894-3846 (confirmed via the committed dump's
`status1_0`/`status1_1` columns). This is a fair, representative outcome
for a 30%-chance roll landing 85/100 — not a cherry-picked seed; recorded as
what actually happened, per the brief ("either way is fine, record what
IS").

**Battler stat blocks unchanged from turn 1** (`tools/probe/dump-battler-snapshot.py`,
ticks 2894/3846 — species/stats identical to §5's table, only HP moves):
Onix 117→101 (ENDEAVOR's 16), Grovyle 101→88 (DRAGON_BREATH's 13). Grovyle's
evasion stage stays at **7** (DOUBLE_TEAM's turn-1 stage boost persists
across turns, RAM-confirmed flat the entire trace — stat stages don't reset
turn-to-turn absent a switch or a stage-resetting effect) — directly
relevant since it's still cutting Onix's accuracy roll this turn exactly as
it did in turn 1.

### Text and timing

"Foe GROVYLE used\nENDEAVOR!" and "ONIX used\nDRAGONBREATH!" both print
using the same `STRINGID_USEDMOVE` template §7 item 4 already extracted and
pixel-cross-checked (`{B_ATK_NAME_WITH_PREFIX} used\n{B_BUFF2}`) — visually
confirmed at ticks 3135 and 3170/3306 respectively (both full-text, mid-hold
frames), move/species names resolving through the same already-extracted
`moves.json`/`species-names.json` pipeline, no new template needed. FIGHT
submenu pixel content re-confirmed consistent with §11: ROCK_SLIDE's PP
reads **9/10** at the reopen (one PP consumed by turn 1's use), DRAGON_BREATH
shows PP **20/20** (unused before this turn) with `TYPE/DRAGON` in the
corner.

**Phase timeline**: menu→submenu open (2894-2908, 14 ticks) → cursor nav +
confirm (2908-2950, 42 ticks) → Grovyle's ENDEAVOR resolves including its
own HP-bar drain (2950-3116, 166 ticks, dominated by the anim + 16-tick
drain) → inter-move bookkeeping (3116-3130, 14 ticks) → Onix's DRAGON_BREATH
resolves including its own HP-bar drain (3130-3313, 183 ticks, dominated by
anim + 13-tick drain) → turn-end RNG cluster (3313-3340, 27 ticks) → next
menu settle-and-hold (3340-3846, 506 ticks, pixel-stable). Total turn-2
wall-clock (menu-open to next-menu-settle): **~446 ticks** of actual
resolution (2900→3340ish) versus turn 1's own **~686 ticks** (1886→2586,
handshake §9) — turn 2 is faster mainly because ENDEAVOR's own attack
animation is a plain generic hit (no move-specific animation asset the way
ROCK_SLIDE's falling-rocks or DOUBLE_TEAM's clone-blend were), and neither
move this turn triggers a stat-stage banner (§9's own DOUBLE_TEAM banner
added +66 ticks turn 1 had that turn 2 doesn't).

**Bonus falsifiable prediction (mirrors §8 point 1's own convention)**: the
tick-3335 tie-break group's 5 individual raw rolls were also hand-decoded
(same LCG, not committed as a new probe): `100−(Random()%16)` four times
(11,12,10,9 → simulated scores, unused since `aiFlags=0` still holds this
challenge — reconfirmed via `dump-ai-and-hitmarker.py`, all 4 moves tied at
the default 100) then `Random()%4=1` for the final tie-break. If this
dossier's own moveset-order assumption holds (same as §8 point 1's), this
predicts Grovyle uses **ENDEAVOR again** on turn 3 (slot 1) — checkable by
a future session extending this trace further. Not independently re-derived
from `ShouldSwitch()`'s branch-by-branch source trace the way §8 point 1
did for turn 1 (time-boxed this session) — the 2-step/5-step *counts*
matching turn 1's structure exactly is taken as strong (not proven)
evidence the same code paths fired, not re-verified branch-by-branch for
this turn's specific state (Grovyle 88/143, evasion+1, vs. Onix 101/117).

### What slice E (turn-2 engine) needs — pinned vs. open

**Pinned this session:**
- Full second-turn button sequence (FIGHT submenu reopen when the cursor
  isn't at its default slot-0 rest position — confirmed the cursor stays
  wherever the *previous* turn left it, not a scripted reset, since turn 1's
  own choice was also slot 0 and this session never observed a reset event).
- `EFFECT_ENDEAVOR`'s complete mechanic: HP-difference formula, its
  interaction with `typecalc` (type effectiveness gates immunity only, then
  gets overwritten), and its own 1-step always-passing accuracy roll —
  ready to port as a distinct function from `calculateBaseDamage`.
- `calculateBaseDamage`'s **special branch**, bit-exact against a real
  RAM-observed roll for the first time (turn 1 only exercised the physical
  branch) — no changes needed to `damageCalc.ts`, it already ports both
  branches structurally (§10), this just adds the special-branch fixture.
- `EFFECT_PARALYZE_HIT`'s secondary-effect shape, confirmed identical to
  `EFFECT_FLINCH_HIT`'s (`Cmd_seteffectwithchance`, `Random()%100 < chance`,
  1 RNG step) — the two effects differ only in which status/volatile flag
  `SetMoveEffect` applies, not in the roll mechanics.
- Cross-turn stat-stage persistence (evasion stage 7 carries from turn 1
  into turn 2 without any reset event) — relevant for any slice modeling
  more than one turn.
- A second independent RAM-confirmed sample of every "shape" §5/§9 already
  established (HP-bar 1-unit/tick drain + 1-tick stat-update lag, cursor
  same-tick-write/one-tick-later-redraw, turn-end 1+2+5 RNG cluster
  structure) — reinforces these as general engine rules, not turn-1-only
  coincidences.

**Still open:**
1. **Tick-3121's 1-step RNG event is unattributed** — same category as
   §8 point 1 was before its own follow-up session resolved it; a future
   session should source-trace `BattleScript_EffectEndeavor`'s continuation
   past `adjustsetdamage` (`BattleScript_HitFromAtkAnimation` onward) and
   Grovyle's specific `MOVE_END` item/status checks for this exact state to
   find the call site.
2. **The turn-3 tie-break prediction (ENDEAVOR again, slot 1) is
   unverified** — this session's trace ends at the turn-3 menu settling,
   before any turn-3 button is scripted. A future session extending this
   trace (or a fresh one) can confirm or falsify it directly, the same way
   this session confirmed §8 point 1's own turn-2 prediction.
3. **`ShouldSwitch()`'s specific branch outcomes for turn 2's state**
   (Grovyle 88/143, evasion+1, BRIGHT_POWDER, vs. Onix 101/117) were not
   individually re-traced against source the way §8 point 1 did for turn
   1's state — only the step *count* (2) was confirmed, by analogy. Low
   risk (the count matches and DESTIN plainly doesn't switch, consistent
   with either outcome), but not source-verified this session.
4. **BIND, SANDSTORM (Onix) and BRICK_BREAK, FURY_CUTTER (Grovyle,
   post-first-use) remain unprobed** — this session's scripted second turn
   covers 1 more of Onix's 4 moves (DRAGON_BREATH) and Grovyle's AI picked
   1 more of its own 4 (ENDEAVOR), leaving the same two Onix moves (BIND,
   SANDSTORM) and now-2 Grovyle moves (FURY_CUTTER, BRICK_BREAK) still
   without any RAM ground truth, per §8 point 2's original inventory
   (updated: 5 of 8 distinct battle-1 moves now have ground truth across
   both dossiers — ROCK_SLIDE, FURY_CUTTER, DOUBLE_TEAM, ENDEAVOR,
   DRAGON_BREATH — versus the prior count of 3).
5. **Murkrow and Pidgeotto still never battled** (§8 point 3, unchanged) —
   this session's turn 2 stayed within the same Onix-vs-Grovyle pairing.
6. **Special-branch coverage is now 1 fixture (DRAGON_BREATH) — still no
   Reflect/Light Screen/burn/double-battle-split special-branch case**, all
   of which remain structurally-ported-but-untested per §10's own inventory.

**Verification**: `npm test` 631/631, `npm run build` green (no `src/engine/`
changes this session — the only `src/` addition is the committed RAM dump
under `src/data/gen/`, per the worktree brief's constraint). New trace
twice-run, 0/221 sha mismatches. New RAM dump's 4 constituent probe runs
each twice-run, byte-identical; the assembled dump file itself independently
regenerated from each run's raw probe output and diffed byte-for-byte
against the committed file — identical both times.

## 13. Grovyle's faint + switch-in ground truth (S7 worktree lane, oracle scout — no engine code)

Extends `battle1-turn2.json`'s own 3846-frame prefix (turns 1-2, verbatim)
through three more player turns (3, 4, 5) of the fixed "always ROCK_SLIDE"
battle plan, into **Foe GROVYLE's faint** (turn 5) and DESTIN's forced
switch-in, ending at the next settled action menu. Committed:
`tools/compare/traces-groundtruth/battle1-grovyle-faint.json` (7312 frames,
256 `captureFrames` — dense on the faint/text/switch-in tail, strided
elsewhere, the 256-capture cap), `src/data/gen/
battle1-grovyle-faint-ram-dump.json` (3467 rows, every tick 3846-7312, plus
`battlerSnapshots` at the 6 turn/event boundaries and an `rngLedger`).
**Both twice-run byte-identical** (trace: `bin/oracle run`, 0/256 sha
mismatches across two independent runs; RAM dump: `tools/probe/ram-probe.py`
+ `tools/probe/dump-battler-snapshot.py`, both re-run independently and
diffed byte-for-byte — identical). No `src/engine/` changes; no new probe
tooling needed (reused §6/§12's committed scripts, `dump-ai-and-hitmarker.py`
was available but not needed this session — see open item 5 below).

### HEADLINE: DESTIN sends out PIDGEOTTO, not Murkrow

This session's own brief predicted "DESTIN's next-mon send-out (Murkrow)"
by analogy with the previously-established opponent roster. **That
prediction is wrong** — directly RAM- and pixel-confirmed: `gBattleMons[1]
.species` flips from 278 (GROVYLE) to **17 (SPECIES_PIDGEOTTO)** at tick
6684, and the settled next-menu screen (tick 7215+) visibly reads
"PIDGEOTTO Lv50" (pixel-confirmed, see below). `gBattlerPartyIndexes[1]`
(opponent's party-slot pointer) goes 0→**2** at tick 6682, not 0→1 — i.e.
DESTIN's party is ordered `[GROVYLE(0), MURKROW(1), PIDGEOTTO(2)]` and the
switch-in **skips index 1 (Murkrow) to send index 2 (Pidgeotto) instead**.
This is a real AI decision, not a fixed "next in list" rule — worth
flagging loudly for whichever engine slice models forced switch-ins, since
"send the next living party member in order" is the wrong rule. **Not
resolved this session**: *why* the AI prefers Pidgeotto over Murkrow here
(both are Flying-type and both take the same 2× Rock-Slide weakness, so
it isn't an obvious type-matchup read) — a fresh open item, §13 open list
below. Murkrow itself remains completely unbattled (same gap §12's own
open item 5 already flagged, now narrowed: still true even after this
session's faint).

### Per-turn RNG ledger (RAM-truthed, LCG-step-counted, same method as §3/§12)

All ticks are this trace's own absolute indices (shared numbering with
`battle1-turn2.json` through tick 3846). Every step count below is an
LCG-distance replay against the committed dump's own `rngLedger` field
(`next = 1103515245*v + 24691 mod 2^32`), not just a call count.

**Turn 3** (menu reopen 3846 → next-menu settle ~4892): cursor nav needed —
`gMoveSelectionCursor[0]` reads **2** (DRAGON_BREATH, turn 2's own pick) at
reopen, confirming the pinned "cursor persists across turns" rule (§12); one
`UP` press at tick 3878-3879 flips it back to **0** (ROCK_SLIDE) same-tick,
pixel-redraw one tick later (3880) — same convention as §11/§12. Grovyle
(attacker, speed 90 first as always) uses **ENDEAVOR again** (`gCurrentMove`
283 at tick 3897) — **confirms §12's own falsifiable turn-3 prediction**,
the tie-break roll landed on slot 1 again. Onix uses ROCK_SLIDE (157).
14 `Random()` calls total — bit-for-bit the same total §12 found for turn 2
(1 ENDEAVOR-accuracy + 1 unattributed + 1 ROCK_SLIDE-accuracy + 1 crit + 1
spread + 1 secondary/flinch + 1 turn-pass + 2 ShouldSwitch + 5 AI-tie-break):

| tick | event |
|---|---|
| 3846-3896 | FIGHT submenu reopen (cursor at 2) + `UP` nav (2→0) + confirm |
| 3897 | `gCurrentMove`→283 (ENDEAVOR), attacker=1 |
| 3927-3933 | `gBattleMoveDamage` 13 (base HP-diff, Onix 101−Grovyle 88) → 6 (typecalc 0.5×) → 13 (copyword restore) — same shape as §12 |
| 3929 | ENDEAVOR's own always-passing accuracy roll (1 step) |
| 4059 | Onix hp updates 101→88 (ENDEAVOR's HP-bar drain done, 1-tick lag rule) |
| 4064 | unattributed 1-step RNG event — same category as §12's tick-3121 finding, still not call-site-attributed |
| 4073 | attacker=0, `gCurrentMove`→157 (ROCK_SLIDE) |
| 4078 | ROCK_SLIDE accuracy roll (1 step) |
| 4102 | crit roll (1 step, no crit) |
| 4103-4105 | `gBattleMoveDamage` 32 (base, **includes the unconditional +2** — see damage-math section below) → 48 (STAB) → **47** (spread roll, 1 step) |
| 4333 | Grovyle hp updates 88→41 (HP-bar drain done) |
| 4338 | secondary/flinch roll (1 step, ROCK_SLIDE's 30% chance — no proc) |
| 4348 | turn-pass roll (1 step) |
| 4353 | `ShouldSwitch()` group (2 steps) |
| 4355 | AI-setup/tie-break group (5 steps) — decodes to ENDEAVOR again for turn 4 by the same convention §12 used, **falsified next turn (see turn 4)** |
| ~4360-4892 | next-menu settle-and-hold |

**Turn 4** (4892 → ~5926): cursor already at 0 (no nav needed — confirms
the "cursor persists, ROCK_SLIDE stays selected" rule generalizes past one
carry-over). Grovyle **does not repeat ENDEAVOR this time** — it uses
**DOUBLE_TEAM** (`gCurrentMove` 104, self-targeted, matching §9's turn-1
DOUBLE_TEAM shape) instead, **falsifying turn 3's own tie-break-decoded
prediction from the previous paragraph**. A plausible read (not source-
verified this session, time-boxed): at 41/143 HP, DESTIN's AI switches
strategy from ENDEAVOR (which becomes weaker as Grovyle's own HP drops,
since it equalizes to Grovyle's HP) toward evasion-stacking, but this is
inference from the outcome, not a traced AI-scoring branch. Onix's
ROCK_SLIDE brings Grovyle to 41→1 (not fainted — a 1-HP survival, entirely
a matter of which spread-roll value landed, not scripted). 12 `Random()`
calls total (2 fewer than turn 3 — DOUBLE_TEAM, like turn 1's own use,
costs 0 RNG, §3/§9):

| tick | event |
|---|---|
| 4892-4930 | FIGHT submenu reopen (cursor at 0) + confirm (no nav) |
| 4931 | `gCurrentMove`→104 (DOUBLE_TEAM), attacker=1, 0 RNG cost |
| 5311 | attacker=0, `gCurrentMove`→157 (ROCK_SLIDE) |
| 5316 | accuracy roll (1 step) |
| 5340 | crit roll (1 step, no crit) |
| 5341-5343 | `gBattleMoveDamage` 32→48→**40** (spread roll, 1 step) |
| ~5560 | Grovyle hp updates 41→1 (HP-bar drain done) |
| 5569 | secondary/flinch roll (1 step, no proc) |
| 5579 | turn-pass roll (1 step) |
| 5583 | `ShouldSwitch()` group (2 steps) |
| 5585 | AI-setup/tie-break group (5 steps) |
| ~5590-5926 | next-menu settle-and-hold |

**Turn 5 — the faint turn** (5926 → 7312, see full timeline below).
Grovyle uses ENDEAVOR again (`gCurrentMove` 283 at tick 5965): Onix
88→1 (HP-diff 87, matching 88−1). Onix's ROCK_SLIDE (base 32→STAB
48→spread **41**) brings Grovyle from 1 to **0 — faints**. 12 `Random()`
calls in the turn's own move-resolution phase, same shape as turn 3's
ENDEAVOR turn minus the always-passing-accuracy roll's usual place (see
open item 2 below for the one ambiguous step) plus the faint/switch-in
tail's own extra 6-step cluster at the very end (tick 7215/7221, see
below) — **rngLedgerTotalSteps in the committed dump is 38** for the whole
3846-7312 window (14+12+12).

### Damage math, checked against `damageCalc.ts`

**Both of turn 3's and turn 4's ROCK_SLIDE hits, and turn 5's fatal one, are
bit-exact against `damageCalc.ts`'s physical-branch formula including the
unconditional `+2` the module's own doc comment already documents** (line
192-199 of `src/engine/damageCalc.ts`, self-citing this very dossier's §10):

```
base(+2) = floor(floor(atk * power * (2*level/5+2)) / def) / 50 + 2
         = floor(floor(51 * 75 * 22) / 56) / 50 + 2 = 30 + 2 = 32   (atk/def unchanged all 5 turns, RAM-confirmed each snapshot)
STAB     = floor(32 * 15/10) = 48
spread   = floor(48 * m/100), m in [85,100] -> range [40,48]
turn 3: RAM gBattleMoveDamage locks to 32->48->47 (m=98)   — 47 in [40,48], matches
turn 4: RAM gBattleMoveDamage locks to 32->48->40 (m=85, the range floor) — 40 in [40,48], matches
turn 5: RAM gBattleMoveDamage locks to 32->48->41 (m=87)   — 41 in [40,48], matches (Grovyle's 1 HP << 41, so the actual HP loss is capped at 1, not 41 — `gBattleMoveDamage` itself still reports the uncapped 41)
```

**No mismatch** — this is a *confirmation*, not a new finding: §5's original
turn-1 hand-calc (`base = floor(...) = 30`, no +2) was actually
under-verified — it never directly compared its hand-derived 30 against the
RAM-read intermediate value, only against the *final* post-spread 42, which
coincidentally falls inside both the correct (`base+2=32`) and the stale
(`base=30`) hypothesized ranges (`[40,48]` and `[38,45]` overlap at 40-45).
Re-checking `battle1-turn1-ram-dump.json`'s own `moveDamage` column this
session confirms turn 1's ROCK_SLIDE **also** locked to 32 pre-STAB, not
30 — i.e. `damageCalc.ts`'s `+2` was already correct (§10 already fixed and
documented this), and every ROCK_SLIDE hit across all 5 turns of this
dossier (turns 1, 3, 4, 5) is consistent with it. Recorded here so a future
reader doesn't get confused re-deriving §5's stale 30-based range by hand.

**ENDEAVOR** (turns 3 and 5) reconfirms §12's mechanic exactly both times:
`gBattleMoveDamage` set to `target.hp − user.hp` (turn 3: 101−88=13, turn 5:
88−1=87), `typecalc` scales it by the NORMAL-vs-ROCK/GROUND 0.5× (13→6,
87→43) purely for the immunity gate, then `copyword` restores the real
HP-diff (→13, →87) before it's applied. Both turns' own "always-passing"
1-step accuracy roll observed (tick 3929, tick ~5997).

**Onix's own Sitrus Berry** (new finding, not previously catalogued):
after turn 5's ROCK_SLIDE, Onix sits at 1/117 (well under the classic
"HP ≤ 1/4 max" berry-proc threshold, 117/4=29.25). Mid-way through the
switch-in sequence, the settled-menu pixel capture (tick 7215+) shows
"ONIX's SITRUS BERRY restored health!" and Onix's HP reads **31/117** —
i.e. Onix silently held a Sitrus Berry this whole dossier and it procs the
instant HP crosses the threshold, mid-sequence, well before the player
regains control. `31−1=30` healed; a naive `floor(117/4)=29` under by 1 —
**not reconciled against the exact berry-heal formula this session** (open
item below; could be a rounding convention this dossier hasn't extracted,
e.g. round-half-up vs round-down, or `ceil`). This item was entirely
outside §7's original data-needs audit (which only inventoried the
*opponent's* three held items) — the **player's own rental mon can also
hold an item**, a previously-unexplored mechanic.

### Faint + switch-in sequence timeline

| tick | event |
|---|---|
| 6213-6247 | Onix's ROCK_SLIDE resolves (accuracy/crit/spread rolls, `gBattleMoveDamage` locks to 41) |
| ~6290-6420 | HP-bar drains toward 0 (1-unit/tick rule, same as every prior hit) |
| 6429 | `gBattleMons[1].hp` itself updates to **0** (1-tick lag rule, same as every prior hit) — Grovyle has fainted at the RAM level |
| 6429-~6560 | **screen frozen** on "ONIX used ROCK SLIDE!" (pixel-confirmed, tick 6500) — `gBattleMainFunc` reads a single constant value for **2531+ ticks** with zero further state change in a dedicated no-extra-input control run (see finding below) |
| **~6562** | an extra player **A press is required** to advance past this point (see headline finding below) |
| ~6570-6600 | "Foe GROVYLE fainted!" prints (pixel-confirmed, tick 6600) |
| ~6600-6680 | "[BUG CATCHER] DESTIN sent out\nPIDGEOTTO!"-shaped text scrolls in (partial text pixel-confirmed mid-scroll at tick 6700, reading "BUG CATCHER DE...") — **DESTIN's trainer class is BUG CATCHER**, a new fact, not previously recorded in this dossier |
| 6682 | `gBattlerPartyIndexes[1]` 0→**2** (party-slot switch commits) |
| 6684 | `gBattleMons[1].species` 278→**17** (PIDGEOTTO), `hp`→156/156 (full health, fresh switch-in) |
| ~6684-7215 | ball-throw/materialize/healthbox-swap animation plays out (not individually pixel-itemized this session — time-boxed, see open item 4) |
| ~7215 | mid-sequence, Onix's Sitrus Berry procs (1→31 HP) — see damage-math section |
| 7215 | `gBattleMainFunc` settles to the same dispatcher value used by every prior turn's settled action menu (134463093) |
| 7215-7221 | a final small RNG cluster (1 + 5 steps) — plausibly the AI pre-scoring Pidgeotto's own first move the same way §12's turn-end cluster pre-scored Grovyle's, but the step count (6, not the usual 2+5=7) doesn't cleanly match `ShouldSwitch`+tie-break's usual shape — **not resolved this session**, open item below |
| 7215-7312 | settled "What will ONIX do?" menu vs. **PIDGEOTTO Lv50**, Onix 31/117 — pixel-confirmed (tick 7300, tick 8562 in the exploratory over-run both show the identical settled screen) |

**Does the opponent get a free turn, or does the player choose immediately
after the switch-in?** Directly answered: **no separate "opponent's free
turn" prompt of any kind is shown to the player** — the switch-in itself
*is* DESTIN's action for that exchange (there is no move used, no damage
dealt by Pidgeotto), and the very next thing the player sees is a fresh,
fully-interactive "What will ONIX do?" menu targeting the newly-arrived
Pidgeotto. The player does not get to act *during* Grovyle's death or the
switch-in animation (no input is read except the one dismiss-press below);
the first opportunity to act is this next settled menu.

### HEADLINE: text after a KO is button-gated, not auto-timed

Every other text/animation window in this dossier (§9's move-use text, §12's
ENDEAVOR/DRAGON_BREATH text, this session's own DOUBLE_TEAM/ENDEAVOR text
on turns 3-4) resolved **fully automatically** inside a fixed idle-frame
budget — no button press beyond the initial move-confirm was ever needed,
confirmed as far back as §12's turn 2 (946 frames total, only 1 confirm
press). This session directly falsifies that as a general rule: a **dedicated
control run** extended turn 5 with **3000 pure-idle frames and no further
input** after the ROCK_SLIDE confirm press — `gBattleMainFunc` and every
other watched address (species, HP, absent-flags, exec-flags) sat **frozen
bit-for-bit from tick 5964 through tick 8960** (2996 consecutive idle ticks,
~50 seconds of real time), never reaching the "Foe GROVYLE fainted!" text
at all. A second run, identical up to that point but with **one extra `A`
press inserted** at tick 6562, reached the fainted text within 8 ticks and
fully resolved through switch-in to a settled menu by tick 7215 — **562
ticks after the press**, nowhere near the 2996-tick control window's
length, so this isn't "it just needed more idle time," it is genuinely
input-gated. **Pinned rule: a KO's own "used move" message holds
indefinitely until the player presses A — ordinary (non-fainting) move-use
text does not.** This is a real, previously-undocumented difference in this
dossier's model of battle-message pacing, and it directly matters for any
future engine slice's input-handling state machine (a naive "auto-advance
every message on a timer" implementation would deadlock forever on a KO).

### What the faint/switch-in engine slice needs — pinned vs. open

**Pinned this session:**
- The full turn-3/4/5 button sequence (cursor-persistence rule holds a
  second and third time — no nav needed once ROCK_SLIDE is already
  selected; one `UP` press suffices to leave DRAGON_BREATH's slot).
- Grovyle's HP-driven AI switches its own move choice turn-to-turn
  (ENDEAVOR on turns 2-3, DOUBLE_TEAM on turn 4, ENDEAVOR again on turn 5)
  — **the tie-break/AI-setup RNG cluster's *decoded* prediction from one
  turn does not reliably predict the next turn's actual move** (turn 3's
  own decoded tie-break wrongly predicted turn 4's ENDEAVOR — see the
  turn-4 ledger entry) — a caution against over-trusting the tie-break
  decode as a forward predictor without also modeling whatever HP/state-
  dependent branch flips DESTIN's AI strategy near-KO.
- `damageCalc.ts`'s existing `+2` physical-branch constant is confirmed
  correct against 3 more independent ROCK_SLIDE RAM samples (turns 3, 4,
  5) — no engine change needed, this just adds fixtures and corrects
  §5's own stale prose (which the engine code had already gotten right).
- The complete faint sequence shape: HP-bar drain → 1-tick-lag hp==0 →
  **button-gated pause** → fainted-text → switch-in text/animation →
  party-index + species + full-HP battler-slot swap → settled menu — a
  ready-to-implement state-machine outline, including the specific gate
  (headline finding above) a naive auto-advance implementation would miss.
- The switch-in is **not** "next party member in list order" — DESTIN
  skipped index 1 (Murkrow) for index 2 (Pidgeotto); any switch-in AI
  model needs an actual selection rule, not sequential fallback.
- No separate "opponent's free turn" UI state exists — the switch-in IS
  the opponent's action; the player's next menu is a normal, fully
  interactive action-select against the new mon.
- The player's own rental mon (Onix) can hold a berry-class item that
  auto-procs on a HP threshold mid-sequence, independent of player input —
  previously unmodeled (§7's data-needs audit only covered opponent items).

**Still open:**
1. **Why DESTIN picks Pidgeotto over Murkrow** — not source-traced this
   session (time-boxed); both are Flying-type with the same Rock-Slide
   weakness, so it isn't an obvious type read. `dump-ai-and-hitmarker.py`
   (already committed, unused this session) is the natural next tool —
   it reads the AI's own scratch struct (`aiState`/`score[4]`/`aiAction`)
   and might resolve this directly against a switch-in-scoring trace.
2. **Two RNG steps remain unattributed**: tick 4064 (turn 3) and tick 6206
   (turn 5, occurring *before* `gCurrentMove` flips to ROCK_SLIDE, unlike
   every other turn's analogous step) — same open category as §12's own
   tick-3121 finding, now with a third data point that doesn't fit the
   exact same relative position, suggesting the unattributed step's timing
   is state-dependent, not fixed-offset from a turn boundary.
3. **The tick-7215/7221 post-switch-in RNG cluster (1+5=6 steps) doesn't
   cleanly match the established `ShouldSwitch`(2)+tie-break(5)=7 shape** —
   either `ShouldSwitch` costs only 1 step right after an actual switch (a
   plausible short-circuit — nothing left to decide, so less work), or one
   of this session's other "1-step" entries is secretly part of this
   group and got mis-bucketed by tick-proximity alone. Not source-traced.
4. **The switch-in animation itself (ball throw / sprite materialize /
   healthbox swap, roughly ticks 6684-7215) was not individually
   pixel-itemized** the way §9 itemized DOUBLE_TEAM's clone animation or
   §11 itemized the FIGHT submenu's open transition — the committed trace's
   dense capture window covers it (so the pixels exist for a future
   session to walk frame-by-frame) but this dossier doesn't narrate it.
5. **Onix's Sitrus Berry heal (1→31, not the naive floor(117/4)=29→30)**
   is unreconciled against an exact formula — a cheap follow-up (the berry
   heal fraction/rounding is probably in the same item-hold-effects data
   §7 already extracted, `HOLD_EFFECT_RESTORE_HP` or similar, not yet
   cross-checked against this specific roll).
6. **BIND, SANDSTORM (Onix) and BRICK_BREAK, FURY_CUTTER (Grovyle) remain
   permanently unprobed** — Grovyle fainted this session without ever
   using its other two moves, so this branch of §12 open item 4 is now
   closed off entirely for this specific mon (unlike Onix's moves, which
   remain reachable in a future battle/session).
7. **Pidgeotto and Murkrow's own movesets/battle behavior are entirely
   unexplored** — this session only confirms Pidgeotto's stat block
   (atk 98, def 61, speed 77, spAtk 56, spDef 56, hp 156/156, level 50)
   via `dump-battler-snapshot.py`, not any move it uses (the trace ends
   at the menu settle, before the player picks turn 6's action).

**Verification**: `npm test` and `npm run build` green (no `src/engine/`
changes this session — the only `src/` additions are the committed trace
under `tools/compare/traces-groundtruth/` and the RAM dump under
`src/data/gen/`, per the worktree brief's constraint). Trace twice-run,
0/256 sha mismatches. RAM dump's constituent probe runs twice-run,
byte-identical; the assembled dump file independently regenerated and
diffed byte-for-byte against the committed file — identical both times.

## 14. Battle 1 continuation, turns 6-14 (S8 worker session, oracle scout — no engine code): PP exhaustion forces a move switch, Onix faints, the WIN is not reached this session

**Scope change from the assigned brief, stated plainly up front**: the brief
asked for the rest of battle 1 through the WIN (KO Pidgeotto and Murkrow).
That did not happen this session. Playing the fixed "always ROCK_SLIDE"
plan through Pidgeotto's fight hits a real, previously-undiscovered wall —
**ROCK_SLIDE runs out of PP** (see headline below) — forcing an adapted
move choice, and the adapted line results in **Onix fainting to Pidgeotto
at turn 14**, not a Pidgeotto/Murkrow KO. Murkrow was never reached.
Committed: `tools/compare/traces-groundtruth/battle1-victory.json` (misnamed
in hindsight — it does not reach a victory; kept as the deliverable's
specified filename since this session did not have time left to rename +
re-verify — flagged here so a future session isn't misled by the filename),
19634 frames, extends `battle1-grovyle-faint.json`'s own 7312-frame prefix
verbatim, 256 `captureFrames` dense on the PP-exhaustion/move-switch turn,
the faint turn, and the post-faint switch-menu tail. `src/data/gen/
battle1-victory-ram-dump.json` (12323 rows, every tick 7312-19634, plus
`battlerSnapshots` at every turn boundary + the faint tick + the two
post-faint menu settles, and an `rngLedger`). **Both twice-run
byte-identical** (trace: `bin/oracle run`, manifests diffed identical
across two independent runs; RAM dump: `tools/probe/ram-probe.py` +
`tools/probe/dump-battler-snapshot.py` each independently re-run and
diffed byte-for-byte, and the assembled dump file independently
regenerated from the second run's raw output and diffed byte-for-byte
against the committed file — identical both times).

### HEADLINE: ROCK_SLIDE runs out of PP mid-battle — a previously unmodeled mechanic

Onix's ROCK_SLIDE has 10 max PP. The "always ROCK_SLIDE" plan has now used
it in every turn where Onix wasn't testing something else: turns 1, 3, 4, 5
(the Grovyle dossier — turn 2 used DRAGON_BREATH instead, per §13's own
cursor-persistence note) + turns 6-11 this session = **10 total uses**.
Turn 12's menu reopen shows ROCK_SLIDE at **0/10 PP** (pixel-confirmed,
`tools/probe` screenshot), and confirming it does *nothing*: no menu
transition, no text, no `Random()` calls at all — the game silently
refuses the selection and sits frozen on the FIGHT submenu indefinitely
(verified with a 3000+-frame idle control run, `gRngValue` bit-for-bit
static the entire time, same diagnostic method §13 used for the KO-text
gate). This is a **new class of finding**: no prior section of this
dossier tracked PP at all. **Pinned rule for any future engine slice: PP
must be tracked per move per battler and decremented on every use
(hit or miss) — a naive "replay the fixed script forever" harness will
silently deadlock the instant a scripted move's PP hits 0, exactly as this
session's raw exploration did before the cause was diagnosed.**

**Adaptation made this session** (per the brief's own contingency
instruction): switched Onix's selection from ROCK_SLIDE (slot 0) to
**DRAGON_BREATH** (slot 2, Onix's other already-partially-used damaging
move, 20 max PP, 19/20 remaining going into turn 12 thanks to turn 2's own
prior use) via one `DOWN` press. This is a *judgment call*, not the only
option (BIND and SANDSTORM were also legal and were spot-tested — BIND
missed the one time it was tried at 0-PP-recovery turn 12 in a throwaway
side-branch, dealing 0 progress vs. DRAGON_BREATH's near-OHKO in the
committed line; not exhaustively compared). Documented explicitly per the
brief's request: **DRAGON_BREATH was chosen because it is Onix's own
highest-power remaining move with no PP problem**, not because it carries
a type advantage (Dragon vs. Flying is neutral — ROCK_SLIDE's 2× Rock-vs-
Flying edge is lost the moment PP forces this switch, which matters for
why the fight got dangerously close afterward, see below).

### Per-turn ledger, turns 6-14 (RAM-truthed; move IDs decoded against `reference/pokeemerald/include/constants/moves.h`)

Pidgeotto's own moveset, newly discovered this session (previously
completely unprobed, §13 open item 7): **FEATHER_DANCE (297, lowers
Onix's Attack, no damage), AERIAL_ACE (332, damaging, always-hit),
SAND_ATTACK (28, lowers Onix's accuracy, no damage), QUICK_ATTACK (98,
damaging, +1 priority)**. All ticks below are this trace's own absolute
indices (shared numbering with `battle1-grovyle-faint.json` through tick
7312).

| turn | tick range | Pidgeotto's move | Onix's move | hp0 (Onix) | hp1 (Pidgeotto) |
|---|---|---|---|---|---|
| 6 | 7312-8346 | FEATHER_DANCE (no dmg) | ROCK_SLIDE (hit) | 31→31 | 156→113 (−43) |
| 7 | 8346-9380 | FEATHER_DANCE (no dmg) | ROCK_SLIDE (hit) | 31→31 | 113→82 (−31) |
| 8 | 9380-10414 | FEATHER_DANCE (no dmg) | ROCK_SLIDE (**miss**) | 31→31 | 82→82 (0) |
| 9 | 10414-11448 | QUICK_ATTACK (hit) | ROCK_SLIDE (hit) | 31→24 (−7) | 82→61 (−21) |
| 10 | 11448-12482 | AERIAL_ACE (hit) | ROCK_SLIDE (hit) | 24→14 (−10) | 61→38 (−23) |
| 11 | 12482-13516 | FEATHER_DANCE (no dmg) | ROCK_SLIDE (hit, **PP 10→0**) | 14→14 | 38→16 (−22) |
| 12 | 13516-14962 | AERIAL_ACE (hit) | **DRAGON_BREATH** (hit, PP switch) | 14→4 (−10) | 16→1 (−15, near-OHKO) |
| 13 | 14962-16396 | SAND_ATTACK (no dmg, −1 accuracy stage) | DRAGON_BREATH (**miss**) | 4→4 | 1→1 (0) |
| 14 | 16396-17830 | QUICK_ATTACK (hit, priority — **Onix faints before acting**) | (never resolves) | 4→**0** | 1 (unchanged) |

`gBattleOutcome` stays **0** through the entire trace (through tick 19634)
— Onix's own faint does **not** end the battle, see next section.
`rngLedgerTotalSteps` for the whole 7312-19634 window is **93** across 61
`Random()`-consuming events (same per-turn shape as §12/§13: 1-step rolls
for accuracy/crit/spread/secondary/turn-pass, a 2-step `ShouldSwitch()`
pair, and periodic 5-step AI-tie-break clusters at turn boundaries —
turns 6,7,10,11,12 each match this exact shape; turns 8,9,13 have fewer
steps consistent with a miss or a status move skipping the spread-roll
and/or secondary-effect steps).

### Turn 13's miss is genuinely unlucky, not move-dependent — a small methodology note

A side-branch this session tested substituting **BIND** for DRAGON_BREATH
at turn 13 (same RNG-consumption point, different move). Both produced
the **identical resulting `gRngValue`** (415355474) and the identical
"nothing lands" outcome. Since DRAGON_BREATH's accuracy (100, ×2/3 after
Sand Attack's −1 stage ≈ 67%) is strictly better than BIND's (85, ×2/3 ≈
57%), and both missed against the same underlying random draw, **the draw
itself must have exceeded even the higher threshold** — i.e., this was a
real, unavoidable-by-move-choice bad roll, not a fixable move-selection
mistake. Recorded so a future session doesn't waste time re-deriving this.

### The faint sequence: Onix faints, but the battle does NOT end — a major, previously-unknown finding

Turn 14: Pidgeotto's QUICK_ATTACK carries +1 priority, so it resolves
**before** Onix's own DRAGON_BREATH regardless of speed — `gBattleMons[0]
.hp` drops 4→0 at tick 16556 (matching the established "hp==0 lags the
final visible hit by ~1 tick" convention from §13), and **Onix's own
queued move never executes at all this turn** (`gCurrentMove` never
updates past QUICK_ATTACK's own value for the rest of the turn). The
screen freezes on "Foe PIDGEOTTO used QUICK ATTACK!" — pixel-confirmed
— exactly like every other move-use message in this dossier, **not** like
a KO-message freeze (§13's headline finding: KO text is button-gated).
Recorded to sharpen §13's own rule: **the button-gate applies to the
*victim's own* faint acknowledgment ("X fainted!"), not to the attacker's
ordinary move-announcement text that merely precedes a faint.** One `A`
press (matching every other message-advance in this dossier) reaches
"ONIX fainted!" and, critically:

**the battle does not end.** `gBattleOutcome` stays 0. Instead, one more
`A` press (dismissing "ONIX has no energy left to battle!", pixel-
confirmed) opens a **"Choose a POKéMON."** party-select screen — pixel-
confirmed, tick 18732 — listing **MAGBY (Lv50, 138/138 HP)** and
**BAYLEEF (Lv50, 153/153 HP)** as available replacements. This is the
first direct, in-battle confirmation of **the player's actual 3-mon
draft roster for this challenge: ONIX + MAGBY + BAYLEEF**, drawn from the
6-mon rental pool the v3/v5 bootstrap already pins (`ONIX, MAGBY, BAYLEEF,
BUTTERFREE, HAUNTER, QUILAVA`) — confirming the first 3 pool slots were
the ones drafted, not previously verified anywhere in this dossier.
Selecting a mon (one more `A` press, tick 19634) opens a **"Do what with
this Pokémon?" → SEND OUT / SUMMARY / CANCEL** submenu — pixel-confirmed —
which is where this session's committed trace ends (frame-exact, see the
final `captureFrames` entry).

**Open, not resolved this session**: the exact button/timing needed to
actually confirm SEND OUT and complete the switch. Several attempts this
session (pressing `A` again on the submenu's presumed default, pressing
`UP` then `A` in case the default is CANCEL, waiting 2500+ idle frames
with no further input) all left the game parked on the identical
"ONIX has no energy left to battle!" message / party-select / submenu
loop without the switch ever committing (`gBattlerPartyIndexes[0]`
observed flat at 0 the entire time — never advances to Magby's or
Bayleef's party slot). This was **not chased to ground** — time-boxed.
The most likely next step for a future session: find the submenu's own
cursor RAM address (not yet located) and directly confirm which entry the
default cursor sits on and what its exact confirm gesture is, rather than
guessing blind from screenshots (this session's own approach, which
repeatedly mis-diagnosed a legitimate no-damage turn as a freeze before
finally isolating the real PP-exhaustion bug — see the false-start note
below for why that cost significant session time).

### False-start note: not every "nothing changed" state is a freeze

This session repeatedly mistook a **legitimate mutual-miss turn** (both
combatants' moves miss or deal no damage, so no RAM field the probe
watches changes) for a genuine input-gated freeze, because early diagnostic
scripts didn't log `gRngValue` alongside HP/species. The fix: **always
include `gRngValue` in any "is this turn actually resolving" check** — a
real freeze shows `gRngValue` *and* every other watched field bit-for-bit
static across the entire idle window (as the PP-exhaustion case genuinely
does); a legitimate no-progress turn still advances `gRngValue` by at
least one `Random()` call (the failed accuracy roll itself). Worth pinning
here since it is exactly the kind of tooling-conflation error a future
session (or an engine slice's own test harness) could repeat.

### What S8's first engine slice needs — pinned vs. open

**Pinned this session:**
- **PP must be modeled and decremented per use (hit or miss)** — the
  single biggest new finding. A fixed-script harness (or a naive AI) that
  doesn't track PP will deadlock exactly as this session's own raw
  oracle exploration did.
- Priority moves (QUICK_ATTACK, +1) resolve before slower/non-priority
  moves regardless of Speed, and can prevent the slower battler's own
  queued move from executing at all that turn if it faints first — the
  turn-order model needs a priority tier, not just a Speed sort (this
  generalizes §4's turn-order finding, which only ever tested same-
  priority moves).
- **A battler's own faint does not end the battle** if that side has
  healthy party members remaining — it triggers a **mandatory
  party-select UI flow** (`gBattleOutcome` stays 0 throughout), distinct
  from both the ordinary action-select menu and the opponent-switch
  sequence §13 documented. The player's actual draft roster this
  challenge is **ONIX + MAGBY + BAYLEEF** (RAM- and pixel-confirmed here
  for the first time).
- The KO-message button-gate (§13) applies specifically to the fainted
  mon's own "X fainted!" text, not to the attacker's preceding ordinary
  move-announcement text — sharpens §13's rule with a concrete
  counter-example (turn 14's "Foe PIDGEOTTO used QUICK ATTACK!" auto-
  advances normally; only the following "ONIX fainted!" gates on `A`).
- Pidgeotto's moveset (FEATHER_DANCE, AERIAL_ACE, SAND_ATTACK,
  QUICK_ATTACK) and its stat-lowering/AI pattern (chip with FEATHER_DANCE/
  SAND_ATTACK while healthy-ish, switch to the damaging AERIAL_ACE/
  QUICK_ATTACK as the exchange tightens) — a real, traced AI behavior
  sample, not yet generalized into a rule.
- damageCalc-relevant: DRAGON_BREATH and AERIAL_ACE hits in this session
  were not hand-verified against `damageCalc.ts`'s formula the way §13
  did for ROCK_SLIDE/ENDEAVOR — flagged as unverified, not as a mismatch
  (no contradicting evidence found, just not checked this session; time-
  boxed).

**Still open (in priority order for a resuming session):**
1. **The exact SEND OUT confirmation sequence** — the single blocker to
   completing this trace's own next step (getting Magby or Bayleef onto
   the field). See the dedicated open paragraph above for what was tried.
2. **The WIN itself, and everything the original brief asked for**
   (Pidgeotto's actual KO, Murkrow's forced send-out, the victory
   fanfare/text, and the post-battle transition into the swap-offer
   screen) — none of this was reached. Pidgeotto is at 1/143 HP in the
   committed trace's final state, i.e. very close to fainting once a
   healthy replacement mon gets even one hit in.
3. Whether BAYLEEF or MAGBY is the "right" choice to send out — this
   session only confirmed both are available at full HP; neither's
   moveset was probed.
4. Murkrow remains **entirely unbattled** — same open item §12 and §13
   both already flagged, now a third session running into the same gap.
5. The submenu's own cursor RAM address is unlocated — needed both to
   resolve open item 1 and as reusable probe-kit knowledge for any future
   forced-switch scripting (fainted mon on either side).

**Verification**: `npm test` and `npm run build` green (checked and
passing after these additions; no `src/engine/` changes this session —
the only `src/` additions are the committed trace under
`tools/compare/traces-groundtruth/` and the RAM dump under
`src/data/gen/`, per the worktree brief's constraint). Trace twice-run via
`bin/oracle run`, manifests (frame count + every capture's sha256)
byte-identical across two independent runs. RAM dump's constituent probe
runs (`ram-probe.py`, `dump-battler-snapshot.py`) each independently
re-run and diffed byte-for-byte; the assembled dump file independently
regenerated from the second run's raw output and diffed byte-for-byte
against the committed file — identical both times.

## 14 addendum. The SEND OUT confirm sequence, cracked — and battle 1's WIN does not fit the oracle's 20000-frame cap from anchor (S8 worktree lane wt-20260719-150558, oracle scout — no engine code)

§14 left one blocker open: the exact button sequence to commit the forced
switch from `battle1-victory.json`'s end state (the SEND OUT/SUMMARY/CANCEL
submenu, tick 18732-19634), plus a frame-budget accounting of whether battle
1's actual WIN can fit in one 20000-frame oracle trace at all. Both are
resolved this session. Committed: `tools/compare/traces-groundtruth/
battle1-switch.json` (19158 frames total, **byte-identical anchor-relative
prefix to `battle1-victory.json`'s own first 106 segments through tick
18732**, then a corrected 6-segment tail; 246 `captureFrames`, dense
(stride 1) across the nav/select/confirm/animation core, stride 5 through
the trailing settle) and `src/data/gen/battle1-switch-ram-dump.json` (427
rows, ticks 18732-19158, `ram-probe.py` against this trace's own segments —
`battle1-victory.json`'s own RAM dump is left untouched per the brief, and
this new file does not re-dump the shared prefix). **Both twice-run
byte-identical**: the trace via two independent `bin/oracle run` calls
(manifests, frame count + every capture's sha256, diffed identical), the RAM
dump via two independent `ram-probe.py` runs against the *committed* trace
file (diffed identical, and separately diffed identical against the
committed dump file itself).

### HEADLINE 1: the "loop" was never an input-readiness gating problem — it was the cursor defaulting to the fainted mon itself

§14 suspected a `gPaletteFade`-style input gate (the summary-screen
precedent cited in the brief). That theory is **falsified this session**:
every A press this session's probing sent registered *immediately* (visible
on the very next few rendered frames each time) — there was no dead window
to wait out. Screenshot-driven probing (`oracle.screen_png()` at a live,
continuing `EmeraldOracle` session — no restart needed between experiments,
since the emulator has no snapshot/restore API but does allow indefinite
forward `advance()` calls within one process, avoiding an O(N) full-prefix
replay per experiment) showed the real mechanism directly:

1. `battle1-victory.json`'s own final committed A press (tick 18732-18734)
   lands on the **"Choose a POKéMON." list**, cursor defaulted to **slot 0
   — ONIX itself** (the just-fainted mon, still listed at the top of the
   screen with its FNT status). Pressing A there does not fail silently or
   get dropped; it correctly opens **"Do what with this Pokémon?" SEND
   OUT/SUMMARY/CANCEL for ONIX** (source-confirmed:
   `HandleChooseMonSelection`'s switch statement has no case for
   `PARTY_ACTION_SEND_OUT`, so it falls to the `default:` arm —
   `party_menu.c:1379-1383` — which unconditionally calls
   `Task_TryCreateSelectionWindow` with **no HP/faint check**, unlike the
   softboiled/use-item/mail/tutor arms which all guard with
   `IsSelectedMonNotEgg` first).
2. Confirming **SEND OUT** on that submenu calls `TrySwitchInPokemon()`
   (`party_menu.c:5800`), which reads `GetCursorSelectionMonId()` — **slot
   0, ONIX** — sees `GetMonData(&gPlayerParty[0], MON_DATA_HP) == 0`, and
   fails with `gText_PkmnHasNoEnergy`, i.e. it reprints **"ONIX has no
   energy left to battle!"** (RAM- and pixel-confirmed: `species0` stays
   95/ONIX, `partyIdx0` stays 0, `mainFunc` never leaves the party-menu
   dispatcher) and returns to the "Choose a POKéMON." list. This is
   *exactly* the loop §14 observed — not a freeze, not a dropped input, but
   a real, silent, always-fails action being genuinely re-executed every
   time, because the previous session's naive A presses never moved the
   cursor off slot 0 first.

### HEADLINE 2: the working sequence

From `battle1-victory.json`'s own tick 18732 (the settled "Choose a
POKéMON." list, cursor on ONIX by default — i.e. `battle1-victory.json`'s
**last 2 segments, the final `A` press and its trailing 900-frame idle, are
both dropped** and replaced):

| press | effect |
|---|---|
| `DOWN` (2f) + ~10f settle | cursor moves ONIX (slot 0) → **MAGBY (slot 1)** — pixel-confirmed via a small cursor-position marker next to the mon's icon, and via a second `DOWN` in a side-probe moving it on to BAYLEEF (slot 2), so `DOWN` walks the list top-to-bottom in party order |
| `A` (2f) + ~30f settle | selects MAGBY → opens "Do what with this Pokémon?" SEND OUT/SUMMARY/CANCEL, cursor defaulted on **SEND OUT** |
| `A` (2f) + ~380f idle | confirms SEND OUT → battle-scene fade, ball-throw/materialize (screen goes to black for several frames, then the battle scene with Pidgeotto reappears), "Your foe's weak! Get 'em, MAGBY!" (not button-gated — auto-advances), settles to **"What will MAGBY do?" FIGHT/BAG/POKéMON/RUN** |

RAM ground truth at the two ends of this window (`battle1-switch-ram-dump.json`):
`species0` 95→**240 (SPECIES_MAGBY, confirmed against `constants/species.h`)**,
`hp0` 0→**138 (138/138, full HP, matches the on-screen bar)**,
`partyIdx0` 0→**1**, `mainFunc` 134471705 (party-menu dispatcher) →
**134463093 (the same settled-action-menu dispatcher constant used by every
other settled menu in this dossier)**. Only **2 `Random()` steps** are
consumed in the whole 426-tick window, both at tick 19102/19109, right at
the transition into the new menu — the same small AI-pre-scoring cluster
§13/§14 already documented at other turn boundaries; the switch-in
animation itself is RNG-free. The settle transition (message → new menu)
was bisected to between **+324 and +344 ticks** after the confirming A
press ends (tick 19102 = not yet settled, tick 19112 = settled, against a
press ending at 18778); the committed script uses **+380** for a ~40-tick
margin, consistent with this dossier's usual settle-margin sizing elsewhere.

### Frame-budget analysis (goal 2)

**(a) How much idle slack does the current script carry?** Less than it
looks. The one large, unambiguous waste was `battle1-victory.json`'s own
trailing **900-frame dead wait after an action that could never succeed**
(pressing A on ONIX's own doomed SEND OUT, repeatedly, per §14's own
account) — that's not really "generous timing," it's a dead end, and this
session's fix eliminates it entirely: the corrected tail needs only **426
more ticks** (18732→19158) to reach a *healthy, settled, actionable* next
menu, **less total than `battle1-victory.json`'s own 19634-frame dead-end**
despite doing strictly more. Within that corrected tail, the measured real
minimum (334-344 ticks post-confirm) vs. the committed 380 is **~90%+
efficient** — not much left to reclaim. The same holds for the *ordinary*
per-turn windows earlier in the script: turns 6-11 each cost a fixed 1034
ticks (`A`+28f settle+`A`+~1000f idle covering both battlers' full move
text/animation/HP-drain/menu-reopen), matching §12's independently-measured
"946 frames, 1 confirm press" for a comparable full turn elsewhere in this
dossier — i.e. these per-turn windows are close to real content-driven
minimums (two move resolutions' worth of text+animation), **not** padded
slop. **Conclusion: there is very little reclaimable idle slack in this
dossier's scripts once the one genuine dead-end (the mis-targeted SEND OUT)
is fixed** — the per-turn costs are close to the real minimum, not an
artifact of over-cautious waiting.

**(b) Can any line win battle 1 from the anchor within 20000 frames?**
Using this dossier's own measured per-turn costs:

- Draft + intro + turns 1-5 (fixed, already committed/verified): **7312
  ticks**.
- The *actual, RNG-determined* line played this dossier (turns 6-14,
  including the PP-forced move switch and 2 genuine misses — turn 8
  ROCK_SLIDE, turn 13 DRAGON_BREATH, both independently confirmed
  unavoidable-by-move-choice bad rolls, §14): **10518 ticks** to Onix's
  faint (tick 17830) + **902 ticks** to the settled party list (18732) +
  this session's **426-tick** fix to a healthy settled menu = **19158
  ticks total**. Remaining budget: **20000 − 19158 = 842 ticks** — under
  one ordinary turn's minimum cost (~1000-1034 ticks, per (a) above), let
  alone enough to finish off Pidgeotto (currently 1/143 HP, so probably
  only 1 more turn) **and** fight Murkrow's entire, completely unscouted
  second Pokémon (open item since §12, still true after 3 sessions — moves,
  level, and bulk all unknown) **and** play the victory fanfare/dialogue
  and post-battle transition. **From the one line this dossier has actually
  ground-truthed, the answer is unambiguously NO — not close.**
- A best-case, hypothetical (not verified this session) zero-miss line:
  Pidgeotto has 156 max HP; the real trace's non-miss ROCK_SLIDE hits
  averaged ~28 damage (43/31/21/23/22 across turns 6,7,9,10,11). Replaying
  turn 8's miss as an average hit would drop Pidgeotto low enough that
  turn 11's hit finishes it, saving 3 turns (~3000-3400 ticks) and never
  triggering the PP exhaustion or the Onix-faint/switch detour at all —
  reaching a Pidgeotto KO in roughly **7312 + 6×1034 ≈ 13516 ticks**,
  leaving **~6484 ticks (≈6 ordinary turns' worth)** for Murkrow's fight
  plus the victory sequence. This is *plausible but genuinely unverified*:
  misses are an emergent property of the deterministic RNG stream tied to
  the exact input timing, not a free script edit — no alternate button
  sequence was found or tested this session that actually avoids those 2
  rolls, and Onix would still enter that fight measurably chipped from
  Pidgeotto's own un-missed hits, quite possibly forcing a switch anyway
  against a totally unscouted Murkrow. **This session cannot respond to
  "does a winning line exist" with a proven yes; only "the one verified
  line misses the cap by a wide margin, and even an optimistic
  best-case estimate leaves uncomfortably little room against an unknown
  final opponent."**

**Escalation-worthy harness finding**: a single continuous oracle trace
spanning all of battle 1 (draft → WIN) very likely does not fit the
20000-frame cap even under favorable assumptions, and definitely does not
fit under the one line this dossier has actually played move-by-move. This
session's own methodology also surfaces a secondary, process-level point
worth the supervisor's attention: every RAM probe this session ran had to
**replay the entire 18732-tick prefix from the anchor** before it could
test anything new (no snapshot/restore API exists in `EmeraldOracle`) —
harmless at ~6-8s/run here, but it is the same structural reason a single
20000-frame trace budget is so easy to exhaust: there is no way to
"resume" a long trace, only to replay it whole. A snapshot/restore
capability (or a raised cap) would both make future long-horizon scouting
cheaper *and* directly address whether a battle-1 WIN can ever be captured
in one committed trace.

### Updated pinned vs. open list

**Newly pinned this session:**
- The SEND OUT confirm sequence (table above) — not gated on any timing
  window; the previous "loop" was a wrong-cursor-target bug
  (`HandleChooseMonSelection`'s `default:` arm skips the HP/faint check
  that every other action type gets), not an input-readiness race.
- `DOWN` walks the "Choose a POKéMON." list in party order (slot 0 → 1 →
  2, i.e. ONIX → MAGBY → BAYLEEF); no auto-skip past the fainted slot.
- The switch-in animation (fade → ball-throw/materialize → flavor text →
  settled menu) is RNG-free (0 `Random()` calls) except a 2-step AI
  pre-scoring cluster right at the final settle, matching the shape already
  documented at other turn boundaries.
- Per-turn script cost is close to its real minimum in this dossier's
  existing traces (§14 addendum (a)) — future scripting shouldn't expect
  much frame budget to be reclaimable from "shortening waits."
- A single oracle trace almost certainly cannot span battle 1 draft-to-WIN
  under the current 20000-frame cap (§14 addendum (b)) — flagged for the
  supervisor to make a harness-level call (raise the cap, add
  snapshot/restore, or accept multi-trace assembly as the permanent model).

**Still open:**
1. Whether MAGBY or BAYLEEF is the better choice — this session sent out
   MAGBY (arbitrary, matching the brief's "pick the first workable") but
   never probed either one's moveset, same as §14 left it.
2. Murkrow remains entirely unbattled — now a fourth session flagging this
   same gap (§12, §13, §14, this addendum).
3. The full WIN sequence (Pidgeotto's actual KO, Murkrow's forced send-out,
   victory fanfare/text, post-battle transition into the swap-offer screen)
   — still not reached, and per (b) above, may not be reachable in one
   trace at all.
4. The best-case "zero-miss" line sketched in (b) is arithmetic, not a
   verified trace — nobody has actually found or tested an input sequence
   that avoids the 2 real misses.

## 15. A faster, RNG-shifted winning line to Pidgeotto's KO, Murkrow's first RAM ground truth, and the WIN still doesn't fit the cap (S8 worktree lane, oracle scout — no engine code)

**Correction to this session's own brief, stated up front**: the brief cited
"Pidgeotto sits at 1/143 HP after turn 5." Both numbers are off — 143 is
**Grovyle's** max HP (§12), not Pidgeotto's (**156**, RAM-confirmed below and
in §14's own table), and the 1-HP state is reached after **turn 12**, not
turn 5 (turn 5 is when *Grovyle* faints, per §13). Likely a telephone-game
merge of two separate facts from §12-§14. Re-verified from the committed RAM
dumps before doing anything else this session (`battle1-victory-ram-dump.json`'s
own `battlerSnapshots`): Pidgeotto is 156/156 at tick 7312 and 1/156 at every
sampled tick from 14962 through the §14-addendum trace's own end.

**Scope**: this session had two deliverables — (1) test whether idle-timing
is a lever on RNG outcomes (it is not, confirmed cheaply), and (2) use the
real lever (move-choice sequence) to search for a faster verified line past
Pidgeotto's fight, then scout Murkrow. Both done. **Headline result: found
and verified a line that KOs Pidgeotto at tick 15887 — under the cap with
2278 ticks to spare to a fully-settled menu against a freshly-identified
Murkrow — a dramatic improvement over §14's verified line (which never KO'd
Pidgeotto at all in 19634 ticks). But Onix enters that Murkrow fight at 4/117
HP as an unavoidable cost of the moves it took to fell Pidgeotto, and
Murkrow (Lv50, Spd 97 > Onix's 76, movepool includes an always-hits STAB
move) faints it 2 turns later without taking a single point of damage back —
verified through tick 19990, 10 ticks under the cap, frozen on Onix's own
un-dismissed faint text. The answer to S8's blocking question is still NO
for every line anyone has actually played move-by-move, but the bottleneck
has moved: it is no longer "can't beat Pidgeotto in time," it is "Onix
arrives at Murkrow too wounded to survive the exchange."**

Committed: `tools/compare/traces-groundtruth/battle1-winline-a.json`
(17722 frames, byte-identical anchor-relative prefix to
`battle1-grovyle-faint.json`'s own 7312-frame prefix, then 8 new turns,
256 `captureFrames` dense on the KO tick/switch-in/settle) and
`battle1-winline-a-murkrow.json` (19990 frames, extends `battle1-winline-a.json`'s
own script verbatim by 2 more turns, 238 `captureFrames` dense on Murkrow's
FLY charge/strike). `src/data/gen/battle1-winline-a-ram-dump.json` (10411
per-tick rows, ticks 7312-17722, plus turn-boundary `battlerSnapshots`,
Murkrow's full struct via a new `battlerFull`, and an `rngLedger`) and
`src/data/gen/battle1-winline-a-murkrow-ram-dump.json` (2269 rows, ticks
17722-19990, same convention, does not re-dump the shared prefix). New probe
tool: `tools/probe/dump-battler-full.py` (extends `dump-battler-snapshot.py`'s
schema with `moves[4]`/`pp[4]`/`item`/`ability`/`types`, needed for Murkrow's
full battle data — none of the existing probes read those fields). **Both
new traces twice-run byte-identical** (`bin/oracle run`, manifests diffed
identical); **both RAM dumps' constituent probe runs twice-run byte-identical**
(`ram-probe.py`, `dump-battler-snapshot.py`, `dump-battler-full.py`, each
independently re-run and diffed byte-for-byte against their own first run).

### HEADLINE 1: the cheap lever check — idle-timing does not move RNG outcomes; move-choice sequence does

Directly tested the brief's priority-1 hypothesis with one minimal probe:
took `battle1-turn2.json`'s own script (DRAGON_BREATH's turn-2 confirm press,
already fully RNG-decoded in §12) and widened the idle window immediately
before that confirm press by **+4 frames** — no button changed, only its
timing shifted. Replayed with a `gRngValue`-per-tick watch
(`tools/probe/ram-probe.py`) and compared every subsequent transition against
§12's own already-published values:

| event | original tick | original transition | shifted tick | shifted transition |
|---|---|---|---|---|
| ENDEAVOR accuracy | 2983 | `4098214719→2002721862` | 2987 | `4098214719→2002721862` |
| unattributed step | 3121 | `→1916845633` | 3125 | `→1916845633` |
| DRAGON_BREATH accuracy | 3135 | `1916845633→114241568` | 3139 | `1916845633→114241568` |
| crit | 3161 | `114241568→1604427283` | 3165 | `114241568→1604427283` |
| spread | 3164 | `1604427283→195852426` | 3168 | `1604427283→195852426` |
| secondary | 3318 | `195852426→3387277109` | 3322 | `195852426→3387277109` |

Every transition value is bit-identical to §12's own published ledger,
shifted by exactly **+4 ticks** and not one tick more — i.e. **zero extra
`Random()` calls were introduced by delaying the press**. This directly
confirms the ROADMAP domain note ("frontier battles consume RNG only on
demand") at the exact mechanism the brief asked about, with a single ~3.4s
probe (no full-prefix replay needed — this reused the already-short
`battle1-turn2.json` prefix). **Conclusion, matching the brief's own
hypothesis: idle-timing is not a lever on this dossier's misses. The only
lever is the move-choice sequence, since different moves/outcomes consume
different `Random()` counts and shift every downstream roll.**

### HEADLINE 2: a different move at turn 8 reshuffles the whole downstream RNG stream — Pidgeotto's KO now verified at tick 15887

Built and verified one concrete alternate line ("winline-a"): identical to
§14's own turns 1-7 (`battle1-grovyle-faint.json`'s 7312-tick prefix, then
ROCK_SLIDE at turns 6 and 7, unchanged), then substitutes **BIND** (move
slot 1, one `RIGHT` press from ROCK_SLIDE's slot 0) for ROCK_SLIDE at
**turn 8** — the exact turn that missed in §14's own committed line — then
returns to ROCK_SLIDE (one `LEFT` press back) for turns 9-12, forced to
DRAGON_BREATH at turn 13 once PP hits 0 (same PP-exhaustion mechanic §14
found, just landing one turn later since BIND used its own PP instead of
ROCK_SLIDE's for turn 8):

| turn | ticks | Onix's move | hp0 (Onix) | hp1 (Pidgeotto) |
|---|---|---|---|---|
| 6 | 7312-8346 | ROCK_SLIDE (hit) | 31→31 | 156→113 (−43) |
| 7 | 8346-9380 | ROCK_SLIDE (hit) | 31→31 | 113→82 (−31) |
| 8 | 9380-10826 | **BIND (miss)** | 31→31 | 82→82 (0) |
| 9 | 10826-12272 | ROCK_SLIDE (hit) | 31→24 (−7) | 82→61 (−21) |
| 10 | 12272-13306 | ROCK_SLIDE (hit) | 24→14 (−10) | 61→38 (−23) |
| 11 | 13306-14340 | ROCK_SLIDE (hit) | 14→14 (0) | 38→16 (−22) |
| 12 | 14340-15374 | ROCK_SLIDE (**miss**, 10th/last PP) | 14→4 (−10) | 16→16 (0) |
| 13 | 15374-16820ish | DRAGON_BREATH (hit, forced) | 4→4 | 16→**0** (tick **15887**) |

Turn 8's BIND miss is **the same underlying bad draw** ROCK_SLIDE hit in
§14's own committed line at that identical turn — proven the same way §14
proved turn 13's miss was move-independent: turns 6-7 are byte-identical to
the committed line, so the RNG state entering turn 8 is identical too, and
BIND's own accuracy check is the *first* roll of the turn regardless of
which move is chosen — whatever number lands there is shared across any
move choice tested at that exact point. That single substitution (plus
returning to ROCK_SLIDE afterward) desynchronizes every downstream roll from
§14's own line, and this time turn 13's DRAGON_BREATH **hits** (vs. §14's
committed line, where the RNG-equivalent late-battle roll missed twice
running, BIND and DRAGON_BREATH alike) — landing the kill on a Pidgeotto
already chipped to 16 HP by five ROCK_SLIDE hits. **This is exactly the
brief's predicted lever, empirically confirmed**: no timing change, only a
different move at one turn, and a battle that never KO'd Pidgeotto in §14's
19634-tick trace now does it in 15887.

Both misses in this line (turn 8 BIND, turn 12 ROCK_SLIDE) are recorded as
observed, not hand-derived against `damageCalc.ts` — BIND's own
accuracy/effect chain (`EFFECT_TRAP`, `data/gen/moves.json`: power 15,
accuracy 75, secondaryEffectChance 100) was not individually decoded to a
raw `Random()` value the way ROCK_SLIDE/DRAGON_BREATH were in §12/§14
(time-boxed; flagged as unverified, not as a mismatch — no contradicting
evidence found, matching this dossier's usual disclosure convention for
un-decoded rolls).

### HEADLINE 3: Murkrow's full battle data, RAM-truthed for the first time in this dossier

At the switch-in tick (species/HP populate at **16944**, `battler1` struct
read via the new `dump-battler-full.py`):

- **Species 198 = MURKROW**, Lv50, **142/142 HP**, types **DARK/FLYING**
  (`[17, 2]` against `constants/pokemon.h`'s `TYPE_DARK=17, TYPE_FLYING=2`),
  ability **15 = INSOMNIA**, held item **221 = LAX INCENSE**.
- Stats: atk 91, def 69, **spd 97** (faster than Onix's 76 — Murkrow acts
  first every turn against Onix, RAM-confirmed by `gCurrentMove` order
  below), spAtk 91, spDef 69.
- **Moveset**: FAINT_ATTACK (185, PP 20/20, `TYPE_DARK`, power 60,
  `EFFECT_ALWAYS_HIT` — cannot miss, no accuracy roll at all), FLY (19,
  PP 15/15, `TYPE_FLYING`, power 70, accuracy 95, `EFFECT_SEMI_INVULNERABLE`
  — 2-turn move, no damage on the charge turn), TORMENT (259, PP 15/15, no
  damage), TAUNT (269, PP 20/20, no damage). Only **1 of Murkrow's 4 moves
  deals damage on its own turn** (FAINT_ATTACK); FLY deals damage only on
  its second (strike) turn.
- Two independent reads (ticks 16944 and 17722) are byte-identical — the
  struct is already fully populated the instant the switch commits, same
  "populate-then-animate" shape §13 found for Pidgeotto's own switch-in
  (species/HP update same-tick, materialize animation plays out afterward
  with no further struct change).

The switch-in sequence itself matches §13's established shape exactly, no
new mechanic: Pidgeotto's own KO text is button-gated (idling the entire
1400-tick post-confirm window with **zero** presses left the game frozen on
"ONIX used DRAGONBREATH!" indefinitely — re-confirmed directly, not just by
analogy); one dismiss `A` (this session: tick 16830, chosen generously ~940
ticks after the confirm press, not bisected to a minimum — time-boxed, see
open items) reaches "Foe PIDGEOTTO fainted!" then the switch animation,
settling to a fully interactive "What will ONIX do?" vs. MURKROW menu (same
settled-menu `gBattleMainFunc` constant, 134463093, used everywhere else in
this dossier) by tick **17105**, stable through this trace's own final tick
17722.

### HEADLINE 4: Murkrow faints Onix 2 turns later without taking a hit — verified, not favorable

Extended the verified line by 2 more turns (`battle1-winline-a-murkrow.json`,
DRAGON_BREATH selected both turns — Onix's only PP-healthy damaging move
left; ROCK_SLIDE is at 0/10, BIND at 14/15 but already shown unreliable
above):

| turn | ticks | Murkrow's move | Onix's move | hp0 (Onix) | hp1 (Murkrow) |
|---|---|---|---|---|---|
| 14 | 17722-18956 | FLY (charge — semi-invulnerable, no roll, no damage either direction; Onix's own DRAGON_BREATH has no target to hit) | DRAGON_BREATH (no-op vs. an airborne target) | 4→4 | 142→142 |
| 15 | 18956-19990 | **FLY (strike, hits)** | never resolves — Murkrow's higher Speed (97>76) acts first and its hit is lethal | 4→**0** (tick **19147**) | 142→142 |

Onix's own queued move never executes turn 15, same rule §14 pinned for
Pidgeotto's priority QUICK_ATTACK against Onix — here it's plain Speed, no
priority move needed, since 97>76 unconditionally. RNG cost for these 2
turns: only **5 `Random()` steps total** (turn 14's charge is essentially
free — 1 step, some turn-end bookkeeping; turn 15's strike costs the other
4 — accuracy+ before the fatal hit). The trace's own final committed tick
(19990, 10 under the cap) is pixel-confirmed frozen on "ONIX fainted!" —
same button-gated KO-text rule as every other faint in this dossier — one
more `A` press and a switch-in detour (which, per §14's own SEND OUT
precedent, costs on the order of 400-1450 ticks depending on how many
extra menu presses are needed) would be needed just to get a fresh Magby or
Bayleef onto the field, **let alone then fight down a full-HP, faster
Murkrow with a third Pokémon** — none of which fits in the 10 ticks
remaining before the cap.

**This specific line's answer: Onix contributes zero damage to Murkrow.**
Getting *unlucky* here isn't really the right frame — Murkrow's own AI
opened with a non-damaging option (FLY's charge turn) essentially by chance,
buying Onix one extra free turn it didn't need to survive Onix's own attack;
the very next turn's guaranteed-faster, ordinary-accuracy hit ended it. A
4-HP Onix was never going to survive more than 1-2 real exchanges against
anything in Murkrow's kit (FAINT_ATTACK never misses at all; FLY's own
strike-turn accuracy is 95%), regardless of which turn it happened on.

### Frame-budget arithmetic — does the answer change?

- Prefix (turns 1-5, fixed/committed): **7312** ticks.
- This session's verified line to Pidgeotto's KO + full settle vs. a fresh
  Murkrow: **17722** ticks (KO itself at 15887, settle by 17105). Remaining
  budget at that point: **20000 − 17722 = 2278** ticks — over 2 ordinary
  turns' worth, a *dramatically* larger cushion than §14's own line's 842
  remaining ticks (and unlike §14's line, this one hasn't even touched
  Murkrow yet, whereas §14's remaining budget wasn't even enough to finish
  Pidgeotto).
- Verified continuation: Onix faints to Murkrow at tick **19147**, un-dismissed
  KO text frozen at the trace's final committed tick **19990** — **10 ticks**
  under the cap, and Murkrow is still at full HP (142/142). **No line tested
  this session reaches the actual WIN.** The 2278-tick cushion earned by the
  faster Pidgeotto KO was entirely consumed by 2 turns against Murkrow that
  net zero progress on Murkrow's own HP.
- **Updated answer to S8's headline question: still NO for every line anyone
  has verified move-by-move, but the failure mode has changed.** §14's line
  failed because it couldn't even finish Pidgeotto in time. This session's
  line finishes Pidgeotto with room to spare, and then fails because Onix
  (unavoidably worn down to single-digit HP by the fight it takes to fell
  Pidgeotto with this dossier's available PP/movepool) cannot survive
  Murkrow's Speed-97 always-eventually-lands offense long enough to do any
  damage back, let alone finish a fresh 142-HP Pokémon. **Whether some other
  line exists that (a) keeps Onix healthier into the Murkrow fight, (b)
  voluntarily switches Onix out *before* it faints (the FIGHT/BAG/POKéMON/RUN
  menu's own POKéMON option, never yet used in this dossier — only forced
  post-faint switches have been explored), or (c) otherwise still reaches a
  Murkrow KO within the remaining ~2278-tick cushion, is open — not searched
  exhaustively this session (time-boxed; see open items).**

### A harness-methodology finding worth flagging to the supervisor

`tools/probe/ram-probe.py` and friends call `EmeraldOracle` **directly**,
bypassing `oracle/server.py` entirely — and the 20000-frame/256-capture caps
are enforced *only* in `server.py` (`MAX_FRAMES`/`MAX_CAPTURES`, guarding the
`bin/oracle run` HTTP endpoint), not in the underlying emulator wrapper. This
session's own exploratory probes ran scripts up to **21122 ticks** with no
error, confirming the raw probe path has **no built-in reach limit** — only
the *committed, replayable-via-`bin/oracle`* trace format is capped. This
means future ground-truth scouting can explore arbitrarily far past 20000
ticks *before* committing to what to script as an actual 20000-frame trace
(exactly how this session found the Pidgeotto-KO-to-Murkrow-fight shape
before building the two committed traces above) — worth calling out
explicitly since it wasn't spelled out anywhere in ROADMAP's domain notes or
prior dossier sections, and it materially changes how "the cap" should be
thought about during exploration vs. commitment.

### What a resuming session needs — pinned vs. open

**Pinned this session:**
- Idle-timing is not an RNG lever in frontier battles (HEADLINE 1) — settles
  the brief's priority-1 question definitively, with a single cheap probe.
- A different move at one turn reshuffles every downstream roll, confirmed
  empirically (not just in principle) by actually landing a faster Pidgeotto
  KO this way (HEADLINE 2) — the general technique (substitute at a known
  bad turn, observe the new downstream shape) is reusable for any future
  attempt to hunt a still-faster or Onix-healthier line.
- Murkrow's full battle data (HEADLINE 3) — species/level/HP/stats/types/
  ability/item/moveset/PP, RAM-truthed for the first time in 4 sessions that
  each flagged it as open (§12, §13, §14, §14 addendum).
- `tools/probe/dump-battler-full.py` — reusable probe for any future
  battler's moves/PP/item/ability (the existing `dump-battler-snapshot.py`
  only covers stats/HP/status).
- Onix cannot survive long against Murkrow at the HP this dossier's
  available lines leave it with (HEADLINE 4) — a real, RAM-verified
  constraint any future engine slice's AI-difficulty modeling should account
  for, not a one-off unlucky roll.
- The raw-probe path (`EmeraldOracle` direct) has no frame-count ceiling;
  only committed `bin/oracle`-run traces are capped at 20000 — a
  methodology point worth folding into ROADMAP's domain notes.
- Updated headline: reaching Pidgeotto's KO is no longer the bottleneck
  (proven with room to spare); reaching Murkrow's KO from a survivable Onix
  state is.

**Still open (in priority order for a resuming session):**
1. Whether a line exists that keeps Onix healthier entering the Murkrow
   fight (e.g. a different turn 6-12 move sequence than this session's own
   single tested substitution) — only one alternate branch was tried; this
   was not an exhaustive or even a wide search.
2. Voluntary in-battle switching (the action menu's own POKéMON option) has
   never been used anywhere in this dossier — only forced post-faint
   switches (§13, §14 addendum) are ground-truthed. If Onix could be swapped
   out for a healthy Magby/Bayleef *before* fainting (rather than after),
   that detour's own tick cost and whether it fits the remaining budget is
   completely unknown.
3. BIND's own accuracy/effect chain was not decoded to a raw `Random()`
   value the way ROCK_SLIDE/DRAGON_BREATH were — flagged as unverified only,
   not as a mismatch.
4. The dismiss press for Pidgeotto's KO text (tick 16830, chosen with a
   ~940-tick margin) was not bisected to a true minimum the way §14
   addendum bisected the SEND OUT settle window — there is likely a few
   hundred ticks of further reclaimable slack in this session's own script,
   unexplored due to time-boxing.
5. A minor cross-check surfaced but not chased: §14's own text states BIND's
   accuracy as "85" when comparing it to DRAGON_BREATH for turn 13's miss,
   but `data/gen/moves.json` (RAM-independent, extracted data) gives BIND
   accuracy **75**. Not re-verified against RAM this session (BIND wasn't
   used at that turn in either session) — flagged for a future session
   rather than silently trusted either way.
6. The full WIN (Murkrow's actual KO, victory fanfare/text, post-battle
   transition) remains unreached by any verified line across 5 sessions
   now (§12, §13, §14, §14 addendum, this session).

**Verification**: `npm test` **648/648**, `npm run build` green (no
`src/engine/` changes this session — only the two new committed traces under
`tools/compare/traces-groundtruth/`, the two new RAM dumps under
`src/data/gen/`, and the new probe tool under `tools/probe/`, per the
worktree brief's constraint). Both new traces twice-run via `bin/oracle run`,
manifests (frame count + every capture's sha256) byte-identical across two
independent runs each. Both RAM dumps' constituent probe runs (`ram-probe.py`,
`dump-battler-snapshot.py`, `dump-battler-full.py`) each independently
re-run and diffed byte-for-byte against their own first run.

## 16. Battle 1's actual WIN, the swap decline, and battle 2's first action menu — all reached in one session (S8 worktree lane, oracle scout — no engine code)

**Headline result: the whole chain this dossier has chased since §12 is now
ground-truthed end to end.** MAGBY (sent out over BAYLEEF, see below) kills
MURKROW in **2 turns** and survives with **27/138 HP**; the full victory
sequence (faint text → "Player defeated BUG CATCHER DESTIN!" → DESTIN's loss
quote → attendant heal → GO ON/RECORD/REST/RETIRE → opponent-2 scouting text
→ the swap-a-Pokémon offer, declined → "Right this way, please!" → warp →
battle 2's opponent intro) plays out in full; battle 2 (**FISHERMAN JENSON**,
opening **KABUTO** Lv50 — see the RNG-sensitivity finding below for why this
identity is specific to this exact script) is reached with its **first
action menu fully settled** ("What will ONIX do?" vs KABUTO, ONIX healed to
117/117) at tick **33031** — **11969 ticks of headroom under the 45000 cap**,
and comfortably under **one single trace's worth of frames** even though the
work is committed as two chained traces (rationale below, not a tick-budget
necessity this time). This closes every "still open" item this exact
question has carried since §12.

Committed: `tools/compare/traces-groundtruth/battle1-winline-b.json` (23601
frames — `battle1-winline-a-murkrow.json`'s own 19990-frame prefix, **verbatim,
byte-identical**, plus 20 new segments: the forced switch to MAGBY and the
full 2-turn MURKROW kill, ending frozen on DESTIN's un-dismissed loss quote
"PLEASE I NEED SOME WATER"; 118 `captureFrames`, dense around every button
press in the new tail plus 12 sparse anchors over the old prefix) and
`tools/compare/traces-groundtruth/battle1-winline-b-swap.json` (33031 frames —
`battle1-winline-b.json`'s own segments, **verbatim**, plus 22 more: the rest
of the victory sequence, the swap decline, and the transition into battle 2
through its settled first menu; 127 `captureFrames`, same density convention).
**Both twice-run byte-identical via `bin/oracle run`** (0/118 and 0/127 sha
mismatches respectively across two independent runs each). New RAM dumps
under `src/data/gen/`: `battle1-winline-b-magby-bayleef-candidates.json`
(both switch-in candidates' full battle data, from two independent
exploratory branches off the shared tick-19990 prefix — see the decision
below), `battle1-winline-b-murkrow-fight-ram-dump.json` (3 `battlerSnapshots`
via `dump-battler-full.py` at the switch-in/turn-1-end/turn-2-end ticks, plus
a 2857-row per-tick `gRngValue`/hp/`gCurrentMove`/status watch via
`ram-probe.py`, both against the **committed** `battle1-winline-b.json`),
and `battle1-winline-b-battle2-opponent-ram-dump.json` (KABUTO's full battle
data plus the no-swap evidence, via `dump-battler-full.py` against the
committed `battle1-winline-b-swap.json`). **All three probe runs independently
re-run and diffed byte-for-byte identical against their own first run.**

### HEADLINE 1: MAGBY over BAYLEEF — an evidence-based call, not the brief's "pick the first workable" default

Both candidates' full battle data were RAM-dumped at the forced-switch menu
(tick 20192, `gPlayerParty` slots 1/2, read via `dump-battler-full.py`'s own
`gBattleMons[0]` logic on two independent exploratory branches — one sends
out MAGBY, the other BAYLEEF, off the identical shared prefix):

| | MAGBY | BAYLEEF |
|---|---|---|
| species/level/HP | 240, Lv50, 138/138 | 153, Lv50, 153/153 |
| types | FIRE/FIRE | GRASS/GRASS |
| ability | FLAME_BODY | OVERGROW |
| item | LAX INCENSE | BRIGHT POWDER |
| moves | FIRE_PUNCH (75pow/100acc/10% burn), SMOKESCREEN (acc-down), CONFUSE_RAY (confuse), SMOG (20pow/70acc/40% psn) | RAZOR_LEAF (55pow/95acc), TOXIC (85acc, 100% psn), SAFEGUARD (status immunity), LIGHT_SCREEN (special-dmg half) |
| vs MURKROW (DARK/FLYING) | FIRE_PUNCH is **neutral** (Fire resists neither of Murkrow's types) — a real, mostly-reliable damage source, plus 2 disruption tools | RAZOR_LEAF is **resisted 0.5×** by FLYING — BAYLEEF's only damaging move is weak *and* off-type; TOXIC/SAFEGUARD/LIGHT_SCREEN are non-damaging, and LIGHT_SCREEN specifically doesn't help since Murkrow's real threats (FAINT_ATTACK, FLY) are both **physical** in this generation's type-based split |

**Verdict: MAGBY, decisively** — it has actual on-type-neutral damage against
Murkrow's dual typing plus two disruption moves (SMOKESCREEN chips Murkrow's
accuracy against FLY's 95%-accuracy strike turn; CONFUSE_RAY can make Murkrow
hurt itself), while BAYLEEF's kit has no good answer to Murkrow at all — its
one damaging move is resisted, and its two defensive moves don't block the
physical damage Murkrow actually deals. This was decided from the RAM data
alone, before either was fought — no trial-and-error needed.

### HEADLINE 2: the forced-switch sequence generalizes exactly per §14 addendum, and MURKROW falls in 2 turns

The dismiss/nav/select/confirm shape is **bit-for-bit the same mechanic**
§14 addendum pinned for the ONIX→MAGBY switch after Pidgeotto (same
`HandleChooseMonSelection` default-arm bug, same cursor-defaults-to-the-
fainted-slot behavior, same "SEND OUT confirms → fade → ball-throw → settled
menu" shape) — this session needed no new reverse-engineering here, just
confirmation it holds after a **different** faint (ONIX to MURKROW, not
ONIX to PIDGEOTTO):

| press | effect | ticks (from 19990) |
|---|---|---|
| `A` (1f) + 199f idle | dismiss "ONIX fainted!" → "Choose a POKéMON." list, cursor on ONIX (slot 0) | 200 |
| `DOWN` (1f) + 14f idle | cursor → MAGBY (slot 1) | 15 |
| `A` (1f) + 39f idle | opens SEND OUT/SUMMARY/CANCEL, cursor on SEND OUT | 40 |
| `A` (1f) + 499f idle | confirms SEND OUT → fade/ball-throw/materialize → settled "What will MAGBY do?" vs MURKROW | 500 |

Settled menu at tick **20745** (MAGBY 138/138, MURKROW 142/142, both fresh).
Then the fight itself — **FIRE_PUNCH both turns**, no move-lock/disruption
ever actually used by MURKROW (no TORMENT, no TAUNT, no FLY charge this
time; **HEADLINE 4** below returns to why that's genuinely a different AI
line, not a scripting dodge):

| turn | ticks | MURKROW's move | MAGBY's move | hp0 (MAGBY) | hp1 (MURKROW) |
|---|---|---|---|---|---|
| 1 | 20745-21774 | FAINT_ATTACK (185, always-hits, no acc roll) | FIRE_PUNCH (7, hits, **burns** — `status1` 0→**16** = `STATUS1_BURN` = `1<<4`, RAM-confirmed) | 138→**79** (−59) | 142→75 (−67 direct) →**58** (−17 more, same turn — burn's own end-of-turn residual, see below) |
| 2 | 21774-22802 | FAINT_ATTACK (always-hits) | FIRE_PUNCH (hits, MURKROW already fainted before any 2nd burn tick could apply) | 79→**27** (−52) | 58→**0** (tick **22418**, −58, lethal) |

**MURKROW faints at tick 22418** (RAM `hp1==0`), un-dismissed faint text
frozen through this trace's own end. Two new mechanics pinned this session:

1. **Burn's own residual damage, RAM-derived for the first time in this
   dossier**: turn 1's `hp1` drops **twice** in the same turn — once for
   FIRE_PUNCH's direct hit (142→75, −67) and again 308 ticks later within
   the same turn window (75→58, −17) with no new `gCurrentMove` in between.
   `142/8 = 17.75`, floored = **17** — an exact match, pinning burn's
   end-of-turn residual as **`floor(maxHP/8)`**, applied to the *burned*
   mon (MURKROW) at turn-end, independent of whose move caused the burn.
2. **Burn measurably reduced MURKROW's own physical output**: turn 1's
   FAINT_ATTACK (unburned MURKROW) hit for 59; turn 2's (burned MURKROW)
   hit for only 52 — lower, consistent with burn's classic "halve the
   burned mon's physical damage" rule, though the two hits aren't a clean
   apples-to-apples comparison (different roll each time, ±15% spread) so
   this is *suggestive*, not independently re-derived against
   `damageCalc.ts`'s own burn branch — flagged as an open item below.

Full per-tick ledger (`gRngValue`, hp0/hp1, `gCurrentMove`, MURKROW's
`status1`) is in `src/data/gen/battle1-winline-b-murkrow-fight-ram-dump.json`
(2857 rows, ticks 20745-23601); the table above extracts every state
transition from it (31 total).

### HEADLINE 3: the full victory sequence, page by page

From MURKROW's faint (tick 22418, un-dismissed) through DESTIN's loss quote
(this trace's own end, tick 23601):

| screen | trigger | notes |
|---|---|---|
| "Foe MURKROW fainted!" | `A` dismiss | same button-gated-KO-text rule as every prior faint in this dossier |
| "Player defeated BUG CATCHER DESTIN!" | `A` dismiss | `gBattleOutcome` 0→**1** the instant this screen appears (RAM-confirmed) — **this is the actual WIN flag**, not a later transition; DESTIN's trainer class (BUG CATCHER) was already known from §13 |
| "PLEASE I NEED SOME WATER" (DESTIN's loss quote) | `A` dismiss | `battle1-winline-b.json`'s own final committed tick (23601) — frozen here, un-dismissed |

Continuing into `battle1-winline-b-swap.json`'s own new tail:

| screen | trigger | notes |
|---|---|---|
| fade to black → BattleFrontier counter, "Thank you for competing!\nLet us restore your POKéMON." | auto (no press needed once the loss quote is dismissed — this is scene-scripted, not button-gated) | free full-party heal between rounds, confirmed by battle 2's ONIX showing 117/117 (full) at the settled menu |
| "The 2nd match is next!\nAre you ready?" GO ON/RECORD/REST/RETIRE | `A` dismiss heal text | cursor defaults to **GO ON** (top option) |
| "I've conducted a little investigation\nabout your upcoming opponent." | `A` confirms GO ON | opponent-2 scouting text begins — same shape as the bootstrap's own pre-battle-1 scouting comments |
| "The TRAINER appears to have no clear\nfavorites when it comes to type." | `A` dismiss | |
| "The favorite battle style appears to\nbe weakening the foe to start." | `A` dismiss | |
| "Before starting the battle, would you\nlike to swap a POKéMON?" YES/NO | `A` dismiss | cursor defaults to **YES** — this is the swap-offer screen priority 3 asked for |
| "Right this way, please!" | `DOWN`+`A` selects **NO**, declines | simplest scriptable path per the brief; no swap-selection sub-screen ever opens on the NO branch, so there is nothing further to ground-truth on this path (the YES branch's own swap-picker UI is a fresh open item, not explored this session) |
| fade → BattleFrontier battle room, "MY POKéMON WILL MAKE YOU DOWNCAST" | `A` dismiss, then auto warp | opponent 2's opening battle quote |
| "FISHERMAN JENSON would like to battle!" | `A` dismiss | **battle 2's opponent identity**: trainer class FISHERMAN, name JENSON |
| **settled "What will ONIX do?" vs KABUTO Lv50, ONIX 117/117** | `A` dismiss | tick **33031** — the deliverable target, fully interactive |

No money/BP text of any kind appears anywhere in this sequence — between-
round transitions in a single Battle Factory round are apparently just
heal + continue-or-retire + opponent scouting + swap offer, with no reward
screen (BP is presumably awarded only at 7-win round completion, out of
this stage's scope per ROADMAP).

### HEADLINE 4 (methodology, escalation-worthy): outside battle, idle-timing IS an RNG lever — the opposite of §15's own finding, and it changes which opponent battle 2 generates

§15's HEADLINE 1 proved idle-timing doesn't shift RNG outcomes **inside a
frontier battle** (`Random()` only advances on-demand there, per the
ROADMAP domain note). This session hit the **complementary case** the same
domain note already predicted but nobody had actually exercised: outside
battle — the whole post-victory overworld sequence (heal text, GO ON menu,
scouting dialogue, swap prompt, the walk into battle 2) — `Random()`
advances **once per VBlank unconditionally** (`main.c:366`'s own gate is
`!gMain.inBattle || !(...FRONTIER...)`, true here since we've fully exited
the battle state). A first attempt at this exact tail (`docs`-untracked,
built while exploring, not committed) used slightly different idle margins
in this stretch and generated a **different battle-2 opponent entirely**
(AROMA LADY JILLIAN, opening NIDORINO) versus this session's final,
committed script's **FISHERMAN JENSON, opening KABUTO** — same button
sequence in kind (dismiss/confirm/decline), different frame counts at
several idle points, nothing else changed. **This means "generous settle
margins" is safe for reaching a given *screen*, but NOT free with respect
to *which opponent gets generated* for battle 2 (and probably: which
rental-pool-adjacent RNG-seeded content follows anywhere in the overworld)
— any future session extending this chain must treat the post-victory
overworld tail's exact tick counts as load-bearing, not padding, the same
way move-choice sequence is load-bearing inside a battle.** Flagged
explicitly for the supervisor: this is a second, independent confirmation
of the ROADMAP's own `main.c:366` domain note, but at a materially
different consequence tier (previous sessions only worried about it
setting the anchor's draft-screen RNG; this session shows it also
determines a downstream *trainer identity*, several thousand frames
removed from the anchor).

### Frame-budget arithmetic and the natural chain-split points

- Prefix through MURKROW's KO + full victory-text dismissal to the loss
  quote: **23601 ticks** (`battle1-winline-b.json`).
- Through the swap decline and battle 2's settled first menu: **33031
  ticks** (`battle1-winline-b-swap.json`) — **11969 ticks of headroom**
  under the 45000 cap.
- **The whole chain (draft → battle-1 WIN → swap decline → battle-2 menu
  settled) now fits comfortably within a single trace's frame budget**
  (33031 ≪ 45000) — a first for this dossier, made possible entirely by
  the frame-cap raise (ROADMAP's user decision #2, this session's own
  starting condition), not by any new script optimization. **The two-file
  split committed here is no longer a tick-budget necessity — it exists
  because `maxCaptures=256` is unchanged, and 256 captures spread across
  33031 ticks (~1 every 129 ticks) would be too sparse to densely cover
  every button-press transition in both the Murkrow fight and the whole
  victory/swap/battle-2-intro tail in one file.** The natural split point
  used here (the loss-quote freeze, tick 23601) is a genuine narrative
  boundary — the last moment before the "which path forward" branching
  (heal → continue/retire → scout → swap) begins — not an arbitrary
  tick-count cut. A future session extending past battle 2's own menu
  should keep splitting at similar narrative boundaries (e.g. after
  battle 2's own WIN-equivalent text, or after battle 2's own swap
  offer) rather than at fixed tick intervals, both for readability and
  because `maxCaptures` — not `maxFrames` — is now the binding constraint
  on trace granularity.

### What a resuming session needs — pinned vs. open

**Pinned this session:**
- The full, verified winning line for battle 1: MAGBY over BAYLEEF (RAM-
  evidenced, HEADLINE 1), 2-turn MURKROW kill (HEADLINE 2), full victory
  sequence through the swap offer (HEADLINE 3), swap declined, battle 2
  reached with FISHERMAN JENSON/KABUTO and a fully settled first menu.
- Burn's residual damage formula: `floor(maxHP/8)`, RAM-derived directly
  (HEADLINE 2) — first exact pin of this mechanic in the dossier.
- Idle-timing outside battle **is** an RNG lever with real downstream
  consequences (opponent-2 identity) — a load-bearing methodology finding
  for any future session extending past this point (HEADLINE 4).
- `gBattleOutcome` flips to 1 at "Player defeated BUG CATCHER DESTIN!",
  not later — the precise moment this dossier's various "WIN" checks
  should watch for.
- The whole draft→battle-1-WIN→swap→battle-2-menu chain fits in a single
  trace's frame budget now (33031 < 45000); the 2-file split committed
  here is a capture-density choice, not a tick-budget necessity.

**Still open (in priority order for a resuming session):**
1. The swap-offer's **YES** branch (the actual swap-picker UI) has never
   been exercised — this session only ground-truthed the NO/decline path
   (chosen as "simplest to script" per the brief). Its own screen shape,
   button sequence, and tick cost are completely unknown.
2. Burn's halving of the burned mon's own physical damage is *suggestive*
   from this session's 2 data points (59 vs 52 damage) but not
   independently re-derived against `damageCalc.ts`'s burn branch with
   controlled inputs.
3. Battle 2 itself (KABUTO and whatever follows) is entirely unfought —
   this session's own deliverable stops at the settled first menu, per
   the brief's own scope.
4. BAYLEEF was never actually battle-tested (only RAM-compared against
   MAGBY pre-decision) — if a future session ever needs BAYLEEF's actual
   in-battle behavior (e.g. modeling the AI's move choice against a
   Grass-type), it remains unexplored.
5. The exact per-page minimum dismiss timings in the victory/scouting/
   swap sequence were not bisected (generous margins used throughout,
   consistent with §14 addendum's own finding that little slack is
   reclaimable) — usable as-is, but not minimized.

**Verification**: `npm test` and `npm run build` green (no `src/engine/`
changes this session — only the two new committed traces under
`tools/compare/traces-groundtruth/` and the three new RAM dumps under
`src/data/gen/`, per the worktree brief's constraint). Both new traces
twice-run via `bin/oracle run`, 0 sha mismatches across both (118/118 and
127/127 captures). All three new RAM dumps' constituent probe runs
(`dump-battler-full.py` ×2, `ram-probe.py` ×1) independently re-run and
diffed byte-for-byte against their own first run — identical every time.

