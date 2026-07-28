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
## 615 — [BOUNDED MAIN WORKER 2026-07-28 ~10:25] Perish Song executes through terminal countdown

- **State:** tree green at **382 files / 4367 tests**, production build, OFF
  oracle info, census regeneration, all **47/47** validation checks, ratchets
  **6/6**, and `git diff --check`. Census is exactly **171/214 effects,
  307/355 moves, 249/276 Factory-L50 distinct, 2902/2957 weighted**.
- **Did:** registered source-complete `B_SCR_OP_TRYSETPERISHSONG` with
  all-battler set/immunity/failure semantics and the special Pressure PP
  scan; widened `jumpifability` for Soundproof + `BS_SCRIPTING`; added
  four-bit timer state with ordinary switch/faint clear and existing Baton
  Pass preservation; completed ordered post-Future-Attack countdown,
  current-timer formatting, zero-timer full-HP passive damage, faint, and
  checkteamslost routing. Full committed effect script reaches terminal.
- **Next:** supervisor verify this commit. Then continue the ranked
  single-opcode program; the regenerated census names
  `B_SCR_OP_SCALEDAMAGEBYHEALTHRATIO` (Eruption) as the next top row.
- **Notes:** predicted and actual census delta both **+1 effect/+1 move/+1
  distinct/+4 weighted**. Zero new barriers, barrier-pin moves, recording
  imports, presentation/tick/round branches, oracle traces, or issue edits.

---
## 614 — [SUPERVISOR VERIFY+FOLD 2026-07-28 ~10:25] Clusters 1-2 accepted; OFF corroboration receipts folded

- **State:** independently verified entries 612/613 (suite, build, census
  idempotent at **170/214, 306/355, 248/276, 2898/2957**; Rock Head live in
  the `jumpifability` map; EFFECT_RECOIL/DOUBLE_EDGE/UPROAR rows executable)
  and merged side staging `7a0602c0` — `docs/family-b-cluster1-off-evidence.md`
  with twice-run byte-identical Tri Attack/Overheat/AncientPower OFF receipts
  (real paralysis proc, Sp.Atk 6→4→2 with damage 17→9, five-stat proc) plus
  hermetic fixture tests. Union green at **381 files / 4359 tests**; side
  worktree removed. Bumped the oracle-manifest papercut (`lab` variant).
- **Did:** the family-B program's first two clusters are done at exactly the
  dossier's predicted +125 weighted; six bytes stay barriered pending their
  named blockers (Clusters 3-4).
- **Next:** main: Perish Song (opcode + Soundproof `jumpifability` widening +
  perish half of `HandleWishPerishSongOnTurnEnd`, banked evidence). Side
  (running): ranked-single-opcodes falsification scout. Then census-generator
  per-operand hardening and scout-ordered small-opcode batches.
- **Notes:** engine-vs-receipt A/B comparison for the Cluster-1 receipts is
  available follow-up work (receipts corroborate the ROM; engine is
  Tier-1-pinned from source). No deferred questions. Deadline 15:07.

---
## 613 — [BOUNDED MAIN WORKER 2026-07-28 ~10:08] Recoil/Rock Head and Uproar cluster execute end to end

- **State:** rung (a) committed as `e2c3c149`; full cluster green at **380
  files / 4356 tests**, production build, OFF oracle info, census
  regeneration, all **47/47** validation checks, ratchets **6/6**, and `git
  diff --check`. Census is exactly **170/214 effects, 306/355 moves, 248/276
  Factory-L50 distinct, 2898/2957 weighted**.
- **Did:** added `ABILITY_ROCK_HEAD` and source-exact 33% recoil through the
  shared callback, including collateral full-script proof for the existing
  25% recoil row. Added fresh/duplicate Uproar dispatch with its chance +
  `(Random() & 3) + 2` duration draws, move lock, committed callback, and
  complete end-turn owner: ordered sleeper wakes, Soundproof exemption,
  decrement, continuation/expiry messages, unable-to-move cancellation, and
  Yawn's now-live Uproar sleep block.
- **Next:** supervisor verify both green commits. Keep Pay Day, Thief, Mean
  Look, Nightmare, Rapid Spin, and Knock Off barriered for their separately
  scoped downstream owners; census-generator hardening also remains a
  separate step.
- **Notes:** predicted and actual full-cluster delta both **+2 effects/+3
  moves/+2 distinct/+53 weighted**. Rung (a) was **+1/+2/+1/+52**; Uproar
  was **+1/+1/+1/+1**. The counted `EFFECT_RECOIL` row stayed count-neutral
  and is no longer a runtime false positive. No new barrier, barrier-pin
  move, recording import, presentation/tick/round branch, issue removal,
  oracle lifecycle action, or trace.
