# Turn 8 ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only)

Ground-truth dossier for battle 1's turn 8 (Onix vs. PIDGEOTTO, both still on
their turn-6/7 sides) **on the winning line**: extends
`tools/compare/traces-groundtruth/battle1-turn7-dense.json`'s own committed
script verbatim with `battle1-winline-b-swap.json`'s own segments[74:80] (the
turn-8 FIGHT-submenu-open, one `RIGHT` press onto BIND, move-confirm, and
1400-frame resolution-idle) — cross-verified against `docs/battle-turn-
notes.md` §15 HEADLINE 2 (the exact turn this session's brief flagged: "a
different move at turn 8 reshuffles the whole downstream RNG stream") and
§16 (which extends the same line to the actual WIN). **Turn 8 is the first
tick where this dossier's two published lines actually diverge**: §14's
"always ROCK_SLIDE" line uses ROCK_SLIDE here (and misses); the winning
line this session follows — the one `battle1-winline-b-swap.json` actually
plays, per the brief's explicit instruction — substitutes **BIND** (move
slot 1, one `RIGHT` press from ROCK_SLIDE's slot 0) instead. **Pinned up
front, per the brief: this dossier documents the BIND line, not the
ROCK_SLIDE line** — §15's own table confirms both share an identical RNG
state entering turn 8 (turns 6-7 byte-identical on both lines), so BIND's
miss here is "the same underlying bad draw" ROCK_SLIDE would have hit with,
not an unrelated unlucky roll (§15's own reasoning, re-confirmed structurally
below, not re-derived). **Groundwork only — no engine code, no `src/`
changes**, per this session's worktree brief. All frame ticks are this
dossier's own absolute numbering, shared with `battle1-turn6-dense.json`/
`battle1-turn7-dense.json`/`battle1-winline-*.json` (verified directly below,
not assumed).

Sources: `reference/pokeemerald/src/battle_script_commands.c`
(`ChangeStatBuffs`, the stat-floor/message-choice logic), `reference/
pokeemerald/src/battle_util.c` (`ENDTURN_WRAP`, BIND's own residual-damage
mechanism, sourced but not RAM-exercised this turn — see §6),
`reference/pokeemerald/src/battle_message.c` (`sText_AttackMissed`),
`src/data/gen/moves.json`, `bin/oracle symbols`. Oracle probes: `tools/
probe/ram-probe.py` + `tools/probe/dump-battler-full.py` (both pre-existing,
reused unchanged). New committed trace: `tools/compare/traces-groundtruth/
battle1-turn8-dense.json`.

## 1. Prefix-consistency verdict: turn7-dense.json + winline-b-swap[74:80] IS a verbatim, pixel-exact extension

Checked programmatically, not assumed, at two levels (the brief's own
"flatten-and-compare" convention, done both ways this session):

- **Press-event equality**: flattened both `battle1-turn8-dense.json`'s own
  82 segments and `battle1-winline-b-swap.json`'s own 156 segments to
  `(tick, buttons)` press-event lists (ignoring pure-idle segments). Every
  one of my 70 press events matches `winline-b-swap.json`'s own first 70,
  index-for-index — **0 mismatches**.
- **Full per-frame equality**: flattened both scripts to a per-tick button
  state for every one of the shared 10826 ticks (not just press events) —
  **0 diffs** across the entire window.
- **Pixel cross-check** (not required by the brief but cheap and decisive,
  same method turn6/turn7 used): a spot-check `bin/oracle run` of
  `battle1-winline-b-swap.json` with `captureFrames` restricted to 10 of my
  own trace's tick numbers (9385, 9420, 9468, 9700, 9764, 9838, 9861, 9915,
  9997, 10010 — spanning the submenu open, both cursor positions, the
  animation hold, all three message-box settles, and the turn-9 menu
  resettle) produced **byte-identical sha256 at every one** against my own
  committed trace's own capture of those same ticks.

**Verdict: the composite script reproduces the real winline chain's pixels
exactly, and this is the BIND line specifically** — §14's own "always
ROCK_SLIDE" line is a genuinely different, non-overlapping turn-8 script
starting here (not probed this session, out of scope per the brief).

## 2. The committed trace

`tools/compare/traces-groundtruth/battle1-turn8-dense.json`: 82 segments,
10826 frames total (`turn7-dense.json`'s 76 segments + `battle1-winline-b-
swap.json`'s own segments[74:80] verbatim — the turn-8 submenu-open `A`, 30f
settle, `RIGHT` onto BIND, 10f settle, confirm `A`, and the full 1400-frame
resolution-idle). 226 `captureFrames` (under the 256 cap — turn 8 needed
fewer than turn 6/7 because a miss skips the crit/damage-drain/secondary-
effect windows entirely), dense (stride-1) over the genuinely eventful spans
— submenu-open/cursor-move/confirm/kickoff-text-typing (9375-9469, 95
ticks), the ATK-harshly-fell message-box transition (9755-9775), the
FEATHER_DANCE-fell-to-BIND-kickoff transition (9835-9870, spanning the
accuracy-roll tick), the BIND-kickoff-to-miss-message transition (9890-9920),
and the turn-end/turn-9-menu-resettle window (9985-10015) — plus 12 sparse
single-tick samples across the two long uneventful holds (the FEATHER_DANCE
animation loop and the settled miss-message text) and the turn-9 menu's own
idle cycle, confirming they stay static/cycling rather than dense-capturing
every one of their ~150 combined uneventful ticks (matching turn6/turn7's
own "boundary + representative sampling, not exhaustive stride-1 over pure
animation-hold" convention). **Twice-run byte-identical**: `bin/oracle run`,
two independent runs, manifests (226/226 captures) diffed identical, 0 sha
mismatches.

## 3. RNG-consumption ledger for turn 8 (RAM-truthed, LCG-step-counted)

`gRngValue` (`0x3005d80`) sampled every tick 9370-10826 via `ram-probe.py`.
Step counts are verified LCG distances (`next = 1103515245*v + 24691 mod
2^32`), not tick-diff guesses:

| tick | steps | value after | attribution |
|---|---|---|---|
| 9436 | 1 | `680271464` | Pidgeotto's **FEATHER_DANCE roll** (`Cmd_accuracycheck`, acc=100 — still consumes a `Random()` call, same rule turns 6/7 pinned) |
| 9844 | 1 | `3780969147` | Onix's **BIND accuracy check** (acc=75, `data/gen/moves.json` — confirms §15's own flagged cross-check: BIND's real accuracy is 75, not the "85" §14's prose mistakenly compared it to) — **this roll misses** |
| 9990 | 1 | `3809575954` | turn-pass bookkeeping (`gRandomTurnNumber`) |
| 9996 | 5 | `736484049` | opponent-AI next-move-scoring cluster, same "...5" tail shape as turns 6/7 |

**Total: 8 `Random()` calls this turn** — 3 fewer than turn 6/7's 11 apiece.
The gap is exactly BIND's own miss: no crit roll, no damage-spread roll, and
no secondary-effect roll fire, because the accuracy check alone determines
the outcome and the battle script branches straight to the miss message —
matching `battle-turn-notes.md` §14's own general observation ("turns 8, 9,
13 have fewer steps consistent with a miss") with a fully attributed,
tick-exact ledger for the first time. No `ShouldSwitch()` 2-step pair this
turn either.

## 4. Turn order and battler stats (RAM-confirmed, `dump-battler-full.py`)

`gBattlerAttacker` flips **0→1 at tick 9430** (Pidgeotto acts first, same
1-point Speed margin as turns 6-7): `gCurrentMove` reads **297
(FEATHER_DANCE)** at 9431, then resets to 0 at 9837 and reads **20 (BIND)**
at 9838 with `gBattlerAttacker` back to 0 (Onix). Battler snapshots (ticks
9370 pre-turn / 10010 post-turn, full struct via `dump-battler-full.py`):

| | ONIX (battler0) | PIDGEOTTO (battler1) |
|---|---|---|
| atk/def/spd/spA/spD | 51/187/76/36/72 (unchanged) | 98/61/77/56/56 (unchanged) |
| moves (id) / PP before → after | ROCK_SLIDE(157) **4/10 → 4/10 (frozen, unused this turn)**, BIND(20) **20/20 → 19/20 (1st use)**, DRAGON_BREATH(225) 19/20 (unchanged), SANDSTORM(201) 10/20 (unchanged) | AERIAL_ACE(332) 20/20, QUICK_ATTACK(98) 30/30, FEATHER_DANCE(297) **13/15 → 12/15 (3rd use)**, SAND_ATTACK(28) 15/15 (all unchanged except FD) |
| HP before → after | 31 → 31 (unchanged — BIND missed) | 82 → 82 (unchanged) |
| ATK stat stage before → after | **2 → 0** (another −2, hits the floor exactly — see below) | 6 → 6 (unchanged) |
| item | 0 (none) | 180 (`ITEM_WHITE_HERB`, unchanged from turns 6-7 — still doesn't trigger, Pidgeotto's own stats are untouched this turn too) |

**PP pin for the turn-9 handoff** (per this session's brief): ROCK_SLIDE
sits frozen at **4/10** through this turn exactly as `turn7-notes.md` §4
predicted ("ROCK_SLIDE's PP stays frozen at 4/10 through turn 8 on \[the
winning] line, only resuming its decrement from turn 9 onward"). BIND is now
**19/20** (its first use, on the winning line). FEATHER_DANCE is **12/15**.

### The ATK-stage floor: hit exactly, but the "won't decrease further" message variant does NOT fire this turn — pinned from source

Onix's ATK stage enters this turn at **2** (raw stage value, 6=neutral,
`MIN_STAT_STAGE=0`) — two prior FEATHER_DANCEs down, per the brief's own
setup note. FEATHER_DANCE's third use this battle lowers it by 2 more,
landing **exactly on the floor (0)**, RAM-confirmed (`atkStage0`: 2→0 at
tick 9471) and pixel-confirmed: "ONIX's ATTACK harshly fell!" — the
**ordinary** fall message, not a "won't go any lower!" variant. Traced to
source (`ChangeStatBuffs`, `reference/pokeemerald/src/
battle_script_commands.c:7040`): the `B_MSG_STAT_WONT_DECREASE` message
choice is gated on `gBattleMons[gActiveBattler].statStages[statId] ==
MIN_STAT_STAGE` **checked before this application's own decrement is
applied** — i.e. it fires only when the stat is *already* at the floor
walking into the attempt, not when an in-flight decrement merely *lands* on
it. Since Onix's stage was 2 (not yet 0) at the moment `ChangeStatBuffs` ran,
the ordinary "fell" branch is taken, then the stage clamps to
`max(MIN_STAT_STAGE, 2-2)=0` after the fact — a clamp with no visible
message difference from an unclamped fall. **This is genuinely new to the
dossier** (turns 1-7 never drove any stat to its stage floor) and directly
answers the brief's question: **a 4th FEATHER_DANCE use (turn 9+, out of
scope this session, not probed) is the actual trigger condition** for the
"won't go any lower!" text — noted as the natural next test in §7.

### Damage: none — matches the published ledger (82→82, 0) exactly

`gBattleMoveDamage` never locks to a nonzero value tied to this move; `hp1`
(Pidgeotto) is RAM-flat at **82** for the entire 9370-10826 window. Matches
`battle-turn-notes.md` §15 HEADLINE 2's own published table for turn 8
exactly (`82→82 (0)`, "BIND (miss)") — no new discrepancy.

## 5. Pixel/window boundaries (sha256-cited, `battle1-turn8-dense.json`, twice-run identical)

All frame numbers are this dossier's absolute tick numbering. sha256 shown
truncated to 12 hex chars for table width. Every text-content label below
is **PNG-read**, not inferred from RAM or from `data/gen/moves.json` alone
— this dossier's explicit brief instruction, following `turn6-notes.md` §5's
own mislabeling lesson.

| boundary | tick | sha256 (12) | note |
|---|---|---|---|
| turn-8 settled menu persists (pre-press baseline) | 9375-9384 | `838c18eab548` | same resting frame `battle1-turn7-dense.json` itself ends on; **PNG-read**: "What will ONIX do?" FIGHT/BAG/POKéMON/RUN |
| FIGHT submenu settled, cursor still on ROCK_SLIDE (**cursor persistence, pre-RIGHT-press**) | 9404-9412 | `c4c273d6f2c0` | **PNG-read**: ROCK SLIDE▶/DRAGONBREATH/BIND/SANDSTORM, PP 4/10, TYPE/ROCK — cursor unmoved since turn 6, same rule turn7-notes §5 exercised |
| FIGHT submenu settled, cursor on BIND (**post-`RIGHT`-press**) | 9414-9427 | `8ae1584b8f38` (9414-9421), a second static sub-phase 9422-9427 | **PNG-read** at 9420: ROCK SLIDE/DRAGONBREATH/BIND▶/SANDSTORM, PP **20/20**, TYPE/NORMAL — confirms §15 HEADLINE 2's own "one `RIGHT` press from ROCK_SLIDE's slot 0" claim directly against pixels, and BIND's own fresh (unused) PP |
| move confirmed (`A` held 9424-9425) | 9424-9437 | `a64a7fa450de` (9428-9437) | no visible change during the press itself — screen stays on the settled submenu through 9437 despite RAM's `gCurrentMove`=297 already landing at 9431 (6-tick render lag, same "RAM commits before pixels catch up" pattern as every prior turn) |
| FEATHER_DANCE kickoff text typing in | 9438-9467 | (letter-by-letter, no single sha) | **PNG-read** at 9444 ("Foe PID"), 9450 ("Foe PIDGEOTTO"), ordinary typewriter reveal, not a new mechanism |
| FEATHER_DANCE kickoff text fully visible, animation begins | 9468 (settled) → continuous churn through ~9738 | `1d79ff34cb3b` (9468-9483, first static beat, recurs at 9639-9651 mid-animation) | **PNG-read** at 9468: "Foe PIDGEOTTO used FEATHERDANCE!" fully typed. **PNG-read** at 9700/9730: a yellow feather/starburst attack animation plays over **Pidgeotto's own sprite region**, text unchanged underneath — same shape turn6-notes §5's correction and turn7-notes §5 both already pinned, now RAM-and-pixel-reconfirmed fresh for a 3rd turn running |
| message-box transition into "ATTACK harshly fell" | 9739-9763 | first 4 frames `cc1a3ecfef0c`/`73947492b64f`/`74228f499a15`/`5256c532910a` (see cross-check below), diverges after | 25-tick transition |
| "ONIX's ATTACK harshly fell!" text holds | 9764-9845 | `6599b1075f5c` | **PNG-read** at 9780: "ONIX's ATTACK\nharshly fell!" — settles **293 ticks** after the RAM stat-stage write (9471), essentially identical to turn6's 294-tick and turn7's 293-tick gap for the same message — a third turn in a row landing on the same offset |
| RAM: `gBattlerAttacker`→0 (Onix), `gCurrentMove`→20 (BIND) | 9838 | (no pixel change yet) | still under the still-static "fell" text — 8-tick render lag before any visual transition begins |
| RAM: BIND accuracy roll (miss) | 9844 | (no pixel change yet) | **fires 2 ticks before the box-open transition even starts** — same "roll settles under the *previous* move's text, before the new kickoff message opens" pattern turn7 §3/§5 established for ROCK_SLIDE's own accuracy roll |
| message-box transition into "ONIX used BIND!" | 9846-9858 | first 4 frames identical to the transition above (see cross-check) | 13-tick transition |
| "ONIX used BIND!" text holds | 9859-9895 | `fa8e70f4e678` | **PNG-read** at 9880: "ONIX used\nBIND!"; RAM: BIND's own PP dec (19/20) lands at 9861, silently under this static text — same "RNG/PP doesn't need a pixel change" rule turns 6/7 established |
| message-box transition into "attack missed!" | 9896-9914 | first 4 frames identical to both transitions above (see cross-check) | 19-tick transition — longer than the other two because the destination text ("ONIX's attack missed!") is typed letter-by-letter across it (**PNG-read** at 9900 "ONIX'", 9910 "ONIX's attack mi..."), not a special whiff/dodge animation — confirmed by direct PNG read, not assumed |
| "ONIX's attack missed!" text holds | 9915-9990 | `ccb600cf6919` | **PNG-read** at 9950: "ONIX's\nattack missed!" — matches `sText_AttackMissed` (`reference/pokeemerald/src/battle_message.c:68`) exactly; holds **76 ticks**, notably longer than this turn's other two holds — not chased further (no contradicting evidence, just unexplained magnitude, flagged not resolved) |
| secondary-effect/turn-end, text clears, turn-9 menu reopens | 9991-9996 (`d3270f177537`) → 9997 (settled, 1-tick lag behind RAM's own `bg0y` flip at 9996) → 9998 (1-tick flicker, `68d0341ce1b6`) → 9999 stable | `15a8ef75dfb2` | **PNG-read** at 10010: "What will ONIX do?" — **pixel-identical to the turn-8 baseline** (9375-9384's own sha), confirming neither combatant's HP changed this turn |

### New cross-check: the message-box-open 4-frame prefix (turn7 §5's own correction) reconfirmed **three times within this single turn**

Turn7-notes §5 corrected an earlier turn6-notes claim, finding only a
**4-frame** shared prefix (not a full 26-frame match) between two separate
message-box-open sequences, attributed to "one generic open routine,
content-independent only briefly." This turn gives an unusually clean,
independently-verified triple-check: **all three of this turn's own
message-box transitions** (FEATHER_DANCE-kickoff→"fell", "fell"→BIND-
kickoff, BIND-kickoff→"missed") open with the **exact same 4 sha256 values**
(`cc1a3ecfef...`, `73947492b6...`, `74228f499a...`, `5256c53291...`),
verified programmatically byte-for-byte, then diverge immediately after —
the strongest confirmation yet of turn7's theory, now backed by 3
same-turn instances instead of 2 cross-turn ones.

### Minor new observation: the settled action-select menu has its own idle-cycle

Ticks 9999-10059 (scouted past this trace's own committed range, for
characterization only) cycle through 4 distinct frames (`838c18eab548`,
`c7be1bdbcb89`, `68d0341ce1b6`, `15a8ef75dfb2`), each held ~9 ticks (a
~36-tick period) — almost certainly the same generic background-twinkle
effect the README already documents being checked for the FIGHT submenu
specifically (`battle1-fight-submenu-idle.json`), now observed at the base
action-select screen too. Not gameplay-relevant, not itemized further.

## 6. New-to-turn-8 mechanism inventory

**BIND's own trap effect (`EFFECT_TRAP`) is NOT exercised on this line** —
the accuracy check misses (§3, §4), so the battle script never reaches the
`MOVE_EFFECT_WRAP` branch that would set `STATUS2_WRAPPED` (`status2_0`/
`status2_1` are RAM-flat 0 for the entire turn, confirmed). Per the brief's
request for a sketch anyway (sourced only, not RAM-exercised this session):

- **On-hit**: `Cmd_seteffectwithchance`-equivalent path (`reference/
  pokeemerald/src/battle_script_commands.c:2612-2618`) sets
  `gBattleMons[gEffectBattler].status2 |= STATUS2_WRAPPED_TURN((Random() &
  3) + 3)` — a 3rd `Random()` call this turn *would* have fired had BIND
  connected (this dossier's ledger above only shows 8 calls precisely
  because it didn't). `STATUS2_WRAPPED` occupies status2 bits 13-15 (a
  3-bit turn counter, values 3-6 — note the move's own flavor text says
  "2 to 5 turns," a **discrepancy between the in-game description and the
  actual implemented range**, not reconciled further this session).
- **End-of-turn residual** (`reference/pokeemerald/src/battle_util.c:1592-
  1620`, `ENDTURN_WRAP` case): each end-of-turn, the wrapped mon's own turn
  counter decrements by 1; while still nonzero, `gBattleMoveDamage =
  maxHP/16` (min 1) is dealt via `BattleScript_WrapTurnDmg`, with the
  original binding move's name buffered for the message
  (`gBattleStruct->wrappedMove[battler*2]`); at 0, `BattleScript_WrapEnds`
  prints a "broke free" message instead. This is the multi-turn, end-of-turn
  damage tick the brief specifically flagged as "a NEW mechanism if taken" —
  confirmed genuinely new (no prior committed turn exercises any status2
  timer-based residual), but **entirely unexercised this session** since the
  line's own BIND attempt missed. A future session revisiting turn 8 with a
  hit (or probing any other BIND/WRAP/FIRE_SPIN-family move landing) would
  need to dense-capture the *following* turn's end-of-turn phase to
  RAM-and-pixel-confirm this, not this turn's own resolution window.
- **Sprite/task**: not itemized (never reached this session — no hit).

Otherwise, no mechanism this turn is new beyond what turns 6-7 already
established (FEATHER_DANCE's own two-message shape, kickoff-animation-gates-
the-hold timing, `Random()`-doesn't-need-a-pixel-change) — the two genuinely
new findings are the ATK-stage floor-clamp behavior (§4) and BIND's own miss
message, PNG-confirmed against source for the first time in this dossier
chain (previous misses in `battle-turn-notes.md` §14/§15 were inferred from
flat HP deltas, never pixel-read against `sText_AttackMissed` directly).

## 7. Turn 9+ boundaries (noted, not densely probed — out of scope this session)

- Turn 9's action-select menu is settled by tick **9997** (§5), matching
  RAM-flat 9996-10826 (re-checked directly). `battle1-winline-b-swap.json`'s
  own next press is at **10826**, exactly this trace's own final tick — the
  natural starting point for a future turn-9 scout.
- Per §15 HEADLINE 2, turn 9 **reverts to ROCK_SLIDE** (one `LEFT` press
  back from BIND's slot 1) — `winline-b-swap.json`'s own segments[80:86]
  (`A`/30f/`LEFT`/10f/`A`/1400f, ticks 10826-12272) is the natural next
  6-segment span, mirroring this turn's own script shape exactly (open,
  settle, one nav press, settle, confirm, idle).
- ROCK_SLIDE's PP re-enters active decrement from turn 9 onward, still
  sitting at **4/10** — 6 uses left before it hits 0 (§15's own table has it
  exhausting at turn 12, one turn later than §14's own "always ROCK_SLIDE"
  line, exactly the "deferred by one turn's worth of non-use" effect
  turn7-notes §7 predicted).
- Onix's ATK stage sits at the **floor (0)** entering turn 9. Per §4's
  source-level finding, **any future FEATHER_DANCE use against Onix should
  now trigger the "won't go any lower!" message variant** (`B_MSG_
  STAT_WONT_DECREASE`) instead of the ordinary "fell" text — the natural,
  concrete next test for whoever scouts turn 9, since Pidgeotto's AI has
  used FEATHER_DANCE at turns 6, 7, and 8 already (not guaranteed to repeat,
  per `battle-turn-notes.md` §14's own turn-9 entry showing Pidgeotto
  switches to QUICK_ATTACK on the *other* line at this exact turn — whether
  the winning line's own turn 9 repeats FEATHER_DANCE or not is genuinely
  unknown, not assumed here).

## Verification

`npm test` (793/793) and `npm run build` green (no `src/` changes this
session — the only additions are `tools/compare/traces-groundtruth/
battle1-turn8-dense.json` and this doc, per the worktree brief's
constraint). Trace twice-run via `bin/oracle run`, manifests (226/226
captures) byte-identical across two independent runs. RAM probe
(`ram-probe.py`) re-run and diffed against its own structural expectations
(LCG step counts recomputed from raw values, not trusted from a single
pass); `dump-battler-full.py` re-run independently, same values both times.
Cross-check against the already-committed `battle1-winline-b-swap.json` (10
spot-checked ticks plus a full 10826-tick per-frame button-state diff, §1)
byte-identical. The triple message-box-prefix cross-check (§5) was verified
programmatically (sha256 string equality across all three transitions), not
eyeballed.
