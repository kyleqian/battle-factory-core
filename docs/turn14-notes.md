# Turn 14 ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only): Murkrow's first turn — FLY's charge half, and Onix's DRAGON_BREATH whiffs an airborne target

**Headline**: the brief's own centerpiece mechanism fires immediately —
Murkrow opens with **FLY** (not FAINT_ATTACK), consuming its charge turn.
Onix **survives** this turn unscathed (no forced switch, no new window
class needed this session) because FLY's charge half deals no damage and
Onix's own DRAGON_BREATH auto-misses a semi-invulnerable target. Both
HP totals are unchanged turn-to-turn (4/117, 142/142). `battle-turn-
notes.md` §16's own coarse ledger (line "14 | 17722-18956 | FLY (charge...)
| DRAGON_BREATH (no-op...) | 4→4 | 142→142") is **confirmed accurate on
every HP/PP/turn-order claim**, with one precision refinement: it
describes the turn as costing "no roll... some turn-end bookkeeping" —
this session pins that bookkeeping to **exactly 1 `Random()` call at
tick 18079** (RAM-confirmed), not zero, matching this dossier chain's
established rule that a turn's own tail bookkeeping roll gets counted
against whichever turn's tick-range it physically falls in. Two
source-cited mechanisms newly characterized: (1) two-turn charging
moves print an **empty string** instead of the usual "used MOVE!" line
(`printstring STRINGID_EMPTYSTRING3` in `BattleScriptFirstChargingTurn`,
`battle_scripts_1.s:795`), replaced by a per-move flavor string
("flew up high!") only after the animation; (2) an airborne target's
`STATUS3_ON_AIR` flag makes an attack **auto-miss with zero RNG cost** —
`AccuracyCalcHelper` (`battle_script_commands.c:1061`) short-circuits
before the normal accuracy roll. Both the `STATUS2_MULTIPLETURNS` lock
and `STATUS3_ON_AIR` invulnerability flag are RAM-confirmed to **persist
across the turn boundary**, still set at this trace's final tick
(18956) — the cross-boundary pin the brief asked for.

## 1. Committed trace and prefix-consistency verdict

Extends the committed chain from exactly where `turn13-notes.md` left it
(tick 17722, the settled "What will ONIX do?" menu vs. a freshly
switched-in Murkrow — `turn13-notes.md` §4's own final boundary) with
`battle1-winline-b-swap.json`'s own segments[106:110] (4 segments:
FIGHT-submenu-open `A`, 30f settle, confirm `A` — **no nav press**, since
the FIGHT-submenu cursor persisted at slot 2/DRAGON_BREATH from turn 13
(`turn13-notes.md` §3) — then a single 1200f resolution-idle segment
covering both battlers' entire turn) — **110 segments, 18956 frames
total**.

Committed: **`battle1-turn14-dense.json`** (248 captures): tick 17700
(carried-over settled-menu anchor), 17715-17762 dense stride-1
(submenu-open/confirm buttons), 17763-17834 dense stride-1 (attacker
flip, FLY lock-in, PP-reduce, charge animation, `STATUS2_MULTIPLETURNS`
set, "flew up high!" text), 17835-17929 stride-3 (text-hold,
`STATUS3_ON_AIR` set, target/move flip to Onix's DRAGON_BREATH),
17930-18094 stride-2 (Onix's kickoff text through the miss message and
back to the settled menu), 18095-18956 stride-80 sparse (the long idle
hold). **Twice-run byte-identical** via `bin/oracle run` (two independent
runs, manifests 248/248 diffed, **0 sha mismatches**).

**Flatten-and-compare prefix check** (programmatic, not spot-checked):
flattened this trace's full 110-segment/18956-tick button script and
`battle1-winline-b-swap.json`'s own script to per-tick button state —
**0 diffs** across all 18956 shared ticks.

## 2. RNG-consumption ledger (RAM-truthed, `gRngValue` sampled every tick 17700-18956)

New watch spec `tools/probe/specs/turn14-rng-watch.json` (same column
set as turn10-13's own chain, plus `statuses3_0`/`statuses3_1`
(`gStatuses3`, the semi-invulnerable/charging-state flags — not
`status2`, see §5) and `pp1_1` (Murkrow's FLY-slot PP) to track the
charge-turn's own PP-reduce and the cross-boundary invulnerability
flag). Entering turn 14, `gRngValue` is flat at the value `turn13-
notes.md` §2 left it at (the 15892→17105 flat span plus its own tail
rolls at 17105/17111, both already attributed to turn-14 bookkeeping by
that session) — unchanged through the entire menu-idle carried into this
trace.

| tick | steps | attribution |
|---|---|---|
| 18079 | 1 | **the only `Random()` call in this turn's window** — lands 2 ticks after `gBattleMainFunc` returns to the idle main-loop constant (134463093, the same value every settled-menu tick in this dossier chain reads) and `gCurrentMove` resets 225→0; a turn-pass/AI-bookkeeping step, the same family `turn13-notes.md` §2 found at 17105/17111 (there attributed forward to turn 14; here, by the same tick-range convention, it is turn 14's own tail, counted toward turn 15's upcoming bookkeeping) |

**Total: 1 `Random()` call this turn** — neither battler's own move
consumes any RNG. Murkrow's FLY charge-turn kickoff needs no accuracy
roll (it does not target anything — `BattleScriptFirstChargingTurn` has
no `accuracycheck` call at all, confirmed by reading
`battle_scripts_1.s:1990-1992`: `call BattleScriptFirstChargingTurn` /
`setsemiinvulnerablebit` / `goto BattleScript_MoveEnd`, no accuracy
command in between). Onix's own DRAGON_BREATH also consumes no roll: its
target has `STATUS3_ON_AIR` set, so `AccuracyCalcHelper` forces a miss
**before** the game ever reaches the percentage-based accuracy roll (§5).
This exactly matches — and sharpens — `battle-turn-notes.md` §16's own
claim ("turn 14's charge is essentially free — 1 step, some turn-end
bookkeeping"): the "1 step" is real and now pinned to tick 18079, not an
approximation.

## 3. Turn order, battler stats, PP (RAM-confirmed)

`gBattlerAttacker` flips 0→1 at tick 17760 (**Murkrow acts first** —
Speed 97 vs. Onix's 76, the same unconditional margin `battle-turn-
notes.md` §16 already established), `gCurrentMove`→**19 (FLY)**. Murkrow's
own FLY-slot PP (`gBattleMons+0x58+0x24+1`) drops **15→14** at tick
**17770** — notably *before* the charge animation plays (`ppreduce` runs
ahead of `attackanimation` in `BattleScriptFirstChargingTurn`, source-
confirmed). At tick 17919 `gBattlerTarget`→1 (Onix targets Murkrow); at
17921 `gCurrentMove`→**225 (DRAGON_BREATH)**, `gBattlerAttacker`→0
(Onix). `dump-battler-full.py` snapshots (ticks 17700/18900):

| | ONIX (battler0) | MURKROW (battler1) |
|---|---|---|
| PP entering turn 14 | ROCK_SLIDE 0/10, BIND 19/20, DRAGON_BREATH **18/20**, SANDSTORM 10/20 | FAINT_ATTACK 20/20, FLY **15/15**, TORMENT 15/15, TAUNT 20/20 |
| PP after turn 14 | DRAGON_BREATH **17/20 (used, missed — PP still spent)**, rest unchanged | FLY **14/15 (used)**, rest unchanged |
| HP before → after | 4/117 (**unchanged**) | 142/142 (**unchanged**) |
| stat stages | ATK floor unchanged (0/-6, 7th consecutive turn); accuracy stage still 5/-1 (SAND_ATTACK, carried from turn 13) | all neutral (6/6/6/6/6/6/6/6) |
| status2 / status3 | 0 / 0 (no charging state — Onix's own move is a normal one-turn move) | **status2 = 4096 (`STATUS2_MULTIPLETURNS`, set 17820)**; **status3 = 64 (`STATUS3_ON_AIR`, set 17913)** — both still set at the trace's final tick 18956 |

PP still decrements on a miss (Onix's DRAGON_BREATH 18→17 despite dealing
no damage) — ordinary `ppreduce` behavior, not a new finding, but the
first time this dossier chain has pinned a **miss-that-still-costs-PP**
against an explicitly-verified accuracy-bypass case rather than an
ordinary probabilistic miss.

## 4. Pixel/window boundaries (sha256-cited, 12 hex chars, twice-run identical)

| boundary | tick | sha256 (12) | note |
|---|---|---|---|
| turn-14 menu settled (carried from `turn13-dense-b`) | 17700 | `5e6a26f6f342` | **exact match** to `turn13-notes.md` §4's own cited settled-menu-vs-MURKROW sha at this identical tick — tick-numbering continuity re-confirmed |
| FIGHT submenu open (all 4 moves shown, DRAGON_BREATH's row highlighted, PP still 18/20) | 17722-17762 | `e499f3e772c6` (17722-17724) → `b59426c5112c` (17753-17754) | **PNG-confirmed**: cursor sits on DRAGON_BREATH with no `DOWN` press needed — direct visual confirmation the submenu cursor persisted from turn 13 (`turn13-notes.md` §3) |
| confirm-press transient, submenu still shown | 17755-17768 | `a0f37a67c387`→`915bba8774b7` | held through `gBattlerAttacker`→1 and `gCurrentMove`→19 (FLY) at 17760-17761, i.e. RAM already knows the move well before the pixel clears — the same "RAM commits ahead of the pixel" shape every prior turn in this chain shows |
| submenu clears to bare battle scene (no box) | 17769-~17789 | `5e5283bf92c2` | **sha-identical to a frame inside `turn13-notes.md`'s own cited "settled menu" range** (re-verified directly this session: tick 17150 of the committed `battle1-turn13-dense-b.json` independently reproduces this exact sha) — not a coincidence-worth-flagging, just confirmation that "battle scene, no UI box, both sprites idle" is a single fixed, reproducible framebuffer state this dossier chain keeps re-deriving |
| Murkrow's sprite squash/stretch (flying-up animation) | ~17790-17804 | `a84142e0d0da` → `225a286c4c26` | **PNG-confirmed**: sprite compresses into a tall thin blob, then vanishes entirely by 17805 |
| Murkrow's sprite off-screen, message box still empty | 17805-17820 | `6db0757608e7` | `status2_1` (`STATUS2_MULTIPLETURNS`) sets to 4096 at 17820, 1 tick before text starts (§5) |
| "Foe MURKROW flew\nup high!" typing in | 17825-~17838 | `b29f811a79ff` → `2652233755cd` → `578ae55e1f0c` | **PNG-read, letter-by-letter**: "Foe" (17825) → "Foe MURK" (17830) → full text by ~17838 |
| "Foe MURKROW flew\nup high!" held | ~17840-17912 | `e21b18f66672` | **PNG-confirmed** full text (tick 17870 zoomed-read); `statuses3_1` (`STATUS3_ON_AIR`) sets to 64 at tick **17913**, i.e. right at the end of this hold, after the message finished |
| transition into "ONIX used\nDRAGONBREATH!" | ~17921-17930 | `8e45f1d22feb` | **PNG-read**, `gCurrentMove`→225, `gBattlerAttacker`→0 lands 1-2 ticks before text begins |
| "ONIX used\nDRAGONBREATH!" held (no animation plays — target invulnerable) | 17930-~17998 | `1f3c3523520d` (17950) → `ad5ee5aa59cc` (18000) | no fire-projectile/shake anim this turn (contrast turn 13's `dragon-breath-notes.md`-family geometry) — accuracy fails before any animation stage is reached |
| "ONIX's\nattack missed!" | ~18000-18077 | `19b7891a40bf` | **PNG-read directly**, full text confirmed at tick 18010 and still held at 18070-18076 |
| message box clears, menu box reappears | 18077-18086 | `6db0757608e7` (18080-18084, same sha as the pre-text bare-scene frame at 17805-17820) → `ffc7639da02c` (18086) | `gBattle_BG0_Y` flips 0→160 at 18085 (menu-box slide-in), matching the transition tick exactly |
| settled "What will ONIX do?" vs. MURKROW (Murkrow's sprite still invisible — semi-invulnerable, carried across the turn boundary) | 18086-18956 | `ffc7639da02c` | **PNG-confirmed**: healthbox shown top-left, DRAGON_BREATH's own row would now read 17/20 if the submenu were reopened; Murkrow's front sprite is genuinely absent from the frame (not just off the currently-cropped region) — direct visual confirmation `STATUS3_ON_AIR` has a real rendering consequence, not just a battle-logic flag |

## 5. New mechanisms this turn (source-cited against `reference/pokeemerald`, read-only — no engine/`src/` changes)

**(a) Two-turn charging moves print an empty first-turn string, not
"used MOVE!".** `BattleScriptFirstChargingTurn` (`battle_scripts_1.s:795`):
`printstring STRINGID_EMPTYSTRING3` (an empty string) runs *before*
`ppreduce`/`attackanimation`, and the per-move flavor line
(`gFirstTurnOfTwoStringIds[B_MSG_TURN1_FLY] = STRINGID_PKMNFLEWHIGH`,
`battle_message.c:1024-1032`) prints only *after* the animation
completes. RAM-confirmed: no message box appears at all between the
confirm-press (17755) and the animation's start (~17790) — the "used
FLY!" line genuinely never renders, matching the source exactly. This
generalizes to RAZOR WIND / SOLAR BEAM / SKULL BASH / SKY ATTACK / DIG /
DIVE / BOUNCE — the same table, same mechanism, different flavor string
per move.

**(b) An airborne (`STATUS3_ON_AIR`) target auto-misses incoming attacks
with zero RNG cost.** `AccuracyCalcHelper` (`battle_script_commands.c:
1061-1067`): `if (!(gHitMarker & HITMARKER_IGNORE_ON_AIR) &&
gStatuses3[gBattlerTarget] & STATUS3_ON_AIR) { gMoveResultFlags |=
MOVE_RESULT_MISSED; ...; return TRUE; }` — this check runs and returns
**before** `Cmd_accuracycheck` ever reaches its percentage-roll branch.
DRAGON_BREATH does not clear `HITMARKER_IGNORE_ON_AIR` (that clear is
move-specific, reserved for Gust/Twister/similar in this codebase), so
the miss is unconditional. RAM-confirmed directly: `gRngValue` does not
change anywhere in the 17921-18077 window (Onix's entire move
resolution). This is the same accuracy-bypass *family* as FAINT_ATTACK's
`EFFECT_ALWAYS_HIT` (`battle-turn-notes.md` §16, no roll either) but the
opposite outcome — guaranteed miss instead of guaranteed hit, same
"no roll" signature either way.

**(c) The charging state is two separate flags, not one, and both
survive the turn boundary.** `STATUS2_MULTIPLETURNS` (`status2`, bit 12,
set by `seteffectprimary` after `MOVE_EFFECT_CHARGING` is queued — this
is what would make the engine skip re-prompting Murkrow for a move next
turn) sets at tick 17820, **before** the flavor text even prints.
`STATUS3_ON_AIR` (`status3`, bit 6, set by `Cmd_setsemiinvulnerablebit`,
`battle_script_commands.c:9009-9021`, called from
`BattleScript_FirstTurnSemiInvulnerable` right after `waitmessage`) sets
later, at tick 17913 — **after** the text finishes. Both are still
`4096`/`64` respectively at this trace's final RAM read (tick 18900) and
final captured tick (18956): the cross-turn-boundary pin the brief asked
for. Practically: `STATUS2_MULTIPLETURNS` is what will force Murkrow
into FLY's strike half next turn without a menu (a mechanism, not yet
observed — out of scope, turn 15); `STATUS3_ON_AIR` is what made this
turn's DRAGON_BREATH whiff and is also why Murkrow's front sprite stays
off-screen through the settled menu at the end of this trace.

**No forced-switch window this turn.** The brief flagged "does Murkrow's
move KO Onix (forced PLAYER switch, a new window class) or does Onix
survive" as the open question — resolved: **Onix survives**, HP
unchanged (4/117), no switch prompt, no new window class needed this
session. `battle-turn-notes.md` §16 already previews (line 2160) that
the forced switch to MAGBY happens turn **15** (Murkrow's FLY *strike*
half hits unconditionally, per that section's own already-verified
2-turn continuation) — turn 15 is out of this session's scope per the
brief, so that window remains for a future session to dossier densely.

## Verification

`npm test` and `npm run build` green (no `src/` changes this session —
new artifacts are `tools/compare/traces-groundtruth/battle1-turn14-
dense.json`, `tools/probe/specs/turn14-rng-watch.json`, this doc, and the
traces-groundtruth README paragraph). New trace twice-run via `bin/oracle
run`, manifests (248/248) diffed byte-identical across two independent
runs, 0 sha mismatches. Prefix-consistency checked programmatically
against `battle1-winline-b-swap.json`'s own full 156-segment script (0
diffs across all 18956 shared ticks). RAM probes (`ram-probe.py` with the
new watch spec, run twice across two spec revisions and cross-checked —
the second run's added columns are a strict superset, all shared columns
identical; `dump-battler-full.py`, unmodified) each cross-checked
internally (RNG steps recomputed from raw `gRngValue` deltas; PP/HP/
status deltas cross-checked against the `dump-battler-full.py` snapshots
at ticks 17700/18900). Every sha256 cited in §4 was read directly from
this session's own committed trace's first-run manifest at exactly the
cited tick, except the one explicitly-flagged cross-check against
`battle1-turn13-dense-b.json`'s own tick 17150 (independently re-run this
session to confirm the sha match, not assumed). Every PNG text claim
(§3-§5) was read directly from a rendered frame, not inferred from RAM
alone. Source citations in §5 are read-only references into
`reference/pokeemerald` (`battle_scripts_1.s`, `battle_script_commands.c`,
`battle_message.c`) used to explain RAM-observed behavior — no `src/`
files were touched.

**PAPERCUT**: none of significant note. `dump-battler-full.py`'s offset
convention (`gBattleMons + battler*0x58 + fieldOffset`) isn't itself
documented as a reusable formula outside the script's own source — this
session had to re-derive `pp1_1`'s address (`gBattleMons+0x7D`) by reading
the script's own `read_battler` body rather than finding it in a spec
file; a short doc-comment there listing the per-field offsets (species
+0x00, pp +0x24, hp +0x28, status1 +0x4C, status2 +0x50, per-battler
stride 0x58) would save a few minutes for whoever next needs a
one-off RAM address the existing watch-spec columns don't already cover
(this dossier chain's own `turnN-rng-watch.json` files only expose a
fixed column subset).
