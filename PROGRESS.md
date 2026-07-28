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


---
## 626 — [BOUNDED MAIN WORKER 2026-07-28 ~12:29] Family-B Cluster 4 source-complete

- **State:** tree green at **392 files / 4487 tests**, production build, OFF
  oracle info, and `git diff --check`. Census is exactly **189/214 effects,
  329/355 moves, 269/276 distinct, 2940/2957 weighted**: Pay Day adds
  **+1/+1/+0/+0** over committed rung (a); all **67** census validations pass.
- **Did:** added source-exact player-side `level * 5` u16 Pay Day accumulation
  with wrap saturation and the shared zero-HP exception; registered
  `givepaydaymoney` with multiplier, link/recorded-link/no-pot exclusions,
  payout message buffer, and the source 999999 save-money cap.
- **Next:** finish full verification, commit rung (b), and hand back to the
  supervisor. Cluster 4 has no remainder.
- **Notes:** Pay Day is intentionally Tier-1/source-only because the census
  confirms zero Factory-L50 carriers. Tests pin player/opponent side, target
  faint, saturation, payout/cap, multiplier, exclusions, full script to END,
  canonical replay, and exact four-draw move / zero-draw payout ledgers. No
  new barriers, recording imports, presentation, round, tick, roadmap, issue,
  or oracle-trace changes.

---
## 625 — [BOUNDED MAIN WORKER 2026-07-28 ~12:23] Cluster 4 rung (a) item ownership implemented

- **State:** tree green at **392 files / 4479 tests**, production build, and
  `git diff --check`. Census is exactly **188/214 effects, 328/355 moves,
  269/276 distinct, 2940/2957 weighted**: inherited-baseline delta
  **+2/+3/+2/+8**; all **66** census validations pass.
- **Did:** source-ported Thief/Covet's complete battle-type/knocked-off/
  Sticky Hold/item gates, persistent held-item controller writes,
  `changedItems`/`lastUsedItem`, and Choice clearing; source-ported Knock
  Off's active-only clear, per-side party-slot mask, Sticky Hold branch, and
  switch-in suppression. Both item-animation operands are semantic.
- **Next:** finish full verification and commit rung (a), then implement Pay
  Day's source pot plus `givepaydaymoney` consumer only if the time box remains
  safe.
- **Notes:** receipt pins cover Covet active+party transfer, damage/PP through
  Sticky Hold, zero-HP steal, occupied/empty/Enigma/Mail no-ops, Knock Off's
  active-clear/party-intact asymmetry, Choice clear, Sticky Hold/no-item,
  switch persistence, full scripts to END, canonical replay, and exact
  four-draw ledgers. No new barriers, recording imports, presentation, round,
  tick, roadmap, issue, or oracle-trace changes.

---
## 624 — [BOUNDED MAIN WORKER 2026-07-28 ~12:16] Rapid Spin cleanup source-complete

- **State:** tree green at **391 files / 4466 tests**, production build, OFF
  oracle info, and `git diff --check`. Census is exactly **186/214 effects,
  325/355 moves, 267/276 distinct, 2932/2957 weighted**: inherited-baseline
  delta **+1/+1/+1/+1**; all **64** census validations pass.
- **Did:** registered source-order `RAPIDSPINFREE`: Wrap saves/restores the
  original target, clears trapping plus `wrappedBy`, and prepares the typed
  wrapped-move message; Leech Seed clears status plus owner bits; same-side
  Spikes clears its status plus layer count. The exact
  `gBattlerTarget <- sBATTLER` copy tuple and family-B byte are executable.
- **Next:** supervisor verify this commit. Rapid Spin has no remainder; resume
  the supervisor's ranked order without expanding into Thief/Knock Off/Pay
  Day or Metronome from this worker.
- **Notes:** all individual conditions, all-set priority, none-set no-op,
  full committed script to END, deterministic replay, and cleanup-local zero
  RNG are pinned. Deliberate exact-set moves: Rapid Spin's missing-opcode and
  copy-tuple blockers now require executable; handler surface **182→183**.
  No new barriers, recording imports, presentation, round, tick, roadmap,
  issue, or oracle-trace changes.
