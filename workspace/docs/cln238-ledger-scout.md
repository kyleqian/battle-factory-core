# Cleanup step 2 scout — root ledgers (read-only, 2026-11-02, Sonnet worker; supervisor-saved, unverified)

Input to the cleanup step 2 brief. As read on master `286bf0891`; re-check before moving anything.

Everything below comes from grep and read only, with no edits. The worktree is clean (`git status` is empty).

## 1. Root ledgers in `workspace/`

| File | Lines | Plan disposition |
|---|---|---|
| AGENTS.md | 315 | keep (read by every worker) |
| ROADMAP.md | 2487 | rewrite to ≤ 200 lines, old copy to archive |
| ISSUES.md | 3814 | rewrite to open only, old copy to archive |
| PROGRESS.md | 109 | keep. It already holds only 2 entries, so this is already within "last 3". |
| PROGRESS-archive.md | 52129 | archive |
| PAPERCUTS.md | 1888 | archive (AGENTS.md:158-162 and `run-subagent.sh:424` mention it) |
| SUPERVISOR.md | 449 | archive. It is not in the "keep" list, but `run-supervisor.sh` reads it (see risks). |
| LOCAL_SETUP.md | 108 | archive |
| DEFERRED.md | 62 | see risks. It has no open `## D<n> — OPEN:` heading today. |
| ANIMATION_PROGRESS.md / -archive | 93 / 16891 | archive |
| ANIMATION_INTEGRATION_PROGRESS.md / -archive | 3103 / 415 | archive |
| ANIMATION_INTEGRATION_BRIEF.md / _SUPERVISOR.md | 126 / 175 | archive |
| ANIMATION_VERIFICATION.md | 198 | archive. `run-subagent.sh:547,558,560` tells animation-lane workers to read it. |
| ANIMATION_LATCHES.md | 240 | archive, but 24 tests read it (below) |
| ANIMATION_DEFERRED.md / _UNATTENDED.md / _SUPERVISOR.md | 12 / 73 / 147 | archive |
| ANIMATION_RUNTIME_INVESTIGATION.md | 238 | archive; `tools/animation/runtime-spike/README.md:3` links it |
| NATIVE_ANIMATION_BRIEF.md / _PROGRESS.md | 34 / 68 | archive |
| PLAYABLE_ANIMATION_INTEGRATION_AUDIT.md | 110 | archive |
| RUST_PROGRESS.md / -archive / _SUPERVISOR.md / _DEFERRED.md / _UNATTENDED.md | 174 / 4399 / 102 / 14 / 39 | archive |
| ANIMATION_COVERAGE.json | 11244 | do not move (section 2) |
| `.run.json` | tracked | not a ledger; leave |
| CLAUDE.md | 3 | leave |

- **No workspace README.** There is no `workspace/README.md`. The only README is the top-layer `../README.md` (49 lines), and `../CLAUDE.md:4` points at it. "README" in the plan means either creating a short `workspace/README.md` or counting the existing one.
- **Archive directory.** `docs/archive/` currently holds only `cln237-deleted.txt`.

## 2. Runtime readers (non-comment) that block a move or need a path update

**Tests (24 files, 25 `readFileSync` calls) read `ANIMATION_LATCHES.md`.** They also `toContain` exact tokens from it, so the file must be moved unchanged and the paths updated. All are in `tests/animation/`:
- `blueLightWallReflectTrack:762`, `blueOrbReversalEvidenceTrack:483`, `brownOrbMudShotTrack:463`, `crossImpactCrossChopTrack:538`, `dragonFireProjectileTrack:530`, `elementalPunchTrack:276`
- `explosionSpriteSelfDestructTrack:648`, `fastContactTrack:254`, `fingerMetronomeTrack:417`, `flyingDirtSandstormTrack:505`, `focusEnergyEndureTrack:428`, `greenSparkleMoonlightTrack:433`
- `greenSpikeNeedleArmTrack:474`, `letterZRestTrack:321`, `metallicShineTrack:223`, `mudSandScatterTrack:279`, `noiseLineRoarEffectTrack:282`
- `razorLeafParticleCutterTrack:480` and `:619`, `rockMonBackAndForthMagentaHeartTrack:554`, `shakeTargetInPatternScaryFaceTrack:504`, `slamHitSlideShakeTrack:406`
- `sparkle4GrowGrayscaleTrack:519`, `waterPulseEvidence:85` (asserts the file does not contain "Water Pulse"), `whiteFeatherTrack:197`

**`ANIMATION_COVERAGE.json` is read by about 280 files.** Moving it is not a "docs move".
- **Tests:** 191 files in `tests/animation/` use `readFileSync("ANIMATION_COVERAGE.json")` or `resolve(root, …)`.
  - Examples: `animationBookkeepingIsolation.test.ts:26-27` (copies it into a scratch dir), `spiderWebSourceCheckpoint:65`.
  - `animationWorkPlan.test.ts` and `factoryAnimationInventory.test.ts` also touch it.
- **Tools:**
  - 87 `tools/compare/*SourceAudit|Evidence|verify*Staging.ts` read it (e.g. `auroraBeamSourceAudit.ts:34`).
  - `tools/animation/coverage.ts:3` statically imports it. `report.ts` behind `npm run animation:coverage` (`package.json:39`) goes through that.
  - `tools/animation/rank-remaining.py:28` reads it.
  - `tools/cleanup/keepClosure.ts:50` explicitly exempts it.
- **Recommendation:** leave it at the root (it is data, not a ledger). Moving it means a mechanical edit to about 280 files.
- **`src/` and `vite*` read none** of the ledgers.

**Launchers and ops scripts:**
- `run-supervisor.sh`:
  - `:285-287` sets `DEFERRED_FILE` to `DEFERRED.md`, `ANIMATION_DEFERRED.md` or `RUST_DEFERRED.md`.
  - `:294` runs `grep -E '^## D[0-9]+ .*OPEN:'` on it.
  - `:310` builds `<LANE>_UNATTENDED.md`, exit 7 if it is required and missing.
  - `:446-448` emits `supervisor_guide=SUPERVISOR.md` (or the animation/rust guides).
  - `:556,559,562` are the supervisor prompts naming `SUPERVISOR.md`, `AGENTS.md`, `LOCAL_SETUP.md`, the latest `PROGRESS.md` and `ROADMAP.md`. They also name the `ANIMATION_*` and `RUST_*` guides.
- `tools/run-subagent.sh:532-540,551,558,560,576,584,588` have prompt strings naming `AGENTS.md`, `PROGRESS.md`, `ISSUES.md`, `ROADMAP.md` and `SUPERVISOR.md`. `:547,558,560` also name `ANIMATION_VERIFICATION.md`, `ANIMATION_INTEGRATION_BRIEF.md` and `ANIMATION_INTEGRATION_PROGRESS.md`. `:584` says "Follow the finite Stage 8 reset in ROADMAP.md", which will not exist after the rewrite.
- `run-agent.sh:85` says "Read the top entry of PROGRESS.md and the authoritative Stage 8 reset in ROADMAP.md" (same stale-section problem).
- `tests/codexLauncherProfiles.test.ts:95` asserts `supervisor_guide: "SUPERVISOR.md"` from `run-supervisor.sh --print-config`. It does not read the file, so it only breaks if the launcher output changes. It also uses `--sub-agent codex`, so it overlaps cleanup step 3.
- `tools/run-claude-supervisor.py`, `tools/autonomy/*.sh` and `tools/git-hooks/prepare-commit-msg` name no ledger. `tools/autonomy/README.md:53-54` only mentions the `*_UNATTENDED.md` files in prose, and `run-lane.sh:112` calls `run-supervisor.sh --lane`.
- No test, tool or `package.json` script reads `ROADMAP.md`, `ISSUES.md`, `PROGRESS*.md`, `PAPERCUTS.md`, `AGENTS.md` or `LOCAL_SETUP.md`. I found none by string-literal path, and no root-directory scans.

**Mentions only (comments or prose, no runtime effect, no change needed):** about 300 `// … PROGRESS.md #NN` comments in `src/engine/battleScene.ts` (lines 62-379, 3398-13599 and others), plus `ANIMATION_PROGRESS.md` comments in `src/animation/*`, `tools/probe/*.py` and `tools/extract/*`.

**Stale line-number citations (not breakable by a move):** `tools/report/gate6-coverage-manifest.ts:2841` and several docs cite `ROADMAP.md:NNNN`.
- That string is part of the generated manifest compared by `tests/gate6CoverageManifest.test.ts:14-15`. Do not edit that tool text.
- Docs that cite `ROADMAP.md` line numbers include `docs/gate5-acceptance-audit.md`, `docs/noland-brain-staging-design.md` and `docs/s10-move-parameterization-audit.md`. Counts of docs that name each ledger: `ISSUES.md` 71, `PROGRESS.md` 68, `AGENTS.md` 31, `ROADMAP.md` 22.

## 3. ISSUES.md: open vs closed-in-place vs historical (38 headings, 3814 lines)

**Open, actionable (keep, trimmed to what is still open):**
- #189 (7 lines) and #188 (8 lines)
- Residual entries whose headings say part is already FIXED: #168 (7), #167 (26), #161 (7), #154 (14), #153 (19), #152 (50), #148 (12), #147 (11), #146 (24), #145 (19), #143 (20), #139 (10)
- #109 (10) and #114 (11): the two engine entries the finish plan calls unreachable in singles
- Large open entries: #71 (231 lines), #73 (584), #55 (1499), #39 (665). Each is mostly dated addenda, so "open only" needs a real rewrite of these four.

**Closed or historical, but sitting in the "Open" section:**
- #72 (line 539, 107 lines): heading says `[CLOSED 2026-08-04; retained as settled record]`.
- #121 (line 261, 26 lines): `[PROBED 2026-08-22: NOT a divergence]`.

**Settled records ("# Settled records", line 3392):** #87 (79 lines), #97 (51), #56 (97), #61 (22), #38 (22), #18 (39) and #5 (111, plus a "(mechanism record)" heading at 3721).

**Other findings:**
- The header (lines 8-16) says #70 is open, but there is no `#70` heading anywhere in the file (dangling reference).
- The header's `ROADMAP:127,142,…` citations are already stale.
- AGENTS.md:126 already says "delete it … never leave it marked CLOSED/FIXED in place", which #72 violates.

## 4. Proposed new ROADMAP.md (≈ 200 lines)

| Section | Lines | Source |
|---|---|---|
| Title, mission, scope, audio marker | ~20 | current 1-15 |
| **Current execution priority — 2026-10-31** (the split decision and items 1-6, verbatim) | ~50 | current 17-62 |
| Standing user decisions (D3 presentation RNG, D4 faithful timing, Struggle scope, 2026-10-13 finish-up scope), each 2-3 lines with doc pointers | ~25 | condensed from 73-135 |
| Stage status table S1-S11 (one line each, with a pointer to the archive; S10A and S11 marked open) | ~25 | the `### [x] S…` headings |
| **Settled exceptions** (one line each for #5, #18, #38, #56, #61, #87, #97, with the accepted ceiling and "do not reopen without a user decision") | ~20 | `ISSUES.md` settled records, because the new ISSUES drops them |
| Operational notes | ~8 | current 137-145; keep the log-backup note only if still true |
| **Domain notes**, keeping the exact heading `## Domain notes` and the bullets for RNG, the RAM-probe recipe, the idle ~104-tick fade, oracle limits, engine contract, and the reference geography | ~50 | current 2407-2487, trimmed |

- **Move to `docs/archive/`, unchanged, as `ROADMAP-pre-cln238.md`:**
  - the "Superseded ordering" blocks (64-136)
  - the "Staged plan" intro (146-156)
  - S1-S9 (157-1038)
  - S10 (1039-1844)
  - "Executable-frontier reset" (1845-2300)
  - the S10A body (2301-2384), with a pointer to `docs/finish-plan.md` and `docs/library-package.md`
  - the S11 body (2385-2406), replaced by a pointer to `docs/s11-audio-design.md`
  - the Domain-notes bullets not kept above (colour pipeline, draft-screen timings, input-ready lag, rented-ball RNG, draft candidates)
- **Keep the heading text** `## Domain notes`. About 15 probe and extract scripts, `src/engine/rng.ts:5,48`, `src/engine/ballAnim.ts:12`, `tests/rng.test.ts:5` and `tests/ballAnim.test.ts:4` cite it in comments.
- **Fix the Mac path** `../../vendor/mgba-venv/bin/python` in the recipe. The handoff says to use the host helpers instead.
- **Suggested ISSUES.md target:** about 150 lines. The old file goes to `docs/archive/ISSUES-pre-cln238.md`.
  - The header is rewritten: no #70, no `ROADMAP:NNN` cites, and a pointer to the settled exceptions in ROADMAP.
  - Each remainder entry keeps only its still-open lines.
  - #55 / #39 / #73 / #71 each become 5-15 line summaries, with a pointer to the archive for history.
  - #72 and #121 move out.

## 5. Risks

1. **`DEFERRED.md`**:
   - `run-supervisor.sh:294-305` greps `^## D[0-9]+ .*OPEN:` in it.
   - If the file is moved, `[[ -f … ]]` fails and the check silently passes (no exit 6).
   - The file also documents the heading format. Keep `DEFERRED.md` at the root, or change the script, to avoid silently dropping the block-on-open-decision guard.
   - It is not in the plan's keep list, so decide this explicitly.
2. **`SUPERVISOR.md` and `LOCAL_SETUP.md` are required reading in the main supervisor prompt** (`run-supervisor.sh:562`). `--print-config` also advertises `supervisor_guide=SUPERVISOR.md` (`:448`), and the daily cron runs this path. Archiving them without updating the prompt strings leaves the supervisor told to read missing files. Update the prompt strings in the same commit.
3. **`*_UNATTENDED.md` handling** (`run-supervisor.sh:310-316`) exits 7 for the animation/rust lanes if the file is missing and `REQUIRE_LANE_UNATTENDED_INSTRUCTIONS=1`. That lane code is cleanup step 3, so do not archive those files without checking that flag in the same step.
4. **Prompt text pointing at deleted sections:** `run-agent.sh:85` and `tools/run-subagent.sh:584` cite "the Stage 8 reset in ROADMAP.md". It is a text pointer only, but it will be wrong.
5. **AGENTS.md is read by every worker:**
   - Lines 6-7 point at `LOCAL_SETUP.md` and `ANIMATION_INTEGRATION_PROGRESS.md`. Lines 45, 66-67, 77, 104-105, 124-128, 150 and 158-162 point at other ledgers.
   - After the move these should all point at `docs/archive/`.
   - AGENTS.md says the animation lane's handoff is `ANIMATION_PROGRESS.md` and the coverage file is `ANIMATION_COVERAGE.json`. The coverage file stays; the handoff is archived.
   - Its Mac-path banners (lines 2-10) are separate stale content.
6. **Test breakage:** the 24 `ANIMATION_LATCHES.md` tests fail if the file moves without a path edit. They assert exact tokens, so the move must be a byte-for-byte `git mv`. Run the full suite, since these are `tests/animation` files. Moving `ANIMATION_COVERAGE.json` would break about 280 more files.
7. **`PROGRESS.md` header** says "archive the rest to `PROGRESS-archive.md`", and AGENTS.md:150 says the same. Update both to the new `docs/archive/` path. The file already satisfies "last 3 entries".
8. **Citation rot:** the old `ROADMAP.md:NNNN` line cites and the `ISSUES.md #NN` numbers in comments will point at a rewritten file. Comments are harmless. The settled-exception numbers (#5, #18, #38, #56, #61, #87, #97) must stay discoverable, which is why section 4 keeps them in ROADMAP.
9. **Scope and size:** "open only" for #55, #39, #73 and #71 (about 3000 lines of addenda) takes judgment. I'd split step 2 into 2a (pure `git mv` of the unreferenced ledgers, plus path edits in AGENTS.md, the launcher prompts and the 24 latch tests) and 2b (the ROADMAP and ISSUES rewrites). Each half still gets typecheck, full suite and build.
10. **Overlap with step 3:** the launcher/prompt edits in item 2 and the `--sub-agent codex` test touch step 3 code. Do the minimal path edits now and leave the provider and lane removal to step 3.
11. **No `workspace/README.md` exists.** It would be a new file, or step 2 should point at `../README.md`.

