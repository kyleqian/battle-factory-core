# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---
> **STANDING ARRANGEMENT (user directive, 2026-07-26):** the animation
> program runs under its own supervisor (`./run-supervisor.sh --lane
> animation`, guide `ANIMATION_SUPERVISOR.md`) in the persistent
> `.worktrees/animation-main` worktree on branch `animation-main`. Main
> supervisor: never brief animation work; fold `animation-main` into
> `master` at orient when it has new commits (details in SUPERVISOR.md's
> parallel-workers note). This replaces the temporary animation pause —
> entry 468's animation items are the animation supervisor's backlog now.

## 823 — [bounded MAIN worker, 2026-08-01] #61 DMA queue evidence checkpoint

- **State:** no production behavior change. The full source queue proves the
  required two-poll shape cannot honestly be derived from the current
  high-level state; committed as green evidence checkpoint `98a2441f`.
- **Did:** added a narrow mGBA queue-slot probe and captured all four OFF
  openings. Each emits the same source `9/11/6` BG-copy batches; turn 3 alone
  checks before the final VBlank drain. The missing fact is generic
  controller/VBlank ordering, not a turn, tick, move cursor, or queue-size
  distinction. Recorded the reproducible evidence in the #61 dossier.
- **Next:** stop this implementation slice at the green evidence checkpoint.
  A future owner must first derive a source-backed controller/VBlank-phase
  event before wiring one DMA-ready reveal transition to render and input.
- **Notes:** OFF insurance compares: turn 1 **81/81**, turn 2 **256/256**,
  turn 4 **256/256**; turn 3 remains the honest #61 residual **254/255** at
  frame 3852. Full `npm test`: **573 files, 5,907 passed + 1 skipped**;
  `npm run build` green. No mechanics/RNG/AI/outcome, animation,
  trace/capture-list, ratchet/barrier, recording import, or prohibited
  selector changed.

## 822 — [bounded MAIN worker, 2026-08-01] rank-2 turn-13 predecessor handoff retired

- **State:** implementation `53472f3d` + `79885140`; the typed adapter
  handoff now replaces `turn13Resolved` and the source/test census is clean.
- **Did:** published the immutable post-turn-13/next-command handoff with
  DRAGON_BREATH **18/20**, persisted slot 2, and typed settled/ready
  redraw-input facts. Swapped the following FIGHT reopen gate, dispatcher
  threading/rejection, and turn-14 submenu PP reconstruction; the FLY owner
  remains its distinct post-turn-14 **17/20** owner. Kept
  `opponentFaintDismissElapsed` and `turn5Resolved` untouched.
- **Next:** resume the remaining roadmap/#39 inventory from its next bounded
  lifecycle slice; the separate turn-5 predecessor class remains open.
- **Notes:** Tier-1 proof/consumer suites green; full `npm test` **572 files,
  5,902 passed + 1 skipped**, and build green. OFF compares: 141/141,
  242/242, dense-b 223/223, turn13-sandattack 190/190; dense-a remains its
  parent-identical parked #23 result (204/256 on `41409b24` and here).
  `turn13-menu` remains 56/57; `turn14-fly-miss` aborts on the same preexisting
  unresolved item-restored-health placeholder in parent `41409b24`.

## 821 — [supervisor orient, 2026-08-01] animation-main folded; freshness FAIL judged client-only

- **State:** master fast-forwarded to fold union `4843f6c8`; full `npm test`
  green on the union (**572 files, 5,899 passed + 1 skipped**) and production
  build green.
- **Did:** folded ~30 animation commits (seven more front send-out families
  accepted with receipts/fixtures). Read the animation ledger's "For the main
  program" line: rung 1 — extracting `sMonFrontAnimIdsTable`,
  `sSpeciesToBackAnimSet`, `sBackAnimNatureModTable`,
  `sMonAnimationDelayTable`, `sBackAnimationIds` into `src/data/gen/` — is
  main-program-owned and blocks animation rung 2; dispatching it to the side
  lane this session. `check-oracle-freshness.sh` FAILs both ports, but the
  only harness commit since service start (`acc5c4e`) touches the `bin/oracle`
  CLI and `_template` mirrors — client-side only, no service/schema change —
  so per the known tooling-only false-positive class, no restart. DEFERRED
  empty. A live animation worker exists (their lane, untouched).
- **Next:** main lane: #39 rank-2 remainder — typed turn-13
  completed-resolution/next-command handoff (PP 18/20, persisted slot,
  redraw/input readiness), then retire `turn13Resolved`. Side lane: the
  rung-1 five-table extraction.
- **Notes:** session deadline 15:32; supervisor session, hybrid profile.
