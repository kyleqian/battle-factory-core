# ISSUES #66(a) oracle receipt — capped-stat banner text

## Scenario

`tools/battle-lab/swords-dance-cap-wontincrease-off.json` (mechanicLab,
`overrides.parties`, Battle Scene OFF): player ONIX knows SWORDS DANCE
(move 14, `EFFECT_ATTACK_UP_2`, `MOVE_TARGET_USER`) + SPLASH filler; all
four opponent RATTATA moveslots are SPLASH (move 150) so the Factory AI has
one legal choice every turn. Four turns select SWORDS DANCE (moveslot 0,
self-target) back to back; the trainer always answers with SPLASH. Each
turn's command-menu-open + move-confirm + ~700-frame resolution window was
tuned empirically against the running oracle (`bin/oracle lab`) by watching
`state.battlers.player.statStages[1]` (Attack stage) and
`state.engine.playerControllerCommand` cross turn boundaries before
settling on the committed trace.

## Result: Attack stage progression (`state.battlers.player.statStages[1]`)

| frame | Attack stage | PP | note |
| --- | --- | --- | --- |
| 0 | 6 (neutral) | 30 | pre-battle |
| 230 | 8 | 29 | turn 1 SWORDS DANCE resolved (+2) |
| 724 | 8 | 29 | turn 1 fully settled |
| 1448 | 10 | 28 | turn 2 resolved (+2) |
| 2172 | 12 (MAX_STAT_STAGE) | 27 | turn 3 resolved (+2), now capped |
| 2298-2352 | 12 (unchanged) | 26 | turn 4: PP still spent, stage holds |
| 2896 | 12 (unchanged) | 26 | turn 4 fully settled |

Turn 4's Attack stage holds at 12 despite PP being spent — the real ROM
takes the `STAT_CHANGE_DIDNT_WORK`/`B_MSG_STAT_WONT_CHANGE` path, matching
`battleScriptStatBuffs.ts`'s `atBound` handling exactly (kernel parity
confirmed by frame, not just by unit test).

## Banner text (the reachable-crash fix)

Frame 2298 (`tools/compare/fixtures/issue66a-swords-dance-cap/frame-02298-statswontincrease.png`,
sha256 `36c268121907f0d6...` per the committed `manifest.json`) shows the
`STRINGID_STATSWONTINCREASE` banner:

```
ONIX's ATTACK
won't go higher!
```

This matches `reference/pokeemerald/src/battle_message.c:110`
(`sText_StatsWontIncrease[] = _("{B_ATK_NAME_WITH_PREFIX}'s {B_BUFF1}\nwon't go higher!")`)
resolved with `B_ATK_NAME_WITH_PREFIX` = ONIX (player side, no prefix) and
`B_BUFF1` = `gStatNamesTable[STAT_ATK]` = `"ATTACK"`.

## Secondary finding: `{B_BUFF1}` case, not scoped to fix here

Frame 230 (`frame-00230-attackersstatrose.png`) — the *uncapped* turn-1 rise,
`STRINGID_ATTACKERSSTATROSE` — shows:

```
ONIX's ATTACK
sharply rose!
```

**"ATTACK" is capitalized in both messages.** The real source for
`{B_BUFF1}` in every stat-change message is `ChangeStatBuffs`'s
`PREPARE_STAT_BUFFER(gBattleTextBuff1, statId)`
(`reference/pokeemerald/src/battle_script_commands.c:6958`), which copies
`gStatNamesTable` (`battle_message.c:425-443`):

```c
static const u8 sText_Attack2[] = _("ATTACK");
static const u8 sText_Defense2[] = _("DEFENSE");
static const u8 sText_Speed[] = _("SPEED");
static const u8 sText_SpAtk2[] = _("SP. ATK");
static const u8 sText_SpDef2[] = _("SP. DEF");
static const u8 sText_Accuracy[] = _("accuracy");
static const u8 sText_Evasiveness[] = _("evasiveness");
```

This is **not** the engine's own `lastStatChange.stat` field (`"attack"`,
`"defense"`, ... always lowercase — an internal enum-shaped string, not
display text). The `STRINGID_STATSWONTINCREASE`/`STRINGID_STATSWONTDECREASE`
branch added for #66(a) uses a small `STAT_DISPLAY_NAME` table in
`battleResolutionPresentation.ts` sourced from `gStatNamesTable` instead of
`lastStatChange.stat` directly, so it renders correctly ("ATTACK", not
"attack").

**The pre-existing `STRINGID_ATTACKERSSTATROSE`/`FELL` and
`STRINGID_DEFENDERSSTATROSE`/`FELL` branches (baseline + `c7461398`/#65)
still resolve `B_BUFF1` from `lastStatChange.stat` directly** — so today
they render `"ONIX's attack\nsharply rose!"` (lowercase) instead of the
oracle-confirmed `"ONIX's ATTACK\nsharply rose!"`. This frame (230) is
oracle evidence of that mismatch. Out of scope for this step (ISSUES #66(a)
only asked for the two missing WONT-INCREASE/DECREASE branches); flagging
for the supervisor to open as a new ISSUES.md entry.

## Reproduce

```sh
bin/oracle lab tools/battle-lab/swords-dance-cap-wontincrease-off.json -o /tmp/out
```
