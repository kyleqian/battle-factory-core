# pnm273: the player's name defaults to "PLAYER"

User decision 2026-11-12 (handoff item 0c): every message that expands `{PLAYER}` prints "PLAYER", not the oracle save's "MEMORY".

## Shape

- `src/engine/playerName.ts` exports `PLAYER_NAME = "PLAYER"`. Every site imports it:
  `FORFEIT_MESSAGE_PLAYER_NAME` (`battleCommandPresentation.ts`), `recordSavedMessage` (x2, loss and round-won profiles) and
  `getPoints` (`factoryTerminalPresentation.ts`), `POSTWIN_RECORDED_TEXT` (`postwin.ts`).
- Grep of `src/` (ts, `src/data/gen`, `src/assets/gen`, case-sensitive `MEMORY`): those were the only sites. No glyph data bakes the name; the normal
  font has glyphs and widths for P L A Y E R (pinned in the test).
- Both names are 6 characters and the text prints 1 frame per glyph, so no frame timing moves (glyph counts pinned in the test).
- Later, not now: a per-player name (a `playerName` mount option stored with the server challenge).

## Harness override (ROM compares)

The oracle save stays "MEMORY". `tools/compare/harnessPlayerName.ts` is the first import of `tools/compare/appTrace.ts`: it sets
`globalThis.__POKEBENCH_PLAYER_NAME__` (default "MEMORY") before `playerName.ts` first evaluates, so **compare traces render "MEMORY"** (not masked).
`POKEBENCH_HARNESS_PLAYER_NAME=PLAYER` renders the production name instead. Under vitest it does nothing: `vite.config.ts` runs `isolate: false`, so a
global set by one file's `appTrace` import would leak "MEMORY" into later test files (it did, in a first draft; `tests/pnm273PlayerName.test.ts` pins it).
Other engine importers (the site, the library, the portable probes that do not import `appTrace`) print "PLAYER".

## Evidence (`.integration/evidence/pnm273/`)

- Production-mode differential (`POKEBENCH_HARNESS_PLAYER_NAME=PLAYER npm run compare:differential -- ... --base HEAD~1`, base `53ddba6d`):
  frf250b-run-yes-off 123 / 250 frames differ, loss-terminal-record-yes-off 73 / 133 differ; both only inside **x17-51, y124-133** (the six name glyphs of
  the message box line; 5011..5083 and 161..283). win-terminal-window-off 3590, loss-terminal-record-cursor-off 80, factory-brain-silver-walkup-askready-menu-record-off 178 byte-identical.
- Harness-default differential (override = MEMORY), 6 traces, 4412 captures: **byte-identical** to the base.
- ROM compares (`npm run compare -- <trace> --summary`): frf250b-run-yes-off **250 / 250**, loss-terminal-record-yes-off **133 / 133**, factory-brain-silver-walkup-askready-menu-record-off **178 / 178**.
- BP award box: no compare trace reaches it; an app-side render of the round-won terminal (ages 2200..2700) PLAYER vs MEMORY differs in 316 / 501 frames, only in x17-51, y124-133.
- Census (`lsd194Census.ts`, seeds 0..49, both scenes, base `53ddba6d` vs the pnm273 commit): all 100 jsonl lines byte-identical (`eventsDigest` = kernel digest, command lists, sound digests); also identical to the aiv270 baseline `census/{off,on}-01ad01f2a/r0.jsonl` first 50 lines.

## Tests

`tests/pnm273PlayerName.test.ts` (8). Re-pinned to PLAYER: `frf250bForfeit`, `postwin`, `factoryTerminalRecordIssue104`. `factoryTerminalMessages.test.ts` keeps "MEMORY" on purpose: it
pins the extractor's reading of the oracle save (`tests/fixtures/data/factory-terminal-messages.json`), which is ground truth about the ROM, not an app string.
