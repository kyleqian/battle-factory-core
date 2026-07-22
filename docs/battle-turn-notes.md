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
| "Player defeated BUG CATCHER DESTIN!" | `A` dismiss | `gBattleOutcome` 0→**1** ~~the instant this screen appears~~ **CORRECTED (turn-17 scout, 2026-07-21, tick-exact): the flip is at tick 22818 — 16 ticks after the "fainted!" dismiss press (22802), while the OLD text is still on screen, ~27 ticks BEFORE "Player defeated" starts typing** (`docs/turn17-notes.md` §2/§4, sha-cited) — **this is the actual WIN flag**, not a later transition; DESTIN's trainer class (BUG CATCHER) was already known from §13 |
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

**Refined (post-WIN scout, 2026-07-21, `docs/postwin-notes.md`):** the
sensitive window is now BISECTED, not "somewhere in the post-victory
tail" — `gMain.inBattle` clears and the per-VBlank advance resumes at
tick **23645** (43 ticks after the loss-quote dismiss, mid-fade), and
opponent-2's `rentalMons[3..5]` identity is already WRITTEN by ticks
**23700-23750** — well before the GO ON menu or scouting text. Only
idle-timing inside 23645-23750 can move battle 2's opponent.

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

## 27. Engine slice N rung (a): turn 6's FIGHT-submenu reopen + move confirm, landed green - `turn6-menu.json` **33/33, 0 diff**, ending BEFORE the FEATHER_DANCE kickoff text (S7 bounded worker session, hard 60-minute cap)

Implements rung (a) only of `docs/turn6-notes.md`'s own ladder: the FIGHT
submenu reopen (real press tick 7313) + move confirm (7345, cursor already
at 0 - ROCK_SLIDE, no nav needed, same "no nav needed since turn 3" finding
every reopen since has shown) through the post-confirm hold, stopping at
tick 7350, safely before the FEATHER_DANCE kickoff text starts (~7357-7358,
turn6-notes.md §5). Rungs (b)/(c)/(d) - the FEATHER_DANCE animation (the
session's own designated centerpiece), the ATK-fall message, and Onix's
ROCK_SLIDE - were **not attempted this session**, purely a time-budget
call (a hard 60-minute worker cap, not a resistance finding): rung (a)
alone, done to this dossier's own verification standard, consumed the full
session once compare-driven bisection (see the residuals below) is
included. Per the brief's own framing (and every prior turn-boundary
slice's precedent, §19-24): **parameterize, don't rebuild** - Onix's own
sprite/healthbox machinery (`drawTurn5RockSlideAttack`/`drawTurn5IconBar`/
`drawTurn5SwitchinSprite`/`turn5SitrusOnixHp`/`turn5SitrusResettledBounceTick`)
is reused with ZERO formula changes, factored out into a new shared
`drawTurn6FieldBase` (previously inlined only in `drawTurn5RockSlideWindow`'s
own tail) rather than re-derived.

### Why turn 6 needed a NEW base function, not just another `turnNResolved` tier

Every earlier turn-boundary reopen (slices F/I/J, §19/22/23) threaded one
more `turnNResolved` boolean through the SAME Grovyle-shaped helper chain
(`drawMenuIdleBaseWithOpponentHp`/`drawActionMenuIdleContent`/
`drawFightSubmenuChrome`), because the opponent was Grovyle in every case.
Turn 6 is the first FIGHT-submenu reopen where the opponent itself changed
(Grovyle fainted, Pidgeotto switched in) - `menuIdleBase`'s own static
harvest bakes in GROVYLE's silhouette in its top 2/3, wrong for this turn no
matter how many boolean tiers are threaded through it. Instead, `turn5Resolved`
short-circuits `drawFightSubmenuWindow` at its very top into a dedicated
`drawTurn6FightSubmenuWindow`, built from the SAME live primitives
`drawTurn5RockSlideWindow`'s own settled tail already uses (factored into
`drawTurn6FieldBase`, called from both places, zero behavior change -
re-verified via the full regression sweep below).

### Two real bugs found via compare-driven bisection, both fixed (not curve-fit)

1. **The window's own right-edge border strip (x=232-239, the ~8px margin
   `fightSubmenuWindow`'s own box (231px wide) doesn't cover) was NOT filled
   under the reopened submenu** - `drawTileBg` alone leaves it in whatever
   state the field-base draw left it in; turns 1-5 never surfaced this
   because `menuIdleBase`'s own FULL-SCREEN static harvest (used unconditionally
   under `drawFightSubmenuChrome` for every earlier turn) already bakes that
   border in, so it was never separately validated. Bisected via a scratch
   probe trace + `npm run compare`'s own diff crop (a red capsule bulge where
   the oracle shows a clean gray/purple corner, isolated to exactly that
   8px strip, full box height). **Fix**: call `drawTurn5SitrusSettledMenuChrome`
   (the same y>=112 `menuIdleBase` crop the idle path already uses) BEFORE
   `drawFightSubmenuChrome`, so the border fills first and the submenu's own
   opaque box overwrites just its interior on top. Closed the entire 320px
   steady-state residual across every open/confirmed tick.
2. **A chained-trace stitching bug, not an engine bug**: the first constructed
   probe trace (extending `turn5-sitrus-d.json`'s own script, which itself
   idles 8 frames PAST its last captured tick 7312, with `battle1-turn6-dense.json`'s
   own segments[68:], which ALREADY assumes a fresh start at 7312) silently
   inserted 8 redundant idle frames, shifting the reopen/confirm press ticks
   to 7321/7353 in the constructed trace's own frame-index space instead of
   the dossier's cited 7313/7345. Pixels still matched (oracle and app both
   replay the same script, so both shift consistently) but the citations
   would have been wrong. **Fix**: trim `turn5-sitrus-d.json`'s own trailing
   idle segment by exactly the 8-frame overshoot before appending the
   groundtruth's press segments - `turn6-menu.json`'s own committed script
   now lands the reopen/confirm at the dossier's own cited absolute ticks
   (7313/7345) exactly.

### Named residuals, excluded from `captureFrames` per this dossier's own "characterize precisely, never commit red" rule

Both classes match this dossier's own repeatedly-documented "hardware quirk
at a bounce extremum" signature (isolated 1-3-tick spikes, ~2-4% of frame,
Onix-silhouette-region-only, both neighbors exact) already catalogued and
several times later RESOLVED at ticks 3337/3465/3721/3879/3888/4934/5927 -
not chased further this session (budget), flagged precisely for a future
resolution pass the same way those were:

- **7315-7316** (the open-DMA-wait hold, 1579px/4.11%): isolated blip inside
  an otherwise-exact 7307-7323 span (7314 and 7317 both exact).
- **7324-7325, 7333-7334, 7342-7343** (769px/2.00% each, periodic at a fixed
  9-tick spacing): inside the settled-submenu dwell, before the confirm -
  same periodic-bounce-extremum shape as ticks 3337/3465/3721.
- **7348-7350** (769px/2.00%, steady not transient): the post-confirm hold,
  past `FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY`. Grid-searched the frozen bounce
  tick directly (`turn6KickoffBounceTick`, same "freeze past the A-press
  hand-off" shape `turnKickoffBounceTick`/`turn5KickoffBounceTick` already
  establish) across `d` in `[-8..8]` relative to the confirm press: the
  769px residual is FLAT across the entire range, proving it is NOT the
  healthbox bounce (`region B`, the only thing `turn6KickoffBounceTick`
  controls) - it must be the on-field Onix SPRITE's own bounce (`region A`,
  inside `drawTurn5RockSlideAttack`, not parameterized by this slice) still
  using a live, un-frozen tick past the hand-off. A future session should
  RAM-probe `gSprites[onixSlot].y2`'s own real bounce-task state at ticks
  7348-7350 directly (the same "pointer-chase the real bouncer sprite" fix
  that already resolved the 3879/3888/3958-3993 family) before attempting
  another frozen-tick guess.

### Committed trace and Tier-1 pins

`tools/compare/traces/turn6-menu.json` - extends `turn5-sitrus-d.json`'s own
script (trimmed 8 frames, see above) with `battle1-turn6-dense.json`'s own
reopen (`A`, 7312-7314) + confirm (`A`, 7344-7346) presses, `captureFrames`
7307-7350 minus the 11 named residual ticks above - **33/33, 0 diff**.
`tests/fightSubmenu.test.ts` (+5): the reopen/confirm replay pin (openElapsed
7313, confirmElapsed 7345, cursor 0, `turn5Resolved` true), the reopen-gate-
still-closed pin, the gate-opens-exactly-at-the-delay pin, the PP-6/10 pin
(`currentPPForActiveMon`'s new `turn5Resolved` param, a 4th independent
slot-0 decrement), and a determinism/replay smoke check.

### What's left

Rungs (b)/(c)/(d) of `docs/turn6-notes.md`'s own ladder, entirely untouched:
the FEATHER_DANCE kickoff text + its feather/starburst attack animation
(~7358-7658, the session's own designated centerpiece - needs gfx
extraction from `Move_FEATHER_DANCE`'s own `ANIM_TAG` plus a fresh
sprite-timeline RAM probe, genuinely new work, not parameterizable from
anything already built), the ATK-fall message window (7659-7684, holds
through 7763), and Onix's own ROCK_SLIDE (7765-8122, parameterizable from
turn 1/3/4/5's own unchanged mechanism per this file's own precedent, but
untouched this session). The three named bounce-extremum residuals above
are a clean, precisely-scoped follow-up independent of any of that.

### Verification

`npm test` **818/818** (+5). `npm run build` green. `turn6-menu.json`
**33/33, 0 diff**. Zero regressions: `turn5-sitrus-c.json` **150/150**,
`turn5-sitrus-d.json` **133/133**, `turn3-rockslide.json` **256/256**,
`turn5-rockslide.json` **256/256**, `turn5-menu.json` **42/42**, `turn4-
menu.json` **44/44**, `turn5-endeavor.json` **254/254**.

## 28. Engine slice N rung (b), reduced scope: FEATHER_DANCE's kickoff text + settled hold, landed - `turn6-featherdance.json` **90/90, 0 diff**; the feather/starburst sprite animation itself deferred, with concrete RAM ground truth banked (S7 bounded worker session, hard 60-minute cap)

Rung (b) was scoped by the brief as "Foe PIDGEOTTO used FEATHERDANCE!"'s
kickoff typing + settled hold (~7358-7388) **and** the feather/starburst
attack animation that plays over the hold (~7405-7658, docs/turn6-notes.md
§5/§6) - the session's own designated centerpiece. This session lands the
first half only: the kickoff text (typing + settled hold) through the tick
immediately before the animation's own first RAM-confirmed pixel change
(7405). The animation itself - 8 independently-rotating affine sprites
(`gFallingFeatherSpriteTemplate`, `AnimFallingFeather`/`_Step`,
`src/battle_anim_flying.c:572-`) - was investigated (RAM-probed, gfx
identified) but **not implemented**, per the brief's own explicit
permission ("if the feather sprites resist wholesale, stop and document
rather than shipping a half-fit"): this is genuinely new rendering work
(a rotating-matrix affine sprite renderer this codebase has no precedent
for - the existing `drawSpriteSheetAffineTinted`/`drawSpriteSheetAffineRotate`
helpers only ever handle a single uniform scale or a single externally-
supplied matrix, not 8 independently-animated per-tick rotation matrices
driven by a sine-table phase accumulator), and a bounded attempt this
session would not have reached this dossier's own 0-diff/RAM-verified
standard.

### A real bug found and fixed along the way: rung (a)'s own named 7348-7350 residual

Extending the captured window past rung (a)'s own 7350 cutoff immediately
exposed rung (a)'s own named "region A" residual (battle-turn-notes.md §27)
across EVERY subsequent tick, not just the 3 it had captured - 769px flat,
same shape, for the entire post-confirm hold. RAM-probed fresh this session
(`gSprites[gBattlerSpriteIds[0]]`/`gSprites[gHealthboxSpriteIds[0]]`'s own
`y2`, both flat **0** for ticks 7347 onward - a genuine bounce-task reset,
not a mid-cycle pause): `menuIdleBounce(turn5SitrusResettledBounceTick(t))`
evaluated at rung (a)'s own frozen anchor (`pressTick`, 7345) gives
`{onixY2: 1, healthboxY2: 0}` - region B matched by coincidence, region A
did not, and rung (a) never isolated which region caused its own named
residual (it just excluded the 3 ticks it had captured). Two fixes, both
verified via the regression sweep below:

1. **`drawTurn5RockSlideAttack` never took a `bounceTick` parameter** - its
   own on-field Onix sprite render always used live `t` for region A's
   bounce, even when called from a context (`drawTurn6FieldBase`) that
   passes a FROZEN tick for region B. Added `bounceTick: number = t`
   (default preserves every pre-existing caller's behavior byte-for-byte)
   and threaded it into the one place that reads `menuIdleBounce`.
2. **The frozen anchor itself was wrong** - `turn6KickoffBounceTick`'s
   `pressTick` anchor lands on a `{onixY2:1, healthboxY2:0}` point in
   `menuIdleBounce`'s own cycle, not the real `{0,0}` RAM shows. Scanned
   the cycle directly (`tools/compare/scratch/scan-bounce.mjs`, not
   committed - trivial one-off) for a `{0,0}` plateau near `pressTick`:
   7333-7341 and 7370-7378 both qualify. `pressTick -
   TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET` (4) lands in the first - correct
   AND covers rung (a)'s own previously-excluded 7348-7350 (now includable,
   left in rung (a)'s own committed `turn6-menu.json` as an option for a
   future docs-only cleanup pass, not touched this session to avoid
   churning an already-shipped file under time pressure).

### The kickoff text itself

`turn6FeatherDanceTextStartTick(pressTick) = pressTick + 13` (7358,
oracle-confirmed this session against a fresh `bin/oracle run` of
`turn6-menu.json`'s own script with `captureFrames` 7345-7395 - the
post-confirm hold sha `b0b3f93f96f2` stays flat through 7357, first
changing tick is 7358) - **not** `turnKickoffTextStartTick`'s generic
`pressTick+10`, nor `turn2KickoffTextStartTick`'s reopened-submenu
`pressTick+9`: turn 6 dispatches through its own dedicated function
(rung (a), §27), not the Grovyle-shaped `turn2KickoffText` chain, so
there's no a priori reason to expect either constant, and neither
matched. Same "1 tick per char, clamped at the total" mechanism as every
other kickoff message in this dossier. "Foe PIDGEOTTO used" (19 chars) +
"FEATHERDANCE!" (13 chars) = 32 total; the message settles flat
(`ae11c7f00fbd`) at tick 7388, matching the brief's own cited settle tick
exactly.

### The settled hold's real extent

RAM/pixel-confirmed this session (`bin/oracle run`, captureFrames
7388-7459): the kickoff message holds **completely flat** 7388-7404, and
the FIRST pixel change (the feather animation's own opening frame) is
tick **7405** - earlier than the brief's own approximate "visible from
~7450" (that estimate was for when the feathers become clearly visible to
a human eye reading a PNG, not the first RAM-driven pixel change; the true
first divergence is 51 ticks earlier). `turn6-featherdance.json`'s own
`captureFrames` stop at 7404, the last tick provably before the animation
begins.

### Feather sprite ground truth banked for the next session (not implemented)

- **Script** (`data/battle_anim_scripts.s:3975-3995`, `Move_FEATHER_DANCE`):
  loads `ANIM_TAG_WHITE_FEATHER`, plays `SE_M_PETAL_DANCE`, then spawns 8
  `gFallingFeatherSpriteTemplate` sprites in groups of 1/2/2/2/1 with a
  fixed delay between groups.
- **RAM-confirmed spawn timeline** (`gSprites[]`, matched by `.template`
  pointer `0x08596388`, fresh probe this session): group ticks **7404
  (1 sprite, slot 3), 7412 (2, slots 4/7), 7420 (2, slots 8/9), 7428 (2,
  slots 10/11), 7436 (1, slot 12)** - 8 ticks apart per group, matching the
  script's own group structure exactly (confirms the script's "delay 6"
  unit = 8 real ticks in this build, not a 1:1 mapping - not cross-checked
  against another delay-6 script this session). All 8 spawn at the
  identical initial position **(x=72, y=64)** - the per-sprite variation is
  in `gBattleAnimArgs[2]` (the rotation phase angle, `data->unk2`), not the
  spawn coordinate.
- **Rendering primitive needed, genuinely new**: `AnimFallingFeather`/
  `_Step` (`src/battle_anim_flying.c:572-`) writes a full rotation+scale
  matrix into `gOamMatrices[matrixNum]` every step, driven by a sine-table
  phase accumulator (`data->unk2`) independently per sprite, with `hFlip`/
  OAM-priority toggling on top - not a uniform-scale-only affine (this
  codebase's existing `drawSpriteSheetAffineTinted`/
  `drawSpriteSheetAffineRotate` helpers, built for the materialize/Sitrus-
  rotate effects) and not a plain-translate sprite (the existing
  `gFallingRockSpriteTemplate` ROCK_SLIDE renderer, `AffineOff`). A future
  session should: (1) build a generic 2x2-matrix affine sprite blit
  (nearest-neighbor, matching GBA OBJ hardware - `ConvertScaleParam`'s
  inverse-transform sampling convention this codebase already follows for
  the existing affine helpers), (2) RAM-probe `gOamMatrices[matrixNum]`'s
  own `{a,b,c,d}` and each sprite's `x2`/`y2`/`hFlip`/priority per-tick
  across the full 7405-7658 window (only the spawn moment was probed this
  session), (3) extract `ANIM_TAG_WHITE_FEATHER`'s gfx/palette via
  `tools/extract/extract-battle-move-anim-assets.ts`'s own convention
  (not attempted this session - no `src/assets/gen/` output exists yet
  for this tag).

### Committed trace and Tier-1 pins

`tools/compare/traces/turn6-featherdance.json` - **same script as
`turn6-menu.json` verbatim, zero segment changes** (confirmed via
`battle1-turn6-dense.json`'s own segments: zero button presses occur
between the turn-6 confirm and turn 7's own reopen at 8346, so
`turn6-menu.json`'s already-committed 1000-frame idle tail already covers
this entire window - no stitching needed, sidestepping the PAPERCUTS.md
chained-trace-stitching gotcha entirely). `captureFrames` extended to
7307-7404, still minus the 4 pre-confirm residual pairs named in §27
(7315-7316/7324-7325/7333-7334/7342-7343 - unrelated mechanism, untouched)
- **90/90, 0 diff**. `tests/fightSubmenu.test.ts` (+3): the text-timing
pin (start tick 7358, 1-char/tick, clamped at 32), the bounce-freeze-fix
pin (both regions land on `menuIdleBounce`'s `{0,0}` plateau, with an
explicit regression-proof of the OLD wrong anchor), and a boundary pin
(`turn6-featherdance.json`'s own `captureFrames` cap at 7404, so a future
session's animation work can't silently regress this session's own
coverage without updating this test too).

### What's left

The feather/starburst animation itself (7405-7658) - genuinely new affine-
sprite rendering, sketched above, next session's own designated work. The
ATK-fall message (rung (c), 7659-7684) and Onix's ROCK_SLIDE (rung (d),
parameterizable from turns 1/3/4/5) remain entirely untouched, as does
rung (a)'s own now-fixable-but-unfixed `turn6-menu.json` cleanup (see the
bug-fix section above) and its three OTHER named bounce-extremum residuals
(pre-confirm, unrelated mechanism).

### Verification

`npm test` **821/821** (+3). `npm run build` green. `turn6-featherdance.json`
**90/90, 0 diff**. Zero regressions: `turn6-menu.json` **33/33**,
`turn5-sitrus-c.json` **150/150**, `turn5-sitrus-d.json` **133/133**,
`turn3-rockslide.json` **256/256**, `turn5-rockslide.json` **256/256**,
`turn5-menu.json` **42/42**, `turn4-menu.json` **44/44**, `turn5-endeavor.json`
**254/254**, `turn1-cloneanim.json` **230/230**.

## 29. Engine slice N-3, reduced scope: FEATHER_DANCE's feather sprites landed via a RAM-table renderer (not a from-scratch port), `turn6-feathers.json` **106/106, 0 diff** covering 7307-7420 (16 new ticks past rung (b)'s 7404 cutoff); the fuller 7421-7658 window resists with a precisely characterized small residual (S7 bounded worker session, hard 60-minute cap)

All four rungs of the brief's own ladder were attempted; (a)/(b)/(c) landed
in full, (d) landed as an honest reduced-scope prefix per the brief's own
"characterize precisely, never commit red" fallback.

### Rung (a): `ANIM_TAG_WHITE_FEATHER` gfx extraction - landed in full

`white_feather.png` (32x64, 2 stacked 32x32 frames - tile offset 0/16 per
`sAnim_FallingFeather_0`/`_1`) extracted into
`src/assets/gen/battle-anim-white-feather.json` via
`extract-battle-move-anim-assets.ts`'s existing 2-frame-stacked convention
(`extract-battle-mon-pics.ts`'s `loadAnimFrame2`, reimplemented inline).
Byte-exact verified against the source PNG (both frames, all tiles, a
throwaway python cross-check - not committed).

### Rung (b): the full 7404-7658 RAM probe - landed in full, one new finding

`tools/probe/dump-feather-dance-sprites.py` + `tools/probe/specs/
turn6-feathers.json` (the trace's own `segments`, reused verbatim - no
stitching) probed all 8 `gFallingFeatherSpriteTemplate` sprites (RAM-
confirmed slots 3/4/7/8/9/10/11/12, template ptr `0x08596388` per-record
cross-checked) across every tick, into `src/data/gen/
turn6-feather-sprites-probe.json` (2040 records: 255 ticks x 8 sprites).
Twice-run spot check (7404-7440) byte-identical. **New finding**: all 8
sprites spawn 7404/7412/7420/7428/7436 (matching §28's group timing
exactly) and fully DESPAWN by tick 7525-7558 (`y>=112`, the real
`unkE_1` destroy threshold - RAM-confirmed `y2` is always 0 for this
mechanism, so the check collapses to plain `y>=112`) - the back half of
the brief's own 7405-7658 window (7559-7658, 100 ticks) has ZERO live
feather sprites, just the settled kickoff-text hold continuing under
some OTHER, still-unmodeled visual (see "What's left" below).

### Rung (c): the generic affine blit primitive - already existed, newly pinned against this mechanism's own real data

`drawSpriteSheetAffineRotate` (built in S7 slice M-3 for Onix's own Sitrus
rotation) turned out to ALREADY be the "generic 2x2-matrix affine sprite
blit" the brief asked for - it already takes any `{a,b,c,d}` + a center
position, with no assumption of a single caller. What it lacked: a pin
using this mechanism's OWN real RAM-probed matrix, and a MULTI-TILE
fixture (the existing M-3 tests only ever exercise a single 8x8 tile; the
feather sheet is 2x2 tiles, 32x32). Added both in one test using tick
7404 slot 3's real matrix (`a=225,b=-120,c=120,d=225`) against a hand-
solved 2x2-tile fixture with markers in different tiles.

### Rung (d): reduced scope - a RAM-table renderer, not the from-scratch algorithmic port the brief anticipated

**The algorithmic port was attempted first and abandoned mid-session, for
a documented reason.** `AnimFallingFeather`/`_Step` (`battle_anim_flying.c:
572-893`) was transcribed line-by-line into `simulateFeatherSprite`
(including the quadrant-transition state machine's own asymmetric quirk at
`case 3` - see the source's own "casts to u8 here are necessary for
matching" comment) and validated against the fresh RAM probe. The phase
accumulator (`unk2`, `x2`) matched the probe EXACTLY - `phase(f) = initialPhase
+ 2*f` reproduced 20+ consecutive `x2` values with zero mismatches,
including through several sine-plateau steps, ruling out a coincidental
fit. But the Y accumulator (`unk8 += 104` each tick) and the `gOamMatrices`
write did NOT reproduce the probe tick-for-tick - a brute-force search over
every candidate per-tick increment `K` for `unk8` found NONE that fit
better than 156/255 mismatches, and the real matrix visibly LAGS the
sprite's own `x2` field by several ticks in a pattern that isn't a
constant offset (RAM shows `gOamMatrices` holding its OLD value across up
to 4 ticks where `x2` has already moved on, then jumping - not a simple
N-tick delay). This smells like a buffering/refresh detail in how
`gOamMatrices` actually gets applied to OAM that isn't visible from the
callback's own source alone (or a decompilation subtlety this session
didn't fully untangle) - flagged here for a future session rather than
shipped as a guessed-at, unverified port.

**Pivoted to a RAM-table renderer instead** (`src/engine/featherDance.ts`):
`turn6FeatherSprites(t)` looks up the tick directly in the committed probe
JSON (twice-run byte-identical, i.e. real hardware state, not a curve-fit -
same spirit as this codebase's other RAM-anchored tables, e.g.
`GROVYLE_STRETCH_TABLE`). The genuinely-new PIECES this rung still
contributes: the render wiring itself (8 concurrent affine draws/tick via
the shared primitive) and two bisected facts, both oracle-verified:

1. **A uniform +1 RAM-to-render lag** (`FEATHER_RENDER_LAG`), same class as
   most mechanisms in this dossier - found by testing lag -2..2 against a
   5-frame quick-compare scratch trace; lag 0 gave 625-958px/tick, lag +1
   gave 46-229px/tick, confirming the class without yet fixing everything.
2. **Z-order against Onix's own on-field sprite is priority-split, not
   uniform**: the brief's own render-lag mandate warns not to assume a
   neighboring mechanism's lag/compositing class, and this one needed its
   own bisection. Drawing every feather in front of Onix (or every one
   behind) both left a real ~700px/1.8%-per-tick residual concentrated
   exactly on the Onix-silhouette overlap region (crop-verified: the app's
   feather swoosh painted OVER Onix's foreleg where the oracle shows it
   occluded, or vice versa). Splitting by the sprite's own RAM `priority`
   (`GetBattlerSpriteBGPriority(battler)+1` while `unk2` is in [64,191],
   base otherwise - Onix's own priority is the same base value) - drawing
   the `+1` ("far side of the flap") group BEHIND Onix and the base-
   priority group IN FRONT - closed the overlap-region residual to single
   digits per tick. Wired via a new `beforeMonSprite` hook threaded through
   `drawTurn5RockSlideAttack`/`drawTurn6FieldBase` (default no-op, every
   pre-existing caller unaffected).

**A real bug caught by the new Tier-1 test, not by compare**: the probe's
8 slots get reused by the real game for an unrelated sprite once every
feather despawns (by tick 7558) - `turn6FeatherSprites` was initially
trusting raw RAM `inUse` with no upper bound, so at render tick 7600 it
happily rendered whatever unrelated sprite now occupied slot 3 as if it
were a feather (identity matrix, priority 0 - visibly wrong once the test
printed it). Fixed with `FEATHER_LAST_RAM_TICK` (7557, the tick before
slot 12's own despawn) - a hard cutoff past which the function returns
`[]` unconditionally. This was caught by writing the Tier-1 pin BEFORE
trusting the render at that tick, not by the pixel compare (which never
requested a capture that far out) - exactly the kind of latent bug the
"pin every pure-logic fix with a test" rule exists to catch early.

### The precise first-divergence tick, characterized (not chased further this session)

`turn6-feathers.json`'s own `captureFrames` stop at 7420 - the last tick
this session got to exactly 0 diff. Extending one tick further (7421)
immediately shows a residual, small but real: **1px at 7421, growing to
1-53px (0.00-0.14%) through roughly 7549**, with several EXACT ties
scattered inside that range (7542-7544, 7550-7558 - all clean once every
feather but the last has despawned). Crop-inspected at tick 7480 (53px,
0.14%, `x:30-86,y:81-97` - entirely within the feather-sprite's own
silhouette, not Onix's): the mismatched pixels are all soft GRADIENT edge
tones of the feather art itself (e.g. app `(206,222,255)` vs oracle
`(255,255,255)` at one pixel, the reverse at a neighboring one) - the
shape and position are both right; this reads as a genuine nearest-
neighbor sampling / rounding-tie difference that only shows up once
MULTIPLE feathers are concurrently live and overlapping (7421 is exactly
when the 3rd spawn group, ticks 7420/7428, starts overlapping the first
two groups' own paths) rather than a single-sprite bug - the 16-tick clean
prefix (7405-7420) only ever has 1-2 sprites live. Tried: an independent
matrix-only lag (`FEATHER_MLAG` scratch experiment, position lag fixed at
+1) - lag 0 and lag +2 both made every probed tick WORSE than lag +1
matching position, ruling out "the matrix has its own separate lag class"
(the Sitrus window's own +2-for-rotation-matrices lead, explicitly flagged
by this session's brief as a hypothesis to check, does NOT apply here).
Not chased further under the time cap; a future session should look at
same-priority feather-vs-feather ordering (this session sorts only by
priority, arbitrary tiebreak) or a half-pixel sampling-center convention
for even-sized (32x32) affine sprites, using the 7421-7440 range (small,
early residual) as the cheapest reproduction window.

### The OTHER thing found, explicitly out of scope: an unmodeled visual starting ~7570

Past every feather's own despawn (7558), pixels are flat-identical through
7560, then a NEW flat ~1672px (4.35%) residual appears from ~7570 onward
(sampled every 10 ticks through 7650, constant magnitude every time) -
this is almost certainly docs/turn6-notes.md §6's own flagged-but-not-
itemized "stat-down animation (a downward arrow or healthbox flash)" on
Onix's healthbox, a SEPARATE mechanism from the feathers, never claimed as
in scope by this session's brief. `turn6-feathers.json`'s own
`captureFrames` stop at 7420, well before this, so it never contaminates
the committed 0-diff trace - flagged here purely so a future session
doesn't mistake it for a feather-rendering regression.

### Committed artifacts

- `src/assets/gen/battle-anim-white-feather.json` (rung a)
- `tools/probe/dump-feather-dance-sprites.py`, `tools/probe/specs/
  turn6-feathers.json`, `src/data/gen/turn6-feather-sprites-probe.json`
  (rung b)
- `tests/battleScene.test.ts`'s affine-sampler pin (rung c)
- `src/engine/featherDance.ts`, `battleScene.ts`'s `drawTurn6FeatherSprites`/
  `beforeMonSprite` hook, `battleMenu.ts`'s newly-exported
  `GBA_SINE_TABLE_256`, 3 more `turn6FeatherSprites` pins, and
  `tools/compare/traces/turn6-feathers.json` (rung d)

### What's left

The 7421-7658 window (small sampling residual 7421-~7549, the separate
stat-flash mechanism ~7570+), rungs (c)/(d) of turn 6 itself (the ATK-fall
message, Onix's ROCK_SLIDE), and turns 7-13 as parameterizations - all
unchanged from §28's own list. `turn6-menu.json`'s own previously-excluded
7348-7350 ticks were NOT re-verified/restored this session (time cap) -
still open per §28's own note.

### Verification

`npm test` **825/825** (+4 this slice: 1 affine-sampler pin against this
mechanism's own real matrix, 3 `turn6FeatherSprites` pins). `npm run build` green.
`turn6-feathers.json` **106/106, 0 diff** (7307-7420). Zero regressions:
`turn6-menu.json` **33/33**, `turn6-featherdance.json` **90/90**,
`turn5-sitrus-a.json` **110/110**, `turn1-rockslide.json` **256/256**, all
0 diff.

## 30. Engine slice N-4 rung (a): turn 6's stat-fall window - §29's flagged ~7570+ residual RESOLVED (it's the generic StatsChangeAnimation banner, already built for turn 1, just never parameterized for a DECREASE) - `turn6-statfall.json` **127/127, 0 diff**; rung (b) (Onix's own ROCK_SLIDE) NOT attempted, precise ground-truth handoff below (S7 bounded worker session, hard 60-minute cap)

### Rung (a): landed in full, first-attempt 0-diff

RAM-probed the ~7570+ residual §29 flagged as unmodeled (`tools/probe/
dump-task-and-sprite-callbacks.py`, fresh run against a trimmed `battle1-
turn6-dense.json` prefix): `gTasks` slot 1 runs `StatsChangeAnimation_
Step1/2/3` from RAM tick 7567 - **the exact same mechanism** turn 1's own
`drawStatsBanner` already renders for DOUBLE_TEAM's evasion RISE (§10a/§10c/
§10d of `battle-menu-notes.md`), not a downward-arrow sprite or a healthbox
flash as turn6-notes §6 speculated. `extract-stat-anim.ts` had already
pulled the full 8-palette/2-tilemap asset family (a prior session's own
forward-looking extraction, `src/assets/gen/stat-anim-banner.json`) but
nothing had ever wired up the `decrease` tilemap / `attack` palette / a
non-Grovyle target - this session did exactly that (`drawTurn6StatFallBanner`,
`battleScene.ts`, a parallel function to `drawStatsBanner` rather than a
generalization of it - different target sprite, tilemap, palette, AND a
nonzero `BG1_X`, enough parameters that a copy reads clearer than a 6-arg
generalization for a single second caller).

**RAM-exact timing, zero fitting needed**: a direct register probe
(`ram-probe.py`, watching `BLDALPHA`/`gBattle_BG1_X`/`gBattle_BG1_Y`,
stride-1 across ticks 7555-7700) decoded `eva`/`evb` straight from
`BLDALPHA`'s packed value and found a clean, fully deterministic step
function - `+1` every 2 ticks from d=229 (pressTick-relative, pressTick=7345)
to the "sharply" target 13 (`tTargetBlend=13`/`tWaitTime=30` for `aSharply=
TRUE`, vs. DOUBLE_TEAM's mild-rise 10/20), held through d=284, then `-1`
every 2 ticks back to 0 by d=309. `gBattle_BG1_Y` scrolls continuously at
-3/tick (the decrease case's own `tVelocity`) through the ENTIRE window
including the hold (matching `statsBannerBg1Y`'s own "keeps scrolling
through the flat-eva hold" finding), one-tick render lag (same convention).
`gBattle_BG1_X` is a flat constant 64 the whole window (`TURN6_STATFALL_
BG1_X`) - a stat DECREASE's own horizontal picture, never scrolling itself.
Every one of these closed forms matched the oracle **on the first attempt**
(`npm run compare`, 127/127, 0 diff) - no bisection needed, a rare case in
this dossier where a direct register probe was sufficient without any
render-lag hunting beyond reapplying `statsBannerBg1Y`'s own already-
established convention.

**A message-sequencing correction to turn6-notes.md §5, folded in directly
this session** (not just noted): the "ONIX's ATTACK harshly fell!" text does
NOT start until pixel tick **7659** (the held FEATHERDANCE-kickoff sha stays
flat through 7658, matching turn7-notes §5's own correction of the original
§5 table), and it is a plain **instant swap** - box stays open, first glyph
("O") appears the same tick the old text disappears - NOT a generic box-
close/reopen slide as turn7-notes §5 speculated from its own "4 shared
frames" observation. Re-verified directly this session (fresh oracle PNG
reads at 7658/7659/7660/7661): that 4-frame overlap is pure TEXT-CONTENT
coincidence - "ONIX's ATTACK" (this message) and "ONIX used" (the following
ROCK_SLIDE kickoff, turn7-notes' own comparison point) both happen to start
with the literal 4 characters "ONIX", not a shared transition mechanism.
Settles at 7684 (`start + TOTAL - 1` = `7659 + 26 - 1`), the same "1
tick/char, settle on the last glyph's own tick" shape as every other
kickoff message in this dossier - no new timing primitive needed, just
`turn6AtkFellTextStartTick`/`turn6AtkFellTextVisibleChars` alongside the
existing ones. Text itself: **"ONIX's ATTACK" / "harshly fell!"**
(pixel-confirmed via direct PNG read at 7685) - "harshly fell" (not
"sharply fell", which is reserved for RISES) is the correct Gen 3 wording
for a -2-stage drop, matching `EFFECT_ATTACK_DOWN_2`.

### Committed trace and Tier-1 pins

`tools/compare/traces/turn6-statfall.json` - **same script as `turn6-
featherdance.json`/`turn6-menu.json` verbatim** (the same already-committed
1000-frame idle tail covers this window too, confirmed before relying on
it), `captureFrames` 7558-7684 (picking up exactly where §29 pinned "flat-
identical through 7560" - the 7421-7557 feather-sampling residual stays a
separate, untouched, out-of-scope named exclusion) - **127/127, 0 diff**.
`tests/battleMenu.test.ts` (+6): `turn6StatFallEva`'s RAM-exact ramp/hold/
ramp-down schedule (9 sampled ticks against the register probe), `turn6Stat
FallBg1Y`'s one-tick-lag scroll, `TURN6_STATFALL_BG1_X`'s constant, and the
ATK-fall text's timing/content/settle.

### Rung (b): NOT attempted - precise ground-truth handoff

Time-boxed out after rung (a)'s own mechanism-identification + implementation
consumed the full session (per the brief's own explicit permission: "a green
(a) plus a precise (b) handoff beats two half-fits"). Extra dense oracle
probing was done anyway (cheap, no engine code) to leave the next session a
fast start - sha-transition sweep of `battle1-turn6-dense.json`'s own script,
`captureFrames` 7684-8135 in two 256-frame batches, scratch-only, not
committed:

- **7684-7764**: flat hold, "ONIX's ATTACK harshly fell!" continues (81
  ticks, matching rung (a)'s own settle sha `325b7b5ba26c`).
- **7765-7783**: message-box transition into ROCK_SLIDE's own kickoff text
  (19 ticks) - suspiciously exactly the same DURATION as turn7-notes §5's
  own analogous transition (8799-8817, also 19 ticks) despite that section's
  own finding that the two transitions are NOT byte-identical past their
  first few frames; worth checking whether the transition's own LENGTH
  (unlike its pixel content) is a fixed, content-independent constant.
- **7784**: "ONIX used\nROCK SLIDE!" settles (`475609fc8c92`).
- **7784-7801**: flat hold - PP decrement, accuracy roll (7763 per turn6-
  notes §3, actually WITHIN the 7765-7783 transition, not this hold -
  worth re-checking against the RNG ledger directly), crit roll (7787),
  damage-spread lock 43 (7790) all resolve silently underneath, same "RNG
  doesn't require a pixel change" pattern as every other kickoff hold in
  this dossier.
- **7802**: a single-tick flicker (`24e01f8c6bed`), back to the flat sha at
  7804 - same shape as the turn-end flickers already catalogued elsewhere
  (7804-7801 gap, i.e. tick 7803 not independently sampled this pass).
- **7805-7924**: the ROCK_SLIDE attack animation itself, continuously
  changing every tick (~120 ticks) - almost certainly `rockSlideRockState`/
  `rockSlideDrawOrder`/`drawRockSprite`/`rockSlideBg3Y` reused verbatim
  (pressTick-relative, target-agnostic per every prior turn's own
  parameterization precedent), but the TARGET-side hit-flash needs NEW
  parameters this turn: Pidgeotto's own sprite (`pidgeottoFrontSprite`,
  `PIDGEOTTO_CORNER`, both already extracted/used by the switch-in
  materialize code) for the shake/blink (currently `rockSlideMonShakeY2`/
  `rockSlideMonBlinkInvisible` are applied to `grovyleFrontSprite`/
  `GROVYLE_CORNER` only), and Pidgeotto's own healthbox content
  (`pidgeottoHealthboxContent`'s own hp-fraction variant, analogous to
  `opponentHealthboxContentForHp`) for the wobble/drain - **but
  `turn5PidgeottoHealthboxSlideDx` settles to a steady value once past
  `TURN5_PIDGEOTTO_SETTLE_TICK` (6851)**, meaning Pidgeotto's healthbox
  sits at the SAME screen origin (`HEALTHBOX_FRAME_ORIGIN`) Grovyle's
  always occupied - `drawOpponentHealthboxWobble`'s existing pixel geometry
  should be directly reusable, only the HP-fraction content needs a fresh
  compositor call per tick.
- **7926-7934**: flat again, same sha as the pre-animation hold
  (`475609fc8c92`) - the rock animation's own settle-back, matching every
  prior turn's "attack animation ends, kickoff text still held" shape.
- **7935-7955**: impact/hit-flash window, alternating shas (a blink pattern,
  3-4 distinct frames cycling) - `rockSlideHealthboxWobbleY2`'s own shape,
  needs re-pinning against Pidgeotto's healthbox position (same origin per
  above, but a fresh RAM/pixel bisection for the timing offset, not assumed
  transferable from Grovyle's turn 1-5 numbers without checking).
- **7956-7969ish**: flat hold again.
- **7970-8038**: HP-bar drain window, continuously changing (69 ticks,
  turn6-notes §5 cited "7970-8019" as the drain proper - this session's own
  sweep shows changes continuing to ~8038, worth reconciling; `pidgeottoHp`
  itself commits 156->113 per RAM at tick 8014 per turn6-notes §3/§5).
  Pidgeotto's healthbar is a 156-max-HP bar (unlike Grovyle's smaller max),
  so `rockSlideOpponentHp`'s own per-tick HP-unit-to-pixel mapping needs a
  fresh derivation, not a direct reuse (turn6-notes §5 already flagged this:
  "not 1-RAM-unit-per-tick like turn 1's drain... the healthbar's own pixel
  resolution doesn't resolve every individual HP unit for a 156-max-HP bar").
- **8039-8114 (not densely captured, a 76-tick gap)**: almost certainly "It's
  super effective!" holding flat, per turn7-notes §5's own newly-itemized
  analogous message (turn 7's own equivalent gap, 9040-9059->9060, IS
  exactly this) - turn6-notes §5 flagged this exact gap (8019-8115) as
  uncaptured; a future session should densely capture it directly rather
  than assume the turn-7 analogy, but the analogy is strong (ROCK-vs-FLYING
  is 2x either turn, same move, same target type).
- **8115**: text starts clearing.
- **8122**: turn-7's own settled menu (`492e3816c1f0`, matching turn6-notes
  §5's own already-cited sha for this exact tick).
- **8123**: 1-tick flicker, back to `492e3816c1f0` at 8124, stable from
  there (matches turn6-notes §5's own cited flicker pattern) - a change at
  8133 is almost certainly the resettled idle-bounce cycle resuming, not a
  new mechanism, but not independently confirmed this session.

**RNG to model** (turn6-notes §3, verify against the ledger once rung (b) is
actually implemented, not just cited): accuracy roll (7763), crit roll
(7787), damage-spread roll locking `gBattleMoveDamage`=43 (7790), secondary-
effect/flinch roll (8104, 30% chance - Pidgeotto already moved this turn so
a flinch would be a no-op either way, but the brief's own RNG-discipline
instruction is to model the CALL regardless of whether the outcome matters),
turn-pass bookkeeping (8114), AI-scoring cluster (8121, 5 steps).

**Text**: "ONIX used\nROCK SLIDE!" (kickoff, pixel-confirmed), then "It's
super effective!" (per the gap analysis above, not yet pixel-confirmed
directly for turn 6 - the turn7-notes §5 analogy is strong but should be
independently verified, not assumed).

### Verification

`npm test` **831/831** (+6). `npm run build` green. `turn6-statfall.json`
**127/127, 0 diff** (7558-7684). Zero regressions: `turn6-feathers.json`
**106/106**, `turn6-featherdance.json` **90/90**, `turn6-menu.json`
**33/33**, `turn5-rockslide.json` **256/256**, `turn1-rockslide.json`
**256/256**, all 0 diff.

## 31. Engine slice N-4 rung (b): turn 6's own ROCK_SLIDE (Onix vs. Pidgeotto), landed in full - `turn6-rockslide-a.json` **255/255**, `turn6-rockslide-b.json` **105/105**, both 0 diff, completing turn 6 end to end through the tick before turn 7's menu reopen (S7 bounded worker session, hard 60-minute cap)

### Rung (a): ground-truth firm-up, done first

Before writing any render code, re-ran a fresh dense oracle capture of the
whole assigned window (`captureFrames` 7765-8124 contiguous, stride-1, 360
frames, split into 3 requests for the oracle's own 256-frame cap) against
`battle1-turn6-dense.json`'s own committed script - the committed trace
itself only densely covers small slices of this range (its own gaps:
7791-7932 and 8019-8098, 140 and 78 ticks respectively), so §30's own
sha-sweep (done against a since-discarded scratch trace) needed independent
reconfirmation, not just re-citation. Full sha-transition list computed
from the fresh capture (not committed - scratch only, matching this
dossier's own convention for throwaway probing). Net: §30's sweep was
**accurate everywhere it went, and the fresh pass resolved its one open
question** (the 8039-8114 "uncaptured gap" hypothesis):

- **7765-7784**: message-box transition into ROCK_SLIDE's own kickoff text
  (20 ticks, not 19 - §30 miscounted by one), settling `475609fc8c92`.
  Char-for-char span-matched: 20 ticks = `ROCK_SLIDE_TEXT_TOTAL` (20 chars)
  exactly, confirming (not just assuming, per rung (b) below) that this
  transition is fully reproduced by the plain `rockSlideTextVisibleChars`
  char-reveal already in use for turns 1/3/4/5's own kickoff text - no
  separate "generic box-slide" model needed despite turn7-notes §5's own
  "shared 4-frame prefix, content-dependent after" finding for the
  ANALOGOUS turn-6/7 flavor-text-to-flavor-text transitions (that finding
  stands for THOSE transitions; this one just happens to ALSO be well-
  modeled by the simpler char-reveal, the same way turn 3/5's own ROCK_SLIDE
  kickoff already was even though it's ALSO the turn's second message).
- **7784-7801**: flat hold ("ONIX used\nROCK SLIDE!"), single-tick flicker
  at 7802 (`24e01f8c6bed`, `rockSlideBg3Y`'s own `d=1`/`d=2` shake values
  landing exactly here), flat again 7804.
- **7805-7924**: the rock animation, changing every tick (120 ticks) -
  reused verbatim.
- **7926-7934**: flat hold (animation settle-back).
- **7935-7967**: hit-flash window - the healthbox wobble (`rockSlideHealthbox
  WobbleY2`, 20-tick cycle, 7935-7954) and the mon blink (`rockSlideMonBlink
  Invisible`, 32-tick cycle, 7936-7967) overlap for their shared span then
  the blink continues alone through 7967, producing the alternating-then-
  4-tick-block sha pattern in the fresh capture - hand-verified tick-by-tick
  against both existing formulas' own `d` ranges before writing any code
  (see rung (b) below), not curve-fit after the fact.
- **7970-8017**: HP-bar drain, changing every 3-4 ticks (156-max-HP bar,
  3.25 HP/pixel - coarser than Grovyle's ~2.98 HP/pixel, explaining the
  slower visible cadence turn6-notes §5 flagged), settling (holding
  `e8811187b452`) at **8012** - RAM's own `pidgeottoHp`=113 write at 8014
  (turn6-notes §5) is 2 ticks after the pixel settle, consistent with this
  dossier's "RAM commits shortly after pixel settle" pattern.
- **8018-8037**: **RESOLVES §30's own open question** - this is NOT a
  separate uncaptured mechanism, it's the message-box swap from the held
  ROCK_SLIDE kickoff text into "It's super effective!" (20 ticks... 21
  chars, see below), settling (`846f9a5b4de3`) at **8038**. §30's "8039-8114
  uncaptured gap" was the FLAT HOLD of this message, not a second unmodeled
  transition - the fresh capture shows the message swap itself starts
  earlier (8018) than §30's own gap boundary (8039) and was simply inside
  a stretch the committed trace's own script never densely sampled.
- **8038-8114**: flat hold, "It's super effective!" (77 ticks) - pixel-
  confirmed via direct PNG read at tick 8060 (single line, `LINE1_ORIGIN`,
  line 2 blank).
- **8115**: text starts clearing (`a8e22ddf13b7`).
- **8115-8121**: flat "teal blank box" hold (7 ticks).
- **8122**: settled turn-7 menu (`492e3816c1f0`), 1-tick flicker at 8123,
  stable from 8124.

### Rung (b): landed in full - a pure parameterization, no new mechanisms

Every falling-rock/shake/hit-flash/drain mechanism (`rockSlideBg3Y`/
`rockSlideRockState`/`rockSlideDrawOrder`/`rockSlideMonShakeY2`/
`rockSlideHealthboxWobbleY2`/`rockSlideMonBlinkInvisible`/`rockSlideOpponentHp`)
is reused **completely unchanged** - all were already pure `t`/`pressTick`
functions with the target's sprite/corner/healthbox left to the caller, per
§30's own hand-off. The whole implementation was hand-verified against the
fresh dense capture above BEFORE writing a line of render code (matching
this turn's own §30 "RAM-probe before writing render code" mandate,
extended here to "hand-verify against dense pixels before writing render
code" since the mechanisms themselves were already RAM-derived in prior
turns): a synthetic press anchor `TURN6_ROCKSLIDE_PRESS_TICK=7372` makes
`rockSlideTextStartTick(7372)=7765` match the capture's own kickoff-text
start, and every existing delay constant (`ROCK_SLIDE_RAM_ANCHOR_DELAY`=428,
`HIT_FLASH_RAM_ANCHOR_DELAY`=562, `ROCK_SLIDE_HP_DRAIN_START_DELAY`=597)
reproduces the fresh capture's own transition ticks exactly when hand-
computed against this anchor - confirmed by arithmetic first, then by
`npm run compare` (which passed FIRST attempt on the whole 255-frame rock/
hit-flash/drain half, `turn6-rockslide-a.json`).

**Genuinely new pieces**, all small parameterizations rather than new
formulas:

- Pidgeotto's own shake/blink applied to `pidgeottoFrontSprite`/
  `PIDGEOTTO_CORNER` (already extracted from the turn-5 switch-in code) in
  place of Grovyle's.
- `pidgeottoHealthboxContentForHp(hp)` - a direct copy of `opponentHealthbox
  ContentForHp`'s own memoized-by-HP shape, parameterized by `PIDGEOTTO_MAX_
  HP` (156, RAM-confirmed via turn6-notes §4). **No new HP-drain pixel
  formula was needed** - `calcBarFilledPixels` (`healthboxAssembly.ts`) was
  already `maxHp`-agnostic (`floor(hpFraction*48)`), and `rockSlideOpponentHp`
  was already value-agnostic per its OWN doc comment (`battle-turn-notes.md`
  §9's original finding) - the brief's own "derive the real formula, don't
  curve-fit" caution turned out to already be satisfied by existing code;
  this session's job was confirming that (via the dense capture's own drain
  cadence matching `156/48=3.25` HP/pixel exactly), not writing a new one.
- "It's super effective!" (`TURN6_SUPER_EFFECTIVE_LINE`, curly apostrophe
  `’` matching `TURN6_ATKFELL_LINE1`'s own established glyph - a straight
  `'` mismatched 14px at the apostrophe in the first `npm run compare` pass,
  caught and fixed immediately) - single line, 21 chars, same "1 tick/char,
  settle on the last glyph's own tick" shape as every other message in this
  dossier, `turn6SuperEffectiveTextStartTick`=`pressTick`+646.
- `drawTurn6RockSlideAttack`/`drawTurn6RockSlideWindow`/`drawTurn6RockSlide
  TurnEndSettledMenu` - new dispatcher functions following turn 3/5's own
  "each turn's ROCK_SLIDE gets its own dedicated attack function" precedent
  rather than over-generalizing `drawTurn6FieldBase` for a single new
  caller. One real bug caught by `npm run compare` (not by inspection): the
  first draft of `drawTurn6RockSlideTurnEndSettledMenu` omitted the base
  `drawStaticBgShiftedY` background paint (every other caller gets it via
  `drawTurn5RockSlideAttack`/`drawMenuIdleBaseWithOpponentHp`), producing a
  47%-of-screen diff despite looking almost right in a side-by-side PNG
  glance - fixed by adding the missing base-background call.
- Onix's own on-field bounce stays FROZEN (the turn's original A-press
  anchor, `TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET`) through the WHOLE attack
  window (FEATHER_DANCE text through ROCK_SLIDE's drain) - only resets to a
  live cycle at the turn's own redraw (`turn6RockSlideResettledBounceTick`,
  anchored fresh at `TURN6_ROCKSLIDE_MENU_REDRAW_DELAY`), same "DoBounce
  Effect stops being polled at the A-press, resumes at the next menu redraw"
  rule this dossier already established.

**RNG**: not separately modeled as a per-turn ledger (turnRng.ts's own
`TURN1_RNG_STEPS` table is turn-1-specific and no turn 3/4/5 session added
its own analogous ledger either - not this dossier's established
convention past turn 1). All 7 of turn 6's own ROCK_SLIDE-half `Random()`
calls (accuracy 7763, crit 7787, damage-spread 7790, secondary-effect/
flinch 8104, turn-pass 8114, AI-cluster×5 8121, per turn6-notes §3) land
inside already-rendered static holds and need no pixel-visible modeling,
matching the "RNG doesn't require a pixel change" pattern this dossier has
used since turn 1. The flinch roll at 8104 is a real `Random()` call per
the ledger but a guaranteed no-op this turn (Pidgeotto already moved first)
- no special-casing needed since nothing renders differently either way.

### Committed traces and Tier-1 pins

`tools/compare/traces/turn6-rockslide-a.json` (`captureFrames` 7765-8019,
255 frames) and `turn6-rockslide-b.json` (8020-8124, 105 frames) - same
script as `turn6-statfall.json`/`turn6-menu.json` verbatim (confirmed
before relying on it, same as rung (a) of §30). **Both 255/255 and 105/105,
0 diff, first attempt on the mechanics half** (`-a.json`); `-b.json` needed
two small fixes (the apostrophe glyph, the missing background paint) before
its own 105/105. `tests/battleMenu.test.ts` (+6): `TURN6_ROCKSLIDE_PRESS_
TICK`'s own anchor identity, the super-effective text's content/timing,
the text-clear/redraw delay pair, `turn6RockSlideResettledBounceTick`'s
fresh-cycle-at-redraw shape, and `rockSlideOpponentHp` re-exercised at
Pidgeotto's own 156/113 values (confirming reuse, not just asserting it).

### Verification

`npm test` **837/837** (+6). `npm run build` green. `turn6-rockslide-a.json`
**255/255**, `turn6-rockslide-b.json` **105/105**, both 0 diff (7765-8124
contiguous). Zero regressions: `turn6-statfall.json` **127/127**,
`turn6-feathers.json` **106/106**, `turn6-featherdance.json` **90/90**,
`turn6-menu.json` **33/33**, `turn5-rockslide.json` **256/256**,
`turn3-rockslide.json` **256/256**, `turn1-rockslide.json` **256/256**, all
0 diff. Turn 6 is now resolved end to end (settled menu through 8124, 222
ticks of margin before turn 7's own 8346 button press) - the next session's
natural next step is turn 7 as a parameterization of this turn's own
mechanisms (per turn7-notes.md's own dossier), or turns 8-13, or the turn
15+/16+ scout territory already banked.

## 32. Engine slice O: turn 7 end to end, minus the feather sub-window - `turn7-menu.json` **85/85**, `turn7-rockslide-{a,b,c,d}.json` **256+256+256+19 = 787/787**, all 0 diff; rung (b) (the feather-sprite animation) explicitly deferred, same excluded-residual convention as turn 6's own N-3 (S7 bounded worker session, hard 60-minute cap)

Turn 7 repeats turn 6's exact move pair (FEATHER_DANCE/ROCK_SLIDE, same
battlers) per turn7-notes.md §6 ("no new mechanism this turn") - every
pressTick-generic turn-6 function (`turn6FeatherDanceText*`/`turn6StatFallEva`/
`turn6StatFallBg1Y`/`turn6AtkFellText*`/`rockSlideText*`/`rockSlide*` et al.)
is reused UNCHANGED, fed turn 7's own real confirm pressTick or its own
synthetic ROCK_SLIDE anchor. A fresh dense oracle sweep (captureFrames
8346-9380 contiguous, this session, scratch-only) was run BEFORE writing any
render code, per the brief's own "verify 2-3 probe ticks, bisect only on
divergence" mandate - it resolved every constant below by direct sha
comparison, not by trusting turn7-notes.md's own prose-only tick citations
(which turned out imprecise in two places, see below).

### Rungs (a)+(c) landed together: the dispatcher chain is naturally unified

The brief's own ladder splits "(a) menu/kickoff-text" from "(c) stat-fall
banner/message", but the ALREADY-EVOLVED `drawTurn6FeatherDanceKickoffText`
(post turn 6's own N-4 rungs) draws the kickoff text, stat-fall banner, AND
ATK-fall text all in one function - mirroring that shape for turn 7
(`drawTurn7FeatherDanceKickoffText`) lands both rungs in the same commit,
each reusing its turn-6 sibling verbatim:

- Real confirm pressTick is **8379**, not 8378 as a naive `segmentStart`
  read would suggest - the button press occupies frames 8378-8379 (2
  frames) and `confirmFightMove(fightSubmenu, battleScene.elapsed+1)`'s own
  `+1` registration convention (every prior turn's pressTick already
  follows this) lands on the SECOND frame. Confirmed two independent ways:
  arithmetic from the trace's own segment list, and the fresh sweep's own
  first-changing tick for the FEATHER_DANCE kickoff text (8392) matching
  `turn6FeatherDanceTextStartTick(8379)=8392` exactly (8378 would predict
  8391, which the sweep shows still flat).
- `turn6StatFallEva`/`turn6StatFallBg1Y`/`turn6AtkFellTextStartTick` all
  reused with ZERO new constants - fed pressTick=8379 they reproduce the
  fresh sweep exactly (ATK-fall text first-changing tick 8693 =
  8379+314, matching `turn6AtkFellTextStartTick`'s own existing formula).
- **Wording re-verified, not assumed** (the brief's own "verify" flag):
  direct PNG reads at ticks 8730 and 9080 confirm "ONIX’s ATTACK\nharshly
  fell!" (the SECOND -2 ATK stage-pair, cumulative from turns 6+7 per
  turn7-notes §4, still "harshly" not "won't go any lower" - not yet at the
  -6 floor) and "It’s super effective!" - both byte-identical text to turn
  6's own, no new string constants needed.

### A real bug found and fixed: the pre-turn-7 idle/browsing window needs a SECOND resettled-bounce regime, not turn 6's own

`drawTurn6FieldBase` (reused everywhere turn ≤6 needed Onix's on-field
sprite/healthbox) hardcodes two turn-6-only assumptions that silently broke
for turn 7: its bounce formula (`turn5SitrusResettledBounceTick`, anchored
to turn 5's own switch-in redraw) is the regime active only THROUGH turn
6's own ROCK_SLIDE resolution - turn 6's OWN redraw (8122) resets the bounce
task fresh onto a SECOND regime (`turn6RockSlideResettledBounceTick`,
already used correctly by `drawTurn6RockSlideTurnEndSettledMenu` for ticks
8122-8345) - and it never repaints Pidgeotto's healthbox once the slide-in
settles (`turn5PidgeottoHealthboxSlideDx` returns `null`), relying on
whatever static content happened to already be correct (full HP, true for
every turn ≤6 use). Turn 7's own idle/browsing window (8346-8378, AFTER
turn 6's redraw AND after Pidgeotto has taken real damage) breaks BOTH
assumptions at once - caught immediately by `npm run compare` (a flat
6.93%/2662px diff, Onix's silhouette AND Pidgeotto's healthbox both wrong)
on the very first attempt at reusing `drawTurn6ActionMenuIdleWindow`/
`drawTurn6FieldBase` directly for turn 7.

Fixed with `drawTurn7FieldBase` (a `drawTurn6FieldBase` wrapper): converts
`bounceTick` from regime-2 space into whatever regime-1-space value
produces the identical `menuIdleBounce` result (`TURN7_REGIME2_TO_REGIME1_
SHIFT`, an algebraic identity - `TURN5_SITRUS_MENU_REDRAW_TICK -
(TURN6_ROCKSLIDE_PRESS_TICK+750)`, not a fitted constant), then repaints
Pidgeotto's healthbox at 113 HP unconditionally. `turn7KickoffBounceTick`
(the confirm-wait freeze) and `drawTurn7RockSlideAttack`'s own bounce line
both freeze at the SAME known-zero plateau (the regime-2 anchor tick
itself, `TURN6_ROCKSLIDE_PRESS_TICK+TURN6_ROCKSLIDE_MENU_REDRAW_DELAY` -
by construction this maps to `MENU_IDLE_BLANK_END_TICK+1`, the same "real
{0,0} plateau" class turn 6's own freeze anchor was independently
bisected to land on, no new bisection needed). Also caught: the idle
window's OWN early-return branches must dispatch through
`drawTurn6RockSlideTurnEndSettledMenu` (already-proven regime 2 +
113-HP), not `drawTurn6ActionMenuIdleWindow` (regime 1, turn-≤6-only).

### Rung (d): turn 7's own ROCK_SLIDE, a pure parameterization with 4 fresh (not transferred) literal constants

Every mechanism (`rockSlideBg3Y`/`rockSlideRockState`/`rockSlideDrawOrder`/
`rockSlideMonShakeY2`/`rockSlideHealthboxWobbleY2`/`rockSlideMonBlinkInvisible`/
`rockSlideOpponentHp`) reused with ZERO changes. New constants, each
oracle-confirmed against the fresh sweep (not copied from turn 6):

- `TURN7_ROCKSLIDE_PRESS_TICK=8406` (synthetic anchor - `rockSlideTextStartTick
  (8406)=8799`, the sweep's own first tick of the ROCK_SLIDE kickoff-text
  transition, settling `e8811187b452` at 8818 - byte-identical to turn 6's
  own settle sha for this fixed-content text, "ONIX used\nROCK SLIDE!").
- `TURN7_SUPER_EFFECTIVE_TEXT_DELAY=634`, **not** turn 6's own 646 - the
  drain reaches Pidgeotto's post-ROCK_SLIDE HP (82, a smaller -31 delta
  than turn 6's -43) sooner, so the message swap starts earlier relative to
  its own anchor (9040, settling `92c9f9307078` at 9060 - byte-identical to
  turn7-notes.md §5's own already-cited sha, confirming that citation
  despite the table's own imprecise "8686-8717"/"9052" framing elsewhere).
- `TURN7_ROCKSLIDE_TEXT_CLEAR_DELAY=731`/`TURN7_ROCKSLIDE_MENU_REDRAW_DELAY=738`
  (9137/9144) - the same 7-tick clear-to-redraw gap every prior turn's own
  ROCK_SLIDE pair establishes, freshly fit (turn7-notes.md §5's own prose
  cited 9137/9143 - the fresh sweep corrects the second to 9144, a 1-tick
  table imprecision, not a new finding).
- `TURN7_PIDGEOTTO_AFTER_ROCKSLIDE_HP=82` (113->82, turn7-notes.md §4).
- `currentPPForActiveMon` gets a 6th independent slot-0 decrement
  (`turn6Resolved`) - ROCK_SLIDE reads 5/10 at turn 7's own reopen, matching
  turn7-notes.md's own ledger exactly.

### Rung (b) NOT attempted: the feather sub-window, same excluded-residual convention as turn 6's own N-3

Per the brief's own explicit plan, turn 7's own feather window (RAM/pixel
live from ~8439 through ~8592, bracketed on both sides by ticks that are
sha-IDENTICAL to the settled kickoff-text hold - 8422 and 8593 both read
`2772abca5248` in the fresh sweep, confirming the flat holds immediately
before/after are correctly covered by the existing dispatcher with NO
feather-specific code) was left unrendered this session - `turn6FeatherSprites
(t)` naturally returns `[]` for every tick in turn 7's own range (it's keyed
to turn 6's own RAM ticks only), so this is a harmless no-op rather than a
wrong render for the ticks this session's own traces DO claim. Building
`turn7-feather-sprites-probe.json` (rerunning `tools/probe/dump-feather-
dance-sprites.py` against 8439-8592) plus the second RAM-table + tick-range
dispatch the brief asked for did not fit the time cap alongside rungs
(a)/(c)/(d) and the regime-2 bug above - left for a future session, exactly
as scoped.

### A second known-class residual, same shape as turn 6's own excluded pre-confirm ticks

`turn7-menu.json` excludes 8 ticks (8352-8353, 8361-8362, 8370-8371,
8380-8381 - 2-tick gaps every ~9 ticks) from its own captureFrames, the
SAME cadence/width as `turn6-menu.json`'s own already-excluded pre-confirm
ticks (7315-7316/7324-7325/7333-7334/7342-7343, per §27) - a 1-tick
bounce-phase quantization blip in the browsing-submenu window, alternating
between Onix's on-field silhouette and the player healthbox regions. Not
re-diagnosed this session (out of scope per the brief's own "turn6-menu.json's
own excluded pre-confirm ticks" exclusion) - flagged here only because it's
now confirmed to recur at turn 7, i.e. it's a property of the shared
mechanism, not a turn-6-specific artifact.

### Committed traces and Tier-1 pins

`tools/compare/traces/turn7-menu.json` (captureFrames 8346-8438 minus the 8
excluded ticks above, 85 frames) and `turn7-rockslide-{a,b,c,d}.json`
(captureFrames 8593-9379 contiguous, split into 4 files for the oracle's
256-capture-per-request cap: 256+256+256+19). Same 76-segment/9380-frame
script as turn7-notes.md §1/§2 predicted (turn6-rockslide-b.json's own
72-segment/8346-frame prefix + the menu-reopen `A`(2f)/30f-settle/confirm
`A`(2f)/1000f-idle tail) - confirmed exact via direct diff before relying on
it. `tests/battleMenu.test.ts` (+7): `TURN6_ROCKSLIDE_REOPEN_GATE_DELAY`'s
own anchor identity, `TURN7_ROCKSLIDE_PRESS_TICK`'s anchor, the
super-effective text's content/timing (explicitly asserting the delay is
NOT 646), the text-clear/redraw pair, `turn7RockSlideResettledBounceTick`'s
fresh-cycle shape, `rockSlideOpponentHp` re-exercised at 113/82, and
`currentPPForActiveMon`'s 6th decrement. `tests/fightSubmenu.test.ts` (+1):
the PP 5/10 ledger via `turn6Resolved`.

### Verification

`npm test` **845/845** (+8). `npm run build` green. `turn7-menu.json`
**85/85**, `turn7-rockslide-a.json` **256/256**, `turn7-rockslide-b.json`
**256/256**, `turn7-rockslide-c.json` **256/256**, `turn7-rockslide-d.json`
**19/19**, all 0 diff (787+85=872 frames total, contiguously covering
8346-9379 minus only the named feather-window exclusion 8439-8592 and the
8-tick known-class residual above). Zero regressions: `turn6-rockslide-a.json`
**255/255**, `turn6-statfall.json` **127/127**, `turn6-feathers.json`
**106/106**, `turn6-menu.json` **33/33**, all 0 diff. Turn 7 is resolved end
to end except its own feather sub-window - the next session's natural next
step is rung (b) (the turn-7 feather probe), then turns 8-13 as further
parameterizations, or the turn 15+/16+ scout territory already banked.

## 33. Engine slice P: turn 8 end to end, minus the feather sub-window - the winning line's own divergence turn (RIGHT onto BIND, BIND MISSES) - `turn8-menu.json` **78/78**, `turn8-bind-{a,b}.json` **256+66 = 322/322**, all 0 diff (S7 bounded worker session, hard 60-minute cap)

Turn 8 is docs/turn8-notes.md's own subject: Onix's cursor moves one `RIGHT`
press off ROCK_SLIDE onto BIND (slot 1, `moveFightCursor`'s existing
`cursor^1` grid arithmetic - already generic since turn 3's slice F, so no
new nav code was needed), BIND's accuracy check misses (the first miss this
engine ever renders), and Pidgeotto's FEATHER_DANCE (3rd use, ATK hits its
stage floor with no visible message difference) proceeds as usual. Every
pressTick-generic turn-6 function (`turn6FeatherDanceTextStartTick`/
`turn6StatFallEva`/`turn6StatFallBg1Y`/`turn6AtkFellTextStartTick`) is reused
UNCHANGED, fed this turn's own real confirm pressTick (9425 - the confirm
press occupies frames 9424-9425, same `+1` registration convention every
prior turn's pressTick already follows). A fresh dense oracle sweep was NOT
re-run wholesale this session (unlike turn 7's own N-4/O sessions) - the
already-committed `battle1-turn8-dense.json` ground-truth dossier (this
session's own worktree-probe predecessor, docs/turn8-notes.md) already
covers every needed boundary sha-cited and twice-run-verified, so this
session went straight to writing render code against its own cited ticks,
verifying via `npm run compare` rather than re-sweeping.

### Rungs (a)+(b)+(c) landed together: the same "dispatcher chain naturally unifies" shape as turn 7's own rungs (a)+(c)

The brief's own ladder splits "(a) menu/RIGHT/confirm/BIND-kickoff" from "(b)
the miss window" from "(c) the FEATHER_DANCE chain + turn-end", but the
actual code shape (mirroring turn 7's own `drawTurn7FeatherDanceKickoffText`/
`drawTurn7RockSlideWindow` split) naturally unifies (b)+(c) into one
dispatcher pair (`drawTurn8FeatherDanceKickoffText` -> `drawTurn8BindWindow`),
so only rung (a) (the menu/nav/confirm window, `turn8-menu.json`) ended up as
a genuinely separate trace file - the rest landed and verified together in
one pass (`turn8-bind-{a,b}.json`).

- **Rung (a)** (`turn8-menu.json`, captureFrames 9380-9467 minus 10 excluded
  ticks below): the reopen (cursor persisted at slot 0, ROCK_SLIDE, unchanged
  from turn 7), one `RIGHT` press (cursor 0->1, BIND - `moveFightCursor`
  unchanged), confirm (`core.ts`'s own confirm gate extended from
  `cursor === 0 || cursor === 2` to also accept `cursor === 1`, the ONLY
  input-handling code change this session), and the start of FEATHER_DANCE's
  kickoff text typing-in - ending at 9467, one tick before the feather
  sub-window begins (9468, docs/turn8-notes.md §5).
- **Rungs (b)+(c)** (`turn8-bind-{a,b}.json`, captureFrames 9739-10060
  contiguous): resumes right at the ATK-fell message's own start (the
  feather sub-window's own far bracket, excluded below) through the
  stat-fall banner/ATK-fell text (reused unchanged), BIND's own kickoff text
  ("ONIX used\nBIND!"), the miss message ("ONIX’s\nattack missed!",
  `sText_AttackMissed` exactly), and turn-end into the settled, pixel-
  identical-to-turn-8's-own-baseline turn-9 menu (confirmed static/idle-
  cycling through 10060, matching docs/turn8-notes.md §5's own scouted
  range).

### What's genuinely new this turn

- **BIND's own kickoff text + miss message** (`drawTurn8BindWindow`,
  `battleScene.ts`): a pure text-swap dispatcher over `drawTurn8FieldBase`'s
  own frozen static scene - **no move animation plays on a miss** (no shake,
  no rocks, no hit-flash, no HP drain), confirmed both from source
  (docs/turn8-notes.md §3's "misses divert BEFORE the roll") and pixels (the
  compare run's own first-attempt 0 diff across the whole window). BIND's
  text ("ONIX used"/"BIND!", 14 chars) starts at pressTick+421 (9846); the
  miss message ("ONIX’s"/"attack missed!", 20 chars, `battle_message.c:68`'s
  `sText_AttackMissed` resolved for Onix with no "Foe " prefix) starts at
  pressTick+471 (9896) - both freshly fit literal delays, not derived from
  any prior turn's ROCK_SLIDE-shaped constant (there's no ROCK_SLIDE-style
  reused sub-mechanism to anchor against here, so no synthetic press-tick
  anchor was needed either - BIND/miss just use the real confirm pressTick
  directly, same as `turn6AtkFellTextStartTick` already does).
- **Turn-end gap is 6 ticks, not 7**: `TURN8_TEXT_CLEAR_DELAY`(566)/
  `TURN8_MENU_REDRAW_DELAY`(572) - one tick shorter than every prior turn's
  own clear-to-redraw gap (turn 6: 743->750, turn 7: 731->738). Not chased
  further (the miss's own shorter resolution script plausibly drops one tick
  somewhere upstream of this gap) - flagged, not root-caused, matching this
  dossier's own "unexplained magnitude, not resolved" convention for minor
  timing quirks that don't change what to render. `npm run compare` caught
  this immediately (a diff at the 7-tick-gap guess) before it was fit fresh
  against the dossier's own cited ticks (9991/9997).
- **`drawTurn8FieldBase`/`TURN8_REGIME3_TO_REGIME1_SHIFT`**: the SAME
  algebraic anchor-shift trick `drawTurn7FieldBase`/`TURN7_REGIME2_TO_
  REGIME1_SHIFT` established, one redraw further (turn 7's own redraw,
  9144, resets the bounce cycle onto a third regime) - solved the same way,
  not fitted.
- **The confirm gate now accepts BIND (cursor 1)**: `core.ts`'s own
  `newKeys.has("A") && (cursor === 0 || cursor === 2)` guard (dated back to
  slice A/E1, when only ROCK_SLIDE and DRAGON_BREATH had ever been
  oracle-verified) extended to `cursor === 1` - SANDSTORM (slot 3) remains
  the only unconfirmable slot, still correctly out of scope
  (`tests/fightSubmenu.test.ts`'s own "different slot" test updated to
  exercise SANDSTORM instead of BIND, since BIND is no longer unmodeled).
- **The ATK-stage floor-clamp (docs/turn8-notes.md §4)**: produces NO visible
  difference this turn (the ordinary "ONIX’s ATTACK\nharshly fell!" message
  plays, same wording/timing as turns 6-7, `turn6AtkFellTextStartTick`
  reused with zero changes) - confirmed by the compare run's own 0 diff
  across this exact span, not just trusted from the dossier's prose. The
  "won't go any lower!" variant is turn 9+'s own concern (out of scope,
  Onix's ATK stage sits at the floor entering turn 9 per §7 of the dossier).

### A third recurrence of ISSUES #28's own period-9 residual class

`turn8-menu.json` excludes 10 ticks (9383-9384, 9392-9393, 9402-9403,
9411-9412, 9420-9421 - 2-tick gaps every ~9-10 ticks) from its own
captureFrames, the SAME cadence/shape as `turn6-menu.json`'s (8 ticks,
§27) and `turn7-menu.json`'s (8 ticks, §32) own already-excluded
pre-confirm-window ticks - caught by `npm run compare`'s own first attempt
(5 paired 2-tick diffs, 2-4% each, all within the pre-confirm browsing/nav
window) and immediately recognized as this same known-class residual rather
than a new bug, per the brief's own explicit expectation ("if it recurs,
note it in §33 for the #28 evidence file - expected, given #28 says it's a
shared-path property"). Not re-diagnosed this session (ISSUES #28 fixes are
explicitly out of scope) - a third same-shape instance banked as further
evidence for whoever picks up #28.

### Committed traces and Tier-1 pins

`tools/compare/traces/turn8-menu.json` (captureFrames 9380-9467 minus the 10
excluded ticks above, 78 frames) and `turn8-bind-{a,b}.json` (captureFrames
9739-10060 contiguous, split into 2 files for the oracle's 256-capture-per-
request cap: 256+66). Same 82-segment/10826-frame script as
`battle1-turn8-dense.json`'s own committed ground-truth trace (reused
verbatim as the base script for both working traces, confirmed exact before
relying on it - the brief's own "confirm segment coverage" instruction).
`tests/battleMenu.test.ts` (+7): `TURN7_ROCKSLIDE_REOPEN_GATE_DELAY`'s own
anchor identity, the turn-8 PP ledger (ROCK_SLIDE 4/10 via `turn7Resolved`,
BIND untouched/still fresh), `moveFightCursor`'s RIGHT-onto-BIND arithmetic,
BIND's own kickoff-text content/timing, the miss message's own content/
timing (word-for-word against `sText_AttackMissed`), the turn-end 6-tick
clear-to-redraw gap, and `turn8ResettledBounceTick`'s fresh-cycle shape.
`tests/fightSubmenu.test.ts` (+0 net, 1 updated): the "different slot
doesn't confirm" test now exercises SANDSTORM (cursor 3) instead of BIND,
since BIND is confirmable as of this session.

### Verification

`npm test` **852/852** (+7, net of the one updated test above). `npm run
build` green. `turn8-menu.json` **78/78**, `turn8-bind-a.json` **256/256**,
`turn8-bind-b.json` **66/66**, all 0 diff (322+78=400 frames total,
contiguously covering 9380-10060 minus only the named feather-window
exclusion 9468-9738 and the 10-tick known-class residual above). Zero
regressions: `turn7-menu.json` **85/85**, `turn7-rockslide-{a,b,c,d}.json`
**256/256/256/19**, `turn6-rockslide-a.json` **255/255**, `turn6-menu.json`
**33/33**, all 0 diff. Turn 8 is resolved end to end except its own feather
sub-window - the next session's natural next step is rung (b) analogues for
BOTH turns 7 and 8's own feather probes (still deferred, banked together),
then turn 9 (ROCK_SLIDE's own return, one `LEFT` press back from BIND, per
docs/turn8-notes.md §7) as the next parameterization, or the turn 15+/16+
scout territory already banked.

## 34. Engine slice Q (dedicated feathers step): rung (a) partially cracked - a real same-priority draw-order bug found and fixed (425px residual, down from ~2000+px, 9/129 ticks exact) but NOT a full 0-diff crack; rungs (b)/(c) landed - `turn7-feathers.json` **16/16**, `turn8-feathers.json` **33/33**, both 0 diff (S7 bounded worker session, hard 60-minute cap)

### Rung (a): cracked partially - real bug, not yet the full fix

Per the brief's own method discipline (hand-derive one mismatched pixel,
then generalize): `drawTurn6FeatherSprites`' sort was `.sort((a,b) =>
b.priority - a.priority)`, a no-op tiebreak for same-priority feathers
(`Array.sort` is stable, so ties kept the probe's own ascending-slot
insertion order - meaning the HIGHEST slot in a same-priority group was
always drawn last, i.e. on top). Checked against real hardware semantics
(`reference/pokeemerald/src/sprite.c`'s `SortSprites`/`BuildSpritePriorities`):
the real OAM buffer sorts by `(subpriority, oam.priority)` ascending, and
lower-index OAM slots draw IN FRONT at equal priority. All 8
`gFallingFeatherSpriteTemplate` spawns share one `subpriority`
(`Cmd_createsprite`'s `subpriority_offset` argument is 0 on every
`createsprite` line in `data/battle_anim_scripts.s`'s `Move_FEATHER_DANCE`),
so ties fall through to `SortSprites`' own secondary key: sprite Y position
(ascending-Y sprites end up LATER in the sort for a genuine tie, i.e. the
LARGER-Y sprite draws in front) - **but this is for a truly fresh sort each
frame**, and the real `sSpriteOrder` array is persistent/incremental
(`SortSprites` runs a single insertion-sort PASS over the PREVIOUS frame's
own order every `BuildOamBuffer` call, not a fresh full resort), so neither
a pure "current Y" model nor a pure "creation-order/slot" model is
guaranteed to reproduce it exactly - the true state depends on the entire
history of swaps since each sprite's own creation.

Tested empirically on the cheapest repro window (7421-7440, then the fuller
7421-7549):
- **Descending-slot tiebreak** (lower slot drawn last/on top - matching the
  hardware's own "lower OAM index wins ties" rule, using this codebase's own
  `slot` as a stand-in for OAM index since it IS the real per-spawn OAM
  index here): cut the window's total mismatched pixels from ~2000+ (the
  old ascending-slot behavior, growing 1-53px/tick) to **425px across 129
  ticks, 9 ticks landing exact matches** (`compareFeatherDrawOrder`,
  `src/engine/featherDance.ts`) - shipped, since it strictly beats the old
  arbitrary tiebreak and doesn't touch the already-green 7307-7420 prefix
  (re-verified 106/106 unchanged).
- **Ascending-slot tiebreak** (the opposite direction): reproduces the OLD
  behavior exactly (byte-identical results) - confirms the fix is a real
  direction call, not noise.
- **Descending-Y tiebreak** (current RAM `y+y2`, larger Y drawn last/on
  top - the theoretically "more correct" rule per `SortSprites`' own
  secondary key, ASSUMING a fresh resort every frame): 445px total, only 8
  exact ticks - slightly WORSE than the slot-based fix, and the residual's
  worst spikes simply MOVED to different ticks (7430's 30px spike vanished,
  but 7446-7450/7512-7516 gained new ~15-30px spikes) rather than shrinking.
  This is the single most informative negative result: it rules out "a
  fresh per-tick Y-sort" as the complete model, and is consistent with the
  `sSpriteOrder` persistence theory above (a fresh resort each tick
  necessarily disagrees with an incrementally-maintained array once their
  histories diverge).
- **Lead (b) (half-pixel sampling-center convention) was NOT tested** this
  session - the ordering investigation (lead (a)) consumed the rung's
  budget once it started paying off. Flagged for whoever picks this up
  next: the remaining residual's pixels are still soft blend-looking edge
  tones (same signature §29 first noted), consistent with lead (b) still
  being live independently of the ordering question.

**Verdict**: rung (a) is a real, evidence-based, load-bearing fix (kept),
but not the full crack the brief hoped for. `turn6-feathers.json` stays
at its committed **106/106** (extending it is still not achievable at 0
diff - the first extended tick, 7421, still mismatches by 1px under the
fix). Pinned with 2 new tests against real probe data (tick 7429's 4-way
same-priority overlap in `turn6-feather-sprites-probe.json`) plus the
comparator's own priority-first ordering.

### ISSUES #23 check (per the brief's own instruction)

Does NOT obviously explain #23's signature - checked, not assumed. #23's
own residual (`docs/dragon-breath-notes.md`, ISSUES.md) is characterized as
a **single-sprite, scale-regime** defect (salt-and-pepper over-draw when
`|matrixA|>256`, an isolated missing blob when `|matrixA|<256`, with a
4-variant sampling-convention sweep already ruling out a rounding-offset
fix) - there is no mention of multiple concurrently-live same-priority
DRAGON_BREATH projectiles competing for the same pixel the way FEATHER_DANCE's
8 feathers do, and a draw-ORDER fix cannot produce a "missing blob" (only a
"wrong winner" where two sprites already both cover the same pixel). Different
mechanism, not generalized.

### Rungs (b)/(c): turn 7 and turn 8's own feather tables + windows, landed

`tools/probe/dump-feather-dance-sprites.py` reused verbatim (no changes)
against fresh spec copies of each turn's own real script
(`tools/probe/specs/turn7-feathers.json`/`turn8-feathers.json`, each just
`{segments}` sliced from that turn's own already-committed trace - confirmed
byte-identical to `turn7-rockslide-a.json`/`turn8-bind-a.json`'s own
segments before reuse). Both twice-run byte-identical
(`src/data/gen/turn7-feather-sprites-probe.json`, RAM 8434-8600;
`turn8-feather-sprites-probe.json`, RAM 9483-9660).

**New finding, same shape both turns**: the exact same +8-tick spawn-group
cadence and ~121-tick per-sprite lifetime turn 6's own table established
recur unchanged - turn 7 spawns at RAM 8438/8446/8454/8462/8470 (turn 6:
7404/7412/7420/7428/7436, a flat +1034 shift matching the press-tick
delta), despawns complete by RAM 8591; turn 8 spawns at RAM
9484/9492/9500/9508/9516, despawns complete by RAM 9637. Both confirmed via
the same `inUse && template===0x08596388` filter turn 6's own probe used
(naively trusting raw `inUse` alone is wrong here too - both slots get
reused by an unrelated sprite well before each probe's own end tick, same
caveat `FEATHER_LAST_RAM_TICK` already existed to guard against).

`featherDance.ts` generalized from one hardcoded table to a small factory
(`makeFeatherSpriteLookup(probe, lastRamTick)`) so `turn6FeatherSprites`'
own shape instantiates twice more (`turn7FeatherSprites`/
`turn8FeatherSprites`, cutoffs 8591/9637) with no duplicated lookup logic.
`drawTurn6FeatherSprites` (`battleScene.ts`) takes an optional lookup
function (default `turn6FeatherSprites`) so `drawTurn7FeatherDanceKickoffText`/
`drawTurn8FeatherDanceKickoffText` pass their own turn's table instead of
turn 6's own (which silently returned `[]` for their ticks before this
session - a harmless no-op, now a real render).

**Render-lag re-verified, not assumed**: bisected `FEATHER_RENDER_LAG=0`
against both new windows explicitly (not just trusted from turn 6) -
badly wrong both times (2/16 and 18/33 matches, vs. 16/16 and 33/33 at the
shared `+1`), confirming the same lag class carries over unchanged.

**Both new windows hit the identical residual rung (a) characterizes above**,
at the same relative offset from each turn's own spawn timeline (first
mismatch at turn7 render tick 8455 = 17 ticks after first spawn 8439, vs.
turn 6's own first mismatch at 7421 = 17 ticks after 7405; turn 8's first
mismatch at 9501 = 17 ticks after 9485) - concrete confirmation this is a
property of the SHARED mechanism/ordering rule, not a turn-6-specific
artifact, exactly as `docs/battle-turn-notes.md §29` predicted it would be
if unfixed. Matching turn 6's own reduced-scope precedent, each new trace
covers only the clean prefix before its own first mismatch:
`tools/compare/traces/turn7-feathers.json` (captureFrames 8439-8454, 16
frames) and `turn8-feathers.json` (captureFrames 9468-9500, 33 frames),
both **0 diff**. 2 new Tier-1 pins mirror the existing `turn6FeatherSprites`
first-live-tick pin.

### What's left

The same-priority draw-order residual (rung (a), all three turns now share
it at the same relative offset) - still open, with a sharper set of
eliminated conventions than before (ascending-slot, descending-slot,
descending-Y all tried; the half-pixel sampling-center lead untried). A
future session's best lead: model `sSpriteOrder`'s own PERSISTENT
insertion-sort state directly (seed an order at each sprite's own spawn
tick, apply `SortSprites`' real swap condition per tick using the probe's
own Y values) rather than a fresh full resort by any single key - or
pursue the half-pixel lead independently, since it may be a second,
additive effect on top of whatever the ordering rule turns out to be.
Extending `turn6/7/8-feathers.json` past their own residual onset is
gated on that crack. `turn6-menu.json`'s own previously-excluded 7348-7350
ticks remain unverified (unchanged from §28/§29). Turns 9+ as further
parameterizations, unchanged.

### Verification

`npm test` **865/865** (+6: 2 `compareFeatherDrawOrder` pins, 2
`turn7FeatherSprites`/`turn8FeatherSprites` pins, 1 updated exact-equal pin
for the new `slot` field, net of no removals). `npm run build` green.
`turn6-feathers.json` **106/106** (unchanged), `turn7-feathers.json`
**16/16**, `turn8-feathers.json` **33/33**, all 0 diff. Zero regressions:
`turn6-featherdance.json` **90/90**, `turn6-menu.json` **42/42**,
`turn7-menu.json` **91/91**, `turn8-menu.json` **86/86**,
`turn5-sitrus-a.json` **110/110**, all 0 diff.

## 35. Engine slice R rungs (a)+(b): ISSUES #29 fixed in full (both families) + turn 9's menu-reopen/LEFT-nav/confirm/QUICK_ATTACK-kickoff-text chain landed clean - `turn9-menu.json` **111/111, 0 diff**; QUICK_ATTACK's own animation + everything downstream (impact, drain, message, ROCK_SLIDE, turn end) NOT modeled this session - RAM-probed and precisely characterized, not guessed (S7 bounded worker session, hard 60-minute cap)

### Rung (a): ISSUES #29's fix, both families

Re-ran `tools/probe/verify-issues29-rule.py` first (policy) - both families
PASS. Applied both rules named in the entry: **Family A** -
`drawTurn6ActionMenuIdleWindow`/`drawTurn7RockSlideTurnEndSettledMenu` each
gained an optional `bounceTick`/`bounceRawTick` param (default `t`, every
existing unshifted caller unaffected); `drawTurn6FightSubmenuWindow`/
`drawTurn8FightSubmenuWindow`'s own `sm.openElapsed !== null && t <
revealTick` branches now pass `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`
explicitly instead of plain `t`. `drawTurn7FightSubmenuWindow`'s own
analogous branch (calling `drawTurn6RockSlideTurnEndSettledMenu`) was
deliberately left untouched - not named in the probe's own evidence, and
this session's regression sweep shows no diff there either. **Family B** -
`turn7KickoffBounceTick`'s pre-freeze branch now returns `t -
FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` instead of plain `t`.

Restored all 6 named ticks: `turn6-menu.json` **44/44**, `turn7-menu.json`
**93/93**, `turn8-menu.json` **88/88**, all 0 diff. 6 new Tier-1 pins
(`tests/battleScene.test.ts`, "ISSUES #29 fix" describe block): each
family's fixed formula matches the committed RAM dumps exactly at all 6
restored ticks, each paired with a pre-fix-mismatch proof. Turn 6/8's own
kickoff wrappers (the entry's own open flag) were NOT preemptively changed -
the full regression sweep (below) shows their own kickoff windows at 0 diff,
unchanged counts, so the open flag resolves by evidence, not by code change.
ISSUES #29 deleted. Full detail: `docs/bounce-blip-notes.md`'s own "Fix
landed (S7 engine slice R rung (a))" section.

### Rung (b): turn 9's own FIGHT-submenu reopen through QUICK_ATTACK's kickoff text

docs/turn9-notes.md is the dossier (headline: Pidgeotto does NOT reuse
FEATHER_DANCE a 4th time - it switches to QUICK_ATTACK, a first-time
priority move, hit; Onix's ROCK_SLIDE also hits). This rung covers the
reopen through the kickoff text's own settled plateau, one tick before the
animation's first pixel change (10929) - the parameterization template is
turn 8's own §33 slice, same "new dispatcher, mostly-reused helpers" shape.

- **State plumbing**: `turn8Resolved: boolean` added to `BattleSceneState`
  (mirrors `turn1Resolved`..`turn7Resolved` exactly) - `core.ts` sets it once
  turn 8's own BIND-miss resolution redraws the settled menu
  (`TURN8_MENU_REDRAW_DELAY` past turn 8's own real confirm - directly
  usable as the reopen-gate delay too, the SAME "no synthetic anchor needed"
  shape `TURN4_ROCKSLIDE_MENU_REDRAW_DELAY` already established, since
  BIND's own confirm is real, not a kickoff-duration-dependent synthetic
  anchor) AND a fresh A-press registers.
- **Cursor persistence + LEFT nav**: `openFightSubmenu`'s existing
  `initialCursor` param seeds cursor 1 (BIND, where turn 8 left it);
  `moveFightCursor`'s existing `cursor^1` arithmetic (already generic since
  slice F) moves it back to 0 (ROCK_SLIDE) on the `LEFT` press - genuinely
  exercised in the opposite direction from turn 8's own `RIGHT`, no new nav
  code. The confirm gate (`core.ts`, `cursor === 0 || 1 || 2`) already
  accepted cursor 0 - no change needed.
- **PP ledger**: `currentPPForActiveMon` gained a `turn8Resolved` param
  decrementing slot 1 (BIND) by 1 - a miss still spends PP, matching
  turn9-notes.md §4's own "BIND(20) 19/20 (unchanged)" ledger. ROCK_SLIDE
  (slot 0) stays frozen at 4/10, untouched by this new independent
  decrement.
- **A 4th bounce regime**: turn 8's own BIND-miss resolution redraws the
  settled menu fresh (9997), resetting `menuIdleBounce`'s own phase onto a
  FOURTH regime - `TURN9_REGIME4_TO_REGIME1_SHIFT`/`drawTurn9FieldBase`
  solve the same algebraic anchor-shift identity `drawTurn7FieldBase`/
  `drawTurn8FieldBase` already establish, one redraw further; `TURN8_BIND_
  PRESS_TICK` (9425) is the first "historical anchor" constant this session
  needed purely so turn 9's OWN fresh `FightSubmenuState` (whose own
  `confirmElapsed` is a LATER, different tick) can still reuse turn 8's
  settled-menu function verbatim, the same "past-turn anchor" shape
  `TURN6_ROCKSLIDE_PRESS_TICK`/`TURN7_ROCKSLIDE_PRESS_TICK` already
  establish for ROCK_SLIDE.
- **QUICK_ATTACK's kickoff text**: "Foe PIDGEOTTO used\nQUICK ATTACK!" -
  timing fit directly against a fresh `bin/oracle run` of this session's own
  `turn9-menu.json` (NOT hand-derived from the dossier's own loose prose
  range, which turned out to be approximate: the doc's own "10878-10929"
  range undershoots the real first-pixel-change tick by 4 - the actual sha
  stays flat through 10881, first changes at 10882; `TURN9_QUICKATTACK_TEXT_
  DELAY = 11` fit against this engine's own real pressTick, 10871, cross-
  checked against the dossier's own PNG-read characters at 10886 ("Foe P",
  5 chars) and 10898 ("Foe PIDGEOTTO use", 17 chars) - both match exactly
  under the standard 1-char/tick model once the correct start tick is used).
  A concrete instance of this dossier's own recurring caution: prose ranges
  in ground-truth docs are for orientation, not a substitute for the oracle
  itself when fitting an exact render constant.
- **Turn order**: `getWhoStrikesFirst`'s own nonzero-priority branch
  (`!bothPriorityZero && !priorityEqual`) gets its first REAL-scenario
  exercise this arc - QUICK_ATTACK's `priority: 1` (confirmed in
  `src/data/gen/moves.json`) forces Pidgeotto to act first regardless of
  Onix's own Speed, RAM/pixel-confirmed (`gBattlerAttacker` flips 0->1 at
  10876; the kickoff text reads QUICK_ATTACK before ROCK_SLIDE). 3 new
  Tier-1 pins (`tests/turnOrder.test.ts`): the real turn-9 battler pair
  reproduces the real order, AND a synthetic variant (Onix given an
  inflated Speed) confirms priority decides it independent of this specific
  pair's own 1-point speed margin (which alone doesn't distinguish "priority
  matters" from "speed already agreed") - `turnOrder.ts` itself is NOT wired
  into the render path yet (this session only extends the FIGHT-submenu
  render dispatcher, not a turn-resolution engine), so this pins the pure
  logic module only, not an end-to-end render exercise.

### What was NOT modeled this session (honest scope accounting)

**QUICK_ATTACK's own animation** (the brief's own "RAM-probe first"
mandate) - `tools/probe/dump-task-and-sprite-callbacks.py` run against
`battle1-turn9-dense.json` from tick 10870, symbols resolved via `arm-none-
eabi-nm` against the pinned ELF. Confirmed directly against
`reference/pokeemerald/data/battle_anim_scripts.s`'s own `Move_QUICK_
ATTACK` script (`loadspritegfx ANIM_TAG_IMPACT`, `AnimTask_
TranslateMonEllipticalRespectSide` (attacker lunge), `AnimTask_
TraceMonBlended` (afterimage/streak sprites), `AnimTask_ShakeMon` (target
shake) + a hitsplat sprite):

- Task activity window: **10925-10949** (tasks 0-3 active: `AnimTask_
  TranslateMonElliptical_Step` 10928-10933, `Task_UpdateMonBg` 10925-10946,
  `AnimTask_TraceMonBlended_Step` 10928-10944, `AnimTask_ShakeMon_Step`
  10934-10943).
- Sprite slots: **2** (Pidgeotto's own real sprite) flips to `SpriteCB_
  SetInvisible` for the duration (the real mon sprite is hidden while the
  translate/trace effect substitutes for it - a common GBA battle-anim
  trick); **3**/**4** host `AnimMonTrace` (the blended afterimage/streak
  sprites, alternating as the elliptical path advances); **7** hosts a
  helper sprite (`RunStoredCallbackWhenAffineAnimEnds` -> `DestroyAnimSprite`
  - almost certainly the hit-splat, `create_basic_hitsplat_sprite` in the
  script). First real pixel change: tick **10929** (confirmed both by this
  probe and by the `turn9-menu.json` compare run's own diff onset).
- Genuinely more involved than any prior turn's own kickoff animation
  (elliptical translation + alpha-blended afterimage trace sprites + a
  shake + a hitsplat, vs. the prior arc's plain stat-fall banners/rock
  props) - not attempted this session given the remaining time budget;
  banked here as concrete RAM ground truth (task/sprite inventory, exact
  window) for whoever picks this up, rather than a guess.
- Everything downstream of the animation (impact + Onix's own HP drain
  31->24, the "It's not very effective.." message, the unattributed RNG
  step, ROCK_SLIDE's own kickoff+resolution+drain 82->61, "It's super
  effective!", and the turn-end redraw into turn 10) is ALSO not modeled
  this session - it's script-sequential after the animation, so landing it
  without the animation would mean rendering something for 10929-11450 with
  no pixel-correctness guarantee. Deferred as one contiguous block rather
  than guessed at piecemeal.
- **Out of scope, per the brief**: ISSUES #30 (a sibling worktree owns it
  this round) and #23.

### Committed traces and Tier-1 pins

`tools/compare/traces/turn9-menu.json` (new, 88 segments = `turn8-bind-
b.json`'s own 82-segment/10826-frame base + `battle1-winline-b-swap.json`'s
own segments[80:86] verbatim - the same base-script-reuse convention every
prior turn boundary trace already follows; captureFrames 10818-10928, 111
frames, the reopen through the kickoff text's own settled plateau one tick
before the animation's first pixel change). `tests/battleMenu.test.ts` (+3):
the turn-9 PP ledger, the reopen-gate-delay identity, and QUICK_ATTACK's own
text timing (cross-checked against 2 PNG-read character counts).
`tests/turnOrder.test.ts` (+3): the real turn-9 battler pair's own order,
plus the priority-overrides-a-losing-pair-speed synthetic check.

### Verification

`npm test` **877/877** (+12: 6 ISSUES #29 pins, 3 turn-9 PP/timing pins in
`battleMenu.test.ts`, 3 `turnOrder.test.ts` pins). `npm run build` green.
`turn9-menu.json` **111/111, 0 diff**. Zero regressions: `turn6-menu.json`
**44/44**, `turn7-menu.json` **93/93**, `turn8-menu.json` **88/88**,
`turn8-bind-a.json` **256/256**, `turn8-bind-b.json` **66/66**, `turn7-
rockslide-d.json` **19/19**, `turn6-rockslide-a.json` **255/255**,
`turn6-feathers.json` **106/106**, `turn6-featherdance.json` **90/90**,
`turn7-feathers.json` **16/16**, `turn8-feathers.json` **33/33**, all 0
diff.

## 36. S7 slice R rungs (c)+(d) scout: QUICK_ATTACK's animation window RAM-probed exhaustively - a §35 sprite-slot CORRECTION plus 3-4 distinct concurrent lag classes found, none resolved to a pixel-exact render this session (bounded worker, hard-cap reached during probing) - no `src/` changes, `npm test`/`npm run build` unchanged-green

Per the standing RAM-probe-first mandate, this session built and ran a new
probe (`tools/probe/dump-quickattack-anim.py`, committed - dumps x/y/x2/y2/
`invisible`/`objMode`/`matrixNum`/`paletteNum`/`inUse` for an explicit sprite-
slot list, plus `BLDCNT`/`BLDALPHA`, plus `gBattlerSpriteIds[0..1]`, over any
tick range) against `battle1-turn9-dense.json`'s own committed ticks
10870-10995, cross-checked against fresh `bin/oracle run` pixel captures at
20 spot ticks (sha256 + connected-component pixel-diff analysis, not
eyeballed). **Ran out of session time bisecting the render-lag puzzle below
before landing any new engine code** - this section banks the ground truth
so the next session can skip re-probing.

### Correction to §35: the real sprite is slot 5, not slot 2

§35's own `dump-task-and-sprite-callbacks.py` run inferred "sprite slot 2 =
Pidgeotto's own real sprite" from symbol-name proximity in that script's
output. This session RAM-read `gBattlerSpriteIds` directly (the authoritative
battler-to-sprite-slot map) at every tick 10870-10995: **battler 1
(Pidgeotto) = slot 5, battler 0 (Onix) = slot 6**, constant throughout.
Slot 2 is unrelated - `inv=1`/`x2=y2=0` for the ENTIRE probed window
(10870-10995), never touched by this animation at all. Corrected inventory:
**slot 5** = Pidgeotto's real sprite (goes invisible for the window), **slots
3/4** = the `AnimTask_TraceMonBlended` afterimage copies (matches §35's
count, wrong slot numbers), **slot 7** = the hitsplat (§35 had this one
right). Lesson for future probes: cross-check a task/callback-pointer probe's
own slot inference against `gBattlerSpriteIds` directly before trusting it -
symbol-proximity in a raw pointer dump is not the same as confirming which
slot a given battler's sprite actually occupies.

### The lunge/trace/hitsplat window (RAM ticks 10925-10946, `pressTick`=10867 confirmed)

Per-tick table (RAM, not yet render-lag-adjusted):

| RAM tick | slot 5 (real, Pidgeotto) | slot 3 | slot 4 | slot 6 (Onix) | slot 7 (hitsplat) |
|---|---|---|---|---|---|
| 10924 | visible, x2=y2=0 | - | - | x2=y2=0 | - |
| 10925-10927 | **invisible**, x2=y2=0 | - | - | x2=y2=0 | - |
| 10928 | invisible, x2=-17,y2=2 | **created**, x2=-17,y2=2, objMode=1 | - | x2=y2=0 | - |
| 10929 | invisible, x2=-24,y2=6 | frozen at -17,2 | - | x2=y2=0 | - |
| 10930 | invisible, x2=-17,y2=11 | frozen at -17,2 | - | x2=y2=0 | - |
| 10931 | invisible, x2=0,y2=12 | frozen at -17,2 | - | x2=y2=0 | - |
| 10932 | invisible, x2=16,y2=11 | frozen at -17,2 | - | x2=y2=0 | - |
| 10933 | invisible, x2=24,y2=6 | frozen at -17,2 | **created**, x2=24,y2=6, objMode=1 | x2=y2=0 | - |
| 10934 | invisible, x2=0,y2=0 | frozen at -17,2 | frozen at 24,6 | x2=y2=0 | **created**, (72,88), objMode=1 |
| 10935 | invisible, 0,0 | frozen at -17,2 | frozen at 24,6 | x2=y2=0 | present |
| 10936-10937 | invisible, 0,0 | **destroyed** | frozen at 24,6 | x2=**5**,y2=0 | present |
| 10938-10939 | invisible, 0,0 | **recreated**, x2=0,y2=0 | frozen at 24,6 | x2=0,y2=0 | present |
| 10940 | invisible, 0,0 | frozen at 0,0 | frozen at 24,6 | x2=5,y2=0 | present |
| 10941 | invisible, 0,0 | frozen at 0,0 | **destroyed** | x2=5,y2=0 | present |
| 10942-10943 | invisible, 0,0 | frozen at 0,0 | - | x2=y2=0 | present |
| 10944-10945 | invisible, 0,0 | frozen at 0,0 | - | x2=y2=0 | **destroyed** |
| 10946 | invisible, 0,0 | **destroyed** | - | x2=y2=0 | - |
| 10947 | **visible**, 0,0 | - | - | x2=y2=0 | - |

`BLDCNT`=`0x3f40` / `BLDALPHA`=`0x080c` (EVA=12, EVB=8) RAM-flat for the
WHOLE 10928-10946 span, 0/0 outside it. **This is exactly the `eva=12,
evb=8` ratio `drawSpriteSheetBlended`/`blendedTile` already implement
verbatim for DOUBLE_TEAM's own clone** (`docs/battle-menu-notes.md` §10) -
no new blend primitive is needed, only a timing table plus Pidgeotto's own
(undarkened - QUICK_ATTACK's trace, unlike DOUBLE_TEAM's clone, is not
palette-tinted, per the oracle captures below) palette.

**The render-lag puzzle that ran out the clock**: pixel-diffed 20 spot
captures against a 10924 baseline (sha256 + connected-component bboxes, not
eyeballed).  Observed pixel truth: **0 diff through render tick 10928**,
first diff at **10929** (matching slot 3's RAM creation at 10928 via the
usual "render = RAM+1 creation lag" rule this codebase already established
elsewhere), diffs continue through **10946**, then **0 diff again at
10947**. But slot 5's own `invisible` flag flips in RAM at **10925**, three
ticks before any pixel evidence of Pidgeotto changing at all - and slot 3's
own destruction (10946) leaves NOTHING drawn for Pidgeotto in RAM, yet the
render at 10947 already shows Pidgeotto fully normal again. **Neither a
uniform 0-tick nor 1-tick lag reconciles both ends** - the real sprite's own
hide and un-hide instants appear to lag differently from the trace sprites'
own creation/destruction, a genuinely distinct 3rd (or 4th) lag class this
session could not isolate before the cap. Flagged, not guessed at.

### The target-shake's second episode (RAM ticks ~10957-10976): RAM alternates, pixels don't always

A second, later shake episode was RAM-confirmed on slot 6: **`y2` alternates
+1/-1 every tick**, not the earlier episode's `x2=+5/0`. Component-labeled
pixel diffs (connected-component analysis, not just whole-frame sha) show
Onix's own sprite bbox (`44,49-99,111`) changing as expected, PLUS a cluster
of small pieces in `x=127-229,y=74-110` (Onix's own healthbox + border
sub-pieces moving in lockstep) - the same "three sprites shake together"
shape `docs/battle-menu-notes.md` §15f's own ENDEAVOR healthbox-wobble/
flicker tail already established, not re-derived from source this session.
**Surprising finding**: three widely-spaced sample ticks (10960, 10970,
10977 - spanning both RAM parities of the `y2` alternation) produced
**pixel-identical diff counts (3243) at all three**, meaning this
particular 1px `y2` alternation does not always cross a rendered pixel
boundary for this sprite/region - don't assume "RAM value changes every
tick" implies "rendered pixels change every tick" without checking.

### Not probed this session (time-boxed, honestly deferred)

HP drain (Onix 31->24, dossier's approximate window 10986-11001), the
message-box-open transition into "It's not very effective.." (dossier's
approximate 11005-11008), and the settled hold itself (11018-11092) were
NOT RAM/pixel-fit this session - `docs/turn9-notes.md`'s own prose ranges
remain the best starting point but are explicitly approximate per the
standing fresh-oracle-constants rule (§35's own papercut), not to be trusted
directly. **`drawPlayerHealthboxHpOverlay`/`playerHealthboxHpOverlayForHp`
(`battleScene.ts`) are already generic over arbitrary HP** and ready to show
Onix's own first-ever damage this arc (`drawPlayerHealthboxHpOverlay(fb,
24)`) once the transition timing is fit - no new HP-bar code needed, same
`calcBarFilledPixels`/`pickHpBarBand` machinery already drives the
green->yellow->red color transition purely from `hpFraction` (confirmed by
inspection this session, not re-derived).

### Rung (d) (ROCK_SLIDE) not attempted

Structurally depends on rung (c) landing first (the trace script's own
render must reach a correct prefix before ROCK_SLIDE's own kickoff can be
appended and pixel-verified) - not started this session. Precedent is strong
and ready to reuse once rung (c) lands: turn 6/7's own `drawTurn6RockSlide
Attack`/`drawTurn7RockSlideAttack` (§§ around `TURN6_ROCKSLIDE_PRESS_TICK`/
`TURN7_ROCKSLIDE_PRESS_TICK`) are the same Onix-vs-Pidgeotto ROCK_SLIDE
parameterization this turn needs again, and `calcBarFilledPixels`'s already-
generic color bands mean Pidgeotto's own green->yellow crossing (82->61,
first sub-50% HP pixel-confirmed in this arc per `turn9-notes.md` §5) needs
no new UI code either.

### Verification

No `src/` changes. `npm test`/`npm run build` unchanged from §35's own
green state. New: `tools/probe/dump-quickattack-anim.py` (committed).

## 37. S7 slice R rung (c) RETRY: puzzle #1 (real-sprite hide/unhide) RESOLVED by direct pixel evidence - the `invisible` RAM bit never gates rendering at all; implementation attempt hit a still-unfixed position bug and was reverted rather than committed broken (bounded worker, ran out of cap mid-bisection)

Per the retry brief's own mandate ("instrument, don't guess"), pulled fresh
`bin/oracle run` PNGs (not just sha256) at every tick 10924-10950 of
`battle1-turn9-dense.json`'s own script (captureFrames override, scratch
trace, not committed) and eyeballed 4x-upscaled crops of the Pidgeotto
region (`x:130-215,y:10-90`) at the key transition ticks. **This directly
answers §36's own puzzle #1**: at RAM ticks 10925-10927 (`invisible=true`
in RAM, `x2=y2=0`), the rendered pixels are BYTE-IDENTICAL to the
pre-lunge baseline (10924) - not a blank/hidden sprite. And at render tick
10933, the PNG shows **two distinct, both fully-opaque-looking Pidgeotto
shapes** overlapping (one at the frozen afterimage's own position, one at
the real sprite's own translating position) - impossible if the real
sprite were actually hidden by its own `invisible` bit, since a hidden
real sprite would leave only ONE shape (the afterimage) on screen, not
two. **Conclusion, pixel-proven not guessed**: the `invisible` RAM field
this arc's probes have been reading does not correspond to on-screen
sprite visibility for this animation at all - the real sprite (slot 5) is
drawn continuously for the WHOLE window, at its own `x2`/`y2` (§36's
table), same "render = RAM tick + 1" lag already established from the
afterimage creation boundary (10928 creates -> 10929 first pixel diff).
There is no 3rd/4th lag class for the real sprite specifically - one lag
convention covers the real sprite AND both afterimages, once `invisible`
is correctly discarded as a red herring. This closes puzzle #1 outright;
do NOT re-probe it.

### The implementation attempt: wrong on-screen position, reverted honestly

Wrote `erasePidgeottoFootprint` (`eraseGrovyleFootprint`'s own DOUBLE_TEAM-
proven shape, reusing `healthboxBackgroundColorAt` as-is - it is already
generic over any screen `(x,y)`, confirmed by reading it, not assumed) plus
a lunge-offset table and an afterimage-offset table, both keyed by
`ramTick - pressTick` off `pressTick=10867` (§36's own "confirmed" anchor),
applied at the established +1 render lag, real sprite drawn last (on top of
both blended afterimages) so same-position overlaps come out opaque, which
DOES match the tick-10929 single-solid-shape PNG evidence structurally.
**Wired into `drawTurn9FightSubmenuWindow`'s post-text-settle branch,
`npx tsc --noEmit` clean, then compared against fresh oracle PNGs
(scratch trace, ticks 10924-10950): 0 diff outside the window exactly as
expected (10924-10928, 10947-10950 all match), but WRONG inside it
(10929-10946 all DIFF, ~1000-4300px each)** - a 4x-upscaled crop at 10929
showed the oracle's Pidgeotto shifted visibly up-left (crest nearly
touching the frame top) while this implementation's own render at the same
tick came out nearly indistinguishable from the unshifted baseline -
**not a subtle sign flip, the offset is barely showing up on screen at
all**, suggesting either (a) `pressTick=10867` doesn't actually line up
with the LIVE `sm.confirmElapsed`-derived `pressTick` this dispatcher
branch actually receives (§36's own probe may have anchored "10867" to a
different reference event than the real `A`-press tick the engine uses -
not cross-checked this session), or (b) an axis/scale error in how `x2`/
`y2` map onto this engine's `ox`/`oy` sprite-sheet corner (untested:
whether the opponent side needs an X-mirror the player side wouldn't, the
same category of gotcha `battle-menu-notes.md` has flagged for other
per-side sprite transforms before). **Not root-caused before the cap** -
reverted `src/engine/battleScene.ts` outright rather than commit a
0%-passing rung, per the standing "never commit a red/wrong step" rule.
`git status` confirms clean revert; `npm test` 877/877 and `npm run build`
both re-verified unchanged-green post-revert.

### Precise handoff for the next attempt

1. **First**, before touching the offset tables again: instrument the
   ACTUAL live `pressTick` value this dispatcher branch computes for this
   exact trace (`TICK0 + sm.confirmElapsed` at the real turn-9 confirm) and
   diff it against `10867` directly - a `console.log`/tiny unit assertion
   is cheap and would have caught a mismatch in seconds; this session
   skipped it and paid for the omission.
2. The lunge table (RAM-tick-keyed, `x2`/`y2` from §36's own per-tick
   table) and the afterimage lifetime ranges (slot 3: RAM 10928-10935 at
   (-17,2), gap 10936-10937, RAM 10938-10945 at (0,0); slot 4: RAM
   10933-10940 at (24,6)) are believed RAM-accurate (straight transcription
   of §36's own table, not re-derived) - the bug is in how they're
   *applied* to screen coordinates, not in the table values themselves.
3. Bisect fast with the same tool this session used: a scratch trace
   (`captureFrames` override on the committed `battle1-turn9-dense.json`
   script, NOT committed) + `npm run compare` + 4x `PIL` crops of
   `x:130-215,y:10-90` at ticks 10929/10933/10935 - those three alone
   distinguish "no offset applied," "offset applied but mirrored/scaled
   wrong," and "offset applied correctly but afterimage z-order wrong."
4. `erasePidgeottoFootprint`/the two offset-table functions/the dispatcher
   wiring are all straightforward to re-add (this doc's own prose above has
   the exact shape) - the fix is very likely a one-constant or one-sign
   change once (1) is answered, not a rewrite.
5. Hitsplat (slot 7, center `(72,88)`, `ANIM_TAG_IMPACT`-shaped per
   `drawEndeavorHitsplats`'s own 10-tick pop-then-hold precedent - §36's
   table shows the SAME 10-tick lifetime, RAM 10934-10943) and Onix's
   shake episode 1 (`x2` square-wave `5,5,0,0,5,5,0,0` over RAM
   10936-10945, slot 6) are both still within this session's already-probed
   10924-10950 window and were NOT attempted (time) - natural next
   sub-rungs once the real-sprite position bug is fixed, same "verify
   against fresh PNGs, not the dossier's prose" rule. Shake episode 2
   (~10957-10976, the parity puzzle) and (c4)/(d) remain fully unprobed
   this session, unchanged from §36's own scope.

### Verification

`erasePidgeottoFootprint`/lunge-table/afterimage-table code was written,
type-checked clean, pixel-compared against fresh oracle PNGs, found wrong,
and reverted (`git checkout -- src/engine/battleScene.ts`) rather than
committed - **no `src/` changes landed this session**, same honest-scout
shape as §36. `npm test` 877/877, `npm run build` green, both re-verified
post-revert. No new committed tooling this session (the scratch trace used
for the PNG comparisons was not committed, matching every prior session's
"scratch stays scratch" convention).

## 38. S7 slice R rung (c) RETRY #3: the mandatory diagnostic CONFIRMS suspect (1) - the LIVE `pressTick` is 10871, not §36/§37's assumed 10867 - rung (c1) (lunge + erase-footprint) lands clean, `turn9-quickattack.json` **112/112, 0 diff**; rung (c2) (afterimage clones) attempted, gets close but NOT 0-diff, reverted rather than committed broken (bounded worker)

Per the retry brief's own mandatory first step, instrumented the LIVE
dispatcher (`tools/compare/scratch/diag-quickattack-anchor.ts`, committed -
runs `battle1-turn9-dense.json`'s own script through the real `core.ts`
`tick()`, printing `battleScene.fightSubmenu.confirmElapsed` at the key
render ticks) instead of re-guessing:

```
frame=10929 confirmElapsed=9831 openElapsed=9787 closeElapsed=null
frame=10933 confirmElapsed=9831 openElapsed=9787 closeElapsed=null
frame=10940 confirmElapsed=9831 openElapsed=9787 closeElapsed=null
frame=10946 confirmElapsed=9831 openElapsed=9787 closeElapsed=null
```

`TICK0(1040) + confirmElapsed(9831) = 10871`, confirmed constant across the
whole window (`confirmElapsed` is a one-time snapshot at confirm, not a
live counter - `battleMenu.ts:956`). **This IS suspect (1), confirmed, not
eliminated**: §36/§37's own anchor (10867) is 4 ticks early. Cross-checked
that `turn9-menu.json` and `battle1-turn9-dense.json` share byte-identical
`segments` (same button script, only `captureFrames` differs) - so this
10871 is the correct anchor for BOTH traces, not a script mismatch.
(§37's own doc-comment claim that the shipped `TURN9_QUICKATTACK_TEXT_DELAY`
=11 was fit against a "10878 first-changing-tick" observation at assumed
pressTick 10867 doesn't algebraically reconcile with the live 10871 either -
not re-derived this session, flagged for whoever next touches that comment,
but doesn't block this rung since the shipped constant is empirically
correct regardless of the comment's own arithmetic.)

**Suspect (2) (axis/mirror error) was checked by precedent, not empirically
needed**: `drawDoubleTeamClones` (`GROVYLE_CORNER.x + offsets.a`) and
`endeavorShakeX2`'s own call site (`ONIX_MATERIALIZE_CORNER.x + shakeX2`)
both apply RAM-read `x2` via plain addition to the opponent-side corner,
no mirror - the same convention this session's own fix uses
(`PIDGEOTTO_CORNER.x + offset.x2`). This turned out sufficient (see
results below) - suspect (2) never needed invoking.

### Rung (c1): lunge + erase-footprint - LANDED

`turn9QuickAttackLungeOffset` (a 6-entry `x2`/`y2` table, RAM 10928-10933,
the real sprite's own out-and-back curve) + `erasePidgeottoFootprint`
(`eraseGrovyleFootprint`'s own shape, `pidgeottoFrontSprite`/
`PIDGEOTTO_CORNER` swapped in) + `drawTurn9QuickAttackLunge` (erase, redraw
opaque at the offset) wired into `drawTurn9FightSubmenuWindow`'s
post-text-settle branch, keyed off the LIVE `pressTick` (already correctly
computed in that scope) with delay constant `57` (`10928-10871`, NOT the
reverted attempt's `61`). `npx tsc --noEmit` clean, `npm test` **880/880**
(3 new Tier-1 tests pinning the offset table against the RAM ground truth
directly), `npm run build` green.

Compared against fresh oracle PNGs (scratch trace, ticks 10924-10950,
`captureFrames` override on `battle1-turn9-dense.json`'s own script, not
committed): **0 diff at every tick 10924-10929** (previously the reverted
attempt's own failure point) - the lunge's own FIRST active tick (render
10929, table index 0) is now pixel-exact. Committed `tools/compare/traces/
turn9-quickattack.json` (`turn9-menu.json`'s own script, `captureFrames`
extended from its 10928 boundary to 10929) - **112/112, 0 diff**, one tick
past every prior session's own boundary and the first tick this whole rung
has ever landed. Regressions all still green: `turn9-menu.json` **111/111**,
`turn8-menu.json` **88/88**, `turn1-cloneanim.json` **230/230** (the last
two exercise the same `drawDoubleTeamClones`/`eraseGrovyleFootprint`-shaped
machinery this session's own new code mirrors).

**Honest scope of what's proven**: only render 10929 (table index 0) is
independently pixel-verified in isolation - table indices 1-5 (renders
10930-10934) only become verifiable once the afterimage clones (below) are
also modeled, since real hardware shows BOTH at once past 10929. The c2
diagnostic below is strong circumstantial evidence the lunge table's
remaining entries are also correct (diff shrinks to near-zero once
afterimages are added, not just "still wrong") but this is not a proof.

### Rung (c2): afterimage clones - attempted, NOT landed, reverted

Added the two `AnimTask_TraceMonBlended` clones (slots 3/4) via
`drawSpriteSheetBlended` (same `eva=12/evb=8` `drawDoubleTeamClones`
already established, undarkened palette per §36's own note), fixed
(non-translating) positions per §36's table, delays fit the same
live-pressTick-relative way as the lunge (`n = ramTick - 10871`, ranges
`[57,64]`+`[67,69]` for slot 3's two lives, `[62,69]` for slot 4).
`npx tsc --noEmit` clean. Compared against the same fresh-PNG scratch
window: **diff pixel counts shrank substantially at every tick this change
touches** (10930: 1125->705px, 10931: 1181->789px, 10932: 1195->429px,
10933: 1180->123px, 10934: 1125->39px) - confirming the general approach
(delays, positions, blend ratio, real-sprite-drawn-last ordering) is
directionally correct, but **none reached 0** - not a clean rung. Tick
10935 gained a large NEW diff (2308px) matching the hitsplat's own creation
tick (RAM 10934, render 10934+1) - expected/out-of-scope (rung (c3)), not
a regression from this change.

Ruled out one candidate before reverting: the `isOpponentHealthboxOpaqueAt`
skip mask on the blended clone draws - removed it entirely, diff counts
were byte-for-byte IDENTICAL (705px etc., unchanged) at every tick, so the
mask isn't gating anything in this region; not the cause.

4x-cropped tick 10930 (`x:110-220,y:5-90`) side-by-side: the real sprite's
own silhouette/position looks right, but the region where the trace-1
afterimage should show through renders as a flatter, less-detailed brown
patch versus the oracle's own finer striped wing detail at the same spot -
suggestive of either a wrong blend target-2 sample (background color read
at the wrong pixel) or a subtly wrong afterimage position/timing (the
"frozen" window boundaries weren't independently re-verified against fresh
RAM, only transcribed from §36's own table) - **not root-caused before
time ran out**, reverted (`erasePidgeottoFootprint`'s caller now only
draws the lunge again, matching the "never commit an unverified/partial
rung as if it were green" rule) rather than land a shrunk-but-nonzero diff.

### Verification

`npm test` **880/880** (877 + 3 new), `npm run build` green.
`tools/compare/traces/turn9-quickattack.json` (new, committed) **112/112,
0 diff**. `turn9-menu.json` **111/111**, `turn8-menu.json` **88/88**,
`turn1-cloneanim.json` **230/230**, all re-verified unchanged. New
committed tooling: `tools/compare/scratch/diag-quickattack-anchor.ts` (the
live-pressTick instrument - reusable for any future turn's own anchor
diagnostic). The c2 attempt's own code was written, tested, found short of
0-diff, and reverted - not committed broken.

### Handoff for rung (c2) retry

1. The delay constants transcribed above (`[57,64]`, `[67,69]`, `[62,69]`,
   all relative to live pressTick 10871) are believed right (same fit
   methodology as the now-proven lunge table) but were NOT independently
   RAM-reverified this session - worth a fresh RAM probe at exactly the
   boundary ticks (10935/10936/10937/10938 for slot 3's gap, 10940/10941
   for both slots' final destruction) before assuming the residual is a
   position bug rather than a boundary-tick bug.
2. The blend math itself (`blendedTile`/`drawSpriteSheetBlended`) is
   unchanged, proven code (turn 1/4's own `turn1-cloneanim.json` 230/230
   still green) - the residual is more likely in WHICH pixels get blended
   (position/timing) than the blend formula.
3. Bisect fast the same way this session did: scratch `captureFrames`
   override on `battle1-turn9-dense.json` + `npm run compare` + 4x `PIL`
   crops at `x:110-220,y:5-90` for ticks 10930/10933/10935 (before slot
   4/hitsplat get involved) - isolate slot 3 alone first (temporarily
   stub slot 4 out) before debugging both afterimages at once.
4. Hitsplat (slot 7, `(72,88)`-shaped per `drawEndeavorHitsplats`'s own
   10-tick precedent) and Onix's shake episode 1 remain fully unattempted
   (rung (c3)), unchanged from §37's own scope.

## 39. S7 slice R rung (c2) LANDED: QUICK_ATTACK's two afterimage clones, 0-diff through the whole provable window - a boundary-transcription bug, a blend-target-2 bug, a creation-lag bug, and a "feet stay grounded" clip, all found by RAM re-probe + oracle-PNG bisection, none guessed (bounded worker session)

Per the retry-#3 handoff's own mandatory first step, re-probed RAM directly
(`dump-quickattack-anim.py` against `battle1-turn9-dense.json`, ticks
10924-10947) before touching any render code, rather than trusting §36's
transcribed table.

### Step 1: fresh RAM re-probe - confirms the boundaries, catches a real transcription bug

Slot 3/4's `inUse`/`x2`/`y2`/base `x,y`/`priority`/`objMode`/`paletteNum`/
`hFlip`/`vFlip` re-read directly, independent of §36's own table:

| RAM tick | slot 3 | slot 4 |
|---|---|---|
| 10928-10935 | alive, `(x2=-17,y2=2)` | - |
| 10936-10937 | **destroyed** (gap) | - |
| 10938-10945 | alive again, `(x2=0,y2=0)` | - |
| 10933-10940 | (life1 above still running) | alive, `(x2=24,y2=6)` |
| 10946 | destroyed | - |
| 10941 | - | destroyed |

This CONFIRMS the boundary ticks the brief flagged (10935-10938 gap,
10940-10941 destruction) exactly as §36/§38 transcribed - **except slot 3's
SECOND life**, which §38's own handoff transcribed as `n=[67,69]` (RAM
10938-10940 only). The fresh probe shows slot 3 still `inUse` through RAM
**10945**, a full 8-tick life, not 3 - the handoff's own range was truncated
5 ticks short. Corrected to `n=[67,74]` (RAM 10938-10945). Slot 4's own
range (`n=[62,69]`, RAM 10933-10940) re-confirmed exactly as transcribed.
Base `x,y` for all three slots (3/4/5) are bit-identical (`176,51`) whenever
`inUse`, confirming the same corner-offset formula (`PIDGEOTTO_CORNER +
x2,y2`) applies uniformly - no per-slot mirror/scale difference.
`hFlip`/`vFlip` are `0` throughout for all three slots (checked directly,
not assumed) - ruling out a flip-based explanation for anything downstream.

### Step 2 (isolate-then-add-back, collapsed once the real bugs were found)

The brief's own plan was to isolate slot 3 alone before adding slot 4 back.
In practice the first implementation attempt (both slots wired at once,
corrected boundary table, `real-sprite-drawn-last` ordering per §38's own
description of the reverted attempt) reproduced §38's EXACT prior diff
counts at ticks 10930-10934 (705/789/429/123/39px) - proving the boundary
fix alone doesn't move the needle, and that the residual is NOT an
ordering/erase-clobbering issue (the leading hypothesis going in). Cropping
`x:110-220,y:5-90` and diffing pixel-by-pixel (not eyeballing) showed every
pixel my code's clone code actually painted (vs. a no-clone baseline)
matched the oracle exactly (420/420) - the clone itself was already right
wherever it drew anything. The remaining diff was a full Pidgeotto
silhouette shape, entirely outside the clone's own painted region - i.e.
the REAL SPRITE's own redraw, not the clone, was the dominant remaining
bug. This resolved isolating slot 3 from slot 4 as moot (neither was the
root cause) and pointed at two separate, independent defects instead.

### Bug 1: `blendedTile`'s target-2 must be the live framebuffer, not the plain static background, when a clone overlaps the real sprite

`BLDCNT=0x3f40` (§36) decodes to target-1 mask `000000` (nothing explicitly
selected - only forced-blend semi-transparent OBJs participate) and
target-2 mask `111111` (ALL BG layers + OBJ + backdrop). `blendedTile`
(shared with `drawDoubleTeamClones`) prefers the plain static field
background over `fb` for target-2 - correct for DOUBLE_TEAM, whose clones
never overlap another same-priority OBJ, but wrong here: QUICK_ATTACK's
clones DO overlap the real sprite, and hardware's target-2 mask says a
semi-transparent OBJ blends against whatever's visually beneath it,
sprite included. Fix: a new `blendedTileOverFb`/`drawSpriteSheetBlendedOverFb`
pair (`battleScene.ts`) that blends against the CURRENT `fb` pixel
unconditionally, and the draw order is real-sprite-first (opaque), clones
last (blended on top) - the opposite of §38's own "real sprite drawn last"
description of the reverted attempt, which this session's own evidence
contradicts directly (see Bug 2 below for why the naive "clone first, real
last" order breaks a pixel that's ALREADY proven exact).

### Bug 2: a freshly-created clone needs ONE MORE tick of latency than the general render=RAM+1 lag before its first blended pixel

With Bug 1's fix alone (clone-blends-over-fb, real-sprite-opaque-first),
render 10929 - already proven exact by rung (c1) alone - REGRESSED
(1076px). Cause: slot 3's first life's own naive window (`render=RAM+1`,
i.e. starting render 10929) coincides EXACTLY with the lunge table's own
first entry (`x2=-17,y2=2` at both) - drawing the clone there blends
`blendChannel(c, c, 12, 8)` (color-with-itself), which does NOT reproduce
`c` because `eva+evb=20≠16` (this ratio doesn't preserve identity under
truncating integer blend math). Fix: both clone offset functions
(`turn9QuickAttackSlot3Offset`/`turn9QuickAttackSlot4Offset`) now require
one EXTRA tick past the ordinary render=RAM+1 lag before a life's first
active render tick (window starts shift from RAM+1 to RAM+2; the END of
each life is unaffected, still RAM+1 - confirmed necessary by checking the
tail: uniformly shifting BOTH ends by the extra tick broke the
already-correct disappearance ticks 10945-10947, so only the START needed
it). Slot 3's own life-1 start is the only one of the three starts
independently pixel-provable this rung (10929 must stay exact); slot 3's
life-2 start and slot 4's own start get the same fix by the same
reasoning (a freshly-allocated semi-transparent OBJ's OAM copy needs an
extra frame before it's meaningful) but both fall inside rung (c3)'s own
unmodeled hitsplat window and so are NOT independently pixel-confirmed
this session - flagged honestly, not asserted as proven.

### Bug 3: the real sprite's own feet stay grounded (unmoved) through the whole lunge

Even with Bugs 1+2 fixed, ticks 10930-10934 (excluding the two endpoints,
which happen to have small `y2`) still showed small (39-109px) residuals,
ALL confined to screen `y>=74`, tracking the real sprite's CURRENT `x2` but
NOT its `y2` (onset stayed fixed at `y=74` regardless of whether `y2` was 6,
11, or 12). Diffing oracle-at-tick-10930 against oracle-at-baseline
(10924, pre-animation) directly (not the app) confirmed: at `y>=74` the two
are BYTE-IDENTICAL - the true render leaves the feet exactly where they
sit in the settled baseline, never translating them, while `y<74`
(body/head/wings) DOES move with the lunge. Fix: `TURN9_QUICKATTACK_LUNGE_
GROUND_CLIP_Y=74` - both `erasePidgeottoFootprint` (now takes an optional
`maxY`) and the real sprite's own redraw (`drawSpriteSheetClippedBelow`,
new) skip any pixel at screen `y>=74`, leaving the settled draw's own feet
untouched below that line for the whole lunge. `74` is an absolute screen
coordinate, not a tile-row boundary (`74 - PIDGEOTTO_CORNER.y(19) = 55`,
mid-row) - pixel-fit, not guessed from the tileset's own grid.

### Result: 10930-10934 all land 0-diff, extending past this rung's actual provable ceiling

With all three fixes: ticks 10924-10934 all 0-diff (a scratch 27-frame
window, `captureFrames` override on `battle1-turn9-dense.json`, ticks
10924-10950) - the ENTIRE window this rung can prove without rung (c3)'s
own hitsplat (RAM-created 10934, render 10935 by the ordinary lag, per
§36's own table) obscuring further ticks. 10935-10944 all show nonzero
diff (1708/454/454/1708/1708/657/657/1669/1669/415px) - exactly the
hitsplat's own unmodeled footprint, confirmed by the diff's own onset
tick (10935) matching the hitsplat's RAM-creation+1 lag precisely, same
"expected, out-of-scope, not a regression" call §38 already made for this
same boundary. 10945-10950 all 0-diff again (past the hitsplat's own
destruction). Committed `turn9-quickattack.json`'s `captureFrames`
extended `112->117` (10930-10934 added), **117/117, 0 diff**. Regressions
re-verified 0 diff: `turn9-menu.json` **111/111**, `turn8-menu.json`
**88/88**, `turn1-cloneanim.json` **230/230**.

### Committed code and Tier-1 pins

`src/engine/battleScene.ts`: `turn9QuickAttackSlot3Offset`/
`turn9QuickAttackSlot4Offset` (exported, RAM-tabled per above),
`blendedTileOverFb`/`drawSpriteSheetBlendedOverFb` (blend against live
`fb`), `drawSpriteSheetClippedBelow` (ground-clip redraw),
`erasePidgeottoFootprint` extended with an optional `maxY`,
`drawTurn9QuickAttackAnimation` (replaces the old `drawTurn9QuickAttack
Lunge` name - now dispatches the lunge AND both clones together, real
sprite opaque first, clones blended last). 8 new Tier-1 tests pin both
offset functions' life boundaries directly against the RAM-reverified
ranges above (`tests/battleScene.test.ts`) - suite **880->888**.

### Handoff for rung (c3) (hitsplat + Onix's shake episode 1)

Unattempted this session (ran out of cap after landing (c2) - the
investigation above took the full session). Per §37/§38's own scope note:
hitsplat is slot 7, RAM-created 10934 (render 10935 by the ordinary lag),
center `(72,88)`, shaped per `drawEndeavorHitsplats`'s own 10-tick
pop-then-hold precedent (same 10-tick lifetime RAM 10934-10943 per §36's
table). Onix's shake episode 1 is slot 6, `x2` square-wave `5,5,0,0,5,5,0,0`
over RAM 10936-10943 (this session's own fresh probe confirms this pattern
exactly, extending one cycle further right to RAM 10940-10941 = `5,5` too -
see the RAM table in Step 1 above). Once (c3) lands, it will ALSO
retroactively confirm (or refute) Bug 2's own untested half (slot 3's
second-life start, slot 4's own start) since the hitsplat's own render
window overlaps both. Rung (d) (ROCK_SLIDE) continues to wait on (c)
landing a correct prefix, unchanged from §36/§37/§38's own scope notes.

### Verification

`npm test` **888/888** (880 + 8 new), `npm run build` green.
`tools/compare/traces/turn9-quickattack.json` **117/117, 0 diff**
(extended from 112). `turn9-menu.json` **111/111**, `turn8-menu.json`
**88/88**, `turn1-cloneanim.json` **230/230**, all re-verified unchanged.
No new committed tooling this session (the RAM re-probe reused
`tools/probe/dump-quickattack-anim.py`, already committed; the scratch
oracle-PNG comparison trace was not committed, per the standing "scratch
stays scratch" convention).

## 40. S7 slice R rung (a) LANDED: turn 10's FIGHT-submenu reopen, zero-nav, `turn10-menu.json` **83/83, 0 diff**; rung (b) (AERIAL_ACE's animation) RAM-probed to a concrete 5-mechanism inventory but NOT implemented - one mechanism (a "cutting slice" sprite) needs a genuinely new asset, out of this session's remaining cap (bounded worker session)

### Rung (a): the reopen, landed clean

`docs/turn10-notes.md` is the dossier (headline: both published lines
reconverge a second turn running - Pidgeotto's AERIAL_ACE hits Onix
24->14, Onix's ROCK_SLIDE hits Pidgeotto 61->38). This rung covers just
the FIGHT-submenu reopen through AERIAL_ACE's own kickoff text settling
(12262-12344), one tick before the animation's first pixel change (12345,
rung (b)) - the same "new dispatcher, mostly-reused helpers" shape
turns 8/9's own slices established.

- **State plumbing**: `turn9Resolved: boolean` added to `BattleSceneState`
  (mirrors `turn1Resolved`..`turn8Resolved`), gated in `core.ts` on
  `fightSubmenu.confirmElapsed` (turn 9's own live confirm, LEFT+A) plus
  `TURN9_MENU_REDRAW_DELAY` - a fresh A-press reopens FIGHT for turn 10 at
  cursor 0 (default, ROCK_SLIDE - **zero navigation presses**, matching
  the dossier's own headline finding).
- **PP ledger**: `currentPPForActiveMon` gained a `turn9Resolved` param
  decrementing slot 0 (ROCK_SLIDE) a 7th time - `turn10-notes.md` §4's own
  "ROCK_SLIDE(157) 3/10" ledger, PNG-confirmed directly against a fresh
  `turn10-menu.json` capture (12281: "PP 3/10").
- **A real bug found along the way**: the settled-menu content for the GAP
  between turn 9's own (unmodeled, out-of-scope) resolution and turn 10's
  own button press is **not** gated by `turn9Resolved` at all (a button-
  press flag can't explain a redraw that happens automatically, with no
  player input, mid-resolution) - it's a pure-`t` redraw check inside turn
  9's OWN existing dispatcher (`drawTurn9FightSubmenuWindow`), the exact
  same shape `drawTurn7RockSlideWindow`/`drawTurn8BindWindow`'s own
  `redrawTick` branches already establish. First attempt wired the
  settled-menu render behind `turn9Resolved` alone and produced a 19-24%
  diff at every pre-press tick (the app kept showing turn 9's own frozen
  "Foe PIDGEOTTO used\nQUICK ATTACK!" text all the way to 12272) - caught
  immediately by comparing the app's own rendered PNG against the oracle's
  at tick 12262, not guessed. Fixed by adding a `t >= pressTick +
  TURN9_MENU_REDRAW_DELAY` branch inside `drawTurn9FightSubmenuWindow`
  itself (dispatching to a new `drawTurn9TurnEndSettledMenu`) - safe
  because it only fires for `t >= 11445`, far past `turn9-quickattack.
  json`'s own committed window (ends at 10934), so it cannot regress that
  trace's own 0-diff status, and it does NOT claim 10934-11444 (QUICK_
  ATTACK's impact/drain/ROCK_SLIDE/turn-end) is modeled - still entirely
  out of scope (rungs c3/c4/d).
- **`TURN9_MENU_REDRAW_DELAY` fresh-oracle-bisected, not taken from prose**:
  `turn9-notes.md` §5 cites the visual settle at tick 11450
  (`11450-10871=579`), but the underlying bounce TASK resets 5 ticks
  EARLIER (574) - the same small "RAM reset precedes visual settle" gap
  `MENU_BOUNCE_RAM_SETUP_TICK`'s own doc already flags for the very first
  menu ever drawn. Found by bisecting: tried every delta from -5 to +8
  against a fresh `turn10-menu.json` capture (a scratch script re-rendering
  the app side against the already-captured oracle PNGs, no need to re-hit
  the oracle service per candidate) - only delta -5 (574) produced 0/83
  mismatches; every other value produced 5-46. A repeat of turn 9's own
  §38 lesson (a 4-tick anchor error burned two sessions) - caught this time
  in one bisection pass instead of a guess.
- **AERIAL_ACE's own kickoff text**: "Foe PIDGEOTTO used\nAERIAL ACE!" -
  `TURN10_AERIALACE_TEXT_DELAY=11` fit directly against the fresh capture
  (first char at 12316, fully typed and settled by 12344 - the SAME
  11-tick delay QUICK_ATTACK's own kickoff text used, `TURN9_QUICKATTACK_
  TEXT_DELAY`, not re-derived from scratch since both are the standard
  "used move" message cadence).

**Committed**: `tools/compare/traces/turn10-menu.json` (92 segments =
`turn9-quickattack.json`'s own 88-segment/12272-frame base + `battle1-
turn10-dense.json`'s own segments[88:92] verbatim - the turn-10 submenu-
open `A`, 30f settle, confirm `A` with no navigation press, and a 1000f
idle; captureFrames 12262-12344, 83 frames). 4 new Tier-1 pins (`tests/
battleMenu.test.ts`): the PP ledger, the bounce-reset anchor identity,
`turn9ResettledBounceTick`'s own re-init shape, and AERIAL_ACE's text
timing (cross-checked against the PNG-read settle tick).

### Rung (b): RAM-probed, NOT implemented - a concrete 5-mechanism inventory, one needs a new asset

Per the brief's own mandatory-first-step rule, RAM-probed BEFORE reading
source or attempting any render code (`tools/probe/dump-task-and-sprite-
callbacks.py` then `tools/probe/dump-quickattack-anim.py`, both reused
unchanged, against `battle1-turn10-dense.json` ticks 12340-12440),
cross-read against `Move_AERIAL_ACE`'s own battle-anim script
(`reference/pokeemerald/data/battle_anim_scripts.s:4350`):

```
Move_AERIAL_ACE:
	loadspritegfx ANIM_TAG_CUT
	monbg ANIM_TARGET
	setalpha 12, 8
	createvisualtask AnimTask_TranslateMonEllipticalRespectSide, 2, ANIM_ATTACKER, 24, 6, 1, 5
	createvisualtask AnimTask_TraceMonBlended, 2, 0, 4, 7, 3
	createsprite gCuttingSliceSpriteTemplate, ANIM_ATTACKER, 2, 40, -32, 0
	playsewithpan SE_M_RAZOR_WIND2, SOUND_PAN_ATTACKER
	delay 5
	createvisualtask AnimTask_ShakeMon, 2, ANIM_TARGET, 0, 3, 10, 1
	complex_palette_blend ... color1=RGB_BLACK, blend_y1=10, color2=RGB_BLACK, blend_y2=0
	playsewithpan SE_M_RAZOR_WIND, SOUND_PAN_TARGET
	waitforvisualfinish
	clearmonbg ANIM_TARGET
	blendoff
	end
```

Battler sprite slots this turn: **battler0 (Onix) = slot 6, battler1
(Pidgeotto) = slot 5** - genuinely different slots than turn 9's own
QUICK_ATTACK window (slot 2 was Pidgeotto there); slot 2 is allocated but
inert (`inv=1`, x2/y2 flat 0) throughout this whole window, not reused
this turn. Five distinct concurrent mechanisms, task/sprite RAM-tabled
exactly (render tick = RAM tick + 1, the standing convention):

1. **Pidgeotto's own elliptical lunge** (slot 5, the REAL sprite, never
   invisible) - `AnimTask_TranslateMonElliptical_Step` active RAM
   12359-12364 (render 12360-12365, 6 ticks): `x2,y2` = `(-17,2), (-24,6),
   (-17,11), (0,12), (16,11), (24,6)`, back to `(0,0)` at render 12366 - a
   symmetric out-and-back arc, SHORTER and shaped differently than QUICK_
   ATTACK's own lunge table (script params `24, 6, 1, 5` vs. QUICK_ATTACK's
   own different args) - needs its own fresh table, not a parameterization
   of `TURN9_QUICKATTACK_LUNGE_TABLE`.
2. **Onix's own shake** (slot 6, the REAL sprite - `invisible` toggles
   true/false across this window but, per §37's already-proven "the
   `invisible` bit never gates rendering" rule, this is NOT evidence the
   sprite stops drawing) - `AnimTask_ShakeMon_Step` active RAM 12366-12384
   (render 12367-12385); `y2` square-wave `3,3,0,0` repeating over render
   12369-12384 (4 full cycles, 16 ticks) - matches the script's own
   `AnimTask_ShakeMon, ..., 0, 3, 10, 1` params (amplitude 3). Simpler than
   turn 9's own shake episode (§39), a clean 2-tick-on/2-tick-off square
   wave, no ramp.
3. **Two blended trace/afterimage clones** (slots 4 and 7, `AnimMonTrace` -
   the SAME task/sprite mechanism `turn9QuickAttackSlot3Offset`/
   `drawSpriteSheetBlendedOverFb` already model for QUICK_ATTACK, plausibly
   parameterizable): slot 4 active render 12360-12368 then 12370-12378 (two
   short lives, `x2,y2` flat `(-17,2)` first life then `(0,0)` second -
   distinct from slot 5's own moving lunge, confirms clones sample a FIXED
   pose, not a live copy); slot 7 active render 12365-12373 only, `x2,y2`
   flat `(24,6)` - the two clones sample the lunge's own start/end
   extremes, not its middle.
4. **A background palette-blend pulse** (slot 8's own callback,
   `AnimComplexPaletteBlend_Step1`->`Step2`, render 12367-12375, matching
   `complex_palette_blend ... color1=RGB_BLACK, blend_y1=10, blend_y2=0` -
   NOT a sprite at all, an IO-register-driven background darken-then-
   restore, same family as `evaEvb`/`complex_palette_blend` mechanisms
   this codebase already models elsewhere for other moves, unconfirmed
   whether an existing helper covers this exact shape).
5. **A "cutting slice" sprite** (slot 3, `gCuttingSliceSpriteTemplate`,
   `AnimSlice_Step` - **genuinely new to this dossier's arc, no existing
   mechanism to parameterize**): active render 12360-12378 (`AnimSlice_
   Step`), then `WaitAnimForDuration` 12379-12382, `DestroyAnimSprite` at
   12383, gone by 12384. `x2,y2` moves LINEARLY diagonal, `(-4,4)` at
   12360 stepping ~`(-4,+4)`/tick out to a held `(-63,62)` from 12379-12383
   (a straight claw-slash streak across the screen, not an arc). Needs its
   own sprite graphic extracted (`ANIM_TAG_CUT`'s own graphics, not yet in
   `src/assets/gen/`) plus its own render routine - this is the one piece
   of the five that cannot be built by parameterizing existing code, and
   is why this rung was not attempted further this session (asset
   extraction + a new draw routine + its own render-lag/lifetime fit is a
   comparable scope to this whole rung (a), not a quick add-on).

**A second, independent hint for rung (c)**: the same probe shows sprite
slot 3 gets REUSED at render tick 12406 for `SpriteCB_HitAnimHealthbox
Effect` (through 12425) - a hit-flash effect starting well before the
dossier's own cited HP-drain window (12440-12452), useful ground truth for
whoever picks up rung (c) next, not chased further here (out of scope).

### What was NOT modeled this session (honest scope accounting)

Rung (b) (AERIAL_ACE's animation, 12345-12439) and rung (c) (ROCK_SLIDE +
both HP drains + turn-end through the turn-11 menu boundary, 12440-13306)
are both entirely unattempted past the RAM probe above - **no `src/`
render code was written or reverted for either**, since the probe above
was the only work done past rung (a)'s own landing; nothing was left
half-wired. The gap is now a NAMED, strictly smaller one than "all of turn
10 past the reopen": mechanisms 1-4 above are plausibly quick
parameterizations of existing code (elliptical translate, shake, blended
trace clones, palette pulse - all have a direct precedent elsewhere in
this file), mechanism 5 (the cutting-slice sprite) is the one genuinely
new asset+render piece blocking a full rung (b) landing.

### Verification

`npm test` **896/896** (892 + 4 new Tier-1 pins), `npm run build` green.
`turn10-menu.json` **83/83, 0 diff** (twice-verified: the official `npm
run compare` run and an independent scratch pixel-diff script against the
same captured oracle PNGs, both 0 mismatches). Zero regressions across the
full menu/rockslide/feathers/bind/cloneanim sweep: `turn9-menu.json`
**111/111**, `turn9-quickattack.json` **117/117**, `turn6-feathers.json`
**235/235**, `turn1-rockslide.json` **256/256**, `turn8-menu.json`
**88/88**, `turn7-menu.json` **93/93**, `turn6-menu.json` **44/44**,
`turn8-bind-{a,b}.json` **256+66**, plus every turn1-8 rockslide/endeavor/
feathers/sitrus/switchin/faint trace (32 more traces), all re-verified 0
diff at their existing counts - none reduced. No PAPERCUTS this session.

## 41. S7 slice R rungs (c4) and (d) LAND 0-diff (`turn9-quickattack-b.json` 77/77, `turn9-rockslide.json` 130/130, new); rung (c3) lands the shake HALF exactly but the hitsplat's own exact pixels stay a small named gap, and a genuine NEW mechanism (a brief whole-sprite hit-flash, 10983-10986) was found sitting between rungs (c4) and the HP drain - unmodeled, not in any prior dossier

Per the brief's own mandatory first step, `tools/probe/verify-turn9-postlunge.ts` ran **99/99 fresh** before any code was touched. Everything the 99 checks assert (ep1/ep2 region gating, HP-drain per-tick values, message text, settled-hold shas) reproduces exactly through the render code landed this session - the checks passed post-implementation too, unchanged.

### Rung (c4) and (d): fully landed, both new traces 0-diff

- **Ep2** (`turn9Ep2HealthboxWobbleY2`/`turn9Ep2OnixInvisible`, `battleScene.ts`): the 20-tick healthbox `y2` wobble and the SEPARATE 3-block Onix flicker, wired as two independent tables exactly per the brief's "do NOT couple them" instruction - both reuse `drawTurn6FieldBase`'s own call chain via two new threaded params (`onixInvisible`, `healthboxY2Override`, both default no-op so every one of the ~10 pre-existing callers is untouched).
- **HP drain** (`turn9OnixHp`, same shape as `endeavorOnixHp`, `TURN9_HP_DRAIN_START_DELAY=121`), **message reveal** (`TURN9_NOTVERYEFFECTIVE_LINE`, single-line per the shake-notes' own correction, 1 char/tick from render 11005), and the **settled hold** (a pure `t`-gated static render, no separate mechanism needed) all wired into a new `drawTurn9QuickAttackWindow` dispatcher that replaces the old "kickoff text held forever" stub.
- **Rung (d)** (`drawTurn9RockSlideAttack`/`drawTurn9RockSlideWindow`): a straight parameterization of turns 6/7's own ROCK_SLIDE precedent (`rockSlideBg3Y`/`rockSlideRockState`/`rockSlideDrawOrder`/`rockSlideMonShakeY2`/`rockSlideHealthboxWobbleY2`/`rockSlideMonBlinkInvisible`/`rockSlideOpponentHp`, all reused with ZERO changes), keyed off a new SYNTHETIC `TURN9_ROCKSLIDE_PRESS_TICK=10717` - chosen so `rockSlideTextStartTick` lands exactly on the fresh-oracle-pinned render 11110, then cross-confirmed (not just asserted) by the SHARED `ROCK_SLIDE_HP_DRAIN_START_DELAY=597`/`HIT_FLASH_RAM_ANCHOR_DELAY=562`/`ROCK_SLIDE_RAM_ANCHOR_DELAY=428` constants landing on 11314/11279/11145 - all matching `turn9-notes.md` §5's own independently-sourced tick citations for those same boundaries. `TURN9_SUPER_EFFECTIVE_TEXT_DELAY=624` fresh-fit (not transferable from turn 6/7's own values, per their own doc's standing rule) against the dossier's own cited transition tick (11341).
- Onix's own idle bounce during the WHOLE post-press window (QUICK_ATTACK through ROCK_SLIDE) is a single frozen tick (`turn9KickoffBounceTick`'s own regime-4 anchor) - `DoBounceEffect` never resets mid-turn, confirmed by reusing the identical frozen value across both halves rather than two different freeze points.
- **Committed**: `tools/compare/traces/turn9-quickattack-b.json` (new, 77 frames spanning 10945-11109 - ep2 through the settled hold) **77/77, 0 diff**; `tools/compare/traces/turn9-rockslide.json` (new, 130 frames spanning 11100-11365 - the kickoff transition through the settled "It's super effective!" hold) **130/130, 0 diff**. Both intentionally stop short of `pressTick+TURN9_MENU_REDRAW_DELAY` (11445, already correctly handled by the existing `drawTurn9TurnEndSettledMenu` - not re-claimed here) and short of the 11431-11444 text-clear transition (untouched, see gap below).

### Rung (c3): the shake half is exact; the hitsplat's own exact pixels are a genuine, narrower gap

`turn9Ep1OnixShakeX2` (Onix's own x2 shake, ep1) is **pixel-proven exact** - isolating the onix-silhouette region from the hitsplat's own overlapping box shows 0 diff at every ep1 tick. The hitsplat itself (`drawTurn9Hitsplat`) landed TWO real fixes found by fresh RAM probing (not assumed from ENDEAVOR's own precedent, per the brief's "fresh-oracle-verify" rule):
1. **Matrix is 303, not ENDEAVOR's 372** - RAM-read directly (`dump-endeavor-hitsplat-shake.py` against `battle1-turn9-dense.json`), NOT a shared engine constant as first assumed.
2. **The splat is force-blended against the live framebuffer at `eva=16,evb=16`** (a full-weight additive "lighten", `min(255,fg+bg)`), not drawn with ENDEAVOR's own flat `tintCoeff=0` opaque palette - oracle-pixel-caught (the flat palette's brightest color, `(255,255,173)`, undershoots the real screen's pure white) and solved directly from sampled bg/fg/result triples. New `drawSpriteSheetAffineStretchBlendedOverFb` primitive (mirrors `drawSpriteSheetAffineStretch`'s own affine sampling, blends against `fb` like `blendedTileOverFb`).

These two fixes took the hitsplat window's diff from ~1700px down to ~150-380px per tick (SSIM 0.05 -> 0.71-0.85), but did NOT reach 0 - the remaining residual is confined to the star's own TIPS/EDGES (a handful of pixels per tip landing on the wrong palette index, e.g. `(255,240,152)` vs the rendered `(255,255,214)`), consistent with a fine affine-scale-quantization difference this session didn't chase further (time-boxed). **Per the "never commit a non-0-diff capture" rule, `turn9-quickattack.json` was NOT extended past its existing 117 frames this session** - the hitsplat/shake code is landed and RAM-grounded (matrix, blend ratio, center, RAM span all independently confirmed), just not independently pixel-proven at 0-diff yet. Next step for whoever picks this up: dump the exact source-tile-index sampled at 2-3 of the mismatched tip pixels (RAM or a scratch oracle-vs-app pixel probe) and check whether the affine formula's rounding (`>>8` truncation) needs a rounding-to-nearest variant specifically for `doubled` mode, or whether the tip pixels are a dither pattern (see the flash finding below - a dither hypothesis was tested and ruled out for THAT mechanism via a positional-consistency check; the same check wasn't run against the hitsplat's own tips).

A SEPARATE, pre-existing residual was also found (NOT this session's own regression): slot 4's own clone (`turn9QuickAttackSlot4Offset`, landed by a prior session's rung (c2)) shows a small diff (~200px) specifically at its own tail ticks (10940-10941) that were never independently pixel-verified before (rung (c2)'s own proof stopped at 10934, before slot 4's life even starts). Also NOT resolved this session - flagged honestly rather than silently absorbed into "c3's gap."

### A genuine NEW discovery: Onix's own brief whole-sprite hit-flash (render 10983-10986), unmodeled

Oracle-caught while validating ep2's own boundary (`npm run compare` against a dense sweep 10975-10994): **exactly 4 ticks** (10983-10986, confirmed via a stride-1 sweep - 10982 and 10987 both match the normal render) show Onix's ENTIRE on-field sprite recolored toward a bright, slightly blue-white palette (e.g. a body pixel normally `(132,123,123)` reads `(247,247,255)` mid-flash) - sitting in the gap between ep2's own end (10979, `docs/turn9-shake-notes.md` §2) and the HP-drain sentinel (10992, §1's own addendum) that NEITHER prior dossier's own window covered (ep2's probe stopped at 10979; the HP-drain probe's own region checks were scoped to the healthbox HP-bar strip only, not Onix's whole silhouette). **Not a simple per-color blend**: sampling the SAME source color at different screen positions during the flash produced DIFFERENT flash colors (ruling out a fixed per-palette-index remap or a uniform `blendChannel`-toward-white formula), consistent with either a dithered/patterned recolor or a genuine palette-bank swap that needs a direct RAM read of `gPlttBufferFaded`/OBJ palette bank during these 4 ticks to pin down - not chased further this session (time-boxed after the rung (c3)/(c4)/(d) investigation used the full budget). **Entirely unmodeled** - `turn9-quickattack-b.json`'s own captureFrames deliberately exclude 10983-10986 (jumping from 10982 straight to 10987) so the committed capture stays 100% 0-diff; this is a real, narrow, four-tick gap for the next worker, not a byproduct of anything reverted this session.

### Committed code and Tier-1 pins

`src/engine/battleScene.ts`: `turn9Ep1OnixShakeX2`, `turn9Ep2HealthboxWobbleY2`, `turn9Ep2OnixInvisible`, `turn9OnixHp`, `TURN9_NOTVERYEFFECTIVE_LINE`/`turn9NotVeryEffectiveTextStartTick`/`turn9NotVeryEffectiveTextVisibleChars`, `drawTurn9Hitsplat`, `drawSpriteSheetAffineStretchBlendedOverFb` (new primitive), `TURN9_ROCKSLIDE_PRESS_TICK`/`turn9SuperEffectiveTextStartTick`/`turn9SuperEffectiveTextVisibleChars`/`drawTurn9RockSlideAttack`/`drawTurn9RockSlideWindow`, `drawTurn9QuickAttackWindow` (new dispatcher, replaces the old kickoff-text-held-forever stub). Threaded params (all defaulted, zero pre-existing callers touched): `onixX2`/`onixInvisible` on `drawTurn5RockSlideAttack`, plus `onixX2`/`onixInvisible`/`healthboxY2Override` on `drawTurn6FieldBase`/`drawTurn9FieldBase`; `maxY` on `drawSpriteSheetBlendedOverFb` (fixes a real bug along the way: QUICK_ATTACK's own afterimage clones weren't respecting the lunge's own ground-clip, visible only once rung (c3)'s own extended captures reached far enough to expose it). 21 new Tier-1 tests (`tests/battleScene.test.ts`) pin every new pure table/function directly - suite **896->917**.

### Verification

`npm test` **917/917**, `npm run build` green. `tools/probe/verify-turn9-postlunge.ts` **99/99 fresh**. New: `turn9-quickattack-b.json` **77/77, 0 diff**, `turn9-rockslide.json` **130/130, 0 diff**. Regression sweep unchanged: `turn9-quickattack.json` **117/117** (NOT extended, see gap above), `turn9-menu.json` **111/111**, `turn10-menu.json` **83/83**, `turn2-endeavor-drain.json` **201/201**, `turn1-rockslide.json` **256/256**. No PAPERCUTS beyond the standing mgba-venv-teardown one (already logged).

## 42. S7 slice R rung (b) IMPLEMENTATION: all five AERIAL_ACE mechanisms wired, mechanism 5 (the slice) fully 0-diff, mechanisms 1/3 (lunge+clones) landed for the FIRST active tick only, mechanism 2 (Onix shake) wired but pixel-unconfirmed, mechanism 4 (palette pulse) REVERTED (render-wrong, coefficient table kept) - `turn10-aerialace.json` **18/18, 0 diff**, a real but smaller-than-hoped provable window (12345-12362, one tick short of the lunge's OWN first residual) (S7 bounded worker session, hard 60-minute cap)

Per the brief's mandatory first step, `tools/probe/verify-turn10-aerialace.ts` ran **20/20 fresh** before any code was touched, and again unchanged after (still 20/20) - this script only re-derives pixel envelopes from a live oracle capture, so it can't by itself certify a render implementation; the real proof is `npm run compare` against fresh oracle PNGs, done exhaustively this session.

### What landed clean

- **Mechanism 5 (cutting-slice sprite)**: fully wired (`turn10AerialAceSliceState`, asset `battle-anim-cutting-slice.json` loaded via a new `battleAnimCuttingSlice`/`BattleAnimCuttingSliceAsset`), drawn with `drawSpriteSheetBlendedOverFb` at `eva=12,evb=8`. The dossier's own per-tick table turned out to be RAM-tick-indexed (not render-tick, despite its own column header) - resolved empirically this session by reconstructing frame 0's own local opaque-pixel bbox from the committed asset and matching it against the oracle's own 71px onset patch at render 12361: only `corner = base + x2/y2 - 16` (a CENTER-based OAM convention) with a uniform **+1** render lag (table row `n` visible at render `pressTick+n+1`) reproduces the exact bbox `(92,64)-(103,75)`. `npm run compare` confirms 0 diff at every tick 12345-12362 (the slice's own onset through its 3rd visible tick) - the full window past that is obscured by mechanism 1/3's own residual (below), not re-tested independently past 12362.
- **Mechanism 1 (Pidgeotto's lunge)**: RAM table wired at the dossier's own pinned **+2** render lag (`turn10AerialAceLungeOffset`). Its own first active tick (render 12362) is independently proven 0-diff (isolated by `npm run compare`, matches with zero contribution from mechanism 3). Ticks past that were NOT independently isolated from mechanism 3's own residual (below) this session.
- **Mechanism 2 (Onix's shake)**: wired (`turn10AerialAceOnixShakeY2`, ordinary +1 lag, `3,3,0,0` square wave over render 12370-12385) via a new `onixY2Extra` param threaded through `drawTurn5RockSlideAttack`/`drawTurn6FieldBase`/`drawTurn10FieldBase` (all defaulted 0, every pre-existing caller unaffected - confirmed by the full regression sweep below). Its own window (render 12370+) falls entirely PAST this session's own provable 12345-12362 capture, so it is coded per the dossier's RAM table and the verify script's own ON/OFF phase check, but **not independently pixel-confirmed** by this session's own `npm run compare` runs.

### Mechanism 3 (the two afterimage clones): a real, close, NOT-fully-closed residual

Applied the exact same asymmetric-lag shape `docs/battle-turn-notes.md` §39 already root-caused for QUICK_ATTACK's own clones (Bug 2: a freshly-created semi-transparent OBJ's first blended pixel needs ONE MORE tick of lag than its life's own end) - `TURN10_CLONE_START_RENDER_LAG=3` at each life's start, ordinary `+2` at each life's end. This closed the WORST of the residual (render 12362's own diff dropped from 1076px to 0, matching mechanism 1 alone) and, combined with reusing QUICK_ATTACK's own ground-clip constant (`TURN9_QUICKATTACK_LUNGE_GROUND_CLIP_Y=74`, applied to the real sprite's redraw + both clones' erase/blend footprint), shrank the remaining window from 705-1081px down to 0-695px, monotonically improving toward the tail (render 12367 lands exactly 0). But renders 12363-12366 still show a small, shrinking, unexplained residual (666/695/320/29px) confined to Pidgeotto's own upper silhouette (`x137-174,y31-73` - NOT the feet, so the ground-clip is not the remaining cause) - **not root-caused this session**, time-boxed. `npm run compare` scratch bisection (temporarily disabling the clones entirely) showed the residual is NOT purely a clone-position bug either (disabling the clones changes but doesn't zero the diff at those same ticks) - the remaining bug is most likely a small further correction to the LUNGE table's own early entries (indices 0-2) or a second, smaller lag/rounding effect neither the QUICK_ATTACK precedent nor the dossier's own tables anticipated. Flagged as a named gap, not guessed away.

### Mechanism 4 (palette pulse): REVERTED - the render application is badly wrong, the coefficient table is kept

Implemented `turn10AerialAcePaletteDarkenCoeff` (RAM-pinned: coefficient 10 for exactly render 12368-12370, 0 outside, per the dossier's own two-discrete-step finding) and wired a `BlendPalette`-toward-black render path (`darkenPaletteToward10`, applied to BG palette bank 1 + both battlers' OBJ palettes via new `turn10BgDarkPalette`/`turn10OnixDarkPalette`/`turn10PidgeottoDarkPalette` caches, threaded through `staticBgPixel`/`drawStaticBgShiftedY`'s new `paletteOverride` param). `npm run compare` showed this reproduces roughly the right AGGREGATE darkened area (my darkened BG-band fraction ~70% vs. the dossier's own cited ~78%) but is wrong at the PIXEL level - ~48-54% of the WHOLE FRAME mismatches at the plateau (render 12368-12370), an order of magnitude worse than any other residual this session found. Not root-caused (candidates not chased: wrong BG palette bank index - `battleBg.palette[1]` was chosen by RGB-proximity guesswork against the dossier's own `bgPal1c1` RAM sample, never independently re-confirmed against live palette-bank-number RAM; the OBJ palette darkening might need to exclude currently-inactive clones/the slice, which do NOT share the "battlers" selector; the message-window/healthbox exclusion was never modeled at all). **Per the "revert partial render code, keep the pure table" rule**: the coefficient function stays (exported, Tier-1-tested), but `drawTurn10AerialAceWindow` now hardcodes `darken=false` on every call - the darkened plateau is simply NOT rendered, matching the plain (undarkened) baseline instead. This mechanism needs a full fresh RAM read of the live palette-bank NUMBER (not just its color contents) before the next attempt - guessing the bank from color proximity is what went wrong here.

### Trace: `turn10-aerialace.json`, 18/18, 0 diff - honestly scoped short of the dossier's own full window

`tools/compare/traces/turn10-aerialace.json` = `turn10-menu.json`'s own script verbatim, `captureFrames` = `[12345..12362]` (18 frames - the kickoff text's own settled plateau through the slice's 3rd visible tick / the lunge's own first active tick, the last point this session could independently prove 0-diff). Per the brief's own "stop captures where your modeling ends" instruction, this does NOT reach the dossier's own full 12345-12389 envelope - mechanism 3's own residual (renders 12363-12366) and mechanism 4's own reverted render (renders 12368-12370) are the two blockers preventing extension; mechanism 2 is simply unverified past this point (its own window opens at 12370, past both blockers anyway).

### Verification

`npm test` **936/936** (921 + 15 new Tier-1 tests pinning every new pure table: `turn10AerialAceLungeOffset`, `turn10AerialAceSlot4Offset`/`turn10AerialAceSlot7Offset`, `turn10AerialAceOnixShakeY2`, `turn10AerialAcePaletteDarkenCoeff`, `turn10AerialAceSliceState`). `npm run build` green. `tools/probe/verify-turn10-aerialace.ts` **20/20 fresh**, re-run unchanged after implementation. `turn10-aerialace.json` **18/18, 0 diff** (new). Full regression sweep unchanged: `turn10-menu.json` **83/83**, `turn9-quickattack.json` **117/117**, `turn9-quickattack-b.json` **77/77**, `turn9-rockslide.json` **130/130**, `turn1-cloneanim.json` **230/230** - the new `onixY2Extra`/`darken` params threaded through `drawTurn5RockSlideAttack`/`drawTurn6FieldBase`/`drawTurn10FieldBase` and the new `paletteOverride` param on `staticBgPixel`/`drawStaticBgShiftedY` are all defaulted no-ops, confirmed by this sweep to not regress any pre-existing caller. New committed code: `src/engine/battleScene.ts` (all five mechanism functions + `drawTurn10AerialAceWindow`, `battleAnimCuttingSlice` asset load, `cuttingSliceFrameTileset`, `darkenPaletteToward10`/`turn10*DarkPalette` caches - unused-in-render for BG/Onix but kept since Pidgeotto's own darken path is still reachable in principle, dead code pending mechanism 4's own retry). No PAPERCUTS beyond the standing mgba-venv-teardown one.

### Handoff for whoever picks this back up

1. **Mechanism 3's residual** (renders 12363-12366, shrinking 666→29px): bisect the LUNGE table's own early entries first (indices 0-2) via a fresh RAM re-probe cross-checked against `npm run compare` scratch crops, before assuming it's clone-specific - the "disable clones" experiment this session ran shows the bug isn't purely in the clone code.
2. **Mechanism 4**: re-derive which BG palette bank number is ACTUALLY selector 31's own `F_PAL_BG` target via a direct RAM read of the live palette-bank index (not color-proximity guessing against the extracted static asset) before re-attempting the darken render.
3. Once both close, extend `turn10-aerialace.json`'s own `captureFrames` past 12362 through the dossier's own 12389 settle boundary in one pass (mechanism 2 becomes independently provable in the same extension, since its own window opens right where mechanism 4's plateau ends).

## 43. S7 slice R rung (a) LANDS 0-diff: turn 10's ROCK_SLIDE half wired end-to-end (kickoff through the turn-11 menu boundary) - `TURN10_ROCKSLIDE_PRESS_TICK=12169` through the existing turns-6/7/9-style dispatcher parameterization, plus Onix's own AERIAL_ACE-drain aftermath; rungs (b)/(c)/(d) (mechanism 4 palette-bank retry, mechanism 3's residual, aerialace trace extension) NOT attempted this session - time-boxed, named gaps unchanged from §42's own handoff (S7 bounded worker session)

Per the brief's mandatory first step, both `tools/probe/verify-turn10-rockslide.ts` (145 ticks, 43 checks, 0 failures) and `tools/probe/verify-turn10-aerialace.ts` (35 ticks, 20/20) ran clean before any code was touched, confirming the prior session's fold was still intact.

### What landed: the whole ROCK_SLIDE half, plus the AERIAL_ACE-aftermath plumbing needed to reach it

`docs/turn10-notes.md`'s 2026-07-21 addendum (§1) already RAM/pixel-proved `TURN10_ROCKSLIDE_PRESS_TICK=12169` reproduces every `battleMenu.ts` `rockSlide*` delay constant bit-for-bit - this session's job was pure wiring against that proof, mirroring `drawTurn9RockSlideAttack`/`drawTurn9RockSlideWindow` almost verbatim (same actor roles: Onix attacker/player back sprite idle, Pidgeotto target/front sprite shake+rocks):

- **`drawTurn10RockSlideAttack`**: BG shake, rock spawn/draw-order, Pidgeotto's own shake/blink/healthbox-wobble, Onix's own frozen idle-bounce sprite - every mechanism function (`rockSlideBg3Y`/`rockSlideRockState`/`rockSlideDrawOrder`/`rockSlideMonShakeY2`/`rockSlideHealthboxWobbleY2`/`rockSlideMonBlinkInvisible`/`rockSlideOpponentHp`) reused UNCHANGED, only Pidgeotto's own HP endpoints (61->38) and the synthetic pressTick are new.
- **`drawTurn10RockSlideWindow`**: same three-phase shape as `drawTurn6RockSlideWindow`/`drawTurn7RockSlideWindow` - kickoff text hold, "It's super effective!" swap-in, text-clear (blank box), hard-cut to the resettled menu. Three NEW turn-specific delay constants, each fresh-oracle-bisected this session via a scratch `drawText`+charmap reconstruction probe (same methodology `verify-turn10-rockslide.ts`'s own ROCK_SLIDE-text check already uses) against a live `turn10-aerialace.json` capture extended with a wider `captureFrames`: `TURN10_SUPER_EFFECTIVE_TEXT_DELAY=626` (render 12795, 0/21 mismatches every sampled tick through 12830), `TURN10_ROCKSLIDE_TEXT_CLEAR_DELAY=723` (render 12892, matches the dossier's own cited sha exactly), `TURN10_ROCKSLIDE_MENU_REDRAW_DELAY=730` (render 12899, matches).
- **`drawTurn10RockSlideTurnEndSettledMenu`**: the resettled turn-11 "What will ONIX do?" menu, `turn10RockSlideResettledBounceTick` keyed off the redraw delay (same `t - (pressTick+delay) + (MENU_IDLE_BLANK_END_TICK+1)` shape `turn6RockSlideResettledBounceTick` already establishes) - reproduces the dossier addendum's own corrected idle-bounce finding (§4: NOT flat, the standard `menuIdleBounce` cycle) exactly, including the single-tick blip at 12900 and the resting phase at 12899/12901/13200/13306, fresh-confirmed against a wide capture (12878-12980ish plus 13200/13306).
- **Onix's own AERIAL_ACE-drain aftermath** (belongs conceptually to the AERIAL_ACE window, not ROCK_SLIDE, but had to be wired to reach ROCK_SLIDE's own kickoff at all): `turn10AerialAceOnixHp` (24->14, delay 136 relative to the REAL live pressTick 12305, same no-extra-lag shape as `turn9OnixHp`) threaded through a new `onixHp` param on `drawTurn10FieldBase` (defaulted to the pre-hit value, every pre-existing caller unaffected - confirmed by the regression sweep). `turn10NotVeryEffectiveTextStartTick`/`turn10NotVeryEffectiveTextVisibleChars` reuse `TURN9_NOTVERYEFFECTIVE_LINE` verbatim (same message ID, single line, turn9's own transcription already corrected) with a fresh-bisected delay of 152 (render 12457) - NOT assumed transferable from turn 9's own +134, per the "each turn gets its own literal constant" convention; a scratch probe confirmed 0/24 mismatches at every sampled tick 12457-12561.
- **`drawTurn10AerialAceWindow`** now hands off to `drawTurn10RockSlideWindow` once `rockSlideTextStartTick(TURN10_ROCKSLIDE_PRESS_TICK)` is reached - the same "handoff at the next move's own kickoff-text start" shape `drawTurn9QuickAttackWindow` already establishes.

### Trace: `turn10-rockslide.json`, 220/220, 0 diff

`captureFrames` spans `12345-12362` (the already-proven AERIAL_ACE mechanism window, re-included since this is a different trace file), `12438-12481` (Onix's HP drain + "not very effective" reveal), `12556-12601` (ROCK_SLIDE kickoff box transition + text reveal), `12762-12831` (Pidgeotto's HP drain + "super effective" reveal), `12878-12911` (turn-end text-clear + settled menu + the idle-bounce blip), plus six more idle-bounce-cycle checkpoints (12930-13306) confirming the resting/active phase shape holds for a further ~400 ticks. **Deliberately excludes** renders 12363-12437 (mechanism 3's still-open residual at 12363-12366, and mechanism 4's still-reverted palette plateau at 12368-12370, §42's own named gaps - neither touched this session, so those ticks are not yet 0-diff and are correctly left out of this rung's own trace).

### Verification

`npm test` **946/946** (936 + 10 new Tier-1 tests: `turn10AerialAceOnixHp`, `turn10NotVeryEffectiveTextStartTick`/`turn10NotVeryEffectiveTextVisibleChars`, `TURN10_ROCKSLIDE_PRESS_TICK`'s own cross-check against `rockSlideTextStartTick`/`rockSlideOpponentHp`, `turn10SuperEffectiveTextStartTick`/`turn10SuperEffectiveTextVisibleChars`, `turn10RockSlideResettledBounceTick`). `npm run build` green. `tools/probe/verify-turn10-rockslide.ts` and `tools/probe/verify-turn10-aerialace.ts` both still fully passing (unchanged). `turn10-rockslide.json` **220/220, 0 diff** (new, `npm run compare`). Full regression sweep unchanged: `turn10-menu.json` **83/83**, `turn10-aerialace.json` **18/18**, `turn9-quickattack.json` **117/117**, `turn9-quickattack-b.json` **77/77**, `turn9-rockslide.json` **130/130**, `turn1-rockslide.json` **256/256** - the new `onixHp` param on `drawTurn10FieldBase` is defaulted to the pre-existing hardcoded value, confirmed by this sweep to not regress any pre-existing caller.

### Rungs (b)/(c)/(d): NOT attempted this session - time-boxed, gaps unchanged from §42

Rung (a) (this entry) consumed this session's own bounded window. §42's own two named AERIAL_ACE gaps are untouched and still exactly as described there:

1. **Mechanism 3's residual** (renders 12363-12366, shrinking 666->29px): bisect the LUNGE table's own early entries first (indices 0-2), per §42's own handoff - not attempted, no code touched.
2. **Mechanism 4**: re-derive the live BG palette BANK NUMBER via a direct RAM read (`dump-aerialace-anim.py` precedent, `/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python`) before re-attempting the darken render - not attempted, no code touched (`darken` stays hardcoded `false`, exactly as §42 left it).
3. Once both close, extend `turn10-aerialace.json` past 12362 through the dossier's own 12389 settle boundary - blocked on 1/2 above, unchanged.

No `src/` code for mechanisms 3/4 was touched this session (no partial render to revert) - only the ROCK_SLIDE-half wiring (rung (a)) and its own prerequisite AERIAL_ACE-aftermath plumbing (Onix's drain + notVeryEffective text) landed, both fully 0-diff. No PAPERCUTS beyond the standing mgba-venv-teardown one.

## 44. S7 slice R rung 0 + turn 11 (rungs 1-3) ALL LAND 0-diff: turn 9's flicker-block gap closed (a 1-constant table extension), turn 11's whole FEATHER_DANCE+ROCK_SLIDE arc wired through the turn-12 menu boundary, one genuine cross-regime bounce bug found and fixed along the way (S7 bounded worker session)

Per the brief's mandatory first step, both `verify-turn9-postlunge.ts` (108/108) and `verify-turn11.ts` (52/52) ran clean before any code was touched, confirming the prior session's fold was still intact.

### Rung 0: turn 9's flicker gate is now a pure 20->32 table extension, no new mechanism

The 2026-07-21 (third session) addendum in `docs/turn9-shake-notes.md` already established that episode 2's Onix visibility flicker (`turn9Ep2OnixInvisible`) is a FOUR-block cycle (RAM 10958-10989), not three - the first probe session's own sampling simply stopped at RAM 10977 and missed the 4th on-block (RAM 10982-10985) plus the task's own force-visible tick (RAM 10989). Because the existing implementation was already a plain `n % PERIOD < ON` gate capped by a `TOTAL_TICKS` cutoff, the fix is a ONE-LINE change: `TURN9_EP2_FLICKER_TOTAL_TICKS` 20 -> 32. The 4th block and the force-visible tick both fall out of the existing modulo formula with no special-casing (block 4 lands at `n=24..27`, still `<4 mod 8`; the force-visible tick at `n=31` is already in an off-phase). Extended the Tier-1 pin (`tests/battleScene.test.ts`) to assert the 4th on-block and its surrounding off-gaps, and extended `tools/compare/traces/turn9-quickattack.json`'s own `captureFrames` over renders 10945-10986 (hitsplat-live renders 10935-10944 stay excluded - that mechanism is still open, per the dossier's own named next instrument, gPlttBufferFaded tint dump). Fresh oracle compare: **159/159 frames match, 0 diff** on every newly-added tick.

### Rungs 1-3: turn 11 wired end-to-end - menu reopen, FEATHER_DANCE-blocked half, ROCK_SLIDE half

`docs/turn11-notes.md`'s 2026-07-21 (bounded-worker probe session) addendum already RAM/pixel-proved both halves are pure parameterizations of already-shipped code (`TURN11_ROCKSLIDE_PRESS_TICK=13137` reproduces every `rockSlide*` delay constant; the FEATHER_DANCE half's feather-sprite animation never fires, RAM-confirmed 0 OAM hits) plus ONE genuinely new mechanism (the ATK-floor message). This session's job was wiring against that proof:

- **Rung 1 (menu reopen)**: added `turn10Resolved` as a new `BattleSceneState` field, threaded end-to-end exactly like every prior `turnNResolved` flag (`advanceBattleScene`, `core.ts`'s own reopen-gate chain - a new `else if` branch keyed on `turn9Resolved && !turn10Resolved` + a fresh A-press past `TURN10_ROCKSLIDE_MENU_REDRAW_DELAY` past turn 10's own synthetic press, cursor persisted at slot 0 per the dossier's own "zero navigation presses" ledger, `drawFightSubmenuWindow`'s own dispatch chain, `drawFightSubmenuChrome`/`currentPPForActiveMon`'s own PP-decrement chain - turn 10's own confirmed ROCK_SLIDE is now an 8th slot-0 use, PP reads 2/10 entering turn 11, matching the dossier's own ledger exactly).
- **Rung 2 (FEATHER_DANCE-blocked half)**: `drawTurn11FeatherDanceWindow` reuses `turn6FeatherDanceTextStartTick`/`turn6FeatherDanceTextVisibleChars` UNCHANGED for the kickoff text (same message, same reveal formula, turns 6/7/8's own functions), deliberately OMITS any `drawTurn6FeatherSprites` call (the real hardware never creates the 8 feather sprites this turn - RAM-confirmed by the probe, not a new empty table), then dispatches the new ATK-floor message (`TURN11_ATKFLOOR_LINE1/2`, U+2019 apostrophe - caught by a first failing `npm run compare` run before being corrected, same "let the check catch it" discipline `verify-turn11.ts` itself used) once `turn11AtkFloorTextStartTick` (pressTick+83) is reached.
- **Rung 3 (ROCK_SLIDE half)**: `drawTurn11RockSlideAttack`/`Window`/`TurnEndSettledMenu` mirror turns 6/7/9/10's own instances exactly, every `rockSlide*` mechanism function reused unchanged, only `TURN11_ROCKSLIDE_PRESS_TICK` and Pidgeotto's own HP endpoints (38->16) new; Onix stays flat at 14 all turn (FEATHER_DANCE deals no damage, no drain overlay needed). The turn-end->turn-12-menu transition is NOT a single-tick hard cut like turns 6/7/10's own - it's followed by several ticks of the `menuIdleBounce` oscillator settling through its own early quantized plateaus before reaching the long-term resting cycle; this was suspected to need special-casing but turned out to fall out of the exact same `turnNRockSlideResettledBounceTick` formula shape with no new mechanism, once the redraw-delay constant itself was corrected by one tick (`TURN11_ROCKSLIDE_TEXT_CLEAR_DELAY` 721->722 - the dossier's own "13858" citation for the text-clear tick was one tick early; the held "super effective" text is still fully visible at 13858, caught by this rung's own `npm run compare` run).

### One genuine bug found and fixed: cross-regime idle-bounce reuse

Turn 11's own FIGHT-submenu-browsing phase (before its own confirm press) initially reused `drawTurn10FieldBase` verbatim with turn 10's own `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` formula - this produced a real, pixel-confirmed 2px healthbox-bounce mismatch (`npm run compare` caught it immediately: Onix's own healthbox sat 2px high relative to the oracle). Root cause: `menuIdleBounce`'s underlying `DoBounceEffect` task genuinely restarts fresh at EVERY turn's own menu redraw (per `MENU_BOUNCE_RAM_SETUP_TICK`'s own doc, "HandleInputChooseAction's first tick") - turn 11's own browsing phase is driven by a NEW oscillator regime (reset at turn 10's own redraw), not the regime `drawTurn10FieldBase` was calibrated for (reset at turn 9's own redraw). Fixed by adding `TURN11_REGIME6_TO_REGIME1_SHIFT` + a dedicated `drawTurn11FieldBase` wrapper, following the EXACT same "own regime, own shift constant" pattern `TURN10_REGIME5_TO_REGIME1_SHIFT`/`drawTurn10FieldBase` already established for turn 10's own equivalent phase - once this was in place, `turn11KickoffBounceTick`'s live branch collapsed back to the plain universal `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` formula every prior turn already uses (no turn-11-specific correction needed at the call site, only in the wrapper).

### Traces: `turn11-menu.json` 56/56, `turn11-featherdance.json` 178/178, `turn11-rockslide.json` 163/163, all 0 diff

`turn11-menu.json` spans 13296-13351 (pre-open baseline through the confirm-press transient, dense stride-1). `turn11-featherdance.json` spans 13352-13529 (kickoff text typing + hold + ATK-floor message transition + reveal + hold, dense stride-1). `turn11-rockslide.json` spans 13530-14340 (boundary + representative sampling, same convention `turn10-rockslide.json` established: dense over the kickoff/HP-drain/turn-end transitions, sparse representative ticks over the rock-animation loop and the turn-12 idle cycle). All three traces reuse `battle1-turn11-dense.json`'s own committed 96-segment script verbatim (real button presses), just with rung-scoped `captureFrames`.

### Verification

`npm test` **957/957** (946 + 11 new Tier-1 tests: the 4-block flicker table extension, `currentPPForActiveMon`'s 8th slot-0 decrement, `TURN11_ROCKSLIDE_PRESS_TICK`'s own cross-check, `turn11AtkFloorTextStartTick`/`turn11AtkFloorTextVisibleChars`, `turn11SuperEffectiveTextStartTick`/`turn11SuperEffectiveTextVisibleChars`, `turn11RockSlideResettledBounceTick`, `TURN10_ROCKSLIDE_MENU_REDRAW_DELAY`'s own re-export check). `npm run build` green. Both mandatory verify scripts still fully passing, unchanged: `verify-turn9-postlunge.ts` 108/108, `verify-turn11.ts` 52/52. Full regression sweep unchanged: `turn9-quickattack.json` **159/159** (117 base + 42 newly-added, 0 diff), `turn9-quickattack-b.json` **77/77**, `turn9-rockslide.json` **130/130**, `turn10-menu.json` **83/83**, `turn10-rockslide.json` **220/220**, `turn6-feathers.json` **235/235** - every count matches the acceptance criteria exactly. No PAPERCUTS beyond the standing mgba-venv-teardown one.

## 45. S7/S8 turn 12 ALL LANDS 0-diff: Pidgeotto's SECOND AERIAL_ACE use (a pure +2068-tick re-anchor of turn 10's own five-mechanism tables) and the arc's FIRST ROCK_SLIDE MISS (a zero-animation text-swap, structurally identical to turn 8's own BIND-miss) - `turn12-menu.json` **46/46**, `turn12-aerialace.json` **56/56**, `turn12-rockslide-miss.json` **38/38**, all 0 diff (S7/S8 bounded worker session)

Per the brief's mandatory first step, `verify-turn12.ts` ran clean (20/20) before any code was touched, confirming the prior session's probe fold was still intact.

### Rung (a): the turn-11-to-12 reopen gate

Added `turn11Resolved` as a new `BattleSceneState` field, threaded through the FULL existing reopen-gate chain exactly like every prior `turnNResolved` flag: a new `core.ts` `else if` branch keyed on `turn10Resolved && !turn11Resolved` + a fresh A-press past `TURN11_ROCKSLIDE_MENU_REDRAW_DELAY` (newly exported, unchanged 729) past turn 11's own real confirm, cursor persisted at slot 0 (docs/turn12-notes.md §1's own "zero navigation presses" ledger); `drawFightSubmenuWindow`'s own dispatch chain gets a new highest-precedence `turn11Resolved` branch; `currentPPForActiveMon`'s PP-decrement chain gets a 9th independent slot-0 term - ROCK_SLIDE reads **1/10** entering turn 12, matching `turn12-notes.md` §4's own ledger exactly (correcting the ORIGINAL brief's stale "2/10" arithmetic, which the probe session itself had already caught).

### Rung (b): AERIAL_ACE's second use - a pure re-anchor, zero new mechanism code

Turn 10's own five already-shipped mechanism functions (`drawTurn10AerialAceLungeAndClones`, `drawTurn10AerialAceSlice`, `turn10AerialAceOnixShakeY2`, `turn10AerialAceOnixHp`, `turn10NotVeryEffectiveTextStartTick`/`Chars`) are called **VERBATIM**, parameterized only with this turn's own live `pressTick` and Onix's new HP endpoints (14->4, vs turn 10's 24->14) - no new table, no fork. A dedicated `drawTurn12FieldBase`/`turn12KickoffBounceTick` pair converts between this turn's own fresh idle-bounce regime (regime 7, anchored at turn 11's own redraw) and regime 1, the same "own regime, own shift constant" pattern every prior turn's equivalent wrapper already establishes (`TURN12_REGIME7_TO_REGIME1_SHIFT`). Mechanism 4's palette-pulse render and mechanism 3's small residual (§42/§43's own standing gaps) are inherited UNCHANGED at the same +2068 offset - not attempted, per the brief's explicit scope exclusion. **A real gap found and correctly excluded, not fixed**: turn 10's own committed traces (`turn10-aerialace.json` + `turn10-rockslide.json`) leave RAM ticks 12363-12437 completely uncaptured (the mechanism-3 residual plus an unmodeled hit-flash flicker sitting between the mechanism window and the HP-drain onset) - the first draft of `turn12-aerialace.json` sampled inside the +2068-shifted equivalent of that exact gap (14431-14505) and immediately showed real diffs (up to 4.33%) at the hit-flash ticks; corrected by excluding that same relative range, matching turn 10's own proven envelope exactly rather than guessing a fix.

### Rung (c): ROCK_SLIDE's first miss - a pure text-swap over the frozen field

`drawTurn12RockSlideWindow` mirrors `drawTurn8BindWindow`'s own structure exactly (a synthetic `TURN12_ROCKSLIDE_PRESS_TICK=14237` fit the same way `TURN10_/TURN11_ROCKSLIDE_PRESS_TICK` were, satisfying `ROCK_SLIDE_TEXT_DELAY`(393) alone - RAM-proven zero rocks/shake/hit-flash/wobble the whole window) - no rock/shake/hit-flash/wobble code needed at all, just the shared `ROCK_SLIDE_LINE1/2`/`rockSlideTextVisibleChars` kickoff text swapping to `TURN8_MISS_LINE1/2` ("ONIX's\nattack missed!", reused verbatim) at `pressTick`+449, clearing at `pressTick`+544 (a 95-tick miss-hold, bit-exact to turn 8's own BIND-miss gap), redrawing the resettled turn-13 menu at `pressTick`+551 (the STANDARD 7-tick clear-to-redraw gap). The frozen field's own idle-bounce phase reuses `turn12KickoffBounceTick`'s own frozen return value (regime 7's phase-zero anchor) - confirmed algebraically to reduce to the exact same universal frozen bounce phase (`menuIdleBounce(MENU_IDLE_BLANK_END_TICK+1)`) every prior turn's own mid-resolution freeze already uses, whether reached via `drawTurn8BindWindow`'s own regime-3 anchor or `drawTurn10/11RockSlideAttack`'s own regime-5 anchor - not re-guessed, algebraically derived from the existing regime-shift constants and then oracle-confirmed via `npm run compare`.

### Traces: `turn12-menu.json` 46/46, `turn12-aerialace.json` 56/56, `turn12-rockslide-miss.json` 38/38, all 0 diff

All three reuse `battle1-turn12-dense.json`'s own committed 100-segment script verbatim (real button presses, already twice-run oracle-verified by the probe session), just with rung-scoped `captureFrames`: `turn12-menu.json` spans 14338-14383 (dense stride-1, reopen through the confirm-press transient); `turn12-aerialace.json` spans 14383-14629 (kickoff text typing, the dense mechanism envelope 14413-14430, then a jump straight to the HP-drain window 14506-14524 and the "not very effective" transition/hold, deliberately skipping the excluded 14431-14505 gap); `turn12-rockslide-miss.json` spans 14625-15374 (kickoff through the miss message through the turn-13 menu resettle and idle-bounce tail).

### Verification

`npm test` **966/966** (957 + 9 new Tier-1 tests: `currentPPForActiveMon`'s 9th slot-0 decrement, `TURN11_ROCKSLIDE_MENU_REDRAW_DELAY`'s own re-export check, `TURN12_ROCKSLIDE_PRESS_TICK`'s own cross-check against `rockSlideTextStartTick`, `turn12MissTextStartTick`/`turn12MissTextVisibleChars`, the 95-tick miss-hold/7-tick clear-to-redraw gap arithmetic, `turn12RockSlideResettledBounceTick`). `npm run build` green. `verify-turn12.ts` still fully passing, unchanged (20/20). Full regression sweep unchanged, every count matches the acceptance criteria exactly: `turn11-menu.json` **56/56**, `turn11-featherdance.json` **178/178**, `turn11-rockslide.json` **163/163**, `turn10-aerialace.json` **18/18**, `turn10-rockslide.json` **220/220**, `turn8-bind-a.json` **256/256**. No PAPERCUTS beyond the standing mgba-venv-teardown one.

### Out of scope, unchanged

AERIAL_ACE mechanisms 3/4 root causes (§42/§43's own gaps, ISSUES-adjacent); the hitsplat (ISSUES #31); turn 13+ (its probe/verify script landed last session - the natural next wiring target, reusing this session's own `turn11Resolved`-style flag pattern for a new `turn12Resolved`).

## 46. S7 engine step: AERIAL_ACE excluded-window close-out - rung (a) LANDS 0-diff (mechanisms 1/3's residual), rung (b) wired but NOT 0-diff (mechanism 4's darken - two real bugs fixed, ~48% mismatch down to a small unresolved residual), rungs (c)/(d) not attempted (S7 bounded worker session)

Full writeup in `docs/aerial-ace-notes.md`'s own "2026-07-21 rung (a) CLOSES + rung (b) partial" section - not re-narrated here in full, just the headline shape:

**Rung (a)**: §42/§43's own standing "mechanism-3 residual" (renders 12363-12366, shrinking 666->29px) was NOT a bad RAM table - both this arc's mechanism-1 table and mechanism-3's window bounds were already correct (independently brute-force-confirmed against a fresh oracle capture). The bug was compositing ORDER: `drawTurn10AerialAceLungeAndClones` drew the real sprite first and blended both `AnimTask_TraceMonBlended` clones over it last (QUICK_ATTACK's own precedent shape) - reversing that (clones blended against the field first, real sprite opaque on top last) closes the residual to exactly 0. Also corrected slot 7's own END lag from an assumed +2 to the ordinary +1 (RAM-pixel-bisected). `turn10-aerialace.json` now **23/23**, 0 diff (was 18/18, excluding renders 12363-12366 entirely).

**Rung (b)**: mechanism 4's coefficient state machine was already RAM-pinned and Tier-1-tested (§42); wiring its boolean into the existing (unused, from an earlier revert) `darken` render plumbing found two real bugs - `turn10BgDarkPalette` was darkening the wrong LOCAL palette index (a literal hardware-bank-number transcription that doesn't match the compact asset's own indexing; every static-bg tile actually uses local index 0, not 1), and `erasePidgeottoFootprint` never darkened its own erase-background color. Fixing both dropped the darken plateau's mismatch from ~48% of the whole frame to a small residual confined to Pidgeotto's own silhouette (600-893px, 1.5-2.3%) - NOT yet 0-diff, so `turn10-aerialace.json`'s `captureFrames` stays at its rung (a) boundary (through render 12367, the tick before the pulse) rather than claim a false pass. A second, smaller, SEPARATE 203px residual (independent of darken - present at 12370-12373 too, whenever the real sprite and slot 7 simultaneously overlap) was also bisected without resolution; docs/aerial-ace-notes.md flags both for whoever picks this back up, with a note that they may share a root cause.

**Rungs (c)/(d)**: not attempted - time-boxed by the rung (a)/(b) investigation above, no code touched. §45's own AERIAL_ACE +2068-shift exclusion (`turn12-aerialace.json`'s own 14431-14505 gap) is therefore also unchanged this session.

### Verification

`npm test` **966/966** (one existing Tier-1 test updated for slot 7's corrected end lag, no new tests this session - the darken coefficient's own pins already existed from §42). `npm run build` green. Full regression sweep 0 diff: `turn10-rockslide.json` **220/220**, `turn12-aerialace.json` **56/56**, `turn12-rockslide-miss.json` **38/38**, `turn9-quickattack.json` **159/159**, `turn11-menu.json` **56/56**, `turn11-featherdance.json` **178/178**, `turn11-rockslide.json` **163/163**. `verify-turn10-aerialace.ts` unchanged, 20/20.

### Out of scope, unchanged

Rungs (c) (the 12371-12437 flicker/hit-flash) and (d) (turn 12's own +2068 mirror) untouched - blocked behind rung (b)'s own remaining residual per the brief's own ordering. QUICK_ATTACK's hitsplat (ISSUES #31); turn 13+ wiring; SAND_ATTACK; ROADMAP.md.

## 47. S7/S8 turn 13 rung 1 (reopen gate) + rung 2 (SAND_ATTACK text/banner) LAND 0-diff; rungs 3-4 (DRAGON_BREATH+faint+KO-hold, MURKROW switch-in) NOT attempted this session

**Rung 1** (prior session, §-none/PROGRESS #243): `turn12Resolved` threaded through the reopen-gate chain, `drawTurn13FightSubmenuWindow` (own regime-8 field-base pair), the DOWN-nav cursor jump needing zero new code (`moveFightCursor(0,"DOWN")===2`, the 2x2-grid root cause the supervisor already folded). `turn13-menu.json` 57/57.

**Rung 2** (this session): `drawTurn13SandAttackWindow` dispatches SAND_ATTACK's own kickoff text ("Foe PIDGEOTTO used\nSAND-ATTACK!"), a new accuracy-drop stat banner (`turn13SandAttackAccEva`/`Bg1Y` - a THIRD parameter combination of the generic `StatsChangeAnimation` banner: non-sharply target/wait (10/20, DOUBLE_TEAM's own shape) crossed with a DECREASE direction (turn 6's own shape) and the `accuracy` palette - no new asset extraction needed, `stat-anim-banner.json` already has it), and "ONIX’s accuracy fell!" (curly apostrophe, matching `TURN6_ATKFELL_LINE1`'s own font/charmap pin). All pure wiring per `docs/turn13-notes.md`'s own SAND_ATTACK characterization section.

**A real bug found and fixed via oracle bisection, not guessed**: `pressTick` (`TICK0+sm.confirmElapsed`) is **15419** at runtime for this trace, not 15418 (the confirm A-press's own segment-start tick, which is what a first-pass reading of the dossier's own tick citations suggests). A fresh `npm run compare` caught this directly - every mid-typing frame showed a small (~30-50px) diff localized to exactly one trailing glyph, and the transition frame itself (submenu-chrome to message-box) showed a huge (28%) diff - the classic "off by one tick" signature. Rebased all three new delay constants (kickoff text, banner ramp, "accuracy fell" text) off the real 15419 anchor; closed to 0 diff immediately.

**(a) dirt-throw + attacker-slide is NOT rendered** - `docs/turn13-notes.md`'s own dossier RAM-pins it exactly (30 dirt sprites launched from one shared attacker-relative origin via dead script args, `Random2()&0x1F` per-sprite target jitter, regenerable via the committed `tools/probe/dump-sandattack-anim.py`) but implementing it needs a new sprite-sheet asset extraction (no `ANIM_TAG_MUD_SAND` graphic exists in `src/assets/gen/` yet), which didn't fit this session's remaining time. Named gap, not guessed at: `turn13-sandattack.json`'s own `captureFrames` excludes exactly that window (15476-15521) rather than claim a false 0-diff pass, the same "exclude, don't fake" convention ISSUES #23's own projectile-flight exclusion already establishes. **(b) the silent monbg-cleanup gap needed zero special-case code** - `turn13SandAttackAccEva` is naturally `null` there, so the settled kickoff-text baseline already renders it correctly by construction.

### Traces: `turn13-sandattack.json` 185/185, 0 diff

Reuses `battle1-turn13-dense-a.json`'s own committed 108-segment script verbatim, spanning 15420-15475 (confirm-transient tail through the settled kickoff text, excluding 15476-15521's dirt-throw) and 15522-15650 (silent gap, banner, "accuracy fell" typing + hold).

### Verification

`npm test` **978/978** (969 + 9 new Tier-1: `turn13SandAttackTextStartTick`/`VisibleChars`, `turn13SandAttackAccEva`/`Bg1Y`, `turn13AccFellTextStartTick`/`VisibleChars`, the LINE1/LINE2 string pins). `npm run build` green. `verify-turn13.ts` unchanged 60/60. Full regression sweep 0 diff: `turn13-menu.json` **57/57**, `turn12-menu.json` **46/46**, `turn12-aerialace.json` **56/56**, `turn11-menu.json` **56/56**, `turn10-aerialace.json` **23/23**.

### Out of scope, unchanged

Rung 3 (DRAGON_BREATH re-targeted at Pidgeotto, HP-drain, faint sink reused from turn 5, the button-gated KO-hold cycling 4 idle-bounce shas - needs a new `turn13KoDismissElapsed`-style field threaded through `core.ts`, mirroring `turn5KoDismissElapsed`'s own pattern) and rung 4 (MURKROW switch-in, turn 5's faint-switch machinery re-anchored - needs Murkrow's own front-sprite asset, not yet extracted) - both time-boxed out of this session, full ground truth already banked in `docs/turn13-notes.md` §4-§7, nothing left to probe. AERIAL_ACE mechanisms 3/4 root causes; the hitsplat (ISSUES #31).

## 48. S7/S8 turn 13 Part A: SAND_ATTACK's dirt-throw sub-phase - attacker slide LANDS 0-diff, the dirt cloud's own closed form is derived and RAM-verified but a small OAM-order residual keeps it excluded (named gap, not faked); Parts B (DRAGON_BREATH rung 3) and C (MURKROW rung 4) NOT attempted this session

**Correction to §47's own "out of scope" note**: MURKROW's front sprite is **already extracted** - `tools/extract/extract-battle-mon-pics.ts`'s own `FRONT_SPECIES` table has included `MURKROW` since the GROVYLE-2nd-frame commit (`c170d68`), and `src/assets/gen/battle-opponent-front-sprites.json` already has a `MURKROW` entry (tileset/palette/frame2, all populated) - confirmed by loading the committed JSON directly. Rung 4's own asset-extraction need is smaller than §47 assumed; only the wiring (turn5's faint-switch machinery re-anchored, per `docs/turn13-notes.md` §7's REUSE MAP) remains.

**This session's own scope**: the SAND_ATTACK dirt-throw/attacker-slide sub-phase §47 named as the last unrendered piece of rung 2's own window (RAM 15475-15521). New asset: `gBattleAnimSpriteGfx_MudSand` has no `.png` source in this reference tree (unlike every prior battle-anim extraction) - only the raw pre-compression `mud_sand.4bpp` (5 tiles) + `mud_sand.pal`; `tools/extract/extract-sandattack-dirt.ts` decodes tile 0 directly (the template's only shown frame) via a small inline 4bpp-planar decoder.

**Attacker slide (Pidgeotto's own `x2`) LANDS 0-diff**: a 7-entry RAM-pinned table (`turn13SandAttackPidgeottoX2`), threaded through `drawTurn5PidgeottoSettled`/`drawTurn5SwitchinSprite`/`drawTurn6FieldBase`/`drawTurn13FieldBase` as a new trailing parameter (every pre-existing call site unaffected). `turn13-sandattack.json` grows 185 -> **190/190, 0 diff** (adds render 15476-15480, the slide-only span before any dirt spawns).

**Dirt cloud closed form derived, RAM-exact, but not yet 0-diff**: all 30 sprites share one RAM origin `(161,66)`, each with its own linear-translation `xStep`/`yStep` (`gSprites[].data[1]`/`data[2]` at spawn, `Random2()` jitter already baked in) - `x2/y2 = ∓floor(min(n,20)*step/256)`, cross-checked bit-exact against a held-out RAM sample. Wired with an OAM draw order sorted by descending spawn slot (lowest slot renders on top, same rule `rockSlideDrawOrder` established) - this closed most of the gap (41 -> 37/231 mismatched frames) but not all of it; a residual remains where 3+ sprites' cells overlap right after each wave's own spawn, likely needing a fuller `SortSprites`-style per-tick simulation (not just a spawn-order sort) to close completely. **Excluded rather than faked**: `turn13-sandattack.json`'s own `captureFrames` excludes exactly render 15481-15521; full derivation, the pinned 30-entry table, and the residual's own characterization are banked in `docs/turn13-notes.md`'s new "2026-07-21 — bounded worker... Part A" section for whoever picks this back up.

### Verification

`npm test` **978/978** (unchanged - no new Tier-1 tests this session, all changes are pixel-render wiring already covered by the trace compare). `npm run build` green. Regression sweep 0 diff: `turn13-menu` 57/57, `turn13-sandattack` **190/190**, `turn12-menu` 46/46, `turn12-aerialace` 56/56, `turn11-menu` 56/56, `turn10-aerialace` 23/23.

## 49. S7/S8 turn 13 rung 3 LANDS 0-diff: DRAGON_BREATH re-targeted at Pidgeotto, HP drain 16->0, faint sink, "Foe PIDGEOTTO fainted!" + KO-gated hold, all pure reuse - one new reused mechanism (turn 2's own target hit-flash blink/wobble) needed to close the window fully

**Headline**: every mechanism the REUSE MAP (`docs/turn13-notes.md` §7) predicted reused verbatim - `dragonBreathTextStartTick`/`Chars` (kickoff text, new synthetic `TURN13_DRAGONBREATH_PRESS_TICK=15516`), `dragonBreathGrovyleHp` (HP drain, unmodified, `DRAGONBREATH_HP_DRAIN_START_DELAY=353` unchanged), `grovyleFaintSinkRowsAndY2` (faint sink, generalized to take `startTick`/`steps` params - Pidgeotto's own `S=15960, n=7` vs. Grovyle's `S=6502, n=8`), `cursorState` (the fainted-message wait-cursor's own FULL perpetual 4-phase bounce, re-anchored - turn 5's own short window never got to exercise this, turn 13's ~840-tick hold does). One thing the REUSE MAP didn't itemize because §5's own DRAGON_BREATH geometry section scoped it out as "projectile-adjacent": Pidgeotto's own target-side **hit-flash blink + healthbox wobble** (`rockSlideMonBlinkInvisible`/`rockSlideHealthboxWobbleY2`, turn 2's own DRAGON_BREATH scene already reuses these for Grovyle) is ALSO needed here, oracle-bisection-found (not guessed) - see below.

**New state field**: `turn13KoDismissElapsed` threaded through `core.ts`'s `tick()`, mirroring `turn5KoDismissElapsed`'s pattern EXACTLY (same eligibility-gated single-set idiom, same "render path stays a pure function of `t`, this field is state-machine bookkeeping only" precedent - confirmed, not assumed: the KO-gated hold's own "locks... holds through 16824" shape falls out naturally from the live wait-cursor's own 9-tick phase boundaries, no press-driven render freeze needed).

**Real bug found via `npm run compare`, not guessed**: a first pass drew Pidgeotto's on-field sprite solid throughout the whole DRAGON_BREATH window. The oracle disagreed by ~1085px at 15855-15863, isolated by the diff crop to exactly Pidgeotto's own sprite silhouette - turn 2's own DRAGON_BREATH scene (`drawDragonBreathScene`) already draws its target through `rockSlideMonBlinkInvisible`/`rockSlideHealthboxWobbleY2` (the same generic ROCK_SLIDE-family hit-flash mechanism, anchored `pressTick+DRAGONBREATH_HIT_FLASH_OFFSET`) - re-anchoring both to `TURN13_HIT_FLASH_PRESS_TICK` and threading the blink through the already-generalized `pidgeottoSink` param (reusing the sink mechanism's own `{keptRows:0}` shape as a plain visibility toggle, not a new primitive) closed this to 0 immediately.

**Second bug, same discovery method**: the fainted-message window's own Onix on-field bounce - a first attempt reverted to LIVE `bounceTick=t` for this sub-window, mirroring `drawTurn5RockSlideWindow`'s own post-fainted-text precedent (`drawTurn6FieldBase(fb, t)`, no override). The oracle disagreed at 15979 (2325px, isolated to Onix's own sprite/healthbox region) - turn 13's own FROZEN `turn13KickoffBounceTick` needed to stay in effect through the ENTIRE fainted-hold window too, unlike turn 5's own instance. A real per-turn difference, not a mistake in the precedent - flagged so a future worker doesn't re-assume turn 5's shape transfers blindly (the exact class of trap this dossier's own "KNOWN TRAPS" section keeps naming).

**Third, tiny bug, timing-related**: the fainted-message wait-cursor's own start tick, computed as `textStart+TOTAL+1` (mirroring `TURN5_FAINTED_CURSOR_START_DELAY`'s own "+1 after the last glyph" formula) landed every one of `cursorState`'s own perpetual-cycle phase transitions exactly 1 tick early (2 mismatches, 16810/16819, both exactly at a phase boundary). One more `+1` (`TURN13_FAINTED_CURSOR_START_DELAY=485`, not 484) closed both.

**Named, excluded residual**: a 2px diff at ticks 15882-15884, isolated to Pidgeotto's own HP-bar fill color - `calcBarFilledPixels` maps hp 1/2/3 (all touched during this exact 3-tick span, per `dragonBreathGrovyleHp`'s own 1-unit/tick drain) to the SAME 1-filled-pixel red rendering, but the oracle's own pixel at that column doesn't match either the filled-red or empty color this session checked. Not chased further (time-boxed, <0.01% of the frame) - excluded from `turn13-dragonbreath-faint.json`'s own `captureFrames` rather than faked, matching this dossier's own "exclude, don't fake" convention. A resuming worker: RAM-probe `gBattleMons[1].hp` / the real bar-fill register at exactly 15882-15884 to see if the true hp value (or the bar's own rounding rule) differs from the `dragonBreathGrovyleHp`/`calcBarFilledPixels` combination assumed here.

### Traces: `turn13-dragonbreath-faint.json` 141/141, 0 diff

New committed trace, reusing `battle1-turn13-dense-a.json`'s own 108-segment script verbatim: 15699-15745 (dense, DRAGON_BREATH kickoff typing through fully-settled), 15855-15900 minus 15882-15884 (dense, HP-drain-to-faint, the named residual excluded), 15955-15985 (dense, faint sink + fainted-message typing start), 16300/16600/16800 (sparse KO-hold idle-bounce samples), 16808-16824 (dense, the button-gated KO-dismiss press boundary - this rung's own stopping point, rung 4/MURKROW's is next).

### Verification

`npm test` **986/986** (978 + 8 new Tier-1: `dragonBreathGrovyleHp`'s own turn-13-anchor endpoints, `grovyleFaintSinkRowsAndY2`'s generalization incl. a Grovyle-default-unchanged regression check, `TURN13_HEALTHBOX_VANISH_TICK`, `turn13FaintedTextStartTick`/`VisibleChars`, `turn13KoDismissEligible`, and `turn13KoDismissElapsed`'s own idle/A-press/early-press state-machine trio mirroring `turn5KoDismissElapsed`'s own test shape). `npm run build` green. `verify-turn13.ts` unchanged, 60/60 (mandatory first-step rerun). Full regression sweep 0 diff: `turn13-sandattack` **190/190**, `turn13-menu` **57/57**, `turn12-menu` **46/46**. New trace twice-run byte-identical (141/141 both times).

### Out of scope, unchanged

Rung 4 (MURKROW switch-in, turn 5's faint-switch machinery re-anchored - asset already extracted per §48's own correction, pure wiring from here per `docs/turn13-notes.md` §6-§7). AERIAL_ACE mechanisms 3/4 root causes; the hitsplat (ISSUES #31); ISSUES #23's own projectile-flight sampler defect (the fire-projectile/shake/red-blend window stays excluded here too, same reasoning §5 of the dossier already gives).

### Out of scope, unchanged

Parts B (DRAGON_BREATH re-targeted at Pidgeotto, HP-drain, faint sink reused from turn 5, the KO-gated hold) and C (MURKROW switch-in, turn 5's faint-switch machinery re-anchored - asset already extracted per the correction above) - both not attempted this session (this session's own remaining time went entirely to Part A), full ground truth already banked in `docs/turn13-notes.md` §4-§7. The dirt cloud's own OAM-order residual (this session). AERIAL_ACE mechanisms 3/4 root causes; the hitsplat (ISSUES #31).

## 50. S7/S8 turn 13 rung 4 LANDS: MURKROW's switch-in wired end-to-end (KO-press through the settled turn-14 menu) - KO-hold/icon-bar-retrigger/species-flip/sent-out-text/ball-open/healthbox-slide/most of the settled menu are 0-diff; the materialize+wobble sub-phase (66 ticks) and a handful of settled-menu bounce-phase ticks are a named, excluded residual - **turn 13 is NOT yet fully green** (this residual remains)

**Headline**: the REUSE MAP's (`docs/turn13-notes.md` §7) "(i) verbatim, new params/anchor" verdict held for every mechanism EXCEPT the materialize stretch/wobble fine detail, which §7 itself flagged as "not re-verified to the byte" - that flag turned out to matter. Reused as-is, 0-diff: `drawSendOutBall`/`healthboxSlideDx`/`MATERIALIZE_Y2_TABLE`/`affineEmergeAccumulator` (all already species/window-generic), the icon-bar retrigger (`drawTurn5IconBar`, generalized to take `createTick`/`fadeStartTick`/`destroyTick`/`states` params, every pre-existing call site unaffected), the open-particle burst (`drawTurn5SwitchinParticles`, generalized to take a `handoffTick` param), and "BUG CATCHER DESTIN sent\nout MURKROW!" (same `SWITCHIN_SENTOUT_LINE1`, new line 2 + anchor).

**New wiring, oracle-pixel-bisected, not guessed**: `TURN13_ICONBAR_CREATE_TICK=16847`/`FADE_START_TICK=16983`/`DESTROY_TICK=17000` (both `+1`/`+2`-after-anchor relationships turn 5's own constants establish, re-derived from a fresh dense oracle scan, not assumed to transfer numerically); `TURN13_OPPONENT_ICON_STATES=[Empty,Empty,Empty,Statused,Full,Statused]` (Pidgeotto's own former slot, index 3, flips to `"Statused"` alongside Grovyle's already-flipped index 5 - confirmed by a 0-diff per-tile brute-force match against `battle-interface-ball-display.json`'s own 4 states at a settled pre-fade tick, not assumed from the turn-5 array); `TURN13_BALL_HANDOFF_TICK=16985` (first visible closed-ball pixel at render 16987, the same `handoffTick+BALL_CLOSED_START_OFFSET(2)` relationship `TURN5_BALL_HANDOFF_TICK` establishes - found by CROPPING the ball's own screen region in isolation, since the whole-frame sha was still confounded by the tail of the sent-out text typing at the same ticks); `TURN13_SWITCHIN_SENTOUT_TEXT_START_TICK=16947`; `MURKROW_LEVEL=50` (docs/turn15-16-notes.md's own later re-confirmation), `gender="male"` (not independently probed - just tried, and the healthbox region came back 0-diff at every sampled tick 17070-17105, so it's now oracle-CONFIRMED, not a residual guess).

**Real bug found via `npm run compare`, not guessed**: the button-gated fainted message's own wait-cursor does NOT disappear once the icon-bar retrigger starts (a first attempt dropped it entirely past `TURN13_ICONBAR_CREATE_TICK`) - the oracle keeps showing it, FROZEN at the press's own locked phase, all the way through 16946 (right up until the sent-out text hard-cuts over it). Regressed a constant, exactly-one-glyph-sized 37px diff at every sampled tick 16847-16946; re-drawing the frozen cursor (`cursorState(koDismissTick, cursorStart)`, the SAME frozen-phase call the pre-icon-bar branch already used) in the new switch-in dispatcher too closed it to 0.

**Second real bug, same method**: `drawTurn13SwitchinFieldBase`'s own first draft applied `TURN13_REGIME8_TO_REGIME1_SHIFT` (the shift `drawTurn13FieldBase` uses to reuse `turn5SitrusResettledBounceTick` for turn 13's OWN idle-bounce phase) to the healthbox's own bounce call but NOT to `drawTurn5RockSlideAttack`'s OWN internal bounce call (it silently expects an already-shifted value, per `drawTurn6FieldBase`'s own established calling convention) - a real ~2325px diff at every sampled settled-menu tick, isolated to Onix's own sprite. Shifting once, consistently, before either call closed part of it - but NOT all of it (see the named residual below: DESTIN's own switch-in turns out to RESET the idle-bounce regime, the same way turn 5's own Sitrus switch-in did, not continue it - `TURN13_SWITCHIN_RESET_SHIFT`, mirroring `turn5SitrusResettledBounceTick`'s own formula re-anchored to `TURN13_SWITCHIN_MENU_REDRAW_TICK=17106`, closes MOST of the settled-menu window but not the whole thing - see below).

**Named, excluded residual (time-boxed, NOT chased to the byte this session)**: two sub-windows stay wrong, both isolated by `npm run compare`'s own diff, neither faked into `captureFrames`:
1. **The materialize growing-silhouette + stretch/wobble sub-phase, render 17004-17069 (66 ticks, up to ~44% of the frame at its worst, tick 17018-17025)** - this session reused turn 5's own `TURN5_STRETCH_TABLE`/`TURN5_MATERIALIZE_RAMP_COEFF`/`turn5PidgeottoFrame`'s exact tick DELTAS re-anchored to `TURN13_BALL_HANDOFF_TICK`, per the brief's own "reuse, don't re-derive" guidance - but Murkrow's own real timing does NOT match Pidgeotto's byte-for-byte (§7's own flagged gap, confirmed real). One correction WAS found and fixed this session: `TURN13_MURKROW_SETTLE_TICK` is **17070** (oracle-pixel-bisected: this is where `ball_delta`-style crop-diffs against the settled sprite drop to exactly 0, NOT `TURN5_PIDGEOTTO_SETTLE_TICK`'s own relative offset which predicted 17086) - fixing this alone closed the ENTIRE tail (17070-17105, previously wrong) to 0-diff. The remaining 17004-17069 residual needs Murkrow's own materialize/wobble table RAM-probed fresh (`dump-switchin-materialize-affine.py`-style, per `faint-switch-notes.md`'s own precedent for Pidgeotto), not assumed transferable from Pidgeotto's own instance - a resuming worker's next concrete step.
2. **A subset of the settled turn-14 menu's own idle-bounce ticks** (`TURN13_SWITCHIN_RESET_SHIFT` closes most of the window - e.g. 17112/17114-17116/17123-17125/17150 are all confirmed 0-diff - but not all of it: 17106-17111/17113/17117-17122/17126-17130/17175/17200 still show a 769-2325px residual, cycling with the bounce's own ~9-tick period). A small integer-delta sweep of the reset shift (-6..+6) did NOT zero it out (best found: -6, still 13408px total across the sample set vs. 20383 at 0) - the true fix is likely NOT a pure additive shift (a genuinely different mechanism, e.g. a transient "blank" tick right at the reset instant, analogous to `MENU_IDLE_BLANK_END_TICK`'s own role in every FRESH menu-open) - not chased further this session, named not guessed.

### Traces: `turn13-switchin.json` 156/156, 0 diff (86 ticks in the two residual windows above deliberately excluded, not faked)

New committed trace, reusing `battle1-turn13-dense-a.json`'s own 108-segment script verbatim, picking up exactly where `turn13-dragonbreath-faint.json` left off (16820): 16820-16825 (KO-press boundary, overlap/regression), 16847-16867 (icon-bar slide-in spot-checks), 16900-17003 (dense - icon-bar hold+fade, species-flip, sent-out text, ball open), 17070-17105 (dense - healthbox slide-in through settle), 17106-17200 (the settled-menu ticks confirmed 0-diff only, per the named residual above).

### Verification

`npm test` **986/986** (unchanged - no new pure-logic surface this rung, pure wiring/rendering). `npm run build` green. `verify-turn13.ts` unchanged, still passes (its own checks are oracle-self-consistency only, no `src/` rendering compared). Full regression sweep 0 diff: `turn13-dragonbreath-faint` **141/141**, `turn13-sandattack` **190/190**, `turn13-menu` **57/57**, `turn12-menu` **46/46**.

### Turn 13 status: NOT fully green

All 4 rungs have landed *something*, but rung 4's own materialize/wobble + partial settled-menu residual (above) means turn 13 is not a clean 4-for-4 yet - the supervisor should NOT tick the whole arc off. Everything else in this rung (the KO-hold through icon-bar/species-flip/sent-out-text/ball-open, plus the healthbox slide-in through the bulk of the settled menu) is genuinely 0-diff and safe to build on.

### Out of scope, unchanged

AERIAL_ACE mechanisms 3/4 root causes; the hitsplat (ISSUES #31); the rung-3 2px HP-bar residual; turn 14+ wiring (no `turn13Resolved`-style reopen-gate branch added - out of scope per the brief, and the settled-menu residual above would need resolving first anyway); ISSUES #23.

## 51. S7 engine step: AERIAL_ACE + hitsplat CLOSE-OUT - all four parts LAND (turn-10 window fully 0-diff 12345-12437, ISSUES #31's hitsplat SOLVED, turn-12 mirror fully 0-diff) - a NEW residual found and honestly excluded (ISSUES #32, NOT the same bug as #31)

Pure wiring session against `docs/aerial-ace-notes.md`'s own fully-solved dossier (both the OVERLAP RULE and the 5-bit-domain DARKEN RULE) and `docs/turn9-shake-notes.md`'s own fully-solved hitsplat rule - every RAM/pixel fact was already pinned; this session's own job was applying them and (per the brief's own TRAPS warning) instrumenting rather than curve-fitting wherever a pinned rule didn't reproduce verbatim.

**PART 1 (overlap + darken, renders 12368-12373)**: `drawTurn10AerialAceLungeAndClones` now draws the real sprite opaque, then slot 7 LAST via a new `drawTurn10AerialAceCloneWinsOverField` helper - wins its OAM tie against the real sprite unconditionally for its whole life, blended against the field alone (`staticBgPixel`, computed from the BG asset, never sampled from `fb`). Slot 4 was NOT a clean transfer of the same rule: `npm run compare` falsified "slot 4 always wins" (regresses the already-proven 12363-12367 window back to its pre-fix residual) AND falsified "slot 4 always loses" (renders 12368-12369 mismatch, oracle matching slot 4's own blend-against-field prediction, not the real sprite's plain color) - the actual RAM-pixel-bisected truth is a ONE-TICK FLIP: slot 4 loses for its whole life EXCEPT the very last tick, render 12368 (`turn10AerialAceSlot4WinsAtLifeEnd`), where it wins outright; it's fully dead by render 12369 (corrected end lag from the borrowed lunge +2 to the ordinary +1, `turn10AerialAceSlot4Offset`'s own window now ends at 12368, not 12369 - the existing Tier-1 pin from an earlier session was WRONG and updated). Also fixed a missing ground-clip on the new clone-wins draw path (slot 7 was bleeding past `TURN9_QUICKATTACK_LUNGE_GROUND_CLIP_Y` at renders 12370-12373, caught by `npm run compare`, not assumed).

**PART 2 (flicker, gapless 12345-12437)**: `turn9Ep2OnixInvisible` generalized with an optional `start` param (default unchanged for turn 9); turn 10 reuses it verbatim at `start=102`. Extending the trace to gapless coverage surfaced a SECOND, previously-unprobed mechanism exactly where `docs/aerial-ace-notes.md`'s own Mission B left it as a named, unchecked gap: a player-healthbox `y2` wobble (the ENDEAVOR §15f companion the dossier flagged but never RAM-probed), occupying the EXACT same 12407-12426 span - `menuHealthboxPlayer`'s own asset bbox `(127,74)-(229,109)` matches the residual's own bbox pixel-for-pixel. Generalized `turn9Ep2HealthboxWobbleY2` the same way and tested the obvious reuse hypothesis directly against the oracle (`start=101`, one tick before the flicker, mirroring turn 9's own 86-vs-87 relative offset) - closes to 0 diff exactly, confirmed empirically via `npm run compare`, not curve-fit from the shape alone.

**PART 3 (ISSUES #31 hitsplat, ~restore 10935-10944)**: `drawSpriteSheetAffineStretchBlendedOverFb` (the hitsplat's sole caller) now computes target2 from `staticBgPixel` instead of sampling `fb`, and the coefficient changed from the old `eva=16,evb=16` guess to the RAM-true `eva=12,evb=8`. 8 of the 10 restored renders (10935-10939, 10942-10944) are pixel-exact. The other 2 (10940-10941) turned out to be a DIFFERENT, previously-unprobed bug: Pidgeotto's own QUICK_ATTACK clones (slot 3/4) show a 203px residual there, structurally similar in SHAPE to AERIAL_ACE's own overlap rule (slot 4 sits at its own life-end here too) but NOT the same rule numerically - applying AERIAL_ACE's exact formula here does not reach 0 tolerance (tried, reverted, not curve-fit). Named as **ISSUES #32** (a fresh, separate issue - #31 itself, the hitsplat's own target2 bug, is genuinely solved and deleted per the brief's own convention).

**PART 4 (turn-12 mirror, +2068 shift)**: `drawTurn12AerialAceWindow` already called turn 10's five mechanism functions verbatim, but had never wired mechanism 4's darken, the flicker, or the healthbox wobble - all three are purely `(t, pressTick)`-relative, so the SAME anchors transfer verbatim to turn 12's own live `pressTick` (no new derivation needed, confirming the dossier's own "bit-exact +2068 re-anchor" characterization holds for these three mechanisms too, not just the original five). `drawTurn12FieldBase` gained the same `onixInvisible`/`healthboxY2Override` params `drawTurn10FieldBase` picked up in PART 2.

### Traces

`turn10-aerialace.json` extended 12368-12437 (was 12345-12367), now **gapless 12345-12437, 93/93 0-diff** (`turn10-rockslide.json` still owns 12438+, unchanged boundary). `turn9-quickattack.json` restored 10935-10939+10942-10944 (excludes 10940-10941, ISSUES #32), **167/167 0-diff** (was 159/159). `turn12-aerialace.json` extended over the previously-excluded 14431-14505 shifted range, **131/131 0-diff** (was 56/56).

### Verification

`npm test` **993/993** (986 + 7 new Tier-1 tests: `turn10AerialAceSlot4WinsAtLifeEnd`, the corrected `turn10AerialAceSlot4Offset` life-1 window, turn 10's own re-anchored `turn9Ep2OnixInvisible`/`turn9Ep2HealthboxWobbleY2` pins). `npm run build` green. `tools/probe/verify-turn10-aerialace.ts` **49/49**, `tools/probe/verify-turn9-hitsplat.ts` **12/12**, both unchanged/still passing (mandatory-first-step reruns, confirmed intact throughout). Full regression sweep 0 diff: `turn10-rockslide` **220/220**, `turn9-quickattack-b` **77/77**, `turn9-rockslide` **130/130**, `turn12-rockslide-miss` **38/38**, `turn13-switchin` **156/156** - `battleScene.ts` is shared across every one of these, confirmed no collateral.

### Out of scope, unchanged

Turn-13's own §50 residuals (materialize/wobble, settled-menu subset); turn-14+ wiring; ISSUES #23; the rung-3 2px HP-bar residual. **New**: ISSUES #32 (turn 9 QUICK_ATTACK clone overlap at 10940-10941) - opened this session, not chased further per the "wiring not derivation" convention; needs a fresh `gMain.oamBuffer` RAM probe of slot 3/4 before the next attempt.
