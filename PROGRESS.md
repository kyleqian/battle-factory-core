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
## 553 — [USER-DIRECTED TOOLING 2026-07-27 ~23:10] Hybrid Fable-supervisor/Codex-worker profile ready on isolated branch

- **State:** `codex/hybrid-cloud-supervisor` includes current `master` and is
  green at **307 files / 3904 tests**; focused launcher profiles **11/11**,
  production build, shell syntax, oracle info, and `git diff --check` pass.
- **Did:** committed `4b7bf77`, adding `run-supervisor.sh --hybrid` plus the
  equivalent `--provider claude --worker-provider codex` profile. Claude
  Fable remains the interactive Remote Control supervisor; each bounded
  worker is routed independently to Terra/high, Sol/medium, or Sol/high, with
  provider-correct background/poll instructions.
- **Next:** review and fast-forward or cherry-pick
  `codex/hybrid-cloud-supervisor`; launch with
  `./run-supervisor.sh --hybrid`.
- **Notes:** all-Claude, ordinary all-Codex, and max-mode profiles remain
  regression-pinned; contradictory hybrid/max or Claude-worker selections
  fail fast. No game-code logic, oracle lifecycle, ratchet/barrier, recording
  import, animation, or issue change.

---
## 552 — [SUPERVISOR VERIFY 2026-07-27 ~23:10] Destiny Bond terminal path accepted; Substitute evidence merged

- **State:** reviewed union green at **307 files / 3898 tests**; focused
  **266/266**, production build, oracle freshness, and `git diff --check`
  pass. Census is **134/214 effects, 258/355 moves, 210/276 Factory-L50
  distinct, 2652/2957 weighted**.
- **Did:** accepted `410c751`/`5eb6a0f`: the reusable ordered multi-push VM
  control reproduces Destiny Bond's nested avenging→original-faint→caller
  returns, and a generic Wobbuffet→Snorlax Explosion turn reaches terminal
  with both faints exactly once. The hit-chain barrier ratchet shrank
  **23→22**.
- **Next:** register the one-byte `B_SCR_OP_SETSUBSTITUTE` /
  `EFFECT_SUBSTITUTE` from merged source/OFF evidence. Implement both strict
  low-HP failure and success mutations, plus already-live and cross-action
  persistence routes; regenerate the expected **+1/+1/+1/+10** delta.
- **Notes:** merged `f48d51f` after twice reproducing Golem Substitute at
  manifest `19e525d9…f7c7d`: HP **155→117**, PP **10→9→8**, and the live bit
  persist through a second real failed use. Low-HP internal fields are
  source-pinned but not oracle-exposed. No new barrier, recording import,
  animation edit, DEFERRED item, or oracle lifecycle action.

---
## 551 — [BOUNDED MAIN WORKER 2026-07-27 ~23:04] Destiny Bond executes and avenges through the real faint stack

- **State:** tree green at **306 files / 3895 tests**; focused **281/281**,
  production build, oracle freshness, and `git diff --check` pass. Census is
  **134/214 effects, 258/355 moves, 210/276 Factory-L50 distinct,
  2652/2957 weighted**, exact **+1/+1/+1/+10**, with all **42/42** checks.
- **Did:** committed `410c751` and `5eb6a0f`: registered source-complete
  one-byte opcode `0xaa` / `Cmd_setdestinybond`; genuine
  `BattleScript_EffectDestinyBond` reaches `END` with PP **5→4** and its live
  attacker bit/message. `Cmd_tryfaintmon` now clears the marker, pushes the
  original continuation then faint script, owns attacker-HP damage, executes
  passive HP update + attacker faint, and returns through the target faint
  exactly once. Generic Wobbuffet Destiny Bond → slower Snorlax Explosion
  reaches the real terminal boundary.
- **Next:** continue from the regenerated top blocker
  `B_SCR_OP_SETSUBSTITUTE` / `EFFECT_SUBSTITUTE`.
- **Notes:** retired the existing hit-chain barrier and ratchet exactly
  **23→22**; added no barrier or recording import. The existing
  `CANCELER_FLAGS` owner proves the bit clears before the user's next ordinary
  action. Oracle OFF evidence remains manifest `12dc947d…e86d4`; no oracle
  lifecycle action, animation edit, canonical Battle-2 work, or PAPERCUT.
