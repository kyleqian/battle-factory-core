# Family-B Cluster-1 Battle Scene OFF evidence

This SIDE-lane checkpoint adds no interpreter, controller, renderer, census,
or production-engine code. It corroborates three family-B cases from
[`set-move-effect-family-b-notes.md` §4](set-move-effect-family-b-notes.md)
against the stock ROM under the `battle-scene-off` oracle profile.

## Common staging contract

All three `mechanicLab` scenarios build three complete legal Pokémon per side
before `CB2_InitBattle`. Every party member uses its single available Gen-3
ability slot. The active opponent is Shuckle (Sturdy) with four identical
Splash slots, so the Factory AI still makes the normal decision but every
legal slot reaches the same harmless script. Active speeds are strictly
ordered: Shuckle is 10, versus Porygon 54, Exeggcute 60, and Solrock 90.
There is no speed-tie `Random()` ambiguity. All six initial party checksums
are valid in every receipt.

Every relied-on frame belongs to a committed 25-frame capture grid. Each final
scenario was run twice from a fresh oracle snapshot; the complete
`manifest.json` files compare byte-for-byte.

## 1. Tri Attack / `MOVE_EFFECT_TRI_ATTACK`

[`mechanic-tri-attack-porygon-shuckle-off.json`](../tools/battle-lab/mechanic-tri-attack-porygon-shuckle-off.json)
uses dossier carrier `FRONTIER_MON_PORYGON_2` (set 273): Porygon with stock
Tri Attack/Psychic/Thunder Wave/Recover, Quiet nature, Cheri Berry, and its
single Trace ability. On entry Trace copies Shuckle's Sturdy; that ordinary
entry hook is why the public active-battler ability differs from the
persistent party record.

| Receipt field | SHA-256 / value |
| --- | --- |
| Scenario | `0d74ac40c68ec5c04dd7662b831485fa503d11853c17b57ea836b2dbb50524cd` |
| Full manifest, run 1 | `6ec3592ef25143f9661dd9da1f16d31a2793296b11b19d8a1f2daca7ce211f8f` |
| Full manifest, run 2 | `6ec3592ef25143f9661dd9da1f16d31a2793296b11b19d8a1f2daca7ce211f8f` |
| Capture grid | frames 0–2175 inclusive, step 25, 88 captures |

| Frame | Raw RGB888 framebuffer SHA-256 | RNG | Tri Attack PP | Shuckle HP | Active / party `status1` | Observed fact |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 0 | `a5677b7b9e33d3f5cd9d567096d940b504ddedf71508759d34e830d5739d44a2` | 919694434 | 10 | 127 | 0 / 0 | Status-free initial target |
| 200 | `d203c60db405a0f9dc129b4b4b1f37badc29d2f7941e1b1019c6a00b92fac8da` | 3421819359 | 9 | 116 | 0 / 0 | First use dealt 11 and did not proc |
| 1000 | `6957fc15c46305c3bd56aa8f080087f6e73067f84f10d9bd0f2f811b59474583` | 3278432283 | 8 | 105 | 64 / 64 | Second use produced Paralysis and synchronized the active and persistent target |
| 1425 | `9b0e60a75b732d64c845979bb8a8476a3e4cab1fa4d54172f2a1d56c91abf736` | 786441859 | 8 | 105 | 64 / 64 | Third, already-statused use has begun |
| 1625 | `58a5997b6540418ad906938c9778ca433b0626a4d5ad79fcccea1c930b0ac6b1` | 1630250804 | 7 | 95 | 64 / 64 | Third use spent PP and dealt 10; existing Paralysis remained unchanged |

The public receipt therefore observes exactly one selector result:
Paralysis (`status1 == 64`). It does **not** claim Burn or Freeze selector
coverage. Source establishes that `seteffectwithchance` draws once on every
visit, a successful status-free Tri Attack adds `Random() % 3 + 3`, and an
already-statused target skips that selector. The coarse manifest RNG snapshots
pin movement across each real turn, but do not isolate those individual draws
from accuracy, critical, damage, Factory AI, and end-turn draws.

## 2. Overheat / `MOVE_EFFECT_SP_ATK_TWO_DOWN`

[`mechanic-overheat-solrock-shuckle-off.json`](../tools/battle-lab/mechanic-overheat-solrock-shuckle-off.json)
uses dossier carrier `FRONTIER_MON_SOLROCK_2` (set 328) with its stock moves
and Hardy nature. The scenario deliberately replaces its rental White Herb
with `ITEM_NONE`, as prescribed by the dossier, so the durable stage writes
remain observable across consecutive uses.

| Receipt field | SHA-256 / value |
| --- | --- |
| Scenario | `52a221012297d4e9fc6d5db51b402e75b7939a85b9f8023745a20276a13c5d8d` |
| Full manifest, run 1 | `c4c0dfbacad779e67b027bb7ead7629456b375ad78d211f32dd1a8f92241ea3f` |
| Full manifest, run 2 | `c4c0dfbacad779e67b027bb7ead7629456b375ad78d211f32dd1a8f92241ea3f` |
| Capture grid | frames 0–1575 inclusive, step 25, 64 captures |

| Frame | Raw RGB888 framebuffer SHA-256 | RNG | Overheat PP | Shuckle HP | Solrock Sp. Atk stage | Observed fact |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 0 | `12d9981279b20dc071421e1bb6df58362434744496a52a15e0c95a82c0ee80ea` | 919694434 | 5 | 127 | 6 | Neutral initial state |
| 375 | `fea948f33ad07fc83383b14060ec0fad8be34aead06b7283253f0804ad289c84` | 3421819359 | 4 | 110 | 4 | First hit dealt 17 and its self-drop settled at −2 |
| 950 | `3c1227248116c36e7c64e6dd0ccce6ad725e2284898604a02c9cf3f19d9bf75d` | 3031698222 | 3 | 110 | 4 | Second PP spend precedes its HP update |
| 1175 | `f34a847f98433020690acdb87807627a93ac470ac56ddeffb29cde707065a73a` | 3031698222 | 3 | 101 | 2 | Second hit dealt 9 and applied another two-stage drop |
| 1400 | `eaa8e07d462c2c4366ea462719aef91acbc6288a7cbf7e8a33a614de61767308` | 3031698222 | 3 | 101 | 2 | Settled next-request state retains the write |

Unlike the dossier's conservative caveat, this oracle manifest version
directly exposes `statStages`; Sp. Atk is visibly `6 → 4 → 2`. The consecutive
damage deltas also fall `17 → 9` against the same untouched target. Both are
oracle observations. Source supplies the stronger causal contract:
`BattleScript_SAtkDown2` applies the user-directed, certain two-stage change,
and `MOVE_EFFECT_CERTAIN` bypasses the dispatch-chance draw. The receipt does
not attribute the larger RNG stream to that case; accuracy, critical, random
damage, AI, and turn processing remain live. It also does not stage the exact
rental's White Herb restoration branch.

## 3. AncientPower / `MOVE_EFFECT_ALL_STATS_UP`

[`mechanic-ancient-power-exeggcute-shuckle-off.json`](../tools/battle-lab/mechanic-ancient-power-exeggcute-shuckle-off.json)
uses dossier carrier `FRONTIER_MON_EXEGGCUTE` (set 112) with its stock
Confusion/AncientPower/Leech Seed/Light Screen moves, Naughty nature, Persim
Berry, and single Chlorophyll ability. Three PP Ups raise AncientPower from
5 to 8 PP only to permit a bounded repeat window. Seed 1 produces a real proc
on the second use, so this receipt is stronger than the allowed no-proc
checkpoint.

| Receipt field | SHA-256 / value |
| --- | --- |
| Scenario | `9511b1fd1f7cf01cb0f18d2fd02d2687b1515d34a4dc7758ab0a9e88d48a18e3` |
| Full manifest, run 1 | `19ed44ec3547511ef6efd9686728d96acd4842dc90f018f414b2a178962d01b4` |
| Full manifest, run 2 | `19ed44ec3547511ef6efd9686728d96acd4842dc90f018f414b2a178962d01b4` |
| Capture grid | frames 0–3175 inclusive, step 25, 128 captures |

The stage vector below is `[Attack, Defense, Speed, Sp. Attack, Sp. Defense]`;
accuracy and evasion remain neutral and are omitted.

| Frame | Raw RGB888 framebuffer SHA-256 | RNG | AncientPower PP | Shuckle HP | Combat stages | Observed fact |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 0 | `26a3fff1eaabb6961affa5031afd90e13f7881770ec09922994d437ff9ee3b8f` | 919694434 | 8 | 127 | 6/6/6/6/6 | Neutral initial state |
| 200 | `d3a44e1e22b717074a7984b0ec9f37608f9a325f55b09b1fa850b43dd7c92f93` | 3421819359 | 7 | 112 | 6/6/6/6/6 | First use dealt 15 and did not proc |
| 1300 | `9c462a55578c7c4161b1f0ea85d83da598e691ffa51ee80ab5e27d3ccb63cf94` | 530917129 | 6 | 97 | 6/6/6/6/6 | Second damage settled before the effect |
| 1375 | `2a08d865bf98d35b1f2ca0118f79c03282ede9b7256491bdcad80c6591702bb1` | 1160559944 | 6 | 97 | 6/6/6/6/6 | Chance-path RNG movement is visible |
| 1450 | `efa4b2f7a7b5b83e573fec48800544e87fa182d9e571d2c9ba03301ab5f17855` | 1160559944 | 6 | 97 | 7/6/6/6/6 | Attack +1 |
| 1550 | `e79185fea721de42b4f5a8c969c4f7f622813d384c645ce38073e9583175a10b` | 1160559944 | 6 | 97 | 7/7/6/6/6 | Defense +1 |
| 1625 | `07b213061cd9fe1be2cb136590b7897f8595011d69d6f958c77fce31feaad4a6` | 1160559944 | 6 | 97 | 7/7/7/6/6 | Speed +1 |
| 1725 | `80d9745317af66ee0a42b18b0b6c3b1b488b00902325bbaeadc9b083b8b7f55b` | 1160559944 | 6 | 97 | 7/7/7/7/6 | Sp. Attack +1 |
| 1850 | `109c9f75c9b00d3ed20ea8f90b27a0421dac1e61ebd73ae66289b2605c307bfc` | 1160559944 | 6 | 97 | 7/7/7/7/7 | Sp. Defense +1; controller settled |
| 2375 | `670f800365ce1e9a2e49e3e9808f9b71f1fdae047a02878baaa7cbef89de7bfd` | 786441859 | 5 | 73 | 7/7/7/7/7 | Third use dealt 24 and did not proc again |

The ROM therefore directly corroborates the 10% success path and the
source-ordered five-stat script. The first and third uses are observed
no-procs, but this is not a statistical claim. Source establishes that each
visit has one `seteffectwithchance` draw and that the family case adds no
selector draw. This receipt does not stage all-max stages or partial-max
skips.

## Observed-versus-source-only boundary

The committed hermetic fixture pins the scenario hashes, twice-run manifest
hashes, selected normalized framebuffer hashes, PP, HP, active and party
`status1`, direct stat stages, RNG snapshots, controller flags, full-party
shape, initial checksums, AI constraint, and speed ordering.

The public manifest does not expose the battle-script PC, effect byte,
individual `Random()` call ownership, Tri Attack selector value before the
recursive primary-status dispatch, or printed string IDs. Consequently:

- only the observed Paralysis selector is claimed for Tri Attack;
- Overheat's direct stage changes and damage decline are observed, while
  certainty/no-local-chance semantics remain source-backed;
- AncientPower's successful five-stage sequence is observed, while exact
  chance-draw ownership and max-stage branches remain source-backed.

No production implementation is treated as evidence here; these receipts
corroborate the pinned pret source and are ready for the next-round engine
comparison.
