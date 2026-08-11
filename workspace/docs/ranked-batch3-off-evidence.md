# Ranked Batch 3 Battle Scene OFF evidence

This SIDE-lane checkpoint adds no interpreter, controller, renderer, census,
or production-engine code. It stages the source semantics from
[`ranked-single-opcodes-notes.md` §3.7–3.8](ranked-single-opcodes-notes.md)
under the `battle-scene-off` oracle profile.

## Common staging contract

All scenarios build three complete Pokémon per side before `CB2_InitBattle`;
all six initial checksums are valid. The active opponent has four identical
move slots, so Factory AI remains live but every legal choice reaches the same
case. Speeds are strictly ordered: Misdreavus 105 or Pelipper 85 versus
Shuckle 10. Every relied-on frame is on a 25-frame grid. Each final scenario
was run twice from a fresh snapshot, with oracle stdout redirected to scratch
files; each complete pair of `manifest.json` files compares byte-for-byte.

## 1. Pain Split

[`mechanic-pain-split-misdreavus-shuckle-off.json`](../tools/battle-lab/mechanic-pain-split-misdreavus-shuckle-off.json)
uses `FRONTIER_MON_MISDREAVUS_1` (set 374), its stock moves, Impish nature,
Focus Band, and sole Levitate ability. Misdreavus first uses real Shadow Ball;
Shuckle then uses real Night Shade. This creates asymmetric damaged HP without
injecting transient state.

| Receipt field | SHA-256 / value |
| --- | --- |
| Scenario | `8158857466b98c8018a6bfb32461de6ea15a888f617e1d223fe192038ceb251d` |
| Full manifest, run 1 | `a026549d2f40a01cb719cf3bbfcfa1fbc06d4e77cb41cd4a53914e58869686d7` |
| Full manifest, run 2 | `a026549d2f40a01cb719cf3bbfcfa1fbc06d4e77cb41cd4a53914e58869686d7` |
| Capture grid | frames 0–2025 inclusive, step 25, 82 captures |

| Frame | Raw RGB888 framebuffer SHA-256 | RNG | Pain Split PP | Misdreavus HP | Shuckle HP | Observed fact |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 0 | `bccf331d980b233c15a66100aeac4401dc9b8978e616b65962f50ce5acaf1771` | 983229340 | 20 | 167 | 116 | Initial full HP |
| 200 | `f64c337227590aa9fa39f13cb4e258182278cf03cdfcc4c3c2eb4ccfb18cd097` | 2756097505 | 20 | 167 | 100 | Real Shadow Ball damage synchronized to the target party record |
| 400 | `49de96802dac126119bd6b920938ead5e7e071473362547f88c6d131290704ed` | 1530931116 | 20 | 117 | 100 | Real Night Shade damage settled; floor average is 108 |
| 1125 | `3d47fa720945ab6bd60037f834518842cc3931a532d103c0acc733d3382b143a` | 1530931116 | 19 | 117 | 100 | Pain Split spent PP; local RNG unchanged |
| 1175 | `afbc57da8be378b933368917176ca5d81d96739fc273601a385364ee4d21ab01` | 1530931116 | 19 | 108 | 100 | First controller/party HP write set the attacker to 108 |
| 1200 | `995e133e9b25090cb1a526c6e65422abdd3d0a2cf09e58642af7957d0df24e24` | 1530931116 | 19 | 108 | 108 | Second controller/party HP write set the target to 108 |

The unchanged RNG from the settled pre-action state through both HP writes
corroborates the dossier's zero effect-local and script draws. Source supplies
the hidden `painSplitHp` scratch/copy ordering and
`shellBellDmg = IGNORE_SHELL_BELL`; neither field is public in the manifest,
so this receipt does not claim Substitute or Shell Bell branches.

## 2. Stockpile ×2 → scaled Swallow

[`mechanic-stockpile-swallow-scaled-pelipper-shuckle-off.json`](../tools/battle-lab/mechanic-stockpile-swallow-scaled-pelipper-shuckle-off.json)
uses the stock moves and sole Keen Eye ability of
`FRONTIER_MON_PELIPPER_1` (set 213). It deliberately replaces the stock Sitrus
Berry with `ITEM_NONE`: a control run showed the Berry firing at 67 HP and
masking the Swallow delta. Shuckle's identical Night Shade slots stage two
real 50-HP losses.

| Receipt field | SHA-256 / value |
| --- | --- |
| Scenario | `d3a715d069dda376789ae401a596ff804a3aae65f41b3e08762ceb7df06f6e97` |
| Full manifest, run 1 | `6ed78a539cdc5348054a1e4418c6bbc85fa7771e10d92c8573af880e65c39188` |
| Full manifest, run 2 | `6ed78a539cdc5348054a1e4418c6bbc85fa7771e10d92c8573af880e65c39188` |
| Capture grid | frames 0–2700 inclusive, step 25, 109 captures |

| Frame | Raw RGB888 framebuffer SHA-256 | RNG | Stockpile / Swallow PP | Pelipper HP | Observed fact |
| ---: | --- | ---: | --- | ---: | --- |
| 0 | `35d5dc1af948f4fa53bf03f8661821c8e067c1eece3630fb395a9933d95852e9` | 919694434 | 10 / 10 | 167 | Initial state |
| 175 | `82ebe1ddc30eda232c4d080a191ee16002005ca85227d0c15038bc375c6166ca` | 919694434 | 9 / 10 | 167 | Screen says `PELIPPER STOCKPILED 1!` |
| 1075 | `5ba1b1d5534ae040dd87fd23d4a27545f054c913ccaf2e5d70804bc186b7aabb` | 3034451114 | 8 / 10 | 117 | Screen says `PELIPPER STOCKPILED 2!` |
| 1275 | `4cc26edcb96939e233f8de9f0b2fda79ada202d483503ccb53df239151a3199f` | 2682491093 | 8 / 10 | 67 | Second real Night Shade settled |
| 1900 | `12bbb2ef6e30cad58ad774512e9dac4599560fb6476859ce1b92343655a62812` | 2319805938 | 8 / 9 | 67 | Swallow spent PP |
| 2025 | `8422d57410288d0701317caf3f32c7dd470a80edf427018ff8752045bd41d029` | 2319805938 | 8 / 9 | 150 | Swallow healed exactly 83; active and party HP agree |

This receipt corrects one sentence in §3.8's prose. The pinned source formula
is `maxHP / (1 << (3 - stockpileCounter))`, which means counters 1/2/3 heal
1/4, 1/2, and full HP in Emerald. It is not 1/8, 1/4, and 1/2. The ROM's
count-2 result is exactly `67 + floor(167 / 2) = 150`, with unchanged RNG
across the Swallow execution.

## 3. Swallow reset → Stockpile ×3 → fourth failure

[`mechanic-stockpile-swallow-pelipper-shuckle-off.json`](../tools/battle-lab/mechanic-stockpile-swallow-pelipper-shuckle-off.json)
retains Pelipper-1's stock Sitrus Berry and drives Stockpile ×2, Swallow,
Stockpile ×3, then a fourth Stockpile. Shuckle uses four identical Rock Slide
slots. This longer receipt is the observable counter-lifetime control.

| Receipt field | SHA-256 / value |
| --- | --- |
| Scenario | `b66393a5249ea6ac7fe8c76935f778e7a65940b9b875ad1796b38657c9fb25a7` |
| Full manifest, run 1 | `163cd0efad08365d80160c7c0aa017c1b9981cdf5d25d60e3ae2e92f84b5b197` |
| Full manifest, run 2 | `163cd0efad08365d80160c7c0aa017c1b9981cdf5d25d60e3ae2e92f84b5b197` |
| Capture grid | frames 0–6325 inclusive, step 25, 254 captures |

| Frame | Raw RGB888 framebuffer SHA-256 | RNG | Stockpile / Swallow PP | Pelipper HP | Observed counter-derived fact |
| ---: | --- | ---: | --- | ---: | --- |
| 175 | `82ebe1ddc30eda232c4d080a191ee16002005ca85227d0c15038bc375c6166ca` | 983229340 | 9 / 10 | 167 | `STOCKPILED 1!` |
| 1075 | `a935775286231e485f57b2340b4ba0b48e0272243dc7b652382662dedd461e99` | 1160559944 | 8 / 10 | 137 | `STOCKPILED 2!` |
| 2075 | `58886d5c2541cf0c323a06ddde28fb3b1399bce01673ec8595fa2c1b6741808e` | 1630250804 | 8 / 9 | 167 | Swallow consumed the two-count ladder |
| 2950 | `82ebe1ddc30eda232c4d080a191ee16002005ca85227d0c15038bc375c6166ca` | 3472808831 | 7 / 9 | 167 | Counter visibly restarted at `1!` |
| 3825 | `a935775286231e485f57b2340b4ba0b48e0272243dc7b652382662dedd461e99` | 620937147 | 6 / 9 | 137 | Counter reached `2!` |
| 4725 | `987daa428ae91bf6909b850e088c1d8fcf713003492fdb8a895d1285c65f729b` | 2927669047 | 5 / 9 | 110 | Counter reached `3!` |
| 5625 | `9118598a76caf82eb17eede940d9d1900a06b470603a38037ef88e993ee93fa6` | 842450419 | 4 / 9 | 110 | Screen says `PELIPPER can't STOCKPILE any more!` |

The fourth attempt spends PP but leaves HP and the three-count state
behaviorally intact. The public manifest does not expose
`stockpileCounter`; the numbered strings, reset-to-1 after Swallow, and
fourth-use failure are the direct observations.

## 4. Spit Up boundary

No dynamic Spit Up scenario is committed. The dossier's sole Factory carrier
is `FRONTIER_MON_SWALOT_1`, and generated data verifies its stock
Stockpile/Swallow/Spit Up/Sludge moves. Pinned species source gives Swalot two
real abilities, Liquid Ooze and Sticky Hold. It therefore violates this
step's single-ability-carrier rule. Substituting Spit Up onto Pelipper or
silently choosing a Swalot ability would overstate the receipt.

The hermetic fixture instead pins Spit Up's source-only handler and full
script: zero-counter failure, base damage multiplied by the counter,
`animTurn`, Helping Hand, unconditional counter clearing, accuracy/type/
`adjustsetdamage`, Protect, and ordinary failure branches. Dynamic Spit Up
damage remains explicitly deferred.

## Observed-versus-source-only boundary

The fixture pins scenario hashes, twice-run manifest hashes, selected
framebuffer hashes, PP, active/party HP, RNG snapshots, complete party shape
and checksums, generated carrier rows, strict speeds, source hashes, and the
Spit Up blocker. Public manifests do not expose battle-script PCs,
`painSplitHp`, Shell Bell suppression, `stockpileCounter`, `animTurn`, typed
text buffers, or individual RNG call ownership beyond unchanged receipt
windows. Those remain source-backed, as do Substitute, full-HP Swallow,
switch/faint/Baton Pass lifetime, and every dynamic Spit Up branch.
