# Remaining adapters census (S10A, side lane)

Evidence/triage only; new files only. Every accepted Factory move is counted exactly once (live, in-flight, or remaining); the counts, the per-move table, the provider ranking and the batch picks are all regenerated:

```
node tools/integration/remainingAdaptersCensus.mjs --write --doc   # fixtures/remaining-adapters-census.json + this file
node tools/integration/censusActivationSummary.mjs                    # fixtures/census-activation/summary.json (needs the probe receipts)
tools/integration/censusActivation.sh; tools/integration/censusStagedActivation.sh   # direct-mGBA probes (optional, regenerates the receipts)
```

Inputs: `docs/animation-integration-live-status.json` (236 live, 13 faithful random, 27 faithful timing), `docs/animation-integration-readiness.json` + `-merged-readiness.json` (276 accepted, host classes), `tools/integration/fixtures/h-buffer-triage.json` (per-field classes/cites of the 78 H_BUFFER moves; stale config line numbers are re-resolved by symbol), `sprite-order-body-plans-ext.json`, the Level-50 set pools for the usage weight (the model of `tools/integration/spriteOrderPlanCoverageRank.py`: ranges 0..6, 4 moves per set, both sides; `weight` below is the share of all Factory move uses). The script asserts `live (scoped exact) + faithful-random + faithful-timing + in-flight + remaining = 276` (faithful-random = the disjoint D3 bucket `faithfulRandomAdapters`, docs/presentation-rng.md; faithful-timing = the disjoint D4 bucket `faithfulTimingAdapters`, docs/faithful-timing.md, where a D3+D4 adapter is counted once with `d3: true`) and that every cited `file:line` exists and is non-empty. In-flight = batches the supervisor has running (none; the lists in the script are empty). Helping Hand is the 277th Factory move and is not accepted (not counted).

## 1. Summary

| Bucket | Moves | Weight |
|---|---:|---:|
| accepted Factory moves | 276 | 100% |
| live adapters (scoped exact) | 236 | 85.07% |
| faithful-random adapters (ASTONISH, DOUBLE_KICK, FLAIL, FLATTER, HYPER_BEAM, LOVELY_KISS, LUSTER_PURGE, MUD_SLAP, RAIN_DANCE, SAND_ATTACK, THRASH, WATER_PULSE, WISH) | 13 | 3.84% |
| faithful-timing adapters (BLIZZARD, CONFUSE_RAY, CRUNCH, DIVE, EXTRASENSORY, EXTREME_SPEED, FAINT_ATTACK, FOCUS_PUNCH, HIDDEN_POWER, HYPER_VOICE, ICE_BALL, ICY_WIND, LIGHT_SCREEN, MACH_PUNCH, MEGAHORN, METEOR_MASH, NIGHTMARE, PSYCHIC, PSYWAVE, PURSUIT, REVENGE, SHADOW_PUNCH, SHEER_COLD, SKILL_SWAP, SKY_ATTACK, SMOKESCREEN, SUPERPOWER) | 27 | 10.60% |
| in flight (0 order-consumer + 0 prep6) | 0 | 0.00% |
| **remaining (this census)** | **0** | **0.00%** |
| check | 236+13+27+0+0=276 | |

Remaining moves by group:

| Group | Moves | Weight | Meaning |
|---|---:|---:|---|

Remaining by readiness host class (a move can carry several): . Moves whose order input is satisfied only for the battle's first body: 0. Moves that still need a per-move sprite-slot plan row: 0.

PROVIDER-x breakdown: .

## 2. What production derives today

| Input | Production source | Effect on the remaining moves |
|---|---|---|
| battler anchors / geometry (pic point, sprite centre, battle position, coords yOffset, idle rest) | `src/engine/liveMoveAnimation.ts:159-224` (`liveBattlerAnchors`, `liveBattlerCoordAttrs`) | A: derivable for every remaining move; resolves Pain Split yOffset, Rock Tomb/Fire Blast pic points, Fake Tears picture bounds |
| party personality, displayed HP / status | `src/engine/liveMoveAnimation.ts:931-936`, displayed field (`src/engine/battleResolutionPresentation.ts:3140-3155`) | A: Hidden Power personality, Water Spout HP, Self-Destruct HP 0 (prep6 measured) |
| known-entry sprite allocator + wall plans + net-zero history | `src/engine/liveSpriteAllocator.ts:89-123`, `src/engine/liveMoveSpriteAllocator.ts:28,57,75` | A-SLOT: first-free slots at spawn ages; per-move PLANS table is data work (plan row + net-zero + tie audit); 76 remaining moves carry slot fields |
| free-slot `sSpriteOrder` provider | `src/engine/spriteOrderProvider.ts:235,256` (`spriteOrderForSlots`, occupied prefix), `src/engine/liveMoveSpriteAllocator.ts:127-139` | B: supplied ONLY to the battle's first move body after a known entry; null (scene-off fallback) otherwise. Cross-body plan tracking (`applySpriteOrderUnitPlan`, `spriteOrderProvider.ts:346`) exists but is not wired |
| palette history for audited plans | `src/engine/liveMoveAnimationPalette.ts:8-11,91`, `src/data/gen/live-animation-palette-resources.json` (58 plans) | D-PAL: returns only the Shadow Punch scratch; unfaded/faded/hardware snapshots are not supplied for any remaining move |
| MOVE_ANIMATION request | `src/engine/battleScriptHitChainOpcode.ts:2276-2289`, `src/engine/battleMoveAnimation.ts:2` | carries move, turn (animTurn), STATIC move-table power, damage, friendship, multihit; NOT: dynamic gBattleMovePower, DisableStruct counters, secondary-effect outcome |
| affine matrix ids / task slots / Random2 / OBJ tile+bank allocator / BG-BLDCNT-monbg / OAM-VRAM-scanline buffers / audio | none (no `matrixBitmap`, `CreateTask`, `Random2`, `gScanlineEffect` state anywhere in `src/engine`) | the remaining blockers of the H_BUFFER moves |

## 3. Stale verdicts corrected

| Older verdict | Correction (cite) |
|---|---|
| Sleep Talk `BLOCKED: called-move flow` (prep2 row 8) | Metronome is live and plays the called move as a separate request (`src/engine/liveMoveAnimation.ts:417,1043`); `SceneOnSleepTalkConfig` has no profile (`src/animation/sceneOnPresentation.ts` interface). Only the renderer's hard-coded HUD block remains: READY-NOW. |
| Aerial Ace / Quick Attack / Feather Dance / Ice Punch / Fake Tears `H_OUTCOME` (readiness) | `controllerProfile`/`controllerPresentation` feed only HUD/text fields of the views (`sceneOnAerialAceView`, `sceneOnQuickAttackView`, `sceneOnFeatherDanceView`, `sceneOnIcePunchView`, `sceneOnFakeTearsView`); the body functions do not read them: READY-NOW with a body-only recipe. Fire Punch is the exception (`burnFlames` read `resolution.secondaryRollSucceeded` / `faint`). |
| Sand Attack `NEEDS-ORDER+RNG2+OUTCOME` (h-buffer-triage) / `READY-WITH-PROVIDER` (order-consumer-prep) | the accuracy banner is body; `controllerProfile` is HUD only. Remaining blockers are Random2 dirt seeds (`mudSlap.ts`/`sandAttack.ts` 30 seeds, visual-randomness-prep s2) + first-body order. The order-consumer prep verdict for Mud Slap and Sand Attack covered the order input only. |
| Magnitude `BLOCKED (not an accepted adapter)` (order-consumer-prep) | `ANIMATION_COVERAGE.json` records MOVE_MAGNITUDE `exact` (764/764 zero-residual, four bodies); `magnitude-dense-evidence.json` still says `unsupported-evidence` (older). Remaining: dynamic power on the request (branch `movePower > 99`, `magnitude.ts:88`) + first-body order; activation == window start for all four bodies (census-activation). |
| Dragon Dance / Fire Blast / Double Team `READY-NOW` (h-buffer-triage) | prep6 measured an order dependence the field-name triage missed: Dragon Dance 1 bit/1 frame, Fire Blast full 64-pool permutation (`FIRE_BLAST_ORDER_SEED`), Double Team `frontClone` 1 bit. The first-body provider now supplies it, so they are READY-NOW with first-body-only exactness. |
| `NEEDS-ORDER` for every order consumer (h-buffer-triage, 57 moves) | first-body order is now production (`spriteOrderForSlots`, `prepareLiveMoveSpriteOrder`); `B` is no longer a blocker for the first body. It remains a fidelity limit for later bodies (68.2% weighted EXACT per-(move, side) plan coverage, `docs/sprite-order-plan-coverage.md`). |
| Absorb / Mega Drain / Giga Drain / Dream Eater `NEEDS-...+OUTCOME` | the configs carry no HP field (h-buffer-triage s2.10); the HP bar is the ordinary queue's. Only the palette-controller allocator profile (D-PAL) is missing. |
| Razor Wind / Sky Attack / Curse `H_VARIANT` | the charge/strike selector is `request.turn` (`choosetwoturnanim`), already on the request like live Solar Beam; not a provider. Dig / Dive / Fly / Bounce additionally need the hidden-battler state between turns. |
| Rock Blast `E-OUT` | one body per hit; `request.multihit`/`turn` exist and per-hit adapters are live (Double Slap, Comet Punch, Triple Kick). Only the task slots remain. |
| Reversal `blocked on a reducer change` / Flail `power` | both read the DYNAMIC power (`gDynamicBasePower`), but the request emits the static table power (`battleScriptHitChainOpcode.ts:2285`): a named small input, not `request.power` as noted in the progress ledger. Reversal's reducer toggle fix is banked in `reversal-shake-evidence.json`. |
| Fury Cutter / Ice Ball / Rollout / Spit Up counters | come from the DisableStruct snapshot the ROM passes in the animation command (`battle_script_commands.c:1787`), not `animTurn`; the request does not carry it, though the rules state does (`battleScriptRulesContext.ts:251-252,325-326,738`). Only Swallow's stockpile uses `animTurn` (prep6). |
| Fire Punch accepted window `UNRESOLVED` | RESOLVED in `docs/next-adapters-prep10.md` (direct mGBA, same staged route): the player window 2313..2537 starts 27 frames BEFORE the activation 2340 (reducer age at activation 27; spiral spawn = activation+13 = age 40/41); the opponent window 2081..2357 starts 13 frames AFTER the body end (2068), so it never covers the body; the burn flames are a separate ordinary status body (2224..2262), not part of the 101-frame Fire Punch body. |

## 4. Per-move table (103 moves)

Columns: `needs` = provider codes after removing what production supplies (`B(first body)` = also consumes sSpriteOrder, supplied by production for the first body only; legend in section 5). Blockers cite the consumed field (`a/` = `src/animation/`, `e/` = `src/engine/`, `rom/` = `reference/pokeemerald/`). Full text per blocker is in the JSON.

## 5. Provider ranking

Codes: `B` sSpriteOrder: SATISFIED by the lend (src/engine/liveSpriteOrderHost.ts + spriteOrderProvider.ts) incl. the cross-body tracker while the history is modelled; falls back after an unmodelled graphics command; `C` Random2 surrogate (presentation-only gRng2Value stream); `F-AFFINE` affine matrix allocator (AllocOamMatrix ids / matrixBitmap); `E-TASK` task-slot allocator (CreateTask slots / live task table); `D-PAL` palette snapshot provider (unfaded/faded/hardware per move plan); `D-TILE` OBJ tile / palette-bank resource allocator; `D-BG` BG regs / BLDCNT / monbg state; `D-OAM` software/hardware OAM + affine buffer host; `D-VRAM` BG VRAM snapshots; `D-SCAN` gScanlineEffect buffers; `F-AUDIO` sound task / pan / current-song state; `E-OUT` outcome selector from resolution not on the request; `X-DISABLE` DisableStruct counter snapshot on the MOVE_ANIMATION request (fury/rollout/stockpile counters); `X-SWITCH` switch / forced-switch flow owner (post-body field, return-to-ball, slide-off); `X-SUBST` persistent Substitute doll sprite state; `X-POWER` dynamic gBattleMovePower / gDynamicBasePower on the MOVE_ANIMATION request (production emits the static move-table power); `X-AGE` accepted evidence lacks the early source ages (age basis); `X-REDUCER` accepted reducer hard-codes values production can derive; reducer parameterization needed; `X-SCHED` scheduler/callback-advance state; `X-TWOTURN` semi-invulnerable two-turn state (hidden battler between turns).

Ranked by remaining moves that become fully unlocked when that provider alone is added (all other inputs already available) and by their usage weight; `touching` = every remaining move that needs it (the provider's reach once the others exist). Bundles: A6 graphics host (OAM+VRAM+scanline+BG+palette+tile+audio) = D-OAM+D-VRAM+D-SCAN+D-BG+D-PAL+D-TILE+F-AUDIO.

| Provider | Alone unlocks | Weight | Touching | Touching weight | Cost / claim | Unlocked moves |
|---|---:|---:|---:|---:|---|---|

Greedy build order (each step = the provider/bundle with the most newly unlocked remaining moves given the earlier steps):

| Step | Provider | New moves | New weight | Cumulative remaining unlocked | Newly unlocked |
|---:|---|---:|---:|---:|---|

Notes:
- **Random2 is the keystone but non-exact.** It touches the most remaining moves and, after the allocator-v2 and A6 steps, unlocks ? more; production cannot reconstruct `gRng2Value` (it advances every rendered frame and with every earlier animation's draws, `docs/visual-randomness-prep.md` s4). A presentation LCG is ROM-faithful in distribution and draw order only; the claim boundary (a non-exact presentation class beside the exact one) must be decided before building it. It cannot make a move exact on its own.
- **Cross-body order tracking** is not a blocker for any remaining move's first body; it upgrades the exactness of the 62 first-body-only moves for later bodies (weighted per-(move,side) plan coverage 68.2%, `docs/sprite-order-plan-coverage.md`: the heaviest NEEDS-KEYS bodies are Ice Beam, Thunderbolt and Attract).
- **E-OUT** lumps four different small inputs (Endeavor HP/stale power, Fire Punch burn/faint, Leech Seed body, Pursuit/Skill Swap/Rapid Spin outcomes); only Endeavor and Fire Punch are single-input moves.
- **A6 graphics host** has no single-provider unlocks beyond 6 moves; the other D-* codes unlock nothing alone.

## 6. Derived batches (no hard-coded lists)

Batches are derived each run: P1 = READY-NOW, P2 = SMALL-INPUT (measured in `docs/next-adapters-prep10.md`), P3 = the first greedy provider.

## 6b. Stale codes corrected (this regeneration)

- B (sSpriteOrder): was 'first body only'; production now lends the order and tracks it across bodies (liveSpriteOrderHost.ts / spriteOrderProvider.ts, merged cross-body tracker + post-KO rung 1), so B no longer blocks anything; recipe work only (falls back after an unmodelled graphics command)
- F-AFFINE / E-TASK: were provider blockers; docs/allocator-plan-v2-evidence.md measured gOamMatrixAllocBitmap 0x6 + no tasks at all 481 known-entry bodies, so the accepted constants gated on the lent order suffice for first bodies (invalidated after a faint/switch)
- D-PAL: prep9 (docs/next-adapters-prep9.md) showed Absorb/Mega Drain/Giga Drain/Dream Eater/Sunny Day consume only age-derived blend schedules, no snapshot; those five are not in the remaining set. D-PAL on the remaining moves is NOT re-measured here and stays a blocker
- C (Random2): gRng2Value is not trackable across real play (docs/random2-trackability.md) but D3 (2026-10-06) approved a deterministic presentation-only surrogate; C now means "needs the presentation RNG + the move's draw plan" (docs/next-adapters-prep12-random2.md). Hidden Power / Ice Beam / Water Spout draw no Random2 at all (their animationRng is an echo): C is stale there
- Fire Punch accepted-window phase: not a mismatch (prep10: opponent window starts after the body; player reducer age at activation 27); Flail/Reversal X-POWER cite corrected (the power divide is AnimTask_ShakeTargetBasedOnMovePowerOrDmg, not FlailMovement)
- Batches N1-N3 (hard-coded) all landed except the one-input moves; batch picks are now derived from the groups each run
- SMALL-INPUT now means every needed code is a small input (X-REDUCER, X-POWER, E-OUT, X-DISABLE, X-SCHED), several allowed

## 7. Activation probes run for this census

Direct independent mGBA runs (Scene ON, one fresh run per scenario, `tools/integration/issue142ActivationProbe.py` and the `censusStageActivation.py` copy of the `prep6StageActivation.py` staging boundary with Rock Slide / Endeavor / Ice Punch / Fire Punch PP entries); receipts in `tools/integration/fixtures/census-activation/` (`summary.json` joins them with the accepted windows). Probe processes segfault at interpreter teardown after writing their JSON (harmless, as in earlier prep runs). Not measured: Double Team opponent attacker, Endeavor opponent attacker (the staged AI chose Rock Slide), Rock Slide player-attacker accepted evidence (none exists).

| Move | Probe | Activation | Accepted window | activation - window start | window end - script end | Reducer age at activation | Script frames |
|---|---|---:|---|---:|---:|---:|---:|

Reading: for Aerial Ace / Quick Attack / Feather Dance the accepted dense window starts 31-37 frames BEFORE the script activation and runs 148-198 frames past it (the whole controller timeline), so a live window that starts at the activation frame needs the reducer age at activation (38-44) as its age basis, and ends at the script end; Ice Punch, Sleep Talk, Magnitude, Reversal and the opponent Rock Slide have window start == activation (row 0).

## 8. Caveats

- Needs are static: a `needs` code means the accepted config type consumes that input (cited field), not that pixels were re-rendered; READY-NOW means the config is complete from production providers, not that the adapter is exact after arbitrary history (net-zero audit, tie audit and the ordinary-route replay still apply, `docs/h-buffer-triage.md` s2.8).
- First-body order: the provider returns null after any unmodelled graphics command, so each `+B` move falls back to the bounded scene-off path outside the battle's first body (as Grudge does).
- Weights follow the Level-50 rental model; Open-only Outrage is counted by its set weight like any other move.
- This session's classification of the nine newest accepted moves (Will-O-Wisp, Megahorn, Superpower, Revenge, Spit Up, Fury Cutter, Ice Ball, Curse, Outrage) is read from their typed `LiveInputs` records, not from an older triage; all are all-or-nothing A6 shapes.
