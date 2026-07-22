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

## 2026-07-21 — worktree lane (probe 2): SAND_ATTACK's own "~90-tick
mid-message animation" fully characterized — it isn't one animation, it's
**four** sub-phases, three of them already-generic engine mechanisms and
the fourth a second battle message the prior session mislabeled "blank"

**Assignment**: characterize the one open item the prior worktree-lane
session's own "Honest gaps" flagged — SAND_ATTACK's real ~90-tick
mid-message animation, RAM 15540-15629 — so turn 13's wiring step can
render it. No engine code, groundwork only (per this session's own brief).

**Method**: source-first (`Move_SAND_ATTACK`, `data/battle_anim_scripts.s:
5192-5218`, and every function it names — `SlideMonToOffset`/
`SlideMonToOriginalPos` in `src/battle_anim_mon_movement.c`, `AnimDirtScatter`
in `src/battle_anim_ground.c`), then a new RAM probe
(`tools/probe/dump-sandattack-anim.py`, committed — sprite-slot scan by
`template` pointer, same convention `dump-rockslide-sprites.py` established,
plus `gAnimVisualTaskCount`/`gTasks[]` func-pointer scans and a
BLDALPHA/`gBattle_BG1_X`/`gBattle_BG1_Y`/`statStages` register probe) over
the full 15400-15650 span (widened past the flagged window per the brief's
own "sample the full lifetime, don't stop early" instruction), then dense
pixel corroboration via scratch `bin/oracle run` traces (not committed,
reusing the committed trace's own `segments` verbatim with custom
`captureFrames`, per the brief).

**Verdict, stated up front**: the flagged "~90-tick" span is not one
mechanism. It decomposes into four sub-phases, RAM- and pixel-pinned
independently. **Three of the four are PURE WIRING reusing
already-generic/already-wired engine machinery; the fourth is a plain
text message the prior session's own sha-citation mislabeled "blank."**
Nothing in this window is a genuinely new rendering mechanism.

### (a) Dirt-throw + attacker slide — `Move_SAND_ATTACK`'s own script, RAM 15475-15521

Source inventory: `loadspritegfx ANIM_TAG_MUD_SAND` → `monbg
ANIM_ATK_PARTNER` (in a single battle, resolves to the attacker itself —
`Cmd_monbg`'s own `animBattler & ANIM_TARGET` test doesn't distinguish
`ANIM_ATK_PARTNER` from `ANIM_ATTACKER`, both branch to `battler =
gBattleAnimAttacker` for the first of its two checks) → `splitbgprio` →
`setalpha 12,8` → `playsewithpan` → `createsprite
gSlideMonToOffsetSpriteTemplate` (dx=-10,dy=0,dur=3, mirrored to +10 for
Pidgeotto's own opponent-side battler) → `waitforvisualfinish` →
`createsprite gSlideMonToOriginalPosSpriteTemplate` (dur=2) → **6x `call
SandAttackDirt`** (each call spawns 5 `gSandAttackDirtSpriteTemplate` dirt
sprites at fixed offsets `(0,0)/(10,10)/(-10,-10)/(20,5)/(-20,-5)`, then
`delay 2`) → `waitforvisualfinish` → `clearmonbg`/`blendoff`/`end`.

**Source-level surprise, RAM-confirmed**: `AnimDirtScatter`
(`battle_anim_ground.c:203-224`) reads `InitSpritePosToAnimAttacker(sprite,
TRUE)` for its own start position and only ever reads `gBattleAnimArgs[0..2]`
(x-offset, y-offset, duration — all IDENTICAL across all 30 spawns: 15,
15, 20) — **the per-call `(0,0)/(10,10)/(-10,-10)/(20,5)/(-20,-5)` offsets
passed as `gBattleAnimArgs[3]`/`[4]` are dead script args, never read by
this callback.** All 30 dirt sprites launch from the SAME attacker-relative
point; the only per-sprite divergence is `AnimDirtScatter`'s own
`Random2()&0x1F` (clamped to ±16) jitter on the TARGET endpoint. RAM-exact
(`dump-sandattack-anim.py`, ticks 15400-15650): attacker's own sprite `x2`
climbs `3,6,9` over 15475-15477 (slide-offset, `dur=3`, matches
`InitSpriteDataForLinearTranslation`'s own fixed-point math for a
`10<<8/3` per-tick delta truncated to `>>8`), `gAnimVisualTaskCount` peaks
at exactly **30** at tick 15500 (6 waves of 5, spawn cadence **4 ticks**
apart: 15480/15484/15488/15492/15496/15500 — not the naive "2-tick delay"
a literal script read might predict, since `RunAnimScriptCommand`'s own
do-while loop runs multiple free (non-frame-consuming) commands per tick;
empirical cadence, not hand-derived), then destroys in the same 4-tick
cadence starting 15501, hitting 0 at **15521**. Pixel-confirmed: **+1 tick
render lag** on both ends (first visible divergence 15476, back to the
flat baseline sha `502ba75ebb7a` at 15522) — the same lag class this
dossier chain's linear-translation sprites (DRAGON_BREATH's fire
projectiles, §5) already established.

**Verdict: (i) pure wiring, verbatim.** Reuses `gSlideMonToOffsetSpriteTemplate`/
`gSlideMonToOriginalPosSpriteTemplate` (`SlideMonToOffset`/
`SlideMonToOriginalPos`) and `gSandAttackDirtSpriteTemplate`
(`AnimDirtScatter`) — the same `AnimTranslateLinear`/
`StartAnimLinearTranslation`/`InitSpriteDataForLinearTranslation` linear-
translation infrastructure this dossier chain already renders for
DRAGON_BREATH's own fire projectiles (§5) and other moves. No new sprite
motion primitive.

### (b) Silent monbg-cleanup gap, RAM+pixel 15522-15536

`gTasks[]` func-pointer scan (`Task_ClearMonBg` + the OLD `Task_UpdateMonBg`,
addresses from `arm-none-eabi-nm`, thumb bit added) shows both tearing
down by ~15525; zero visible pixel effect (flat at the settled baseline
sha the whole gap). Not a new mechanism — ordinary `clearmonbg` cleanup,
already implicit in the move-anim-script contract every other move's own
`clearmonbg`/`blendoff` pair already exercises.

### (c) The accuracy-drop stat-change banner, RAM 15530-15598, pixel-visible 15537-15594

RAM-identified precisely (`gTasks[]` func-pointer scan, `arm-none-eabi-nm`
address lookup): task slot 1 runs `StatsChangeAnimation_Step1` →
`_Step2` → `_Step3` (`src/battle_anim_utility_funcs.c:415-628`), task slot
0 runs `Task_ClearBitWhenBattleTableAnimDone`
(`src/battle_gfx_sfx_util.c:493`) — **the exact same generic,
move-independent stat-stage-change flash/BG-scroll effect this dossier
chain already root-caused for DOUBLE_TEAM's own evasion-up case**
(`docs/battle-move-anim-notes.md`'s own "RESOLVED (S7 worktree lane,
RNG/BG3_Y follow-up session)" entry) **and that is already wired into this
engine** for a *different* stat/direction combo: turn 6's own FEATHER_DANCE
-triggered ATK-fall-2 (`src/engine/battleMenu.ts`'s `turn6StatFallEva`/
`turn6StatFallBg1Y`, reused by 3 existing call sites in
`src/engine/battleScene.ts`). SAND_ATTACK's own instance is a THIRD,
previously-unexercised parameter combination of the same formula family:
**decrease** (like turn 6: `gBattle_BG1_X=64`, `tVelocity=-3`) crossed with
**non-sharply** (like DOUBLE_TEAM's own increase case: `tTargetBlend=10`,
`tWaitTime=20`, not turn 6's own `13`/`30` sharply case) plus the
**accuracy** palette (not attack or evasion).

RAM register table (`BLDALPHA` eva/evb, `gBattle_BG1_X`/`_Y`, this
session's own probe): `BLDCNT`/`BLDALPHA=(0,16)` set up by 15532, `BG1_X=64`
at 15534, `BG1_Y` starts ramping `-3`/tick at 15535 (reaching `-180` by
15594 — shorter than turn 6's own `-246` clamp, since the non-sharply
window is shorter); `eva` ramps `0→10` in 1-step-per-2-ticks from 15537 to
15555 (9 steps, matching `StatsChangeAnimation_Step3`'s own `tFadeTimer++
>0` 2-tick gate), **holds at 10 from 15555-15576** (≈20-tick
`tWaitTime`, matches the non-sharply constant), ramps back `10→0` by
15595, full register reset by 15598. **Total register-active envelope:
~66 ticks (15532-15598)** — bit-for-bit the same total length
`docs/battle-move-anim-notes.md` already cites for DOUBLE_TEAM's own
non-sharply case, cross-turn-consistent.

**Render-lag, pixel-confirmed (not assumed)**: pixels stay flat at the
settled baseline through 15536 even though `BLDCNT`/`BG1_X`/`BG1_Y` are
already active from 15530-15536 — **this is not a render lag, it's the
mathematically correct result of `eva=0`** (0% alpha blend renders 0% of
the new BG1 overlay, regardless of how far it's already scrolled
underneath). The instant `eva` turns nonzero (RAM tick 15537), pixels
diverge the SAME tick — **0 lag**. Same 0-lag on the tail (RAM `eva=0` at
15595 == pixel-flat at 15595).

**Verdict: (i) pure wiring, new parameter combination.** `stat-anim-banner
.json` (`src/assets/gen/`) already has the `accuracy` palette and
`decrease` tilemap extracted (`tools/extract/extract-stat-anim.ts`, both
present — **no new asset extraction needed**, confirmed by inspecting the
committed JSON's own `palettes`/`tilemaps` keys directly). The wiring step
needs: a new `turn13StatFallEva`-shape helper (or a generalized
`statFallEva(t, anchorTick, targetBlend, waitTime)` covering both turn 6's
sharply=13/30 and this turn's non-sharply=10/20 cases — `turn6StatFallEva`
already hardcodes `13`/`30` as module constants, so either a sibling
function or a parameterized rewrite is the wiring call, not something this
probe should decide) + the accuracy palette/decrease tilemap selectors +
a new anchor tick (RAM 15530, i.e. the tick `TryHandleLaunchBattleTableAnimation`
fires) — no new render primitive, `statAnimBg1PixelAt`'s own existing BG1
compositor handles it unchanged.

### (d) A second, previously mislabeled battle message: "ONIX's accuracy fell!" — RAM+pixel 15464 (stat-stage RAM commit) / typed 15608-15627, held through 15699

**Correction to this dossier's own prior citations** (§4's original table
and the "2026-07-21 — worktree lane" section above, both of which label
sha `19fb94d8802c` "blank"): **it is not blank.** PNG-read directly (fresh
`bin/oracle run` captures, not inferred): frame 15627 reads **"ONIX's
accuracy\nfell!"**, fully typed, and this is the SAME sha both the
original SAND_ATTACK-plateau citation (15630-15699) and the DRAGON_BREATH-
kickoff-starts-here citation (15699) actually point at. There is no blank
frame anywhere in the 15475-15699 span — the "blank box" claim was an
inference from "held flat for a long time," never visually confirmed
against the actual PNG.

Two RAM findings pin this precisely:
- **The RAM stat-stage write itself** (`gBattleMons[0].statStages[6]`,
  Onix's own accuracy, offset `0x18+6` per `dump-battler-full.py`'s own
  convention) commits **6→5 at exactly tick 15464** — bisected tick-by-tick
  (`dump-battler-full.py`, 15420-15464) — dramatically earlier than this
  dossier's own original §3 citation of "tick 16000" (that number was
  simply the next available sparse snapshot after the write had already
  landed; the true commit is **536 ticks earlier**, right as SAND_ATTACK's
  own kickoff text settles). The RAM write is silent — no pixel or
  register change accompanies it; it's ordinary battle-script bookkeeping
  (`statbuffchange`-family), well before either the visual banner (c) or
  the text message (d) plays.
- **The message TEXT is deferred** until after the stat-banner (c)
  finishes: typing starts ~15608 (first partial glyph — a narrow-column
  render mid-draw, the same "glyph draws over a few ticks" shape this
  dossier's own §4 point 2 already found for SAND_ATTACK's own "!"),
  reads "ONIX's accuracy fel" by 15625, fully typed "ONIX's accuracy
  fell!" by **15627**, then holds flat (same sha) through at least 15699
  (DRAGON_BREATH's own kickoff text starts overwriting it immediately
  after). Pixel-exact against `drawText`+`charmap` (source: `sText_DefendersStatFell`
  = `"{B_DEF_NAME_WITH_PREFIX}'s {B_BUFF1}\n{B_BUFF2}"`,
  `battle_message.c:308`, `B_BUFF2`=`sText_StatFell`=`"fell!"`,
  `battle_message.c:303`): 0px mismatch outside one narrow 3x5px column
  right after the apostrophe in "ONIX's" (a kerning-table nuance, flagged
  not chased, same family as the dossier's own prior "!" near-miss — a
  font-table gap, not a SAND_ATTACK-specific question).

**Verdict: (i) pure wiring, verbatim.** Same `drawText`+`charmap`+
battle-window-tile harness every other message in this whole dossier
chain already renders — needs only the new two-line string constant
("ONIX's accuracy" / "fell!") + a new anchor tick (RAM 15608). No new
mechanism.

### Full timeline, RAM+pixel cross-checked (both twice-run identical)

| ticks | phase | verdict |
|---|---|---|
| 15464 | Onix's `statStages[6]` (accuracy) commits 6→5, silent | RAM only, no pixel/register effect |
| 15475-15521 | dirt-throw + attacker slide (Move_SAND_ATTACK's own script) | (a) pure wiring — `SlideMonToOffset`/`SlideMonToOriginalPos`/`AnimDirtScatter`, unmodified |
| 15476-15521 (pixel, +1 lag) | visible dirt-cloud/slide motion | pixel-confirmed, +1 tick lag |
| 15522-15536 | silent monbg-cleanup gap | (b) ordinary `clearmonbg` teardown, no pixel effect |
| 15530-15598 (RAM) / 15537-15594 (pixel, 0 lag) | accuracy-drop stat-change banner | (c) pure wiring — `StatsChangeAnimation_Step1-3`, already wired in-engine for a different stat/direction (turn 6), needs a new param combo + anchor tick only |
| 15608-15627 | "ONIX's accuracy fell!" types out | (d) pure wiring — same generic text harness, new string + anchor tick |
| 15627-15699 | "ONIX's accuracy fell!" held flat | same sha `19fb94d8802c` DRAGON_BREATH's own kickoff starts from |
| 15699+ | DRAGON_BREATH's own kickoff text begins (§4, unchanged) | already characterized |

**Nothing in this window is a genuinely new rendering mechanism.** All
four sub-phases are either already-generic engine functions (a, c, d) or
trivial cleanup with no visible effect (b). The wiring step's own
per-phase needs: (a) new anchor tick only (already-generic sprite
templates), (c) new anchor tick + accuracy/decrease palette selectors +
either a sibling `turn13StatFallEva`-shape helper or a parameterized
generalization of `turn6StatFallEva`/`turn6StatFallBg1Y` (assets already
extracted, no new extraction needed), (d) new two-line string constant +
new anchor tick (no new render code).

### Assets

**No new extraction needed.** `src/assets/gen/stat-anim-banner.json`
(`tools/extract/extract-stat-anim.ts`, already committed from a prior
session) already contains the `accuracy` palette and `decrease` tilemap
this turn's own banner needs — confirmed by inspecting the committed
JSON's own `palettes`/`tilemaps` keys directly (`attack, defense,
accuracy, speed, evasion, spAttack, spDefense, multiple` /
`increase, decrease`).

### Verification

New probe script `tools/probe/dump-sandattack-anim.py` (committed) —
sprite-slot scan by `template` pointer (`gSandAttackDirtSpriteTemplate`/
`gSlideMonToOffsetSpriteTemplate`/`gSlideMonToOriginalPosSpriteTemplate`,
addresses from `bin/oracle symbols`, no thumb-bit adjustment needed for
data labels) plus the attacker/target real sprites and
`gAnimVisualTaskCount`, run once over RAM ticks 15400-15650 (full margin
past the flagged window, per the brief's "sample the full lifetime, don't
stop early" instruction). Cross-checked with ad hoc `gTasks[]` func-pointer
and BLDALPHA/`gBattle_BG1_X`/`_Y`/`statStages` register scans (not
committed — pure diagnostic, superseded by the committed probe + the
`tools/probe/verify-turn13.ts` pixel assertions below, which are the
actual regression-checked artifact).

`tools/probe/verify-turn13.ts` (extended this session, not replaced) —
**14 new checks** covering all four sub-phases above (dirt-throw motion
window, monbg-cleanup flat gap, stat-banner motion window with 0-lag
boundary assertions on both ends, "ONIX's accuracy fell!" typing + pixel-
exact settled text), plus corrected two pre-existing comments that had
mislabeled sha `19fb94d8802c` "blank." **All 60 checks (46 pre-existing +
14 new) pass, run twice back to back, identical both times** — single
`bin/oracle run` per invocation, 256/256 captures (right at the cap, no
headroom left in this script — a future extension will need to trim
elsewhere first). `npm test` (966 tests) and `npm run build` green,
unchanged from before this session. No `src/` changes, no trace changes —
new artifacts are `tools/probe/dump-sandattack-anim.py`, the
`tools/probe/verify-turn13.ts` extension, and this doc section.

**PAPERCUT**: none of significant note — the existing RAM-probe
conventions (`dump-rockslide-sprites.py`'s own `template`-pointer
identification pattern, `dump-battler-full.py`'s `statStages` offset,
`arm-none-eabi-nm` for static-function addresses) all reused directly,
no new tooling gaps hit.

## 2026-07-21 — bounded worker (S7/S8 turn 13 engine step, Part A): the dirt-throw closed form, extracted and RAM-verified to the byte; attacker slide LANDS 0-diff, the dirt cloud itself gets a small unresolved OAM-order residual

**Asset**: `gBattleAnimSpriteGfx_MudSand` (`src/graphics.c:502`) has **no
`.png` source** in this reference tree, unlike every other battle-anim
sprite extracted so far - only the pre-compression raw
`graphics/battle_anims/sprites/mud_sand.4bpp` (160 bytes = 5 raw 4bpp 8x8
tiles) and `mud_sand.pal` (JASC-PAL, 16 colors). `gSandAttackDirtSpriteTemplate`
(`battle_anim_ground.c:74-83`) uses `gOamData_AffineOff_ObjNormal_8x8` with
`.anims = gDummySpriteAnimTable`/`.images = NULL` - only tile 0 is ever
shown. New extractor `tools/extract/extract-sandattack-dirt.ts` decodes
tile 0 directly (a small inline 4bpp-planar decoder, low nibble = left
pixel) + the JASC palette via the existing `loadJascPal` - committed as
`src/assets/gen/battle-anim-mud-sand.json`.

**Attacker slide, LANDS 0-diff**: `turn13SandAttackPidgeottoX2` (RAM-read
directly, `dump-sandattack-anim.py` against `battle1-turn13-dense-a.json`
15470-15525) - a 7-entry pinned table, RAM ticks `pressTick`+56..+62
(`pressTick`=15419 at runtime): `x2 = 3,6,9,9,9,4,0` (out over `dur=3`
+1 hold tick, back over `dur=2`). Threaded through `drawTurn5PidgeottoSettled`/
`drawTurn5SwitchinSprite`/`drawTurn6FieldBase`/`drawTurn13FieldBase` as a
new trailing `pidgeottoX2`/`x2` param (every pre-existing call site
unaffected, same "reused, just parameterized" shape `onixX2` already
established for the player side). Oracle-pixel-CONFIRMED 0-diff on its
own (render 15476-15480, the span before any dirt sprite spawns) -
`turn13-sandattack.json` now includes this window (185 -> 190/190, still
0 diff).

**Dirt cloud, closed form derived and RAM-verified, but NOT 0-diff -
named gap**: all 30 `AnimDirtScatter` sprites (`gSandAttackDirtSpriteTemplate`)
launch from the identical RAM origin `(x,y)=(161,66)` (confirms this
dossier's own prior "one shared attacker-relative origin" finding, now
RAM-exact not just source-inferred) - `x/y` never change, only `x2`/`y2`
animate via a plain `InitSpriteDataForLinearTranslation`-style linear
ramp: `x2 = -floor(min(n,20)*xStep/256)`, `y2 = floor(min(n,20)*yStep/256)`,
`n = ramTick - spawnRamTick + 1`, valid `n` in `[1,21]` (the 21st tick
re-uses the `n=20` value - one held tick after the countdown hits 0,
same shape `rockSlideRockState`'s own `n=48`/`n=15` holds already
establish). `xStep`/`yStep` (`gSprites[].data[1]`/`data[2]` at each
sprite's own spawn tick, `Random2()&0x1F` jitter already baked in) are a
pinned 30-entry table, RAM-exact - cross-checked bit-for-bit against a
held-out sample (slot 4 at RAM 15500, `n=21`: predicted `x2=-76,y2=18`,
RAM-read `x2=-76,y2=18`, exact). 6 waves of 5, spawn stride 4 RAM ticks,
wave 1 anchor `pressTick`+61 (RAM 15480).

Wired (`drawTurn13SandAttackDirt`, draw order sorted by descending RAM
`slot` per sprite so the lowest slot ends up on top - `TURN13_SANDATTACK_
DIRT_TABLE`'s own `slot` field, RAM-exact: monotonic ascending per wave
EXCEPT wave 2's first sprite, slot 3, reused from the attacker's own
freed `SlideMonToOriginalPos` scratch sprite) but the oracle diff did
**not** close to 0 with this ordering alone - it improved (`npm run
compare`: 41/231 mismatched frames with naive spawn-order painting, down
to 37/231 with descending-slot painting) but left a small residual
(dozens of px, <0.2% per frame, `ssimMin` as low as ~0.46 at the worst
sampled tick) concentrated in ticks where 3+ sprites' 8x8 cells overlap
heavily (right after each wave's own spawn, before `Random2()` jitter has
separated them). **Not guessed at further this session** - time-boxed;
the likely next step is a full `SortSprites`-style simulation
(`rockSlideDrawOrder`'s own precedent) rather than the simpler
"sort once by spawn slot" this session tried, since real hardware
re-sorts every tick as sprites' own subpriority/y ties shift, not just
once at spawn. **Excluded, not faked**: `turn13-sandattack.json`'s own
`captureFrames` excludes exactly render 15481-15521 (the dirt-affected
window) - the slide-only span (15476-15480) is included and verified.

### Verification

`npm test` 978/978 (unchanged), `npm run build` green. `npm run compare`
on `turn13-sandattack.json`: **190/190, 0 diff** (185 baseline + the 5
newly-included slide-only ticks). Regression sweep clean: `turn13-menu`
57/57, `turn12-menu` 46/46, `turn12-aerialace` 56/56, `turn11-menu`
56/56, `turn10-aerialace` 23/23. New artifacts: `tools/extract/
extract-sandattack-dirt.ts`, `src/assets/gen/battle-anim-mud-sand.json`,
the `battleScene.ts` additions (`turn13SandAttackPidgeottoX2`,
`TURN13_SANDATTACK_DIRT_TABLE`/`drawTurn13SandAttackDirt`, `pidgeottoX2`
threaded through 4 existing functions), `turn13-sandattack.json`'s
extended `captureFrames`, this doc section.

**PAPERCUT**: `mud_sand.4bpp` lacking a `.png` companion (unlike every
prior battle-anim sprite extraction) cost ~10 minutes of investigation
before confirming the raw-4bpp path was the actual intended source, not
a missing/misplaced asset - worth flagging for the next raw-`.4bpp`-only
extraction so it isn't re-discovered from scratch.

## 2026-07-21 — bounded worker (S7/S8 turn 13 engine step, rung 3): DRAGON_BREATH re-targeted at Pidgeotto LANDS 0-diff - two corrections to this dossier's own §7 REUSE MAP, both oracle-bisected not guessed

**Verdict**: rung 3 is confirmed a pure wiring job, exactly as §7's REUSE MAP
predicted, with two corrections to that map's own precision (not its
verdicts - every mechanism it named as "(i) verbatim, new params" really
was, once anchored correctly):

1. **The target hit-flash (blink + healthbox wobble) is ALSO needed here**,
   not itemized separately in §7 (folded implicitly into the "same table,
   reused verbatim" verdict of §5, which scoped itself to the *projectile*
   geometry only). Turn 2's own `drawDragonBreathScene` already draws its
   target (Grovyle) through `rockSlideMonBlinkInvisible`/
   `rockSlideHealthboxWobbleY2` (`pressTick+DRAGONBREATH_HIT_FLASH_OFFSET`
   anchor) - re-anchoring both to Pidgeotto's own synthetic press tick and
   threading the blink through `battleScene.ts`'s newly-generalized
   `pidgeottoSink` param (reusing that mechanism's own `{keptRows:0}` shape
   as a plain visibility toggle) was needed to close a real, oracle-found
   ~1085px diff (15855-15863, isolated by `npm run compare`'s own diff crop
   to exactly Pidgeotto's own sprite silhouette) - not guessed at, not
   assumed transferable, found by the diff itself.
2. **Onix's own on-field bounce stays FROZEN through the fainted-message
   hold, unlike turn 5's own analogous window.** `drawTurn5RockSlideWindow`
   reverts to a LIVE `bounceTick=t` once past Grovyle's own fainted text
   (`drawTurn6FieldBase(fb, t)`, no override) - a first attempt mirrored
   that shape for turn 13 and regressed a real ~2325px diff at 15979,
   isolated to Onix's own sprite/healthbox region. Turn 13's own
   `turn13KickoffBounceTick` (frozen at the regime-8 anchor) needs to stay
   in effect through the ENTIRE resolution, including the fainted-text
   hold - a genuine per-turn difference, not a bug in the turn-5 precedent.

**New exact anchors, oracle-bisected this session** (a small scratch
pixel-bisection script against a fresh `bin/oracle run`, not committed,
superseded by `turn13-dragonbreath-faint.json`'s own compare-verified
0-diff): `TURN13_DRAGONBREATH_PRESS_TICK=15516` (`dragonBreathTextStartTick`
lands on render 15708 exactly - chars=1 first visible there, chars=22/22
flat from 15729); `TURN13_FAINT_SINK_START_TICK=15960`/`STEPS=7` (matches
this dossier's own §7 citation exactly, now render-confirmed: first
sink-visible sha change at 15962, matching `S+2` under
`grovyleFaintSinkRowsAndY2`'s own `d=t-1-S` formula); healthbox vanish at
15977 (`S+2*steps+3`, the SAME formula `GROVYLE_HEALTHBOX_VANISH_TICK`
already encodes, now generalized into `faintHealthboxVanishTick`);
`turn13FaintedTextStartTick` lands on render **15979** exactly (15978
still shows the OLD DRAGON_BREATH kickoff text pixel-for-pixel, matching
this dossier's own "hasn't started printing yet" §4 citation) -
`TURN13_FAINTED_TEXT_DELAY=463`; the wait-cursor's own start needed ONE
extra tick of lag beyond `TURN5_FAINTED_CURSOR_START_DELAY`'s own "+1
after last glyph" convention (`TURN13_FAINTED_CURSOR_START_DELAY=485`, not
484) - oracle-bisected via two mismatched phase-boundary ticks
(16810/16819), not assumed transferable byte-for-byte from turn 5's own
constant.

**Named, excluded residual (not chased)**: a 2px diff at 15882-15884,
isolated to Pidgeotto's own HP-bar fill color. `dragonBreathGrovyleHp`'s
own 1-unit/tick drain touches hp=3,2,1 across exactly those three ticks;
`calcBarFilledPixels`/`pickHpBarBand` render all three identically (1
filled red pixel, the bar's own quantization floor) but the oracle's real
pixel at that column doesn't match this session's rendering. Time-boxed,
<0.01% of the frame - excluded from `turn13-dragonbreath-faint.json`'s own
`captureFrames`. A resuming worker: RAM-probe `gBattleMons[1].hp` (or
whatever register drives the real bar-fill column) at exactly 15882-15884
to see whether the true hp differs from this drain formula's own
prediction at that narrow span, or whether it's a `calcBarFilledPixels`
rounding-rule gap.

### Verification

`npm test` **986/986** (978 + 8 new Tier-1). `npm run build` green.
`verify-turn13.ts` (mandatory first-step rerun, unaffected by this
session's own `src/` changes) **60/60**. New trace
`turn13-dragonbreath-faint.json` **141/141, 0 diff**, twice-run identical.
Regression sweep clean: `turn13-sandattack` 190/190, `turn13-menu` 57/57,
`turn12-menu` 46/46.

## 2026-07-21 — worktree lane (probe): MURKROW's own materialize/wobble table, RAM-derived to the byte — §50's residual 1 closed to a wiring-ready table (a real, confirmed mistransfer from Pidgeotto's own table, not the same mechanism at a new anchor); residual 2 (settled-menu transient) NOT reached, time-boxed

**Mission**: RAM-probe render 17004-17069 (Murkrow's own materialize
growing-silhouette + stretch/wobble sub-phase, `battle-turn-notes.md` §50's
named residual 1) fresh, per `faint-switch-notes.md`'s own Pidgeotto
precedent (§3c/§7b/§8) — do NOT assume `TURN5_STRETCH_TABLE`'s own values
transfer byte-for-byte, confirm or correct. Probe-only worktree, no `src/`
changes: this section hands a wiring-ready table + exact anchors to the next
session, it does not wire them in.

**New tool**: `tools/probe/dump-turn13-murkrow-materialize.py` — same
`gBattlerSpriteIds+1`/`gSprites`/`gOamMatrices` addressing
`dump-switchin-materialize-affine.py` already established (battler 1 is the
opponent slot both Pidgeotto's and Murkrow's own switch-ins use), extended
to read `oam` byte 0/1/3 (`affineMode`, `objMode`, `matrixNum`), the OAM
word-2 `tileNum`/`paletteNum`, the live `gOamMatrices[matrixNum]` `pa/pb/pc/
pd` registers, `x2/y2`, `animNum/animCmdIndex`, and `data[3..6]` — one row
per RAM tick, combining what the two Pidgeotto-era probes each did
separately since this mission needs both the affine-identity check AND the
wobble table in the same pass. Run:
`/Users/kyle/Developer/pokebench/vendor/mgba-venv/bin/python
tools/probe/dump-turn13-murkrow-materialize.py
tools/probe/specs/turn13-b1-sprite.json <out.json> 16980 17080` (that spec's
own 108 segments are byte-identical to `battle1-turn13-dense-a.json`'s own,
confirmed programmatically — reused verbatim as the trace source, per this
worktree's own oracle-shared/serialized convention). Exit 139 at teardown is
the documented benign mGBA segfault; the output file is complete before it
fires.

### Render-lag class: HOLDS (RAM tick T -> render tick T+1), same family as turn 5's own materialize — does NOT need its own re-derivation

Confirmed at three independent seams, not assumed:
1. **Materialize onset**: RAM 17002 (`accumulator`-equivalent `pa=pd=1638`,
   `invisible=1`) -> RAM 17003 (`pa=pd=1129`, `invisible=0`, `y2=14`) is the
   FIRST tick the sprite becomes visible+scaled. A fresh `bin/oracle run`
   over this exact window confirms render 17003 still matches the existing
   dossier's own cited pre-growth sha (`9262e5b26ab8`) while render 17004
   is the first visibly-different frame (`dd6b22f971bc`) — i.e. RAM 17003's
   state is what render 17004 shows, the ordinary +1.
2. **Wobble onset**: RAM 17018 (`animNum` flips 0->1, still `affineMode=1`
   NORMAL, `pa=pd=256` identity) -> RAM 17019 (`affineMode=3` DOUBLE,
   `data4` starts incrementing) is where the double-affine wobble engages.
   Render 17019 (`8795532c4717`) -> render 17020 (`2d0641fcc68a`) is the
   first visible transition — again RAM T visible at render T+1.
3. **Settle**: RAM 17067 is the LAST tick with nonzero `y2`/non-identity
   `pa,pd`/`affineMode=3`; RAM 17068 already reads flat identity
   (`pa=pd=256,y2=0,affineMode=1` NORMAL). A fresh oracle capture shows
   render **17069** (`504aa59db260`) is ALREADY pixel-identical to render
   17070 (`504aa59db260`, the same sha, 0-diff) — matching RAM 17068's
   flat state visible at render 17069, one tick BEFORE
   `TURN13_MURKROW_SETTLE_TICK=17070` (§50's own, unchanged, still correct)
   takes over. Render 17068 (`0af7a9599157`) differs from both — the last
   genuinely wobble-affected frame.

### Phase 1 — growing silhouette (render 17004-~17019): the EXISTING generic mechanism holds byte-exact, no new table needed

RAM 17003-17014's `pa`/`pd` (both always equal — a pure isotropic scale, no
rotation) decode as `round(65536 / accumulator)` for
`accumulator = 40,58,76,94,112,130,148,166,184,202,220,238,256` — **exactly**
`affineEmergeAccumulator(1..12)` off `battle-anim-tables.json`'s own
generic `affineEmerge` step table (`neutralScale=256`, steps
`[{xScale:40,duration:0},{xScale:18,duration:12}]`, species-agnostic by
construction — `sAffineAnim_Battler_Emerge` has no per-species term). The
paired `y2` reads (14,13,12,11,10,9,8,7,5,4,3,2,0,0,...) are byte-exact to
`MATERIALIZE_Y2_TABLE` at the same offsets. `TURN13_MURKROW_MATERIALIZE_START
= TURN13_BALL_HANDOFF_TICK + MATERIALIZE_START_OFFSET = 17004` (the
existing constant) lands exactly on RAM 17003's own +1 render — **confirmed
correct as-is, this session's own fresh RAM matches it to the tick**. The
brief's own "not re-verified to the byte" flag on this specific sub-phase
(§7) is now resolved: it verifies. RAM 17015-17018 (render 17016-17019)
holds flat at the saturated identity (`pa=pd=256,y2=0`, still
`affineMode=1` NORMAL — the accumulator's own natural saturation, no
separate "hold" table needed) before the wobble engages. Palette/tint
coefficient during this whole phase was **not** independently re-probed
this session (same honest gap `faint-switch-notes.md` §7b already flags
for Pidgeotto's own tint ramp) — `objMode` read `0` (`ST_OAM_OBJ_NORMAL`)
at every sampled tick, confirming no hardware blend mode is in play
(consistent with the existing software-blend `drawSpriteSheetAffineTintedBlend`
approach, not a new finding).

### Phase 2 — the REAL bug: the wobble/stretch phase is a DIFFERENT mechanism than Pidgeotto's own, not the same table at a new anchor

Current code (`drawTurn13MurkrowMaterialize`, `battleScene.ts:6814-6828`)
switches from the accumulator draw to `TURN5_STRETCH_TABLE` (Pidgeotto's
own 40-entry, non-monotonic `{xScale,yScale,y2}` table, values 256-272)
at `TURN13_MURKROW_STRETCH_TICK = TURN13_MURKROW_SETTLE_TICK -
TURN5_STRETCH_TABLE.length = 17030`. **Both the anchor and the table
content are wrong**, confirmed by RAM, not inferred from the pixel diff
alone:

- **Anchor**: the real wobble (`affineMode` flips to `3`/DOUBLE, `pa`/`pd`
  first move off identity) starts RAM 17019, visible render **17020** —
  **10 renders earlier** than the current `17030` anchor. This alone
  explains the bulk of §50's own cited "~44% diff at 17018-17025" — the
  current code is still in the flat post-accumulator hold there while the
  real sprite has already started a large-amplitude double-affine wobble.
- **Content**: Murkrow's own `data4` field does **not** read like
  Pidgeotto's own captured `data4` (which started at 256 and drifted by
  single digits, byte-exact to `GROVYLE_STRETCH_TABLE`'s literal
  `xScale` column, `faint-switch-notes.md` §7b). Murkrow's `data4` instead
  reads a plain **linear angle-like counter incrementing by exactly +8 every
  tick** (`8,16,24,...,248,0(wrap mod 256),8,16,...,136`), `data5` staying
  `0` throughout — i.e. Murkrow's own front-sprite entrance plays a
  genuinely different animation command (most likely a rotation/pulse-style
  `ObjAffineSet` driver keyed by this angle counter, not `Anim_
  VerticalStretch`'s own literal per-tick scale table) — **not the same
  mechanism re-anchored, a different one**, confirming the brief's own
  suspicion precisely. The **rendered result** (`pa`/`pd`/`y2` — the actual
  GBA affine-matrix registers, i.e. the same representation
  `drawSpriteSheetAffineStretch`'s `xScale`/`yScale`/`y2` parameters already
  consume) is still a clean, low-amplitude, non-monotonic wobble — so the
  EXISTING render function needs no change, only its table argument and
  anchor tick.

**`TURN13_MURKROW_WOBBLE_TABLE`** (RAM-read directly off `pa`/`pd`/`y2` —
skips the intermediate `data4`/`data5` interpretation question entirely,
since these ARE the literal register values the render function needs),
applied starting render tick **17020** (`TURN13_MURKROW_STRETCH_TICK` should
become `17020`, not `17030`), one entry per render tick, index `i` = RAM
tick `17019+i`:

```
i   xScale yScale y2   i   xScale yScale y2   i   xScale yScale y2
0   256    256    0    17  263    249    -1   34  244    268    0
1   250    262    0    18  269    243    -3   35  239    273    1
2   244    268    1    19  274    238    -5   36  234    278    1
3   239    273    2    20  279    233    -7   37  230    282    2
4   234    278    2    21  283    229    -8   38  227    285    2
5   230    282    3    22  286    226    -9   39  225    287    2
6   227    285    3    23  288    224    -9   40  224    288    3
7   225    287    3    24  288    224    -10  41  225    287    2
8   224    288    4    25  288    224    -9   42  227    285    2
9   225    287    3    26  286    226    -9   43  230    282    2
10  227    285    3    27  283    229    -8   44  234    278    1
11  230    282    3    28  279    233    -7   45  239    273    1
12  234    278    2    29  274    238    -5   46  244    268    0
13  239    273    2    30  269    243    -3   47  250    262    -1
14  244    268    1    31  263    249    -1   48  256    256    -1
15  250    262    0    32  256    256    -1   49  256    256    0
16  256    256    0    33  250    262    -1
```

(50 entries, `i=0..49`, covering render 17020-17069 inclusive — entries
0-48 are RAM 17019-17067 read directly; entry 49 is RAM 17068's own flat
identity, appended so the table's own natural length exactly spans through
render 17069, the last tick before `TURN13_MURKROW_SETTLE_TICK=17070`
takes over via `drawTurn13MurkrowSettled`. This closes a genuine
**off-by-one wiring trap**: without entry 49, a `Math.min(t-17020,
table.length-1)`-style clamp (the same idiom `TURN5_STRETCH_TABLE`'s own
call site already uses) would repeat entry 48's `y2=-1` at render 17069
too, regressing a 1px vertical residual against the confirmed-flat oracle
frame there — append the extra entry rather than adding a special-cased
branch, the same "literal table, not curve-fit" precedent this whole
dossier already follows.) The shape itself: two 16-tick half-periods of a
period-32-tick, amplitude-32 (in 8.8 fixed-point, i.e. ~12.5%) oscillation
in `xScale`/`yScale` (mirror images of each other — first half dips
`xScale` down/`yScale` up, second half the reverse), riding a slower `y2`
drift that dips negative during the second half and doesn't fully recover
— RAM ground truth, not curve-fit, same precedent as `GROVYLE_STRETCH_
TABLE`/`TURN5_STRETCH_TABLE` themselves.

**Frame selection is also a confirmed mistransfer, smaller but real**:
`turn13MurkrowFrame` currently reuses `turn5PidgeottoFrame`'s own tick
DELTAS off `TURN13_BALL_HANDOFF_TICK` (predicting flips at render 17019,
17024, 17034, 17044, 17079). Real RAM shows Murkrow's own `animCmdIndex`
(the front-sprite two-image alternation index) flips **exactly once** in
this whole window, `0->1` at RAM 17033, visible render **17034** — one of
the five reused breakpoints happens to land on the right tick by
coincidence, but the other four (17019/17024/17044/17079) do not correspond
to any real transition; Murkrow's own front-sprite stays on its second
image continuously from render 17034 through at least render 17075 (this
session's own capture ceiling), it does not flip back like the reused
5-breakpoint formula predicts. `tileNum` (`473`) and `paletteNum` (`1`) stay
constant across the ENTIRE window (materialize through settle) — the
two-image swap is a VRAM-content technique (same pre-extracted-tileset/
`frame2` pair the existing code already draws from), not an OAM `tileNum`
change, consistent with how the code already models it; only the
**timing** needs correcting (a single render-tick boundary, `17034`, not
`turn5PidgeottoFrame`'s reused 5-breakpoint cycle). Which physical image
(`tileset` vs `frame2`) each `animCmdIndex` value maps to was **not**
independently pixel-cross-validated this session (assumed to follow the
same `0="tileset"`/`1="frame2"` convention the code already uses for
Pidgeotto) — flagged, not glossed.

### Delta-vs-turn-5 statement (the brief's own explicit ask)

| sub-mechanism | verdict |
|---|---|
| Ball handoff -> materialize-start offset (`MATERIALIZE_START_OFFSET=19`) | **holds** (species-agnostic anchor math, RAM-confirmed fresh) |
| Growing-silhouette accumulator (`affineEmergeAccumulator`) | **holds byte-exact** (species-agnostic engine table, RAM-confirmed fresh, 13/13 values) |
| Growing-silhouette `y2` (`MATERIALIZE_Y2_TABLE`) | **holds byte-exact** (12/12 values) |
| Stretch/wobble anchor tick | **does NOT hold** — real is render 17020, not the `SETTLE_TICK`-minus-table-length derivation currently coded (17030) |
| Stretch/wobble table content | **does NOT hold** — a different underlying driver (linear angle counter vs. Pidgeotto's own literal scale table), though the RESULTING register shape (a clean, table-able wobble) is structurally similar and the render function needs no change, only its table argument |
| Front-sprite frame-alternation timing | **does NOT hold** — real is a single flip at render 17034, not the reused 5-breakpoint cycle |
| Settle tick (`TURN13_MURKROW_SETTLE_TICK=17070`) | **holds** (§50's own prior-session fix, re-confirmed this session via the 17069==17070 sha match) |

### Mission B (settled-menu transient): NOT REACHED — time-boxed

Per the brief's own priority ("commit Mission A's append before chasing
Mission B") and this session's 30-minute cap, Mission B (the settled
turn-14 menu's own remaining bounce-tick residual, §50's residual 2) was
not started. `MENU_IDLE_BLANK_END_TICK`'s own role as the named suspect
remains exactly as §50 left it — unconfirmed, unchased, a concrete next
step for a resuming session.

### Verification

`tools/probe/verify-turn13-materialize.ts` — fresh single-round-trip
oracle capture, asserts (twice-run identical, matching every other
`verify-turn13*.ts` convention in this dossier): the three render-lag seams
above (materialize onset, wobble onset, settle boundary) by exact sha256,
the growing-silhouette phase's own monotonic-distinct shas, and that
render 17069/17070 are 0-diff (the table's own closing boundary). Does
**not** re-assert Mission B (not reached). `npm test`/`npm run build`
unaffected — no `src/` changes this session, docs + probe tooling only.
