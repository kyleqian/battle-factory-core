# Turn 6 ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only)

Ground-truth dossier for battle 1's turn 6 (Onix vs the switched-in
PIDGEOTTO), on the exact line the engine chain will replay: extends
`tools/compare/traces/turn5-switchin.json`'s own committed button script
(the engine-chain trace currently ending mid-materialize at tick 6754) with
the "always ROCK_SLIDE" turn-6 inputs, cross-verified against
`docs/battle-turn-notes.md` §14 (turns 6-14's own first pass) and §15/§16
(the winning line, which shares the identical turns-1-7 prefix). **Groundwork
only — no engine code, no `src/` changes**, per this session's worktree
brief. All frame ticks are this dossier's own absolute numbering, shared with
`battle1-grovyle-faint.json`/`battle1-winline-*.json` (see §1 — same anchor,
same numbering, cross-checked directly, not assumed).

Sources: `reference/pokeemerald/src/pokemon.c` (`CalculateBaseDamage`),
`src/data/gen/{moves,type-effectiveness}.json`, `bin/oracle symbols`. Oracle
probes: `tools/probe/ram-probe.py` + `tools/probe/dump-battler-full.py`
(both pre-existing, reused unchanged). New committed trace:
`tools/compare/traces-groundtruth/battle1-turn6-dense.json`.

## 1. Prefix-consistency verdict: turn5-switchin.json IS a verbatim prefix

Checked programmatically (segment-by-segment `list` equality), not assumed:

- `tools/compare/traces/turn5-switchin.json`'s 67 segments (6754 frames) and
  `tools/compare/traces-groundtruth/battle1-grovyle-faint.json`'s first 65
  segments are **byte-identical**, index 0-64 (every button press, every
  idle-frame count). They diverge only at the trailing idle: segment 65 is
  `{frames: 26}` then a 66th `{frames: 166}` in `turn5-switchin.json` (total
  tail 192 frames from the last press) vs. one `{frames: 750}` segment in
  `battle1-grovyle-faint.json` (same tail, just not yet cut short) — **both
  idle the identical span with zero buttons**, so this is purely "how far
  into the same idle window does the trace go," not a script divergence.
  The last real button press (`A`, tick 6560-6562) lands at the **identical
  absolute tick in both files** (verified: `cum(a)[64] == cum(b)[64] ==
  (6560, {frames:2,buttons:['A']})`).
- `battle1-grovyle-faint.json`'s full 66 segments (7312 frames) are in turn a
  **byte-identical prefix** of `battle1-winline-b-swap.json`'s own 156
  segments (checked the same way, 0 mismatches through index 65) — i.e. the
  chain `turn5-switchin.json` ⊆(buttons) `battle1-grovyle-faint.json` ⊆(bytes)
  `battle1-winline-b-swap.json` holds all the way, confirming §15/§16's own
  prose claim ("identical to §14's own turns 1-7... byte-identical") against
  the actual committed files, not just the doc text.
- **Verdict: no divergence found.** Turn 6's ground truth was derived
  directly from `battle1-winline-b-swap.json`'s own segments[66:70] (the
  turn-6 FIGHT-submenu-open, move-confirm, and 1000-frame resolution-idle
  segments), which is simultaneously §14's line, §15's line, and §16's line
  at this exact turn (all three only diverge starting turn 8's move choice,
  §15 HEADLINE 2) — so there is exactly one "turn 6" ground truth to give,
  not a choice between competing lines. No implication for S8 chain
  acceptance beyond what §14/§15/§16 already established: extending
  `turn5-switchin.json` with real button presses (not just more idle) is a
  correctness-preserving operation, confirmed both at the script level and
  (§1 continued below) at the pixel level.

**Extra verification, not required by the brief but cheap and valuable**: a
spot-check `bin/oracle run` of `battle1-winline-b-swap.json` with
`captureFrames` restricted to 11 of my own new trace's tick numbers
(7307,7317,7344,7360,7390,7558,7758,7790,8014,8121,8129) produced
**byte-identical sha256 at every one** against my own committed trace's own
capture of those same ticks — i.e. the composite script I built (turn5-
switchin.json's exact 67 segments + one pure-idle filler segment to 7312 +
`battle1-winline-b-swap.json`'s own segments[66:70] verbatim) reproduces the
real chain's pixels exactly, not just its button list.

## 2. The committed trace

`tools/compare/traces-groundtruth/battle1-turn6-dense.json`: 72 segments,
8346 frames total (turn5-switchin.json's 67 segments + one 558-frame filler
idle reaching tick 7312, verbatim-identical in effect to
`battle1-grovyle-faint.json`'s own longer idle tail, + `battle1-winline-b-
swap.json`'s segments[66:70] — the turn-6 submenu-open `A`, 30f settle,
confirm `A`, and the full 1000-frame resolution-idle). 251 `captureFrames`,
dense (stride-1) over nine windows bracketing every RAM-confirmed transition
this turn (submenu-open edge, kickoff-text starts, stat-change message,
animation/impact windows, HP-drain window, secondary-effect/turn-end/next-
menu-reopen) — see §4 for the exact windows and what each one shows. The
settle window tick 6350-7312 (ball-throw through the settled action menu)
is **already densely covered by prior committed traces**
(`battle1-switchin-dense-{a,b,c,d}.json`, `docs/faint-switch-notes.md` §8-10)
and was not re-captured here — this trace picks up exactly where that
coverage ends. **Twice-run byte-identical**: `bin/oracle run`, two
independent runs, manifests (251/251 captures) diffed identical, 0 sha
mismatches.

## 3. RNG-consumption ledger for turn 6 (RAM-truthed, LCG-step-counted)

`gRngValue` (`0x3005d80`) sampled every tick 7290-8346 via `ram-probe.py`
(twice-run, byte-identical output both times). Step counts are verified LCG
distances (`next = 1103515245*v + 24691 mod 2^32`), not tick-diff guesses:

| tick | steps | value after | attribution |
|---|---|---|---|
| 7356 | 1 | `1484887866` | Pidgeotto's **FEATHER_DANCE roll** (`Cmd_accuracycheck`, acc=100 — still consumes a `Random()` call despite 100 accuracy, matching this dossier's established rule that only `EFFECT_ALWAYS_HIT` moves skip the roll entirely, e.g. Murkrow's FAINT_ATTACK per §15) |
| 7763 | 1 | `3692916773` | Onix's ROCK_SLIDE **accuracy** check (acc=90) |
| 7787 | 1 | `3528615476` | Onix's **crit** roll |
| 7790 | 1 | `3899767959` | Onix's **damage-spread** roll; `gBattleMoveDamage` locks to **43** this same tick |
| 8104 | 1 | `3551375038` | Onix's **secondary-effect** roll (ROCK_SLIDE's 30% flinch chance) — fires after the HP-drain window, same rule §3 (turn 1) pinned |
| 8114 | 1 | `1898294105` | turn-pass bookkeeping (`gRandomTurnNumber`, matches §3's tick-2340 attribution) |
| 8121 | 5 | `2456170172` | opponent-AI next-move-scoring cluster (`BattleAI_SetupAIData` + tie-break), same "...2,5"/"...1,2,5" tail shape as §3/§7 |

**Total: 11 `Random()` calls this turn** (1 FEATHER_DANCE + 4 ROCK_SLIDE +
1 turn-pass + 5 AI cluster) — no `ShouldSwitch()` 2-step pair this turn
(neither side was low enough to trigger it), consistent with §14's own
observation that the 2-step pair is intermittent, not universal.

## 4. Turn order and battler stats (RAM-confirmed, `dump-battler-full.py`)

`gBattlerAttacker` flips **1 -> 0 at tick 7350-7351** (Pidgeotto acts
first): `gCurrentMove` reads **297 (FEATHER_DANCE)** at 7351, then resets to
0 at 7757 and reads **157 (ROCK_SLIDE)** at 7758 with `gBattlerAttacker`
back to 0 (Onix). Battler snapshots (ticks 7290 pre-turn / 8130 post-turn):

| | ONIX (battler0) | PIDGEOTTO (battler1) |
|---|---|---|
| atk/def/spd/spA/spD | 51/187/**76**/36/72 | 98/61/**77**/56/56 |
| moves (id) | ROCK_SLIDE(157) BIND(20) DRAGON_BREATH(225) SANDSTORM(201) | AERIAL_ACE(332) QUICK_ATTACK(98) FEATHER_DANCE(297) SAND_ATTACK(28) |
| PP before -> after | [**6->5**,20,19,10] | [20,30,**15->14**,15] |
| HP before -> after | 31 -> 31 (unchanged) | 156 -> **113** (-43) |
| ATK stat stage before -> after | 6 -> **4** (-2) | 6 -> 6 (unchanged) |

**New, previously-uncited finding: Pidgeotto's Speed is 77, exactly 1 point
above Onix's 76** — the narrowest turn-order margin in this dossier so far
(vs. Grovyle 90, Murkrow 97). Same plain-Speed rule as §4 of
`battle-turn-notes.md` (`GetWhoStrikesFirst`, both moves priority 0, no
stage/item modifiers on either side this turn — both `statStages` arrays
read all-6/neutral at tick 7290, before FEATHER_DANCE's own effect lands).

FEATHER_DANCE (`EFFECT_ATTACK_DOWN_2`, `secondaryEffectChance: 0`, single
target) drops Onix's ATK stage 6->4 exactly as its name implies (-2 stages).
ROCK_SLIDE's PP goes 6->5, the **5th of its 10 max uses** this battle
(turns 1,3,4,5 already spent 4, matching §14's own running count exactly).
Pidgeotto's FEATHER_DANCE PP goes 15->14, its first use this battle.

### Damage: matches the published ledger; formula decomposition flagged open

`gBattleMoveDamage` locks to **43** at tick 7790 (three intermediate values
observed at 7788/7789/7790: 15, 44, 43 — `Cmd_typecalc`'s STAB and
type-effectiveness multipliers apparently commit as separate intermediate
writes, not a single combined fraction). `pidgeottoHp` drops 156->113 (-43)
at tick 8014, an exact match. This also matches §14's and §16's own
already-published table for turn 6 (156->113) exactly — no new discrepancy
with the prior dossier.

**Not fully hand-re-derived this session** (flagged open, not curve-fit):
naively reproducing `CalculateBaseDamage` (`pokemon.c:3106+`) with Onix's
ATK stat-stage already at -2 by this point (`gStatStageRatios[4] = {10,20}`
-> `floor(51*10/20)=25`) gives `base=floor(floor(25*75*22)/61)/50=13`, close
to observed step-1 value (15) but not exact, and chaining naive
`floor(x*15/10)` (STAB) then `floor(x*20/10)` (ROCK-vs-FLYING, confirmed 2x
via `src/data/gen/type-effectiveness.json`) from 13 lands at 38, not the
observed final 43. The gap is most likely `Cmd_typecalc`'s actual multi-step
multiply/shift sequence (not reproduced exactly by this hand pass) or an
un-watched `gCritMultiplier` (not included in this session's RAM watch —
open item for a resuming session). **Not a contradiction of anything
published** — `gBattleMoveDamage`'s own final RAM value (43) is what's
authoritative and it matches the HP delta and the existing ledger exactly;
this is a formula-reconstruction gap, not a ground-truth gap.

## 5. Pixel/window boundaries (sha256-cited, `battle1-turn6-dense.json`, twice-run identical)

All frame numbers are this dossier's absolute tick numbering. sha256 shown
truncated to 12 hex chars for table width; full values are in the committed
manifest (regenerate via `bin/oracle run tools/compare/traces-groundtruth/
battle1-turn6-dense.json -o <dir>`).

| boundary | tick | sha256 (12) | note |
|---|---|---|---|
| settled action menu vs PIDGEOTTO | 7307 (stable back through the pre-existing `-dense-d` coverage) | `5881becbd1f0` | "What will ONIX do?" FIGHT/BAG/POKéMON/RUN, pixel-confirmed via direct PNG read |
| FIGHT submenu opens | 7317 | `82a50d963410` | matches RAM `gBattle_BG0_Y` 160->320 at the **identical tick**, no render lag this time (unusual — most other boundaries in this dossier lag RAM by 1-2 ticks) |
| move confirmed (`A` held 7344-7346) | 7344 | `aee2f00d9db2` | transient press-frame, reverts to submenu-open pixels at 7345-7348 before the kickoff sequence begins |
| FEATHER_DANCE kickoff text visible | ~7358-7360 (text fully in by 7360) | `fc848f13d635` | "Foe PIDGEOTTO used FEATHERDANCE!" — pixel-confirmed via direct PNG read; RAM's own controller-func flip for this text is at 7357, 1-3 ticks earlier, same small render-lag pattern as turns 1-5 |
| ATK-fall message window starts | 7385-7388 | `ae11c7f00fbd` (settled by 7388) | RAM: `onixAtkStage` 6->4 at 7391, mid-window — the stat actually changes **while** this message is already showing, not before it starts |
| ATK-fall message window ends / text-clear | 7558-7559 | `582f26434019` -> `ae11c7f00fbd` | reverts to the *same* pixel state as the kickoff-text's own settled frame (`ae11c7f00fbd`, tick 7388) — i.e. the message box returns to an identical resting frame between phases |
| generic message-box transition animation (characterized, not fully attributed) | 7659-7684 | (26-frame sequence) | **same sha256 sequence** (byte-for-byte, not just similar) as tick 7765-7784's own sequence, 106 ticks later — see note below |
| ROCK_SLIDE kickoff text visible | ~7770-7784 | (shares the 7659-7684 sequence, offset +106) | "ONIX used ROCK SLIDE!" — pixel-confirmed via direct PNG read at 7940/8005, still showing this exact text through the whole animation+drain window |
| ROCK_SLIDE impact/animation window | 7935-7956 | 22 distinct frames in 21 ticks | rock-hit animation on Pidgeotto's sprite region, RAM-bracketed by the second `battler1ControllerFunc` phase (7934-7967) |
| HP-bar drain window | 7970-8019 | 16 distinct frames over 49 ticks (~1 visible pixel-column change per ~3 ticks) | **not** 1-RAM-unit-per-tick like turn 1's drain (§5 of `battle-turn-notes.md`) — the healthbar's own pixel resolution doesn't resolve every individual HP unit for a 156-max-HP bar the way it did for smaller max-HP bars; `pidgeottoHp` itself updates 156->113 at tick 8014, 1 tick after the drain window's own RAM controller-func phase ends (8013) |
| secondary-effect/turn-end, text clears, turn-7 menu reopens | 8115 (partial) -> 8122 (settled, 1-tick render lag behind RAM's own `bg0y` flip at 8121) | `a8e22ddf13b7` -> `492e3816c1f0` | a 1-frame flicker at 8123 (`6c17c3df0551`) between two otherwise-identical frames, then stable; pixel-confirmed "What will ONIX do?" vs PIDGEOTTO (113/156 HP) via direct PNG read at 8129 |

**The 7659-7684 / 7765-7784 sha-identical pair is a genuine, precisely
characterized-but-not-fully-explained finding**, flagged per this dossier's
own "characterize, don't curve-fit" convention (cf. §20 of
`battle-turn-notes.md`'s shake-asymmetry note): the simplest explanation is
that pokeemerald reuses one generic message-box open/close slide routine
(fixed border artwork, content-independent) for **both** the ATK-fall
message's own close and the ROCK_SLIDE kickoff message's own open — i.e. the
identical pixel sequence is expected precisely *because* the routine doesn't
know or care what text follows, not evidence of a probe error. Not chased to
a source-level function this session (time-boxed) — RAM shows both windows
share `gBattlerControllerFuncs[1]` value `134609789`, which is a reusable
lead for whoever picks this up.

**Turn-7's own menu is fully settled by tick 8122** (222 ticks of margin
before `battle1-winline-b-swap.json`'s own next button press at 8346) —
`gRngValue`/`execFlags`/`bg0y` all RAM-flat 8121-8346 (re-checked directly
in the probe output, not inferred), matching this session's own pixel
capture (stable `492e3816c1f0` through the last captured tick, 8129).

## 6. New-to-turn-6 mechanism: FEATHER_DANCE (`EFFECT_ATTACK_DOWN_2`) — task/sprite/RAM sketch

No prior committed turn (1-5) exercised a **stat-lowering, no-damage** move
end to end — ENDEAVOR/DRAGON_BREATH/ROCK_SLIDE are all damaging;
DOUBLE_TEAM (turn 1, Grovyle) is a **self**-target stat-raise that consumes
zero `Random()` and was never pixel-itemized for its own message window.
FEATHER_DANCE is the dossier's first RAM- and pixel-verified **opponent-
targeted stat-down** move, needed by any future "resolve a status move"
engine slice. Sketch of what it would need, from this session's own probing
(not implemented — out of scope):

- **RAM**: `gBattleMons[0].statStages[STAT_ATK]` (offset `0x19` inside the
  battler struct, `STAT_ATK=1`) goes 6->4 at a fixed tick-offset from the
  kickoff-text start (7391 vs. kickoff-controller-start 7357, a **34-tick
  delay** — not yet cross-checked against a second stat-down move to know if
  that offset is FEATHER_DANCE-specific or generic to all stat-down effects;
  open item for whoever implements this).
- **Two-message shape, not one**: unlike a damaging move (one kickoff
  message, drain, done), FEATHER_DANCE needs **two** sequential message
  windows — "Foe PIDGEOTTO used FEATHERDANCE!" (7357-7389ish) then "ONIX's
  ATTACK fell!" (7393-7564ish, this second window is unusually long, 171
  ticks, possibly including a stat-arrow/flash animation on Onix's own
  healthbox not yet itemized) — a state machine slice needs to model this as
  two chained text phases, not a single kickoff-then-idle shape.
- **No HP drain, no crit/spread rolls** — only the single accuracy-style
  roll at kickoff (§3) and the ATK-stage write; much simpler RNG footprint
  than any damaging move already in the engine.
- **Sprite/task**: not itemized pixel-by-pixel this session (time-boxed) —
  the ATK-fall message window (7393-7564) is long enough that it likely
  contains a dedicated stat-down animation (a downward arrow or healthbox
  flash is standard for this game), not just static text; a future session
  should dense-capture 7393-7564 at finer granularity than this session's
  own boundary-only windows to characterize it (this session's own
  `battle1-turn6-dense.json` already covers 7385-7402 and 7558-7569 at
  stride-1, but the ~170-tick middle of that window was left at its
  boundary-only density — reusable starting point, not exhaustive).

## 7. Turn 7+ boundaries (noted, not densely probed — out of scope this session)

- Turn 7's action-select menu is settled by tick **8122** (§5) — the natural
  starting point for a future turn-7 scout.
- Per §14/§16's own published ledger, turn 7 repeats the identical
  FEATHER_DANCE (Pidgeotto) / ROCK_SLIDE (Onix, hit) shape as turn 6, tick
  range 8346-9380, before any line divergence — turn 8 is the first tick
  where §14's "always ROCK_SLIDE" line and §15/§16's winning line actually
  differ (BIND substitution, §15 HEADLINE 2). Any future S8 chain work
  extending past turn 6 should decide *there*, not before, which published
  line it's targeting.
- ROCK_SLIDE's PP will hit 0 at the end of turn 11 per §14's own count (this
  session reconfirms the running total through turn 6: 5/10 used) — the
  PP-exhaustion mechanic §14 already pinned as a hard requirement for any
  engine harness playing this fixed script forward.

## Verification

`npm test` and `npm run build` green (no `src/` changes this session — the
only additions are `tools/compare/traces-groundtruth/battle1-turn6-dense.json`
and this doc, per the worktree brief's constraint). Trace twice-run via
`bin/oracle run`, manifests (251/251 captures, every sha256) byte-identical
across two independent runs. RAM probes (`ram-probe.py`,
`dump-battler-full.py`) each independently re-run and diffed byte-for-byte
identical against their own first run. Cross-check against the already-
committed `battle1-winline-b-swap.json` (11 spot-checked ticks, §1) also
byte-identical.
