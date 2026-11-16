# Progress ledger

Newest entry on top. Keep only ~3 entries here; archive the rest to
`docs/archive/PROGRESS-archive.md`. Every entry: State / Did / Next / Notes.

---

## 2026-11-16 — cry2 (ts lane worker): the cry-task modes recorded and played (cry-task-scout step 2)

- **State:** on master, committed (`8bbc1cf5f` assets, player + Tier-1 after, docs / check tool last). Playback only; `src/engine`, frame hashes and the headless graph untouched.
- **Did:** recorded ROAR_1 / ROAR_2 / HIGH_PITCH / ECHO_START / ECHO_END with the existing recorder for the species that can use the move (Roar sets 37, Loudred, Exploud, + 7 Metronome / Assist / Mimic / Mirror Move users):
  **112 sounds on 46 species** in `cry-NNN-task.ogg` (+ AAC twins). Existing 566 files byte-identical. Cry Ogg +369,586 B (4.55 -> 4.92 MB), AAC +315,559 B; total Ogg 7.82 MB, AAC 7.69 MB.
  Player: `CRY_MODE_NAMES` maps all 8 modes, NORMAL only when the asset is missing (`stats.cryFallbacks`). `docs/cry1-cry-tasks.md` "cry2".
- **Gates:** typecheck 0; test:gate 362 files / 2,843; audio files (manifest, fallback, player, followups, frame identity, headless boundary, cry1, new `cry2CryTaskPlayer`) 98 / 98; build / build:lib 0.
  Browser `audioCheck.mjs --frames 7200` (122 s, `?audio=1`): 0 console errors, 0 missing / fallbacks, all 92 task files decode in Chromium (Ogg + AAC). The check's bgm count was stale since aud247 (fixed).
- **Next:** no task cry sounded in the browser run (seed 3 plays NORMAL / FAINT only): hear one live. The engine's cry-task lengths remain cry1's fit. Evidence `.integration/evidence/cry2/`.

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
