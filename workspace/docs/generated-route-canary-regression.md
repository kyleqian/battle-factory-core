# Generated-route Scene-OFF canary regression

**Verdict: (b), with a missing presentation receipt after the option boundary.**

`b464a6e7` correctly makes a fresh generated Factory battle honor Battle
Scene OFF, but it exposes an older gap: `Cmd_attackanimation`'s real
`BattleScript_Pausex20` branch has no semantic/presentation receipt. Before
that commit the incorrectly clear hit marker happened to emit
`MOVE_ANIMATION`, which the presenter used as a no-op 48-frame hold. The
commit removes that event as the source does, so the presenter starts the hit
reaction 48 frames too soon. Do not clear the option bit again.

This is an evidence-only checkpoint. No production source was changed here.

## Reproduction and bisect endpoints

All commands below used the fresh Battle Scene OFF oracle on port 8014.

```sh
npm run compare -- tools/compare/traces/battle-command-generated-off.json --summary
```

At current `103b0abe` (also `master` when checked), the result is **70/128**.
The exact 58 red captures are:

```text
68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85,
86, 87, 88, 93, 94, 95, 96, 103, 104, 105, 106, 107, 108, 109, 110, 111,
112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125,
126, 127, 128, 129, 130, 131, 132, 133, 134, 135
```

Equivalently: **68–88, 93–96, and 103–135**. The remaining 70 captures
match exactly.

I created one fresh `mktemp -d` scratch root and detached worktrees with
their `node_modules` symlinked from this worker tree:

```sh
git worktree add --detach "$scratch/good" 3d44b365
git worktree add --detach "$scratch/bad" b464a6e7
npm run compare -- tools/compare/traces/battle-command-generated-off.json \
  tools/compare/out/generated-route-canary-good --summary
npm run compare -- tools/compare/traces/battle-command-generated-off.json \
  tools/compare/out/generated-route-canary-bad --summary
```

Results:

| Checkout | Result |
| --- | --- |
| `3d44b365` (parent of the first bad commit) | **128/128** |
| `b464a6e7` | **70/128**, exactly the red list above |
| current `103b0abe` | **70/128**, same list and boxes |

This independently validates both bisect endpoints; it is not a stale
compare artifact.

## What changed on screen

I compared app PNGs directly between the two endpoint worktrees, rather than
only comparing each one to the oracle.

```sh
npm run inspect-frame -- \
  "$good/tools/compare/out/generated-route-canary-good/app-00068.png" \
  "$bad/tools/compare/out/generated-route-canary-bad/app-00068.png"
```

| Frame | Parent app | `b464a6e7` app | Strict app-vs-app result |
| --- | --- | --- | --- |
| 68 | Static post-text field | Generic hit age 1 | 1,360 px, bbox `13,16–112,44`: Aron healthbox shifts (`healthboxY2=+1`) |
| 69 | Still static | Generic hit age 2 | 1,780 px: the same healthbox cluster plus 420 px at `163,49–189,71`, because Aron becomes temporarily invisible |
| 88 | Still static | Generic hit with neutral healthbox offset | 420 px, only Aron’s sprite box, still invisible |
| 103 | Still static | HP command has already started | 2 px at `99,33–99,34`; this is the earliest post-hit schedule difference |
| 115 | First parent hit frame | Bad path is already past its hit | the phase offset reaches the former pause endpoint |

The bottom text is **not** the defect. Both endpoint render views at frame 68
contain `['GRANBULL used', 'EARTHQUAKE!']` with 24 visible characters; direct
PNG diff has no bottom-message cluster. The top-region bboxes in the failing
compare are the opponent healthbox/name chrome, followed by the opponent
sprite, not a changed string.

The reusable state dumper added with this dossier makes that visible without
any framebuffer fitting:

```sh
node --experimental-strip-types tools/probe/dump-generated-route-canary-state.ts \
  --repo "$good" --start 34 --end 135 --transitions
node --experimental-strip-types tools/probe/dump-generated-route-canary-state.ts \
  --repo "$bad" --start 34 --end 135 --transitions
```

The first action is identical through the printed text. At frame 67 the
parent enters a 48-frame no-op `move-animation` presentation command and
does not enter `hit-animation` until frame 115. The bad commit omits that
command entirely and starts `hit-animation` at frame 67. The relevant exact
command prefixes are:

```text
3d44b365: message(seq 3), move-animation(seq 5), hit-animation(seq 7), hp(...)
b464a6e7: message(seq 3),                         hit-animation(seq 6), hp(...)
```

At the first bad capture the bad render view is a hit for battler 1 with
`healthboxY2: 1`; at frame 69 it is `healthboxY2: -1` and
`targetInvisible: true`. The parent has `effect: null` throughout this
interval. Both resolutions remain **one segment** with a pending player
command request (`requestId: 3`) in this whole canary window.

## Attribution against `b464a6e7`

### (a) Frozen `Cmd_printstring` facts — ruled out

The new snapshot hunk in
`factoryBattleScriptFullTurnDecision.ts` freezes attacker/current-move/slot,
and `battleResolutionPresentation.ts` consumes it for `STRINGID_USEDMOVE`.
For this route it resolves to the same two Earthquake lines at both endpoints,
including the same fully visible text at frame 68. It cannot explain an
earlier hit controller or the healthbox/sprite-only app-vs-app boxes.

### (b) One-time option boundary — selected, narrowly

The `factoryRoundBattleOrchestrator.ts` hunk newly passes
`battleScene: 'off'`; `factoryBattleStart.ts` turns that into
`HITMARKER_NO_ANIMATIONS` once at fresh battle creation. This is the first
bad commit’s causal change for this trace.

`battleScriptHitChainOpcode.ts`’s `createAttackanimationOpcodeHandler` then
takes its `HITMARKER_NO_ANIMATIONS` branch. Source-shaped behavior there is:

```text
Cmd_attackanimation -> call BattleScript_Pausex20 -> pause B_WAIT_TIME_SHORT
```

The branch increments the animation counters but emits **no** semantic event.
Its non-OFF sibling emits `animationId: 'MOVE_ANIMATION'`. The presenter only
projects that latter event (`battleResolutionPresentation.ts`), where it
intentionally turns it into a no-effect command lasting
`1 + interveningInstructions + 32`; this canary’s observed duration is 48
frames. The renderer gives `move-animation` no visual effect, so it preserves
the settled text, healthbox, and sprite while the real Scene-OFF pause runs.

Thus the option initialization is source-correct; the missing bridge from its
suppressed-attack branch to the existing presentation pause is the bug. It
is a timing/clear-edge regression, not a wrong action result or RNG change.

### (c) Appended second immutable segment — ruled out

The grouping hunk only calls
`appendBattleResolutionActionContinuation` after a completed resolution has
a pending **trainer** command. This canary has not completed its first
Earthquake resolution: the dumper shows `segmentCount: 1` and a pending
**player** request from frames 34–135. The append path is unreachable before
the first bad capture, so it cannot cause frame 68 or any capture in this
diagnostic window.

### (d) Other — not supported

No separate visual change remains after accounting for the missing 48-frame
pause. The changes to frozen fields and grouping are present in the commit,
but their falsifiable preconditions are absent here.

## Minimal fix prescription

Keep the new fresh-start option boundary. Add one source-owned semantic
receipt for the existing `Cmd_attackanimation` no-animations branch, then
project it as the existing no-op hold:

1. In `createAttackanimationOpcodeHandler`, when
   `HITMARKER_NO_ANIMATIONS` selects `BattleScript_Pausex20`, emit a distinct
   immutable receipt for that branch (for example generic `animation` with
   `animationId: 'SCENE_OFF_ATTACK_PAUSE'` and the real attacker).
2. In `projectBattleResolutionCommands`, handle that exact receipt alongside
   `MOVE_ANIMATION`, producing the existing visual-no-op `move-animation`
   command. Its duration must use the same source-derived
   `1 + (hit instruction execution - attack-string execution) + 32` formula,
   not a trace tick or a fixed canary offset.
3. Pin the branch with a Tier-1 test: OFF Earthquake must emit the pause
   receipt, project `message -> pause -> hit`, and give this fixture its
   48-frame hold. The ON/controller-emitted `MOVE_ANIMATION` path must remain
   separately exact.

Using a distinct receipt is preferable to pretending a suppressed source
animation was emitted. It preserves the semantic difference while reusing
the renderer behavior that is already exactly the source pause: no move
effect is drawn and the completed message remains visible. A broader
inference such as “insert a pause whenever a hit follows a message with no
move animation” is not acceptable; it would conflate no-effect, spread, and
other source branches.

### Predicted post-fix acceptance

| Window | Current | Predicted after the receipt bridge | Reason |
| --- | --- | --- | --- |
| `battle-command-generated-off` | 70/128 | **128/128** | Its command schedule becomes the already oracle-exact parent sequence: hit begins at frame 115, not 67. |
| Rank-7 canonical charge/strike/selector/send-out differential set | 1,496/1,496 historical captures | **1,496/1,496 unchanged** | Those canonical `battleScene` windows consume the typed FLY adapter’s lines/HP/forced request and retain their own accepted pixel clocks; they do not render this generated orchestrator command duration. The new receipt may appear in the adapter’s semantic command list, but it must not alter its rendered facts. |

The implementer must run both checks as a hard gate. If the canonical
differential changes, stop rather than special-casing it: that would mean the
receipt is leaking beyond the generated generic presenter and needs a tighter
source-owner boundary.

## Verification in this evidence commit

- `bin/oracle info`: Battle Scene OFF profile confirmed.
- Baseline `npm test`: **592 files, 6,134 passed, 1 skipped**.
- Baseline `npm run build`: passed.
- No `src/engine/**`, trace, oracle, `PROGRESS.md`, or `ISSUES.md` file was
  edited.
