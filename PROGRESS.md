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
## 579 — [BOUNDED MAIN REVIEW WORKER 2026-07-28 ~03:35] Skill Swap shares canonical rule helpers

- **State:** committed `a358f91`; tree green at **337 files / 4071 tests**,
  focused **87/87**, and ratchets **6/6**. Production build, both-oracle
  freshness/info, census regeneration, and `git diff --check` pass. Census is
  unchanged at **146/214 effects, 272/355 moves, 223/276 Factory-L50
  distinct, 2727/2957 weighted**, all **42/42**.
- **Did:** removed Skill Swap's duplicate no-effect mask and weaker role
  resolver; `0xda` now reuses
  `BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT` and `requireBattlerRole` exactly like
  Fury Cutter/Rollout. Tightened tests so engine party assertions cover only
  modeled fields; persistent party abilities **39/5** remain an oracle-receipt
  claim. Corrected the shared switch-seam wording: species is modeled,
  `abilityNum` is not.
- **Next:** supervisor verify this review correction and select the next
  finite executable-frontier increment; do not extend the retired canonical
  Battle-2 march.
- **Notes:** Skill Swap behavior, census, handler inventory **155**, oracle
  evidence/hashes, and Taunt evidence are unchanged. Physical switch
  restoration remains exactly bounded at the shared seam with its stale active
  ability byte. No semantic, barrier/import-ratchet, controller, metadata,
  ability, animation, or issue change.

---
## 578 — [BOUNDED MAIN WORKER 2026-07-28 ~03:29] Skill Swap executes globally

- **State:** committed `b8bc27a` + `50014d7`; tree green at **336 files /
  4068 tests**, focused **68/68**, and ratchets **6/6**. Production build,
  both-oracle freshness/info, census regeneration, and `git diff --check`
  pass. Census is exactly **146/214 effects, 272/355 moves, 223/276
  Factory-L50 distinct, 2727/2957 weighted**, all **42/42**.
- **Did:** globally registered five-byte `0xda` through
  `createBattleScriptStatusRulesHandlers`. Exact both-NONE, either Wonder
  Guard, and `MOVE_RESULT_NO_EFFECT` failures jump to the decoded pointer;
  single-NONE succeeds. Success swaps only the two active ability bytes and
  owns zero RNG/events/party/HP/status/stage/PP/last-used-ability/entry-hook
  writes. The shared script proves PP-before-command failure.
- **Next:** supervisor verify this finite executable-frontier increment and
  select the next shared registration target; do not extend the retired
  canonical Battle-2 march.
- **Notes:** accepted action seed **3034451114** runs Girafarig/Shuckle
  **39/5→5/39**, player PP **10→9**, HP **177→172** only from later Tackle,
  final RNG **3031698222 / 4 calls**; oracle scenario/manifest hashes remain
  `aac80633…836dd883` / `1bb13425…54cd241a`, with persistent party abilities
  **39/5**. Handler inventory **154→155** only. The shared switch seam still
  lacks party species/abilityNum metadata and retains the stale active byte;
  its exact boundary is pinned, so physical switch restoration remains
  bounded rather than gaining a private handler. No new barrier/import
  ratchet, recording import, controller-local handler, animation/tick branch,
  issue removal, or oracle lifecycle action.

---
## 577 — [SUPERVISOR VERIFY 2026-07-28 ~03:20] Secret Power accepted; Torment evidence folded

- **State:** reviewed union green at **335 files / 4063 tests** and focused
  **35/35**; production build, both-oracle freshness/info, census
  regeneration, ratchets **6/6**, and `git diff --check` pass. Census is
  exactly **145/214 effects, 271/355 moves, 222/276 Factory-L50 distinct,
  2722/2957 weighted**, all **42/42**.
- **Did:** accepted globally registered Secret Power `0xe4` after an
  independent exact OFF replay (`dce99201…d38474`) and source/diff review;
  BUILDING maps to paralysis while the shared hit/effect chain owns PP,
  damage, status, and four RNG calls. Folded source-only Torment `0xce`
  evidence with an exact repeat replay (`f7a00036…b28c2`): target-owned
  `STATUS2_TORMENT`, duplicate PP spend, all-duplicate-move Struggle
  admission, and persistent active status are pinned.
- **Next:** implement `B_SCR_OP_TRYSWAPABILITIES` / Skill Swap globally
  from the accepted OFF/source evidence, including exact failure predicates,
  active-only ability exchange, and switch-in restoration. Expected census:
  **146/214, 272/355, 223/276, 2727/2957**.
- **Notes:** handler inventory is **154**; Secret Power's action-boundary
  proof remains target **362→311**, PP **20→19**, status1 **0→64**, final RNG
  **1633612974 / 4 calls**. Torment is evidence only. No unsupported/import
  ratchet, private handler, recording import, animation/presentation/tick
  branch, issue removal, DEFERRED item, or oracle lifecycle action.
