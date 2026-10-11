# S10A fury99 — Fury Cutter 210 at counter 2..5 (later bodies)

Base: master `46d64a860` (production src `2e5b1d7c`). Side lane, narrow production grant (the Fury Cutter adapter / inputs / case 210).
Every ROM number comes from independent direct-mGBA `fury99Probe.py` processes (Scene ON), never the shared HTTP oracles. Every
scenario pins an explicit lab `"seed"` and ran twice fresh in one batch (ISSUES #154): **10 / 10 r1 == r2** (byte-identical probe JSON,
including per-frame RGB sha256 and palette RAM). Every window then ran through the production renderer (`liveAdapterFramebuffer.ts`
via `later58Check.sh`) in two more fresh probe processes, with the digests agreeing.

## Results

**Fury Cutter is live at counters 1..5.** The window stays 43 rows. Counters 2..5 differ from counter 1 only in two things:
- the slice direction (`counter & 1`);
- the complex palette blend, which is now source-derived (`liveFuryCutterBlendRows`). It is not a provider with history: the blend
  sprite is invisible, and Step2 restores the palettes before the body ends.

The counter is plans54's furyCutterCounter payload (`request.rolloutCounter`), which already keys the order host, so the lend after the
user's own body is known. Receipt: `tools/integration/fixtures/fury99-live-receipt.json`.

| counter | blend (hardware rows, RAM) | slice | windows (two fresh runs) |
|---|---|---|---|
| 1 | none | right | 9 / 10 0 px; the 10th, the opponent-ONIX first body, declines (rest, unchanged) |
| 2 | 8..10 | left | 10 / 10 0 px |
| 3 | 8..10, 15..18 | right | 10 / 10 0 px |
| 4 | 8..10, 15..18 | left | 10 / 10 0 px |
| 5 | 8..10, 15..18 | right | 10 / 10 0 px |

That is **49 / 50 windows with 43 / 43 rows at 0 px in both runs**. The pairs are GROVYLE → BLISSEY, SCYTHER → GOLEM and SCYTHER → ONIX
(an idle-rest target), each with both attacker sides, after Growl (with its stat-down body) or Splash.

**RAM evidence** (`fixtures/fury99/probe-summary.json`):
- `gDisableStructs[attacker].furyCutterCounter` (+0x10, stride 0x1C) read at activation is 1, 2, 3, 4, 5 in all 10 scenarios.
- The PLTT words differ from the activation row on exactly the rows above, in BG banks 1..3, OBJ banks 16 / 17 and the monbg bank (8 or 9).
- Each counter shows one pattern across every scenario.
- At counters 2..5 the ROM x2 of the opponent ONIX is 0; at its counter-1 first body it is 1.

**Gate (case 210).** The order lend must be known, and the counter must be 1..5. The counter comes from the payload. Without the payload,
later58's power rule applies (10 / 15 = counter 1). Non-shiny. Rests:
- first body: unchanged;
- later counter 1: the species rule (both rests {0,0}), unchanged;
- **counter 2+**: a species rest counts only while the x2 tracker does not have it zeroed. The user's earlier Fury Cutter body is a
  damaging body whose target role is `zeroed`, and its ShakeMon ends the target at x2 = 0 (ROM: ONIX 1 → 0).

**Census** (seeds 0..999, `46d64a860` vs final, 10 `--index-from` shards each; `hist73Merge.py`, `prep43CensusDelta.py`,
`fury99CensusCheck.py`; `fixtures/fury99/census/`): **all identity gates PASS**:
- the same 27,516 commands;
- the same command KEY sequence (`commandKeyDigest 907bc05914b3aebf`) and the same frames per command;
- the same `battleDigest` (`f6d738925c8aa84f`) and `battleDigestExcludingFrames` in all 10 shards;
- 0 live → fallback, 0 render throws.

**Gains: +36 commands / +1,548 live frames, all Fury Cutter 210**, all from the case-local gate. Live share goes from 26,185 = 95.16 %
(by frames 98.65 %) to **26,221 = 95.29 % (98.69 %)**. Fury Cutter goes from 46 / 84 live to **82 / 84**. The remaining 2 are both
census battle 851, ANORITH → opponent ONIX. Each is ANORITH's first Fury Cutter after its own Metal Claw, i.e. counter 1, declined by the
unchanged species-rest rule. The census ran on `b35188f28` (src `86e49e12`, see `revs.txt`), the final src.

**Scene ON/OFF parity** (`fury99Parity.ts`, land75Parity's controller; final code; `fixtures/fury99/parity/`):

| census battle (seed, streak) | boundaries | battle RNG, rules, boundary | Fury Cutter bodies (order known) |
|---|---|---|---|
| 45 (45, 5): a lifted counter-2 body | 29 | all equal | 3 (3) |
| 308 (308, 7): 10 lifted bodies | 69 | all equal | 16 (10) |
| 851 (851, 2): ANORITH → ONIX | 30 | all equal | 2 (2) |

**Tier-1 test**: `tests/animation/fury99FuryCutterCounters.test.ts`, 8 tests:
- the blend schedule equals the RAM rows;
- 5 windows, one per counter 2..5 plus the ONIX counter 2+ window, each with every one of 43 rows equal to the ROM RGB sha256;
- every fixture is live except the declined one;
- the gate cases.

Revert experiments, each by reverting the src hunk:

| reverted | failed tests |
|---|---|
| the case-210 gate | 6 / 7 |
| the blend (empty schedule) | 5 / 7, failing at exactly rows 8..10 / 15..18 |
| the counter-2+ rest rule (species-only) | 3 / 8 |

**Correction to the predictions.** Prediction 2 said the monbg bank stays unblended. It does not. `Task_UpdateMonBg` (battle_anim.c:829
/ 835) copies the target's **faded** OBJ palette into the monbg bank every frame, so the target on the BG darkens with the blend. The
RAM shows this, and the model copies from the blended OBJ bank. Every other prediction held exactly:
- the blend rows 8..10 / + 15..18;
- 43 rows;
- the direction by parity;
- counter 3 ≡ 5;
- nothing inherited.

**Gates** (final code, serialized, four Vitest workers):

| gate | result |
|---|---|
| fury99 test + every Fury Cutter test + `factoryAnimationInventory` + `playableAnimationIntegration` | 19 files / 498 tests pass |
| `npm run typecheck` | green |
| `npm run test:smoke` | 8 files / 448 tests pass |
| full suite, shard 1/2 | 812 files passed, 22 skipped; 6957 tests passed, 119 skipped |
| full suite, shard 2/2 | 811 files passed, 22 skipped; 6366 tests passed, 104 skipped |
| `npm run build` | green |
| `compare:differential` (fight-submenu, battle1-postwin-next-prompt, presentation-rng-playable-live-bodies-seeded-on, `--base 46d64a860`) | PASS, 624 / 624 captures byte-identical |
| `git diff --check` | clean |

## Not lifted

- **The opponent idle-rest target at a counter-1 body.** Two cases: the first body (`liveFuryCutterInputs` declines on the target rest),
  and a later counter-1 body (the species rule). The target's rest x2 under monbg is not modelled.
- **SWARM (×1.5)** was not staged. It changes only gBattleMovePower, and the gate reads the counter, not the power. Without the
  payload, the later58 power rule keeps 15.

## Method

1. `fury99Scenarios.py` builds the scenarios. It takes later58's Fury Cutter bases and replaces only the foe lead's moves with Splash ×4
   or Growl ×4; the ONIX batch also replaces the foe lead with ONIX 95. The trace is five turns, so the user's Fury Cutter runs at counters 1..5.
2. `fury99Probes.sh` runs `fury99Probe.py` twice fresh. That probe is prep48Probe.py plus two reads: the RAM counter, and the per-frame
   PLTT of banks 1, 2, 3, 8, 9, 16 and 17. `fury99Summary.py` checks r1 == r2, the counters and the blend rows.
3. `fury99Fixtures.py` builds the `liveAdapterFramebuffer` fixtures:
   - `requestFields.rolloutCounter` = the RAM counter;
   - `precedingBodies` key earlier Fury Cutter bodies by their plans54 order keys (210 / 10210 / 20210 / 30210);
   - `precedingX2Events` carry the real move ids.
4. `later58Check.sh` / `later58Check.ts` (unchanged) runs the production renderer, two more fresh probes per scenario.
   `fury99Receipt.py` writes the receipt. The `lentOrderEqualsRom: false` rows (Growl variants) are the harness replay without prompt
   cycles, as in prep48 / later58; those windows are still 0 px.

## Reproduce

    export PYTHONPATH=/Users/kyle/Developer/pokebench/vendor/libmgba-py
    sh tools/integration/fury99Run.sh .integration/validation/fury99-rerun            # scenarios .. receipt + test, each SAME / DIFF
    sh tools/integration/fury99Run.sh .integration/validation/fury99-rerun2 --census  # + census 0..999 (base 46d64a860 vs HEAD)
    node --experimental-strip-types --no-warnings tools/integration/fury99Parity.ts --seed=45 --streak=5

## Predictions from source (before probes; committed `0cac82440`)


Source: `data/battle_anim_scripts.s` Move_FURY_CUTTER, `battle_anim_effects_2.c` AnimTask_IsFuryCutterHitRight /
AnimTask_GetFuryCutterHitCount, `battle_anim_normal.c` AnimComplexPaletteBlend(_Step1/_Step2) + UnpackSelectedBattlePalettes,
`battle_anim_mons.c` GetBattlePalettesMask, `util.c` BlendPalette.

1. **What the counter changes.** `gAnimDisableStructPtr->furyCutterCounter` (the attacker's counter after Cmd_furycuttercalc; the
   request already carries it since plans54 as `request.rolloutCounter`, moveId-gated) selects:
   - the slice direction: `counter & 1` = 1 → FuryCutterRight (arg 1, h-flipped), 0 → FuryCutterLeft. Counter 2 / 4 = left, 1 / 3 / 5 = right.
     `liveFuryCutterHardwareOamRows` already models both (`rightHit`).
   - the blend: counter 1 → FuryCutterContinue2 (none); 2 → FuryCutterMedium (`complex_palette_blend` num_blends 1);
     3 → Strong, 4+ → Strongest — **byte-identical arguments** (num_blends 3). So counter 3 ≡ 5 and 4 differs from 3 only in direction.
   - nothing else: the blend sprite is created in the same script frame as the slice (createsprite runs through
     createvisualtask / jumpreteq / goto without a wait), is invisible (no OAM entry) and is destroyed before the slice
     (~9 / ~17 frames vs the slice's 24): **the duration stays 43 rows**.
2. **The blend.** Selector F_PAL_BG | F_PAL_BATTLERS = BG palettes 1, 2, 3 + OBJ palettes 16 + attacker, 16 + target (partners absent
   in singles). **Not** BG banks 8 / 9: the monbg copy of the target (LoadPalette from the unfaded OBJ bank, before the blend) stays
   unblended, so the target shown on the BG is not darkened while the battle background and the attacker are.
   BlendPalettes(mask, 4, RGB(9, 8, 10)) from unfaded: `c + (((9|8|10 - c) * 4) >> 4)` per channel.
   Timing: created (and blended once) in CB1 of the slice's creation frame; CB2 AnimateSprites runs Step1 the same frame (timer 3 → 2).
   Toggles when the timer is 0: on → off after 3 frames; counter 3+: off 4 frames, on 4 frames, then off; Step2 restores (coeff 0).
   With the palette transferred at VBlank like the OAM, the blend shows from the first row the slice shows (row 8):
   - counter 2: blended rows **8..10**;
   - counter 3 / 4 / 5: blended rows **8..10 and 15..18**.
3. **What a counter-k body inherits from the previous Fury Cutter body.** Nothing pixel-relevant beyond what the counter-1 later body
   already reads: Step2's BlendPalettes(mask, 0, 0) restores faded = unfaded; the blend sprite's slot is freed (the order host's plans54
   keys 10210 / 20210 / 30210 carry the allocation); ShakeMon ends the target at x2 = 0; register / BG history is unread (later58).
   Production can derive all of it: the counter from `request.rolloutCounter` (power is redundant), the lend from the order host.
4. **Gate.** Counter 1..5 at a later body (counter 2+ is never a first body), both species rests {0,0} (unchanged), non-shiny.
