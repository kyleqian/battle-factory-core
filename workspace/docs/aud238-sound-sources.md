# aud238 sound-source table

Data-only artifact for S11 audio step 2. Regenerate with `npm run extract:audio-sound-sources`
(needs `reference/pokeemerald`); `tests/audioSoundSources.test.ts` pins the JSON and re-runs the
extractor to prove byte-for-byte reproduction. Nothing in `src/` imports the JSON yet.

Output: `src/data/gen/audio-sound-sources.json` (schema `audio-sound-sources/v1`, ~559 KB, one row per line).

## Schema

| key | contents |
| --- | --- |
| `generatedFrom` | extractor path, reference repo + commit, 78 input files with 16-hex sha256 prefixes |
| `counts` | per-section totals (all pinned by the test) |
| `animScripts.soundOps` | one row per playsewithpan / loopsewithpan / waitplaysewithpan / setpan / panse*: `n`, `op`, `label`, `k` (op order in label), `line`, `song`, `songId`, `args` (as written), `values` (resolved ints), `entries` (indices into `entries`) |
| `animScripts.otherSoundOps` | `playse` (2) and `createsoundtask` (8) with the song constants they name |
| `animScripts.labels` | object keyed by label: `line`, optional `aliasOf`, `flow` (sound ops and call/goto/jump*/choosetwoturnanim items, in order) |
| `animScripts.entries` | gBattleAnims_Moves/StatusConditions/General/Special rows: `table`, `index`, `id`, `label`, `body`, `reach` (reachable labels), `ops` (reachable soundOps `n`), `branchy`, `unreachable` |
| `cAnimSites.rows` | the 59 PlaySE/PlayCry* sites in `src/battle_anim_*.c`: `file`, `line`, `fn`, `call`, `kind`, `args`, plus `song`, `songId`, `pan`, `panValue`, `ctx` where applicable |
| `sites.rows` | 378 call sites in battle/controller/menu/field/ball/sound files with the same fields plus `kind` and `family` |
| `sites.battleScriptUses` | battle-script ops effectivenesssound / playse / playfaintcry / fanfare / waitcry in `data/battle_scripts_1.s` |
| `battleBgm` | `GetBattleBGM` flag branches, trainer-class switch, default song, `startSites`, and the Factory cross-reference (`brain`, `songs`, `byFacilityClass`) |
| `mapMusic` | Factory map `music`/`musicId` and map-script playse/playfanfare/wait ops |
| `songLoops` | per referenced song: tracks, `loops`, `loopStartTick`, `loopEndTick`, `totalTicks`, `tempoBpm` (24 ticks per quarter; TEMPO x 2 = BPM) |

## Reconciliation with docs/s11-audio-design.md

| design | extracted | note |
| --- | --- | --- |
| 1042 commands: 873/97/48/2/22 | 1042: playsewithpan 873, loopsewithpan 97, waitplaysewithpan 48, setpan 2, panse* 22 (panse 20 + adjustall 1 + adjustnone 1) | exact |
| 123 distinct ids | 129 distinct song ids over all 1040 song-bearing commands (setpan has none) | not reproducible exactly; 122 over playsewithpan/loopsewithpan/waitplaysewithpan only; 132 counting `playse` and `createsoundtask` song args too |
| 59 C-side sites | 59 | exact (7 in `battle_anim.c`) |
| 9 VM handler lines in battle_anim.c | 7 | lines 1366 and 1446 are `SE12PanpotControl`, not PlaySE-family; they are listed under `cAnimSites.otherSoundCalls` |
| ~36 SE_SELECT in controller_player | 32 SELECT among 48 sites | counted from source |
| per-file menu counts | factory_screen 24 SELECT; summary 12 SELECT + 2 FAILURE; party_menu 56 SELECT + 8 FAILURE; menu 32; menu_helpers 6; list_menu 1 | match |

Other findings: the Moves table has 356 entries, 355 reachable (the `Move_COUNT` entry is flagged
`unreachable`); all 300 Factory trainers fall through `GetBattleBGM` to `MUS_VS_TRAINER` (476) and
only the Brain (`TRAINER_NOLAND`) reaches `MUS_VS_FRONTIER_BRAIN` (471); `MUS_B_FACTORY` (469)
loops tick 168 -> 3720.
