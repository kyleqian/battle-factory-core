# msg189 — why production over-holds the "was seeded!" print (88 vs the ROM's 80 / 84)

Side lane, 2026-10-16. **Evidence only** (no `src/` or test change; no new mGBA run — committed lsd186 receipts and production's own output).
Follows lsd186 (`docs/lsd186-leech-seed-drain-timing.md`, Observations) and msg175 (`docs/msg175-used-message-duration.md`).

## Finding

**The over-hold is the 24-frame message floor, not the waitmessage length and not the printable length.**
Production's command duration is `max(timing.minimumFrames, L) + timing.holdFrames`
(`src/engine/battleResolutionPresentationRender.ts:1204-1207`). The "seeded" print gets `WAITMESSAGE_LONG_TIMING = { minimumFrames: 24, holdFrames: 64 }`
(`src/engine/battleResolutionPresentation.ts:763-766`), so duration = `max(24, L) + 64`. The ROM's is `L + 64`. The difference is `max(0, 24 − L)`.

| Print | L (printable glyphs, `battleStringPrintableLength`) | Production `max(24,L)+64` | ROM (first glyph → next command) | Δ |
| --- | ---: | ---: | ---: | ---: |
| `ONIX was seeded!` (opponent seeds; player's ONIX is seeded) | 16 | 88 | 80 | **+8 = 24 − 16** |
| `Foe ONIX was seeded!` (player seeds) | 20 | 88 | 84 | **+4 = 24 − 20** |

Production values: `lsd186Production.ts --seed=57` (both scenes, both sides), message rows `{minimumFrames:24, holdFrames:64}`, `dur 88`.

### Ruled out

- **waitmessage length (the 64):** exact. ROM `BattleScript_DoLeechSeed+8` run (the `waitmessage B_WAIT_TIME_LONG`, `battle_scripts_1.s:1169`; `B_WAIT_TIME_LONG` = 64,
  `include/constants/battle.h:324`), recomputed here from all six committed lsd186 receipts (`*-r1.json`, `ptr` runs, screen-hash `scr` changes): the run is
  81 rows (16-glyph) / 85 rows (20-glyph); first glyph at run row 1, **final glyph at run row 16 / 20 (= L), and from the final glyph to the run's last row = 64 exactly**
  (so the next command starts at final glyph + 65 = G + 1 + 64, production's convention). First glyph → next command = rows 1..80 / 1..84 = `L + 64`. Identical in OFF/ON, both
  sides, all three scenarios (full-HP variant too: 85 rows).
- **printable length:** exact. "{B_DEF_NAME_WITH_PREFIX} was seeded!" resolves via `STRINGID_PKMNSEEDED` (`battleResolutionPresentation.ts:2783-2793`) to 16 / 20 glyphs, and the
  ROM's last screen change is at run row 16 / 20 (one glyph per row, as msg175 measured for the "used" print). The same ROM→production check already holds for the drain's own
  "sapped" print (105 / 101, ≥ 24 so the floor is inert; lsd186 table row "Print length … 0").
- Unattributed residual: none: 88 − 80 = 8 and 88 − 84 = 4 are fully explained by `24 − L`.

### The exact rule (where it lives)

1. `battleResolutionPresentationRender.ts:1204-1207` — `Math.max(command.timing.minimumFrames, battleStringPrintableLength(command.lines)) + command.timing.holdFrames`.
2. `battleResolutionPresentation.ts:851-866` `messageTimingFromSourceProvenance`: the print's following source instruction is `waitmessage B_WAIT_TIME_LONG`
   (`BattleScript_DoLeechSeed`: `printfromtable gLeechSeedStringIds; waitmessage B_WAIT_TIME_LONG`) → returns `WAITMESSAGE_LONG_TIMING` (`:763-766`, `minimumFrames: 24`).
3. `battleResolutionPresentation.ts:4195-4199` — the message command is built with that `base` (`messageTimingFromSourceProvenance ?? WAITMESSAGE_LONG_MESSAGE_IDS ?? MESSAGE_TIMING`).
   Only `STRINGID_USEDMOVE` (`:4185-4190`, msg175), `RETURNMON` (`RETURN_MON_TIMING`, `:777`) and `SWITCHINMON` (`SWITCH_IN_MESSAGE_TIMING`, `:787`) bypass the floor-with-hold shape.

The fix shape (not applied): `WAITMESSAGE_LONG_TIMING.minimumFrames` 24 → 0, mirroring msg175's USEDMOVE change (`:737-766` comments already say the hold "counts down from print completion,
so `holdFrames` is strictly additive to the print floor/length term" — i.e. the floor has no source behind it once the print is followed by a waitmessage).
Caveat for whoever lands it: `docs/battle-message-hold-cadence-ground-truth.md` (the dense-sweep table: rows "It's super effective!" 21 glyphs / "not very effective…" 24 glyphs) measured
"hold after typing" 64 + 13 / 64 + 2 with an *unrelated next-box edge* (the remainder is the turn-end script, not the floor), so those two rows do not contradict `L + 64`, but they
were never ROM-verified as a *command* duration; the re-pin sweep should cover them.

## Other print classes that share the floor (by reading the code; no census)

Every message command whose timing comes from `WAITMESSAGE_LONG_TIMING` (a) via source provenance — any print whose next source instruction is `waitmessage B_WAIT_TIME_LONG`
(the general case; the Leech Seed set-up print is just one) — or (b) via the legacy
`WAITMESSAGE_LONG_MESSAGE_IDS` fallback (`WAITMESSAGE_LONG_MESSAGE_IDS`) over-holds by `max(0, 24 − L)` when `L < 24`:

| Class | Fixed text / L | Over-hold when floor applies |
| --- | --- | --- |
| `STRINGID_PKMNSEEDED` / `PKMNEVADEDATTACK` (Leech Seed landed / already seeded) | name + " was seeded!" 16 (own) / 20 (Foe) | 8 / 4 (measured) |
| `STRINGID_CRITICALHIT` | "A critical hit!" 15 | +9 |
| `STRINGID_SUPEREFFECTIVE` | "It's super effective!" 21 | +3 |
| `STRINGID_NOTVERYEFFECTIVE` | "It's not very effective…" 24 | 0 (floor inert) |
| `STRINGID_ONEHITKO` | "It's a one-hit KO!" 18 | +6 |
| `STRINGID_PKMNENDUREDHIT` | "{name} ENDURED\nthe hit!" 20 with a 4-glyph name ("ONIX"), 24 with "Foe ONIX" | +4 / 0 (name-dependent) |
| `STRINGID_BUTITFAILED` | "But it failed!" 14 | +10 |
| `STRINGID_BUTNOTHINGHAPPENED` | "But nothing happened!" 21 | +3 |
| Stat-change ids (`STAT_CHANGE_MESSAGE_IDS`: ATTACKERSSTATROSE / DEFENDERSSTATROSE / STATSWONTINCREASE / ATTACKERSSTATFELL / DEFENDERSSTATFELL / STATSWONTDECREASE) | "{name}'s {stat}\nrose!" etc. — name- and stat-dependent, mostly 16..30 | `max(0, 24 − L)` for short names / stats (e.g. own "ONIX's DEFENSE rose!"-style lines) |
| any other print followed by `waitmessage B_WAIT_TIME_LONG` (status-cure / "was hurt by…" / weather-continues / ability-activation prints that the provenance path picks up) | per string | same formula |

Not through `WAITMESSAGE_LONG_TIMING` but through the same floor-style objects (`:737-787`):
- `MESSAGE_TIMING { 24, 0 }` (`:737`): every other `message` command with no waitmessage-long successor (default branch, `:4197-4199`). Whether the floor is wrong there depends on that print's own
  source (e.g. a `waitmessage B_WAIT_TIME_SHORT` successor would be `L + 32`-style, not `max(24,L)`); unverified, would need its own receipts — only the USEDMOVE case (msg175) is proven.
- `RETURN_MON_TIMING { 24, 9 }` (`:777`) — "X, that's enough!" etc.; floor not cross-checked in msg175/lsd186.
- Overrides on top of `base`: `focusPunchPrePassMessageTiming` (`:174`) and `chargeTurnEmptyBoxTiming` (`:220`) replace the floor already (fpp150 / chg161).
- Already floor-free: `USEDMOVE` (msg175), `SWITCHINMON` (13 frames), long prints with `L ≥ 24` (the drain's "sapped" 101 / 105, "not very effective…", `Foe` + long-name stat lines).

Impact note: the over-hold only matters where the print's next-command start is observed (e.g. the Leech Seed drain's `hp` lead, the next action's first glyph). For the seeded print the
**+8 / +4 is inside lsd186's already-large lead error (−44 / −218 rows before the first bar)**, so this floor removal alone cannot fix the drain's first-glyph timing; it only trims
the prior print's tail by 4–8 rows. As lsd186 showed, the drain's timeline only lands when the lead, both bars' floors/tails and this print's `L + 64` are all corrected.

## Reproduce

```sh
source /etc/pokebench-runner.env
node --experimental-strip-types --no-warnings tools/integration/lsd186Production.ts /tmp/p.json --seed=57   # message rows: {24, 64}, dur 88 for both "was seeded!" prints
# ROM: the DoLeechSeed+8 (waitmessage LONG) run before the drain, from tools/integration/fixtures/lsd186/*-off-r1.json (and -on-): 81 / 85 rows, first change row 1, last row L, + 64 to the run end.
```
