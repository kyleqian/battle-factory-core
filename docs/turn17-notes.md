# Turn 17 + the WIN ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only): Murkrow's faint, "Player defeated BUG CATCHER DESTIN!", and DESTIN's held loss quote

**Headline**: this is battle 1's actual final turn, now ground-truthed to the
tick and byte, extending `turn16-notes.md` (which left the battle settled at
"What will MAGBY do?" for turn 17, tick 21773) through the WIN. **MURKROW
acts first again** (`gBattlerAttacker`→1 at tick 21807, same 97-vs-89 speed
order turn16 already pinned) with **FAINT_ATTACK** — still always-hits/zero
accuracy roll — for **52** (burn's physical-damage halving now RAM-exact,
not just suggestive: turn16's unburned FAINT_ATTACK hit 59, this turn's
burned one hits 52), MAGBY **79→27** at tick 22168. **MAGBY answers with
FIRE_PUNCH** for **78** (capped on write since MURKROW only had 58 HP left),
MURKROW **58→0** at tick **22418** — the kill. **FIRE_PUNCH's own 10%
secondary burn roll still fires at tick 22423** (5 ticks after the HP write,
the same offset as turn16's own burn-roll timing) **even though the target
is already burned AND already fainted from this same hit** — source-checked
below: the roll itself (`Cmd_seteffectwithchance`) is unconditional, but
`SetMoveEffect`'s very first gate (`hp == 0`) short-circuits the actual
status write before it ever reaches the STATUS1_BURN-specific
"already-has-a-status" check, so the RNG cost is paid but nothing changes
(**question 1, answered**). **The burn's own end-of-turn residual never
fires this turn** — confirmed absent from the RAM ledger (no
`gBattleMoveDamage` precompute, no second `hp1` write) and now source-pinned
too: `DoBattlerEndTurnEffects`'s `ENDTURN_BURN` case gates on
`gBattleMons[...].hp != 0`, false here since Murkrow is already at 0
(**question 2, answered**). The **BRN badge persists on the healthbox
through the entire faint sequence** — same sha through the sprite's fade
(~22486-22500) and stays attached right up until the box itself is removed
between ticks 22504 (badge+box still visible) and 22508 (both gone, exactly
the tick `status1_1` clears to 0) — it does not vanish independently before
the box (**question 3, answered**). The faint-dismiss/button-gated-text
mechanic is **VERBATIM** vs. every prior faint in this dossier, but this
faint is structurally **NEW**: because Murkrow was DESTIN's last Pokémon,
the dismiss does not lead to a forced enemy send-out (Pidgeotto→Murkrow's
own shape, `battle-turn-notes.md` §13) — it falls straight into
**"Player defeated BUG CATCHER DESTIN!"**, with **`gBattleOutcome` flipping
0→1 at tick 22818 — 16 ticks after the dismiss press, while the OLD "Foe
MURKROW fainted!" text is still on screen**, not "the instant the new
screen appears" as `battle-turn-notes.md` §16's own coarser probe put it —
the new text doesn't even start typing until sometime between 22825 and
22845, a correction stated precisely here because RAM contradicts the
paraphrase (**question 5, answered, and corrected**). DESTIN's loss quote,
**"PLEASE I NEED\nSOME WATER"**, is **button-gated** (the very next segment
in `battle1-winline-b-swap.json`, right after this trace's own end, is a
lone `A` press) — confirmed from the chained script, not guessed
(**question 6, answered**). MAGBY ends the battle at **27/138 HP, FIRE_PUNCH
PP 13/15**, unburned, ability/item unchanged (**question 7, answered**).

## 1. Committed trace and prefix-consistency verdict

Extends `battle1-turn16-dense.json`'s own committed 126-segment/21773-tick
script (carried verbatim, unmodified, segment-list-exact — not just
flattened-tick-exact, checked both ways) with `battle1-winline-b.json`'s own
`segments[126:134]` (8 segments: `A` opens the FIGHT submenu — cursor
defaults to FIRE_PUNCH, slot 0 — 27f settle, `A` confirms, a 999f
resolution-idle covering the entire turn (FAINT_ATTACK, FIRE_PUNCH, the
burn-secondary roll, Murkrow's faint sink), then `A` dismisses "Foe MURKROW
fainted!" (399f hold), then `A` dismisses to "Player defeated BUG CATCHER
DESTIN!" (399f hold, ending on DESTIN's held, un-dismissed loss quote) —
**134 segments, 23601 ticks total**.

Committed: **`battle1-turn17-dense.json`** (256 captures, at the density
cap): dense stride-1 across the FIGHT-submenu open/settle/confirm and
FAINT_ATTACK's kickoff/attacker-flip (21773-21778, 21798-21810), its
crit/damage-roll cluster (21840-21850), FIRE_PUNCH's HP-write/transition/
accuracy/crit/damage-roll cluster (22160-22222), the lethal HP-write/
burn-secondary-roll cluster (22410-22430), the status1-clear/faint-sink
tail (22500-22515), the faint-text-dismiss/`gBattleOutcome`-flip/curMove-
reset cluster (22795-22825), and the "Player defeated" dismiss/loss-quote-
start cluster (23195-23210); stride 7-25 sparse over the four text/
animation-hold windows in between (21778-21798, 21810-21840, 22222-22410,
22430-22500, 22515-22795, 22825-23195, 23210-23601).

**Twice-run byte-identical** via `bin/oracle run` (two independent runs,
manifests 256/256 diffed, **0 sha mismatches**).

**Flatten-and-compare prefix check** (programmatic, same method as
`turn16-notes.md` §1): flattened this trace's full 134-segment/23601-tick
button script against `battle1-turn16-dense.json`'s own 126-segment/
21773-tick script — **0 diffs** across all 21773 shared ticks (script-exact
— confirmed both as a raw segment-list equality, `d16 == dwb[:126]`, True,
and as a flattened-tick diff) — and separately against
`battle1-winline-b-swap.json`'s own full 156-segment/33031-tick script —
**0 diffs** across all 23601 ticks this trace covers. `turn16-dense ⊂
turn17-dense ⊂ winline-b-swap`, script-exact, both directions stated.
Frame 21773's sha256 (`0b1748b6c28c...`) matches `turn16-dense`'s own final
committed frame byte-for-byte, independently re-run.

## 2. RNG-consumption ledger (RAM-truthed, full per-call attribution)

New watch spec `tools/probe/specs/turn17-rng-watch.json` (extends
`turn16-rng-watch.json`'s column set with `gBattleOutcome`), run via
`ram-probe.py` against this session's own committed trace, `startTick=21700`
(deliberately overlapping turn16's own tail for a cross-check), 1902 rows.

**Cross-check first**: ticks 21719 and 21724 (turn16's own "tail
AI-prescoring cluster", already fully attributed in `turn16-notes.md` §2)
reappear identically in this probe (same `rng`/`attacker`/`target` values at
the same ticks) — confirms this window's replay is byte-for-byte the same
game state turn16 already ground-truthed; **not re-counted** as part of
turn 17's own ledger below.

**Turn 17's own ledger** (new `Random()` calls, tick 21774 dispatch onward):

| tick | steps | attribution |
|---|---|---|
| 21807 | 0 (state only) | `gBattlerAttacker`→**1** (MURKROW) — same 97-vs-89 speed order as turn16, reconfirmed |
| 21808 | 0 (state only) | `gCurrentMove`→**185 (FAINT_ATTACK)** |
| 21844 | 1 | **critical-hit roll** — no crit (`gCritMultiplier` stays 1 the whole turn, both moves) |
| 21847 | 1 | **damage-variance roll** — `gBattleMoveDamage` settles at **52** (steps 0→41→61→**52**); no accuracy roll, same `EFFECT_ALWAYS_HIT` skip as turn16 |
| 22168 | 0 (HP write) | `hp0` (MAGBY) **79→27**, exactly `-52` |
| **22173** | 1 | ~~unattributed~~ **ATTRIBUTED (supervisor fold 2026-07-21, `docs/rng-attribution-notes.md`): `Cmd_seteffectwithchance`'s unconditional chance-0 secondary roll, same as turn 16's 21152.** Original analysis kept below — same shape as turn16's tick 21152 (+5 ticks after the HP write, before the attacker/curMove flip to FIRE_PUNCH), no observable effect on any watched field (checked tick-by-tick, 22165-22189 above/below this tick: no field besides `rng` itself changes). FLAME_BODY still ruled out on the same grounds turn16 established (FAINT_ATTACK carries no `FLAG_MAKES_CONTACT`) — same open-item family, now seen twice at the identical relative offset, suggestive of a fixed per-turn-wind-down `Random()` call unrelated to either battler's ability |
| 22180 | 0 (state only) | `gBattlerTarget`→**1** (MURKROW), dispatch flips toward FIRE_PUNCH |
| 22181 | 0 (state only) | `gCurrentMove`→0 (FAINT_ATTACK's script chain winds down), `gBattleMoveDamage`→0 |
| 22182 | 0 (state only) | `gCurrentMove`→**7 (FIRE_PUNCH)**, `gBattlerAttacker`→**0** (MAGBY) |
| 22187 | 1 | **FIRE_PUNCH's own accuracy roll** — succeeds (same "0-accuracy moves skip; even 100%-accuracy moves still roll" rule, third turn running) |
| (22211) | 0 (PP write) | `pp0_0` (MAGBY's FIRE_PUNCH slot) **14→13** |
| 22212 | 1 | **critical-hit roll** — no crit |
| 22213-22214 | 0 (state only) | `gBattleMoveDamage` intermediate steps 0→53→79 |
| 22215 | 1 | **damage-variance roll** — `gBattleMoveDamage` settles at **78** |
| **22418** | 0 (HP write) | `hp1` (MURKROW) **58→0**, capped (`78 > 58`, standard cannot-go-negative clamp) — **the kill** |
| **22423** | 1 | **FIRE_PUNCH's own secondary-effect roll, fired again** — `Cmd_seteffectwithchance`'s `Random() % 100 < 10` is **unconditional**, so this roll happens regardless of Murkrow already being burned (`status1_1`=16 entering) and already fainted (`hp1`=0) from this same hit. `status1_1` **stays 16** through this tick (only clears later, at 22508, via the faint-cleanup path — see below) — this turn's data alone cannot distinguish "roll succeeded but blocked" from "roll failed," since `SetMoveEffect`'s first gate (`battle_script_commands.c:2261`, `gBattleMons[gEffectBattler].hp == 0`) short-circuits the whole function before ever reaching the STATUS1_BURN case's own `if (status1) break;` (line 2375) — **either gate alone would have blocked it**; source confirms both exist, RAM confirms the roll's RNG cost is paid either way |
| 22508 | 0 (state only) | `status1_1` (MURKROW) **16→0** — faint-cleanup clears the fainted mon's own status1, same tick the healthbox/BRN-badge disappears from screen (§4) |
| **22818** | 0 (state only) | `gBattleOutcome` **0→1** — the WIN flag, 16 ticks after the dismiss press (22802), while "Foe MURKROW fainted!" is still the on-screen text (§4; corrects `battle-turn-notes.md` §16's "the instant this screen appears" paraphrase — RAM says the flip predates the new screen's own text-start by at least 27 ticks) |
| 22822 | 0 (state only) | `gCurrentMove`→0, `gBattleMoveDamage`→0 (FIRE_PUNCH's script chain fully winds down, post-outcome) |

**Total: 7 new `Random()` calls this turn** (21774-23601) — one fewer than
turn16's 8, because this turn's own window doesn't carry a second
AI-prescoring tail cluster (the battle is over; nothing left to
re-score). Shape comparison: FAINT_ATTACK still 2 rolls (crit+damage, no
accuracy), FIRE_PUNCH still 3 rolls (accuracy+crit+damage) — **identical
per-move roll-count shape to turn16**, plus the one "unattributed" call
(now seen twice, same relative offset, same non-attribution) and the
burn-secondary roll (now seen firing a *second* time, this time provably a
no-op). Stat stages (`atkStage0`/`atkStage1`) stay neutral `6` for both
battlers the entire window, confirmed not assumed.

**Dispatch-constant reconfirmation**: FAINT_ATTACK's own crit-roll offset
from its `gCurrentMove` write is **+36 ticks** (21808→21844) — identical to
turn16's own +36 (20780→20816); its damage-roll trails crit by **+3** both
turns (21844→21847, 20816→20819). Same fixed per-move dispatch timing,
independently reconfirmed rather than assumed.

## 3. Turn order, battler stats, PP, and the exact clear ticks (RAM-confirmed)

`dump-battler-full.py` snapshots at five boundaries (21773 entering,
22170 mid-turn after FAINT_ATTACK, 22420 right after the kill, 22508 after
faint-cleanup, 23601 the settled/held end):

| | MAGBY (battler0) | MURKROW (battler1) |
|---|---|---|
| HP | 79/138 (entering) → **27/138** (tick 22168, −52) | 58/142 (entering, burned) → **0/142** (tick 22418, −58 capped from a 78 roll) |
| FIRE_PUNCH PP (slot 0) | 14/15 (entering) → **13/15** (tick 22211) | — |
| FAINT_ATTACK PP (slot 0) | — | **19/20** (entering, closes turn16-notes.md's own open item: 20 max, 19 after turn16's single use) → **18/20** (this turn's use) |
| MURKROW's other PP (unchanged both turns) | — | FLY 14/15, TORMENT 15/20, TAUNT 20/20 — never used, carried from earlier in the battle |
| status1 | **0** the entire window (never burned) | **16** (`STATUS1_BURN`, entering + through the kill) → **0** at tick 22508 (faint-cleanup, not a cure — Murkrow is dead) |
| ability/item | FLAME_BODY / LAX_INCENSE, unchanged, no proc (FAINT_ATTACK still lacks `FLAG_MAKES_CONTACT` — same source citation as turn16) | INSOMNIA / LAX_INCENSE, unchanged, no interaction |
| stat stages | neutral `6` throughout | neutral `6` throughout |

`gBattlerAttacker`/`gBattlerTarget` confirm the dispatch order: `1`/`0`
(MURKROW→MAGBY) for FAINT_ATTACK, then `0`/`1` (MAGBY→MURKROW) for
FIRE_PUNCH — same order as turn16, MURKROW still faster.

## 4. Pixel/window boundary table (sha256-cited, 12 hex chars, PNG-read directly)

| boundary | tick | sha256 (12) | note |
|---|---|---|---|
| carried settled "What will MAGBY do?" (turn17 entering, = turn16-dense's own final frame) | 21773 | `0b1748b6c28c` | **PNG-confirmed identical** to `turn16-notes.md`'s own cited frame — the prefix join point |
| FIGHT submenu, turn 17 (cursor FIRE_PUNCH, PP now 14/15) | 21801 | `149397a8f607` | **PNG-confirmed**: MAGBY 79/138, MURKROW's healthbox still shows the BRN badge |
| "Foe MURKROW used\nFAINT ATTACK!" held | 21847 | `ad8a2243b05f` | **PNG-confirmed**, BRN badge still visible |
| FIRE_PUNCH's HP-write tick (RAM `hp1`→0; bar not yet visually drained, sprite/box unchanged) | 22418 | `63600c307d1c` | **PNG-confirmed**: "MAGBY used\nFIRE PUNCH!" still the shown text, MURKROW's healthbox+BRN badge still fully rendered — same RAM-ahead-of-pixel shape as every prior hit in this dossier |
| last frame with Murkrow's sprite + healthbox + BRN badge all still present | 22486-22504 | `63600c307d1c` (steady through 22486), evolving 22494-22504 (sprite fade in progress) | **PNG-confirmed** (supplementary exploratory probe, uncommitted, stride-2, used only to narrow this boundary tighter than the committed trace's own stride — see caveat below): sprite fully gone by ~22500 but healthbox+badge still rendered at 22504 |
| **healthbox + BRN badge both gone** | 22508 | `5ed5d6c20af5` | **PNG-confirmed absent** — same tick `status1_1` clears in RAM (§2); badge never disappears independently of the box itself |
| "Foe MURKROW\nfainted!" text starts typing | ~22510-22530 | (exploratory probe) | **PNG-confirmed**: blank box with first glyph at 22510, fully typed with blinking heart cursor by 22530, held from there |
| "Foe MURKROW\nfainted!" held (button-gated) | 22802 (dismiss press) | `bc9dfd1849f7` | **PNG-confirmed**, unchanged through 22818/22822/22825 — genuinely frozen text, same shape as every prior button-gated faint text in this dossier |
| **`gBattleOutcome` flips 0→1** | 22818 | `bc9dfd1849f7` | **same sha as the still-held "fainted!" text** — RAM flip precedes the new screen's own appearance, contra `battle-turn-notes.md` §16's coarser paraphrase (§2) |
| "Player defeated\nBUG" typing in | 22845 | `73d52db2a5df` | **PNG-confirmed, partial text** — first appears between 22825 (still old text) and 22845 |
| "Player defeated\nBUG CATCHER DESTIN!♥" held | 22885 | `c19836f8def9` | **PNG-confirmed**, exact string, blinking heart cursor |
| DESTIN's trainer sprite replaces the (now-empty) opponent slot; "PLEA" typing in | 23260 | `5dab75716557` | **PNG-confirmed**: no Pokémon left on Murkrow's side, DESTIN's own overworld-style trainer sprite now shown where Murkrow's platform was |
| **this trace's own scripted end**: "PLEASE I NEED\nSOME WATER" fully typed, held, un-dismissed | 23601 | `4e05adab8e97` | **PNG-confirmed** — no blinking heart/cursor icon observed in this or the 4 preceding sparse samples (23510-23601), unlike both prior screens which showed one in every sampled frame; **not conclusively explained this session** (different textbox class for the trainer quote vs. battle text, or a blink phase this sampling missed — flagged open, not resolved) |

Every sha256 in the main clusters was read directly from this session's own
committed trace's first-run manifest at the cited tick. The three rows
marked "exploratory probe" used a temporary, uncommitted, single-run
capture set (stride-2 over 22486-22800) built only to narrow the faint-sink
animation's boundary tighter than the committed 256-capture budget allows —
same "coarse sketch, not frame-exact" honesty convention `turn16-notes.md`
§4/§5 already established for animation windows; the *state* boundaries
themselves (badge-present/badge-gone, text-start/text-settled) are
pixel-confirmed, the animation's own frame-by-frame path is not claimed to
be exhaustively characterized.

## 5. Reuse-map verdict (engine planning payload)

**(a) FIGHT submenu.** **VERBATIM**, no new information — same layout,
cursor still defaults to FIRE_PUNCH, PP field just reflects turn16's
decrement (14/15).

**(b) FAINT_ATTACK/FIRE_PUNCH dispatch, crit/damage rolls.** **VERBATIM
per-move roll-shape and dispatch-constant timing** vs. turn16 (§2) — the
first time this dossier has reconfirmed the *exact same tick offsets*
(+36, +3) for a repeated move rather than just the same roll-count shape.

**(c) Burn's physical-damage halving.** **Independently reconfirmed**, no
longer merely suggestive: turn16's own §16 open item #2 ("suggestive from 2
data points, not independently re-derived") is closed by this turn's own
data point (52 vs. turn16's 59, same move, same attacker/target, only
difference is Murkrow's burn) — still not re-derived against
`damageCalc.ts`'s own formula with controlled inputs (that requires an
engine-side unit test, out of this session's oracle-only scope), but the
RAM evidence itself is no longer just "suggestive."

**(d) FIRE_PUNCH's own secondary-effect roll, fired at an already-resolved
target.** **NEW finding, this session's own headline.** Turn16 proved the
roll exists and succeeds (burn applied to a healthy target). This turn
proves the roll **still fires** — unconditionally, per source
(`Cmd_seteffectwithchance`, `battle_script_commands.c:2908-2939`) — even
when the target is already burned and simultaneously fainted by the very
hit that triggers the roll, and that `SetMoveEffect`'s own `hp == 0` gate
(line 2261) makes the roll's outcome unobservable via RAM in this exact
scenario. An engine port needs to replicate the *unconditional roll*
(matching the RNG stream) even in cases where the resulting status write is
a guaranteed no-op — skipping the roll to "optimize" would desync the RNG
stream for anything downstream.

**(e) Burn's end-of-turn residual, correctly absent.** **NEW, source-pinned
this session**: `DoBattlerEndTurnEffects`'s `ENDTURN_BURN` case
(`battle_util.c:1550-1560`) gates on `gBattleMons[gActiveBattler].hp != 0`
— false here since Murkrow is already fainted, so the entire
precompute+script-execute path is skipped, matching the RAM ledger's total
absence of a second `hp1` write or `gBattleMoveDamage` precompute this
turn. An engine slice's end-of-turn residual step needs this exact
liveness gate, not just a "was this mon burned" check.

**(f) Faint sink (sprite/healthbox/badge removal).** **SAME-SHAPE** vs.
turn13's Pidgeotto and turn15's Onix faints (sprite goes first, healthbox
follows a few ticks later), but **NEW**: this is the first faint in this
dossier where a status badge (BRN) is part of what gets removed, and it's
confirmed to ride along with the box rather than clearing independently
beforehand — the badge and the box disappear together, same tick as the
RAM `status1` clear (22508).

**(g) Button-gated `<mon> fainted!` hold.** **VERBATIM** vs. every prior
faint (turn13, turn15) — text prints, blinking heart cursor, frozen (0 RAM
change) until the dismiss press.

**(h) Post-faint branch: win-sequence instead of forced send-out — the
structural novelty this brief specifically asked about.** Every prior
opponent faint in this dossier (Pidgeotto, `battle-turn-notes.md` §13) led
to an automatic NPC send-out of the trainer's next Pokémon. Here, because
Murkrow was DESTIN's last Pokémon, the *same* dismiss press instead routes
into "Player defeated BUG CATCHER DESTIN!" and flips `gBattleOutcome`. The
faint-sink/text-hold mechanics themselves are unchanged; what's new is
purely the **post-dismiss branch target**, which must depend on whether the
defeated side has any able Pokémon left — an engine slice needs this branch
condition explicitly (`HandleFaintedMonActions`-equivalent: check remaining
party before deciding switch-prompt vs. battle-outcome-check), not just the
single-faint mechanics already proven.

**(i) `gBattleOutcome` timing.** **Corrected, not just reconfirmed**: flips
mid-hold of the *old* "fainted!" text, 16 ticks after the dismiss press and
well before the new "Player defeated..." text is even visible (first typed
glyph not until ~27+ ticks later). `battle-turn-notes.md` §16's own "the
instant this screen appears" is an approximation from a coarser probe;
RAM+pixel evidence here is exact and supersedes it for any engine slice
that needs to gate on the WIN flag precisely.

**(j) DESTIN's loss quote.** **NEW**: exact text "PLEASE I NEED\nSOME
WATER", DESTIN's own overworld trainer sprite appears in Murkrow's old
spot, and the screen is **button-gated** (confirmed from
`battle1-winline-b-swap.json`'s own next segment being a lone `A` — not
auto-advancing), closing question 6. The absent blinking-cursor icon in
this screen (vs. present in both prior screens) is flagged open, not
resolved.

## Verification

`npm test` and `npm run build` green — no `src/` changes this session; new
artifacts are `tools/compare/traces-groundtruth/battle1-turn17-dense.json`,
`tools/probe/specs/turn17-rng-watch.json`, and this doc. New trace
twice-run via `bin/oracle run`, manifests (256/256) diffed byte-identical
across two independent runs, 0 sha mismatches. Prefix-consistency checked
programmatically both against `battle1-turn16-dense.json`'s own full
126-segment script (0 diffs across all 21773 shared ticks, plus a raw
segment-list equality check, not just flattened-tick) and against
`battle1-winline-b-swap.json`'s own full 156-segment/33031-tick script (0
diffs across all 23601 ticks this trace covers). RAM probes: `ram-probe.py`
with the new watch spec (1902 rows, `startTick=21700`, deliberately
overlapping turn16's own tail as a cross-check — identical values
reproduced at the shared ticks); `dump-battler-full.py` snapshots at
21773/22170/22420/22508/23601. A supplementary, uncommitted, single-run
exploratory probe (stride-2, 22486-22800) was used only to narrow the
faint-sink animation's boundary tighter than the committed trace's own
stride allows — flagged explicitly in §4, not presented as part of the
committed/twice-run evidence. Every sha256 and text claim in §4-§5 was read
directly from a rendered frame. Source citations
(`battle_script_commands.c:2234-2400` `SetMoveEffect`, `:2908-2939`
`Cmd_seteffectwithchance`, `battle_util.c:1464-1560`
`DoBattlerEndTurnEffects`) are read-only references used to explain and
cross-check RAM-observed behavior — no `src/` files were touched.

**PAPERCUT**: the committed trace's own capture budget (256, density cap)
couldn't densely cover the full ~22486-22530 faint-sink animation at
stride-1 without starving other clusters — needed one extra, uncommitted
exploratory probe run to pin the badge/box-removal boundary tightly. Cost
~5 minutes, not a blocker, but worth flagging: a future session doing
another faint-heavy turn should budget for this ahead of time (e.g. request
a `maxCaptures` bump alongside the existing `maxFrames` one) rather than
discovering the squeeze mid-session.
