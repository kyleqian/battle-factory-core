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
| 2340 | 1 | `3552646270` | unattributed (turn-end cluster, see §7 risk 1) |
| 2345 | 2 | `1572843288` | unattributed (turn-end cluster) |
| 2347 | 5 | `4098214719` | unattributed (turn-end cluster); `gRngValue` goes flat here through the trace's end (tick 2620) |

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
   session).
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
   `stat`/`stages` multiplier beyond +1) and the "GROVYLE's evasiveness
   rose!" text this turn actually prints. No other stat/stage on either
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
4. **Battle text strings for turn 1's messages** ("ONIX used ROCK SLIDE!",
   "It's super effective!"/"Critical hit!" variants, "GROVYLE used DOUBLE
   TEAM!", "GROVYLE's evasiveness rose!", flinch/faint text) — **not**
   extracted this session (ran out of time budget after the trace+RAM+data
   work above); needed before an engine slice can render turn-1 text
   byte-exactly. Location for a future extractor:
   `src/data/battle_message.c`'s string tables (`gStatUpText`,
   `gMoveUsedText`-equivalent battle-string templates addressed by
   `B_TXT_*` placeholders, per `battle-bringup-notes.md` §3's own note on
   this template system).
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

1. **The turn-end 8-step (this session) / 9-step (`turn-resolution-notes.md`)
   RNG cluster is still not mapped to an exact call site.** Both sessions'
   own tail ends in a "...2-step, then 5-step" LCG signature regardless of
   which moves were used this turn — a stronger cross-session hint toward
   `turn-resolution-notes.md` Risk #2's "opponent AI scoring its next
   move" hypothesis than either session alone provided, but still not
   confirmed via source-level tracing. **Probe:** a source-level
   breakpoint/trace (or selectively no-op'ing `battle_ai_script_commands.c`
   RNG call sites in a scratch ROM patch) before any Tier-1 test asserts an
   exact RNG-step-count invariant for a full turn.
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
