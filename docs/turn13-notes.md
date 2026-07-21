# Turn 13 ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only): Pidgeotto's FAINT via DRAGON_BREATH + MURKROW's switch-in

**Headline**: the brief's own predicted premise (`turn12-notes.md` §6's light, unverified scan) holds up under
dense RAM+pixel probing, with one correction and one genuinely new
finding. Correction: the brief called turn 13's DRAGON_BREATH trajectory
"mirrored" relative to turn 2's — **it isn't**. New finding: Onix's
FIGHT-submenu cursor performs a **double decrement** on a single DOWN
press this turn, landing directly on DRAGON_BREATH (slot 2) instead of
BIND (slot 1) — `turn12-notes.md` §6 flagged this as an unchased oddity;
this session pins it precisely (still not root-caused to a specific
source line, but fully characterized and shown to be *load-bearing* for
the winline, not cosmetic noise). The REUSE MAP (§7) is the centerpiece
the brief asked for: every mechanism in Pidgeotto's faint and Murkrow's
switch-in reuses `docs/faint-switch-notes.md`'s turn-5 machinery
**verbatim**, with new anchor ticks and (for two mechanisms) new
species-derived parameters — nothing structurally new, nothing
unexplained, this turn.

## 1. Committed traces and prefix-consistency verdict

Extends `tools/compare/traces-groundtruth/battle1-turn12-dense.json`
(100 segments, 15374 frames) with `battle1-winline-b-swap.json`'s own
segments[98:106] (8 segments: FIGHT-submenu-open `A`, 30f settle, one
`DOWN` nav press, 10f settle, confirm `A`, 1400f resolution-idle, the
**button-gated KO-dismiss `A` press** at segment 104, then 900f
post-switch-in idle) — 108 segments, 17722 frames total. **Full
per-frame equality check**: flattened the combined 108-segment button
script and `battle1-winline-b-swap.json`'s own full 156 segments to
per-tick button state for all 17722 shared ticks — **0 diffs**
(`combined == wl[:17722]`, checked programmatically). This is exactly
the span `turn12-notes.md` §6 itself named as the natural next target
("segments[98:106]... not segments[94:98]").

Two new committed traces (split on the 256-capture cap, overlapping at
the KO-gate boundary per the brief):

- **`battle1-turn13-dense-a.json`** (256 captures): ticks 15374-15435
  (menu-settled → submenu-open → DOWN-nav → confirm, dense stride-1),
  15460/15550/15650 (sparse SAND_ATTACK-hold samples), 15690-15795
  (dense: DRAGON_BREATH targeting/kickoff/text/projectiles/shake, stride-1),
  15855-15900 (dense: HP-drain-to-faint-commit), 15955-15980 (dense:
  fainted-message settle + faint-sink window), 16300/16600/16800 (sparse
  KO-hold samples), 16815-16824 (dense: the gated-press boundary).
- **`battle1-turn13-dense-b.json`** (223 captures): ticks 16815-16824
  (overlap with `-a`, the gated press), 16920-17075 (dense stride-1:
  post-press bookkeeping, species-flip, sent-out text, ball, particles,
  materialize), 17075-17130 (dense: healthbox slide-in + settle),
  17150/17200 (sparse settled-menu-vs-MURKROW samples).

Both **twice-run byte-identical**: `bin/oracle run`, two independent
runs each, manifests (256/256 and 223/223) diffed identical, **0 sha
mismatches** in either file.

## 2. RNG-consumption ledger (RAM-truthed, `gRngValue` sampled every tick 15374-17722)

New watch spec `tools/probe/specs/turn13-rng-watch.json` (identical
column set to turn10/11/12's own, plus `species1`/`partyIdx1` to catch
the switch). Entering turn 13, `gRngValue` is flat at the value
`turn12-notes.md` §3 left it at (unchanged — zero rolls consumed by the
turn-12 menu idle, same rule every prior turn confirmed).

| tick | steps | attribution |
|---|---|---|
| 15430 | 1 | Pidgeotto's **SAND_ATTACK** accuracy-family roll (5 ticks after `gCurrentMove`→28 at 15425 — same "+5" offset this dossier chain established for every move's own accuracy-family roll) — no unattributed step follows (SAND_ATTACK deals no damage, matching the established rule: the "unattributed step" only recurs when the turn's *first* move is damaging — turns 9/10/12 positive, turns 11/13 negative) |
| 15706 | 1 | Onix's **DRAGON_BREATH accuracy roll** — 5 ticks after `gCurrentMove`→225 (15701), the same offset family |
| 15732 | 1 | **crit roll** — **26 ticks** after the accuracy roll, bit-exact to turn 2's own accuracy→crit gap (`dragon-breath-notes.md`: 3135→3161, also 26) |
| 15733 | — | `gBattleMoveDamage` locks to 18 (pre-STAB/type), 1 tick after the crit roll — same offset as turn 2 (3161→3162) |
| 15735 | 1 | **damage-spread roll**; `gBattleMoveDamage` locks to **17**, 2 ticks after the initial lock — same offset as turn 2 (3162→3164) |
| 15892 | 1 | **secondary-effect (30% paralysis) roll** — does **not** proc (Pidgeotto has already fainted; `status1_1`/`status2_1` read 0 throughout). Offset from the spread roll is **157 ticks**, not turn 2's 154 — the extra 3 ticks are fully accounted for by the longer HP-bar drain this turn (Pidgeotto drains 16 HP-units vs. Grovyle's 13 in turn 2, +3 bar-fill ticks at the established "1 unit/tick" rate) |
| 17105 | 1 | turn-pass bookkeeping (`BattleTurnPassed`-family) |
| 17111 | 1 | a single post-switch AI/tie-break step — **not** the usual 2+5=7-step `ShouldSwitch`+tie-break cluster turns 9-12 saw for a *contested* switch decision; consistent with there being only **one** surviving candidate (Murkrow) this time, so the AI has nothing to compare |

**Total: 5 rolls attributable to turn 13's own move resolution + faint**
(SAND_ATTACK acc, DRAGON_BREATH acc/crit/spread/secondary), plus 2 more
at the very tail (17105, 17111) that belong to turn-14 bookkeeping, not
turn 13 itself. `gRngValue` is flat 15892→17105 (the entire faint +
KO-hold + switch-in + materialize + healthbox-slide window) — **zero
`Random()` calls anywhere in the switch-in sequence itself**, matching
`faint-switch-notes.md`'s own turn-5 finding that the cosmetic
faint/switch machinery is RNG-free.

## 3. Turn order, battler stats, PP, and the cursor-jump finding (RAM-confirmed)

`gBattlerAttacker` flips 0→1 at tick 15424 (Pidgeotto acts first, same
1-point Speed margin every prior turn established), `gCurrentMove`
reads **28 (SAND_ATTACK)**. At 15699 `gBattlerTarget`→1 (Onix targets
Pidgeotto); at 15701 `gCurrentMove`→**225 (DRAGON_BREATH)**,
`gBattlerAttacker`→0 (Onix). `dump-battler-full.py` snapshots (ticks
15374/16000/17150):

| | ONIX (battler0) | PIDGEOTTO / MURKROW (battler1) |
|---|---|---|
| PP entering turn 13 | ROCK_SLIDE **0/10 (exhausted, confirmed)**, BIND 19/20, DRAGON_BREATH 19/20, SANDSTORM 10/20 | AERIAL_ACE 18/20, QUICK_ATTACK 29/30, FEATHER_DANCE 11/15, SAND_ATTACK 15/15 |
| PP after turn 13 | DRAGON_BREATH **18/20 (used)**, rest unchanged | SAND_ATTACK **14/15 (used)** |
| HP before → after | 4/117 (unchanged — Onix untouched this turn) | 16 → **0 (FAINTED)**, then **MURKROW switches in at 142/142** |
| stat stages | ATK floor unchanged (0/-6, 6th consecutive turn); statStages[6] (accuracy) drops **6→5** at tick 16000 — SAND_ATTACK's own accuracy-drop landing on Onix, RAM-confirmed | unchanged (all neutral) |

**The cursor-jump, pinned**: `gMoveSelectionCursor+0` reads **0** through
tick 15406 (persisted on ROCK_SLIDE, unchanged since turn 9 — direct
confirmation that a 0-PP move can sit under the cursor with **no
auto-skip**, answering the brief's own "does 0-PP interact with
selection" question: **no**, the UI never prevents resting on an
exhausted move). After the single scripted `DOWN` press (ticks
15406-15408), the cursor reads **2** (DRAGON_BREATH), not 1 (BIND) —
RAM-confirmed at every sampled tick (no intermediate tick reads 1).
PNG-confirmed at tick 15374-15420 the FIGHT submenu shows all four moves
with DRAGON_BREATH's own row highlighted at 19/20 PP once the press
lands. **[ROOT-CAUSED AT THE FOLD, supervisor 2026-07-20]** This is not
a "double decrement" — the FIGHT submenu is a **2×2 grid** (0=top-left
ROCK SLIDE, 1=top-right BIND, 2=bottom-left DRAGONBREATH,
3=bottom-right SANDSTORM): `DOWN` moves one ROW (+2), `RIGHT` moves one
COLUMN (+1). Turn 8's own dossier already exercised the +1 case (one
`RIGHT` press, cursor 0→1 to BIND); this is the +2 row move, exactly
as the on-screen layout shows (the engine's own fight-submenu cursor already implements this grid —
`battleMenu.ts:981`'s `cursor ^ 2` row toggle for UP/DOWN). Nothing is unresolved; the winline simply needs
the bottom-left move this turn (ROCK_SLIDE PP-exhausted, BIND's
"actually hits" — Test 2 — still unexercised).

### Damage and effectiveness (PNG-confirmed)

DRAGON (DRAGON_BREATH) vs. Pidgeotto's NORMAL/FLYING typing: **neutral**
(no chart entry either direction, same as turn 2's DRAGON-vs-GRASS
neutral hit) — PNG-confirmed **no type-effectiveness message prints**;
the screen holds "ONIX used\nDRAGONBREATH!" (PNG-read, tick 15720)
straight through the HP-drain and into the fainted transition, the same
"whole animation plays under one held message" rule this dossier chain
always finds. `gBattleMoveDamage` locks to **17** (§2); Pidgeotto's HP
bar is visually empty by tick **15887** (PNG-confirmed, zoomed crop —
a thin red sliver still present at 15855, fully drained white/hollow by
15887), the **same tick** `hp1` commits 16→0 in RAM — bar-finish and
RAM-commit land on the identical tick this time (not the usual 1-tick
lag; a small, unremarkable variance already seen elsewhere in this
dossier chain depending on exact drain-length parity).

## 4. Pixel/window boundaries (sha256-cited, 12 hex chars, both new traces, twice-run identical)

| boundary | tick | sha256 (12) | note |
|---|---|---|---|
| turn-13 menu settled (carried from `turn12-dense`) | 15374 | `5646ba2c6ca9` | matches `turn12-notes.md`'s own cited idle-cycle sha at this exact tick — tick-numbering continuity confirmed |
| submenu open, DOWN nav, confirm (all within one static plateau) | 15376-15420 | `882e3c818195` / `7585463c4ba2` / `55f04a5701aa` / `7922d883bcb6` | cursor reads 2 (DRAGON_BREATH) after the nav press (§3); confirm lands at 15419-15420 |
| confirm-press transient, submenu STILL fully shown (a longer hold than turns 9-12's ~1-tick clear) | 15421-~15430 | `7922d883bcb6` (steady through 15421) | `gCurrentMove`→28 (SAND_ATTACK) already updates in RAM at 15425, well before the pixel clears |
| transition into "Foe PIDGEOTTO used\nSAND-ATTACK" | ~15431-15435 | (letter-by-letter) | **PNG-read**, tick 15435 mid-typing |
| SAND_ATTACK message held | 15460-15690 | `73709be10f05` (representative sample) | Onix's own accuracy stage drops 6→5 silently under this hold (§3) |
| transition into "ONIX used\nDRAGONBREATH!" | ~15701-15720 | (letter-by-letter) | **PNG-read**, tick 15720 mid-typing ("ONIX used / DRAG"); full text confirmed by 15757 |
| DRAGON_BREATH kickoff text held through targeting/accuracy/crit/spread rolls and the shake/projectile launch | 15699-15744 | `19fb94d8802c` → `c35307432880` | `gBattleAnimTarget` flips to Pidgeotto (own x/y (176,51), paletteNum 1) at 15738, 1-2 ticks before the first fire-projectile spawns |
| fire-projectile + shake animation | 15745-~15793 | (per-tick, dense) | **PNG-confirmed** red-tinted Pidgeotto with visible fire streak at 15757; see §5 for the full geometry table |
| HP-drain (Pidgeotto) | ~15870-15887 | (per-tick) | bar visibly empty by 15887 (§3), `hp1` commits 0 the same tick |
| "ONIX used\nDRAGONBREATH!" held through the drain and the faint | 15887-~15959 | `3cca05e3a652` | text does NOT change to a fainted message yet — held static well past the HP commit |
| Pidgeotto's healthbox removed from screen | ~15960-15978 | `02e2544a49ca` (15978) | healthbox gone (PNG zoomed-crop confirmed, empty background) while the OLD kickoff message is still what's shown at 15978 — the fainted message hasn't started printing yet at this tick |
| "Foe PIDGEOTTO\nfainted!" (with heart-cursor prompt) | ~15980-16820 | `f5b0b49f7869` (15980) → cycles `633ba603de70`/`4a61b37a14b7`/`99f977da6802` (idle-cursor-bounce, sparse-sampled 16300-16800) | **PNG-read**, tick 16300: "Foe PIDGEOTTO\nfainted!♥" — the same multi-plateau idle-bounce shape prior turns' menu idles show, here on the KO prompt instead |
| **the button-gated KO hold**: genuinely frozen (0 RAM change, per §2, from 15978 through 16822) | 15978-16822 | `633ba603de70` (steady at the sampled points) | script-confirmed AND now pixel-confirmed: `battle1-winline-b-swap.json`'s own segment 104 (a lone `A`) is required to advance past this exact plateau — the same `battle-turn-notes.md` §24 shape recurring for this second faint |
| gated press registers | 16823 | `633ba603de70` (still, 1-tick lag) | `execFlags` flips 1→0 at 16823 (RAM), post-press bookkeeping (mainFunc transitions, a moot `gBattleMoveDamage` scratch write 17→0→22) follows through 16847 |
| icon-bar retrigger / sent-out text kickoff | 16920-16944 | `62fbb1a5d940` | party-icon-bar re-triggers (same mechanism `faint-switch-notes.md` §3b/§9 established), immediately before the switch commits |
| **switch commits**: `species1` 17→198 (MURKROW), `hp1` 0→142 | 16944 | `62fbb1a5d940` (steady through 16946, pixel lag as usual) | RAM-exact match to `turn12-notes.md` §6's own unverified light-scan value (16944) — confirmed dense this session |
| "BUG CATCHER DESTIN sent\nout MURKROW!" | ~16947-16987 | (letter-by-letter) → `77bc8f6d29a8` (16970, mid-typing) | **PNG-read directly** (§6's own light scan never confirmed this text against the PNG; this session does) |
| ball prop appears (slot 7, `(176,64)`) → open flash → materialize | 16984-17041 | `eccf3faad608` → `7d24cde06b4a` → `d52464f09ddd` → `9262e5b26ab8` | see §7b for the full mechanism match against turn 5 |
| front-sprite stretch/wobble settle | 17041-17069 | `8029393a1f31` → `504aa59db260` | Murkrow's own front sprite stops animating (callback reverts to idle) |
| healthbox slide-in | ~17070-17095 | `40ed5d8763a5` → `035b8e6b6ee1` | pixel-consistent with the same 23-step slide shape §8e of `faint-switch-notes.md` pinned for Pidgeotto's own arrival |
| settled menu vs. MURKROW ("What will ONIX do?") | ~17111-17200 | `5e5283bf92c2` → cycles `9ed65c808454`/`5e6a26f6f342` | **PNG-read** (tick 17150): "What will ONIX do? / FIGHT BAG POKéMON RUN", Onix 4/117, Murkrow's own healthbox now shown top-left — the settled-menu idle cycles between at least 2 distinct shas, same "not perfectly flat" pattern every prior turn's settled menu shows |

## 5. DRAGON_BREATH fire-projectile geometry — the brief's own "mirrored trajectory" premise is FALSIFIED; verdict: same table, reused verbatim, only the translation endpoint's `dy` differs (a new parameter, not a new mechanism)

Ran the already-committed, unmodified `tools/probe/dump-dragonbreath-anim.py`
(generic — identifies the target battler dynamically via
`gBattleAnimTarget`, and the fire sprites via their `affineAnims` pointer,
exactly as it did for turn 2) over ticks 15700-15900. Result, directly
comparable to `dragon-breath-notes.md`'s own turn-2 table
(`E2a-3`/`E2a-4`, Onix→Grovyle):

- **The 21-entry affine `(a, b)` table is BIT-IDENTICAL**: `a: -703,
  -617, -549, -495, -450, -413, -382, -355, -331, -311, -292, -276,
  -262, -249, -237, -226, -216, -207, -199, -191, -184` and `b: -17,
  -15, -13, -12, -11, -10, -9, -8, -8, -7, -7, -6, -6, -6, -5, -5, -5,
  -5, -4, -4, -4` — every one of 21 values matches turn 2's own table
  exactly (`d=a`, `c=-b` holds too, same as before).
- **The x2 translation sequence is BIT-IDENTICAL**: `5, 10, 15, 20, 25,
  31, 36, 41, 46, 51, 57, 62, 67, 72, 77, 83, 88, 93, 98, 103, 103` —
  same as turn 2's own table, confirming `dx=104` is unchanged (the
  attacker's and the opponent-slot's own x-positions are fixed by
  battler side, independent of species).
- **The y2 translation sequence is DIFFERENT, and exactly explained**:
  turn 13 reads `-1, -3, -5, -7, -9, -11, -12, -14, -16, -18, -20, -22,
  -24, -25, -27, -29, -31, -33, -35, -36, -36` — smaller in magnitude
  than turn 2's `-2, -4, ..., -43, -43` throughout. Directly RAM-read
  this session: attacker base = `(72, 88)` (Onix, unchanged from turn 2),
  target logical center = `(176, 51)` (Pidgeotto — RAM-read via
  `gBattleAnimTarget`'s own sprite x/y the instant it flips to battler 1,
  tick 15738). `176-72=104` (matches `dx` exactly) and `51-88=-37`
  (matches the observed y2 endpoint, -36, to the same 1-unit fixed-point
  truncation turn 2's own -43-vs-dy=-44 already showed). Turn 2's own
  target (Grovyle) sat at logical y≈44 (`88 + dy(-44)`); Pidgeotto sits
  at y=51 — a **7px** difference, which is exactly Pidgeotto's own
  `yOffset` (11) minus Grovyle's (4) from `mon-pic-coords.json`, the
  identical 7px delta `faint-switch-notes.md` §5 already found governing
  the front-sprite corner formula `(144, 8+yOffset)`. **Both
  independently-observed 7px deltas trace to the same source constant.**
- **Spawn cadence and frame-cycling are unchanged**: 8 spawns, every
  exactly 4 ticks (15745, 15749, 15753, 15757, 15761, 15765, then slot
  reuse continues the pattern to ~15773), each a 20-tick life, `n=20`
  repeating `n=19` exactly as turn 2's own table shows.
- **The target shake (`AnimTask_ShakeMon2`) is unchanged**: `x2`
  alternates `-2,-2,+2,+2,-2,-2,...` (each polarity held 2 ticks, from
  tick 15757), bit-exact to turn 2's own cadence.
- **`targetPaletteNum` reads 1** the instant the anim-target flips to
  Pidgeotto (15738) — same paletteNum turn 5's own materialize-tint
  probe (§8c of `faint-switch-notes.md`) already found for Pidgeotto,
  cross-confirming this is the identical palette slot, not a
  coincidence.

**Verdict for the supervisor's ISSUES #23 question**: this is **not
mirrored** (the brief's own premise) — Onix is the attacker in both
turn 2 and turn 13, the opponent is the target in both, so the
projectile direction (bottom-left attacker → top-right target) is
**the same**, not flipped. It is **the same table**, reused verbatim,
with **one new parameter** (the translation endpoint `dy`, itself a
closed-form function of the target's own `mon-pic-coords.json`
`yOffset` — not hand-tuned, not re-derived from scratch). Since
ISSUES #23's own unresolved residual is a rendering-sampler defect in
`drawSpriteSheetAffineRotate` (salt-and-pepper edge noise at extreme
compression, a missing blob at extreme magnification) tied to this
exact `(a,b)` table's own scale range — and that table is bit-identical
here — **whoever eventually resolves ISSUES #23 for turn 2 resolves it
for turn 13 (and any future DRAGON_BREATH use) simultaneously**; there
is no separate "turn 13 geometry problem" to track, and no reason to
open a second issue. The exclusion-vs-fresh-crack question the brief
posed resolves to: **exclusion (ISSUES #23's own treatment) applies
unchanged**, once a `dy`-parameterization is added alongside whatever
eventually fixes the sampler.

## 6. Murkrow's switch-in — DESTIN's second switch, no first-switch-only steps skipped

`dump-battler-full.py` snapshot at tick 17150 (fully settled, denser
than `turn12-notes.md` §6's own "light lookahead" scan): species 198
(MURKROW), atk 91/def 69/spd 97/spAtk 91/spDef 69, types **[17,2] =
DARK, FLYING**, moves **[185,19,259,269] = FAINT_ATTACK, FLY, TORMENT,
TAUNT** (PP 20/15/15/20, all full/unused), ability 15 (INSOMNIA), item
**221 (LAX_INCENSE)**, hp 142/142 — **exact bit-for-bit match** to
`turn12-notes.md` §6's own unverified scan; every value re-confirmed
this session at a properly in-scope, densely-probed tick.

**LAX_INCENSE does not proc on switch-in**: RAM-confirmed directly —
`gBattleMoveDamage` and the item-heal battle-script markers
(`gBattlescriptCurrInstr`-family transitions this dossier's other item
procs, e.g. Sitrus, always show around the handoff tick) never fire
anywhere in the 16944-17200 window; the only script activity after the
species-flip is the ordinary sent-out-text/ball/particle/materialize/
healthbox sequence (§7). This confirms `turn12-notes.md` §7's own
prediction directly: evasion-boost hold effects don't have an
on-switch-in proc, unlike Sitrus's HP-threshold heal.

**Second-switch check (the brief's own explicit ask)**: comparing this
switch-in's own tick-by-tick shape against turn 5's (`faint-switch-
notes.md` §7-§10) turn up **no skipped steps** — every mechanism turn 5
established (icon-bar retrigger, sent-out text, ball prop, particle
burst, materialize stretch+tint, front-anim frame parity, healthbox
slide) recurs here in the same relative order with no gaps (§7). DESTIN
being on their *second* switch this arc changes nothing observable.

## 7. The REUSE MAP (the brief's own centerpiece)

Per mechanism, verified directly against `faint-switch-notes.md`'s own
turn-5 closed forms (not re-derived from scratch — confirmed via a
handful of RAM samples per mechanism, the same standard of evidence the
brief's own turn-12 handoff asked for):

| mechanism | verdict | evidence |
|---|---|---|
| **Faint sink** (Pidgeotto's own exit) | **(i) verbatim, new params** — same closed form `n = 8 - floor(yOffset/8)`, `S+1, S+3, ..., S+2n-1` step cadence, destroy at `S+2n+1` | RAM-exact: Pidgeotto's own `yOffset=11` gives `n=7` (vs. Grovyle's `n=8`); `S=15960` (this turn's anchor); 7 steps observed at 15961,15963,...,15973 (`y2` climbing 8,16,...,56); destroyed exactly at `15960+2*7+1=15975` — bit-exact to the formula, zero deviation |
| **DRAGON_BREATH fire-projectile geometry** | **(i) verbatim, new params** — same 21-entry `(a,b)` affine table, same `x2` sequence (`dx` unchanged), only `dy` differs (a closed-form function of the target's own `yOffset`) | §5, exhaustive |
| **Target shake / red-fade blend** (DRAGON_BREATH's own hit animation, not the switch-in) | **(i) verbatim, new params** — same `±2px`/2-tick cadence | §5 |
| **Ball prop** | **(i) verbatim, new params** — **same slot (7)**, same resting position `(176,64)`, same gfx family (`battle-anim-ball-open.json`) | RAM-exact slot/position match, `turn13-allslot-scan.json` |
| **Open-particle burst** | **(i) verbatim, new params** — same origin `(176,59)`, same ~16-particle 1-per-tick staggered spawn, same 26-tick lifetime | RAM-exact position/lifetime match; exact motion-formula (`gbaSin`/`gbaCos`) re-check not repeated this session (already closed-form-pinned by turn 5, no reason to expect divergence given every other sampled field matches) |
| **Materialize landing-bounce** (the mon sprite's own `y2` descent right after the ball opens) | **(i) verbatim, byte-exact** — the literal 13-value table `14,13,12,11,10,9,8,7,5,4,3,2,0` (identical skip pattern, `8→7→5`) reproduces bit-for-bit at the new anchor | RAM-exact, `turn13-b1-sprite.json` ticks 17003-17015 vs. `faint-switch-notes.md` §7b's own turn-5 table |
| **Materialize stretch/wobble** (the affine-emerge + tint ramp) | **(i) same shape, not re-verified to the byte** — `animNum`/`data4`/wobble-`y2` progression matches the qualitative shape (stretch-in then an oscillating wobble phase) `faint-switch-notes.md` §7b/§12 already pinned, but this session did not re-check the exact `GROVYLE_STRETCH_TABLE`/tint-coefficient values tick-for-tick against Murkrow's own instance (time-boxed) | `turn13-b1-sprite.json`, qualitative match only — **flagged, not claimed byte-exact** |
| **Materialize tint** (`MATERIALIZE_TINT_COLOR`) | **(i) verbatim, new anchor, not RAM-re-verified this session** — `targetPaletteNum=1` matches Pidgeotto's own known bank (§5), but the coefficient ramp itself wasn't re-probed for Murkrow specifically | inferred from the paletteNum match + qualitative pixel continuity, not independently re-derived |
| **Held-item on-switch-in proc** | **(iii) absent, as predicted** — LAX_INCENSE has no proc (§6), unlike Sitrus | RAM-confirmed no item-script activity |
| **Healthbox slide-in** | **(i) same shape** — pixel timing (~25-tick ramp, ~17070-17095) matches §8e's own 23-step slide shape; not re-probed to the exact per-tick `x2` table this session | pixel-consistent, not RAM-re-verified |
| **Icon-bar retrigger + sent-out text** | **(i) verbatim, new anchor** — same mechanism, PNG-confirmed text "BUG CATCHER DESTIN sent\nout MURKROW!" | §4 boundary table |
| **KO-gated hold** | **(i) verbatim, new anchor** — same button-gated freeze shape as `battle-turn-notes.md` §24 / `turn12-notes.md` §6's own script prediction, now pixel-confirmed genuinely frozen (0 RAM change) from 15978 through the press at 16822-16823 | §2, §4 |

**Nothing in this turn's switch-in sequence is structurally new or
unexplained.** The two rows marked "not re-verified to the byte"
(stretch/wobble fine detail, tint coefficient, healthbox slide exact
table) are honest gaps in *this session's own verification depth*, not
open questions about *whether* the mechanism differs — every RAM sample
taken agrees with turn 5's own closed forms, and nothing in the source
(all species-generic functions, per `faint-switch-notes.md`'s own
citations) gives a reason to expect divergence.

## Verification

`npm test` and `npm run build` green (no `src/` changes this session —
new artifacts are `tools/compare/traces-groundtruth/battle1-turn13-dense-{a,b}.json`,
`tools/probe/specs/turn13-{rng-watch,b1-sprite,allslot-scan}.json`, this
doc, and the traces-groundtruth README paragraph). Both new traces
twice-run via `bin/oracle run`, manifests (256/256 and 223/223) diffed
byte-identical across two independent runs each, 0 sha mismatches.
Prefix-consistency checked programmatically against
`battle1-winline-b-swap.json`'s own full 156-segment script (0 diffs
across all 17722 shared ticks). RAM probes (`ram-probe.py` with the new
watch specs, `dump-battler-full.py`, `dump-dragonbreath-anim.py`
unmodified) each run once and cross-checked internally (RNG steps
recomputed from raw `gRngValue` deltas; PP/HP/species deltas
cross-checked against the `dump-battler-full.py` snapshots at
15374/16000/17150). Every sha256 cited in §4 was read directly from
this session's own committed traces' first-run manifests at exactly the
cited tick. Every PNG text claim (§3-§6) was read directly from a
rendered frame (several via a zoomed PIL crop for the healthbar/
healthbox region), not inferred from RAM alone.

**PAPERCUT**: none of significant note this session — the existing
generic probes (`ram-probe.py`'s spec format, `dump-battler-full.py`,
`dump-dragonbreath-anim.py`'s dynamic battler-role identification)
reused unchanged across four different probe runs with only
segments/startTick/tick-range edits, exactly as this dossier chain's
own tooling investment was supposed to pay off.

## 2026-07-21 — worktree lane: `tools/probe/verify-turn13.ts` lands; the
dossier's own row 2 and the SAND_ATTACK "held" claim were APPROXIMATE
(three genuine corrections), everything else re-confirms byte-exact

**Verdict, stated up front**: turn 13's engine slice is confirmed a pure
wiring job — no genuinely new mechanism, every reused constant/function
either (a) already generic enough to parameterize directly
(`moveFightCursor`'s 2x2 grid, `dragonBreathGrovyleHp`'s pressTick/
startHp/endHp closed form, `cursorState`'s startTick-parameterized
bounce, `calcBarFilledPixels`/`pickHpBarBand`) or (b) needs only new
per-turn text constants + a new anchor tick (same pattern every prior
turn's own `turnNFoo` functions in `battleScene.ts`/`battleMenu.ts`
already establish) — confirmed by writing a pixel-only verify script
(`node --experimental-strip-types tools/probe/verify-turn13.ts`, no
`src/` changes, no trace changes) against a **fresh** `bin/oracle run`
of the already-committed `battle1-turn13-dense-a.json` (its own 108
segments are byte-identical to `-b.json`'s, asserted programmatically —
both traces really do encode ONE 17722-frame script, just split
`captureFrames` subsets, so either file's segments serve for the whole
span in a single round trip). **46/46 checks pass, twice-run
identical** (re-run back to back, same result both times).

### Three corrections to this dossier's own §4 (the brief's own "prose
APPROXIMATE... re-verify all state from RAM" premise, confirmed true)

1. **§4's row 2 ("submenu open, DOWN nav, confirm... one static
   plateau | 15376-15420 | 4 shas") was never one plateau.** Dense
   stride-1 re-bisection (15373-15421) resolves it to **(at least) 6
   distinct idle-bounce phases** of the FIGHT submenu's own box
   animation, cycling completely independently of the cursor: `882e3c818195`
   (15375-15379) → `8906ff14f3a1` (15380-15385, **not previously
   cited anywhere**) → `e3588ddcf2cd` (15386-15394, **not previously
   cited**) → `41067e0b8723` (15395-15403, **not previously cited**) →
   `7585463c4ba2` (15404-15407, spans the DOWN press itself, unaffected)
   → `55f04a5701aa` (15408-15412, cursor now on DRAGON_BREATH) →
   `7922d883bcb6` (15413-15421, spans the CONFIRM press, still
   unaffected). The **cursor-jump itself pins to exactly tick 15408** —
   one tick after the DOWN press's own last frame (15407), the same
   "+1 after last press frame" lag this dossier chain always finds,
   now nailed to the single tick instead of a named-but-unattributed
   sha. Confirm (15418-15419) produces zero additional visible change,
   consistent with every prior turn's own "instant handoff, no
   submenu-close redraw" rule.
2. **§4's SAND_ATTACK row ("held 15460-15690, `73709be10f05`
   representative sample") conflated three separate things.**
   `73709be10f05` (tick 15460, the row's own cited sha) is actually a
   **mid-typing frame, one glyph short of the full text** — the "!"
   glyph (a narrow 2px-wide column) hadn't drawn yet, which is exactly
   why an earlier draft of this session's own pixel-exact check saw a
   spurious ~20px mismatch localized to that one column before this was
   caught and corrected. The TRUE settled/held sha is **`502ba75ebb7a`**
   (flat 15462 through at least 15470, confirmed **pixel-exact** against
   `drawText`+`moves.json`'s own display name "SAND-ATTACK!", 0px
   mismatch). Then, **a real ~90-tick animation plays 15540-15629**
   (every sampled tick distinct, near-continuous motion) that the
   dossier's sparse 15460/15550/15650 sampling entirely missed —
   SAND_ATTACK deals no damage and has no hit-flash (§2's own RNG
   ledger), so this is almost certainly the move's own "throw sand"
   visual effect; **not re-identified frame-by-frame this session**
   (flagged, not chased — out of the SCOPE-2 budget). The message box
   then goes **blank** (15630-15699, sha `19fb94d8802c`) — the same
   blank sha DRAGON_BREATH's own kickoff starts from (point 3 below),
   confirming "blank box, zero chars, before either move's text starts
   typing" is one shared state, not two coincidentally-identical ones.
3. **§4's DRAGON_BREATH row ("kickoff text held ... 15699-15744 |
   `19fb94d8802c` → `c35307432880`") already showed a sub-transition in
   its own two cited shas, but its own prose framed the row as one
   "held" window.** Resolved precisely: 15699 is the **blank pre-typing
   state** (shared with SAND_ATTACK's own tail, point 2), text is
   genuinely mid-typing at 15720 (matching the dossier's own "ONIX used
   / DRAG" citation exactly — not wrong, just non-final), and is
   **fully settled by 15740**, flat through at least 15747
   (`c35307432880`, within 3 ticks of the dossier's own "full text
   confirmed by 15757" note). Pixel-exact against `drawText` at tick
   15744 (fully typed, not 15720): **0px mismatch.**

None of these three corrections change any verdict in §3/§5/§6/§7 above
— they only replace three approximate/conflated rows with exact
per-tick pins. **KO-gated hold, HP-drain, faint sink, sent-out text,
ball/materialize/stretch, healthbox slide-in, and the turn-14 menu
boundary all re-confirmed byte-exact against their own §4 citations on
this fresh run**, including one more small correction along the way:
the KO-gated hold's own pre-press window (16810-16819) is **still
cycling through the fainted-message's own idle-bounce phases**
(matching one of `633ba603de70`/`4a61b37a14b7`/`99f977da6802`/
`f5b0b49f7869` per tick, not flat at a single sha) — RAM-frozen per §2,
but not pixel-frozen at one value until the press's own first frame
(16820), where it locks to `633ba603de70` (§4's own cited sha) and
holds through 16824. `battle1-turn13-dense-a.json`'s own 108 segments,
walked programmatically (not hand-copied from prose), pin the exact
press-tick boundaries used throughout: submenu-open A = 15374-15375,
DOWN = 15406-15407, confirm A = 15418-15419, the button-gated
KO-dismiss A = **16820-16821** (not a segment-104-in-the-original-156-
script number — 106 in this trace's own local 108-segment indexing).

### Parameterization verdict (per the brief's own ask)

- **2x2 FIGHT-submenu cursor grid**: `battleMenu.ts`'s own
  `moveFightCursor` (unmodified) reproduces the RAM-observed single-DOWN
  jump (`moveFightCursor(0, "DOWN") === 2`) directly — no new code
  needed, confirming the supervisor's own 2026-07-20 root-cause fold.
- **DRAGON_BREATH's own HP-drain closed form**
  (`dragonBreathGrovyleHp`, genuinely generic despite the name) clamps
  correctly for Pidgeotto's own 16→0 endpoints with an arbitrary
  `pressTick` — reused verbatim, only a new anchor tick is a wiring
  concern for later, not a new formula.
- **HP-bar color bands** (`calcBarFilledPixels`/`pickHpBarBand`,
  unmodified): Pidgeotto 16/156 and 0/156 both red, Murkrow 142/142
  green — matches turn10/turn11's own already-exercised bands for this
  same Pidgeotto.
- **SAND_ATTACK's own kickoff text/message-box mechanism** needs only a
  new two-line text constant + a fresh anchor tick — same
  `drawText`+`charmap`+battle-window-tile harness every prior turn's
  kickoff message already uses, **plus** a genuinely-new-this-turn
  ~90-tick "throw sand" animation whose own frame table is **not yet
  characterized** (named gap, see next-brief bullets).
- **Everything itemized in §7's own REUSE MAP re-confirms unchanged**
  this session (faint sink, ball, particles, materialize, healthbox
  slide, held-item absence, icon-bar/sent-out text, KO-gated hold) — no
  new findings there beyond the pixel-exactness check above.

### Honest gaps (named, not guessed at)

- **SAND_ATTACK's own ~90-tick mid-message animation (15540-15629,
  every-tick-distinct) is entirely new to this dossier chain and not
  characterized** — not identified frame-by-frame, no sprite/table
  extracted, not cross-referenced against any existing
  `AnimTask_*`-family mechanism. This is the one genuinely open item a
  wiring pass will need before SAND_ATTACK's own half can render
  correctly (the message-box text itself is already fully pinned and
  pixel-exact).
- The REUSE MAP's own two "not re-verified to the byte" rows (§7:
  materialize stretch/wobble fine detail, tint coefficient ramp,
  healthbox slide exact per-tick table) remain unverified to that same
  depth this session too — this session's own healthbox-slide check
  only confirms the window animates (start≠end), not its exact
  per-tick `x2` table.
- Fire-projectile geometry table and target-shake cadence (§5) were
  **not** re-derived from RAM this session (pixel-only script, per
  convention) — spot-checked only for "the animation visibly
  progresses, one frame per spawn tick, no repeats"; the full
  bit-exact table match is still §5's own (prior session's) claim,
  not re-verified here.

### Verification

`node --experimental-strip-types tools/probe/verify-turn13.ts`: **46/46
checks pass**, run twice back to back, identical both times (single
`bin/oracle run` per invocation, 246 captured ticks, well under the
256-per-run cap — both committed dense traces' identical `segments`
mean either file's own script covers the whole 15373-17200 span
requested). `npm test` (946 tests) and `npm run build` green, unchanged
from before this session. No `src/` changes, no trace changes — new
artifacts are `tools/probe/verify-turn13.ts` and this doc section only,
per the brief's own constraint.
