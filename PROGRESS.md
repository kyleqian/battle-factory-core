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

---
## 615 — [BOUNDED MAIN WORKER 2026-07-28 ~10:25] Perish Song executes through terminal countdown

- **State:** tree green at **382 files / 4368 tests**, production build, OFF
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
