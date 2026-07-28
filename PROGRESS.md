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
## 618 — [SUPERVISOR VERIFY+FOLD 2026-07-28 ~11:00] Batch 1 accepted; hardened census folded — five status effects were runtime false positives

- **State:** verified entry 617 (suite **384/4391**, build) and merged census
  hardening `f80a90e7`; regenerated on the union as `693d2100`. Census is now
  honest at **172/214 effects, 301/355 moves, 245/276 distinct, 2773/2957
  weighted** (Batch 1's +6/+7/+7/+10 landed; validation checks 47→62).
- **Did:** confirmed the hardening's headline down-flip myself before merging:
  EFFECT_SLEEP/TOXIC/POISON/PARALYZE/YAWN were runtime false positives —
  their success paths halt today on unaccepted operands
  (`printfromtable gFellAsleepStringIds`; `copyarray (gEffectBattler,
  gBattlerTarget, 1)`; Yawn's `(sBATTLER, sBATTLER_WITH_ABILITY, 1)`). Root
  cause of the blind spot: their integration tests ran UNTIL the callback
  label, not through it (`tests/battleScriptStatusPrimaryOpcode.test.ts:425`),
  and the pre-hardening census walked opcode presence only. The generator now
  reads all operand surfaces live and gates Metronome's dynamic universe.
- **Next:** round 7 dispatched — main: status-family operand restoration
  (semantic widenings + through-the-callback committed-script tests; predicted
  **+5/+13/+11/+139** → 177/214, 314/355, 256/276, 2912/2957); side: Batch-3
  staging receipts (Pain Split/Stockpile family). Then Grudge+Spite (+4) and
  family-B Cluster 3 engine work against the banked receipts.
- **Notes:** no deferred questions. Deadline 15:07.

---
## 617 — [BOUNDED MAIN WORKER 2026-07-28 ~10:48] Ranked-opcodes Batch 1 executes all six effects

- **State:** tree green at **384 files / 4391 tests**, production build, OFF
  oracle info, ratchets **6/6**, and `git diff --check`. Registered Eruption/
  Water Spout, Teeter Dance, Magnitude, Belly Drum, Super Fang, and Hidden
  Power; the census generator/doc were deliberately not run or edited.
- **Did:** ported the five scalar/branch handlers plus Magnitude's one-draw
  seven-bucket table, formatted number, and source target rescan. Added
  source-shaped frozen six-IV battler state and Hidden Power's exact 30-70
  power / Fighting-Dark type derivation; current first-challenge Factory
  adapters materialize source `GetFactoryMonFixedIV(0,FALSE) == 3`. Tests pin
  arithmetic edges, every Teeter singles branch, Underground pre-formula
  doubling, controller/party HP sync, exact RNG counts, terminal walks, and
  deterministic canonical replays.
- **Next:** supervisor verify commits `62a3532b..ae81e86a`, regenerate/reconcile
  the concurrently hardened census, and expect the brief's
  **+6 effects / +7 moves / +7 distinct / +10 weighted** delta (from current
  171/307/249/2902 to **177/314/256/2912**).
- **Notes:** raw `battle_script_commands.c` + `battle_scripts_1.s`
  re-derivation found **zero dossier corrections**. Zero new barriers,
  barrier-pin moves, recording imports, census metadata edits, census/doc
  regeneration, oracle traces, presentation/tick/round branches, roadmap, or
  issue edits.

---
## 616 — [SUPERVISOR VERIFY+FOLD 2026-07-28 ~10:35] Perish Song accepted; ranked-opcodes dossier and Cluster-3 receipts folded

- **State:** independently verified entry 615 (suite, build, census idempotent
  at **171/214, 307/355, 249/276, 2902/2957**; Soundproof + `BS_SCRIPTING`
  live in the ability handler) and merged two side branches: `80049c35`
  (`docs/ranked-single-opcodes-notes.md` — falsified 7 of 12 ranked families'
  one-opcode-flip premises; ordered Batches 1-3 worth +13 effects/+25
  weighted; Metronome pinned as an end-of-universe gate) and `ab2d66cd`
  (`docs/family-b-cluster3-off-evidence.md` — Mean Look status2 0x04000000
  with rejected switch + Roar-release, Nightmare 0x08000000 with HP
  116→87→58 and wake-clears, twice-run byte-identical). Union green at
  **383 files / 4372 tests**; both side worktrees removed.
- **Did:** bumped the oracle-lab papercut (3rd hit). The Perish worker
  self-surfaced the dossier-predicted `BS_SCRIPTING` selector gap and widened
  it with the opcode, as the committed-script-to-end acceptance was designed
  to force.
- **Next:** round 6 dispatched — main: ranked Batch 1 (Eruption/Water Spout,
  Teeter Dance, Magnitude, Belly Drum, Super Fang, Hidden Power; predicted
  **+6/+7/+7/+10**; census regen deliberately skipped, supervisor reconciles
  post-merge); side: census-generator per-operand hardening
  (jumpifstatus2/playanimation/jumpifarrayequal/printfromtable/copyarray +
  Metronome dynamic-jump gate). Then Grudge+Spite (Batch 2 remainder,
  +2/+2/+2/+4) and Cluster 3 engine work against the banked receipts.
- **Notes:** no deferred questions. Deadline 15:07.

