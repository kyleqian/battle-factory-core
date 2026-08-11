# Family-B Cluster-4 Battle Scene OFF evidence

This SIDE-lane checkpoint adds no interpreter, controller, renderer, census,
or production-engine code. It corroborates the item-motion cases from
[`set-move-effect-family-b-notes.md` §3.6 and §3.14](set-move-effect-family-b-notes.md)
against the stock ROM under the `battle-scene-off` oracle profile.

## Common staging contract

All three `mechanicLab` scenarios build three complete legal Pokémon per side
before `CB2_InitBattle`; all six initial party checksums are valid. The
generated Frontier catalog confirms the dossier's single-ability carriers:
`FRONTIER_MON_LINOONE_1` (set 203) has stock Covet and only Pickup, while
`FRONTIER_MON_SABLEYE_1` (set 163) has stock Knock Off and only Keen Eye.
Linoone's rental White Herb is explicitly replaced with `ITEM_NONE` only for
the steal cases. All four opponent move slots are Splash, so the Factory AI
still makes a normal choice but every legal slot is harmless.

Speeds are strictly ordered: Linoone 120 or Sableye 70 versus Shuckle 10; the
Sticky Hold control is Linoone 120 versus Gulpin 50. There is no speed-tie RNG
ambiguity. Every relied-on frame belongs to a committed 25-frame grid. Each
scenario was run twice from a fresh oracle snapshot; the complete manifests
are byte-identical. Oracle stdout was redirected to scratch files.

## 1. Covet success and occupied-attacker control

[`mechanic-covet-linoone-shuckle-off.json`](../tools/battle-lab/mechanic-covet-linoone-shuckle-off.json)
starts itemless Linoone against Shuckle holding Leftovers (`200`). The second
Covet is an internal occupied-attacker/empty-target control after the first
success.

| Receipt field | SHA-256 / value |
| --- | --- |
| Scenario | `c60f546165fff1a52dd326eaa811f8d21df43d3291e922507c018bf61f9a2a2a` |
| Full manifest, run 1 | `4506ec467b1f2a80ada508bc6bbeb839cd5e1b8457c9ecd884f3177d5c5d6ced` |
| Full manifest, run 2 | `4506ec467b1f2a80ada508bc6bbeb839cd5e1b8457c9ecd884f3177d5c5d6ced` |
| Capture grid | frames 0–1575 inclusive, step 25, 64 captures |

| Frame | Raw RGB888 framebuffer SHA-256 | RNG | Covet PP | Shuckle HP | Linoone active / party item | Shuckle active / party item | Observed fact |
| ---: | --- | ---: | ---: | ---: | --- | --- | --- |
| 0 | `a3ed5af94cae515c70ec2737a30ef370f1a14d813e122b04371d9addb28d6b88` | 919694434 | 40 | 127 | 0 / 0 | 200 / 200 | Itemless attacker and held target |
| 275 | `e6d58322e858522bf2b828bf947fffa1e75a205cb6beea869260d79c121fcbfd` | 1621732966 | 39 | 120 | 0 / 200 | 0 / 0 | Both controller party writes are visible while attacker active item is still staged empty |
| 425 | `9f85aba476a5c0dee4f4e22e3d8d121cccb9e191531d1302bedf97808eaa6627` | 1621732966 | 39 | 120 | 200 / 200 | 0 / 0 | Move-end restores the stolen item to active Linoone |
| 825 | `a4f884956b3f6df9375c37829604180088204a4789ad0a9d39622ffb27ec6601` | 530917129 | 38 | 120 | 200 / 200 | 0 / 0 | Second Covet spends PP with attacker already occupied |
| 900 | `a9bbeefe11d593f44835c8ebe816c7a5707b108d44d8967a325c63e492f35d60` | 530917129 | 38 | 113 | 200 / 200 | 0 / 0 | Damage lands, but no second item mutation occurs |

The success directly observes both active items and both persisted party
items before and after transfer. The second use proves that the item effect is
a no-steal while the damaging move and PP spend still proceed; because both
the occupied-attacker and empty-target guards are true, the receipt does not
separate which guard wins.

## 2. Covet blocked by Sticky Hold

[`mechanic-covet-sticky-hold-gulpin-off.json`](../tools/battle-lab/mechanic-covet-sticky-hold-gulpin-off.json)
uses a complete legal Gulpin record with `abilitySlot: 1`, deriving Sticky
Hold (`60`), and Choice Band (`186`).

| Receipt field | SHA-256 / value |
| --- | --- |
| Scenario | `5cf4e686e68f2e94f72ebb1635c7204886f6bab9d14b6947cc7813b508d3aabe` |
| Full manifest, run 1 | `a875b505f26ce40fa955132718373fd34df2584ae69a893a02f0377cee44277f` |
| Full manifest, run 2 | `a875b505f26ce40fa955132718373fd34df2584ae69a893a02f0377cee44277f` |
| Capture grid | frames 0–825 inclusive, step 25, 34 captures |

| Frame | Raw RGB888 framebuffer SHA-256 | RNG | Covet PP | Gulpin HP | Linoone active / party item | Gulpin active / party item | Observed fact |
| ---: | --- | ---: | ---: | ---: | --- | --- | --- |
| 0 | `6f7b3862d108d8aae6d36a23d08e7f8ea51b21a91e4d2260f908779f78fae526` | 919694434 | 40 | 177 | 0 / 0 | 186 / 186 | Sticky Hold target starts with an item |
| 125 | `3b5c65c016401306cb6b11e600b486fb880dbcec8664b3d3ca2ec112be4cfac6` | 3421819359 | 39 | 177 | 0 / 0 | 186 / 186 | PP spent before damage/effect resolution |
| 250 | `ad1724fc2fde6fe243cf7ea4b7454935d36c2cd0201ab23433603d7767439f87` | 1621732966 | 39 | 129 | 0 / 0 | 186 / 186 | Covet damages, but Sticky Hold preserves both ownership records |
| 600 | `a28f7c0d45e2aae76547b2dd3d62440317df76984432c19507a858b40943962b` | 1941898439 | 39 | 129 | 0 / 0 | 186 / 186 | Settled next-request state retains the block |

The manifest exposes the target ability and ownership result, but not
`gLastUsedAbility`, the AI ability-history write, script PC, or the exact
ineffective-ability string ID; those remain source-backed.

## 3. Knock Off removal and no-item no-op

[`mechanic-knock-off-sableye-shuckle-off.json`](../tools/battle-lab/mechanic-knock-off-sableye-shuckle-off.json)
uses Sableye's exact stock moves, nature, Black Glasses, and Keen Eye against
Shuckle holding White Herb (`180`). The second Knock Off targets the already
itemless active battle copy.

| Receipt field | SHA-256 / value |
| --- | --- |
| Scenario | `a625c18c8c58e3dc25cb602420cb1029a9efc8da596fd2cd0687ef9771d2db04` |
| Full manifest, run 1 | `7b1ffb705775aad7dbdffee8d0586850866a1d99f9e85b86ee598e63c81a220e` |
| Full manifest, run 2 | `7b1ffb705775aad7dbdffee8d0586850866a1d99f9e85b86ee598e63c81a220e` |
| Capture grid | frames 0–1575 inclusive, step 25, 64 captures |

| Frame | Raw RGB888 framebuffer SHA-256 | RNG | Knock Off PP | Shuckle HP | Shuckle active / party item | Observed fact |
| ---: | --- | ---: | ---: | ---: | --- | --- |
| 0 | `9753efe7228f5f8553c2c06194885e763e53c6c5572e4c3ec187e6fbb10ce671` | 919694434 | 20 | 127 | 180 / 180 | Held-item initial state |
| 125 | `e733391f70ce556d078b16b1228f133bba987a51847f7854fea32fa10d701d38` | 3421819359 | 19 | 127 | 180 / 180 | PP precedes damage/effect resolution |
| 200 | `7b68d1c602c1e73138514c91f0afbaf80155850565b18d309aabc0ffa1cae254` | 1621732966 | 19 | 122 | 0 / 180 | Active item is removed; persistent party item deliberately remains intact |
| 825 | `7b68d1c602c1e73138514c91f0afbaf80155850565b18d309aabc0ffa1cae254` | 530917129 | 18 | 122 | 0 / 180 | Second selection spends PP against no active item |
| 900 | `87d4ca4ac0394e5bc1338feefd877f4ef8031d5fdfca28d0e78ea800e9caf221` | 530917129 | 18 | 117 | 0 / 180 | Second hit damages but item state is a no-op |

This settles the party-record boundary: Knock Off does **not** overwrite the
stored party item. Source records the party-slot bit in `knockedOffMons`, and
the switch-in command reloads the party record before forcing only the active
battle copy back to `ITEM_NONE`. This receipt does not stage a switch, so that
later suppression is source-pinned rather than observed.

## Observed-versus-source-only boundary

The hermetic fixture pins scenario hashes, twice-run full-manifest hashes,
selected framebuffer hashes, PP, HP, both active and party item records,
abilities, RNG snapshots, controller flags, strict speed ordering, full-party
shape, and checksums.

The public manifest does not expose `lastUsedItem`, `changedItems`,
`knockedOffMons`, `choicedMove`, script PCs, message IDs, ability-history
writes, or individual RNG-call ownership. The 100% target-directed effect
entries are source-established chance draws; the coarse RNG snapshots also
include accuracy, critical, damage, AI, and turn processing.

A knocked-off active target cannot immediately be stolen from because its
active item is zero. Source nevertheless allows it to receive an item through
Trick in a Frontier battle: the special battle-type gate bypasses the
knocked-off rejection. Once it holds an active item, the steal handler does
not reject based on the target's knocked-off bit, so a later itemless attacker
can steal it subject to the ordinary Sticky Hold/mail/Enigma gates. Those
receive-then-steal consequences are source-pinned, not staged here.

No production implementation is treated as evidence. These receipts
corroborate the pinned pret source ahead of Cluster 4 engine work.
