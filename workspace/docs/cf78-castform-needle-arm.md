# cf78: live bodies decline while Castform is in a weather form; Needle Arm 302 models its SortSprites tie (live audit 19's two DEFECTs)

## Results

- **Castform (DEFECT 1, ISSUES #143's open remainder).** While a displayed CASTFORM is in a weather form, every live body now declines
  to the scene-off fallback. The field art still draws the normal form only, so this is a fail-closed decline, not a pixel fix.
  Durations are unchanged.
  - **audit 19:** 599 windows, live 404 -> 360. The 44 live Castform windows are now fallback. The 4 Shock Wave fallbacks are
    unchanged, and the gate fires on none of the other 551 windows (`fixtures/cf78/audit19-windows.jsonl`).
  - **census 0..999** (base `c68111480` vs `9ef2534a0`): **54 commands / 9,587 live frames go live -> fallback.** They are exactly the
    commands drawn with a transformed Castform (battles 603, 643, 651, 950). After the fix, 0 live frames show a transformed Castform.
    0 other changes; the key sequence, frames per command and `battleDigestExcludingFrames` are identical. Live share goes from
    94.37 % / 98.18 % to **94.17 % / 97.94 %** (commands / frames).
- **Needle Arm 302 (DEFECT 2, latent).** Production now orders the tied pair the way the ROM does.
  - **audit 19's 44 needle windows:** **44 / 44 lends == ROM**. The 6 Water Pulse lends that differed now equal the ROM
    (`[3,11,10,12,...]`). The other 38 needle lines, and all 593 other lend lines, are byte-identical to audit 19's committed
    `lends.txt` (`fixtures/cf78/audit19-lends.txt`).
  - **census:** 0 changes. The census never reached a reversed start order.
- **Scene ON / OFF parity** (`cf78Parity.ts`). RNG, rules context (hitMarker bit 128 masked), boundary and facility state are equal at
  every action-menu arrival on two routes. In both, none of the Castform-transformed bodies is live:

  | battle | Castform form | turns | transformed bodies | live after (base) |
  |---|---|---|---|---|
  | 950 | hail | 20 | 19 | 0 (18) |
  | 603 | rain | 15 | 16 | 0 (13) |

- **Gates on `9ef2534a0`:**
  - related set: 199 files (every CASTFORM / 302 / 311 / spriteOrder test, plus the inventory and playable tests). Only the two
    plan pins failed, and both are updated (below).
  - typecheck; smoke 448.
  - full suite as two shards: **1,612 files / 13,245 tests, 0 failed**.
  - build.
  - differential **624 / 624 byte-identical** vs `c68111480`.
- **Revert experiments:**
  - with the gate removed, `tests/cf78CastformForm.test.ts` fails 2 of 6;
  - with the old 302 text, `tests/cf78NeedleArmTie.test.ts` fails 3 of 4.
- Receipt: `tools/integration/fixtures/cf78-live-receipt.json`. It has every census change with its reason, gate and frames.

## Castform rule

**State.** Per battler slot, production keeps a presentation-only copy of the ROM's `gBattleMonForms`:
- **Set** by every CASTFORM_CHANGE animation event. The value is the event's argument `& ~CASTFORM_SUBSTITUTE`. ROM:
  `battle_gfx_sfx_util.c:465` behind a Substitute, `:948` otherwise. A non-numeric argument counts as an unknown form, which also
  declines.
- **Kept** across switches and faints. The ROM array is per slot and only `ClearBattleMonForms` (`pokemon.c:6418`, at battle setup)
  clears it. So a CASTFORM that the slot shows later is drawn in that form (`battle_gfx_sfx_util.c:619 / :682`).
- **Reset** when a CASTFORM_CHANGE back to the normal form arrives, and at battle start (fresh boundaries).
- **Derived only** from the kernel's events. Rules, RNG and the queue never read it.

**Where it lives.**
- **Render view** (`battleResolutionPresentationRender.ts`): `liveCastformFormsAt` = the forms carried in at the resolution's start,
  then every earlier segment's events, then this segment's events strictly before the current command. `withLiveCastformForms` then
  puts `castformForm` on a displayed CASTFORM (species 385) whose slot form is not 0.
- **Carry between resolutions** (`factoryRoundBattleOrchestrator.ts`): each slot's boundary holds `liveCastformForm`. It is committed
  for every completed command by `liveCastformFormsThroughCommand`; a segment's last command also takes the segment's trailing events.
  The value is copied into the resolution's `liveCastformForms` when the resolution starts.
- **Gate** (`liveMoveAnimation.ts`): `liveCastformFormDeclines(field)`. It runs in `liveMoveAnimationPresentation`, right after the
  hidden-target gate, and in `liveSubstituteSwapView`.
- **Not gated: the Substitute fade.** It is shared with Scene OFF, so declining it would change OFF pixels. The census shows 0 live fade
  frames with a transformed Castform.
- **Census:** `liveShareCensusGates.ts` names the new decline: "CASTFORM shown in a weather form ...".

**Census tool.** `cf78LiveShareCensus.ts` is `hist73LiveShareCensus.ts` (`liveShareCensus.ts` + `--index-from`) plus a tool-local,
independent replica of the per-slot rule. With the replica, the base tree can be measured too.

## Needle Arm fix

**Why the plan was wrong.** Needle Arm's burst creates `n17` and `n19`, and they tie in `SortSprites`: ROM priority word 0x3ff and
equal y (`audit19NeedleFrames.py`). The ROM's stable insertion sort keeps their **start-order** relation. Plan 162 (`302:player` and
fold71's `302:opponent`) hard-coded `n19` first.

**The fix.** `fixtures/cf78/plan-overrides.json` rewrites plan 162 **in place**; every other plan index and line stays put.
- The final destroy group becomes FDERIVED: `…;D12,18,19,17,16,20,15,21,14/P1,2,3,3,4,5,6,7,8`.
- The rank words keep the stored order for every sprite except the pair. The pair shares rank 3, so the tracker orders it by creation
  window, then by F index at creation, which is the start order.
- From the entry-like starts, the result is identical to the old plan: every plans69 probe and 38 / 44 audit-19 windows (pinned).
- From a start with slot 10 ahead of slot 12, only the pair swaps.

**Generator.** `spriteOrderProductionTable.ts` gains the in-place `overrides` argument. It is guarded: every row that shares the index
must be overridden identically, and the new text must not duplicate another plan. The table is regenerated, a one-line change.

**Pins.** `spriteOrderEventTransform.test.ts` and `spriteOrderPlans69.test.ts` now assert that the production plan == the fixture / ROM
plan + this `pw`.

## Limits

- **The Castform pixels are still wrong.** The fallback draws the same normal-form field art, so the pixels are unchanged. The fix
  removes a wrong live claim, not wrong pixels. The art fix is #143 itself: per-form palette, front coords, elevation and back Y in
  the field view.
- **Transform is not modelled.** A Transform that copies a Castform form (`battle_gfx_sfx_util.c:1022`) is not modelled. No census body
  reaches it.
- **Geometry-keyed order plans** computed at a transformed Castform's displayed species still use the normal-form coordinates.
  - audit 19 measured 44 / 44 lends == ROM behind them.
  - Nothing after them is live while the Castform stays transformed.

## Rerun (from workspace/)

```
npx vitest run tests/cf78CastformForm.test.ts tests/cf78NeedleArmTie.test.ts
node --experimental-strip-types --no-warnings tools/integration/cf78Parity.ts --seed=950 --streak=13 --out=p950.json   # and --seed=603 --streak=18
node --experimental-strip-types --no-warnings tools/integration/cf78Audit19Windows.ts > windows.jsonl
for n in $(ls tools/integration/fixtures/audit-19/fixtures/*.json | sed 's/-c[0-9]*\.json$//' | sort -u | xargs -n 1 basename); do
  AUDIT19_LENDS_ONLY=1 node --experimental-strip-types --no-warnings tools/integration/audit19Check.ts tools/integration/fixtures/audit-19/fixtures "$n" /dev/null
done > lends.txt
# census: git archive of each tree (base c68111480 with tools/integration/cf78LiveShareCensus.ts copied in), 10 shards each:
node --experimental-strip-types --no-warnings tools/integration/cf78LiveShareCensus.ts --seeds=<a>..<a+99> --index-from=<a> --out=s<k>.json --commands=s<k>.jsonl
python3 tools/integration/cf78Receipt.py <base-dir> <final-dir> windows.jsonl lends.txt p950.json p603.json gates.json <commit> <src-tree> receipt.json
```
