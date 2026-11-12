# dive70 (S10A integration, 2026-10-10): the Dive 291 ATTACK body plays live

Base `889a5baf6` (src `afcf8175`). Tested code: `8f8a21fb6` (src tree `77c81b59`). The only production change is
`src/engine/liveMoveAnimation.ts`. Receipt: `tools/integration/fixtures/dive70-live-receipt.json`. Only direct mGBA processes were used; the
shared HTTP oracles were not touched.

## 1. Results first

### Windows

The Dive attack body is 93 rows, from the activation frame through the first inactive frame (age 92). Each window below was run in two fresh
direct-mGBA processes through the production live renderer (`liveAdapterFramebuffer.ts` → `renderBattleResolutionLiveView`). A second
batch of two more fresh runs per window (`POKEBENCH_LIVE_EVIDENCE_DIR`, used for the per-row ROM hashes) gave the same digests, so each
window has 4 / 4 identical runs.

| window | attacker side | attacker → target | ROM frames | rows | px r1 / r2 | digest (r1 == r2) | production lend == ROM |
|---|---|---|---|---|---|---|---|
| `ply-chinchou-onix` | player | CHINCHOU → ONIX | 629..721 | 93 | 0 / 0 | `a5a154f2d67c` | yes |
| `ply-lanturn-golem` | player | LANTURN → GOLEM | 482..574 | 93 | 0 / 0 | `b59c6a070929` | yes |
| `ply-clamperl-onix` | player | CLAMPERL → ONIX | 622..714 | 93 | 0 / 0 | `b1f752face28` | yes |
| `ply-seel-onix` | player | SEEL → ONIX | 474..566 | 93 | 0 / 0 | `6f5ed440fa40` | yes |
| `ply-chinchou-golbat` | player | CHINCHOU → GOLBAT (elevated target) | 486..578 | 93 | 0 / 0 | `7e870b3f3077` | yes |
| `opp-chinchou-onix` | opponent | CHINCHOU → ONIX | 764..856 | 93 | 0 / 0 | `f8db9a74e8be` | yes |
| `opp-lanturn-golem` | opponent | LANTURN → GOLEM | 614..706 | 93 | 0 / 0 | `b562c4d56fb9` | yes |
| `opp-clamperl-onix` | opponent | CLAMPERL → ONIX | 764..856 | 93 | 0 / 0 | `42e57de62f70` | yes |
| `opp-seel-onix` | opponent | SEEL → ONIX | 611..703 | 93 | 0 / 0 | `8e4b370275a6` | yes |
| `opp-chinchou-wailord` | opponent | CHINCHOU → WAILORD | 615..707 | 93 | 0 / 0 | `e7a086657dd6` | yes |
| `var-surf-ply` (Surf hits the hidden diver in turn 2) | player | CHINCHOU → ONIX | 960..1052 | 93 | 0 / 0 | `9381df1895f2` | yes |
| `var-surf-opp` | opponent | CHINCHOU → ONIX | 2353..2445 | 93 | 0 / 0 | `2156a187058c` | yes |
| `var-whirlpool-ply` (Whirlpool hits the hidden diver) | player | CHINCHOU → ONIX | 878..970 | 93 | 0 / 0 | `22a06710b004` | yes |
| `var-whirlpool-opp` | opponent | CHINCHOU → ONIX | 1087..1179 | 93 | 0 / 0 | `2dde1a72073e` | **no** (see s3) |
| `var-protect-ply` (attack after a protected, missed attack and a second setup) | player | CHINCHOU → ONIX | 2695..2787 | 93 | 0 / 0 | `9b3d3492ee65` | yes |

- **Totals: 15 / 15 windows, 1,395 rows, 0 px on every row of every run, r1 == r2 in 15 / 15.**
- Species pairs: 5 per side.
  - Attacker alternates: LANTURN, CLAMPERL, SEEL. These are Factory Dive users, with CHINCHOU as well.
  - Target alternates: GOLEM, GOLBAT (elevated, so it keeps the row-0 shadow), WAILORD.
- Scenarios:
  - the accepted `mechanic-dive-*` and `prep25-dive-alt-*`;
  - `species-audit-11/scenarios/{clamperlA,seelA,golbat,wailord}-*`;
  - `fixtures/dive70/scenarios/*` (from `dive70Scenarios.py`, with lab seed 305420547 + k pinned).

### Variants

- **Surf / Whirlpool:** these change the attack's start state only through the order history. The hidden-target hit plus its body come
  before the attack, and the target's HP changes. Both sides are proved for each, in the table above.
- **Miss / Protect:** a protected Dive attack plays **no attack body** in the ROM.
  - Source: the attack turn takes the accuracy / Protect miss path (`BattleScript_MoveMissedPause`) with no `attackanimation`.
  - The diver is revealed by `MOVEEND_ATTACKER_VISIBLE`, which is the controller sprite-visibility command that hide66's
    `applyLiveSemiInvulnerableCommand` already handles.
  - ROM evidence: `protect-{ply,opp}-s1..s6`, two fresh runs each with identical body lists. In all 8 probes where the turn-2 Protect
    succeeds, the next Dive body is a new 118 / 115-row setup, never a 93-row attack. So there is nothing for the adapter to draw.
  - `var-protect-ply` is the attack that comes after such a miss, a second setup and two more Protect bodies. It is exact.

### Words provenance

- Ordinary play: the attack body's 56 words come only from the presentation host. They are recorded at the production tick seam
  (`tickLiveMovePresentationRngSession`) with the land68 plan `LIVE_DIVE_RANDOM2_PLANS.attack`: 20 droplet words at +16, then 9 × 4 bubble
  words at +30 + 4k. Gameplay RNG is never read.
  - The words are read render-pure by key (`liveMovePresentationRngWords`).
  - Rendering a row twice gives the same profile and the same frame (test "render-pure").
- Pixel proof: the words are **PINNED** through the fixture hook `wordsChain`.
  - The pinned values are the RAM `gRng2Value` at each Dive body's activation: the setup(s) and the attack, read by `prep22Probe.py`
    `atActivation.rng2`, which is asserted equal to `rng2Series[A + 1]` stepped back once.
  - Each seeds a pinned host whose words follow the production law under the production body key.
  - The pinned proof covers the controlled body. It is not arbitrary-play RNG synchronisation.
- The order lend is **not** pinned. The production order host replays the history (`wordsChain.turns`) and lends the setup's word-free
  deferred marker, and the render seam resolves it.

### Census, Scene ON/OFF parity, ordinary route

**Census seeds 0..299** (`liveShareCensus.ts`, base `889a5baf6` vs final; `fixtures/dive70-census-seeds0-299.json`):

- **+15 live commands / +1,395 live frames.**
- Live share: 7,794 → 7,809 by count (97.79 % → **97.98 %**), and 1,157,616 → 1,159,011 by frames (98.94 % → **99.06 %**).
- The `duration: unsupported turn 1` stop (19 commands) is gone: 15 commands go live, 14 opponent and 1 player.
- The command **KEY sequence** (battle, kind, moveId, side, attacker, target) is identical over 7,970 commands.
- The battle records without the frame count (`battleDigestExcludingFrames`, new in the census tool) are identical: `1461cb9d…`.
- 0 live → fallback. Faithful-random history: 309 / 49,199 → 324 / 50,594.

**Presented-frame changes are exactly the 19 Dive attack commands:**

- 15 go live, 32 → 93 frames each:
  - battle 5: CHINCHOU → SABLEYE;
  - battle 68: POLITOED ×7;
  - battle 107: CHINCHOU ×2;
  - battle 162: CLOYSTER;
  - battle 250: CLAMPERL ×4.
- 4 keep the fallback but now run the measured 93 frames, not 32, because the duration is known:
  - battles 107, 135 and 162 decline on "battler has a status condition", the DIVE branch's own gate, as for the setup;
  - battle 94 (opponent CLAMPERL) declines together with its own setup. In the base, that setup already declined at the setup branch's
    activation-order / words gate. The census's static classifier labels the attack "unclassified (branch-local gate)", and its exact gate
    was not attributed further. CLAMPERL is not elevated: it plays live as the opponent diver in battle 250.
- Battle totals also differ by +1 frame in battles 5, 68, 94, 107 and 135. This is a census-controller artifact, not a game change. The
  census dismisses messages with A only on even frames (`frame % 2 === 0`), so an odd body-length change (+61) costs one frame at the next
  dismissal.

**hide66 per-frame check on the final code** (`hide66Census.ts`, 0..299):

- 26 hidden-span bodies, of which 24 / 3,518 frames are live.
- **0 commands / 0 frames draw the hidden battler**, unchanged.

**Scene ON vs OFF parity** (`hide66Parity.ts --moves=291`): logical outcomes, RNG, rules and boundary were compared at every action-menu
arrival.

| route | Dive side | boundaries | digest | ON vs OFF |
|---|---|---|---|---|
| census battle 68 (seed 68, streak 13; land68's route) | opponent | 81 | `7eae65a1…` (== land68) | equal |
| census battle 162 (seed 162, streak 18) | player | 30 | `ad5665f4…` | equal |

Receipts: `fixtures/dive70-parity-seed{68,162}.json`.

**Ordinary real-input route** (`random2Route` seed 111 slot 0, CLAMPERL):

- Both player Dive attacks are live at all 93 ages on 56 surrogate words.
- The battle reaches the following action menu.
- A different presentation seed gives other words, with identical boundaries, RNG and facility state.
- Session export (seed + policy) → replay reproduces the attack bodies' frame digests.
- Seed 19 slot 2 (words46): the opponent's Dive attack now plays live through the RAIN_CONTINUES marker after its setup.

## 2. What landed

`src/engine/liveMoveAnimation.ts`:

- `liveMoveAnimationDuration` case 291, turn 1 → `DIVE_ATTACK_ROWS` = 93.
  - The design note's "92 rows" is prep25's first-inactive age 92, the same convention as its setup "117 / 114", which are 118 / 115 rows.
  - Every one of the 15 windows, and every prep25 window, is 93 rows (`end − start + 1`).
- `liveDiveWordsPlanText` is split:
  - `liveDiveGeometry` builds the B.1a anchors, including `targetImpactOffset` (target Y_PIC_OFFSET y − 8 for a player target, − 2 for an
    opponent target).
  - `liveDiveWordsPlan` returns `{ text, profile }`: the plan text land68 tests against the ROM, and the real-slot `DiveProfile` built from
    the same allocation.
  - The plan text is unchanged (`spriteOrderPrep65` passes 15 / 15).
- Case 291 turn 1 builds the attack config `{ move: "DIVE", body: "attack" }`:
  - the gates are the known (resolved) lend, non-shiny, no displayed status, and 56 host words shaped 20 + 9 × 4 (inside
    `liveDiveWordsPlan`);
  - the profile comes from `liveDiveWordsPlan`, with `firstInactiveAge` 92;
  - the subpriorities are 30 / 40 and the droplet / bubble velocity rules are those of `AnimSprayWaterDroplet` /
    `AnimSmallDriftingBubbles`;
  - an elevated opponent diver declines, because the return of its enemy shadow after the reveal is unmeasured.
- `liveMoveOpponentShadowRow`: an opponent diver's attack has no row-0 shadow. The diver is still invisible on its activation frame, as for
  the Dig unleash.
- No HUD profile was needed. `renderBattleResolutionLiveView` redraws the battle window and the live queue's message over the staged DIVE
  branch's "used DIVE!" text. The staged DIVE branch has no HP-drain or hit-reaction ages.
- The hide ends at the attack body without a code change.
  - `liveSemiInvulnerableHideBattler` is null for turn 1, so `applyLiveSemiInvulnerableCommand` clears the diver's hide when the body
    completes.
  - Inside the body, hide66's `liveMoveHiddenSides` already exempts the attacker.
  - dive.ts `attackerInvisible` (ages < 83) hides the diver until DiveAttack's `visible ANIM_ATTACKER`.
- `dive.ts` and `battleScene.ts` are unchanged. The accepted staged fixtures are untouched.

## 3. Open points

- **One order-host residual.**
  - In `var-whirlpool-opp` (whirlpool-opp-s1), the player's Whirlpool hits the hidden opponent diver at the end of turn 1, right before
    the turn-2 action prompt.
  - The production lend then places the prompt's slots 3 / 4 ahead of the Whirlpool's freed slots. The ROM has them interleaved:
    `…2,17,10,3,9,5,7,16,4,…` vs ours `…2,3,4,17,10,9,5,7,16,…`.
  - The window is still 0 px.
  - This is the order host's history (a hidden-target hit followed by an action prompt). It is outside this step's grant, so it was left
    unchanged and is flagged for audit. The other 14 lends equal the ROM, and land68's 7 / 7 routes still pass.
- The 3 status declines and battle 94's setup-chain decline are listed above.
- An elevated opponent diver declines. The census Dive users (CHINCHOU, CLAMPERL, CLOYSTER, POLITOED, LUVDISC) are not elevated
  (`enemy-mon-elevations.json`), so the gate has no census cost.

## 4. Gates (final code `8f8a21fb6`, src `77c81b59`)

- New tests in `tests/animation/liveDiveAttackAdapter.test.ts` (5 tests):
  - the receipt;
  - a **vector test**: the production render of all 15 × 93 pinned rows equals the ROM RGB888 sha256 per row;
  - the gates;
  - render purity;
  - ordinary route + export replay.
- **Revert experiment:** with `liveMoveAnimation.ts` reverted to `889a5baf6`, 4 / 5 fail. Only the static receipt test passes.
- Pins moved:
  - `liveDiveSetupAdapter`: attack 93 rows; the seed 111 attack is live.
  - `wordsOrderDeferredLend`: seed 19 rain frames are setup 0..114 then attack 0..92.
  - `factoryAnimationInventory`: Dive's scope covers both bodies.
- Targeted run, 4 workers: **83 files / 2,435 tests passed**. This is every test file matching `291` / `DIVE` / `dive`, plus
  `spriteOrderPrep65`, `hide66HiddenBattler`, `presentationRng*`, `factoryAnimationInventory`, `playableAnimationIntegration`,
  `playableAnimationLifecycle` and `wordsOrderDeferredLend`.
- `npm run typecheck`: 0 errors. `npm run test:smoke`: 8 files / 448 tests.
- Full suite, two foreground shards, 4 workers: **1,603 files / 13,185 tests passed, 0 failed** (44 files / 223 tests skipped).
  - Shard 1: 802 files / 6,865 tests. Shard 2: 801 files / 6,320 tests.
  - The first shard-1 run failed one pin: `liveStatusImplementedCount` fixes the faithful-timing entry's field set, and the new `bodies`
    field broke it. The field was removed, that file was rerun alone, and both shards were rerun.
- `npm run build`: OK (881 modules).
- `compare:differential` (fight-submenu, battle1-postwin-next-prompt, presentation-rng-playable-live-bodies-seeded-on) vs `889a5baf6`:
  **624 / 624 byte-identical**.
- `git diff --check`: clean. `battleScene.ts` is untouched, so the split-eligibility test is unaffected; it passes in the suite.

## 5. Reproduction (from workspace/)

```
python3 tools/integration/dive70Scenarios.py
S=tools/integration/fixtures/species-audit-11/scenarios B=tools/battle-lab V=tools/integration/fixtures/dive70/scenarios
JOBS=10 sh tools/integration/dive70Probes.sh <P> 1 $B/mechanic-dive-player-chinchou-opponent-onix.json $B/mechanic-dive-opponent-chinchou-player-onix.json \
  $B/prep25-dive-alt-player-lanturn-golem.json $B/prep25-dive-alt-opponent-lanturn-golem.json $S/clamperlA-dive-player-chinchou-opponent-onix.json \
  $S/clamperlA-dive-opponent-chinchou-player-onix.json $S/seelA-dive-player-chinchou-opponent-onix.json $S/seelA-dive-opponent-chinchou-player-onix.json \
  $S/golbat-dive-player-chinchou-opponent-onix.json $S/wailord-dive-opponent-chinchou-player-onix.json $V/surf-ply.json $V/surf-opp.json \
  $V/whirlpool-ply.json $V/whirlpool-opp-s1.json $V/protect-ply-s2.json
python3 tools/integration/dive70Fixtures.py <P> ply-chinchou-onix=$B/mechanic-dive-player-chinchou-opponent-onix.json ... \
  var-surf-opp=$V/surf-opp.json@2 var-whirlpool-opp=$V/whirlpool-opp-s1.json var-protect-ply=$V/protect-ply-s2.json@3   # == committed fixtures
node --experimental-strip-types --no-warnings tools/integration/dive70Check.ts tools/integration/fixtures/dive70/*.json > check.jsonl
ls tools/integration/fixtures/dive70/*.json | xargs -P 5 -n 1 sh -c 'POKEBENCH_LIVE_EVIDENCE_DIR=<E> node --experimental-strip-types --no-warnings \
  tools/integration/liveAdapterFramebuffer.ts "$0" > <FB>/$(basename "$0")'
JOBS=12 sh tools/integration/dive70Probes.sh <PP> 2 tools/integration/fixtures/dive70/scenarios/protect-*.json
python3 tools/integration/dive70Receipt.py <FB> check.jsonl <PP> receipt.json <E>          # == fixtures/dive70-live-receipt.json
npx vitest run tests/animation/liveDiveAttackAdapter.test.ts tests/animation/liveDiveSetupAdapter.test.ts tests/wordsOrderDeferredLend.test.ts
# census (base: git archive 889a5baf6 workspace/src workspace/tools ... into a scratch dir, node_modules symlinked, this census tool copied in)
node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=0..299 --out=a.json --commands=a.jsonl
python3 tools/integration/prep43CensusDelta.py base.json base.jsonl a.json a.jsonl delta.json
node --experimental-strip-types --no-warnings tools/integration/hide66Parity.ts --seed=68 --streak=13 --moves=291
node --experimental-strip-types --no-warnings tools/integration/hide66Parity.ts --seed=162 --streak=18 --moves=291
```
