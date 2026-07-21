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
