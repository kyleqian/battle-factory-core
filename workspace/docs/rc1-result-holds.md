# rc1 — `lobby: "skip"`: result holds for the website's cards

Kyle, 2026-11-21 (approved design: "all your suggestions are good"): after a loss or a 7-win the website shows its own card instead
of the walkable Lobby ("it boots me out to the lobby ... it kind of breaks the UX a bit for new people"). Additive library option;
the ROM path stays the default. Code: `src/engine/resultHold.ts`, `src/engine/core.ts` (`tickResultHold`, `enterNextRoundDraft`,
`withResultHold`), `src/factorySession.ts` (events), `src/lib.ts` (re-announce after a resume). Tests: `tests/rc1ResultHold.test.ts`.

## The option

`lobby?: "walk" | "skip"` on `FactoryGameOptions`, `ReplayOptions`, `FactorySessionOptions` (`FactoryLobbyMode`, lib-types). Absent /
`"walk"`: unchanged, and its engine states carry no rc1 field (pinned). `"skip"` changes what the game does after a 7-win, so the host
records it with the challenge and passes it to every resume and `replayChallenge`. Dev shell: `?lobby=skip`.

## What `"skip"` does

The game holds on a black frame (`EngineState.resultHold`, rendered black, every input ignored but the round hold's release; the frame
counter and the per-VBlank RNG run on) where the ROM would warp to the Lobby:

| end | hold starts | events on that tick | release |
| --- | --- | --- | --- |
| loss / forfeit | first black frame of the battle's fade (postwin age 37, 36 frames after `challenge-end loss`, which is unchanged) | `result-screen` loss | none (the host destroys the mount) |
| RETIRE YES | first black frame of the RETIRE warp (`POSTWIN_RETIRE_BLACK_AGE_DELAY`) | `challenge-end` retire (moved here from the Lobby's free walking), `result-screen` retire | none |
| 7-win | first black frame after the battle room (postwin age 96; after Noland's symbol scene when there is one) | `result-screen` round | A or START from 30 frames in (`ROUND_HOLD_INPUT_DELAY`) |

The round release applies the won Lobby's carry step (`advanceFactoryCarry`: streak + 7, symbols, BP, rents, heard speeches) and deals
the next round's draft at once from the release tick's vblank cursor, as a seeded `"draft"` mount deals its first one (no Lobby, no
PreBattleRoom briefing), then `round-continue`. `battle-end`, `round-end` and `challenge-end loss` are where they always were; the
trace a host uploads up to `challenge-end` replays identically with or without the option.

`result-screen { reason, streak, frame }` and `round-continue { frame }` are for the host's eyes only (never part of what a server
records). The fast-forward of a resume reports nothing, so the mount reports `result-screen` again right after `ready` when the resume
ended inside a hold (`FactorySession.resultScreen()`).

## Not ROM behaviour

The holds have no ROM counterpart (the ROM always warps to the Lobby; `docs/lbra-lobby-return.md`, `docs/lbrd-win-lobby-return.md`).
The next round's deal after a hold is deterministic from the trace (how long the player waits moves the vblank cursor, as in the Lobby),
but it is not the deal the Lobby path would make. Not measured against the oracle; nothing in the battle, the draft generator or the
Lobby path changed.
