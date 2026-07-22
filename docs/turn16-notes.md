# Turn 16 ground truth dossier (S7/S8 worktree scout, oracle + RAM probing only): the first MAGBY-vs-MURKROW turn — real speed order, FIRE_PUNCH's burn, and the run's first status-icon ground truth

**Headline**: this is `battle-turn-notes.md` §16 HEADLINE 2's own coarse "turn 1" row,
now ground-truthed to the tick and byte. **MURKROW acts first** (speed 97 vs
MAGBY's 89 — `gBattlerAttacker`→1 at tick 20779, the first RAM-confirmed
speed-order read for this exact matchup), and lands **FAINT_ATTACK** (always-hits,
zero accuracy roll — `EFFECT_ALWAYS_HIT`/`accuracy=0`, source-confirmed) for a
computed **59**, MAGBY **138→79** at tick 21147. MAGBY answers with
**FIRE_PUNCH** — which, unlike FAINT_ATTACK, **does roll a real accuracy check
even at 100%** (RAM+source-confirmed contrast, same shape turn15 already
proved for FLY's strike half vs. its charge half) — hits for **67**, MURKROW
**142→75** at tick 21406, then **procs its own 10% secondary burn** 5 ticks
later (tick 21411, `status1` 0→**16** = `STATUS1_BURN`): **the first
status-condition RNG roll this dossier has ever caught landing.** The
burn's own end-of-turn residual (`floor(142/8)=17`, matching turn 17's
already-known formula) fires at tick 21714, MURKROW **75→58**, with "Foe
MURKROW is hurt by its burn!". **A "BRN" status icon renders on MURKROW's
healthbox** between ticks 21540 (absent) and 21548 (present) — **the first
status-icon pixel ground truth in this entire run, closing ISSUES #16's
"never-yet-exercised" flag, LOUDLY: it is real, it is a small orange badge
left of the level number, and it persists on-screen through the settled
turn-17 menu.** One brief question resolved by source, not assumption:
**FLAME_BODY does NOT proc** off FAINT_ATTACK's contact this turn — not
because the 33% roll failed, but because **FAINT_ATTACK carries no
`FLAG_MAKES_CONTACT` in this ROM's move data** (`battle_moves.h`,
confirmed below), so the ability's own contact-retaliation branch never
even calls `Random()`; a *different*, unattributed RNG step at tick 21152
was initially hypothesized to be this proc and was **ruled out**, not
confirmed — see §2. INSOMNIA shows no interaction of any kind this window
(source-checked: no contact hook exists for it). The turn settles into
**"What will MAGBY do?" for turn 17 by tick ~21725** (79/138 MAGBY unburned,
58/142 MURKROW burned), 48 ticks before this trace's own scripted end
(21773).

## 1. Committed trace and prefix-consistency verdict

Extends `battle1-turn15-dense.json`'s own committed 122-segment/20745-tick
script (carried verbatim, unmodified) with `battle1-winline-b-swap.json`'s
own `segments[122:126]` (4 segments: `A` opens the FIGHT submenu — cursor
defaults to FIRE_PUNCH, slot 0 — 27f settle, `A` confirms, then a single
999f resolution-idle segment covering the entire turn: FAINT_ATTACK,
FIRE_PUNCH, the burn proc, both HP drains, and the settle into turn 17's
own menu) — **126 segments, 21773 ticks total**.

Committed: **`battle1-turn16-dense.json`** (256 captures, at the density
cap): dense stride-1 across the FIGHT-submenu open/confirm (20745-20775),
FAINT_ATTACK's kickoff-text/crit/damage-roll cluster (20775-20825), the
HP-write/move-transition/accuracy-roll cluster (21140-21170), FIRE_PUNCH's
crit/damage-roll cluster (21185-21200), its HP-write/burn-roll cluster
(21400-21420), the `gCurrentMove` reset (21548-21560), the burn-residual/
tail-RNG cluster (21705-21735), and the final settle (21760-21773); stride
12-18 sparse over the two animation/text-hold windows (20825-21140,
21200-21400, 21420-21548, 21560-21705).

**Twice-run byte-identical** via `bin/oracle run` (two independent runs,
manifests 256/256 diffed, **0 sha mismatches**).

**Flatten-and-compare prefix check** (programmatic, same method as
`turn15-notes.md` §1): flattened this trace's full 126-segment/21773-tick
button script against `battle1-turn15-dense.json`'s own 122-segment/
20745-tick script — **0 diffs** across all 20745 shared ticks
(`turn15-dense ⊂ turn16-dense`, script-exact) — and separately against
`battle1-winline-b-swap.json`'s own full 156-segment/33031-tick script —
**0 diffs** across all 21773 ticks this trace covers (`turn16-dense ⊂
winline-b-swap`, script-exact). Both checks done by flattening every
segment to a per-tick button-state string and diffing arrays
index-for-index, not spot-checked.

## 2. RNG-consumption ledger (RAM-truthed, full per-call attribution)

New watch spec `tools/probe/specs/turn16-rng-watch.json` (extends
`turn15-rng-watch.json`'s column set with `attacker`/`target`/`critMult`/
`moveDmg`/`status1` for both battlers/`pp0_0`, run via `ram-probe.py`
against this session's own committed trace, `startTick=20700`,
1074 rows). Cross-checked against the independently-generated,
already-committed `battle1-winline-b-murkrow-fight-ram-dump.json` (from
`battle-turn-notes.md` §16, `perTickWatch` covering the identical window
from a *different* watch spec/run) — every `rng`/`hp0`/`hp1`/`curMove`/
`status1_1` value at every shared tick matches exactly between the two
independently-run probes.

| tick | steps | attribution |
|---|---|---|
| 20779 | 0 (state only) | `gBattlerAttacker`→**1** (MURKROW) — **the first RAM-confirmed speed-order read for this exact matchup**: MURKROW's speed (97) beats MAGBY's (89, both read from the entering battler dump, §3) |
| 20780 | 0 (state only) | `gCurrentMove`→**185 (FAINT_ATTACK)** |
| 20816 | 1 | **critical-hit roll** (`critcalc`) — no crit (`gCritMultiplier` stays 1) |
| 20819 | 1 | **damage-variance roll** — `gBattleMoveDamage` settles at **59** (steps 0→41→61→**59**, last step coincident with this roll); **no accuracy roll at all** for FAINT_ATTACK — `EFFECT_ALWAYS_HIT`/`.accuracy = 0` (`battle_moves.h:2408-2419`, source-confirmed) — same mechanism turn15 already proved for a *different* move (FLY's charge half) |
| 21147 | 0 (HP write) | `hp0` (MAGBY) **138→79**, exactly `-59`, matching `gBattleMoveDamage` |
| **21152** | 1 | ~~unattributed~~ **ATTRIBUTED (supervisor fold 2026-07-21, `docs/rng-attribution-notes.md`): `Cmd_seteffectwithchance`'s UNCONDITIONAL secondary-effect roll (`battle_script_commands.c:2923` — `Random()` is the first `&&` operand, consumed even at `secondaryEffectChance=0`; FAINT_ATTACK's chance is 0, so the roll is a silent no-op). The +5 offset = 4 intervening script commands at minimal cost.** Original analysis (correctly ruling out FLAME_BODY) kept below — occurs after FAINT_ATTACK's own HP write and before `gBattlerAttacker`/`gCurrentMove` flip to FIRE_PUNCH. **Hypothesized and RULED OUT**: MAGBY's ability FLAME_BODY has a contact-retaliation proc (`AbilityBattleEffects` case `ABILITYEFFECT_ON_DAMAGE`, `battle_util.c:2836-2849`, `(Random() % 3) == 0` to burn the attacker) — but it requires `FLAG_MAKES_CONTACT` on the incoming move, and **FAINT_ATTACK's own flags in this ROM (`battle_moves.h:2418`) do NOT include `FLAG_MAKES_CONTACT`** (a real, source-confirmed Gen-3 quirk: Faint Attack never triggers contact-based abilities in this generation), so that branch's `Random()` call is short-circuited away entirely and can't be this step's source. Not independently root-caused this session — same open-item family as `turn13-notes.md`/`turn14-notes.md`/`turn15-notes.md`'s own single per-turn "tail" rolls, here occurring mid-turn instead of at turn-end |
| 21166 | 1 | **FIRE_PUNCH's own accuracy roll** — succeeds (100% accuracy, but still a real roll: contrast FAINT_ATTACK's zero-roll skip above — the same "0-accuracy moves skip the check entirely; even 100%-accuracy moves still roll" rule `turn15-notes.md` §2 first established for FLY's strike vs. charge halves, now independently reconfirmed for a third move pair) |
| (21190) | 0 (PP write) | `pp0_0` (MAGBY's FIRE_PUNCH slot) **15→14** |
| 21191 | 1 | **critical-hit roll** — no crit |
| 21194 | 1 | **damage-variance roll** — `gBattleMoveDamage` settles at **67** (steps 0→53→79→**67**) |
| 21406 | 0 (HP write) | `hp1` (MURKROW) **142→75**, exactly `-67` |
| **21411** | 1 | **FIRE_PUNCH's own secondary-effect roll** — `EFFECT_BURN_HIT`, `.secondaryEffectChance = 10` (`battle_moves.h:94-105`, source-confirmed) — **succeeds**: `status1_1` (MURKROW) **0→16 (`STATUS1_BURN`)**, same tick as the roll. This is a genuinely different code path from FAINT_ATTACK's ability-proc check above (this one runs from the move's own `secondaryEffectChance` in the move-effect dispatch, not `AbilityBattleEffects`) |
| 21553 | 0 (state only) | `gCurrentMove`→0 (FIRE_PUNCH's own script chain winds down) |
| 21555 | 0 (state only) | `gBattlerAttacker`↔`gBattlerTarget` swap (1/0), `gBattleMoveDamage`→**17** — burn-residual damage precomputed (`floor(142/8) = 17.75` floored, exact match) |
| 21714 | 0 (HP write) | `hp1` (MURKROW) **75→58**, exactly `-17` — burn's own end-of-turn residual, **zero RNG cost** (a fixed formula, not a roll) — "Foe MURKROW is hurt by its burn!" (PNG-confirmed, §4) |
| 21719 | 1 | tail cluster step 1 — `attacker`/`target` toggle 1/0→0/1 |
| 21724 | 1 | tail cluster step 2 — **5 ticks later**, `attacker`/`target` settle 0/0. Same shape as the switch-in "AI-prescoring cluster" `turn14-notes.md`/`turn15-notes.md` both documented (there: 2 steps, 6-7 ticks apart, at a switch-in settle) — **here it's the first time this shape has been seen mid-battle, not at a switch-in**, suggestive of a general "AI re-scores the opponent's next move at every turn boundary" mechanism (MURKROW is AI-controlled and picks FAINT_ATTACK again for turn 17 per `battle-turn-notes.md` §16's own table) — plausible, **not independently root-caused this session** |

**Total: 8 `Random()` calls this window** (20745-21773) — versus turn15's
6, consistent with this turn resolving *two* full move executions instead
of one strike-half. Stat stages (`atkStage0`/`atkStage1`) stay at neutral
`6` for **both** battlers the entire window — neither move has a
stat-changing secondary effect, confirmed not assumed.

## 3. Turn order, battler stats, PP, and the exact clear ticks (RAM-confirmed)

`dump-battler-full.py` snapshots at four natural boundaries (20745 entering,
21150 mid-turn — after FAINT_ATTACK connects, before FIRE_PUNCH's own HP
write — 21420 after FIRE_PUNCH + burn proc, 21773 the settled end):

| | MAGBY (battler0) | MURKROW (battler1) |
|---|---|---|
| species/level (unchanged all window) | MAGBY 240, Lv50 | MURKROW 198, Lv50 |
| speed (RAM-read, entering) | **89** | **97** — faster, acts first (§2) |
| moves (source-confirmed vs `constants/moves.h`) | FIRE_PUNCH(7)/SMOKESCREEN(108)/CONFUSE_RAY(109)/SMOG(123), PP 15/20/10/20 entering → **14**/20/10/20 after FIRE_PUNCH | FAINT_ATTACK(185)/FLY(19)/TORMENT(259)/TAUNT(269), PP unchanged (FAINT_ATTACK's own PP not tracked this session — flagged open, not needed for this turn's numbers) |
| ability | MAGBY = **FLAME_BODY (49)** — checked, no proc this window (§2) | MURKROW = **INSOMNIA (15)** — no interaction of any kind (no contact/sleep-relevant hook fires; source-checked, `battle_util.c`/`battle_script_commands.c` INSOMNIA references are all about self-wake-prevention, irrelevant here) |
| item | MAGBY = LAX_INCENSE (221), unchanged | MURKROW = LAX_INCENSE (221), unchanged — no proc (matches turn15's own finding: passive evasion-only item) |
| HP | 138/138 → **79/138** (tick 21147, −59) | 142/142 → **75/142** (tick 21406, −67) → **58/142** (tick 21714, −17 burn residual) |
| status1 | **0** the entire window (MAGBY never burned/afflicted) | 0 → **16 (`STATUS1_BURN`)** at tick 21411, held through the window's end |
| stat stages | all-neutral `6` throughout | all-neutral `6` throughout |

`gBattlerAttacker`/`gBattlerTarget` confirm the full dispatch order:
`1`/`0` (MURKROW→MAGBY) for FAINT_ATTACK, then `0`/`1` (MAGBY→MURKROW) for
FIRE_PUNCH, then `1`/`0` again for the burn-residual application (damage
applied *to* MURKROW is bookkept with MURKROW as the nominal "attacker" of
its own residual tick — the same convention `gBattleMoveDamage`'s
precompute at 21555 already shows).

## 4. Pixel/window boundary table (sha256-cited, 12 hex chars, twice-run identical, PNG-read directly)

| boundary | tick | sha256 (12) | note |
|---|---|---|---|
| carried settled "What will MAGBY do?" menu (entering) | 20745 | `5950e7b3d8ba` | **PNG-confirmed**: MAGBY 138/138, MURKROW 142/142, both healthy, no status |
| **FIGHT submenu open, MAGBY's own moveset — first-ever observation** | 20770 | `533d43f7a773` | **PNG-confirmed, dense-read**: `FIRE PUNCH`(cursor)/`SMOKESCREEN`/`CONFUSE RAY`/`SMOG`, **`PP 15/15`** shown for the cursor slot, **`TYPE/FIRE`** footer — identical 4-move 2×2 layout + PP-and-type-footer shape to every prior turn's submenu (Onix/Grovyle), new content only |
| "Foe MURKROW used" typing in | 20800 | `557d261b5dba` | **PNG-confirmed, partial text** |
| "Foe MURKROW used\nFAINT ATTACK!" held, screen tinted reddish-pink (Dark-type flash effect) | 20819 → `3a6ea1bf4cd1`, 20951 → `9042f3f1afe1`, 21023 → `e4a415cb85ad` | see cells | **PNG-confirmed**: background briefly tints solid dark pink/red (~20951), Murkrow's sprite lunges toward MAGBY, clears by ~21023 — coarse mechanism sketch only, sparse stride-18 sampling in this window, not frame-exact (open item, §5) |
| MAGBY's HP bar mid-drain (93/138 shown, RAM already 79 by write-tick) | 21131 | `d28dd01e52fd` | **PNG-confirmed**: on-screen bar animation lags the RAM write, same established pattern as every prior HP drain in this dossier |
| "MAGBY used\nFIRE PUNCH!", fire-particle burst around MAGBY's own sprite | 21218 | `5123afd2b167` | **PNG-confirmed**: particle animation at cast, coarse sketch only (open item, §5) |
| FIRE_PUNCH's HP write (RAM 142→75; bar not yet visually drained) | 21406 | `84551bcb11c3` | **PNG-confirmed** — same RAM-ahead-of-pixel shape as every prior hit |
| burn-proc tick (RAM `status1`→16; same rendered frame as above, pre-message) | 21411 | `84551bcb11c3` | identical sha to 21406 — no visible change yet, confirms the burn *roll* is invisible until the message prints |
| "Foe MURKROW was burned!" typing in | 21465 | `4417d12683c8` | **PNG-confirmed, partial text** — first appears between 21450 (absent) and 21465 (typing) |
| BRN badge **absent**, message still held | 21540 | `b8c88efbcf21` | **PNG-confirmed absent** |
| **BRN badge PRESENT on MURKROW's healthbox** | 21548 | `2c52a3119ee4` | **PNG-confirmed, the run's first status-icon ground truth** — small orange/red badge left of "Lv50"; exact render tick not pinned (falls in the unread 21541-21547 window — open item) |
| `gCurrentMove` resets, "Foe MURKROW was burned!" still held (same rendered frame as 21548) | 21553 | `2c52a3119ee4` | RAM already past the message; text/badge unchanged on screen |
| "Foe MURKROW is hurt\nby its burn!" | 21714 | `06888de6033d` | **PNG-confirmed**, coincides exactly with the burn-residual HP write |
| settled "What will MAGBY do?" (turn 17), BRN badge still visible | 21725 → `74fd1d0f11f9` (held through 21735) | see cell | **PNG-confirmed**: MAGBY 79/138 unburned, MURKROW 58/142 with BRN badge — settle actually lands at/by tick **21725**, 48 ticks before this trace's own scripted end |
| this trace's own scripted end | 21773 | `0b1748b6c28c` | same settled state, held |

Every sha256 above was read directly from this session's own committed
trace's first-run manifest (`bin/oracle run`'s output), at exactly the
cited tick — not sha-reproduction-only, PNG-read as noted.

## 5. Reuse-map verdict (engine planning payload)

**(a) FIGHT submenu (MAGBY's own moveset).** **VERBATIM shape** vs. every
prior turn's submenu (Onix's DRAGON_BREATH-era screens, Grovyle's) —
4-move 2×2 grid, `PP <cur>/<max>` for the cursor slot, `TYPE/<TYPE>` footer.
Exact strings this turn: `FIRE PUNCH`/`SMOKESCREEN`/`CONFUSE RAY`/`SMOG`,
`PP 15/15`, `TYPE/FIRE`. Nothing new for an engine slice beyond fresh
content — the layout/PP-format/footer machinery is already proven.

**(b) Kickoff text timing.** This turn's own dispatch constants: `A`
(submenu open) at 20745 → submenu rendered by 20770 (25 ticks) → `A`
confirm at 20773 → 27 ticks later the FAINT_ATTACK attack-string starts
typing (~20800). Same rough shape as prior turns; not compared
tick-for-tick against a different move's own kickoff this session
(`turn6-notes.md`'s own finding that per-turn dispatch constants differ —
not re-litigated here, flagged open if a resuming session needs the exact
generalization).

**(c) FAINT_ATTACK's animation — NEW, never seen before.** Coarse sketch
only (§4): a solid reddish-pink screen tint (a Dark-type "flash" effect,
plausibly a palette-swap of the background during the lunge), Murkrow's
own sprite lunges toward MAGBY, clears within ~200 ticks. **Not a
frame-exact extraction** — this session's stride-18 sparse sampling
across the animation window is enough to characterize the shape, not to
pin exact sub-frame timing or the sprite/OAM inventory a real engine slice
would need. Flagged open for a dedicated dense pass.

**(d) FIRE_PUNCH's animation — NEW, never seen before.** Coarse sketch
only (§4): a fire-particle burst rendered around MAGBY's own sprite at
cast (self-directed, not a projectile arriving at the target in the
frames sampled). Same "not frame-exact" caveat as (c) — flagged open.

**(e) HP-drain machinery.** **VERBATIM** — same slow-bar-animation-lags-
RAM-write shape as every prior HP change in this dossier (turn13-15).

**(f) Burn's own secondary-effect roll and residual formula.**
**Independently reconfirmed** vs. `battle-turn-notes.md` §16's own
(differently-probed) finding: `floor(maxHP/8)` residual, RAM-derived here
via a *different* watch spec and cross-checked byte-for-byte against the
pre-existing `battle1-winline-b-murkrow-fight-ram-dump.json` (§2) — same
numbers, independently arrived at.

**(g) Status-icon rendering — NEW, this session's own headline finding.**
The "BRN" badge is real, renders on the afflicted battler's healthbox
(not the field/message layer), appears with a several-tick delay after
both the RAM `status1` write (21411) and the "was burned!" message
(~21465) — not simultaneous with either. Exact render tick **not pinned**
(21541-21547 window, §4) — an engine slice would need a tighter capture
pass to nail the precise tick and the badge's own sprite/tile source, but
the mechanism (delayed badge draw, persists across the menu boundary) is
now confirmed to exist and roughly when it appears.

**(h) Turn-end bookkeeping / AI-prescoring cluster.** **Same-shape, new
context**: the 2-step, ~5-tick-apart RNG cluster (21719/21724) matches
`turn14-notes.md`/`turn15-notes.md`'s own switch-in "AI-prescoring"
finding exactly in shape, but this is the **first time it's been caught
mid-battle** rather than at a switch-in — suggestive that this is a
general per-turn-boundary AI move-rescoring step, not switch-specific.
**Not independently root-caused this session** (no `gAiLogicData` or
equivalent watched) — flagged open, consistent with this dossier's
honesty convention.

## Verification

`npm test` and `npm run build` green — no `src/` changes this session;
new artifacts are `tools/compare/traces-groundtruth/battle1-turn16-
dense.json`, `tools/probe/specs/turn16-rng-watch.json`, and this doc. New
trace twice-run via `bin/oracle run`, manifests (256/256) diffed
byte-identical across two independent runs, 0 sha mismatches.
Prefix-consistency checked programmatically both against
`battle1-turn15-dense.json`'s own full 122-segment script (0 diffs, all
20745 shared ticks) and against `battle1-winline-b-swap.json`'s own full
156-segment script (0 diffs, all 21773 ticks this trace covers). RAM
probes: `ram-probe.py` with the new watch spec (run once against the
committed trace, cross-checked tick-for-tick against the pre-existing,
independently-probed `battle1-winline-b-murkrow-fight-ram-dump.json` —
identical `rng`/`hp0`/`hp1`/`curMove`/`status1_1` values at every shared
tick); `dump-battler-full.py` snapshots at ticks 20745/21150/21420/21773,
cross-reconciled against the per-tick watch. Every sha256 cited in §4 was
read directly from this session's own committed trace's first-run
manifest at exactly the cited tick. Every PNG text/state claim (headline,
§4-§5) was read directly from a rendered frame, not inferred from RAM
alone, including the negative/narrowing findings (FLAME_BODY ruled out by
source in §2; the BRN badge's own appearance window narrowed by direct
frame comparison in §4). Source citations (§2-§3, `battle_util.c`,
`battle_moves.h`, `constants/moves.h`, `constants/abilities.h`,
`constants/items.h`) are read-only references used to explain and
cross-check RAM-observed behavior — no `src/` files were touched.

**PAPERCUT**: none this session beyond what's already flagged above as
open items (animation frame-exactness, the unattributed tick-21152 roll,
the BRN badge's un-pinned exact render tick) — none cost meaningful time,
they're honest scope boundaries given the 40-minute cap, not friction.

## 6. Worktree retrofit (2026-07-21, S7/S8 wiring-ready pass): BRN badge exact
   tick PINNED + both animations' task lifetimes RAM-confirmed against source

Ships `tools/probe/verify-turn16.ts` (233 captures, single oracle round trip,
twice-run byte-identical) — same convention as `verify-turn13.ts`/
`verify-turn14.ts`/`verify-turn15.ts`: re-derives every §4 citation from a
fresh `bin/oracle run` against the committed `battle1-turn16-dense.json`
(unmodified), dense-rebisecting every approximate/sparse-sampled row. **No
citation slips found this pass** (unlike turn13-15's retrofits, which each
found 1-7) — every previously-exact §4 sha still reads at its cited tick.
Two genuine gaps were closed:

### 6.1 MISSION 1 — the BRN badge's exact appearance tick: **21542**

Stride-1 capture across 21535-21555 (`bin/oracle run`, twice-run identical)
finds a **clean single-tick swap**: tick 21541 still reads the absent sha
(`b8c88efbcf21`, matching §4's own 21540 citation), tick **21542** is the
FIRST tick reading the present sha (`2c52a3119ee4`, matching §4's own 21548
citation) — every tick in the sampled window is one or the other, **no
third transitional/partial-draw state exists**. This **closes ISSUES #16's
named sparse-capture gap** exactly: the badge is drawn in one frame, not
faded or wiped in.

**Source-confirmed mechanism** (`battle_interface.c:1993`,
`UpdateStatusIconInHealthbox`, called from `UpdateHealthboxAttribute(...,
HEALTHBOX_STATUS_ICON)` — battle_interface.c:1408/1433/2209/2230): for
`STATUS1_BURN` this is a **direct `CpuCopy32` VRAM tile blit** (3 tiles ×
32 bytes = 96 bytes, at `gSprites[healthboxSpriteId].oam.tileNum +
tileNumAdder`, `tileNumAdder = 0x11` for an opponent-side singles
healthbox) plus a **single OBJ-palette-slot recolor** (`FillPalette` with
`sStatusIconColors[PAL_STATUS_BRN] = RGB(28,14,10)` — GBA 15-bit color;
its 24-bit expansion, `(231,115,82)`, is exactly the badge-interior color
sampled from the oracle's own PNG, confirming the palette-index match, not
just a visual guess). This is a synchronous memory write, not a
sprite/task animation — **RAM-confirmed independently**: a full
`gTasks[]`/`gSprites[]` callback dump (`dump-task-and-sprite-callbacks.py`,
20770-21773) shows **zero active tasks at tick 21542** (the nearest task,
`Task_DoStatusAnimation` — `battle_anim_status_effects.c:554`, created at
tick 21412 right after the burn-proc roll — already finished by tick 21449,
93 ticks *before* the badge draws), so the badge's own delayed appearance
(21411 RNG roll → ~21465 message-typing → 21542 badge → its own message
box logic, not any lingering animation task) is driven by the
message/script controller's own pacing, not a task lifetime. **CORRECTS
§4/§5g's own "badge appears with a several-tick delay after ... the 'was
burned!' message" framing**: the delay from message-typing-start (~21465)
to badge (21542) is **77 ticks**, not "several" — a full extra beat after
the message, not incidental to it. Not independently root-caused *which*
script step fires the `UpdateHealthboxAttribute` call at exactly 21542 (no
`BattleScript_*` step was traced this session) — flagged open, but the
call site and VRAM-write mechanics are now fully source-pinned.

**Badge geometry + healthbox layout-shift question (the mission's own
second ask), pixel-measured**: diffing the oracle's own rendered frames at
21540 (absent) vs 21548 (present, held) gives a diff bounding box of
**x=[20,51] y=[30,37] (32×8 px), 183 changed px** — entirely to the LEFT of
the health bar's own first rendered (green) pixel column, which is
**x=52 in BOTH frames, bit-identical** (`cropDiffCount` over x∈[52,239]
y∈[29,39] = 0). **The health bar itself does NOT move, shrink, or
recompress** — CORRECTS this dossier's own §4/headline description ("a
small orange badge left of the level number"): pixel evidence shows the
badge does not appear near "Lv" at all — it **REPLACES the "HP" icon-label
glyph in the same fixed 32×8 box immediately left of the bar** (matching
source exactly: the `else` branch of `UpdateStatusIconInHealthbox`, taken
when `status == 0`, draws `HEALTHBOX_GFX_39` — a plain "HP" glyph — into
this identical tile range; the STATUS1_BURN branch overwrites the same
tiles with the BRN glyph via the same `tileNumAdder` offset, so it's a
content swap of one fixed slot, confirmed both ways). One source-level
nuance the pixel diff alone doesn't show: for `IsDoubleBattle() == TRUE ||
GetBattlerSide(battler) == B_SIDE_OPPONENT` (true here — MURKROW is the
opponent), the same function ALSO `CpuCopy32`s two replacement tiles
(`HEALTHBOX_GFX_0`/`HEALTHBOX_GFX_65`) into the health bar sprite's own
leftmost tiles — a **cosmetic end-cap tile redraw**, source-confirmed to
run every time `UpdateStatusIconInHealthbox` fires for an opponent-side
battler (both the "gained a status" and "status cleared" directions), but
one that provably does NOT move the bar's visible fill (0-diff check
above) — engine spec takeaway: **implement this as two independent fixed
regions (label-icon box + bar) with the bar's cap tiles re-blitted on every
status-icon update, not as a single repositioned bar**.

**Static vs. blinking, once shown**: the badge's own 32×8 region is
**pixel-identical** (0-diff `cropDiffCount`) across ticks 21548→21600→
21714→21725→21773 (spanning the burn-residual message, the settle into
turn 17's menu, and the trace's own scripted end) — **the badge is
static once drawn, no blink/animation cycle**, confirming §5g's own
qualitative claim with an exact 0-diff pixel measurement instead of a
visual read.

### 6.2 MISSION 2 — FAINT_ATTACK's and FIRE_PUNCH's animations: task
    lifetimes RAM-confirmed exactly against their own battle-anim scripts

Both `Move_FAINT_ATTACK` (`battle_anim_scripts.s:5156`) and
`Move_FIRE_PUNCH` (`battle_anim_scripts.s:6959`) are **multi-sprite/
multi-task composites, NOT the ISSUES-#23 linear-translation-projectile
family** — confirmed by source read, then independently RAM-confirmed via
a full `gTasks[]` func-pointer dump (`dump-task-and-sprite-callbacks.py`
over 20770-21773, function pointers resolved against
`arm-none-eabi-nm -n --defined-only pokeemerald.elf`, Thumb bit masked).

**FAINT_ATTACK task-lifetime ledger** (RAM-confirmed, tick-exact):

| tick range | task (resolved symbol) | matches script step |
|---|---|---|
| 20826-21008 (with gaps) | `Task_UpdateMonBg` | `monbg ANIM_ATTACKER`/`monbg ANIM_TARGET` |
| 20829-20866, 21008-21046 | `Task_FadeToBg` | `fadetobg BG_DARK` ... `restorebg`/`waitbgfadein` (fires TWICE — in, then back out) |
| 20869-20899 | `AnimTask_TranslateMonElliptical_Step` | `AnimTask_TranslateMonEllipticalRespectSide` — the attacker's own lunge |
| 20869-20899 (concurrent) | `AnimTask_AttackerFadeToInvisible_Step` | `attacker_fade_to_invisible step_delay=1` |
| 20901, 21003 | `Task_ClearMonBg` | `clearmonbg` |
| 20906-20934 | `AnimTask_WaitAndRestoreVisibility` | `AnimTask_SetAttackerInvisibleWaitForSignal` (script mnemonic; resolves to this symbol) |
| 20912-20928 | `AnimTask_ShakeMon2_Step` | `AnimTask_ShakeMon2` on the target (hit reaction) |
| 20971-21002 | `AnimTask_AttackerFadeFromInvisible_Step` | `attacker_fade_from_invisible step_delay=1` |

Every dispatched task in this window resolves to a symbol the script
itself names or calls into — **zero unexplained task activity**. This
independently confirms the "reddish-pink screen tint" is exactly
`fadetobg BG_DARK` (a genuine BG-palette fade task, firing twice — in then
out — not a one-shot flash), and the "lunge" is exactly
`AnimTask_TranslateMonEllipticalRespectSide`'s own elliptical translate,
running concurrently with the attacker's fade-to-invisible — matching
§5c's coarse sketch exactly, now with RAM-timed task boundaries instead of
a stride-18 PNG guess.

**FIRE_PUNCH task-lifetime ledger** (RAM-confirmed, tick-exact):

| tick range | task (resolved symbol) | matches script step |
|---|---|---|
| 21207-21291 (with gaps) | `Task_UpdateMonBg` | `monbg ANIM_DEF_PARTNER` |
| 21210-21238, 21283-21291 | `AnimTask_BlendSpriteColor_Step2` | `AnimTask_BlendBattleAnimPal ... RGB_RED` (the red target-flash, fires twice — matches the script's own pre-hit ramp-in and post-hit ramp-out calls) |
| 21241-21269 | `AnimTask_ShakeMon_Step` | `AnimTask_ShakeMon` on the target |
| 21292 | `Task_ClearMonBg` | `clearmonbg ANIM_DEF_PARTNER` |
| 21412-21449 | `Task_DoStatusAnimation` (`battle_anim_status_effects.c:554`) | the burn's own status-affliction animation task, created immediately after the 21411 RNG roll — **ends 93 ticks before the BRN badge draws (21542)**, confirming the badge is NOT gated on this task's completion in any tight coupling, just downstream of it in the script's overall pacing |

Source (`Move_FIRE_PUNCH`) additionally names **4× `gFireSpiralInwardSpriteTemplate`**
(spiraling onto the target at 4 phase offsets: 0/64/128/196 of a 256-unit
rotation, i.e. evenly-spaced quarter-turns) and **`FireSpreadEffect`'s own
7× `gFireSpreadSpriteTemplate`** (a burst radiating from the target at 7
distinct x/y/duration triples) plus a thrown `create_fist_sprite` and a
`create_basic_hitsplat_sprite` — all `createsprite`-dispatched (not
`createvisualtask`), so they don't show up in the task ledger above; this
session's RAM probe only captured `gSprites[].callback` pointers, which
read as non-null across all 64 slots at every sampled tick (the engine
keeps every slot's callback populated regardless of logical "in use" state
— the `inUse` bit isn't exposed by the existing `dump-task-and-sprite-
callbacks.py`), so per-slot sprite-template attribution for the fire
spiral/spread sprites specifically is **not resolved this session** —
flagged open for a probe that also reads each sprite's `inUse`/template
tag, same honesty convention as this dossier's other open items. The
dense PNG pass (233-capture `verify-turn16.ts`, `FIRE_CAST_DENSE`,
21170-21405 stride 4) independently confirms the window is genuinely
dynamic (46 distinct frames of 59 sampled), consistent with this
multi-sprite composite, not a static hold.

**Verdict for both**: genuinely new, multi-primitive composite animations
— reusing already-wired primitives (`ShakeMon`/`ShakeMon2`, `clearmonbg`/
`monbg`, hitsplat sprites, palette-blend tasks — all seen in prior turns'
dossiers) in move-specific combinations, **not a plain reuse of any single
already-fully-wired family** and **not the ISSUES-#23 linear-translation
projectile shape** either. An engine slice implementing these should
budget for: FAINT_ATTACK = BG palette fade (×2, in/out) + elliptical
sprite translate + fade-to/from-invisible + target shake + hitsplat.
FIRE_PUNCH = BG palette fade + 4-phase spiral-inward burst + thrown fist +
hitsplat + target shake + red palette blend (×2) + 7-point spread burst.

### 6.3 Dense re-bisection of §4's approximate boundaries — no slips found

Re-bisected every stride-18/wide-range row this session (`verify-turn16.ts`'s
own `FAINT_TINT_DENSE`/`FIRE_CAST_DENSE`/`BURN_TEXT_DENSE`/`BADGE_DENSE`
capture sets, 233 total captures, single oracle round trip, twice-run
byte-identical): **all previously-cited exact shas (5950e7b3d8ba,
533d43f7a773, 557d261b5dba, 9042f3f1afe1, e4a415cb85ad, d28dd01e52fd,
5123afd2b167, 84551bcb11c3, 06888de6033d, 74fd1d0f11f9, 0b1748b6c28c)
still read at their originally-cited ticks — 0 slips this pass**, unlike
turn13-15's own retrofits (each found 1-7). The one genuinely-unpinned
boundary this dossier itself flagged open — "Foe MURKROW was burned!"
typing-in, bracketed only "between 21450 (absent) and 21465 (typing)" — is
now pinned exactly: **tick 21465 IS the first-typing tick** (dense stride-1
across 21445-21466 confirms 21445 does not yet show it and 21465 is the
earliest match), so §4's own citation was already exact, just not
previously proven tight.

### Verification

`npm test` and `npm run build` green — no `src/` changes this session.
New artifacts: `tools/probe/verify-turn16.ts` (233 captures, single oracle
round trip, twice-run byte-identical via two independent
`node --experimental-strip-types tools/probe/verify-turn16.ts` runs, stdout
diffed identical) and this doc append. RAM: `dump-task-and-sprite-
callbacks.py` (pre-existing, unmodified, generic gTasks/gSprites dumper)
run once over `battle1-turn16-dense.json` from tick 20770, all resolved
function-pointer symbols cross-checked against
`arm-none-eabi-nm -n --defined-only reference/pokeemerald/pokeemerald.elf`
(exact address matches, not fuzzy/nearest-symbol guesses). Source
citations (`battle_interface.c`, `battle_anim_scripts.s`,
`battle_anim_status_effects.c`) are read-only references — no `src/`
files touched. Pixel claims (badge bbox, bar-unaffected check, static-hold
check) computed programmatically inside `verify-turn16.ts` from the
oracle's own PNG captures, not eyeballed.

**PAPERCUT**: none — the existing `dump-task-and-sprite-callbacks.py` and
`arm-none-eabi-nm` (already on PATH) covered this session's RAM needs with
zero new tooling required. The one real gap found (sprite-level `inUse`
bit not exposed by the existing dumper, needed to attribute the
FIRE_PUNCH fire-spiral/spread sprites to specific slots) is flagged above
as an open item, not a papercut — a deliberate scope boundary given the
35-minute cap, not friction.
