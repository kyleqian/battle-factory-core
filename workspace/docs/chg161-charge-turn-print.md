# chg161 (main/ts lane, ISSUES #167 (d)): the two-turn charge-turn EMPTYSTRING3 print, per scene

Presentation timing only (no rules / RNG change). Base `0af818603`; production change `46d8198d8`, pins `c1e60173f`.

## 1. Results first

| check | result |
|---|---|
| ROM windows (Dig / Razor Wind / Solar Beam, player PRIMEAPE (faster) vs SNORLAX Tackle, off108's committed scenarios, both scenes) | `tools/integration/chg161Run.sh`: 12 fresh direct-mGBA jobs, **6 / 6 r1 == r2 == off108's `probe-sha256.json`**, so off108's `receipts/rom-r1.json` rows apply |
| ROM rows (rel = the row the box clears = off108's G + 1) | all 6: printstring runs on rel -1, the box clears on **rel 0**, ppreduce runs on rel 1 (the script reaches attackanimation: off108's G + 2), gAnimScriptActive rises on **rel 4** (ON). Charge print's first glyph: OFF **42** (3 / 3); ON **206** (Dig), **57** (Razor Wind), **119** (Solar Beam) |
| Production before (box = the 24-frame message floor) | charge glyph OFF **+24** (3 / 3), ON **+16 / +15 / +16** |
| Production after (`tools/integration/chg161Anchors.ts`) | OFF box 1 + pause 41: **0 / 0 / 0**. ON box 8: **0 / -1 / 0** (Razor Wind: its live adapter is 48 frames, the ROM's waitanimation run 49) |
| Census 0..999, both scenes (`sub157Census.sh`) | **the same 252 battles** changed frames in both scenes, **639 charge turns**: ON -16 each (-10,224), OFF -24 each (-15,336); every per-battle delta is a multiple, per-battle counts equal across scenes. ON: command keys identical, live 27,084 / 27,261 unchanged, `battleDigestExcludingFrames` identical outside stalled tails (shard 7: budget-stalled seed 796 now stops at next-command-handoff, same 312 turns). OFF: `battleDigestExcludingFrames` identical 10 / 10; commands 28,047 -> 28,048 = budget-stalled battle 881's tail |
| `compare:differential` fight-submenu / battle1-postwin-next-prompt / presentation-rng-playable-live-bodies-seeded-on vs `0af818603` | **PASS, 641 / 641 byte-identical** (no charge turn in those traces) |

Receipt: `tools/integration/fixtures/chg161/receipt.json`. Pins: `tests/chg161ChargeTurnPrint.test.ts`.

## 2. What changed (`battleResolutionPresentation.ts`)

`chargeTurnEmptyBoxTiming`: the EMPTYSTRING3 print whose source label is `BattleScriptFirstChargingTurn`. That script is shared by
every two-turn move (Razor Wind, Solar Beam, Skull Bash, Sky Attack, and Dig / Fly / Dive / Bounce via
`BattleScript_FirstTurnSemiInvulnerable`), so nothing is keyed per move.
The shape is: box, optional PP data, the attack receipt, then a message. Any other shape returns null and keeps the 24-frame floor.

- **Scene OFF** (`SCENE_OFF_ATTACK_PAUSE` next): **1 frame**, the row the box clears. The off108 pause counts it
  (`sceneOffNoHitPauseFrames(..., openerFrames)`). A USEDMOVE opener ends on G, but this box starts on G + 1, so P = 42 - 1 = 41.
- **Scene ON** (`MOVE_ANIMATION` next): **one frame per interpreter execution from the box to the charge print** (Δ = 8 here). The
  attackanimation execution's own rows are the move-animation command, which equals the ROM's waitanimation run on Dig and Solar
  Beam. Production has no command for the 7 rows between waitanimation's release and the charge glyph, so the box carries them.

This is the fpp150 rule: the box lasts the interpreter rows to the script's next presented event. Here that event is the charge print,
because the attack command presents its own rows.

## 3. Remainder (recorded in ISSUES #167)

- **ON animation phase.** Under idle98's convention, the move-animation command's row 0 is rel 1 (pre 3 rows, then the gAnimScriptActive
  rise on rel 4). Production now starts it on rel 8, which is **7 rows late**: the box carries the post-waitanimation rows (Δ(N) -
  Δ(attack) + 1). Before this step it was 23 late. An exact phase needs a presented post-animation hold after the live command,
  ahead of the charge print. That would be a new command or hold kind on every ON no-hit body, so it is out of this step's scope.
- **The action after the charge message.** The foe's "used" first glyph is early in production: **-10** (Dig) and **-13 .. -14** (Razor Wind,
  Solar Beam), both scenes. The cause is general, not charge-specific. The ROM spends 13-15 rows from the held print's waitmessage release to the next
  action's first glyph (MoveEnd, the action dispatch, attackcanceler / accuracycheck / attackstring), and production presents 2 (the
  MoveEnd sprite-visibility receipts). The Sand-Attack control (off108 OFF, no charge turn) is **-12** on the same edge. The old
  24-frame box hid this edge on charge turns (+2 .. +14). Same family as #167 (a)'s next "used" print.
- Not staged: opponent-side charge turns, Fly / Dive / Bounce (same script), and Solar Beam in sun (no charge turn).
  Multi-hit / Triple Kick / HitsAllWithUndergroundBonus EMPTYSTRING3 prints are unchanged.

## 4. Reproduce

```sh
sh tools/integration/chg161Run.sh <fresh-dir>                                     # 6 / 6 SAME (r1 == r2 == off108)
node --experimental-strip-types --no-warnings tools/integration/chg161Anchors.ts --rows
sh tools/integration/sub157Census.sh <fresh> 0af818603 on|off; sh tools/integration/sub157Census.sh <fresh> 46d8198d8 on|off
npm run compare:differential -- fight-submenu battle1-postwin-next-prompt presentation-rng-playable-live-bodies-seeded-on --base 0af818603
npx vitest run tests/chg161ChargeTurnPrint.test.ts tests/olnd113SceneOffPauses.test.ts
```
