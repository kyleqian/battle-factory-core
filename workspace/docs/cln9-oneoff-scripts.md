# cln9: one-off scripts in tools/integration and tools/compare (finish-plan Cleanup 1), 2026-11-19

Scope: `git rm` of step-id scripts (and files only they read) under `tools/integration` and `tools/compare` that nothing uses. No `src/` change, no history rewrite. Follows `docs/cln8-evidence-out.md` (fixtures / evidence) and `docs/cln7-scout.md`.

**Result: 5 files qualify, none of them a script.** Under the literal rule (a), 0 of the 1,332 scripts qualify, because every old step script is still named by basename in a tracked fixture receipt, ledger or another kept script. The 5 files are unread scratch JSON outputs of 2026-08-11. A looser reading (a provenance string in a fixture is not a read) would add 109 scripts / 446,270 bytes; they are listed below for a decision, and nothing was removed on that reading.

## Inventory, before and after (tracked files / bytes)

| Directory | Before | After | Removed |
|---|---|---|---|
| `tools/integration` | 11,528 / 87,109,594 | 11,528 / 87,109,594 | 0 |
| `tools/compare` | 3,329 / 664,464,445 | 3,324 / 664,448,327 | 5 / 16,118 |
| whole repo (`git ls-files`, before this doc is added) | 24,038 | 24,033 | 5 |

Candidate pool: 1,337 files = every tracked file directly in `tools/integration` (423, plus 6 under `lse1/`, `random2R1/`, `random2R4/`, `random2R5/`) and `tools/compare` (including `scratch/`, 9 files); `evidence/`, `fixtures/`, `traces*/` are out of scope (cln8).

## Rule used

A candidate is removed only if ALL hold:

- **(a)** no tracked file outside itself names it by path, basename or stem as a whole token. Readers counted: `tests/`, `src/`, `tools/` code, shell, configs, `package.json`, `test-gate.list`, JSON ledgers, **and fixture / receipt / evidence data** (tests read `source.probe` out of ledgers and sha256 the script, e.g. `megaDrainEvidence.test.ts:72`, `painSplitEvidenceCheckpoint.test.ts:63`, `waterPulseStaging.test.ts:75`, so a data mention can be a real read). Computed as a fixpoint: a script named only by other removable scripts still counts as removable. Docs (`*.md`) are not readers for (a); they are handled by (c).
- **(b)** not a kept class: file name contains census, soak, compare, cmp, differential, extract, preview, probeRunner, or is hpd2Probe / hpf4mShape / sta6mIntroProbe / lsd194* / rst197* / soundCensus* / romReplay* / romDrive*, or any `<step><digit>m<Name>` measurement tool (lead1m, rank1m, phy1m, hpf4m, subp1m ...). 183 candidates kept by this alone.
- **(c)** no doc changed in the last 21 days (`git log --since=2026-10-29 -- docs/`, excluding the four mass-edit commits 43b0b22e5 / 17d866fe2 / 389a7985a / 49fa96a73 that touch 90..291 docs each) and none of AGENTS / ROADMAP / PROGRESS / ISSUES / DEFERRED / LOCAL_SETUP / SUPERVISOR / README names it. 26 candidates kept by this.
- **(d)** its step is closed. A step still open in ISSUES.md keeps its tools: prep38 / dolldef / doll81 (#152), species-audit 2..14 (#152), random2 / activationProbe, sub157 / subst* (#153 remainder), and the generic `liveFixture*` driver. 36 kept by this.

Static results were then proven at runtime (below).

## Removed (commit: see `git log -1 -- docs/cln9-oneoff-scripts.md`)

| Path | Bytes | Rule evidence |
|---|---|---|
| `tools/compare/scratch/feather-residual-7421-7440.json` | 2,513 | no token match anywhere outside `tools/compare/scratch/`; added in the 2026-08-11 restructure; nothing in the scratch scripts reads it |
| `tools/compare/scratch/feather-residual-7421-7549.json` | 3,167 | same |
| `tools/compare/scratch/menu-audit/particle-range.json` | 2,978 | same (`decode_player_bgfade.mjs` beside it does not name it) |
| `tools/compare/scratch/turn7-feathers-window.json` | 3,571 | same; not `tools/compare/traces/turn7-feathers.json` (a different, kept file) |
| `tools/compare/scratch/turn8-feathers-window.json` | 3,889 | same |

Not a single `tools/integration` file is removed.

## Borderline, kept

**Passes (a) but kept (4 files, 9,348 bytes):** `tools/integration/adp1Fixtures.py`, `adp1Scenarios.py`, `hpf1Labs.py`, `lse2Se.ts`. No reader and no doc names them as a tool, but they belong to steps landed 2026-11-17 / 18 (adp1, hpf1, lse2; PROGRESS and ISSUES cite the steps) and sit beside `liv2Labs.py` / `lse1Labs.py` / `hpf3Cmds.ts`, which `docs/hpd1-hp-hold.md` names as tools to use. Rule (c)'s "active measurement tooling stays" covers the family; a later pass can drop them.

**Kept by (c), recent doc names it (26):** adp1Probes.sh, batch.ts, curseActualCore.ts, eruptionFramebuffer.ts, factoryRoundCarrier.ts, flatterActualCore.ts, fnt201Production.ts, frs247Production.ts, furyCutterResidualDiagnosis.ts, hpd1AppOnly.ts, hpd4Cmds.ts, hpf1Cmds.ts, hpf3Cmds.ts, iceBallActualCore.ts, liv2Labs.py, lse1Labs.py, outrageActualCore.ts, overheatActualCore.ts, pau5Labs.py, playableAnimationReplay.ts, prep16PaletteComposite.ts, returnActualCore.ts, revengeReducer.ts, shockWaveActualCore.ts, smogActualCore.ts, snoreEvidence.ts (most also have live readers).

**Kept by (d), step still open (36):** activationProbe.py, doll81CensusCheck / DefFixtures / Probes / Summary, dolldefLiveCheck / RouteScan, liveFixtureBatch / Driver / One, prep38Bodies / Check / Fixtures / Probe / Probes, random2RouteProbe.py, speciesAudit2..14 tools (13 files), sub157Fixtures / Timing, substBodyFixtures, substSwapLiveCheck / Probes / Run.

**Kept by (a) only because fixtures / receipts name them (109 scripts, 446,270 bytes).** Every file below passes (b), (c), (d) and has no `tests/`, `src/` or config reader, but a tracked fixture or receipt records it as its generator (`"probe": "tools/compare/returnProbe.py"`, `"script": ...`), or a script in this table that is itself held. Those fixtures are test-pinned data (cln8 kept all of `tools/integration/fixtures`), so the string cannot be edited without breaking a hash; whether provenance counts as a read is a decision, not a rule. If the answer is no, the 109 can go in one commit and nothing but these receipts mentions them. Recipe to redo the proof: `git grep -lwF <basename> -- . ':!docs/*' ':!*.md'` must list only `tools/integration/fixtures/*`. Concentrations: `issue142ShadowRows*` (20 files), `prep*` (25), `elevated*` (7), 6 `tools/compare/*Probe.py` (blizzard, psychUpBodies, return, silverWindBodies, spriteOrderGapCall, willOWispBodies), and the rest are `audit18` / `audit20` / `allocatorNetZero*` / `d4*` / `doll90` / `r2Gates*` / `r3*` / `spark62*` / `spriteOrder*` / `fix74` / `curse*` / `lsbz` / `lend` single-receipt scripts.

| Script | Bytes | Held by |
|---|---|---|
| `compare/blizzardProbe.py` | 7803 | 35 fixture/ledger file(s), e.g. `fx/geoice/blizzard-opponent-blastoise-blastoise.json` |
| `compare/psychUpBodiesProbe.py` | 433 | 5 fixture/ledger file(s), e.g. `fx/later-bodies-bg/pu-p-psychic.json` |
| `compare/returnProbe.py` | 1363 | 74 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `compare/silverWindBodiesProbe.py` | 442 | 8 fixture/ledger file(s), e.g. `fx/later-bodies-bg/sw-o-psychic.json` |
| `compare/spriteOrderGapCallProbe.py` | 12015 | 1 fixture/ledger file(s), e.g. `fx/sprite-order-gap-causes.json` |
| `compare/willOWispBodiesProbe.py` | 445 | 20 fixture/ledger file(s), e.g. `fx/species-audit-7/derived/flygonA-wisp-o-psychic.json` |
| `integration/allocatorNetZeroBatch.py` | 1662 | 1 fixture/ledger file(s), e.g. `fx/allocator-net-zero-audit.json` |
| `integration/allocatorNetZeroExtBatch.py` | 1796 | 1 fixture/ledger file(s), e.g. `fx/allocator-net-zero-audit-ext.json` |
| `integration/allocatorNetZeroExtManifest.py` | 1961 | 1 fixture/ledger file(s), e.g. `fx/allocator-net-zero-audit-ext.json` |
| `integration/allocatorNetZeroExtReceipt.py` | 5509 | 1 fixture/ledger file(s), e.g. `fx/allocator-net-zero-audit-ext.json` |
| `integration/allocatorNetZeroExtStage.py` | 1568 | 1 fixture/ledger file(s), e.g. `fx/allocator-net-zero-audit-ext.json` |
| `integration/allocatorNetZeroManifest.py` | 3936 | 2 fixture/ledger file(s), e.g. `fx/allocator-net-zero-audit-ext.json` |
| `integration/allocatorNetZeroReceipt.py` | 4202 | 1 fixture/ledger file(s), e.g. `fx/allocator-net-zero-audit.json` |
| `integration/audit18Probes.py` | 1802 | 1 fixture/ledger file(s), e.g. `fx/fix74-live-receipt.json` |
| `integration/audit20Extra.sh` | 7793 | 1 fixture/ledger file(s), e.g. `fx/audit-20/reproduce/return216-rom-order.txt` |
| `integration/audit20LendsPi.py` | 1858 | cand: `integration/audit20Extra.sh` |
| `integration/bgHistoryRouteBodies.ts` | 2239 | 1 fixture/ledger file(s), e.g. `fx/later-bodies-bg-receipt.json` |
| `integration/curseLiveCheck.ts` | 4831 | 1 fixture/ledger file(s), e.g. `fx/curse-live-adapter-receipt.json` |
| `integration/curseStagedDigest.ts` | 1550 | 1 fixture/ledger file(s), e.g. `fx/curse-live-adapter-receipt.json` |
| `integration/d4aReceipt.py` | 3193 | 5 fixture/ledger file(s), e.g. `fx/d4a-live-receipt.json` |
| `integration/d4aRegressionAll.sh` | 1151 | 8 fixture/ledger file(s), e.g. `fx/a13fix-live-receipt.json` |
| `integration/d4d2Receipt.py` | 1651 | 1 fixture/ledger file(s), e.g. `fx/d4d2-live-receipt.json` |
| `integration/d4tailsReceipt.py` | 8685 | 1 fixture/ledger file(s), e.g. `fx/d4tails-live-receipt.json` |
| `integration/d4wDense.sh` | 605 | 1 fixture/ledger file(s), e.g. `fx/d4w-live-receipt.json` |
| `integration/doll90Run.sh` | 5963 | 1 fixture/ledger file(s), e.g. `fx/doll90-live-receipt.json` |
| `integration/doll90Summary.py` | 1544 | cand: `integration/doll90Run.sh` |
| `integration/dt60Probe.py` | 6317 | cand: `integration/doll90Run.sh` |
| `integration/elevatedFaintMatch.ts` | 3543 | 1 fixture/ledger file(s), e.g. `fx/elevated-renderer-receipt.json` |
| `integration/elevatedFaintStage.py` | 1198 | 1 fixture/ledger file(s), e.g. `fx/elevated-renderer-receipt.json` |
| `integration/elevatedOffAppSweep.ts` | 1072 | cand: `integration/elevatedOffSweep.sh` |
| `integration/elevatedOffDiff.mjs` | 837 | 1 fixture/ledger file(s), e.g. `fx/elevated-renderer-receipt.json` |
| `integration/elevatedOffSweep.sh` | 495 | 1 fixture/ledger file(s), e.g. `fx/elevated-renderer-receipt.json` |
| `integration/elevatedPostbodyPrebody.ts` | 2001 | 1 fixture/ledger file(s), e.g. `fx/elevated-renderer-receipt.json` |
| `integration/elevatedRendererRoutes.ts` | 1531 | 1 fixture/ledger file(s), e.g. `fx/elevated-renderer-receipt.json` |
| `integration/fa185Receipt.py` | 5327 | 1 fixture/ledger file(s), e.g. `fx/fa185-live-receipt.json` |
| `integration/fix74SandstormFixtures.py` | 12055 | 1 fixture/ledger file(s), e.g. `fx/fix74-live-receipt.json` |
| `integration/flat77Probe.py` | 11183 | 127 fixture/ledger file(s), e.g. `fx/flat77/fixtures/ex-acid-nidorina-golem-ply-c0.json` |
| `integration/idle94Route.ts` | 7137 | 1 fixture/ledger file(s), e.g. `fx/idle94/predictions.json` |
| `integration/issue142ShadowRowScan.ts` | 5484 | 7 fixture/ledger file(s), e.g. `fx/d4a-live-receipt.json` |
| `integration/issue142ShadowRows.ts` | 9670 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows.json` |
| `integration/issue142ShadowRowsAnchor4.mjs` | 2387 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsExtra.mjs` | 2602 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsHBufferS1.py` | 1829 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsNext5.py` | 1797 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsPrep11.mjs` | 2063 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsPrep13.py` | 1862 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsPrep14.py` | 1848 | 2 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsPrep16.py` | 1875 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsPrep2.py` | 1834 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsPrep29.py` | 1786 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsPrep5.py` | 1780 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsPrep6.py` | 2277 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsPrep7.py` | 2112 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsPrep8.py` | 2362 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsPrep9.py` | 2362 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsQ2.py` | 2223 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsR2Gates.py` | 1499 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/issue142ShadowRowsR3Profile.py` | 2159 | 1 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/land82Run.sh` | 5368 | 2 fixture/ledger file(s), e.g. `fx/land82/attdoll-live-receipt.json` |
| `integration/laterBodiesBgFixtures.py` | 4963 | 1 fixture/ledger file(s), e.g. `fx/later-bodies-bg-receipt.json` |
| `integration/lendLiveReceipt.py` | 3362 | 1 fixture/ledger file(s), e.g. `fx/lend-live-receipt.json` |
| `integration/lsbzReceipt.py` | 7038 | 1 fixture/ledger file(s), e.g. `fx/lsbz-live-receipt.json` |
| `integration/lsd199AbsorbRenderIdentity.ts` | 2928 | 1 fixture/ledger file(s), e.g. `fx/lsd199/ordinary-absorb-render-identity.txt` |
| `integration/multihitProbe.py` | 4156 | 21 fixture/ledger file(s), e.g. `fx/multihit-comet-punch-opponent-hit0.json` |
| `integration/oam1AssemblerCheck.ts` | 2965 | 1 fixture/ledger file(s), e.g. `fx/oam1-live-adapter-receipt.json` |
| `integration/orderCrossBodyReceipt.ts` | 10374 | 1 fixture/ledger file(s), e.g. `fx/order-cross-body-live-receipt.json` |
| `integration/prep10Probe.py` | 6158 | cand: `integration/spark62Probe.py` |
| `integration/prep10Probes.sh` | 862 | cand: `integration/prep10Probe.py` |
| `integration/prep13LiveFixtures.py` | 4138 | 1 fixture/ledger file(s), e.g. `fx/prep13-live-adapter-receipt.json` |
| `integration/prep13Probe.py` | 9484 | 15 fixture/ledger file(s), e.g. `fx/issue142-shadow-rows-extra.json` |
| `integration/prep14LiveFixtures.py` | 3215 | 1 fixture/ledger file(s), e.g. `fx/random2-r4-live-receipt.json` |
| `integration/prep14Plans.py` | 14426 | 1 fixture/ledger file(s), e.g. `fx/prep14/plans.json` |
| `integration/prep14StatusUpdate.py` | 2164 | 1 fixture/ledger file(s), e.g. `fx/random2-r4-live-receipt.json` |
| `integration/prep16LiveFixtures.py` | 3951 | 1 fixture/ledger file(s), e.g. `fx/prep16-live-adapter-receipt.json` |
| `integration/prep16RouteReceipt.ts` | 2842 | 1 fixture/ledger file(s), e.g. `fx/prep16-live-adapter-receipt.json` |
| `integration/prep17DirtTrack.py` | 2449 | cand: `integration/prep17Run.sh` |
| `integration/prep17Draft.py` | 2159 | 2 fixture/ledger file(s), e.g. `fx/prep17/draft-mud-slap-alt-set156-set146.json` |
| `integration/prep17MeteorLag.py` | 3269 | cand: `integration/prep17Run.sh` |
| `integration/prep17Run.sh` | 1637 | 2 fixture/ledger file(s), e.g. `fx/prep17/draft-mud-slap-alt-set156-set146.json` |
| `integration/prep23Probes.sh` | 901 | 1 fixture/ledger file(s), e.g. `fx/curse-live-adapter-receipt.json` |
| `integration/prep24ReturnAssembler.ts` | 7264 | cand: `integration/prep24ReturnPixels.ts` |
| `integration/prep24ReturnCheck.ts` | 7212 | cand: `integration/prep24ReturnPixels.ts` |
| `integration/prep24ReturnModel.ts` | 8641 | cand: `integration/prep24ReturnPixels.ts` |
| `integration/prep24ReturnPixels.ts` | 5136 | 1 fixture/ledger file(s), e.g. `fx/return-live-adapter-receipt.json` |
| `integration/prep28Rely.py` | 2051 | cand: `integration/prep28Tie.py` |
| `integration/prep28Tie.py` | 7154 | 1 fixture/ledger file(s), e.g. `fx/prep28/plan-rows.json` |
| `integration/prep29Fixtures.py` | 4498 | 1 fixture/ledger file(s), e.g. `fx/r29-live-receipt.json` |
| `integration/prep44Probe.py` | 9149 | 1 fixture/ledger file(s), e.g. `fx/prep44/net-zero-audit.json` |
| `integration/prep46Run.sh` | 3091 | 1 fixture/ledger file(s), e.g. `fx/words46/prep46-units.json` |
| `integration/prep50StatusProbe.py` | 7203 | 1 fixture/ledger file(s), e.g. `fx/prep50/status-net-zero-audit.json` |
| `integration/r2GatesCarrierRoutes.ts` | 1403 | 2 fixture/ledger file(s), e.g. `fx/r2-gates-firepunch-receipt.json` |
| `integration/r2GatesOpponentSeedScan.ts` | 1596 | 2 fixture/ledger file(s), e.g. `fx/r2-gates-firepunch-receipt.json` |
| `integration/r2GatesRouteScan.ts` | 1704 | 2 fixture/ledger file(s), e.g. `fx/r2-gates-firepunch-receipt.json` |
| `integration/r3ExtraScenarios.py` | 3453 | 1 fixture/ledger file(s), e.g. `fx/r3-profile-live-receipt.json` |
| `integration/r3ProfileExtraCases.json` | 2319 | cand: `integration/r3ExtraScenarios.py` |
| `integration/r3ProfileFixtures.py` | 6327 | 1 fixture/ledger file(s), e.g. `fx/r3-profile-live-receipt.json` |
| `integration/r3ProfileReceipt.ts` | 1809 | 1 fixture/ledger file(s), e.g. `fx/r3-profile-live-receipt.json` |
| `integration/returnLiveFixtures.py` | 3044 | 1 fixture/ledger file(s), e.g. `fx/return-live-adapter-receipt.json` |
| `integration/reversalShakeProbe.py` | 5372 | 1 fixture/ledger file(s), e.g. `fx/reversal-shake-evidence.json` |
| `integration/rolloutLiveFixtures.mjs` | 2976 | 1 fixture/ledger file(s), e.g. `fx/rollout-live-receipt.json` |
| `integration/s10aReceipt.py` | 2479 | 1 fixture/ledger file(s), e.g. `fx/r5-live-receipt.json` |
| `integration/spark62LiveFixtures.mjs` | 2366 | 1 fixture/ledger file(s), e.g. `fx/spark62-live-receipt.json` |
| `integration/spark62Parity.ts` | 9075 | 1 fixture/ledger file(s), e.g. `fx/spark62-live-receipt.json` |
| `integration/spark62Probe.py` | 6233 | 1 fixture/ledger file(s), e.g. `fx/spark62-live-receipt.json` |
| `integration/spark62Probes.sh` | 691 | cand: `integration/spark62Probe.py` |
| `integration/spriteOrderGapCauses.py` | 23290 | 1 fixture/ledger file(s), e.g. `fx/sprite-order-gap-causes.json` |
| `integration/spriteOrderPolicyGapsPlans.py` | 5422 | 1 fixture/ledger file(s), e.g. `fx/sprite-order-policy-gaps/sprite-order-body-plans-endeavor.json` |
| `integration/spriteOrderRelYConfirm.py` | 14434 | cand: `integration/prep28Tie.py` |
| `integration/statusBatchSupersonicProbe.py` | 1562 | 2 fixture/ledger file(s), e.g. `fx/status-batch-supersonic-opponent.json` |

**Kept by (b) (183)** and **by a live reader (595 candidate-reader pairs across tests, src, tools, shell, configs)**: not listed; these are the census / soak / compare / probe / extract tools and everything a kept test imports.

## Runtime proof (with the 5 files removed)

- `npm run typecheck`: exit 0. `npm run build`: exit 0.
- `npm run test:gate`: 362 / 362 files, 2,844 tests passed.
- Every test file naming `tools/integration` or `tools/compare` (`grep -rlE "tools/(integration|compare)" tests`: 1,005 files, of which 975 are `*.test.ts`; the other 30 are helpers / fixtures that the 975 import): 975 / 975 files, 6,446 tests passed + 1 skipped (five `vitest run --pool=forks --testTimeout=20000` chunks of 218 / 196 / 185 / 189 / 187 files).
- `git grep -lwF` for each of the 5 removed stems outside `docs/` and `*.md`: no hits.
- Full `npm test` is left to the supervisor.

## Getting a file back

```
git show <this commit>^:workspace/tools/compare/scratch/<file> > <file>
git checkout <this commit>^ -- tools/compare/scratch        # from workspace/
```
