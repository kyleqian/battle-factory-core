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
## 612 — [BOUNDED MAIN WORKER 2026-07-28 ~09:53] Seven dispatch-ready family-B move effects execute end to end

- **State:** commits `e1d2243`/`ef9a9d9`; tree green at **380 files / 4337
  tests**, production build, OFF oracle info, census regeneration, all
  **47/47** validation checks, ratchets **6/6**, and `git diff --check`.
  Census is exactly **168/214 effects, 303/355 moves, 246/276 Factory-L50
  distinct, 2845/2957 weighted**.
- **Did:** retired the shared `applySetMoveEffect` barrier for exactly Tri
  Attack, Recharge, Rage, All Stats Up, Remove Paralysis, Atk/Def Down, and
  Sp. Atk Two Down. Reused recursive family-A status writes, recharge/lock,
  Rage, party status, and stat-stage owners plus the three committed callback
  scripts. Added every-branch/RNG/stat-boundary/recharge-clear tests and one
  full terminal committed-script walk with canonical replay per effect.
- **Next:** supervisor verify this finite cluster and combine it with the side
  OFF corroboration. Then take dossier Cluster 2 (Recoil 33 + Rock Head and
  Uproar end-turn), leaving the other eight family-B bytes barriered until
  their named downstream blockers land.
- **Notes:** predicted and actual delta both **+7 effects/+12 moves/+7
  distinct/+72 weighted**; all seven rows flipped. Raw C/script re-derivation
  confirmed the dossier—no falsified claim or unmodeled cell. Recharge's
  clearing turn source-faithfully leaves stale `lockedMoves` inert. The one
  family-B barrier statement remains reachable for all eight deferred bytes;
  barrier pins unchanged, none added. Census reporter changes are only the
  seven required constant-name/positive-validation metadata entries.

---
## 611 — [SUPERVISOR VERIFY+FOLD 2026-07-28 ~09:45] Trick and Heal Bell accepted; family-B falsification dossier folded

- **State:** independently verified entries 609/610 (suite **380/4315**,
  build, census idempotent at **161/214, 291/355, 239/276, 2773/2957**) and
  merged side scout `80f4c24` — `docs/set-move-effect-family-b-notes.md`, a
  15-case falsification of the family-B `applySetMoveEffect` cluster. Union
  green; side worktree removed.
- **Did:** spot-checked the dossier's two load-bearing claims myself
  (ABILITY_ROCK_HEAD absent from the `jumpifability` map ⇒ the census's
  "executable" EFFECT_RECOIL row is a runtime false positive; `jumpifstatus2`
  operand map is the narrow 4-value set blocking Mean Look/Nightmare
  pre-dispatch). Dossier orders 4 implementation clusters totalling
  +15 effects/+24 moves/+142 weighted; only 7 cases are dispatch-ready now.
- **Next:** round 3 dispatched — main: Cluster 1 (7 dispatch-ready cases,
  predicted **+7 effects/+12 moves/+7 distinct/+72 weighted**); side: OFF
  corroboration staging (Tri Attack/Overheat/AncientPower receipts). Then
  Cluster 2 (recoil+Rock Head+Uproar, +53 weighted) and census-generator
  per-operand checks (jumpifstatus2/playanimation/copyarray + Rock Head).
- **Notes:** census generator blind spots are recorded in the dossier §1;
  generator hardening is deliberately sequenced AFTER engine work per the
  dossier. No deferred questions. Deadline 15:07.

---
## 610 — [BOUNDED MAIN WORKER 2026-07-28 ~09:38] Heal Bell and Aromatherapy execute through masked party synchronization

- **State:** committed `c6bec4d`; tree green at **380 files / 4315 tests**,
  production build, OFF oracle info, census regeneration, all **42/42**
  validation checks, ratchets **6/6**, and `git diff --check`. Census is
  exactly **161/214 effects, 291/355 moves, 239/276 Factory-L50 distinct,
  2773/2957 weighted**.
- **Did:** globally registered one-byte `B_SCR_OP_HEALPARTYSTATUS` (`0xae`)
  with the source's `currentMove == MOVE_HEAL_BELL` split, six-slot masked
  party synchronization, active/partner live clears, Nightmare removal,
  Soundproof exclusions/ability recording/message bits, and one attacker
  controller event. Added validated/frozen party `abilityNum`, resolved
  benched abilities from the source-derived species corpus, widened the two
  Heal Bell `jumpifbyte` literals, and retired the shared
  `BS_ATTACKER_WITH_PARTNER` status-icon barrier. Full-turn healthy/statused
  Heal Bell proves PP **5→4**, persistent clears, message/animation/status
  tail, zero opcode-local RNG, next-request completion, and canonical replay.
- **Next:** supervisor verify this finite registration. The regenerated census
  names `B_SCR_OP_TRYSETPERISHSONG` as the next highest-weight registration;
  select/brief it separately.
- **Notes:** handler inventory **168→169**. Barrier pin
  `battleScriptHitChainOpcode.ts` **21→20** (retired, none added). Soundproof
  is reachable in real Factory parties: 15 generated sets across Whismur,
  Loudred, Exploud, Voltorb, Electrode, and Mr. Mime carrier species. No new
  recording import, presentation/tick/round branch, issue removal, oracle
  lifecycle action, or trace.
