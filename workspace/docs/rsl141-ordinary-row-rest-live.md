# rsl141 (S10A presentation fidelity): ordinary Scene ON rows draw the opponent's tracked idle rest — LANDED

Side lane, base master `361829128`. Lands rst139's banked patch (`tools/integration/fixtures/rst139/rst139-rest.diff`; evidence and
ROM rule: `docs/rst139-ordinary-row-rest.md`). Presentation only: no kernel, RNG, damage, turn order or facility change; Scene OFF untouched.
The worker was stopped at its time cap during its final full suite, after committing the landing, runner, receipt, tests and census
(`e2df4386c` .. `5155ff3e7`). The supervisor wrote this doc and ran the remaining gates on the union with master (provenance below).

## Results

| Item | Result | Receipt |
| --- | --- | --- |
| Landing | `e2df4386c`: the 5 src files of rst139's diff (battleResolutionPresentation.ts, factoryRoundBattleOrchestrator.ts, battleResolutionPresentationRender.ts, battleScene.ts, core.ts). On an ordinary row / menu / handoff, a tracked `idle` opponent stands at its front idle rest (ONIX +1); `zeroed` / `unknown` keep x2 0; faint / switch / party-summary / trainer-slide / doll rows unchanged | `git diff 361829128 e2df4386c -- src/` |
| ROM windows (rst139's 8 direct-mGBA scenarios, r1 == r2 8 / 8) | **22,746 / 22,746 rows 0 px** through the landed production renderer (base: 7,063 / 22,746); the x2 tracker predicts the ROM on 22,746 / 22,746 | `tools/integration/fixtures/rsl141-live-receipt.json` `rom` |
| Routes (9 ONIX census battles, 182,602 frames) | a frame changes iff it is an at-stake row: **4,349 changed == 4,349 at stake**, 0 unexpected, same row sequence | `fixtures/rsl141/routes-delta.json` |
| Census 0..999 (base = landed tree with the diff reversed) | **0 command / frame / status / decline changes**; 20 / 20 shard jsonl byte-identical; all digests identical (pixels only) | `fixtures/rsl141/census-delta.json` |
| Tier-1 | `tests/rsl141OrdinaryRowRest.test.ts`: tracked-idle ONIX row at +1 (1,091 px), zeroed / unknown / none at 0, doll, handoff history, a live seed's menu | |

Not claimed: `unknown` rows (12,477 ONIX frames on 0..999) keep x2 0 — the ROM there shows whatever the unmodelled event left.

## Provenance and gates

- Worker gates before the cap: targeted 9 files / 79 tests, typecheck, smoke 448 / 448. Full suite / build / differential were not
  finished by the worker.
- Supervisor: `rsl141Run.sh` into a fresh dir (see the integration ledger); union with master (`a95993c94` + this branch): typecheck,
  smoke, full suite, build and the session differential (see ANIMATION_INTEGRATION_PROGRESS.md, 2026-10-12 / 13 entry).

## Rerun

```
sh tools/integration/rsl141Run.sh <fresh-out-dir-inside-the-repo> [all|rom|routes|census]
npm test -- tests/rsl141OrdinaryRowRest.test.ts
```
