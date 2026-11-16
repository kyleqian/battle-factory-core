# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-16 — aud242h (ts lane worker): move-animation SE lifetimes, slice 8 (ISSUES #219 family 1)

- **State:** on master, committed (`cf66a94a3` blend_color_cycle + Psychic / Growth, `dbc3f7178` Shadow Ball ball + vertical dip + Body Slam, docs after). Sound only.
- **Did:** ported `AnimTask_BlendColorCycle` (palette-fade call count), `gShadowBallSpriteTemplate`, `gVerticalDipSpriteTemplate` lifetimes (C cited in the extractor; `docs/aud242-move-anim-sounds.md` section 12).
  ROM windows (step mode): Psychic +2, Body Slam +2, Growth 2nd SE152 exact at its -4; Shadow Ball is C-derived only (Rattata stage is Ghost-immune).
- **Counts:** L50 emitted / gated 692 / 142 -> 697 / 137; all moves resolved 894 / 218 -> 899 / 213. T1 (seeds 0..99 ON, arm `on-f205895b4`): exact 23,547 -> 23,795, missing-gated 1,066 -> 950, extra 0,
  unclassified 11,093 -> 11,093 (unchanged: SEs outside move windows, a pre-existing tooling gap, not 0). `commands` / `eventsDigest` identical 100 / 100; differential 240 / 240 byte-identical (3 traces).
- **Gates:** typecheck 0; test:gate 362 files / 2,843; npm test shards 1-6 of 6 green (1,845 files); build / build:lib 0.
- **Next:** Sludge Bomb (198 gated: SE-length table + `waitsound` keeps `pending`), Blizzard 88, Faint Attack 62, Confuse Ray 47. Evidence `.integration/evidence/aud242h/`.

---

## 2026-11-16 — lbw4 (ts lane worker): player <-> Lobby NPC interaction in free roam (ISSUES #221 E4 remainder)

- **State:** on master, committed (`e6c46d86e` engine + trace, `562f916bd` depth sort + Tier-1, docs after). Battle rules untouched.
- **Did:** player collision against the woman / fat man's live current OR previous tile; the woman sees the player's ROM cur / prv (player slot runs first);
  held-same-direction bump interrupt, 4-cycle bump pose and post-bump walk pose; idle press starts its step a tick earlier (ROM-exact); depth sort from drawn y.
  Talk targets: none (the NPC scripts exist, the engine keeps NPCs silent by decision). `docs/lbw3-lobby-npc-port.md` lbw4 section.
- **Proof:** new ROM trace `lbw4-woman-block-off` (player blocked by her current and previous tile): NPC state + cursor max |offset| 0, compare 501 / 501. No regression:
  lbra-loss 2258, beyond-boundary 183, lobby-walk 177, won-no 54, won-yes 54, won-attendant 17 + 6 + 44, six lbw3 traces offset 0. Tier-1 `tests/lbw4LobbyNpcPlayer.test.ts`.
- **Gates:** typecheck 0; test:gate 362 files / 2,843; npm test shards 1-6 of 6 green (1,814 files); build / build:lib 0.
- **Next:** unproven: same-frame race for one tile, turn-commit refusal, fat man in the way, direction change during a bump (docs). Evidence `.integration/evidence/lbw4/`.

---

## 2026-11-15 — lbw3 (ts lane worker): the Lobby NPC wander port (ISSUES #221 E4)

- **State:** on master, committed (`d57c76a6e` pure module + Tier-1 replay, `fa1ed06de` engine wiring / renderer / traces, `7ee9d8bbc` soak re-pin, docs after). Battle rules untouched.
- **Did:** `lobbyNpcs.ts` (woman WANDER_AROUND + fat man LOOK_AROUND, collision against range / grid / player + static objects), `lobbyNpcDriver.ts` (freeze timeline from ticks since the Lobby entry: unfrozen at +34 / +35 and from the release, frozen otherwise from +11 and during the attendant talk), `core.ts` runs it on the shared `rngValue` on every Lobby path, the renderer draws both NPCs from state (`womanAtTick` retired to a test oracle in `tests/factoryLobbyFreeRoam.test.ts`; fat man gets S / N / W poses). `docs/lbw3-lobby-npc-port.md`.
- **Proof:** Tier-1 replay on 6 traces (tiles, facing, step, delay, anim index, 32-bit cursor every frame); engine route with `appRngRebase`: app cursor == ROM `gRngValue` every frame, max |offset| 0, NPC state identical. compare before -> after: loss-beyond-boundary 183/183, loss-lobby-walk 177/177, lbra-loss 2258/2258, forfeit 1087-1199 0 -> 109/113, retire-off 1315 -> 1476/1554, won-no 0 -> 54/54, won-yes 0 -> 54/54, won-attendant 0 -> 17/17 + 6/6 + 44/44 (residuals: forfeit 4 frames at the player sprite, retire 78 frames of dialog text pacing; none NPC).
- **Re-pins (Lobby new-challenge deals only):** `lbrd.test.ts` WIN_TWO_SEED 35 -> 13; `randomRoundSoak.test.ts` ISSUES #89 Baton Pass seed 1 -> 0. `factoryLobbyTerminal.test.ts` fat man frames 1 -> 3. No other test moved.
- **Gates:** typecheck 0; test:smoke 448 / 448; test:gate 362 files / 2,843; build / build:lib 0; npm test shards 1-4 of 6 green (1,208 files; shards 5-6 not run, the supervisor runs the full suite).
- **Next:** unproven (docs): the player in the woman's way, retire-after-won / injected / attendant-return entries use the shared rule; free-roam player-vs-NPC collision and depth sort still use the static spawn tiles. Evidence `.integration/evidence/lbw3/`.

---
