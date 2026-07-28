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

---
## 609 — [BOUNDED MAIN WORKER 2026-07-28 ~09:21] Trick executes through shared item/controller paths

- **State:** committed `b2a8714`; tree green at **379 files / 4302 tests**,
  production build, OFF oracle info, census regeneration, all **42/42**
  validation checks, ratchets **6/6**, and `git diff --check`. Census is
  exactly **160/214 effects, 289/355 moves, 237/276 Factory-L50 distinct,
  2769/2957 weighted**.
- **Did:** globally registered five-byte `B_SCR_OP_TRYSWAPITEMS` (`0xd2`)
  with source-ordered Trainer Hill/opponent-regular/Knock Off/two-empty/
  Enigma/Mail/Sticky Hold guards and no barriers. Success reuses attacker
  `changedItems`, active held items, both held-item controller events and
  party mirrors, both Choice cells, and `MOVEEND_CHANGED_ITEMS`; the shared
  `printfromtable` handler now resolves `gItemSwapStringIds`. Full-turn Furret
  Trick proves PP **10→9**, transient/restored item ownership, persistent
  player+opponent party swaps, bookkeeping clear, and zero opcode-local RNG.
- **Next:** supervisor verify this finite registration. The regenerated census
  names `B_SCR_OP_HEALPARTYSTATUS` as the next highest-leverage single
  registration; select/brief it separately.
- **Notes:** handler inventory **167→168**. Sticky Hold uses the existing
  `lastUsedAbility`/ability-record convention and fixed
  `BattleScript_StickyHoldActivates` transfer. No unsupported barrier,
  barrier-pin change, recording import, private item path, presentation/tick/
  round branch, issue removal, oracle lifecycle action, or new trace.

---
## 608 — [SUPERVISOR ORIENT 2026-07-28 ~09:10] Animation fold verified; session open on Trick frontier

- **State:** merged `animation-main` (55 commits through `7119ac3`, Headbutt/
  Body Slam/Faint Attack/Covet/Dizzy Punch/Tail Glow/Twineedle/Bite/Reflect/
  Dragon Rage/Shadow Punch exact promotions plus staged Thunder Wave; animation
  coverage now **64 exact / 0 partial / 1 staged / 211 unsupported**) into
  `master` as `dc8c6e5`. Union green: **378 files / 4287 tests**, production
  build passes, `git diff --check` clean. Both oracles restarted 09:06 at
  harness HEAD `0d4ad46`; `check-oracle-freshness.sh` passes, retiring entry
  606's Scene-OFF staleness note.
- **Did:** required orient fold only; no engine, census, or issue change.
  Animation ledger top entry carries no "For the main program:" line.
- **Next:** dispatch the accepted Trick step from entry 605 — source-complete
  `B_SCR_OP_TRYSWAPITEMS` through the shared item/change-state paths using
  `docs/trick-off-evidence.md`. Expected census: **160/214, 289/355, 237/276,
  2769/2957**.
- **Notes:** hybrid supervisor session (Fable + Codex workers), hard deadline
  2026-07-28 15:07. DEFERRED.md is empty; ISSUES #41/#39 remain the tracked
  debt, #38 parked.
