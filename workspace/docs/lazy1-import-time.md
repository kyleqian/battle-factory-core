# lazy1: website load time, step A (import-time work made lazy)

Scope: `docs/cax31-session-handoff.md` "Website load time", step A. No behaviour change, no library API change, no download-size work (step B).
Parent (the "before" arm everywhere below): `b5bb454a9`.

## Numbers

Node `import()` of the built library, median of 5 (`/tmp/timeimport.sh`: `performance.now()` around `await import(file)`), same box, same minute, **load average 7.8** (other workers + a ROM replay;
the quiet-box figures in the handoff are about 3.6x smaller). `dist-lib` of the parent vs `dist-lib` of `ca46797a5`:

| entry | before (ms) | after (ms) |
|---|---|---|
| `dist-lib/index.js` | 2743 | **832** |
| `dist-lib/headless.js` | 2106 | **380** |

Scaled by the load factor the quiet-box `index.js` is about 230 ms: at the edge of the 200 ms target, not measured below it. What is left (CPU profile of `index.js`, 941 ms total, same load):

- **467 ms module compile** (`compileSourceTextModule`) of the 67 MB `dist-lib` (3.2 MB `headless.js`, 3.7 MB `data-battle-script`, 2.3 MB `data-gen`, 1.5 MB `assets-gen`...). Proportional to bytes: this is step B (download size), not import-time work.
- 39 ms `loadBattleScriptProgram` (compile 27 ms of the 3306-instruction Battle Script program, `assertCatalogJoins` 10 ms). Memoized; the first battle needs it anyway and 17 modules read it at top level, so it **stays**.
- About 90 ms of plain module bodies (large literal tables, `data-gen` / `assets-gen` / `animation-assets` evaluation, 25 to 55 ms each). Data, not computation; moving it is step B.
- Small residuals still run at import: `makeFeatherSpriteLookup` (8 ms), `replaceB64Prefix` (7 ms), two healthbox compositions (about 5 ms each), `lazyMonPicTable` (6 ms). Not touched: each is a one-off table build whose lazy form would change more call sites than the 30 ms it saves.

## What was slow and what changed

1. **Root cause of every sample battle being slow** (`6d9d6ec10`): about 120 `createBattleScript*OpcodeHandlers(program)` factories each did `program.instructions.filter/find(i => i.opcodeName === X)` over the 3306-instruction array, and
   `createBattleScriptStatusRulesExecution` rebuilds all of them on every call (also at runtime, every turn). New `instructionsWithOpcodeName` / `firstInstructionWithOpcodeName` in `battleScriptProgram.ts`
   build a per-program `Map<opcodeName, instructions[]>` once (WeakMap) and return the bucket in program order. About 101 files in `src/engine/` mechanically converted. A handler build went **30 ms -> 2 ms**
   (`/tmp/bench1.ts`); this alone took `index.js` from 2.8 s to 1.2 s under the same load and speeds up every turn at runtime. Two non-simple sites stay as they were (`factoryBattleScriptFullTurnDecision.ts` about line 1906, `factoryBattleStart.ts:62`).
2. **Sample battles at module top level** (`ca46797a5`): the legacy "canonical Battle 1/2 march" modules (`battleScene.ts`, `battleSceneCanonical.ts`, `turn13/15/16*ResolutionAdapter.ts`) ran fixed sample battles at import to derive constants.
   New `src/engine/lazyValue.ts` (`lazyValue(compute)`: memoized thunk, computes on first call, same value for every later call). Every such constant is now `export const name = lazyValue(() => <the same expression>)` and every use is `name()`.
   100 declarations (`battleScene.ts` 49, `battleSceneCanonical.ts` 51, one each in the Turn 13 / 15 / 16 adapters). A profile of the headless graph shows **no `resolve*` / `stage*` sample battle under any module top level** any more.

## Per-item decision

Nothing was deleted: every table below is read (by the renderer, `core.ts`, tests, or another constant), so the decision is "memoize", not "delete".

| item | where | decision |
|---|---|---|
| Fly resolution (Turn 13 / 15 chain: `canonicalOpponentFlyResolution`, `canonicalTurn13RetainedFlyPresentationOwner`, `turn14Flyup*` / `turn15FlyStrike*` / `turn15Fainted*` lines and text totals) | `turn15FlyResolutionAdapter.ts`, `turn13ResolutionAdapter.ts`, `battleSceneCanonical.ts` | lazy (this was the single biggest forcer, 150 ms loaded) |
| Fire Punch resolution `canonicalFirePunchResolution` | `turn16FirePunchResolutionAdapter.ts` | lazy |
| Battle 2 turn-1 kernel `battle2Turn1Kernel`, `battle2Turn1KabutoRockSlideHp` | `battleSceneCanonical.ts` | lazy |
| `[TURNn_*_LINE1, LINE2]` pairs from `resolveTurnN...Lines()` (20 pairs) | `battleSceneCanonical.ts` | lazy, one thunk per pair (`turn5FaintedLines()[0]`) |
| `TURNn_*_HP` endpoints, `TURN5_SITRUS*`, `GROVYLE_FAINT_SINK*`, `TURN5_ENDEAVOR_HP`... | `battleSceneCanonical.ts` | lazy |
| `BATTLE1_PRESENTATION_HP` and the `anchor*` HP / battler exports (now `getAnchor*()`) | `battleScene.ts` | lazy |
| `TURN5_SWITCHIN`, `TURN13_SWITCHIN`, `TURN13_RESOLUTION` and every constant derived from them (healthbox contents, lines, faint text totals, cursor delay) | `battleScene.ts` | lazy |
| `TURNn_FEATHERDANCE_*_PALETTE` and the `LEGACY_TURN6..13_FIGHT_COMMAND_PRESENTATION` objects | `battleScene.ts` | lazy |
| `loadBattleScriptProgram` result | `battleScriptProgram.ts` | stays eager (see above) |
| Rule tables of the Battle Script engine | `battleScriptRulesContext.ts` etc. | not a per-import cost any more: building them was the instruction scan (item 1); the table itself is rebuilt per `createBattleScriptStatusRulesExecution` call as before |

Public-name changes (all inside `src/engine/` and `tests/`; nothing exported from `src/lib.ts` / `src/headless.ts` changed): constants became functions (`TURN5_SITRUS_HEAL_LINE1` -> `turn5SitrusHealLine1()`).
`tests/battlesceneSplitEligibility.test.ts` and `tools/report/battlescene-split-{precise,topo}.ts` key on those symbol names and were updated to the new spelling (`onixSitrusIdentityRenderTick`, `turn13DragonbreathKickoffLines`).
`tools/probe/*` one-off scripts that import old names were NOT updated (they are not in the `tsc -b` program and are not run by any test).
`tools/report/ability-item-parity-census.ts` pins source line numbers; three pins moved by +1 (`battleScriptHealpartystatusOpcode.ts:77`, `battleScriptHitChainOpcode.ts:1232`, `battleScriptTrysetfutureattackOpcode.ts:112`), the census doc is unchanged.

## How neutrality was proved

The change moves *when* a pure computation runs, never *what* it computes. Evidence (all parent `b5bb454a9` vs `ca46797a5` unless noted; files under `.integration/evidence/lazy1/`, git-ignored):

- **Kernel / sound census, seeds 0..99, both scenes** (`lsd194Census.sh`, arms `on|off-b5bb454a9` vs `on|off-ca46797a5`): `rst197CensusDelta.py` ON 100 battles / 31,264 commands, **100 identical, bad 0**; OFF 100 / 30,580, **100 identical, bad 0**.
  `soundCensusDelta.py` ON and OFF: seeds 100, **identical 100**, no changed examples.
- **`npm run compare:differential -- draft-menu battle2-off-turn1-staged battle2-turn1-rockslide presentation-rng-playable-live-bodies-seeded-on battle1-postwin-next-prompt fight-submenu battle1-swap-player-picker lbw4-woman-block-off --base b5bb454a9`**:
  **PASS, 1,488 captures byte-identical across 8 traces** (draft, battle OFF, battle ON, canonical battle 2, post-win, fight submenu, swap, lobby).
- `npm run typecheck` 0. `npm run build:lib` ok (see ENGINE_BUILD below). `npm run test:smoke` 448 / 448.
- Soak `npm run soak -- --seeds 0:20 --policy vanilla --parallel 4`: **20 / 20 OK** (8.5 min).
- Full `npm test` (4 vitest shards, 3 workers): 15,018 passed, 0 failed. Winning soak `--policy winning --seeds 0:24 --parallel 6`, parent vs this tree: **24 / 24, per-seed lines identical** (seeds 0:60 was not run, the cap did not allow two arms x 60 seeds on the loaded box).

## ENGINE_BUILD

`eb-b17e87a4a52c33ad` (parent `dist-lib`) -> **`eb-56f55ed08774e7a4`** (`dist-lib` of `ca46797a5`; the headless graph changed, as it must). Tell the website.

## Remaining and next

- Step B (download size) is where the rest is: about 470 of the 830 ms is compiling 67 MB of chunks. The measured proposal belongs to that step.
- If a quiet-box number is wanted, re-run `/tmp/timeimport.sh`-style five imports when the load is below 2.
