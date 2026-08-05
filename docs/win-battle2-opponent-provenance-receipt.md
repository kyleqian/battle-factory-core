# Battle-2 opponent generation RNG receipt (WIN GO ON route)

SIDE-LANE evidence packet for ISSUES #55/#73's far-side content gap: the
ROM's real `gRngValue` at the battle-2 opponent-generation point on the
committed WIN GO ON route, the draw attribution around it, and the
byte-for-byte reproduction of trainer 9 LILIANA's party from those probed
cursors. Banked so a follow-up MAIN step can thread real provenance into the
win-terminal comparison scaffold (`tools/compare/appTrace.ts`'s
`win-terminal-window-off` stage).

**Verdict:** the selection epoch (`GenerateOpponentMons`) is **single-frame**
(frame 6636) with **zero ambient interleaving inside its span** — the probed
pre-call cursor `0x7399E3AE` fed to `generateFactoryOpponent` reproduces
trainer **9 LILIANA** and her exact party's set ids/species/items. The
personality epoch (`FillFactoryFrontierTrainerParty`) is **not** single-frame
(32 frames, 32 ambient VBlank ticks interleaved between the three mons), so a
single `constructionRngValue` reproduces only mon 0; the per-mon construction
cursors `[0x2F959DF4, 0xBD6F8138, 0xDE320F3A]` reproduce all three
personalities byte-for-byte (the ported algorithm is correct; only the
inter-mon ambient interleaving is unrepresented in the single-cursor
contract).

## 1. Method

`tools/probe/dump-win-battle2-opponent-rng.py` (three phases, each run twice
fresh, byte-identical) replays the committed fixture
`tools/battle-lab/scratch-win-go-on-swap-offer-no-guide-dismiss-probe.json`
(39 segments / 11308 frames; GO ON `A` at frames 6634-6635) through the real
battle-lab staging:

- **`--phase selection`** CPU-single-steps frame 6636 (the frame where
  `gTrainerBattleOpponent_A` flips 50→9), LR-attributing every `Random()`
  call and capturing `gRngValue` at `GenerateOpponentMons` entry/return
  (0x081A61B0, battle_factory.o; the script-engine `special` dispatch fires
  it as `AskSwapMon`'s first command, `data/maps/BattleFrontier_BattleFactoryPreBattleRoom/scripts.inc:137-138`).
- **`--phase party`** replays the whole fixture, presses the held battle-room
  quote once, idles past `closemessage`/`HealPlayerParty`/
  `DoSpecialTrainerBattle`, and reads the freshly built `gEnemyParty`
  box-decrypted (species/personality/item per slot, checksum-validated) plus
  `gFrontierTempParty`/`gTrainerBattleOpponent_A`.
- **`--phase construction`** single-steps frames 11311-11345 (post-quote),
  watching `FillFactoryFrontierTrainerParty` (0x081635D4,
  `battle_tower.c:1824`) entry/return and every `Random()` call.

`tools/probe/verify-win-battle2-opponent-provenance.ts` then drives the app's
ported generator read-only from the probed cursors with the route's real
parameters.

## 2. Probed cursors and draw attribution

**Selection epoch — `GenerateOpponentMons`, entirely within frame 6636:**

| # | frame | caller | pre `gRngValue` | post `gRngValue` | u16 | meaning |
|---|---|---|---|---|---|---|
| 0 | 6636 | `VBlankIntr+0x87` | `0x36AAEF47` | `0x7399E3AE` | `0x7399` | ambient per-VBlank tick, immediately before entry |
| 1 | 6636 | `GetRandomScaledFrontierTrainerId+0x4f` | `0x7399E3AE` | `0x62795589` | `0x6279` | trainer draw: 25209 % 100 = **9 LILIANA** |
| 2 | 6636 | `GetFactoryMonId+0x61` | `0x62795589` | `0xD6AF89C8` | `0xD6AF` | set: 110 + 54959 % 90 = **169** |
| 3 | 6636 | `GetFactoryMonId+0x61` | `0xD6AF89C8` | `0x3D68FA9B` | `0x3D68` | set: 110 + 15720 % 90 = **170** |
| 4 | 6636 | `GetFactoryMonId+0x61` | `0x3D68FA9B` | `0x50F04E72` | `0x50F0` | set: 110 + 20720 % 90 = **130** |

`GenerateOpponentMons` entry cursor **`0x7399E3AE`** (1939465134), return
cursor **`0x50F04E72`** (1357926002) — entry and return both frame 6636, the
four source draws gapless (each draw's pre == prior draw's post), and the
return cursor equals the frame-6636 end-of-frame value. The single
non-source draw in the frame (row 0) is the ambient VBlank tick that fires
immediately **before** entry. `gTrainerBattleOpponent_A` reads 9 and
`gFrontierTempParty` reads `[169, 170, 130]` at the frame's end.

**Construction epoch — `FillFactoryFrontierTrainerParty`, frames 11313-11344**
(32 frames; not single-frame):

| mon | slot | frame | attempts | draws | pre-cursor | accepted personality |
|---|---|---|---|---|---|---|
| 0 | 0 | 11313 | 13 | 26 | `0x2F959DF4` | `0x801D2ED7` |
| 1 | 1 | 11323 | 7 | 14 | `0xBD6F8138` | `0x0FFC69A4` |
| 2 | 2 | 11335 | 36 | 72 | `0xDE320F3A` | `0x1AE16FDA` |

148 `Random()` calls in the single-stepped window: **112** attributed to
`CreateMonWithEVSpreadNatureOTID+0x35/+0x3b` (the low/high halves of the
nature-rejection `Random32`, `pokemon.c:2572`), **35** to `VBlankIntr+0x87`
(ambient; 2 before entry, 1 after return → 32 inside the span), and **1** to
`GetSpecialBattleTransition+0xd1` (battle-2 transition selection, after
`FillFactoryTrainerParty` returns). Each mon's own loop is contiguous within
its single frame; the ambient ticks interleave **between** mons (9 ticks
frames 11314-11322, 11 ticks frames 11324-11334) and between mon 2 and the
return (frames 11336-11344). Entry cursor `0x2F959DF4`, return cursor
`0x0AB569B5` (179661237, read at frame 11344).

## 3. Single-frame verdict

- **`GenerateOpponentMons`: YES, single frame (6636).** No ambient
  interleaving inside its span — a pre-call cursor is a complete and exact
  input to the ported selection.
- **`FillFactoryFrontierTrainerParty`: NO, 32 frames (11313-11344).** The
  three mon loops are separated by ambient VBlank ticks; a single
  `constructionRngValue` cannot express the interleaving.

## 4. Party comparison (RAM probe vs ported generator)

The realized `gEnemyParty` (box-decrypted, checksums valid, two fresh runs
byte-identical) vs `verify-win-battle2-opponent-provenance.ts`:

| slot | set | species (id) | held item | nature | realized personality | app from per-mon cursors |
|---|---|---|---|---|---|---|
| 0 | 169 | KADABRA (64) | 214 TWISTED_SPOON | IMPISH (8) | `0x801D2ED7` | `0x801D2ED7` ✅ |
| 1 | 170 | WAILMER (313) | 221 LAX_INCENSE | DOCILE (6) | `0x0FFC69A4` | `0x0FFC69A4` ✅ |
| 2 | 130 | NUZLEAF (299) | 142 SITRUS_BERRY | HARDY (0) | `0x1AE16FDA` | `0x1AE16FDA` ✅ |

(Species ids are the ROM's own enum, `include/constants/species.h`: KADABRA
64, WAILMER 313, NUZLEAF 299 — not the national dex.) OT id `0x18CC699A` =
416,049,562 = the fixture save's `playerTrainerId`, used by the ROM as the
opponent OT id and passed to the port unchanged.

## 5. Divergence profile without per-mon cursors

| feed | trainer/sets | personalities |
|---|---|---|
| selection cursor only (`0x7399E3AE`, no `constructionRngValue`) | 9 + [169,170,130] ✅ | all three diverge (they replay back-to-back from `0x50F04E72`): got `18D002F9, 10191518, 61B151D7` |
| selection cursor + construction cursor (`0x2F959DF4`) | 9 + [169,170,130] ✅ | mon 0 ✅ (`0x801D2ED7`, completes in its single frame), mons 1-2 diverge: got `0xBD6F9449, 0x2E833D84` |
| per-mon construction cursors | 9 + [169,170,130] ✅ | all three ✅ byte-for-byte |

First divergence (feeding only the probed pre-call cursor): mon 0's
personality — realized `0x801D2ED7`, got `0x18D002F9` — because the real
personality epoch is 32 frames later than selection with 32 ambient ticks
interleaved; the ported algorithm itself is exact (proven by the per-mon
reproduction). Not forced: this is the same interleaved-ambient gap the
anchor draft receipt documented (`docs/anchor-draft-cursor-receipt.md` §5).

## 6. Reproducing

```sh
python3 tools/run-mgba-probe.py /tmp/b2-selection.json -- \
  python3 tools/probe/dump-win-battle2-opponent-rng.py /tmp/b2-selection.json --phase selection
python3 tools/run-mgba-probe.py /tmp/b2-party.json -- \
  python3 tools/probe/dump-win-battle2-opponent-rng.py /tmp/b2-party.json --phase party
python3 tools/run-mgba-probe.py /tmp/b2-construction.json -- \
  python3 tools/probe/dump-win-battle2-opponent-rng.py /tmp/b2-construction.json --phase construction
node --experimental-strip-types tools/probe/verify-win-battle2-opponent-provenance.ts
```

All three probe phases were run twice fresh and were byte-identical; the
driver reports ALL CHECKS PASSED. (Known teardown SIGSEGV from
`run-mgba-probe.py` is benign once the output JSON parses.)

## 7. Recommended scaffold wiring (for the follow-up MAIN step)

The divergence at 10638 is purely next-opponent *content*: the app's
`win-terminal-window-off` stage (`tools/compare/appTrace.ts`,
`winTerminalWindowStage`, ~line 666) builds its round orchestrator with a
modeled placeholder seed

```ts
createFactoryRoundBattleOrchestrator({
  id: "win-terminal-window-off",
  rngValue: 4,                       // <-- modeled placeholder
  factoryWinStreak: 0,
  playerTrainerId: 0x89ab_cdef,      // <-- modeled placeholder
  ...
  savedRentalRecords: [ ...generatedCommandRecord(1..3) ], // <-- modeled placeholders
})
```

and the battle-2 opponent is pre-generated at the GO ON accept by
`preGenerateFactoryRoundNextOpponent`
(`src/engine/factoryRoundBattleOrchestrator.ts:746-786`) from
`state.round.rules.rngValue`. To align this fixture's far side the MAIN step
should carry the probed values through that stage's orchestrator config so
the round's cursor at the battle-2 pre-generation point is the ROM's real
pre-call cursor:

- **`rngValue`**: the orchestrator config's `rngValue` is the field that
  seeds the whole modeled ledger, so it must be arranged (transplanted, in
  the `issue69OmniboostSeedSweep.ts` idiom of carrying the oracle's real
  cursor, or via an explicit GO-ON-boundary override) so
  `preGenerateFactoryRoundNextOpponent`'s `rngBefore` reads the probed
  **`0x7399E3AE`**.
- **`playerTrainerId`**: replace the placeholder `0x89ab_cdef` with the
  fixture's real **416_049_562** (`0x18CC699A`) — the opponent OT id.
- **`savedRentalRecords`**: replace the placeholder filler set ids 1..3 with
  the real six saved records **156, 149, 180** (player rentals) + **188, 184,
  135** (battle-1 opponent's sets, written by `SetRentalsToOpponentParty` at
  the post-win `ReturnToRoomFromBattle` script), i.e. the exclusion species
  the ROM's `GenerateOpponentMons` checked.
- **`factoryWinStreak`** stays **0** (the orchestrator adds `battleIndex 1`,
  yielding the ROM's real post-win streak 1; `battleTowerLevel50WinStreak`
  stays 0 — the retail fixed-IV bug reads the Tower streak, which never
  incremented).
- Personality alignment is a separate decision: the scaffold currently
  renders the opponent's three mons, whose personalities the ROM builds 32
  frames later with interleaved ambient ticks. The selection-only cursor
  yields the right trainer/party identity (sprite + quote + set ids); exact
  personalities need the per-mon cursors above via
  `adoptFactoryOpponentSchedule`, mirroring the anchor's construction-cursor
  pattern — or a fixture-scoped decision to render identity only.
