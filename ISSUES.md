# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #36 — Turn 15 boundary (iii): "not very effective" text, HP drain, faint
  sink, and the fainted-hold not yet wired — `turn15-fly-strike.json`
  covers boundaries (i)+(ii) (18956-19141)

Opened 2026-07-22 (wiring step), trimmed same day (boundary (ii) close-out,
`docs/turn15-notes.md` §8). Boundaries (i) (reopen gate/submenu/confirm/
kickoff text) and (ii) (the FLY strike animation core — ball descent,
impact sprite, Onix's own hit-flash/shake/healthbox-wobble) are wired and
committed, `turn15-fly-strike.json` **183/183** 0 diff over 18956-19141 (3
ticks excluded, 19059-19061, a small rotated-affine corner-rounding
residual — see §8, not chased further, shared-primitive risk; the
`FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT` rider fix — ISSUES #35's old family —
restored the other 7, `docs/turn13-bounce-notes.md` §13).

**Still not started**: the "Foe MURKROW's attack was\nnot very effective..."
text, the HP-drain-to-0 bar (§8 close-out found this starts at RAM 19142,
NOT the original dossier's own "~19147" citation — 5 ticks earlier), the
first-ever player-side faint sink (RAM teardown 19325/19326, pixel vanish
19330, §6c — the turn-5 `SpriteCB_FaintOpponentMon`/`AnimFaintOpponent`
family applied to the player's own slot, function-name-level confirmation
still open), and the button-gated "ONIX fainted!" hold (3-phase idle
bounce, dismiss at 19990). Ground truth for all of it is banked in
`docs/turn15-notes.md` §2-§4/§6b/§6c/§6f — every phase in §6f's own reuse
table is flagged "pure wiring reusing" an existing mechanism (the turn-5
faint-sink family, the standard button-gated-hold idle-bounce shape), no
new derivation expected, unlike boundary (ii)'s own two probes.
**Next step:** wire the "not very effective" text (straightforward,
`turn15SimpleVisibleChars`-style, once its own literal start tick is
oracle-pixel-bisected), then the HP-drain bar/text countdown from 19142,
then the faint-sink teardown, then the fainted-hold — extending
`turn15-fly-strike.json` through ~19990, 0 diff.

## #33 — Turn 13 post-switch-in residual: Murkrow frame-selection window's
  own two boundary ticks (17019, 17034), excluded from `turn13-switchin.json`
  (240/240)

Opened 2026-07-21 wind-down (supervisor), consolidating `battle-turn-notes.md`
§50's two named residuals so they don't live only in a dossier. Part (b)
(the settled-menu bounce subset after the switch-in reset) was root-caused
and wired 2026-07-21/22 (`docs/turn13-bounce-notes.md` §§3-9) — see #34 for
the SEPARATE, related finding that fix surfaced in turn 14's own downstream
reuse. Part (a) (this entry) is now trimmed to its own tiny remainder below
— the frame-selection bug itself is CLOSED.

**Closed 2026-07-22** (wiring step): a direct VRAM dump
(`docs/turn13-notes.md`'s dated append, `verify-turn13-frame2.ts` 11/11
PASS) refuted the "wrong asset" theory outright — both `tileset` and
`frame2` are byte-exact against hardware whenever each is genuinely live.
The real bug was `turn13MurkrowFrame`'s own open-ended step function
(`t < 17034 ? 0 : 1`), instead of the real closed window `frame2` is live
in (`[TURN13_MURKROW_STRETCH_TICK, TURN13_MURKROW_FRAME_FLIP_TICK]`
inclusive). Wired verbatim; restored 49 of the 51 excluded ticks
(17019-17069) to 0-diff.

**Remaining** (a much smaller, separate residual than the one this entry
used to describe): renders **17019 and 17034 only** — the exact two ticks
the probe's own dossier flagged in advance as a coincidental artifact of
the OLD code — still show a small shape residual (418px/828px, both
bboxes confined to Murkrow's own silhouette). The frame CHOICE at both
ticks is already the one the RAM-confirmed window calls for, so this is
NOT a frame-selection bug — something else differs at exactly the
window's two boundary ticks (one tick before it opens, and its own
closing tick). Likely candidates, untested: the wobble table's index math
or the tint coefficient right at those two specific ticks. **Next step**:
a fresh probe (RAM/VRAM, same two-independent-methods bar) pointed at
just those two ticks — do not re-guess a fix without it.

## #34 — Turn 14's `17781-17787` (7 ticks) and `17822-17845` (24 ticks,
  kerning-class) windows still excluded from `turn14-fly-miss.json`;
  the `17722-17768` reopen family (43 ticks) is now FULLY CLOSED

Opened 2026-07-21/22, **core fixed 2026-07-22** (wiring step,
`docs/turn13-bounce-notes.md` §§10-11): turn 14's own settled-menu redraw
(`TURN14_MENU_REDRAW_TICK`=18086) had the same missing 6-tick blank hold
#33(b) found at turn 13's own switch-in, PLUS the bounce regime turned out
to RESET fresh at the redraw rather than continue turn 13's live cycle
(0/871 RAM mismatches for RESET vs. 871/871 for CONTINUE, §10c). Wired
verbatim per §10d: new `TURN14_MENU_TEXT_CLEAR_TICK`(18080) blank-hold
branch + `TURN14_MENU_REDRAW_RESET_SHIFT` replacing the borrowed
`TURN13_SWITCHIN_RESET_SHIFT` in `drawTurn14FlyMissWindow`'s settled
branch. `turn14-fly-miss.json` **165/165, 0 diff** (was 150/150; the 15
predicted ticks 18080-18090/18095/18415/18815/18956 all restored clean,
first try).

**`17722-17768` (43 ticks) CLOSED 2026-07-22** (rider fix, `docs/turn13-
bounce-notes.md` §13): the missing `FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`
correction (§12's root cause) plus one adjacent, independently-discovered
bug — `drawTurn14FightSubmenuWindow`'s own `drawFightSubmenuChrome` call
was missing one `true` (`turn13Resolved`), under-counting DRAGON_BREATH's
PP by 1 (19/20 rendered vs. oracle's 18/20) for the ENTIRE FIGHT-submenu-
open span, independent of the bounce formula — together close all 43
ticks, including the 11 (`17758-17768`) previously ruled OUT of the
shift rule's own scope (RAM-correctly predicted the frozen bounce there,
but rendered the same wrong PP digit) and the single-tick confirm-press
blip (17755). `turn14-fly-miss.json`: **185/185, 0 diff**.

**Remaining** (this entry's own honest scope now): `17781-17787` (7 ticks)
and `17822-17845` (24 ticks, kerning-class, per #33(b)'s own dossier) —
neither touched or re-tested this session, per the brief's explicit scope
fence. Stay excluded from `turn14-fly-miss.json`. **Next step:** a fresh
RAM/pixel probe of `17781-17787` (same two-independent-methods bar this
dossier holds itself to — it may or may not share the now-fixed PP bug,
untested); `17822-17845` needs its own kerning-specific investigation,
unrelated to either bug fixed this session.

## #32 — Turn 9 QUICK_ATTACK clones (slots 3/4): 203px residual at renders
  10940-10941 only, excluded from `turn9-quickattack.json`

Opened 2026-07-21 (S7 engine step, restoring #31's own excluded window).
Once the hitsplat's own target2 bug was fixed (was #31, see PROGRESS/git
history for the fix), renders 10935-10939 and 10942-10944 came back 0-diff,
but 10940-10941 still show a 203px residual confined to Pidgeotto's own
silhouette, bbox `(178,41)-(190,62)` — structurally the SAME SHAPE as
AERIAL_ACE's own solved clone-vs-real overlap (turn 10's `docs/aerial-ace-
notes.md`): slot 4 sits at its own life-end here too (`n=68,69` per
`turn9QuickAttackSlot4Offset`'s own render-tick math), and slot 3's second
life (offset `(0,0)`, co-located with the real sprite) is concurrently
active.

**Tried and reverted this session (do NOT re-attempt verbatim):** applying
AERIAL_ACE's own solved rule (the later-active clone wins its OAM tie
unconditionally, blends against the field alone) to slot 4 at its own
life-end ticks — predicted colors do NOT match oracle (e.g. app produced
`(255,160,145)`, oracle wants `(255,127,55)` at `(181,41)`/render 10940),
unlike AERIAL_ACE's own pixel-exact fit at the analogous pixel. Also tried
applying the rule unconditionally to slot 3+slot 4's WHOLE lives — regresses
14 previously-passing frames elsewhere in the trace (167→153/169), same
lesson AERIAL_ACE's own slot 4 already taught: "does it win" is genuinely
tick-dependent, not a blanket rule transferable by shape alone.

**Next step**: a fresh RAM probe of slot 3/slot 4's own final
`gMain.oamBuffer` order specifically at RAM 10939-10940 (the
`dump-quickattack-hitsplat-oam.py`/`dump-aerialace-oam.py` precedent,
direct port) — this session did NOT re-derive a new formula without that
ground truth, per the "wiring not derivation" convention. Full dossier:
`docs/turn9-shake-notes.md`.

## #23 — [PARKED 2026-07-20, supervisor decision under the unanswered-
  escalation default] DRAGON_BREATH fire projectiles: renders 3177-3235 of
  turn2-dragonbreath.json remain uncaptured after 4 bounded attempts

Opened 2026-07-20 (supervisor). The 8 fire-projectile sprites of
`Move_DRAGON_BREATH` (small_ember gfx, spawn every 4 ticks, 20-tick life)
are the sole un-landed mechanism of turn 2; `turn2-dragonbreath.json` ships
**166/166** with 3177-3235 excluded from `captureFrames` (this run's
standard treatment of un-green spans — never committed red). Everything
around it is green: kickoff text 3121-3176, shake/blend 3236-3263,
resolution half 3264-3346.

**Settled by the four attempts (do NOT re-derive):**
- Geometry: 21-entry `gOamMatrices` table (`a===d`, `b===-c`, identical
  across all 8 spawns), base `(72,88)`, render lag 1, spawn cadence and
  frame cycling — all RAM-verified.
- The "concurrent `AnimTask_BlendBattleAnimPal` also blends the ember
  palette" theory is CLOSED by source-level call-chain proof
  (`F_PAL_TARGET` → `GetBattlePalettesMask` only ever selects a named
  battler's own OBJ palette bank, never the ember's gfx-tag palette),
  corroborated by pixel evidence (every mismatched pixel is a clean
  small-ember ramp color — a shape defect, not a color one).
- The shared sampler `drawSpriteSheetAffineRotate` is ELIMINATED: its
  double-size iteration box is source-confirmed correct
  (`gOamData_AffineDouble_ObjNormal_32x32`, same mode as the working ball
  spin), and a 4-variant rounding/offset sweep found the current
  convention strictly best (8181 diff-px vs 11410/21469/21933). This
  matters beyond DRAGON_BREATH: a defect there would have affected every
  other rotating sprite.
- An extra-tick-of-life hypothesis was tested and made tick 3220 worse
  (342→649px); reverted.

**Residual, precisely characterized:** salt-and-pepper edge OVER-DRAW when
the sprite is compressed (`|matrixA|>256`) versus an isolated MISSING blob
when magnified (`|matrixA|<256`), with a correctly-matching core in both
regimes — possibly TWO separate defects. Note the working ball-spin
precedent never exceeds `|pa|=255` while DRAGON_BREATH starts at 703, so
this scale regime is genuinely unexercised elsewhere in the engine.

**Named next instrument (never attempted):** isolate a single spawn —
render spawn 7 alone to a blank canvas and diff against an oracle capture
with all other content subtracted — rather than fitting against
whole-scene diffs, which is what defeated the "which n" arithmetic in
attempt #3. Full derivations: `docs/dragon-breath-notes.md`, sections
"Engine slice E2a-3", "E2a-4", "E2a-5".

## #18 — [POLICY SETTLED 2026-07-19, user decision] sendout tick 1496
  (particle z-order, 3px): accepted/parked permanently; S6 ticked [x] with
  every diff frame individually attributed (3× #5, 1× this entry). The
  persistent-`sSpriteOrder` architecture build was declined as out of
  proportion. No further fix attempts unless the user re-opens it.
  Mechanism record below is kept for attribution evidence.

Parked 2026-07-19 (supervisor); trimmed 2026-07-19 (§7.31, closed tick
1493); trimmed again 2026-07-19 (§7.32, closed 1494/1495 - a one-tick
`drawOpponentSummaryExit` clock stall, same family as §7.18's particle
stall). What remains is exactly one tick:
- **1496** (3px): particle z-order gap named in §7.25 — the ONE
  non-ISSUES-#5 frame keeping `s6-acceptance.json` at 224/228. §7.31
  RAM-confirmed the pixel-exact winner (spawn index 14, not 13) and ruled
  out sprite-slot reuse scrambling (real array positions: idx6 for particle
  13, idx23 for particle 14 — NOT scrambled). §7.32 read the actual source
  this residual depends on (`reference/pokeemerald/src/sprite.c`'s
  `CreateSprite`/`CreateSpriteAtEnd`/`SortSprites`) and found: (1) the
  particles are created via plain `CreateSprite`, not `CreateSpriteAtEnd` as
  previously assumed (`CreateSpriteAtEnd` is real in this scene but only for
  the summary bar's icons and the healthbox, `battle_interface.c`); (2) the
  real tie-break mechanism is `sSpriteOrder` — a PERSISTENT 64-slot
  permutation reset to identity only once (`ResetAllSprites`, battle start)
  and continuously insertion-sorted in place every frame thereafter, where
  an exact tie preserves whatever relative order two slots inherited from
  the *entire prior history* of every sprite (of any kind) that has ever
  occupied those two slot numbers — not a function of raw spawn/slot index
  at all. Determining the real winner for slots 6 vs. 23 at this one tick
  would require simulating that entire scene-wide history as persistent
  engine state, a materially different architecture (whole-scene OAM-order
  simulation) than this engine's current per-burst, stateless
  `sortAliveParticlesByScreenY` — out of proportion to a 3px fix and exactly
  the kind of change that risks regressing every other window sharing that
  sort. No fix shipped (a special-cased index swap would be undocumented
  curve-fitting, the same mistake §7.25 already made and reverted). Full
  derivation: `docs/battle-scene-notes.md` §7.32.
Affects: `sendout.json` 255/256, `s6-acceptance.json` 224/228 (3 frames are
ISSUES #5's settled pattern, x88-151-confirmed; 1 frame is #18's own 1496).

## #16 — Healthbox compositor: status-icon variant still unimplemented/
  unvalidated in the ENGINE (ground truth now BANKED — turn 16's BRN badge)

Trimmed 2026-07-19 (S7 slice D): partial-HP green-band drain validated
(`turn1-drain.json`, Grovyle 143→101, 0 residual). Trimmed again
2026-07-20 (supervisor, after S7 slices I-2/J/K): band coverage
oracle-confirmed on BOTH sides (yellow/red bands, the hp=1 red sliver,
the truly EMPTY bar — Tier-1 pins added). Trimmed again 2026-07-21
(supervisor, at the turn-16 scout fold): the "battle 1 never inflicts a
status" blocker is GONE — turn 16's FIRE_PUNCH burn proc puts a BRN
badge on MURKROW's healthbox, ground-truthed in
`battle1-turn16-dense.json` + `docs/turn16-notes.md` §4 (badge absent at
tick 21540, present at 21548, both PNG-verified; exact appearance tick
inside 21541-21547 unpinned — sparse capture gap). Remainder: the engine's
own `UpdateStatusIconInHealthbox` equivalent (placement/
color-substitution math) has never been written or pixel-validated — the
turn-16/17 engine slices (S8 territory) will exercise it against the
banked ground truth.

## #5 — [POLICY SETTLED 2026-07-17, user-delegated] mon-pic close WIN0V
  jitter: 0-diff stays the bar; re-time trace interactions into clean
  windows where feasible; otherwise ship with each non-matching frame
  individually attributed to this entry's pattern (x88-151 close-window
  confinement). No further fix attempts. rent-slot1.json: RESOLVED to the
  attribution fallback (supervisor, 2026-07-17 ~16:20) — a worktree worker
  swept 8 re-time candidates around the archived "~31" window (confirm
  press-ticks 29-35, incl. DOWN-tick variations; ~47+ stays excluded, it
  blows the species-name-breathe budget): EVERY candidate was worse than
  the committed baseline (15-27 diffs vs baseline's 14), no exploitable
  pattern — consistent with the chaotic cycle-cost root cause below.
  rent-slot1.json ships at 125/139 permanently, all 14 frames attributed
  to this entry's pattern; no further re-time attempts unless a future
  session sweeps the untried ~40-60 tick range with a breathe-budget
  workaround. Mechanism summary below is kept for attribution evidence;
  this is no longer an open work item.

## (mechanism record) mon-pic close animation: WIN0V catch-up jitter is real hardware
  cycle-timing, not a modelable game-state bug (root-caused, NOT fixable at
  this engine's tick/state granularity - see "why this can't be fixed" below)

**Symptom:** the mon-pic close animation (`monPic.ts` CLOSE_TABLE_B, driving
`monPicRender.ts`'s WIN0 window blend) renders the wrong pixels inside the
window (`x88-151`) for several ticks of *some* closes but not others -
confirmed independent of RENT/DESELECT (a bare `A` open then `B` close with
nothing else touched reproduces it too).

**Root cause, confirmed via direct RAM/IO-register inspection** (dev-time
recipe, `EmeraldOracle.core.memory.u16[...]`, scratch scripts not committed -
methodology below so this is reproducible):

1. `Task_CloseMonPic` (`reference/pokeemerald/src/battle_factory_screen.c:4250-4292`)
   is a completely clean, deterministic state machine: `data[5]`/`data[8]`
   (`tWinTop`/`tWinBottom`) step by exactly ±4 every single tick with **zero**
   periodicity or absolute-tick dependence - confirmed by dumping
   `gTasks[2]`'s raw `data[]` words tick-by-tick for both a clean close
   (press-tick 30) and a bad one (press-tick 36): the *internal* state is
   bit-for-bit identical between the two runs, just time-shifted by 6 ticks.
   `RunTasks`'s priority-linked-list shape (`gTasks[]` `prev`/`next`/`priority`
   fields, `reference/pokeemerald/src/task.c`) is also identical between the
   two runs, ruling out task-scheduling/insertion-order as a factor.
2. The *visible* WIN0V register is NOT the task's raw state - GBA's
   `SetGpuReg` (`reference/pokeemerald/src/gpu_regs.c:66-98`) always writes
   the new value into a shadow buffer (`sGpuRegBuffer`) immediately, but only
   copies it to the real hardware register **now** if `REG_VCOUNT` is
   currently inside vblank (161-225); otherwise it's queued
   (`sGpuRegWaitingList`) and only reaches hardware on the *next* vblank
   flush. This is a genuine, permanent 1-tick render lag, and
   `monPic.ts`'s existing `CLOSE_TABLE_B`/`CLOSE_TABLE_A` already correctly
   encode it (each table index N holds the task's internal value from tick
   N-1) - **this part was never the bug**.
3. The actual jitter: on some ticks, `Task_CloseMonPic`'s `SetGpuReg(WIN0V,
   ...)` call happens to execute *after* `REG_VCOUNT` has already crossed
   into vblank that frame (instead of before, which is the normal case),
   so the write lands on hardware immediately instead of being queued -
   collapsing the usual 1-tick lag and producing a "catch-up" (a skipped
   window-growth step, or a duplicated one on the next tick to resync).
   `REG_VCOUNT`'s value at the moment this one `SetGpuReg` call executes
   depends on the **total CPU cycle cost of everything else that ran earlier
   in the same frame** (`AnimateSprites`/`BuildOamBuffer`/`RunTextPrinters`/
   `UpdatePaletteFade`/all of `RunTasks`, per `CB2_SelectScreen`) - a
   cycle-accurate hardware race, not game *state*.

**Confirmed NOT reducible to any state this engine tracks** (the decisive
test): replaying `tools/compare/traces/rent-slot1.json`'s exact button
sequence with 0/3/7/10/17 idle frames prepended (shifting every absolute
tick but preserving every *relative* offset - ticks-since-open,
ticks-since-RENT-confirm, close-table variant, all unchanged) produces a
**different** WIN0V catch-up pattern each time. So the jitter is a function
of absolute session tick (ultimately: total emulated CPU cycles since boot,
via `RunTextPrinters`/sprite-processing/etc. cost on nearby ticks) with no
proxy available in this engine's tick-level `EngineState` - only a
cycle-accurate CPU emulation would reproduce it exactly, which is out of
scope for a tick/state-machine reimplementation.

**Ruled out along the way** (leads from the previous investigation,
superseded by the above): `monPicBg`'s tileset/palette is genuinely static
across the close (RAM-dumped, no change) - the earlier "un-modeled
shimmer/palette-cycle" suspicion was wrong. It's also not about the DOWN
press, not about `hasActed`/close-table variant (clean and broken closes use
the identical variant), and not a fixed function of ticks-since-close-started.

**Confirmed scope of the visible damage:** for `rent-slot1.json` specifically,
`npm run compare` shows `DIFF` on frames 37-47 (the window-growth phase,
up to 3343px/8.71%) tapering down through frames 49-57 (1-64px, halving
roughly in step with the post-window flash-bar's own width table) - i.e. the
same one jitter event also perturbs the flash-shrink phase that immediately
follows, since it's driven by the same task's tick sequence. Frames 58-138
(fully past the close) are unaffected and independently RAM-verified exact
(RNG stream, state machine - see PROGRESS #17).

**Why this can't be fixed at this engine's level:** a correct fix would
require modeling per-frame CPU cycle cost across unrelated subsystems
(text printer drain state, sprite count, palette fade activity) precisely
enough to predict which side of the vblank boundary `REG_VCOUNT` lands on
for one specific `SetGpuReg` call - i.e. cycle-accurate CPU emulation. That
is a different order of engineering than this codebase's tick/state-machine
architecture and is not proposed here.

**Remaining work / options for a future slice (none attempted - would each
need explicit sign-off since they lean away from "model the real mechanism"):**
- Re-time `rent-slot1.json`'s RENT-confirm press so its close lands in a
  tick range empirically confirmed clean for *that exact* trace (not a
  general rule - the shift-test above proves no general rule exists). This
  is the "dodge" option the current brief explicitly ruled out, but may be
  the only practical unblock short of cycle-accurate emulation.
- Accept `rent-slot1.json` at 125/139 permanently and document the gap
  inline (its RENT/DESELECT-specific behavior is already independently
  RAM-verified via `tests/rentSelect.test.ts`/`tests/ballAnim.test.ts`, so
  the uncovered pixels are 100% attributable to this pre-existing,
  RENT-independent close-animation jitter, not to unverified S5 logic).
