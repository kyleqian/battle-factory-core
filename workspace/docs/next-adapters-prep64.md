# S10A prep64 — SUBSTITUTE_FADE: trigger, staging, EXACT (empty) plan, allocator NET-ZERO, census

Side lane, evidence only (new files only). Master `83ac6aa75` (production src tree `d7f24b03`). Oracle: direct mGBA processes
only (Battle Scene ON and OFF bootstraps); the shared HTTP oracles were not used.

## Results

- **Why plans48 / plans51 never reached the fade.** The stall was the "The SUBSTITUTE took damage for X!" message, not the fade.
  That text ends in `\p`, which waits for a button, and those stagings pressed no button after the move menu. The battle script
  parked at `datahpupdate` (`BattleScript_HitFromAtkAnimation+8`) for the rest of the trace, with gBattleControllerExecFlags = 1 and
  substituteHP still 40. The replica `s51-ply-169` shows this.
  - The same staging with B presses (`s51b-ply-169`: Crobat vs Dragonite's Outrage) reaches `General_SubstituteFade`.
- **Staging (must-have): reached on BOTH sides, Battle Scene ON and OFF, 3 species.**
  - Holders: PERSIAN 53 and GOLBAT 42 on each side, plus CROBAT 169 (player side, Scene ON).
  - 11 fade instances in 10 jobs. Each job ran twice in fresh mGBA processes in one batch, all A == B, each with an explicit lab
    seed (ISSUES #154).
  - A later fresh batch reproduced every receipt byte-identically (19:38 vs 19:51).
- **Plan: EXACT, empty.** `General_SubstituteFade` has no allocation window. On 11 / 11 instances, per frame, there are 0 windows
  and 0 free-order changes without an allocation.
  - All 11 order hand-offs to the next allocating unit are exact.
  - The next consumer body after the fade is exact on its current production row in 6 / 6 cases: Tackle 33 on both sides (row 16
    `Cf;Cf;D0;D1`) and Substitute 164 (row 9, empty).
- **Allocator: NET-ZERO.** aud56's probe and rule, keyed by the script label `General_SubstituteFade`:
  - Scene ON: 6 instances, from the known entry on both sides.
  - Scene OFF: 5 instances, both sides.
  - Every instance: created 0, baseline == end, no late change, and the tile allocator / palette tags / matrices are unchanged.
- **Census, seeds 0..299** (`prep61OrderCensus.ts`, same seeds, temporary patch = plan row + allocator set entry): **+16
  commands / +3,730 frames.**
  - Live share: 7740 → 7756 = 97.11 % → **97.31 %** by count, 1147932 → 1151662 = 98.11 % → **98.43 %** by frames.
  - 0 live → fallback regressions, 0 pairing mismatches over 7970 commands.
  - Battle digest `e3603a84…` is identical. `commandDigest` changes by construction: it hashes each command's live / decline
    state.
  - All 16 gains had the before-detail `order host: no EXACT plan: general animation SUBSTITUTE_FADE`. That stop no longer occurs
    (0 still fallback).
  - The gains are in battles 17 (4), 74 (1), 124 (5) and 262 (6).
  - **Split:** with the plan row alone (no allocator entry) the command record is byte-identical to the full patch (`dfd010c3…`).
    The allocator entry gains 0 on these seeds. This matches aud56: the one crossing has no live allocator consumer before the
    next reseed.
- **Chain predictor** (`prep45Chains.py --cleared "general animation SUBSTITUTE_FADE" --after`):
  - predicted 7 / 1487, and measured predicted & live 7 / 1487, predicted & not live 0;
  - not predicted & live: 9 / 2243, all in battle 17. Their before-chain also lists `next-mon summary while the opponent battler
    is tracked`, `summary hidden without the summary unit directly before it` and `send-out without the summary unit directly
    before it`.
  - Those units only fire because the host was already unknown after the fade. Once the fade is planned the host stays known and
    they never fire, so the 9 are a predictor artefact, not a miss.

## (1) Trigger condition (source, pokeemerald `../../vendor/pokeemerald`)

1. **`Cmd_datahpupdate`** (`src/battle_script_commands.c:1844`, the Substitute branch ~:1865-1891). The target has
   `STATUS2_SUBSTITUTE`, `substituteHP != 0` and no `HITMARKER_IGNORE_SUBSTITUTE`, so the damage goes to the doll.
   - Damage ≥ substituteHP sets substituteHP to 0. Then `gBattlescriptCurrInstr += 2; BattleScriptPushCursor();
     gBattlescriptCurrInstr = BattleScript_SubstituteFade` (:1885-1889).
   - Measured: the holder's HP is unchanged on every instance (e.g. 129 → 129). A substitute-breaking hit can never KO in the
     same hit, because the excess damage is dropped (:1876-1880).
2. **`BattleScript_SubstituteFade`** (`data/battle_scripts_1.s:4257-4260`): `playanimation BS_TARGET, B_ANIM_SUBSTITUTE_FADE`;
   `printstring STRINGID_PKMNSUBSTITUTEFADED`; `return`.
3. **`Cmd_playanimation`** (`:4004-4018`) emits SUBSTITUTE_FADE **unconditionally**: the STATS_CHANGE / SNATCH_MOVE /
   SUBSTITUTE_FADE branch comes before the `HITMARKER_NO_ANIMATIONS` test. So it plays under Battle Scene OFF too (measured).
   `Cmd_playanimation_var` is the same (:4053-4060).
4. **Controller** (`PlayerHandleBattleAnimation`, `src/battle_controller_player.c:3066`; the opponent's is the same) →
   `TryHandleLaunchBattleTableAnimation` (`src/battle_gfx_sfx_util.c:458-490`). SUBSTITUTE_FADE is exempt from the
   behind-substitute skip (`ShouldAnimBeDoneRegardlessOfSubstitute`, :507).
   - **Source-only branch:** if behindSubstitute is set and the battler sprite is **invisible**, the script does not run (:472-479:
     `LoadBattleMonGfxAndAnimate` + `ClearBehindSubstituteBit`, no sprite created). That branch also has no allocation. Not
     staged: it needs a hit on a hidden doll holder.
5. **Every path is the `datahpupdate` of a damaging hit.** That includes `BattleScript_HitFromAtkAnimation` and the multi-hit
   loop's `datahpupdate`; the stagings use the former. The stall before it is `Cmd_healthbarupdate` (:1807-1821): it prints
   `STRINGID_SUBSTITUTEDAMAGED` for a doll target, and `sText_SubstituteDamaged` (`src/battle_message.c:183`) ends in `\p`.
6. **Later in the turn:** `MOVEEND_SUBSTITUTE` (`:4381-4386`) clears STATUS2_SUBSTITUTE. It is measured still set during the fade.
   `AnimTask_SubstituteFadeToInvisible` (`src/battle_anim_throw.c:2171-2203`) clears behindSubstitute (measured 1 / 2 at launch,
   0 after).

The script is `General_SubstituteFade` (`data/battle_anim_scripts.s:10326-10337`): `monbg`, `AnimTask_SubstituteFadeToInvisible`,
two `AnimTask_BlendBattleAnimPal` and `AnimTask_SwapMonSpriteToFromSubstitute`. It has no `createsprite` and no task that creates a
sprite. That matches the empty plan.

Per-instance timing (`units.json` `fadeTriggers`):
- datahpupdate wait (the `\p` message): 467..738 frames, depending on when the next B press lands;
- datahpupdate → script active: 8 frames;
- script active: 103 frames for a player holder, 101 for an opponent holder (prep37 measured the same: 103 / 101);
- sAnimMoveIndex is 0 during the fade.

## (2) Staging (`prep64Probes.py`, `prep64Probe.py`)

| job | scene | holder (side) | breaker | lab seed | fades | substituteHP before |
| --- | --- | --- | --- | --- | --- | --- |
| `ply-persian-on` / `-off` | ON / OFF | PERSIAN 53 (player) | SLOWBRO Tackle | 305419897 | 1 / 1 | 26 |
| `ply-golbat-on` / `-off` | ON / OFF | GOLBAT 42 (player) | SLOWBRO Tackle | 305419897 | 1 / 1 | 29 |
| `opp-persian-on` / `-off` | ON / OFF | PERSIAN 53 (opponent) | SLOWBRO Tackle | 305419897 | 1 / 1 | 26 |
| `opp-golbat-on` / `-off` | ON / OFF | GOLBAT 42 (opponent, all Substitute) | SLOWBRO Tackle | 305419897 | 2 / 2 | 13, 11 |
| `s51b-ply-169` | ON | CROBAT 169 (player) | DRAGONITE Outrage | 305420202 | 1 | 40 |
| `s51-ply-169` (plans51 replica) | ON | CROBAT 169 (player) | DRAGONITE Outrage | 305420202 | 0 (stalled) | 40 (never applied) |

- Bases: prep37's `tools/battle-lab/prep37-*.json` (four B presses after every turn) and plans51's Outrage scenario. Variants are
  written to `<out>/scenarios/`; the scene is set by `profile`.
- `prep64Probe.py` keeps spriteOrderEventProbe.py's `rows` format unchanged. It adds a `state` row on every change of:
  - the battle-script cursor (`gBattlescriptCurrInstr` → `BattleScript_*` label + offset);
  - gBattleMons[0/1].hp;
  - gDisableStructs[0/1].substituteHP;
  - the STATUS2_SUBSTITUTE / behindSubstitute bits;
  - gAnimScriptActive, sAnimMoveIndex and the anim-script label;
  - gBattleControllerExecFlags, gBattleCommunication[MSG_DISPLAY] and gBattleAnimAttacker.

## (3) Evidence

- `check.json` (`prep64Check.ts`: plans51Check's `checkUnit` unchanged, plus a hand-off check and a next-consumer check):
  - `general SUBSTITUTE_FADE` plan `""`: 11 / 11 exact, hand-offs 11 / 11;
  - sides covered: `battle-scene-on:player`, `battle-scene-on:opponent`, `battle-scene-off:player`, `battle-scene-off:opponent`;
  - next consumer bodies 6 / 6 exact on rows 16 / 9.
- `netzero.json` (`prep64NetZero.py`: aud56Extract's rule; `prep64NetZeroProbe.py` is aud56NetZeroProbe.py with the profile taken
  from argv):
  - verdict NET-ZERO for both profiles;
  - known-entry instances player / opponent: 3 / 3 for Scene ON, 2 / 3 for Scene OFF;
  - created 0 on every instance, no late owners.
- `units.json` (`prep64Extract.py`): every unit of every job and the per-fade trigger context.

## (4) Patch shape (temporary; `fixtures/prep64/prep64-temp-src.diff`, reverted before every commit)

- `tools/integration/fixtures/prep64/plan-rows.json` (new, committed): rows-v1, written by `prep64PlanRows.py` from `check.json`.
  It holds anim `General:B_ANIM_SUBSTITUTE_FADE` = EXACT-PLAN with plan `[]`, tier confirmed. The script asserts exact == instances
  == hand-offs and both holder sides.
- `tools/integration/spriteOrderProductionTable.ts:160`: append `fixture("prep64/plan-rows.json")` after prep61, and add a header
  comment line.
- Regenerated `src/engine/spriteOrderProductionPlans.ts`: one line `SUBSTITUTE_FADE: 9,` in `SPRITE_ORDER_PRODUCTION_ANIMS`.
  Index 9 is the existing empty plan, already used by FUTURE_SIGHT_HIT and STATUS_PSN. No plan was added and no index moved.
- `src/engine/liveMoveSpriteAllocator.ts:102-106`: `"SUBSTITUTE_FADE"` added to `LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS`,
  and the doc comment (:90-101) moves it out of the unaudited list.
  - Optional on this census (the split run gains the same without it), but source and ROM evidence back it, and it removes a
    fail-closed point.
- `fixtures/prep64/prep64-temp-src-plan-only.diff`: the plan row without the allocator entry (the split measurement).
- No host, provider, transform, seam or kernel code changes: the order host already emits `general-animation SUBSTITUTE_FADE` and
  looks it up by name (`spriteOrderEventTransform.ts:454-460`).

**Tests a fold must change.** With the full patch these 6 fail; each pins the old fail-closed / no-row state:

- `tests/aud56GeneralAnimationAllocator.test.ts`:
  - `:24` `UNAUDITED_IDS`: drop SUBSTITUTE_FADE;
  - `:39` "the set is exactly the receipt's NET-ZERO units": also read `fixtures/prep64/netzero.json`;
  - `:60` "every kernel-emitted animation id is classified";
  - `:130` the crossed / trailing SUBSTITUTE_FADE fail-closed cases: move SUBSTITUTE_FADE to the "stays known" list.
- `tests/spriteOrderEventTransform.test.ts:113`, "refuses everything the evidence does not model": remove the SUBSTITUTE_FADE
  event; it now resolves to the empty plan.
- `tests/spriteOrderPlans51.test.ts:111-123`, "not landed … SUBSTITUTE_FADE never reached": keep the plans51 sf-* record but drop
  `expect(SPRITE_ORDER_PRODUCTION_ANIMS.SUBSTITUTE_FADE).toBeUndefined()`. Point it at prep64's receipts instead.

A fold should **add** `tests/spriteOrderPrep64.test.ts` covering:
- `check.json` 11 / 11, both sides × both scenes, all A == B;
- `plan-rows.json` regenerates from `check.json`;
- `SPRITE_ORDER_PRODUCTION_ANIMS.SUBSTITUTE_FADE` decodes to the empty plan;
- an order-host replay through the fade keeps the free order;
- the allocator set membership is pinned to `netzero.json`.

These 5 test files pass: `spriteOrderProvider`, `substituteFadePresentation`, and the remaining cases of the 3 above.

## Caveats

- The invisible-holder branch (`battle_gfx_sfx_util.c:472-479`) is source-only. It has no allocation either, but the kernel event
  still fires there.
- Only seeds 0..299 were measured. The 0..999 figure in the brief (10,630 frames / 49 commands) was not re-measured.
- Scene OFF under the kernel: ISSUES #153 (the kernel skips the Substitute body under Scene OFF) does not affect this plan. Body
  164's row is the empty plan, and the fade plays in both scenes on the ROM.

## Reproduce

    # from workspace/ of a clean checkout; OUT / REC fresh directories (scripts never rm)
    OUT=<scratch> REC=<receipts> sh tools/integration/prep64Run.sh                 # probes ~30 s + 3 census runs ~8 min
    OUT=<scratch> REC=<receipts> SKIP_CENSUS=1 sh tools/integration/prep64Run.sh   # probes + receipts only
    # prints same / DIFF per receipt against tools/integration/fixtures/prep64/ (the two .diff files are copied, and the census
    # scripts check they regenerate byte-identically)

Scripts: `prep64Probe.py`, `prep64Probes.py` (`--netzero`), `prep64NetZeroProbe.py`, `prep64Extract.py`, `prep64NetZero.py`,
`prep64Check.ts`, `prep64PlanRows.py`, `prep64Census.sh`, `prep64CensusPlanOnly.sh`, `prep64Run.sh`.
