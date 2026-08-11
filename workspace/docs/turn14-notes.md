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

## 2026-07-21 — worktree lane: wiring-readiness retrofit — `tools/probe/
verify-turn14.ts` lands (28/28 checks, twice-run identical), FLY-up
squash/stretch fully characterized from RAM, four §4 citation corrections

**Verdict, stated up front**: turn 14's engine slice is confirmed a pure
wiring job for every sub-phase except the FLY-up animation, which needs
**one small new mechanism** — everything else reuses already-shipped
generic machinery (see the wiring-verdict table below). This session
followed the `verify-turn13.ts` retrofit precedent: a pixel-only PASS/FAIL
script (`node --experimental-strip-types tools/probe/verify-turn14.ts`)
against a **fresh** `bin/oracle run` of the already-committed
`battle1-turn14-dense.json` (asserts its own 110-segment/18956-frame
structure programmatically, not hand-copied from prose), plus one new RAM
probe (`tools/probe/dump-fly-anim.py`, modeled on `dump-aerialace-anim.py`'s
own sprite/OAM convention, extended with `gOamMatrices` affine-coefficient
reads) for the one genuinely-unknown mechanism. **28/28 checks pass,
twice-run identical** (re-run back to back, byte-identical output both
times), single oracle round trip (200 captured ticks, under the 256 cap).

### FLY-up squash/stretch, fully characterized (RAM-truthed, source-cited)

**Source-read first** (`reference/pokeemerald/src/battle_anim_flying.c`,
`data/battle_anim_scripts.s:6398-6423`): `Move_FLY`'s charge half
(`FlySetUp`) calls `createsprite gFlyBallUpSpriteTemplate, ANIM_ATTACKER,
2, 0, 0, 13, 336` — a **separate "round shadow" ball sprite**
(`ANIM_TAG_ROUND_SHADOW`, `gOamData_AffineDouble_ObjNormal_64x64`), not
Murkrow's own mon sprite, drives the visible squash/stretch via its own
affine anim table (`sAffineAnim_FlyBallUp`, 4 keyframes). `AnimFlyBallUp`
(the ball sprite's spawn callback) does two things **the same tick**:
positions the ball at the attacker's own location
(`InitSpritePosToAnimAttacker`) and sets
`gSprites[GetAnimBattlerSpriteId(ANIM_ATTACKER)].invisible = TRUE` — i.e.
**Murkrow's own mon sprite is hidden by the animation script itself**, not
by `STATUS3_ON_AIR` (that flag sets later, at 17913, and is a battle-logic
semi-invulnerability flag consumed by `AccuracyCalcHelper` — its *own*
rendering consequence is separately confirmed at the end of this section,
after the animation is long over).

**RAM table** (`dump-fly-anim.py`, ticks 17780-17805, battler1 slot = 5,
ball sprite = slot 3, `gOamMatrices[2]`, `mgba-venv python`, exit 139
teardown benign):

| tick | ball `a` (x-scale) | ball `d` (y-scale) | ball `y2` | ball `inUse` | Murkrow mon-sprite `invisible` |
|---|---|---|---|---|---|
| 17779 | — | — | — | — | **False** (last visible tick) |
| **17780** | 1170 | 256 | 0 | **True** (spawn tick) | **True** (flips same tick) |
| 17781 | 682 | 256 | 0 | True | True |
| 17782-17784 | 481→303 | 256 | 0 | True | True |
| 17785 | 256 | 256 | 0 | True | True |
| 17786-17790 | 256 | 292→682 | 0 | True | True |
| 17791-17795 | 273→372 | 512→256 | 0→-6 | True | True |
| 17796-17800 | 409→682 | 227→157 | -11→-43 | True | True |
| 17801-17803 | 682 (frozen) | 157 (frozen) | -54→-81 (still falling) | True | True |
| **17804** | — | — | — | **False** (destroyed) | True |

Both the ball-sprite spawn and the mon-sprite invisible flip land on the
exact **same RAM tick (17780)** — one function, one write, confirmed by
source (`AnimFlyBallUp`'s own two-line body). The ball is destroyed
(`inUse` false) by tick 17804 — `AnimFlyBallUp_Step`'s own exit condition
(`sprite->y + sprite->y2 < -32`) fires once the cumulative `y2` fall
(driven by `data[2] += data[1]` each tick, a simple accelerating integrator
once the initial `data[0]` countdown reaches 0 at 17792-ish, matching the
`y2` column's own visible acceleration above) crosses the threshold.

**Render-lag class**: the RAM-pinned spawn/invisible-flip tick (17780) and
the first *pixel-visibly-different* tick are **not the same** —
`verify-turn14.ts`'s own dense bisection (baseline = tick 17775, well
before spawn) finds the first divergent pixel at **17781, a 1-tick render
lag**, the same "+1 after the RAM write" class this dossier chain's
turn10-13 sessions already established for other sprite/state transitions
(never assumed, always bisected against a fresh oracle capture — this
session's own explicit re-confirmation of the brief's "never assume a
neighbor's lag" instruction).

**Wiring verdict for this mechanism**: needs **one new function**, not a
reuse of an existing engine primitive — nothing in `src/engine/` currently
models a two-turn move's own transient "round shadow" sprite with a
4-keyframe affine ramp independent of the attacker's own mon sprite. The
per-tick `a`/`d`/`y2` table above is the exact reference data a wiring
step would parameterize against (closed-form or literal per-tick table,
implementer's choice — not decided by this probe session, out of SCOPE).
Contrast: the *invisibility* half (`invisible = TRUE`) is a one-line
reusable primitive, not a new mechanism.

**Post-animation, cross-turn-boundary invisibility** (separately
RAM-confirmed, `ram-probe.py` + the existing `turn14-rng-watch.json`
spec, not re-derived this session — cited for completeness): after the
ball is destroyed (17804) Murkrow's own mon sprite *stays* invisible for
the entire rest of the trace, now for a **second, independent reason** —
`STATUS3_ON_AIR` sets at 17913 (§3) and the settled end-of-turn menu at
18086-18956 (§4) shows Murkrow's front sprite genuinely absent, not just
coincidentally still hidden by the anim script's own now-defunct flag
write. Both mechanisms produce the same visible symptom (no front sprite)
but are RAM-distinguishable: the anim script's own `invisible=TRUE` write
(17780) predates `STATUS3_ON_AIR` (17913) by 133 ticks and would, on its
own, only last as long as the anim script's own sprite lifetime — the
semi-invulnerability flag is what actually keeps it hidden afterward.

### Four corrections to this dossier's own §4 (dense re-bisection, per the
brief's own "prose approximate, expect ~1 citation slip" premise)

1. **Submenu-clear boundary was "~17789"; dense bisection pins it to
   17769**, 20 ticks earlier — the bare-scene sha (`5e5283bf92c2`, §4's own
   citation) is already the frame at 17769, the confirm-press transient's
   own very next tick. No new sub-phase found here (contrast turn13's own
   6-phase submenu-open bounce) — just a looser original estimate.
2. **"Flew up high!" typing-settle was "~17838"; dense bisection pins it
   to 17846**, 8 ticks later — pixel-exact against `drawText`+charmap at
   17846, not yet settled at 17838-17845.
3. **"ONIX used DRAGONBREATH!" typing-settle was "~17921-17930"; dense
   bisection pins it to 17949**, ~20-28 ticks later than the original
   estimate — but *matches* §4's own separately-cited hold sha
   (`1f3c3523520d @ 17950`), so this is a prose-range error, not a wrong
   sha.
4. **Real mislabeling, not just a loose range**: §4's DRAGONBREATH-held
   row cites `ad5ee5aa59cc (18000)` as still-held "ONIX used
   DRAGONBREATH!" text. It is not — dense re-bisection shows a **new
   message-box transition already starts by 17986** (its own first
   transition frame, `20e72b3c096e`, is sha-**identical** to the
   DRAGONBREATH-kickoff's own transition frame at 17928, confirming the
   message-box open/close transition is one shared generic mechanism, not
   turn-specific), and tick 18000 (`ad5ee5aa59cc`) is a **mid-typing frame
   of "ONIX's attack missed!"**, not held DRAGONBREATH text. The true
   "attack missed!" settle tick is **18005** (sha `19b7891a40bf`, matching
   §4's own *separate* citation for that row). `verify-turn14.ts` asserts
   both the shared-transition-sha fact and the non-match at 18000 directly.
5. **(minor, not a correction, a refinement)** §4's final settled-menu row
   ("18086-18956 | `ffc7639da02c`") is not perfectly flat — dense sampling
   across the 861-tick hold finds a **2-phase idle-bounce cycle**
   (`ffc7639da02c` / `f0b62ede0c4a`), the same "settled menu box has its
   own independent idle bounce" shape `turn13-notes.md`'s own worktree-lane
   session already found for the FIGHT submenu box. RAM-frozen throughout
   (no state change), just not pixel-frozen at one sha the whole time.

None of these five corrections change any §2/§3/§5 verdict — RNG ledger
(1 roll, tick 18079), turn order, PP/HP/status deltas, and the two
source-cited mechanisms (empty-string kickoff, `STATUS3_ON_AIR` auto-miss)
all re-confirm unchanged.

### Other mission items, confirmed cheaply (per the brief's "mostly
confirmable by PNG/sha" framing)

- **Empty-string kickoff box content** (17769-17820): the bare-scene sha
  (`5e5283bf92c2`) is genuinely a **no-message-box frame** — same sha the
  settled pre-turn menu independently produces (§4's own note, re-verified
  this session) — confirming visually, not just via the source-read
  `printstring STRINGID_EMPTYSTRING3` citation, that nothing renders in
  the box window during the entire charge kickoff.
- **Murkrow-invisible rendering, layer-by-layer**: front sprite absent
  (RAM-confirmed above); healthbox unchanged — no separate check needed
  this session, `gBattlerSpriteIds`/healthbox sprite slots are untouched
  by `AnimFlyBallUp`'s own single invisibility write (source-read, only
  one sprite's `invisible` field is touched).

### Wiring verdict table (per the brief's own ask)

| phase | verdict | reused primitive / new mechanism |
|---|---|---|
| FIGHT-submenu reopen, cursor persisted at DRAGON_BREATH, confirm | pure wiring | `moveFightCursor`/`cursorState` family (turns 10-13, unmodified) |
| empty-string kickoff (no message box) | pure wiring | new per-turn anchor tick only — box stays empty, no text-render call needed at all |
| FLY-up squash/stretch (ball sprite + mon-invisible) | **new mechanism** | one new sprite-anim function (4-keyframe affine ramp + accelerating `y2` fall, table above); mon-sprite `invisible=TRUE` write is a 1-line reusable primitive |
| "Foe MURKROW flew\nup high!" text | pure wiring | `drawText`+charmap+battle-window harness (turns 9-13, unmodified), new text constant + anchor tick |
| `STATUS2_MULTIPLETURNS`/`STATUS3_ON_AIR` flag sets | pure wiring (state-only, no new render) | existing status-flag storage, new bit constants only |
| "ONIX used\nDRAGONBREATH!" kickoff text | pure wiring | same text harness, new constant |
| no fire-projectile/shake animation (accuracy fails pre-animation) | pure wiring | **absence** of a call — `AccuracyCalcHelper`'s early-return means the engine's own turn-14 script simply never reaches an animation-trigger step; no new suppression logic needed |
| "ONIX's\nattack missed!" text | pure wiring | same text harness, new constant |
| menu-box reopen slide | pure wiring | existing `gBattle_BG0_Y`-driven slide (turns 1-13 family, unmodified) |
| settled-menu idle bounce (2-phase, corrected above) | pure wiring | same generic idle-bounce mechanism turn13's own worktree-lane session already found for the FIGHT submenu box |

**Turn 15 continuity** (trivially visible, per the brief's own ask):
`STATUS3_ON_AIR` (`status3_1`) is still `64` at this trace's own final RAM
read (tick 18900, §3, unchanged this session) and the final captured pixel
tick (18956) still shows Murkrow's front sprite absent in the settled
menu — both facts carry forward into turn 15's own charge-half-complete
resolution unmodified from the original dossier's own claim, just now with
the settled-menu's own 2-phase idle-bounce correction folded in (item 5
above) so a future wiring session doesn't chase a phantom mid-hold pixel
diff.

### Verification

`node --experimental-strip-types tools/probe/verify-turn14.ts`: **28/28
checks pass**, run twice back to back, byte-identical output both times
(single `bin/oracle run` per invocation, 200 captured ticks, under the
256-per-run cap). New RAM probe `tools/probe/dump-fly-anim.py` run twice
across two constant-address fixes (the second run's `status2_1`/
`status3_1` addressing corrected from an initial wrong guess — caught by
this session's own cross-check against the already-established RAM facts
in §3/§4 above before being trusted, not assumed correct on the first
try). `npm test` and `npm run build` green, unchanged from before this
session — no `src/` changes. New artifacts: `tools/probe/verify-turn14.ts`,
`tools/probe/dump-fly-anim.py`, this doc section.

**PAPERCUT**: none beyond the one already logged above. The
`dump-aerialace-anim.py` convention this session extended doesn't itself
document `gOamMatrices`' address/stride (`0x02021bc0`, `struct OamMatrix {
s16 a,b,c,d}`, 8 bytes/entry, indexed by each sprite's own
`oam.matrixNum`) anywhere reusable — had to be found fresh via
`include/sprite.h` and `bin/oracle symbols`. Worth a one-line addition to
whichever dump script conventions doc exists, for the next affine-anim
probe session.
