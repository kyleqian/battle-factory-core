# Presentation-seam retirement ladder

Read-only scout, `src/` untouched (`git diff -- src/` is empty at this doc's
commit). Written from Battle Scene OFF (`http://127.0.0.1:8014`), this
worktree's `HEAD`. Every count below was re-run live this session unless
marked otherwise.

## 0. Correction to this step's own mission context — read this first

The assigning brief frames this as an early step: "two conversions already
exist and PASSED at full recorded counts" (`turn5-faint.json`,
`turn1-rockslide.json`), and asks for "the ordered conversion ladder the next
fix workers will execute." That framing is **stale**. Live evidence gathered
this session:

- `docs/battle-scene-retirement-inventory.md` (last touched `2026-08-11`) is
  a 9-row census of exactly this program (ISSUES #39) and shows **ranks 1-9
  all retired or landed** — not two windows, the entire canonical Battle-2
  turn-1-through-17 family (rock slide, endeavor, dragon breath, feather
  dance, sand attack, bind, aerial ace, quick attack, fly, fire punch, KO/
  switch-in/party-select, terminal win/loss). Rank 4 alone (turns 6-8) landed
  five slices, `docs/rank4-prep-scout.md`.
- Every `turnNResolved` dispatch field the scout doc (`§5/§7.2` gap 7, `§8.1`)
  named as unmappable scheduler state is now **gone from source**: `grep -n
  "turn1Resolved\|turn2Resolved\|turn3Resolved\|turn4Resolved\|turn9Resolved
  \|turn12Resolved" src/engine/battleScene.ts src/engine/
  battleSceneCanonical.ts` returns nothing (re-run live this session).
  `turn13Resolved` is confirmed retired by `docs/rank2-turn13resolved-
  predecessor-audit.md` ("`turn13Resolved` is retired by `79885140`"). The
  inventory's own "remaining owner chain" table (§ "The remaining owner
  chain") — which listed `turn1Resolved`…`turn4Resolved` and
  `turn9Resolved`…`turn12Resolved` as still-live as of its `2026-08-01`
  snapshot — is itself now stale on that point; only
  `opponentFaintDismissElapsed` remains a live, deliberately-kept field
  (justified in the same audit doc: "not independently removable").
- `docs/battlescene-canonical-split-design.md` says "**Status: PLAN ONLY.
  Nothing moves in this program**" — also stale. `src/engine/
  battleSceneCanonical.ts` exists today; re-running the design doc's own
  generator live (`node --experimental-strip-types tools/report/
  battlescene-split-partition.ts`) shows the split is roughly **35-45%
  executed** (see §3 Slice 2 below), landed across three sessions
  (PROGRESS-archive entries 999/1000/1001, commits incl. `e6fa4772`).
- `presentationEventWindowBridge.ts` has grown from 1 resolver (turn5-faint)
  to **5** (§1.4 below), each keyed on real `sourceLabel` provenance, none on
  a turn number.

**What this means for "the ladder":** the semantic-event-driven conversion of
turn-N *content* (messages, HP, stat changes, switches) for the recorded
canonical battle is essentially finished. The genuinely open work is
narrower and different in kind from what the brief describes — §3 below
names it precisely, live-verified, not re-proposing anything above.

## 1. Event inventory (ground truth, cited)

`src/engine/battleScriptEvents.ts` declares **28** `kind` variants
(`grep -c 'kind:' src/engine/battleScriptEvents.ts` = 28, lines 65-307).
Re-grepped every `kind: "<exact-variant>"` construction across
`src/engine/battleScript*.ts`, `src/engine/factoryBattleScript*.ts`, and
`src/engine/battleResolutionPresentation.ts` this session (excluding the
type-declaration file itself and `Extract<...>` type-only references).

| kind | payload | emitted at (file:line) | status |
| --- | --- | --- | --- |
| `message` | `messageId`, `substitutions` | `B_SCR_OP_PRINTSTRING` handler, `battleScriptSourceCommands.ts:869-888` (event at `:886`, built by the `ports.prepareMessage` rules-injected port, `:875`); `attackstring`/`critmessage`/`resultmessage` install sites, `battleScriptHitChainOpcode.ts` (~2200-2700 band) | emitted |
| `selection-message` | full snapshot | `B_SCR_OP_PRINTSELECTIONSTRING`, `battleScriptSourceCommands.ts:890+` | emitted |
| `play-se` | `songId` | `battleScriptHitChainOpcode.ts:2331` (effectiveness SFX) | emitted |
| `play-fanfare` | `songId` | `B_SCR_OP_FANFARE`, `battleScriptSourceCommands.ts:547` (shared type with `play-se`) | emitted |
| `play-faint-cry` | `battler` | `battleScriptSourceCommands.ts:928` | emitted |
| `faint-animation` | `battler` | `battleScriptSourceCommands.ts:934` (`B_SCR_OP_DOFAINTANIMATION`) | emitted |
| `hide-party-status-summary` | `battler` | `battleScriptSourceCommands.ts:940` | emitted |
| `draw-party-status-summary` | `battler` | `battleScriptSourceCommands.ts:946` | emitted |
| `set-battler-sprite-visibility` | `invisible` | `battleScriptForceSwitchOpcode.ts:264`, `battleScriptMoveEndControllers.ts:193` | emitted |
| `set-battler-status-data` | `status1` | `battleScriptAttackCancelerOpcode.ts:188`, `battleScriptMoveEndOpcode.ts:421` | emitted |
| `set-party-status-data` | — | `battleScriptHealpartystatusOpcode.ts:215` | emitted |
| `status-icon-update` | — | `battleScriptHitChainOpcode.ts:4200,4221,4258` | emitted |
| `set-battler-pp-data` | `movePosition`, `pp` | `battleScriptAttackCancelerOpcode.ts:253` | emitted |
| `reset-action-move-selection` | — | `battleScriptTransformOpcode.ts:113` | emitted |
| `set-battler-moves-pp-data` | — | `battleScriptLastMoveOpcode.ts:173` | emitted |
| `set-battler-item` | `battler`, `item` | `battleScriptHitChainOpcode.ts:3179-3180` (steal), `battleScriptRemoveitemOpcode.ts:87` | emitted |
| `game-stat-increment` | — | `battleScriptIncrementGameStatOpcode.ts:77` | emitted |
| `trainer-slide-in`/`-out` | — | `battleScriptSourceCommands.ts:612` | emitted |
| `status-animation` | `isStatus2`, `status` | `battleScriptRulesContext.ts:2900` | emitted |
| `hp-change` | `from`, `to` | `battleScriptHitChainOpcode.ts:2546,2628`; `battleScriptExplosionOpcode.ts:200` | emitted |
| `health-bar-update` | `healthValue` (damage delta, NOT settled HP — pinned by `healthBarUpdate.healthValue === hpChange.from - hpChange.to`, `presentation-seam-scout.md` §8.2) | `battleScriptHitChainOpcode.ts:2415`; `battleScriptExplosionOpcode.ts:141` | emitted |
| `animation` | `animationId`, `battler`, `arguments: string[]` (opaque id + 6 numeric-string args — no frame choreography) | `battleScriptHitChainOpcode.ts:2226,2278,2371`; `battleScriptPlaystatchangeanimationOpcode.ts:268` | emitted |
| `stat-stage-change` | `stat`, `from`, `to` | `battleScriptStatBuffs.ts:306` (`ChangeStatBuffs` guard-ladder) | **emitted** (was "declared, never emitted" as of `presentation-seam-scout.md` §7.1 — closed since) |
| `switch` | `side`, `fromPartyIndex`, `toPartyIndex` | `battleScriptSwitchinOpcode.ts:378`; also `factoryAiLiveDriver.ts:499`, `factoryBattleScriptFullTurnDecision.ts:2078`, `partySelect.ts:544` | **emitted** (was "declared, never emitted" as of §7.1 — closed since; do not conflate with the unrelated `BattleSwitchDecision.kind === "switch"` player-decision type at `battleDecisionBoundary.ts:37`) |
| `switch-in-animation` | — | `battleScriptSwitchinOpcode.ts:691` | emitted (new kind, post-dates every version of `presentation-seam-scout.md` read this session) |
| `status-change` | `from`, `to` | **none in production** — only a `case` arm at `battleScriptMachine.ts` (switch-case exhaustiveness) and a hand-built fixture at `tests/battleScriptRulesExecution.test.ts:40` | **still declared, never emitted** |
| `outcome` | `outcome` | **none in production** — same exhaustiveness-only pattern, `battleScriptMachine.ts`; do not conflate with `factoryBattleScriptTerminalDecision.ts`'s unrelated `{kind:"terminal", outcome}` boundary-result type (one layer above this event union) or `battleEndTurnOrchestration.ts`'s unrelated `{kind:"outcome-decided"}` tick-loop control type | **still declared, never emitted** |

Confirmed via `grep -rn 'kind: "<variant>"' src/engine/battleScript*.ts
src/engine/factoryBattleScript*.ts src/engine/battleResolutionPresentation.ts`
per kind, then reading each hit (this session, not carried over from the
scout doc's own older counts).

### 1.1 The shared string resolver

`src/engine/battleStringResolver.ts` (198 lines) is the one
`STRINGID_* -> English text` table every window above funnels through:
`resolveBattleStringLines(messageId, resolvers)` (`:155-198`) reads the
365-entry extracted `gBattleStringsTable`
(`src/data/gen/battle-message-templates.json`) and throws — never
guesses — on an unresolved placeholder or unknown id. Companion resolvers:
`resolveBattleNameWithPrefix` (`:71-74`, "Foe "/"Wild " prefix),
`resolveMoveNameExclaim`/`resolveMoveName` (`:90-101`, move display name).

### 1.2 The presentation-event-to-window bridge

`src/engine/presentationEventWindowBridge.ts` (301 lines), every resolver
keyed on real `provenance.sourceLabel` (never a turn number), returns `null`
(not a guess) when a required signal is absent:

| resolver | sourceLabel(s) | shape | drives |
| --- | --- | --- | --- |
| `resolveFaintPresentationWindowContent` (`:38-57`) | `BattleScript_FaintTarget` | `{faintedBattler, message}` | `turn5-faint.json` |
| `resolveRockSlidePresentationWindowContent` (`:85-107`) | `BattleScript_HitFromAtkString`/`...HitFromAtkAnimation` | `{message, hp}` | every ROCK_SLIDE/ENDEAVOR window, turns 1/3/4/5/6/7 |
| `resolveDoubleTeamKickoffPresentationWindowContent` (`:142-168`) | `BattleScript_EffectStatUpAfterAtkCanceler` | `{message, statChange}` | `turn4-doubleteam` kickoff |
| `resolveFeatherDanceKickoffPresentationWindowContent` (`:205-241`) | `BattleScript_EffectStatDown` + `BattleScript_StatDownPrintString` (two labels) | `{message, statChange, statFellMessage}` | turn6/turn7/turn8/turn11 FEATHER_DANCE, turn13 SAND_ATTACK (generalizes across stat id/magnitude, proved by two independent unrelated callers) |
| `resolveMoveMissedKickoffPresentationWindowContent` (`:276-301`) | `BattleScript_PrintMoveMissed` + `BattleScript_MoveMissed` | `{message, missMessage}` | turn8 BIND miss |

## 2. Turn-keyed window census (the mission-named guard family)

All 18 traces the assigning brief named exist in `tools/compare/traces/`.
Re-ran a sample live against this lane's OFF oracle this session (others
taken from `PROGRESS.md` entry 1347, same-session, same oracle, not stale):

| trace | recorded | content source today | remaining turn-keyed surface |
| --- | --- | --- | --- |
| `turn4-doubleteam-off` | 256/256 | kickoff message + evasion `stat-stage-change` from `resolveDoubleTeamKickoffPresentationWindowContent` (rank 6, retired — `turn1Resolved`…`turn4Resolved` confirmed gone from source, §0) | presentation-TIMING constants only (`TURN4_*_DELAY`, gap-4 class, out of scope per every prior conversion) |
| `turn4-rockslide-off` | 256/256 | `resolveRockSlidePresentationWindowContent` (rank 6) | timing constants only |
| `turn5-reset-off` | 256/256 | rank 3 (retired); `turn5Resolved` gone | timing constants only |
| `turn5-action-off` | 32/32 | rank 3 | timing constants only |
| `turn5-confirm-off-a`/`-b` | 132/132, 131/132 | rank 3 | timing constants only (the 1/132 residual is a named, accepted #97 boundary, unrelated to content-sourcing) |
| `turn5-resolve-off-a`/`-b`/`-c`/`-d` | 196/196, 196/196, 195/196, 194/196 | rank 3 (`resolveFaintPresentationWindowContent` + `resolveRockSlidePresentationWindowContent`) | timing constants only; residual frames are pixel-only #97 debt (`docs/turn5-resolve-ab-pools-diagnosis.md`), not sourcing |
| `turn6-reopen-off` | 46/46 | rank 4 predecessor retired (`turn6Resolved` gone, `c6f3cdd4`) | timing constants only |
| `turn6-menu-off` | 47/47 | rank 4 | timing constants only |
| `turn6-rockslide-a`/`-b` | 255/255, 105/105 | `resolveTurn6RockSlideHpEndpoints`/`resolveTurn6RockSlideAttackLines`, wired at `src/engine/battleSceneCanonical.ts:1534,2654-2656` (rank 4 slice 1) | timing constants only |
| `turn7-rockslide-a` | 256/256 | `resolveTurn7RockSlideHpEndpoints`/`resolveTurn7RockSlideAttackLines`, `battleSceneCanonical.ts:1583,2656` (rank 4 slice 4) | timing constants only |
| `turn13-switchin` | 242/242 | rank 2 (retired, both faint-half and switch-in-half; `switch`/`switch-in-animation` events, `battleScriptSwitchinOpcode.ts:300-348,600-644,691`) | timing constants only; `turn13Resolved`'s dismiss-edge field `opponentFaintDismissElapsed` deliberately kept (§0) |

**Symbol-count evidence for "already retired," not asserted:** `grep -n
'turn1Resolved\|turn2Resolved\|turn3Resolved\|turn4Resolved\|turn5Resolved\|
turn6Resolved\|turn7Resolved\|turn8Resolved\|turn9Resolved\|turn10Resolved\|
turn11Resolved\|turn12Resolved\|turn13Resolved' src/engine/battleScene.ts
src/engine/battleSceneCanonical.ts` returns **zero matches**, live this
session. Every dispatch boolean the original scout doc's gap 7 named as
"no plausible kernel-event mapping" has been deleted outright, not mapped —
the resolution was to retire the *field*, not to find an event for it
(consistent with gap 7's own framing: it was never event-shaped state).

**What is NOT yet retired, confirmed by grep:** presentation-TIMING
constants (`TURN*_PRESS_TICK`, `*_TEXT_DELAY`, `*_MENU_REDRAW_DELAY`, the
`rockSlide*`/`turnNFeatherDance*` choreography helpers) remain turn-named
and hand-fit. This is **by design**, not an oversight: gap 4 (no tick/frame
timestamp on any kernel event, `battleScriptEvents.ts` provenance is
`programCounter`/`opcodeId`/`opcodeName`/`dispatcher`/`sourceLabel`/
`sourceStatementLine`/`instructionExecution`, re-confirmed unchanged this
session) means presentation timing has no kernel-native replacement, and
every prior conversion (rank 1-9) explicitly left it alone (documented
"Option A" in `presentation-seam-scout.md` §8.4, re-adopted every
subsequent rung). **Do not put timing-constant retirement on this ladder**
— it would need a kernel schema change (§8.4 Option B) with no evidenced
need for one anywhere in this census.

## 3. Ladder

Two genuinely open slices found; both are already scoped by an existing
committed scout doc (not re-derived here), both live-verified this session,
neither is a re-proposal of anything in §0/§2.

### Slice 1 — LANDED 2026-08-19: re-time the turns 9-12 Scene-OFF residuals

**Final state (main lane, three commits + finisher):** `4c5cd974`
(turn9-quickattack-off 177/233 -> 233/233), `be1b29a4`
(turn11-featherdance-off 189/191 -> 191/191), `b7f27fcb`
(turn12-aerialace-off 246/247 -> 247/247, salvaged from a cap-killed
worker). All three now carry red-verified Tier-1 pins
(`tests/battleScene.test.ts`, "ISSUES #39 rank-5 slice 1 (<sha>)" blocks)
directly against the fixed `menuIdleBounce` closed form, each paired with a
pre-fix (offset 0) mismatch proof. Differential guard
(`compare:differential -- turn10-aerialace-off turn10-rockslide-off
turn10-menu-off turn9-rockslide-off turn11-rockslide-off
turn12-rockslide-miss-off --base 59a1d2d4 --summary`) is byte-identical
(1312 captures). Spot-guards `turn5-resolve-off-a` 196/196 and
`turn5-confirm-off-a` 132/132 unaffected. `npm test`/`npm run
build`/`npm run typecheck` green. Landed addendum:
`docs/idle-bounce-phase-attribution.md`'s own "Landed addendum
(2026-08-19...)" section; row 5 of `docs/battle-scene-retirement-inventory.md`
updated to full bars. Original slice brief below, kept for the record.

### Slice 1 (first — sharpest, zero re-derivation needed): re-time the turns 9-12 Scene-OFF residuals

**Goal.** Three named pixel residuals in the already-content-retired rank-5
window family (turns 9-12, AERIAL_ACE/QUICK_ATTACK/ROCK_SLIDE) are **not**
sourcing gaps — `docs/rank5-effect-visibility-scout.md` (332 lines, already
committed) proved the "class (c)" judgment call the inventory's own
"Blocked work" section flagged does not exist ("class (c) is empty by
rule... there's no design space to adjudicate"). The real remaining work is
**re-timing class-(b) delay constants against the Scene-OFF oracle** — they
were fit to Scene-ON (8012) and never re-pinned against Scene-OFF (8014).

**Live-verified current state (this session, this lane's OFF oracle,
re-run, not copied from the scout doc):**

```
$ npm run compare -- turn9-quickattack-off --summary   # 177/233
$ npm run compare -- turn10-aerialace-off --summary    # 206/206 (already exact)
$ npm run compare -- turn11-featherdance-off --summary # 189/191
$ npm run compare -- turn12-aerialace-off --summary    # 246/247
```

These numbers match `docs/battle-scene-retirement-inventory.md` row 5's own
cited residuals exactly (177/233, 189/191, 246/247), confirming the
inventory is current on this row and that `turn10-aerialace-off` is the one
already-closed trace in the family. **The OFF-profile traces
`rank5-effect-visibility-scout.md` said did not yet exist (`§` Verification,
"today's pins stay valid as Scene-ON fixtures... they cannot serve as the
acceptance pins for a Scene-OFF retirement") now DO exist** in
`tools/compare/traces/` (`turn9-quickattack-off.json`,
`turn9-quickattack-b-off.json`, `turn9-rockslide-off.json`,
`turn10-aerialace-off.json`, `turn10-rockslide-off.json`/`-off-b.json`,
`turn10-menu-off.json`, `turn11-featherdance-off.json`,
`turn11-rockslide-off.json`, `turn12-aerialace-off.json`,
`turn12-rockslide-miss-off.json`) — that precondition is already satisfied;
a fix worker starts directly on the re-timing, no trace-authoring step
needed.

**Kernel events consumed.** None new — this is a pure timing-curve fit, not
a sourcing change. All three residuals are attributed by
`docs/idle-bounce-phase-attribution.md` (already committed, cited by both
the inventory and the rank-5 scout as the shared root cause) to one
mechanism: idle-bounce PHASE drift carried from the turns-1-4 dispatcher
retirement. Read that doc first; it is a diagnosis, not a fix, per its own
scope.

**Turn-keyed symbols retired.** None directly — this slice fixes pixel
timing on content that is already kernel-sourced (§2's rank-5 row). Its
value is closing the OFF-profile guard bar for these three traces, matching
the shape of the already-SETTLED ISSUES #97 program for turns 1-8 (per this
step's own mission context).

**Acceptance recipe.**
```sh
npm run compare -- turn9-quickattack-off --summary    # target 233/233
npm run compare -- turn11-featherdance-off --summary  # target 191/191
npm run compare -- turn12-aerialace-off --summary     # target 247/247
npm run compare:differential -- turn10-aerialace-off turn10-rockslide-off \
  turn10-menu-off turn9-rockslide-off turn11-rockslide-off \
  turn12-rockslide-miss-off --base <clean parent sha> --summary
```
The differential list is every OTHER trace in the same rank-5 family that
is already exact — it must stay pixel-neutral (byte-identical differential)
while the three residuals move.

**Out of scope.** Any rank 1-9 window (§2, already done). Any kernel opcode
work (none needed, per rank-5 scout's own finding). Timing constants for
any window outside turns 9-12.

### Slice 2 (second — mechanical, no semantic risk): continue the `battleScene.ts` → `battleSceneCanonical.ts` split

**Progress (2026-08-19, main worker session 10, `9ccc9cbc`):** batch 5 landed
12 more symbols (CANONICAL 226 → 214, bucket-acyclicity stays CLEAN,
differential 1241/1241 byte-identical). The remaining 214 are NOT all
equally blocked: this session found the partition script's CLEAN acyclicity
label proves only one direction (per ISSUES #39's caution), so eligibility
needs a transitive dependency-closure check per candidate, which the
partition script itself does not compute — a future batch worker must
re-derive it (or script it fresh) each time. This session also found a
SECOND animation-import hazard beyond design doc §7 hazard 1's named
example: the ONIX-Sitrus rotate/tint/ring/granting-star cluster (8 symbols)
calls `sitrus*AtAge` helpers from `../animation/heldItemHeal.ts`, confirmed
live via a failed `tsc` run, not just inferred — excluded pending hazard 1's
resolution. The two `let` caches (`turn10OnixDarkPaletteCache`,
`menuHealthboxPlayerContentMask`) are also confirmed still-blocked (ISSUES
#39's named obstacle — their consumers reassign them, impossible across an
ES import binding).

**Progress (2026-08-19, main worker session 11, `ce8e3892`):** batch 6
landed 41 more symbols under ISSUES #39's newly-authorized decision (a)
(CANONICAL 214 → 173, bucket-acyclicity stays CLEAN, differential
1241/1241 byte-identical, full `npm test` 10,114/10,114). All 41 are
`function` declarations — decision (a) makes them categorically safe
regardless of SHARED/LIVE dependency count, since every reference inside a
function body is a deferred, call-time read. Found the eligible pool this
way: of 214 remaining canonical-only symbols, 159 are `function`
declarations; of those, 48 have zero unmoved-canonical-internal dependency
(no topological batching needed); of those 48, one (`ONIX_SITRUS_ROTATE_
RENDER_LAG`) is a support constant for the still-blocked ONIX-Sitrus
cluster (the file's one remaining top-level module-eval `if` guard reads
it eagerly — moving it would make battleScene.ts itself eagerly read an
imported binding, the reverse-direction version of slice 1's TDZ hazard)
and 6 more turned out to import `src/animation/*` identifiers

**Progress (2026-08-19, main worker session 12, `a2a57e91`):** batch 8
landed 47 more symbols (CANONICAL 123 → 76, bucket-acyclicity CLEAN,
differential 1241/1241 byte-identical, full `npm test` 10,123/10,123).
Found a real gap in the eligibility scanner's let-cache hazard class: it
only flags moving the `let` cache itself, not a *function* elsewhere that
writes to a still-resident let-cache via compound assignment
(`turn10OnixDarkPalette`'s `turn10OnixDarkPaletteCache ??= ...` and
`getMenuHealthboxPlayerContentMask`'s `menuHealthboxPlayerContentMask =
mask`) — both were listed ELIGIBLE by the scanner but would fail to
typecheck (`cannot assign to imported binding`) if moved while their let
stays behind; excluded by hand after reading both bodies, not fixed in
the scanner (out of scope this round). Over-corrected in the same pass:
`playerHealthboxHpOverlayForHp` was also excluded alongside those two
without individually re-checking, even though its own cache
(`playerHealthboxHpOverlayByHp`) is a `Map` read/written via
`.get()`/`.set()`, not a `let` reassignment — legal to import. Left for
the next batch (see `PROGRESS.md` #1352). Scanner pool: 3 function-kind
ELIGIBLE remain (`getMenuHealthboxPlayerContentMask`,
`playerHealthboxHpOverlayForHp`, `turn10OnixDarkPalette`) — down from
batch 7's 100, since decision (a)'s function-kind pool is now nearly
exhausted; the next batch worker should expect the remaining ~28
CANONICAL-only symbols to need the non-`function`/topological-dependency
work batches 6/7 deferred, not another same-shape function-kind sweep.
(speciesIdleAnim.ts, firePunch.ts, featherDance.ts) — a **second,
previously-undocumented instance of design doc §7 hazard 1**, found only
by cross-checking every candidate's body against battleScene.ts's own
~270-line import header (the existing partition script's adjacency scan
only tracks references among battleScene.ts's own top-level symbols, so
it's blind to both this and the module-eval-guard hazard above). Landing
the batch also required a mechanical follow-through decision (a) implies
but doesn't spell out: 42 battleScene.ts-local SHARED/LIVE symbols needed
`export` added (pure visibility change) so the moved functions could
import them back, and 6 of battleScene.ts's own now-dead third-module
imports were removed. See `PROGRESS.md` #1350 for the full symbol/import
accounting. Still open: the ~111 non-`function` canonical-only symbols
(const-initializer eval-time-vs-deferred classification needs the same
import-boundary cross-check before trusting it) and `function` candidates
with unmoved-canonical-internal dependencies (topological batching, not
attempted this round).

**Goal.** `docs/battlescene-canonical-split-design.md` (685 lines,
committed) already specifies this as a pure, cycle-free text move (§1's own
"CLEAN — 0 leaked edges" acyclicity proof, re-verified live this session,
see below) — not a re-derivation, a continuation of a slice plan already
~35-45% executed (PROGRESS-archive entries 999/1000/1001).

**Live-verified current partition** (`node --experimental-strip-types
tools/report/battlescene-split-partition.ts`, re-run this session against
this worktree's `HEAD`):
```
battleScene.ts: 46,227 lines, 971 top-level symbols
  LIVE       370 symbols / 31,256 lines
  CANONICAL  220 symbols /  4,635 lines   <- still in battleScene.ts, not yet moved
  SHARED     383 symbols /  2,977 lines
Bucket-acyclicity: CLEAN -- no LIVE/SHARED symbol references a CANONICAL-only symbol
```
220 canonical-only symbols remain, down from the design doc's original
census of 570 (`battlescene-canonical-split-design.md` §1) — meaning roughly
350 have already moved across the prior three sessions' slices.

**Kernel events consumed.** None — this is a structural move, not a
semantic change; no `src/` behavior differs before/after a slice.

**Turn-keyed symbols retired.** None retired, but **moved out of
`battleScene.ts`** (the file the mission's "retire turn-keyed presentation"
goal is ultimately about shrinking) — each slice reduces `battleScene.ts`'s
own line count by its batch size, per the design doc's own §6 slice-4
"topological batches" plan (a batch is ~50 symbols; ~4-5 batches remain at
current progress).

**Acceptance recipe** (from the design doc's own §5 "standing acceptance,"
re-quoted so a fix worker needs no re-derivation):
```sh
npm run typecheck   # exit 0
npm run build        # exit 0
npm run compare:differential -- turn1-rockslide-off turn2-dragonbreath-off \
  turn5-faint turn5-switchin turn13-dragonbreath-faint turn15-fly-strike \
  battle-command-generated-off --base <clean parent sha> --summary
```
Plus `npm run test:smoke` per batch; the design doc reserves full `npm test`
for the final entry-point-flip slice only (§6, "Final slice").

**Out of scope.** The final slice (entry-point flip in `core.ts` + ~46
importers' path updates, design doc §6 "Final slice") — do not attempt in
one bounded step; it is explicitly its own rung. Widening
`tests/animation/animationBoundaryRatchet.test.ts`'s `allowedConsumers` (design
doc §7 hazard 1) — a cross-program decision the design doc itself defers.

### Slice 3 (lower priority, no blocking window found): `status-change`/`outcome` event emission

Both kinds are declared (`battleScriptEvents.ts:266,307`) and still have
**zero production emission sites** (§1, re-confirmed live). Unlike every
other gap in this doc, this session found **no committed window that is
currently blocked on either** — every `turnNResolved`-family window in §2
is retired without them (win/loss presentation reads
`factoryBattleScriptTerminalDecision.ts`'s own `{kind:"terminal", outcome}`
boundary result one layer above this event union, per rank 9's own
retirement, §0). List here only so a future scout does not re-discover the
absence from scratch; not sequenced as this ladder's next slice because
nothing currently needs it.

## 4. Blockers

1. **No kernel tick/frame timestamp on any `BattleScriptSemanticEvent`**
   (`battleScriptEvents.ts`'s provenance type, unchanged since
   `presentation-seam-scout.md` §7.2 gap 4, re-confirmed live this session —
   `grep -n 'tick\|frame' src/engine/battleScriptEvents.ts` finds nothing
   timestamp-shaped). Blocks nothing in §3's two active slices (both are
   content-complete or structural); would block any *future* attempt to
   retire the timing-constant layer §2 explicitly scopes out. Smallest
   unblock, if ever needed: key off the existing monotonic
   `instructionExecution` provenance field (already present,
   `battleScriptEvents.ts` provenance type) rather than adding a new field —
   `presentation-seam-scout.md` §8.4 Option B, never adopted because no
   window has needed it.
2. **`status-change`/`outcome` kinds undeclared-but-unemitted** (§1, §3
   Slice 3) — not a blocker for anything on this ladder; named for
   completeness only.
3. **`rank5-effect-visibility-scout.md`'s own re-timing work (Slice 1) has
   no owner doc for the actual delay-constant derivation** — the scout
   named the mechanism (idle-bounce phase drift) and the diagnosis doc
   (`docs/idle-bounce-phase-attribution.md`), but the concrete "measure
   these 3 traces' real oracle RAM/pixel delay values and correct these N
   named constants" work was never done; a fix worker's first action should
   be reading `docs/idle-bounce-phase-attribution.md` in full, not
   re-scouting.

## 5. What was already read and folded in (per this step's brief)

- `docs/presentation-seam-scout.md` (3,314 lines, §1-§15 read/summarized):
  original checkpoint recon; superseded by every rank in
  `battle-scene-retirement-inventory.md` for content, still correct on gap
  4 (timing timestamps) and the "never emit a turn number" discipline every
  bridge resolver in §1.2 above follows.
- `docs/battlescene-canonical-split-design.md` §7 (hazards) and whole doc:
  plan is executing, not "PLAN ONLY" as its own header still claims (§0);
  §7's animation-import hazard and §7's 46-importer count are unaffected by
  progress so far (no import path has changed yet, only bodies moved with
  re-exports).
