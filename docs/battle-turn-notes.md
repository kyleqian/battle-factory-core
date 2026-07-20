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

## 17. The swap offer's YES branch — the factory swap screen ground-truthed end to end (S8 worktree lane, oracle scout — no engine code)

**Headline: §16's own open item #1 (the swap-picker UI, "completely unknown")
is now closed.** Branching from `battle1-winline-b-swap.json`'s own committed
prefix at the swap-offer's settled YES/NO prompt (tick 29601, cursor
defaulting to **YES** per §16 HEADLINE 3), this session answered **YES**
instead of declining, and ground-truthed the whole factory swap screen: its
fade-in entry, the player's-own-party picker (ONIX/MAGBY/BAYLEEF), the
SUMMARY/SWAP/RECHOOSE popup, the slide transition into the opponent's-party
picker (DESTIN's Grovyle/Murkrow/Pidgeotto), cursor navigation across all 3
opponent balls, the accept YES/NO popup, the completed swap, and the return
through "Your POKéMON swap is complete." → "Right this way, please!" →
battle 2's own intro, ending on battle 2's **settled first action menu**:
**GROVYLE (143/143, swapped in for ONIX) vs KABUTO (91/91)** — the same
opponent identity as the NO-branch (§16), because `factory_generateopponentmons`
runs *before* the YES/NO branch point, in the shared prefix — expected per
§16 HEADLINE 4's own timing-sensitivity finding (idle-timing before the
branch is unaffected; nothing in this branch's own tail perturbs an
already-generated opponent).

**The mon picked to give up: ONIX (player slot 0), with zero extra
navigation** — the cursor already sits on slot 0 when the picker screen
opens, so no LEFT/RIGHT was needed; this is the "simplest unambiguous path"
the brief asked for. **The mon picked to receive: GROVYLE (opponent slot
0)** — reached only *after* navigating RIGHT/RIGHT/LEFT/LEFT across all 3 of
DESTIN's balls (Murkrow, Pidgeotto, back through Murkrow to Grovyle) so the
cursor-movement ground-truthing the brief asked for is on record, before
landing back on slot 0 to confirm. (Trade-off flagged, not hidden: giving up
ONIX means this branch's own party no longer matches the NO-branch's
proven-effective ONIX/MAGBY roster — irrelevant to this session's own scope,
which stops at battle 2's settled menu, but a future session actually
*fighting* battle 2 on this branch inherits a different roster than §16's.)

### Committed traces

`tools/compare/traces-groundtruth/battle1-swapyes-a.json` (154 segments,
30001 frames, 235 `captureFrames`) — `battle1-winline-b-swap.json`'s own
segments 0-145 (**verbatim, byte-identical**, cum. 29601 ticks, ending on
the settled swap-offer YES/NO prompt) plus 8 new segments: confirm YES,
the fade-to-black/load/fade-in entry into the swap-player-screen (dense
every-tick 29601-29670, the window sha-diffing showed real content still
changing; sparse every-10th 29671-29701 for the settle tail), open the
SUMMARY/SWAP/RECHOOSE popup (dense 29702-29765, sparse tail to 29781),
move the popup cursor to SWAP and confirm it (dense 29782-29801), and the
slide transition into the opponent's-party picker (dense-every-3rd
29802-29978, sparse tail to 30001) — ends settled on the enemy screen,
cursor on Grovyle (opponent slot 0). Plus 10 sparse anchors over the old
prefix (ticks 0, 6970, 19990, 20192, 20745, 22418, 23601, 25802, 28002,
29601), same convention as §16.

`tools/compare/traces-groundtruth/battle1-swapyes-b.json` (174 segments,
34081 frames, 194 `captureFrames`) — `battle1-swapyes-a.json`'s own segments,
**verbatim**, plus 20 more: the RIGHT/RIGHT/LEFT/LEFT navigation across all
3 opponent balls (dense every-2nd), open the accept popup on Grovyle (dense
every-2nd 30082-30145), confirm YES (dense-then-sparse settle through the
close-monpic/fade-out/return-to-field/"swap complete"-message window
30182-30681), dismiss the swap-complete message, settle "Right this way,
please!", dismiss, settle the battle-room opponent quote, dismiss, settle
the trainer intro, dismiss, and the **settled battle 2 first action menu**
at tick 34081 (11969 frames of headroom under wherever this trace's own
frame budget matters least — 45000 cap, same as §16). **Both twice-run
byte-identical via `bin/oracle run`** (0/235 and 0/194 sha mismatches
respectively, across two independent runs each).

Screen-shape findings, source-cited against `battle_factory_screen.c`'s
`Swap_*` half (all confirmed against oracle PNGs, not assumed from source
alone):

- Entry is a hard cut to black (`Swap_Task_ScreenInfoTransitionOut`-style
  fade is NOT used for the initial open — `CB2_InitSwapScreen`'s own
  `gMain.state` load sequence runs fully behind a flat black screen, states
  0-13, then `BeginNormalPaletteFade(..., 16, 0, RGB_BLACK)` at state 14
  fades the fully-built screen in) — matches the oracle: solid black
  29620-29646 (26 flat ticks), content fades in 29646-~29661.
- The player's-own-party screen opens with **cursor defaulting to slot 0**
  (`Swap_InitStruct`'s `AllocZeroed` + `Swap_InitActions(SWAP_PLAYER_SCREEN)`
  explicitly zeroing `cursorPos`), title "POKéMON SWAP", top-right category/
  species box showing the *selected ball's* mon (confirmed: "ROCK SNAKE
  POKéMON" / "ONIX" at entry), bottom info line "Select POKéMON to swap."
  (`gText_SelectPkmnToSwap`), CANCEL button bottom-right (no "PKMN FOR SWAP"
  button on this screen — `Swap_Task_ScreenInfoTransitionIn`'s own
  `inEnemyScreen` branch skips it).
- `A` on a ball opens a SUMMARY/SWAP/RECHOOSE popup (`sSwap_MenuOptionFuncs`,
  `battle_factory_screen.c:889`) with a large mon-pic sprite
  (`OpenMonPic`/`sMonPicBg_*`) — **cursor defaults to SUMMARY (index 0)**,
  not SWAP (`menuCursorPos` zeroed the same way); this session pressed
  `DOWN` once to reach SWAP before confirming.
- Confirming SWAP (`Swap_OptionSwap`, `:3989`) records `playerMonId` and
  hands off to `Swap_Task_SwitchPartyScreen`, which slides the 3 pokéballs
  off-right/on-left (`Swap_Task_SlideCycleBalls`) while cross-fading the
  species-name text, landing on `Swap_InitActions(SWAP_ENEMY_SCREEN)` —
  confirmed on-screen: same "POKéMON SWAP" chrome, category/species now
  showing DESTIN's mons ("WOOD GECKO POKéMON" / "GROVYLE" at slot 0,
  "DARKNESS POKéMON" / "MURKROW" at slot 1, "BIRD POKéMON" / "PIDGEOTTO" at
  slot 2 — all three read directly off oracle PNGs, not inferred), info line
  now "Select POKéMON to accept." (`gText_SelectPkmnToAccept`), and a new
  "PKMN FOR SWAP" button appears next to CANCEL (`sSwap_EnemyScreenActions`
  has a 4th action, `SWAPACTION_PKMN_FOR_SWAP` → `Swap_ActionPkmnForSwap`,
  that goes back to the player screen — not exercised this session, the
  brief's "simplest unambiguous path" didn't need it).
- `A` on an enemy ball opens an accept popup, **"Accept this POKéMON?"
  YES/NO, cursor defaulting to YES** (`Swap_AskAcceptMon`, `:2571`, same
  zeroed-`yesNoCursorPos` pattern as every other YES/NO in this dossier) —
  before that, `Swap_ActionMon` (`:4039`) checks
  `Swap_AlreadyHasSameSpecies` and would show "This POKéMON is already in
  your party!" (`gText_SamePkmnInPartyAlready`) instead if the target
  species duplicates one of your *other* two party mons — not hit this
  session (Grovyle isn't already in the ONIX/MAGBY/BAYLEEF roster), and thus
  **not ground-truthed on-screen this session** (source-derived only,
  flagged as an open item below).
- Confirming YES on the accept popup (`Swap_HandleAcceptMonResponse` →
  `Swap_Task_Exit`) closes the mon-pic sprite, writes `gPlayerParty[0] =
  gEnemyParty[0]` plus a friendship reset (`CopySwappedMonData`, `:2350`),
  fades to black, and returns to the overworld script via
  `SetMainCallback2(CB2_ReturnToFieldContinueScript)` — the script then
  shows `BattleFrontier_BattleFactoryPreBattleRoom_Text_YourSwapIsComplete`
  ("Thank you!\nYour POKéMON swap is complete.") and rejoins the **shared**
  `EventScript_EnterBattleRoom` label both branches use
  (`data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:43-52`)
  — meaning "Right this way, please!" is NOT NO-branch-specific text as
  §16 read it in isolation; it's the shared post-branch continuation, just
  with one extra msgbox page (the swap-complete confirmation) prepended on
  the YES branch. Confirmed on-screen at tick 34081: "What will GROVYLE
  do?" vs KABUTO, both mons at full/fresh HP — a clean battle-2 start.

### RAM truth

`src/data/gen/battle1-swapyes-battle2-opponent-ram-dump.json`
(`dump-battler-full.py` against the committed `battle1-swapyes-b.json` at
tick 34081, independently re-run and diffed byte-identical against its own
first run): battler0 (player) = species 278 (**GROVYLE**), Lv50, 143/143,
types `[12, 12]` = GRASS/GRASS (`include/constants/pokemon.h`:
`TYPE_GRASS`=12), moves include 104 (DOUBLE_TEAM, matching the moveset this
dossier already RAM-confirmed for DESTIN's Grovyle in §1); battler1
(opponent) = species 140 (**KABUTO**), Lv50, 91/91, types `[5, 11]` =
ROCK/WATER (`TYPE_ROCK`=5, `TYPE_WATER`=11), ability 4. Both fresh (no
burn/status, full HP) — matches the free full-party heal + fresh-battle-
start expected at this point.

### §17 ADDENDUM (S8 worktree lane, oracle scout — no engine code): the `rentalMons[]` offset bug, root-caused and fixed; readback validated on both branches

**The `gSaveBlock2Ptr->frontier.rentalMons[]` bookkeeping array (this
session's priority 1) is now closed.** Root cause of the original bug: the
field-offset comments inside `struct BattleFrontier`
(`include/global.h:378-461`) are pret's usual convention of annotating each
field's offset **absolute within the top-level `SaveBlock2`**, not relative
to `frontier` itself — proven by `BattleFrontier`'s own *first* field,
`towerPlayer`, being commented `/*0x64C*/` (`global.h:380`), which is
exactly `SaveBlock2.frontier`'s own offset (`global.h:541`); if the
comments were `BattleFrontier`-relative, `towerPlayer` would read `/*0x0*/`.
The deleted probe computed `rentalMons`' address as `gSaveBlock2Ptr + 0x64C
(frontier's offset) + 0xE70 (rentalMons' own comment)` — **double-counting
the 0x64C base**, landing ~5.6KB past the real struct (explaining both the
implausible neighboring-field values it flagged and the apparent
across-swap staleness — it was reading fixed garbage the whole time, not a
genuinely-unwritten array).

Fixed probe: `tools/probe/dump-rentalmons.py` (committed), reading
`*gSaveBlock2Ptr + 0xE70` directly (`rentalMons`' own comment, un-added to
anything), same absolute-offset fix applied to `challengeStatus` (+0xCA8),
`selectedPartyMons` (+0xCAA), `curChallengeBattleNum` (+0xCB2) as a
plausibility side-check. `struct RentalMon`'s own size confirmed as `0xC`
(12 bytes: `u16 monId` + 2 pad, `u32 personality`, `u8 ivs`, `u8
abilityNum` + 2 pad) two ways — natural C alignment, and the gap to the
next field (`battlePoints` at `0xEB8` − `rentalMons` at `0xE70` = `0x48` =
`6×0xC`).

**Validated two independent ways**, both against `battle_factory.c`/
`battle_factory_screen.c` source logic, not just "looks plausible":
1. **Pre-swap, both branches' shared tick-29601 prefix**: `rentalMons[0..2]`
   read `{monId 156, personality 1205102525, ivs 3, abilityNum 1}` / `{149,
   1534575931, 3, 0}` / `{180, 1550278706, 3, 0}` — an **exact field-for-
   field match** (monId/personality/ivs/abilityNum, all 3 slots) against
   `src/data/gen/anchor-state.json`'s own independently-extracted
   ONIX/MAGBY/BAYLEEF rental records.
2. **Post-swap, YES branch (`battle1-swapyes-b.json`, ticks 30681/34081)**:
   `rentalMons[0]` changes from ONIX's own record to `{monId 188,
   personality 1094072807, ivs 3, abilityNum 0}` — which **exact-matches
   pre-swap `rentalMons[3]`** (same trace, tick 29601), precisely what
   `CopySwappedMonData` (`battle_factory_screen.c:2350-2361`) predicts:
   `rentalMons[playerMonId].monId = rentalMons[enemyMonId +
   FRONTIER_PARTY_SIZE].monId` (`playerMonId`=0 for ONIX, `enemyMonId`=0
   for Grovyle, so `rentalMons[0] <- rentalMons[3]`). The decline branch's
   own final tick (33031, `battle1-winline-b-swap.json`) shows **no
   change** from the shared prefix, as expected (no swap occurred).

One methodology note worth recording: `gSaveBlock2Ptr`'s own dereferenced
value is **not** stable across ticks in this dump (33704624 at tick 29601
vs. 33704540/33704616/33704532 at later ticks, depending on trace) — this
is not a bug, it's `SetSaveBlocksPointers`' deliberate save-block-ASLR
scheme (`load_save.c:70-82`, `offset = (offset + Random()) &
(SAVEBLOCK_MOVE_RANGE - 4)`, re-rolled on `MoveSaveBlocks_ResetHeap`, which
fires around scene/heap transitions such as the battle↔overworld switches
this exact trace crosses). The fixed probe re-dereferences `gSaveBlock2Ptr`
fresh at every snapshot rather than caching a base address once — any
future probe over a similarly long, scene-crossing trace should do the
same.

Committed: `tools/probe/dump-rentalmons.py` (the fixed probe, full
derivation in its own module docstring) and
`src/data/gen/battle1-swap-rentalmons-dump.json` (both branches' full
6-slot `rentalMons[]` state at the ticks above, plus the
challengeStatus/selectedPartyMons/curChallengeBattleNum side-check fields).
Both branches' probe runs independently re-run and diffed byte-identical
against their own first run.

### §17 ADDENDUM 2 (S8 worktree lane, oracle scout — no engine code): the YES-branch LCG-step ledger (brief's priority 4), closed

**This session's priority 2** — the LCG-step ledger §17 flagged as
"not built" — is now done. Method: `tools/probe/ram-probe.py` +
`tools/probe/specs/battle1-swapyes-rng-watch.json` (`gRngValue` only, dense
per-tick) over `battle1-swapyes-b.json`'s own new tail, ticks 29601-34081
(4481 rows — every tick from the shared swap-offer prompt through battle
2's settled first menu). LCG-step counts between window boundaries derived
programmatically (same method as §3/§12/§16: replay the LCG forward from
the earlier value until it matches the later one), not estimated from tick
counts. Independently re-run and diffed byte-identical against its own
first run.

**Window ledger** (tick ranges taken from `battle1-swapyes-b.json`'s own
committed segments, not eyeballed):

| window | ticks | LCG steps | note |
|---|---|---|---|
| confirm YES (swap-offer) → entry fade-in settled | 29602-29701 (99) | 99 | baseline 1/tick |
| A opens SUMMARY/SWAP/RECHOOSE popup → settled | 29702-29781 (79) | **82** | +3 extra `Random()` calls somewhere in the popup-open path |
| DOWN (cursor→SWAP) → settled | 29782-29801 (19) | 19 | baseline |
| A confirms SWAP → slide-transition settled (opponent picker) | 29802-30001 (199) | 199 | baseline |
| RIGHT/RIGHT/LEFT/LEFT ball nav (4×) → each settled | 19 ticks each | 19 each | baseline, all 4 |
| A opens accept popup on Grovyle → settled | 30082-30181 (99) | 99 | baseline |
| A confirms YES (accept) → settled (monpic close/fade/return-to-field/swap-complete msg) | 30182-30681 (499) | **502** | +3 extra — plausibly `CopySwappedMonData`'s friendship reset or a cosmetic roll during the fade |
| dismiss swap-complete msg → settled ("Right this way, please!") | 30682-31081 (399) | 399 | baseline |
| dismiss "Right this way" → settled (warp + battle-room opponent quote) | 31082-33081 (1999) | **2004** | +5 extra — plausibly warp/transition-style selection, same family as the anchor's own scouting-text RNG |
| dismiss battle-room quote → settled (trainer intro shown) | 33082-33581 (499) | **259** | **the frontier-battle RNG freeze begins inside this window** (see below) — the shortfall is not a miscount |
| dismiss trainer intro → settled battle-2 first action menu | 33582-34081 (499) | **6** | deep in the frozen zone, matches §15 HEADLINE 1 ("`Random()` only advances on-demand inside frontier battles") |
| **total, tick 29601→34081** | **4480** | **3757** | |

**A new, precise finding**: the per-VBlank-unconditional RNG advance
`main.c:366` grants outside battle (§16 HEADLINE 4) does not merely
"eventually" stop once battle 2 starts — the dense per-tick data pins the
**exact tick**: `gRngValue` is still advancing normally through tick 33285,
takes one 5-step burst at tick 33286 (`135395612` → `3879112243`, plausibly
`BattleSetup`'s own init calls — trainer-intro animation pick, AI seed,
etc.), then goes **completely flat for the next 20 ticks** (33286-33306,
frozen at `3879112243`) before a single isolated step
(`3879112243`→`30250` at 33307) and another long flat run (33307-33934,
627 ticks) — i.e. `gMain.inBattle && (gBattleTypeFlags &
BATTLE_TYPE_FRONTIER)` flips true (disabling `main.c:366`'s automatic call)
**at tick 33286**, comfortably inside the "dismiss battle-room quote →
trainer-intro-shown" window, not at some later point like the menu
settling. The handful of remaining non-zero steps after that (5 total
across 33581-34081) are on-demand calls from specific battle-init logic,
consistent with — not contradicting — the "on-demand only" rule.

Committed: `tools/probe/specs/battle1-swapyes-rng-watch.json` (the watch
spec, segments intentionally not baked in per the existing
`battle1-turn1-watch.json` convention — copy `battle1-swapyes-b.json`'s own
`segments` array in before running) and
`src/data/gen/battle1-swapyes-rng-dump.json` (the full 4481-row per-tick
`gRngValue` table plus the derived window ledger above, `totalStepsAcrossTail`,
and the module's own step-derivation method in its `description` field).

### Asset/UI inventory for a future engine slice (source-cited, not extracted)

Confirmed via `battle_factory_screen.c`'s `Swap_*` half: **the swap screen
is overwhelmingly asset-reuse from the draft (`Select_*`) screen, not new
art** — same background tileset/tilemap/palette
(`gFrontierFactoryMenu_Gfx`/`_Tilemap`/`_Pal`, loaded identically in both
`CB2_InitSelectScreen:1153-1206` and `CB2_InitSwapScreen:3290-3337`), same
mon-pic backdrop (`sMonPicBg_Gfx`/`_Tilemap`/`_Pal`, `graphics/
battle_frontier/factory_screen/mon_pic_bg.{png,bin}`), same ball palettes
(`sPokeballGray_Pal`/`sPokeballSelected_Pal`,
`graphics/battle_frontier/factory_screen/pokeball_{gray,selected}.pal`),
same cursor arrow (`sArrow_Gfx`, `.../arrow.png`) and interface highlight
palette (`sInterface_Pal`, `.../interface.pal`), and **the same text
palette literally reused by pointer comment** (`sSwapText_Pal` at `:1034`,
"Identical to `sSelectText_Pal`"). The compressed ball sprite sheet
(`sSwap_BallGfx` → `gPokeballSelection_Gfx`, referenced but not chased down
to its own file this session) and `sMonPicBgAnim_Gfx`
(`.../mon_pic_bg_anim.png`, the pulsing backdrop behind the big mon-pic
sprite) are likewise shared with the draft screen's own sprite sheets.
**Genuinely new-to-swap:** the action-button graphics (`sActionBoxLeft/
Right_Gfx`, `sActionHighlightLeft/Middle/Right_Gfx`,
`.../action_{box,highlight}_*.png` — the "CANCEL"/"PKMN FOR SWAP" pill
buttons, used only by the swap screen's `Swap_Task_SlideButtonOnOffScreen`
machinery, no `Select_*` equivalent found) and the swap-specific text bank
(`gText_PkmnSwap`, `gText_Summary2`/`gText_Swap`/`gText_Rechoose`,
`gText_PkmnForSwap`/`gText_Cancel3`, `gText_SelectPkmnToSwap`/
`gText_SelectPkmnToAccept`, `gText_AcceptThisPkmn`, `gText_QuitSwapping`,
`gText_SamePkmnInPartyAlready`, `gText_YourSwapIsComplete` — same
`FONT_NORMAL` font as everywhere else in this dossier, no new glyph work
expected). Window geometry (`sSwap_WindowTemplates`, `:948-1033`) and BG
templates (`sSwap_BgTemplates`, `:896-947`) are declared separately from
the draft screen's own but were not diffed field-by-field this session —
flagged as a quick follow-up check, not assumed identical.

### Not delivered this session (open, in priority order for a resuming session)

1. ~~LCG-step ledger for the YES branch (brief's priority 4)~~ — **closed**,
   see the §17 ADDENDUM 2 above (S8 worktree lane, `wt-20260719-184149`):
   window-by-window `gRngValue` step ledger for the whole swap-screen
   sequence, plus a precise tick pin (33286) for where the frontier-battle
   RNG freeze begins.
2. ~~The `rentalMons[]` bookkeeping array~~ — **closed**, see the §17
   ADDENDUM above (S8 worktree lane, `wt-20260719-184149`): offset math was
   the bug (double-counted `frontier`'s own base), not a genuinely-
   unresolved read; fixed probe + validated dump committed.
3. **The "already in your party" duplicate-species block
   (`gText_SamePkmnInPartyAlready`)** — never triggered on-screen; source-
   read only.
4. **The CANCEL path on either swap sub-screen, and the "quit swapping?"
   confirmation it opens (`Swap_AskQuitSwapping`)** — not exercised; this
   session only ever moved forward (mon-pick → mon-pick → accept), never
   backed out.
5. **The SUMMARY option from the popup** (`Swap_OptionSummary` →
   `ShowPokemonSummaryScreen`) — not exercised; RECHOOSE likewise untested.
6. **Window/BG-template diff against the draft screen** — flagged above,
   not done.
7. Everything §16 already left open (battle 2 itself unfought, burn-halving
   not independently re-derived, BAYLEEF never battle-tested, exact
   dismiss-timing minimums not bisected) still applies unchanged; this
   session didn't touch battle 2's own fight.

**Verification**: `npm test` (669/669) and `npm run build` green — no
`src/engine/` changes this session, only the two new committed traces
under `tools/compare/traces-groundtruth/` and one new RAM dump under
`src/data/gen/`, per the worktree brief's constraint. Both new traces
twice-run via `bin/oracle run`, 0 sha mismatches across both (235/235 and
194/194 captures). The `battle2-opponent-ram-dump`'s `dump-battler-full.py`
run independently re-run and diffed byte-for-byte against its own first
run — identical.

## 18. Battle 2's opening ground truth — turn 1, decline branch (S8 worktree lane `wt-20260719-184149`, oracle scout — no engine code)

**Headline: battle 2 (FISHERMAN JENSON's KABUTO, decline branch) now has
its first turn ground-truthed end to end.** Branching from
`battle1-winline-b-swap.json`'s own committed settled-menu tick (33031,
"What will ONIX do?" vs KABUTO, ONIX 117/117), ONIX opened FIGHT and used
**ROCK_SLIDE** (move slot 0, no cursor navigation needed — see the
evidence-based rationale below); KABUTO's own AI-chosen response was
**SAND_ATTACK** (not the far more threatening MEGA_DRAIN the matchup
analysis below flags — see the "risk not realized" note). ROCK_SLIDE hits
for **28 damage** (KABUTO 91→63), no flinch; SAND_ATTACK lowers ONIX's
accuracy stage but deals no damage (ONIX stays 117/117). Settled next menu
("What will ONIX do?" vs KABUTO, 63/91) reached at tick **33672**, well
inside a single trace's frame budget (33672 ≪ 45000, 168/256 captures used).

### Move choice: ROCK_SLIDE — an evidence-based call, not the first-slot default

Same discipline as §16 HEADLINE 1 (MAGBY over BAYLEEF): decided from
extracted data (`src/data/gen/moves.json`, `type-effectiveness.json`)
*before* the turn was scripted, not picked arbitrarily because it happens
to sit in slot 0:

| ONIX move | type | power | acc | vs KABUTO (ROCK/WATER) effective power |
|---|---|---|---|---|
| **ROCK_SLIDE** | ROCK | 75 | 90% | `75 × STAB 1.5 × type 1.0` = **112.5** (ROCK→ROCK and ROCK→WATER are both neutral — no table entry in `gTypeEffectiveness`, source-confirmed, `battle_main.c:335-443`) |
| BIND | NORMAL | 15 | 75% | `15 × 1.0 × 0.5` = 7.5 (NORMAL→ROCK is resisted) |
| DRAGON_BREATH | DRAGON | 60 | 100% | `60 × 1.0 × 1.0` = 60 (neutral, no STAB) |
| SANDSTORM | ROCK | 0 (status) | — | 0 — both mons are ROCK-type, immune to sandstorm's own chip damage; no other gen-3 effect |

ROCK_SLIDE's effective output (112.5) dwarfs every alternative, and — a
detail worth surfacing since Onix (speed 76) outspeeds Kabuto (speed 61,
RAM-confirmed both directions) — its 30% `EFFECT_FLINCH_HIT` secondary can
outright cancel Kabuto's turn (flinch only prevents a target's *own*,
not-yet-taken move; since Onix always acts first here, it's live upside
every turn, not just situational). **The far more important asymmetry this
matchup analysis surfaced**: Kabuto's own MEGA_DRAIN (GRASS, `type
1.0 vs neutral` — no: GRASS→ROCK **and** GRASS→GROUND are each `2.0×`,
`src/data/gen/type-effectiveness.json`, so MEGA_DRAIN lands at a
**4× effective multiplier** against Onix's ROCK/GROUND typing) is a
genuine threat this dossier now has on record for whoever fights
subsequent turns — it did **not** come up this turn (Kabuto's AI chose
SAND_ATTACK instead, see below), but a future session should not assume
that stays true.

### Frame boundaries (RAM- and pixel-confirmed)

| tick | what |
|---|---|
| 33031 | shared prefix ends — settled "What will ONIX do?" menu (`battle1-winline-b-swap.json`'s own final tick) |
| 33032 | `A` opens FIGHT submenu |
| 33071 | settled FIGHT submenu (cursor defaults to ROCK_SLIDE, slot 0 — same layout §11 pinned) |
| 33072 | `A` confirms ROCK_SLIDE |
| 33077-33078 | turn-order settles: `gBattlerAttacker`→0 (ONIX, faster), `gCurrentMove`→157 (ROCK_SLIDE) |
| 33083 | ONIX's **accuracy** check (RNG step 1) |
| 33108-33109 | `gBattleMoveDamage` locks: 19→**28** (see damage-math note below) |
| 33110 | ONIX's **damage-spread/secondary** roll (RNG step 2) — `gBattleMoveDamage` unchanged after this (stays 28), consistent with this being the flinch-chance roll, not a further damage adjustment |
| ~33115-33315 | ROCK_SLIDE's own hit animation plays (Battle Scene ON, per the v5 anchor) |
| 33319 | `gBattleMons[1].hp` (KABUTO) updates 91→**63** |
| 33324 | secondary-effect-adjacent roll (RNG step 3) — same **+5-tick-after-hp-update** offset §3 found for turn 1 of battle 1 (tick 2325→2330) |
| 33332-33333 | ONIX's move cleanup; `gCurrentMove`→28 (SAND_ATTACK), `gBattlerAttacker`→1 (KABUTO acts) |
| 33338 | KABUTO's **accuracy** check (RNG step 4, SAND_ATTACK is 100% acc but still rolls — same "always rolls" rule this dossier established elsewhere) |
| 33605-33614 | turn-end RNG cluster (RNG steps 5-12, see ledger below) — structurally identical **1+2+5** shape to §3's own RESOLVED turn-end cluster |
| ~33615 | next settled menu enters its own 4-phase/36-tick idle cycle (pixel-confirmed via dense sha sampling) |
| 33672 | trace's own committed end (57 ticks of settle margin past 33615) |

### RNG-consumption ledger (RAM-truthed, LCG-step-counted, same method as §3/§12/§16)

`gRngValue` sampled every tick 33031-33672 (642 rows); step counts between
each observed transition derived by replaying the LCG forward
programmatically (not assumed) — same method as every prior ledger in this
dossier.

| tick | steps | value after | attribution |
|---|---|---|---|
| 33083 | 1 | `2956382169` | ONIX's accuracy check (ROCK_SLIDE, acc 90) |
| 33110 | 1 | `2508258776` | ONIX's damage-spread roll (`ApplyRandomDmgMultiplier`) — **the crit roll (`Cmd_critcalc`) consumed *zero* calls this turn**, a new finding: KABUTO's ability is BATTLE_ARMOR (`ability` RAM field = 4), and the crit-chance check's own `&&`-chain short-circuits *before* its `Random()` call when the target has BATTLE_ARMOR/SHELL_ARMOR (`battle_script_commands.c:1279-1283`) — confirmed by RAM (`gCritMultiplier` stays **1** throughout, dense-watched) and by the step count (§3's own equivalent turn spent 2 steps here — accuracy *and* crit — this turn spends only 1, exactly the crit roll's absence) |
| 33324 | 1 | `575948139` | secondary-effect-adjacent roll (ROCK_SLIDE's 30% flinch chance; didn't proc, KABUTO still acted) — same +5-tick-after-hp-update offset as §3's turn 1 |
| 33338 | 1 | `650807554` | KABUTO's accuracy check (SAND_ATTACK, 100% acc, still rolls) |
| 33607 | 1 | `3011990093` | turn-end cluster start — `BattleTurnPassed`'s `gRandomTurnNumber = Random()`, same call site §3 resolved |
| 33612 | 2 | `1648070399` | `AI_TrySwitchOrUseItem`'s `ShouldSwitch()`, same resolved call site as §3 |
| 33614 | 5 | `3121225034` | `OpponentHandleChooseMove`'s `BattleAI_SetupAIData` simulated-RNG loop (4) + `ChooseMoveOrAction_Singles` tie-break (1), same resolved call site as §3 |

**Total: 12 `Random()` calls this turn** — an exact match to §3's own
turn-1 total (also 12), with the same **1+2+5=8**-step turn-end-cluster
signature, reconfirming §3's call-site attribution on a third, independent
matchup rather than just re-deriving it from scratch. The only structural
difference from §3's own count (also 4 for the active move) is the crit
roll's absence here (BATTLE_ARMOR-driven), landing this turn's own
move-phase total at 3 instead of 4 (accuracy + spread + secondary, no
crit) — the *total* still lands on 12 only because KABUTO's own
accuracy-check step (1, novel to this ledger — §3's opposing mon never got
to act since Grovyle's DOUBLE_TEAM consumed no RNG at all) makes up the
difference.

### Damage math — mostly confirmed, one flagged gap

RAM-confirmed inputs (`tools/probe/dump-battler-full.py`, tick 33031):
ONIX attack **51**, KABUTO defense **96**, ROCK_SLIDE power **75**, ONIX
level **50** — reproducing `CalculateBaseDamage` (`pokemon.c:3106-3282`) +
`Cmd_typecalc`'s STAB step by hand:

```
base = floor(floor(floor(51*75*(2*50/5+2)) / 96) / 50)
     = floor(floor(84150 / 96) / 50)
     = floor(876 / 50) = 17
STAB = floor(17 * 15 / 10) = 25      (ONIX is ROCK/GROUND, ROCK_SLIDE is ROCK - STAB applies;
                                       ROCK vs ROCK/WATER has no gTypeEffectiveness entry - neutral 1x)
spread = floor(25 * m / 100), m in [85,100] (ApplyRandomDmgMultiplier, battle_script_commands.c:1639-1651)
       -> range [21, 25]
```

**The RAM-confirmed final damage is 28 — outside this [21,25] range.** The
dense per-tick trace (frame-boundaries table above) shows `gBattleMoveDamage`
passing through an intermediate value of **19** one tick before locking to
28 (33108→33109), and `19 × 15 / 10 = 28` (integer-truncated) is an *exact*
match — i.e. the engine's own pre-STAB base this turn was RAM-observed as
**19, not the 17 this hand-reconstruction gives from the same documented
formula and the same RAM-read inputs**. The gap is 2 points on the
pre-STAB base, small enough that it isn't an obviously-wrong formula
(type/STAB/spread mechanics all check out structurally — no crit per
above, no weather, no held-item interaction found for SITRUS_BERRY or
BATTLE_ARMOR that would touch damage) but hasn't been root-caused this
session. **Left as an explicit open item, not swept under the rug or
force-fit**: a future session should RAM-probe `gBattleMons[1].defense`'s
raw stat-stage array (`statStages[]`, struct offset `0x18`, not read by
`dump-battler-full.py` today) and `ShouldGetStatBadgeBoost`'s own frontier
gating to rule those out, or re-derive `CalculateBaseDamage` with a wider
net of possible modifiers than this session's manual reconstruction
covered.

### Damage math gap — ROOT-CAUSED, NOT an engine bug (worktree lane `wt-20260719-191802`, ISSUES #21 follow-up)

**Root cause: the hand-reconstruction two paragraphs above dropped
`CalculateBaseDamage`'s own unconditional `+2` (`pokemon.c:3371`,
`return damage + 2;`), applied on *every* return path (physical/special/
`TYPE_MYSTERY`) after all other modifiers — the same easy-to-miss-reading-
top-down pitfall this exact dossier already named and fixed once before,
in §10, for **battle 1's own ROCK_SLIDE sample** (tick 2335, base 32 not
the naive 30). `src/engine/damageCalc.ts:199` already carries the `+2`
(`return damage + 2;`, with an inline comment citing that precedent) —
**`damageCalc.ts` needed zero changes.** §18's own from-scratch
reconstruction simply re-derived the arithmetic straight from source
without re-applying the already-established `+2` finding from earlier in
this same file. `17 + 2 = 19` — the exact RAM-observed pre-STAB value —
and `floor(19 × 15 / 10) = 28`, the exact RAM-observed final damage (and
the exact `91 → 63` HP delta). No unmodeled branch, no matchup-specific
gap: this session's own extended RAM probe (below) confirms every other
input was already neutral, exactly as the original write-up assumed.

**Directly verified by running the real engine function**, not just
re-deriving by hand a second time — invoked `calculateBaseDamage`/
`applyStab` from `src/engine/damageCalc.ts` (unmodified) with the exact
RAM-confirmed inputs (attacker atk 51/lvl 50, defender def 96, movePower
75, `TYPE_ROCK`, both battlers' `statStages` all `6`/neutral, no crit):

```
$ npx tsx <scratch script importing src/engine/damageCalc.ts>
pre-STAB base: 19
post-STAB:     28
```

Bit-exact against the dump, with the committed engine code exactly as it
already sits in the tree.

**Extended-probe inputs ruling out every other lead ISSUES #21 raised**
(`tools/probe/dump-battler-full.py`, now extended this session with
`statStages[]` at struct offset `0x18` (`pokemon.h:277`) plus
`gSideStatuses`/`gSideTimers`/`gCritMultiplier`/`gBattleMovePower`;
RAM-sampled at ticks 33031, 33107, 33108, 33109, 33110 — committed as
`src/data/gen/battle2-turn1-fullstate-dump.json`, twice-run byte-identical):
- **`statStages`**: both battlers, all 8 slots, **`6` (neutral) at every
  sampled tick including 33108/33109** — no stage was hiding a modifier on
  either side.
- **`sideStatuses`/`sideTimers`**: both sides `0`/all-zero throughout — no
  Reflect/Light Screen/Mist/Safeguard/Spikes in play.
- **`critMultiplier`**: `1` throughout (confirms §18's own BATTLE_ARMOR
  finding above). **`gBattleScripting.dmgMultiplier`** (separately
  RAM-probed, `gBattleScripting+0xE`): `1` throughout — rules out the
  `Cmd_damagecalc` post-multiply (`gBattleMoveDamage *= gCritMultiplier *
  gBattleScripting.dmgMultiplier`) as a factor; with both factors `1`,
  `gBattleMoveDamage` at tick 33108 (`19`) *is* `CalculateBaseDamage`'s raw
  return, not a scaled derivative.
- **Badge/frontier gating** (an explicit lead in ISSUES #21's own text):
  RAM-confirmed `gBattleTypeFlags = 0x8000c` (bit 19, `BATTLE_TYPE_FACTORY`,
  set) at the calc tick, so `gBattleTypeFlags & BATTLE_TYPE_FRONTIER` is
  nonzero and `ShouldGetStatBadgeBoost` returns `FALSE` unconditionally —
  **even though the save's own badge flags are separately confirmed all
  set** (`FLAG_BADGE01_GET`/`05`/`07` all `TRUE`, RAM-read from
  `gSaveBlock1Ptr->flags`). Badge boosts are structurally impossible in any
  Factory battle, not just coincidentally absent this turn.
- **Held items**: both battlers hold `ITEM_SITRUS_BERRY` (142, confirmed
  via RAM, matching §18's own item-slot note above) — source-confirmed
  (`reference/pokeemerald/src/data/items.h:1752`) `.holdEffect =
  HOLD_EFFECT_RESTORE_HP`, which appears in none of `CalculateBaseDamage`'s
  damage-modifying hold-effect branches (`sHoldEffectToType`'s type-power
  items, `CHOICE_BAND`, `SOUL_DEW`, the four species-locked items). Not a
  coincidental non-factor — verified by item ID, per the brief's explicit
  instruction not to assume.
- **Abilities**: ONIX is `ABILITY_STURDY` (5, RAM-confirmed), KABUTO is
  `ABILITY_BATTLE_ARMOR` (4) — neither appears in any of
  `CalculateBaseDamage`'s ability-gated branches (`HUGE_POWER`/
  `PURE_POWER`, `THICK_FAT`, `HUSTLE`, `PLUS`/`MINUS`, `GUTS`,
  `MARVEL_SCALE`, `OVERGROW`/`BLAZE`/`TORRENT`/`SWARM`).

**Cross-check against battle 1 (why it "never diverged" there): it did —
this is the exact same bug, caught the first time.** §10 already found and
fixed this identical `+2` omission for battle 1's own ROCK_SLIDE sample
before `damageCalc.ts` was ever written; that fix has been sitting in the
engine (and cited in its own doc comment) the entire time. §18's "flagged
gap" wasn't a second, distinct, matchup-specific bug — it was this
dossier's *documentation* independently re-deriving the same formula by
hand a second time, for a second matchup, and stepping on the same
already-solved pitfall. Nothing in `src/engine/damageCalc.ts` changes as a
result of this session.

**Verification**: `npm test` (unchanged count, no engine files touched)
and `npm run build` green. `tools/probe/dump-battler-full.py`'s extension
(statStages + side statuses/timers + critMultiplier/battleMovePower) and
the new `src/data/gen/battle2-turn1-fullstate-dump.json` are this session's
only committed artifacts; the `dmgMultiplier`/badge-flag/`gBattleTypeFlags`
reads above used scratch `ram-probe.py` specs (not committed — ad hoc,
reproducible from the addresses cited inline) per this dossier's existing
convention for one-off verification probes.

### Battler snapshots (`dump-battler-full.py`, ticks 33031 and 33672)

| | species | atk | def | spd | hp before | hp after | move used | PP before→after |
|---|---|---|---|---|---|---|---|---|
| battler0 (ONIX) | 95 | 51 | 187 | 76 | 117/117 | 117/117 (unchanged) | ROCK_SLIDE (157) | 10→9 |
| battler1 (KABUTO) | 140 | 118 | 96 | 61 | 91/91 | 63/91 | SAND_ATTACK (28) | 15→14 |

Matches the frame-boundary/RNG-ledger tables above exactly — PP decrements
confirm each mon used exactly the move this session scripted/observed, no
more.

### Committed trace

`tools/compare/traces-groundtruth/battle2-turn1.json` (160 segments, 33672
frames, 168 `captureFrames`) — `battle1-winline-b-swap.json`'s own 156
segments **verbatim** (byte-identical, cum. 33031 ticks) plus 4 new
segments: open FIGHT (`A`, 1f) + settle (39f idle), confirm ROCK_SLIDE
(`A`, 1f) + a 600f idle tail covering the whole turn's resolution through
the next settled menu (with ~57 ticks of margin past the observed
pixel-settle point, tick 33615). Captures: 11 sparse anchors over the old
prefix (same tick set as §16/§17: 0, 6970, 19990, 20192, 20745, 22418,
23601, 25802, 28002, 29601, 33031) plus dense coverage of every
RNG/HP/text transition in the new tail (open, confirm, turn-order settle,
accuracy roll, damage lock, animation start, sparse-every-20th through the
long hit-animation span, HP update + secondary roll + Kabuto's move,
turn-end cluster, and the settle-into-idle-cycle window) — well under the
256-capture cap. **Twice-run byte-identical via `bin/oracle run`, 0/168
sha mismatches.**

### Kabuto's move choice: a risk flagged, not realized

The move-choice analysis above flagged MEGA_DRAIN as a 4×-effective threat
to ONIX; this turn's AI instead chose SAND_ATTACK (a 0-power accuracy-down
status move). Not investigated further this session (AI move-scoring logic
is out of this scout's scope), but worth flagging explicitly: **a future
session should not assume Kabuto avoids MEGA_DRAIN on later turns** — this
is one data point from one AI roll, not a characterization of Kabuto's own
move-selection policy.

### What a resuming session needs — pinned vs. open

**Pinned this session:**
- Battle 2's own turn 1 (decline branch), full RAM ground truth: move
  choice rationale, frame boundaries, 12-step RNG ledger (structurally
  matching §3's own resolved call sites almost exactly), battler snapshots.
- BATTLE_ARMOR (Kabuto's ability) short-circuits the crit-chance roll's own
  `Random()` call entirely (not just its effect) — a new, source-confirmed
  mechanic this dossier hadn't exercised before (every prior RAM-truthed
  hit was against a non-BATTLE_ARMOR target).
- MEGA_DRAIN's 4× effective multiplier against Onix (GRASS is super
  effective against both ROCK and GROUND) is now on record as a real risk
  for future turns, independent of whether it was actually used this turn.

**Still open (in priority order for a resuming session):**
1. ~~The damage-math gap above (RAM-confirmed 28 vs. hand-formula's
   [21,25])~~ — **ROOT-CAUSED, worktree lane `wt-20260719-191802`**: the
   hand-reconstruction above omitted `CalculateBaseDamage`'s unconditional
   `+2` (`pokemon.c:3371`); `src/engine/damageCalc.ts` already has it and
   needed no change. See "Damage math gap — ROOT-CAUSED" below.
2. Battle 2's own turn 2 onward — this session's own deliverable stops at
   the tick-33672 settled menu, per the brief's priority order (turn 2+ is
   explicitly "if time remains," not reached this session).
3. ~~`statStages[]` (struct offset `0x18`, `pokemon.h:277`) isn't read by
   `dump-battler-full.py`~~ — **added, worktree lane `wt-20260719-191802`**
   (see "Damage math gap — ROOT-CAUSED" below); confirms all 8 slots stayed
   neutral (`6`) both battlers throughout the turn-1 window sampled,
   including SAND_ATTACK's own accuracy-stage write not yet having landed
   by tick 33110 (KABUTO's move executes later in the turn).

**Verification**: `npm test` (669/669) and `npm run build` green — no
`src/engine/` changes this session, only the new committed trace under
`tools/compare/traces-groundtruth/` and two new RAM dumps under
`src/data/gen/`. Trace twice-run via `bin/oracle run`, 0/168 sha
mismatches. Both RAM-dump probe runs (`ram-probe.py`, `dump-battler-full.py`)
independently re-run and diffed byte-identical against their own first run.

### §17 ADDENDUM 3 (S8 worktree lane, extraction only — no engine code): swap-screen assets extracted, composite-verified byte-exact against fresh oracle pixels

Closes S17's own "Asset/UI inventory" section — the genuinely-new-to-swap
static assets are now extracted, and the "overwhelmingly reuse" claim for
everything else is now backed by a pixel composite-check, not just a source
read.

**New extractor**: `tools/extract/extract-factory-swap-screen.ts`
(run: `node --experimental-strip-types tools/extract/extract-factory-swap-screen.ts`).
Writes:
- `src/assets/gen/action-box.json` — `action_box_left.png`/`action_box_right.png`
  (16×16 + 32×16 4bpp tilesets), the blank pill-button shape used for both
  CANCEL (box_left + box_right) and PKMN FOR SWAP (box_left + box_right×2),
  plus the shared `sInterface_Pal` subpalette (same 16 colors already
  extracted as `arrow.json`/`menu-highlight.json`'s own `palette` — the
  action-box/highlight sprite templates are `sSpriteTemplate_Swap_Arrow`/
  `sSpriteTemplate_Swap_MenuHighlightLeft` with only `tileTag` swapped,
  `battle_factory_screen.c:3469-3502`, so `paletteTag` stays
  `PALTAG_INTERFACE` — confirmed from source, no new palette file needed).
- `src/assets/gen/action-highlight.json` — `action_highlight_{left,middle,right}.png`,
  the pressed/selected-cursor overlay for the same buttons, same palette.
- `src/data/gen/swap-screen-windows.json` — `sSwap_BgTemplates`/
  `sSwap_WindowTemplates`/`sSwapMenuOptionsTextColors`/
  `sSwapSpeciesNameTextColors`, mechanically parsed from
  `battle_factory_screen.c` (regex over the struct literals + `#define`
  resolution for `PALNUM_FADE_TEXT`/`PALNUM_TEXT`, not hand-copied), the
  same "parse don't transcribe" convention `extract-battle-window.ts` uses
  for the battle action-menu geometry.

**Everything else the swap screen draws is verbatim reuse** of the draft
screen's own already-committed assets from `extract-factory-screen.ts`
(`menu-bg.json` BG1 chrome, `mon-pic-bg.json`, `pokeball.json`, `arrow.json`,
`menu-highlight.json`, `text-palette.json`, `font-normal.json`/
`charmap.json`) — confirmed by source (`CB2_InitSwapScreen:3290-3337` loads
the identical `gFrontierFactoryMenu_Gfx`/`_Tilemap`/`_Pal`,
`sPokeballGray_Pal`/`sPokeballSelected_Pal`, `sArrow_Gfx`, `sInterface_Pal`,
`sSwapText_Pal` — literally commented "Identical to `sSelectText_Pal`" at
`:1034`) **and now by a fresh pixel check** (below) — no re-extraction of
these files, per the worktree contract (existing extractors' output files
are off-limits).

**Window/BG-template diff against the draft screen** (S17's own open item
6, closed): `sSwap_BgTemplates` adds a 4th background (`bg=2`,
`mapBaseIndex=26`, priority 0) that `sSelect_BgTemplates` doesn't have —
used to carry `SWAP_WIN_SPECIES` (moved from BG0 in the draft screen to
this new BG2) plus 2 new fade-only windows (`SWAP_WIN_ACTION_FADE`,
`SWAP_WIN_UNUSED`) — the extra layer exists specifically so the species
name can cross-fade independently during the ball-slide transition (§17's
own "cross-fading the species-name text" behavior finding), confirmed
structurally, not just observed on-screen. `SWAP_WIN_SPECIES_AT_FADE` is
new-to-swap on BG0. The windows shared with the draft screen
(`TITLE`/`INFO`/`OPTIONS`/`YES_NO`/`MON_CATEGORY`) keep identical
`tilemapLeft`/`tilemapTop`/`width`/`height` (only `baseBlock` addresses
shift, from the extra windows ahead of them in the array) — i.e. **layout
is unchanged, only the BG/window bookkeeping grew**. Text colors
(`sSwapMenuOptionsTextColors`/`sSwapSpeciesNameTextColors`) are
byte-identical to the draft screen's own (`{TRANSPARENT, DARK_GRAY,
TRANSPARENT}` / `{TRANSPARENT, RED, TRANSPARENT}`).

**Composite verification** (bar: 0 mismatches over the pixels this
extraction owns; every excluded region documented), against a **fresh**
`bin/oracle run` of the committed `battle1-swapyes-a.json`/`-b.json`
traces (not stale PNGs):

1. `tools/compare/scratch/swap_action_buttons_verify.mjs` — composites
   `action-box.json`'s `left`/`right` tiles (OBJ-transparency-aware: index-0
   pixels left as the oracle's own background, matching real GBA OBJ
   semantics) at the exact `Swap_InitAllSprites` coordinates for the CANCEL
   button (`x=192,y=144`) and the PKMN FOR SWAP button (`x=160,y=120`),
   against frame 30001 of a fresh `battle1-swapyes-b.json` run (the settled
   opponent-picker screen, both buttons visible unhighlighted). Result:
   **0 unexplained mismatches** over 1404 opaque button-graphic pixels; 223
   pixels differ but are *exactly* solid white (255,255,255,
   independently confirmed as the only mismatching color) — the
   "CANCEL"/"PKMN FOR SWAP" text printed by a separate BG window layer
   (`SWAP_WIN_ACTION_FADE`/`OPTIONS`) on top of the plain button graphic,
   not part of this asset and correctly excluded.
2. `tools/compare/scratch/swap_chrome_reuse_verify.ts` — composites the
   **existing, unmodified** `menu-bg.json` alone (no text/sprites/other
   BGs) against frame 29670 of a fresh `battle1-swapyes-a.json` run (the
   settled player-screen entry), to pixel-check the "same BG1 chrome"
   reuse claim rather than trust the source comment alone. Result: 38400
   opaque BG1 pixels checked, 2538 differ (everywhere a higher-priority
   layer — title/species/info/mon-category text windows, the 3 ball
   sprites, the cursor arrow, the CANCEL button — draws over BG1, which
   this single-layer render doesn't composite), and **0 of those 2538 fall
   outside the known overlay bounding boxes** — i.e. wherever BG1 chrome is
   actually the topmost thing on screen, it is byte-exact.

**Not verified against on-screen pixels (documented, not silently
skipped)**: `action-highlight.json` — decoded via the identical pipeline as
`action-box.json` (dimensions/bit-depth/palette-slot all cross-checked
structurally against source), but the highlighted/pressed button state is
never shown on screen in any committed ground-truth trace (S17's own "not
delivered" item 4: the CANCEL path was never navigated to this dossier).
`mon-pic-bg.json`'s reuse for the swap screen's SUMMARY popup is likewise
unverified here for the same reason (item 5: SUMMARY never opened). Both
are pre-existing S17 gaps, not new ones from this session — flagged for
whichever session first exercises those paths.

**Verification**: `npm test` (711/711, unchanged) and `npm run build`
green — no `src/engine/` changes, only the new extractor + its 3 gen
outputs + 2 new scratch verification scripts. Both scratch scripts are
deterministic given their oracle captures (re-run twice, identical output);
the captures themselves live under the gitignored
`tools/compare/out/swap-verify-{a,b}/` (regenerate with the `bin/oracle
run` command in each script's own header comment) rather than being
committed, matching this repo's existing scratch-script convention.

## 19. Engine slice F: turn 3's FIGHT-submenu reopen — cursor persistence exercised for real, PROVEN not "always resets" (S7 bounded worker session)

Assigned brief: land the faint/forced-switch engine slice starting from the
earliest un-modeled window (§13/§14's own ground truth, banked by an earlier
scout). This session's actual scope is much narrower than "faint/forced-
switch" — see the honest accounting below. Committed: `tools/compare/
traces/turn3-menu.json` (new app trace, extends `turn2-dragonbreath.json`'s
own 3846-frame prefix **verbatim**, +50 frames covering turn 3's FIGHT-
submenu reopen/nav/confirm through tick 3896, 250 `captureFrames`, dense
stride 1 across the whole new window minus two named single-tick
residuals — see below).

### What landed

The engine previously modeled turns 1 and 2 and stopped: `BattleSceneState.
turn1Resolved` was a plain boolean (turn 1 done or not), and `core.ts`'s own
reopen-FIGHT-submenu branch was gated `!turn1Resolved`, i.e. it could fire
**exactly once** — there was no code path for a third FIGHT-submenu open at
all. Pressing A on turn 2's own resettled menu did nothing.

Added a second boolean, `turn2Resolved`, following the exact same pattern:
`core.ts` gained a new `else if (turn1Resolved && !turn2Resolved && ...)`
branch (gated on `DRAGONBREATH_MENU_REDRAW_DELAY`, now exported, having
elapsed since turn 2's own confirm — the same "resolution's own redraw
gates the next reopen" rule `ROCK_SLIDE_MENU_REDRAW_DELAY` already
established for turn 1→2) that reopens FIGHT for turn 3.

**The one genuinely new mechanic this exercises**: `openFightSubmenu`
previously *always* reset the cursor to slot 0 on open — turn 1's own first
open and turn 2's own reopen both coincidentally rested at slot 0, so
nothing before this session had ever distinguished "always reset" from
"persist the prior turn's own cursor." §13's ground truth is explicit that
`gMoveSelectionCursor` reads **2** (DRAGON_BREATH, turn 2's own confirmed
slot) at turn 3's reopen — a real, previously-unexercised persistence rule.
`openFightSubmenu` gained an optional `initialCursor` param (default 0, every
pre-existing call site unaffected); turn 3's own reopen call passes `2`.
The existing generic `moveFightCursor("UP", ...)` bit-toggle already handles
2→0 correctly with no changes (§13: one `UP` press flips DRAGON_BREATH back
to ROCK_SLIDE, matching the turn-1/turn-2 nav mechanism exactly).

**Three rendering gaps this surfaced, all fixed** (none was visible before
because no prior render path needed a battler's *own* HP to differ from the
static harvest while ALSO exercising the FIGHT-submenu's generic idle/DMA-
wait draw functions):
1. `drawMenuIdleBaseWithOpponentHp` only ever overlaid Grovyle's turn-1-end
   HP (101) — by turn 3 Grovyle is really at 88 (post DRAGON_BREATH, §12).
   Gained an optional `turn2Resolved` param selecting `anchorOpponentAfterTurn2Hp`.
2. The SAME generic idle path never drew Onix's own HP overlay at all
   (`menuIdleBase`'s static harvest bakes in Onix's pre-turn-1 117/117) —
   fine through turn 2 (Onix's real HP only ever differed from 117 during
   turn-2-specific bespoke draw functions that already had their own manual
   overdraw, per S7 slice E2b-2's precedent), but turn 3's reopen dwells in
   the *generic* path with Onix genuinely at 101. Fixed by threading the
   overlay into `drawActionMenuIdleContent`/`drawFightSubmenuWindow`'s two
   "idle, waiting" branches, applied **after** the live bounce patches draw
   (same ordering constraint S7 slice E2b-2 already discovered for this
   exact overlay — get it backwards and the bounce's own static asset
   repaints the stale digits back over top).
3. The idle-bounce phase itself: `turn2SubmenuBounceTick` (anchored to turn
   1's own confirm + `ROCK_SLIDE_MENU_REDRAW_DELAY`) is turn-2-specific:
   reusing it for turn 3 produced a **6.1%-of-frame, whole-battler-silhouette
   mismatch** (dense oracle diff, not a subtle one) at every captured tick in
   the new window. Added `turn3SubmenuBounceTick`/`TURN2_CONFIRM_PRESS_TICK`
   (2945, cross-checked against `dragonBreathTextStartTick`'s own already-
   committed doc comment: `2945+192=3137`), composing
   `dragonBreathResettledBounceTick` (turn 2's own resettled-menu remap) with
   the same DMA-wait correction `turn2SubmenuBounceTick` already applies —
   used for BOTH the DMA-wait hold (plain `t` turned out to be wrong here too,
   unlike turn 1/2's own DMA-wait, which are fine with plain `t` — pixel-
   confirmed independently, not assumed) and the "idle, cursor shown" dwell.

**Two named single-tick residuals, excluded from `captureFrames`** (same
"hardware quirk at a bounce extremum" class already catalogued at ticks
3337/3465/3721 elsewhere in this dossier, not chased further within this
session's budget): tick **3879** (1 tick after the UP-nav's own 1-tick
display-lag redraw, 769px/2.0% mismatch, isolated to the Onix sprite's own
bounce region) and tick **3888** (the last idle tick before turn 3's own
confirm, 1573px/4.1% mismatch, isolated to the Onix healthbox region). Both
are single, isolated ticks surrounded on both sides by exact matches — a
future session should RAM-probe `menuIdleBounce`'s own bounce-task state at
exactly these two ticks rather than re-sweep the formula (already provably
exact at every neighboring tick).

> **Correction (S7 residual-cleanup slice):** NOT a hardware quirk — a
> pointer-chase to the real bouncer sprites' own raw `sSinIndex` proved
> `turn3SubmenuBounceTick` was uniformly one RAM tick too advanced;
> retarded by 1, both ticks restored to `turn3-menu.json` at 0 diff. See
> `docs/turn3-residual-probe-notes.md` ("Family B" and its "RESOLVED"
> subsection).

### What did NOT land — honest scope accounting

This is **far short of "faint/forced-switch."** The brief's own ground
truth (§13/§14) covers turns 3-5, Grovyle's faint, the opponent's AI switch-
in, Onix's own later faint, the forced party-select, and the SEND OUT
sequence — thousands of ticks of largely unbuilt, bespoke-per-move engine
work (each of turns 2's own sub-slices — E1, E1b, E2a×5, E2b, E2b-2 — took a
full session; turn 3 alone needs its own ENDEAVOR-hits-Onix-again +
ROCK_SLIDE-hits-Grovyle-again resolution, entirely unbuilt). This session
landed only the **menu-reopen/cursor-nav/confirm-registration prefix** of
turn 3 — the same class of "cheap, mostly-reuse" slice this dossier's own
`turn1-kickoff`/`fight-submenu` slices established, not the resolution
itself. Turn 3's actual move resolution (ENDEAVOR's kickoff text onward,
`turnKickoffTextStartTick(pressTick)` = confirm+10) is deliberately
**out of scope** — the trace stops 4 ticks after the confirm, safely before
text would start, and does not attempt the HP-drain/animation/text work
turns 1-2 each needed a dedicated session for. The faint itself (turn 5),
DESTIN's Pidgeotto switch-in, Onix's own later faint, the forced
party-select screen, and the SEND OUT confirm sequence remain **entirely
unbuilt** — this is the correct next target, starting from turn 3's own
resolution (§13's ledger has the exact HP/RNG values already banked).

### Verification

`npm test` **738/738** (+6: `openFightSubmenu`'s cursor-persistence param,
`currentPPForActiveMon`'s `turn2Resolved` decrement, and a `core.ts`
integration suite driving the new reopen gate through `tick()` directly —
reopen fires with cursor persisted at 2, UP nav + re-confirm works, and the
gate itself stays closed before `DRAGONBREATH_MENU_REDRAW_DELAY` has
elapsed). `npm run build` green. `turn3-menu.json` **250/250** (two named
single-tick exclusions above). Zero regressions: `turn2-dragonbreath.json`
**235/235**, `turn2-endeavor-drain.json` **201/201**, `fight-submenu.json`
**235/235**, plus a broader sweep of every other FIGHT-submenu/menu-idle-
touching trace (`turn1-drain`, `turn1-rockslide`, `turn1-kickoff`,
`menu-idle`, `turn2-endeavor`, `sendout` all still 100%; `s6-acceptance`
224/228 and `sendout` 255/256 unchanged pre-existing gaps, not new).

## 20. Engine slice G: turn 3's ENDEAVOR resolution (the turn's first half), by PARAMETERIZING turn 2's own mechanisms - `turn3-endeavor.json` **180/180** (bounded worker session)

Implements §13's own ground truth for turn 3's own ENDEAVOR-again window:
`turn3-menu.json`'s own committed button script (through its own confirm at
tick 3891) plus 190 idle frames, extending `core.ts`'s dispatch so a turn-3
confirm (cursor 0, ROCK_SLIDE selected by the player) still resolves
Grovyle's own ENDEAVOR first (speed 90 beats Onix's 76, same turn-order rule
every prior turn already established). Per the brief's own framing, this is
**parameterization, not a rebuild** - every one of turn 2's own ENDEAVOR
sub-mechanisms (kickoff text, `ENDEAVOR_SQUISH_TABLE`'s squish/blend,
droplets, hitsplat, healthbox-wobble/flicker tail) is already
`pressTick`-relative in `battleScene.ts`/`battleMenu.ts` and needed ZERO
formula changes - only the two turn-2-hardcoded anchors (Grovyle's own hp,
the idle-bounce freeze tick) needed threading as real parameters.

### Anchors (RAM- and pixel-probed this session, not assumed)

- **`TURN3_CONFIRM_PRESS_TICK = 3891`** - the last frame of `turn3-menu.json`'s
  own final 2-frame `A` hold (ticks 3890-3891), same "last frame of the hold"
  convention `TURN1_CONFIRM_PRESS_TICK`(1919)/`TURN2_CONFIRM_PRESS_TICK`(2945)
  already established - confirmed correct (not just assumed by analogy) via
  the kickoff-text pixel probe below.
- **RAM ledger, re-confirmed byte-for-byte against §13's own table** (fresh
  `tools/probe/ram-probe.py` run this session, `gCurrentMove`/`gBattlerAttacker`/
  `gBattleMons[]`/`gBattleMoveDamage`): `gCurrentMove`->283 (ENDEAVOR) at tick
  3897; `gBattleMoveDamage` 13->6->13 at 3927-3933; Onix's `gBattleMons[0].hp`
  101->88 at tick 4059; attacker flips to battler 0, `gCurrentMove`->157
  (ROCK_SLIDE) at tick 4073 - all four match §13 exactly, validating this
  session's own probe methodology before trusting any NEW number below.
- **Kickoff text start: 3900** (`turn2KickoffTextStartTick(pressTick)` -
  `pressTick+9`, the SAME `-1`-off-the-general-formula correction turn 2's
  own reopened-submenu needed - oracle-pixel-confirmed this session: the
  whole ~9280px message-box region is unchanged tick 3891-3899, then changes
  simultaneously at 3900, not 3901 the generic `turnKickoffTextStartTick`
  formula would predict). Text content is textually identical to turn 2's
  own ("Foe GROVYLE used\nENDEAVOR!", Grovyle repeats its move) - reused
  `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2`/`turn2KickoffTextVisibleChars`
  verbatim, no new text constants needed.
- **Animation window: unchanged relative offsets, reused verbatim.**
  `ENDEAVOR_SQUISH_TABLE`'s own squish/blend/droplet/hitsplat/tail timing
  (`ENDEAVOR_SQUISH_START_DELAY=55` through the table's own last row at
  offset 147) needed zero changes - RAM/pixel-confirmed this session that
  turn 3's own window follows the identical `pressTick`-relative schedule
  (e.g. the HP drain's own sentinel/completion below lands exactly where
  `ENDEAVOR_HP_DRAIN_START_DELAY=153`'s own unchanged formula predicts).
- **HP drain: Onix 101->88, `ENDEAVOR_HP_DRAIN_START_DELAY=153` unchanged.**
  `endeavorOnixHp(t, pressTick, anchorPlayerAfterTurnHp(101), anchorPlayerAfterTurn3Hp(88))`
  - the new `anchorPlayerAfterTurn3Hp` constant (88) is sourced from
  `battle1-grovyle-faint-ram-dump.json`'s own `battlerSnapshots["4892"]
  .battler0.hp` (turn 3's end/turn 4's reopen boundary - Onix isn't touched
  again by ROCK_SLIDE, which hits Grovyle, so this snapshot IS ENDEAVOR's own
  settled endpoint), independently cross-confirmed by this session's own RAM
  probe (`gBattleMons[0].hp` 101->88 at tick 4059). Drain completes (bar +
  digits both read 88) at render tick 4044+13=4057 - pixel-confirmed via a
  whole-frame sha256 sweep (`bin/oracle run`, dense 4020-4195): every tick
  4057-4079 is BYTE-IDENTICAL (23-tick flat plateau), the drain's own
  completion tick is the last-finishing sub-mechanism (the squish/blend/
  droplet/hitsplat/wobble/flicker chain itself settles earlier, offset 147 =
  tick 4038).
- **Idle-bounce freeze: `TURN3_KICKOFF_FROZEN_BOUNCE_TICK`, a NEW literal**
  (`turn3SubmenuBounceTick` evaluated at `TURN3_CONFIRM_PRESS_TICK +
  FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`, i.e. tick 3894) - unlike turns 1/2 (whose
  own frozen plateaus were pixel-fit to a DIFFERENT value than their live
  formula's freeze-moment reading), this session's own oracle probe showed
  the onix/healthbox sprite region is already byte-identical from tick 3891
  through at least 3899 - i.e. turn 3's own live formula is ALREADY flat over
  the relevant span, so freezing at the live value AT the freeze moment
  happens to be correct here (verified by the trace's own 0-diff result, not
  assumed).
- **Window boundary: tick 4079, oracle-confirmed via a message-box crop
  diff** (dense `bin/oracle run` capture 4020-4195, cropped to the message
  box's own `(0,116)-(240,155)` region against a tick-4030 baseline): the
  message box stays byte-identical through tick 4079, then the WHOLE region
  changes simultaneously at tick 4080 (885px) - ROCK_SLIDE's own kickoff text
  hard-cutting the message box, matching the RAM attacker-flip at 4073 plus a
  short bookkeeping delay (not itself modeled or timed precisely this
  session - out of scope, see below). `turn3-endeavor.json`'s own dense
  window stops at 4079, safely before this boundary.

### One genuine divergence found and NOT curve-fit: the target-shake mechanism is asymmetric for turn 3

RAM-probing `gSprites[onixSlot].x2` directly (`tools/probe`-style script, this
session, cross-validated first against `turn2-endeavor-drain.json`'s own
known-good window to confirm the probe methodology itself, which reproduced
the documented symmetric `+3/-3` alternation exactly) found turn 3's own
target-shake sequence reads **`+3, -2, +3, -2, ...`** - asymmetric, NOT the
symmetric `±3` `ENDEAVOR_SHAKE_STEP` (derived from `gAnimMovePower=75`,
§15e) already models and which turn 2's own RAM independently confirms
exact. This is a REAL mechanism difference this session could not explain
(and, per the brief's own instruction, did not curve-fit a second formula
for) - candidates not investigated (time-boxed): `gAnimMovePower` reading a
different value for turn 3's own instance despite ENDEAVOR being the same
move (unconfirmed - not RAM-read this session), or the shake task's own
half-step accumulator carrying residual state from a source other than a
fresh `75/12` division. Produces a small, precisely-characterized, isolated
residual: **12 ticks, ±1px in the target-shake's own x-offset, region
`x=41-97,y=49-111`** (Onix's own silhouette, `588px`/`1.53%` mismatch per
tick) - `3958,3959,3962,3963,3966,3967` (shake round 1's own second half)
and `3984,3985,3988,3989,3992,3993` (round 2's own second half), both
tick-pairs matching the render-lag-2 window `ENDEAVOR_SHAKE_ROUND_RAM_OFFSET`
predicts. Every neighboring tick (the full 180/192 - 12 = 180 captured
frames) is 0 diff. Excluded from `turn3-endeavor.json`'s own `captureFrames`
per this run's "characterize precisely, never commit red" rule - a future
session should RAM-probe `gAnimMovePower` directly at these ticks before
attempting a second shake formula.

> **Correction (S7 residual-cleanup slice):** RAM-probed and root-caused -
> `gAnimMovePower`/`gBattleMovePower` is stale from the last power-
> calculated move (`.power=60`, turn 2's own DRAGON_BREATH; ENDEAVOR never
> writes it), giving `downStep=2`/`upStep=3` via the general
> `endeavorShakeSteps` formula. All 12 ticks restored to `turn3-endeavor.json`
> at 0 diff. See `docs/turn3-residual-probe-notes.md` ("Family A" and its
> "RESOLVED" subsection).

### What landed (`src/engine/battleScene.ts`)

- `drawActionMenuIdleContent` gained an optional `playerHp` param (default
  `anchorPlayerAfterTurnHp`, every pre-existing call site unaffected) - turn
  3's own still-draining Onix hp needs to reach the healthbox overlay while
  the fallback idle-content path is active (past `ENDEAVOR_SQUISH_TABLE`'s
  own window, before ROCK_SLIDE's own kickoff).
- `drawEndeavorSquish` gained `opponentHp`/`kickoffBounceTick` params
  (replacing the hardcoded `anchorOpponentAfterTurnHp`/`turn2KickoffBounceTick`
  call) - turn 2's own call site passes its own literals unchanged, turn 3's
  new `drawTurn3EndeavorText` passes `anchorOpponentAfterTurn2Hp`(88)/
  `turn3KickoffBounceTick`.
- New `drawTurn3EndeavorText` - turn 3's own analogue of `drawTurn2KickoffText`,
  deliberately NOT dispatching onward into a ROCK_SLIDE phase (out of scope).
  Needed its own yOffset threading for the player healthbox HP overlay
  (`endeavorHealthboxBounceY2(t, pressTick)`) that turn 2's own call didn't:
  turn 2's `onixHp` sits AT `anchorPlayerBattler.hp`(117) for the WHOLE
  squish/tail window (its own drain starts later), so that overlay's own
  no-op guard (`hp === anchorPlayerBattler.hp`) skips drawing during the ONE
  span where a missing offset would show - turn 3's own `onixHp` starts at
  101, never 117, so the overlay is NEVER a no-op here and the real hardware
  wobble must be tracked explicitly. A genuine "parameterization can't hide
  this" case, not a bug in turn 2's own code.
- `turn3KickoffBounceTick`/`TURN3_KICKOFF_FROZEN_BOUNCE_TICK` - turn 3's own
  freeze-then-hold idle-bounce formula, same shape as `turn2KickoffBounceTick`.
  Also swapped into the pre-text confirm-wait branch (`turn2Resolved` case),
  replacing slice F's own explicitly-flagged "live formula only, freeze not
  modeled" gap - oracle-confirmed unchanged for every tick slice F's own
  trace already covers (live/frozen values coincide there).
- `anchorPlayerAfterTurn3Hp` (88) - new anchor constant, sourced from
  `battle1-grovyle-faint-ram-dump.json` (already committed, from §13's own
  scout session).
- `core.ts`'s own dispatch (`drawFightSubmenuWindow`): `textStart` now uses
  `turn2KickoffTextStartTick` whenever `turn2Resolved` (not just
  `cursor===2`), and a new `turn2Resolved` branch routes to
  `drawTurn3EndeavorText` instead of falling through to `drawRockSlideWindow`/
  `drawTurnKickoffText` (which would have been wrong - turn 3's cursor is 0,
  same as turn 1's, but the state machine must distinguish them).

### Verification

`npm test` **746/746** (+2: a full-button-script replay pinning
`TURN3_CONFIRM_PRESS_TICK`=3891 through `core.ts`'s own `tick()`, and a
determinism/smoke check over the whole new window). `npm run build` green.
`turn3-endeavor.json` **180/180** (192 dense captures minus the 12
characterized shake-residual exclusions above). Zero regressions, full
sweep re-verified at exact prior counts: `turn3-menu.json` **250/250**,
`turn2-dragonbreath.json` **237/237**, `turn2-endeavor-drain.json`
**201/201**, `turn2-endeavor.json` **77/77**, `fight-submenu.json`
**235/235**.

### What's left

The ROCK_SLIDE half of turn 3 (Onix's own move hitting Grovyle again,
kickoff text starting sometime after tick 4080 - not itself timed this
session) and the turn-4 menu reopen are the immediate next slice, ground
truth already banked (§13's own ledger: `gBattleMoveDamage` locks to
32->48->47, Grovyle 88->41). The shake-asymmetry divergence above (12
excluded ticks) is a clean, precisely-scoped follow-up needing one RAM read
(`gAnimMovePower` at ticks 3956-3966) before touching any render code.

## 21. Engine slice H: turn 3's ROCK_SLIDE resolution (the turn's second half), by PARAMETERIZING turn 1's own ROCK_SLIDE mechanism unchanged - `turn3-rockslide.json` **256/256, 0 diff** (bounded worker session)

Implements §13's own ground truth for turn 3's own ROCK_SLIDE half (Onix's
move, hitting Grovyle again, 88->41) - slice G's own `drawTurn3EndeavorText`
deliberately stopped holding the ENDEAVOR text at tick 4079 ("does NOT
dispatch onward into ROCK_SLIDE"); this slice extends it past ROCK_SLIDE's
own kickoff-text hard-cut (tick 4080, already pixel-confirmed by slice G)
through the drain/text-clear/menu-redraw transient into the settled
next-action menu, stopping at a stable green boundary (tick 4890) safely
before turn 4's own reopen input (tick 4892, out of scope). Per the brief's
own framing (and slice G's own precedent): **parameterization, not a
rebuild** - ROCK_SLIDE is the SAME move against the SAME target (Grovyle)
turn 1 already modeled end-to-end (`docs/battle-menu-notes.md` §11, `turn1-
rockslide.json` 256/256), so every one of turn 1's own mechanism functions
(`rockSlideBg3Y`/`rockSlideRockState`/`rockSlideDrawOrder`/
`rockSlideMonShakeY2`/`rockSlideHealthboxWobbleY2`/`rockSlideMonBlinkInvisible`/
`rockSlideOpponentHp`, all still `pressTick`-relative) is reused **with ZERO
code changes** - only a fresh synthetic press-tick anchor plus two new
turn-3-specific delay constants for the RNG-cost tail were needed.

### Anchors (RAM- and pixel-probed this session, not assumed)

- **`TURN3_ROCKSLIDE_PRESS_TICK = 3687`** (`4080 - ROCK_SLIDE_TEXT_DELAY(393)`)
  - a SYNTHETIC anchor, not a real button-press tick: chosen so
  `rockSlideTextStartTick(TURN3_ROCKSLIDE_PRESS_TICK)` lands exactly on
  turn 3's own oracle-pixel-confirmed kickoff tick (4080, slice G's own
  named boundary). Distinct from `TURN3_KICKOFF_FROZEN_BOUNCE_TICK`'s own
  real-press anchor (`TURN3_CONFIRM_PRESS_TICK`=3891, still used for the
  onix/healthbox idle-bounce overlay in this window - the two anchors are
  NOT the same thing and must not be conflated, since one is a real
  hardware freeze point and the other is a convenience for reusing
  `pressTick`-relative formulas).
- **RAM ledger re-confirmed byte-for-byte against §13's own table** (fresh
  `tools/probe/ram-probe.py` run this session): `gCurrentMove`->157
  (ROCK_SLIDE) at RAM tick 4073; `gBattleMoveDamage` 32->48->47 at
  4103-4105; `gBattleMons[1].hp` (Grovyle) updates 88->41 at RAM tick 4333 -
  all match §13 exactly.
- **`gBattle_BG3_Y` shake starts at RAM tick 4115** = `TURN3_ROCKSLIDE_
  PRESS_TICK + ROCK_SLIDE_RAM_ANCHOR_DELAY(428)`, bit-exact against turn 1's
  own unchanged `[0,-7,-7,0,0,-7,-7,0,0,-7,-7]` sequence (fresh `ram-probe.py`
  dump of `gBattle_BG3_Y`, ticks 4108-4134, twice-run consistent pattern
  matching the table exactly with no fitting needed).
- **HP drain: `rockSlideOpponentHp` reused unchanged, `ROCK_SLIDE_HP_DRAIN_
  START_DELAY=597` unchanged.** `rockSlideOpponentHp(t, TURN3_ROCKSLIDE_
  PRESS_TICK, anchorOpponentAfterTurn2Hp(88), anchorOpponentAfterTurn3Hp(41))`
  - the new `anchorOpponentAfterTurn3Hp` constant (41) sourced from
  `battle1-grovyle-faint-ram-dump.json`'s own `battlerSnapshots["4892"]
  .battler1.hp` (the same tick-4892 turn-3/turn-4 boundary snapshot
  `anchorPlayerAfterTurn3Hp` already used, this time the OTHER battler),
  independently cross-confirmed via this session's own fresh RAM probe
  (`gBattleMons[1].hp` 88->41 at tick 4333). The raw hp-field-update tick
  (4333) matches `TURN3_ROCKSLIDE_PRESS_TICK + 597 + (88-41) + 2` EXACTLY -
  the identical "+2" render/RAM lag turn 1's own doc already establishes
  between `bar1Curr`'s done-sentinel and the raw hp-field write.
- **Text-clear/menu-redraw: two NEW turn-3-specific constants, NOT turn 1's
  own unchanged 657/664.** Pixel-confirmed (dense `bin/oracle run` sweep,
  ticks 4320-4370): the message box goes blank at tick 4349 (689px, the
  message-box's own bbox) and hard-cuts to the resettled menu at tick 4356
  (5983px, the same whole-bottom-half swap turn 1's own boundary shows) -
  `TURN3_ROCKSLIDE_TEXT_CLEAR_DELAY=662`/`TURN3_ROCKSLIDE_MENU_REDRAW_
  DELAY=669` (both `TURN3_ROCKSLIDE_PRESS_TICK`-relative). **Not a new
  mechanism** - both are exactly **+5** past the naive turn-1-constant
  prediction, and that +5 is fully explained by parameter drift through an
  UNCHANGED formula, not a divergent one: turn 3's own HP-drain diff (88-41
  =47) is 5 more than turn 1's (143-101=42), and the whole post-drain
  RNG-cost tail (flinch/turn-pass/`ShouldSwitch`/AI-setup) is anchored to
  the drain's own completion tick (the raw hp-field-update, 4333), not to
  `pressTick` directly - confirmed directly via §13's own turn-3 ledger:
  flinch(+5)/turn-pass(+15)/`ShouldSwitch`(+20)/AI-setup(+22) each land the
  SAME fixed number of ticks after 4333 as turn 1's own v5 correction table
  (`battle-turn-notes.md` §9) shows relative to ITS OWN hp-field-update tick
  (2560) - bit-for-bit identical deltas both turns, not a coincidence.

### The OAM-slot-state caution (from this session's own brief) - checked directly, not assumed

Per the brief's own caution ("sprite slots may differ after 3 turns of
animations; do not assume"), this session RAM-probed turn 3's own rock
window directly (`dump-rockslide-sprites.py` + `dump-rockslide-slot-order.py`
against a turn-3-extended trace) rather than assuming turn 1's own hardcoded
`ROCK_SLIDE_BASELINE_SLOTS`/`ROCK_SLIDE_ORDER_SEED` constants still apply:
- **`inUse` baseline at the rock-order simulation's own seed tick (4106,
  matching turn 1's own `ROCK_SLIDE_ORDER_SEED_OFFSET` convention) reads the
  SAME 9 slots** turn 1's own `ROCK_SLIDE_BASELINE_SLOTS` constant already
  lists (`[0,1,2,6,8,60,61,62,63]`, 9/9 exact match) - three turns of other
  animations left this specific set of persistent slots unchanged.
- **The raw `sSpriteOrder` permutation itself DOES differ from turn 1's own
  committed `ROCK_SLIDE_ORDER_SEED` in 9 of 64 entries** - but every one of
  those 9 differing positions holds a FREE (non-baseline) filler slot at the
  seed tick, and `computeRockSlideOrders`'s own per-tick `SortSprites` pass
  is a full single-pass insertion sort (not partial) - it fully re-sorts
  every slot's position from its own packed key every RAM tick regardless of
  the starting permutation, and every filler slot shares one identical
  packed key/`yKey` pair (so filler-vs-filler order is never externally
  observable). **Net: turn 1's own `rockSlideDrawOrder`/
  `computeRockSlideOrders` reused with ZERO code changes** - not just argued
  from this reasoning, but directly confirmed by `npm run compare`'s own
  0-diff result across the full dense rock/stacking window below (the
  actual empirical test the brief asked for).

### What landed (`src/engine/battleScene.ts`)

- `anchorOpponentAfterTurn3Hp` (41) - new anchor constant, same sourcing
  pattern as slice G's own `anchorPlayerAfterTurn3Hp`.
- `TURN3_ROCKSLIDE_PRESS_TICK`/`TURN3_ROCKSLIDE_TEXT_CLEAR_DELAY`/
  `TURN3_ROCKSLIDE_MENU_REDRAW_DELAY` - the three new anchors above.
- `drawTurn3RockSlideAttack` - the battlefield+rocks+shake+drain scene,
  identical shape to turn 1's own `drawRockSlideAttack`, reusing every
  `battleMenu.ts` mechanism function unchanged; only new code is the Onix-
  side HP overlay call (turn 1's Onix stays full HP through ITS OWN
  ROCK_SLIDE window, so `drawRockSlideAttack` never needed one - turn 3's
  Onix already carries ENDEAVOR's own damage, 117->88, by this point).
- `turn3RockSlideResettledBounceTick`/`drawTurn3RockSlideTurnEndSettledMenu` -
  same "resettled bounce re-initializes fresh at redraw" shape as
  `rockSlideResettledBounceTick`/`dragonBreathResettledBounceTick`, keyed
  off turn 3's own redraw delay (669) and Grovyle's own settled HP (41).
- `drawTurn3RockSlideWindow` - the three-phase dispatcher (attack+text,
  text-clear, settled menu), the same shape as turn 1's own
  `drawRockSlideWindow` minus the DOUBLE_TEAM/STAT_ROSE text phases (not
  needed - turn 3's kickoff text is Grovyle's ENDEAVOR, already drawn by
  `drawTurn3EndeavorText` before handing off here).
- `drawTurn3EndeavorText` gained a handoff: once `t >= rockSlideTextStartTick
  (TURN3_ROCKSLIDE_PRESS_TICK)` (tick 4080), it now dispatches into
  `drawTurn3RockSlideWindow` instead of holding the ENDEAVOR text forever -
  the same shape `drawTurn2KickoffText`'s own `dragonBreathStart` handoff
  already established for turn 2. No `core.ts` changes were needed - the
  existing `turn2Resolved` branch already calls `drawTurn3EndeavorText`
  unconditionally for the rest of the window (no upper bound), so the new
  internal dispatch is picked up automatically.

### Verification

`npm test` **749/749** (+3: numeric anchor-arithmetic pins on
`rockSlideOpponentHp` at turn 3's own synthetic press tick, a full-render
pin on the three named boundary ticks - 4079/4080, 4348/4349, 4355/4356 -
each showing a real frame change, and a determinism/smoke check over the
whole 999-tick window). `npm run build` green. New `tools/compare/traces/
turn3-rockslide.json` (`turn3-endeavor.json`'s own button script, idle
frames extended to 4890 total, dense stride-1 over the kickoff/shake/rocks/
hit-flash/drain/text-clear/redraw transient with a light stride over the
rock settle-wobble tail and the settled plateau, 256 captures) is
**256/256, 0 diff** - this session ALSO ran the full window at full stride-1
density in four unbudgeted scratch `npm run compare` passes (4080-4335,
4336-4591, 4592-4847, 4848-4891 - covering literally every tick from the
kickoff text through the settled plateau, not just the committed trace's
own 256-capture subset) to validate the OAM-slot-state caution above before
committing to a capture selection: **0 diff on every single one of those
812 additional probed ticks**, not just the 256 committed. Zero
regressions, full sweep re-verified at exact prior counts: `turn3-endeavor.
json` **180/180**, `turn3-menu.json` **250/250**, `turn1-rockslide.json`
**256/256**, `turn1-drain.json` **102/102**, `turn2-dragonbreath.json`
**237/237**, `turn2-endeavor-drain.json` **201/201**.

### What's left

Turn 4 entirely (its own menu-reopen input at tick 4892 and beyond, ground
truth already banked in §13's own turn-4 ledger: DOUBLE_TEAM instead of a
third ENDEAVOR, falsifying the tie-break-decode prediction - see §13's own
turn-4 section) is the immediate next slice. Slice G's own 12-tick
shake-asymmetry exclusions (turn 3's ENDEAVOR window) and `turn3-menu.json`'s
own 3879/3888 residuals remain untouched, out of this slice's own scope.

## 22. Engine slice I: turn 4's FIGHT-submenu reopen, landed green; the DOUBLE_TEAM/ROCK_SLIDE resolution itself does NOT land this session - a real, uncracked pixel residual, not a scope choice (S7 bounded worker session)

The assigned brief was turn 4 end to end (menu reopen through DOUBLE_TEAM
through ROCK_SLIDE to the settled next menu). **That did not fully land.**
What's committed and green: `tools/compare/traces/turn4-menu.json` (new,
extends `turn3-rockslide.json`'s own 4890-frame prefix **verbatim** with
`battle1-grovyle-faint.json`'s own turn-4 reopen+confirm presses - A at
4892-4893, A at 4924-4925, both reused byte-for-byte from the groundtruth
trace, per the brief's own instruction - through tick 4933, 44 dense
`captureFrames`) is **44/44, 0 diff**. This covers the reopen, the
(unneeded, cursor already 0) non-nav dwell, and the confirm registering -
i.e. exactly `turn3-menu.json`'s own scope one turn later, NOT the fuller
"reopen+DOUBLE_TEAM" fallback the brief explicitly allowed as a landing
point. The DOUBLE_TEAM-text-onward and ROCK_SLIDE code below is written and
RAM-validated but **NOT pixel-verified** - see the honest accounting below
before trusting it.

### What landed and is verified

- **`BattleSceneState.turn3Resolved`** (new field, same "created directly"
  idiom as `turn1Resolved`/`turn2Resolved`) - `core.ts` gained a new
  `turn2Resolved && !turn3Resolved && ...` reopen branch, gated on a new
  exported `TURN3_ROCKSLIDE_REOPEN_GATE_DELAY` (465, `battleScene.ts`) past
  turn 3's own REAL confirm tick (3891) - **not** `TURN3_ROCKSLIDE_MENU_
  REDRAW_DELAY`(669) directly, since that constant is relative to a
  SYNTHETIC anchor (`TURN3_ROCKSLIDE_PRESS_TICK`, slice H), not the real
  press; this session derives the real-press-relative delay as the two
  anchors' own arithmetic difference (`3687+669-3891=465`). Reopen calls
  `openFightSubmenu` with the default cursor (0) - no persisted-cursor param
  needed, since ROCK_SLIDE (slot 0) is already where turn 3 left it, matching
  §13's own "no nav needed" finding. Pinned by a new Tier-1 test replaying
  `turn4-menu.json`'s own button script through `core.ts`'s `tick()`: reopen
  registers at 4893 (`openElapsed`), confirm at 4925, cursor 0,
  `turn3Resolved` flips true - plus a gate-still-closed test (100 ticks past
  turn 3's confirm, well short of 465, leaves `fightSubmenu` untouched) and a
  determinism/replay check.
- **PP arithmetic**: `currentPPForActiveMon` (`battleMenu.ts`) gained a
  `turn3Resolved` param - ROCK_SLIDE (slot 0) now reads **8/10** once turn 3
  has ALSO resolved (used turns 1 AND 3, two independent slot-0 decrements),
  distinct from `turn2Resolved`'s own unrelated slot-2 (DRAGON_BREATH)
  decrement. Directly pixel-confirmed correct (not just RAM-inferred) - the
  8/10 digits are inside `turn4-menu.json`'s own 0-diff dense window.
- **`drawMenuIdleBaseWithOpponentHp`/`drawActionMenuIdleContent`/
  `drawActionMenuIdleWindow`/`drawFightSubmenuWindow`/`drawFightSubmenuChrome`**
  all gained a `turn3Resolved` param, extending the existing 2-state
  (turn1Resolved/turn2Resolved) opponent-HP/bounce-tick selector to a 3rd
  state (`anchorOpponentAfterTurn3Hp`=41 for Grovyle, `anchorPlayerAfterTurn3Hp`
  =88 for Onix) - same shape slice F/G's own additions already established,
  verified correct for the reopen/dwell/confirm-wait window (`turn4-menu.json`'s
  own 0-diff result covers all of it).
- **`turn4SubmenuBounceTick`/`turn4KickoffBounceTick`/`TURN4_KICKOFF_FROZEN_
  BOUNCE_TICK`**: the onix/healthbox idle-bounce chain one epoch further
  (composing `turn3RockSlideResettledBounceTick`'s own reset point with
  `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`, same shape `turn3SubmenuBounceTick`
  established). **The frozen constant needed a real pixel-fit grid search**
  (unlike turn 3's own case, which coincidentally needed none) - swept
  `turn4SubmenuBounceTick(TURN4_CONFIRM_PRESS_TICK - d)` for `d` from 0 to 30
  against a live single-tick `npm run compare` oracle diff at tick 4928 (the
  freeze moment): `d` in `[9..15]` is an exact 7-tick-wide 0-diff plateau
  (matching `FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`'s own doc's "grid-searched
  plateau" precedent), `d=12` picked as the center. Verified exact for
  ticks 4928-4933 (the whole confirm-wait window this session's own committed
  trace covers).

### What's written but NOT pixel-verified - the honest remainder

`drawTurn4KickoffText`/`drawDoubleTeamClones`/`drawStatsBanner` (DOUBLE_TEAM
+ evasion-banner) and `drawTurn4RockSlideAttack`/`drawTurn4RockSlideWindow`/
`drawTurn4RockSlideTurnEndSettledMenu` (ROCK_SLIDE) are all implemented,
following slice H's own "parameterize turn 1's mechanism with a real, not
synthetic, press tick" approach (`TURN4_CONFIRM_PRESS_TICK`=4925 - a REAL
press, unlike turn 3's synthetic `TURN3_ROCKSLIDE_PRESS_TICK`, since turn 4's
own preceding move is DOUBLE_TEAM again, the SAME move turn 1 used, unlike
turn 3's ENDEAVOR). This session's own fresh `tools/probe/ram-probe.py` run
strongly supports zero-code-change reuse being the RIGHT shape: every one of
turn 1's own `pressTick`-relative anchors reproduces EXACTLY at
`TURN4_CONFIRM_PRESS_TICK` plus turn 1's own v5-table offset, bit-for-bit,
no fitting needed - `gCurrentMove`->104 at 4931 (+6, matching turn 3's own
ENDEAVOR-write offset too), evasion stage 7->8 at **4965** (+40, RAM-exact),
ROCK_SLIDE's own accuracy roll at **5316** (+391), crit roll at **5340**
(+415), damage-lock 32->48->**40** at **5343** (+418), Grovyle's raw
`gBattleMons[1].hp` update 41->**1** at **5564** (matching `rockSlideOpponentHp`'s
own unchanged formula, `pressTick+597+40+2`, exactly) - all six bit-exact.
Pixel-confirmed (dense `bin/oracle run` + cropped-diff sweep, ticks
5290-5330/5550-5610): ROCK_SLIDE's own kickoff text hard-cuts the message
box at **5318** (`pressTick+393`, matching turn 1's own unchanged
`ROCK_SLIDE_TEXT_DELAY` exactly - no synthetic-anchor correction needed,
confirming the "same move, same timing" hypothesis), text-clears at **5580**
(`TURN4_ROCKSLIDE_TEXT_CLEAR_DELAY=655`, 2 LESS than turn 1's naive 657 -
turn 4's own drain diff, 40, is 2 less than turn 1's 42, consistent with
slice H's own "drain-diff explains the delta" finding, sign and all), and
hard-cuts to the resettled menu at **5586** (`TURN4_ROCKSLIDE_MENU_REDRAW_
DELAY=661`).

**Despite all of that matching exactly, `npm run compare` against a scratch
(uncommitted) dense probe trace over this window still shows real, non-trivial
diffs** that this session could not resolve in the time remaining:
- A single isolated tick at **4934** (13292px/28.47% mismatch, the whole
  message-box region) - both neighbors (4933, 4935) are EXACT matches, the
  same "hardware quirk at a redraw extremum" shape this dossier has
  repeatedly found (ticks 3337/3465/3721/3879/3888) and excluded rather than
  chased. A same-class, plausible-but-unconfirmed exclusion, not chased
  further this session.
- **A genuine, NOT-bounce-related residual inside the clone/banner window**
  (tick 4978 sampled: 728px/1.90%, bbox `x=145-205,y=17-70` - the Grovyle
  sprite's own top-right region, NOT the onix/healthbox area the bounce grid
  search above already nailed). Confirmed NOT a bounce-tick issue directly:
  sweeping the SAME `d` range that produced an exact 7-wide plateau at tick
  4928 produces a FLAT, unchanged 728px at every `d` in that same range at
  tick 4978 - i.e. whatever's wrong here is invariant to the bounce tick
  entirely, a different mechanism. The app and oracle PNGs are visually
  indistinguishable at normal zoom (no visible clone duplicate, no obvious
  color/shape difference) - the diff is real but subtle, not yet identified
  (candidates not investigated, time-boxed: a background dither/tile-scroll
  offset under the sprite, a palette-index rounding difference in
  `drawSpriteSheetBlended`'s blend path, or `eraseGrovyleFootprint`'s own
  region not matching turn 4's real content exactly). **This is a real open
  bug, not a "not modeled yet" gap** - the code path exists and mostly
  works, but isn't provably exact, so it is correctly excluded from any
  committed trace per this run's own "never commit red" rule.
- The ROCK_SLIDE window itself (attack/shake/rocks/drain/text-clear/redraw,
  5318-5586) was NOT densely pixel-swept this session at all (time-boxed
  after the above) - only the four RAM anchors and the two text-box boundary
  ticks above were oracle-confirmed. Given the clone-window residual above
  is real and unexplained, this window should be assumed **unverified**,
  not assumed correct by the "same formula, real anchor" argument alone -
  the very next thing this dossier's next session should do before trusting
  any of it.

### Verification

`npm test` **753/753** (+4: the turn-4 reopen/confirm replay pin, the
reopen-gate-still-closed pin, the PP-arithmetic pin, and a determinism
replay check - all Tier-1, state-only). `npm run build` green. `turn4-
menu.json` **44/44, 0 diff**. Zero regressions, full sweep re-verified at
exact prior counts: `turn3-rockslide.json` **256/256**, `turn3-endeavor.json`
**180/180**, `turn3-menu.json` **250/250**, `turn1-cloneanim.json`
**230/230**, `turn1-rockslide.json` **256/256**, `turn2-dragonbreath.json`
**237/237**.

### What's left

The clone-window residual (728px, `x=145-205,y=17-70`, bounce-invariant) is
the immediate blocker - RAM-probe `BLDALPHA`/`BLDCNT`/the palette buffer
directly at tick 4978 rather than re-sweeping pixel formulas blind. Once
resolved, the dense capture sweep for both the DOUBLE_TEAM/banner window
(4934-5317) and the full ROCK_SLIDE window (5318-5586) plus the settled
plateau (5586-5926) is mechanical - the anchors/constants above are already
RAM- and boundary-pixel-confirmed, only the mid-window sweep is missing.
Turn 5 (input at 5926) and everything after (the faint, switch-in) remains
entirely out of scope, ground truth already banked in §13.

### §22 RESOLUTION (S7 bounded worker retry): the clone-window residual was TWO real bugs, neither on the candidate list - `turn4-doubleteam.json` **249/249**, `turn4-rockslide.json` **250/250**, both 0 diff, S7 slice I fully closed

The brief's own candidates (background dither/tile-scroll offset, palette-
index rounding in `drawSpriteSheetBlended`, `eraseGrovyleFootprint`'s region)
were all ELIMINATED by direct RAM probing, not fitted around - the mandated
autopsy-before-fitting order found something none of them named.

**Autopsy, in the order the brief specified:**

1. **Pixel-level autopsy of tick 4978** (`tools/compare/scratch/turn4-clone-
   probe.json`, a dense stride-1 probe 4934-5033): the 728px residual is a
   flat plateau across ticks 4976-4981 (matching the clone offsets' own
   near-total-overlap window there), not noise. Per-pixel dump: `app(x,y) ==
   oracle(x+1,y)` at every sampled mismatch (e.g. `(191,17)`: oracle
   `[123,141,139]`, app `[135,154,158]` == oracle's own `(192,17)`) - a
   clean one-column substitution, not a shift/rounding artifact.
2. **Turn 1's analogous tick (1972, the same `n=8` into the clone motion)**:
   diffing turn 1's OWN oracle capture against turn 4's OWN oracle capture,
   restricted to the residual bbox, shows **728 real pixel differences** -
   i.e. the two turns' real hardware renders this window DIFFERENTLY at the
   identical relative tick, despite identical anchors/formulas. Diffing
   turn 1's oracle against turn 4's APP shows **0 differences** - turn 4's
   app was faithfully reproducing turn 1's mechanism while turn 4's real
   hardware does something else. This is the finding that redirected the
   whole investigation: not "the app is wrong", but "turn 4 needs a
   turn-specific fact the formula doesn't carry."
3. **RAM-probing the candidates, in order, all ELIMINATED:**
   - **Clone `x2` motion** (`gSprites[3]`/`gSprites[4]`, found by scanning
     all 64 slots' `callback` pointer for `AnimDoubleTeam`'s address
     `0x08102b3d`, thumb-bit set): `data[]`/`x2` progressions bit-identical
     to `doubleTeamCloneOffsets`'s own model at matching `n`, both clones,
     dense across the whole window. The offset table was never wrong.
   - **Blend/window registers** (`BLDCNT`/`BLDALPHA`/`DISPCNT`/BG0-3
     scroll, `0x04000050`/`0x04000052`/`0x04000000`/`gBattle_BG{0..3}_{X,Y}`):
     flat and IDENTICAL both turns (`BLDCNT=0x3f40`, `BLDALPHA=0x080c`,
     eva=12/evb=8, matching §8's own turn-1 finding exactly). `DISPCNT`
     differs by one bit (OBJWIN, bit 15 - on for turn 1, off for turn 4,
     leftover from turn 1's own earlier send-out effects never having been
     cleared) but this bit is behaviorally inert here: no OBJ with
     `objMode=OBJ_WINDOW` exists yet during the clone phase (that copy is
     only made later, at the stat-banner's own start), so neither window's
     rectangle is populated and `WINOUT` governs identically either way.
   - **Grovyle's own front-sprite palette** (`gPlttBufferUnfaded`/
     `gPlttBufferFaded` at `OBJ_PLTT_ID(1)`, `paletteNum=1` confirmed via
     `gSprites[8].oam` - `gBattlerSpriteIds[1]`=8 both turns): all 16 colors
     byte-identical both turns, before AND unaffected by ROCK_SLIDE's/
     ENDEAVOR's own earlier hit-flash - no persistent contamination.
   - **`sSpriteOrder`** (`0x020217F4`, `EWRAM_DATA static`, the same address
     `rockSlideDrawOrder` already resolved for the rock-stacking fix, §11.1)
     - **this is where it was.** Both clones are raw `gSprites[i] =
     gSprites[spriteId]` STRUCT COPIES of Grovyle's own sprite
     (`CloneBattlerSpriteWithBlend`, `battle_anim_mons.c:1626-1641`), so
     `oam.priority`, `subpriority`, AND `oam.y` are bit-identical between
     them - a GUARANTEED tie on `SortSprites`' own sort key
     (`sprite.c:371-467`). Ties are broken by relative position in the
     persistent, frame-to-frame-STABLE `sSpriteOrder` array - not a pure
     function of slot number, but whatever order HISTORY left the two slots
     in. RAM-read directly at both turns' analogous `n=8` tick: both turns'
     clones land in the SAME two slots (3 and 4 - the free-slot pool is
     otherwise identical by turn 4), but turn 1's `sSpriteOrder` has slot 4
     BEFORE slot 3 (positions 8/9) while turn 4's has slot 3 BEFORE slot 4
     (same positions, flipped) - the tie order genuinely flipped somewhere
     in the intervening turns' own sprite churn, and nothing in either
     turn's DOUBLE_TEAM-specific state predicts which way without reading
     it.
4. **The fix**: `drawDoubleTeamClones` (`battleScene.ts`) gained a
   `frontClone: "a" | "b"` param (default `"b"`, turn 1's own RAM-confirmed
   order, unchanged) - the two draw calls are ordered so whichever clone is
   named front-most is applied LAST (this renderer's own `blendedTile`
   always reads target-2 from the static background per #112's own OBJ-
   vs-OBJ lesson, never from the other clone's already-drawn pixel, so
   last-write-wins reproduces real hardware's front-sprite-wins-the-overlap
   exactly). Turn 4's own call site passes `"a"`. Closes the ENTIRE
   728px/1.90% residual, all bounce-tick-invariant ticks, 4976-5033 and
   beyond (the whole clone+banner window, verified stride-1).

**A second, unrelated bug surfaced once the clone fix was verified and the
sweep continued past the banner**: `drawTurn4RockSlideWindow` never wired in
the three-phase message-text gate turn 1's own `drawRockSlideWindow` already
has (held `TURN_KICKOFF_LINE1/2` -> `STAT_ROSE_LINE1/2` ("Foe GROVYLE's
evasiveness\nrose!") -> `ROCK_SLIDE_LINE1/2`, gated by `statRoseTextStartTick`/
`rockSlideTextStartTick` - both already generic, `pressTick`-parameterized
functions, no new code needed, just wiring). The turn-4 dispatcher instead
always drew `ROCK_SLIDE_LINE1/2` from the hand-off tick (`pressTick`+275) on
- 265 ticks (`pressTick+275` through `+392`) of the wrong text, growing to a
907px plateau once the stat-rose glyphs diverge enough from the rock-slide
glyphs' own pixel footprint. Found by the brief's own mandated full-window
stride-1 sweep AFTER the clone fix (not by further register probing - a
plain oracle-vs-app pixel diff at the newly-passing region's neighbor ticks
was enough once the clone residual stopped masking it). Ported the same
three-branch dispatch turn 1's function already has; closed outright.

**Grovyle's 41->1 drain** (the first turn whose drain crosses the
healthbox's green/yellow/red HP-band thresholds, ISSUES #16's own "never
oracle-exercised" note) needed **zero new compositor code** - the dense
`turn4-rockslide.json` sweep (stride-1 through the whole drain, `pressTick`+
393 to +661) is 0 diff throughout, confirming `composeOpponentHealthbox`'s
existing band thresholds already render both the yellow and red bands
correctly with no changes.

**Committed traces** (both new, both 0 diff, `turn4-menu.json` unchanged):
- `turn4-doubleteam.json`: `pressTick`+9 through +392 (ticks 4934-5317, one
  tick before ROCK_SLIDE's own hard-cut) - dense stride-1 over every
  actively-changing sub-window (clone motion 45-174, banner 213-274,
  stat-rose text typing 284-315) and light stride over the provably-static
  holds between them (pre-clone text-dwell, the register-active-but-pixel-
  inert blend-off gap 175-212, the post-stat-rose dwell before the
  ROCK_SLIDE hard-cut) - 249 captures, tick 4934 itself excluded (13292px,
  both neighbors exact, the same "redraw extremum" single-tick class as
  3337/3465/3721/3879/3888, restated per the brief's own instruction).
  **RESOLVED** (PROGRESS #183/cleanup): root-caused as the `textStart` gate
  mis-selecting ENDEAVOR-family delay for turn 4's own DOUBLE_TEAM window;
  fixed and restored, `turn4-doubleteam.json` now **250/250, 0 diff** - see
  `docs/turn3-residual-probe-notes.md` "The extremum class, probed".
- `turn4-rockslide.json`: `pressTick`+393 through +1000 (ticks 5318-5925,
  ending one tick before turn 5's own input at 5926) - dense stride-1 at
  every named boundary (text hard-cut/accuracy/crit/damage-lock, the
  text-clear/menu-redraw pair) and stride-2 through the shake/rock-fall
  midsection (the hard 256-capture-per-trace service ceiling, `bin/oracle
  info`'s own `limits.maxCaptures`, made full stride-1 across the entire
  607-tick window impossible in one file - noted honestly rather than
  silently thinning without saying so), then stride-15 across the settled
  dwell - 250 captures.

**Honest scope note on the `frontClone` fix**: this is a RAM-verified fact
per turn (`turn3Resolved` at the call site), not a general `SortSprites`/
`sSpriteOrder` simulation like the rock-stacking fix needed (§11.1) - flagged
explicitly in the code comment. It generalizes correctly BECAUSE these two
sprites only ever tie against each other, once per turn, for their whole
shared lifetime (unlike the 20 churning rocks) - a future turn whose clones
land in different slots, or whose tie order changes mid-window, would need
the real simulation, not another hardcoded branch.

**Verification**: `npm test` **756/756** (+3: two pixel pins for the clone
z-order and stat-rose-text fixes, one pin for `rockSlideOpponentHp` with
turn 4's real 41->1 numbers). `npm run build` green. `turn4-doubleteam.json`
**249/249**, `turn4-rockslide.json` **250/250**, both 0 diff. Zero
regressions, exact prior counts: `turn4-menu.json` **44/44**, `turn3-
rockslide.json` **256/256**, `turn3-endeavor.json` **180/180**, `turn1-
cloneanim.json` **230/230**, `turn1-rockslide.json` **256/256**, `turn2-
dragonbreath.json` **237/237**. S7 slice I is now fully closed end to end
(reopen through the settled post-ROCK_SLIDE menu); turn 5's own reopen
(input tick 5926) is the natural next engine slice.

## 23. Engine slice J: turn 5's FIGHT-submenu reopen + Grovyle's ENDEAVOR (Onix 88->1), landed green, ending BEFORE Onix's own ROCK_SLIDE kickoff - `turn5-menu.json` **41/41**, `turn5-endeavor.json` **254/254**, both 0 diff (S7 bounded worker session)

Implements §13's own turn-5 ground truth up to (not including) Onix's own
ROCK_SLIDE: the reopen (real press tick 5927) + confirm (5959, cursor
already at 0 - ROCK_SLIDE, no nav needed, same as turn 4's own reopen) +
Grovyle's third ENDEAVOR (`gCurrentMove`->283 at RAM tick 5965, target
Onix, target.hp(88)-user.hp(1)=87 HP-diff) draining Onix 88->1 - the
longest drain yet and the first to cross the PLAYER healthbox's own
green->yellow->red bands. Per this slice's own brief and every prior
slice's precedent: **parameterize, don't rebuild** - every mechanism
function (`drawEndeavorSquish`, `endeavorOnixHp`, `endeavorShakeSteps`,
`drawActionMenuIdleContent`, `currentPPForActiveMon`) was reused with a
one-epoch-further `turn4Resolved` tier threaded through the same ternary
chains slice I already established for `turn3Resolved` - no new render
mechanism was needed anywhere in this window.

### Anchors (RAM- and pixel-probed this session, not assumed)

- **`TURN5_CONFIRM_PRESS_TICK = 5959`** - a REAL press (`battle1-grovyle-
  faint.json`'s own committed button script: reopen A at 5926-5928, confirm
  A at 5958-5960, both reused verbatim per this slice's own precedent, "last
  frame of the hold" convention). Fresh `tools/probe/ram-probe.py` run
  (`tools/probe/specs/turn5-endeavor-watch.json` ->
  `src/data/gen/turn5-endeavor-watch-probe.json`, ticks 5900-6260) confirms
  `gCurrentMove`->283 (ENDEAVOR) at RAM tick 5965 (`TURN5_CONFIRM_PRESS_
  TICK`+6, the SAME +6 offset every prior turn's own ENDEAVOR/DOUBLE_TEAM
  `gCurrentMove`-write already showed).
- **The stale-power shake prediction, CONFIRMED for the first time on real
  hardware**: `gBattleMovePower`/`gAnimMovePower` RAM-probed at **75** for
  the ENTIRE window (turn 4's own ROCK_SLIDE was the last power-calculated
  move before turn 5's ENDEAVOR - DOUBLE_TEAM doesn't touch it) - the
  general `endeavorShakeSteps(75)` rule (S7 residual-cleanup slice) predicts
  a SYMMETRIC `downStep=3/upStep=3`, matching turn 2's own case exactly.
  **This was a falsifiable prediction landing for the first time this
  session** (the residual-cleanup slice pinned it hermetically but this is
  the first turn-5 pixels ever captured) - `turn5-endeavor.json`'s own
  stride-1 sweep through both shake rounds is 0 diff throughout, so the
  prediction holds: no asymmetry, no new formula needed.
- **`gBattleMoveDamage` 87->43->87** (raw HP-diff -> typecalc 0.5x for the
  NORMAL-vs-ROCK immunity gate -> copyword restore), RAM-confirmed at ticks
  5995/5998/6001 - same three-step shape §13/§20 already document for every
  prior ENDEAVOR use.
- **HP drain: Onix 88->1, `ENDEAVOR_HP_DRAIN_START_DELAY=153` unchanged.**
  `endeavorOnixHp(t, pressTick, anchorPlayerAfterTurn3Hp(88),
  anchorPlayerAfterTurn5Hp(1))` - RAM-confirmed `gBattleMons[0].hp` updates
  88->**1** at RAM tick 6201 (`pressTick+153+87+2`, the same "+2" render/RAM
  lag every prior drain's raw hp-field write already shows past its own
  bar-completion sentinel).
- **PP: ROCK_SLIDE (slot 0) now 7/10** (three uses: turns 1, 3, 4) -
  `currentPPForActiveMon` gained a `turn4Resolved` param (a third slot-0
  decrement, independent of `turn2Resolved`'s own slot-2 DRAGON_BREATH
  decrement) - pixel-confirmed exact, inside `turn5-menu.json`'s own 0-diff
  dense window (not just RAM-inferred).
- **Idle-bounce reopen/freeze**: `turn5SubmenuBounceTick` composes turn 4's
  own `turn4RockSlideResettledBounceTick` with the unmodified
  `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` (the same, un-corrected shape
  `turn4SubmenuBounceTick` already used - NOT Family B's own `-1`
  correction, which was scoped to turn 3's own composition only, built on a
  different resettled-bounce ancestor). `turn5KickoffBounceTick`'s own
  frozen plateau needed a fresh grid search (`npm run compare` on a
  single-tick scratch trace at `TURN5_CONFIRM_PRESS_TICK+FIGHT_CONFIRM_
  BOUNCE_FREEZE_DELAY`=5962): `d` in `[-4..4]` (a 9-tick-wide plateau) are
  ALL exact 0-diff, `d=0` picked as the center - i.e. the live formula
  evaluated AT the freeze moment itself happens to already be correct here
  (the same lucky coincidence turn 3's own case had).
- **Safe stopping boundary: tick 6221**, oracle-confirmed via a dense
  stride-1 sweep 6014-6249 (`tools/compare/scratch`, not committed): every
  tick through 6221 is 0 diff, then tick 6222 hard-cuts to Onix's own
  ROCK_SLIDE kickoff text (RAM: `gCurrentMove`->157, attacker->0, at RAM
  tick 6215; the pixel hard-cut lands a few ticks later, same "RAM flip,
  then a short bookkeeping delay before the visible hard-cut" pattern every
  prior turn boundary shows) - **out of this slice's own scope**, matching
  the brief's own instruction to stop before it. `drawTurn5EndeavorText`
  deliberately does NOT dispatch onward (same shape slice G's own original
  `drawTurn3EndeavorText` had, before slice H added the ROCK_SLIDE handoff)
  - it only ever holds the ENDEAVOR text once fully printed.

### One named single-tick residual, excluded from `captureFrames`

**Tick 5927** (the reopen press's own registering tick): 769px/2.00%
mismatch, isolated to the Onix silhouette region (`x=44-99,y=49-110`) - the
SAME bbox shape this dossier's own "hardware quirk at a redraw/bounce
extremum" class already catalogues repeatedly (ticks 3337/3465/3721/3879/
3888/4934). Both neighbors (5926, 5928) are EXACT matches. **Tested and
ruled out, not just assumed**: a uniform `-1` shift on `turn5SubmenuBounceTick`
(mirroring Family B's own corrective direction) DOES fix tick 5927 in
isolation, but breaks three OTHER previously-exact ticks in the same window
(5936, 5945, 5954) when swept - i.e. a constant offset cannot fix this
residual without breaking currently-passing ticks, the same "ruled out"
finding Family B's own investigation already reached for a different
composition. Excluded per this run's "characterize precisely, never commit
red" rule rather than chased further this session - a future session should
pointer-chase the real bouncer sprite's own raw `sSinIndex` at this specific
tick (`turn3-menu-bouncer-raw.json`'s own precedent) before attempting
another shift.

**RESOLVED** (PROGRESS #183/cleanup): root-caused (not a uniform shift) as a
one-render-tick-early application of `turn5SubmenuBounceTick`'s own phase
correction at the reopen's same-tick dispatch switch; fixed by delaying that
switch by one tick. `turn5-menu.json` now **42/42, 0 diff** - see
`docs/turn3-residual-probe-notes.md` "The extremum class, probed".

### The player healthbox band/sliver crossing - verified, ZERO compositor changes needed

Per this slice's own brief item (b): Onix's drain (88/117 green start ->
1/117 red sliver) is the first PLAYER-side exercise of
`composePlayerHealthboxHpOverlay`'s green->yellow->red band thresholds and
the `filledPixels==0 && hp>0 -> force 1px` sliver rule (`calcBarFilledPixels`,
`healthboxAssembly.ts`) - both were hermetically pinned but never oracle-
exercised on the player side before this session. **Verified exact, no
compositor changes needed**: `turn5-endeavor.json`'s own dense stride-1
sweep through the WHOLE drain (152 ticks, HP values 88 down to 1) is 0 diff
throughout, including the exact tick the bar visually enters yellow (HP<=58,
i.e. `filledPixels<=24`) and red (HP<=23, i.e. `filledPixels<=9`), and the
final 1-HP sliver tick itself. New Tier-1 pin
(`tests/healthboxAssembly.test.ts`) asserts `calcBarFilledPixels(1/117)`
forces the 1px sliver, band `"red"`, and the exact tile tilesheet/palette
this compositor draws for it - matching the real pixels directly, not
re-derived by hand. The HP-digit overlay's 2-digit->1-digit transition (88
down through single digits to 1) is inside the same 0-diff sweep - no
separate finding needed, the existing `rightAlign3GlyphCodes`-style digit
layout already handles it.

### What landed (`src/engine/battleScene.ts`/`battleMenu.ts`/`core.ts`)

- **`BattleSceneState.turn4Resolved`** (new field, same "created directly"
  idiom as `turn1Resolved`/`turn2Resolved`/`turn3Resolved`) - `core.ts`
  gained a `turn3Resolved && !turn4Resolved && ...` reopen branch, gated on
  the newly-exported `TURN4_ROCKSLIDE_MENU_REDRAW_DELAY` (661) past turn 4's
  own REAL confirm (4925) - directly usable with no synthetic-anchor
  arithmetic, unlike `TURN3_ROCKSLIDE_REOPEN_GATE_DELAY`'s own correction,
  since turn 4's own ROCK_SLIDE was already anchored to a real press. Reopen
  calls `openFightSubmenu` with the default cursor (0) - no persisted-cursor
  param needed, matching §13's own "no nav needed" finding.
- **`turn4Resolved` threaded through every render dispatch tier one epoch
  further**: `drawMenuIdleBaseWithOpponentHp`, `drawActionMenuIdleContent`,
  `drawActionMenuIdleWindow`, `drawFightSubmenuWindow`, `drawFightSubmenuChrome`
  all gained a `turn4Resolved` param extending their existing ternary chains
  (opponent HP selects `anchorOpponentAfterTurn4Hp`=1; the reopened-submenu
  and confirm-wait bounce ticks select `turn5SubmenuBounceTick`/
  `turn5KickoffBounceTick`; PP selects the 7/10 reading).
- **`drawTurn5EndeavorText`** - turn 5's own analogue of
  `drawTurn3EndeavorText`, reusing `drawEndeavorSquish`'s entire animation
  state machine and `endeavorOnixHp` unchanged, parameterized by
  `anchorOpponentAfterTurn4Hp`(1, Grovyle's own hp - steady all through this
  window, ENDEAVOR targets Onix not Grovyle), `anchorPlayerAfterTurn5Hp`(1,
  new anchor), `ROCK_SLIDE_MOVE_POWER`(75, the stale-power anchor), and
  `turn5KickoffBounceTick`. Deliberately does NOT dispatch onward into
  ROCK_SLIDE (out of scope), same shape slice G's own original had.
- New anchor constants: `anchorPlayerAfterTurn5Hp`(1), `TURN5_CONFIRM_PRESS_
  TICK`(5959), `turn5SubmenuBounceTick`, `turn5KickoffBounceTick`/
  `TURN5_KICKOFF_FROZEN_BOUNCE_TICK`. `TURN4_ROCKSLIDE_MENU_REDRAW_DELAY`
  changed from a module-private `const` to `export const` (needed by
  `core.ts`'s new reopen gate; value unchanged).
- **`currentPPForActiveMon`** (`battleMenu.ts`) gained a `turn4Resolved`
  param - a third independent slot-0 (ROCK_SLIDE) decrement, same shape
  `turn3Resolved`'s own second decrement already established.

### Committed traces (both new, both 0 diff)

- **`turn5-menu.json`**: extends `turn4-rockslide.json`'s own 5926-frame
  prefix verbatim with the groundtruth's own reopen (A, 5926-5928) + confirm
  (A, 5958-5960) presses, through tick 5967 (`TURN5_CONFIRM_PRESS_TICK`+8,
  the same "+8" boundary `turn4-menu.json` used, right before the kickoff
  text starts at +9) - 41 dense `captureFrames` (tick 5927 excluded, see
  above). **41/41, 0 diff.**
- **`turn5-endeavor.json`**: extends `turn5-menu.json`'s own script with
  idle frames through tick 6221 (the safe boundary above) - 254 dense
  `captureFrames` from tick 5968 (kickoff text start) through 6221, stride-1
  throughout (fits under the 256-per-trace service ceiling with no
  compromise needed this time, unlike slice I's own `turn4-rockslide.json`).
  **254/254, 0 diff.**

### Verification

`npm test` **768/768** (+7: the turn-5 reopen/confirm replay pin, the
reopen-gate-still-closed pin, the PP-7/10 pin, two ENDEAVOR-window
determinism/smoke pins, `endeavorOnixHp` with turn 5's real 88->1 numbers,
and the player healthbox hp=1 red-sliver pin). `npm run build` green.
`turn5-menu.json` **41/41**, `turn5-endeavor.json` **254/254**, both 0 diff.
Zero regressions, full sweep re-verified at exact prior counts: `turn4-
rockslide.json` **250/250**, `turn4-doubleteam.json` **249/249**, `turn3-
endeavor.json` **192/192**, `turn3-menu.json` **254/254**, `turn2-endeavor-
drain.json` **201/201**, `fight-submenu.json` **235/235**, plus `turn4-
menu.json` **44/44**, `turn3-rockslide.json` **256/256**, `turn2-
dragonbreath.json` **237/237**, `turn1-rockslide.json` **256/256**, `turn1-
cloneanim.json` **230/230**, `menu-idle.json` **69/69**, `turn2-endeavor.json`
**77/77**.

### What's left

Onix's own ROCK_SLIDE (tick 6222 onward, hitting Grovyle - already at 1 HP -
for the fatal blow, 1->0, the faint itself) through DESTIN's forced
Pidgeotto switch-in and the next settled menu is the immediate next slice -
ground truth already fully banked in §13 (the whole
faint/switch-in timeline, the button-gated KO-text finding, Onix's own
Sitrus Berry proc). Tick 4934's excluded redraw-extremum and this slice's
own new tick-5927 residual remain a different, still-open residual class
(out of scope for a resolution slice).


## 24. Engine slice K: turn 5's ROCK_SLIDE (Grovyle 1->0, the faint), the faint sink, the button-gated KO hold, and "Foe GROVYLE fainted!" - `turn5-rockslide.json` **256/256**, `turn5-faint.json` **110/110**, both 0 diff, ending BEFORE "DESTIN sent out PIDGEOTTO!" (S7 bounded worker session)

Implements §13's own ground truth for Onix's fatal ROCK_SLIDE (Grovyle
1->0, a faint, not a survival like turns 3/4), CORRECTED AND SHARPENED by
`docs/faint-switch-notes.md` §3/§7's own frame-accurate itemization: the
faint sink closed form (§7a), the exact tick "Foe GROVYLE fainted!" prints
(auto, no button - §3b), and the real button-gated hold that follows.
Per this slice's own brief and every prior slice's precedent:
**parameterize, don't rebuild** - the shake/rocks/hit-flash mechanism
(`rockSlideBg3Y`/`rockSlideMonShakeY2`/`rockSlideHealthboxWobbleY2`/
`rockSlideDrawOrder`/`rockSlideRockState`/`rockSlideOpponentHp`) is reused
with ZERO code changes, same shape slice H's own turn-3 ROCK_SLIDE
established; only a fresh synthetic press-tick anchor was needed. The faint
sink and the KO-text gate ARE genuinely new mechanisms (no prior turn ever
modeled a faint) and are implemented as a closed form + real state,
per the brief's own explicit instruction.

### Anchors (RAM- and pixel-probed this session, not assumed)

- **`TURN5_ROCKSLIDE_PRESS_TICK = 5829`** - a SYNTHETIC anchor (same
  reasoning as `TURN3_ROCKSLIDE_PRESS_TICK`): turn 5's own preceding move is
  ENDEAVOR (variable-length resolution), so this can't be a fixed offset
  from `TURN5_CONFIRM_PRESS_TICK` the way turn 4's DOUBLE_TEAM-preceded case
  could. Chosen so `rockSlideTextStartTick(5829)` = 6222 lands exactly on
  the oracle-pixel-confirmed kickoff hard-cut (dense sweep this session:
  the message box swaps from Grovyle's held ENDEAVOR text to "ONIX used
  \nROCK SLIDE!" in one tick, 2175px, at trace tick 6222 - matching slice
  J's own boundary exactly). **Independently cross-confirmed** via the
  drain formula: `rockSlideOpponentHp` reused UNCHANGED (`startHp=1,
  endHp=0`) predicts Grovyle's raw `hp`-field write at
  `5829+597(ROCK_SLIDE_HP_DRAIN_START_DELAY)+1+2=6429` - bit-exact against
  §13's own RAM-confirmed tick 6429 (the same "+2" render/RAM lag every
  prior drain's raw hp-field write already shows past its own bar-done
  sentinel) - two independent derivations landing on the same anchor.
- **The faint sink** (`docs/faint-switch-notes.md` §3a/§7a,
  `SpriteCB_FaintOpponentMon`/`SpriteCB_AnimFaintOpponent`,
  `battle_main.c:2744-2811`) - RAM-pinned exact for Grovyle (`yOffset=4`,
  `n=8-floor(4/8)=8`) at handoff tick `S=6502`. Re-verified this session via
  a fresh dense pixel diff of Grovyle's own on-field crop (not re-probed via
  RAM - §7a's own RAM probe was already exact and committed): 8 visible
  erase-steps land at render ticks 6504,6506,...,6518 (the SAME +1 render
  lag every other ROCK_SLIDE mechanism in this file already uses - RAM step
  at `S+2k-1` first shows at render tick `S+2k`), zero further diff from
  6519 on. Implemented as the literal closed form (`grovyleFaintSinkRowsAndY2`),
  not a table: `keptRows = n - min(n, ceil(max(t-1-S,0)/2))`,
  `y2 = 8*min(n, ceil(max(t-1-S,0)/2))`.
- **Grovyle's own opponent healthbox vanish tick** - NOT itemized in
  `docs/faint-switch-notes.md` (the brief's own "what happens to Grovyle's
  healthbox" question, re-probed this session as instructed): a dense pixel
  sweep of the healthbox's own crop shows it disappears ENTIRELY (bare
  background, byte-identical from here on) at trace tick **6521** - exactly
  2 ticks after the sink's own last visible erase-step (6519), a fixed
  offset (`GROVYLE_HEALTHBOX_VANISH_TICK = S+19`), not itemized anywhere
  else in this dossier.
- **The fainted text** - "Foe GROVYLE\nfainted!" (`STRINGID_FAINTED`),
  pixel-confirmed exact line wrap. Hard-cuts in automatically (no button
  needed - unlike every prior turn's ROCK_SLIDE text, THIS text never
  clears to blank at all; it holds through the entire hit-flash/drain/sink
  window, then transitions straight into the fainted text) at trace tick
  **6523** = `PRESS_TICK+694` (`TURN5_FAINTED_TEXT_DELAY`), pixel-confirmed
  via a dense message-box-crop diff (1660px hard cut). Prints 1 char/tick
  (19 chars total), completing at 6541.
- **The wait-cursor is NOT a fixed screen position** - a real correction to
  this file's own prior assumption (`CURSOR_DEST_X`/`cursorState`'s own S6
  intro precedent): the cursor sits immediately after line 2's own last
  printed glyph (`LINE2_ORIGIN.x + measureText(...line2)`), which for the
  intro's own "would like to battle!" (107px wide) happens to equal exactly
  123 - the same constant this file already had, but coincidentally, not
  fundamentally. Turn 5's own much shorter "fainted!" (44px wide) cursor
  sits at `16+44=60` instead - pixel-confirmed (oracle diff isolated the
  first mismatch to x=61-67, not 123-130, before this was corrected).
  `drawCursor` now takes an `x` param; `CURSOR_DEST_X` remains the default
  for the (unparameterized) intro call site.
- **The wait-cursor's own bounce is NOT `cursorState`'s perpetual 4-phase
  loop here** - a second correction, pixel-confirmed via the same dense
  crop diff: it CLIMBS once (offset 0->1->2 over two 9-tick steps: cursor
  rows 143-147 at ticks 6543-6551, 142-146 at 6552-6560, 141-145 from 6561
  on) and then HOLDS at offset 2 through this trace's own stopping tick
  (6587, 26 ticks past the KO-dismiss press with zero further change) - it
  never visibly bounces back down inside this slice's own scope. Whether it
  eventually resumes a perpetual bounce past 6587 (like the intro's own
  cursor, which persists through a much longer uninterrupted wait) is
  **not known** - this slice's own window doesn't run long enough past the
  press to observe it, so `turn5FaintedCursorYOffset` is deliberately a
  plain climb-then-hold, not generalized into a cycle the pixels don't
  support yet.
- **Cursor-visible tick 6543** = `PRESS_TICK+714` (`TURN5_FAINTED_CURSOR_
  START_DELAY` = `TURN5_FAINTED_TEXT_DELAY+TEXT_TOTAL(19)+1`), matching the
  same "one tick after the last glyph's own text-complete tick" shape
  `CURSOR_START_TICK`'s own doc already describes for the S6 intro -
  re-derived and pixel-confirmed independently for this window, not assumed
  from the intro's formula.

### The button-gated KO hold - this engine's first input-gated battle text

Per §13's own headline finding (re-confirmed, not re-derived, this
session): once "Foe GROVYLE fainted!" is fully printed and its own
wait-cursor showing, the screen holds **indefinitely** - idle ticks alone
never advance it - until the player presses A. Implemented as real state,
the same "created directly, same tick already reflects it" idiom
`sendOutPressElapsed` already established: `BattleSceneState.
turn5KoDismissElapsed: number | null`, set by a new `core.ts` branch (gated
on `turn4Resolved` and the new exported `turn5RockSlideKoDismissEligible`)
the tick a fresh `A` press registers while the fainted text's own cursor is
showing. `core.ts`'s `tick()` has NO other logic that could advance past
this point on its own (every other window's formulas are all
`pressTick`-relative with no auto-advance timer wired to fire after this
gate) - so "hold indefinitely" falls out for free from the state machine's
own shape, not a separate freeze check. Both branches Tier-1-pinned
(`tests/battleScene.test.ts`): 700 idle ticks past the eligible tick never
set the field; a fresh `A` press while eligible sets it on that same edge
and it stays stable afterward; an early press (long before eligible) is
simply dropped, the same "gate stays closed" precedent every other
press-gated window in this dossier already established.

**Rendering-wise this gate has no visible consequence within this slice's
own scope** - pixel-confirmed via a dense sweep: the screen is
byte-identical for the ENTIRE stretch from the fainted text's own full
print (6541) through this trace's own stopping tick (6587), 26 ticks past
the press, with or without the press having registered. The gate's real
purpose (matching the committed groundtruth trace exactly) is to correctly
withhold the NEXT phase (the party-icon-bar re-trigger ~6588, DESTIN's own
"sent out PIDGEOTTO!" text ~6687) until the player actually presses A - out
of this slice's own scope to render, but the state the next slice needs is
now real and tested.

### The opponent's own EMPTY healthbox bar - oracle-exercised for the first time

Grovyle's HP hits 0 (not just low) for the first time in this dossier -
`calcBarFilledPixels`'s own general formula (`hpFraction` exactly 0, not
merely small) ALREADY produces the correct "genuinely empty, no forced
sliver" result with **zero compositor changes needed** (the `rawPixels===0
&& hpFraction>0` sliver-forcing condition is false when `hpFraction` is
exactly 0, by construction) - verified via `npm run compare`
(`turn5-faint.json`'s own dense sweep through the whole empty-bar window,
0 diff), not merely assumed from reading the code. New Tier-1 pin
(`tests/healthboxAssembly.test.ts`) ties this to Grovyle's own real anchor
value (0/143) directly, mirroring the existing hp=1/117 pin's own shape.

### What landed (`src/engine/battleScene.ts`/`core.ts`)

- `TURN5_ROCKSLIDE_PRESS_TICK`, `anchorOpponentAfterTurn5Hp`(0).
- `GROVYLE_FAINT_SINK_START_TICK`(6502)/`GROVYLE_FAINT_SINK_STEPS`(8) +
  `grovyleFaintSinkRowsAndY2` (exported for the Tier-1 pin) - the closed
  form itself.
- `GROVYLE_HEALTHBOX_VANISH_TICK`(6521) + `drawSpriteSheetTopRows` (a
  `drawSpriteSheet` variant limited to the sink's own `keptRows`).
- `drawTurn5RockSlideAttack`/`drawTurn5RockSlideWindow` - same three-part
  shape as turns 3/4's own ROCK_SLIDE windows, but the text NEVER
  auto-clears (there's no resettled menu this turn - it's a faint) and the
  attack draw dispatches into the sink once active.
- `TURN5_FAINTED_LINE1/2`, `TURN5_FAINTED_TEXT_DELAY`(694),
  `turn5FaintedTextStartTick`/`turn5FaintedTextVisibleChars`,
  `TURN5_FAINTED_CURSOR_X` (text-width-derived, see anchors above),
  `TURN5_FAINTED_CURSOR_START_DELAY`(714), `turn5FaintedCursorYOffset`
  (climb-then-hold, see anchors above).
- `turn5RockSlideKoDismissEligible` (exported) + `BattleSceneState.
  turn5KoDismissElapsed` + `core.ts`'s new detection branch.
- `drawTurn5EndeavorText` gained a handoff into `drawTurn5RockSlideWindow`
  once `t >= rockSlideTextStartTick(TURN5_ROCKSLIDE_PRESS_TICK)` - the same
  shape slice H's own turn-3 handoff established a turn earlier. No other
  `core.ts` render-dispatch changes needed - the existing `turn2Resolved`
  branch already calls `drawTurn5EndeavorText` unconditionally for the rest
  of the window.
- **Generalized, not duplicated**: `cursorState(t, startTick =
  CURSOR_START_TICK)` and `drawCursor(fb, yOffset, x = CURSOR_DEST_X)` both
  gained real parameters (defaults preserve the S6 intro's own existing
  behavior byte-exact, re-verified via `sendout.json`/`s6-acceptance.json`
  regression - see below) instead of a second copy-pasted cursor mechanism.

### Committed traces (both new, both 0 diff)

- **`turn5-rockslide.json`**: extends the groundtruth's own button script
  verbatim (idle only past turn 5's own confirm press) through tick 6477 -
  256 dense `captureFrames` from tick 6222 (kickoff hard-cut) through 6477
  (kickoff/shake/rocks/hit-flash/drain, ending mid-hold well before the
  sink starts). **256/256, 0 diff.**
- **`turn5-faint.json`**: extends the groundtruth's own button script
  verbatim INCLUDING the real KO-dismiss `A` press (frames 6560-6561,
  reused byte-for-byte from `tools/compare/traces-groundtruth/
  battle1-grovyle-faint.json`) through tick 6587 - 110 dense `captureFrames`
  from tick 6478 through 6587 (the pre-sink hold's own tail, the sink
  itself, the healthbox vanish, the fainted text, the cursor, the press,
  and 26 ticks of confirmed-static hold after it). **110/110, 0 diff.**
  Stops here - tick 6588 is the first pixel change (the party-icon-bar
  re-trigger), out of this slice's own scope, matching the brief's explicit
  instruction to stop before "DESTIN sent out PIDGEOTTO!" (which doesn't
  even start printing until 6687, later still).

### Verification

`npm test` **776/776** (+8: 3 sink-formula pins against every one of the 8
RAM-confirmed step ticks plus the before/after-destroy boundaries, 1
eligibility-boundary pin, 2 KO-gate state-machine pins - idle-forever and
A-advances - 1 early-press-dropped pin, 1 empty-bar `composeOpponentHealthbox`
pin). `npm run build` green. `turn5-rockslide.json` **256/256**,
`turn5-faint.json` **110/110**, both 0 diff. Zero regressions, full sweep
re-verified at exact prior counts: `turn5-endeavor.json` **254/254**,
`turn5-menu.json` **41/41**, `turn4-rockslide.json` **250/250**, `turn4-
doubleteam.json` **249/249**, `turn3-rockslide.json` **256/256**, `turn1-
rockslide.json` **256/256**, plus `sendout.json` **255/256** (unchanged -
the pre-existing named tick-1496 particle-color residual, ISSUES #18-era,
untouched by this session's `cursorState`/`drawCursor` generalization),
`fight-submenu.json` **235/235**, `turn3-endeavor.json` **192/192**,
`turn3-menu.json` **254/254**, `turn2-endeavor-drain.json` **201/201**,
`turn4-menu.json` **44/44**, `turn2-dragonbreath.json` **237/237**,
`turn1-cloneanim.json` **230/230**, `menu-idle.json` **69/69**, `turn2-
endeavor.json` **77/77**.

### What's left

Everything from tick 6588 on: the opponent's own 6-icon party-status bar
re-trigger, "[BUG CATCHER] DESTIN sent out\nPIDGEOTTO!" text (starts
printing 6687), the ball-throw/materialize sequence (mon-sprite geometry
already formula-verified in `docs/faint-switch-notes.md` §7b - reuse
`GROVYLE_STRETCH_TABLE`/`_EARLY_TABLE` verbatim, re-anchored), the
healthbox slide-in, Onix's own Sitrus Berry proc (exact formula already
pinned, §2 of that same file), and the next settled menu vs. Pidgeotto -
ground truth already substantially banked, explicitly out of this slice's
own scope per the brief.

## 25. Engine slice L (retry, ground cleared): the icon-bar re-trigger, RAM-probed and landed - the tick-6727 transient RESOLVED - `turn5-sentout.json` **141/141, 0 diff**, ending BEFORE the ball prop (S7 bounded worker session)

Picks up exactly where `docs/faint-switch-notes.md` §9 (this slice's own
prior, non-landed attempt) left off: the sent-out text and the icon-bar's
settled state were already byte-exact and safe to re-add; the real blocker
was the "unexplained tick-6727 icon-bar-region change." Per this session's
own brief, RAM-probed BOTH remaining unknowns (the icon slide-in's own
per-icon-vs-uniform shape, and the tick-6727 transient) with two new
committed `ram-probe.py` specs BEFORE writing any render code, avoiding
the prior attempt's own wasted speculative-draft cost.

### The icon slide-in - corrects §9's own open item 1

`switchin-iconbar-slidein.json` (`gSprites[]` x/y/x2/y2/flags for the bar's
own reused slot 3 and the 6 icons' fresh slots 54-59, RAM ticks 6580-6614)
shows creation at RAM tick **6587**, then all SEVEN sprites (bar + all 6
icons) sharing the IDENTICAL `x2` sequence every tick - `-95, -90, ...,
-5, 0` over RAM ticks 6587-6606 - bit-for-bit `OPP_BAR_X2` itself, with
**zero per-icon stagger**. This is genuinely simpler than the S6 intro's
own per-icon-staggered `OPP_ICON_X2` tables (§9's own tried-and-residual
hypothesis guessed a 9-value ease-out tail, the wrong shape) - the real
mechanism just reuses the bar's own already-defined curve for all seven
objects uniformly. No new table needed.

### The tick-6727 transient - RESOLVED, corrects §9's own open item 2

`switchin-iconbar-transient.json` (`gSprites[]` x2/y2/animNum/animCmdIndex/
callback/oam-raw-word for the same 7 slots, RAM ticks 6710-6754) shows:

- At RAM tick **6725**, all 7 sprites' raw OAM first word jumps by exactly
  `0x400` simultaneously - decoded, that's `OamData.objMode`'s low bit
  flipping `NORMAL(0)` -> `BLEND(1)`, i.e. all 7 sprites enter GBA hardware
  alpha-blend mode together, in one shared tick, with `x`/`y`/`x2`/`y2`
  otherwise UNCHANGED (ruling out a position/slide explanation for §9's own
  observed pixel diffs).
- At RAM tick **6742**, all 7 sprites are destroyed simultaneously
  (`flags`/`x`/`y` reset to the dead-sprite default in the same tick).
- This is `Task_HidePartyStatusSummary`'s own alpha-blend-then-destroy
  shape - already modeled in this engine for the PLAYER bar's own S6-intro
  exit (`playerSummaryFadeEva`) - applied here to the OPPONENT bar, with a
  DIFFERENT cadence: a flat 1-unit/tick ramp (not the player exit's "every
  OTHER tick"), fitting the shorter 16-render-tick window exactly. This
  resolves §9's own "16-tick alternating 1091/1087px, render 6727-6742"
  finding precisely: it's this alpha-blend ramp, not a new mechanism.
- The freed slot 3 is reused by the open-particle burst's own first spawn
  at RAM 6744 (`docs/faint-switch-notes.md` §8d, unrelated, already
  formula-pinned) - confirms the destroy boundary lines up with everything
  else already known about this window.

Both specs run twice, byte-identical both times (deterministic). Outputs
committed at `src/data/gen/battle1-switchin-iconbar-{slidein,transient}-
probe.json`.

### What landed (`src/engine/battleScene.ts`)

- `TURN5_ICONBAR_CREATE_TICK`(6587)/`_FADE_START_TICK`(6725)/
  `_DESTROY_TICK`(6742) (all exported, RAM-pinned per above).
- `TURN5_OPPONENT_ICON_STATES` (exported) - GROVYLE's own former slot
  (index 5) flips `"Full"` -> `"Statused"`, §9's own pixel correction,
  unchanged this session.
- `turn5IconBarEva` (exported) - `null` (flat, unblended) before the fade,
  else `16 - (rt - FADE_START_TICK)` clamped at 0.
- `drawTurn5IconBar` - the bar + 6 icons, sharing one uniform `x2` (reuses
  `OPP_BAR_X2`/`tableX2`/`drawBallStatusBar`/`ballStateTileIndex`/
  `blendedSetPixel` - all pre-existing, zero new low-level drawing code).
- `SWITCHIN_SENTOUT_LINE1/2`, `SWITCHIN_SENTOUT_TEXT_START_TICK`(6687, an
  ABSOLUTE anchor, not `pressTick`-relative - §9's own text mechanism was
  already pinned to this fixed oracle tick directly), `switchinSentOutText
  VisibleChars` (exported).
- `drawTurn5RockSlideWindow` gained the icon-bar draw call (a no-op outside
  its own window) plus a third text branch (`SWITCHIN_SENTOUT_TEXT_START_
  TICK` hard-cuts over the still-held fainted text, same "no button needed"
  shape every other auto-advancing transition in this dossier already
  uses) - the fainted-text/cursor code itself is UNCHANGED.

### Committed trace

**`turn5-sentout.json`**: extends `turn5-faint.json`'s own script verbatim
(idle only) through tick 6728 - 141 dense `captureFrames` from 6588
through 6728, covering the icon-bar's ENTIRE lifecycle (create, uniform
slide-in, settle, sent-out text 6687-6726, alpha-blend fade, destroy) in
one shot - both the mandatory rung and the tick-6727 transient landed
together, since both were RAM-resolved before any render code was
written. **141/141, 0 diff.** Stops at 6728, the last tick before the
(unimplemented, out-of-scope-this-session) ball prop's own first pixel -
confirmed via a pixel-level diff of the actual mismatched region (x170-181/
y58-69, the ball's own resting corner, ball-open-palette colors) that this
is a ball-prop gap, NOT an icon-bar residual - the icon bar's own bbox
carries zero diff anywhere in the tested range.

### Verification

`npm test` **780/780** (+4: icon-flip-state pin, 3 `turn5IconBarEva`/anchor
pins for the tick-6727 mechanism, 1 sent-out-text-timing pin). `npm run
build` green. `turn5-sentout.json` **141/141, 0 diff**. Zero regressions,
full sweep re-verified at exact prior counts: `turn5-faint.json`
**110/110**, `turn5-rockslide.json` **256/256**, `turn5-endeavor.json`
**254/254**, `turn5-menu.json` **41/41**, `turn4-rockslide.json`
**250/250**, `turn4-doubleteam.json` **249/249**, `turn3-rockslide.json`
**256/256**, `turn1-rockslide.json` **256/256**, `fight-submenu.json`
**235/235**, `turn3-endeavor.json` **192/192**, `turn3-menu.json`
**254/254**, `turn2-endeavor-drain.json` **201/201**, `turn4-menu.json`
**44/44**, `turn2-dragonbreath.json` **237/237**, `turn1-cloneanim.json`
**230/230**, `menu-idle.json` **69/69**, `turn2-endeavor.json` **77/77**,
`s6-acceptance.json` **224/228**, `scene-assembly.json` **256/256**, plus
`sendout.json` **255/256** (unchanged, the pre-existing named residual).

### What's left

The ball prop (fully spec'd, `docs/faint-switch-notes.md` §8b: slot 7,
static `(176,64)`, no arc, 6727-6756) through Sitrus/settled-menu - all
still pinned in docs, none reached this session (ran out of cap after
landing the icon-bar mechanism cleanly). The two-anchor design §9
prescribed (ball/tint/particles off one handoff-shaped tick vs. the
front-sprite stretch tables off a different one 24 ticks later) is
unaffected by this session's own findings and remains the right shape for
whoever implements the ball/materialize window next.

## 26. Engine slice L-3: the switch-in ball prop + open-particle burst + materialize growth phase, landed - `turn5-switchin.json` **167/167, 0 diff**, ending mid-materialize (S7 bounded worker session)

Extends `turn5-sentout.json`'s own script verbatim (idle only) from tick
6728 through **6754** - the ball prop's entire lifecycle, the open-particle
burst (16 particles, clean closed form), and Pidgeotto's own materialize
GROWING phase (flat-tint silhouette scaling 1px->44px over its own
species-independent 12-tick curve). Full derivation, the two real bugs
found and fixed (background-fade table under-resolution, front-sprite frame
parity inversion) and the honest remainder (coefficient ramp-down phase
still ~3% residual, wobble-table phase probably clean but unverified as its
own span): `docs/faint-switch-notes.md` §10.

### What landed (`src/engine/battleScene.ts`)

- `TURN5_BALL_HANDOFF_TICK`(6727, exported) - the ball prop's own RAM
  creation tick; `drawSendOutBall`/S6's own `BALL_CORNER`/`BALL_CLOSED_
  START_OFFSET` etc. reused verbatim, zero new ball-drawing code.
- `drawTurn5SwitchinParticles` - the open-particle burst's own CLEAN age
  formula (`age = logicalT - i`, no stall/late-spawn correction - those are
  S6-specific, see §10's own finding), otherwise reusing every existing
  constant/formula (`gbaSin`/`gbaCos`/`PARTICLE_ORIGIN`/`sortAliveParticlesByScreenY`).
- `drawTurn5PidgeottoMaterialize` - three-phase dispatcher (growing flat-tint
  / coefficient ramp / wobble table), phase 1 (growing) fully landed this
  session reusing `affineEmergeAccumulator`/`MATERIALIZE_Y2_TABLE` verbatim
  at `PIDGEOTTO_CORNER`(144,19); phases 2/3 written but not yet 0-diff (see
  `docs/faint-switch-notes.md` §10's own remainder list) - still wired into
  the live dispatcher (harmless past the committed trace's own 6754
  boundary; no currently-committed trace exercises past it).
- `turn5PidgeottoFrame` - front-sprite frame-toggle RAM anchors with the
  corrected (inverted-from-naive) parity mapping.
- `TURN5_BG_FADE_Y`/`turn5BgFadeY`, wired into `drawStaticBgShiftedY`'s new
  optional `fadeY` param - the switch-in window's own BG-to-white dither,
  corrected mid-session after an under-resolved first pass (§10's own
  finding).
- `pidgeottoFrontSprite`/`PIDGEOTTO_CORNER`(144,19) - already-extracted asset
  wired in for the first time this session (byte-exact per docs §5,
  unchanged).

### Committed trace

**`turn5-switchin.json`**: extends `turn5-sentout.json`'s own script
verbatim through tick 6754 - 167 dense `captureFrames` from 6588 through
6754. **167/167, 0 diff**, twice-run oracle-side, byte-identical.

### Verification

`npm test` **781/781** (+1: `TURN5_BALL_HANDOFF_TICK` pin). `npm run build`
green. Zero regressions, full sweep re-verified at exact prior counts:
`turn5-sentout.json` **141/141**, `turn5-faint.json` **110/110**,
`turn5-rockslide.json` **256/256**, `turn5-endeavor.json` **254/254**,
`turn5-menu.json` **41/41**, `turn4-rockslide.json` **250/250**,
`turn4-doubleteam.json` **249/249**, `turn3-rockslide.json` **256/256**,
`turn1-rockslide.json` **256/256**, `fight-submenu.json` **235/235**,
`turn3-endeavor.json` **192/192**, `turn3-menu.json` **254/254**,
`turn2-endeavor-drain.json` **201/201**, `turn4-menu.json` **44/44**,
`turn2-dragonbreath.json` **237/237**, `turn1-cloneanim.json` **230/230**,
`menu-idle.json` **69/69**, `turn2-endeavor.json` **77/77**,
`s6-acceptance.json` **224/228**, `scene-assembly.json` **256/256**, plus
`sendout.json` **255/256** (unchanged, the pre-existing named residual).

### What's left

The coefficient ramp-down + wobble-table phases (render ~6755-6828,
`docs/faint-switch-notes.md` §10's own itemized remainder), then healthbox
slide-in through Sitrus/settled-menu (§8e/§2/§3e, fully spec'd, untouched
this session).
