# rank1m: how much of the census each next-run candidate touches (count only, nothing under `src/` / `tests/` changed)

Step rank1m (side lane, `worker/side-20261119-042541`). Question: for ISSUES #223 (`docs/subp1m-battle-text-pause.md`), pau4m (`docs/pau1-script-pauses.md`), lead1m B1 (`docs/lead1m-rule-lead-design.md`) and hpf4m T1 (`docs/hpd1-hp-hold.md`), over census seeds 0..999, how many battles each touches and how many frames each would change per battle. `npm test` not run (read / count only).

## Ranking (one table)

Population: 1,000 census battles (seed i, streak `i * 11 % 49`, rentals 0..2, least-used legal move; the lsd194 driver), Scene OFF unless noted. Average battle = 12,712 frames OFF / 17,814 ON (driver frames). "Total frames" = battles touched x frames per touched battle = how far the census total moves.

| rank | item | scenes | battles touched / 1000 | frames per touched battle | total frames (per 1000 battles) | direction | confidence |
|---|---|---|---|---|---|---|---|
| 1 | **pau4m** switch-in Intimidate / Trace prints (lead 101 battles + mid-battle 168; 251 distinct) | both | **251** | 126 (lead 230, mid 50) | **31,518** (lead 23,202 + mid ~8,316) | longer | lead: ROM-measured block lengths; mid: derived (see 3) |
| 2 | **#223** `\p` / `\l` gates (union of all strings below) | both | **192** | 35 floor (instant A), ~96 at 30 frames of reaction per gate | **6,636** floor; 12,561 at 15 frames / gate; 18,486 at 30 frames / gate | longer, and a press is now required | floor: ROM-measured for 2 strings, modelled for the rest; the real cost is the player's reaction time, not countable |
| 3 | **lead1m B1** lead + `T` for 9 unaudited plain bodies | **ON only** | **393** | 17 (6 per command, 1,137 commands) | **6,822** (+6 each; up to 12,507 if every command is a +11 variant) | longer | rule measured by hpd8 (+6 / +8 / +11); census count here is exact |
| 4 | **hpf4m T1** end-of-turn tick `hp` floor 28 -> bar + 1 | both (OFF counted) | **38** (41 with unchanged ticks) | -29 | **-1,095** | shorter | ROM E per shape measured in hpf4m; count here is exact |

Reading the table: pau4m moves the total by about 31 frames a battle (0.25 % of an OFF battle) and is the only item that is both measured on the ROM and touches a quarter of the battles. #223 is small in frames and large in kind: after it lands every gated message stalls a driver that does not press A or B (395 gates in 192 battles), and the engine and the website's drivers both have to change. B1 is Scene ON only. T1 is the smallest and the only one that shortens battles.

Suggested order for the next run: pau4m (lead block first: 101 battles / 23.2k frames, the labs and app stages exist), then #223 (Substitute fade 111 rows and the Static scroll are the only gate-independent frames; the rest is behaviour), then B1 (largest of the two tail items and gated on B0), T1 last.

## 1. Method and caveats

- **The named population is not on disk.** `.integration/evidence/c1k/` is not in the main tree (the c1k worktree was removed with its gitignored evidence; only `aud263/census/{on,off}-d8e807b20` exist), and those rows carry commands but no message text and no entry events. I re-ran seeds 0..999 in both scenes with a new kept tool, `tools/integration/rank1mCensus.ts` (a copy of `lsd194Census.ts`: same seeds, same battle setup, same driver, sound collection off) that additionally records, per seed, every kernel message id, every presented command (type, message text, duration, hp bar rows, move id) and the two leads' species / ability. It runs in about 55 s per scene on 8 shards (`--seeds=A..B --scene=on|off --out=f.jsonl`). Raw output was in `/tmp/r1/` (scratch, not committed).
- **Consistency with the aud263 population:** seeds 796 and 995 end in `Error: frame budget` in both scenes, exactly as in aud263's OFF arm (so 998 completed battles; the two errored battles are included in the counts and are truncated). Kernel message-id sequences are identical ON vs OFF for the other 998 seeds, so the string counts below hold for both scenes. There is no `eventsDigest` in this run; the identity claim is on the message-id stream only.
- **Lead abilities** are read from `state.round.rules.playerKernelParty[0]` and `currentOpponent.rentalRecords[0].member` of the generated battle (the app's records). pau4m's own caveat applies: the ROM's opponent personality / ability slot can differ from the app's for the same set (aud243b), so opponent-side lead counts (33 Intimidate, 13 Trace) are the app's, not the ROM's. Player-side counts (46 / 13) are not affected. Lead = party slot 0 was spot-checked on seed 0 only (Grimer leads and uses Sludge Bomb first).
- Frame figures are the app's frames from the driver, not ROM frames; they are used as relative weights.

## 2. #223: every `\p` / `\l` string, occurrences, battles

Counts come from the kernel message events (identical to the presented message commands: the occurrence and battle numbers match both ways for every row). The 46 templates with `\p` / `\l` / `{PAUSE_UNTIL_PRESS}` in `battle-message-templates.json` were each looked up; only the rows below occur in the census (the rest are EXP / money / whiteout / catch / run / Safari / two-trainer strings, 0 hits). Already button-gated and excluded: target / attacker fainted (`TARGETFAINTED` 3,850 occurrences in 992 battles, `ATTACKERFAINTED` 482 in 365) and `PLAYERDEFEATEDTRAINER1` (432 in 432).

| string (gate) | ROM source | occurrences | battles | engine duration today (mean rows, printed length) | extra rows at an instant A | note |
|---|---|---|---|---|---|---|
| `SUBSTITUTEDAMAGED` (`\p` at end) | `Cmd_healthbarupdate` | 64 | 21 | 40.5 (41.5) | ~0 | ROM accept = print + 38, release at press + 3 = 41 (subp1m) |
| `PKMNSUBSTITUTEFADED` (`\p`) | `BattleScript_SubstituteFade` | 46 | 21 | 28.3 (29.3) | **+111** | the ROM plays a ~111-row fade before the print (subp1m, subfade lab); the app has no such rows in the message command |
| `PKMNWASDRAGGEDOUT` (`\p`) | `BattleScript_TrainerBattleForceOut` | 192 | 110 | 25.8 (26.5) | ~0 | A or B at 700 released at 703 (subp1m) |
| `PKMNCANTUSEMOVETAUNT` (`\p`) | `MoveUsedIs*` | 10 | 7 | 109.5 (46.5) | ~0 | duration already includes a 64-row hold |
| `PKMNMOVEISDISABLED` (`\p`) | `MoveUsedIs*` | 3 | 3 | 97.7 (34.7) | ~0 | same |
| `PKMNCANTUSEMOVETORMENT` / `...SEALED` (Torment / Imprison) (`\p`) | `MoveUsedIs*` | 0 | 0 | - | - | never printed in the census |
| `PKMNOBTAINEDXYOBTAINEDZ` (Trick, both items; mid-string `\p`) | item-swap | 26 | 16 | 124.8 (61.8) | ~0 | one mid-string gate |
| `PKMNWASPARALYZEDBY` (Static; mid-string `\l`) | `B_MSG_STATUSED_BY_ABILITY` | 51 | 44 | 129.7 (66.7) | **~+30 (unverified)** | subp1m: A at 600 released at 633 not 603, the scroll after the press is unexplained |
| `PREVENTEDFROMWORKING` (`\l`; ability blocks an Intimidate) | `BattleScript_IntimidatePrevented` | 2 | 2 | 132.5 (69.5) | ~0 | unaudited |
| `PKMNPREVENTSUSAGE` (`\l`; Damp / ability stops the move) | `battle_scripts_1.s:4074` | 1 | 1 | 56.0 (57.0) | ~0 | unaudited; duration has no 64-row hold |
| `PKMNSXPREVENTSYSZ` (`\l`) | ability prevention tables | 0 | 0 | - | - | unaudited, not in the census |
| **all of the above** | | **395 gates** | **192 distinct battles** | | | |

Model for the last column, and what it does not cover: the engine's automatic message already lasts about the typed length (`max(24, L - 1)`; the measured Substitute lab is 41 ROM rows against 40.5 here), so a driver that presses A at the first accepted moment adds about nothing. Only the Substitute fade (46 x 111 = 5,106) and the Static scroll (51 x 30 = 1,530, unverified) add rows by themselves: **6,636 frames, 6.6 per battle**. A human or a slower driver adds its reaction time per gate: 395 gates x 15 = 5,925 more, x 30 = 11,850 more (the 12,561 and 18,486 in the ranking). The 24-row floor equivalence was measured on the Substitute (`\p` at the end) and Roar strings only; the mid-string and `\l` rows are by analogy, not measured.

The three unaudited ability-blocking strings together are 3 occurrences in 3 battles in 1,000: not worth a lab of their own; they ride along with the Static / Intimidate-prevented work.

## 3. pau4m: Intimidate / Trace switch-in prints

**Lead (battle start; not presented at all today).** Leads by the app's records:

| | player lead | opponent lead | battles |
|---|---|---|---|
| Intimidate | 46 | 33 | **76** (3 with an Intimidate on both leads) |
| Trace | 13 | 13 | **26** (0 with both) |
| Intimidate + Trace in the same battle | | | 1 (seed 92) |
| any | | | **101** |

Intimidate blocks: 79 (76 battles, three of them two blocks). Trace blocks: 26. Frames from pau4m's ROM measurement (`docs/pau1-script-pauses.md` "pau4m": Intimidate 247, Trace 142, both about 386 = sum - 3): 79 x 247 + 26 x 142 - 3 = **23,202 frames = 23.2 per battle, 230 per touched battle**. Caveats: the second block of a two-Intimidate battle (3 battles) and `IntimidatePrevented` leads (2 battles: seeds 121 and 497, an Intimidate lead against a Clear Body lead) are unmeasured and counted at the Intimidate-block upper bound; opponent-side labs were not possible (pau4m caveat). Hyper Cutter / White Smoke leads face an Intimidate in 0 battles.

**Mid-battle switch-ins (presented, but without the script's pause).** Census messages: `PKMNCUTSATTACKWITH` 144 occurrences in 127 battles, `PKMNTRACED` 50 in 45, `PREVENTEDFROMWORKING` 2 in 2; **168 distinct battles**. The app does present these (a `stat` + `stats-change` 77 + message 112 for Intimidate, a message 102 for Trace, then `turn-end` 8), so what is missing is not the whole block. Comparing pau4m's ROM block against what the app presents: Intimidate ROM 239 to the loop end against 2 + 77 + 112 = 191 in the app, about **46 missing**; Trace ROM 142 against 102 + 8 = 110, about **32 missing** (the `pause SHORT`). 144 x 46 + 50 x 32 + 2 x 46 = **about 8,316 frames**. This is a derived estimate, not a ROM measurement of a mid-battle switch-in: pau1's item 3 says to probe these first.

Distinct battles touched by either: 101 + 168 - 18 overlap = **251**. Total 23,202 + 8,316 = **31,518 frames**.

## 4. lead1m B1 (Scene ON; Scene OFF is unchanged: the OFF move bodies are pauses)

B1's moves: Double Kick (hit 1), Icy Wind, Water Pulse, Facade, Mega Kick, Counter, Comet Punch (hit 1), Mega Drain, Doubleslap (hit 1). Move-body commands in the Scene ON census (27,107 move animations in 1,000 battles; first animation per `used` print for the three multi-hit moves):

| move | commands | battles |
|---|---|---|
| Icy Wind | 257 | 96 |
| Water Pulse | 222 | 88 |
| Facade | 202 | 77 |
| Double Kick | 142 | 69 |
| Mega Kick | 132 | 84 |
| Counter | 98 | 71 |
| Mega Drain | 51 | 25 |
| Doubleslap | 24 | 11 |
| Comet Punch | 9 | 6 |
| **B1** | **1,137** | **393** |

The design doc's 299 commands / 5.7 % of 5,245 in 200 battles extrapolates to about 1,495 in 1,000; the 1,137 here is the hit-1 count over the other 800 seeds as well, so the two are the same order and this table is the one to use. Frames: the doc's per-body shift is +6 (lead 5 + T 1), +8 or +11 by body shape, so **6,822 frames at +6 (6.8 per Scene ON battle, 17 per touched battle), at most 12,507 at +11**. B1 also shifts the sound clock ages by the lead, which is not a frame count and not counted here.

## 5. hpf4m T1 (end-of-turn status tick `hp`: `minimumFrames` 28 -> 0)

A tick is an `hp` command with `minimumFrames` 28 directly followed by its tick message. Counted over the OFF census (hpf4m measured ON = OFF per shape):

| shape | ticks | battles | ticks with bar < 28 rows | battles | frames |
|---|---|---|---|---|---|
| poison / toxic | 39 | 20 | 28 | 18 | -398 |
| burn | 15 | 7 | 15 | 7 | -269 |
| wrap-family tick (Wrap / Bind / Fire Spin / Whirlpool / Sand Tomb / Clamp) | 31 | 18 | 29 | 17 | -428 |
| Curse tick / Nightmare tick | 0 | 0 | 0 | 0 | 0 |
| **T1** | **85** | **41** | **72** | **38** | **-1,095** |

Frame change per tick = 28 - (bar rows + 1) for each of the 72 short bars (the app's `battleHealthBarAnimationFrames` from the real HP change), so **-1.1 per battle, -29 per touched battle**. Sandstorm / hail ticks (T3, a different rule) are 79 further short-bar ticks in 38 battles at -1,427 frames; not part of T1 and not counted above. Poison and burn ticks are fewer than the "hurt by" messages suggest because Leftovers heals (already `minimumFrames` 0 from hie4) sit next to them.

## 6. What this changes about the plan

1. pau4m first: it is the largest item by a factor of 5, both scenes, and its ROM numbers and app stages exist. Do the lead block (23.2k) before the mid-battle pause (8.3k, needs one mid-battle ROM probe first).
2. #223 second, and treat it as a behaviour change rather than a frame fix: 395 gates in 192 battles; the frame gain is only the Substitute fade (5,106) and the Static scroll (1,530). Every driver and the website must press A / B at these gates.
3. B1 is Scene ON only; T1 is a shortening of 1.1 frames a battle and can ride with anything.
4. Kept: `tools/integration/rank1mCensus.ts`. Nothing under `src/` / `tests/`, no oracle use, `PROGRESS.md` / `ISSUES.md` untouched.
