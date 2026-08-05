# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 950 — [supervisor salvage, 2026-08-05] #77 CLOSED: effectiveness/crit messages hold `B_WAIT_TIME_LONG` on the live route

- **State:** master at the docs commit following `7adbd559`, clean. The
  live-route fix is committed: `STRINGID_SUPEREFFECTIVE`/`NOTVERYEFFECTIVE`/
  `CRITICALHIT` now carry `WAITMESSAGE_LONG_TIMING` (64 frames post-typing,
  named for the source `B_WAIT_TIME_LONG`, `battle.h:324`) instead of
  `holdFrames: 0` — the user-reported "flashes for a fraction of a second"
  cadence bug. `STRINGID_USEDMOVE` untouched (no `waitmessage` in source —
  its pacing is animation/HP-driven). Old-value pins red-verified; negative
  pins added. Focused suite, typecheck, smoke **347/347**, and
  `compare:differential -- battle-command-generated-off.json --base 82563164`
  **128/128 byte-identical** (supervisor-run post-salvage).
- **Did:** worker was cap-killed (exit 124, 45-min cap) after its fix commit
  with one uncommitted type-only test narrowing; supervisor kept the
  narrowing (typecheck needs it), ran the remaining verification, deleted
  ISSUES #77, and wrote this entry. Ground truth + re-runnable oracle
  verifier live in `docs/battle-message-hold-cadence-ground-truth.md` +
  `tools/probe/verify-message-hold-cadence.ts` (merged earlier, ALL CHECKS
  PASSED twice).
- **Next:** #78 switch-presentation scout is completing in the side lane;
  then #55 scaffold provenance wiring (receipt §7), #79 Fly probe, #81
  torment message, #80 party-menu inventory, RECORD/RETIRE/lobby/REST.
- **Notes:** the scout flagged other `holdFrames: 0` ids for a follow-up
  audit only where a source `waitmessage` is unambiguous; the worker's
  final message lists none it was confident in — treat as a small future
  scout, not silent debt.

---

## 949 — [bounded MAIN worker, 2026-08-05] #76 Confuse Ray crash fixed: confusion message family resolves + reachable-gap census

- **State:** master `26579665`, clean. ISSUES #76 deleted (fixed); confusion
  family branches + repro tests + census docs + mechanicLab probe committed.
- **Did:** (1) Red-verified repro: HAUNTER CONFUSE_RAY vs MURKROW through the
  real full-turn reducer + presentation seam threw
  `battleStringResolver: unsupported control segment {B_EFF_NAME_WITH_PREFIX}
  in STRINGID_PKMNWASCONFUSED`. Root cause: confusion is a STATUS2 write
  (applyConfusionStatus2Mutation) that emits no `set-battler-status-data`
  receipt, so the generic fallback's pendingStatusMessageBattler bridge never
  fired — the one status-infliction id the generic path could not resolve.
  (2) Fix (red→green): `prepareMessage` now attaches `effectBattler` to
  STRINGID_PKMNWASCONFUSED (applySetMoveEffect already wrote it to the move's
  target) + three new messageLines branches — PKMNWASCONFUSED
  (`{B_EFF_NAME_WITH_PREFIX}` ← effectBattler payload), and
  PKMNISCONFUSED/PKMNHEALEDCONFUSION/PKMNFATIGUECONFUSION
  (`{B_ATK_NAME_WITH_PREFIX}` ← action snapshot's own attacker). Pinned by
  `tests/confuseRayInflictionPresentationRepro.test.ts` +
  `tests/confusedAdmissionPresentation.test.ts`. (3) Oracle spot-check:
  mechanicLab OFF trace (`tools/battle-lab/mechanic-confuse-ray-haunter-
  murkrow-off.json`, overrides.parties, all-opponent-slots-SPLASH) — the ROM
  inflicts confusion (status2=3, confusionTurns=3 at frame 112+); a
  pixel-check probe (`tools/confuseMessagePixelCheck.ts`) overlays the app's
  battle-window + "Foe MURKROW became\nconfused!" text onto the oracle
  message-hold frames: **0/38400 px differ at frames 140-160** (box ~108,
  typing 108-140 — typing cadence is #77, out of scope). (4) Census:
  regenerated `docs/printstring-literal-census.md` (confusion family now
  explicit; 207 ids → 86 explicit + 83 generic + 38 UNRESOLVED, unchanged
  count) and authored `docs/battle-string-resolver-reachable-gap-census.md`
  verifying the status-infliction family (paralysis/poison/burn/sleep already
  covered via the status1 bridge + explicit -BY branches) and splitting the 38
  remaining UNRESOLVED ids into Factory-plausible (incl. #81's
  STRINGID_PKMNCANTUSEMOVETORMENT) vs structurally out-of-Factory-scope.
- **Next:** MAIN: provenance wiring into `winTerminalWindowStage` per receipt
  §7, then #78 switch-presentation scout; SIDE: #77 message-hold timing scout.
  The next resolver gap (census list) should be picked up by a repro test
  first, per the census doc's enforced pattern.
- **Notes:** status1-infliction "was X" ids resolve via the generic fallback's
  status-data bridge; the confusion family was the only STATUS2-written
  infliction id and is now explicit. Smoke **347/347** at commit; full
  `npm test` + build pending at entry write.

---


- **State:** master `857dc84f` (swap-YES bind `5489a9f7` + side receipt merge),
  clean. New canonical trace `win-go-on-swap-offer-yes-off` **248/248** exact
  (frames 9930-10177; supervisor re-ran twice fresh post-salvage). Regressions
  re-held at the commit: WIN **3590/3590**, offer **115/115**, NO **213/213**
  (supervisor rerun), guide-dismiss **232/232**, LOSS **1943/1943**. Worker's
  full suite green pre-kill (**727 files / 6,979 passed / 1 skipped**);
  supervisor ran `npm run build` + smoke **347/347** after. The MAIN worker
  was cap-killed (exit 124) *after* its feature commit, during the final
  build — clean-tree salvage; this entry is the docs remainder.
- **Did:** (1) YES now enters the generic factory swap screen at the real
  schedule (A 10005-10006; settled input-ready player picker elapsed 99 =
  frame 10105). Two generic red-verified src fixes:
  `FACTORY_SWAP_SPECIES_FADE_ACTIVATE_ELAPSED` 59→63 (palette
  `softwareFadeFinishing` holds `active` 5 ticks past visual settle), and
  swap-picker category text derived from `draft-pool-header.json` (all 376
  species; was a six-species hand-cast that couldn't resolve the WIN route's
  DUSCLOPS party). Honest boundary: ball-rocking restart is per-ball
  `Random()%5` (ambient RNG, #55-adjacent), so the window ends at 10177,
  one frame before the first anim-end. (2) SIDE receipt
  (`docs/win-battle2-opponent-provenance-receipt.md`, supervisor re-ran the
  driver: ALL CHECKS PASSED): `GenerateOpponentMons` is **single-frame**
  (6636), pre-call cursor `0x7399E3AE` → 4 gapless draws → trainer **9
  LILIANA** + sets 169/170/130 byte-for-byte; party construction spans 32
  frames with ambient interleaving — per-mon cursors reproduce all three
  personalities exactly. §7 names the exact scaffold fields for the wiring
  step.
- **Next:** MAIN: #76 Confuse Ray crash (user play-test, top priority);
  SIDE: #77 message-hold timing scout. Then: provenance wiring into
  `winTerminalWindowStage` per receipt §7; #78 switch-presentation scout;
  #79 Fly visibility probe; #80 party-menu inventory; #81 torment
  indication; RECORD/RETIRE/lobby/REST per the user decisions below.
- **Notes:** user play-tested the pinned preview (`.worktrees/play-preview`
  at `974ef563`, port 5199) and filed six reports → ISSUES #76-#81. User
  scope decisions (2026-08-05, recorded in ROADMAP S10 + ISSUES #73): full
  battle parity breadth (all legal Gen-3 species/moves/abilities/items in
  singles; barriers become implement-or-prove-unreachable), RECORD
  stub-only (session flag for the 4→3 menu variant), REST unselectable
  (deliberate divergence), RETIRE fully (reuses the loss-lobby flow — same
  ROM script), lobby walkable / no exit / no PC (real map has none) /
  silent NPCs, wandering optional.

---

## 947 — [interactive supervisor, 2026-08-05] Launcher: DeepSeek deadline-in-prompt + generalized commit attribution

- **State:** master `35d1f90e`, clean; tooling-only (no engine or fixture
  change). `tools/test-codex-git-attribution.sh` **4/4**;
  `codexLauncherProfiles` + `vitestWorkerBudget` **38/38**. Claude/Codex
  worker briefs stay byte-identical (deadline clause is DeepSeek-only by
  design).
- **Did:** (1) DeepSeek worker/audit briefs now state their absolute deadline
  (local time + epoch derived from --cap-minutes) and instruct `date +%s`
  checks with a 10-minute wind-down — both observed cap-kills (exit 124) had
  every edit complete but uncommitted. (2) Root-caused untrailed DeepSeek
  commits: the 2026-08-04/05 trailer census read all supervisor commits
  `[Codex]` vs all worker commits `[NONE]`; `run-subagent.sh` strips the
  inherited Codex attribution env for every non-Codex provider and the
  OpenCode route never re-enabled it. Env passthrough itself was verified by
  a live OpenCode probe (GIT_CONFIG_* and POKEBENCH_* survive to tool
  shells), the deadline wrapper is transparent, and workers committed with
  plain `git commit` — so re-enabling at launch is sufficient. DeepSeek
  worker commits now stamp `Generated-by: OpenCode` +
  `Agent-model: deepseek/deepseek-v4-flash` (Agent-effort omitted — that
  route has no knob). Generic attribution files mirrored to
  `_template/tools/` (template test 4/4).
- **Next:** unchanged from 946 (terminal ambient-RNG/opponent provenance,
  WIN YES swap branch, RECORD/REST/RETIRE). `_template` still lacks the
  whole DeepSeek/OpenCode worker route (zero deepseek references there; the
  new launcher branches have nothing to attach to) — tallied in PAPERCUTS.md
  as deliberate follow-up debt, not silently absorbed.
- **Notes:** attribution stays trailer-based (author/committer unchanged) per
  the Codex precedent; `codex_git_attribution_enable` is retained as a
  Codex-identity wrapper so existing call sites are untouched.

---
