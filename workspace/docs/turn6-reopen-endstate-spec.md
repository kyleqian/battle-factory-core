# Turn6-reopen 7318+ span: rung-4 spec (ISSUES #97-B continuation 6)

**2026-08-18, bounded SIDE worker.** Reconciles the unmerged sibling
`worker/side-20260817-235437`'s §10 findings (traced on a tree WITHOUT
rungs 1-2) against CURRENT MASTER (rungs 1-2 landed: `cb7f7e50` the
turn-6 3-tick reopen-press freeze, `63ed4746` window B's `+67`
raw-sine-index offset + `t-1` display-basis, both scoped to the
`[7305,7317]` dispatch only). **Verdict: the naive extension of rung 2's
correction into `[7318,7350]` is NOT safe to land** — live-verified,
not modeled. No `src/` edits are committed; `git diff -- src/` is empty.

**Head analyzed:** `7f2d3ba1` (this branch's parent, current master tip
at step start). No mid-step master commits landed during this session
(single-threaded analysis, no rebase needed). A parallel window-A rung 3
is a disjoint span (window A's own `+116` constant, `[5927,5931]`-adjacent)
and does not interact with anything in this doc.

## 1. Per-tick table, displayed frames 7318-7350, on current master

Dispatcher: `drawTurn6FightSubmenuWindow` (`battleScene.ts:11831`), past
`revealTick` (=7318, confirmed: `TICK0(1040) + openElapsed(6273) +
FIGHT_SUBMENU_OPEN_DELAY(5) = 7318`) and before `turn6FeatherDanceTextStartTick`
(7358, so text never intervenes in this range):

```js
const bounceTick = sm.confirmElapsed !== null
  ? turn6KickoffBounceTick(t, TICK0 + sm.confirmElapsed)   // pressTick=7345 (confirmElapsed=6305)
  : t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT;                    // FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT=2
drawTurn6FieldBase(fb, t, bounceTick);                       // bounceIndexOffset defaults to 0
```
`turn6KickoffBounceTick` (`battleSceneCanonical.ts:1313`):
```js
if (t < pressTick + FIGHT_CONFIRM_BOUNCE_FREEZE_DELAY) return t;   // raw branch - MISSING the -2 shift its `else` sibling one line up applies (confirmed: turn7KickoffBounceTick's own raw branch DOES apply it; turn8's doesn't either - not a #97-B-specific pattern, see §5)
return pressTick - TURN6_BOUNCE_FREEZE_ANCHOR_OFFSET;               // frozen: 7345-4=7341, constant
```
Live-tapped this session (`sm.openElapsed=6273`, `sm.confirmElapsed=6305`
for BOTH `turn6-reopen-off.json` and `turn6-menu.json` - identical
button-timing bookkeeping in the model for both traces, §4). Three
regimes result:

| t range | regime | bounceTick fed | offset | basis (t-1)? |
|---|---|---|---|---|
| [7318,7344] | idle-else | `t - 2` | 0 | no |
| [7345,7347] | kickoff-raw | `t` (unshifted) | 0 | no |
| [7348,7350] | kickoff-frozen | `7341` (constant) | 0 | no |

RAM ground truth (`src/data/gen/turn5-6-reopen-bounce-probe.json`,
`displayed(T) = RAM(T-1)`, §7a's proven basis) vs. current app output
(`onixY2`,`healthboxY2`), and the proposed extension's predicted output
(described in §2 below, `+67` offset + `t-1` basis at idle-else and
kickoff-raw, kickoff-frozen left untouched):

`(onixY2, healthboxY2)` triples, oracle vs. current-master app vs. the
proposed extension's app output (`+67` offset + `t-1` basis at
idle-else/kickoff-raw; kickoff-frozen untouched) - all three columns
computed via `npx tsx`, calling the real exported `menuIdleBounce`/
`turn5SitrusResettledBounceTick`/`turn6KickoffBounceTick` directly (not
hand arithmetic), and cross-checked against the live `npm run compare`
diff list (§2) tick-for-tick, zero discrepancies:

| T | oracle (RAM T-1) | app (current) | app (proposed) | current | proposed |
|---|---|---|---|---|---|
| 7318 | (1,2) | (1,1) | (0,1) | MISMATCH | MISMATCH |
| 7319-7325 | (0,1) | (1,1) | (0,1) | MISMATCH | **match** |
| 7326 | (0,1) | (0,1) | (0,1) | match | match |
| 7327 | (0,1) | (0,1) | (0,0) | match | **MISMATCH (regression)** |
| 7328-7334 | (0,0) | (0,1) | (0,0) | MISMATCH | **match** |
| 7335 | (0,0) | (0,0) | (0,0) | match | match |
| 7336 | (0,0) | (0,0) | (1,0) | match | **MISMATCH (regression)** |
| 7337-7343 | (1,0) | (0,0) | (1,0) | MISMATCH | **match** |
| 7344 | (1,0) | (1,0) | (1,0) | match | match |
| 7345 | (1,0) | (1,0) | (1,1) | match | **MISMATCH (regression)** |
| 7346-7347 | (1,1) | (1,0) | (1,1) | MISMATCH | **match** |
| 7348-7350 | (0,0) | (0,0) | (0,0) [untouched] | match | match |

**Net for [7318,7350] (33 captured frames):** current 9/33 match
(`{7326,7327,7335,7336,7344,7345,7348,7349,7350}`) → proposed 29/33
(regressions at `{7327,7336,7345}`, new fixes at 23 frames, 7318
stays mismatched both ways). Composed with the untouched `[7305,7317]`
span (11/13, unaffected): **20/46 → 40/46 for `turn6-reopen-off.json`
alone.**

## 2. Live verification (not just modeled) — and the blocking finding

Per the step brief, this was verified with a temporary reverted patch at
`battleScene.ts:11860` (`git diff -- src/` empty before this commit),
run through the REAL `npm run compare` pipeline, not just `npx tsx`
modeling. **Gotcha hit and worth flagging as a papercut**: this worktree
(`.worktrees/side-20260818-001212/`) has no `package.json` at its root —
running `npm run compare` from the worktree root silently walks up to
the MAIN checkout's `package.json` (`npm prefix` confirms this) and
compares against the **unedited** source, producing a byte-identical
baseline that looks like your patch is a no-op. Always `cd` into
**this worktree's own** `workspace/` before running `npm run compare`;
verify with `npm prefix` if a patched run ever reproduces the baseline
exactly. (~15 min lost to this before catching it — see final message.)

**Experiment A — the full proposed extension** (`+67` offset + `t-1`
basis at BOTH idle-else `[7318,7344]` and kickoff-raw `[7345,7347]`;
kickoff-frozen `[7348,7350]` untouched):
- `turn6-reopen-off.json`: **20/46 → 40/46** (matches §1's table exactly,
  mismatches `{7306,7317,7318,7327,7336,7345}`).
- `turn6-menu.json`: **33/44 → 6/44** — a **27-frame regression**.

**Experiment B — narrowest possible scope** (ONLY the kickoff-raw
`[7345,7347]` fix: the missing `-2` shift + `+67` + `t-1` basis;
idle-else `[7318,7344]` left on the OLD unfixed formula entirely):
- `turn6-reopen-off.json`: 20/46 → **21/46** (7346/7347 fixed, 7345
  regresses to match the old-formula coincidence it was already winning
  by — net +1, not the headline number, but the smallest safe-looking
  slice).
- `turn6-menu.json`: 33/44 → **30/44** — still a **3-frame regression**,
  at exactly `{7345,7346,7347}` — the SAME three ticks "fixed" for
  `turn6-reopen-off`.

**Root-cause implication (not resolved this session, flagged as the
real blocker for rung 4):** both traces' `sm.openElapsed`/
`sm.confirmElapsed` bookkeeping is **identical** (live-tapped:
`openElapsed=6273`, `confirmElapsed=6305` for both), so the model feeds
the *exact same* `bounceTick`/offset sequence to `menuIdleBounce` for
both traces at every displayed tick in `[7318,7350]`. Yet their ORACLE
ground truth diverges at `{7345,7346,7347}` (and, per Experiment A,
across most of `[7319,7343]` too) — real hardware's sine-index driver is
demonstrably in a **different phase** in the two traces at the same
absolute tick, despite identical modeled elapsed-tick bookkeeping. This
means some input this model does not track (most likely something in
each trace's own PRE-`[7305,+]` button history — e.g. a different count
of prior menu open/close cycles) shifts the real driver's phase, and
`+67` is not a context-free constant safe to bake into the shared
`drawTurn6FightSubmenuWindow` call site at all. Extending it there is a
**live-proven net negative** for the family (Experiment A: +20 for one
trace, -27 for a sibling; Experiment B: +1 for one trace, -3 for the
same sibling) — not a hypothetical risk.

## 3. Verdict and recommended edit list

**Do not land the `+67`/`t-1`-basis extension into `[7318,7350]` in
either scope tested.** Both the broad and the narrowest-possible
version regress `turn6-menu.json`, a same-family pinned trace, by more
than either version gains on `turn6-reopen-off.json`'s own frame count
(Experiment A nets -7 across the two traces combined: +20-27; Experiment
B nets -2: +1-3). Landing either would be a **strictly worse** family
state than current master's 20/46 + 33/44, not merely "a regression
worth reporting" — it fails the family net.

**Split, per the step's own categories:**
- **Fixed-by-rung-4: NONE.** No sub-slice of `[7318,7350]` has a
  live-verified fix that doesn't cost more than it gains elsewhere in
  the family. `[7345,7347]`'s "missing `-2` shift" bug (§10b) is real as
  an isolated arithmetic fact, but composing it with `+67` (required to
  match `turn6-reopen-off`'s own RAM receipt at those ticks, §1) is what
  triggers the `turn6-menu` regression — the bug fix and the `+67`
  offset cannot be landed independently and cleanly separated within
  this session's evidence.
- **§8d-permanent (out of scope, unchanged):** the sine-table-peak
  rounding artifact (6 residual ticks class, e.g. 7306/7317/7318) is
  untouched either way — genuinely orthogonal, not entangled with this
  finding.
- **7348-7350-uncalibratable: leave untouched, confirmed correct to do
  so.** Real hardware's driver is torn down (RAM `onixSinIndex`=
  `healthboxSinIndex`=0 literal at ticks 7347-7351, receipt-confirmed) —
  there is no dynamic ground truth to fit a raw-index correction against.
  The existing frozen-branch constant (`pressTick - TURN6_BOUNCE_FREEZE_
  ANCHOR_OFFSET = 7341`) was hand-picked (via `scan-bounce.mjs`, per its
  own doc comment) to coincidentally land on `menuIdleBounce`'s `{0,0}`
  plateau at offset 0 — both experiments this session left it untouched
  and it stayed correctly matching in all cases (`7348,7349,7350`) in
  every one of §2's runs. Composing `+67` into that same constant is
  untested and has no receipt to validate against; treat as a live
  landmine, not a free extension.

**No edit list is being handed to a rung-4 worker.** The one concrete,
scoped, low-risk action this session's evidence supports is: **before
attempting `[7318,7350]` again, find and probe a THIRD trace (or extend
the RAM probe itself) that isolates what differs between `turn6-reopen-
off.json` and `turn6-menu.json` before tick 7305** — likely a difference
in prior menu open/close cycle count — since that is the actual unknown
blocking any correction here, not the arithmetic (which is already
solved and cross-validated at the receipt level, §1). Until that's
pinned, `[7318,7350]` should stay exactly as current master has it.

## 4. Regression guards (all confirmed via live rerun this session)

| guard | expectation | confirmed this session |
|---|---|---|
| `turn5-reset-off.json` | 256/256 | yes, unaffected in both experiments (never touches this call site) |
| `turn5-action-off.json` | 1/32 | yes, unaffected (checked at baseline; not re-run patched, no code path overlap - `drawTurn6FightSubmenuWindow` is turn-6-only) |
| `turn5-confirm-off-{a,b}.json` | 8/132, 0/132 | yes, IDENTICAL baseline vs. Experiment-A-patched (live-reran both) |
| `turn5-resolve-off-{a,b,c,d}.json` | 7/196, 71/196, 149/196, 0/196 | yes, IDENTICAL baseline vs. patched (live-reran both) |
| `turn6-menu.json` | 33/44 (NOT in the step's own named guard list, but same-family and load-bearing) | **REGRESSES under both experiments** - 6/44 and 30/44 respectively - this is the session's central finding, §2/§3 |
| window A's own span `[5927,5931]` and `+116` constant | untouched | yes - no edit touched `turn5LegacyResettledBounceTickFromLatest`/window-A code at all |
| turns 7-13 kickoff paths (`turn7KickoffBounceTick` etc.) | untouched | yes - only `battleScene.ts:11860`'s local `const bounceTick = ...` line (turn 6's own) was ever patched; `turn6KickoffBounceTick` itself was read but never edited (its shared-function risk, if edited directly, would additionally require checking it has exactly one caller - confirmed via grep: it does, `battleScene.ts:11860` only) |
| other `menuIdleBounce` callers (~20 across turns 3,7,8,9,10, kickoff family) | untouched | yes - `bounceIndexOffset`'s defaulted-param idiom (already landed, rung 2) means every caller not explicitly passing a non-zero offset is unaffected by construction; this session's taps never touched `menuIdleBounce`/`battleMenu.ts` at all |

**Rerunnable PASS/FAIL check for a future rung-4 worker** (from a clean
tree, `git diff -- src/` empty):
```sh
cd workspace   # IMPORTANT: this worktree's own workspace/, not its parent - see §2's papercut
npm run compare -- turn6-reopen-off --summary | tail -1   # expect 20/46 on unmodified master
npm run compare -- turn6-menu --summary | tail -1          # expect 33/44 on unmodified master
```
Any candidate fix for `[7318,7350]` must be scored against **both**
numbers simultaneously (plus the full guard table above) — a candidate
that improves the first while dropping the second, by any margin,
reproduces this session's rejected result and should not land.

## 5. Full test/build verification

`npm test` and `npm run build` both run clean against the reverted
(unmodified) tree — no `src/` changes are part of this step's deliverable,
so neither suite's outcome is expected to differ from master's own
baseline. (Confirmed at commit time; see the worker's final message for
the actual run.)

## 6. Addendum (2026-08-18, bounded MAIN worker): supervisor overturn of §2/§3's rejection — the `[7318,7347]` correction LANDS

A supervisor decision (2026-08-18, evidence gathered at commit `003f014b`)
overturned this doc's §2/§3 verdict. The rejection's own premise — an
untracked "phase-history" input (prior menu open/close cycles) explaining
why `turn6-menu.json` and `turn6-reopen-off.json` diverge despite
identical modeled elapsed-tick bookkeeping (§2's own finding) — is
refuted by four points:

1. **Button histories are byte-identical.** The two traces' `segments`
   arrays split their idle waits differently but sum to the identical
   per-frame button sequence through tick 7350 (cumulative-frame
   expansion, cross-checked both ways).
2. **They are not the same oracle contract.** `turn6-menu.json` has no
   `oracleProfile` field — under this codebase's convention (`AGENTS.md`
   "New compare traces set `oracleProfile`... Historical traces without
   that field remain ON-profile"), it is a **legacy Battle Scene ON**
   trace, replayed against oracle profile `8012`. `turn6-reopen-off.json`
   declares `"oracleProfile": "battle-scene-off"`, replayed against `8014`.
   Both traces share the same `appRoute` (`canonical-recorded`), so this
   is the ONLY contract difference between them.
3. **The oracle PNGs themselves disagree; the app PNGs do not.**
   Byte-comparing the two compare runs' own oracle captures at their 44
   overlapping ticks (7307-7350): the ORACLE PNGs differ at **34/44**
   ticks; the APP PNGs (profile-blind, identical renderer for both) are
   identical at **44/44**. A single profile-blind app render can never
   match both oracles when the oracles themselves disagree at 34/44 of
   the shared ticks — the "different phase" §2 attributed to an untracked
   input is Battle Scene ON's own different animation timing shifting the
   real hardware bounce driver to a different sine phase, not a
   button-history difference this model fails to track.
4. **The main lane's own mission and precedent both point OFF.** The main
   lane's lane contract (`AGENTS.md`) scores against the Battle Scene OFF
   oracle; `turn6-menu.json` is not this lane's ground truth. OFF re-fits
   moving legacy ON counts without blocker treatment is already this
   line of work's own established precedent, not a new risk: `turn5-menu.json`
   (ON) went 42/42 -> 9/42 and this session's own live rerun confirms
   `turn6-featherdance`/`turn6-feathers` (ON) move 82/90 -> 64/90 and
   227/235 -> 209/235 alongside this fix, all attributed to the exact
   span touched. The receipt this whole fix derives from
   (`src/data/gen/turn5-6-reopen-bounce-probe.json`) is itself an
   OFF-profile capture — receipt, model, and the OFF traces this lane
   scores against all share one consistent ground truth; `turn6-menu.json`
   does not participate in that ground truth at all.

**Consequence:** §2's own Experiment A result (`turn6-reopen-off` 20/46 ->
40/46, live) undersold the correct outcome — it used the spec's own
`+67`/`t-1` combination, fit directly against the receipt's raw
`onixSinIndex`/`healthboxSinIndex` columns without correcting for their
**post-increment** capture (the driver reads `sSinIndex`, computes `y2`,
*then* adds `sDelta`=7 — one step too high). Composed on the corrected
basis (the same `+60`, not `+67`, window B's own landed fix already
uses) plus `turn6KickoffBounceTick`'s own missing-shift fix (§10b), the
span closes **completely**, not partially — see below. The `turn6-menu`
regression §2/§3 feared is real, expected, and — per points 1-4 above —
the unavoidable cost of scoring the correct (OFF) oracle rather than a
bug this fix introduces.

### Landed edit list

- `src/engine/battleSceneCanonical.ts`: `turn6KickoffBounceTick`'s raw
  (not-yet-frozen) branch now returns `t - FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`
  instead of bare `t` (§10b: its sibling `else` branch, one line above its
  only call site, already applied this shift).
- `src/engine/battleScene.ts`: `drawTurn6FightSubmenuWindow`'s post-reveal
  dispatch now computes `bounceTick`/`bounceIndexOffset` per regime — the
  idle-else regime (`sm.confirmElapsed === null`) and
  `turn6KickoffBounceTick`'s own raw regime both get the `t - 1` display
  basis (fed as the shifted tick argument) and `bounceIndexOffset = 60`;
  the frozen regime calls the (now-fixed) `turn6KickoffBounceTick` with
  the untouched real `t` and offset `0`, unchanged from before this
  session. `drawTurn6FieldBase`'s single `bounceIndexOffset` parameter
  already threads to BOTH the onix (`drawTurn5RockSlideAttack`) and
  healthbox computations internally (confirmed by re-reading — §10c's
  "two call site" risk was already resolved by that existing plumbing, no
  second call site needed for this span).
- `src/engine/turn5ResolutionAdapter.ts` /
  `src/engine/battleScene.ts` (`LEGACY_TURN6_FIGHT_COMMAND_PRESENTATION`):
  both "content-owned presentation bridge" copies of
  `bounce.kickoff.preFreezeTickOffset` updated `0` -> `-FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT`
  in lockstep with the real function's fix (a parity pin against
  `turn6KickoffBounceTick`, not yet render-consumed — required to keep
  `tests/battleScene.test.ts`'s own bridge-vs-legacy equality check green,
  not a rendering change).
- `tests/fightSubmenu.test.ts`: new Tier-1 pin, the composed model across
  the full `[7318,7350]` span against the receipt (33/33 exact), plus a
  regression-proof that the OLD (pre-fix) formula only coincidentally
  matched the same 9-tick set §10d already named.

The composition was proven per-tick against
`src/data/gen/turn5-6-reopen-bounce-probe.json` (33/33 exact, zero
exceptions across the FULL `[7318,7350]` span including the untouched
frozen tail) via `npx tsx` before any live oracle compare, per this step's
own required modeling-first discipline.

### Before/after table (this session's own live reruns)

| trace | oracle profile | before | after | verdict |
|---|---|---|---|---|
| `turn6-reopen-off.json` | OFF (8014) | 22/46 | **46/46** | CLOSED — full match |
| `turn6-menu-off.json` | OFF (8014) | 23/47 | **47/47** | CLOSED — full match |
| `turn6-menu.json` | ON (8012, legacy) | 34/44 | 10/44 | expected, accepted — all movement in `[7307,7347]` |
| `turn6-featherdance.json` | ON (8012, legacy) | 82/90 | 64/90 | expected, accepted — same span |
| `turn6-feathers.json` | ON (8012, legacy) | 227/235 | 209/235 | expected, accepted — same span |
| `turn5-sitrus-d.json` | ON | 15/133 | 15/133 | unchanged (hard guard — captures end at 7312, before this span) |
| `turn5-action-off.json` | OFF | 32/32 | 32/32 | unchanged (hard guard) |
| `turn5-reset-off.json` | OFF | 256/256 | 256/256 | unchanged (hard guard) |
| `turn5-confirm-off-a.json` | OFF | 60/132 | 60/132 | unchanged (hard guard) |
| `turn5-confirm-off-b.json` | OFF | 0/132 (689px/1.79%) | 0/132 (689px/1.79%) | unchanged (hard guard, magnitude identical) |
| `turn5-resolve-off-a.json` | OFF | 25/196 | 25/196 | unchanged (hard guard) |
| `turn5-resolve-off-b.json` | OFF | 88/196 | 88/196 | unchanged (hard guard) |
| `turn5-resolve-off-c.json` | OFF | 149/196 | 149/196 | unchanged (hard guard) |
| `turn5-resolve-off-d.json` | OFF | 0/196 (258px/0.67%) | 0/196 (258px/0.67%) | unchanged (hard guard, magnitude identical) |
| `win-terminal-window-off.json` | OFF, generated-orchestrator route | 3590/3590 | 3590/3590 | unchanged (spot-check, disjoint app route) |

`npm test`: 1,067 files / 10,045 passed (+1, the new composed-model pin) /
223 skipped. `npm run build` green.
