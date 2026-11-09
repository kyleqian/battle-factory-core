# aud243b: census ROM replay, Phase 1 (RNG-alignment feasibility gate): FAILED

Goal: replay a census battle (T2) on the ROM and compare sound events. Phase 1 asks whether an engine battle and a ROM battle of the same census scene can be put on
the same RNG stream, so that one input trace drives both. Result: the construction aligns parties and the action-menu `gRngValue`, but the battle does not stay
aligned (the first opponent move already differs), so Phase 2 was not run.

## Tooling (committed, reusable)

- `tools/audio/soundEventProbe.py lab REQ --setup-out FILE`: writes `{descriptor, snapshot}` of the staged first action menu (gRngValue, both parties, battlers). ~6.6 s, deterministic (identical across runs and across scenes for one seed).
- `tools/integration/soundCensusRomReplay.ts`
  - `request`: census battle of seed N run to its first action menu, written as a `factoryLegal` lab request (trainer/set ids, `challengeNum = floor(streak/7)`, seed).
  - `replay`: engine rebuilt FROM the ROM setup (rentals and opponent personalities/IVs/abilities/otIds read back, opponent construction cursors recovered by inverting the LCG, battle RNG = ROM menu `gRngValue`), played with the census policy; writes RLE inputs and sound rows.
  - `native`: census orchestrator with the same output shape (drift check; not run).
  - `scan --draws=K [--patch=1]`: diagnostic used below.
- `tools/audio/romStateTimeline.py`: ROM rows `[frame, gCurrentMove, hp0, hp1, gRngValue]` on change over a request's trace.
- `tools/audio/romTurnNumber.py`: ROM `gRandomTurnNumber` and `gRngValue` at the action menu.

## What aligns (seed 224, Scene ON, streak 14)

- Opponent personalities, IVs, ability slots, otIds match the ROM (the lab stages the Tower win streak at `challengeNum*7`; the census engine uses 0, so the replay engine uses `floor(streak/7)*7`; only streak < 7 seeds are census-identical).
- With `freshBattleRngValue = LCG^-2(ROM menu rng)` the engine's action-menu `rng.value` equals the ROM's (1964189966).
- Player Sludge Bomb damage and the poison tick match (opp HP 134 -> 65 -> 49 on the ROM; engine 134 -> 49 by the end of turn 1).

## What does not align

1. **The first opponent move differs.** ROM turn 1: opponent uses Scary Face (184) at frame 684, player HP stays 129. Engine: opponent uses a damaging move, player HP 129 -> 71 at frame 9. Everything later diverges (ROM: Body Slam turn 2, Eruption turn 3; engine: Earthquake).
2. **`gRandomTurnNumber` is 7 draws before the menu value in the ROM, 0 in the engine.** ROM seed 224: turn number 16159 = top16 of LCG^-7(menu rng); engine at k=2: 29971 = top16(menu rng). The gap is exactly 7 on seeds 224 (ON and OFF), 552 and 177 (ON). So the ROM spends 7 `Random()` calls between the turn-number draw and the first menu that the engine does not model. The engine can match either the turn number (k=9) or the menu rng (k=2), not both.
3. **Matching both does not fix (1).** `scan --draws=9 --patch=1` (turn number 16159 and RNG forced to the ROM's menu value) reproduces the k=2 result exactly: the engine's opponent still picks the damaging move. k=9 alone (RNG 7 behind) happens to pick a non-damaging move, which is chance. So the divergence is in the AI inputs/scoring or draw order, not only a missing draw count.
4. Timing: the engine resolves turn 1 in 9 frames; the ROM takes ~1320 frames. The engine's `currentMove`-based timeline is not a frame-accurate ROM stand-in here, and the ROM's SE_SELECT rows at frames 2 and 9 do not appear in the engine's rows (a first sound diff, not classed).

## What would be needed

- Identify the 7 ROM `Random()` calls between the turn-number draw and the first action menu (write watchpoint on `gRngValue` from the lab's battle start) and model them in `initializeFreshFactoryBattle`, or accept a documented constant.
- Explain why the engine's Factory AI picks a damaging move where the ROM picks Scary Face at identical turn number, RNG and parties: compare `AI_CalcDmg`/score table inputs (known ability/item history, `gRandomTurnNumber` use, flags) against the ROM at the first decision. The ROM's first post-menu draw is at frame 20 and two more at 51 and 54; the engine spends 16 draws in turn 1.
- Only then are per-frame inputs from the engine replayable on the ROM; otherwise the traces diverge from turn 1 and every comparison is "non-replayable from frame F".

Evidence (ignored dir `.integration/evidence/aud243b/`): setup224-on.json, tl224-on.json, engine224-on.json, turn*.json.
