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
