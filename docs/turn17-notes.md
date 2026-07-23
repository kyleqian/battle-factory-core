# Turn 17 + the WIN ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only): Murkrow's faint, "Player defeated BUG CATCHER DESTIN!", and DESTIN's held loss quote

**Headline**: this is battle 1's actual final turn, now ground-truthed to the
tick and byte, extending `turn16-notes.md` (which left the battle settled at
"What will MAGBY do?" for turn 17, tick 21773) through the WIN. **MURKROW
acts first again** (`gBattlerAttacker`→1 at tick 21807, same 97-vs-89 speed
order turn16 already pinned) with **FAINT_ATTACK** — still always-hits/zero
accuracy roll — for **52**. This is the RAM-pinned damage-variance result,
not burn halving: DARK is special in Gen 3, so FAINT_ATTACK does not use
Murkrow's burned Attack stat. MAGBY reaches **79→27** at tick 22168 and
answers with
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

**(c) Burn's physical-damage halving.** **Not exercised by this move.**
The earlier comparison of turn16's 59 to turn17's 52 was incorrect:
FAINT_ATTACK is DARK and therefore special in Gen 3, so burn cannot halve
it. Rung 1 closes the engine-side gap separately with a source-accurate
Tier-1 regression proving that burn halves physical damage before the final
`+2` unless the attacker has GUTS; the exact 52 here is independently pinned
as FAINT_ATTACK's variance result.

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

## 6. Worktree-lane retrofit — wiring-ready standard (S7/S8 worktree scout, no engine code)

Shipped **`tools/probe/verify-turn17.ts`** (same convention as
`verify-turn13.ts`/`verify-turn15.ts`: re-derives every pinned fact from a
FRESH `bin/oracle run` against the already-committed `battle1-turn17-
dense.json`, pixel-only, no RAM reads at runtime — `verify-turn16.ts` lives
on a sibling worktree branch not yet merged into this one as of this
session; its content was read via `git show` for precedent/convention only,
never copied or edited). **245 curated captures** (under the 256 cap),
**twice-run byte-identical** (two independent `node` invocations, full
stdout diffed, 0 differences), **all checks PASS**. RAM cross-check for the
faint-sink family confirmation (§6b) used a new committed spec,
**`tools/probe/specs/turn17-faintsink-watch.json`** (extends `turn17-rng-
watch.json`'s own committed segments with `gBattlerSpriteIds[1]`/
`gHealthboxSpriteIds[1]`-indexed sprite-slot reads via `ram-probe.py`'s
generic `path`-hop mechanism — no new Python needed).

### 6a. §4 corrections (dense re-bisection of every "~" / wide-range / exploratory-probe-sourced row)

Same non-destructive slip class turns 13-15's own retrofits found (turn16's
found 0); none change any §1/§2/§3/§5 headline verdict:

| §4 row (original) | correction | evidence |
|---|---|---|
| "steady through 22486" (sprite+healthbox+badge all present) | Actual steady window runs **6 ticks further, through 22492** — the visible sink motion doesn't start until 22493 | dense pixel bisection, `verify-turn17.ts` |
| "sprite fully gone by ~22500" (approximate, exploratory-probe-sourced) | The sink motion is pixel-dynamic 22493-22502 (5 distinct frames), then the rendered frame **freezes 5 ticks early**, at 22503-22507 (flat `aea330242515`) — the sprite is already fully off-screen/clipped several ticks *before* its RAM `inUse` flag actually clears at 22506 (§6b). A distinct render-lag shape from every other case in this dossier: elsewhere RAM changes *precede* an unchanged pixel; here the pixel *freezes early* while RAM still churns underneath it | dense pixel bisection + `turn17-faintsink-watch.json` RAM cross-check, `verify-turn17.ts` |
| "Foe MURKROW\nfainted!" text starts typing "~22510-22530" (exploratory-probe-sourced range) | Now **committed and dense-pinned**: per-glyph typing 22510-22527 (18 ticks, near-per-tick-unique), a 2-tick settle transient (22528-22529), fully-typed idle-bounce plateau reached **exactly by 22530**, matching the dossier's own "by 22530" framing precisely rather than approximately | dense pixel bisection, `verify-turn17.ts` |
| "Foe MURKROW fainted!" held, cited via a single dismiss-press-tick sha (implies a flat hold) | Actual hold is a **3-phase idle bounce**: a long default phase (`187cfc5c6179`) interrupted by a brief double-blink cluster (`6addb90d4a77`→`bc9dfd1849f7`→`6addb90d4a77`, ~8-9 ticks/phase) — same idle-bounce family turns13-16 already documented for menu/faint-text holds, confirmed still recurring at tick 22750 (default phase) and 22800/the dismiss-press tick itself (blink phase, matches §4's own cited sha there) | dense pixel bisection (22540-22570) + far spot checks, `verify-turn17.ts` |
| "unchanged through 22818/22822/22825" / typing-onset "between 22825 and 22845" | **Pinned exactly**: pixel-identical across the ENTIRE 22802-22826 span (25 ticks, including tick 22818 where `gBattleOutcome` flips in RAM with zero visible effect, §2) — first divergence is **tick 22827**. §4's own cited sha (`73d52db2a5df`) for "22845" actually **first appears at tick 22844**, one tick earlier — same off-by-one-citation class turns13-15 each found | dense pixel bisection, `verify-turn17.ts` |
| "Player defeated\nBUG CATCHER DESTIN!♥" held, cited via a single tick's sha | Same **3-phase idle-bounce shape** as the fainted-text hold above: settle-transient phase (`c19836f8def9`, 22885-22888) → default phase (`7f80a2343a29`) → blink-cluster phase (`2d8341bfa9dc`, 22898-22906) → back to default — confirmed recurring far into the hold (23100 = settle-transient sha again, a second blink-cluster onset; 23195 = default phase, right up to the dismiss press) | dense pixel bisection (22885-22915) + far spot checks, `verify-turn17.ts` |
| **DESTIN trainer-pic slide-in transition** — §4 has NO row at all for this; it is a gap between the "held" row (22885) and the "typing in" row (23260) | **NEW, characterized this session** — see §6c below | dense pixel bisection (23220-23260), `verify-turn17.ts` |
| loss-quote settle tick — only "this trace's own scripted end (23601)" was cited, no settle boundary | Typing continues glyph-by-glyph through 23278, **settles 2 ticks earlier than a coarser first pass found, at tick 23279** — held pixel-identical for the remaining 322 ticks through 23601 | dense pixel bisection, `verify-turn17.ts` |

### 6b. Faint sink, confirmed bit-exact to the known formula (mission item: "confirm which function family")

Murkrow is DESTIN's (the opponent's) own Pokémon, the same ownership side as
turn13's Pidgeotto — so by the same source-level reasoning `turn13-notes.md`
§(Faint sink row) already established (opponent-side faints resolve through
`SpriteCB_FaintOpponentMon`/`SpriteCB_AnimFaintOpponent`, `faint-switch-
notes.md` §3a/§7a/§(0x08039934/0x08039a49)), this faint is expected to be
the **same family**, not turn15's separate player-side case (whose own
function name was left unresolved). Confirmed this session, RAM-exact, via
`turn17-faintsink-watch.json` (new spec, `gBattlerSpriteIds[1]`-indexed mon
sprite + `gHealthboxSpriteIds[1]`-indexed healthbox sprite, `ram-probe.py`):

| tick | event |
|---|---|
| 22470-22491 | Murkrow's own mon sprite (dynamic slot, resolved via `gBattlerSpriteIds+1`): `inUse=true`, `y2=0` — unchanged |
| 22492, 22494, 22496, 22498, 22500, 22502, 22504 | `y2` steps **8,16,24,32,40,48,56** — exactly the `S+1, S+3, ..., S+2n-1` cadence with **S=22491, n=7** |
| **22506** | mon sprite `inUse→false` (destroyed) — exactly `S+2n+1 = 22491+15 = 22506`, **bit-exact to the closed form**, zero deviation |
| 22507 | healthbox sprite (`gHealthboxSpriteIds+1`-indexed) sets `invisible→true` — **1 tick after** the mon sprite's own destroy |
| 22508 | `status1_1` (Murkrow) clears `16→0` — **2 ticks after** the mon sprite's own destroy, exactly matching §2's own independently-run RAM ledger (cross-validates this session's own RAM read pipeline) |

The formula's own `n = 8 - floor(yOffset/8)` predicts n=7 from a yOffset in
`[8,15]`; Murkrow's own **front**-pic yOffset (`src/data/gen/mon-pic-
coords.json`, `front.MURKROW.yOffset`) is **11** — identical to turn13's own
cited Pidgeotto yOffset (also front-pic 11, `front.PIDGEOTTO.yOffset`) —
giving `n = 8 - floor(11/8) = 8-1 = 7`, matching the RAM-observed step count
exactly. **Confirmed bit-exact to the same closed form turn13 pinned**, not
merely "same shape" — the strongest confirmation of this family in the
dossier chain so far (stronger than turn15's own player-side case, whose
function-name-level confirmation is still open). §5f's "SAME-SHAPE" verdict
is upgraded to **formula-exact**.

### 6c. DESTIN trainer-pic slide-in transition, characterized (mission's own top new-item candidate)

The single largest gap §4 left untabled: the dismiss press at 23201 to
DESTIN's trainer sprite + "PLEA" typing-in at 23260 (§4's own next row).
Dense pixel re-bisection (`verify-turn17.ts`) finds:

| window | shape |
|---|---|
| 23201-23228 (28 ticks, including the dismiss press itself) | **pixel-frozen** at the old "Player defeated..." screen's own sha — the press produces zero same-tick visible effect, the same RAM-ahead-of-pixel convention this whole dossier chain established for every other dismiss/state transition |
| 23229-23253 (25 ticks) | **genuinely dynamic, every tick a distinct frame** — the fade/wipe of the old screen composited with DESTIN's trainer-sprite slide-in; NOT separable into sub-phases at pixel-only sampling density (same "coarse sketch, not frame-exact" honesty convention §4/§5 already used for other animation windows — RAM/task-callback decomposition of this transition was not attempted, time-boxed, flagged open) |
| 23254-23256 (3 ticks) | a brief flat pause mid-transition (`0fececf28e02`) |
| 23257-23259 (3 ticks) | dynamic again, resuming the transition |
| 23260 | DESTIN's trainer sprite + "PLEA" typing-in — matches §4's own citation (`5dab75716557`) exactly, landing right after the transition characterized above |

**New finding for the reuse map**: the WIN sequence's own screen-to-screen
handoff (battle-text screen → trainer-quote screen) is a **distinct,
non-trivial ~31-tick composite transition**, not a simple instant cut or a
plain fade — an engine port needs to budget for this as its own animated
step, not assume the loss-quote screen simply appears.

### 6d. Loss-quote's "no blinking cursor" open item, narrowed (not resolved)

§4's own final row flagged the absence of a blinking heart/cursor icon on
DESTIN's held loss-quote screen as unexplained (both prior WIN-sequence
screens showed one, this one didn't, in a handful of samples). Dense
re-bisection (`verify-turn17.ts`) confirms **zero pixel change** across the
entire settled hold — tick 23279 (settle) through 23601 (this trace's own
scripted end), at every one of the far-spot ticks sampled (23300, 23320-
23322, 23350, 23400, 23450, 23500, 23550, 23600 — including a 3-tick
consecutive burst at 23320-23322 that would catch a short-period blink like
the ~8-9-tick ones found in §6a above). This is stronger evidence than §4's
own "4 preceding sparse samples," but **still does not conclusively prove**
no cursor exists at every unsampled tick across the full 322-tick hold —
narrowed, not resolved, same honesty convention §4's own caveat already
used. Plausible explanation (not source-confirmed this session): this
screen's textbox is a different class (a standalone trainer-quote box, not
a battle-message box with its own "waiting for input" heart icon) — flagged
open for a future session with RAM/task-callback access.

### 6e. Render-lag ledger (this session's additions)

| RAM event | pixel-confirmed tick | lag |
|---|---|---|
| mon sprite `inUse→false` (faint-sink destroy, 22506, §6b) | rendered sink motion actually **freezes early**, at 22503 — 3 ticks *before* the RAM destroy | **-3 ticks (pixel leads RAM)** — the one case in this dossier chain where the render is NOT lagging the RAM write, because the sprite is already fully clipped off-screen before its `inUse` flag clears |
| healthbox sprite `invisible→true` (22507) | pixel-confirmed both sprite+healthbox+badge gone (22508, §4) | **+1 tick** |
| `status1_1` clears (22508, §2/§6b) | same tick, badge/box already pixel-gone (22508) | **0 ticks** (coincident) |
| `gBattleOutcome` 0→1 (22818, §2) | old "fainted!" text still pixel-identical through 22826 | **+8 ticks minimum** (RAM leads pixel by at least this much — the flip itself has no dedicated pixel signature, it only matters for the later branch) |
| dismiss press, "Player defeated..." → loss-quote screen (23201) | old screen pixel-identical through 23228, transition starts 23229 | **+27 ticks** (the largest RAM-to-pixel gap in this dossier — a genuine multi-tick composite transition, not a simple lag, §6c) |

### 6f. Per-phase wiring verdict (engine planning payload, supersedes/extends §5)

| phase | verdict |
|---|---|
| FIGHT submenu (turn 17) | **pure wiring reuse**, verbatim (§5a) |
| FAINT_ATTACK / FIRE_PUNCH dispatch, crit/damage rolls | **pure wiring reuse**, verbatim per-move roll-shape AND exact dispatch-constant timing vs. turn16 (§5b) |
| Burn's physical-damage halving | **not exercised by FAINT_ATTACK** because DARK is special in Gen 3; source-accurate engine behavior is Tier-1-pinned separately (§5c) |
| FIRE_PUNCH's secondary-effect roll at an already-fainted target | **new-to-this-dossier finding, pure wiring** — the roll is unconditional per source and must be replicated even when its outcome is a guaranteed no-op (§5d) |
| Burn's end-of-turn residual, correctly absent | **new-to-this-dossier finding, pure wiring** — needs the `hp != 0` liveness gate explicitly (§5e) |
| Faint sink (sprite sink + healthbox/badge teardown) | **pure wiring reuse, now formula-exact** — `SpriteCB_FaintOpponentMon`/`AnimFaintOpponent`, RAM-confirmed bit-exact to the same closed form turn13 pinned (§6b, upgraded from §5f's "same-shape") |
| "Foe MURKROW fainted!" button-gated hold | **pure wiring reuse** of the verbatim faint-hold mechanic (§5g) — its own idle-bounce is a **new-to-this-dossier 3-phase cycle** (§6a) |
| Post-faint branch: win-sequence vs. forced send-out | **new mechanism, this dossier's own headline structural finding** — needs an explicit "any Pokémon left?" branch condition (§5h) |
| `gBattleOutcome` timing | **corrected timing fact, pure wiring** — flips mid-hold of the OLD text, well before the new screen appears (§5i) |
| "Player defeated BUG CATCHER DESTIN!♥" held | **pure wiring reuse** of the same button-gated-hold mechanic — its own idle-bounce is the **same 3-phase-family shape** as the fainted-text hold (§6a), not independently novel |
| DESTIN trainer-pic slide-in transition | **new mechanism, characterized this session** (§6c) — a ~31-tick composite fade+slide-in transition between the WIN-outcome text screen and the trainer-quote screen; not previously tabled at all |
| DESTIN's loss quote, button-gated | **pure wiring reuse** of the standard button-gated-text mechanic (§5j); its own missing cursor-blink remains an open, narrowed-not-resolved item (§6d) |

### Verification (this retrofit)

`npm test` (986/986) and `npm run build` green — no `src/` changes.
New/changed artifacts this session: `tools/probe/verify-turn17.ts` (245
curated captures, single oracle round trip, twice-run byte-identical, all
checks PASS), `tools/probe/specs/turn17-faintsink-watch.json` (new RAM-watch
spec, `ram-probe.py`, reused unmodified), and this doc's own §6 append. No
existing committed file (turn13-16 notes/scripts, `battle-turn-notes.md`,
`postwin-notes.md`, any `src/` file, any prior trace) was touched.

## 7. Engine rung 2: repeated FAINT_ATTACK animation body

Canonical renders **21854-22074** are implemented and committed in
`turn17-rung2.json` at **221/221 exact**, every tick captured. Its input
stream is prefix-identical to `turn17-rung1.json` for all 21,854 preceding
frames and appends 221 input-free frames.

The first owned render is confirmation age 0 at 21854. `Move_FAINT_ATTACK`
then reuses the exact source-derived turn-16 composition: both `BG_DARK`
fades, Murkrow's ellipse and alpha tasks, Magby's `ShakeMon2` response,
the animation-1 hitsplat, and the existing live field renderer. The
script's final restore write remains displayed for one VBlank after `end`,
so age 220 at tick 22074 is the last animation-owned render; age 221 is
outside this rung. Tier-1 tests pin both sides of that ownership boundary.

The shared field compositor now takes the occurrence's target HP interval
and explicit opponent healthbox state. Turn 17 therefore retains MAGBY at
`79/138` throughout this animation body and composes MURKROW at `58/142`
with the BRN badge, without duplicating any animation reducer. Post-hit
wobble/blink, HP drain, move handoff, FIRE_PUNCH, and all later ticks remain
unmodeled by this rung.

Regression verdict: turn17 rung 1 **118/118**, turn16 rung 2a **221/221**,
turn16 rung 5 **175/175**, turn16 verifier **233/233**, turn17 verifier all
**245** checks, Tier-1 **1049/1049**, and production build **5.457 MB**.
No absolute battle tick, framebuffer/screenshot asset, per-frame pixel/SHA
table, trace branch, coordinate/RGB fitting, or excluded capture was added.

## 8. Engine rung 3: FAINT_ATTACK resolution through the proven FIRE_PUNCH animation boundary

Canonical renders **22075-22217** are implemented in
`turn17-rung3.json` at **143/143 exact**, every tick captured. The trace
retains rung 2's input stream verbatim and only appends input-free frames.

The shared FAINT_ATTACK tail is now damage-parameterized instead of
inheriting turn 16's 59-point drain length. With turn 17's `79→27` hit,
the visible bar begins draining at kickoff age 261, reaches 27 at age 312,
and the atomic battle-HP write follows at age 314 (**tick 22168**).
Source-command spacing from `BattleScript_EffectHit` plus the fresh RAM
replay then gives:

| age | tick | state |
|---:|---:|---|
| 319 | 22173 | chance-0 FAINT_ATTACK secondary roll; RNG `1115590820→1657663047` |
| 326 | 22180 | target becomes MURKROW |
| 327 | 22181 | `gCurrentMove` clears |
| 328 | 22182 | MAGBY owns the turn; `gCurrentMove=FIRE_PUNCH` |
| 333 | 22187 | FIRE_PUNCH accuracy roll; RNG `1657663047→573732526` |
| 335 | 22189 | first FIRE_PUNCH text glyph |
| 357 | 22211 | FIRE_PUNCH PP `14→13` |
| 358 | 22212 | critical roll; RNG `573732526→3896110217` |
| 361 | 22215 | damage roll settles at 78; RNG `3896110217→1102173384` |

### 8.1 Corrected animation-ownership boundary

The brief's expected endpoint near 22197 was tested rather than assumed.
A fresh dense oracle replay showed ticks 22198 onward were still ordinary
FIRE_PUNCH text/controller lead-in. A second fresh `ram-probe.py` replay
watched `gBattleBufferA[0]`, `gBattleControllerExecFlags`,
`gAnimScriptActive`, `gBattleAnimAttacker`, and `gBattleAnimTarget`:

- tick **22188** queues controller command 16 (`CONTROLLER_PRINTSTRING`)
  with move 7 and remains in that command through the text lead-in;
- tick **22216** queues command 15 (`CONTROLLER_MOVEANIMATION`);
- tick **22218** is the first displayed state with
  `gAnimScriptActive=1` and animation attacker/target `0/1`.

This matches the source chain
`BtlController_EmitMoveAnimation` → `PlayerHandleMoveAnimation` →
`PlayerDoMoveAnimation` → `DoMoveAnim` in `battle_controllers.c` and
`battle_controller_player.c`. Therefore **22217 is the largest clean
contiguous pre-animation boundary**, and **22218 is the first
FIRE_PUNCH-animation-owned displayed frame**. FIRE_PUNCH's animation body
is intentionally not claimed or captured by this rung.

Tier-1 tests pin the HP-derived command schedule, all four post-hit RNG
transitions, PP/crit/damage/controller boundaries, and both sides of the
age-364 animation-ownership edge. Regression verdict: rung 3 **143/143**,
rung 2 **221/221**, rung 1 **118/118**, `verify-turn17.ts` all **245**
checks, Tier-1 **1052/1052**, and production build **5.458 MB**.
No absolute battle tick, framebuffer/screenshot asset, per-frame lookup,
trace branch, coordinate/RGB fitting, or excluded capture was added.
