# Turn 15 ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only): FLY's strike half, Onix's faint, and the battle's first FORCED PLAYER SWITCH (Onix → MAGBY)

**Headline**: Onix's own FIGHT-submenu choice (DRAGON_BREATH, cursor persisted
from turn 14) **never executes** — Murkrow, still locked in by
`STATUS2_MULTIPLETURNS`, acts first (as every prior turn) and resolves FLY's
**strike half**: it **does roll accuracy** (this dossier's centerpiece
question, now settled — not the auto-hit/auto-miss shortcut either airborne
case takes), hits, and deals **"not very effective..."** damage (Flying vs.
Onix's ROCK/GROUND typing, net 0.5×) for a computed **11**, clipped to
Onix's remaining **4 HP** — the kill. Onix faints (its stat stages reset to
neutral and its healthbox/sprite vanish from the field, 5 ticks after the HP
write), the button-gated "ONIX fainted!" text holds, and the game forces the
first **player-side** switch this dossier chain has ever ground-truthed:
"Choose a POKéMON." defaults its cursor to slot 0 (the just-fainted ONIX,
confirming §14 addendum's mechanism holds unchanged for this exact RNG
instance), one `DOWN` reaches MAGBY, `SEND OUT` confirms, and MAGBY
materializes at full HP (138/138) into a settled "What will MAGBY do?" menu
vs. an untouched MURKROW (142/142). `gBattleOutcome` stays **0** throughout
(RAM-confirmed at both window ends) — the battle continues, matching
§16/§14-addendum's own account of this exact script. One brief-contradicting
finding: the **"Your foe's weak! Get 'em, MAGBY!" flavor quip §14 addendum's
own (differently-timed) trace shows for this identical MAGBY-vs-MURKROW
send-out never appears here** — PNG-verified stride-1 across the entire
transition — a genuine RNG-line-dependent flavor-text difference, not a
scripting error (§5c).

## 1. Committed trace and prefix-consistency verdict

Extends `battle1-turn14-dense.json`'s own committed 110-segment/18956-tick
script (carried verbatim, unmodified) with `battle1-winline-b-swap.json`'s
own `segments[110:122]` (12 segments: Onix's FIGHT-submenu-open `A` + 30f
settle + confirm `A` — no nav, cursor persisted at DRAGON_BREATH exactly as
turn 14 left it — then a single 1000f resolution-idle segment covering
Murkrow's entire FLY-strike-to-Onix's-faint sequence, then the four
switch-flow presses/idles from §16's own HEADLINE 2 table: `A` dismiss
"ONIX fainted!" + 199f idle, `DOWN` + 14f idle, `A` + 39f idle, `A` + 499f
idle) — **122 segments, 20745 frames total**.

Committed: **`battle1-turn15-dense.json`** (245 captures): dense stride-1
across every button press and RAM-transition cluster (submenu open/confirm
18956-18990; the FLY-strike RNG/text/animation core 18990-19035; the
dismiss-into-party-list transient 19985-20010; the `DOWN`/`A`/`A` nav core
20185-20260; the switch-in settle's AI-prescoring cluster 20540-20560),
stride 3-8 across the strike animation and message-hold windows
(19035-19330), stride-30-35 sparse over the long button-gated "ONIX
fainted!" hold (19330-19985) and stride-10-18 sparse over the party-list
idle and the ball-throw/materialize hold (20010-20185, 20260-20540,
20560-20745). **Twice-run byte-identical** via `bin/oracle run` (two
independent runs, manifests 245/245 diffed, **0 sha mismatches**).

**Flatten-and-compare prefix check** (programmatic): flattened this trace's
full 122-segment/20745-tick button script against
`battle1-turn14-dense.json`'s own 110-segment/18956-tick script — **0
diffs** across all 18956 shared ticks (`turn14-dense ⊂ turn15-dense`,
script-exact) — and separately against `battle1-winline-b-swap.json`'s own
full 156-segment/33031-tick script — **0 diffs** across all 20745 ticks this
trace covers (`turn15-dense ⊂ winline-b-swap`, script-exact). Both checks
done by flattening every segment to a per-tick button-state string and
diffing arrays index-for-index, not spot-checked.

One footnote on the carried anchor: this trace's own tick-18956 capture
reads sha `f0b62ede0c4a`, not `turn14-notes.md` §4's cited
`ffc7639da02c` for the same nominal "settled menu" boundary. PNG-read, both
show the identical state (Onix 4/117, "What will ONIX do?", Murkrow's
sprite absent/airborne) — the diff is the FIGHT-cursor's own idle bounce
phase (the same small cyclic pixel wobble `turn13-notes.md` already
documents at other settled-menu ticks), not a state discrepancy; the
script-level flatten-diff above is the authoritative consistency check, and
it is clean.

## 2. RNG-consumption ledger (RAM-truthed, `gRngValue` sampled every tick 18900-20745)

New watch spec `tools/probe/specs/turn15-rng-watch.json` (identical column
set to `turn14-rng-watch.json`). Entering turn 15, `gRngValue` is flat at
`369617245` — the same value `turn14-notes.md` §2 left it at after its own
tick-18079 bookkeeping roll — unchanged through the carried settled-menu
idle.

| tick | steps | attribution |
|---|---|---|
| 19003 | 1 | **FLY's strike-half accuracy roll** — `BattleScript_SecondTurnSemiInvulnerable`'s own `accuracycheck BattleScript_SemiInvulnerableMiss, ACC_CURR_MOVE` (`battle_scripts_1.s:2005`), 3 ticks after `clearstatusfromeffect` zeroes `STATUS2_MULTIPLETURNS` (tick 19000) — **the brief's own centerpiece question, now settled: unlike the charge half (zero RNG, no accuracy check at all — `turn14-notes.md` §5a) and unlike an opponent attacking an airborne target (zero RNG, `STATUS3_ON_AIR` short-circuit — `turn14-notes.md` §5b), the strike half rolls a real percentage-based accuracy check** and hits (no miss text prints; `gStatuses3`'s own `STATUS3_ON_AIR` bit clears 1 tick later, at 19004, via `clearsemiinvulnerablebit` on the hit branch) |
| 19029 | 1 | **critical-hit roll** (`critcalc`, `battle_scripts_1.s:248`) — result: no crit (`gCritMultiplier` stays `1` for the rest of this window, RAM-confirmed) |
| 19032 | 1 | **damage-variance roll** (`damagecalc`'s own 85-100% roll) — coincides exactly with `gBattleMoveDamage`'s final step, 12→**11** |
| 19240 | 1 | ~~turn-tail/AI bookkeeping~~ **REATTRIBUTED (supervisor fold 2026-07-21, `docs/rng-attribution-notes.md`): FLY's own `Cmd_seteffectwithchance` chance-0 secondary roll, delayed to HP-write+93 by the faint sequence — NOT the same family as** the `turn13-notes.md`/`turn14-notes.md` rolls (those remain the separate AI/bookkeeping cluster); original attribution kept for the record: same family as `turn13-notes.md`/`turn14-notes.md`'s own single per-turn tail roll (there at 17105/17111 and 18079 respectively); falls after `hp0` already reads 0 (19147) and before the stat-stage reset (19326), inside this turn's own tick range by this chain's established attribution convention |
| 20550 | 1 | switch-in settle, AI-prescoring cluster step 1 — same shape `battle-turn-notes.md` §14-addendum HEADLINE 2 already found ("2 `Random()` steps... right at the transition into the new menu") |
| 20556 | 1 | switch-in settle, AI-prescoring cluster step 2 — **6 ticks after step 1**, the identical spacing §14 addendum's own instance shows (there: 19102→19109, 7 ticks) |

**Total: 6 `Random()` calls this window** (18956-20745). Zero RNG calls
during: Onix's own FIGHT-submenu nav/confirm (18956-18990); the
button-gated "ONIX fainted!" hold (19330-19985); the entire party-select
screen, `SEND OUT` submenu, and the fade/ball-throw/materialize animation
itself (19990-20540) — confirming §14 addendum's own finding ("the
switch-in animation itself is RNG-free") holds again, exactly, for this
independently-verified instance.

## 3. Turn order, battler stats, PP, and the exact clear ticks (RAM-confirmed)

`gBattlerAttacker`→**1** at tick 18994 (Murkrow acts first — the same
unconditional speed-order margin every prior turn established),
`gCurrentMove`→**19 (FLY)** at 18995, `gBattlerTarget`→**0** (Onix) same
tick. The two cross-turn-boundary flags `turn14-notes.md` §5c pinned as
"still set at 18956" both clear inside this window, at **exactly**:

- `STATUS2_MULTIPLETURNS` (`status2_1`): **4096→0 at tick 19000** —
  `clearstatusfromeffect BS_ATTACKER`, the very first mechanical step of
  `BattleScript_SecondTurnSemiInvulnerable`, well before the accuracy roll
  or any text.
- `STATUS3_ON_AIR` (`statuses3_1`): **64→0 at tick 19004** —
  `clearsemiinvulnerablebit` on the hit branch, immediately after the
  accuracy roll succeeds.

Onix's `hp0` (`gBattleMons+0x28`) drops **4→0 at tick 19147** — a single-tick
RAM write (the on-screen HP-bar drain animation is a separate, slower visual
effect; the underlying state changes atomically). `gBattleMoveDamage`
computed **11** (steps 0→16 at 19030 →12 at 19031 →11 at 19032, the last
step coincident with the damage-variance RNG call above) — more than
Onix's remaining 4 HP, so the applied/effective damage is clipped to
exactly 4, not the full 11 (a real damage-clipping behavior, not a
discrepancy). The "It's not very effective..." message (PNG-read, §4)
confirms the type multiplier: FLYING vs. Onix's ROCK/GROUND dual typing
nets **0.5×** (0.5× vs ROCK, 1× vs GROUND — Flying has no GROUND matchup
entry in this generation's type chart). Onix's stat stages reset from
`[6,0,6,6,6,6,5,6]` (ATK floor -6, ACC -1 from turn-13's SAND_ATTACK, both
carried since `turn14-notes.md`) to all-neutral `[6,6,6,6,6,6,6,6]` at tick
**19326**, the same tick the FIGHT-submenu's own move-selection cursor
(`gMoveSelectionCursor+0`) resets 2→0 — both are the faint-sink's own
stat/UI-state cleanup, not anything move-specific.

`dump-battler-full.py` snapshots at the window's four natural boundaries
(18956 entering, 19147 the HP-zero write, 19990 the still-undismissed
faint text, 20745 the settled MAGBY-vs-MURKROW menu):

| | ONIX / MAGBY (battler0) | MURKROW (battler1) |
|---|---|---|
| species/level | ONIX 95 → **MAGBY 240** (after switch), Lv50 both | MURKROW 198, Lv50 (unchanged all window) |
| moves (source-confirmed vs `constants/moves.h`) | ONIX: ROCK_SLIDE(157)/BIND(20)/DRAGON_BREATH(225)/SANDSTORM(201) — unchanged from `turn14-notes.md` | MURKROW: FAINT_ATTACK(185)/**FLY(19)**/TORMENT(259)/TAUNT(269) |
| MAGBY's own kit (post-switch, matches §16's table exactly) | FIRE_PUNCH(7)/SMOKESCREEN(108)/CONFUSE_RAY(109)/SMOG(123), PP 15/20/10/20 | — |
| ability (source-confirmed vs `constants/abilities.h`) | ONIX unchanged; **MAGBY = FLAME_BODY (49)** | MURKROW = **INSOMNIA (15)** |
| item (source-confirmed vs `constants/items.h`) | ONIX: none (0); **MAGBY = LAX_INCENSE (221)** | MURKROW = **LAX_INCENSE (221)** — same item as MAGBY, both independently RAM-read, not a probe error |
| HP | ONIX 4→**0** (tick 19147, lethal) → **MAGBY 138/138** (fresh, post-switch) | 142/142 unchanged the entire window |
| stat stages | ONIX `[HP,ATK,DEF,SPD,SPA,SPD,ACC,EVA]` = `[6,0,6,6,6,6,5,6]` → resets to all-6 at the faint (tick 19326) → MAGBY enters all-neutral | all-neutral throughout |
| status2/status3 (battler1) | — | `4096`/`64` entering → **both clear this window** (19000/19004, §3 above) → `0`/`0` for the rest |

`gBattleOutcome` (`0x202433a`) read **0** at tick 18956 and **0** at tick
20745 (custom one-off probe, not committed — the battle is still ongoing,
matching §16's own account that the WIN doesn't land until Murkrow itself
faints, turn 16+, out of this session's scope).

## 4. Pixel/window boundary table (sha256-cited, 12 hex chars, twice-run identical, PNG-read directly — not sha-reproduction-only)

| boundary | tick | sha256 (12) | note |
|---|---|---|---|
| carried settled "What will ONIX do?" menu | 18956 | `f0b62ede0c4a` | **PNG-confirmed** identical content to `turn14-notes.md`'s own cited boundary; sha differs only by cursor-bounce phase (§1 footnote) |
| FIGHT submenu open, cursor on DRAGON_BREATH (PP 17/20, reflecting turn 14's own use) | 18988 | `6fabb2bc7338` | **PNG-confirmed**: same 4-move layout as every prior turn, `TYPE/DRAGON` footer |
| confirm-press transient, submenu still on screen | 19003 | `6e80aba602ff` | RAM already shows `gBattlerAttacker`=1, `gCurrentMove`=19 (FLY), the accuracy roll already resolved — same "RAM commits ahead of the pixel" shape this chain always shows |
| "Foe MURKROW us..." typing in | 19010 | `b29f811a79ff` | **PNG-read, partial text** — confirms the strike half DOES print an attack string (contrast the charge half's empty string, `turn14-notes.md` §5a) — `BattleScript_SecondTurnSemiInvulnerable` joins the normal flow at `BattleScript_HitFromAtkString`, not before it |
| "Foe MURKROW used\nFLY!" held, Murkrow's sprite mid swoop-down animation | 19035-19090 | `640cc0897702` → `9a4ac9a2a9c6` | **PNG-confirmed**: Murkrow's sprite briefly occupies/overlaps Onix's own sprite position around tick 19110 (`4e4ff84dbbac`) — the strike's own impact frame |
| "It's not very effective..." | 19150-19330 | `7957ba3ee53c` (19150) → `48472e3852a7` (19195-19301, held) → `e699bba4ad9c` (19325) | **PNG-read directly**; text is fully typed and held well before the stat-stage reset (19326) and before Onix's sprite/healthbox vanish (19330) |
| Onix's healthbox and sprite gone from the field, "ONI[X]" fainted-text typing in | 19330 | `43f28321bf88` | **PNG-confirmed**: only Murkrow's healthbox remains on screen; the empty tan ground-oval is all that's left where Onix stood |
| "ONIX\nfainted!♥" held (button-gated) | 19365-19990 | `2d6c41d94131` (19365) → `ef43e683de1a` (19990, still un-dismissed at the dismiss-press tick) | **PNG-read directly**, full text confirmed and unchanged across the entire sparse-sampled hold |
| fade to black (party-menu transition) | ~20020-20040 | `d8b443032200` (20028) | pure-black frame, PNG-confirmed |
| "Choose a POKéMON." list, cursor on ONIX (FNT, 0/117), MAGBY 138/138 + BAYLEEF 153/153 shown | 20064-20185 | `2945edd25751` → `aea9c5c07c9c` | **PNG-confirmed**: cursor highlight box sits on ONIX's own icon by default — direct visual re-confirmation of §14 addendum's "cursor defaults to the fainted slot" finding, for this independently-verified instance |
| cursor moved to MAGBY after `DOWN` | 20191-20206 | `bce90c709d33` → `1e158bc9fb46` | **PNG-confirmed**: highlight box now on MAGBY's icon |
| "Do what with this Pokémon?" SEND OUT/SUMMARY/CANCEL, cursor on SEND OUT | 20246 | `4e987c2ebe0b` | **PNG-confirmed** |
| fade transition | 20302 | `4da3117d37db` | dark battle-scene fade, PNG-confirmed |
| "Go! MAGBY!" + ball-throw/materialize (silhouette growing into MAGBY's sprite) | 20400-20548 | `07d53943f65a` (20400) → `0f9a943dbb41` (20484) → `4f63d4696c93` (20540-20548) | **PNG-confirmed**, same materialize shape as turn 5's own switch-in (`turn5-switchin.json`) |
| message box clears (blank) | 20552-20556 | `a7a1d6374012` | **PNG-confirmed empty text box** — see §5c: no flavor-quip text ever appears here |
| settled "What will MAGBY do?" FIGHT/BAG/POKéMON/RUN vs. MURKROW | 20558-20745 | `083f11ed7f87` (20558) → `5950e7b3d8ba` (20560-20745, held) | **PNG-confirmed**: MAGBY's sprite and healthbox (138/138) fully rendered; settle actually lands at tick 20558, **187 ticks before** this trace's own scripted end (20745) — generous idle padding, consistent with this dossier's usual margin sizing, not a new minimum |

## 5. Reuse-map verdict (engine planning payload)

Comparing each mechanism of this switch window against the turn-5
(Grovyle→Pidgeotto, **opponent**-side) precedent and the closer
§14-addendum (Onix→MAGBY, **player**-side) precedent the brief named:

**(a) Faint sink (stat-stage reset, sprite/healthbox removal, move-cursor
reset).** **SAME-SHAPE, applied to the player's own battler0 slot instead
of battler1** — turn-5's precedent exercised this on the opponent's slot;
this is the first time this dossier chain has captured it on the player's
own side. Parameters an engine slice needs: battler index 0, all 8 stat
stages → neutral (`6`) simultaneously (tick 19326), `gMoveSelectionCursor`
→ 0. Same tick-after-HP-zero delay pattern as prior faints (179 ticks here:
19147→19326 — not independently compared to turn-5/13's own delay, flagged
as an open item below).

**(b) Button-gated "\<MON\> fainted!" hold.** **VERBATIM** — identical
mechanism to every prior faint in this dossier (Grovyle turn 5, Pidgeotto
turn 13): text prints once, then holds indefinitely until the player
presses `A`, zero RNG cost, zero further state change during the hold.

**(c) "Choose a POKéMON." party-select screen.** **VERBATIM vs.
§14-addendum**, not merely same-shape — this trace's own button script
(`DOWN` once, landing on MAGBY) **is** `battle1-winline-b-swap.json`'s own
committed script, the same file §16's coarse table already summarizes; this
session's contribution is confirming byte-for-byte prefix consistency and
adding the fine-grained RAM/PNG evidence (§2-§4) that §16 skipped over.
Cursor default = fainted slot (`gPartyMenu.slotId` = 0 at first read, one-off
probe confirmed, not committed as a spec) reproduces exactly, independently,
for this specific RNG instance — closing any residual doubt that §14
addendum's finding was a one-off.

**(d) SEND OUT/SUMMARY/CANCEL submenu.** **VERBATIM** vs. §14 addendum:
cursor defaults to SEND OUT, same button cost (`A`+~30-40f settle).

**(e) Ball prop / particle burst / materialize.** **SAME-SHAPE** vs. turn
5's own `turn5-switchin.json` engine slice (PROGRESS #26: ball prop + open-
particle burst + materialize growth phase) — visually the same fade →
silhouette-color-fill → full-sprite progression (§4), new parameters
(species MAGBY/240, its own palette). **Not independently re-verified to
the byte** against `turn5-switchin.json`'s own captured frames this
session — flagged as an honest gap, same discipline `turn13-notes.md` used
for its own same-shape-not-byte-verified claims.

**(f) Healthbox slide-in.** MAGBY's healthbox is already fully populated
(138/138) by the time its sprite is recognizably mid-materialize (tick
20484) — **not independently isolated to a specific slide-in sub-window**
this session (no dedicated dense capture cluster targeted just the
healthbox's own transform); flagged open, same honesty standard as (e).

**(g) Switch-in item proc.** MAGBY holds **LAX_INCENSE** (RAM-confirmed,
item id 221, §3) — **NO proc observed**: zero extra RNG calls or messages
beyond the established 2-step AI-prescoring cluster (tick 20550/20556, §2),
matching turn-13's own finding that Murkrow's identical LAX_INCENSE produces
no switch-in effect (the item has no on-switch-in trigger in this
generation — it's a passive evasion boost, source-uncontested).

**(h) The "Your foe's weak! Get 'em, MAGBY!" flavor quip — NOT REPRODUCED,
a genuine brief-contradicting finding.** §14 addendum's own account of this
identical MAGBY-vs-MURKROW send-out (a *different*, earlier exploratory
trace, not this session's committed script) explicitly describes this quip
as appearing, "not button-gated — auto-advances." This session's dense
stride-1 PNG read across the entire transition (tick 20540-20560, §4) shows
**no such text at any sampled tick**: "Go! MAGBY!" clears directly to a
blank message box (20552-20556), then straight to the settled FIGHT menu
(20558) — no interposing quip, ever. Both traces share the identical
matchup (MAGBY vs. MURKROW) and identical held item states, so type-
matchup alone doesn't explain the difference; the most likely explanation,
consistent with §16's own HEADLINE 4 finding that idle-timing outside
battle is an RNG lever with downstream content consequences, is that this
flavor line is drawn from an RNG-selected pool and this session's exact
tick-for-tick script (a different RNG line than §14 addendum's own
exploratory attempt) simply rolled a different (blank/no-quip) outcome.
**Not independently re-derived to a root cause this session** — flagged
for a future session if the engine ever needs to model this quip's
selection logic.

## Verification

`npm test` (821/821) and `npm run build` green — no `src/` changes this
session; new artifacts are `tools/compare/traces-groundtruth/battle1-turn15-
dense.json`, `tools/probe/specs/turn15-rng-watch.json`, and this doc. New
trace twice-run via `bin/oracle run`, manifests (245/245) diffed byte-
identical across two independent runs, 0 sha mismatches. Prefix-consistency
checked programmatically both against `battle1-turn14-dense.json`'s own full
110-segment script (0 diffs, all 18956 shared ticks) and against
`battle1-winline-b-swap.json`'s own full 156-segment script (0 diffs, all
20745 ticks this trace covers). RAM probes: `ram-probe.py` with the new
watch spec (run once, cross-checked internally — every RNG step recomputed
from raw `gRngValue` deltas, every status2/status3/hp/stat-stage transition
independently reconciled against `dump-battler-full.py`'s own snapshots at
ticks 18956/19147/19990/20745, run once against the committed trace file);
a one-off, uncommitted probe script (`gBattleOutcome` + `gPartyMenu.slotId`
across the full window) cross-checked its own `gRngValue` re-reads against
`ram-probe.py`'s output at the same ticks — identical. Every sha256 cited
in §4 was read directly from this session's own committed trace's first-run
manifest at exactly the cited tick. Every PNG text/state claim (§1, §3-§5)
was read directly from a rendered frame, not inferred from RAM alone,
including the negative finding in §5h (dense stride-1 read, no assumption).
Source citations (§2-§3, `battle_script_commands.c`, `battle_scripts_1.s`,
`constants/moves.h`, `constants/abilities.h`, `constants/items.h`,
`constants/species.h`) are read-only references used to explain and
cross-check RAM-observed behavior — no `src/` files were touched.

**PAPERCUT**: the parent brief's own assumption ("Murkrow auto-continues
without a menu prompt") undersold the actual mechanism slightly — it isn't
just "no menu," the strike half also reprints a full "Foe MURKROW used
FLY!" attack string and rolls real accuracy/crit/damage, i.e. it's much
closer to an ordinary move resolution than the charge half was. Not a
time-cost papercut, just flagging that a future brief shouldn't assume the
two-turn move's second half is RNG-free by analogy to its first half —
each half has to be independently checked (this session's own instruction
already said as much — "expectation to VERIFY, not assume" — and that
discipline paid off directly here).

## 6. Worktree-lane retrofit — wiring-ready standard (S7/S8 worktree scout, no engine code)

Shipped **`tools/probe/verify-turn15.ts`** (same convention as
`verify-turn13.ts`/`verify-turn14.ts`: re-derives every pinned fact from a
FRESH `bin/oracle run` against the already-committed `battle1-turn15-
dense.json`, pixel-only, no RAM reads at runtime). 225 curated captures
(under the 256 cap), **twice-run byte-identical** (two independent `node`
invocations, full stdout diffed, 0 differences), **58/58 checks PASS**.
RAM cross-checks for the corrections below used `dump-fly-anim.py` (generic
sprite/OAM/status dump, reused unmodified over ticks 18995-19340 against
the committed trace) plus fresh dense oracle pixel re-bisections (one-off,
uncommitted `node` snippets against the committed trace — same discipline
as the committed script, just not saved as a file).

### 6a. §4 corrections (dense re-bisection of every "~" / wide-range row)

Exactly the "1-4 citation slips" class the brief predicted, all pixel- or
RAM-confirmed, none large enough to change any headline verdict:

| §4 row (original) | correction | evidence |
|---|---|---|
| "Murkrow's sprite briefly occupies/overlaps Onix's own sprite position around tick 19110" | **Not an overlap.** RAM (`dump-fly-anim.py`) shows Murkrow's own mon sprite stationary at `(176,51)` the entire window from its reappear tick (19075) onward, ~40px+ from Onix's `(72,80)` — never coincident. What's actually visible at 19102-19135 is a plain **hit-flash blink on ONIX's own sprite** (`invisible` toggling true/false every ~4 ticks, 4 distinct rendered frames sampled) — a normal "took damage" flash, misread as a Murkrow/Onix overlap | RAM sprite-slot dump (slot 6 = Onix, slot 5 = Murkrow) + `verify-turn15.ts`'s own hit-flash check (4 distinct alternating frames, 19102-19135) |
| "not very effective..." held sha `48472e3852a7` cited at "19195-19301" | Actual held window is **19174-19308** — starts 21 ticks earlier, ends 7 ticks later than cited | dense pixel bisection, `verify-turn15.ts` |
| transition sha `e699bba4ad9c` cited at "19325" | Actual tick is **19321** — 4 ticks earlier | dense pixel bisection, `verify-turn15.ts` |
| fade-to-black cited as "~20020-20040" (approximate) | Exact pure-black window: **20027-20040** (flagged by the brief as the one literal "~" row) | dense pixel bisection, `verify-turn15.ts` |
| "Choose a POKéMON." list cited as a flat 2-sha plateau (`2945edd25751`/`aea9c5c07c9c`) | Actual plateau **idle-bounces through 4 phases**: `{2945edd25751 (first settle), bce90c709d33, aea9c5c07c9c, 35a120289fcc, f0ff81cff21d}` — same "settled screen has its own idle bounce" family turn13/14 already found for menu boxes, richer here | dense pixel bisection over 20064-20189, `verify-turn15.ts` |
| **"cursor moved to MAGBY after DOWN" cited as `bce90c709d33` (20191) → `1e158bc9fb46`** | **False-positive attribution.** `bce90c709d33` is one of the 4 pre-existing party-list idle-bounce phases (row above) — it recurs repeatedly well *before* the DOWN press (e.g. tick 20070, 20115, 20144, 20176, 20189, all pre-press) and is *not* caused by the press at all. The genuinely new, uniquely-post-DOWN state is `1e158bc9fb46` (absent from the entire pre-DOWN bounce set), dense-bisected to first appear at **tick 20204** | dense pixel bisection across both windows, `verify-turn15.ts` |
| settled "What will MAGBY do?" menu cited as settling at "20558", held flat at `5950e7b3d8ba` | Settle actually lands **1 tick earlier, at 20557**; the hold is a **4-phase idle bounce** `{5950e7b3d8ba, 083f11ed7f87, d725501bc9e3, 6e2f6409169f}` (period ~37 ticks), not a flat single sha — same family as the party-list and fainted-text idle bounces above | dense pixel bisection over 20555-20744, `verify-turn15.ts` |
| "ONIX\nfainted!♥" held cited as 2 shas (`2d6c41d94131` @ 19365, `ef43e683de1a` @ 19990) | Actual hold is a **3-phase idle bounce**: `ef43e683de1a` → `b27912b6eda4` → `2d6c41d94131`, ~9 ticks per phase, repeating — likely the "♥" heart icon blinking on its own sub-cycle independent of the box itself | dense pixel bisection over 19341-19370 + spot-checked at 19980-19990, `verify-turn15.ts` |

None of these change any §1/§2/§3/§5 headline verdict — every correction is a
tighter boundary or a richer-than-cited idle-bounce set, the same
non-destructive class of slip `verify-turn13.ts`/`verify-turn14.ts` each
found ~1-4 of.

### 6b. FLY strike-half animation, characterized (mission item (a))

Source-confirmed: the strike half uses **`gFlyBallAttackSpriteTemplate`/
`AnimFlyBallAttack`** (`battle_anim_flying.c:142-150,495-528`) — a sibling
of the charge half's `gFlyBallUpSpriteTemplate`/`AnimFlyBallUp`
(`turn14-notes.md`'s own subject), sharing the same `ANIM_TAG_ROUND_SHADOW`
tile tag but a **distinct sprite template, affine table, and trajectory**
(diagonal linear translation into the target, not a vertical squash/
stretch) — genuinely a different mechanism, not a reuse of the charge
half's own sprite. Per-tick RAM (`dump-fly-anim.py`, ticks 18995-19340,
generic sprite-slot/OAM dump, no modification needed):

| tick | event |
|---|---|
| 19000 | `STATUS2_MULTIPLETURNS` clears (matches §3) |
| 19004 | `STATUS3_ON_AIR` clears (matches §3); Murkrow's own mon sprite (slot 5) still `invisible=true` |
| 19035 | Both battlers' sprites drop to `affineMode=0` (identity, no matrix) — the submenu-clear transition |
| 19042 | Onix's own sprite (slot 6) sets `invisible=true` briefly (pre-hit-flash lead-in) |
| 19045 | **New sprite (slot 3)** spawns at `(272,-32)` — off-screen top-right, `AnimFlyBallAttack`'s own opponent-side spawn point (`DISPLAY_WIDTH+32, -32`) |
| 19060-19074 | slot 3 translates via `AnimTranslateLinear` (sub-pixel `x2`/`y2` accumulate every tick; base `x` snaps `272→62` at 19065 mid-flight) toward Onix's target coordinates |
| 19067 | **New sprite (slot 4)** spawns at `(72,88)`, tile 433 — an impact/contact effect coincident with the ball's approach to Onix's position (not independently source-traced this session — flagged open) |
| **19075** | slot 3 (`AnimFlyBallAttack`'s sprite) is **destroyed** (`inUse→false`) **the same tick** Murkrow's own mon sprite (slot 5) flips `invisible→false` — exactly `AnimFlyBallAttack_Step`'s own source-code branch (`gSprites[ANIM_ATTACKER].invisible = FALSE; DestroyAnimSprite(sprite);`, same `if` block), RAM-confirmed as simultaneous, not approximated |
| 19102-19135 | Onix's own sprite (slot 6) hit-flash-blinks (`invisible` toggles ~every 4 ticks, 4 distinct rendered frames) — the "took damage" flash, **not** a Murkrow/Onix overlap (§4 correction above) |
| 19325 | Onix's mon sprite (slot 6) destroyed (`inUse→false`) **and** its healthbox sprite (slot 0, tile 28) sets `invisible→true` — the RAM-level faint-sink teardown, both in the same tick |

### 6c. Faint-vanish render-lag, resolved (mission item (c) + headline correction)

The headline's own parenthetical ("healthbox/sprite vanish...5 ticks after
the HP write") is **imprecise about *which* event the 5 ticks are measured
from**. RAM (§6b above) pins the actual sprite/healthbox teardown at tick
**19325** — **178 ticks after** the HP-write (19147), not 5, and 1 tick
*before* the stat-stage reset (19326, §3). The pixel-confirmed vanish
(§4, tick 19330) lands **exactly 5 ticks after the RAM teardown (19325)**,
not after the HP write. **Corrected framing: "healthbox/sprite go
RAM-invisible at 19325 (178 ticks after the HP write, 1 tick before the
stat-stage reset); the rendered frame follows 5 ticks later, at 19330 — a
plain RAM-ahead-of-pixel render lag, the same shape this whole dossier
chain already documents at every other state transition, not a new
mechanism."** This is the **faint-sink family already known from turn-5**
(`faint-switch-notes.md` §3a/§7a, `SpriteCB_FaintOpponentMon`/
`AnimFaintOpponent`) applied to the player's own slot — this session did
not re-derive a player-side function name (not source-traced), but the
RAM-observed shape (stat reset + sprite/healthbox teardown in one tick,
5-tick pixel lag) matches that family's own signature exactly; flagged
open (function-name-level confirmation) same honesty standard §5 already
used.

### 6d. Party/switch screen reuse — turn-5 vs §14-addendum, resolved (mission item (b))

The mission asked to double-check whether turn-5's own forced switch was
player-side too (which would contradict §5(a)'s "first time on the
player's own side" claim). Cross-referencing the existing, already-landed
ground truth (no new probing needed — this is a documentation
cross-check, not a RAM question): **turn-5's forced switch is
opponent-side** — DESTIN's own Grovyle faints, DESTIN's AI sends out
Pidgeotto (`faint-switch-notes.md` §3a/§7a/§10, `battle-turn-notes.md`
§24/§26, all describing DESTIN's/the opponent's own party). **§14-addendum's
own SEND OUT-confirm sequence (Onix→MAGBY) is the player-side precedent**
— its own `battle1-victory.json`/`battle1-switch.json` trace explicitly
walks the *player's* `gPlayerParty`/"Choose a POKéMON." list. This turn's
own switch (Onix→MAGBY, §1) reuses **§14-addendum's own player-side
machinery**, not turn-5's opponent-side one — §5(a)/(c)'s claims stand
confirmed, no contradiction found.

### 6e. Render-lag ledger (this session's additions)

| RAM event | pixel-confirmed tick | lag |
|---|---|---|
| sprite/healthbox teardown (19325) | vanish frame (19330) | **5 ticks** |
| `AnimFlyBallAttack` sprite destroy + Murkrow visible (19075, simultaneous in RAM) | (not independently pixel-bisected to a sub-tick lag this session — the sprite itself IS the pixel content, so RAM and pixel are definitionally coincident here) | 0 (by construction) |

### 6f. Per-phase wiring verdict (engine planning payload, supersedes/extends §5)

| phase | verdict |
|---|---|
| FLY strike-half attack-ball sprite (`AnimFlyBallAttack`) | **new mechanism** — diagonal linear-translation "round shadow" sprite from the attacker's off-screen corner to the target, distinct affine table from the charge half's vertical squash/stretch; shares only the tile tag with `AnimFlyBallUp` |
| Onix hit-flash (post-impact) | **pure wiring reusing** the standard damage-taken sprite-invisible-toggle family (same shape as turn9's own hitsplat/hitflash convention, `dump-turn9-hitflash.py`) — not independently re-diffed against that file this session, flagged open |
| Onix faint sink (stat reset + sprite/healthbox teardown) | **pure wiring reusing** the turn-5 faint-sink family (`SpriteCB_FaintOpponentMon`/`AnimFaintOpponent`), applied to the player's own slot; RAM shape matches exactly (§6c), function-name-level confirmation still open |
| "ONIX fainted!" button-gated hold | **pure wiring reusing** the verbatim faint-hold mechanism (§5b) — its own idle-bounce animation is a **new-to-this-dossier 3-phase cycle**, not previously characterized in that much detail elsewhere |
| "Choose a POKéMON." party-select screen | **pure wiring reusing** §14-addendum's own player-side machinery verbatim (§5c, §6d) — its own idle-bounce is a **new-to-this-dossier 4-phase cycle** |
| SEND OUT/SUMMARY/CANCEL submenu | **pure wiring reusing** §14-addendum verbatim (§5d) |
| Ball-throw/materialize | **same-shape reuse** of `turn5-switchin.json`'s own mechanism (§5e) — still not independently byte-verified against that file, open per §5e |
| Healthbox slide-in | not independently isolated this session either (§5f still open) |
| Settled "What will MAGBY do?" menu | **pure wiring reusing** the standard settled-menu idle-bounce family (turn13/14) — a **new-to-this-dossier 4-phase cycle**, richer than the usual 2 |

### Verification (this session)

`npm test` and `npm run build` green — no `src/` changes. New artifact:
`tools/probe/verify-turn15.ts` (225 curated captures per run, single
`bin/oracle run` round trip, 58/58 checks PASS, **twice-run byte-identical**
— two independent `node --experimental-strip-types` invocations, full
stdout diffed, 0 differences). RAM cross-checks used `dump-fly-anim.py`
(existing tool, reused unmodified with new tick-range arguments against the
already-committed `battle1-turn15-dense.json`) plus uncommitted one-off
dense pixel re-bisections (`node --experimental-strip-types -e '...'`
snippets against the same committed trace, same oracle round-trip
discipline as the committed script). No new trace files needed — every
correction and characterization above is derived from the already-committed
`battle1-turn15-dense.json`. Source citations
(`battle_anim_flying.c`, `faint-switch-notes.md`, `battle-turn-notes.md`
§14-addendum) are read-only references used to explain RAM-observed
behavior — no `src/` files touched.

**PAPERCUT**: none new this session beyond what §5h/the original dossier
already flagged — the dense re-bisection work here was straightforward
(same oracle round-trip methodology as turn13/turn14's own retrofits),
though the number of previously-uncharacterized idle-bounce phases (3 for
the fainted-text hold, 4 for both the party-list and the settled-MAGBY-menu
holds) was higher than either prior retrofit found, suggesting future
dossier sessions should default to assuming 3-4+ phase bounces on any
button-gated hold rather than checking just 2 shas.

## 7. Engine wiring, boundary (i) close-out (bounded worker, 2026-07-22)

Wired the reopen gate + FIGHT submenu + confirm + kickoff-text window
(18956-19044) per §5/§6's own reuse map. New `turn14Resolved` state flag
(`src/engine/battleScene.ts`/`core.ts`) mirrors `turn13Resolved` exactly:
`TURN14_DRAGONBREATH_MENU_REDRAW_DELAY` (= `TURN14_MENU_REDRAW_TICK` -
`TURN14_DRAGONBREATH_PRESS_TICK` = 331) gates the reopen, cursor persisted
at slot 2 (no nav), `currentPPForActiveMon` gets a 3rd slot-2 decrement
(turn 14's own auto-missed DRAGON_BREATH still costs PP — 20→17, matching
§4's own "PP 17/20" citation exactly).

One correction to this dossier's own §4 table found in the process: the
"confirm-press transient, submenu still on screen" row (18988→19003) is
NOT followed by a bare/blank-box gap like turn 14's own charge-half kickoff
(`turn14BareSceneStartTick`) — a fresh dense sha-transition probe (tick-by-
tick, 18985-19080) shows the FIGHT submenu chrome holds byte-identical all
the way through **19006**, then hard-cuts directly to the kickoff text's
own first glyph at **19007** — no intervening blank tick at all. The
kickoff text itself is 20 printable chars (not 21 as a naive line-length
sum might suggest — "Foe MURKROW used" is 16 chars, not 17), oracle-pixel-
bisected exact via the two space characters' own "no visible change" ticks
(chars 3→4 at 19009/19010, chars 11→12 at 19017/19018) as an independent
cross-check on top of the settle tick.

Committed `tools/compare/traces/turn15-fly-strike.json`: 82/82, 0 diff,
18956-19044 stride-1 minus 7 excluded ticks (a pre-existing sine-bounce
"extremum" mismatch on Onix's own idle sprite, unrelated to this session's
own new code — **ISSUES #35**). Regression sweep 0 diff: `turn14-fly-miss`
165/165, `turn13-switchin` 240/240, `turn13-menu` 57/57. `npm test` 993/993
(27 existing test-literal call sites across 5 files threaded the new
`turn14Resolved` field), `npm run build` green.

**Not attempted this session** (boundaries (ii)/(iii): the FLY strike
animation core, not-very-effective text, HP drain, faint sink, fainted-hold
— ticks 19045-19990): the ball-descent trajectory and the new impact
sprite's own asset both need a dedicated RAM/VRAM probe pass this session's
remaining budget didn't cover — **ISSUES #36** has the full scope and next
steps. Everything else in §6f's reuse table (hit-flash, faint sink, fainted-
hold, HP drain) is flagged "pure wiring reusing" an existing mechanism and
should be mechanical once (ii)'s two new-derivation items land.

## 8. Engine wiring, boundary (ii) close-out (bounded worker, 2026-07-22)

Wired the FLY strike-half **animation core** (ball descent, impact sprite,
Onix's own hit-flash) per ISSUES #36's own two-probe plan. Both probes ran
first, per the step brief, before any `src/` code was touched.

**PROBE 1 (impact sprite identity) — VERDICT: it IS the hitsplat.** Source
first: `Move_FLY`'s own `FlyUnleash` script (`data/battle_anim_scripts.s:6417`)
calls `create_basic_hitsplat_sprite ANIM_ATTACKER, 2, x=0, y=0,
relative_to=ANIM_TARGET, animation=0` — the exact same
`gBasicHitSplatSpriteTemplate`/`ANIM_TAG_IMPACT` macro `QUICK_ATTACK`'s own
script uses (ISSUES #31's already-wired family), just a **different
`animation` argument** (0 vs QUICK_ATTACK's 1): `sAffineAnim_HitSplat_0`
(`battle_anim_normal.c:134-137`) is a single flat
`AFFINEANIMCMD_FRAME(0,0,0,8)` — **no zoom-in "pop" at all**, unlike every
other hitsplat instance this dossier chain has wired so far. RAM confirms
this exactly: the sprite's own OAM matrix (`gOamMatrices`) reads a CONSTANT
neutral `{a:256,b:0,c:0,d:256}` for its entire 9-tick life (RAM 19067-19075
inclusive, destroyed 19076) — never zooms. Same screen center `(72,88)` as
turn 9's own hitsplat (both are `relative_to=ANIM_TARGET,x=0,y=0` against
the same player-side Onix). A fresh VRAM/palette dump at RAM 19068
(`dump_turn15_hitsplat_vram.py`, ad hoc this session, same 4bpp-OBJ
addressing recipe `dump-cuttingslice-vram.py` established) confirms the
tile pixel data and palette (`index4 = (255,255,173)` after mGBA's 15→24
expansion) are **bit-for-bit identical** to the already-extracted
`battle-anim-hitsplat.json` asset — pure re-anchor, no new asset work
needed. (Tile number 433 here vs turn 9's own 305 is NOT a contradiction —
turn 9's own trace confirmed OBJ VRAM tile numbers are dynamically
allocated per-battle-session load order, not a stable per-asset ID; QUICK_
ATTACK's own hitsplat read tile 305 in that same trace, so tile-number
comparison across traces was never going to be meaningful on its own —
identity was confirmed via source + affine-anim shape + VRAM content, not
tile-number matching.)

**PROBE 2 (ball-descent table) — literal RAM-truthed, `dump-fly-anim.py`
re-run 19035-19150 against the committed `battle1-turn15-dense.json`.**
`AnimFlyBallAttack`'s own ball (slot 3) turns out to be perfectly linear:
effective screen position (`sprite->x + sprite->x2`, `sprite->y +
sprite->y2`) moves exactly `(-10,+6)` px/tick for its entire 30-tick flight
(RAM 19045-19074), continuous straight through the mid-flight base-`x`
"snap" (`272→62` at RAM 19065) the original scout dossier's §6b already
flagged — RAM-confirmed that snap is pure `x`/`x2` bookkeeping
(`AnimFlyBallAttack_Step` flushes `x2` into `x` once its own fixed-point
accumulator's integer part exceeds 200), not a visual jump. Rotation is a
**single constant matrix** (`{142,212,-212,142}`, ≈-56.25° at neutral
scale) for the sprite's whole life, not a per-tick affine table like turn
14's own squash/stretch ball — `sAffineAnim_FlyBallAttack_1`'s own single
one-tick rotation frame, confirmed exactly against RAM. Banked as a literal
30-row table (`TURN15_FLY_BALL_TABLE`), same "no formula fitting"
convention as `TURN14_FLY_BALL_TABLE` even though a formula would
reproduce it exactly here.

**Render lag:** `TURN15_STRIKE_RENDER_LAG=1` (render *t* shows RAM *t-1*)
holds for every mechanism in this window (ball, hitsplat, hit-flash toggle,
healthbox wobble, shake) — the dominant family convention this file already
uses (kickoff text/blend/flicker/hitsplat), oracle-pixel-verified across
the whole extended window, not assumed.

**Three findings this session's own dense oracle-pixel bisection turned up
that the original scout dossier's RAM-only read didn't catch** (RAM alone
was misleading in all three — pixels were the tiebreaker):

1. **Onix's own RAM-`invisible=true` span (19042-19081) does NOT hide it on
   screen.** `FlyUnleash`'s own `monbg ANIM_DEF_PARTNER` (called before the
   ball even spawns) swaps Onix's real OBJ sprite for a BG-layer-composited
   copy — same "convert to BG so `setalpha`'s own OBJ↔BG blend can apply"
   trick this file's own `doubleTeam` mechanism doc already describes
   elsewhere — so the copy renders pixel-identical content while the
   now-redundant OBJ sprite sits invisible underneath. Oracle-pixel-proven
   (render 19050 shows Onix's ordinary, unchanged silhouette). The engine
   needs **no visibility change at all** for this span — `turn15OnixInvisible`
   only gates the genuine post-`clearmonbg` hit-flash toggle (RAM
   19107-19134, 4 distinct ~4-tick pulses, settling visible at 19135).
2. **The impact sprite's own blend target is the LIVE framebuffer (Onix's
   own already-rendered body), not the static field.** Turn 9's own
   QUICK_ATTACK hitsplat was RAM-proven to win its OAM tie against Onix
   unconditionally, excluding Onix from the blend entirely
   (`drawSpriteSheetAffineStretchBlendedOverFb` against `staticBgPixel`
   alone). FLY's own hitsplat does NOT follow that rule — solving the
   blend equation backward from the oracle's own observed pixel
   (`(255,255,220)` at the sprite's exact center) only reproduces exactly
   against Onix's own real body color (`(189,181,181)`, sampled from a
   frame with the hitsplat absent) at `eva=12,evb=8`; blending the same
   source texel against the static sky background there (`(255,255,255)`)
   overshoots to pure white. Rewired onto the plain, live-fb
   `drawSpriteSheetBlendedOverFb` (matrix is neutral, so no affine sampling
   is even needed) — a genuine per-move OAM-ordering difference from turn
   9, not a mistake in turn 9's own already-verified fix.
3. **Onix's own `AnimTask_ShakeMon` x2 shake** (`FlyUnleash`'s own
   `createvisualtask AnimTask_ShakeMon, 5, ANIM_TARGET, 6, 0, 8, 1`) is real
   and visible during the hitsplat's own life — RAM shows three 2-tick `x2=6`
   pulses (19069-19070/19073-19074/19077-19078), not the 8-tick/1-cycle
   shape the macro's own literal arguments might suggest. Banked literally
   (`TURN15_ONIX_SHAKE_RAM_TICKS`, a `Set`), same convention as turn 9's own
   `TURN9_EP1_ONIX_SHAKE_RENDER_OFFSETS`. Missing this caused an exact
   period-4 (2-match/2-diff) oracle mismatch pattern that made the root
   cause obvious once plotted.

Also needed: a **z-order fix** (hitsplat must draw BEFORE the ball, not
after — oracle shows the ball's own opaque silhouette winning the overlap
at their shared corner, RAM-consistent with the ball's earlier creation
tick giving it a lower `gMain.oamBuffer` slot, the same tie-break rule this
dossier chain's `dump-quickattack-hitsplat-oam.py` already established), and
a **healthbox wobble** (`DoHitAnimHealthboxEffect`, `+-1 y2` alternating,
20 ticks, RAM starting 19106 — one tick before the sprite-flicker's own RAM
19107 start, exactly turn 9's own `TURN9_EP2_HEALTHBOX_WOBBLE_START` vs
`TURN9_EP2_FLICKER_START` offset) that the brief's own scope list didn't
separately name but is part of the same generic `hitanimation` hit-flash
combo turn 9 already established (two independent concurrent effects, not
one).

**New `src/` surface**: `TURN15_FLY_BALL_TABLE`/`drawTurn15FlyBallDescent`,
`turn15OnixInvisible`, `turn15MurkrowInvisible`, `turn15OnixShakeX2`,
`turn15OnixHealthboxWobbleY2`, `drawTurn15ImpactHitsplat`.
`drawTurn13SwitchinFieldBase` gains `onixInvisible`/`healthboxY2Extra`/
`onixX2` (all default-false/0, every pre-existing call site unaffected).

**`turn15-fly-strike.json`**: extended 19045-19141 (was 19044 — boundary
(i)'s own endpoint), 176/176, 0 diff. Two exclusions, both named:

- **19059-19061** (≤10px, ~0.03%): a tiny corner-rounding residual on the
  ball's own rotated-affine edge where it clips against Murkrow's
  healthbox — same residual CLASS this codebase already has open
  elsewhere (e.g. the ENDEAVOR hitsplat's own documented "tips/edges"
  fine-affine-rounding gap, `battle-turn-notes.md`), not chased further
  this session (shared-primitive risk: `drawSpriteSheetAffineRotate` is
  used by several other already-verified 0-diff callers, so tweaking its
  rounding to chase a 3-tick/10px residual risked a wider regression for a
  disproportionately small win).
- **19142 onward is out of this rung's scope, not excluded-and-padded.**
  Dense oracle bisection (not assumed from the original dossier's own
  "HP-write at 19147" citation) pins the HP digit text ALREADY changing
  (`4/117`→`3/117`) starting exactly at render 19142 — 5 ticks earlier than
  the dossier's own citation, and squarely boundary (iii)'s own HP-drain
  mechanism (explicitly out of scope for this rung). Rather than pad the
  trace to a round "~19150" with a block of out-of-scope exclusions, the
  trace stops cleanly at 19141, the true end of boundary (ii)'s own
  content — a useful correction for boundary (iii)'s own future session
  (its HP-drain window starts at 19142, not ~19147).

Verified: `verify-turn15.ts` 59/59 PASS (twice — mandatory-first-step
re-run, unaffected since it's oracle-only). Regression sweep 0 diff:
`turn14-fly-miss` 165/165, `turn13-switchin` 240/240, `turn13-menu` 57/57.
`npm test` 993/993 (unchanged — no test-literal call sites reference the
new optional params), `npm run build` green.

**PAPERCUT**: none new — both probes were real, bounded RAM work exactly as
scoped, and the oracle-round-trip iteration loop (extend scratch
captureFrames → compare → crop/diff the PNGs → adjust one constant → repeat)
was fast each cycle. The one time cost worth flagging for future sessions:
tile-number equality is NOT a valid identity test across different battle
traces (VRAM OBJ tile allocation is dynamic, load-order-dependent) — Probe
1's own brief suggested checking it as a cheap first pass, and it would
have been actively misleading here (433 vs 305) if source + affine-anim
shape + a fresh VRAM dump hadn't been used as the real tiebreakers instead.

## 9. Engine wiring, boundary (iii) partial close-out (bounded worker,
2026-07-22): HP drain + "not very effective" text wired; faint sink +
fainted-hold NOT reached this session

Dense oracle-pixel bisection (fresh `bin/oracle run`, scratch trace reusing
`turn15-fly-strike.json`'s own committed 20745-frame button script, stride-1
over 19140-19160) pinned two things §8 left as boundary (iii)'s own next
step:

1. **HP drain start tick, corrected once more.** §8's own correction found
   the HP digit "already changing" at render 19142; this session's dense
   read shows the drain is a plain 1-HP/tick countdown with anchor
   **19141** (`d = t - 19141`, `hp(t) = max(0, 4 - max(d,0))`): 4/117 held
   through 19141, then 3/2/1/0 at 19142/19143/19144/19145, flat at 0
   thereafter — reusing the ALREADY-VALIDATED player-side HP-digit/band
   overlay machinery (`endeavorOnixHp`'s own shape, `playerHealthboxHpOverlayForHp`'s
   compositor) verbatim, just a fresh anchor + start/end pair (4→0), no new
   derivation. Settles 2 ticks before RAM's own atomic `hp0` write (19147,
   §3) — pixel-ahead-of-RAM, not RAM-ahead-of-pixel like most of this
   dossier's other transitions; flagged as this specific transition's own
   shape, not assumed transferable.
2. **"It's not very effective..." start tick.** The kickoff text ("Foe
   MURKROW used\nFLY!") holds unchanged through render **19150** (§4's own
   citation for this tick's sha turns out to still be the OLD kickoff text,
   not this message — a one-more citation-slip in the same class §6a
   already found several of), hard-cutting to this message's own first
   glyph at **19151**. `TURN9_NOTVERYEFFECTIVE_LINE` ("It's not very
   effective…", single line, curly apostrophe + ellipsis) reused VERBATIM,
   zero new asset — same string, same type matchup shape (a 0.5x
   not-very-effective result), `turn15SimpleVisibleChars`' own 1-char/tick
   mechanism. Cross-checked independently against §6a's own correction
   (not just fit to the start boundary): 24 total chars, `19151+24-1 =
   19174`, exactly matching §6a's own dense-bisected "held window starts at
   19174" finding.

**New `src/` surface**: `TURN15_HP_DRAIN_START_TICK`/`turn15OnixHp`,
`TURN15_NOTVERYEFFECTIVE_TEXT_START_TICK`, `drawTurn15FlyStrikeWindow`'s own
new text branch. `drawTurn13SwitchinFieldBase` gains an `onixHp` param
(default `TURN12_ONIX_AFTER_AERIALACE_HP`, every pre-existing call site
unaffected) — the same "generalize a hardcoded value into a defaulted
param" idiom every other reused mechanism in this file already uses.

**`turn15-fly-strike.json`**: extended 19141→19308 (stride-1 through
19142-19174, sparse spot-checks at 19200/19250/19300/19308 confirming the
hold stays flat), **218/218, 0 diff**. One new exclusion: **19143/19144**
(hp=2 and hp=1, 2px each) — a tiny HP-bar band-edge rounding residual at
the two lowest nonzero HP values, the same "don't chase a sub-3px
shared-primitive residual" class already established for the 19059-19061
ball-edge gap (§8) — not chased further this session.

**Not reached this session** (still boundary (iii)'s own remaining scope,
ISSUES #36 kept open for it): the transition out of this hold (somewhere
in 19309-19330, where the text presumably clears before the sprite/
healthbox teardown at RAM 19325 and pixel vanish at 19330, §6b/§6c), the
player-side faint sink itself (stat-stage reset, sprite/healthbox erase),
and the "ONIX fainted!" button-gated hold through its own dismiss at
~19990. None of these were probed this session — the next session should
dense-bisect 19308-19330 fresh rather than assume any of §4's original
citations for that span, the same "verify, don't assume" discipline that
already paid off twice in this same window (§8's HP-drain-start
correction, this session's own text-start correction).

Verified: regression sweep 0 diff (`turn14-fly-miss` 185/185,
`turn13-switchin` 240/240, `turn13-menu` 57/57). `npm test` 993/993
(unchanged — no test-literal call sites reference the new optional
`onixHp` param), `npm run build` green.
