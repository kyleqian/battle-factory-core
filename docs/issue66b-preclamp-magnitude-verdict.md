# ISSUES #66(b) probe verdict — CONFIRMED, fix deferred (out-of-scope files)

## Discriminating scenario

`tools/battle-lab/meditate-preclamp-magnitude-probe.json` (mechanicLab,
`overrides.parties`, Battle Scene OFF): player ONIX knows MEDITATE (move 96,
`EFFECT_ATTACK_UP`, +1 Attack, self-target) and SWORDS DANCE (move 14,
`EFFECT_ATTACK_UP_2`, +2 Attack, self-target); opponent RATTATA has SPLASH
in all four moveslots (one legal AI choice every turn). Five turns select
MEDITATE (moveslot 0), raising Attack from neutral stage 6 to stage 11
(`+5`, one below `MAX_STAT_STAGE`=12). The sixth turn navigates the FIGHT
move-grid cursor one step right (`RIGHT`) to moveslot 1 and selects SWORDS
DANCE, whose **requested** magnitude is 2, but whose **post-clamp** delta is
only 1 (11 -> 12, `MAX_STAT_STAGE`).

Turn boundaries (`state.battlers.player.statStages[1]`, confirmed by the
committed `manifest.json`): 6 -> 7 -> 8 -> 9 -> 10 -> 11 (frames 0, 724,
1448, 2172, 2896, 3620), then 11 -> 12 on turn 6 (frame 3900+, PP index 1
drops 30 -> 29).

## Result: real ROM prints "sharply rose!" for a post-clamp delta of 1

Frame 3900 (`tools/compare/fixtures/issue66b-preclamp-magnitude-probe/frame-03900-sharply-rose-postclamp1.png`,
sha256 `c9524d1a...` per the committed manifest):

```
ONIX's ATTACK
sharply rose!
```

Attack only moved from stage 11 to stage 12 (a delta of 1), yet the real
game says **"sharply rose!"** — the magnitude text is driven by SWORDS
DANCE's own requested pre-clamp magnitude (2), not the actual post-clamp
stage delta (1). This directly confirms the suspicion recorded in ISSUES
#66(b) and matches `reference/pokeemerald/src/battle_script_commands.c`'s
`ChangeStatBuffs`: the `statValue == 2` check that selects
`STRINGID_STATSHARPLY` (:7044 increase-branch / :7067-equivalent
decrease-branch wording) runs on the **pre-clamp** local `statValue`,
*before* `gBattleMons[gActiveBattler].statStages[statId] += statValue` and
its subsequent `MIN_STAT_STAGE`/`MAX_STAT_STAGE` clamp.

`battleResolutionPresentation.ts`'s `STRINGID_ATTACKERSSTATROSE`/
`STRINGID_DEFENDERSSTATROSE`/`FELL` branches instead compute
`amount = Math.abs(lastStatChange.from - lastStatChange.to)` — the
**post-clamp** delta (`11` -> `12` = `1`) — so the engine would print plain
"rose!" here, not "sharply rose!". Confirmed engine/reference mismatch.

## Why the fix is not applied in this step

The `stat-stage-change` semantic event
(`src/engine/battleScriptEvents.ts:205-210`) carries only
`{ battler, stat, from, to }` — no pre-clamp requested magnitude. The one
place that value exists is `changeStatBuffs`'s local `magnitude: 1 | 2`
input (`src/engine/battleScriptStatBuffs.ts`), and it is never attached to
the emitted event. A correct fix needs a new field on that event (e.g.
`requestedMagnitude: 1 | 2`) set at emission in `battleScriptStatBuffs.ts`,
then consumed in `battleResolutionPresentation.ts`'s two ROSE/FELL branches
in place of the post-clamp `amount` calculation.

This step's authorized file list is `src/engine/battleResolutionPresentation.ts`
plus new tests/docs/fixtures only — it does not include
`battleScriptEvents.ts` or `battleScriptStatBuffs.ts` (both explicitly
"read-only expected" / out of the "files you may touch" list for this side
lane). Per the step brief's own fallback ("if the probe is impractical or
ambiguous within your cap: commit the probe trace + captures + a short
verdict note ... and leave the code untouched"), this step stops here:
**verdict CONFIRMED, fix deferred** to a follow-up step with the necessary
file scope (adding `requestedMagnitude` to the `stat-stage-change` event and
switching both ATTACKER/DEFENDER ROSE/FELL branches' `B_BUFF2` selection to
it, pinned with a Tier-1 test asserting the stage-11-then-+2 case).

## Reproduce

```sh
bin/oracle lab tools/battle-lab/meditate-preclamp-magnitude-probe.json -o /tmp/out
```
