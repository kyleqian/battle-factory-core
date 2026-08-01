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

## 816 — [bounded worker, 2026-08-01] rank-7 exact owner mirrors retired

- **State:** implementation `1f276c95` + `c0821a65`; focused exact/owner/
  selector/round/ratchet suites are **480/480** and TypeScript is green.
- **Did:** the historical charge/miss and locked-strike/faint route now keeps
  the same immutable two-segment resolution identity as the live orchestrator;
  that owner supplies PP and dispatch phase, publishes request 4, and owns the
  forced selector through send-out. Deleted `turn14Resolved` and
  `turn15PartySelect` from production and tests. Ordinary and +30 delayed app
  replays are byte-identical to `8caad013` across all 13 historical pins
  (**1,496 captures**); census fell **2,526→2,506 refs**, **33,135→33,125 LOC**.
- **Next:** resume #39 at rank 8's Turn-16/old-Turn-17 prefix; do not extend
  the canonical Battle-2 march.
- **Notes:** `8caad013` also hardens retained recharge/Bide action snapshots;
  merged OFF evidence `adfb746c`/`49e18075` pins the opponent-FLY lifecycle
  (124 captures, manifest SHA-256 `afadb6a2e3682b87dc6433de7f9726187d995f2d25cdc4c5941ebae2f49a07d3`).
  No mechanics/RNG/AI/outcome, animation, trace/capture list, ratchet,
  barrier, recording import, or timing/move/species/request/battle/turn/tick
  selector changed. Final full suite/build pending this entry's docs commit.

## 815 — [bounded worker, 2026-08-01] rank-7 opponent locked-action owner landed

- **State:** implementation `fea91d54`, documentation `2b94e1ea`; focused
  locked-action/presentation/round suites are **48/48**, full `npm test` is
  green (**569 files, 5722 passed + 1 skipped**), and production build is
  green.
- **Did:** the production seven-battle orchestrator now retains a completed
  resolution by generic locked battler/current-move/PP-slot identity across a
  genuine, independently presented player command. Submission reclaims the
  immutable charge owner, appends the opponent strike without a second PP
  write, restores visibility, publishes the typed forced request, and advances
  the existing `PartySelectState` through switch-in. Player-owned FLY,
  Scene-ON/OFF logical outcomes, and the seven-battle regression remain pinned.
- **Next:** retire the remaining exact-renderer
  `turn14Resolved`/`turn15PartySelect` mirrors as a separate bounded slice;
  do not resume the canonical Battle-2 march.
- **Notes:** no pixel count is claimed. No mechanics/RNG/AI/round outcome,
  animation code/ledger, ratchet, barrier, recording import, canonical trace,
  or timing/move/species/request/battle/turn/absolute-tick selector changed.

## 814 — [supervisor + bounded workers, 2026-08-01] rank-8 Scene-OFF status-icon receipt landed

- **State:** implementation `80c5d6af`, documentation `73ad40f2`, and
  primary-status-clear evidence `22421ee6`; focused
  resolver/presentation/round seam tests, full `npm test` (**569 files,
  5720 passed + 1 skipped**), and `npm run build` are green.
- **Did:** projected the existing `status-icon-update` kernel receipt into an
  immutable, one-controller-callback `status-icon` command. The raw
  `set-battler-status-data` write remains logical; the render field and
  round `displayedStatus1` now change only after the icon command completes.
  The generic message context reads `B_EFF_NAME_WITH_PREFIX` from the pending
  raw status receipt, so burn text never infers a target from a move/species.
  A legal generated Factory round proves FIRE_PUNCH's status write → burn
  text → icon receipt → nonterminal next-command handoff, plus a generic
  status clear is pinned at the renderer boundary. A second complete-party
  OFF trace proves Toxic raw write **142** → PSN display **235** → Heal Bell
  raw clear **275** → icon clear **326** → next command **409/415**.
- **Next:** return to rank 7's generic opponent-owned locked-action retention:
  preserve its resolution owner across the genuine intervening player command,
  then remove the `turn14Resolved`/`turn15PartySelect` mirrors without a
  turn/tick selector. Legacy rank-8 dispatch retirement remains separately
  scoped; do not resume the retired canonical Battle-2 march.
- **Notes:** the Scene-OFF oracle evidence is **42 captures with embedded
  states** for FIRE_PUNCH/burn plus **38 captures with embedded states** for
  Toxic/Heal Bell clear; supervisor reruns reproduced both, including clear
  manifest SHA-256 `068ccfb40b8e8fda280e33182d5033ba4131fc1040fc259865f43d6f0bc202a4`.
  This semantic slice adds no pixel-parity claim and no fabricated Scene-OFF
  status-animation receipt. No
  mechanics/RNG/AI/round outcomes, animation code/ledgers, ratchets, or
  oracle trace/capture lists changed.
