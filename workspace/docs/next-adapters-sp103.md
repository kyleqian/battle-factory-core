# sp103 — Shadow Punch 325: the age-90 restore lag, a D4 phase census (evidence only)

Side lane, evidence only, new files only. Base master `4b5d16e70` (production src `dc6c756a`). No tracked file is modified. The D4 entry
is a temp patch (`tools/integration/fixtures/sp103/sp103-shadow-punch-d4.diff`), applied ONLY to a git-archive copy. Presentation only:
no gameplay, RNG, damage, turn order or facility state is touched. It follows fp100 (`docs/fp100-focus-punch-d4.md`, Focus Punch 264).
Live audit 24 first found this lag (`docs/live-audit-24.md`, "TIMING-PHASE").

## Results first

**The lag is the dominant phase on both sides: player 13 : 3, opponent 12 : 4 (pooled with audit 24's 8). Fold it (fp100 shape).**

- Fresh direct mGBA (`ctl95Probe.py`, 40-row RGB tail). Explicit lab seeds 305419897 / 38177486.
- 6 labs, twice fresh: **r1 == r2 on 6 / 6**. The frame rows are equal in all 4 runs per lab (session + runner pass, x2).
- 24 doll-free HAUNTER bodies (the only Factory user), both sides.
- 5 foes: STEELIX (big picture), CROBAT (an elevated opponent target), QUAGSIRE, AERODACTYL, + audit 24's LAPRAS / SKARMORY.
- Bodies 0..3 of every lab. Predecessors: none (body 0), the foe's Light Screen, a failed Light Screen (no animation: the previous
  Shadow Punch), and the foe's Harden (`General_StatsChange`) in the two "slow" labs, where the foe moves first.
- "event" means a lag at body row 90: `gRng2Value` repeats between rows 89 and 90 (rows from the activation A). The ROM body is then
  109 active rows; without it, 108.
- Fixed lags at 27, 70, 71 in every body.
- In production terms the lag is age 82 (the body window starts at A + 8, after the 8 idle lead rows). It shifts the restore fade-in
  (ages 83..98) and, for the elevated opponent HAUNTER, the shadow return (101) one row later.

**Phase table** (`tools/integration/fixtures/sp103/receipts/phase.tsv`; px = production as committed, `ctl95ControlCheck.ts --shift=8`,
every body row, r1 / r2 equal everywhere):

| lab | side | pair | predecessor | bodies: phase | production px per window (bad ages) |
|---|---|---|---|---|---|
| sp103-player-haunter-steelix (seed A) | ply | HAUNTER -> STEELIX | -, Light Screen, SP, SP | b0..b3 lag | 273,536 (83..98) |
| sp103-player-haunter-crobat (seed B) | ply | HAUNTER -> CROBAT | -, Light Screen, SP, SP | b0..b3 lag | 291,616 (83..98, 102..105) |
| sp103-player-haunter-crobat-slow (seed A) | ply | HAUNTER -> CROBAT | Harden x4 | b0..b2 lag; b3 **no lag** | 291,616; b3 2,409 (101..105) |
| sp103-opponent-haunter-quagsire (seed A) | opp | HAUNTER -> QUAGSIRE | -, Light Screen, SP, SP | b0..b3 lag | 280,408 (83..98, 101) |
| sp103-opponent-haunter-steelix (seed B) | opp | HAUNTER -> STEELIX | -, Light Screen, SP, SP | b0, b1 **no lag**; b2, b3 lag | b0, b1 **0**; 277,048 (83..98, 101) |
| sp103-opponent-haunter-aerodactyl-slow (seed B) | opp | HAUNTER -> AERODACTYL | Harden x4 | b0..b3 lag | 290,168 (83..98, 101) |

**Counts:**
- Fresh sp103: player **11 : 1**, opponent **10 : 2**.
- Audit 24 (6 fresh bodies + the 2 accepted HAUNTER -> ONIX fixtures, which are in the no-lag phase):
  - player 2 : 2 (HAUNTER -> LAPRAS lag, GENGAR -> LAPRAS lag; HAUNTER -> SKARMORY no lag, accepted no lag);
  - opponent 2 : 2 (HAUNTER -> LAPRAS lag, HAUNTER -> SKARMORY lag; GENGAR -> LAPRAS no lag, accepted no lag).
- **Pooled: player 13 : 3, opponent 12 : 4.** HAUNTER only (without audit 24's GENGAR pair): player 12 : 3, opponent 12 : 3.
- Nothing production knows decides it:
  - the same lab and pair gives 108, 108, 109, 109 (opponent HAUNTER -> STEELIX);
  - the minority bodies are a first body (STEELIX opp b0), a second body (b1) and a fourth body (CROBAT-slow ply b3);
  - both predecessors (Light Screen, Harden) and both seeds occur in both phases.

**Production today** renders the no-lag phase on both sides (`liveMoveAnimation.ts` case 325: 106 / 105; `shadowPunchFadeHost.ts` with
`restoreTaskStartCallbackDeferrals` 0). So 21 of the 24 fresh bodies are off on 16 whole-field rows, ~17.1k..18.2k px per row.

## The temp patch and the dominant-phase windows

`tools/integration/fixtures/sp103/sp103-shadow-punch-d4.diff`, 6 files, +149 / -31. `git apply` on a git-archive copy of HEAD:

- `src/engine/liveMoveTimingPolicy.ts`:
  - entry **325**, two `optional-lag-age` parameters (opponent, player);
  - age 90, `fixedLagAges` [27, 70, 71], iterations 105, alternatives event 109 / no-event 108;
  - measured opponent 12 : 4, player 13 : 3; chosen "event", no tie;
  - 325 joins `LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS`.
- `src/engine/liveMoveAnimation.ts`:
  - 325 leaves `LIVE_MOVE_ANIMATION_IDS`;
  - case 325 passes `liveFadeHost: { restoreTaskStartCallbackDeferrals: 1 }` when `liveMoveOptionalLagAge(325, side) !== null`. This is the
    seam `shadowPunchFadeHost.ts` already documents for "a future audio/CPU scheduler"; its own test already pins the deferred fade
    (82, 83, 84, 99);
  - the duration is 106 / 105 + 1 = **107 player / 106 opponent**.
- `src/engine/battleScene.ts`: the opponent HAUNTER's live shadow return `age >= 101` becomes `101 + deferrals` (live field only).
- Accounting (fp100 precedent, scoped exact -> faithful timing):
  - `docs/animation-integration-live-status.json`: the 325 entry moves from `implementedAdapters` to `faithfulTimingAdapters`, with
    `timingParameters`, `alternatePhaseResidual` (ages 83..98 + 101, max 18,176 px/row) and the evidence;
  - `implementedCount` 238 -> **237**, `faithfulTimingCount` 25 -> **26**;
  - `remainingAdaptersCensus.mjs --write --doc`: **238 + 13 + 25 -> 237 + 13 + 26 = 276**. Factory acceptance and the 276 total are unchanged.
- The accepted HAUNTER -> ONIX fixtures (108 rows, no lag) stay valid in their proved scope. They become the documented other phase.

**Dominant-phase windows through the PATCHED production renderer** (`receipts/body-patch.json`; r1 == r2 everywhere):
- **Opponent: 10 / 10 lag-phase windows 0 px on all 106 rows** (QUAGSIRE x4, STEELIX b2 b3, AERODACTYL x4). Before the patch they were
  277,048..290,168 px each, on ages 83..98 + 101.
- **Player, STEELIX: 4 / 4 lag-phase windows 0 px on ages 0..105.** Only row 106 differs, 1,440 px. That row is the pre-existing E+5 trail
  row (below), not a phase effect.
- **Player, CROBAT target: 7 / 7 lag-phase windows 0 px on ages 0..101.** Ages 102..105 differ by 200 px each, and row 106 by 1,609
  (the trail + 200). That is the elevated-target shadow defect (below), present in both phases.
- 8 windows are committed as Tier-1 fixtures (`fixtures/sp103/windows`, `ctl95ControlCheck.ts --emit` format):
  - 6 policy-phase windows: player STEELIX b0, CROBAT b0, CROBAT-slow b0; opponent QUAGSIRE b0, STEELIX b2, AERODACTYL b0;
  - 2 other-phase windows: opponent STEELIX b0, player CROBAT-slow b3.

**Minority-phase residual under the patch** (3 fresh bodies):
- Ages **83..98** (16 rows): 17,303 px/row (STEELIX opp) and 18,176 px/row (CROBAT ply). That is one BLDY step: the ROM's fade-in starts
  one row earlier.
- Plus **age 101**, 200 px: the opponent HAUNTER's own shadow returns one row earlier.
- Plus the last window row: STEELIX opp age 105, 1,708 px (the ROM's next output, now inside the one-row-longer window); CROBAT ply
  101..105 + 106 (the target shadow + trail).
- This is the same shape as fp100's minority residual (ages 132..147 + the elevated row).

**Pins the patch moves** (`receipts/patched-tests.txt`). The related tests are the 117 files matching 325 / Shadow Punch / timing policy /
faithful timing / implementedCount / `LIVE_MOVE_ANIMATION_IDS` / the census. They ran on the patched copy: 14 files / 18 tests failed.
Rerun unpatched, those 14 files give 11 files / 14 tests failing, the same 14 tests (environment-only: the archive copy has no wasm /
reference inputs). **4 tests move because of the patch**, all intentional:
- `factoryAnimationInventory.test.ts` "counts faithful-random adapters apart …": `implementedCount` 238 -> 237;
- `liveStatusImplementedCount.test.ts` "keeps the faithful-random bucket separate …": 238 -> 237;
- `fp100FocusPunchTiming.test.ts` "accounting …": [238, 13, 25] -> [237, 13, 26];
- `playableAnimationIntegration.test.ts` "renders both opponent damaging and no-hit moves …": the HAUNTER Shadow Punch route ages
  0..104 -> 0..105 (106 rows).
- `npm run typecheck` on the patched copy: exit 0. `shadowPunchFadeHost.test.ts` and `liveMoveTimingPolicy` tests: green.

## FOLD INSTRUCTIONS (integration lane)

1. `git apply tools/integration/fixtures/sp103/sp103-shadow-punch-d4.diff`. If master moved, re-run
   `node tools/integration/remainingAdaptersCensus.mjs --write --doc` instead of applying the census hunks.
2. Move the 4 pins above (237; [237, 13, 26]; the HAUNTER route 0..105).
3. Add `tests/animation/sp103ShadowPunchTiming.test.ts` (fp100's test shape):
   - the banked phase table, and the policy recomputed from it (dominant, per side);
   - durations 107 / 106 and `liveFadeHost` through `liveMoveAnimationPresentation`;
   - the 8 committed windows re-rendered by `ctl95ControlFixture.ts`: 6 policy-phase, and 2 other-phase on exactly 83..98 + 101 (+ the
     last row);
   - the player rows 106 / 102..105 are the documented non-phase rows below.
4. Census (`fp100Run.sh --census` shape) before and after. Expected: only Shadow Punch commands change, +1 frame each, 0 live -> fallback.
   Also Scene ON / OFF parity on a HAUNTER route. **Not run here** (evidence lane, 50-minute cap).
5. Then add the `ANIMATION_INTEGRATION_PROGRESS.md` / PROGRESS entries (supervisor).

## Findings outside the D4 entry (not fixed)

- **DEFECT (reachable): an ELEVATED opponent TARGET's shadow is never redrawn by Shadow Punch's live renderer.**
  - Player HAUNTER -> CROBAT: the ROM shows CROBAT's enemy shadow again from age 101 (no lag) / 102 (lag). Production draws it only after
    the command, so ages 101..105 are 200 px each (bbox = the 32x8 shadow).
  - `battleScene.ts` ~51502 draws the shadow return only for an opponent ATTACKER (`opponentToPlayer`). Audit 24's latent artifact is the
    converse (GENGAR, no elevation).
  - Reachable in the Factory: player HAUNTER against any elevated foe (CROBAT, GOLBAT, AERODACTYL, MISDREAVUS, …).
  - Fix shape: draw the return for the opponent battler whenever its field-art elevation is > 0, at `101 + deferrals`, attacker or
    target.
- **land97 row 0, also for an elevated opponent TARGET.** On the same windows, lead row 0 is 200 px (`receipts/lead-head.json`,
  `audit24LeadCheck.ts`): player HAUNTER -> CROBAT, 8 / 8 bodies, both phases. 86d983b80 gated only an elevated opponent ATTACKER. Shadow
  Punch's age-0 image also hides an elevated TARGET's shadow, while the ROM's activation row still shows it.
- **ARTIFACT (pre-existing): the player window's last row is E+5.** Live audit 24 found it in the no-lag phase (SKARMORY ply row 113).
  Here it is CROBAT-slow b3 age 105 on HEAD, and with the patch STEELIX / CROBAT age 106 (1,440 / ~1,409 px, the opponent healthbox).
  Both phases carry it, so the patch keeps duration = body + constant (107). If idle94's "post + trail" follow-up trims the player
  duration by one, it trims both phases.

## Reproduce (from workspace/)

```sh
sh tools/integration/sp103Run.sh .integration/validation/<fresh>            # scenarios, probes x2, phase.tsv + renders (HEAD and the temp patch), all cmp'd
sh tools/integration/sp103Run.sh .integration/validation/<fresh> --tests    # + the related vitest files on the patched copy
```

Tools: `sp103Scenarios.py`, `sp103Job.sh`, `sp103Phase.py`, `sp103Run.sh`; reused: `ctl95Probe.py`, `ctl95ControlCheck.ts`,
`audit24LeadCheck.ts`. Receipts: `tools/integration/fixtures/sp103/receipts/` (`phase.tsv`, `probe-sha256.txt` (frame rows),
`lead-head.json`, `body-head.json`, `body-patch.json`, `patched-tests.txt`).
