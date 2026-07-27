# Issues — standing backlog

Known-open bugs and debts, numbered (numbers are never reused). When you fix
one, **delete the entry** in the same docs commit that records the fix in
`PROGRESS.md` — git keeps the forensic history. Group by area; per entry:
symptom, what's confirmed from the reference/oracle, and any leads.

## #47 — CV weather AI handlers still diverge from the ROM's `get_weather` stale-read bug (Channel 2 only — Channel 1/CBM fixed this session)

**Symptom (Channel 2 remainder only — Channel 1 closed, see below):**
`weatherSetterCvScore`/`runCvRainDance`/`SunnyDay`/`Hail` (CV,
`factoryAiCheckViability.ts`) still consume a clean `currentWeather` input,
but the pinned ROM's `Cmd_get_weather` (BUGFIX undefined) reads a stale
`funcResult` on a genuinely weatherless dispatch — `AI_TryToFaint`'s own
`get_how_powerful_move_is` leaves `funcResult = MOVE_POWER_OTHER(0)` after
its last-processed movesetIndex slot (any real move with power ≤1, e.g. a
Splash/Growl filler), and `MOVE_POWER_OTHER(0)` ≡ `AI_WEATHER_SUN`, so
`AI_CV_RainDance`/`Hail` (both check Sun in their own "other three" chain;
`AI_CV_SunnyDay` does not, since Sun is its own excluded type — confirmed
from §25.2's transcribed bodies, not affected by this channel) spuriously
score +1 in a genuinely weatherless battle, independent of target ability.
Ground truth, mechanism, and 1 live fixture: doc §25.10.

**Channel 1 (CBM ability-id collision) fixed this session
(2026-07-27):** `runCbmRainDance`/`SunnyDay`/`Hail`
(`src/engine/factoryAiCheckBadMove.ts`) now model the stale channel
faithfully — `AI_CheckBadMove`'s own universal preamble (`get_ability
AI_TARGET`, the soundproof check) runs immediately before every one of these
three handlers in the same script/slot, so a weatherless dispatch's
`get_weather` reads that same-pass ability guess (`soundproofGuess`,
already computed, no new draw) instead of a clean sentinel. A small
ability-name→ID table (`ABILITY_ID_IN_WEATHER_RANGE`, only the 4 IDs that
can ever number-collide with `AI_WEATHER_*`) answers the collision
generically, not a Ninjask special case. Pinned by
`tests/factoryAiCheckBadMove.test.ts`'s new "Channel 1" describe block
(mechanism-level cases across all 4 IDs + the real Ninjask/Anorith species
from doc §25.10.2). No existing test needed a value change (every prior CBM
weather test used Shuckle, ability id 5, outside the collision range).

**Why Channel 2 is NOT a same-shape fix (new finding this session,
blocking a quick close):** the real ROM's `ChooseMoveOrAction_Singles`
(`battle_ai_script_commands.c:395-416`) calls `BattleAI_DoAIProcessing`
once per `aiLogicId` (CheckBadMove, then TryToFaint, then CheckViability),
and `BattleAI_DoAIProcessing` itself (`:572-616`) loops all 4 movesetIndex
slots to completion *within* that one call before returning — i.e. the real
execution order is CBM(slot0..3), **then** TTF(slot0..3), **then**
CV(slot0..3), never interleaved across logic IDs. The engine's
`chooseFactoryAiScoredDecision` (`factoryAiDecisionPolicy.ts`) instead runs
CBM/TTF/CV **per slot** (CBM0,TTF0,CV0,CBM1,TTF1,CV1,...) — harmless for
every handler ported so far (this doc's own fixture convention avoids any
CBM/TTF draw so interleaving order never shows up in a draw count or
score), but Channel 2 specifically needs TryToFaint's **slot-3**
classification available before CheckViability's **slot-0** dispatch runs —
chronologically inverted in the engine's current per-slot loop. Modeling
Channel 2 correctly needs either (a) restructuring the scoring loop into
three full logic-ID-major passes matching the real ROM, or (b) a narrower
prepass that previews TryToFaint's last-slot classification (mechanically
safe — `computeMostPowerful`/`canFaint` are both RNG-free, so a preview call
doesn't perturb the committed draw sequence) — but (b) still needs a
decision on what happens when the weather move sits in movesetIndex 1-3
(CV's own within-pass carry, never live-verified) rather than silently
guessing. Left open rather than shipped as an approximation, per the
mission's "do not ship a half-model that silently changes non-colliding
flows" bar.

**Leads:** doc §25.10 has the full mechanism/citations; the 2 remaining
fixtures needing the fix (`mechanic-factory-ai-hail-staleweather-{collision,
control}-off.json` — net -7/+1, both need Channel 2's own +1 on top of
Channel 1's now-correct CBM contribution — and
`mechanic-factory-ai-cv-raindance-noraindish-stalesun-off.json`, Channel 2
alone, net +1) are staged and verify-script-wired, ALL PASS as ORACLE
observations (untouched this session). A future worker should pick (a) or
(b) above deliberately, then re-derive the mask-7 net-score reproduction
tests for these 3 fixtures (still not landed — engine currently scores 0/0/0
for them, not -7/+1/+1, since only Channel 1 is modeled).

## #41 — Production engine modules import canonical RAM recordings

**Symptom:** shipped `src/engine/` code reads recorded state from the single
canonical playthrough instead of computing it, so it is correct only for that
playthrough.

**Confirmed** (grep, 2026-07-24, `856b3b4`):
- `battleScene.ts:651-653` imports `battle1-turn1-ram-dump.json`,
  `battle1-turn2-ram-dump.json`, `battle1-grovyle-faint-ram-dump.json` and
  reads battler HP/maxHP out of them (`:916-1267`).
- `factorySwapPresentation.ts:2` imports `battle1-swap-rentalmons-dump.json`.
- 57 of the 114 files in `src/data/gen/` are `*-dump`/`*-probe`/`*-watch`/
  `*-boundaries` recordings. (`featherDance.ts`'s probe imports were retired
  2026-07-24 by the anim-script interpreter, ex-#40.)

**Leads:** the HP reads are the cheapest to retire — they become kernel
semantic events once ROADMAP S10 step (ii) lands `datahpupdate`. Retire each
import as its owning mechanism gains a real source, and keep the dump files
for Tier-1 assertions and extractors. ROADMAP S10 §4 forbids new ones.

## #39 — `battleScene.ts` is a state machine over one canonical battle

**Symptom:** the production battle presentation is keyed to *which turn of the
recorded Battle 1/2 we are in*, not to what happened. It cannot consume kernel
semantic events, so the battle kernel currently has no possible consumer.

**Confirmed** (2026-07-24, `856b3b4`): 17,056 lines — **30% of all
`src/engine`**. 74 `BattleSceneState` declaration lines name a specific turn
(`turn13KoDismissElapsed`, `turn13Resolved`, `turn15PartySelect`,
`turn17MenuRedrawElapsed`, `turn17KoDismissElapsed`,
`turn17OutcomeDismissElapsed`, `turn17LossDismissElapsed`); 969 lines reference
a turn number; per-species render entry points are hardcoded
(`grovyleFaintSinkRowsAndY2`, `onixSitrusRotateMatrix`,
`turn5GrantingStarPlacement`, `dragonBreathGrovyleHp`). Sibling files
`battle2Turn1.ts`, `battle2ActionMenu.ts`, `battle2OffScenario.ts`,
`turn17.ts` share the shape.

**Not a request to rewrite it.** The windows it renders are individually
oracle-exact and that evidence is worth keeping. The debt is the *keying*.
ROADMAP S10 §3 requires one already-exact window to be re-driven from semantic
events as a proof of the seam; that conversion, window by window, is the
retirement path. AGENTS.md already forbids adding new turn-keyed branches.

## #38 — [PARKED 2026-07-22, supervisor decision] Turn 16 FAINT_ATTACK
  delayed-control tick 21006 exposes `BLDALPHA` one VBlank early

The canonical animation window is committed at **221/221 exact**
(`turn16-rung2a.json`, 20826-21046). A +30-frame pre-SEND-OUT delay is
**220/221**: delayed tick 21006 alone shows the next attacker-alpha
coefficient one frame early.

Direct task/RAM probes show identical active callbacks and task data at the
relative boundary (`data[1]=0x0d03`, `data[2]=0`), while the hardware register
differs: canonical `BLDALPHA=0x0e02`, delayed `0x0d03`. A fresh delay sweep
over `+0..+8,+15,+16,+30,+31,+32` reproduces the early exposure only at
`+30`; adjacent delays return to the normal cadence. This is therefore a
sub-tick `SetGpuReg`/VBlank visibility race below the engine's tick-state
abstraction, analogous in mechanism to the already-settled cycle-timing
family in #5, not a move-task reducer defect.

The delayed trace is not committed red. Do not add an absolute-tick,
delay-specific, or baked-frame patch. Reopen only if the engine gains a
general cycle/register-queue model; this extra delayed-control frame does not
block the roadmap's canonical S7 acceptance.

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
